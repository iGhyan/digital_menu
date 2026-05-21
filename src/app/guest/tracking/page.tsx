'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, CheckCircle, ChefHat, Bell, Bike } from 'lucide-react';

interface LineItem {
  name:                 string;
  itemId:               string;
  quantity:             number;
  unitPriceMinorUnits:  number;
  totalPriceMinorUnits: number;
}

interface ApiOrder {
  orderId:                string;
  status:                 string;
  tableId?:               string;
  lineItems:              LineItem[];
  placedAt?:              string;
  updatedAt?:             string;
  totalAmountMinorUnits?: number;
  currencyCode?:          string;
}

const STATUS_STEPS = [
  { key: 'RECEIVED',  label: 'Order Received',  icon: CheckCircle, desc: 'Your order is confirmed and sent to kitchen' },
  { key: 'PREPARING', label: 'Being Prepared',  icon: ChefHat,     desc: 'Our chef is cooking your meal'               },
  { key: 'READY',     label: 'Ready to Serve',  icon: Bell,        desc: 'Your food is ready — waiter coming soon!'    },
  { key: 'DELIVERED', label: 'Delivered',        icon: Bike,        desc: 'Enjoy your meal! 🎉'                         },
];

function getStepIndex(status: string): number {
  const s = (status ?? '').toUpperCase();
  if (s === 'RECEIVED' || s === 'PENDING') return 0;
  if (s === 'PREPARING' || s === 'IN_PROGRESS') return 1;
  if (s === 'READY' || s === 'READY_TO_SERVE') return 2;
  return 3; // DELIVERED, TIMED_OUT, CANCELLED, COMPLETED
}

function formatTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatRs(minor?: number) {
  if (!minor) return 'Rs 0';
  return 'Rs ' + (minor / 100).toLocaleString('en-PK');
}

const POLL_MS = 10000;

