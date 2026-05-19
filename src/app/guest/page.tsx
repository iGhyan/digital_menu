'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MapPin, ShoppingCart, Leaf, Radio, Cuboid } from 'lucide-react';
import { Suspense } from 'react';

const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? '';

function GuestContent() {
  const params = useSearchParams();
  const rid = params.get('rid') || RESTAURANT_ID;
  const tid = params.get('tid') || 'T07';

  // Parse table number from tid (e.g. "T07" → "07")
  const tableNum = tid.replace(/^T/, '');

  const [zone, setZone] = useState('Main Hall');

  useEffect(() => {
    // Derive zone from table number for display
    const n = parseInt(tableNum, 10);
    if (n >= 9 && n <= 10) setZone('Garden Terrace');
    else if (n >= 11) setZone('Private Dining');
    else setZone('Main Hall');

    // Store session info in sessionStorage for use across app
    sessionStorage.setItem('lm_rid', rid);
    sessionStorage.setItem('lm_tid', tid);
    sessionStorage.setItem('lm_table', tableNum);
  }, [rid, tid, tableNum]);

  const isQrScan = params.has('rid') && params.has('tid');

  return (
    <main className="min-h-dvh bg-black from-slate-50 to-teal-50/40 flex flex-col items-center justify-center">
      {/* Decorative blobs */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-teal-100/40 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
      <div className="fixed bottom-0 left-0 w-80 h-80 bg-brand-100/30 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2" />

      <div className="phone-shell animate-fade-up">

        {/* Header strip */}
        <div className="mx-4 mt-3 rounded-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-teal-100 text-[11px] uppercase tracking-widest font-semibold mb-0.5">Now Open</p>
            <h1 className="font-serif text-white text-[24px] font-semibold leading-tight">Das Pardes</h1>
            <p className="font-serif italic text-teal-100 text-[13px]">Fine Dining Experience</p>
          </div>
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm">
            🍽️
          </div>
        </div>

        <div className="flex flex-col px-5 pt-4 pb-0 flex-1">

          {/* QR scan badge */}
          {isQrScan ? (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3.5 py-2 self-start mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-blink" />
              <span className="text-[11px] text-green-700 font-semibold uppercase tracking-widest">✓ QR Verified · Secure Session</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-full px-3.5 py-2 self-start mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              <span className="text-[11px] text-brand-700 font-semibold uppercase tracking-widest">Guest Session · Demo Mode</span>
            </div>
          )}

          {/* Table card */}
          <div className="card p-4 flex items-center gap-3.5 mb-4">
            <div className="w-12 h-12 rounded-[14px] bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <MapPin size={20} className="text-brand-600" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] text-ink-400 uppercase tracking-widest font-semibold mb-0.5">Your Table</p>
              <p className="font-serif text-[20px] text-ink-900 font-semibold">Table {tableNum}</p>
              <p className="text-[12px] text-ink-400">{zone}</p>
            </div>
            <div className="w-7 h-7 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
              <span className="text-green-600 text-xs font-bold">✓</span>
            </div>
          </div>

          {/* Session info */}
          {isQrScan && (
            <div className="flex gap-2 mb-4">
              <div className="flex-1 bg-ink-50 rounded-xl p-2.5 border border-ink-100">
                <p className="text-[10px] text-ink-400 uppercase tracking-widest font-semibold mb-0.5">Restaurant</p>
                <p className="text-[11px] text-ink-600 font-mono-dm truncate">{rid.slice(0, 8)}…</p>
              </div>
              <div className="flex-1 bg-ink-50 rounded-xl p-2.5 border border-ink-100">
                <p className="text-[10px] text-ink-400 uppercase tracking-widest font-semibold mb-0.5">Table ID</p>
                <p className="text-[12px] text-ink-700 font-semibold">{tid}</p>
              </div>
            </div>
          )}

          {/* Features */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[
              { icon: '📖', label: 'Menu'     },
              { icon: '🛒', label: 'Order'    },
              { icon: '📡', label: 'Track'    },
              { icon: '🫙', label: 'AR View'  },
            ].map((f) => (
              <div key={f.label} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-ink-50 border border-ink-100">
                <span className="text-xl">{f.icon}</span>
                <span className="text-[10px] text-ink-500 font-medium text-center">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 flex flex-col gap-3">
          <Link
            href={`/guest/menu?rid=${rid}&tid=${tid}`}
            className="btn-primary shimmer"
          >
            <ShoppingCart size={18} />
            Browse Our Menu
          </Link>
          <button className="btn-ghost">
            <Leaf size={15} />
            View Allergen Guide
          </button>
          <div className="flex justify-center gap-4 mt-1">
            {['EN', 'اردو', 'FR', 'AR'].map((l, i) => (
              <button key={l} className={`text-xs font-medium transition-colors ${i === 0 ? 'text-brand-600' : 'text-ink-300 hover:text-brand-500'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function GuestLandingPage() {
  return (
    <Suspense fallback={
      <main className="min-h-dvh bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <GuestContent />
    </Suspense>
  );
}