'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminGet, adminPost } from '../../../../../lib/adminClient';
import Card from '../../../../../components/ui/Card';
import Button from '../../../../../components/ui/Button';

export default function CreateClothingPage() {
  const router = useRouter();
  const { data: genres } = useQuery({ queryKey: ['asset-genres'], queryFn: () => adminGet<Record<string, string>>('/asset/genres') });
  const [f, setF] = useState({ name: '', description: '', type: '11', genre: '', price: '', isForSale: false });
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return setMsg('A texture image is required.');
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => fd.append(k, String(v)));
    fd.append('texture', file);
    try { const r = await adminPost<{ assetId: number }>('/asset/create/clothing', fd); router.push(`/catalog/${r.assetId}/--`); }
    catch (e) { setMsg((e as Error).message); setBusy(false); }
  };

  const input = 'rounded-rbx border border-border bg-surface px-3 py-2';
  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-3xl font-black">Create Clothing</h1>
      <Card className="flex flex-col gap-2">
        <input className={input} placeholder="Name" value={f.name} onChange={(e) => set('name', e.target.value)} />
        <input className={input} placeholder="Description" value={f.description} onChange={(e) => set('description', e.target.value)} />
        <select className={input} value={f.type} onChange={(e) => set('type', e.target.value)}>
          <option value="11">Shirt</option><option value="12">Pants</option><option value="2">T-Shirt</option>
        </select>
        <select className={input} value={f.genre} onChange={(e) => set('genre', e.target.value)}>
          <option value="">Genre…</option>
          {Object.entries(genres || {}).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <input ref={fileRef} type="file" accept="image/*" className="text-sm" />
        <input className={input} placeholder="Price (optional)" value={f.price} onChange={(e) => set('price', e.target.value)} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isForSale} onChange={(e) => set('isForSale', e.target.checked)} /> For sale</label>
        {msg ? <p className="text-sm text-negative">{msg}</p> : null}
        <div><Button disabled={busy || !f.name} onClick={submit}>{busy ? 'Creating…' : 'Create Asset'}</Button></div>
      </Card>
    </div>
  );
}