export default function TrackingPage() {
  const router = useRouter();

  const [orders,   setOrders]   = useState<ApiOrder[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [lastSync, setLastSync] = useState('');
  const [pollPct,  setPollPct]  = useState(0);

  // ── Fetch orders ──────────────────────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Orders API ${res.status}`);
      const data = await res.json();
      // Sort newest first
      const sorted = (data.orders ?? []).sort(
        (a: ApiOrder, b: ApiOrder) =>
          new Date(b.placedAt ?? 0).getTime() - new Date(a.placedAt ?? 0).getTime()
      );
      setOrders(sorted);
      setLastSync(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
      setError('');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  // Poll bar
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      setPollPct(((Date.now() - start) % POLL_MS) / POLL_MS * 100);
    }, 200);
    return () => clearInterval(id);
  }, [lastSync]);

  // Match to current table session — SSR-safe via state
  const [sessionTid,   setSessionTid]   = useState('');
  const [sessionTable, setSessionTable] = useState('');
  useEffect(() => {
    setSessionTid(sessionStorage.getItem('lm_tid') ?? '');
    setSessionTable(sessionStorage.getItem('lm_table') ?? '');
  }, []);

  const myOrders = orders.filter(o => {
    const t = (o.tableId ?? '').toLowerCase();
    return t === sessionTid.toLowerCase() ||
           t.includes(sessionTable) ||
           sessionTable && t.endsWith(sessionTable.padStart(2, '0'));
  });

  const displayOrders = myOrders.length > 0 ? myOrders : orders;
  const latest        = displayOrders[0];
  const currentStep   = latest ? getStepIndex(latest.status) : 0;
  const isCancelled   = latest?.status?.toUpperCase() === 'TIMED_OUT' ||
                        latest?.status?.toUpperCase() === 'CANCELLED';

  return (
    <main className="min-h-dvh bg-surface flex flex-col items-center">
      <div className="phone-shell">

        <div className="flex justify-between px-5 pt-4 text-xs text-white/35">
          <span>{new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</span>
          <span>●●●</span>
        </div>

        {/* Nav */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.05]">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
            <ArrowLeft size={16} className="text-white/60" />
          </button>
          <div className="flex-1">
            <h1 className="font-serif text-[20px] text-[#f5e9d0] font-semibold">Order Tracking</h1>
            <p className="text-[11px] text-white/30">
              {sessionTid ? `Table ${sessionTable} · ` : ''}Live updates every 10s
            </p>
          </div>
          <button onClick={() => load()}
            className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
            <RefreshCw size={14} className={`text-white/40 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Poll bar */}
        <div className="h-[2px] bg-white/[0.04]">
          <div className="h-full bg-gold-400/50 transition-all duration-200" style={{ width: `${pollPct}%` }} />
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-4">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <RefreshCw size={28} className="animate-spin text-gold-400/50" />
              <p className="text-[13px] text-white/30">Fetching your orders…</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center mb-4">
              <p className="text-[13px] text-red-300">{error}</p>
              <button onClick={() => load()} className="text-[12px] text-red-400 underline mt-1">Retry</button>
            </div>
          )}

          {/* No orders */}
          {!loading && !error && orders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <span className="text-4xl opacity-20">📋</span>
              <p className="text-[14px] font-medium text-white/30">No orders yet</p>
              <p className="text-[12px] text-white/20">Your orders will appear here once placed</p>
              <button onClick={() => router.push('/guest/menu')}
                className="mt-3 px-5 py-2.5 rounded-xl bg-gold-400/10 border border-gold-400/25 text-gold-400 text-[13px] font-medium">
                Browse Menu
              </button>
            </div>
          )}

          {/* Latest order */}
          {latest && !loading && (
            <>
              {/* Order card */}
              <div className={`rounded-2xl p-4 mb-5 border ${
                isCancelled
                  ? 'bg-red-500/[0.07] border-red-500/20'
                  : 'bg-gold-400/[0.07] border-gold-400/20'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-mono-dm text-[12px] text-white/40 mb-0.5">Order ID</p>
                    <p className="font-mono-dm text-[14px] text-gold-400 font-semibold">
                      #{latest.orderId.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <span className={`text-[11px] px-3 py-1.5 rounded-full font-semibold ${
                    latest.status === 'DELIVERED'  ? 'bg-green-500/15 text-green-400'  :
                    latest.status === 'READY'      ? 'bg-brand-500/15 text-brand-300'  :
                    latest.status === 'PREPARING'  ? 'bg-blue-500/15 text-blue-300'    :
                    isCancelled                    ? 'bg-red-500/15 text-red-400'      :
                                                     'bg-amber-500/15 text-amber-300'
                  }`}>
                    {isCancelled ? 'Cancelled' : latest.status}
                  </span>
                </div>
                <div className="flex gap-4 text-[11px] text-white/30">
                  <span>🕐 {formatTime(latest.placedAt)}</span>
                  <span>🪑 {latest.tableId ?? `Table ${sessionTable}`}</span>
                  <span>💰 {formatRs(latest.totalAmountMinorUnits)}</span>
                </div>
              </div>

              {/* Status timeline */}
              {!isCancelled && (
                <>
                  <p className="section-label mb-4">Live Status</p>
                  <div className="relative mb-6">
                    {/* Track line */}
                    <div className="absolute left-[19px] top-5 bottom-5 w-[2px] bg-white/[0.06]" />
                    <div
                      className="absolute left-[19px] top-5 w-[2px] bg-gold-400/60 transition-all duration-1000"
                      style={{ height: `calc(${(currentStep / (STATUS_STEPS.length - 1)) * 100}% )` }}
                    />

                    <div className="flex flex-col gap-7">
                      {STATUS_STEPS.map((step, i) => {
                        const done    = i < currentStep;
                        const current = i === currentStep;
                        const Icon    = step.icon;
                        return (
                          <div key={step.key} className="flex items-start gap-4 relative z-10">
                            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                              done    ? 'bg-gold-400/25 border-gold-400/70'    :
                              current ? 'bg-gold-400/15 border-gold-400 shadow-[0_0_16px_rgba(212,163,78,0.4)] animate-pulse' :
                                        'bg-white/[0.03] border-white/[0.08]'
                            }`}>
                              <Icon size={16} className={done || current ? 'text-gold-400' : 'text-white/20'} />
                            </div>
                            <div className="flex-1 pt-1.5">
                              <div className="flex items-center gap-2">
                                <p className={`text-[14px] font-semibold ${
                                  done || current ? 'text-[#f5e9d0]' : 'text-white/20'
                                }`}>
                                  {step.label}
                                </p>
                                {current && (
                                  <span className="text-[9px] bg-gold-400/20 text-gold-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest animate-blink">
                                    Live
                                  </span>
                                )}
                                {done && (
                                  <span className="text-[9px] text-green-400/70">✓</span>
                                )}
                              </div>
                              <p className={`text-[11px] mt-0.5 leading-relaxed ${
                                done || current ? 'text-white/35' : 'text-white/15'
                              }`}>
                                {step.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Cancelled state */}
              {isCancelled && (
                <div className="flex flex-col items-center py-8 gap-3 text-center mb-5">
                  <span className="text-4xl">❌</span>
                  <p className="text-[14px] font-semibold text-red-300">Order Cancelled / Timed Out</p>
                  <p className="text-[12px] text-white/30">Please place a new order or contact staff</p>
                </div>
              )}

              {/* Items ordered */}
              <p className="section-label mb-3">Items Ordered</p>
              <div className="flex flex-col gap-2 mb-5">
                {(latest.lineItems ?? []).map((li, i) => (
                  <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.05]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center text-[16px]">
                        🍽️
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-[#f5e9d0]">{li.name}</p>
                        <p className="text-[11px] text-white/30">× {li.quantity}</p>
                      </div>
                    </div>
                    <span className="font-serif text-[13px] text-gold-400 font-semibold">
                      {formatRs(li.totalPriceMinorUnits)}
                    </span>
                  </div>
                ))}
                {/* Total */}
                <div className="flex justify-between items-center px-3.5 py-2.5 mt-1">
                  <span className="text-[13px] font-semibold text-white/50">Total</span>
                  <span className="font-serif text-[16px] text-gold-400 font-semibold">
                    {formatRs(latest.totalAmountMinorUnits)}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Previous orders */}
          {displayOrders.length > 1 && !loading && (
            <>
              <p className="section-label mb-3">Previous Orders</p>
              <div className="flex flex-col gap-2 mb-4">
                {displayOrders.slice(1).map(order => (
                  <div key={order.orderId}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.05]">
                    <div>
                      <p className="font-mono-dm text-[12px] text-white/40">
                        #{order.orderId.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-[11px] text-white/25 mt-0.5">
                        {formatTime(order.placedAt)} · {order.lineItems?.length ?? 0} items
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-serif text-[13px] text-gold-400">{formatRs(order.totalAmountMinorUnits)}</p>
                      <p className={`text-[10px] mt-0.5 ${
                        order.status === 'DELIVERED' ? 'text-green-400/60' :
                        order.status === 'READY'     ? 'text-brand-400/60' :
                        'text-white/25'
                      }`}>{order.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {lastSync && (
            <p className="text-center text-[10px] text-white/15 pb-4">
              Updated {lastSync} · Auto-refresh every 10s
            </p>
          )}
        </div>

        {/* Bottom nav */}
        <div className="flex justify-around items-center px-5 pt-3.5 pb-7 border-t border-white/[0.05] bg-surface">
          {[
            { icon: '🏠', label: 'Home',   href: '/guest'           },
            { icon: '📖', label: 'Menu',   href: '/guest/menu'      },
            { icon: '🛒', label: 'Cart',   href: '/guest/cart'      },
            { icon: '📡', label: 'Orders', href: '/guest/tracking', active: true },
          ].map(n => (
            <button key={n.label} onClick={() => router.push(n.href)}
              className={`flex flex-col items-center gap-1 px-2.5 py-1 ${n.active ? 'text-gold-400' : 'text-white/20'}`}>
              <span className="text-[20px]">{n.icon}</span>
              <span className="text-[10px] font-medium">{n.label}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}