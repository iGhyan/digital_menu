'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, QrCode, ChefHat,
  BarChart2, Receipt, Users, Settings, LogOut,
} from 'lucide-react';

const NAV = [
  { section: 'Main', items: [
    { href: '/admin/dashboard', label: 'Dashboard',      icon: LayoutDashboard },
    { href: '/admin/menu',      label: 'Menu Management', icon: BookOpen },
    { href: '/admin/qr',        label: 'QR Codes',        icon: QrCode },
    { href: '/admin/dashboard', label: 'Kitchen Orders',  icon: ChefHat, badge: '7' },
  ]},
  { section: 'Reports', items: [
    { href: '/admin/dashboard', label: 'Analytics',      icon: BarChart2 },
    { href: '/admin/dashboard', label: 'Orders History', icon: Receipt },
  ]},
  { section: 'Admin', items: [
    { href: '/admin/users',     label: 'User Management', icon: Users },
    { href: '/admin/dashboard', label: 'Settings',        icon: Settings },
  ]},
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh bg-surface-400 font-sans">
      {/* Sidebar */}
      <aside className="w-[220px] bg-surface-100 border-r border-white/[0.06] flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 p-5 border-b border-white/[0.05]">
          <span className="text-[22px]">🍽️</span>
          <div>
            <p className="font-serif text-[17px] text-[#f5e9d0] font-semibold leading-tight">La Maison</p>
            <p className="text-[10px] text-white/20 uppercase tracking-widest">Admin Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-hide">
          {NAV.map((group) => (
            <div key={group.section}>
              <p className="px-3 py-2 text-[10px] text-white/18 uppercase tracking-widest font-medium">
                {group.section}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`sb-item ${active ? 'active' : ''} mb-0.5`}
                  >
                    <Icon size={17} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="bg-red-500/15 border border-red-500/25 rounded-full px-1.5 py-0.5 text-[10px] text-red-400">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 pb-4 pt-3 border-t border-white/[0.05]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-gold-400/15 border border-gold-400/30 flex items-center justify-center text-[12px] font-medium text-gold-400 flex-shrink-0">
              SA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-white/60 truncate">Super Admin</p>
              <p className="text-[10px] text-white/20">Full Access · MFA On</p>
            </div>
            <LogOut size={15} className="text-white/15 cursor-pointer hover:text-white/30 transition-colors" />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {children}
      </main>
    </div>
  );
}
