'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, Maximize2, Smartphone, Monitor, Loader2, AlertCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ARApiResponse {
  itemId: string;
  restaurantId: string;
  presignedUrl: string;
  expiresIn: number;
  cfDomain: string;
}

type DeviceType = 'mobile' | 'desktop';
type ViewerState = 'idle' | 'loading' | 'ready' | 'ar-active' | 'error';

// ─── Constants ─────────────────────────────────────────────────────────────────

const RESTAURANT_ID = '2687382e-3b00-4f57-9014-f484df89e3fe';
const API_BASE = 'https://987eskfgd8.execute-api.ap-south-1.amazonaws.com/Prod/ar';

// ─── Device detection ─────────────────────────────────────────────────────────

function detectDevice(): DeviceType {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  return /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    ? 'mobile'
    : 'desktop';
}

function checkWebXRSupport(): boolean {
  return typeof navigator !== 'undefined' && 'xr' in navigator;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ARViewerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [device, setDevice]       = useState<DeviceType>('desktop');
  const [state, setState]         = useState<ViewerState>('idle');
  const [arData, setArData]       = useState<ARApiResponse | null>(null);
  const [errorMsg, setErrorMsg]   = useState('');
  const [webxrSupported, setWebxrSupported] = useState(false);
  const [arActive, setArActive]   = useState(false);

  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);

  // Three.js refs (lazy-loaded)
  const threeRef = useRef<{
    scene: any; camera: any; renderer: any;
    model: any; animId: number | null;
    xrSession: XRSession | null;
    refSpace: XRReferenceSpace | null;
    hitTestSrc: any | null;
    reticle: any | null;
    placed: boolean;
  } | null>(null);

  // ── 1. Detect device & WebXR on mount ──────────────────────────────────────
  useEffect(() => {
    const d = detectDevice();
    setDevice(d);
    setWebxrSupported(checkWebXRSupport());
  }, []);

  // ── 2. Fetch presigned URL from API ────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const fetchAR = async () => {
      setState('loading');
      try {
        const res = await fetch(`${API_BASE}/${RESTAURANT_ID}/${id}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data: ARApiResponse = await res.json();
        setArData(data);
        setState('ready');
      } catch (err: any) {
        setErrorMsg(err.message ?? 'Failed to load AR model');
        setState('error');
      }
    };
    fetchAR();
  }, [id]);

  // ── 3. Init Three.js once data is ready ────────────────────────────────────
  useEffect(() => {
    if (state !== 'ready' || !arData || !canvasRef.current) return;

    let cancelled = false;

    const init = async () => {
      // Dynamic import — keeps bundle small for non-AR pages
      const THREE = await import('three');
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');

      if (cancelled) return;

      const canvas = canvasRef.current!;
      const w = canvas.clientWidth  || 600;
      const h = canvas.clientHeight || 400;

      // Scene
      const scene = new THREE.Scene();

      // Lights
      const ambient = new THREE.AmbientLight(0xffffff, 1.2);
      scene.add(ambient);
      const dirLight = new THREE.DirectionalLight(0xfff5e0, 2.5);
      dirLight.position.set(3, 5, 3);
      dirLight.castShadow = true;
      scene.add(dirLight);
      const fillLight = new THREE.DirectionalLight(0xd4a34e, 0.6);
      fillLight.position.set(-3, 1, -2);
      scene.add(fillLight);

      // Camera
      const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 100);
      camera.position.set(0, 0.3, 0.8);

      // Renderer
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.4;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      if (device === 'mobile') renderer.xr.enabled = true;

      // Reticle (AR hit-test indicator, mobile only)
      const reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.04, 0.05, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xd4a34e }),
      );
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      scene.add(reticle);

      // Load GLB
      const loader = new GLTFLoader();
      let model: THREE.Group | null = null;

      try {
        const gltf = await new Promise<any>((resolve, reject) => {
          loader.load(arData.presignedUrl, resolve, undefined, reject);
        });

        model = gltf.scene;

        // Auto-scale to fit 0.3m bounding box
        const box  = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale  = 0.3 / maxDim;
        model.scale.setScalar(scale);

        // Center pivot
        box.setFromObject(model);
        const centre = box.getCenter(new THREE.Vector3());
        model.position.sub(centre);

        // Enable shadows
        model.traverse((child: any) => {
          if (child.isMesh) {
            child.castShadow    = true;
            child.receiveShadow = true;
          }
        });

        scene.add(model);
      } catch {
        // GLB failed — show a gold placeholder sphere
        const geo  = new THREE.SphereGeometry(0.12, 32, 32);
        const mat  = new THREE.MeshStandardMaterial({
          color: 0xd4a34e, metalness: 0.7, roughness: 0.3,
        });
        model = new THREE.Group();
        model.add(new THREE.Mesh(geo, mat));
        scene.add(model);
      }

      // Store refs
      threeRef.current = {
        scene, camera, renderer, model,
        animId: null, xrSession: null,
        refSpace: null, hitTestSrc: null,
        reticle, placed: false,
      };

      // ── Desktop: mouse-drag orbit + auto-rotate ────────────────────────────
      if (device === 'desktop') {
        let isDragging = false;
        let lastX = 0, lastY = 0;
        let rotX = 0, rotY = 0;
        let autoRotate = true;

        const onMouseDown = (e: MouseEvent) => { isDragging = true; lastX = e.clientX; lastY = e.clientY; autoRotate = false; };
        const onMouseMove = (e: MouseEvent) => {
          if (!isDragging || !model) return;
          const dx = (e.clientX - lastX) * 0.01;
          const dy = (e.clientY - lastY) * 0.01;
          rotY += dx; rotX += dy;
          rotX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotX));
          model.rotation.y = rotY;
          model.rotation.x = rotX;
          lastX = e.clientX; lastY = e.clientY;
        };
        const onMouseUp   = () => { isDragging = false; };

        // Touch for desktop fallback
        const onTouchStart = (e: TouchEvent) => { isDragging = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; autoRotate = false; };
        const onTouchMove  = (e: TouchEvent) => {
          if (!isDragging || !model) return;
          const dx = (e.touches[0].clientX - lastX) * 0.01;
          const dy = (e.touches[0].clientY - lastY) * 0.01;
          rotY += dx; rotX += dy;
          rotX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotX));
          model.rotation.y = rotY;
          model.rotation.x = rotX;
          lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
        };

        canvas.addEventListener('mousedown',  onMouseDown);
        canvas.addEventListener('mousemove',  onMouseMove);
        canvas.addEventListener('mouseup',    onMouseUp);
        canvas.addEventListener('mouseleave', onMouseUp);
        canvas.addEventListener('touchstart', onTouchStart);
        canvas.addEventListener('touchmove',  onTouchMove);
        canvas.addEventListener('touchend',   onMouseUp);

        const animate = () => {
          threeRef.current!.animId = requestAnimationFrame(animate);
          if (autoRotate && model) model.rotation.y += 0.005;
          renderer.render(scene, camera);
        };
        animate();

        // Resize
        const onResize = () => {
          const c = canvasRef.current;
          if (!c) return;
          const w = c.clientWidth, h = c.clientHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };
        window.addEventListener('resize', onResize);
        threeRef.current!.animId = 0; // mark as started
      }

      // ── Mobile: Three.js renders but AR session takes over ─────────────────
      if (device === 'mobile') {
        // Plain preview render until AR button tapped
        const animate = () => {
          if (!threeRef.current?.xrSession) {
            threeRef.current!.animId = requestAnimationFrame(animate);
            if (model) model.rotation.y += 0.005;
            renderer.render(scene, camera);
          }
        };
        animate();
      }
    };

    init();

    return () => {
      cancelled = true;
      if (threeRef.current) {
        if (threeRef.current.animId) cancelAnimationFrame(threeRef.current.animId);
        threeRef.current.renderer?.dispose();
        threeRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, arData]);

  // ── 4. Launch WebXR AR session (mobile) ────────────────────────────────────
  const launchAR = async () => {
    if (!threeRef.current) return;
    const { renderer, scene, camera, reticle, model } = threeRef.current;

    try {
      // Request immersive-ar session with hit-test
      const session: XRSession = await (navigator as any).xr.requestSession(
        'immersive-ar',
        {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay'],
          domOverlay: containerRef.current
            ? { root: containerRef.current }
            : undefined,
        },
      );

      threeRef.current.xrSession = session;
      setArActive(true);

      renderer.xr.setReferenceSpaceType('local');
      await renderer.xr.setSession(session);

      // Reference space for hit-test
      const refSpace = await session.requestReferenceSpace('viewer');
      threeRef.current.refSpace = refSpace as XRReferenceSpace;

      // Hit-test source
      const hitTestSrc = await (session as any).requestHitTestSource({ space: refSpace });
      threeRef.current.hitTestSrc = hitTestSrc;

      // Hide model until placed
      if (model) model.visible = false;

      // Select event → place model
      session.addEventListener('select', () => {
        if (!threeRef.current?.placed && reticle && model) {
          model.position.setFromMatrixPosition(reticle.matrix);
          model.visible = true;
          threeRef.current!.placed = true;
          reticle.visible = false;
        }
      });

      // XR render loop
      renderer.setAnimationLoop((_time: number, frame: XRFrame) => {
        if (!frame) return;
        const { hitTestSrc, refSpace, placed } = threeRef.current!;

        if (hitTestSrc && !placed) {
          const hits = frame.getHitTestResults(hitTestSrc);
          if (hits.length > 0) {
            const pose = hits[0].getPose(renderer.xr.getReferenceSpace()!);
            if (pose) {
              reticle.visible = true;
              reticle.matrix.fromArray(pose.transform.matrix);
            }
          } else {
            reticle.visible = false;
          }
        }

        renderer.render(scene, camera);
      });

      // Session end
      session.addEventListener('end', () => {
        threeRef.current!.xrSession   = null;
        threeRef.current!.placed      = false;
        if (model) { model.visible = true; model.position.set(0, 0, 0); }
        if (reticle) reticle.visible = false;
        renderer.setAnimationLoop(null);
        setArActive(false);
        // Resume preview loop
        const previewLoop = () => {
          threeRef.current!.animId = requestAnimationFrame(previewLoop);
          if (model) model.rotation.y += 0.005;
          renderer.render(scene, camera);
        };
        previewLoop();
      });

    } catch (err: any) {
      setErrorMsg('WebXR not supported on this device or browser. Try Chrome on Android.');
      setState('error');
    }
  };

  // ── 5. End AR session ──────────────────────────────────────────────────────
  const endAR = () => {
    threeRef.current?.xrSession?.end();
  };

  // ── 6. Reset model rotation ────────────────────────────────────────────────
  const resetRotation = () => {
    if (threeRef.current?.model) {
      threeRef.current.model.rotation.set(0, 0, 0);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-dvh bg-surface flex flex-col items-center justify-center p-4">
      <div
        ref={containerRef}
        className="relative w-full max-w-2xl rounded-3xl overflow-hidden border border-gold-400/20 shadow-shell bg-[#0f0d0a]"
        style={{ aspectRatio: device === 'mobile' ? '9/16' : '16/9', maxHeight: '85dvh' }}
      >
        {/* ── Top bar ── */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center backdrop-blur-sm"
          >
            <ArrowLeft size={16} className="text-white/80" />
          </button>

          <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-full px-3 py-1.5 backdrop-blur-sm">
            {device === 'mobile'
              ? <Smartphone size={13} className="text-gold-400" />
              : <Monitor    size={13} className="text-gold-400" />}
            <span className="text-[11px] text-white/70 font-medium">
              {device === 'mobile' ? 'WebXR AR' : '360° Viewer'}
            </span>
          </div>

          {!arActive && (
            <button
              onClick={resetRotation}
              className="w-9 h-9 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center backdrop-blur-sm"
            >
              <RotateCcw size={15} className="text-white/60" />
            </button>
          )}
        </div>

        {/* ── Loading state ── */}
        {state === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0f0d0a] z-10">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-gold-400/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold-400 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-2xl">🍽️</div>
            </div>
            <p className="text-sm text-white/40 font-medium">Loading 3D model…</p>
            <p className="text-xs text-white/20">Fetching from secure S3 presigned URL</p>
          </div>
        )}

        {/* ── Error state ── */}
        {state === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0f0d0a] z-10 px-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertCircle size={24} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/70 mb-1">Failed to load AR model</p>
              <p className="text-xs text-white/30 leading-relaxed">{errorMsg}</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-5 py-2 rounded-xl bg-gold-400/15 border border-gold-400/30 text-gold-400 text-sm font-medium"
            >
              Go Back
            </button>
          </div>
        )}

        {/* ── Three.js Canvas ── */}
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: state === 'ready' ? 'block' : 'none' }}
        />

        {/* ── Desktop: drag hint overlay ── */}
        {state === 'ready' && device === 'desktop' && (
          <div className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none">
            <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-full px-4 py-2 backdrop-blur-sm">
              <RotateCcw size={13} className="text-gold-400" />
              <span className="text-[11px] text-white/50">Drag to rotate · Auto-rotating</span>
            </div>
          </div>
        )}

        {/* ── Mobile: AR status overlay (when session active) ── */}
        {arActive && (
          <div className="absolute bottom-0 left-0 right-0 z-30 p-4">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center">
              <p className="text-[13px] font-medium text-[#f5e9d0] mb-1">
                👆 Tap surface to place dish
              </p>
              <p className="text-[11px] text-white/40 mb-3">
                Point camera at a flat surface — gold ring shows placement point
              </p>
              <button
                onClick={endAR}
                className="w-full h-10 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 text-sm font-medium"
              >
                Exit AR
              </button>
            </div>
          </div>
        )}

        {/* ── Bottom action bar ── */}
        {state === 'ready' && !arActive && (
          <div className="absolute bottom-0 left-0 right-0 z-20 p-4">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4">

              {/* Model info */}
              {arData && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[11px] text-white/40 font-mono truncate">
                    {arData.itemId.slice(0, 8)}… · expires {Math.floor(arData.expiresIn / 60)}min
                  </span>
                </div>
              )}

              {device === 'mobile' ? (
                <>
                  {webxrSupported ? (
                    <button
                      onClick={launchAR}
                      className="w-full h-12 rounded-xl flex items-center justify-center gap-2 font-medium text-sm text-[#0f0d0a]"
                      style={{ background: 'linear-gradient(135deg, #d4a34e, #c4873c)' }}
                    >
                      <span className="text-lg">🔮</span>
                      View in AR — Place on Your Table
                    </button>
                  ) : (
                    <div className="w-full h-12 rounded-xl flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.08]">
                      <AlertCircle size={15} className="text-amber-400" />
                      <span className="text-sm text-white/40">
                        WebXR not supported — use Chrome on Android or Safari 16+ on iOS
                      </span>
                    </div>
                  )}
                  <p className="text-center text-[10px] text-white/20 mt-2">
                    Requires Chrome (Android) or Safari 16+ (iOS)
                  </p>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-[#f5e9d0]">360° Interactive View</p>
                    <p className="text-[11px] text-white/30">Drag to rotate · Scroll to zoom</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-gold-400/10 border border-gold-400/20 rounded-full px-3 py-1.5">
                    <Monitor size={13} className="text-gold-400" />
                    <span className="text-[11px] text-gold-400 font-medium">Desktop Mode</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── API info card (debug) ── */}
      {arData && process.env.NODE_ENV === 'development' && (
        <div className="mt-4 w-full max-w-2xl bg-surface-100 border border-white/[0.06] rounded-xl p-4">
          <p className="text-[10px] text-white/20 uppercase tracking-widest mb-2">API Response</p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div><span className="text-white/25">itemId:</span> <span className="text-white/50 font-mono">{arData.itemId.slice(0, 16)}…</span></div>
            <div><span className="text-white/25">restaurantId:</span> <span className="text-white/50 font-mono">{arData.restaurantId.slice(0, 16)}…</span></div>
            <div><span className="text-white/25">expiresIn:</span> <span className="text-white/50">{arData.expiresIn}s ({Math.floor(arData.expiresIn / 60)} min)</span></div>
            <div><span className="text-white/25">cfDomain:</span> <span className="text-white/50">{arData.cfDomain}</span></div>
          </div>
        </div>
      )}
    </main>
  );
}
