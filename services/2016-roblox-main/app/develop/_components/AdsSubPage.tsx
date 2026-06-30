'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAds, bidOnAd } from '../../../services/ads';
import { getItemUrl } from '../../../services/catalog';
import { multiGetAssetThumbnails } from '../../../services/thumbnails';
import { buildThumbMap } from '../../../lib/thumbnailMap';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';

interface Ad {
  id: number;
  name: string;
  advertisementAssetId: number;
  impressionsLastRun: number;
  clicksLastRun: number;
  bidAmountRobuxLastRun: number;
  impressionsAll: number;
  clicksAll: number;
  bidAmountRobuxAll: number;
  isRunning: boolean;
}
interface Target {
  targetType: 'Asset' | 'Group';
  targetId: number;
  targetName: string;
}
interface AdEntry {
  ad: Ad;
  target: Target;
}

const ctr = (clicks: number, impressions: number) =>
  impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';

const targetUrl = (t: Target) =>
  t.targetType === 'Group'
    ? `/Groups/Group.aspx?gid=${t.targetId}`
    : getItemUrl({ assetId: t.targetId, name: t.targetName });

function Stat({ name, value }: { name: string; value: string | number }) {
  return (
    <div className="text-sm">
      <span className="text-text-muted">{name}: </span>
      {value}
    </div>
  );
}

function AdRow({ entry, imageUrl, onBid }: { entry: AdEntry; imageUrl?: string; onBid: (adId: number, robux: number) => Promise<void> }) {
  const { ad, target } = entry;
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const submit = async () => {
    setFeedback(null);
    const num = parseInt(amount, 10);
    if (!Number.isSafeInteger(num) || num < 0) return setFeedback('Invalid Robux amount.');
    setLocked(true);
    try {
      await onBid(ad.id, num);
      setOpen(false);
      setAmount('');
    } catch (e) {
      setFeedback('Error running ad. ' + (e as Error).message);
    } finally {
      setLocked(false);
    }
  };

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex gap-4">
        <div className="h-[70px] w-[70px] shrink-0 overflow-hidden rounded-rbx bg-surface-alt">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={ad.name} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {ad.name} (for{' '}
            <a href={targetUrl(target)} className="text-accent hover:underline">
              {target.targetName}
            </a>
            )
          </p>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
            <Stat name="Impressions" value={ad.impressionsLastRun.toLocaleString()} />
            <Stat name="Clicks" value={ad.clicksLastRun.toLocaleString()} />
            <Stat name="CTR" value={`${ctr(ad.clicksLastRun, ad.impressionsLastRun)}%`} />
            <Stat name="Bid" value={ad.bidAmountRobuxLastRun.toLocaleString()} />
            <Stat name="Total Impr" value={ad.impressionsAll.toLocaleString()} />
            <Stat name="Total Clicks" value={ad.clicksAll.toLocaleString()} />
            <Stat name="Total CTR" value={`${ctr(ad.clicksAll, ad.impressionsAll)}%`} />
            <Stat name="Total Bid" value={ad.bidAmountRobuxAll.toLocaleString()} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className={`text-sm font-medium ${ad.isRunning ? 'text-positive' : 'text-text-muted'}`}>
          {ad.isRunning ? '● Running' : '○ Not Running'}
        </span>
        <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)}>
          Run
        </Button>
      </div>

      {open ? (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          {feedback ? <p className="text-sm text-negative">{feedback}</p> : null}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Bid in Robux:</span>
            <input
              type="text"
              value={amount}
              disabled={locked}
              onChange={(e) => setAmount(e.target.value)}
              className="w-28 rounded-rbx border border-border bg-surface px-2 py-1"
            />
            <Button size="sm" disabled={locked} onClick={submit}>
              Bid
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

export default function AdsSubPage({ userId, groupId }: { userId: number; groupId?: number }) {
  const queryClient = useQueryClient();
  const queryKey = ['develop-ads', groupId ?? `user-${userId}`];

  const { data: ads, isLoading } = useQuery<AdEntry[]>({
    queryKey,
    queryFn: async () => {
      const resp = await getAds({
        creatorId: groupId || userId,
        creatorType: groupId ? 'Group' : 'User',
      });
      return (resp.data || []) as AdEntry[];
    },
  });

  const assetIds = useMemo(
    () => (ads || []).map((a) => a.ad.advertisementAssetId).filter(Boolean),
    [ads],
  );
  const { data: thumbs } = useQuery({
    queryKey: ['develop-ad-thumbs', assetIds],
    queryFn: () => multiGetAssetThumbnails({ assetIds }),
    enabled: assetIds.length > 0,
  });
  const thumbMap = useMemo(() => buildThumbMap(thumbs), [thumbs]);

  const onBid = async (adId: number, robux: number) => {
    await bidOnAd({ adId, robux });
    await queryClient.invalidateQueries({ queryKey });
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-light">User Ads</h2>
      {isLoading ? (
        <p className="text-text-muted">Loading…</p>
      ) : !ads || ads.length === 0 ? (
        <p className="text-text-muted">You haven&apos;t created any User Ads.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ads.map((entry) => (
            <AdRow
              key={entry.ad.id}
              entry={entry}
              imageUrl={thumbMap[entry.ad.advertisementAssetId]}
              onBid={onBid}
            />
          ))}
        </div>
      )}
    </div>
  );
}
