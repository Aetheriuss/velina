/**
 * Catalog navigation + sort options, ported from components/catalogPageNavigation and the
 * catalog store. The catalog API (`/v1/search/items`) accepts category/subcategory as the
 * string tokens below (e.g. "Featured", "Accessories", "gear"/"melee"), so we pass them through
 * verbatim — matching the legacy behavior. Genre filtering is intentionally omitted: the legacy
 * genre checkboxes never reached searchCatalog (no genre param), so they were dead UI.
 */
export interface CatalogNavItem {
  label: string;
  category: string;
  subCategory: string;
}
export interface CatalogNavGroup {
  title: string;
  items: CatalogNavItem[];
}

export const CATALOG_NAV: CatalogNavGroup[] = [
  {
    title: 'Featured',
    items: [
      { label: 'All Featured Items', category: 'Featured', subCategory: '' },
      { label: 'Featured Hats', category: 'Featured', subCategory: 'Accessories' },
      { label: 'Featured Gear', category: 'Featured', subCategory: 'Gear' },
      { label: 'Featured Faces', category: 'Featured', subCategory: 'Faces' },
    ],
  },
  {
    title: 'Collectibles',
    items: [
      { label: 'All Collectibles', category: 'Collectibles', subCategory: '' },
      { label: 'Collectible Faces', category: 'Collectibles', subCategory: 'Faces' },
      { label: 'Collectible Hats', category: 'Collectibles', subCategory: 'Accessories' },
      { label: 'Collectible Gear', category: 'Collectibles', subCategory: 'Gear' },
    ],
  },
  { title: 'All Categories', items: [{ label: 'All Categories', category: 'all', subCategory: 'all' }] },
  {
    title: 'Clothing',
    items: [
      { label: 'All Clothing', category: 'null', subCategory: 'Clothing' },
      { label: 'Hats', category: 'null', subCategory: 'Accessories' },
      { label: 'Shirts', category: 'null', subCategory: 'Shirt' },
      { label: 'T-Shirts', category: 'null', subCategory: 'TeeShirt' },
      { label: 'Pants', category: 'null', subCategory: 'Pants' },
      { label: 'Packages', category: 'null', subCategory: 'Packages' },
    ],
  },
  {
    title: 'Body Parts',
    items: [
      { label: 'All Body Parts', category: 'bodyparts', subCategory: 'All' },
      { label: 'Heads', category: 'bodyparts', subCategory: 'Heads' },
      { label: 'Faces', category: 'bodyparts', subCategory: 'Faces' },
      { label: 'Packages', category: 'bodyparts', subCategory: 'Packages' },
    ],
  },
  {
    title: 'Gear',
    items: [
      { label: 'All Gear', category: 'gear', subCategory: 'all' },
      { label: 'Melee Weapon', category: 'gear', subCategory: 'melee' },
      { label: 'Ranged Weapon', category: 'gear', subCategory: 'ranged' },
      { label: 'Explosive', category: 'gear', subCategory: 'explosive' },
      { label: 'Power Up', category: 'gear', subCategory: 'powerup' },
      { label: 'Navigation Enhancer', category: 'gear', subCategory: 'navigation' },
      { label: 'Musical Instrument', category: 'gear', subCategory: 'musical' },
      { label: 'Social Item', category: 'gear', subCategory: 'social' },
      { label: 'Building Tool', category: 'gear', subCategory: 'building' },
      { label: 'Personal Transport', category: 'gear', subCategory: 'transport' },
    ],
  },
];

export const CATALOG_SORTS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'Relevance' },
  { value: 100, label: 'Most Favorited' },
  { value: 101, label: 'Bestselling' },
  { value: 3, label: 'Recently Updated' },
  { value: 4, label: 'Price (Low to High)' },
  { value: 5, label: 'Price (High to Low)' },
];
