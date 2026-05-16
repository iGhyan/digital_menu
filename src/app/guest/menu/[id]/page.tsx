'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Share2, Heart, Clock, Cuboid } from 'lucide-react';
import Link from 'next/link';
import { MENU_ITEMS, formatPrice } from '@/lib/data';
import { useCartStore } from '@/lib/store';
import { TAG_CONFIG } from '@/lib/utils';
import { DEMO_RESTAURANT_ID, DEMO_ITEM_ID } from '@/lib/ar-api';

export default function ItemDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const item    = MENU_ITEMS.find((m) => m.id === id);

  const { addItem } = useCartStore();
  const [qty,      setQty]      = useState(1);
  const [wished,   setWished]   = useState(false);
  const [doneness, setDoneness] = useState(item?.customisations?.doneness?.[1] ?? '');
  const [side,     setSide]     = useState(item?.customisations?.sides?.[0]    ?? '');
  const [sauce,    setSauce]    = useState(item?.customisations?.sauces?.[0]   ?? '');
  const [added,    setAdded]    = useState(false);

  if (!item) {
    return (
      <main className="min-h-dvh bg-surface flex items-center justify-center">
        <p className="text-white/40">Item not found</p>
      </main>
    );
  }

  const handleAddToCart = () => {
    addItem({
      menuItemId: item.id,
      name:       item.name,
      emoji:      item.emoji,
      price:      item.price,
      quantity:   qty,
      options:    { doneness, side, sauce },
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const arHref =
    `/guest/ar?rid=${DEMO_RESTAURANT_ID}` +
    `&iid=${DEMO_ITEM_ID}` +
    `&name=${encodeURIComponent(item.name)}` +
    `&emoji=${encodeURIComponent(item.emoji)}`;

  return (
    <main className="min-h-dvh bg-surface flex flex-col items-center p-6">
      <div className="phone-shell">

        {/* Status bar */}
        <div className="flex justify-between px-5 pt-3.5 text-xs text-white/35">
          <span>9:43</span><span>●●●</span>
        </div>

        {/* Hero */}
        <div
          className="relative w-full h-[220px] flex items-center justify-center text-[90px]"
          style={{ background: 'linear-gradient(160deg,#1e1208 0%,#0f0d0a 100%)' }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle,rgba(212,163,78,0.12) 0%,transparent 70%)' }}
          />
          <span className="relative z-10 drop-shadow-2xl">{item.emoji}</span>

          <button
            onClick={() => router.back()}
            className="absolute top-3 left-4 w-9 h-9 rounded-xl bg-black/45 border border-white/10 flex items-center justify-center z-20"
          >
            <ArrowLeft size={16} className="text-white/70" />
          </button>

          <button
            onClick={() => setWished(!wished)}
            className={`absolute top-3 right-14 w-9 h-9 rounded-xl flex items-center justify-center z-20 border transition-all ${
              wished ? 'bg-red-500/15 border-red-500/25' : 'bg-black/45 border-white/10'
            }`}
          >
            <Heart size={16} className={wished ? 'text-red-400 fill-red-400' : 'text-white/50'} />
          </button>

          <button className="absolute top-3 right-4 w-9 h-9 rounded-xl bg-black/45 border border-white/10 flex items-center justify-center z-20">
            <Share2 size={16} className="text-white/50" />
          </button>

          {/* Tag pills */}
          <div className="absolute bottom-3.5 left-4 flex gap-1.5 z-20">
            {item.tags.filter((t) => t !== 'chef').map((tag) => (
              <span
                key={tag}
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TAG_CONFIG[tag].cls}`}
              >
                {TAG_CONFIG[tag].label}
              </span>
            ))}
            {item.tags.includes('chef') && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gold-400/90 text-surface">
                Chef's Pick
              </span>
            )}
          </div>

          {/* AR badge */}
          <Link
            href={arHref}
            className="absolute bottom-3.5 right-4 z-20 flex items-center gap-1.5 bg-black/60 border border-gold-400/40 rounded-full px-2.5 py-1.5 hover:bg-gold-400/15 transition-colors"
          >
            <Cuboid size={12} className="text-gold-400" />
            <span className="text-[10px] text-gold-400 font-medium">View in AR</span>
          </Link>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">

          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-white/[0.05]">
            <h1 className="font-serif text-[26px] text-[#f5e9d0] font-semibold leading-tight mb-1">
              {item.name}
            </h1>
            {item.subtitle && (
              <p className="font-serif italic text-[13px] text-gold-400/60 mb-3">{item.subtitle}</p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className={`text-[13px] ${s <= Math.floor(item.rating) ? 'text-gold-400' : 'text-white/15'}`}>
                    ★
                  </span>
                ))}
              </div>
              <span className="text-[13px] text-white/50">{item.rating}</span>
              <span className="w-[3px] h-[3px] rounded-full bg-white/15" />
              <span className="text-[12px] text-white/25">{item.reviewCount} reviews</span>
              <span className="w-[3px] h-[3px] rounded-full bg-white/15" />
              <span className="flex items-center gap-1 text-[12px] text-white/30">
                <Clock size={12} /> {item.prepTime}
              </span>
            </div>
          </div>

          {/* AR promo banner */}
          <Link
            href={arHref}
            className="mx-5 mt-4 flex items-center gap-3 p-3.5 rounded-2xl bg-gold-400/[0.08] border border-gold-400/20 hover:bg-gold-400/[0.12] transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-gold-400/15 flex items-center justify-center flex-shrink-0">
              <Cuboid size={20} className="text-gold-400" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-gold-400">View in Augmented Reality</p>
              <p className="text-[11px] text-white/30">
                Place this dish on your real table · Mobile AR &amp; Desktop 360°
              </p>
            </div>
            <span className="text-gold-400/40 text-lg">›</span>
          </Link>

          {/* Macros */}
          <div className="flex gap-2 px-5 py-4 border-b border-white/[0.05] mt-2">
            {[
              { val: item.calories,      label: 'Cal'     },
              { val: `${item.protein}g`, label: 'Protein' },
              { val: `${item.fat}g`,     label: 'Fat'     },
              { val: `${item.carbs}g`,   label: 'Carbs'   },
            ].map((m) => (
              <div
                key={m.label}
                className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5 flex flex-col items-center gap-0.5"
              >
                <span className="text-[15px] font-medium text-[#f5e9d0]">{m.val}</span>
                <span className="text-[10px] text-white/25 uppercase tracking-widest">{m.label}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="px-5 py-4 border-b border-white/[0.05]">
            <p className="section-label mb-3">Description</p>
            <p className="text-[13px] text-white/50 leading-relaxed">{item.description}</p>
          </div>

          {/* Allergens */}
          <div className="px-5 py-4 border-b border-white/[0.05]">
            <p className="section-label mb-2">Allergen Information</p>
            <div className="flex gap-3 mb-3">
              <span className="flex items-center gap-1.5 text-[10px] text-white/25">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Contains
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-white/25">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Free from
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {item.allergens.map((a) => (
                <div
                  key={a.name}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-[11px] border ${
                    a.status === 'present' ? 'allergen-present' : 'allergen-free'
                  }`}
                >
                  <span className={`w-[5px] h-[5px] rounded-full flex-shrink-0 ${a.status === 'present' ? 'bg-red-400' : 'bg-green-400'}`} />
                  <span>{a.emoji}</span>
                  <span>{a.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Customisations */}
          {item.customisations && (
            <div className="px-5 py-4 border-b border-white/[0.05]">
              <p className="section-label mb-3">Customise Your Order</p>
              {[
                { label: 'Doneness', opts: item.customisations.doneness, val: doneness, set: setDoneness },
                { label: 'Side',     opts: item.customisations.sides,    val: side,     set: setSide     },
                { label: 'Sauce',    opts: item.customisations.sauces,   val: sauce,    set: setSauce    },
              ]
                .filter((g) => g.opts)
                .map((g) => (
                  <div key={g.label} className="mb-4">
                    <p className="text-[13px] text-white/50 font-medium mb-2">{g.label}</p>
                    <div className="flex gap-2 flex-wrap">
                      {g.opts!.map((o) => (
                        <button
                          key={o}
                          onClick={() => g.set(o)}
                          className={`px-3.5 py-1.5 rounded-full border text-[12px] transition-all ${
                            g.val === o
                              ? 'bg-gold-400/15 border-gold-400/40 text-gold-400'
                              : 'bg-white/[0.03] border-white/10 text-white/40 hover:border-gold-400/25'
                          }`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
            <div>
              <p className="text-[13px] font-medium text-white/60">Quantity</p>
              <p className="text-[11px] text-white/25">Max 5 per order</p>
            </div>
            <div className="flex items-center border border-white/10 rounded-[14px] overflow-hidden">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-10 h-10 flex items-center justify-center bg-white/[0.04] hover:bg-gold-400/10 transition-colors"
              >
                <span className="text-white/50 text-base">−</span>
              </button>
              <span className="w-10 h-10 flex items-center justify-center text-[16px] font-medium text-[#f5e9d0] border-x border-white/[0.07]">
                {qty}
              </span>
              <button
                onClick={() => setQty(Math.min(5, qty + 1))}
                className="w-10 h-10 flex items-center justify-center bg-white/[0.04] hover:bg-gold-400/10 transition-colors"
              >
                <span className="text-gold-400 text-base">+</span>
              </button>
            </div>
          </div>

          <div className="h-4" />
        </div>

        {/* Footer */}
        <div className="px-5 pt-4 pb-7 border-t border-white/[0.05] flex items-center gap-3 bg-surface">
          <div>
            <p className="text-[10px] text-white/25 uppercase tracking-widest">Total</p>
            <p className="font-serif text-[24px] text-gold-400 font-semibold leading-tight">
              {formatPrice(item.price * qty)}
            </p>
          </div>
          <button
            onClick={handleAddToCart}
            className={`flex-1 h-[52px] rounded-2xl flex items-center justify-center gap-2 text-[15px] font-medium transition-all ${
              added
                ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                : 'bg-gradient-to-br from-gold-400 to-gold-500 text-surface hover:opacity-90'
            }`}
          >
            {added ? '✓ Added!' : '🛒 Add to Cart'}
          </button>
        </div>
      </div>
    </main>
  );
}