'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUserGames, getGroupGames, getGameUrl } from '../../../services/games';
import { multiGetUniverseIcons } from '../../../services/thumbnails';
import { buildThumbMap } from '../../../lib/thumbnailMap';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';

interface Game {
  id: number; // universeId
  name: string;
  rootPlace: { id: number };
}

export default function GamesSubPage({ userId, groupId }: { userId: number; groupId?: number }) {
  const { data: games, isLoading } = useQuery<Game[]>({
    queryKey: ['develop-games', groupId ?? `user-${userId}`],
    queryFn: async () => {
      const resp = groupId
        ? await getGroupGames({ groupId, cursor: '' })
        : await getUserGames({ userId, cursor: '' });
      return (resp.data || []) as Game[];
    },
  });

  const universeIds = useMemo(() => (games || []).map((g) => g.id).filter(Boolean), [games]);
  const { data: icons } = useQuery({
    queryKey: ['develop-game-icons', universeIds],
    queryFn: () => multiGetUniverseIcons({ universeIds, size: '150x150' }),
    enabled: universeIds.length > 0,
  });
  const iconMap = useMemo(() => buildThumbMap(icons), [icons]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-light">Games</h2>
        {/* /internal/create-place is the surviving .NET create flow (migrated in Phase 5). */}
        <a href="/internal/create-place">
          <Button size="sm">Create New Game</Button>
        </a>
      </div>

      {isLoading ? (
        <p className="text-text-muted">Loading…</p>
      ) : !games || games.length === 0 ? (
        <p className="text-text-muted">You haven&apos;t created any games.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {games.map((g) => (
            <Card key={g.id} className="flex items-center gap-4">
              <div className="h-[70px] w-[70px] shrink-0 overflow-hidden rounded-rbx bg-surface-alt">
                {iconMap[g.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={iconMap[g.id]} alt={g.name} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <a
                  href={getGameUrl({ placeId: g.rootPlace.id, name: g.name })}
                  className="font-medium text-accent hover:underline"
                >
                  {g.name}
                </a>
                <p className="text-sm text-text-muted">Start Place: {g.rootPlace.id}</p>
              </div>
              <a href={`/places/${g.rootPlace.id}/update`}>
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
