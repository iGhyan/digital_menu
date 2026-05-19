'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, VolumeX, BellRing, RefreshCw, Wifi, WifiOff, Radio } from 'lucide-react';
import { formatTimer, timerColorClass, timerBarColor, playNewOrderBeep } from '@/lib/utils';
import { fetchOrders, patchOrderStatus, normaliseOrder, toKdsStatus, WS_URL } from '@/lib/orders-api';
import type { KdsOrder, KdsStatus } from '@/lib/types';

type Filter   = 'all' | 'new' | 'preparing' | 'ready' | 'delivered';
type WsState  = 'connecting' | 'connected' | 'disconnected' | 'error';

const STATUS_NEXT: Record<KdsStatus, KdsStatus | null> = {
  new: 'preparing', preparing: 'ready', ready: 'delivered', delivered: null,
};
const STATUS_ORDER: Record<KdsStatus, number> = {
  new: 0, preparing: 1, ready: 2, delivered: 3,
};
const STRIP: Record<KdsStatus, string> = {
  new:       'bg-amber-400',
  preparing: 'bg-blue-500',
  ready:     'bg-brand-500',
  delivered: 'bg-purple-400',
};
const BTN_CFG: Record<KdsStatus, { label: string; cls: string }[]> = {
  new:       [
    { label: '✓ Accept',     cls: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'   },
    { label: '🔥 Preparing', cls: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
  ],
  preparing: [{ label: '🔔 Mark Ready', cls: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' }],
  ready:     [{ label: '✓ Delivered',   cls: 'bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100'  }],
  delivered: [{ label: '✓ Completed',   cls: 'bg-ink-50 border-ink-200 text-ink-300 cursor-default'            }],
};

const POLL_INTERVAL = 15000;

export default function KitchenDisplayPage() {
  const [orders,    setOrders]    = useState<KdsOrder[]>([]);
  const [filter,    setFilter]    = useState<Filter>('all');
  const [audio,     setAudio]     = useState(true);
  const [toast,     setToast]     = useState<string | null>(null);
  const [clock,     setClock]     = useState('');
  const [pollPct,   setPollPct]   = useState(0);
  const [apiState,  setApiState]  = useState<'loading' | 'live' | 'error'>('loading');
  const [apiError,  setApiError]  = useState('');
  const [wsState,   setWsState]   = useState<WsState>('disconnected');
  const [wsLog,     setWsLog]     = useState<string[]>([]);
  const [advancing, setAdvancing] = useState<string | null>(null);

  const pollStart  = useRef(Date.now());
  const prevIds    = useRef<Set<string>>(new Set());
  const wsRef      = useRef<WebSocket | null>(null);
  const wsRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Live clock ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setClock([n.getHours(), n.getMinutes(), n.getSeconds()].map(x => String(x).padStart(2,'0')).join(':'));
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);

  // ── Elapsed ticker ────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setOrders(prev => prev.map(o =>
        o.status !== 'delivered'
          ? { ...o, elapsedSeconds: Math.min(o.elapsedSeconds + 1, o.maxSeconds + 300) }
          : o,
      ));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Poll bar ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const pct = ((Date.now() - pollStart.current) % POLL_INTERVAL) / POLL_INTERVAL * 100;
      setPollPct(Math.min(100, pct));
    }, 200);
    return () => clearInterval(id);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg); setTimeout(() => setToast(null), 5000);
  };

  const addWsLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    setWsLog(prev => [`[${time}] ${msg}`, ...prev.slice(0, 9)]);
  };

  // ── WebSocket connection ───────────────────────────────────────────────────────
  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setWsState('connecting');
    addWsLog('Connecting to WebSocket…');

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsState('connected');
      addWsLog('✓ Connected to WebSocket');
      // Send initial handshake
      ws.send(JSON.stringify({ action: 'subscribe', channel: 'orders' }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        addWsLog(`← ${JSON.stringify(msg).slice(0, 80)}`);

        // Handle order status update from WebSocket
        const orderId = msg.orderId ?? msg.order_id;
        const status  = msg.status  ?? msg.orderStatus;
        const flags   = msg.flags;

        if (orderId && (status || flags)) {
          const kdsStatus = toKdsStatus(status ?? '', flags);
          const shortId   = orderId.slice(0, 6).toUpperCase();
          const displayId = `LM-${shortId}`;

          setOrders(prev => {
            const exists = prev.find(o => (o as any)._apiId === orderId || o.id === displayId);
            if (exists) {
              // Update existing order
              showToast(`📡 WS: Order #${displayId} → ${kdsStatus.toUpperCase()}`);
              return prev.map(o =>
                ((o as any)._apiId === orderId || o.id === displayId)
                  ? { ...o, status: kdsStatus }
                  : o,
              );
            } else if (msg.lineItems || msg.items) {
              // New order pushed via WebSocket
              const newOrder = normaliseOrder(msg);
              showToast(`🔔 WS: New order #${newOrder.id} — Table ${newOrder.table}`);
              if (audio) playNewOrderBeep();
              return [newOrder, ...prev];
            }
            return prev;
          });
        }
      } catch {
        addWsLog(`← (non-JSON) ${event.data?.slice(0, 60)}`);
      }
    };

    ws.onerror = () => {
      setWsState('error');
      addWsLog('✗ WebSocket error');
    };

    ws.onclose = (e) => {
      setWsState('disconnected');
      addWsLog(`✗ Disconnected (code ${e.code})`);
      // Auto-reconnect after 5s
      if (wsRetryRef.current) clearTimeout(wsRetryRef.current);
      wsRetryRef.current = setTimeout(connectWs, 5000);
    };
  }, [audio]);

  useEffect(() => {
    connectWs();
    return () => {
      if (wsRetryRef.current) clearTimeout(wsRetryRef.current);
      wsRef.current?.close();
    };
  }, [connectWs]);

  // ── Send message via WebSocket ─────────────────────────────────────────────────
  const wsSend = (payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const msg = JSON.stringify(payload);
      wsRef.current.send(msg);
      addWsLog(`→ ${msg.slice(0, 80)}`);
    }
  };

  // ── Fetch orders from REST API ────────────────────────────────────────────────
  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setApiState('loading');
    try {
      const fresh = await fetchOrders();
      const freshIds = new Set(fresh.map((o: any) => o.id));
      const newOnes  = fresh.filter((o: any) => !prevIds.current.has(o.id));
      if (newOnes.length > 0 && prevIds.current.size > 0) {
        newOnes.forEach((o: any) => {
          showToast(`🔔 New order #${o.id} — Table ${o.table}`);
          if (audio) playNewOrderBeep();
        });
      }
      prevIds.current = freshIds;

      setOrders(prev => {
        const prevMap = new Map(prev.map(o => [o.id, o]));
        return fresh.map((o: any) => {
          const existing = prevMap.get(o.id);
          return existing
            ? { ...o, elapsedSeconds: existing.elapsedSeconds, items: existing.items }
            : o;
        });
      });
      setApiState('live');
      pollStart.current = Date.now();
    } catch (err: any) {
      setApiError(err?.message ?? 'Failed to fetch orders');
      setApiState('error');
    }
  }, [audio]);

  useEffect(() => {
    loadOrders();
    const id = setInterval(() => loadOrders(true), POLL_INTERVAL);
    return () => clearInterval(id);
  }, [loadOrders]);

  // ── Advance order status ───────────────────────────────────────────────────────
  const advanceOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const next = STATUS_NEXT[order.status];
    if (!next) return;

    setAdvancing(orderId);
    // Optimistic update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: next } : o));

    try {
      const apiId = (order as any)._apiId ?? orderId;
      await patchOrderStatus(apiId, next);

      // Also notify via WebSocket
      wsSend({ action: 'orderStatusUpdate', orderId: apiId, status: next });
      showToast(`Order #${orderId} → ${next.toUpperCase()}`);
    } catch (err: any) {
      // Rollback
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: order.status } : o));
      showToast(`⚠ Failed: ${err?.message}`);
    } finally {
      setAdvancing(null);
    }
  };

  // ── Toggle dish done ──────────────────────────────────────────────────────────
  const toggleDish = (orderId: string, idx: number) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const items = o.items.map((it, i) => i === idx ? { ...it, done: !it.done } : it);
      return { ...o, items };
    }));
  };

  // ── Demo order (local) ────────────────────────────────────────────────────────
  const injectDemo = () => {
    const id = `LM-DEMO${Math.floor(Math.random()*900+100)}`;
    const demo: KdsOrder = {
      id, table: String(Math.floor(Math.random()*12+1)).padStart(2,'0'),
      zone: 'Main Hall', status: 'new', elapsedSeconds: 0, maxSeconds: 1500,
      items: [
        { emoji:'🍝', name:'Pasta Carbonara', mods:'Extra cheese', qty:1, done:false },
        { emoji:'🥤', name:'Lemon Soda',      mods:'No ice',       qty:2, done:false },
      ],
      note: '', placedAt: new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true}),
    };
    setOrders(prev => [demo, ...prev]);
    showToast(`🔔 Demo order #${id} — Table ${demo.table}`);
    if (audio) playNewOrderBeep();
    // Also send via WebSocket
    wsSend({ action: 'newOrder', orderId: id, status: 'new' });
  };

  const filtered = orders
    .filter(o => {
      if (filter === 'all')       return o.status !== 'delivered';
      if (filter === 'delivered') return o.status === 'delivered';
      return o.status === filter;
    })
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.elapsedSeconds - a.elapsedSeconds);

  const counts = {
    pending:   orders.filter(o => o.status === 'new').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready:     orders.filter(o => o.status === 'ready').length,
  };

  const wsColor = wsState === 'connected' ? 'bg-green-50 border-green-200' :
                  wsState === 'connecting' ? 'bg-amber-50 border-amber-200' :
                  'bg-red-50 border-red-200';
  const wsTextColor = wsState === 'connected' ? 'text-green-700' :
                      wsState === 'connecting' ? 'text-amber-700' : 'text-red-600';

  return (
    <div className="min-h-dvh bg-black flex flex-col font-sans">

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-5 z-50 bg-black border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-card-lg max-w-[320px] animate-fade-up">
          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-base flex-shrink-0">🔔</div>
          <p className="text-[13px] font-semibold text-ink-800">{toast}</p>
        </div>
      )}

      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-black border-b border-ink-100 shadow-card">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-white text-base shadow-brand">🍽️</div>
          <div>
            <p className="font-serif text-[17px] text-ink-900 font-semibold">Das Perdas · KDS</p>
            <p className="text-[10px] text-ink-400 uppercase tracking-widest font-semibold">Kitchen Display System</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="font-mono-dm text-[20px] text-ink-900 font-semibold">{clock || '00:00:00'}</p>
            <p className="text-[10px] text-ink-400">
              {new Date().toLocaleDateString('en-US',{weekday:'short',day:'numeric',month:'short'})}
            </p>
          </div>

          {/* API status */}
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 border ${
            apiState === 'live'   ? 'bg-green-50 border-green-200' :
            apiState === 'error'  ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
          }`}>
            {apiState === 'live'
              ? <><Wifi size={11} className="text-green-600" /><span className="text-[10px] text-green-700 font-semibold uppercase tracking-widest">REST Live</span></>
              : apiState === 'error'
              ? <><WifiOff size={11} className="text-red-500" /><span className="text-[10px] text-red-600 font-semibold">API Error</span></>
              : <><RefreshCw size={11} className="text-amber-600 animate-spin" /><span className="text-[10px] text-amber-700 font-semibold">Loading…</span></>
            }
          </div>

          {/* WebSocket status */}
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 border ${wsColor}`}>
            <Radio size={11} className={wsTextColor} />
            <span className={`text-[10px] font-semibold uppercase tracking-widest ${wsTextColor}`}>
              WS {wsState === 'connected' ? 'Live' : wsState === 'connecting' ? '…' : 'Off'}
            </span>
            {wsState === 'connected' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-blink" />}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {[
            { val: counts.pending,   label: 'Pending',   cls: 'text-amber-600' },
            { val: counts.preparing, label: 'Preparing', cls: 'text-blue-600'  },
            { val: counts.ready,     label: 'Ready',     cls: 'text-brand-600' },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center px-3.5 py-1.5 rounded-xl border border-ink-100 bg-black
             shadow-card">
              <span className={`text-[18px] font-bold font-serif ${s.cls}`}>{s.val}</span>
              <span className="text-[9px] text-ink-400 uppercase tracking-widest font-semibold">{s.label}</span>
            </div>
          ))}
          <button onClick={() => setAudio(!audio)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[12px] font-semibold transition-all ${
              audio ? 'bg-black border-brand-200 text-brand-700' : 'bg-red-50 border-red-200 text-red-600'
            }`}>
            {audio ? <Volume2 size={14} /> : <VolumeX size={14} />} Audio {audio ? 'On' : 'Off'}
          </button>
        </div>
      </header>

      {/* Error banner */}
      {apiState === 'error' && (
        <div className="flex items-center gap-3 px-6 py-2.5 bg-red-50 border-b border-red-200">
          <WifiOff size={14} className="text-red-500 flex-shrink-0" />
          <p className="text-[12px] text-red-600 flex-1">{apiError}</p>
          <button onClick={() => loadOrders()}
            className="px-3 py-1 rounded-lg bg-red-100 border border-red-200 text-red-700 text-[12px] font-semibold hover:bg-red-200 transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2 px-6 py-3 bg-black border-b border-ink-100">
        {([
          { key: 'all',       label: 'All Orders',  cls: 'bg-ink-900 border-ink-900 text-white'       },
          { key: 'new',       label: '🟠 New',        cls: 'bg-orange-500 border-orange-500 text-white' },
          { key: 'preparing', label: '🔵 Preparing',  cls: 'bg-blue-600 border-blue-600 text-white'     },
          { key: 'ready',     label: '🟢 Ready',      cls: 'bg-brand-500 border-brand-500 text-white'   },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-full border text-[12px] font-semibold transition-all ${
              filter === f.key ? f.cls : 'bg-black border-ink-200 text-ink-500 hover:border-ink-300'
            }`}>
            {f.label}
          </button>
        ))}
        <div className="w-px h-5 bg-black mx-1" />
        <button onClick={() => setFilter('delivered')}
          className={`text-[11px] px-3.5 py-1.5 rounded-full border font-semibold transition-all ${
            filter === 'delivered' ? 'bg-purple-500 border-purple-500 text-white' : 'bg-black border-ink-200 text-ink-400'
          }`}>
          ✓ Delivered
        </button>

      </div>

      {/* WebSocket log bar */}
      {wsLog.length > 0 && (
        <div className="px-6 py-2 bg-black border-b border-ink-800 flex items-center gap-3 overflow-hidden">
          <Radio size={12} className="text-green-400 flex-shrink-0" />
          <p className="text-[10px] text-green-300 font-mono-dm truncate">{wsLog[0]}</p>
          <span className="text-[9px] text-ink-500 flex-shrink-0">{wsLog.length} events</span>
        </div>
      )}

      {/* Loading */}
      {apiState === 'loading' && orders.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <RefreshCw size={32} className="text-brand-400 animate-spin" />
          <p className="text-[14px] text-ink-400 font-medium">Loading orders from API…</p>
          <p className="text-[11px] text-ink-300 font-mono-dm">GET /orders?tenantId=t123&restaurantId=r456</p>
        </div>
      )}

      {/* Grid */}
      {(apiState !== 'loading' || orders.length > 0) && (
        <div className="flex-1 grid grid-cols-3 gap-4 p-5 content-start overflow-y-auto">
          {filtered.length === 0 && (
            <div className="col-span-3 flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed border-ink-200 rounded-3xl bg-black">
              <span className="text-4xl opacity-30">✓</span>
              <p className="text-[13px] text-ink-300 font-medium">No orders in this category</p>
              <p className="text-[11px] text-ink-300">
                {orders.length === 0 ? 'Waiting for orders…' : `${orders.length} orders in other categories`}
              </p>
            </div>
          )}

          {filtered.map(order => {
            const pct         = Math.min(100, (order.elapsedSeconds / order.maxSeconds) * 100);
            const isUrgent    = pct >= 90;
            const isAdvancing = advancing === order.id;
            const allDone     = order.items.every(i => i.done);

            return (
              <div key={order.id}
                className={`bg-black rounded-3xl flex flex-col border transition-all hover:-translate-y-0.5 hover:shadow-card-lg ${
                  isUrgent ? 'border-red-300 shadow-[0_0_0_2px_rgba(239,68,68,0.12)]' : 'border-ink-100 shadow-card'
                }`}>

                <div className={`h-1.5 rounded-t-3xl ${STRIP[order.status]}`} />

                <div className="flex items-start justify-between px-4 py-3.5 border-b border-ink-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono-dm text-[13px] font-semibold text-ink-800">#{order.id}</p>
                      {allDone && order.status !== 'delivered' && (
                        <span className="text-[9px] bg-green-50 border border-green-200 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">ALL DONE</span>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-400 mt-0.5">🪑 Table {order.table} · {order.zone}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono-dm text-[20px] font-bold ${timerColorClass(order.elapsedSeconds, order.maxSeconds)}`}>
                      {formatTimer(order.elapsedSeconds)}
                    </p>
                    <p className="text-[10px] text-ink-400">Placed {order.placedAt}</p>
                  </div>
                </div>

                <div className="h-1.5 bg-ink-100">
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width:`${pct}%`, background: timerBarColor(order.elapsedSeconds, order.maxSeconds) }} />
                </div>

                <div className="flex flex-col gap-2 px-4 py-3 flex-1">
                  {order.items.map((dish, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="text-[18px] w-8 text-center">{dish.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] font-semibold truncate ${dish.done ? 'line-through text-ink-300' : 'text-ink-800'}`}>{dish.name}</p>
                        {dish.mods && <p className="text-[10px] text-ink-400">{dish.mods}</p>}
                      </div>
                      <span className="text-[12px] text-ink-500 font-semibold">×{dish.qty}</span>
                      <button onClick={() => toggleDish(order.id, i)}
                        className={`w-5 h-5 rounded-[5px] border flex items-center justify-center transition-all ${
                          dish.done ? 'bg-brand-500 border-brand-500' : 'border-ink-200 hover:bg-ink-50'
                        }`}>
                        {dish.done && <span className="text-white text-[11px]">✓</span>}
                      </button>
                    </div>
                  ))}
                </div>

                {order.note && (
                  <div className="mx-4 mb-2 p-2 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-1.5">
                    <span className="text-amber-500 text-xs mt-0.5">⚠</span>
                    <p className="text-[10px] text-amber-700 leading-relaxed font-medium">{order.note}</p>
                  </div>
                )}

                <div className="flex gap-2 px-4 py-3 border-t border-ink-100">
                  {BTN_CFG[order.status].map((btn, i) => (
                    <button key={btn.label}
                      onClick={() => i === 0 && advanceOrder(order.id)}
                      disabled={order.status === 'delivered' || isAdvancing}
                      className={`flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5 text-[12px] font-semibold border transition-all ${btn.cls} disabled:opacity-50`}>
                      {isAdvancing && i === 0
                        ? <RefreshCw size={12} className="animate-spin" />
                        : btn.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}