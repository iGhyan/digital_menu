'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Wifi, WifiOff, ChevronRight, Clock, Users } from 'lucide-react';
import { fetchOrders, patchOrderStatus, normaliseOrder, toKdsStatus, WS_URL } from '@/lib/orders-api';
import type { KdsOrder, KdsStatus } from '@/lib/types';

const STATUS_NEXT: Record<KdsStatus, KdsStatus | null> = {
  new: 'preparing', preparing: 'ready', ready: 'delivered', delivered: null,
};

const STATUS_CFG: Record<KdsStatus, { label: string; dot: string; bg: string; text: string; border: string }> = {
  new:       { label: 'New',       dot: 'bg-amber-400',  bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  preparing: { label: 'Preparing', dot: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'  },
  ready:     { label: 'Ready',     dot: 'bg-brand-500',  bg: 'bg-brand-50',  text: 'text-brand-700',  border: 'border-brand-200' },
  delivered: { label: 'Delivered', dot: 'bg-purple-400', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200'},
};

const ACTION_CFG: Record<KdsStatus, { label: string; cls: string } | null> = {
  new:       { label: '✓ Accept & Prepare', cls: 'bg-blue-500 text-white hover:bg-blue-600'        },
  preparing: { label: '🔔 Mark Ready',      cls: 'bg-brand-500 text-white hover:bg-brand-600'      },
  ready:     { label: '✓ Mark Delivered',   cls: 'bg-purple-500 text-white hover:bg-purple-600'    },
  delivered: null,
};

export default function AdminOrdersPage() {
  const [orders,    setOrders]    = useState<(KdsOrder & { _apiId: string })[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [filter,    setFilter]    = useState<'all' | KdsStatus>('all');
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [wsState,   setWsState]   = useState<'connecting'|'connected'|'disconnected'>('disconnected');
  const wsRef      = useRef<WebSocket | null>(null);
  const wsRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 15000);
    return () => clearInterval(id);
  }, [load]);

  // WebSocket for live updates
  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setWsState('connecting');
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen  = () => { setWsState('connected'); ws.send(JSON.stringify({ action: 'subscribe', channel: 'orders' })); };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        const orderId = msg.orderId ?? msg.order_id;
        if (orderId && msg.flags) {
          const kdsStatus = toKdsStatus('', msg.flags);
          setOrders(prev => prev.map(o => (o as any)._apiId === orderId ? { ...o, status: kdsStatus } : o));
        } else if (msg.lineItems) {
          setOrders(prev => [normaliseOrder(msg) as any, ...prev]);
        }
      } catch {}
    };
    ws.onerror  = () => setWsState('disconnected');
    ws.onclose  = () => {
      setWsState('disconnected');
      wsRetryRef.current = setTimeout(connectWs, 5000);
    };
  }, []);

  useEffect(() => {
    connectWs();
    return () => { wsRetryRef.current && clearTimeout(wsRetryRef.current); wsRef.current?.close(); };
  }, [connectWs]);

  const advance = async (order: KdsOrder & { _apiId: string }) => {
    const next = STATUS_NEXT[order.status];
    if (!next) return;
    setAdvancing(order.id);
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next } : o));
    try {
      await patchOrderStatus(order._apiId, next);
    } catch {
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: order.status } : o));
    } finally {
      setAdvancing(null);
    }
  };

  const displayed = orders.filter(o => filter === 'all' ? o.status !== 'delivered' : o.status === filter);
  const counts = {
    new:       orders.filter(o => o.status === 'new').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready:     orders.filter(o => o.status === 'ready').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  };

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#14b8a6]">
        <div>
          <h1 className="font-serif text-[20px] text-ink-900 font-semibold">Kitchen Orders</h1>
          <p className="text-[12px] text-ink-400">Das Pardes · Live orders · {orders.length} total</p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* WS status */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold ${
            wsState === 'connected' ? 'bg-green-50 border-green-200 text-green-700' :
            wsState === 'connecting' ? 'bg-amber-50 border-amber-200 text-amber-700' :
            'bg-red-50 border-red-200 text-red-600'
          }`}>
            {wsState === 'connected' ? <Wifi size={11} /> : <WifiOff size={11} />}
            WS {wsState === 'connected' ? 'Live' : wsState === 'connecting' ? '…' : 'Off'}
          </div>
          <button onClick={() => load()}
            className="w-9 h-9 rounded-xl bg-[#14b8a60f] border border-[#14b8a6] flex items-center justify-center hover:bg-ink-100 transition-colors">
            <RefreshCw size={14} className={`text-ink-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {(['new','preparing','ready','delivered'] as KdsStatus[]).map(s => {
            const cfg = STATUS_CFG[s];
            return (
              <div key={s} className="bg-[#14b8a60f] border border-[#14b8a6] rounded-2xl p-4 shadow-card">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <p className="text-[11px] text-ink-400 uppercase tracking-widest font-semibold">{cfg.label}</p>
                </div>
                <p className="font-serif text-[26px] font-semibold text-ink-800">{counts[s]}</p>
              </div>
            );
          })}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-ink-100 rounded-xl p-1 mb-5 w-fit">
          {[
            { key: 'all',       label: 'Active Orders' },
            { key: 'new',       label: '🟠 New'        },
            { key: 'preparing', label: '🔵 Preparing'  },
            { key: 'ready',     label: '🟢 Ready'      },
            { key: 'delivered', label: '✓ Delivered'   },
          ].map((f, i) => (
            <button key={f.key} onClick={() => setFilter(f.key as any)}
              className={`px-4 h-8 rounded-[10px] text-[12px] font-semibold transition-all ${
                filter === f.key ? 'bg-white text-black shadow-card' : 'text-ink-400 hover:text-ink-700'
              }`}>{f.label}</button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl mb-5">
            <WifiOff size={16} className="text-red-500 flex-shrink-0" />
            <p className="text-[13px] text-red-600 flex-1">{error}</p>
            <button onClick={() => load()} className="px-3 py-1.5 rounded-xl bg-red-100 border border-red-200 text-red-700 text-[12px] font-semibold">Retry</button>
          </div>
        )}

        {/* Loading */}
        {loading && orders.length === 0 && (
          <div className="bg-[#14b8a60f] border border-[#14b8a6] rounded-2xl overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-[#14b8a6] last:border-0">
                <div className="w-10 h-10 rounded-xl bg-ink-100 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-ink-100 rounded animate-pulse w-1/3" />
                  <div className="h-2.5 bg-ink-50 rounded animate-pulse w-1/2" />
                </div>
                <div className="h-8 bg-ink-100 rounded-xl animate-pulse w-28" />
              </div>
            ))}
          </div>
        )}

        {/* Orders table */}
        {!loading && displayed.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed border-ink-200 rounded-3xl">
            <span className="text-4xl opacity-30">✓</span>
            <p className="text-[13px] text-ink-400">No orders in this category</p>
          </div>
        )}

        {displayed.length > 0 && (
          <div className="bg-[#14b8a60f] border border-[#14b8a6] rounded-2xl overflow-hidden shadow-card">
            {/* Header */}
            <div className="grid gap-3 px-4 py-3 border-b border-[#14b8a6]"
              style={{ gridTemplateColumns: '90px 70px 1fr 100px 120px 140px' }}>
              {['Order ID', 'Table', 'Items', 'Total', 'Status', 'Action'].map(h => (
                <div key={h} className="text-[11px] text-ink-400 uppercase tracking-widest font-semibold">{h}</div>
              ))}
            </div>

            {displayed.map(order => {
              const cfg    = STATUS_CFG[order.status];
              const action = ACTION_CFG[order.status];
              const total  = (order as any)._raw?.totalAmountMinorUnits;
              return (
                <div key={order.id}
                  className="grid gap-3 px-4 py-3.5 border-b border-[#14b8a6] last:border-0 items-center hover:bg-ink-50 transition-colors"
                  style={{ gridTemplateColumns: '90px 70px 1fr 100px 120px 140px' }}>

                  {/* Order ID */}
                  <p className="font-mono-dm text-[12px] font-semibold text-ink-800">{order.id}</p>

                  {/* Table */}
                  <div className="flex items-center gap-1.5">
                    <Users size={11} className="text-ink-400" />
                    <span className="text-[12px] text-ink-600 font-medium">{order.table}</span>
                  </div>

                  {/* Items */}
                  <div className="min-w-0">
                    <p className="text-[12px] text-ink-700 font-medium truncate">
                      {order.items.map(i => `${i.emoji} ${i.name} ×${i.qty}`).join(' · ')}
                    </p>
                    <p className="text-[10px] text-ink-400 flex items-center gap-1 mt-0.5">
                      <Clock size={9} /> {order.placedAt}
                    </p>
                  </div>

                  {/* Total */}
                  <p className="font-serif text-[13px] text-brand-600 font-semibold">
                    {total ? `Rs ${(total / 100).toFixed(0)}` : '—'}
                  </p>

                  {/* Status */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border w-fit ${cfg.bg} ${cfg.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    <span className={`text-[11px] font-semibold ${cfg.text}`}>{cfg.label}</span>
                  </div>

                  {/* Action */}
                  {action ? (
                    <button onClick={() => advance(order)} disabled={advancing === order.id}
                      className={`h-8 px-3 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-all disabled:opacity-50 ${action.cls}`}>
                      {advancing === order.id
                        ? <RefreshCw size={11} className="animate-spin" />
                        : <>{action.label} <ChevronRight size={11} /></>}
                    </button>
                  ) : (
                    <span className="text-[11px] text-ink-300">—</span>
                  )}
                </div>
              );
            })}

            <div className="flex items-center justify-between px-4 py-3 border-t border-[#14b8a6]">
              <p className="text-[12px] text-ink-400">Showing {displayed.length} of {orders.length} orders</p>
              <p className="text-[11px] text-ink-300 font-mono-dm">Live · AWS API Gateway</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}