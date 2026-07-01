'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../components/providers/AuthProvider';
import { getMyAvatar, setWearingAssets, redrawMyAvatar, getOutfits, wearOutfit, createOutfit, deleteOutfit } from '../../../services/avatar';
import { getInventory } from '../../../services/inventory';
import { multiGetUserThumbnails, multiGetAssetThumbnails } from '../../../services/thumbnails';
import { buildThumbMap } from '../../../lib/thumbnailMap';
import getFlag from '../../../lib/getFlag';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

interface WornAsset { id: number; name: string; assetType?: { id: number; name: string } }
const WARDROBE = [
  { name: 'Hats', value: 8 }, { name: 'Hair', value: 41 }, { name: 'Face', value: 42 }, { name: 'Neck', value: 43 },
  { name: 'Shoulder', value: 44 }, { name: 'Front', value: 45 }, { name: 'Back', value: 46 }, { name: 'Waist', value: 47 },
  { name: 'T-Shirts', value: 2 }, { name: 'Shirts', value: 11 }, { name: 'Pants', value: 12 }, { name: 'Gear', value: 19 },
  { name: 'Heads', value: 17 }, { name: 'Faces', value: 18 },
];

export default function CharacterPage() {
  const { userId, isAuthenticated, isPending } = useAuth();
  const queryClient = useQueryClient();
  const limit = getFlag('avatarPageInventoryLimit', 10) as number;

  const avatarKey = ['my-avatar'];
  const { data: avatar } = useQuery({ queryKey: avatarKey, queryFn: getMyAvatar, enabled: isAuthenticated });
  const wearing: WornAsset[] = avatar?.assets || [];
  const wearingIds = useMemo(() => wearing.map((a) => a.id), [wearing]);

  const { data: thumb } = useQuery({
    queryKey: ['my-avatar-thumb', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await multiGetUserThumbnails({ userIds: [userId as number] });
      return res[0] as { imageUrl: string; state: string } | undefined;
    },
    refetchInterval: (q) => (q.state.data && q.state.data.state !== 'Completed' ? 2500 : false),
  });

  const [tab, setTab] = useState<'Wardrobe' | 'Outfits'>('Wardrobe');
  const [category, setCategory] = useState(WARDROBE[0]);
  const [cursor, setCursor] = useState('');

  const { data: inv } = useQuery({
    queryKey: ['wardrobe', userId, category.value, cursor],
    enabled: !!userId && tab === 'Wardrobe',
    queryFn: async () => (await getInventory({ userId: userId as number, limit, cursor, assetTypeId: category.value })).Data,
  });
  const invItems: Array<{ Item: { AssetId: number; Name: string } }> = inv?.Items || [];
  const invIds = useMemo(() => invItems.map((i) => i.Item.AssetId), [invItems]);
  const { data: invThumbs } = useQuery({ queryKey: ['wardrobe-thumbs', invIds], queryFn: () => multiGetAssetThumbnails({ assetIds: invIds }), enabled: invIds.length > 0 });
  const invThumbMap = buildThumbMap(invThumbs);

  const { data: outfits } = useQuery({
    queryKey: ['my-outfits', userId],
    enabled: !!userId && tab === 'Outfits',
    queryFn: async () => (await getOutfits({ userId: userId as number })).data as Array<{ id: number; name: string }>,
  });

  if (isPending) return null;
  if (!isAuthenticated) return <p className="text-center text-text-muted">Please sign in to customize your avatar.</p>;

  const refreshAvatar = () => queryClient.invalidateQueries({ queryKey: avatarKey });
  const setWear = async (ids: number[]) => { await setWearingAssets({ assetIds: ids }); refreshAvatar(); };
  const wear = (id: number) => setWear([...new Set([...wearingIds, id])]);
  const remove = (id: number) => setWear(wearingIds.filter((x) => x !== id));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
      <div className="flex flex-col gap-3">
        <Card flush className="overflow-hidden">
          <div className="aspect-square w-full bg-surface-alt">
            {thumb?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb.imageUrl} alt="Your avatar" className="h-full w-full object-contain" />
            ) : null}
          </div>
        </Card>
        <Button variant="secondary" size="sm" onClick={async () => { await redrawMyAvatar(); queryClient.invalidateQueries({ queryKey: ['my-avatar-thumb', userId] }); }}>
          Redraw avatar
        </Button>
        <Card>
          <h2 className="mb-2 font-semibold">Currently Wearing</h2>
          {wearing.length === 0 ? <p className="text-sm text-text-muted">Nothing worn.</p> : (
            <ul className="flex flex-col gap-1 text-sm">
              {wearing.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{a.name}</span>
                  <button type="button" onClick={() => remove(a.id)} className="text-negative hover:underline">Remove</button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="min-w-0">
        <div className="mb-3 flex gap-2">
          {(['Wardrobe', 'Outfits'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-rbx px-3 py-1.5 text-sm font-semibold ${tab === t ? 'bg-accent text-white' : 'bg-surface-alt hover:bg-surface'}`}>{t}</button>
          ))}
        </div>

        {tab === 'Wardrobe' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[140px_1fr]">
            <nav className="flex flex-row flex-wrap gap-1 md:flex-col">
              {WARDROBE.map((c) => (
                <button key={c.value} type="button" onClick={() => { setCategory(c); setCursor(''); }} className={`rounded-rbx px-2 py-1 text-left text-sm ${c.value === category.value ? 'bg-accent/10 font-semibold text-accent' : 'hover:bg-surface-alt'}`}>{c.name}</button>
              ))}
            </nav>
            <div className="min-w-0">
              {invItems.length === 0 ? <p className="text-text-muted">No {category.name.toLowerCase()} owned.</p> : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {invItems.map((it) => (
                    <Card key={it.Item.AssetId} flush className="overflow-hidden">
                      <div className="aspect-square w-full bg-surface-alt">
                        {invThumbMap[it.Item.AssetId] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={invThumbMap[it.Item.AssetId]} alt={it.Item.Name} className="h-full w-full object-contain" />
                        ) : null}
                      </div>
                      <div className="p-2">
                        <p className="truncate text-xs" title={it.Item.Name}>{it.Item.Name}</p>
                        {wearingIds.includes(it.Item.AssetId) ? (
                          <Button size="sm" variant="secondary" className="mt-1 w-full" onClick={() => remove(it.Item.AssetId)}>Remove</Button>
                        ) : (
                          <Button size="sm" className="mt-1 w-full" onClick={() => wear(it.Item.AssetId)}>Wear</Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
              <div className="mt-4 flex justify-center gap-3">
                <button type="button" disabled={!inv?.previousPageCursor} onClick={() => inv?.previousPageCursor && setCursor(inv.previousPageCursor)} className="rounded-rbx border border-border px-4 py-1.5 text-sm disabled:opacity-40">Previous</button>
                <button type="button" disabled={!inv?.nextPageCursor || invItems.length === 0} onClick={() => inv?.nextPageCursor && setCursor(inv.nextPageCursor)} className="rounded-rbx border border-border px-4 py-1.5 text-sm disabled:opacity-40">Next</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <Button size="sm" onClick={async () => { const n = prompt('Outfit name?'); if (n) { await createOutfit({ name: n }); queryClient.invalidateQueries({ queryKey: ['my-outfits', userId] }); } }}>
                Create outfit from current avatar
              </Button>
            </div>
            {!outfits || outfits.length === 0 ? <p className="text-text-muted">No saved outfits.</p> : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {outfits.map((o) => (
                  <Card key={o.id} className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{o.name}</span>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={async () => { await wearOutfit({ outfitId: o.id }); refreshAvatar(); }}>Wear</Button>
                      <Button size="sm" variant="ghost" onClick={async () => { await deleteOutfit({ outfitId: o.id }); queryClient.invalidateQueries({ queryKey: ['my-outfits', userId] }); }}>Delete</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
