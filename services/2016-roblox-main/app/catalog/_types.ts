/** Shape of an entry from POST /v1/catalog/items/details (fields actually read in the UI). */
export interface ItemDetails {
  id: number;
  name: string;
  price?: number | null;
  priceTickets?: number | null;
  isForSale?: boolean;
  lowestPrice?: number | null;
  unitsAvailableForConsumption?: number | null;
  itemRestrictions?: string[];
  creatorTargetId?: number;
  creatorName?: string;
  creatorType?: string;
  assetType?: number;
  favoriteCount?: number;
  saleCount?: number;
  offsaleDeadline?: string | null;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  genres?: string[];
  productId?: number;
  itemType?: string;
}

export const isLimited = (i: ItemDetails): boolean =>
  !!i.itemRestrictions &&
  (i.itemRestrictions.includes('Limited') || i.itemRestrictions.includes('LimitedUnique'));

export const isLimitedUnique = (i: ItemDetails): boolean =>
  !!i.itemRestrictions && i.itemRestrictions.includes('LimitedUnique');
