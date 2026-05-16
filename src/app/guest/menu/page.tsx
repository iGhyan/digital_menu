'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Search, SlidersHorizontal } from 'lucide-react';
import { CATEGORIES, MENU_ITEMS, FEATURED_ITEMS, formatPrice } from '@/lib/data';
import { useCartStore } from '@/lib/store';
import { TAG_CONFIG } from '@/lib/utils';
import type { MenuItem } from '@/lib/types';

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const { addItem, itemCount } = useCartStore();
  const [added, setAdded] = useState<Record<string, boolean>>({});

  const filtered = MENU_ITEMS.filter((item) => {
    const matchCat = activeCategory === 'all' || item.category === activeCategory;
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch && item.status !== 'inactive';
  });

  const handleAdd = (item: MenuItem) => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      emoji: item.emoji,
      price: item.price,
      quantity: 1,
      options: {},
    });
    setAdded((p) => ({ ...p, [item.id]: true }));
    setTimeout(() => setAdded((p) => ({ ...p, [item.id]: false })), 1800);
  };

  return (
    <main className="min-h-dvh bg-surface flex flex-col items-center p-6">
      <div className="phone-shell">

        {/* Status bar */}
        <div className="flex justify-between px-5 pt-3.5 text-xs text-white/35">
          <span>9:41</span>
          <span>●●●</span>
        </div>

        {/* Top nav */}
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-[11px] text-white/30 uppercase tracking-widest">Table 07 · Main Hall</p>
            <h1 className="font-serif text-[22px] text-[#f5e9d0] font-semibold">Our Menu</h1>
          </div>
          <Link href="/guest/cart" className="relative w-11 h-11 rounded-[14px] bg-gold-400/10 border border-gold-400/25 flex items-center justify-center">
            <ShoppingCart size={20} className="text-gold-400" />
            {itemCount() > 0 && (
              <span className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-gold-400 flex items-center justify-center text-[10px] font-medium text-surface">
                {itemCount()}
              </span>
            )}
          </Link>
        </div>

        {/* Search */}
        <div className="relative px-5 mb-4">
          <Search size={15} className="absolute left-8 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes, ingredients…"
            className="w-full h-11 pl-9 pr-10 rounded-[14px] bg-white/[0.05] border border-white/[0.08] text-sm"
          />
          <SlidersHorizontal size={15} className="absolute right-8 top-1/2 -translate-y-1/2 text-gold-400/50" />
        </div>

        {/* Category chips */}
        <div className="flex gap-2.5 px-5 pb-1 overflow-x-auto scrollbar-hide mb-5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-[13px] transition-all ${
                activeCategory === cat.id
                  ? 'bg-gold-400/15 border-gold-400/40 text-gold-400 font-medium'
                  : 'bg-white/[0.03] border-white/[0.08] text-white/45 hover:border-gold-400/25'
              }`}
            >
              <span className="text-[15px]">{cat.emoji}</span>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Featured */}
        <p className="px-5 section-label mb-3">⭐ Chef's Specials</p>
        <div className="flex gap-3 px-5 pb-1 overflow-x-auto scrollbar-hide mb-6">
          {FEATURED_ITEMS.map((item) => (
            <div
              key={item.id}
              className="flex-shrink-0 w-[190px] rounded-[20px] border border-white/[0.07] overflow-hidden"
              style={{ background: '#161210' }}
            >
              <div className="h-[120px] flex items-center justify-center text-[52px] relative"
                style={{ background: 'linear-gradient(135deg,#2a1a0a,#1a0f05)' }}>
                {item.tags.includes('chef') && (
                  <span className="absolute top-2.5 left-2.5 bg-gold-400/90 text-surface text-[10px] font-medium px-2.5 py-1 rounded-full">
                    Chef's Pick
                  </span>
                )}
                {item.emoji}
              </div>
              <div className="p-3">
                <p className="text-[14px] font-medium text-[#f5e9d0] truncate mb-1">{item.name}</p>
                <p className="text-[11px] text-white/30 line-clamp-2 mb-2.5 leading-relaxed">{item.description}</p>
                <div className="flex items-center justify-between">
                  <span className="font-serif text-[15px] text-gold-400 font-semibold">
                    {formatPrice(item.price)}
                  </span>
                  <button
                    onClick={() => handleAdd(item)}
                    className={`w-7 h-7 rounded-[8px] border flex items-center justify-center transition-all ${
                      added[item.id]
                        ? 'bg-gold-400/25 border-gold-400/50 text-gold-400'
                        : 'bg-gold-400/15 border-gold-400/30 text-gold-400 hover:bg-gold-400/28'
                    }`}
                  >
                    {added[item.id] ? '✓' : '+'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Promo banner */}
        <div className="mx-5 mb-5 flex items-center gap-3 p-3.5 rounded-2xl bg-gold-400/[0.08] border border-gold-400/20">
          <span className="text-2xl">🎁</span>
          <div className="flex-1">
            <p className="text-[13px] font-medium text-gold-400">Happy Hours · 6–8 PM</p>
            <p className="text-[11px] text-white/30">20% off all beverages &amp; appetizers today</p>
          </div>
          <span className="text-gold-400/40 text-base">›</span>
        </div>

        {/* Items list */}
        <p className="px-5 section-label mb-3">🍽️ All Items</p>
        <div className="flex flex-col gap-2 px-5 mb-6">
          {filtered.map((item) => (
            <Link key={item.id} href={`/guest/menu/${item.id}`}>
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.04] hover:border-gold-400/15 transition-all cursor-pointer">
                <div className="w-14 h-14 rounded-[14px] flex items-center justify-center text-[28px] flex-shrink-0 bg-white/[0.03]">
                  {item.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[#f5e9d0] truncate">{item.name}</p>
                  <div className="flex gap-1.5 mb-1 flex-wrap">
                    {item.tags.filter((t) => t !== 'chef').map((tag) => (
                      <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-full ${TAG_CONFIG[tag].cls}`}>
                        {TAG_CONFIG[tag].label}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-white/28 truncate">{item.description}</p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="font-serif text-[15px] text-gold-400 font-semibold">
                    {formatPrice(item.price)}
                  </span>
                  <button
                    onClick={(e) => { e.preventDefault(); handleAdd(item); }}
                    className={`w-[30px] h-[30px] rounded-[9px] border flex items-center justify-center transition-all text-sm ${
                      added[item.id]
                        ? 'bg-gold-400/85 border-gold-400/90 text-surface'
                        : 'bg-gold-400/12 border-gold-400/30 text-gold-400 hover:bg-gold-400/25 hover:scale-[1.08]'
                    }`}
                  >
                    {added[item.id] ? '✓' : '+'}
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom nav */}
        <div className="flex justify-around items-center px-5 pt-3.5 pb-7 border-t border-white/[0.05] bg-surface">
          {[
            { icon: '🏠', label: 'Home', href: '/guest' },
            { icon: '📖', label: 'Menu',  href: '/guest/menu', active: true },
            { icon: '🛒', label: 'Cart',  href: '/guest/cart' },
            { icon: '🕐', label: 'Orders',href: '/guest/tracking' },
          ].map((n) => (
            <Link key={n.label} href={n.href}
              className={`flex flex-col items-center gap-1 px-2.5 py-1 ${n.active ? 'text-gold-400' : 'text-white/20'}`}>
              <span className="text-[20px]">{n.icon}</span>
              <span className="text-[10px] font-medium">{n.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
