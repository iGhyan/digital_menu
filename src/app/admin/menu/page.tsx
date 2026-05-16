'use client';

import { useState } from 'react';
import { Search, RefreshCw, Bell, Plus, Edit2, Trash2, X, CloudUpload } from 'lucide-react';
import { MENU_ITEMS, CATEGORIES, formatPrice } from '@/lib/data';
import { Toggle, StatusChip } from '@/components/ui';
import type { MenuItem } from '@/lib/types';

const STATS = [
  { label: 'Total Items', val: '84',   delta: '+3 this week',      up: true  },
  { label: 'Active',      val: '71',   delta: '84.5% of menu',     up: null  },
  { label: 'Top Rated',   val: '4.8',  delta: 'Wagyu Tenderloin',  up: true  },
  { label: 'Orders Today',val: '127',  delta: '+18% vs yesterday', up: true  },
];

type ModalState = { open: boolean; item?: MenuItem };

export default function AdminMenuPage() {
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('all');
  const [modal, setModal]           = useState<ModalState>({ open: false });
  const [isActive, setIsActive]     = useState(true);
  const [isChef, setIsChef]         = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [uploadName, setUploadName] = useState<string | null>(null);

  const filtered = MENU_ITEMS.filter((item) => {
    const mc = category === 'all' || item.category === category;
    const ms = item.name.toLowerCase().includes(search.toLowerCase());
    return mc && ms;
  });

  const openModal = (item?: MenuItem) => {
    setModal({ open: true, item });
    setIsActive(item?.status === 'active' ?? true);
    setIsChef(item?.tags.includes('chef') ?? false);
    setUploadName(null);
    setSaved(false);
  };

  const saveItem = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setModal({ open: false }); setSaved(false); }, 900);
  };

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-surface-400">
        <div>
          <h1 className="font-serif text-[20px] text-[#f5e9d0] font-semibold">Menu Management</h1>
          <p className="text-[12px] text-white/25 mt-0.5">La Maison · Main Hall · Last synced 2 min ago</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu items…"
              className="h-9 pl-8 pr-3 rounded-[10px] w-[200px] text-[13px]"
            />
          </div>
          <button className="w-9 h-9 rounded-[10px] bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
            <Bell size={17} className="text-white/40" />
          </button>
          <button className="w-9 h-9 rounded-[10px] bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
            <RefreshCw size={15} className="text-white/40" />
          </button>
          <button onClick={() => openModal()}
            className="h-9 px-3.5 rounded-[10px] bg-gold-400/15 border border-gold-400/30 text-[13px] font-medium text-gold-400 flex items-center gap-1.5 hover:bg-gold-400/25 transition-colors">
            <Plus size={15} /> Add Item
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {STATS.map((s) => (
            <div key={s.label} className="bg-surface-100 border border-white/[0.06] rounded-[14px] p-4">
              <p className="text-[11px] text-white/25 uppercase tracking-widest mb-2">{s.label}</p>
              <p className="font-serif text-[26px] text-[#f5e9d0] font-semibold mb-1">{s.val}</p>
              <p className={`text-[11px] flex items-center gap-1 ${s.up === true ? 'text-green-400' : s.up === false ? 'text-red-400' : 'text-white/25'}`}>
                {s.up === true ? '↑' : s.up === false ? '↓' : ''} {s.delta}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/[0.05] mb-5 w-fit">
          {['All Items', 'Categories', 'Inactive', 'Drafts'].map((t, i) => (
            <button key={t}
              className={`px-5 h-8 rounded-[9px] text-[12px] transition-all ${
                i === 0 ? 'bg-surface-100 border border-white/[0.08] text-[#f5e9d0] font-medium' : 'text-white/30 hover:text-white/50'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full border text-[12px] transition-all ${
                category === cat.id
                  ? 'bg-gold-400/12 border-gold-400/35 text-gold-400 font-medium'
                  : 'bg-white/[0.03] border-white/[0.08] text-white/35 hover:border-gold-400/20'
              }`}>
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-surface-100 border border-white/[0.06] rounded-2xl overflow-hidden">
          {/* Head */}
          <div className="grid gap-3 px-4 py-3 border-b border-white/[0.05]"
            style={{ gridTemplateColumns: '40px 1fr 120px 80px 80px 90px 80px' }}>
            {['', 'Item', 'Category', 'Price', 'Orders', 'Status', 'Actions'].map((h) => (
              <div key={h} className="text-[11px] text-white/20 uppercase tracking-widest font-medium">{h}</div>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((item) => (
            <div key={item.id}
              className="grid gap-3 px-4 py-3.5 border-b border-white/[0.04] last:border-0 items-center hover:bg-white/[0.025] transition-colors cursor-pointer"
              style={{ gridTemplateColumns: '40px 1fr 120px 80px 80px 90px 80px' }}
            >
              <div className="w-10 h-10 rounded-[10px] bg-white/[0.03] flex items-center justify-center text-[22px]">
                {item.emoji}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[#f5e9d0] truncate">{item.name}</p>
                <p className="text-[11px] text-white/25 truncate">{item.subtitle}</p>
              </div>
              <div className="text-[12px] text-white/30 capitalize">{item.category}</div>
              <div className="font-serif text-[13px] text-gold-400 font-semibold">{formatPrice(item.price)}</div>
              <div className="text-[13px] text-white/50">{item.reviewCount}</div>
              <div><StatusChip status={item.status} /></div>
              <div className="flex gap-1.5">
                <button onClick={() => openModal(item)}
                  className="w-7 h-7 rounded-[8px] bg-white/[0.03] border border-white/[0.07] flex items-center justify-center hover:bg-gold-400/12 hover:border-gold-400/25 transition-all">
                  <Edit2 size={13} className="text-white/30 hover:text-gold-400" />
                </button>
                <button className="w-7 h-7 rounded-[8px] bg-white/[0.03] border border-white/[0.07] flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/20 transition-all">
                  <Trash2 size={13} className="text-white/30 hover:text-red-400" />
                </button>
              </div>
            </div>
          ))}

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3.5 border-t border-white/[0.05]">
            <p className="text-[12px] text-white/20">Showing {filtered.length} of 84 items</p>
            <div className="flex gap-1">
              {['‹', '1', '2', '3', '…', '14', '›'].map((p, i) => (
                <button key={i}
                  className={`w-[30px] h-[30px] rounded-[8px] flex items-center justify-center text-[12px] border transition-all ${
                    p === '1'
                      ? 'bg-gold-400/12 border-gold-400/30 text-gold-400'
                      : 'bg-white/[0.03] border-white/[0.07] text-white/30 hover:bg-white/[0.06]'
                  }`}>{p}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6"
          onClick={(e) => e.target === e.currentTarget && setModal({ open: false })}>
          <div className="bg-surface-100 border border-white/[0.08] rounded-[20px] w-[420px] max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-[18px] text-[#f5e9d0] font-semibold">
                {modal.item ? 'Edit Menu Item' : 'Add Menu Item'}
              </h2>
              <button onClick={() => setModal({ open: false })}
                className="w-8 h-8 rounded-[8px] bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                <X size={15} className="text-white/40" />
              </button>
            </div>

            {/* Name */}
            <div className="mb-4">
              <label className="block text-[11px] text-white/30 uppercase tracking-widest mb-1.5">Item Name</label>
              <input defaultValue={modal.item?.name} placeholder="e.g. Grilled Sea Bass" className="w-full h-10 text-[13px]" />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[11px] text-white/30 uppercase tracking-widest mb-1.5">Category</label>
                <select defaultValue={modal.item?.category} className="w-full h-10 text-[13px] bg-white/[0.04] border border-white/[0.08] rounded-xl px-3">
                  {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-white/30 uppercase tracking-widest mb-1.5">Price (Rs)</label>
                <input type="number" defaultValue={modal.item?.price} placeholder="0" className="w-full h-10 text-[13px]" />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[11px] text-white/30 uppercase tracking-widest mb-1.5">Description</label>
              <textarea defaultValue={modal.item?.description} placeholder="Short description…" rows={2}
                className="w-full rounded-xl px-3 py-2.5 text-[13px] resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[11px] text-white/30 uppercase tracking-widest mb-1.5">Prep Time (min)</label>
                <input type="number" placeholder="e.g. 25" className="w-full h-10 text-[13px]" />
              </div>
              <div>
                <label className="block text-[11px] text-white/30 uppercase tracking-widest mb-1.5">Calories</label>
                <input type="number" placeholder="e.g. 680" className="w-full h-10 text-[13px]" />
              </div>
            </div>

            {/* Image upload */}
            <div className="mb-4">
              <label className="block text-[11px] text-white/30 uppercase tracking-widest mb-1.5">Item Image (S3 Upload)</label>
              <label className="flex flex-col items-center gap-2 p-6 rounded-xl border border-dashed border-white/10 bg-white/[0.02] cursor-pointer hover:border-gold-400/35 hover:bg-gold-400/[0.04] transition-all">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setUploadName(e.target.files?.[0]?.name ?? null)} />
                <CloudUpload size={28} className={uploadName ? 'text-gold-400' : 'text-white/15'} />
                <span className={`text-[12px] ${uploadName ? 'text-gold-400' : 'text-white/25'}`}>
                  {uploadName ? `✓ ${uploadName}` : 'Click to upload or drag & drop'}
                </span>
                <span className="text-[10px] text-white/12">PNG, JPG up to 5MB · Direct S3 presigned upload</span>
              </label>
            </div>

            <div className="flex items-center justify-between py-2.5 border-t border-white/[0.05]">
              <span className="text-[13px] text-white/50">Active on guest menu</span>
              <Toggle checked={isActive} onChange={setIsActive} />
            </div>
            <div className="flex items-center justify-between py-2.5 border-t border-white/[0.05]">
              <span className="text-[13px] text-white/50">Mark as Chef's Special</span>
              <Toggle checked={isChef} onChange={setIsChef} />
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal({ open: false })}
                className="flex-1 h-10 rounded-[10px] bg-white/[0.04] border border-white/[0.08] text-[13px] text-white/40 hover:bg-white/[0.07] transition-colors">
                Cancel
              </button>
              <button onClick={saveItem} disabled={saving}
                className={`flex-[2] h-10 rounded-[10px] flex items-center justify-center gap-1.5 text-[13px] font-medium transition-all ${
                  saved
                    ? 'bg-green-500/15 border border-green-500/30 text-green-400'
                    : 'bg-gold-400/15 border border-gold-400/30 text-gold-400 hover:bg-gold-400/25'
                }`}>
                {saving ? <span className="w-4 h-4 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
                  : saved ? '✓ Saved!' : '✓ Save Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
