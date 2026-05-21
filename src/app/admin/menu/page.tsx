'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, RefreshCw, Bell, Plus, Edit2, Trash2,
  X, CloudUpload, Loader2, AlertCircle, CheckCircle,
} from 'lucide-react';
import { formatPrice } from '@/lib/data';
import { Toggle, StatusChip } from '@/components/ui';
import {
  fetchMenuItems,
  fetchMenuItem,
  updateMenuItem,
  normaliseItem,
  type ApiMenuItem,
} from '@/lib/menu-api';
import { TENANT_ID } from '@/lib/api-config';

type ModalState = { open: boolean; item?: ApiMenuItem };
type LoadState  = 'idle' | 'loading' | 'success' | 'error';
type GlbStatus  = 'idle' | 'uploading' | 'approved' | 'error';

const STATS_LABELS = [
  { label: 'Total Items', key: 'total',  color: 'text-ink-700'   },
  { label: 'Active',      key: 'active', color: 'text-brand-600' },
];

const ADMIN_RESTAURANT_ID = process.env.NEXT_PUBLIC_ADMIN_RESTAURANT_ID ?? '2687382e-3b00-4f57-9014-f484df89e3fe';
const MENU_BASE_URL = process.env.NEXT_PUBLIC_MENU_API_URL ?? 'https://g1ou0w5x4m.execute-api.ap-south-1.amazonaws.com/dev/menus';

// ── createMenuItem via FormData (image + glb in one POST) ──────────────────
async function createMenuItemWithFiles(
  payload: {
    name: string; description: string; price: number;
    categoryId: string; isActive: boolean;
    allergens?: string[]; prepTime?: string; calories?: number;
  },
  imageFile?: File | null,
  glbFile?: File | null,
): Promise<any> {
  const fd = new FormData();
  fd.append('name',            payload.name);
  fd.append('description',     payload.description);
  fd.append('priceMinorUnits', String(Math.round(payload.price * 100)));
  fd.append('categoryId',      payload.categoryId);
  fd.append('isActive',        String(payload.isActive));
  if (payload.allergens?.length) fd.append('allergens', payload.allergens.join(','));
  if (payload.prepTime)  fd.append('prepTime', payload.prepTime);
  if (payload.calories)  fd.append('calories',  String(payload.calories));
  if (imageFile)         fd.append('file',      imageFile);   // menu-lambda image field
  if (glbFile)           fd.append('arFile',    glbFile);     // menu-lambda AR field

  const res = await fetch(
    `${MENU_BASE_URL}/restaurants/${ADMIN_RESTAURANT_ID}/items`,
    {
      method: 'POST',
      headers: { 'X-Tenant-Id': TENANT_ID },
      // NO Content-Type — browser sets multipart/form-data boundary automatically
      body: fd,
    }
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText);
    throw new Error(`Create failed (${res.status}): ${txt}`);
  }
  return res.json();
}

