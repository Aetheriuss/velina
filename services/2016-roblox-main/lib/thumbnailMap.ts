/**
 * Helpers for the batch thumbnail/icon endpoints (services/thumbnails.js), which
 * all return arrays of { targetId, imageUrl }. Builds a targetId→imageUrl lookup
 * so list components can resolve images without scanning the array per item.
 */
export interface ThumbResult {
  targetId: number;
  imageUrl: string;
  state?: string;
}

export const buildThumbMap = (results: ThumbResult[] | undefined | null): Record<number, string> => {
  const map: Record<number, string> = {};
  (results || []).forEach((r) => {
    if (r && typeof r.imageUrl === 'string') map[r.targetId] = r.imageUrl;
  });
  return map;
};
