'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminPost } from '../../../../lib/adminClient';
import { useAdminPerms } from '../../../../components/admin/AdminPermissionsProvider';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

export default function CreatePlayerPage() {
  const router = useRouter();
  const { hasPermission } = useAdminPerms();
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!hasPermission('CreateUser')) return <p className="text-text-muted">You do not have the CreateUser permission.</p>;

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await adminPost('/create-user', { userId: userId || null, username, password });
      router.push(`/admin/manage-user/${userId || username}`);
    } catch (e) { setMsg((e as Error).message); setBusy(false); }
  };

  const input = 'rounded-rbx border border-border bg-surface px-3 py-2';
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-semibold">Create Player</h1>
      <Card className="flex flex-col gap-2">
        <label className="text-sm text-text-muted">User ID (blank = any)</label>
        <input className={input} value={userId} onChange={(e) => setUserId(e.target.value)} />
        <label className="text-sm text-text-muted">Username</label>
        <input className={input} value={username} onChange={(e) => setUsername(e.target.value)} />
        <label className="text-sm text-text-muted">Password</label>
        <input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {msg ? <p className="text-sm text-negative">{msg}</p> : null}
        <div><Button disabled={busy || !username} onClick={submit}>{busy ? 'Creating…' : 'Create Player'}</Button></div>
      </Card>
    </div>
  );
}
