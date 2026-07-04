'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '../../../components/providers/AuthProvider';
import { getMyTrades, getTradeDetails, acceptTrade, declineTrade } from '../../../services/trades';
import dayjs from '../../../lib/dayjs';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

type Tab = 'Inbound' | 'Outbound' | 'Completed' | 'Inactive';
interface Trade {
  id: number;
  user?: { id: number; name: string };
  created?: string;
  status?: string;
}
interface Offer {
  user?: { id: number };
  robux?: number;
  userAssets?: Array<{ id: number; assetId: number; name: string }>;
}

function TradeDetail({ tradeId, tab, onAction }: { tradeId: number; tab: Tab; onAction: () => void }) {
  const { data } = useQuery({
    queryKey: ['trade-detail', tradeId],
    queryFn: async () => (await getTradeDetails({ tradeId })) as { offers?: Offer[] },
  });
  const [busy, setBusy] = useState(false);
  const offers = data?.offers || [];
  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2">
      {offers.map((o, i) => (
        <div key={i} className="text-sm">
          <p className="text-text-muted">{i === 0 ? 'Offering' : 'Requesting'}: {o.robux ? `R$ ${o.robux.toLocaleString()}` : ''}</p>
          <p>{(o.userAssets || []).map((a) => a.name).join(', ') || '—'}</p>
        </div>
      ))}
      {tab === 'Inbound' ? (
        <div className="flex gap-2">
          <Button size="sm" variant="positive" disabled={busy} onClick={async () => { setBusy(true); try { await acceptTrade({ tradeId }); onAction(); } finally { setBusy(false); } }}>Accept</Button>
          <Button size="sm" variant="secondary" className="!border-negative !text-negative hover:!bg-negative/10" disabled={busy} onClick={async () => { setBusy(true); try { await declineTrade({ tradeId }); onAction(); } finally { setBusy(false); } }}>Decline</Button>
        </div>
      ) : null}
    </div>
  );
}

export default function TradesPage() {
  const { isAuthenticated, isPending } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('Inbound');
  const [open, setOpen] = useState<number | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['my-trades', tab],
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await getMyTrades({ tradeType: tab, cursor: '' });
      return (res.data || []) as Trade[];
    },
  });

  if (isPending) return null;
  if (!isAuthenticated) return <p className="text-center text-text-muted">Please sign in to view your trades.</p>;

  const trades = data || [];
  const refresh = () => { setOpen(null); queryClient.invalidateQueries({ queryKey: ['my-trades', tab] }); };

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Trades</h1>
      <div className="flex flex-wrap gap-2">
        {(['Inbound', 'Outbound', 'Completed', 'Inactive'] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => { setTab(t); setOpen(null); }} className={`inline-flex h-9 items-center rounded-rbx px-3 text-sm font-semibold transition-colors ${tab === t ? 'bg-accent text-white' : 'bg-surface border border-border hover:bg-bg'}`}>{t}</button>
        ))}
      </div>

      {isFetching && trades.length === 0 ? (
        <p className="text-text-muted">Loading…</p>
      ) : trades.length === 0 ? (
        <p className="text-text-muted">No {tab.toLowerCase()} trades.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {trades.map((t) => (
            <Card key={t.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    Trade with {t.user ? <a href={`/users/${t.user.id}/profile`} className="text-accent hover:underline">{t.user.name}</a> : '—'}
                  </p>
                  {t.created ? <p className="text-xs text-text-muted">{dayjs(t.created).format('M/D/YYYY')}{t.status ? ` · ${t.status}` : ''}</p> : null}
                </div>
                <Button size="sm" variant="secondary" onClick={() => setOpen(open === t.id ? null : t.id)}>{open === t.id ? 'Hide' : 'View'}</Button>
              </div>
              {open === t.id ? <TradeDetail tradeId={t.id} tab={tab} onAction={refresh} /> : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
