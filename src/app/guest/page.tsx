'use client';

import Link from 'next/link';
import { MapPin, ShoppingCart, Leaf, Radio } from 'lucide-react';
import { LiveDot } from '@/components/ui';

export default function GuestLandingPage() {
  return (
    <main className="min-h-dvh bg-surface flex flex-col items-center justify-center p-6">
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212,163,78,0.18) 0%, transparent 70%)',
        }}
      />

      {/* Phone shell */}
      <div className="phone-shell shadow-shell">

        {/* Status bar */}
        <div className="flex justify-between items-center px-6 pt-3.5 text-xs text-white/35 font-medium">
          <span>9:41</span>
          <span className="flex gap-1.5 items-center">
            <Radio size={12} />
            <span>●●●</span>
          </span>
        </div>

        {/* Hero */}
        <div className="flex flex-col items-center px-6 pt-5 pb-0">

          {/* Session chip */}
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-full px-3 py-1 mb-5">
            <span className="w-[5px] h-[5px] rounded-full bg-green-400" />
            <span className="text-[10px] text-white/30 uppercase tracking-widest">
              Secure Guest Session
            </span>
          </div>

          {/* Now-open badge */}
          <div className="flex items-center gap-2 bg-gold-400/10 border border-gold-400/25 rounded-full px-3.5 py-1.5 mb-7">
            <LiveDot color="green" />
            <span className="text-[11px] text-gold-400 uppercase tracking-widest font-medium">
              Now Open
            </span>
          </div>

          {/* Logo */}
          <div className="relative w-[88px] h-[88px] mb-5">
            <div className="absolute inset-0 rounded-[28px] bg-gold-400/[0.06] blur-xl" />
            <div className="relative w-full h-full rounded-[28px] bg-gold-400/[0.15] border border-gold-400/35 flex items-center justify-center text-[38px]">
              🍽️
            </div>
          </div>

          {/* Name */}
          <h1 className="font-serif text-[30px] text-[#f5e9d0] font-semibold text-center leading-tight mb-1">
            La Maison
          </h1>
          <p className="font-serif italic text-sm text-gold-400/75 mb-8">
            Fine Dining Experience
          </p>

          {/* Divider */}
          <div className="w-12 h-px bg-gradient-to-r from-transparent via-gold-400/40 to-transparent mb-8" />

          {/* Table card */}
          <div className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.035] border border-gold-400/20 mb-5">
            <div className="w-[52px] h-[52px] rounded-2xl bg-gold-400/12 border border-gold-400/25 flex items-center justify-center flex-shrink-0">
              <MapPin size={22} className="text-gold-400" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] text-white/35 uppercase tracking-widest">Your Table</p>
              <p className="font-serif text-[22px] text-[#f5e9d0] font-semibold leading-tight">
                Table 07
              </p>
              <p className="text-xs text-gold-400/65">Main Hall · Ground Floor</p>
            </div>
            <div className="w-7 h-7 rounded-full bg-green-500/12 border border-green-500/30 flex items-center justify-center">
              <span className="text-green-400 text-xs">✓</span>
            </div>
          </div>

          {/* Feature chips */}
          <div className="grid grid-cols-4 gap-2 w-full mb-8">
            {[
              { icon: '📖', label: 'Full Menu' },
              { icon: '🛒', label: 'Easy Order' },
              { icon: '📡', label: 'Live Track' },
              { icon: '🌿', label: 'Allergens' },
            ].map((f) => (
              <div
                key={f.label}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.025] border border-white/[0.06]"
              >
                <span className="text-lg">{f.icon}</span>
                <span className="text-[10px] text-white/35 text-center leading-tight">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 pb-8 flex flex-col gap-3">
          <Link href="/guest/menu" className="btn-gold shimmer">
            <ShoppingCart size={18} />
            Browse Our Menu
          </Link>
          <button className="btn-ghost text-sm">
            <Leaf size={15} />
            View Allergen Guide
          </button>

          {/* Language */}
          <div className="flex justify-center gap-4 mt-2">
            {['EN', 'اردو', 'FR', 'AR'].map((l, i) => (
              <button
                key={l}
                className={`text-xs ${i === 0 ? 'text-gold-400 font-medium' : 'text-white/20'} transition-colors hover:text-gold-400/70`}
              >
                {l}
              </button>
            ))}
          </div>

          <p className="text-center text-[11px] text-white/12 mt-1">
            Secured guest session · No login required
          </p>
        </div>
      </div>
    </main>
  );
}
