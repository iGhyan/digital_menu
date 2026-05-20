'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Tag, Send, Lock, AlertCircle } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, subtotal, serviceCharge, tax, total, clearCart } = useCartStore();

  const [notes,        setNotes]        = useState('');
  const [promo,        setPromo]        = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [placing,      setPlacing]      = useState(false);
  const [placed,       setPlaced]       = useState(false);
  const [orderId,      setOrderId]      = useState('');
  const [orderError,   setOrderError]   = useState('');
  const [tableId,      setTableId]      = useState('');
  const [tableNum,     setTableNum]     = useState('');

  // Read session from QR scan
  useEffect(() => {
    const tid   = sessionStorage.getItem('lm_tid')   ?? '';
    const tnum  = sessionStorage.getItem('lm_table') ?? '';
    setTableId(tid || `table-${tnum || '01'}`);
    setTableNum(tnum);
  }, []);

  const discount   = promoApplied ? Math.round(subtotal() * 0.1) : 0;
  const grandTotal = total() - discount;

  const applyPromo = () => {
    if (promo.trim().toUpperCase() === 'HAPPY20') {
      setPromoApplied(true);
      setPromo('HAPPY20');
    }
  };

  // ── POST order to API ─────────────────────────────────────────────────────────
  const placeOrder = async () => {
    if (items.length === 0) return;
    setPlacing(true);
    setOrderError('');

    try {
      const tid = sessionStorage.getItem('lm_tid') ?? tableId ?? 'table-01';

      const payload = {
        tenantId:              process.env.NEXT_PUBLIC_TENANT_ID_KDS     ?? 't123',
        restaurantId:          process.env.NEXT_PUBLIC_RESTAURANT_ID_KDS ?? 'r456',
        tableId:               tid,
        currencyCode:          'PKR',
        totalAmountMinorUnits: Math.round(grandTotal * 100),
        lineItems: items.map(item => ({
          itemId:               item.menuItemId,
          name:                 item.name,
          quantity:             item.quantity,
          unitPriceMinorUnits:  Math.round(item.price * 100),
          totalPriceMinorUnits: Math.round(item.price * item.quantity * 100),
        })),
        ...(notes.trim() && { notes: notes.trim() }),
      };

      const res  = await fetch('/api/orders', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error ?? data?.message ?? `Error ${res.status}`);

      setOrderId(data.orderId ?? '');
      clearCart();
      setPlaced(true);

    } catch (err: any) {
      setOrderError(err?.message ?? 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────────
  if (placed) {
    return (
      <main className="min-h-dvh bg-surface flex flex-col items-center p-6">
        <div className="phone-shell">
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
            <div className="relative w-[100px] h-[100px] mb-6">
              <div className="absolute inset-0 rounded-full border border-gold-400/30" />
              <div className="absolute -inset-2 rounded-full border border-gold-400/15 animate-pulse-slow" />
              <div className="absolute inset-0 rounded-full bg-gold-400/12 flex items-center justify-center text-4xl">✓</div>
            </div>
            <h2 className="font-serif text-[26px] text-[#f5e9d0] font-semibold mb-2 text-center">Order Placed!</h2>
            <p className="text-[14px] text-white/35 text-center leading-relaxed mb-6 px-4">
              Your order has been sent to the kitchen. We'll notify you as it's being prepared.
            </p>
            {orderId && (
              <div className="bg-gold-400/10 border border-gold-400/25 rounded-full px-5 py-2 mb-8">
                <span className="text-[13px] text-gold-400 font-medium font-mono-dm">
                  #{orderId.slice(0, 8).toUpperCase()}
                </span>
              </div>
            )}
            <button onClick={() => router.push('/guest/tracking')} className="btn-gold max-w-[280px]">
              📡 Track My Order
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Cart screen ───────────────────────────────────────────────────────────────
  return (
    <main className="min-h-dvh bg-surface flex flex-col items-center">
      <div className="phone-shell">

        {/* Nav */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.05]">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
            <ArrowLeft size={16} className="text-white/60" />
          </button>
          <h1 className="font-serif text-[20px] text-[#f5e9d0] font-semibold flex-1">Your Cart</h1>
          <span className="bg-gold-400/15 border border-gold-400/30 rounded-full px-3 py-1 text-[11px] text-gold-400 font-medium">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-5">

          {/* Cart items */}
          <p className="section-label mt-4 mb-3">Order Items</p>
          <div className="flex flex-col gap-2 mb-4">
            {items.length === 0 && (
              <div className="flex flex-col items-center py-12 gap-3 text-center">
                <span className="text-4xl opacity-20">🛒</span>
                <p className="text-white/25 text-sm">Your cart is empty</p>
                <button onClick={() => router.push('/guest/menu')}
                  className="px-4 py-2 rounded-xl bg-gold-400/10 border border-gold-400/25 text-gold-400 text-[13px] font-medium">
                  Browse Menu
                </button>
              </div>
            )}
            {items.map(item => (
              <div key={item.id} className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.05]">
                <div className="w-[52px] h-[52px] rounded-[14px] bg-white/[0.03] flex items-center justify-center text-[26px] flex-shrink-0">
                  {item.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[#f5e9d0] truncate">{item.name}</p>
                  <p className="text-[11px] text-white/28 mb-2">
                    {Object.values(item.options).filter(Boolean).join(' · ') || 'No modifications'}
                  </p>
                  <div className="flex items-center border border-white/[0.08] rounded-[10px] w-fit overflow-hidden">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-[30px] h-7 bg-white/[0.04] hover:bg-gold-400/10 flex items-center justify-center text-white/40 text-sm transition-colors">−</button>
                    <span className="w-7 h-7 flex items-center justify-center text-[13px] font-medium text-[#f5e9d0] border-x border-white/[0.07]">
                      {item.quantity}
                    </span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-[30px] h-7 bg-white/[0.04] hover:bg-gold-400/10 flex items-center justify-center text-gold-400 text-sm transition-colors">+</button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="font-serif text-[15px] text-gold-400 font-semibold">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                  <button onClick={() => removeItem(item.id)}
                    className="w-7 h-7 rounded-[8px] bg-red-500/[0.07] border border-red-500/15 flex items-center justify-center text-red-400/70 hover:bg-red-500/15 transition-colors text-xs">✕</button>
                </div>
              </div>
            ))}
          </div>

          {/* Table info — from QR session */}
          <p className="section-label mb-2">Table & Session</p>
          <div className="flex items-center gap-2.5 p-3 rounded-[14px] bg-gold-400/[0.05] border border-gold-400/15 mb-4">
            <div className="w-9 h-9 rounded-[10px] bg-gold-400/10 flex items-center justify-center flex-shrink-0">
              <MapPin size={18} className="text-gold-400" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] text-white/25 uppercase tracking-widest">Dining at</p>
              <p className="text-[14px] font-medium text-[#f5e9d0]">
                {tableNum ? `Table ${tableNum}` : tableId || 'Walk-in Guest'}
              </p>
              <p className="text-[11px] text-white/25 font-mono-dm mt-0.5">{tableId}</p>
            </div>
            <span className="text-green-400 text-sm">✓</span>
          </div>

          {/* Special instructions */}
          <p className="section-label mb-2">Special Instructions</p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Allergies, dietary needs, or special requests for the kitchen…"
            rows={2} className="w-full rounded-[14px] p-3 text-[13px] mb-4 resize-none" />

          {/* Promo */}
          <p className="section-label mb-2">Promo Code</p>
          <div className="flex gap-2 mb-1">
            <input value={promo} onChange={e => setPromo(e.target.value)}
              placeholder="Enter promo code" className="flex-1 h-11 rounded-xl text-[13px]" />
            <button onClick={applyPromo}
              className="h-11 px-4 rounded-xl bg-gold-400/12 border border-gold-400/25 text-[13px] font-medium text-gold-400 hover:bg-gold-400/22 transition-colors whitespace-nowrap">
              Apply
            </button>
          </div>
          {promoApplied && (
            <div className="flex items-center gap-1.5 text-[12px] text-green-400 mb-3">
              <Tag size={13} /> HAPPY20 applied — 10% discount
            </div>
          )}

          {/* Bill */}
          <p className="section-label mb-2 mt-2">Bill Summary</p>
          <div className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-4 mb-4">
            {items.map(item => (
              <div key={item.id} className="flex justify-between py-1">
                <span className="text-[13px] text-white/35">{item.name} × {item.quantity}</span>
                <span className="text-[13px] text-white/55">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="h-px bg-white/[0.06] my-2.5" />
            <div className="flex justify-between py-1">
              <span className="text-[13px] text-white/35">Subtotal</span>
              <span className="text-[13px] text-white/55">{formatPrice(subtotal())}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[13px] text-white/35">Service Charge (5%)</span>
              <span className="text-[13px] text-white/55">{formatPrice(serviceCharge())}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[13px] text-white/35">Tax (15%)</span>
              <span className="text-[13px] text-white/55">{formatPrice(tax())}</span>
            </div>
            {promoApplied && (
              <div className="flex justify-between py-1">
                <span className="text-[13px] text-white/35">Promo Discount</span>
                <span className="text-[13px] text-green-400">− {formatPrice(discount)}</span>
              </div>
            )}
            <div className="h-px bg-white/[0.06] my-2.5" />
            <div className="flex justify-between items-center">
              <span className="text-[15px] font-medium text-[#f5e9d0]">Total</span>
              <span className="font-serif text-[20px] text-gold-400 font-semibold">{formatPrice(grandTotal)}</span>
            </div>
          </div>

          {/* API error */}
          {orderError && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
              <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
              <p className="text-[12px] text-red-300 leading-relaxed">{orderError}</p>
            </div>
          )}

          <div className="h-4" />
        </div>

        {/* Footer */}
        <div className="px-5 pt-3.5 pb-7 border-t border-white/[0.05] bg-surface">
          <button onClick={placeOrder} disabled={placing || items.length === 0} className="btn-gold mb-2.5">
            {placing
              ? <span className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />
              : <><Send size={18} />Place Order · {formatPrice(grandTotal)}</>
            }
          </button>
          <div className="flex items-center justify-center gap-1.5">
            <Lock size={12} className="text-white/18" />
            <span className="text-[11px] text-white/18">Secured guest session · No payment required now</span>
          </div>
        </div>
      </div>
    </main>
  );
}