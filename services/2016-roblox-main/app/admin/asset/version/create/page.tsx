'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminPost } from '../../../../../lib/adminClient';
import Card from '../../../../../components/ui/Card';
import Button from '../../../../../components/ui/Button';

export default function CreateAssetVersionPage() {
  const router = useRouter();
  const [assetId, setAssetId] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const file = fileRef.current?.files?.[0];
    if (!assetId || !file) return setMsg('Asset ID and .rbxm file are required.');
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.append('assetId', assetId);
    fd.append('rbxm', file);
    try { const r = await adminPost<{ assetId: number }>('/asset/version/create', fd); router.push(`/catalog/${r.assetId}/--`); }
    catch (e) { setMsg((e as Error).message); setBusy(false); }
  };
  const input = 'rounded-rbx border border-border bg-surface px-3 py-2';
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-3xl font-black">Update Item RBXM</h1>
      <Card className="flex flex-col gap-2">
        <input className={input} placeholder="Asset ID" value={assetId} onChange={(e) => setAssetId(e.target.value)} />
        <input ref={fileRef} type="file" accept=".rbxm" className="text-sm" />
        {msg ? <p className="text-sm text-negative">{msg}</p> : null}
        <div><Button size="sm" disabled={busy} onClick={submit}>{busy ? 'Uploading…' : 'Create Version'}</Button></div>
      </Card>
    </div>
  );
}
