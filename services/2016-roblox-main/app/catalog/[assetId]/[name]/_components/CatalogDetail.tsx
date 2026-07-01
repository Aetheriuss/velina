'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../../components/providers/AuthProvider';
import { multiGetAssetThumbnails } from '../../../../../services/thumbnails';
import { getRobux } from '../../../../../services/economy';
import { getIsFavorited, createFavorite, deleteFavorite } from '../../../../../services/catalog';
import { buildThumbMap } from '../../../../../lib/thumbnailMap';
import { ItemDetails, isLimited, isLimitedUnique } from '../../../_types';
import Card from '../../../../../components/ui/Card';
import Button from '../../../../../components/ui/Button';
import BuyModal, { PurchaseTarget } from './BuyModal';
import Resellers from './Resellers';
import Recommendations from './Recommendations';
import Comments from './Comments';

export default function CatalogDetail({ details }: { details: ItemDetails }) {
  const assetId = details.id;
  const { userId, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const limited = isLimited(details);

  const { data: thumbs } = useQuery({
    queryKey: ['item-thumb', assetId],
    queryFn: () => multiGetAssetThumbnails({ assetIds: [assetId] }),
  });
  const thumbUrl = buildThumbMap(thumbs)[assetId];

  const { data: currency } = useQuery({
    queryKey: ['robux', userId],
    queryFn: () => getRobux({ userId: userId as number }),
    enabled: !!userId,
  });
  const balance: number | null = currency?.robux ?? null;

  const favKey = ['favorited', assetId, userId];
  const { data: favorited } = useQuery({
    queryKey: favKey,
    queryFn: async () => !!(await getIsFavorited({ assetId, userId: userId as number })),
    enabled: !!userId,
  });
  const toggleFavorite = async () => {
    if (!userId) return;
    if (favorited) await deleteFavorite({ assetId, userId });
    else await createFavorite({ assetId, userId });
    await queryClient.invalidateQueries({ queryKey: favKey });
  };

  const [buyTarget, setBuyTarget] = useState<PurchaseTarget | null>(null);
  const onPurchased = () => {
    queryClient.invalidateQueries({ queryKey: ['resellers', assetId] });
    queryClient.invalidateQueries({ queryKey: ['robux', userId] });
  };

  const canBuyFromCreator = details.isForSale && details.price != null;
  const startCreatorBuy = () =>
    setBuyTarget({
      productId: details.productId ?? details.id,
      assetId,
      sellerId: details.creatorTargetId,
      userAssetId: null,
      price: details.price ?? 0,
      sellerName: details.creatorName,
      itemName: details.name,
    });

  const subtitle = useMemo(() => {
    const parts: string[] = [];
    if (details.creatorType) parts.push(`By ${details.creatorName}`);
    if (isLimitedUnique(details)) parts.push('Limited Unique');
    else if (limited) parts.push('Limited');
    return parts.join(' · ');
  }, [details, limited]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-black">{details.name}</h1>
        {subtitle ? <p className="text-text-muted">{subtitle}</p> : null}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,320px)_1fr_260px]">
        {/* Thumbnail */}
        <Card flush className="overflow-hidden">
          <div className="aspect-square w-full bg-surface-alt">
            {thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbUrl} alt={details.name} className="h-full w-full object-contain" />
            ) : null}
          </div>
        </Card>

        {/* Creator + description + genres */}
        <div className="min-w-0">
          <p className="text-sm text-text-muted">Creator</p>
          <a
            href={
              details.creatorType === 'Group'
                ? `/My/Groups.aspx?gid=${details.creatorTargetId}`
                : `/users/${details.creatorTargetId}/profile`
            }
            className="font-medium text-accent hover:underline"
          >
            {details.creatorName}
          </a>
          <h2 className="mt-4 text-sm font-semibold text-text-muted">Description</h2>
          <p className="whitespace-pre-wrap">{details.description || 'No description available.'}</p>
          {details.genres && details.genres.length ? (
            <p className="mt-3 text-sm text-text-muted">Genres: {details.genres.join(', ')}</p>
          ) : null}
        </div>

        {/* Buy panel + favorite */}
        <div className="flex flex-col gap-3">
          <Card>
            {canBuyFromCreator ? (
              <>
                <p className="text-lg font-bold text-positive">
                  {details.price === 0 ? 'Free' : `R$ ${(details.price ?? 0).toLocaleString()}`}
                </p>
                <Button className="mt-2 w-full" onClick={startCreatorBuy} disabled={!isAuthenticated}>
                  {details.price === 0 ? 'Take One' : 'Buy'}
                </Button>
              </>
            ) : limited ? (
              <p className="text-sm text-text-muted">Not sold by the creator. See private sellers below.</p>
            ) : (
              <p className="text-sm text-text-muted">This item is offsale.</p>
            )}
            {details.saleCount != null ? (
              <p className="mt-2 text-xs text-text-muted">Sales: {details.saleCount.toLocaleString()}</p>
            ) : null}
          </Card>

          <Card className="flex items-center justify-between">
            <span className="text-sm">
              ⭐ {(details.favoriteCount ?? 0).toLocaleString()}
            </span>
            {isAuthenticated ? (
              <Button size="sm" variant="secondary" onClick={toggleFavorite}>
                {favorited ? 'Unfavorite' : 'Favorite'}
              </Button>
            ) : null}
          </Card>
        </div>
      </div>

      {limited ? (
        <section>
          <h2 className="mb-2 text-xl font-light">Private Sales</h2>
          <Card>
            <Resellers
              assetId={assetId}
              productId={details.productId ?? details.id}
              itemName={details.name}
              onBuy={setBuyTarget}
            />
          </Card>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-xl font-light">Recommended</h2>
        <Recommendations assetId={assetId} assetTypeId={details.assetType ?? 0} />
      </section>

      <section>
        <h2 className="mb-2 text-xl font-light">Comments</h2>
        <Comments assetId={assetId} />
      </section>

      {buyTarget ? (
        <BuyModal
          target={buyTarget}
          balance={balance}
          onClose={() => setBuyTarget(null)}
          onPurchased={onPurchased}
        />
      ) : null}
    </div>
  );
}
