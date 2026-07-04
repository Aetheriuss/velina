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
        <h1 className="text-2xl font-semibold text-text">{details.name}</h1>
        {subtitle ? <p className="text-sm text-text-muted">{subtitle}</p> : null}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: thumbnail + creator + description */}
        <div className="flex min-w-0 flex-col gap-6">
          <Card flush className="overflow-hidden">
            <div className="aspect-square w-full overflow-hidden rounded-rbx bg-surface-alt">
              {thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbUrl} alt={details.name} className="h-full w-full object-contain" />
              ) : null}
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm text-text-muted">Creator</p>
              <a
                href={
                  details.creatorType === 'Group'
                    ? `/My/Groups.aspx?gid=${details.creatorTargetId}`
                    : `/users/${details.creatorTargetId}/profile`
                }
                className="font-semibold text-accent hover:underline"
              >
                {details.creatorName}
              </a>
            </div>
            {isAuthenticated ? (
              <Button size="sm" variant="ghost" onClick={toggleFavorite}>
                <span aria-hidden>{favorited ? '♥' : '♡'}</span>
                {favorited ? 'Favorited' : 'Favorite'}
                <span className="text-text-muted">({(details.favoriteCount ?? 0).toLocaleString()})</span>
              </Button>
            ) : (
              <span className="text-sm text-text-muted">♥ {(details.favoriteCount ?? 0).toLocaleString()}</span>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text">Description</h2>
            <p className="mt-1 whitespace-pre-wrap text-text">
              {details.description || 'No description available.'}
            </p>
            {details.genres && details.genres.length ? (
              <p className="mt-3 text-sm text-text-muted">Genres: {details.genres.join(', ')}</p>
            ) : null}
          </div>
        </div>

        {/* Right rail: price + buy */}
        <div className="flex flex-col gap-3">
          <Card>
            {canBuyFromCreator ? (
              <>
                <p className="text-xl font-semibold text-positive">
                  {details.price === 0 ? 'Free' : `R$ ${(details.price ?? 0).toLocaleString()}`}
                </p>
                <Button
                  variant="positive"
                  className="mt-3 w-full"
                  onClick={startCreatorBuy}
                  disabled={!isAuthenticated}
                >
                  {details.price === 0 ? 'Take One' : 'Buy'}
                </Button>
              </>
            ) : limited ? (
              <p className="text-sm text-text-muted">Not sold by the creator. See private sellers below.</p>
            ) : (
              <p className="text-sm text-text-muted">This item is offsale.</p>
            )}
            {details.saleCount != null ? (
              <p className="mt-3 text-xs text-text-muted">Sales: {details.saleCount.toLocaleString()}</p>
            ) : null}
          </Card>
        </div>
      </div>

      {limited ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-text">Private Sales</h2>
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
        <h2 className="mb-3 text-lg font-semibold text-text">Recommended</h2>
        <Recommendations assetId={assetId} assetTypeId={details.assetType ?? 0} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-text">Comments</h2>
        <Card>
          <Comments assetId={assetId} />
        </Card>
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
