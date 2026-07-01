'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminGet, adminPost } from '../../../../lib/adminClient';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

type Kind = 'asset' | 'icon' | 'group';
interface PendingItem { id: number; name?: string; content_url?: string; creatorId?: number; creatorName?: string; asset_id?: number; group_id?: number; kind: Kind; _key: string }

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

  const moderate = async (item: PendingItem, approved: boolean, is18Plus: boolean, del = false) => {
    try {
      if (item.kind === 'asset') await adminPost(del ? '/asset/moderate-and-delete' : '/asset/moderate', { isApproved: approved, assetId: item.asset_id ?? item.id, is18Plus });
      else if (item.kind === 'icon') await adminPost('/icon/moderate', { isApproved: approved, iconId: item.id, is18Plus });
      else await adminPost('/groups/icon-toggle', { groupId: item.group_id, name: item.name, approved: approved ? 1 : 2 });
      setDone((s) => new Set(s).add(item._key));
    } catch (e) { alert((e as Error).message); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">Asset Moderation ({items.length})</h1>
        <Button size="sm" variant="secondary" onClick={() => { setDone(new Set()); refetch(); }}>Refresh</Button>
      </div>
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
              <div className="flex flex-wrap gap-1">
                <Button size="sm" onClick={() => moderate(item, true, false)}>OK</Button>
                {item.kind !== 'group' ? <Button size="sm" variant="secondary" onClick={() => moderate(item, true, true)}>OK 18+</Button> : null}
                <Button size="sm" variant="ghost" onClick={() => moderate(item, false, false)}>Bad</Button>
                {item.kind === 'asset' ? <Button size="sm" className="bg-negative text-white" onClick={() => moderate(item, false, false, true)}>Bad+Del</Button> : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
