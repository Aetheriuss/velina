import React from 'react';
import { getItemUrl } from '../../../services/catalog';
import { ItemDetails, isLimited, isLimitedUnique } from '../_types';
import Card from '../../../components/ui/Card';

function PriceLabel({ item }: { item: ItemDetails }) {
  const limited = isLimited(item);
  if (item.isForSale && item.price != null) {
    return <span className="font-semibold text-positive">{item.price === 0 ? 'Free' : `R$ ${item.price.toLocaleString()}`}</span>;
  }
  if (limited && item.lowestPrice != null) {
    return <span className="font-semibold text-positive">R$ {item.lowestPrice.toLocaleString()}</span>;
  }
  return <span className="text-text-muted">Offsale</span>;
}

/** Catalog grid card (2020 re-skin). Links into the item details page. */
export default function CatalogCard({ item, thumbUrl }: { item: ItemDetails; thumbUrl?: string }) {
  return (
    <a href={getItemUrl({ assetId: item.id, name: item.name })} className="group block">
      <Card
        flush
        className="overflow-hidden transition-all duration-150 group-hover:-translate-y-0.5 group-hover:shadow-rbx-hover"
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-t-rbx bg-surface-alt">
          {thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbUrl} alt={item.name} className="h-full w-full object-contain" />
          ) : null}
          {isLimited(item) ? (
            <span
              className={`absolute right-1 top-1 rounded px-1 text-[10px] font-bold text-white ${
                isLimitedUnique(item) ? 'bg-[#c9a227]' : 'bg-[#0a9b0a]'
              }`}
            >
              {isLimitedUnique(item) ? 'LIMITED U' : 'LIMITED'}
            </span>
          ) : null}
        </div>
        <div className="p-2">
          <p className="truncate text-sm font-semibold leading-tight text-text" title={item.name}>
            {item.name}
          </p>
          <p className="truncate text-xs text-text-muted" title={item.creatorName}>
            @{item.creatorName}
          </p>
          <p className="mt-1 text-sm">
            <PriceLabel item={item} />
          </p>
        </div>
      </Card>
    </a>
  );
}
