'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Cuboid, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import { fetchArModel } from '@/lib/ar-api';

const ARViewer = dynamic(
  () => import('@/components/guest/ARViewer'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] flex items-center justify-center gap-3 bg-ink-50 rounded-3xl border border-ink-100">
        <Loader2 size={20} className="animate-spin text-brand-400" />
        <span className="text-[13px] text-ink-400">Loading AR viewer…</span>
      </div>
    ),
  },
);

interface Props {
  restaurantId:     string;
  itemId:           string;
  itemName:         string;
  emoji:            string;
  preloadedGlbUrl?: string;  // from arModelUrl in menu API — skip AR API call
}

export default function ARPageClient({ restaurantId, itemId, itemName, emoji, preloadedGlbUrl }: Props) {
  const router = useRouter();
  const [glbUrl,  setGlbUrl]  = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [noModel, setNoModel] = useState(false);

  useEffect(() => {
    // ── Use preloaded URL from menu API response (fastest path) ────────────
    if (preloadedGlbUrl?.trim()) {
      setGlbUrl(preloadedGlbUrl.trim());
      setLoading(false);
      return;
    }

    // ── Need iid to call AR API ────────────────────────────────────────────
    if (!itemId?.trim()) {
      setError('No item selected. Please open AR from a menu item.');
      setLoading(false);
      return;
    }

    // ── Resolve rid: URL param → sessionStorage → env var ─────────────────
    const rid = restaurantId?.trim()
      || (typeof window !== 'undefined' ? sessionStorage.getItem('lm_rid') || '' : '')
      || process.env.NEXT_PUBLIC_RESTAURANT_ID
      || '53591ab9-ac4e-4841-958b-d38853a90f0b';

    fetchArModel(rid, itemId.trim())
      .then(d => {
        setGlbUrl(d.presignedUrl);
        setLoading(false);
      })
      .catch(e => {
        const msg: string = e?.message ?? '';
        setLoading(false);
        if (msg.includes('item_not_found') || msg.includes('404')) {
          setNoModel(true);
        } else {
          setError(msg || 'Failed to load 3D model.');
        }
      });
  }, [restaurantId, itemId, preloadedGlbUrl]);

  return (
    <main className="min-h-dvh bg-slate-50 flex flex-col items-center py-6 px-4">
      <div className="phone-shell">
        <div className="flex justify-between px-5 pt-4 text-xs text-ink-400">
          <span>9:44</span><span>●●●</span>
        </div>

        {/* Nav */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-ink-100">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-ink-50 border border-ink-200 flex items-center justify-center">
            <ArrowLeft size={16} className="text-ink-600" />
          </button>
          <div className="flex-1">
            <h1 className="font-serif text-[18px] text-ink-900 font-semibold">{itemName}</h1>
            <p className="text-[11px] text-ink-400">AR & 3D Preview</p>
          </div>
          {glbUrl && (
            <div className="bg-brand-50 border border-brand-200 rounded-full px-3 py-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-blink" />
              <span className="text-[10px] text-brand-700 font-semibold uppercase tracking-widest">Model Ready</span>
            </div>
          )}
        </div>

        {/* Item info */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-ink-100">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-2xl">
            {emoji}
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-ink-700">{itemName}</p>
            {itemId && (
              <p className="text-[11px] text-ink-400 font-mono-dm">
                ID: {itemId.slice(0,8)}…{itemId.slice(-4)}
              </p>
            )}
            <p className="text-[11px] text-ink-400">Presigned S3 GLB · 15 min</p>
          </div>
          <Cuboid size={20} className="text-brand-500" />
        </div>

        {/* Content area */}
        <div className="flex-1 px-5 py-4">

          {/* Loading */}
          {loading && (
            <div className="w-full h-[320px] flex flex-col items-center justify-center gap-3 bg-ink-50 rounded-3xl border border-ink-100">
              <div className="text-5xl opacity-30">{emoji}</div>
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-brand-500" />
                <span className="text-[13px] text-ink-400">Fetching 3D model…</span>
              </div>
            </div>
          )}

          {/* No model available — friendly, not an error */}
          {noModel && !loading && (
            <div className="w-full flex flex-col items-center justify-center gap-4 bg-brand-50 rounded-3xl border border-brand-100 px-6 py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-100 border border-brand-200 flex items-center justify-center">
                <Sparkles size={28} className="text-brand-500" />
              </div>
              <div>
                <p className="text-[16px] font-serif font-semibold text-ink-900 mb-1">
                  3D Model Coming Soon
                </p>
                <p className="text-[13px] text-ink-500 leading-relaxed">
                  Our team is crafting a 3D model for <strong>{itemName}</strong>.
                  Check back soon!
                </p>
              </div>
              <button onClick={() => router.back()}
                className="px-5 py-2.5 rounded-xl bg-brand-500 text-white text-[13px] font-semibold hover:bg-brand-600 transition-colors shadow-brand">
                ← Back to Menu
              </button>
            </div>
          )}

          {/* Error — something actually went wrong */}
          {error && !loading && (
            <div className="w-full flex flex-col items-center justify-center gap-3 bg-red-50 rounded-3xl border border-red-200 px-6 py-12 text-center">
              <AlertCircle size={32} className="text-red-400" />
              <p className="text-[14px] font-semibold text-red-700">Failed to Load Model</p>
              <p className="text-[12px] text-red-500 leading-relaxed">{error}</p>
              <button onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-red-100 border border-red-200 text-red-700 text-[13px] font-semibold hover:bg-red-200 transition-colors">
                Retry
              </button>
            </div>
          )}

          {/* AR viewer — only when we have a valid GLB URL */}
          {glbUrl && !loading && !error && (
            <ARViewer glbUrl={glbUrl} itemName={itemName} emoji={emoji} />
          )}

        </div>
      </div>
    </main>
  );
}