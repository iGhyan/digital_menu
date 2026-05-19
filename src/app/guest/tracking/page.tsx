'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LiveDot } from '@/components/ui';
import { formatTimer, timerColorClass, timerBarColor } from '@/lib/utils';
import { formatPrice } from '@/lib/data';

type OrderStatus = 'RECEIVED' | 'PREPARING' | 'READY' | 'DELIVERED';

const STAGES: { key: OrderStatus; label: string; desc: string; icon: string }[] = [
  { key: 'RECEIVED',  label: 'Order Received',    desc: 'Your order was confirmed and sent to the kitchen system.', icon: '✓' },
  { key: 'PREPARING', label: 'Being Prepared',     desc: 'Our chef is preparing your dishes with care.', icon: '🔥' },
  { key: 'READY',     label: 'Ready to Serve',     desc: 'Your food is ready and being brought to your table.', icon: '🔔' },
  { key: 'DELIVERED', label: 'Delivered',           desc: 'Enjoy your meal! Your order has been fully served.', icon: '✓' },
];

const STATUS_INDEX: Record<OrderStatus, number> = {
  RECEIVED: 0, PREPARING: 1, READY: 2, DELIVERED: 3,
};

const PILL_STYLES: Record<OrderStatus, string> = {
  RECEIVED:  'bg-blue-500/10 border-blue-500/25 text-blue-300',
  PREPARING: 'bg-amber-400/10 border-amber-400/30 text-amber-300',
  READY:     'bg-green-500/10 border-green-500/25 text-green-400',
  DELIVERED: 'bg-gold-400/12 border-gold-400/30 text-gold-400',
};
const ETA_TEXT: Record<OrderStatus, string> = {
  RECEIVED:  'Estimated ready in 20–25 min',
  PREPARING: 'Estimated ready in 15–20 min',
  READY:     'Your food is on its way!',
  DELIVERED: 'Enjoy your meal! 🍽',
};

