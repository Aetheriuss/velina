'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCreatedItems, uploadAsset } from '../../../services/develop';
import { multiGetAssetThumbnails } from '../../../services/thumbnails';
import { buildThumbMap } from '../../../lib/thumbnailMap';
import dayjs from '../../../lib/dayjs';
import { CLOTHING_DETAILS } from '../_constants';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';

interface CreatedAsset {
  assetId: number;
  name: string;
  created?: string;
}

export default function ClothingSubPage({
  assetType,
  groupId,
}: {
  assetType: number;
  groupId?: number;
}) {
  const details = CLOTHING_DETAILS[assetType];
  const queryClient = useQueryClient();
  const queryKey = ['develop-created', assetType, groupId ?? 'user'];

  const { data: items, isLoading } = useQuery<CreatedAsset[]>({
    queryKey,
    queryFn: async () => {
      const res = await getCreatedItems({ assetType, limit: 100, cursor: '', groupId });
      return (res.data || []) as CreatedAsset[];
    },
  });

  const assetIds = useMemo(() => (items || []).map((i) => i.assetId), [items]);
  const { data: thumbs } = useQuery({
    queryKey: ['develop-created-thumbs', assetIds],
    queryFn: () => multiGetAssetThumbnails({ assetIds }),
    enabled: assetIds.length > 0,
  });
  const thumbMap = useMemo(() => buildThumbMap(thumbs), [thumbs]);

  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;
    setFeedback(null);
    const file = fileRef.current?.files?.[0];
    const name = nameRef.current?.value;
    if (!file) return setFeedback('You must select a file');
    if (!name) return setFeedback('You must specify a name');
    if (file.size >= 8e7) return setFeedback('The file is too large');
    if (file.size === 0) return setFeedback('The file is empty');

    setLocked(true);
    try {
      await uploadAsset({ name, assetTypeId: assetType, file, groupId });
      if (nameRef.current) nameRef.current.value = '';
      if (fileRef.current) fileRef.current.value = '';
      await queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      setFeedback((err as Error).message);
    } finally {
      setLocked(false);
    }
  };

  if (!details) return null;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-light">Create {details.title}</h2>
      {details.subtext ? <p className="text-sm text-text-muted">{details.subtext}</p> : null}

      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-muted">Find your {details.fileLabel}:</span>
            <input ref={fileRef} type="file" className="text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-muted">{details.name} Name:</span>
            <input
              ref={nameRef}
              type="text"
              className="rounded-rbx border border-border bg-surface px-2 py-1"
            />
          </label>
          {feedback ? <p className="text-sm text-negative">{feedback}</p> : null}
          <div>
            <Button type="submit" size="sm" disabled={locked}>
              {locked ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </form>
      </Card>

      {isLoading ? (
        <p className="text-text-muted">Loading…</p>
      ) : !items || items.length === 0 ? (
        <p className="text-text-muted">
          You haven&apos;t created any {details.namePlural.toLowerCase()}.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <Card key={item.assetId} className="flex items-center gap-4">
              <div className="h-[70px] w-[70px] shrink-0 overflow-hidden rounded-rbx bg-surface-alt">
                {thumbMap[item.assetId] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbMap[item.assetId]}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.name}</p>
                {item.created ? (
                  <p className="text-sm text-text-muted">
                    Created: {dayjs(item.created).format('M/D/YYYY')}
                  </p>
                ) : null}
              </div>
              <a href={`/My/Item.aspx?id=${item.assetId}`}>
                <Button variant="secondary" size="sm">
                  Configure
                </Button>
              </a>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
