'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search, WifiOff, Clock, Users, TrendingUp, ShoppingBag, DollarSign, CheckCircle } from 'lucide-react';
import { fetchOrders } from '@/lib/orders-api';
import type { KdsOrder, KdsStatus } from '@/lib/types';

const STATUS_CFG: Record<KdsStatus, { label: string; dot: string; bg: string; text: string; border: string }> = {
  new:       { label: 'New',       dot: 'bg-amber-400',  bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200'  },
  preparing: { label: 'Preparing', dot: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
  ready:     { label: 'Ready',     dot: 'bg-brand-500',  bg: 'bg-brand-50',  text: 'text-brand-700',  border: 'border-brand-200'  },
  delivered: { label: 'Delivered', dot: 'bg-purple-400', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

export default function OrdersHistoryPage() {
  const [orders,  setOrders]  = useState<(KdsOrder & { _apiId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState<'all' | KdsStatus>('all');

  const load = useCallback(async () => {
    setLoading(true);
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

  useEffect(() => { load(); }, [load]);

  const filtered = orders.filter(o => {
    const matchStatus = filter === 'all' || o.status === filter;
    const matchSearch = search === '' ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.table.includes(search) ||
      o.items.some(i => i.name.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  // Stats
  const totalRevenue  = orders.reduce((sum, o) => sum + ((o as any)._raw?.totalAmountMinorUnits ?? 0), 0) / 100;
  const delivered     = orders.filter(o => o.status === 'delivered').length;
  const avgItems      = orders.length ? (orders.reduce((s, o) => s + o.items.length, 0) / orders.length).toFixed(1) : '0';

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#14b8a6]">
        <div>
          <h1 className="font-serif text-[20px] text-ink-900 font-semibold">Orders History</h1>
          <p className="text-[12px] text-ink-400">Das Pardes · All orders · {orders.length} total</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-300 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search orders…"
              className="h-9 pl-8 pr-3 rounded-xl w-[200px] text-[13px] border-ink-200" />
          </div>
          <button onClick={load}
            className="w-9 h-9 rounded-xl bg-[#14b8a60f] border border-[#14b8a6] flex items-center justify-center hover:bg-ink-100 transition-colors">
            <RefreshCw size={14} className={`text-ink-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Orders',    value: orders.length,           icon: ShoppingBag,  color: 'text-ink-700'   },
            { label: 'Delivered',       value: delivered,               icon: CheckCircle,  color: 'text-brand-600' },
            { label: 'Revenue',         value: `Rs ${totalRevenue.toFixed(0)}`, icon: DollarSign, color: 'text-green-600' },
            { label: 'Avg Items/Order', value: avgItems,                icon: TrendingUp,   color: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className="bg-[#14b8a60f] border border-[#14b8a6] rounded-2xl p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <s.icon size={13} className="text-ink-400" />
                <p className="text-[11px] text-ink-400 uppercase tracking-widest font-semibold">{s.label}</p>
              </div>
              <p className={`font-serif text-[24px] font-semibold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-ink-100 rounded-xl p-1 mb-5 w-fit">
          {[
            { key: 'all',       label: 'All Orders'  },
            { key: 'new',       label: '🟠 New'       },
            { key: 'preparing', label: '🔵 Preparing' },
            { key: 'ready',     label: '🟢 Ready'     },
            { key: 'delivered', label: '✓ Delivered'  },
          ].map(f => (
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
            <button onClick={load} className="px-3 py-1.5 rounded-xl bg-red-100 border border-red-200 text-red-700 text-[12px] font-semibold">Retry</button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="bg-[#14b8a60f] border border-[#14b8a6] rounded-2xl overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-[#14b8a6] last:border-0">
                <div className="w-16 h-4 rounded bg-ink-100 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-ink-100 rounded animate-pulse w-2/3" />
                  <div className="h-2.5 bg-ink-50 rounded animate-pulse w-1/3" />
                </div>
                <div className="w-20 h-6 rounded-full bg-ink-100 animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed border-ink-200 rounded-3xl">
            <span className="text-4xl opacity-30">📋</span>
            <p className="text-[13px] text-ink-400">{search ? 'No orders match your search' : 'No orders yet'}</p>
          </div>
        )}

        {/* Table */}
        {!loading && filtered.length > 0 && (
          <div className="bg-[#14b8a60f] border border-[#14b8a6] rounded-2xl overflow-hidden shadow-card">
            <div className="grid gap-3 px-4 py-3 border-b border-[#14b8a6]"
              style={{ gridTemplateColumns: '100px 70px 1fr 110px 110px 120px' }}>
              {['Order ID', 'Table', 'Items', 'Placed At', 'Total', 'Status'].map(h => (
                <div key={h} className="text-[11px] text-ink-400 uppercase tracking-widest font-semibold">{h}</div>
              ))}
            </div>

            {filtered.map(order => {
              const cfg   = STATUS_CFG[order.status];
              const total = (order as any)._raw?.totalAmountMinorUnits;
              return (
                <div key={order.id}
                  className="grid gap-3 px-4 py-3.5 border-b border-[#14b8a6] last:border-0 items-center hover:bg-ink-50 transition-colors"
                  style={{ gridTemplateColumns: '100px 70px 1fr 110px 110px 120px' }}>

                  <p className="font-mono-dm text-[12px] font-semibold text-ink-800">{order.id}</p>

                  <div className="flex items-center gap-1.5">
                    <Users size={11} className="text-ink-400" />
                    <span className="text-[12px] text-ink-600 font-medium">{order.table}</span>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[12px] text-ink-700 truncate">
                      {order.items.map(i => `${i.emoji} ${i.name} ×${i.qty}`).join(' · ')}
                    </p>
                    <p className="text-[10px] text-ink-400 mt-0.5">
                      {order.items.reduce((s, i) => s + i.qty, 0)} item{order.items.reduce((s, i) => s + i.qty, 0) !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-[12px] text-ink-500">
                    <Clock size={11} className="text-ink-400" />
                    {order.placedAt}
                  </div>

                  <p className="font-serif text-[13px] text-brand-600 font-semibold">
                    {total ? `Rs ${(total / 100).toFixed(0)}` : '—'}
                  </p>

                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border w-fit ${cfg.bg} ${cfg.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    <span className={`text-[11px] font-semibold ${cfg.text}`}>{cfg.label}</span>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between px-4 py-3 border-t border-[#14b8a6]">
              <p className="text-[12px] text-ink-400">
                Showing {filtered.length} of {orders.length} orders
                {search && ` · filtered by "${search}"`}
              </p>
              <p className="text-[11px] text-ink-300 font-mono-dm">Source: AWS API Gateway</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}