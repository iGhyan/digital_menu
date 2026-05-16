'use client';

import { useState } from 'react';
import { Edit2, Lock, X, ShieldCheck, ShieldX } from 'lucide-react';
import { ADMIN_USERS } from '@/lib/data';
import type { AdminUser, UserRole } from '@/lib/types';

const ROLE_CHIP: Record<UserRole, string> = {
  super:   'chip-super',
  manager: 'chip-manager',
  kitchen: 'chip-kitchen',
};
const ROLE_LABEL: Record<UserRole, string> = {
  super: 'Super Admin', manager: 'Manager', kitchen: 'Kitchen Staff',
};

const PERMS = [
  'View Menu', 'Edit Menu', 'View Orders', 'Manage Users', 'QR Codes', 'Analytics',
];
const DEFAULT_PERMS_MANAGER = [true, true, true, false, true, false];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>(ADMIN_USERS);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [perms, setPerms]   = useState(DEFAULT_PERMS_MANAGER);

  const togglePerm = (i: number) =>
    setPerms((p) => p.map((v, idx) => (idx === i ? !v : v)));

  const saveUser = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setModal(false); setSaved(false); }, 900);
  };

  const STATS = [
    { label: 'Total Users', val: users.length, sub: 'Across all roles' },
    { label: 'Active Now',   val: users.filter((u) => u.isOnline).length, sub: 'Online this session' },
    { label: 'MFA Enabled', val: users.filter((u) => u.mfaEnabled).length, sub: `${Math.round(users.filter((u) => u.mfaEnabled).length / users.length * 100)}% coverage` },
  ];

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-surface-400">
        <div>
          <h1 className="font-serif text-[20px] text-[#f5e9d0] font-semibold">User Management</h1>
          <p className="text-[12px] text-white/25 mt-0.5">Role-based access control · Super Admin &amp; Manager permissions</p>
        </div>
        <button onClick={() => { setModal(true); setSaved(false); setPerms(DEFAULT_PERMS_MANAGER); }}
          className="h-9 px-3.5 rounded-[10px] bg-gold-400/15 border border-gold-400/30 text-[13px] font-medium text-gold-400 flex items-center gap-1.5 hover:bg-gold-400/25 transition-colors">
          + Add User
        </button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {STATS.map((s) => (
            <div key={s.label} className="bg-surface-100 border border-white/[0.06] rounded-[14px] px-4 py-3.5">
              <p className="text-[11px] text-white/25 uppercase tracking-widest mb-2">{s.label}</p>
              <p className="font-serif text-[22px] text-[#f5e9d0] font-semibold">{s.val}</p>
              <p className="text-[11px] text-white/20 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* User table */}
        <div className="bg-surface-100 border border-white/[0.06] rounded-2xl overflow-hidden">
          {/* Head */}
          <div className="grid gap-3 px-4 py-3 border-b border-white/[0.05]"
            style={{ gridTemplateColumns: '200px 100px 130px 120px 1fr 100px' }}>
            {['User', 'Role', 'MFA', 'Status', 'Last Login', 'Actions'].map((h) => (
              <div key={h} className="text-[11px] text-white/20 uppercase tracking-widest font-medium">{h}</div>
            ))}
          </div>

          {/* Rows */}
          {users.map((user) => (
            <div key={user.id}
              className="grid gap-3 px-4 py-3.5 border-b border-white/[0.04] last:border-0 items-center hover:bg-white/[0.02] transition-colors"
              style={{ gridTemplateColumns: '200px 100px 130px 120px 1fr 100px' }}
            >
              {/* Name */}
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-[9px] flex items-center justify-center text-[12px] font-medium flex-shrink-0 ${
                  user.role === 'super'   ? 'bg-gold-400/15 text-gold-400' :
                  user.role === 'manager' ? 'bg-violet-400/12 text-violet-300' :
                                           'bg-blue-400/10 text-blue-300'
                }`}>
                  {user.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[#f5e9d0] truncate">{user.name}</p>
                  <p className="text-[11px] text-white/25 truncate">{user.email}</p>
                </div>
              </div>

              {/* Role */}
              <div>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium ${ROLE_CHIP[user.role]}`}>
                  {ROLE_LABEL[user.role]}
                </span>
              </div>

              {/* MFA */}
              <div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] border ${
                  user.mfaEnabled
                    ? 'bg-green-500/[0.08] border-green-500/18 text-green-400'
                    : 'bg-red-500/[0.07] border-red-500/15 text-red-400'
                }`}>
                  {user.mfaEnabled ? <ShieldCheck size={11} /> : <ShieldX size={11} />}
                  {user.mfaEnabled ? 'On' : 'Off'}
                </span>
              </div>

              {/* Status */}
              <div className={`flex items-center gap-1.5 text-[11px] ${user.isOnline ? 'text-green-400' : 'text-white/20'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${user.isOnline ? 'bg-green-400' : 'bg-white/15'}`} />
                {user.isOnline ? 'Online' : 'Offline'}
              </div>

              {/* Last login */}
              <div className="text-[11px] text-white/20">{user.lastLogin}</div>

              {/* Actions */}
              <div className="flex gap-1.5">
                <button className="w-7 h-7 rounded-[8px] bg-white/[0.03] border border-white/[0.07] flex items-center justify-center hover:bg-gold-400/10 hover:border-gold-400/20 transition-all">
                  <Edit2 size={13} className="text-white/30" />
                </button>
                <button className="w-7 h-7 rounded-[8px] bg-white/[0.03] border border-white/[0.07] flex items-center justify-center hover:bg-gold-400/10 hover:border-gold-400/20 transition-all">
                  <Lock size={13} className="text-white/30" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create user modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6"
          onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="bg-surface-100 border border-white/[0.08] rounded-[20px] w-[400px] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-[18px] text-[#f5e9d0] font-semibold">Create New User</h2>
              <button onClick={() => setModal(false)}
                className="w-8 h-8 rounded-[8px] bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                <X size={15} className="text-white/40" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-[11px] text-white/30 uppercase tracking-widest mb-1.5">Full Name</label>
              <input placeholder="e.g. Ahmed Raza" className="w-full h-10 text-[13px]" />
            </div>
            <div className="mb-4">
              <label className="block text-[11px] text-white/30 uppercase tracking-widest mb-1.5">Email Address</label>
              <input type="email" placeholder="e.g. ahmed@lamaison.pk" className="w-full h-10 text-[13px]" />
            </div>
            <div className="mb-4">
              <label className="block text-[11px] text-white/30 uppercase tracking-widest mb-1.5">Role</label>
              <select className="w-full h-10 text-[13px] bg-white/[0.04] border border-white/[0.08] rounded-xl px-3">
                <option value="manager">Manager</option>
                <option value="kitchen">Kitchen Staff</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-[11px] text-white/30 uppercase tracking-widest mb-2">Permissions</label>
              <div className="grid grid-cols-2 gap-2">
                {PERMS.map((perm, i) => (
                  <div key={perm}
                    className="flex items-center gap-2 p-2 rounded-[9px] border border-white/[0.06] bg-white/[0.02]">
                    <button
                      onClick={() => togglePerm(i)}
                      className={`w-4 h-4 rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-all ${
                        perms[i]
                          ? 'bg-gold-400/20 border-gold-400/40'
                          : 'border-white/15'
                      }`}>
                      {perms[i] && <span className="text-gold-400 text-[10px]">✓</span>}
                    </button>
                    <span className="text-[11px] text-white/35">{perm}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal(false)}
                className="flex-1 h-10 rounded-[10px] bg-white/[0.04] border border-white/[0.08] text-[13px] text-white/40 hover:bg-white/[0.07] transition-colors">
                Cancel
              </button>
              <button onClick={saveUser} disabled={saving}
                className={`flex-[2] h-10 rounded-[10px] flex items-center justify-center gap-1.5 text-[13px] font-medium transition-all ${
                  saved
                    ? 'bg-green-500/15 border border-green-500/30 text-green-400'
                    : 'bg-gold-400/15 border border-gold-400/30 text-gold-400 hover:bg-gold-400/25'
                }`}>
                {saving ? <span className="w-4 h-4 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
                  : saved ? '✓ User Created!' : '👤 Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
