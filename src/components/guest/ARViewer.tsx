'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Loader2, AlertCircle, RotateCcw,
  ZoomIn, ZoomOut, Monitor, Smartphone,
} from 'lucide-react';
import * as THREE from 'three';
import { GLTFLoader }    from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface Props {
  glbUrl:    string;
  itemName?: string;
  emoji?:    string;
}

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const isNarrowScreen = window.innerWidth < 500;
  const mobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isNarrowScreen && mobileUA;
}

async function checkWebXR(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  if (!('xr' in navigator)) return false;
  try {
    return await (navigator as any).xr.isSessionSupported('immersive-ar');
  } catch {
    return false;
  }
}

export default function ARViewer({ glbUrl, itemName = 'Menu Item', emoji = '🍽️' }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [isMobile,  setIsMobile]  = useState<boolean>(false);
  const [status,    setStatus]    = useState<string>('detecting');
  const [loadPct,   setLoadPct]   = useState<number>(0);
  const [arSupport, setArSupport] = useState<boolean>(false);
  const [placed,    setPlaced]    = useState<boolean>(false);
  const [hint,      setHint]      = useState<string>('');
  const [errorMsg,  setErrorMsg]  = useState<string>('');
  const [debugLog,  setDebugLog]  = useState<string[]>([]);

  const log = (msg: string) => {
    console.log('[AR]', msg);
    setDebugLog(p => [...p.slice(-6), msg]);
  };

  const threeRef = useRef<any>(null);
  const xrRef    = useRef<any>({
    session:  null,
    hitSrc:   null,
    renderer: null,
    scene:    null,
    camera:   null,
    reticle:  null,
    model:    null,
    placed:   false,
    refSpace: null,
  });

  // ── Step 1: Detect device ─────────────────────────────────────────────────
  useEffect(() => {
    const mobile = isMobileDevice();
    setIsMobile(mobile);
    log(`Device: ${mobile ? 'MOBILE' : 'DESKTOP'}`);
    log(`Screen: ${window.innerWidth}x${window.innerHeight}`);
    log(`Touch: ${navigator.maxTouchPoints}`);

    setStatus('loading-model');

    if (mobile) {
      checkWebXR().then(ok => {
        log(`WebXR: ${ok}`);
        setArSupport(ok);
      });
    }

    return () => {
      if (threeRef.current) {
        cancelAnimationFrame(threeRef.current.animId);
        threeRef.current.renderer?.dispose();
        threeRef.current = null;
      }
      xrRef.current.session?.end().catch(() => {});
    };
  }, [glbUrl]);

  // ── Step 2: Start Three.js once canvas is mounted ────────────────────────
  useEffect(() => {
    if (status !== 'loading-model') return;
    if (!canvasRef.current) return;
    loadModel();
  }, [status, isMobile]);

  // ── Three.js 360° viewer ─────────────────────────────────────────────────
  function loadModel() {
    const canvas = canvasRef.current!;
    log('Starting Three.js...');

    const w = canvas.clientWidth  || window.innerWidth;
    const h = canvas.clientHeight || 360;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0d0a);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 100);
    camera.position.set(0, 0.5, 2);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    renderer.outputColorSpace    = THREE.SRGBColorSpace;
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;

    scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    const dir = new THREE.DirectionalLight(0xffeedd, 2.5);
    dir.position.set(3, 5, 3);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0xaaccff, 0.5);
    fill.position.set(-3, 2, -2);
    scene.add(fill);
    scene.add(new THREE.GridHelper(4, 20, 0x222222, 0x1a1a1a));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping   = true;
    controls.dampingFactor   = 0.08;
    controls.autoRotate      = true;
    controls.autoRotateSpeed = 1.5;
    controls.enableZoom      = true;
    controls.enablePan       = false;
    controls.target.set(0, 0.3, 0);

    log('Loading GLB...');
    const loader = new GLTFLoader();
    loader.load(
      glbUrl,
      (gltf: any) => {
        const model = gltf.scene;
        const box   = new THREE.Box3().setFromObject(model);
        const size  = box.getSize(new THREE.Vector3());
        const scale = 1.2 / Math.max(size.x, size.y, size.z);
        model.scale.setScalar(scale);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center.multiplyScalar(scale));
        model.position.y = -box.min.y * scale;
        scene.add(model);
        setLoadPct(100);
        setStatus('model-ready');
        log('GLB loaded OK ✓');
      },
      (xhr: any) => {
        if (xhr.total) {
          const pct = Math.round((xhr.loaded / xhr.total) * 100);
          setLoadPct(pct);
        }
      },
      (err: any) => {
        log(`GLB error: ${err?.message}`);
        setErrorMsg(
          'Failed to load 3D model. Presigned URL may have expired — refresh the page.',
        );
        setStatus('error');
      },
    );

    let animId: number = 0;
    const tick = () => {
      animId = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    const onResize = () => {
      const w2 = canvas.clientWidth  || window.innerWidth;
      const h2 = canvas.clientHeight || 360;
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
    };
    window.addEventListener('resize', onResize);

    threeRef.current = {
      renderer, animId, camera, controls,
      cleanup: () => window.removeEventListener('resize', onResize),
    };
  }

  // ── WebXR AR session ──────────────────────────────────────────────────────
  async function startAR() {
  log('Starting Camera AR (no WebXR needed)...');
  try {
    // ── Step 1: Get camera stream ─────────────────────────────────────
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment', // back camera
        width:  { ideal: window.innerWidth },
        height: { ideal: window.innerHeight },
      },
      audio: false,
    });
    log('Camera stream ready ✓');

    // ── Step 2: Create video element as background ────────────────────
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay  = true;
    video.playsInline = true;
    video.muted     = true;
    video.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;' +
      'object-fit:cover;z-index:9990;';
    document.body.appendChild(video);
    await video.play();
    log('Video playing ✓');

    // ── Step 3: Three.js canvas overlay ──────────────────────────────
    const arRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    arRenderer.setPixelRatio(window.devicePixelRatio);
    arRenderer.setSize(window.innerWidth, window.innerHeight);
    arRenderer.setClearColor(0x000000, 0); // transparent background
    arRenderer.domElement.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9991;';
    document.body.appendChild(arRenderer.domElement);

    const arScene  = new THREE.Scene();
    const arCamera = new THREE.PerspectiveCamera(
      70, window.innerWidth / window.innerHeight, 0.01, 20,
    );

    arScene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const arDir = new THREE.DirectionalLight(0xffeedd, 2);
    arDir.position.set(1, 3, 1);
    arScene.add(arDir);

    // ── Step 4: Load GLB model ────────────────────────────────────────
    const loader = new GLTFLoader();
    let model: any = null;

    loader.load(
      glbUrl,
      (gltf: any) => {
        model = gltf.scene;
        const box   = new THREE.Box3().setFromObject(model);
        const size  = box.getSize(new THREE.Vector3());
        const scale = 0.4 / Math.max(size.x, size.y, size.z);
        model.scale.setScalar(scale);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center.multiplyScalar(scale));
        // Place model in center of view
        model.position.set(0, -0.3, -1.2);
        arScene.add(model);
        xrRef.current.model = model;
        log('AR model placed ✓');
        setPlaced(true);
        setHint('Drag to rotate · Pinch to scale');
      },
      undefined,
      (err: any) => log(`GLB err: ${err?.message}`),
    );

    // ── Step 5: Touch controls for rotation + scale ───────────────────
    let lastTouchX   = 0;
    let lastTouchY   = 0;
    let lastPinchDist = 0;
    let modelScale   = 1.0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
      }
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDist = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const m = xrRef.current.model;
      if (!m) return;

      if (e.touches.length === 1) {
        // Single finger — rotate model
        const dx = (e.touches[0].clientX - lastTouchX) * 0.01;
        const dy = (e.touches[0].clientY - lastTouchY) * 0.01;
        m.rotation.y += dx;
        m.rotation.x += dy;
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
      }

      if (e.touches.length === 2) {
        // Two fingers — pinch to scale
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const delta = dist / lastPinchDist;
        modelScale = Math.max(0.2, Math.min(3.0, modelScale * delta));
        const base = 0.4 / Math.max(1, 1); // base scale factor
        m.scale.setScalar(base * modelScale);
        lastPinchDist = dist;
      }
    };

    arRenderer.domElement.addEventListener('touchstart', onTouchStart, { passive: false });
    arRenderer.domElement.addEventListener('touchmove',  onTouchMove,  { passive: false });

    // ── Step 6: Render loop ───────────────────────────────────────────
    let animId = 0;
    const tick = () => {
      animId = requestAnimationFrame(tick);
      // Gentle auto-rotation when not touching
      if (xrRef.current.model && !xrRef.current.touching) {
        xrRef.current.model.rotation.y += 0.005;
      }
      arRenderer.render(arScene, arCamera);
    };
    tick();

    // ── Step 7: Store cleanup ─────────────────────────────────────────
    Object.assign(xrRef.current, {
      session:  null, // no XR session
      renderer: arRenderer,
      scene:    arScene,
      camera:   arCamera,
      placed:   true,
      // Custom cleanup
      cameraCleanup: () => {
        cancelAnimationFrame(animId);
        stream.getTracks().forEach(t => t.stop());
        video.remove();
        arRenderer.domElement.remove();
        arRenderer.dispose();
        arRenderer.domElement.removeEventListener('touchstart', onTouchStart);
        arRenderer.domElement.removeEventListener('touchmove',  onTouchMove);
      },
    });

    setStatus('ar-active');
    setPlaced(true);
    setHint('Drag to rotate · Pinch to scale');
    log('Camera AR active ✓');

  } catch (err: any) {
    log(`Camera AR error: ${err?.message}`);
    if (err?.name === 'NotAllowedError') {
      setErrorMsg('Camera permission denied. Please allow camera access and try again.');
    } else {
      setErrorMsg(`AR failed: ${err?.message ?? 'Unknown error'}`);
    }
    setStatus('error');
  }
}

  function endAR() {
  // Camera-based AR cleanup
  if (xrRef.current.cameraCleanup) {
    xrRef.current.cameraCleanup();
    xrRef.current.cameraCleanup = null;
  }
  // WebXR cleanup
  xrRef.current.session?.end().catch(() => {});
  setStatus('model-ready');
  setPlaced(false);
}

 function reposition() {
  const xr = xrRef.current;
  if (xr.model) {
    xr.model.position.set(0, -0.3, -1.2);
    xr.model.rotation.set(0, 0, 0);
  }
  setHint('Drag to rotate · Pinch to scale');
}
  // ── AR ACTIVE overlay ─────────────────────────────────────────────────────
  if (status === 'ar-active') {
    return (
      <div
        ref={overlayRef}
        className="fixed inset-0"
        style={{ zIndex: 9999, pointerEvents: 'none' }}
      >
        {/* Top bar */}
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-5"
          style={{
            pointerEvents: 'auto',
            background: 'linear-gradient(to bottom,rgba(0,0,0,0.75),transparent)',
          }}
        >
          <div
            className="flex items-center gap-2 rounded-full px-3 py-1.5"
            style={{ background: 'rgba(0,0,0,0.6)' }}
          >
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-white text-[12px] font-medium">AR Live</span>
          </div>

          <p className="font-serif text-white text-[16px] font-semibold drop-shadow">
            {itemName}
          </p>

          <button
            onClick={endAR}
            className="rounded-full px-4 py-1.5 text-white text-[13px] font-medium"
            style={{ pointerEvents: 'auto', background: 'rgba(0,0,0,0.6)' }}
          >
            Exit AR
          </button>
        </div>

        {/* Debug lines */}
        <div
          className="absolute left-4 right-4"
          style={{ top: 90, pointerEvents: 'none' }}
        >
          {debugLog.slice(-3).map((l, i) => (
            <p key={i} className="text-[10px] text-white/50 font-mono">{l}</p>
          ))}
        </div>

        {/* Hint */}
        <div
          className="absolute left-0 right-0 flex justify-center"
          style={{ bottom: 150, pointerEvents: 'none' }}
        >
          <div
            className="rounded-full px-5 py-2.5"
            style={{ background: 'rgba(0,0,0,0.65)' }}
          >
            <p className="text-white text-[13px] text-center">{hint}</p>
          </div>
        </div>

        {/* Reposition */}
        {placed && (
          <div
            className="absolute left-0 right-0 flex justify-center"
            style={{ bottom: 70, pointerEvents: 'auto' }}
          >
            <button
              onClick={reposition}
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-white text-[13px]"
              style={{ background: 'rgba(0,0,0,0.65)' }}
            >
              <RotateCcw size={15} /> Reposition
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div
        className="w-full flex flex-col items-center justify-center gap-4 rounded-[24px] py-16 px-6"
        style={{ background: '#0f0d0a', border: '0.5px solid rgba(239,83,80,0.20)' }}
      >
        <AlertCircle size={36} className="text-red-400" />
        <p className="text-[14px] text-white/50 text-center max-w-[280px] leading-relaxed">
          {errorMsg}
        </p>
        {debugLog.map((l, i) => (
          <p key={i} className="text-[10px] text-white/25 font-mono text-center">{l}</p>
        ))}
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2 rounded-xl border border-white/10 text-white/40 text-[13px]"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          Retry
        </button>
      </div>
    );
  }

  // ── CANVAS — desktop 360° + mobile 3D preview ─────────────────────────────
  return (
    <div className="w-full flex flex-col gap-4">

      {/* Canvas */}
      <div
        className="relative w-full rounded-[24px] overflow-hidden border border-white/[0.06]"
        style={{ height: isMobile ? 360 : 480, background: '#0f0d0a' }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block' }}
        />

        {/* Loading overlay */}
        {(status === 'detecting' || status === 'loading-model' || loadPct < 100) && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-4"
            style={{ background: 'rgba(15,13,10,0.92)' }}
          >
            <div className="text-[60px] opacity-40">{emoji}</div>
            <div
              className="flex items-center gap-2"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              <Loader2 size={16} className="animate-spin" />
              <span className="text-[13px]">
                {status === 'detecting'
                  ? 'Detecting device…'
                  : `Loading 3D model… ${loadPct}%`}
              </span>
            </div>
            <div
              className="w-48 h-[3px] rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${loadPct}%`, background: 'rgba(212,163,78,0.6)' }}
              />
            </div>
            <div className="mt-2 px-4">
              {debugLog.map((l, i) => (
                <p
                  key={i}
                  className="text-[10px] font-mono text-center"
                  style={{ color: 'rgba(255,255,255,0.25)' }}
                >
                  {l}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Badge */}
        {status === 'model-ready' && (
          <div
            className="absolute top-4 left-4 flex items-center gap-2 rounded-full px-3 py-1.5"
            style={{ background: 'rgba(0,0,0,0.55)' }}
          >
            {isMobile
              ? <Smartphone size={13} style={{ color: '#d4a34e' }} />
              : <Monitor    size={13} style={{ color: '#d4a34e' }} />}
            <span
              className="text-[11px] font-medium"
              style={{ color: 'rgba(255,255,255,0.6)' }}
            >
              {isMobile ? '3D Preview' : '360° View — Drag to rotate'}
            </span>
          </div>
        )}

        {/* Desktop zoom controls */}
        {status === 'model-ready' && !isMobile && (
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            {[
              {
                icon: <RotateCcw size={15} />,
                action: () => {
                  if (threeRef.current?.controls)
                    threeRef.current.controls.autoRotate =
                      !threeRef.current.controls.autoRotate;
                },
              },
              {
                icon: <ZoomIn size={15} />,
                action: () => {
                  if (threeRef.current?.camera)
                    threeRef.current.camera.position.multiplyScalar(0.85);
                },
              },
              {
                icon: <ZoomOut size={15} />,
                action: () => {
                  if (threeRef.current?.camera)
                    threeRef.current.camera.position.multiplyScalar(1.15);
                },
              },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={btn.action}
                className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/10 transition-all"
                style={{ background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.5)' }}
              >
                {btn.icon}
              </button>
            ))}
          </div>
        )}

        <p
          className="absolute bottom-4 left-4 text-[11px] pointer-events-none"
          style={{ color: 'rgba(255,255,255,0.2)' }}
        >
          {isMobile ? 'Drag to rotate · Pinch to zoom' : 'Drag to rotate · Scroll to zoom'}
        </p>
      </div>

      {/* Mobile: AR launch button */}
     {isMobile && status === 'model-ready' && (
      <div className="flex flex-col gap-3">
        {true ? (
            <>
              <button
                onClick={startAR}
                className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-medium text-[16px] active:scale-95 transition-all"
                style={{
                  background: 'linear-gradient(135deg,#d4a34e,#c4873c)',
                  color: '#0f0d0a',
                }}
              >
                <Smartphone size={22} />
                Launch AR View
              </button>
              <p
                className="text-center text-[11px]"
                style={{ color: 'rgba(255,255,255,0.2)' }}
              >
                Places the dish on your real table using your camera
              </p>
            </>
          ) : (
            <div
              className="w-full rounded-2xl p-4 border border-white/[0.06]"
              style={{ background: '#111114' }}
            >
              <p className="text-[13px] text-white/40 mb-2 text-center">
                WebXR AR not available
              </p>
              <p className="text-[11px] text-white/25 mb-3 text-center">
                Enable in Chrome then refresh:
              </p>
              {[
                'chrome://flags/#unsafely-treat-insecure-origin-as-secure',
                'chrome://flags/#webxr-incubations',
                'chrome://flags/#enable-webxr-ar-module',
              ].map((flag) => (
                <div
                  key={flag}
                  className="mb-2 px-3 py-2 rounded-xl border border-white/[0.07]"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <p
                    className="text-[10px] font-mono break-all"
                    style={{ color: '#d4a34e' }}
                  >
                    {flag}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Debug panel */}
      {debugLog.length > 0 && status === 'model-ready' && (
        <div
          className="rounded-xl p-3 border border-white/[0.05]"
          style={{ background: 'rgba(0,0,0,0.4)' }}
        >
          <p className="text-[9px] text-white/15 uppercase tracking-widest mb-1 font-mono">
            Debug
          </p>
          {debugLog.map((l, i) => (
            <p key={i} className="text-[10px] text-white/30 font-mono leading-relaxed">
              {l}
            </p>
          ))}
          <p
            className="text-[10px] font-mono mt-1"
            style={{ color: arSupport ? '#81c784' : '#ef6e6b' }}
          >
            WebXR: {arSupport ? 'SUPPORTED ✓' : 'NOT SUPPORTED ✗'}
          </p>
          <p className="text-[10px] text-white/20 font-mono">
            Protocol: {typeof window !== 'undefined' ? window.location.protocol : ''}
          </p>
        </div>
      )}

      {/* DOM overlay div for WebXR */}
      <div
        ref={overlayRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 9999 }}
      />
    </div>
  );
}