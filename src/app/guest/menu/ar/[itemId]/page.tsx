'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, RotateCcw, Smartphone,
  Monitor, AlertCircle,
} from 'lucide-react';
import * as THREE from 'three';
import { GLTFLoader }    from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface ARApiResponse {
  itemId:       string;
  restaurantId: string;
  presignedUrl: string;
  expiresIn:    number;
  cfDomain:     string;
}

type DeviceType  = 'mobile' | 'desktop';
type ViewerState = 'idle' | 'loading' | 'ready' | 'error';

const RESTAURANT_ID = '2687382e-3b00-4f57-9014-f484df89e3fe';

function detectDevice(): DeviceType {
  if (typeof navigator === 'undefined') return 'desktop';
  const isNarrow = typeof window !== 'undefined' && window.innerWidth < 500;
  const mobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isNarrow && mobileUA ? 'mobile' : 'desktop';
}

export default function ARViewerPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const router = useRouter();

  const [device,        setDevice]        = useState<DeviceType>('desktop');
  const [state,         setState]         = useState<ViewerState>('idle');
  const [arData,        setArData]        = useState<ARApiResponse | null>(null);
  const [errorMsg,      setErrorMsg]      = useState('');
  const [webxrOk,       setWebxrOk]       = useState(false);
  const [arActive,      setArActive]      = useState(false);
  const [placed,        setPlaced]        = useState(false);
  const [loadPct,       setLoadPct]       = useState(0);

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef   = useRef<HTMLDivElement>(null);

  const threeRef = useRef<{
    scene:      any;
    camera:     any;
    renderer:   any;
    controls:   any;
    model:      any;
    animId:     number | null;
    xrSession:  XRSession | null;
    refSpace:   any;
    hitTestSrc: any;
    reticle:    any;
    placed:     boolean;
  } | null>(null);

  // ── 1. Detect device ─────────────────────────────────────────────────────
  useEffect(() => {
    const d = detectDevice();
    setDevice(d);

    if (d === 'mobile' && 'xr' in navigator) {
      (navigator as any).xr
        .isSessionSupported('immersive-ar')
        .then((ok: boolean) => setWebxrOk(ok))
        .catch(() => setWebxrOk(false));
    }
  }, []);

  // ── 2. Fetch presigned URL via proxy ─────────────────────────────────────
  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;

    const fetchAR = async () => {
      setState('loading');
      try {
        // Use proxy route to avoid CORS
        const origin = window.location.origin;
        const url    = `${origin}/api/ar?rid=${RESTAURANT_ID}&iid=${itemId}`;
        const res    = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
        const data: ARApiResponse = await res.json();
        if (!cancelled) {
          setArData(data);
          setState('ready');
        }
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err.message ?? 'Failed to load AR model');
          setState('error');
        }
      }
    };

    fetchAR();
    return () => { cancelled = true; };
  }, [itemId]);

  // ── 3. Init Three.js ──────────────────────────────────────────────────────
  useEffect(() => {
    if (state !== 'ready' || !arData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const w = canvas.clientWidth  || 600;
    const h = canvas.clientHeight || 400;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0d0a);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const dir = new THREE.DirectionalLight(0xfff5e0, 2.5);
    dir.position.set(3, 5, 3);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0xd4a34e, 0.6);
    fill.position.set(-3, 1, -2);
    scene.add(fill);

    // Grid
    scene.add(new THREE.GridHelper(4, 20, 0x222222, 0x1a1a1a));

    // Camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 100);
    camera.position.set(0, 0.3, 0.8);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: true,
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled      = true;
    renderer.shadowMap.type         = THREE.PCFSoftShadowMap;
    renderer.toneMapping            = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure    = 1.4;
    renderer.outputColorSpace       = THREE.SRGBColorSpace;
    renderer.xr.enabled             = true;

    // Orbit controls (desktop)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping   = true;
    controls.dampingFactor   = 0.08;
    controls.autoRotate      = true;
    controls.autoRotateSpeed = 1.5;
    controls.enableZoom      = true;
    controls.enablePan       = false;
    controls.target.set(0, 0.1, 0);

    // Reticle for AR hit-test
    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.04, 0.06, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xd4a34e, side: THREE.DoubleSide }),
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // Load GLB
    const loader = new GLTFLoader();
    loader.load(
      arData.presignedUrl,
      (gltf: any) => {
        const model = gltf.scene;
        const box   = new THREE.Box3().setFromObject(model);
        const size  = box.getSize(new THREE.Vector3());
        const scale = 0.3 / Math.max(size.x, size.y, size.z);
        model.scale.setScalar(scale);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center.multiplyScalar(scale));
        model.position.y = -box.min.y * scale;
        model.traverse((child: any) => {
          if (child.isMesh) {
            child.castShadow    = true;
            child.receiveShadow = true;
          }
        });
        scene.add(model);
        threeRef.current!.model = model;
        setLoadPct(100);
      },
      (xhr: any) => {
        if (xhr.total) setLoadPct(Math.round((xhr.loaded / xhr.total) * 100));
      },
      () => {
        // Fallback sphere
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 32, 32),
          new THREE.MeshStandardMaterial({ color: 0xd4a34e, metalness: 0.7, roughness: 0.3 }),
        );
        scene.add(mesh);
        threeRef.current!.model = mesh;
        setLoadPct(100);
      },
    );

    // Render loop
    let animId: number = 0;
