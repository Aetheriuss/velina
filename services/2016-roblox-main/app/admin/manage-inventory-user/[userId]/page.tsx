'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminGet, adminPost } from '../../../../lib/adminClient';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

interface Collectible { asset_id: number; name: string; user_asset_id: number }

export default function ManageInventoryPage() {
  const params = useParams();
  const userId = String(Array.isArray(params?.userId) ? params?.userId[0] : params?.userId);
  const { data, refetch } = useQuery({ queryKey: ['admin-user-collectibles', userId], queryFn: () => adminGet<Collectible[]>(`/user-collectibles?userId=${userId}`) });
  const owned = data || [];
  const [assetId, setAssetId] = useState('');
  const [copies, setCopies] = useState('1');
  const [giveSerial, setGiveSerial] = useState('true');
  const [msg, setMsg] = useState<string | null>(null);

  const give = async () => {
    setMsg(null);
    try { await adminPost('/giveitem', { userId: Number(userId), assetId: parseInt(assetId, 10), copies: parseInt(copies, 10) || 1, giveSerial: giveSerial === 'true' }); setMsg('Item(s) given.'); refetch(); }
    catch (e) { setMsg((e as Error).message); }
  };
  const remove = async (uaid: number) => { setMsg(null); try { await adminPost('/removeitem', { userId: Number(userId), userAssetId: uaid }); refetch(); } catch (e) { setMsg((e as Error).message); } };

  const input = 'rounded-rbx border border-border bg-surface px-3 py-2';
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Manage Inventory</h1>
      {msg ? <p className="text-sm text-text-muted">{msg}</p> : null}
      <Card className="flex flex-col gap-2">
        <h2 className="font-semibold">Give Item</h2>
        <div className="flex flex-wrap gap-2">
          <input className={`${input} w-32`} placeholder="Asset ID" value={assetId} onChange={(e) => setAssetId(e.target.value)} />
          <input className={`${input} w-24`} type="number" min={1} value={copies} onChange={(e) => setCopies(e.target.value)} />
          <select className={input} value={giveSerial} onChange={(e) => setGiveSerial(e.target.value)}><option value="true">With serial</option><option value="false">No serial</option></select>
          <Button size="sm" disabled={!assetId} onClick={give}>Give</Button>
        </div>
      </Card>
      <Card className="flex flex-col gap-2">
        <h2 className="font-semibold">Owned Collectibles ({owned.length})</h2>
        {owned.length === 0 ? <p className="text-sm text-text-muted">None.</p> : (
          <div className="flex flex-col gap-1 text-sm">
            {owned.map((it) => (
              <div key={it.user_asset_id} className="flex items-center justify-between">
                <span className="truncate">{it.name} <span className="text-text-muted">(UAID {it.user_asset_id})</span></span>
                <button type="button" onClick={() => remove(it.user_asset_id)} className="text-negative hover:underline">Remove</button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
