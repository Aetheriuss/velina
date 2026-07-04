'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { adminGet } from '../../../../lib/adminClient';
import dayjs from '../../../../lib/dayjs';

interface Tx {
  id: number; type: string; subType?: string; createdAt: string;
  userIdTwo?: number; username?: string; amount?: number;
  assetId?: number; assetName?: string; userAssetId?: number;
  oldUsername?: string; newUsername?: string;
}
const LIMIT = 25;

export default function UserTransactionsPage() {
  const params = useParams();
  const userId = String(Array.isArray(params?.userId) ? params?.userId[0] : params?.userId);
  const [type, setType] = useState('All');
  const [offset, setOffset] = useState(0);

  const { data, isFetching } = useQuery({
    queryKey: ['admin-txns', userId, type, offset],
    placeholderData: keepPreviousData,
    queryFn: () => {
      const path = type === 'All'
        ? `/users/${userId}/all-transactions?offset=${offset}&limit=${LIMIT}`
        : `/users/${userId}/transactions?type=${type}&offset=${offset}&limit=${LIMIT}`;
      return adminGet<Tx[]>(path);
    },
  });
  const rows = data || [];
  const sel = 'rounded-rbx border border-border bg-surface px-2 py-1.5 text-sm';

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Transactions — User {userId}</h1>
      <select className={`${sel} w-40`} value={type} onChange={(e) => { setType(e.target.value); setOffset(0); }}>
        {['All', 'Purchase', 'Sale'].map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-text-muted"><tr className="border-b border-border"><th className="py-2">ID</th><th>Type</th><th>Date</th><th>Other</th><th>Amount</th><th>Asset</th></tr></thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-b border-border">
                <td className="py-2">{t.id}</td>
                <td>{t.type}{t.subType ? `/${t.subType}` : ''}</td>
                <td>{t.createdAt ? dayjs(t.createdAt).format('M/D/YY h:mm A') : '—'}</td>
                <td>{t.username ? <a href={`/admin/manage-user/${t.userIdTwo}`} className="text-accent hover:underline">{t.username}</a> : '—'}</td>
                <td>{t.amount != null ? t.amount.toLocaleString() : '—'}</td>
                <td>{t.assetName ? <a href={`/catalog/${t.assetId}/-`} className="hover:underline">{t.assetName}</a> : (t.oldUsername ? `${t.oldUsername}→${t.newUsername}` : '—')}</td>
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
