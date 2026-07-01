'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminGet, adminPost } from '../../../lib/adminClient';
import { useAdminPerms } from '../../../components/admin/AdminPermissionsProvider';
import dayjs from '../../../lib/dayjs';
import Button from '../../../components/ui/Button';

interface Item { name: string; recentAveragePrice?: number; username?: string; onlineAt?: string }

export default function LotteryPage() {
  const { hasPermission } = useAdminPerms();
  const { data, refetch } = useQuery({ queryKey: ['lottery-items'], enabled: hasPermission('RunLottery'), queryFn: () => adminGet<Item[]>('/lottery/get-items') });
  const items = data || [];
  const [msg, setMsg] = useState<string | null>(null);

  if (!hasPermission('RunLottery')) return <p className="text-text-muted">You do not have permission to run the lottery.</p>;

  const run = async () => {
    setMsg(null);
    try { const r = await adminPost<{ name: string; username: string }>('/lottery/run'); setMsg(`Lottery success! ${r.name} was given to ${r.username}.`); refetch(); }
    catch (e) { setMsg((e as Error).message); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">Lottery</h1>
        <Button size="sm" disabled={items.length === 0} onClick={run}>Run Lottery</Button>
      </div>
      {msg ? <p className="text-sm text-positive">{msg}</p> : null}
      {items.length === 0 ? <p className="text-text-muted">No lottery items.</p> : (
        <table className="w-full text-sm">
          <thead className="text-left text-text-muted"><tr className="border-b border-border"><th className="py-2">Item</th><th>RAP</th><th>Player</th><th>Last Online</th></tr></thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-b border-border">
                <td className="py-2">{it.name}</td>
                <td>{(it.recentAveragePrice ?? 0).toLocaleString()}</td>
                <td>{it.username || '—'}</td>
                <td>{it.onlineAt ? dayjs(it.onlineAt).format('M/D/YY h:mm A') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
