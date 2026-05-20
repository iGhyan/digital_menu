'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { BookOpen, QrCode, Users, RefreshCw, AlertCircle } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface LineItem {
  name:                 string;
  itemId:               string;
  quantity:             number;
  unitPriceMinorUnits:  number;
  totalPriceMinorUnits: number;
}

interface ApiOrder {
  orderId:               string;
  status:                string;
  tableId?:              string;
  lineItems:             LineItem[];
  placedAt?:             string;
  updatedAt?:            string;
  totalAmountMinorUnits?: number;
  currencyCode?:         string;
  tenantId?:             string;
  restaurantId?:         string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function toKds(status: string): 'new' | 'preparing' | 'ready' | 'delivered' {
  const s = status.toUpperCase();
  if (s === 'RECEIVED' || s === 'PENDING')          return 'new';
  if (s === 'PREPARING' || s === 'IN_PROGRESS')     return 'preparing';
  if (s === 'READY')                                return 'ready';
  return 'delivered'; // TIMED_OUT, DELIVERED, CANCELLED, COMPLETED
}

function formatRs(minorUnits: number): string {
  return 'Rs ' + (minorUnits / 100).toLocaleString('en-PK');
}

function formatTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function shortId(orderId: string): string {
  return `LM-${orderId.slice(0, 6).toUpperCase()}`;
}

function tableNum(tableId?: string): string {
  if (!tableId) return '??';
  const n = tableId.replace(/[^0-9]/g, '');
  return n ? n.padStart(2, '0') : tableId;
}

const CHIP: Record<string, string> = {
  new:       'bg-amber-50 border border-amber-200 text-amber-700',
  preparing: 'bg-blue-50 border border-blue-200 text-blue-700',
  ready:     'bg-green-50 border border-green-200 text-green-700',
  delivered: 'bg-ink-50 border border-ink-200 text-ink-400',
};

const QUICK_LINKS = [
  { href: '/admin/menu',  label: 'Menu Management', icon: BookOpen, desc: 'Live items from API' },
  { href: '/admin/qr',    label: 'QR Codes',         icon: QrCode,  desc: 'Table QR management' },
  { href: '/admin/users', label: 'User Management',  icon: Users,   desc: 'Team & roles'        },
];

// ── Page ───────────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [orders,    setOrders]    = useState<ApiOrder[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [lastSync,  setLastSync]  = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      setOrders(data.orders ?? []);
      setLastSync(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // ── Computed stats ────────────────────────────────────────────────────────────
  const totalRevenue  = orders.reduce((sum, o) => sum + (o.totalAmountMinorUnits ?? 0), 0);
  const activeOrders  = orders.filter(o => toKds(o.status) !== 'delivered');
  const delivering    = orders.filter(o => toKds(o.status) === 'delivered').length;
  const avgOrderValue = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;

  // Unique tables that have active orders
  const activeTables  = new Set(activeOrders.map(o => o.tableId).filter(Boolean)).size;

  const stats = [
    {
      label: 'Total Revenue',
      val:   loading ? '…' : formatRs(totalRevenue),
      delta: `${orders.length} orders total`,
      up:    true,
    },
    {
      label: 'Active Orders',
      val:   loading ? '…' : String(activeOrders.length),
      delta: `${delivering} delivered`,
      up:    activeOrders.length > 0,
    },
    {
      label: 'Active Tables',
      val:   loading ? '…' : String(activeTables),
      delta: 'Tables with open orders',
      up:    null,
    },
    {
      label: 'Avg Order Value',
      val:   loading ? '…' : formatRs(avgOrderValue),
      delta: `From ${orders.length} orders`,
      up:    true,
    },
  ];

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.placedAt ?? 0).getTime() - new Date(a.placedAt ?? 0).getTime())
    .slice(0, 10);

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#14b8a6] bg-black">
        <div>
          <h1 className="font-serif text-[20px] text-ink-900 font-semibold">Dashboard</h1>
          <p className="text-[12px] text-ink-400 mt-0.5">
            Das Pardes · {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {lastSync && <p className="text-[11px] text-ink-400">Synced {lastSync}</p>}
          <button onClick={loadOrders}
            className="w-9 h-9 rounded-xl bg-[#14b8a60f] border border-[#14b8a6] flex items-center justify-center hover:bg-ink-100 transition-colors"
            title="Refresh">
            <RefreshCw size={14} className={`text-ink-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl mb-5">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
            <p className="text-[13px] text-red-600 flex-1">{error}</p>
            <button onClick={loadOrders} className="text-[12px] text-red-700 font-semibold underline">Retry</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {stats.map(s => (
            <div key={s.label} className="bg-[#14b8a60f] border border-[#14b8a6] rounded-2xl p-4 shadow-card">
              <p className="text-[11px] text-ink-400 uppercase tracking-widest font-semibold mb-2">{s.label}</p>
              <p className="font-serif text-[22px] text-ink-900 font-semibold mb-1">{s.val}</p>
              <p className={`text-[11px] flex items-center gap-1 ${
                s.up === true ? 'text-brand-600' : s.up === false ? 'text-red-500' : 'text-ink-400'
              }`}>
                {s.up === true ? '↑' : s.up === false ? '↓' : ''} {s.delta}
              </p>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <h2 className="text-[13px] font-semibold text-ink-500 uppercase tracking-widest mb-3">Quick Access</h2>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {QUICK_LINKS.map(ql => {
            const Icon = ql.icon;
            return (
              <Link key={ql.href} href={ql.href}
                className="bg-[#14b8a60f] border border-[#14b8a6] rounded-2xl p-5 hover:border-brand-200 hover:shadow-card-lg transition-all group shadow-card">
                <div className="w-10 h-10 rounded-xl bg-brand-50 border border-[#14b8a6] flex items-center justify-center mb-3 group-hover:bg-brand-100 transition-colors">
                  <Icon size={18} className="text-brand-600" />
                </div>
                <p className="text-[14px] font-semibold text-ink-900 mb-1">{ql.label}</p>
                <p className="text-[12px] text-ink-400">{ql.desc}</p>
              </Link>
            );
          })}
        </div>

        {/* Recent orders */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-ink-500 uppercase tracking-widest">Recent Orders</h2>
          <Link href="/kds" className="text-[12px] text-brand-600 font-semibold hover:text-brand-700">
            View KDS →
          </Link>
        </div>

        <div className="bg-[#14b8a60f] border border-[#14b8a6] rounded-2xl overflow-hidden shadow-card">
          {/* Header */}
          <div className="grid gap-3 px-4 py-3 border border-[#14b8a6]"
            style={{ gridTemplateColumns: '130px 80px 60px 110px 95px 80px' }}>
            {['Order ID', 'Table', 'Items', 'Total', 'Status', 'Time'].map(h => (
              <div key={h} className="text-[11px] text-ink-400 uppercase tracking-widest font-semibold">{h}</div>
            ))}
          </div>

          {/* Loading skeleton */}
          {loading && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid gap-3 px-4 py-4 border border-[#14b8a6] last:border-0 items-center"
              style={{ gridTemplateColumns: '130px 80px 60px 110px 95px 80px' }}>
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="h-3 bg-ink-100 rounded animate-pulse" />
              ))}
            </div>
          ))}

          {/* Empty state */}
          {!loading && recentOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <span className="text-3xl opacity-30">📋</span>
              <p className="text-[13px] text-ink-400">No orders yet</p>
            </div>
          )}

          {/* Rows */}
          {!loading && recentOrders.map(order => {
            const kds    = toKds(order.status);
            const itemCount = order.lineItems?.length ?? 0;
            return (
              <div key={order.orderId}
                className="grid gap-3 px-4 py-3.5 bg-[#14b8a60f] border border-[#14b8a6] last:border-0 items-center hover:bg-ink-50 transition-colors"
                style={{ gridTemplateColumns: '130px 80px 60px 110px 95px 80px' }}>
                <span className="font-mono-dm text-[12px] text-ink-800 font-semibold truncate">
                  {shortId(order.orderId)}
                </span>
                <span className="text-[13px] text-ink-500">
                  Table {tableNum(order.tableId)}
                </span>
                <span className="text-[13px] text-ink-400">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                <span className="font-serif text-[13px] text-brand-600 font-semibold">
                  {formatRs(order.totalAmountMinorUnits ?? 0)}
                </span>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${CHIP[kds]}`}>
                  {kds}
                </span>
                <span className="text-[12px] text-ink-400">{formatTime(order.placedAt)}</span>
              </div>
            );
          })}

          {/* Footer */}
          {!loading && orders.length > 0 && (
            <div className="px-4 py-3 border-t border-[#14b8a6] flex items-center justify-between">
              <p className="text-[11px] text-ink-400">
                Showing {recentOrders.length} of {orders.length} orders
              </p>
              <p className="text-[11px] text-ink-300 font-mono-dm">Source: AWS API Gateway</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}