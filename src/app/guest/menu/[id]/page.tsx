'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Share2, Heart, Clock, Cuboid } from 'lucide-react';
import Link from 'next/link';
import { MENU_ITEMS, formatPrice } from '@/lib/data';
import { useCartStore } from '@/lib/store';


const TAG_STYLES: Record<string, string> = {
  veg:     'bg-green-50 border border-green-200 text-green-700',
  spicy:   'bg-red-50 border border-red-200 text-red-600',
  new:     'bg-brand-50 border border-brand-200 text-brand-700',
  popular: 'bg-purple-50 border border-purple-200 text-purple-700',
  chef:    'bg-amber-50 border border-amber-200 text-amber-700',
};

export default function ItemDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const item    = MENU_ITEMS.find(m => m.id === id);
  const { addItem } = useCartStore();

  const [qty,      setQty]      = useState(1);
  const [wished,   setWished]   = useState(false);
  const [doneness, setDoneness] = useState(item?.customisations?.doneness?.[1] ?? '');
  const [side,     setSide]     = useState(item?.customisations?.sides?.[0]    ?? '');
  const [sauce,    setSauce]    = useState(item?.customisations?.sauces?.[0]   ?? '');
  const [added,    setAdded]    = useState(false);

  if (!item) return <main className="min-h-dvh flex items-center justify-center bg-white"><p className="text-ink-400">Not found</p></main>;

  const handleAdd = () => {
    addItem({ menuItemId: item.id, name: item.name, emoji: item.emoji, price: item.price, quantity: qty, options: { doneness, side, sauce } });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  // Read restaurant ID from env — hardcoded fallback ensures it always works
  const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID || '2687382e-3b00-4f57-9014-f484df89e3fe';
  const arHref = `/guest/ar?rid=${rid}&iid=${encodeURIComponent(item.id)}&name=${encodeURIComponent(item.name)}&emoji=${encodeURIComponent(item.emoji)}`;

  return (
    <main className="min-h-dvh bg-slate-50 flex flex-col items-center py-6 px-4">
      <div className="phone-shell">
        <div className="flex justify-between px-5 pt-4 text-xs text-ink-400"><span>9:43</span><span>●●●</span></div>

        {/* Hero */}
        <div className="relative w-full h-[210px] flex items-center justify-center text-[88px] bg-gradient-to-br from-brand-50 to-teal-50">
          <span className="drop-shadow-lg">{item.emoji}</span>
          <button onClick={() => router.back()} className="absolute top-3 left-4 w-9 h-9 rounded-xl bg-white shadow-card border border-ink-100 flex items-center justify-center">
            <ArrowLeft size={16} className="text-ink-600" />
          </button>
          <button onClick={() => setWished(!wished)} className={`absolute top-3 right-14 w-9 h-9 rounded-xl shadow-card border flex items-center justify-center transition-all ${wished ? 'bg-red-50 border-red-200' : 'bg-white border-ink-100'}`}>
            <Heart size={16} className={wished ? 'text-red-500 fill-red-500' : 'text-ink-400'} />
          </button>
          <button className="absolute top-3 right-4 w-9 h-9 rounded-xl bg-white shadow-card border border-ink-100 flex items-center justify-center">
            <Share2 size={16} className="text-ink-400" />
          </button>
          <div className="absolute bottom-3.5 left-4 flex gap-1.5">
            {item.tags.filter(t => t !== 'chef').map(tag => (
              <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${TAG_STYLES[tag]}`}>
                {tag.charAt(0).toUpperCase() + tag.slice(1)}
              </span>
            ))}
          </div>
          <Link href={arHref} className="absolute bottom-3.5 right-4 flex items-center gap-1.5 bg-white border border-brand-200 rounded-full px-2.5 py-1.5 shadow-card hover:bg-brand-50 transition-colors">
            <Cuboid size={12} className="text-brand-600" />
            <span className="text-[10px] text-brand-700 font-semibold">View in AR</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Header */}
          <div className="px-5 pt-4 pb-4 border-b border-ink-100">
            <h1 className="font-serif text-[24px] text-ink-900 font-semibold mb-1">{item.name}</h1>
            {item.subtitle && <p className="font-serif italic text-[13px] text-brand-600 mb-3">{item.subtitle}</p>}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <span key={s} className={`text-[14px] ${s <= Math.floor(item.rating) ? 'text-amber-400' : 'text-ink-200'}`}>★</span>)}</div>
              <span className="text-[13px] text-ink-600 font-medium">{item.rating}</span>
              <span className="w-1 h-1 rounded-full bg-ink-200" />
              <span className="text-[12px] text-ink-400">{item.reviewCount} reviews</span>
              <span className="w-1 h-1 rounded-full bg-ink-200" />
              <span className="flex items-center gap-1 text-[12px] text-ink-400"><Clock size={12} />{item.prepTime}</span>
            </div>
          </div>

          {/* AR banner */}
          <Link href={arHref} className="mx-5 mt-4 flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-brand-50 to-teal-50 border border-brand-100 hover:border-brand-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0 shadow-brand">
              <Cuboid size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-brand-800">View in Augmented Reality</p>
              <p className="text-[11px] text-brand-600">Place on your table · Mobile AR & 360° Desktop</p>
            </div>
            <span className="text-brand-400 text-lg">›</span>
          </Link>

          {/* Macros */}
          <div className="flex gap-2 px-5 py-4 border-b border-ink-100 mt-2">
            {[{val:item.calories,label:'Cal'},{val:`${item.protein}g`,label:'Protein'},{val:`${item.fat}g`,label:'Fat'},{val:`${item.carbs}g`,label:'Carbs'}].map(m => (
              <div key={m.label} className="flex-1 bg-ink-50 rounded-2xl p-2.5 flex flex-col items-center gap-0.5 border border-ink-100">
                <span className="text-[15px] font-semibold text-ink-800">{m.val}</span>
                <span className="text-[10px] text-ink-400 uppercase tracking-widest font-semibold">{m.label}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="px-5 py-4 border-b border-ink-100">
            <p className="section-label mb-2">Description</p>
            <p className="text-[13px] text-ink-500 leading-relaxed">{item.description}</p>
          </div>

          {/* Allergens */}
          <div className="px-5 py-4 border-b border-ink-100">
            <p className="section-label mb-2">Allergen Information</p>
            <div className="flex gap-4 mb-3">
              <span className="flex items-center gap-1.5 text-[11px] text-ink-400 font-medium"><span className="w-2 h-2 rounded-full bg-red-400" />Contains</span>
              <span className="flex items-center gap-1.5 text-[11px] text-ink-400 font-medium"><span className="w-2 h-2 rounded-full bg-brand-500" />Free from</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {item.allergens.map(a => (
                <div key={a.name} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium border ${a.status === 'present' ? 'allergen-present' : 'allergen-free'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${a.status === 'present' ? 'bg-red-400' : 'bg-brand-500'}`} />
                  <span>{a.emoji}</span><span>{a.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Customisations */}
          {item.customisations && (
            <div className="px-5 py-4 border-b border-ink-100">
              <p className="section-label mb-3">Customise Your Order</p>
              {[
                {label:'Doneness',opts:item.customisations.doneness,val:doneness,set:setDoneness},
                {label:'Side',opts:item.customisations.sides,val:side,set:setSide},
                {label:'Sauce',opts:item.customisations.sauces,val:sauce,set:setSauce},
              ].filter(g=>g.opts).map(g => (
                <div key={g.label} className="mb-4">
                  <p className="text-[13px] font-semibold text-ink-700 mb-2">{g.label}</p>
                  <div className="flex gap-2 flex-wrap">
                    {g.opts!.map(o => (
                      <button key={o} onClick={() => g.set(o)}
                        className={`px-3.5 py-1.5 rounded-full border text-[12px] font-medium transition-all ${g.val===o ? 'bg-brand-500 border-brand-500 text-white shadow-brand' : 'bg-white border-ink-200 text-ink-500 hover:border-brand-300'}`}>
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
            <div><p className="text-[13px] font-semibold text-ink-700">Quantity</p><p className="text-[11px] text-ink-400">Max 5</p></div>
            <div className="flex items-center border border-ink-200 rounded-2xl overflow-hidden bg-white shadow-card">
              <button onClick={() => setQty(Math.max(1,qty-1))} className="w-10 h-10 flex items-center justify-center hover:bg-ink-50 transition-colors text-ink-500 font-bold text-lg">−</button>
              <span className="w-10 h-10 flex items-center justify-center text-[16px] font-semibold text-ink-900 border-x border-ink-200">{qty}</span>
              <button onClick={() => setQty(Math.min(5,qty+1))} className="w-10 h-10 flex items-center justify-center hover:bg-brand-50 transition-colors text-brand-600 font-bold text-lg">+</button>
            </div>
          </div>
          <div className="h-4" />
        </div>

        {/* Footer */}
        <div className="px-5 pt-3.5 pb-6 border-t border-ink-100 flex items-center gap-3 bg-white">
          <div>
            <p className="text-[10px] text-ink-400 uppercase tracking-widest font-semibold">Total</p>
            <p className="font-serif text-[22px] text-brand-600 font-semibold">{formatPrice(item.price * qty)}</p>
          </div>
          <button onClick={handleAdd}
            className={`flex-1 h-[52px] rounded-2xl flex items-center justify-center gap-2 text-[15px] font-semibold transition-all ${added ? 'bg-green-500 text-white shadow-lg' : 'bg-brand-500 text-white shadow-brand hover:bg-brand-600'}`}>
            {added ? '✓ Added to Cart!' : '🛒 Add to Cart'}
          </button>
        </div>
      </div>
    </main>
  );
}