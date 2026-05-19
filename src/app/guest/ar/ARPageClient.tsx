'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Cuboid, Loader2, AlertCircle } from 'lucide-react';
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
  restaurantId: string;
  itemId:       string;
  itemName:     string;
  emoji:        string;
}

// Fallback IDs — used only when URL params are missing
const FALLBACK_RID = '2687382e-3b00-4f57-9014-f484df89e3fe';
const FALLBACK_IID = 'e83ea14d-24ce-4ce9-9d24-5899143231f4';

export default function ARPageClient({ restaurantId, itemId, itemName, emoji }: Props) {
  const router = useRouter();

  // Use props if valid, otherwise fall back to demo IDs
  const rid = restaurantId?.trim() || FALLBACK_RID;
  const iid = itemId?.trim()       || FALLBACK_IID;

  const [glbUrl,  setGlbUrl]  = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    console.log('[AR] restaurantId:', rid, 'itemId:', iid);

    fetchArModel(rid, iid)
      .then(d => {
        console.log('[AR] presignedUrl received:', d.presignedUrl?.slice(0, 60));
        setGlbUrl(d.presignedUrl);
        setLoading(false);
      })
      .catch(e => {
        const msg = e?.message ?? 'Failed to load model';
        console.error('[AR] error:', msg);
        // Friendly message for item_not_found
        setError(
          msg.includes('item_not_found') || msg.includes('404')
            ? 'No 3D model available for this item yet.'
            : msg,
        );
        setLoading(false);
      });
  }, [rid, iid]);

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
          {!loading && !error && glbUrl && (
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
            <p className="text-[11px] text-ink-400 font-mono-dm">
              Item: {iid.slice(0,8)}…{iid.slice(-4)}
            </p>
            <p className="text-[11px] text-ink-400">Expires: 15 min · Presigned S3 GLB</p>
          </div>
          <Cuboid size={20} className="text-brand-500" />
        </div>

        {/* Viewer area */}
        <div className="flex-1 px-5 py-4">
          {loading && (
            <div className="w-full h-[320px] flex flex-col items-center justify-center gap-3 bg-ink-50 rounded-3xl border border-ink-100">
              <div className="text-5xl opacity-30">{emoji}</div>
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-brand-500" />
                <span className="text-[13px] text-ink-400">Fetching 3D model…</span>
              </div>
              <p className="text-[10px] text-ink-300 font-mono-dm">
                /api/ar?rid={rid.slice(0,8)}…&iid={iid.slice(0,8)}…
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="w-full h-[280px] flex flex-col items-center justify-center gap-3 bg-red-50 rounded-3xl border border-red-200 px-6 text-center">
              <AlertCircle size={32} className="text-red-400" />
              <p className="text-[14px] font-semibold text-red-700">
                {error.includes('No 3D model') ? '3D Model Coming Soon' : 'Failed to Load Model'}
              </p>
              <p className="text-[12px] text-red-500 leading-relaxed">{error}</p>
              {!error.includes('No 3D model') && (
                <button onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded-xl bg-red-100 border border-red-200 text-red-700 text-[13px] font-semibold hover:bg-red-200 transition-colors">
                  Retry
                </button>
              )}
            </div>
          )}

          {glbUrl && !loading && !error && (
            <ARViewer glbUrl={glbUrl} itemName={itemName} emoji={emoji} />
          )}
        </div>
      </div>
    </main>
  );
}