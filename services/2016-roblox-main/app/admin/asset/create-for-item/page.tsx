'use client';

import React, { useState } from 'react';
import { adminPost } from '../../../../lib/adminClient';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

export default function CreateAssetForItemPage() {
  const [url, setUrl] = useState('');
  const [newId, setNewId] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setMsg(null);
    try { const r = await adminPost<{ assetId: number }>('/asset/create/from-roblox', { url }); setNewId(String(r.assetId)); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  const input = 'rounded-rbx border border-border bg-surface px-3 py-2';
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-semibold">Create Item Asset</h1>
      <Card className="flex flex-col gap-2">
        <label className="text-sm text-text-muted">Roblox URL</label>
        <input className={input} value={url} onChange={(e) => setUrl(e.target.value)} />
        {newId ? (
          <>
            <label className="text-sm text-text-muted">New URL</label>
            <input className={input} readOnly value={`http://www.roblox.com/asset/?id=${newId}`} onClick={(e) => e.currentTarget.select()} />
            <label className="text-sm text-text-muted">New ID</label>
            <input className={input} readOnly value={newId} onClick={(e) => e.currentTarget.select()} />
          </>
        ) : null}
        {msg ? <p className="text-sm text-negative">{msg}</p> : null}
        <div><Button size="sm" disabled={!url || busy} onClick={submit}>{busy ? 'Creating…' : 'Create Asset'}</Button></div>
      </Card>
    </div>
  );
}
