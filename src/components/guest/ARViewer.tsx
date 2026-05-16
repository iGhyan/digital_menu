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
    log('Starting WebXR AR...');
    try {
      const arRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      arRenderer.setPixelRatio(window.devicePixelRatio);
      arRenderer.xr.enabled = true;
      arRenderer.outputColorSpace = THREE.SRGBColorSpace;
      arRenderer.domElement.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9997;';
      document.body.appendChild(arRenderer.domElement);

      const arScene  = new THREE.Scene();
      const arCamera = new THREE.PerspectiveCamera(
        70, window.innerWidth / window.innerHeight, 0.01, 20,
      );

      arScene.add(new THREE.AmbientLight(0xffffff, 1.5));
      const arDir = new THREE.DirectionalLight(0xffeedd, 2);
      arDir.position.set(1, 3, 1);
      arScene.add(arDir);

      // Gold reticle ring for surface detection
      const geo     = new THREE.RingGeometry(0.08, 0.11, 32).rotateX(-Math.PI / 2);
      const mat     = new THREE.MeshBasicMaterial({ color: 0xd4a34e, side: THREE.DoubleSide });
      const reticle = new THREE.Mesh(geo, mat);
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      arScene.add(reticle);

      log('Requesting XR session...');

      // ── KEY FIX: hit-test is optional, not required ──────────────────────
      const sessionInit: any = {
        requiredFeatures: [],
        optionalFeatures: ['hit-test', 'dom-overlay', 'anchors'],
      };
      if (overlayRef.current) {
        sessionInit.domOverlay = { root: overlayRef.current };
      }

      const session: XRSession = await (navigator as any).xr.requestSession(
        'immersive-ar', sessionInit,
      );
      log('XR session granted ✓');

      arRenderer.xr.setReferenceSpaceType('local');
      await arRenderer.xr.setSession(session);

      const refSpace  = await session.requestReferenceSpace('local');

      // ── Hit-test source — optional, don't fail if unsupported ────────────
      let hitSrc: any = null;
      try {
        const viewerSpc = await session.requestReferenceSpace('viewer');
        hitSrc = await (session as any).requestHitTestSource({ space: viewerSpc });
        log('Hit-test source ready ✓');
      } catch {
        log('Hit-test not available — tap to place at fixed position');
      }

      Object.assign(xrRef.current, {
        session,
        hitSrc,
        renderer: arRenderer,
        scene:    arScene,
        camera:   arCamera,
        reticle,
        refSpace,
        placed:   false,
      });

      // Load GLB for AR
      const loader = new GLTFLoader();
      loader.load(
        glbUrl,
        (gltf: any) => {
          const model = gltf.scene;
          const box   = new THREE.Box3().setFromObject(model);
          const size  = box.getSize(new THREE.Vector3());
          const scale = 0.25 / Math.max(size.x, size.y, size.z);
          model.scale.setScalar(scale);
          model.visible = false;
          arScene.add(model);
          xrRef.current.model = model;
          log('AR model ready — point at surface');
        },
        undefined,
        (err: any) => log(`AR GLB err: ${err?.message}`),
      );

      setStatus('ar-active');
      setPlaced(false);
      setHint('Point camera at a flat surface');

      // ── XR render loop ───────────────────────────────────────────────────
      arRenderer.setAnimationLoop((_time: number, frame: any) => {
        if (!frame) return;
        const xr = xrRef.current;

        // Hit-test surface detection (only if supported)
        if (!xr.placed && xr.hitSrc) {
          try {
            const hits = frame.getHitTestResults(xr.hitSrc);
            if (hits.length > 0) {
              const pose = hits[0].getPose(xr.refSpace);
              if (pose) {
                reticle.visible = true;
                reticle.matrix.fromArray(pose.transform.matrix);
              }
            } else {
              reticle.visible = false;
            }
          } catch {
            reticle.visible = false;
          }
        }

        // No hit-test available — show reticle at fixed position in front
        if (!xr.hitSrc && !xr.placed) {
          reticle.visible = true;
          reticle.matrixAutoUpdate = true;
          reticle.position.set(0, -0.3, -0.8);
        }

        arRenderer.render(arScene, arCamera);
      });

      // ── Tap to place model ───────────────────────────────────────────────
      session.addEventListener('select', () => {
        const xr = xrRef.current;
        if (xr.placed || !xr.model) return;

        if (reticle.visible && xr.hitSrc) {
          // Place at hit-test position
          const pos = new THREE.Vector3();
          const rot = new THREE.Quaternion();
          const scl = new THREE.Vector3();
          reticle.matrix.decompose(pos, rot, scl);
          xr.model.position.copy(pos);
          xr.model.quaternion.copy(rot);
        } else {
          // No hit-test — place 0.8m in front of camera
          xr.model.position.set(0, -0.3, -0.8);
        }

        xr.model.visible = true;
        reticle.visible  = false;
        xr.placed        = true;
        setPlaced(true);
        setHint('Tap & drag to rotate · Pinch to scale');
        log('Model placed! ✓');
      });

      session.addEventListener('end', () => {
        log('XR session ended');
        arRenderer.setAnimationLoop(null);
        arRenderer.domElement.remove();
        arRenderer.dispose();
        setStatus('model-ready');
        setPlaced(false);
      });

    } catch (err: any) {
      log(`XR error: ${err?.message ?? String(err)}`);
      setErrorMsg(`WebXR failed: ${err?.message ?? 'Unknown error'}`);
      setStatus('error');
    }
  }

  function endAR() {
    xrRef.current.session?.end().catch(() => {});
  }

  function reposition() {
    const xr = xrRef.current;
    if (xr.model) xr.model.visible = false;
    xr.placed = false;
    setPlaced(false);
    setHint('Point camera at a flat surface');
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
          {arSupport ? (
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