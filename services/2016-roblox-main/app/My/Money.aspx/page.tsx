'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../components/providers/AuthProvider';
import { getTransactions, getTransactionSummary, formatSummaryResponse } from '../../../services/economy';
import dayjs from '../../../lib/dayjs';
import Card from '../../../components/ui/Card';

type Tab = 'Transactions' | 'Summary';
const TX_TYPES = ['Purchase', 'Sale', 'Commission', 'GroupPayout', 'CurrencyPurchase'];
const PERIODS = ['Day', 'Week', 'Month', 'Year'];

interface Tx {
  id: number;
  created: string;
  agent?: { id: number; name: string };
  transactionType?: string;
  currency?: { type: string | number; amount: number };
  details?: { id: number; name: string };
}

function Transactions({ userId }: { userId: number }) {
  const [type, setType] = useState('Sale');
  const [cursors, setCursors] = useState<string[]>(['']);
  const cursor = cursors[cursors.length - 1];

  const { data, isFetching } = useQuery({
    queryKey: ['transactions', userId, type, cursor],
    queryFn: async () => {
      const res = await getTransactions({ userId, cursor, type });
      return { rows: (res.data || []) as Tx[], next: res.nextPageCursor as string | null };
    },
  });
  const rows = data?.rows || [];

  return (
    <div className="flex flex-col gap-3">
      <select value={type} onChange={(e) => { setType(e.target.value); setCursors(['']); }} className="h-9 w-56 rounded-rbx border border-border bg-surface px-2 text-sm">
        {TX_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>

      {isFetching && rows.length === 0 ? (
        <p className="text-text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-text-muted">No transactions.</p>
      ) : (
        <Card flush className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-text-muted">
              <tr className="border-b border-border">
                <th className="px-4 py-2 font-semibold">Date</th><th className="font-semibold">Member</th><th className="font-semibold">Description</th><th className="px-4 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 even:bg-surface-alt">
                  <td className="px-4 py-2">{dayjs(t.created).format('M/D/YY')}</td>
                  <td>{t.agent ? <a href={`/users/${t.agent.id}/profile`} className="text-accent hover:underline">{t.agent.name}</a> : '—'}</td>
                  <td>{t.transactionType} {t.details?.name ? `· ${t.details.name}` : ''}</td>
                  <td className={`px-4 text-right font-semibold ${t.transactionType === 'Purchase' ? 'text-negative' : 'text-positive'}`}>{t.currency ? `${t.currency.type === 2 ? 'Tx' : 'R$'} ${t.currency.amount.toLocaleString()}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div className="flex justify-center gap-3">
        <button type="button" disabled={cursors.length <= 1 || isFetching} onClick={() => setCursors((c) => c.slice(0, -1))} className="h-9 rounded-rbx border border-border bg-surface px-4 text-sm font-medium hover:bg-bg disabled:opacity-40 disabled:pointer-events-none">Previous</button>
        <button type="button" disabled={!data?.next || isFetching} onClick={() => data?.next && setCursors((c) => [...c, data.next as string])} className="h-9 rounded-rbx border border-border bg-surface px-4 text-sm font-medium hover:bg-bg disabled:opacity-40 disabled:pointer-events-none">Next</button>
      </div>
    </div>
  );
}

function Summary({ userId }: { userId: number }) {
  const [period, setPeriod] = useState('Month');
  const { data } = useQuery({
    queryKey: ['tx-summary', userId, period],
    queryFn: async () => {
      const resp = await getTransactionSummary({ userId, timePeriod: period });
      return formatSummaryResponse(resp, 'User') as Array<[string, string]>;
    },
  });
  return (
    <div className="flex flex-col gap-3">
      <select value={period} onChange={(e) => setPeriod(e.target.value)} className="h-9 w-40 rounded-rbx border border-border bg-surface px-2 text-sm">
        {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <Card>
        <table className="w-full text-sm">
          <tbody>
            {(data || []).map(([label, value]) => (
              <tr key={label} className="border-b border-border last:border-0">
                <td className="py-2 text-text-muted">{label}</td>
                <td className="py-2 text-right font-medium">{value || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export default function MoneyPage() {
  const { userId, isAuthenticated, isPending } = useAuth();
  const [tab, setTab] = useState<Tab>('Transactions');
  if (isPending) return null;
  if (!isAuthenticated || !userId) return <p className="text-center text-text-muted">Please sign in to view your money.</p>;

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">My Transactions</h1>
      <div className="flex gap-2">
        {(['Transactions', 'Summary'] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`inline-flex h-9 items-center rounded-rbx px-3 text-sm font-semibold transition-colors ${tab === t ? 'bg-accent text-white' : 'bg-surface border border-border hover:bg-bg'}`}>{t}</button>
        ))}
      </div>
      {tab === 'Transactions' ? <Transactions userId={userId} /> : <Summary userId={userId} />}
      <p className="text-xs text-text-muted">Currency exchange &amp; item trades are available on the dedicated trade pages.</p>
    </div>
  );
}