export default function TrackingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>('PREPARING');
  const [elapsed, setElapsed] = useState(14 * 60); // 14 min elapsed
  const maxSeconds = 30 * 60;
  const [pollProgress, setPollProgress] = useState(0);
  const [toast, setToast] = useState<{ title: string; sub: string } | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Live clock
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setClock(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Elapsed timer
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Poll bar (10s cycle)
  useEffect(() => {
    setPollProgress(0);
    const start = Date.now();
    const cycle = 10000;
    const id = setInterval(() => {
      const pct = ((Date.now() - start) % cycle) / cycle * 100;
      setPollProgress(Math.min(100, pct));
    }, 100);
    return () => clearInterval(id);
  }, []);

  const showToast = (title: string, sub: string) => {
    setToast({ title, sub });
    setTimeout(() => setToast(null), 4000);
  };

  const advance = () => {
    const order: OrderStatus[] = ['RECEIVED', 'PREPARING', 'READY', 'DELIVERED'];
    const cur = STATUS_INDEX[status];
    if (cur < 3) {
      const next = order[cur + 1];
      setStatus(next);
      showToast(
        next === 'PREPARING' ? 'Kitchen is cooking!' : next === 'READY' ? 'Order ready!' : 'Order delivered!',
        `Your order #LM-2847 is now ${next.toLowerCase()}`,
      );
    }
  };

  const stageIdx = STATUS_INDEX[status];

  return (
    <main className="min-h-dvh bg-surface flex flex-col items-center">
      <div className="phone-shell relative">

        {/* Toast */}
        {toast && (
          <div className="absolute top-[72px] left-4 right-4 z-20 bg-[#1a1510] border border-amber-400/35 rounded-2xl p-3.5 flex items-start gap-3 shadow-card animate-[slideIn_0.3s_ease]">
            <div className="w-8 h-8 rounded-[10px] bg-amber-400/15 flex items-center justify-center flex-shrink-0">
              🔔
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[#f5e9d0]">{toast.title}</p>
              <p className="text-[11px] text-white/30">{toast.sub}</p>
              <p className="text-[10px] text-white/18 mt-0.5">Just now · via WebSocket</p>
            </div>
          </div>
        )}


        {/* Top nav */}
        <div className="flex items-center gap-3 px-5 py-3.5">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
            <ArrowLeft size={16} className="text-white/60" />
          </button>
          <div className="flex-1">
            <h1 className="font-serif text-[20px] text-[#f5e9d0] font-semibold">Order Tracking</h1>
            <p className="text-[11px] text-white/28">Table 07 · Main Hall</p>
          </div>
          <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/25 rounded-full px-3 py-1.5">
            <LiveDot color="green" />
            <span className="text-[10px] text-green-400 font-medium uppercase tracking-widest">Live</span>
          </div>
        </div>

        {/* Scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-5">

          {/* Order hero */}
          <div className="bg-gold-400/[0.06] border border-gold-400/18 rounded-2xl p-5 mb-5 flex flex-col items-center text-center">
            <p className="text-[11px] text-white/25 uppercase tracking-widest mb-1.5">Order ID</p>
            <p className="font-serif text-[28px] text-[#f5e9d0] font-semibold mb-1">#LM-2847</p>
            <p className="text-[13px] text-gold-400/65 mb-4">Table 07 · 3 items · {formatPrice(8256)}</p>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[13px] font-medium ${PILL_STYLES[status]}`}>
              <LiveDot color={status === 'DELIVERED' ? 'green' : status === 'READY' ? 'green' : status === 'PREPARING' ? 'amber' : 'green'} />
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </div>
            <p className="text-[12px] text-white/25 mt-3 flex items-center gap-1.5">
              🕐 {ETA_TEXT[status]}
            </p>
          </div>

          {/* Timeline */}
          <p className="section-label mb-3">Live Status Timeline</p>
          <div className="flex flex-col mb-5">
            {STAGES.map((stage, i) => {
              const isDone   = i < stageIdx;
              const isActive = i === stageIdx;
              return (
                <div key={stage.key} className="flex gap-4">
                  <div className="flex flex-col items-center w-9 flex-shrink-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all ${
                      isDone   ? 'bg-gold-400/15 border-[1.5px] border-gold-400/50' :
                      isActive ? 'bg-amber-400/12 border-[1.5px] border-amber-400/45 shadow-[0_0_0_4px_rgba(255,167,38,0.07)]' :
                                 'bg-white/[0.03] border border-white/[0.08]'
                    }`}>
                      {isDone ? <span className="text-gold-400 text-xs">✓</span>
                        : isActive ? <span className="animate-blink">{stage.icon}</span>
                        : <span className="text-white/15 text-xs">{stage.icon}</span>}
                    </div>
                    {i < STAGES.length - 1 && (
                      <div className={`w-[1.5px] flex-1 min-h-[32px] my-1 ${isDone ? 'bg-gold-400/30' : 'bg-white/[0.06]'}`} />
                    )}
                  </div>
                  <div className="pb-6 flex-1">
                    <p className={`text-[14px] font-medium mb-0.5 ${isDone ? 'text-[#f5e9d0]' : isActive ? 'text-amber-300' : 'text-white/20'}`}>
                      {stage.label}
                    </p>
                    <p className={`text-[12px] leading-relaxed ${isDone || isActive ? 'text-white/28' : 'text-white/15'}`}>
                      {stage.desc}
                    </p>
                    {(isDone || isActive) && (
                      <p className={`text-[11px] mt-1 ${isDone ? 'text-gold-400/45' : 'text-amber-400'}`}>
                        {isDone ? '9:46 PM' : 'In progress'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Items */}
          <p className="section-label mb-2">Items in This Order</p>
          <div className="bg-white/[0.025] border border-white/[0.05] rounded-2xl overflow-hidden mb-4">
            <div className="flex justify-between px-4 py-3 border-b border-white/[0.05]">
              <span className="text-[13px] font-medium text-white/55">Order #LM-2847</span>
              <span className="text-[11px] text-white/25">3 items</span>
            </div>
            {[
              { emoji: '🥩', name: 'Wagyu Tenderloin', qty: 1, ready: stageIdx >= 2 },
              { emoji: '🧀', name: 'Burrata Caprese',   qty: 2, ready: true },
              { emoji: '🍫', name: 'Chocolate Fondant', qty: 1, ready: stageIdx >= 2 },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.04] last:border-0">
                <span className="text-[20px]">{item.emoji}</span>
                <span className="flex-1 text-[13px] text-white/50">{item.name}</span>
                <span className="text-[12px] text-white/25 mr-2">× {item.qty}</span>
                <span className={`text-[10px] px-2 py-1 rounded-full border ${item.ready ? 'chip-ready' : 'chip-preparing'}`}>
                  {item.ready ? 'Ready' : stageIdx === 0 ? 'Queued' : 'Cooking'}
                </span>
              </div>
            ))}
          </div>

          {/* Poll bar */}
          <div className="flex items-center gap-2.5 p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl mb-5">
            <span className="text-[13px] text-white/18">↻</span>
            <span className="text-[11px] text-white/20 flex-1">Next sync in 10s</span>
            <div className="flex-1 h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gold-400/40 transition-all"
                style={{ width: `${pollProgress}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mb-4">
            {['💬 Contact Staff', '🧾 View Bill', '➕ Add Items'].map((a) => (
              <button key={a} className="flex-1 h-11 rounded-[14px] bg-white/[0.03] border border-white/[0.07] text-[12px] text-white/35 hover:border-gold-400/20 hover:text-gold-400/60 transition-all">
                {a}
              </button>
            ))}
          </div>

          {/* Simulate button */}
          <button
            onClick={advance}
            disabled={status === 'DELIVERED'}
            className="w-full h-10 rounded-xl bg-gold-400/[0.08] border border-gold-400/20 text-[12px] font-medium text-gold-400 hover:bg-gold-400/16 transition-colors disabled:opacity-40 mb-4"
          >
            ⚡ Simulate Next Status
          </button>
        </div>
      </div>
    </main>
  );
}
