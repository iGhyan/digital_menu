'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MapPin, ShoppingCart, Leaf, Loader2 } from 'lucide-react';

// ── Fetch restaurant name from menu items API ─────────────────────────────────
// We read the restaurantId from the first item to confirm the restaurant
const MENU_RID = process.env.NEXT_PUBLIC_RESTAURANT_ID || '2687382e-3b00-4f57-9014-f484df89e3fe';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://g1ou0w5x4m.execute-api.ap-south-1.amazonaws.com/dev';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

function GuestContent() {
  const params = useSearchParams();

  // QR params — rid is the scanned restaurant session, tid is the table
  const qrRid = params.get('rid') || '';
  const tid   = params.get('tid') || '';

  // Table number from tid (e.g. "T07" → "07", "table-04" → "04")
  const tableNum = tid.replace(/^[Tt](?:able[-_]?)?/, '').replace(/\D/g, '') || '—';

  const [zone,           setZone]           = useState('Main Hall');
  const [restaurantName, setRestaurantName] = useState('Das Pardes');
  const [tagline,        setTagline]        = useState('Fine Dining Experience');
  const [loadingInfo,    setLoadingInfo]    = useState(true);

  useEffect(() => {
    const n = parseInt(tableNum, 10);
    if (n >= 9 && n <= 10) setZone('Garden Terrace');
    else if (n >= 11)      setZone('Private Dining');
    else                   setZone('Main Hall');

    // Store session info for use across the app
    if (qrRid) sessionStorage.setItem('lm_rid', qrRid);
    if (tid)   sessionStorage.setItem('lm_tid', tid);
    if (tableNum !== '—') sessionStorage.setItem('lm_table', tableNum);

    // Fetch menu items to get restaurant info dynamically
    fetch(`${API_BASE}/menus/restaurants/${MENU_RID}/items`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id':  TENANT_ID,
      },
      cache: 'no-store',
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const items = data?.items ?? data ?? [];
        if (items.length > 0) {
          // Use restaurantId from first item to confirm
          const firstItem = items[0];
          // If API returns restaurant name, use it
          if (firstItem?.restaurantName) setRestaurantName(firstItem.restaurantName);
          if (firstItem?.restaurantTagline) setTagline(firstItem.restaurantTagline);
        }
      })
      .catch(() => {}) // keep defaults on error
      .finally(() => setLoadingInfo(false));
  }, [qrRid, tid, tableNum]);

  const isQrScan = params.has('rid') && params.has('tid');

  return (
    <main className="min-h-dvh bg-black flex flex-col items-center justify-center">
      <div className="fixed top-0 right-0 w-96 h-96 bg-teal-100/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
      <div className="fixed bottom-0 left-0 w-80 h-80 bg-brand-100/10 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2" />

      <div className="phone-shell animate-fade-up">

        {/* Header */}
        <div className="mx-4 mt-3 rounded-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-teal-100 text-[11px] uppercase tracking-widest font-semibold mb-0.5">Now Open</p>
            <h1 className="font-serif text-white text-[24px] font-semibold leading-tight">
              {restaurantName}
            </h1>
            <p className="font-serif italic text-teal-100 text-[13px]">{tagline}</p>
          </div>
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm">
            🍽️
          </div>
        </div>

        <div className="flex flex-col px-5 pt-4 pb-0 flex-1">

          {/* QR badge */}
          {isQrScan ? (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3.5 py-2 self-start mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-blink" />
              <span className="text-[11px] text-green-700 font-semibold uppercase tracking-widest">
                ✓ QR Verified · Secure Session
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-full px-3.5 py-2 self-start mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              <span className="text-[11px] text-brand-700 font-semibold uppercase tracking-widest">
                Guest Session · Demo Mode
              </span>
            </div>
          )}

          {/* Table card — fully dynamic from QR */}
          <div className="card p-4 flex items-center gap-3.5 mb-4">
            <div className="w-12 h-12 rounded-[14px] bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <MapPin size={20} className="text-brand-600" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] text-ink-400 uppercase tracking-widest font-semibold mb-0.5">
                Your Table
              </p>
              <p className="font-serif text-[20px] text-ink-900 font-semibold">
                {tableNum !== '—' ? `Table ${tableNum}` : 'Walk-in Guest'}
              </p>
              <p className="text-[12px] text-ink-400">{zone}</p>
            </div>
            <div className="w-7 h-7 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
              <span className="text-green-600 text-xs font-bold">✓</span>
            </div>
          </div>

          {/* Session info — QR details */}
          {isQrScan && (
            <div className="flex gap-2 mb-4">
              <div className="flex-1 bg-ink-50 rounded-xl p-2.5 border border-ink-100">
                <p className="text-[10px] text-ink-400 uppercase tracking-widest font-semibold mb-0.5">
                  Restaurant ID
                </p>
                <p className="text-[11px] text-ink-600 font-mono-dm truncate">
                  {qrRid ? `${qrRid.slice(0, 8)}…` : MENU_RID.slice(0, 8) + '…'}
                </p>
              </div>
              <div className="flex-1 bg-ink-50 rounded-xl p-2.5 border border-ink-100">
                <p className="text-[10px] text-ink-400 uppercase tracking-widest font-semibold mb-0.5">
                  Table ID
                </p>
                <p className="text-[12px] text-ink-700 font-semibold">{tid || '—'}</p>
              </div>
            </div>
          )}

       
        </div>

        {/* Footer CTAs */}
        <div className="px-5 pb-8 flex flex-col gap-3">
          <Link
            href={`/guest/menu?rid=${qrRid}&tid=${tid}`}
            className="btn-gold shimmer flex items-center justify-center gap-2 h-14 rounded-2xl text-[15px] font-semibold"
          >
            <ShoppingCart size={18} />
            Browse Our Menu
          </Link>
          <button className="btn-ghost flex items-center justify-center gap-2">
            <Leaf size={15} />
            View Allergen Guide
          </button>
          {/* <div className="flex justify-center gap-4 mt-1">
            {['EN', 'اردو', 'FR', 'AR'].map((l, i) => (
              <button key={l} className={`text-xs font-medium transition-colors ${
                i === 0 ? 'text-brand-600' : 'text-ink-300 hover:text-brand-500'
              }`}>
                {l}
              </button>
            ))}
          </div> */}
        </div>

         <div className="flex justify-around items-center px-5 pt-3.5 pb-7 border-t border-white/[0.05] bg-[#14b8a60f]">
          {[
            { icon: '🏠', label: 'Home',   href: '/guest' },
            { icon: '📖', label: 'Menu',   href: '/guest/menu', active: true },
            { icon: '🛒', label: 'Cart',   href: '/guest/cart' },
            { icon: '🕐', label: 'Orders', href: '/guest/tracking' },
          ].map(n => (
            <Link key={n.label} href={n.href}
              className={`flex flex-col items-center gap-1 px-2.5 py-1 ${n.active ? 'text-gold-400' : 'text-white/20'}`}>
              <span className="text-[20px]">{n.icon}</span>
              <span className="text-[10px] font-medium">{n.label}</span>
            </Link>
          ))}
        </div>
      </div>
      
    </main>
  );
}

export default function GuestLandingPage() {
  return (
    <Suspense fallback={
      <main className="min-h-dvh bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-brand-500" />
          <p className="text-[13px] text-ink-400">Loading…</p>
        </div>
      </main>
    }>
      <GuestContent />
    </Suspense>
  );
}