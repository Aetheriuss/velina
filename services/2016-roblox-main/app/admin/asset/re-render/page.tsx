'use client';

import React, { useState } from 'react';
import { adminPost } from '../../../../lib/adminClient';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

export default function AssetReRenderPage() {
  const [assetId, setAssetId] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const submit = async () => {
    setMsg(null);
    try { await adminPost('/asset/re-render', { assetId }); setMsg('Render requested.'); }
    catch (e) { setMsg((e as Error).message); }
  };
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-3xl font-black">Force Item Re-Render</h1>
      <Card className="flex flex-col gap-2">
        <input className="rounded-rbx border border-border bg-surface px-3 py-2" placeholder="Asset ID" value={assetId} onChange={(e) => setAssetId(e.target.value)} />
        {msg ? <p className="text-sm text-text-muted">{msg}</p> : null}
        <div><Button size="sm" disabled={!assetId} onClick={submit}>Submit</Button></div>
      </Card>
    </div>
  );
}
