'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRecommendations, getItemUrl } from '../../../../../services/catalog';
import { multiGetAssetThumbnails } from '../../../../../services/thumbnails';
import { buildThumbMap } from '../../../../../lib/thumbnailMap';

interface Rec {
  item: { assetId: number; name: string };
  creator?: { name?: string };
}

export default function Recommendations({ assetId, assetTypeId }: { assetId: number; assetTypeId: number }) {
  const { data } = useQuery<Rec[]>({
    queryKey: ['recommendations', assetId, assetTypeId],
    queryFn: async () => {
      const res = await getRecommendations({ assetId, assetTypeId, limit: 6 });
      return (res.data || []) as Rec[];
    },
  });

  const ids = useMemo(() => (data || []).map((r) => r.item.assetId), [data]);
  const { data: thumbs } = useQuery({
    queryKey: ['rec-thumbs', ids],
    queryFn: () => multiGetAssetThumbnails({ assetIds: ids }),
    enabled: ids.length > 0,
  });
  const thumbMap = useMemo(() => buildThumbMap(thumbs), [thumbs]);

  if (!data || data.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {data.map((r) => (
        <a key={r.item.assetId} href={getItemUrl({ assetId: r.item.assetId, name: r.item.name })} className="block">
          <div className="aspect-square overflow-hidden rounded-rbx border border-border bg-surface-alt">
            {thumbMap[r.item.assetId] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbMap[r.item.assetId]} alt={r.item.name} className="h-full w-full object-contain" />
            ) : null}
          </div>
          <p className="mt-1 truncate text-xs" title={r.item.name}>
            {r.item.name}
          </p>
        </a>
      ))}
    </div>
  );
}
