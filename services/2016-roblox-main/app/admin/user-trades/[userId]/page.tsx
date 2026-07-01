'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { adminGet } from '../../../../lib/adminClient';
import dayjs from '../../../../lib/dayjs';

interface TradeItem { userId: number; name: string; serial?: number | null; userAssetId: number; assetId: number }
interface TradeRow {
  trade: { id: number; partnerId: number; partnerUsername: string; status: string; createdAt: string };
  db?: { userOneRobux?: number; userTwoRobux?: number; usernameOne?: string; usernameTwo?: string };
  items: TradeItem[];
}
const LIMIT = 20;

export default function UserTradesPage() {
  const params = useParams();
  const userId = String(Array.isArray(params?.userId) ? params?.userId[0] : params?.userId);
  const [type, setType] = useState('Completed');
  const [offset, setOffset] = useState(0);

  const { data, isFetching } = useQuery({
    queryKey: ['admin-trades', userId, type, offset],
    placeholderData: keepPreviousData,
    queryFn: () => adminGet<TradeRow[]>(`/users/${userId}/trades?type=${type}&offset=${offset}&limit=${LIMIT}`),
  });
  const rows = data || [];
  const sel = 'rounded-rbx border border-border bg-surface px-2 py-1.5 text-sm';

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-black">Trades — User {userId}</h1>
      <select className={`${sel} w-40`} value={type} onChange={(e) => { setType(e.target.value); setOffset(0); }}>
        {['Inbound', 'Outbound', 'Completed', 'Inactive'].map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-text-muted"><tr className="border-b border-border"><th className="py-2">ID</th><th>Status</th><th>Date</th><th>Partner</th><th>Items</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.trade.id} className="border-b border-border align-top">
                <td className="py-2">{r.trade.id}</td>
                <td>{r.trade.status}</td>
                <td>{dayjs(r.trade.createdAt).format('M/D/YY')}</td>
                <td><a href={`/admin/manage-user/${r.trade.partnerId}`} className="text-accent hover:underline">{r.trade.partnerUsername}</a></td>
                <td className="text-xs text-text-muted">{(r.items || []).map((i) => i.name).join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center gap-3">
        <button type="button" disabled={isFetching || !offset} onClick={() => setOffset((o) => Math.max(0, o - LIMIT))} className="rounded-rbx border border-border px-4 py-1.5 text-sm disabled:opacity-40">Previous</button>
        <span className="text-sm text-text-muted">Page {offset / LIMIT + 1}</span>
        <button type="button" disabled={isFetching || rows.length < LIMIT} onClick={() => setOffset((o) => o + LIMIT)} className="rounded-rbx border border-border px-4 py-1.5 text-sm disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
