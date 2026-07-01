'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getItemDetails } from '../../../../services/catalog';
import { getGameUrl } from '../../../../services/games';
import { ItemDetails } from '../../_types';
import CatalogDetail from './_components/CatalogDetail';

/**
 * Item details (App Router port of components/sharedAssetPage + catalogDetailsPage). Places
 * (assetType 9) redirect to the games route (owned by Batch 4b); everything else renders the
 * catalog detail. The legacy place-406 fallback (multiGetPlaceDetails) is not ported here.
 */
export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = Number(Array.isArray(params?.assetId) ? params?.assetId[0] : params?.assetId);

  const { data, error, isLoading } = useQuery<ItemDetails>({
    queryKey: ['item', assetId],
    enabled: Number.isFinite(assetId),
    queryFn: async () => {
      const res = await getItemDetails([assetId]);
      const d = res.data.data[0];
      if (!d) throw new Error('Item not found');
      return d as ItemDetails;
    },
  });

  const isPlace = data?.assetType === 9;
  useEffect(() => {
    if (isPlace && data) router.replace(getGameUrl({ placeId: data.id, name: data.name }));
  }, [isPlace, data, router]);

  if (isLoading) return <p className="text-text-muted">Loading…</p>;
  if (error) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <h1 className="text-xl font-bold">Error loading item</h1>
        <p className="mt-2 text-text-muted">{(error as Error).message}</p>
      </div>
    );
  }
  if (!data || isPlace) return null;
  return <CatalogDetail details={data} />;
}
