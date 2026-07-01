'use client';

import React, { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getCollectibleInventory } from '../../../services/inventory';
import { getUserInfo } from '../../../services/users';
import { getItemUrl } from '../../../services/catalog';
import { multiGetAssetThumbnails } from '../../../services/thumbnails';
import { buildThumbMap } from '../../../lib/thumbnailMap';
import Card from '../../../components/ui/Card';

interface Collectible {
  userAssetId: number;
  assetId: number;
  name: string;
  recentAveragePrice?: number;
  serialNumber?: number | null;
}

function Inner() {
  const searchParams = useSearchParams();
  const userId = Number(searchParams?.get('userId') || 0);

  const { data: userInfo } = useQuery({ queryKey: ['user-info', userId], queryFn: () => getUserInfo({ userId }), enabled: userId > 0 });
  const { data: items } = useQuery<Collectible[]>({
    queryKey: ['collectibles-view', userId],
    enabled: userId > 0,
    queryFn: async () => {
      const res = await getCollectibleInventory({ userId, cursor: '', limit: 100, assetTypeId: 'null' });
      return (res.data || []) as Collectible[];
    },
  });

  const list = items || [];
  const totalRap = useMemo(() => list.reduce((s, i) => s + (i.recentAveragePrice || 0), 0), [list]);
  const ids = useMemo(() => list.map((i) => i.assetId), [list]);
  const { data: thumbs } = useQuery({ queryKey: ['coll-view-thumbs', ids], queryFn: () => multiGetAssetThumbnails({ assetIds: ids }), enabled: ids.length > 0 });
  const thumbMap = buildThumbMap(thumbs);

  if (!userId) return <p className="text-text-muted">No user specified.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-black">{userInfo?.name ? `${userInfo.name}'s Collectibles` : 'Collectibles'}</h1>
        <p className="text-text-muted">Total RAP (first 100 shown): R$ {totalRap.toLocaleString()}</p>
      </div>
      {list.length === 0 ? (
        <p className="text-text-muted">No collectibles.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {list.map((it) => (
            <a key={it.userAssetId} href={getItemUrl({ assetId: it.assetId, name: it.name })}>
              <Card flush className="overflow-hidden">
                <div className="aspect-square w-full bg-surface-alt">
                  {thumbMap[it.assetId] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbMap[it.assetId]} alt={it.name} className="h-full w-full object-contain" />
                  ) : null}
                </div>
                <div className="p-2">
                  <p className="truncate text-sm font-medium" title={it.name}>{it.name}</p>
                  {it.recentAveragePrice != null ? <p className="text-xs text-text-muted">RAP {it.recentAveragePrice.toLocaleString()}</p> : null}
                  {it.serialNumber != null ? <p className="text-xs text-text-muted">#{it.serialNumber}</p> : null}
                </div>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CollectiblesPage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
