'use client';

import React, { useState } from 'react';
import { purchaseItem } from '../../../../../services/economy';
import Button from '../../../../../components/ui/Button';

export interface PurchaseTarget {
  productId: number;
  assetId: number;
  sellerId?: number;
  userAssetId?: number | null;
  price: number;
  sellerName?: string;
  itemName: string;
}

type State = 'confirm' | 'pending' | 'ok' | 'insufficient' | 'error';

/** Purchase confirmation modal (ports the CatalogDetailsPageModal flow). Robux (currency 1) only. */
export default function BuyModal({
  target,
  balance,
  onClose,
  onPurchased,
}: {
  target: PurchaseTarget;
  balance: number | null;
  onClose: () => void;
  onPurchased: () => void;
}) {
  const insufficient = balance != null && balance < target.price;
  const [state, setState] = useState<State>(insufficient ? 'insufficient' : 'confirm');
  const [error, setError] = useState<string | null>(null);

  const buy = async () => {
    setState('pending');
    try {
      const res = await purchaseItem({
        productId: target.productId,
        assetId: target.assetId,
        sellerId: target.sellerId,
        userAssetId: target.userAssetId ?? null,
        price: target.price,
        expectedCurrency: 1,
      });
      if (res && res.purchased) {
        setState('ok');
        onPurchased();
      } else if (res && res.reason === 'InsufficientFunds') {
        setState('insufficient');
      } else {
        setError((res && res.reason) || 'Purchase could not be completed.');
        setState('error');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase failed.');
      setState('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-rbx bg-surface p-5 text-text shadow-rbx"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-lg font-bold">Buy Item</h2>
        {state === 'ok' ? (
          <>
            <p className="text-positive">Purchased <strong>{target.itemName}</strong>!</p>
            <div className="mt-4 text-right">
              <Button size="sm" onClick={onClose}>Done</Button>
            </div>
          </>
        ) : state === 'insufficient' ? (
          <>
            <p className="text-negative">You don&apos;t have enough Robux to buy this item.</p>
            <div className="mt-4 text-right">
              <Button size="sm" variant="secondary" onClick={onClose}>Close</Button>
            </div>
          </>
        ) : (
          <>
            <p>
              Buy <strong>{target.itemName}</strong>
              {target.sellerName ? <> from <strong>{target.sellerName}</strong></> : null} for{' '}
              <span className="font-semibold text-positive">R$ {target.price.toLocaleString()}</span>?
            </p>
            {balance != null ? (
              <p className="mt-1 text-sm text-text-muted">Balance: R$ {balance.toLocaleString()}</p>
            ) : null}
            {state === 'error' ? <p className="mt-2 text-sm text-negative">{error}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={onClose} disabled={state === 'pending'}>
                Cancel
              </Button>
              <Button size="sm" variant="positive" onClick={buy} disabled={state === 'pending'}>
                {state === 'pending' ? 'Buying…' : 'Buy Now'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