export default function AdminMenuPage() {
  const [items,      setItems]      = useState<ApiMenuItem[]>([]);
  const [cats,       setCats]       = useState<{id:string; name:string}[]>([]);
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
  const [deleting,   setDeleting]   = useState<string | null>(null);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [glbFile,    setGlbFile]    = useState<File | null>(null);
  const [glbName,    setGlbName]    = useState<string | null>(null);
  const [glbStatus,  setGlbStatus]  = useState<GlbStatus>('idle');
  const [glbError,   setGlbError]   = useState('');

  const [form, setForm] = useState({
    name: '', description: '', price: '', category: '',
    prepTime: '', calories: '',
  });

  const loadItems = useCallback(async () => {
    setLoadState('loading'); setLoadError('');
    try {
      const raw = await fetchMenuItems(ADMIN_RESTAURANT_ID);
      const normalised = raw.map(normaliseItem);
      setItems(normalised);
      const seen = new Map<string, string>();
      raw.forEach((r: any) => {
        const id = r.categoryId ?? '';
        const KNOWN: Record<string,string> = { 'e933848e-0d18-4e3a-b0a8-d70275c2fa54': 'Main Course' };
        const name = r.categoryName ?? KNOWN[id] ?? (r.category && !r.category.includes('-') ? r.category : `Cat-${id.slice(0,6)}`);
        if (id && id.includes('-')) seen.set(id, name);
      });
      if (seen.size > 0) {
        const catList = Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
        setCats(catList);
        setForm(prev => prev.category === '' ? { ...prev, category: catList[0]?.id ?? '' } : prev);
      }
      setLoadState('success');
    } catch (err: any) {
      setLoadError(err?.message ?? 'Failed to load'); setLoadState('error');
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const filtered = items.filter(item => {
    if (item.status === 'inactive') return false;
    const mc = category === 'all' || (item as any).categoryId === category || item.category === category;
    return mc && item.name.toLowerCase().includes(search.toLowerCase());
  });

  const activeItems = items.filter(i => i.status === 'active');
  const stats = { total: activeItems.length, active: activeItems.length };

  const openModal = (item?: ApiMenuItem) => {
    setModal({ open: true, item });
    setIsActive(item ? item.status === 'active' : true);
    setIsChef(item ? (item.tags ?? []).includes('chef') : false);
    setUploadFile(null); setUploadName(null);
    setGlbFile(null); setGlbName(null);
    setGlbStatus('idle'); setGlbError('');
    setSaveMsg(''); setSaveErr('');
    setForm({
      name:        item?.name        ?? '',
      description: item?.description ?? '',
      price:       item?.price       ? String(item.price) : '',
      category:    (item as any)?.categoryId ?? item?.category ?? cats[0]?.id ?? '',
      prepTime:    item?.prepTime    ?? '',
      calories:    item?.calories    ? String(item.calories) : '',
    });
  };

  // S3 presigned PUT upload (for image on existing items)
  const uploadToS3 = async (url: string, file: File, ct: string) => {
    const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': ct }, body: file });
    if (!res.ok) throw new Error(`S3 upload failed (${res.status})`);
  };

  const saveItem = async () => {
    if (!form.name.trim() || !form.price) { setSaveErr('Name and price are required.'); return; }
    if (!form.category) { setSaveErr('Please select a category.'); return; }
    setSaving(true); setSaveMsg(''); setSaveErr('');

    try {
      if (modal.item?.id) {
        // ── UPDATE existing item ────────────────────────────────────────────
        const version = (modal.item as any).version ?? 1;
        const raw = await updateMenuItem(modal.item.id, {
          name:        form.name.trim(),
          description: form.description.trim(),
          price:       parseFloat(form.price),
          categoryId:  form.category,
          status:      isActive ? 'active' : 'inactive',
          tags:        isChef ? ['chef'] : [],
          prepTime:    form.prepTime || '20 min',
          calories:    form.calories ? parseInt(form.calories) : undefined,
        }, version);
        setItems(prev => prev.map(i => i.id === ((raw as any).id ?? (raw as any).itemId) ? normaliseItem(raw) : i));
        setSaveMsg('Item updated!');

        // Image upload on existing item via presigned URL
        if (uploadFile) {
          setSaveMsg('Getting image upload URL…');
          const fetched = await fetchMenuItem(modal.item.id, ADMIN_RESTAURANT_ID) as any;
          if (fetched.imageUrl) {
            setSaveMsg('Uploading image…');
            await uploadToS3(fetched.imageUrl, uploadFile, uploadFile.type || 'image/png');
            setSaveMsg('Image uploaded! ✓');
          }
        }

        // GLB on existing item — no S3 slot exists, show recreate hint
        if (glbFile && !(modal.item as any).arModelKey) {
          setSaveErr('This item has no AR model slot. Use "Recreate & Upload Files" to create a fresh item with GLB.');
          setSaving(false);
          return;
        }

      } else {
        // ── CREATE new item — one FormData POST with image + glb ────────────
        setSaveMsg('Creating item…');
        if (glbFile) { setGlbStatus('uploading'); setSaveMsg('Uploading item + 3D model…'); }

        const raw = await createMenuItemWithFiles(
          {
            name:        form.name.trim(),
            description: form.description.trim(),
            price:       parseFloat(form.price),
            categoryId:  form.category,
            isActive:    isActive,
            prepTime:    form.prepTime || undefined,
            calories:    form.calories ? parseInt(form.calories) : undefined,
          },
          uploadFile,
          glbFile,
        );

        setItems(prev => [...prev, normaliseItem(raw)]);

        if (raw.arModelKey) {
          setGlbStatus('approved');
          setSaveMsg('Item created with 3D model! ✓');
        } else {
          setSaveMsg('Item created!');
        }
      }

      setTimeout(() => { setModal({ open: false }); loadItems(); setSaveMsg(''); }, 1400);
    } catch (err: any) {
      setSaveErr(err?.message ?? 'Save failed.');
      if (glbStatus === 'uploading') { setGlbStatus('error'); setGlbError(err?.message ?? 'Upload failed'); }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this item from the menu?')) return;
    setDeleting(id);
    try {
      const latest = await fetchMenuItem(id, ADMIN_RESTAURANT_ID) as any;
      await updateMenuItem(id, {
        name: latest.name, description: latest.description ?? '',
        categoryId: latest.categoryId,
        price: (latest.priceMinorUnits ?? 0) / 100,
        status: 'inactive',
      }, latest.version ?? 1);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err: any) {
      alert(`Failed: ${err?.message}`);
    } finally {
      setDeleting(null);
    }
  };

  // Recreate: deactivate old → fresh POST with files
  const handleRecreate = async () => {
    if (!modal.item) return;
    if (!confirm('Deactivate old item and create fresh with files? Continue?')) return;
    setSaving(true); setSaveErr(''); setSaveMsg('Deactivating old item…');
    try {
      const latest = await fetchMenuItem(modal.item.id, ADMIN_RESTAURANT_ID) as any;
      await updateMenuItem(modal.item.id, {
        name: latest.name, description: latest.description ?? '',
        categoryId: latest.categoryId,
        price: (latest.priceMinorUnits ?? 0) / 100,
        status: 'inactive',
      }, latest.version ?? 1);
      setItems(prev => prev.filter(i => i.id !== modal.item!.id));

      setSaveMsg('Creating fresh item with files…');
      if (glbFile) setGlbStatus('uploading');

      const raw = await createMenuItemWithFiles(
        {
          name:        form.name.trim(),
          description: form.description.trim(),
          price:       parseFloat(form.price),
          categoryId:  form.category,
          isActive:    true,
          prepTime:    form.prepTime || undefined,
          calories:    form.calories ? parseInt(form.calories) : undefined,
        },
        uploadFile,
        glbFile,
      );

      setItems(prev => [...prev, normaliseItem(raw)]);
      if (raw.arModelKey) { setGlbStatus('approved'); setSaveMsg('Recreated with 3D model! ✓'); }
      else setSaveMsg('Recreated! ✓');

      setTimeout(() => { setModal({ open: false }); loadItems(); }, 1500);
    } catch (err: any) {
      setSaveErr(err?.message ?? 'Recreate failed.');
      if (glbStatus === 'uploading') { setGlbStatus('error'); setGlbError(err?.message ?? 'Failed'); }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#14b8a6]">
        <div>
          <h1 className="font-serif text-[20px] text-ink-900 font-semibold">Menu Management</h1>
          <p className="text-[12px] text-ink-400">Das Pardes · Live API · {activeItems.length} active items</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-300 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…"
              className="h-9 pl-8 pr-3 rounded-xl w-[200px] text-[13px] border-ink-200" />
          </div>
          <button onClick={loadItems} title="Refresh"
            className="w-9 h-9 rounded-xl bg-[#14b8a60f] border border-[#14b8a6] flex items-center justify-center hover:bg-ink-100 transition-colors">
            <RefreshCw size={14} className={`text-ink-400 ${loadState === 'loading' ? 'animate-spin' : ''}`} />
          </button>
          <button className="w-9 h-9 rounded-xl bg-[#14b8a60f] border border-[#14b8a6] flex items-center justify-center">
            <Bell size={16} className="text-ink-400" />
          </button>
          <button onClick={() => openModal()}
            className="h-9 px-3.5 rounded-xl bg-white text-black text-[13px] font-semibold flex items-center gap-1.5 hover:bg-brand-600 transition-colors shadow-brand">
            <Plus size={15} /> Add Item
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {loadState === 'error' && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl mb-5">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-red-700">Failed to load menu items</p>
              <p className="text-[12px] text-red-500">{loadError}</p>
            </div>
            <button onClick={loadItems} className="px-3 py-1.5 rounded-xl bg-red-100 border border-red-200 text-red-700 text-[12px] font-semibold">Retry</button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-6" style={{maxWidth:'480px'}}>
          {STATS_LABELS.map(s => (
            <div key={s.label} className="bg-[#14b8a60f] border border-[#14b8a6] rounded-2xl p-4 shadow-card">
              <p className="text-[11px] text-ink-400 uppercase tracking-widest font-semibold mb-2">{s.label}</p>
              <p className={`font-serif text-[26px] font-semibold ${s.color}`}>
                {loadState === 'loading' ? '…' : stats[s.key as keyof typeof stats]}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setCategory('all')}
            className={`px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all ${category === 'all' ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white border-ink-200 text-black hover:border-brand-300'}`}>
            🍽️ All
          </button>
          {cats.map(cat => (
            <button key={cat.id} onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all ${category === cat.id ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white border-ink-200 text-black hover:border-brand-300'}`}>
              {cat.name}
            </button>
          ))}
        </div>

        {loadState === 'loading' && (
          <div className="bg-[#14b8a60f] border border-[#14b8a6] rounded-2xl overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-[#14b8a6] last:border-0">
                <div className="w-10 h-10 rounded-xl bg-ink-100 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-ink-100 rounded animate-pulse w-1/3" />
                  <div className="h-2.5 bg-ink-50 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {loadState !== 'loading' && (
          <div className="bg-[#14b8a60f] border border-[#14b8a6] rounded-2xl overflow-hidden shadow-card">
            <div className="grid gap-3 px-4 py-3 border-b border-[#14b8a6]"
              style={{ gridTemplateColumns: '40px 1fr 120px 80px 80px 90px 80px' }}>
              {['', 'Item', 'Category', 'Price', 'Rating', 'Status', 'Actions'].map(h => (
                <div key={h} className="text-[11px] text-ink-400 uppercase tracking-widest font-semibold">{h}</div>
              ))}
            </div>

            {filtered.length === 0 && loadState === 'success' && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <span className="text-4xl opacity-30">🍽️</span>
                <p className="text-[13px] text-ink-400">No items found</p>
                <button onClick={() => openModal()} className="px-4 py-2 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-[13px] font-semibold">Add First Item</button>
              </div>
            )}

            {filtered.map((item, idx) => (
              <div key={item.id ?? `item-${idx}`}
                className="grid gap-3 px-4 py-3.5 border-b border-[#14b8a6] last:border-0 items-center hover:bg-ink-50 transition-colors"
                style={{ gridTemplateColumns: '40px 1fr 120px 80px 80px 90px 80px' }}>
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-[22px] overflow-hidden">
                  {(item as any).imageUrl
                    ? <img src={(item as any).imageUrl} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                    : item.emoji}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-semibold text-ink-900 truncate">{item.name}</p>
                    {(item as any).arModelKey && (
                      <span className="text-[9px] bg-purple-100 border border-purple-200 text-purple-600 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">3D</span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-400 truncate">{item.description}</p>
                </div>
                <div className="text-[12px] text-ink-500 font-medium">{item.category}</div>
                <div className="font-serif text-[13px] text-brand-600 font-semibold">{formatPrice(item.price)}</div>
                <div className="flex items-center gap-1 text-[12px] text-amber-500 font-medium">★ {item.rating?.toFixed(1) ?? '—'}</div>
                <div><StatusChip status={item.status} /></div>
                <div className="flex gap-1.5">
                  <button onClick={() => openModal(item)}
                    className="w-7 h-7 rounded-lg bg-ink-50 border border-ink-200 flex items-center justify-center hover:bg-brand-50 hover:border-brand-200 transition-all">
                    <Edit2 size={12} className="text-ink-400" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} disabled={deleting === item.id}
                    className="w-7 h-7 rounded-lg bg-ink-50 border border-ink-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-all disabled:opacity-50">
                    {deleting === item.id ? <Loader2 size={12} className="animate-spin text-ink-400" /> : <Trash2 size={12} className="text-ink-400" />}
                  </button>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between px-4 py-3.5 border-t border-[#14b8a6]">
              <p className="text-[12px] text-ink-400">Showing {filtered.length} of {activeItems.length} active items</p>
              <p className="text-[11px] text-ink-300">Source: AWS API Gateway</p>
            </div>
          </div>
        )}
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-ink-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          onClick={e => e.target === e.currentTarget && setModal({ open: false })}>
          <div className="bg-black border border-ink-100 rounded-3xl w-[440px] max-h-[90vh] overflow-y-auto p-6 shadow-card-lg">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-serif text-[18px] text-ink-900 font-semibold">{modal.item ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
                <p className="text-[11px] text-ink-400 mt-0.5">{modal.item ? `ID: ${modal.item.id?.slice(0,8)}…` : 'POST to AWS API Gateway'}</p>
              </div>
              <button onClick={() => setModal({ open: false })} className="w-8 h-8 rounded-xl bg-ink-50 border border-ink-200 flex items-center justify-center">
                <X size={14} className="text-ink-500" />
              </button>
            </div>

            {saveMsg && <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl mb-4"><CheckCircle size={14} className="text-green-600" /><p className="text-[12px] text-green-700 font-semibold">{saveMsg}</p></div>}
            {saveErr && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4"><AlertCircle size={14} className="text-red-500" /><p className="text-[12px] text-red-600">{saveErr}</p></div>}

            <div className="mb-4">
              <label className="block text-[11px] text-ink-500 uppercase tracking-widest font-semibold mb-1.5">Item Name *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Chicken Karahi" className="w-full h-10 text-[13px]" />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[11px] text-ink-500 uppercase tracking-widest font-semibold mb-1.5">Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className={`w-full h-10 text-[13px] ${!form.category ? 'border-amber-400' : ''}`}>
                  {cats.length === 0 && <option value="">⚠ Loading…</option>}
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-ink-500 uppercase tracking-widest font-semibold mb-1.5">Price (Rs) *</label>
                <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="0" className="w-full h-10 text-[13px]" />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[11px] text-ink-500 uppercase tracking-widest font-semibold mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Short description…" rows={2} className="w-full rounded-xl px-3 py-2.5 text-[13px] resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[11px] text-ink-500 uppercase tracking-widest font-semibold mb-1.5">Prep Time</label>
                <input value={form.prepTime} onChange={e => setForm(p => ({ ...p, prepTime: e.target.value }))} placeholder="e.g. 25 min" className="w-full h-10 text-[13px]" />
              </div>
              <div>
                <label className="block text-[11px] text-ink-500 uppercase tracking-widest font-semibold mb-1.5">Calories</label>
                <input type="number" value={form.calories} onChange={e => setForm(p => ({ ...p, calories: e.target.value }))} placeholder="e.g. 680" className="w-full h-10 text-[13px]" />
              </div>
            </div>

            {/* Image Upload */}
            <div className="mb-4">
              <label className="block text-[11px] text-ink-500 uppercase tracking-widest font-semibold mb-1.5">
                Item Image
                {modal.item && !(modal.item as any).imageKey && <span className="ml-2 text-amber-500 normal-case font-normal">— no image yet</span>}
                {modal.item && (modal.item as any).imageKey && <span className="ml-2 text-green-600 normal-case font-normal">✓ uploaded</span>}
              </label>
              <label className="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50 cursor-pointer hover:border-brand-300 hover:bg-brand-50 transition-all">
                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0] ?? null; setUploadFile(f); setUploadName(f?.name ?? null); }} />
                <CloudUpload size={26} className={uploadName ? 'text-brand-500' : 'text-ink-300'} />
                <span className={`text-[12px] font-medium ${uploadName ? 'text-brand-600' : 'text-ink-400'}`}>
                  {uploadName ? `✓ ${uploadName}` : 'Click to upload · PNG, JPG'}
                </span>
              </label>
            </div>

            {/* GLB Upload */}
            <div className="mb-4">
              <label className="block text-[11px] text-ink-500 uppercase tracking-widest font-semibold mb-1.5">
                3D AR Model (.glb)
                {modal.item && !(modal.item as any).arModelKey && <span className="ml-2 text-amber-500 normal-case font-normal">— no model yet</span>}
                {modal.item && (modal.item as any).arModelKey && <span className="ml-2 text-green-600 normal-case font-normal">✓ uploaded</span>}
              </label>

              {glbStatus === 'idle' && (
                <label className="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50/30 cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all">
                  <input type="file" accept=".glb,.gltf" className="hidden" onChange={e => { const f = e.target.files?.[0] ?? null; setGlbFile(f); setGlbName(f?.name ?? null); setGlbError(''); }} />
                  <span className="text-2xl">🫙</span>
                  <span className={`text-[12px] font-medium ${glbName ? 'text-purple-700' : 'text-ink-400'}`}>
                    {glbName ? `✓ ${glbName}` : 'Click to upload · .glb / .gltf'}
                  </span>
                  {glbName && !modal.item && <span className="text-[11px] text-purple-500">Will upload with item on Save</span>}
                  {glbName && modal.item && <span className="text-[11px] text-amber-500">Use Recreate button below to attach GLB</span>}
                </label>
              )}

              {glbStatus === 'uploading' && (
                <div className="p-4 rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50/30">
                  <div className="flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin text-purple-500" />
                    <span className="text-[12px] text-purple-700 font-medium">{saveMsg || 'Uploading 3D model…'}</span>
                  </div>
                </div>
              )}

              {glbStatus === 'approved' && (
                <div className="p-4 rounded-2xl border-2 border-dashed border-green-300 bg-green-50/30 flex items-center gap-3">
                  <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-[12px] text-green-700 font-semibold">✓ 3D Model Uploaded</p>
                    <p className="text-[11px] text-green-600 mt-0.5">Refresh to see AR badge on item</p>
                  </div>
                </div>
              )}

              {glbStatus === 'error' && (
                <div className="p-4 rounded-2xl border-2 border-dashed border-red-300 bg-red-50/30">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                    <p className="text-[12px] text-red-700 font-semibold">Upload Error</p>
                  </div>
                  <p className="text-[11px] text-red-500 mb-2">{glbError}</p>
                  <button onClick={() => { setGlbStatus('idle'); setGlbFile(null); setGlbName(null); }} className="text-[11px] text-red-600 underline">Try again</button>
                </div>
              )}
            </div>

            {/* Recreate — for existing items that need GLB */}
            {modal.item && glbFile && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-[11px] text-amber-700 font-semibold mb-2">
                  ⚠ GLB upload requires recreating the item (menu-lambda handles AR upload on POST only).
                </p>
                <button onClick={handleRecreate} disabled={saving}
                  className="w-full h-9 rounded-xl bg-amber-500 text-white text-[12px] font-semibold flex items-center justify-center gap-1.5 hover:bg-amber-600 disabled:opacity-60">
                  {saving ? <><Loader2 size={13} className="animate-spin" /> {saveMsg}</> : '🔄 Recreate & Upload Files'}
                </button>
              </div>
            )}

            <div className="flex items-center justify-between py-2.5 border-t border-ink-100">
              <span className="text-[13px] font-medium text-ink-600">Active on guest menu</span>
              <Toggle checked={isActive} onChange={setIsActive} />
            </div>
            <div className="flex items-center justify-between py-2.5 border-t border-ink-100">
              <span className="text-[13px] font-medium text-ink-600">Mark as Chef's Special</span>
              <Toggle checked={isChef} onChange={setIsChef} />
            </div>

            <div className="mt-3 p-3 bg-ink-50 border border-ink-100 rounded-xl">
              <p className="text-[10px] text-ink-400 uppercase tracking-widest font-semibold mb-1.5">{modal.item ? 'PUT' : 'POST'} Payload Preview</p>
              <p className="text-[10px] text-ink-500 break-all">{`{ name: "${form.name||'…'}", price: ${form.price||0}, categoryId: "${form.category.slice(0,8)}…", status: "${isActive?'active':'inactive'}"${glbFile ? ', arFile: ✓' : ''} }`}</p>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setModal({ open: false })} className="flex-1 h-10 rounded-xl bg-ink-50 border border-ink-200 text-[13px] font-semibold text-ink-500 hover:bg-ink-100">Cancel</button>
              <button onClick={saveItem} disabled={saving || glbStatus === 'uploading'}
                className="flex-[2] h-10 rounded-xl flex items-center justify-center gap-1.5 text-[13px] font-semibold bg-brand-500 text-white hover:bg-brand-600 shadow-brand disabled:opacity-60">
                {saving || glbStatus === 'uploading'
                  ? <><Loader2 size={14} className="animate-spin" /> {saveMsg || 'Saving…'}</>
                  : modal.item ? '✓ Update Item' : '✓ Create Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}