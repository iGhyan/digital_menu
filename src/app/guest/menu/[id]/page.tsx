'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Share2, Heart, Clock, Cuboid, Loader2, AlertCircle, Send } from 'lucide-react';
import Link from 'next/link';
import { formatPrice } from '@/lib/data';
import { fetchMenuItem, normaliseItem, type ApiMenuItem } from '@/lib/menu-api';

const TAG_STYLES: Record<string, string> = {
  veg:     'bg-green-50 border border-green-200 text-green-700',
  spicy:   'bg-red-50 border border-red-200 text-red-600',
  new:     'bg-brand-50 border border-brand-200 text-brand-700',
  popular: 'bg-purple-50 border border-purple-200 text-purple-700',
  chef:    'bg-amber-50 border border-amber-200 text-amber-700',
};

const TENANT_ID     = process.env.NEXT_PUBLIC_TENANT_ID_KDS;
const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID_KDS;

export default function ItemDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const [item,      setItem]      = useState<ApiMenuItem | null>(null);
  const [rawItem,   setRawItem]   = useState<any>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [qty,       setQty]       = useState(1);
  const [wished,    setWished]    = useState(false);
  const [doneness,  setDoneness]  = useState('');
  const [side,      setSide]      = useState('');
  const [sauce,     setSauce]     = useState('');
  const [arReady,   setArReady]   = useState<boolean | null>(null);

  // Order state
  const [placing,   setPlacing]   = useState(false);
  const [placed,    setPlaced]    = useState(false);
  const [orderId,   setOrderId]   = useState('');
  const [orderErr,  setOrderErr]  = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const menuRid = process.env.NEXT_PUBLIC_RESTAURANT_ID;
    fetchMenuItem(id, menuRid)
      .then(raw => {
        setRawItem(raw);
        const normalised = normaliseItem(raw);
        setItem(normalised);
        setDoneness(normalised.customisations?.doneness?.[1] ?? '');
        setSide(normalised.customisations?.sides?.[0] ?? '');
        setSauce(normalised.customisations?.sauces?.[0] ?? '');
        setLoading(false);
        const hasModel = !!(raw as any).arModelUrl || !!(raw as any).arModelKey;
        setArReady(hasModel);
      })
      .catch(e => { setError(e?.message ?? 'Failed to load item'); setLoading(false); });
  }, [id]);

  // ── Direct order placement ────────────────────────────────────────────────────
  const placeOrder = async () => {
    if (!item) return;
    setPlacing(true);
    setOrderErr('');
    try {
      const tableId = (typeof window !== 'undefined' ? sessionStorage.getItem('lm_tid') : null) ?? 'table-01';
      const payload = {
        tenantId:              TENANT_ID,
        restaurantId:          RESTAURANT_ID,
        tableId,
        currencyCode:          'PKR',
        totalAmountMinorUnits: Math.round(item.price * qty * 100),
        lineItems: [{
          itemId:               item.id,
          name:                 item.name,
          quantity:             qty,
          unitPriceMinorUnits:  Math.round(item.price * 100),
          totalPriceMinorUnits: Math.round(item.price * qty * 100),
        }],
      };
      const res  = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? data?.message ?? `Error ${res.status}`);
      setOrderId(data.orderId ?? '');
      setPlaced(true);
    } catch (err: any) {
      setOrderErr(err?.message ?? 'Order failed. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return (
    <main className="min-h-dvh flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-brand-500" />
        <p className="text-[13px] text-ink-400">Loading item…</p>
      </div>
    </main>
  );

  if (error || !item) return (
    <main className="min-h-dvh flex items-center justify-center bg-slate-50 px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-[14px] font-semibold text-ink-700">Item not found</p>
        <p className="text-[12px] text-ink-400">{error}</p>
        <button onClick={() => router.back()} className="px-4 py-2 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-[13px] font-semibold">← Go Back</button>
      </div>
    </main>
  );

  // ── Order success screen ──────────────────────────────────────────────────────
  if (placed) return (
    <main className="min-h-dvh bg-black flex flex-col items-center">
      <div className="phone-shell">
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
          <div className="relative w-[100px] h-[100px] mb-6">
            <div className="absolute inset-0 rounded-full border border-gold-400/30" />
            <div className="absolute -inset-2 rounded-full border border-gold-400/15 animate-pulse-slow" />
            <div className="absolute inset-0 rounded-full bg-gold-400/12 flex items-center justify-center text-4xl">✓</div>
          </div>
          <h2 className="font-serif text-[26px] text-[#f5e9d0] font-semibold mb-2 text-center">Order Placed!</h2>
          <p className="text-[14px] text-white/35 text-center leading-relaxed mb-4 px-4">
            Your <strong className="text-white/60">{item.name}</strong> × {qty} has been sent to the kitchen.
          </p>
          {orderId && (
            <div className="bg-gold-400/10 border border-gold-400/25 rounded-full px-5 py-2 mb-8">
              <span className="text-[13px] text-gold-400 font-medium font-mono-dm">
                #{orderId.slice(0, 8).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-3 w-full max-w-[280px]">
            <button onClick={() => router.push('/guest/tracking')}
              className="h-12 rounded-2xl bg-brand-500 text-white text-[14px] font-semibold flex items-center justify-center gap-2 shadow-brand">
              📡 Track My Order
            </button>
            <button onClick={() => { setPlaced(false); setQty(1); }}
              className="h-12 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-white/60 text-[14px] font-medium">
              Order Again
            </button>
            <button onClick={() => router.push('/guest/menu')}
              className="h-12 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-white/60 text-[14px] font-medium">
              ← Back to Menu
            </button>
          </div>
        </div>
      </div>
    </main>
  );

  const rid        = process.env.NEXT_PUBLIC_RESTAURANT_ID || '2687382e-3b00-4f57-9014-f484df89e3fe';
  const arModelUrl = rawItem?.arModelUrl ?? '';
  const arHref     = `/guest/ar?rid=${encodeURIComponent(rid)}&iid=${encodeURIComponent(id)}&name=${encodeURIComponent(item.name)}&emoji=${encodeURIComponent(item.emoji ?? '🍽️')}${arModelUrl ? '&url=' + encodeURIComponent(arModelUrl) : ''}`;

  return (
    <main className="min-h-dvh bg-black flex flex-col items-center">
      <div className="phone-shell">
        {/* Hero */}
        <div className="relative w-full h-[210px] flex items-center justify-center text-[88px] bg-gradient-to-br from-brand-50 to-teal-50">
          <span className="drop-shadow-lg">{item.emoji}</span>
          <button onClick={() => router.back()} className="absolute top-3 left-4 w-9 h-9 rounded-xl bg-black shadow-card border border-ink-100 flex items-center justify-center">
            <ArrowLeft size={16} className="text-ink-600" />
          </button>
          <button onClick={() => setWished(!wished)} className={`absolute top-3 right-14 w-9 h-9 rounded-xl shadow-card border flex items-center justify-center transition-all ${wished ? 'bg-red-50 border-red-200' : 'bg-black border-ink-100'}`}>
            <Heart size={16} className={wished ? 'text-red-500 fill-red-500' : 'text-ink-400'} />
          </button>
          <button className="absolute top-3 right-4 w-9 h-9 rounded-xl bg-black shadow-card border border-ink-100 flex items-center justify-center">
            <Share2 size={16} className="text-ink-400" />
          </button>
          <div className="absolute bottom-3.5 left-4 flex gap-1.5">
            {(item.tags ?? []).filter(t => t !== 'chef').map(tag => (
              <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${TAG_STYLES[tag] ?? ''}`}>
                {tag.charAt(0).toUpperCase() + tag.slice(1)}
              </span>
            ))}
          </div>
          {arReady === true && (
            <Link href={arHref} className="absolute bottom-3.5 right-4 flex items-center gap-1.5 bg-black border border-brand-200 rounded-full px-2.5 py-1.5 shadow-card hover:bg-brand-50 transition-colors">
              <Cuboid size={12} className="text-brand-600" />
              <span className="text-[10px] text-white font-semibold">View in AR</span>
            </Link>
          )}
          {arReady === null && (
            <div className="absolute bottom-3.5 right-4 flex items-center gap-1.5 bg-black border border-ink-200 rounded-full px-2.5 py-1.5 shadow-card opacity-50">
              <Loader2 size={11} className="text-ink-400 animate-spin" />
              <span className="text-[10px] text-ink-400">AR…</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Header */}
          <div className="px-5 pt-4 pb-4 border-b border-ink-100">
            <h1 className="font-serif text-[24px] text-ink-900 font-semibold mb-1">{item.name}</h1>
            {item.subtitle && <p className="font-serif italic text-[13px] text-brand-600 mb-3">{item.subtitle}</p>}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <span key={s} className={`text-[14px] ${s <= Math.floor(item.rating ?? 0) ? 'text-amber-400' : 'text-ink-200'}`}>★</span>)}</div>
              <span className="text-[13px] text-ink-600 font-medium">{item.rating?.toFixed(1) ?? '—'}</span>
              <span className="w-1 h-1 rounded-full bg-ink-200" />
              <span className="text-[12px] text-ink-400">{item.reviewCount ?? 0} reviews</span>
              {item.prepTime && <>
                <span className="w-1 h-1 rounded-full bg-ink-200" />
                <span className="flex items-center gap-1 text-[12px] text-ink-400"><Clock size={12} />{item.prepTime}</span>
              </>}
            </div>
          </div>

          {/* AR banner */}
          {arReady === true && (
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
          )}

          {/* Macros */}
          {(item.calories || item.protein || item.fat || item.carbs) ? (
            <div className="flex gap-2 px-5 py-4 border-b border-ink-100 mt-2">
              {[{val:item.calories,label:'Cal'},{val:`${item.protein}g`,label:'Protein'},{val:`${item.fat}g`,label:'Fat'},{val:`${item.carbs}g`,label:'Carbs'}].map(m => (
                <div key={m.label} className="flex-1 bg-ink-50 rounded-2xl p-2.5 flex flex-col items-center gap-0.5 border border-ink-100">
                  <span className="text-[15px] font-semibold text-ink-800">{m.val ?? '—'}</span>
                  <span className="text-[10px] text-ink-400 uppercase tracking-widest font-semibold">{m.label}</span>
                </div>
              ))}
            </div>
          ) : null}

          {/* Description */}
          {item.description && (
            <div className="px-5 py-4 border-b border-ink-100">
              <p className="section-label mb-2">Description</p>
              <p className="text-[13px] text-ink-500 leading-relaxed">{item.description}</p>
            </div>
          )}

          {/* Allergens */}
          {(item.allergens ?? []).length > 0 && (
            <div className="px-5 py-4 border-b border-ink-100">
              <p className="section-label mb-2">Allergen Information</p>
              <div className="flex gap-4 mb-3">
                <span className="flex items-center gap-1.5 text-[11px] text-ink-400 font-medium"><span className="w-2 h-2 rounded-full bg-red-400" />Contains</span>
                <span className="flex items-center gap-1.5 text-[11px] text-ink-400 font-medium"><span className="w-2 h-2 rounded-full bg-brand-500" />Free from</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(item.allergens ?? []).map(a => (
                  <div key={a.name} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium border ${a.status === 'present' ? 'allergen-present' : 'allergen-free'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${a.status === 'present' ? 'bg-red-400' : 'bg-brand-500'}`} />
                    <span>{a.emoji}</span><span>{a.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customisations */}
          {item.customisations && (
            <div className="px-5 py-4 border-b border-ink-100">
              <p className="section-label mb-3">Customise Your Order</p>
              {[
                {label:'Doneness',opts:item.customisations.doneness,val:doneness,set:setDoneness},
                {label:'Side',    opts:item.customisations.sides,   val:side,    set:setSide    },
                {label:'Sauce',   opts:item.customisations.sauces,  val:sauce,   set:setSauce   },
              ].filter(g => g.opts?.length).map(g => (
                <div key={g.label} className="mb-4">
                  <p className="text-[13px] font-semibold text-ink-700 mb-2">{g.label}</p>
                  <div className="flex gap-2 flex-wrap">
                    {g.opts!.map(o => (
                      <button key={o} onClick={() => g.set(o)}
                        className={`px-3.5 py-1.5 rounded-full border text-[12px] font-medium transition-all ${g.val===o ? 'bg-brand-500 border-brand-500 text-white shadow-brand' : 'bg-black border-ink-200 text-ink-500 hover:border-brand-300'}`}>
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
            <div className="flex items-center border border-ink-200 rounded-2xl overflow-hidden bg-black shadow-card">
              <button onClick={() => setQty(Math.max(1,qty-1))} className="w-10 h-10 flex items-center justify-center hover:bg-ink-50 transition-colors text-ink-500 font-bold text-lg">−</button>
              <span className="w-10 h-10 flex items-center justify-center text-[16px] font-semibold text-ink-900 border-x border-ink-200">{qty}</span>
              <button onClick={() => setQty(Math.min(5,qty+1))} className="w-10 h-10 flex items-center justify-center hover:bg-brand-50 transition-colors text-brand-600 font-bold text-lg">+</button>
            </div>
          </div>

          {/* Order error */}
          {orderErr && (
            <div className="mx-5 mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-[12px] text-red-600">{orderErr}</p>
            </div>
          )}
          <div className="h-4" />
        </div>

        {/* Footer */}
        <div className="p-4 flex items-center gap-3 bg-[#14b8a60f]">
          <div>
            <p className="text-[10px] text-ink-400 uppercase tracking-widest font-semibold">Total</p>
            <p className="font-serif text-[22px] text-brand-600 font-semibold">{formatPrice(item.price * qty)}</p>
          </div>
          <button onClick={placeOrder} disabled={placing}
            className={`flex-1 h-[52px] rounded-2xl flex items-center justify-center gap-2 text-[15px] font-semibold transition-all ${
              placing ? 'bg-brand-400 text-white' : 'bg-brand-500 text-white shadow-brand hover:bg-brand-600'
            }`}>
            {placing
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Placing Order…</>
              : <><Send size={16} /> Place Order · {formatPrice(item.price * qty)}</>
            }
          </button>
        </div>
      </div>
    </main>
  );
}