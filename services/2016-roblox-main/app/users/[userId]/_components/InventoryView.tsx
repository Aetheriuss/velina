'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getInventory, getFavorites } from '../../../../services/inventory';
import { getUserInfo } from '../../../../services/users';
import { getItemUrl } from '../../../../services/catalog';
import { multiGetAssetThumbnails } from '../../../../services/thumbnails';
import { buildThumbMap } from '../../../../lib/thumbnailMap';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

const CATEGORIES: Array<{ name: string; value: number }> = [
  { name: 'Hats', value: 8 },
  { name: 'Hair', value: 41 },
  { name: 'Face Accessory', value: 42 },
  { name: 'Neck', value: 43 },
  { name: 'Shoulder', value: 44 },
  { name: 'Front', value: 45 },
  { name: 'Back', value: 46 },
  { name: 'Waist', value: 47 },
  { name: 'Heads', value: 17 },
  { name: 'Faces', value: 18 },
  { name: 'Gear', value: 19 },
  { name: 'T-Shirts', value: 2 },
  { name: 'Shirts', value: 11 },
  { name: 'Pants', value: 12 },
  { name: 'Torsos', value: 27 },
  { name: 'Packages', value: 32 },
];

interface InvItem {
  Item: { AssetId: number; Name: string };
  Product?: { SerialNumber?: number | null };
  Creator?: { Id: number; Name: string; Type: string };
  AssetRestrictionIcon?: { CssTag?: string };
}

export default function InventoryView({ userId, mode }: { userId: number; mode: 'Inventory' | 'Favorites' }) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const initialCursor: string | number = mode === 'Favorites' ? 1 : '';
  const [cursor, setCursor] = useState<string | number>(initialCursor);

  const { data: userInfo } = useQuery({
    queryKey: ['user-info', userId],
    queryFn: () => getUserInfo({ userId }),
  });

  const { data, isFetching } = useQuery({
    queryKey: ['inv', mode, userId, category.value, cursor],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const fn = mode === 'Inventory' ? getInventory : getFavorites;
      const res = await fn({ userId, limit: 24, cursor, assetTypeId: category.value });
      return res.Data as {
        Items: InvItem[];
        TotalItems?: number | null;
        nextPageCursor: string | number | null;
        previousPageCursor: string | number | null;
      };
    },
  });

  const items = data?.Items || [];
  const ids = useMemo(() => items.map((i) => i.Item.AssetId), [items]);
  const { data: thumbs } = useQuery({
    queryKey: ['inv-thumbs', ids],
    queryFn: () => multiGetAssetThumbnails({ assetIds: ids }),
    enabled: ids.length > 0,
  });
  const thumbMap = useMemo(() => buildThumbMap(thumbs), [thumbs]);

  const pickCategory = (c: { name: string; value: number }) => {
    setCategory(c);
    setCursor(initialCursor);
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-text">
        {userInfo?.name ? `${userInfo.name}'s ` : ''}
        {mode}
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <Card flush className="h-fit overflow-hidden">
          <nav className="flex flex-row flex-wrap gap-1 p-1 lg:flex-col lg:gap-0 lg:p-0 lg:py-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => pickCategory(c)}
                className={`flex h-10 items-center rounded-rbx px-4 text-left text-sm lg:rounded-none ${
                  c.value === category.value
                    ? 'relative bg-sidebar-active font-semibold text-accent lg:before:absolute lg:before:left-0 lg:before:top-0 lg:before:h-full lg:before:w-[3px] lg:before:bg-accent'
                    : 'text-text hover:bg-sidebar-hover'
                }`}
              >
                {c.name}
              </button>
            ))}
          </nav>
        </Card>

        <div className="min-w-0">
          {isFetching && items.length === 0 ? (
            <p className="text-text-muted">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-text-muted">No {category.name.toLowerCase()} to show.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {items.map((it) => (
                <a key={it.Item.AssetId} href={getItemUrl({ assetId: it.Item.AssetId, name: it.Item.Name })} className="group block">
                  <div className="overflow-hidden rounded-rbx border border-border bg-surface shadow-rbx transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:shadow-rbx-hover">
                    <div className="aspect-square w-full overflow-hidden rounded-t-rbx bg-surface-alt">
                      {thumbMap[it.Item.AssetId] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbMap[it.Item.AssetId]} alt={it.Item.Name} className="h-full w-full object-contain" />
                      ) : null}
                    </div>
                    <div className="p-2">
                      <p className="truncate text-sm font-semibold text-text" title={it.Item.Name}>
                        {it.Item.Name}
                      </p>
                      {it.Creator?.Name ? (
                        <p className="truncate text-xs text-text-muted">@{it.Creator.Name}</p>
                      ) : null}
                      {it.Product?.SerialNumber != null ? (
                        <p className="text-xs text-text-muted">#{it.Product.SerialNumber}</p>
                      ) : null}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              variant="secondary"
              disabled={!data?.previousPageCursor || isFetching}
              onClick={() => data?.previousPageCursor != null && setCursor(data.previousPageCursor)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={!data?.nextPageCursor || isFetching || items.length === 0}
              onClick={() => data?.nextPageCursor != null && setCursor(data.nextPageCursor)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
