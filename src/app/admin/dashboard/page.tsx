'use client';

import Link from 'next/link';
import { BookOpen, QrCode, Users, TrendingUp } from 'lucide-react';

const STATS = [
  { label: 'Revenue Today',  val: 'Rs 284,500', delta: '+22% vs yesterday', up: true  },
  { label: 'Orders Today',   val: '127',          delta: '+18 since morning', up: true  },
  { label: 'Active Tables',  val: '9 / 12',       delta: '3 tables available', up: null },
  { label: 'Avg Order Value',val: 'Rs 2,240',     delta: '+Rs 180 this week',  up: true  },
];

const QUICK_LINKS = [
  { href: '/admin/menu',  label: 'Menu Management', icon: BookOpen, desc: '84 items · 71 active' },
  { href: '/admin/qr',    label: 'QR Codes',         icon: QrCode,  desc: '12 tables · all linked' },
  { href: '/admin/users', label: 'User Management',  icon: Users,   desc: '6 users · 3 online' },
];

export default function AdminDashboardPage() {
  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
        <div>
          <h1 className="font-serif text-[20px] text-[#f5e9d0] font-semibold">Dashboard</h1>
          <p className="text-[12px] text-white/25 mt-0.5">La Maison · Main Hall · Friday, 15 May 2026</p>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {STATS.map((s) => (
            <div key={s.label} className="bg-surface-100 border border-white/[0.06] rounded-[14px] p-4">
              <p className="text-[11px] text-white/25 uppercase tracking-widest mb-2">{s.label}</p>
              <p className="font-serif text-[22px] text-[#f5e9d0] font-semibold mb-1">{s.val}</p>
              <p className={`text-[11px] flex items-center gap-1 ${s.up === true ? 'text-green-400' : 'text-white/25'}`}>
                {s.up ? '↑' : ''} {s.delta}
              </p>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <h2 className="text-[14px] font-medium text-white/40 mb-3">Quick Access</h2>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {QUICK_LINKS.map((ql) => {
            const Icon = ql.icon;
            return (
              <Link key={ql.href} href={ql.href}
                className="bg-surface-100 border border-white/[0.06] rounded-2xl p-5 hover:border-gold-400/25 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-gold-400/10 border border-gold-400/20 flex items-center justify-center mb-3 group-hover:bg-gold-400/18 transition-colors">
                  <Icon size={18} className="text-gold-400" />
                </div>
                <p className="text-[14px] font-medium text-[#f5e9d0] mb-1">{ql.label}</p>
                <p className="text-[12px] text-white/25">{ql.desc}</p>
              </Link>
            );
          })}
        </div>

        {/* Recent orders table */}
        <h2 className="text-[14px] font-medium text-white/40 mb-3">Recent Orders</h2>
        <div className="bg-surface-100 border border-white/[0.06] rounded-2xl overflow-hidden">
          {[
            { id: 'LM-2850', table: '05', items: 2, total: 'Rs 7,350', status: 'preparing', time: '9:53 PM' },
            { id: 'LM-2849', table: '11', items: 5, total: 'Rs 6,650', status: 'ready',     time: '9:36 PM' },
            { id: 'LM-2848', table: '03', items: 2, total: 'Rs 6,750', status: 'preparing', time: '9:41 PM' },
            { id: 'LM-2847', table: '07', items: 3, total: 'Rs 8,256', status: 'preparing', time: '9:46 PM' },
            { id: 'LM-2844', table: '09', items: 2, total: 'Rs 3,120', status: 'delivered', time: '9:30 PM' },
          ].map((order, i) => (
            <div key={order.id}
              className="grid gap-3 px-4 py-3.5 border-b border-white/[0.04] last:border-0 items-center hover:bg-white/[0.02] transition-colors"
              style={{ gridTemplateColumns: '120px 80px 60px 100px 90px 80px' }}>
              <span className="font-mono-dm text-[13px] text-[#f5e9d0]">{order.id}</span>
              <span className="text-[13px] text-white/50">Table {order.table}</span>
              <span className="text-[13px] text-white/35">{order.items} items</span>
              <span className="font-serif text-[13px] text-gold-400">{order.total}</span>
              <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium chip-${order.status}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
              <span className="text-[12px] text-white/20">{order.time}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
