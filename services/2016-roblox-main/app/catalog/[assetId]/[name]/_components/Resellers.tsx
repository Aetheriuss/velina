'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getResellers } from '../../../../../services/economy';
import Button from '../../../../../components/ui/Button';
import type { PurchaseTarget } from './BuyModal';

interface Reseller {
  userAssetId: number;
  serialNumber: number | null;
  price: number;
  seller: { id: number; name: string };
}

/** "Private Sales" list for limited items (first page). Buying opens the shared BuyModal. */
export default function Resellers({
  assetId,
  productId,
  itemName,
  onBuy,
}: {
  assetId: number;
  productId: number;
  itemName: string;
  onBuy: (t: PurchaseTarget) => void;
}) {
  const { data, isLoading } = useQuery<Reseller[]>({
    queryKey: ['resellers', assetId],
    queryFn: async () => {
      const res = await getResellers({ assetId, cursor: '', limit: 10 });
      return (res.data?.data || []) as Reseller[];
    },
  });

  if (isLoading) return <p className="text-text-muted">Loading sellers…</p>;
  if (!data || data.length === 0) return <p className="text-text-muted">No one is selling this item.</p>;

  return (
    <div className="flex flex-col divide-y divide-border">
      {data.map((r) => (
        <div key={r.userAssetId} className="flex items-center gap-3 py-2">
          <a href={`/users/${r.seller.id}/profile`} className="flex-1 truncate text-accent hover:underline">
            {r.seller.name}
          </a>
          {r.serialNumber != null ? (
            <span className="text-xs text-text-muted">#{r.serialNumber}</span>
          ) : null}
          <span className="font-semibold text-positive">R$ {r.price.toLocaleString()}</span>
          <Button
            size="sm"
            onClick={() =>
              onBuy({
                productId,
                assetId,
                sellerId: r.seller.id,
                userAssetId: r.userAssetId,
                price: r.price,
                sellerName: r.seller.name,
                itemName,
              })
            }
          >
            Buy
          </Button>
        </div>
      ))}
    </div>
  );
}
