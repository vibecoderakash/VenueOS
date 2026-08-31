'use client';

import React, { useState } from 'react';
import { CheckCircle2, Lock, Pencil, Phone, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { createBrowserClient } from '@/lib/supabase/client';

export function StaffSelfProfile() {
  const { profile } = useAuth();
  const [name, setName] = useState(profile?.full_name || profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [password, setPassword] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pendingChanges, setPendingChanges] = useState<{ name: string; phone: string; password: string } | null>(null);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(''); setError('');
    setPendingChanges({ name, phone, password });
  };

  const confirmSave = async () => {
    if (!pendingChanges) return;
    setSaving(true); setMessage(''); setError('');
    try {
      const supabase = createBrowserClient();
      const session = supabase ? (await supabase.auth.refreshSession()).data.session : null;
      const response = await fetch('/api/profile/update', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ full_name: pendingChanges.name, phone: pendingChanges.phone, ...(pendingChanges.password ? { password: pendingChanges.password } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update your profile.');
      setPassword(''); setEditing(false); setPendingChanges(null); setMessage('Your profile was updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update your profile.');
    } finally { setSaving(false); }
  };

  return (
    <>
    <div className="rounded-2xl p-6 border space-y-5" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><UserRound className="w-5 h-5 text-primary" /> My Profile</h2>
          <p className="text-sm text-foreground-secondary mt-1">Update only your name, phone number, or password.</p>
        </div>
        {!editing && <button type="button" onClick={() => setEditing(true)} className="px-3 py-2 rounded-lg border text-sm font-semibold flex items-center gap-2" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}><Pencil className="w-4 h-4" /> Edit</button>}
      </div>
      {message && <div className="text-sm text-emerald-500 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{message}</div>}
      {error && <div className="text-sm text-rose-500">{error}</div>}
      {editing ? (
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm text-foreground-secondary">Name<input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg px-3 py-2 text-foreground" style={{ backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border)' }} required minLength={2} /></label>
          <label className="text-sm text-foreground-secondary">Phone<input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 w-full rounded-lg px-3 py-2 text-foreground" style={{ backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border)' }} /></label>
          <label className="text-sm text-foreground-secondary sm:col-span-2">New password <span className="text-xs">(leave blank to keep current)</span><input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-lg px-3 py-2 text-foreground" style={{ backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border)' }} minLength={8} /></label>
          <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>Cancel</button><button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold">Save Changes</button></div>
        </form>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 text-sm"><div><span className="text-foreground-muted">Name</span><p className="text-foreground font-medium">{profile?.full_name || profile?.name || '—'}</p></div><div><span className="text-foreground-muted">Phone</span><p className="text-foreground font-medium flex items-center gap-2"><Phone className="w-4 h-4" />{profile?.phone || '—'}</p></div><div><span className="text-foreground-muted">Email</span><p className="text-foreground font-medium flex items-center gap-2"><Lock className="w-4 h-4" />{profile?.email || '—'}</p></div></div>
      )}
    </div>
    {pendingChanges && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="confirm-profile-title">
        <div className="w-full max-w-md rounded-2xl border p-6 space-y-5 shadow-2xl" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div><h3 id="confirm-profile-title" className="text-lg font-bold text-foreground">Confirm profile changes</h3><p className="text-sm text-foreground-secondary mt-1">Please review the changes before saving them.</p></div>
          <div className="rounded-xl p-4 space-y-3 text-sm" style={{ backgroundColor: 'var(--surface-secondary)' }}>
            <div className="flex justify-between gap-4"><span className="text-foreground-muted">Name</span><span className="text-foreground font-medium text-right">{pendingChanges.name || '—'}</span></div>
            <div className="flex justify-between gap-4"><span className="text-foreground-muted">Phone</span><span className="text-foreground font-medium text-right">{pendingChanges.phone || '—'}</span></div>
            <div className="flex justify-between gap-4"><span className="text-foreground-muted">Password</span><span className="text-foreground font-medium text-right">{pendingChanges.password ? 'Will be changed' : 'No change'}</span></div>
          </div>
          <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setPendingChanges(null)} className="px-4 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>Go Back</button><button type="button" disabled={saving} onClick={confirmSave} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold">{saving ? 'Saving...' : 'Confirm & Save'}</button></div>
        </div>
      </div>
    )}
    </>
  );
}
