'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminGet, adminPost, adminRequest } from '../../lib/adminClient';
import Button from '../ui/Button';

/** Staff permission management for a user (ports ManagePermissions.svelte; owner-gated by the hub). */
export default function ManagePermissions({ userId }: { userId: string }) {
  const current = useQuery({ queryKey: ['adm-perms', userId], queryFn: () => adminGet<Array<{ permission: string }>>(`/staff/permissions?userId=${userId}`) });
  const all = useQuery({ queryKey: ['adm-perms-list'], queryFn: () => adminGet<string[]>('/staff/permissions/list') });
  const [add, setAdd] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const held = new Set((current.data || []).map((p) => p.permission));
  const available = (all.data || []).filter((p) => !held.has(p));

  const doAdd = async () => { if (!add) return; setMsg(null); try { await adminPost(`/staff/permissions/?userId=${userId}&permission=${encodeURIComponent(add)}`); setAdd(''); current.refetch(); } catch (e) { setMsg((e as Error).message); } };
  const doRemove = async (perm: string) => { setMsg(null); try { await adminRequest('DELETE', `/staff/permissions?userId=${userId}&permission=${encodeURIComponent(perm)}`); current.refetch(); } catch (e) { setMsg((e as Error).message); } };

  return (
    <div className="flex flex-col gap-2">
      {msg ? <p className="text-sm text-negative">{msg}</p> : null}
      <div className="flex flex-wrap gap-1">
        {(current.data || []).map((p) => (
          <span key={p.permission} className="flex items-center gap-1 rounded bg-surface-alt px-2 py-0.5 text-xs">
            {p.permission}
            <button type="button" onClick={() => doRemove(p.permission)} className="text-negative">×</button>
          </span>
        ))}
        {(current.data || []).length === 0 ? <span className="text-sm text-text-muted">No individual permissions.</span> : null}
      </div>
      <div className="flex gap-2">
        <select value={add} onChange={(e) => setAdd(e.target.value)} className="flex-1 rounded-rbx border border-border bg-surface px-2 py-1.5 text-sm">
          <option value="">Add a permission…</option>
          {available.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <Button size="sm" disabled={!add} onClick={doAdd}>Add</Button>
      </div>
    </div>
  );
}
