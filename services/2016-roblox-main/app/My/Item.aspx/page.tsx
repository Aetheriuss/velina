'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getItemDetails } from '../../../services/catalog';
import { updateAsset, setAssetPrice, getAllGenres } from '../../../services/develop';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

function ConfigureInner() {
  const searchParams = useSearchParams();
  const assetId = Number(searchParams?.get('id') || 0);

  const { data: details } = useQuery({
    queryKey: ['configure-item', assetId],
    enabled: assetId > 0,
    queryFn: async () => (await getItemDetails([assetId])).data.data[0],
  });
  const { data: allGenres } = useQuery({
    queryKey: ['all-genres'],
    queryFn: async () => {
      const r = await getAllGenres();
      return (Array.isArray(r) ? r : r?.data || []) as string[];
    },
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isForSale, setIsForSale] = useState(false);
  const [price, setPrice] = useState('0');
  const [comments, setComments] = useState(true);
  const [genres, setGenres] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!details) return;
    setName(details.name || '');
    setDescription(details.description || '');
    setIsForSale(!!details.isForSale);
    setPrice(String(details.price ?? 0));
    setComments(details.commentsEnabled !== false);
    setGenres(details.genres || []);
  }, [details]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const robux = isForSale ? parseInt(price, 10) || 0 : null;
      await Promise.all([
        setAssetPrice({ assetId, priceInRobux: robux, priceInTickets: null }),
        updateAsset({ assetId, name, description, genres, isCopyingAllowed: false, enableComments: comments }),
      ]);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (!assetId) return <p className="text-text-muted">No item specified.</p>;
  if (!details) return <p className="text-text-muted">Loading…</p>;

  const fee = isForSale ? Math.max(1, Math.floor((parseInt(price, 10) || 0) * 0.3)) : 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-3xl font-black">Configure Item</h1>
      <Card className="flex flex-col gap-3">
        <label className="text-sm text-text-muted">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-rbx border border-border bg-surface px-3 py-2" />
        <label className="text-sm text-text-muted">Description</label>
        <textarea value={description} rows={4} onChange={(e) => setDescription(e.target.value)} className="rounded-rbx border border-border bg-surface px-3 py-2" />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isForSale} onChange={(e) => setIsForSale(e.target.checked)} /> Sell this item
        </label>
        {isForSale ? (
          <div>
            <label className="text-sm text-text-muted">Price (Robux)</label>
            <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className="w-40 rounded-rbx border border-border bg-surface px-3 py-2" />
            <p className="mt-1 text-xs text-text-muted">Marketplace fee (30%): R$ {fee.toLocaleString()} · You earn: R$ {Math.max(0, (parseInt(price, 10) || 0) - fee).toLocaleString()}</p>
          </div>
        ) : null}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={comments} onChange={(e) => setComments(e.target.checked)} /> Allow comments
        </label>

        {allGenres && allGenres.length ? (
          <div>
            <label className="text-sm text-text-muted">Genres</label>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {allGenres.map((g) => (
                <label key={g} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={genres.includes(g)}
                    onChange={(e) => setGenres((prev) => (e.target.checked ? [...prev, g] : prev.filter((x) => x !== g)))}
                  />
                  {g}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {error ? <p className="text-sm text-negative">{error}</p> : null}
        {saved ? <p className="text-sm text-positive">Saved.</p> : null}
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          <a href={`/catalog/${assetId}/-`}><Button variant="ghost">View item</Button></a>
        </div>
      </Card>
    </div>
  );
}

export default function ConfigureItemPage() {
  return (
    <Suspense fallback={null}>
      <ConfigureInner />
    </Suspense>
  );
}
