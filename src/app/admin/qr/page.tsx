'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Download, Printer, Eye, X, Plus,
  Copy, CheckCheck, QrCode, MapPin,
  ExternalLink, Trash2, AlertCircle, Loader2,
} from 'lucide-react';

// ── All types inline ──────────────────────────────────────────────────────────
interface QrRecord {
  id:           string;
  restaurantId: string;
  tableId:      string;
  tableNumber:  string;
  zone:         string;
  outlet:       string;
  encodedUrl:   string;
  s3Key:        string;
  s3Url:        string;
  createdAt:    string;
  linked:       boolean;
  qrDataUrl?:   string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const RESTAURANT_ID = '872f6f3a-82f2-41f0-a246-ec008b09666c';
const DEFAULT_BASE  = 'https://digital-menu-lovat-five.vercel.app/';
const ZONES = ['All Zones', 'Main Hall', 'Garden Terrace', 'Private Dining'];

type GenState = 'idle' | 'generating' | 'done' | 'error';

// ── URL helpers (inline — no @/lib/qr import) ─────────────────────────────────
function buildQrUrl(baseUrl: string, restaurantId: string, tableId: string): string {
  const url = new URL('/guest', baseUrl);
  url.searchParams.set('rid', restaurantId);
  url.searchParams.set('tid', tableId);
  return url.toString();
}

function buildS3Key(restaurantId: string, tableId: string): string {
  return `qr-codes/${restaurantId}/${tableId}.png`;
}

function buildS3Url(s3Key: string): string {
  return `https://lamaison-assets.s3.ap-south-1.amazonaws.com/${s3Key}`;
}

// ── Seed records ──────────────────────────────────────────────────────────────
function makeSeeds(): QrRecord[] {
  const base = typeof window !== 'undefined' ? window.location.origin : DEFAULT_BASE;

  const mainHall = Array.from({ length: 8 }, (_, i) => {
    const num     = String(i + 1).padStart(2, '0');
    const tableId = `T${num}`;
    const s3Key   = buildS3Key(RESTAURANT_ID, tableId);
    return {
      id: `seed-${tableId}`, restaurantId: RESTAURANT_ID,
      tableId, tableNumber: num, zone: 'Main Hall', outlet: 'Main Hall',
      encodedUrl: buildQrUrl(base, RESTAURANT_ID, tableId),
      s3Key, s3Url: buildS3Url(s3Key),
      createdAt: new Date().toISOString(), linked: true,
    };
  });

  const other = Array.from({ length: 4 }, (_, i) => {
    const num     = String(i + 9).padStart(2, '0');
    const tableId = `T${num}`;
    const zone    = i < 2 ? 'Garden Terrace' : 'Private Dining';
    const s3Key   = buildS3Key(RESTAURANT_ID, tableId);
    return {
      id: `seed-${tableId}`, restaurantId: RESTAURANT_ID,
      tableId, tableNumber: num, zone, outlet: zone,
      encodedUrl: buildQrUrl(base, RESTAURANT_ID, tableId),
      s3Key, s3Url: buildS3Url(s3Key),
      createdAt: new Date().toISOString(), linked: true,
    };
  });

  return [...mainHall, ...other];
}

// ── Page component ────────────────────────────────────────────────────────────
export default function AdminQRPage() {
  const [records,     setRecords]     = useState<QrRecord[]>(makeSeeds);
  const [zoneFilter,  setZoneFilter]  = useState('All Zones');
  const [preview,     setPreview]     = useState<QrRecord | null>(null);
  const [previewImg,  setPreviewImg]  = useState<string | null>(null);
  const [genState,    setGenState]    = useState<GenState>('idle');
  const [genError,    setGenError]    = useState('');
  const [copiedId,    setCopiedId]    = useState<string | null>(null);
  const [dlAll,       setDlAll]       = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTable,    setNewTable]    = useState({ number: '', zone: 'Main Hall', outlet: 'Main Hall' });
  const printRef = useRef<HTMLDivElement>(null);

