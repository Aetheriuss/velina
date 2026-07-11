'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminGet, adminPost } from '../../../../lib/adminClient';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

export default function ManageUsernamesPage() {
  const params = useParams();
  const userId = String(Array.isArray(params?.userId) ? params?.userId[0] : params?.userId);
  const { data, refetch } = useQuery({ queryKey: ['admin-usernames', userId], queryFn: () => adminGet<string[]>(`/user/usernames?userId=${userId}`) });
  const [selected, setSelected] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const names = data || [];

  const del = async () => {
    if (!selected) return;
    setMsg(null);
    try { await adminPost('/user/usernames/delete', { userId: Number(userId), username: selected }); setMsg('Username deleted.'); refetch(); }
    catch (e) { setMsg((e as Error).message); }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <h1 className="text-2xl font-semibold">Manage Usernames</h1>
      <Card className="flex flex-col gap-2">
        <label className="text-sm text-text-muted">Previous usernames</label>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="rounded-rbx border border-border bg-surface px-3 py-2">
          <option value="">Select…</option>
          {names.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        {msg ? <p className="text-sm text-text-muted">{msg}</p> : null}
        <div><Button size="sm" variant="secondary" disabled={!selected} onClick={del}>Delete Username</Button></div>
      </Card>
    </div>
  );
}
