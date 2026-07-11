'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminGet, adminPost } from '../../../../lib/adminClient';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

type Kind = 'asset' | 'icon' | 'group';
interface PendingItem { id: number; name?: string; content_url?: string; creatorId?: number; creatorName?: string; asset_id?: number; group_id?: number; kind: Kind; _key: string }

/** Pulls the first integer out of a raw asset id or a catalog/library URL (e.g. "/catalog/123/name" or "123"). */
function parseAssetId(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const slashMatch = trimmed.match(/\/([0-9]+)\//);
  const raw = slashMatch ? slashMatch[1] : (trimmed.match(/[0-9]+/) || [])[0];
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return Number.isFinite(id) ? id : null;
}

export default function AssetApprovalPage() {
  const { data, refetch, isFetching } = useQuery({
    queryKey: ['asset-approval'],
    queryFn: async () => {
      const [assets, icons, groups] = await Promise.all([
        adminGet<PendingItem[]>('/assets/pending-assets').catch(() => [] as PendingItem[]),
        adminGet<PendingItem[]>('/icons/pending-assets').catch(() => [] as PendingItem[]),
        adminGet<PendingItem[]>('/groups/pending-icons').catch(() => [] as PendingItem[]),
      ]);
      return [
        ...(assets || []).map((x, i) => ({ ...x, kind: 'asset' as Kind, _key: `a${x.id}-${i}` })),
        ...(icons || []).map((x, i) => ({ ...x, kind: 'icon' as Kind, _key: `i${x.id}-${i}` })),
        ...(groups || []).map((x, i) => ({ ...x, kind: 'group' as Kind, _key: `g${x.id}-${i}` })),
      ];
    },
  });
  const [done, setDone] = useState<Set<string>>(new Set());
  const items = useMemo(() => (data || []).filter((x) => !done.has(x._key)), [data, done]);

  const [manualUrl, setManualUrl] = useState('');
  const [manualItem, setManualItem] = useState<PendingItem | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualLoading, setManualLoading] = useState(false);

  const moderate = async (item: PendingItem, approved: boolean, is18Plus: boolean, del = false) => {
    try {
      if (item.kind === 'asset') await adminPost(del ? '/asset/moderate-and-delete' : '/asset/moderate', { isApproved: approved, assetId: item.asset_id ?? item.id, is18Plus });
      else if (item.kind === 'icon') await adminPost('/icon/moderate', { isApproved: approved, iconId: item.id, is18Plus });
      else await adminPost('/groups/icon-toggle', { groupId: item.group_id, name: item.name, approved: approved ? 1 : 2 });
      setDone((s) => new Set(s).add(item._key));
      if (manualItem && manualItem._key === item._key) setManualItem(null);
    } catch (e) { alert((e as Error).message); }
  };

  const lookupManualAsset = async () => {
    setManualError(null);
    const id = parseAssetId(manualUrl);
    if (id === null) {
      setManualError('Could not find an asset ID in that input.');
      return;
    }
    setManualLoading(true);
    try {
      const found = await adminGet<PendingItem>('/asset/moderation-details?assetId=' + id);
      setManualItem({ ...found, id: found.id ?? id, kind: 'asset', _key: `manual-${id}` });
    } catch (e) {
      setManualError((e as Error).message || 'Could not find that asset.');
      setManualItem(null);
    } finally {
      setManualLoading(false);
    }
  };

  const renderModerationButtons = (item: PendingItem) => (
    <div className="flex flex-wrap gap-1">
      <Button size="sm" onClick={() => moderate(item, true, false)}>OK</Button>
      {item.kind !== 'group' ? <Button size="sm" variant="secondary" onClick={() => moderate(item, true, true)}>OK 18+</Button> : null}
      <Button size="sm" variant="ghost" onClick={() => moderate(item, false, false)}>Bad</Button>
      {item.kind === 'asset' ? <Button size="sm" className="bg-negative text-white" onClick={() => moderate(item, false, false, true)}>Bad+Del</Button> : null}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Asset Moderation ({items.length})</h1>
        <Button size="sm" variant="secondary" onClick={() => { setDone(new Set()); refetch(); }}>Refresh</Button>
      </div>

      <Card className="flex flex-col gap-2">
        <p className="text-sm font-medium">Moderate by ID or URL</p>
        <p className="text-xs text-text-muted">Look up any asset — including ones already approved — to re-review it.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') lookupManualAsset(); }}
            placeholder="Asset ID or URL (e.g. /catalog/123/name)"
            className="h-9 flex-1 rounded-rbx border border-border bg-surface px-3 text-sm text-text"
          />
          <Button size="sm" onClick={lookupManualAsset} disabled={manualLoading}>{manualLoading ? 'Looking up…' : 'Look up'}</Button>
        </div>
        {manualError ? <p className="text-sm text-negative">{manualError}</p> : null}
        {manualItem ? (
          <Card className="flex flex-col gap-2">
            <div className="aspect-square w-full max-w-xs overflow-hidden rounded-rbx bg-surface-alt">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={manualItem.content_url || `/admin-api/api/assets/get-asset-stream?assetId=${manualItem.id}`} alt={manualItem.name || ''} className="h-full w-full object-contain" />
            </div>
            <p className="truncate text-sm font-medium">{manualItem.name} <span className="text-xs text-text-muted">({manualItem.kind})</span></p>
            {manualItem.creatorId ? (
              <a href={`/admin/manage-user/${manualItem.creatorId}`} className="text-xs text-accent hover:underline">{manualItem.creatorName || manualItem.creatorId}</a>
            ) : manualItem.creatorName ? (
              <p className="text-xs text-text-muted">{manualItem.creatorName}</p>
            ) : null}
            {renderModerationButtons(manualItem)}
          </Card>
        ) : null}
      </Card>

      {isFetching && items.length === 0 ? <p className="text-text-muted">Loading…</p> : items.length === 0 ? <p className="text-text-muted">Queue is empty.</p> : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item._key} className="flex flex-col gap-2">
              <div className="aspect-square w-full overflow-hidden rounded-rbx bg-surface-alt">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.content_url || `/admin-api/api/assets/get-asset-stream?assetId=${item.id}`} alt={item.name || ''} className="h-full w-full object-contain" />
              </div>
              <p className="truncate text-sm font-medium">{item.name} <span className="text-xs text-text-muted">({item.kind})</span></p>
              {item.creatorId ? <a href={`/admin/manage-user/${item.creatorId}`} className="text-xs text-accent hover:underline">{item.creatorName || item.creatorId}</a> : null}
              {renderModerationButtons(item)}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
