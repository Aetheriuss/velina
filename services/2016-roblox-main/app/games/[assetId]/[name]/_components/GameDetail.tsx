'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGameMedia } from '../../../../../services/games';
import { multiGetAssetThumbnails } from '../../../../../services/thumbnails';
import { buildThumbMap } from '../../../../../lib/thumbnailMap';
import dayjs from '../../../../../lib/dayjs';
import Card from '../../../../../components/ui/Card';
import PlayButton from './PlayButton';
import Vote from './Vote';
import Servers from './Servers';

interface Place {
  placeId: number;
  universeId: number;
  name: string;
  description?: string;
}
interface Universe {
  id: number;
  name: string;
  description?: string;
  creator: { id: number; type: string; name: string };
  playing?: number;
  visits?: number;
  favoritedCount?: number;
  created?: string;
  updated?: string;
  maxPlayers?: number;
  genre?: string;
  rootPlaceId?: number;
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function GameDetail({ place, universe }: { place: Place; universe: Universe }) {
  const { data: images } = useQuery<string[]>({
    queryKey: ['game-media', universe.id],
    queryFn: async () => {
      const media = await getGameMedia({ universeId: universe.id });
      const imageIds = (media || [])
        .filter((m: { assetType: string }) => m.assetType === 'Image')
        .map((m: { imageId: number }) => m.imageId)
        .filter(Boolean);
      const ids = imageIds.length ? imageIds : [universe.rootPlaceId].filter(Boolean);
      if (!ids.length) return [];
      const thumbs = await multiGetAssetThumbnails({ assetIds: ids });
      const map = buildThumbMap(thumbs);
      return ids.map((id: number) => map[id]).filter(Boolean) as string[];
    },
  });

  const [idx, setIdx] = useState(0);
  const gallery = images && images.length ? images : [];
  const current = gallery[Math.min(idx, gallery.length - 1)];

  const creatorHref = useMemo(
    () =>
      universe.creator.type === 'Group'
        ? `/My/Groups.aspx?gid=${universe.creator.id}`
        : `/users/${universe.creator.id}/profile`,
    [universe.creator],
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-black">{place.name}</h1>
        <p className="text-text-muted">
          By{' '}
          <a href={creatorHref} className="text-accent hover:underline">
            {universe.creator.name}
          </a>
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          <Card flush className="overflow-hidden">
            <div className="relative aspect-video w-full bg-surface-alt">
              {current ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current} alt={place.name} className="h-full w-full object-cover" />
              ) : null}
              {gallery.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIdx((i) => (i - 1 + gallery.length) % gallery.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-1 text-white"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => setIdx((i) => (i + 1) % gallery.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-1 text-white"
                  >
                    ›
                  </button>
                </>
              ) : null}
            </div>
          </Card>

          <section className="mt-6">
            <h2 className="mb-1 text-xl font-light">About</h2>
            <p className="whitespace-pre-wrap">{universe.description || place.description || 'No description available.'}</p>
          </section>

          <section className="mt-6">
            <h2 className="mb-2 text-xl font-light">Servers</h2>
            <Servers placeId={place.placeId} />
          </section>
        </div>

        <aside className="flex flex-col gap-3">
          <Card>
            <PlayButton placeId={place.placeId} />
          </Card>
          <Card>
            <Vote universeId={universe.id} />
          </Card>
          <Card className="flex flex-col gap-1">
            <Stat label="Playing" value={(universe.playing ?? 0).toLocaleString()} />
            <Stat label="Visits" value={(universe.visits ?? 0).toLocaleString()} />
            <Stat label="Favorites" value={(universe.favoritedCount ?? 0).toLocaleString()} />
            <Stat label="Max Players" value={(universe.maxPlayers ?? 0).toLocaleString()} />
            {universe.genre ? <Stat label="Genre" value={universe.genre} /> : null}
            {universe.created ? <Stat label="Created" value={dayjs(universe.created).format('M/D/YYYY')} /> : null}
            {universe.updated ? <Stat label="Updated" value={dayjs(universe.updated).format('M/D/YYYY')} /> : null}
          </Card>
        </aside>
      </div>
    </div>
  );
}
