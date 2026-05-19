'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, RefreshCw, Bell, Plus, Edit2, Trash2,
  X, CloudUpload, Loader2, AlertCircle, CheckCircle,
} from 'lucide-react';
import { CATEGORIES, formatPrice } from '@/lib/data';
import { Toggle, StatusChip } from '@/components/ui';
import {
  fetchMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  normaliseItem,
  type ApiMenuItem,
} from '@/lib/menu-api';

type ModalState = { open: boolean; item?: ApiMenuItem };
type LoadState  = 'idle' | 'loading' | 'success' | 'error';

const STATS_LABELS = [
  { label: 'Total Items', key: 'total',    color: 'text-ink-700'   },
  { label: 'Active',      key: 'active',   color: 'text-brand-600' },
  { label: 'Inactive',    key: 'inactive', color: 'text-red-500'   },
  { label: 'Draft',       key: 'draft',    color: 'text-amber-500' },
];

export default function AdminMenuPage() {
  const [items,      setItems]      = useState<ApiMenuItem[]>([]);
  const [loadState,  setLoadState]  = useState<LoadState>('idle');
  const [loadError,  setLoadError]  = useState('');
  const [search,     setSearch]     = useState('');
  const [category,   setCategory]   = useState('all');
  const [modal,      setModal]      = useState<ModalState>({ open: false });
  const [isActive,   setIsActive]   = useState(true);
  const [isChef,     setIsChef]     = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saveMsg,    setSaveMsg]    = useState('');
  const [saveErr,    setSaveErr]    = useState('');
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [deleting,   setDeleting]   = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '', description: '', price: '', category: 'starters',
    prepTime: '', calories: '',
  });

  // ── Load items ────────────────────────────────────────────────────────────────
  const loadItems = useCallback(async () => {
    setLoadState('loading');
    setLoadError('');
    try {
      const raw = await fetchMenuItems();
      setItems(raw.map(normaliseItem));
      setLoadState('success');
    } catch (err: any) {
      setLoadError(err?.message ?? 'Failed to load menu items');
      setLoadState('error');
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  // ── Filtered + stats ──────────────────────────────────────────────────────────
  const filtered = items.filter(item => {
    const mc = category === 'all' || item.category === category;
    const ms = item.name.toLowerCase().includes(search.toLowerCase());
    return mc && ms;
  });

  const stats = {
    total:    items.length,
    active:   items.filter(i => i.status === 'active').length,
    inactive: items.filter(i => i.status === 'inactive').length,
    draft:    items.filter(i => i.status === 'draft').length,
  };

  // ── Open modal ────────────────────────────────────────────────────────────────
  const openModal = (item?: ApiMenuItem) => {
    setModal({ open: true, item });
    setIsActive(item ? item.status === 'active' : true);
    setIsChef(item ? (item.tags ?? []).includes('chef') : false);
    setUploadName(null);
    setSaveMsg('');
    setSaveErr('');
    setForm({
      name:        item?.name        ?? '',
      description: item?.description ?? '',
      price:       item?.price       ? String(item.price) : '',
      category:    item?.category    ?? 'starters',
      prepTime:    item?.prepTime    ?? '',
      calories:    item?.calories    ? String(item.calories) : '',
    });
  };

  // ── Save (create or update) ───────────────────────────────────────────────────
  const saveItem = async () => {
    if (!form.name.trim() || !form.price) {
      setSaveErr('Name and price are required.');
      return;
    }
    setSaving(true);
    setSaveMsg('');
    setSaveErr('');

    const payload: Partial<ApiMenuItem> = {
      name:        form.name.trim(),
      description: form.description.trim(),
      price:       parseFloat(form.price),
      category:    form.category,
      categoryId:  form.category,   // ← API requires categoryId
      status:      isActive ? 'active' : 'inactive',
      tags:        isChef ? ['chef'] : [],
      prepTime:    form.prepTime || '20 min',
      calories:    form.calories ? parseInt(form.calories) : undefined,
    };

    try {
      if (modal.item?.id) {
        const updated = await updateMenuItem(modal.item.id, payload);
        setItems(prev => prev.map(i => i.id === updated.id ? normaliseItem(updated) : i));
        setSaveMsg('Item updated successfully!');
      } else {
        const created = await createMenuItem(payload);
        setItems(prev => [...prev, normaliseItem(created)]);
        setSaveMsg('Item created successfully!');
      }
      setTimeout(() => { setModal({ open: false }); setSaveMsg(''); }, 1200);
    } catch (err: any) {
      setSaveErr(err?.message ?? 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    setDeleting(id);
    try {
      await deleteMenuItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err: any) {
      alert(`Delete failed: ${err?.message}`);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 bg-black-500">
        <div>
          <h1 className="font-serif text-[20px] text-ink-900 font-semibold">Menu Management</h1>
          <p className="text-[12px] text-ink-400">
            Das Pardes · Live API · {items.length} items loaded
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-300 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search items…"
              className="h-9 pl-8 pr-3 rounded-xl w-[200px] text-[13px] border-ink-200" />
          </div>
          <button onClick={loadItems} title="Refresh from API"
            className="w-9 h-9 rounded-xl bg-black-500 border border-ink-200 flex items-center justify-center hover:bg-ink-100 transition-colors">
            <RefreshCw size={14} className={`text-ink-400 ${loadState === 'loading' ? 'animate-spin' : ''}`} />
          </button>
          <button className="w-9 h-9 rounded-xl bg-black-500 border border-ink-200 flex items-center justify-center">
            <Bell size={16} className="text-ink-400" />
          </button>
          <button onClick={() => openModal()}
            className="h-9 px-3.5 rounded-xl bg-white text-black text-[13px] font-semibold flex items-center gap-1.5 hover:bg-brand-600 transition-colors shadow-brand">
            <Plus size={15} /> Add Item
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">

        {/* Error banner */}
        {loadState === 'error' && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl mb-5">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-red-700">Failed to load menu items</p>
              <p className="text-[12px] text-red-500">{loadError}</p>
            </div>
            <button onClick={loadItems}
              className="px-3 py-1.5 rounded-xl bg-red-100 border border-red-200 text-red-700 text-[12px] font-semibold hover:bg-red-200 transition-colors">
              Retry
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {STATS_LABELS.map(s => (
            <div key={s.label} className="bg-black-500 border border-ink-100 rounded-2xl p-4 shadow-card">
              <p className="text-[11px] text-ink-400 uppercase tracking-widest font-semibold mb-2">{s.label}</p>
              <p className={`font-serif text-[26px] font-semibold ${s.color}`}>
                {loadState === 'loading' ? '…' : stats[s.key as keyof typeof stats]}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-ink-100 rounded-xl p-1 mb-5 w-fit">
          {['All Items', 'Active', 'Inactive', 'Drafts'].map((t, i) => (
            <button key={t}
              className={`px-5 h-8 rounded-[10px] text-[12px] font-semibold transition-all ${
                i === 0 ? 'bg-white text-black shadow-card' : 'text-ink-400 hover:text-ink-700'
              }`}>{t}</button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all ${
                category === cat.id
                  ? 'bg-brand-500 border-brand-500 text-white shadow-brand'
                  : 'bg-white border-ink-200 text-black hover:border-brand-300'
              }`}>
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>

        {/* Loading skeleton */}
        {loadState === 'loading' && (
          <div className="bg-black-500 border border-ink-100 rounded-2xl overflow-hidden shadow-card">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-ink-100 last:border-0">
                <div className="w-10 h-10 rounded-xl bg-ink-100 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-ink-100 rounded animate-pulse w-1/3" />
                  <div className="h-2.5 bg-ink-50 rounded animate-pulse w-1/2" />
                </div>
                <div className="h-3 bg-ink-100 rounded animate-pulse w-16" />
                <div className="h-3 bg-ink-100 rounded animate-pulse w-14" />
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        {loadState !== 'loading' && (
          <div className="bg-black-500 border border-ink-100 rounded-2xl overflow-hidden shadow-card">
            <div className="grid gap-3 px-4 py-3 border-b border-ink-100"
              style={{ gridTemplateColumns: '40px 1fr 120px 80px 80px 90px 80px' }}>
              {['', 'Item', 'Category', 'Price', 'Rating', 'Status', 'Actions'].map(h => (
                <div key={h} className="text-[11px] text-ink-400 uppercase tracking-widest font-semibold">{h}</div>
              ))}
            </div>

            {filtered.length === 0 && loadState === 'success' && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <span className="text-4xl opacity-30">🍽️</span>
                <p className="text-[13px] text-ink-400">No items found</p>
                <button onClick={() => openModal()}
                  className="px-4 py-2 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-[13px] font-semibold hover:bg-brand-100 transition-colors">
                  Add First Item
                </button>
              </div>
            )}

            {filtered.map((item, idx) => (
              <div key={item.id ?? `item-${idx}`}
                className="grid gap-3 px-4 py-3.5 border-b border-ink-100 last:border-0 items-center hover:bg-ink-50 transition-colors cursor-pointer"
                style={{ gridTemplateColumns: '40px 1fr 120px 80px 80px 90px 80px' }}>
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-[22px]">
                  {item.emoji}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink-900 truncate">{item.name}</p>
                  <p className="text-[11px] text-ink-400 truncate">{item.description}</p>
                </div>
                <div className="text-[12px] text-ink-500 font-medium capitalize">{item.category}</div>
                <div className="font-serif text-[13px] text-brand-600 font-semibold">
                  {formatPrice(item.price)}
                </div>
                <div className="flex items-center gap-1 text-[12px] text-amber-500 font-medium">
                  ★ {item.rating?.toFixed(1) ?? '—'}
                </div>
                <div><StatusChip status={item.status} /></div>
                <div className="flex gap-1.5">
                  <button onClick={() => openModal(item)}
                    className="w-7 h-7 rounded-lg bg-ink-50 border border-ink-200 flex items-center justify-center hover:bg-brand-50 hover:border-brand-200 transition-all">
                    <Edit2 size={12} className="text-ink-400" />
                  </button>
                  <button onClick={() => handleDelete(item.id)}
                    disabled={deleting === item.id}
                    className="w-7 h-7 rounded-lg bg-ink-50 border border-ink-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-all disabled:opacity-50">
                    {deleting === item.id
                      ? <Loader2 size={12} className="text-ink-400 animate-spin" />
                      : <Trash2 size={12} className="text-ink-400" />}
                  </button>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between px-4 py-3.5 border-t border-ink-100">
              <p className="text-[12px] text-ink-400">
                Showing {filtered.length} of {items.length} items
              </p>
              <p className="text-[11px] text-ink-300 font-mono-dm">
                Source: AWS API Gateway
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-ink-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          onClick={e => e.target === e.currentTarget && setModal({ open: false })}>
          <div className="bg-black
           border border-ink-100 rounded-3xl w-[440px] max-h-[90vh] overflow-y-auto p-6 shadow-card-lg">

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-serif text-[18px] text-ink-900 font-semibold">
                  {modal.item ? 'Edit Menu Item' : 'Add Menu Item'}
                </h2>
                <p className="text-[11px] text-ink-400 mt-0.5">
                  {modal.item ? `ID: ${modal.item.id?.slice(0, 8)}…` : 'POST to AWS API Gateway'}
                </p>
              </div>
              <button onClick={() => setModal({ open: false })}
                className="w-8 h-8 rounded-xl bg-ink-50 border border-ink-200 flex items-center justify-center">
                <X size={14} className="text-ink-500" />
              </button>
            </div>

            {/* Messages */}
            {saveMsg && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl mb-4">
                <CheckCircle size={14} className="text-green-600" />
                <p className="text-[12px] text-green-700 font-semibold">{saveMsg}</p>
              </div>
            )}
            {saveErr && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
                <AlertCircle size={14} className="text-red-500" />
                <p className="text-[12px] text-red-600">{saveErr}</p>
              </div>
            )}

            {/* Name */}
            <div className="mb-4">
              <label className="block text-[11px] text-ink-500 uppercase tracking-widest font-semibold mb-1.5">
                Item Name *
              </label>
              <input value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Grilled Sea Bass" className="w-full h-10 text-[13px]" />
            </div>

            {/* Category + Price */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[11px] text-ink-500 uppercase tracking-widest font-semibold mb-1.5">
                  Category
                </label>
                <select value={form.category}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full h-10 text-[13px]">
                  {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-ink-500 uppercase tracking-widest font-semibold mb-1.5">
                  Price (Rs) *
                </label>
                <input type="number" value={form.price}
                  onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                  placeholder="0" className="w-full h-10 text-[13px]" />
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-[11px] text-ink-500 uppercase tracking-widest font-semibold mb-1.5">
                Description
              </label>
              <textarea value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Short description…" rows={2}
                className="w-full rounded-xl px-3 py-2.5 text-[13px] resize-none" />
            </div>

            {/* Prep + Calories */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[11px] text-ink-500 uppercase tracking-widest font-semibold mb-1.5">
                  Prep Time
                </label>
                <input value={form.prepTime}
                  onChange={e => setForm(p => ({ ...p, prepTime: e.target.value }))}
                  placeholder="e.g. 25 min" className="w-full h-10 text-[13px]" />
              </div>
              <div>
                <label className="block text-[11px] text-ink-500 uppercase tracking-widest font-semibold mb-1.5">
                  Calories
                </label>
                <input type="number" value={form.calories}
                  onChange={e => setForm(p => ({ ...p, calories: e.target.value }))}
                  placeholder="e.g. 680" className="w-full h-10 text-[13px]" />
              </div>
            </div>

            {/* Image */}
            <div className="mb-4">
              <label className="block text-[11px] text-ink-500 uppercase tracking-widest font-semibold mb-1.5">
                Item Image (S3 Upload)
              </label>
              <label className="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50 cursor-pointer hover:border-brand-300 hover:bg-brand-50 transition-all">
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => setUploadName(e.target.files?.[0]?.name ?? null)} />
                <CloudUpload size={26} className={uploadName ? 'text-brand-500' : 'text-ink-300'} />
                <span className={`text-[12px] font-medium ${uploadName ? 'text-brand-600' : 'text-ink-400'}`}>
                  {uploadName ? `✓ ${uploadName}` : 'Click to upload · PNG, JPG up to 5MB'}
                </span>
              </label>
            </div>

            {/* Toggles */}
            <div className="flex items-center justify-between py-2.5 border-t border-ink-100">
              <span className="text-[13px] font-medium text-ink-600">Active on guest menu</span>
              <Toggle checked={isActive} onChange={setIsActive} />
            </div>
            <div className="flex items-center justify-between py-2.5 border-t border-ink-100">
              <span className="text-[13px] font-medium text-ink-600">Mark as Chef's Special</span>
              <Toggle checked={isChef} onChange={setIsChef} />
            </div>

            {/* Payload preview */}
            <div className="mt-3 p-3 bg-ink-50 border border-ink-100 rounded-xl">
              <p className="text-[10px] text-ink-400 uppercase tracking-widest font-semibold mb-1.5">
                {modal.item ? 'PUT' : 'POST'} Payload Preview
              </p>
              <p className="text-[10px] text-ink-500 font-mono-dm break-all">
                {`{ name: "${form.name || '…'}", price: ${form.price || 0}, categoryId: "${form.category}", status: "${isActive ? 'active' : 'inactive'}" }`}
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setModal({ open: false })}
                className="flex-1 h-10 rounded-xl bg-ink-50 border border-ink-200 text-[13px] font-semibold text-ink-500 hover:bg-ink-100 transition-colors">
                Cancel
              </button>
              <button onClick={saveItem} disabled={saving}
                className="flex-[2] h-10 rounded-xl flex items-center justify-center gap-1.5 text-[13px] font-semibold transition-all bg-brand-500 text-white hover:bg-brand-600 shadow-brand disabled:opacity-60">
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : modal.item ? '✓ Update Item' : '✓ Create Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}