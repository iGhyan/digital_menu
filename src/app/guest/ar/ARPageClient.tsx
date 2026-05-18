'use client';

import { useEffect, useState, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, Loader2, AlertCircle } from 'lucide-react';

// Use React lazy instead of Next.js dynamic to avoid SSR issues on mobile
const ARViewer = lazy(() => import('@/components/guest/ARViewer'));

interface Props {
  restaurantId: string;
  itemId:       string;
  itemName:     string;
  emoji:        string;
}

export default function ARPageClient({ restaurantId, itemId, itemName, emoji }: Props) {
  const router = useRouter();

  const [glbUrl,   setGlbUrl]   = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [debugMsg, setDebugMsg] = useState<string[]>([]);

  const log = (msg: string) => {
    console.log('[ARPage]', msg);
    setDebugMsg(p => [...p.slice(-5), msg]);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const origin = window.location.origin;
        const url    = `${origin}/api/ar?rid=${encodeURIComponent(restaurantId)}&iid=${encodeURIComponent(itemId)}`;

        log(`Fetching: ${url}`);

        const controller = new AbortController();
        const timeout    = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(url, {
          cache:  'no-store',
          signal: controller.signal,
        });

        clearTimeout(timeout);
        log(`Response: ${res.status}`);

        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status}: ${body}`);
        }

        const data = await res.json();
        log(`Got presignedUrl: ${data.presignedUrl ? 'YES' : 'NO'}`);

        if (!data.presignedUrl) throw new Error('No presignedUrl in response');

        if (!cancelled) setGlbUrl(data.presignedUrl);
      } catch (err: any) {
        const msg = err?.name === 'AbortError'
          ? 'Request timed out after 15s — check network'
          : err?.message ?? 'Unknown error';
        log(`Error: ${msg}`);
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();

    return () => { cancelled = true; };
  }, [restaurantId, itemId]);

  return (
    <main
      className="min-h-dvh flex flex-col items-center p-4 md:p-8"
      style={{ background: '#0c0c0e' }}
    >
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(212,163,78,0.10) 0%, transparent 70%)',
        }}
      />

      <div className="w-full relative z-10">

        {/* Top nav */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.07] transition-colors flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <ArrowLeft size={18} className="text-white/60" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-[20px] text-[#f5e9d0] font-semibold leading-tight truncate">
              {itemName}
            </h1>
            <p className="text-[11px] text-white/30 mt-0.5 flex items-center gap-1.5">
              <Eye size={11} /> AR &amp; 3D Preview
            </p>
          </div>

          {/* Status badge */}
          {fetching && (
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 border border-white/[0.07] flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <Loader2 size={11} className="animate-spin text-white/30" />
              <span className="text-[10px] text-white/30 uppercase tracking-widest">Loading</span>
            </div>
          )}
          {!fetching && glbUrl && (
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 flex-shrink-0"
              style={{
                background: 'rgba(212,163,78,0.10)',
                border: '0.5px solid rgba(212,163,78,0.25)',
              }}
            >
              <span
                className="text-[10px] font-medium uppercase tracking-widest"
                style={{ color: '#14b8a6' }}
              >
                Model Ready
              </span>
            </div>
          )}
        </div>

        {/* API info card */}
        <div
          className="rounded-2xl p-4 mb-4 flex items-start gap-3 border border-white/[0.06]"
          style={{ background: '#111114' }}
        >
          <div className="text-[28px] flex-shrink-0 mt-0.5">{emoji}</div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[#f5e9d0] mb-1">{itemName}</p>
            <p className="text-[11px] text-white/25 break-all leading-relaxed">
              <span className="text-white/40">Item ID: </span>{itemId}
            </p>
            <p className="text-[11px] text-white/25 mt-0.5">
              <span className="text-white/40">Expires: </span>15 min · Presigned S3 GLB
            </p>
          </div>
          {fetching && (
            <Loader2 size={16} className="animate-spin text-white/25 flex-shrink-0 mt-1" />
          )}
          {!fetching && glbUrl && (
            <span
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-green-400 text-xs"
              style={{
                background: 'rgba(76,175,80,0.10)',
                border: '0.5px solid rgba(76,175,80,0.20)',
              }}
            >
              ✓
            </span>
          )}
        </div>


        {/* ── Loading state ── */}
        {fetching && (
          <div
            className="w-full flex flex-col items-center justify-center gap-4 rounded-[24px] border border-white/[0.06] py-16"
            style={{ background: '#111114' }}
          >
            <div className="text-[60px] opacity-30">{emoji}</div>
            <div className="flex items-center gap-2 text-white/30">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-[13px]">Fetching model URL…</span>
            </div>
            <div
              className="w-48 h-[3px] rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div
                className="h-full rounded-full w-1/3 animate-pulse"
                style={{ background: 'rgba(212,163,78,0.4)' }}
              />
            </div>
          </div>
        )}

        {/* ── Error state ── */}
        {error && !fetching && (
          <div
            className="w-full flex flex-col items-center justify-center gap-4 rounded-[24px] py-16 px-6"
            style={{
              background: '#111114',
              border: '0.5px solid rgba(239,83,80,0.20)',
            }}
          >
            <AlertCircle size={36} className="text-red-400" />
            <div className="text-center max-w-[300px]">
              <p className="text-[14px] font-medium text-white/60 mb-2">
                Failed to load AR model
              </p>
              <p className="text-[12px] text-white/30 leading-relaxed font-mono break-all">
                {error}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl border border-white/[0.08] text-white/40 text-[13px] hover:bg-white/10 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── AR Viewer — renders once GLB URL is ready ── */}
        {!fetching && !error && glbUrl && (
          <Suspense
            fallback={
              <div
                className="w-full h-[400px] flex items-center justify-center gap-3 rounded-[24px] border border-white/[0.06]"
                style={{ background: '#ffffff' }}
              >
                <Loader2 size={20} className="animate-spin text-white/30" />
                <span className="text-[13px] text-white/30">Initialising viewer…</span>
              </div>
            }
          >
            <ARViewer glbUrl={glbUrl} itemName={itemName} emoji={emoji} />
          </Suspense>
        )}

        {/* ── Info footer ── */}
        {!fetching && !error && glbUrl && (
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { icon: '📱', title: 'Mobile AR',    desc: 'Place dish on real table via WebXR' },
              { icon: '🖥️', title: 'Desktop 360°', desc: 'Drag to rotate, scroll to zoom'     },
              { icon: '🍽️', title: 'True to size',  desc: 'Scaled to real-world dimensions'    },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl p-3.5 text-center border border-white/[0.06]"
                style={{ background: '#111114' }}
              >
                <div className="text-[24px] mb-2">{f.icon}</div>
                <p className="text-[12px] font-medium text-[#f5e9d0] mb-1">{f.title}</p>
                <p className="text-[10px] text-white/25 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}