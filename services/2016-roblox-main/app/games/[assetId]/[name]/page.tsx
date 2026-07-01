'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { multiGetPlaceDetails, multiGetUniverseDetails } from '../../../../services/games';
import GameDetail from './_components/GameDetail';

/**
 * Game details (App Router port of the assetType-9 branch of sharedAssetPage). The route id is a
 * placeId; we resolve place → universe directly rather than going through getItemDetails' 406 path.
 */
export default function GameDetailPage() {
  const params = useParams();
  const placeId = Number(Array.isArray(params?.assetId) ? params?.assetId[0] : params?.assetId);

  const { data, error, isLoading } = useQuery({
    queryKey: ['game-detail', placeId],
    enabled: Number.isFinite(placeId),
    queryFn: async () => {
      const places = await multiGetPlaceDetails({ placeIds: [placeId] });
      const place = places?.[0];
      if (!place) throw new Error('Game not found');
      const universes = await multiGetUniverseDetails({ universeIds: [place.universeId] });
      const universe = universes?.[0];
      if (!universe) throw new Error('Game universe not found');
      return { place, universe };
    },
  });

  if (isLoading) return <p className="text-text-muted">Loading…</p>;
  if (error) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <h1 className="text-xl font-bold">Error loading game</h1>
        <p className="mt-2 text-text-muted">{(error as Error).message}</p>
      </div>
    );
  }
  if (!data) return null;
  return <GameDetail place={data.place} universe={data.universe} />;
}