  // ── Generate QR via API ───────────────────────────────────────────────────
  const generateQR = useCallback(async (record: QrRecord): Promise<string | null> => {
    try {
      const res = await fetch('/api/qr/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: record.restaurantId,
          tableId:      record.tableId,
          tableNumber:  record.tableNumber,
          zone:         record.zone,
          outlet:       record.outlet,
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      return data.pngDataUrl ?? null;
    } catch (err: any) {
      console.error('QR gen error:', err);
      return null;
    }
  }, []);

  // ── Open preview ──────────────────────────────────────────────────────────
  const openPreview = async (record: QrRecord) => {
    setPreview(record);
    setPreviewImg(null);
    setGenState('generating');
    setGenError('');
    const img = await generateQR(record);
    if (img) {
      setPreviewImg(img);
      setRecords(prev => prev.map(r => r.id === record.id ? { ...r, qrDataUrl: img } : r));
      setGenState('done');
    } else {
      setGenState('error');
      setGenError('Failed to generate QR — check API route');
    }
  };

  // ── Download single ───────────────────────────────────────────────────────
  const downloadQR = async (record: QrRecord) => {
    let img = record.qrDataUrl ?? null;
    if (!img) img = await generateQR(record);
    if (!img) return;
    const a = document.createElement('a');
    a.href     = img;
    a.download = `QR_Table${record.tableNumber}_${record.zone.replace(/\s/g, '_')}.png`;
    a.click();
  };

  // ── Print all ─────────────────────────────────────────────────────────────
  const downloadAll = async () => {
    setDlAll(true);
    const updated = await Promise.all(records.map(async r => {
      if (r.qrDataUrl) return r;
      const img = await generateQR(r);
      return img ? { ...r, qrDataUrl: img } : r;
    }));
    setRecords(updated);
    setDlAll(false);
    setTimeout(() => window.print(), 300);
  };

  // ── Copy URL ──────────────────────────────────────────────────────────────
  const copyUrl = (record: QrRecord) => {
    navigator.clipboard.writeText(record.encodedUrl);
    setCopiedId(record.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Add new table ─────────────────────────────────────────────────────────
  const addTable = () => {
    if (!newTable.number.trim()) return;
    const tableId = `T${newTable.number.padStart(2, '0')}`;
    const base    = window.location.origin;
    const s3Key   = buildS3Key(RESTAURANT_ID, tableId);
    const record: QrRecord = {
      id:           crypto.randomUUID(),
      restaurantId: RESTAURANT_ID,
      tableId,
      tableNumber:  newTable.number.padStart(2, '0'),
      zone:         newTable.zone,
      outlet:       newTable.outlet,
      encodedUrl:   buildQrUrl(base, RESTAURANT_ID, tableId),
      s3Key,
      s3Url:        buildS3Url(s3Key),
      createdAt:    new Date().toISOString(),
      linked:       true,
    };
    setRecords(prev => [...prev, record]);
    setShowNewForm(false);
    setNewTable({ number: '', zone: 'Main Hall', outlet: 'Main Hall' });
    setTimeout(() => openPreview(record), 300);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteRecord = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
    if (preview?.id === id) setPreview(null);
  };

  const filtered = records.filter(r => zoneFilter === 'All Zones' || r.zone === zoneFilter);
  const stats = {
    total:     records.length,
    linked:    records.filter(r => r.linked).length,
    generated: records.filter(r => r.qrDataUrl).length,
    zones:     new Set(records.map(r => r.zone)).size,
  };

  return (
    <>
      {/* Print stylesheet */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body > * { display: none !important; }
          #print-sheet { display: flex !important; }
        }
      ` }} />

      {/* Hidden print sheet */}
      <div id="print-sheet" ref={printRef}
        className="hidden fixed inset-0 z-[9999] bg-white p-8 flex-wrap gap-6 content-start overflow-auto">
        {records.filter(r => r.qrDataUrl).map(r => (
          <div key={r.id} className="border border-ink-200 rounded-2xl p-5 flex flex-col items-center gap-3 w-[200px] break-inside-avoid">
            <img src={r.qrDataUrl} alt={`Table ${r.tableNumber}`} className="w-[140px] h-[140px]" />
            <div className="text-center">
              <p className="font-serif text-[16px] font-semibold text-black">Table {r.tableNumber}</p>
              <p className="text-[11px] text-black">{r.zone}</p>
              <p className="text-[9px] text-black mt-1 font-mono break-all">{r.tableId}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 bg-white">
        <div>
          <h1 className="font-serif text-[20px] text-black font-semibold">QR Code Management</h1>
          <p className="text-[12px] text-black">Encode restaurantId + tableId → generate PNG/SVG → store in S3</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={downloadAll} disabled={dlAll}
            className="h-9 px-3.5 rounded-xl bg-black border border-ink-200 text-white text-[13px] font-semibold flex items-center gap-1.5 hover:bg-ink-100 transition-colors disabled:opacity-50">
            {dlAll ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
            {dlAll ? 'Generating…' : 'Print All'}
          </button>
          <button onClick={() => setShowNewForm(true)}
            className="h-9 px-3.5 rounded-xl bg-black text-white text-[13px] font-semibold flex items-center gap-1.5 hover:bg-brand-600 transition-colors shadow-brand">
            <Plus size={15} /> Add Table
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Tables', val: stats.total,     icon: '🪑', color: 'text-black'    },
            { label: 'Linked',       val: stats.linked,    icon: '🔗', color: 'text-red-600'  },
            { label: 'QR Generated', val: stats.generated, icon: '📱', color: 'text-green-600'  },
            { label: 'Zones',        val: stats.zones,     icon: '🏛️', color: 'text-purple-600' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-ink-100 rounded-2xl p-4 shadow-card">
              <span className="text-xl mb-2 block">{s.icon}</span>
              <p className={`font-serif text-[28px] font-semibold ${s.color}`}>{s.val}</p>
              <p className="text-[11px] text-black uppercase tracking-widest font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* URL encoding info */}
        <div className="flex items-start gap-3 p-4 bg-brand-50 border border-brand-100 rounded-2xl mb-5">
          <QrCode size={18} className="text-brand-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-brand-800 mb-1">QR URL Encoding Schema</p>
            <p className="text-[12px] text-brand-700 font-mono-dm break-all">
              {typeof window !== 'undefined' ? window.location.origin : DEFAULT_BASE}
              {'/guest?rid=<restaurantId>&tid=<tableId>'}
            </p>
            <p className="text-[11px] text-brand-600 mt-1.5">
              Scanning opens the guest PWA pre-loaded with the correct table session ·{' '}
              S3 key: <span className="font-mono-dm">qr-codes/&#123;restaurantId&#125;/&#123;tableId&#125;.png</span>
            </p>
          </div>
        </div>

        {/* Zone filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {ZONES.map(z => (
            <button key={z} onClick={() => setZoneFilter(z)}
              className={`px-3.5 py-1.5 rounded-full border text-[12px] font-semibold transition-all ${
                zoneFilter === z
                  ? 'bg-brand-500 border-brand-500 text-white shadow-brand'
                  : 'bg-white border-ink-200 text-black hover:border-brand-300'
              }`}>
              {z}
            </button>
          ))}
        </div>

        {/* QR Grid */}
        <div className="grid grid-cols-4 gap-4">
          {filtered.map(record => (
            <div key={record.id}
              className="bg-white border border-ink-100 rounded-2xl overflow-hidden shadow-card hover:border-brand-200 hover:shadow-card-lg transition-all group">

              <div className="aspect-square flex items-center justify-center bg-ink-50 relative overflow-hidden cursor-pointer"
                onClick={() => openPreview(record)}>
                {record.qrDataUrl ? (
                  <img src={record.qrDataUrl} alt={`Table ${record.tableNumber}`} className="w-full h-full object-contain p-4" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <QrCode size={40} className="text-black" />
                    <p className="text-[10px] text-black font-medium">Click to generate</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-brand-500/80 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye size={20} className="text-black" />
                  <span className="text-black text-[13px] font-semibold">Preview</span>
                </div>
              </div>

              <div className="p-3.5">
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <p className="text-[14px] font-semibold text-black">Table {record.tableNumber}</p>
                    <p className="text-[11px] text-black flex items-center gap-1">
                      <MapPin size={10} />{record.zone}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    record.linked ? 'chip-active' : 'chip-inactive'
                  }`}>
                    {record.linked ? 'Linked' : 'Unlinked'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-ink-50 rounded-xl px-2.5 py-1.5 mb-3 cursor-pointer hover:bg-brand-50 transition-colors"
                  onClick={() => copyUrl(record)}>
                  <p className="text-[10px] text-black font-mono-dm flex-1 truncate">{record.encodedUrl}</p>
                  {copiedId === record.id
                    ? <CheckCheck size={11} className="text-green-500 flex-shrink-0" />
                    : <Copy size={11} className="text-black flex-shrink-0" />}
                </div>

                <div className="flex gap-1.5">
                  <button onClick={() => openPreview(record)}
                    className="flex-1 h-8 rounded-xl bg-black border border-brand-200 text-[11px] font-semibold text-brand-700 flex items-center justify-center gap-1 hover:bg-brand-100 transition-all">
                    <Eye size={11} /> View
                  </button>
                  <button onClick={() => downloadQR(record)}
                    className="flex-1 h-8 rounded-xl bg-black border border-ink-200 text-[11px] font-semibold text-white flex items-center justify-center gap-1 hover:bg-ink-100 transition-all">
                    <Download size={11} /> Save
                  </button>
                  <button onClick={() => deleteRecord(record.id)}
                    className="w-8 h-8 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center hover:bg-red-100 transition-all">
                    <Trash2 size={11} className="text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Preview Modal ── */}
      {preview && (
        <div className="fixed inset-0 bg-ink-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          onClick={e => e.target === e.currentTarget && setPreview(null)}>
          <div className="bg-white border border-ink-100 rounded-3xl w-[480px] shadow-card-lg overflow-hidden">

            <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
              <div>
                <h2 className="font-serif text-[18px] text-black font-semibold">
                  Table {preview.tableNumber} — QR Code
                </h2>
                <p className="text-[12px] text-black">{preview.zone} · {preview.outlet}</p>
              </div>
              <button onClick={() => setPreview(null)}
                className="w-8 h-8 rounded-xl bg-ink-50 border border-ink-200 flex items-center justify-center">
                <X size={14} className="text-black" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex justify-center mb-6">
                <div className="relative w-[220px] h-[220px] bg-ink-50 rounded-3xl border border-ink-100 flex items-center justify-center">
                  {genState === 'generating' && (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={32} className="animate-spin text-brand-400" />
                      <p className="text-[12px] text-black">Generating QR code…</p>
                    </div>
                  )}
                  {genState === 'done' && previewImg && (
                    <img src={previewImg} alt={`Table ${preview.tableNumber}`} className="w-[200px] h-[200px] rounded-2xl" />
                  )}
                  {genState === 'error' && (
                    <div className="flex flex-col items-center gap-2 px-4 text-center">
                      <AlertCircle size={28} className="text-red-400" />
                      <p className="text-[12px] text-red-500">{genError}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: 'Table ID',      val: preview.tableId },
                  { label: 'Zone',          val: preview.zone },
                  { label: 'Restaurant ID', val: `${preview.restaurantId.slice(0, 8)}…` },
                  { label: 'Created',       val: new Date(preview.createdAt).toLocaleDateString() },
                ].map(m => (
                  <div key={m.label} className="bg-ink-50 rounded-xl p-2.5 border border-ink-100">
                    <p className="text-[10px] text-black uppercase tracking-widest font-semibold mb-0.5">{m.label}</p>
                    <p className="text-[12px] text-black font-semibold font-mono-dm truncate">{m.val}</p>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <p className="text-[11px] text-black uppercase tracking-widest font-semibold mb-1.5">
                  Encoded URL (scanning opens this)
                </p>
                <div className="flex items-center gap-2 bg-ink-50 border border-ink-100 rounded-xl px-3 py-2.5">
                  <p className="text-[11px] text-brand-600 font-mono-dm flex-1 break-all">{preview.encodedUrl}</p>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => copyUrl(preview)}
                      className="w-7 h-7 rounded-lg bg-white border border-ink-200 flex items-center justify-center hover:bg-brand-50 transition-colors">
                      {copiedId === preview.id
                        ? <CheckCheck size={12} className="text-green-500" />
                        : <Copy size={12} className="text-black" />}
                    </button>
                    <a href={preview.encodedUrl} target="_blank" rel="noopener noreferrer"
                      className="w-7 h-7 rounded-lg bg-white border border-ink-200 flex items-center justify-center hover:bg-brand-50 transition-colors">
                      <ExternalLink size={12} className="text-black" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="mb-5">
                <p className="text-[11px] text-black uppercase tracking-widest font-semibold mb-1.5">S3 Storage Path</p>
                <div className="bg-ink-50 border border-ink-100 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-black font-mono-dm break-all">{preview.s3Key}</p>
                  <p className="text-[9px] text-black font-mono-dm break-all mt-0.5">{preview.s3Url}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => previewImg && downloadQR(preview)} disabled={!previewImg}
                  className="flex-1 h-11 rounded-xl bg-brand-500 text-white text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-brand-600 transition-colors shadow-brand disabled:opacity-40">
                  <Download size={15} /> Download PNG
                </button>
                <button
                  onClick={() => {
                    if (previewImg) {
                      const w = window.open('', '_print');
                      w?.document.write(`<img src="${previewImg}" style="width:100%;max-width:400px;"/>`);
                      w?.print();
                    }
                  }}
                  disabled={!previewImg}
                  className="h-11 px-4 rounded-xl bg-ink-50 border border-ink-200 text-black text-[13px] font-semibold flex items-center gap-2 hover:bg-ink-100 transition-colors disabled:opacity-40">
                  <Printer size={15} /> Print
                </button>
              </div>

              <div className="mt-3 text-center">
                <a href={preview.encodedUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[12px] text-brand-600 hover:text-brand-700 underline underline-offset-2 flex items-center justify-center gap-1">
                  <ExternalLink size={12} /> Test this QR link in a new tab
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Table Modal ── */}
      {showNewForm && (
        <div className="fixed inset-0 bg-ink-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          onClick={e => e.target === e.currentTarget && setShowNewForm(false)}>
          <div className="bg-white border border-ink-100 rounded-3xl w-[380px] p-6 shadow-card-lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-[18px] text-black font-semibold">Add New Table</h2>
              <button onClick={() => setShowNewForm(false)}
                className="w-8 h-8 rounded-xl bg-ink-50 border border-ink-200 flex items-center justify-center">
                <X size={14} className="text-black" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-[11px] text-black uppercase tracking-widest font-semibold mb-1.5">
                Table Number
              </label>
              <input value={newTable.number}
                onChange={e => setNewTable(p => ({ ...p, number: e.target.value }))}
                placeholder="e.g. 13" type="number" min="1" max="99"
                className="w-full h-10 text-[13px]" />
            </div>

            <div className="mb-4">
              <label className="block text-[11px] text-black uppercase tracking-widest font-semibold mb-1.5">Zone</label>
              <div className="flex gap-2 flex-wrap">
                {['Main Hall', 'Garden Terrace', 'Private Dining', 'Lounge Bar'].map(z => (
                  <button key={z} onClick={() => setNewTable(p => ({ ...p, zone: z, outlet: z }))}
                    className={`px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all ${
                      newTable.zone === z ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white border-ink-200 text-black'
                    }`}>
                    {z}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 mb-5">
              <p className="text-[11px] text-brand-700 font-semibold mb-1">QR will encode:</p>
              <p className="text-[10px] text-brand-600 font-mono-dm break-all">
                {typeof window !== 'undefined' ? window.location.origin : DEFAULT_BASE}
                {`/guest?rid=${RESTAURANT_ID.slice(0, 8)}…&tid=T${(newTable.number || '??').padStart(2, '0')}`}
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowNewForm(false)}
                className="flex-1 h-10 rounded-xl bg-ink-50 border border-ink-200 text-[13px] font-semibold text-black hover:bg-ink-100 transition-colors">
                Cancel
              </button>
              <button onClick={addTable} disabled={!newTable.number.trim()}
                className="flex-[2] h-10 rounded-xl bg-brand-500 text-white text-[13px] font-semibold hover:bg-brand-600 transition-colors shadow-brand disabled:opacity-40 flex items-center justify-center gap-2">
                <Plus size={15} /> Create & Generate QR
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}