'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminGet, adminPost } from '../../../../lib/adminClient';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

export default function CreateAssetPage() {
  const router = useRouter();
  const { data: types } = useQuery({ queryKey: ['asset-types'], queryFn: () => adminGet<Record<string, string>>('/asset/types') });
  const { data: genres } = useQuery({ queryKey: ['asset-genres'], queryFn: () => adminGet<Record<string, string>>('/asset/genres') });

  const [f, setF] = useState({ name: '', description: '', assetTypeId: '', genre: '', price: '', isForSale: false, limited: 'none', maxCopies: '', offsaleDeadline: '', packageAssetIds: '' });
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isPackage = f.assetTypeId === '32';

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.append('name', f.name);
    fd.append('description', f.description);
    fd.append('assetTypeId', f.assetTypeId);
    fd.append('genre', f.genre);
    fd.append('price', f.price);
    fd.append('isForSale', String(f.isForSale));
    fd.append('isLimited', String(f.limited === 'limited'));
    fd.append('isLimitedUnique', String(f.limited === 'unique'));
    fd.append('maxCopies', f.maxCopies);
    fd.append('offsaleDeadline', f.offsaleDeadline);
    if (isPackage) fd.append('packageAssetIds', f.packageAssetIds);
    else if (fileRef.current?.files?.[0]) fd.append('rbxm', fileRef.current.files[0]);
    try { const r = await adminPost<{ assetId: number }>('/asset/create', fd); router.push(`/catalog/${r.assetId}/--`); }
    catch (e) { setMsg((e as Error).message); setBusy(false); }
  };

  const input = 'rounded-rbx border border-border bg-surface px-3 py-2';
  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-2xl font-semibold">Create Item</h1>
      <Card className="flex flex-col gap-2">
        <input className={input} placeholder="Name" value={f.name} onChange={(e) => set('name', e.target.value)} />
        <input className={input} placeholder="Description" value={f.description} onChange={(e) => set('description', e.target.value)} />
        <select className={input} value={f.assetTypeId} onChange={(e) => set('assetTypeId', e.target.value)}>
          <option value="">Type…</option>
          {Object.entries(types || {}).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select className={input} value={f.genre} onChange={(e) => set('genre', e.target.value)}>
          <option value="">Genre…</option>
          {Object.entries(genres || {}).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        {isPackage ? (
          <input className={input} placeholder="Package asset IDs (CSV)" value={f.packageAssetIds} onChange={(e) => set('packageAssetIds', e.target.value)} />
        ) : (
          <input ref={fileRef} type="file" accept=".rbxm" className="text-sm" />
        )}
        <input className={input} placeholder="Price (optional)" value={f.price} onChange={(e) => set('price', e.target.value)} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isForSale} onChange={(e) => set('isForSale', e.target.checked)} /> For sale</label>
        <select className={input} value={f.limited} onChange={(e) => set('limited', e.target.value)}>
          <option value="none">Not Limited</option><option value="limited">Limited</option><option value="unique">Limited Unique</option>
        </select>
        <input className={input} placeholder="Max copies (optional)" value={f.maxCopies} onChange={(e) => set('maxCopies', e.target.value)} />
        <input className={input} placeholder="Offsale deadline ISO (optional)" value={f.offsaleDeadline} onChange={(e) => set('offsaleDeadline', e.target.value)} />
        {msg ? <p className="text-sm text-negative">{msg}</p> : null}
        <div><Button disabled={busy || !f.name || !f.assetTypeId} onClick={submit}>{busy ? 'Creating…' : 'Create Asset'}</Button></div>
      </Card>
    </div>
  );
}
