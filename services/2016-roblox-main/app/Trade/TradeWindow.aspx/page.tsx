'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '../../../components/providers/AuthProvider';
import { getUserInfo } from '../../../services/users';
import { getCollectibleInventory } from '../../../services/inventory';
import { createTrade, counterTrade } from '../../../services/trades';
import { multiGetAssetThumbnails } from '../../../services/thumbnails';
import { buildThumbMap } from '../../../lib/thumbnailMap';
import getFlag from '../../../lib/getFlag';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

interface Collectible { userAssetId: number; assetId: number; name: string; recentAveragePrice?: number; serialNumber?: number | null }

function InventoryPicker({ userId, selected, onToggle, title }: { userId: number; selected: number[]; onToggle: (i: Collectible) => void; title: string }) {
  const limit = getFlag('tradeWindowInventoryCollectibleLimit', 10) as number;
  const [cursor, setCursor] = useState('');
  const { data, isFetching, error } = useQuery({
    queryKey: ['collectibles', userId, cursor],
    enabled: userId > 0,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await getCollectibleInventory({ userId, cursor, limit, assetTypeId: 'null' });
      return { items: (res.data || []) as Collectible[], next: res.nextPageCursor as string | null };
    },
  });
  const items = data?.items || [];
  const ids = useMemo(() => items.map((i) => i.assetId), [items]);
  const { data: thumbs } = useQuery({ queryKey: ['coll-thumbs', ids], queryFn: () => multiGetAssetThumbnails({ assetIds: ids }), enabled: ids.length > 0 });
  const thumbMap = buildThumbMap(thumbs);

  return (
    <div className="min-w-0">
      <h3 className="mb-2 font-semibold">{title}</h3>
      {error ? <p className="text-sm text-text-muted">Inventory unavailable (private or empty).</p> : items.length === 0 ? (
        <p className="text-sm text-text-muted">{isFetching ? 'Loading…' : 'No tradable items.'}</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map((it) => {
            const on = selected.includes(it.userAssetId);
            return (
              <button key={it.userAssetId} type="button" onClick={() => onToggle(it)} className={`rounded-rbx border p-1 text-left ${on ? 'border-accent bg-accent/10' : 'border-border'}`}>
                <div className="aspect-square w-full overflow-hidden rounded bg-surface-alt">
                  {thumbMap[it.assetId] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbMap[it.assetId]} alt={it.name} className="h-full w-full object-contain" />
                  ) : null}
                </div>
                <p className="truncate text-[11px]" title={it.name}>{it.name}</p>
                {it.recentAveragePrice != null ? <p className="text-[10px] text-text-muted">RAP {it.recentAveragePrice.toLocaleString()}</p> : null}
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-2 flex gap-2">
        <button type="button" disabled={!cursor} onClick={() => setCursor('')} className="text-xs text-accent disabled:opacity-40">First</button>
        <button type="button" disabled={!data?.next} onClick={() => data?.next && setCursor(data.next)} className="text-xs text-accent disabled:opacity-40">Next →</button>
      </div>
    </div>
  );
}

function TradeInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { userId: authId, isAuthenticated, isPending } = useAuth();
  const partnerId = Number(searchParams?.get('TradePartnerID') || 0);
  const counterId = Number(searchParams?.get('TradeSessionId') || 0) || null;

  const { data: partner } = useQuery({ queryKey: ['user-info', partnerId], queryFn: () => getUserInfo({ userId: partnerId }), enabled: partnerId > 0 });

  const [offer, setOffer] = useState<Collectible[]>([]);
  const [request, setRequest] = useState<Collectible[]>([]);
  const [offerRobux, setOfferRobux] = useState('');
  const [requestRobux, setRequestRobux] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const toggle = (list: Collectible[], set: (v: Collectible[]) => void) => (item: Collectible) => {
    if (list.find((x) => x.userAssetId === item.userAssetId)) set(list.filter((x) => x.userAssetId !== item.userAssetId));
    else if (list.length < 4) set([...list, item]);
  };

  if (isPending) return null;
  if (!isAuthenticated || !authId) return <p className="text-center text-text-muted">Please sign in to trade.</p>;
  if (!partnerId) return <p className="text-center text-text-muted">No trade partner specified.</p>;

  const send = async () => {
    setSending(true);
    setFeedback(null);
    const payload = {
      offerUserId: authId,
      offerRobux: parseInt(offerRobux, 10) || 0,
      offerUserAssets: offer.map((i) => i.userAssetId),
      requestUserId: partnerId,
      requestRobux: parseInt(requestRobux, 10) || 0,
      requestUserAssets: request.map((i) => i.userAssetId),
    };
    try {
      if (counterId) await counterTrade({ tradeId: counterId, ...payload });
      else await createTrade(payload);
      router.push('/My/Trades.aspx');
    } catch (e) {
      const err = e as { response?: { data?: { errors?: Array<{ message?: string }> } }; message?: string };
      setFeedback(err.response?.data?.errors?.[0]?.message || err.message || 'Could not send trade.');
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Trading with {partner?.name || `User ${partnerId}`}</h1>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">Your Offer</h2>
          <label className="text-sm text-text-muted">Robux</label>
          <input type="number" min={0} value={offerRobux} onChange={(e) => setOfferRobux(e.target.value)} className="w-32 rounded-rbx border border-border bg-surface px-2 py-1" />
          <p className="text-xs text-text-muted">{offer.length}/4 items selected</p>
          <InventoryPicker userId={authId} selected={offer.map((i) => i.userAssetId)} onToggle={toggle(offer, setOffer)} title="My Inventory" />
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">Your Request</h2>
          <label className="text-sm text-text-muted">Robux</label>
          <input type="number" min={0} value={requestRobux} onChange={(e) => setRequestRobux(e.target.value)} className="w-32 rounded-rbx border border-border bg-surface px-2 py-1" />
          <p className="text-xs text-text-muted">{request.length}/4 items selected</p>
          <InventoryPicker userId={partnerId} selected={request.map((i) => i.userAssetId)} onToggle={toggle(request, setRequest)} title="Partner's Inventory" />
        </Card>
      </div>
      {feedback ? <p className="text-sm text-negative">{feedback}</p> : null}
      <div>
        <Button onClick={send} disabled={sending}>{sending ? 'Sending…' : counterId ? 'Send Counter' : 'Send Trade Request'}</Button>
        <span className="ml-3 text-xs text-text-muted">A 30% fee is taken from Robux amounts.</span>
      </div>
    </div>
  );
}

export default function TradeWindowPage() {
  return <Suspense fallback={null}><TradeInner /></Suspense>;
}