const tick = () => {
  animId = requestAnimationFrame(tick);
  controls.update();
  renderer.render(scene, camera);
};
tick();

    const onResize = () => {
      const w2 = canvas.clientWidth  || 600;
      const h2 = canvas.clientHeight || 400;
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
    };
    window.addEventListener('resize', onResize);

    threeRef.current = {
      scene, camera, renderer, controls, model: null,
      animId, xrSession: null, refSpace: null,
      hitTestSrc: null, reticle, placed: false,
    };

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      threeRef.current = null;
    };
  }, [state, arData]);

  // ── 4. Launch WebXR AR ────────────────────────────────────────────────────
  const launchAR = async () => {
    if (!threeRef.current) return;
    const { renderer, scene, camera, reticle, model } = threeRef.current;

    try {
      const session: XRSession = await (navigator as any).xr.requestSession(
        'immersive-ar',
        {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay'],
          domOverlay: overlayRef.current ? { root: overlayRef.current } : undefined,
        },
      );

      threeRef.current.xrSession = session;
      setArActive(true);
      setPlaced(false);

      renderer.xr.setReferenceSpaceType('local');
      await renderer.xr.setSession(session);

      const refSpace  = await session.requestReferenceSpace('local');
      const viewerSpc = await session.requestReferenceSpace('viewer');
      const hitSrc    = await (session as any).requestHitTestSource({ space: viewerSpc });

      threeRef.current.refSpace   = refSpace;
      threeRef.current.hitTestSrc = hitSrc;

      if (model) model.visible = false;

      session.addEventListener('select', () => {
        const t = threeRef.current;
        if (!t || t.placed || !reticle.visible || !t.model) return;
        const pos = new THREE.Vector3();
        const rot = new THREE.Quaternion();
        const scl = new THREE.Vector3();
        reticle.matrix.decompose(pos, rot, scl);
        t.model.position.copy(pos);
        t.model.quaternion.copy(rot);
        t.model.visible = true;
        reticle.visible = false;
        t.placed = true;
        setPlaced(true);
      });

      renderer.setAnimationLoop((_time: number, frame: any) => {
        if (!frame) return;
        const t = threeRef.current!;
        if (t.hitTestSrc && !t.placed) {
          const hits = frame.getHitTestResults(t.hitTestSrc);
          if (hits.length > 0) {
            const pose = hits[0].getPose(t.refSpace);
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

      session.addEventListener('end', () => {
        renderer.setAnimationLoop(null);
        threeRef.current!.xrSession = null;
        threeRef.current!.placed    = false;
        if (model)   { model.visible = true; model.position.set(0, 0, 0); }
        if (reticle)   reticle.visible = false;
        setArActive(false);
        setPlaced(false);
        // Resume preview
        const preview = () => {
          if (!threeRef.current?.xrSession) {
            threeRef.current!.animId = requestAnimationFrame(preview);
            threeRef.current!.controls?.update();
            renderer.render(scene, camera);
          }
        };
        preview();
      });

    } catch (err: any) {
      setErrorMsg(`WebXR error: ${err?.message ?? 'Not supported'}`);
      setState('error');
    }
  };

  const endAR = () => threeRef.current?.xrSession?.end();

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-4"
      style={{ background: '#0c0c0e' }}>

      {/* DOM overlay for WebXR */}
      <div
        ref={overlayRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 9999 }}
      />

      <div
        ref={containerRef}
        className="relative w-full max-w-2xl rounded-3xl overflow-hidden border border-white/[0.06]"
        style={{
          aspectRatio: device === 'mobile' ? '9/16' : '16/9',
          maxHeight: '85dvh',
          background: '#ffffff',
        }}
      >
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4"
          style={{ background: 'linear-gradient(to bottom,rgba(0,0,0,0.6),transparent)' }}>
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.5)', border: '0.5px solid rgba(255,255,255,0.1)' }}
          >
            <ArrowLeft size={16} className="text-white/80" />
          </button>

          <div className="flex items-center gap-2 rounded-full px-3 py-1.5"
            style={{ background: 'rgba(0,0,0,0.5)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
            {device === 'mobile'
              ? <Smartphone size={13} style={{ color: '#14b8a6' }} />
              : <Monitor    size={13} style={{ color: '#14b8a6' }} />}
            <span className="text-[11px] text-white/70 font-medium">
              {device === 'mobile' ? 'WebXR AR' : '360° Viewer'}
            </span>
          </div>

          <button
            onClick={() => { if (threeRef.current?.model) threeRef.current.model.rotation.set(0,0,0); }}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.5)', border: '0.5px solid rgba(255,255,255,0.1)' }}
          >
            <RotateCcw size={15} className="text-white/60" />
          </button>
        </div>

        {/* Loading */}
        {state === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10"
            style={{ background: '#ffffff' }}>
            <div className="text-[60px] opacity-40">🍽️</div>
            <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <div className="w-4 h-4 border-2 border-white/20 border-t-gold-400 rounded-full animate-spin"
                style={{ borderTopColor: '#14b8a6' }} />
              <span className="text-[13px]">Loading 3D model… {loadPct}%</span>
            </div>
            <div className="w-48 h-[3px] rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${loadPct}%`, background: 'rgba(212,163,78,0.6)' }} />
            </div>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 px-8 text-center"
            style={{ background: '#ffffff' }}>
            <AlertCircle size={36} className="text-red-400" />
            <p className="text-[14px] text-white/50 leading-relaxed">{errorMsg}</p>
            <button
              onClick={() => router.back()}
              className="px-5 py-2 rounded-xl text-[13px] font-medium"
              style={{ background: 'rgba(212,163,78,0.15)', border: '0.5px solid rgba(212,163,78,0.3)', color: '#14b8a6' }}
            >
              Go Back
            </button>
          </div>
        )}

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: state === 'ready' ? 'block' : 'none' }}
        />

        {/* AR active overlay */}
        {arActive && (
          <div className="absolute bottom-0 left-0 right-0 z-30 p-4">
            <div className="rounded-2xl p-4 text-center"
              style={{ background: 'rgba(0,0,0,0.7)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
              <p className="text-[13px] font-medium text-[#f5e9d0] mb-1">
                {placed ? '✓ Dish placed! Tap to reposition' : '👆 Tap surface to place dish'}
              </p>
              <p className="text-[11px] text-white/35 mb-3">
                {placed ? 'Tap & drag to rotate' : 'Point camera at a flat surface'}
              </p>
              <button
                onClick={endAR}
                className="w-full h-10 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(239,83,80,0.15)', border: '0.5px solid rgba(239,83,80,0.25)', color: '#ef6e6b' }}
              >
                Exit AR
              </button>
            </div>
          </div>
        )}

        {/* Bottom bar */}
        {state === 'ready' && !arActive && (
          <div className="absolute bottom-0 left-0 right-0 z-20 p-4">
            <div className="rounded-2xl p-4"
              style={{ background: 'rgba(0,0,0,0.65)', border: '0.5px solid rgba(255,255,255,0.08)' }}>

              {arData && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] text-white/30 font-mono">
                    Model ready · expires {Math.floor(arData.expiresIn / 60)} min
                  </span>
                </div>
              )}

              {device === 'mobile' ? (
                webxrOk ? (
                  <button
                    onClick={launchAR}
                    className="w-full h-12 rounded-xl flex items-center justify-center gap-2 font-medium text-[15px]"
                    style={{ background: 'linear-gradient(135deg,#14b8a6,#c4873c)', color: '#ffffff' }}
                  >
                    <span>🔮</span> View in AR — Place on Your Table
                  </button>
                ) : (
                  <div className="w-full h-12 rounded-xl flex items-center justify-center gap-2"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                    <AlertCircle size={15} className="text-amber-400" />
                    <span className="text-[12px] text-white/40">WebXR not supported</span>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-[#f5e9d0]">360° Interactive View</p>
                    <p className="text-[11px] text-white/30">Drag to rotate · Scroll to zoom</p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
                    style={{ background: 'rgba(212,163,78,0.10)', border: '0.5px solid rgba(212,163,78,0.20)' }}>
                    <Monitor size={13} style={{ color: '#14b8a6' }} />
                    <span className="text-[11px] font-medium" style={{ color: '#14b8a6' }}>Desktop</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}