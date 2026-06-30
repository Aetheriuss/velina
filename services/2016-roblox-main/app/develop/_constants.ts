/**
 * Asset-type sub-pages of the develop page, mirroring components/develop/constants.js.
 * `view` is the legacy ?View= query value; `assetType` is the upload/creation asset
 * type id (note: Images is View=102 but assetType=1, matching the legacy mapping).
 */
export type DevPageKind = 'games' | 'clothing' | 'ads';

export interface DeveloperPage {
  view: number;
  label: string;
  kind: DevPageKind;
  assetType?: number;
}

export const DEVELOPER_PAGES: DeveloperPage[] = [
  { view: 0, label: 'Games', kind: 'games' },
  { view: 2, label: 'T-Shirts', kind: 'clothing', assetType: 2 },
  { view: 11, label: 'Shirts', kind: 'clothing', assetType: 11 },
  { view: 12, label: 'Pants', kind: 'clothing', assetType: 12 },
  { view: 3, label: 'Audio', kind: 'clothing', assetType: 3 },
  { view: 102, label: 'Images', kind: 'clothing', assetType: 1 },
  { view: 101, label: 'User Ads', kind: 'ads' },
];

export const findDeveloperPage = (view: number): DeveloperPage =>
  DEVELOPER_PAGES.find((p) => p.view === view) || DEVELOPER_PAGES[0];

/** Upload-form copy per clothing/asset type (subset of the legacy detailsMap). */
export const CLOTHING_DETAILS: Record<number, { name: string; namePlural: string; title: string; fileLabel: string; subtext?: string }> = {
  2: { name: 'T-Shirt', namePlural: 'T-Shirts', title: 'a T-Shirt', fileLabel: 'image' },
  11: { name: 'Shirt', namePlural: 'Shirts', title: 'a Shirt', fileLabel: 'image' },
  12: { name: 'Pants', namePlural: 'pants', title: 'Pants', fileLabel: 'image' },
  3: {
    name: 'Audio',
    namePlural: 'audio',
    title: 'Audio',
    fileLabel: '.mp3 or .ogg file',
    subtext:
      'Audio uploads cost 350 Robux regardless of size. Uploads must be less than 7 minutes and smaller than 19.5 MB.',
  },
  1: { name: 'Image', namePlural: 'images', title: 'an Image', fileLabel: '.png or .jpeg' },
};
