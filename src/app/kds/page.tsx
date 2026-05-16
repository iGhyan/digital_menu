'use client';

import { useState, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, BellRing } from 'lucide-react';
import { INITIAL_KDS_ORDERS } from '@/lib/data';
import { formatTimer, timerColorClass, timerBarColor, playNewOrderBeep } from '@/lib/utils';
import type { KdsOrder, KdsStatus } from '@/lib/types';

type Filter = 'all' | 'new' | 'preparing' | 'ready' | 'delivered';

const STATUS_NEXT: Record<KdsStatus, KdsStatus | null> = {
  new: 'preparing', preparing: 'ready', ready: 'delivered', delivered: null,
};
const STATUS_ORDER: Record<KdsStatus, number> = {
  new: 0, preparing: 1, ready: 2, delivered: 3,
};
const STRIP_COLOR: Record<KdsStatus, string> = {
  new:       'bg-amber-400/70',
  preparing: 'bg-blue-500/60',
  ready:     'bg-green-500/70',
  delivered: 'bg-gold-400/50',
};
const BTN_CONFIG: Record<KdsStatus, { label: string; cls: string }[]> = {
  new:       [
    { label: '✓ Accept',    cls: 'bg-blue-500/10 border-blue-500/25 text-blue-300 hover:bg-blue-500/20' },
    { label: '🔥 Preparing', cls: 'bg-amber-400/10 border-amber-400/25 text-amber-300 hover:bg-amber-400/20' },
  ],
  preparing: [{ label: '🔔 Mark Ready',  cls: 'bg-green-500/10 border-green-500/25 text-green-400 hover:bg-green-500/20' }],
  ready:     [{ label: '✓ Delivered',    cls: 'bg-gold-400/12 border-gold-400/30 text-gold-400 hover:bg-gold-400/22'     }],
  delivered: [{ label: '✓ Completed',   cls: 'bg-white/[0.03] border-white/[0.07] text-white/20 cursor-default'          }],
};

const NEW_ORDER_TEMPLATES: Pick<KdsOrder, 'items' | 'table' | 'note'>[] = [
  {
    table: '04', note: '',
    items: [
      { emoji: '🍝', name: 'Pasta Carbonara',   mods: 'Extra guanciale',    qty: 2, done: false },
      { emoji: '🥤', name: 'Fresh Lime Soda',   mods: 'Less ice',           qty: 2, done: false },
    ],
  },
  {
    table: '06', note: 'Candle please — anniversary dinner',
    items: [
      { emoji: '🐟', name: 'Grilled Sea Bass',  mods: 'Lemon caper butter', qty: 1, done: false },
      { emoji: '🍰', name: 'Tiramisu',          mods: 'Classic',            qty: 2, done: false },
    ],
  },
  {
    table: '10', note: '',
    items: [
      { emoji: '🦞', name: 'Lobster Thermidor', mods: 'Cognac cream sauce', qty: 2, done: false },
    ],
  },
];

let tplIdx = 0;
let idCounter = 2852;

