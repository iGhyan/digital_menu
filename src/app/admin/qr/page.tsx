'use client';

import { useState } from 'react';
import { Download, Printer, Eye, X } from 'lucide-react';
import { QR_TABLES } from '@/lib/data';
import type { QrTable } from '@/lib/types';

const OUTLETS = ['🏛️ Main Hall', '🌿 Garden Terrace', '🥂 Private Dining', '☕ Lounge Bar'];

export default function AdminQRPage() {
  const [outlet, setOutlet]   = useState(OUTLETS[0]);
  const [preview, setPreview] = useState<QrTable | null>(null);
  const [dlDone, setDlDone]   = useState(false);

  const handleDlAll = () => {
    setDlDone(true);
    setTimeout(() => setDlDone(false), 2000);
  };

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-surface-400">
        <div>
          <h1 className="font-serif text-[20px] text-[#f5e9d0] font-semibold">QR Code Management</h1>
          <p className="text-[12px] text-white/25 mt-0.5">Generate, preview &amp; download table QR codes per outlet</p>
        </div>
        <button className="h-9 px-3.5 rounded-[10px] bg-gold-400/15 border border-gold-400/30 text-[13px] font-medium text-gold-400 flex items-center gap-1.5 hover:bg-gold-400/25 transition-colors">
          + Generate QR
        </button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">

        {/* Outlet selector */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {OUTLETS.map((o) => (
            <button key={o} onClick={() => setOutlet(o)}
              className={`px-3.5 py-1.5 rounded-full border text-[12px] transition-all ${
                outlet === o
                  ? 'bg-gold-400/12 border-gold-400/35 text-gold-400 font-medium'
                  : 'bg-white/[0.03] border-white/[0.08] text-white/35 hover:border-gold-400/20'
              }`}>
              {o}
            </button>
          ))}
        </div>

        {/* Bulk bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-surface-100 border border-white/[0.06] rounded-xl mb-5">
          <span className="text-[13px] text-white/30 flex-1">
            Main Hall · {QR_TABLES.length} tables · {QR_TABLES.filter((t) => t.linked).length} QR codes linked
          </span>
          <button onClick={handleDlAll}
            className={`h-8 px-3 rounded-[8px] flex items-center gap-1.5 text-[12px] font-medium border transition-all ${
              dlDone
                ? 'bg-green-500/15 border-green-500/25 text-green-400'
                : 'bg-gold-400/10 border-gold-400/25 text-gold-400 hover:bg-gold-400/20'
            }`}>
            <Download size={13} />
            {dlDone ? 'Downloaded!' : 'Download All'}
          </button>
          <button className="h-8 px-3 rounded-[8px] bg-gold-400/10 border border-gold-400/25 text-gold-400 text-[12px] font-medium flex items-center gap-1.5 hover:bg-gold-400/20 transition-colors">
            <Printer size={13} /> Print All
          </button>
        </div>

        {/* QR grid */}
        <div className="grid grid-cols-4 gap-3">
          {QR_TABLES.map((table) => (
            <div key={table.tableNumber}
              className="bg-surface-100 border border-white/[0.06] rounded-[14px] p-4 flex flex-col items-center gap-2.5 hover:border-gold-400/25 transition-colors cursor-pointer">

              {/* Mini QR */}
              <div className="relative w-[64px] h-[64px] bg-white rounded-[10px] p-1.5 flex items-center justify-center">
                <div className="absolute -inset-[1px] rounded-[10px] pointer-events-none">
                  {['top-left','top-right','bottom-left','bottom-right'].map((pos) => (
                    <div key={pos} className={`absolute w-2.5 h-2.5 border-gold-400 border-[1.5px] ${
                      pos === 'top-left'     ? 'top-0 left-0 border-r-0 border-b-0 rounded-tl-[3px]' :
                      pos === 'top-right'    ? 'top-0 right-0 border-l-0 border-b-0 rounded-tr-[3px]' :
                      pos === 'bottom-left'  ? 'bottom-0 left-0 border-r-0 border-t-0 rounded-bl-[3px]' :
                                              'bottom-0 right-0 border-l-0 border-t-0 rounded-br-[3px]'
                    }`} />
                  ))}
                </div>
                <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
                  <rect x="3" y="3" width="16" height="16" rx="2" fill="#ffffff"/>
                  <rect x="6" y="6" width="10" height="10" rx="1" fill="#555"/>
                  <rect x="31" y="3" width="16" height="16" rx="2" fill="#ffffff"/>
                  <rect x="34" y="6" width="10" height="10" rx="1" fill="#555"/>
                  <rect x="3" y="31" width="16" height="16" rx="2" fill="#ffffff"/>
                  <rect x="6" y="34" width="10" height="10" rx="1" fill="#555"/>
                  <rect x="23" y="3" width="4" height="4" rx="1" fill="#666"/>
                  <rect x="23" y="23" width="4" height="4" rx="1" fill="#666"/>
                  <rect x="31" y="23" width="4" height="4" rx="1" fill="#666"/>
                  <rect x="39" y="23" width="4" height="4" rx="1" fill="#666"/>
                  <rect x="23" y="31" width="4" height="4" rx="1" fill="#666"/>
                  <rect x="35" y="35" width="4" height="4" rx="1" fill="#666"/>
                  <rect x="43" y="43" width="4" height="4" rx="1" fill="#666"/>
                </svg>
              </div>

              <p className="text-[13px] font-medium text-[#f5e9d0]">Table {table.tableNumber}</p>
              <p className="text-[10px] text-white/25">{table.zone}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                table.linked ? 'chip-active' : 'chip-inactive'
              }`}>
                {table.linked ? 'Linked' : 'Unlinked'}
              </span>

              <div className="flex gap-1.5 w-full">
                <button onClick={() => setPreview(table)}
                  className="flex-1 h-[30px] rounded-[8px] bg-white/[0.03] border border-white/[0.07] text-[11px] text-white/30 flex items-center justify-center gap-1 hover:border-gold-400/25 hover:text-gold-400 transition-all">
                  <Eye size={11} /> View
                </button>
                <button onClick={() => setPreview(table)}
                  className="flex-1 h-[30px] rounded-[8px] bg-gold-400/[0.08] border border-gold-400/20 text-[11px] text-gold-400 flex items-center justify-center gap-1 hover:bg-gold-400/18 transition-colors">
                  <Download size={11} /> DL
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6"
          onClick={(e) => e.target === e.currentTarget && setPreview(null)}>
          <div className="bg-surface-100 border border-white/[0.08] rounded-[20px] w-[400px] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-[18px] text-[#f5e9d0] font-semibold">
                Table {preview.tableNumber} — QR Code
              </h2>
              <button onClick={() => setPreview(null)}
                className="w-8 h-8 rounded-[8px] bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                <X size={15} className="text-white/40" />
              </button>
            </div>

            <div className="flex flex-col items-center">
              <div className="relative w-[160px] h-[160px] bg-white rounded-2xl p-3 flex items-center justify-center mb-4">
                {['top-left','top-right','bottom-left','bottom-right'].map((pos) => (
                  <div key={pos} className={`absolute w-3.5 h-3.5 border-gold-400 border-2 ${
                    pos === 'top-left'     ? '-top-[1px] -left-[1px] border-r-0 border-b-0 rounded-tl-[4px]' :
                    pos === 'top-right'    ? '-top-[1px] -right-[1px] border-l-0 border-b-0 rounded-tr-[4px]' :
                    pos === 'bottom-left'  ? '-bottom-[1px] -left-[1px] border-r-0 border-t-0 rounded-bl-[4px]' :
                                            '-bottom-[1px] -right-[1px] border-l-0 border-t-0 rounded-br-[4px]'
                  }`} />
                ))}
                <svg width="130" height="130" viewBox="0 0 130 130" fill="none">
                  <rect x="8" y="8" width="40" height="40" rx="5" fill="#ffffff"/>
                  <rect x="16" y="16" width="24" height="24" rx="3" fill="#444"/>
                  <rect x="82" y="8" width="40" height="40" rx="5" fill="#ffffff"/>
                  <rect x="90" y="16" width="24" height="24" rx="3" fill="#444"/>
                  <rect x="8" y="82" width="40" height="40" rx="5" fill="#ffffff"/>
                  <rect x="16" y="90" width="24" height="24" rx="3" fill="#444"/>
                  <rect x="58" y="8" width="8" height="8" rx="1" fill="#666"/>
                  <rect x="58" y="20" width="8" height="8" rx="1" fill="#666"/>
                  <rect x="70" y="8" width="8" height="8" rx="1" fill="#666"/>
                  <rect x="58" y="58" width="8" height="8" rx="1" fill="#666"/>
                  <rect x="70" y="70" width="8" height="8" rx="1" fill="#666"/>
                  <rect x="90" y="58" width="8" height="8" rx="1" fill="#666"/>
                  <rect x="58" y="90" width="8" height="8" rx="1" fill="#666"/>
                  <rect x="8" y="58" width="8" height="8" rx="1" fill="#666"/>
                  <rect x="20" y="58" width="8" height="8" rx="1" fill="#666"/>
                  <rect x="38" y="70" width="8" height="8" rx="1" fill="#666"/>
                </svg>
              </div>

              <div className="w-full bg-white/[0.03] border border-white/[0.07] rounded-[10px] px-3 py-2.5 text-[11px] text-white/25 break-all text-center mb-4">
                {preview.url}
              </div>

              <button className="w-full h-11 rounded-xl bg-gradient-to-br from-gold-400 to-gold-500 text-surface text-[14px] font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                <Download size={16} /> Download QR Code (PNG)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