export default function KitchenDisplayPage() {
  const [orders, setOrders]   = useState<KdsOrder[]>(INITIAL_KDS_ORDERS);
  const [filter, setFilter]   = useState<Filter>('all');
  const [audio, setAudio]     = useState(true);
  const [toast, setToast]     = useState<string | null>(null);
  const [clock, setClock]     = useState('');
  const [pollPct, setPollPct] = useState(0);

  // Live clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(
        [now.getHours(), now.getMinutes(), now.getSeconds()]
          .map((n) => String(n).padStart(2, '0'))
          .join(':'),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Elapsed ticker (every second)
  useEffect(() => {
    const id = setInterval(() => {
      setOrders((prev) =>
        prev.map((o) =>
          o.status !== 'delivered'
            ? { ...o, elapsedSeconds: Math.min(o.elapsedSeconds + 1, o.maxSeconds + 300) }
            : o,
        ),
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Poll progress bar (10s cycle)
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const pct = ((Date.now() - start) % 10000) / 10000 * 100;
      setPollPct(Math.min(100, pct));
    }, 100);
    return () => clearInterval(id);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const advanceOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const next = STATUS_NEXT[o.status];
        if (!next) return o;
        return { ...o, status: next };
      }),
    );
  };

  const toggleDish = (orderId: string, dishIdx: number) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const items = o.items.map((it, i) =>
          i === dishIdx ? { ...it, done: !it.done } : it,
        );
        return { ...o, items };
      }),
    );
  };

  const injectNewOrder = () => {
    const tpl = NEW_ORDER_TEMPLATES[tplIdx % NEW_ORDER_TEMPLATES.length];
    tplIdx++;
    const id = `LM-${idCounter++}`;
    const now = new Date();
    const hh = now.getHours() % 12 || 12;
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    const newOrder: KdsOrder = {
      id, table: tpl.table, zone: 'Main Hall',
      status: 'new', elapsedSeconds: 0, maxSeconds: 1500,
      items: tpl.items.map((it) => ({ ...it })),
      note: tpl.note, placedAt: `${hh}:${mm} ${ampm}`,
    };
    setOrders((prev) => [newOrder, ...prev]);
    showToast(`🔔 New order #${id} — Table ${tpl.table} · ${tpl.items.length} items`);
    if (audio) playNewOrderBeep();
  };

  const filtered = orders
    .filter((o) => {
      if (filter === 'all')       return o.status !== 'delivered';
      if (filter === 'delivered') return o.status === 'delivered';
      return o.status === filter;
    })
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.elapsedSeconds - a.elapsedSeconds);

  const counts = {
    pending:   orders.filter((o) => o.status === 'new').length,
    preparing: orders.filter((o) => o.status === 'preparing').length,
    ready:     orders.filter((o) => o.status === 'ready').length,
  };

  return (
    <div className="min-h-dvh bg-surface-500 flex flex-col font-sans">

      {/* Toast */}
      {toast && (
        <div className="fixed top-[76px] right-6 z-50 bg-[#1a1510] border border-amber-400/40 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-card max-w-[300px] animate-[slideIn_0.3s_ease]">
          <div className="w-9 h-9 rounded-[10px] bg-amber-400/15 flex items-center justify-center text-lg flex-shrink-0">🔔</div>
          <p className="text-[13px] text-[#f5e9d0]">{toast}</p>
        </div>
      )}

      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-surface-200 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[10px] bg-gold-400/12 border border-gold-400/30 flex items-center justify-center text-[18px]">🍽️</div>
          <div>
            <p className="font-serif text-[18px] text-[#f5e9d0] font-semibold leading-tight">La Maison · KDS</p>
            <p className="text-[10px] text-white/20 uppercase tracking-widest">Kitchen Display System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="font-mono-dm text-[22px] text-[#f5e9d0] font-medium leading-tight">{clock || '09:54:22'}</p>
            <p className="text-[10px] text-white/25">Friday, 15 May 2026</p>
          </div>
          <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/25 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-blink" />
            <span className="text-[10px] text-green-400 font-medium uppercase tracking-widest">WebSocket Live</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {[
            { val: counts.pending,   label: 'Pending',   cls: 'text-amber-400' },
            { val: counts.preparing, label: 'Preparing', cls: 'text-blue-300' },
            { val: counts.ready,     label: 'Ready',     cls: 'text-green-400' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center px-3.5 py-1.5 rounded-[10px] border border-white/[0.07] bg-white/[0.03]">
              <span className={`text-[18px] font-medium font-serif ${s.cls}`}>{s.val}</span>
              <span className="text-[9px] text-white/25 uppercase tracking-widest">{s.label}</span>
            </div>
          ))}
          <button
            onClick={() => setAudio(!audio)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] border text-[12px] transition-all ${
              audio
                ? 'bg-gold-400/[0.08] border-gold-400/25 text-gold-400'
                : 'bg-red-500/[0.07] border-red-500/20 text-red-400'
            }`}
          >
            {audio ? <Volume2 size={15} /> : <VolumeX size={15} />}
            Audio {audio ? 'On' : 'Off'}
          </button>
        </div>
      </header>

      {/* Filter bar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-white/[0.04] bg-surface-300">
        {([
          { key: 'all',       label: 'All Orders', active: 'bg-white/[0.07] border-white/15 text-[#f5e9d0]' },
          { key: 'new',       label: '🟠 New',      active: 'bg-amber-400/10 border-amber-400/30 text-amber-300' },
          { key: 'preparing', label: '🔵 Preparing', active: 'bg-blue-500/10 border-blue-500/25 text-blue-300' },
          { key: 'ready',     label: '🟢 Ready',     active: 'bg-green-500/10 border-green-500/25 text-green-400' },
        ] as const).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-full border text-[12px] transition-all ${
              filter === f.key ? f.active : 'bg-white/[0.03] border-white/[0.07] text-white/30 hover:text-white/50'
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="w-px h-5 bg-white/[0.06] mx-1" />
        <button
          onClick={() => setFilter('delivered')}
          className={`text-[11px] px-3.5 py-1.5 rounded-full border transition-all ${
            filter === 'delivered' ? 'bg-white/[0.07] border-white/15 text-[#f5e9d0]' : 'bg-white/[0.03] border-white/[0.07] text-white/30'
          }`}
        >
          ✓ Delivered
        </button>
        <button
          onClick={injectNewOrder}
          className="ml-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] bg-amber-400/10 border border-amber-400/30 text-[12px] text-amber-300 hover:bg-amber-400/18 transition-colors"
        >
          <BellRing size={13} /> Simulate New Order
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-3 gap-3.5 p-5 content-start overflow-y-auto">
        {filtered.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-white/[0.06] rounded-2xl bg-white/[0.01]">
            <span className="text-[32px] opacity-20">✓</span>
            <p className="text-[12px] text-white/15">No orders in this category</p>
          </div>
        )}
        {filtered.map((order) => {
          const pct = Math.min(100, (order.elapsedSeconds / order.maxSeconds) * 100);
          const isUrgent  = pct >= 90;
          const isWarning = pct >= 70 && pct < 90;
          return (
            <div
              key={order.id}
              className={`bg-surface-100 rounded-[18px] flex flex-col border transition-all ${
                isUrgent  ? 'border-red-400/40 shadow-[0_0_0_1px_rgba(239,83,80,0.1)]' :
                isWarning ? 'border-amber-400/35' :
                            'border-white/[0.06]'
              } hover:-translate-y-0.5 hover:shadow-card`}
            >
              {/* Status strip */}
              <div className={`h-1 rounded-t-[18px] ${STRIP_COLOR[order.status]}`} />

              {/* New badge */}
              {order.status === 'new' && order.elapsedSeconds < 180 && (
                <div className="absolute top-2.5 right-2.5 bg-amber-400/90 text-surface text-[9px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider">
                  New
                </div>
              )}

              {/* Card header */}
              <div className="flex items-start justify-between px-4 py-3.5 border-b border-white/[0.05]">
                <div>
                  <p className="font-mono-dm text-[13px] font-medium text-[#f5e9d0]">#{order.id}</p>
                  <p className="text-[11px] text-white/30 mt-0.5">🪑 Table {order.table} · {order.zone}</p>
                </div>
                <div className="text-right">
                  <p className={`font-mono-dm text-[20px] font-medium leading-tight ${timerColorClass(order.elapsedSeconds, order.maxSeconds)}`}>
                    {formatTimer(order.elapsedSeconds)}
                  </p>
                  <p className="text-[10px] text-white/20">Placed {order.placedAt}</p>
                </div>
              </div>

              {/* Timer bar */}
              <div className="h-[3px] bg-white/[0.05]">
                <div
                  className="h-full transition-all duration-1000"
                  style={{ width: `${pct}%`, background: timerBarColor(order.elapsedSeconds, order.maxSeconds) }}
                />
              </div>

              {/* Items */}
              <div className="flex flex-col gap-2 px-4 py-3 flex-1">
                {order.items.map((dish, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className="text-[18px] w-8 text-center flex-shrink-0">{dish.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-[#f5e9d0] truncate">{dish.name}</p>
                      {dish.mods && <p className="text-[10px] text-white/25">{dish.mods}</p>}
                    </div>
                    <span className="text-[12px] text-white/40 font-medium flex-shrink-0">×{dish.qty}</span>
                    <button
                      onClick={() => toggleDish(order.id, i)}
                      className={`w-5 h-5 rounded-[6px] border flex items-center justify-center flex-shrink-0 transition-all ${
                        dish.done
                          ? 'bg-green-500/15 border-green-500/30'
                          : 'border-white/10 hover:bg-white/[0.06]'
                      }`}
                    >
                      {dish.done && <span className="text-green-400 text-[11px]">✓</span>}
                    </button>
                  </div>
                ))}
              </div>

              {/* Note */}
              {order.note && (
                <div className="mx-4 mb-2 p-2 rounded-[9px] bg-white/[0.03] border border-white/[0.06] flex items-start gap-1.5">
                  <span className="text-amber-400 text-xs flex-shrink-0 mt-0.5">⚠</span>
                  <p className="text-[10px] text-white/30 leading-relaxed">{order.note}</p>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex gap-2 px-4 py-3 border-t border-white/[0.05]">
                {BTN_CONFIG[order.status].map((btn, i) => (
                  <button
                    key={btn.label}
                    onClick={() => i === 0 && advanceOrder(order.id)}
                    disabled={order.status === 'delivered'}
                    className={`flex-1 h-9 rounded-[10px] flex items-center justify-center gap-1.5 text-[12px] font-medium border transition-all ${btn.cls}`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
