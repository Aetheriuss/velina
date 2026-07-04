'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getGameSorts, getGameList, getGameUrl } from '../../../services/games';
import { multiGetUniverseIcons } from '../../../services/thumbnails';
import { buildThumbMap } from '../../../lib/thumbnailMap';
import { abbreviateNumber } from '../../../lib/numberUtils';

interface Game {
  placeId: number;
  universeId: number;
  name: string;
  playerCount: number;
  totalUpVotes: number;
  totalDownVotes: number;
}
interface Sort {
  token: string;
  displayName: string;
}
interface SortWithGames {
  displayName: string;
  games: Game[];
}

const ROWS_PER_SORT = 12;

/** Fetch HomeSorts, each sort's game list, and batch-fetch universe icons in one query. */
const fetchHomeGames = async (): Promise<{ sorts: SortWithGames[]; icons: Record<number, string> }> => {
  const sortsResp: { sorts: Sort[] } = await getGameSorts({ gameSortsContext: 'HomeSorts' });
  const sorts = (sortsResp.sorts || []).slice(0, 6);
  const lists = await Promise.all(
    sorts.map((s) => getGameList({ sortToken: s.token, limit: ROWS_PER_SORT, keyword: '' })),
  );
  const withGames: SortWithGames[] = sorts.map((s, i) => ({
    displayName: s.displayName,
    games: (lists[i]?.games || []) as Game[],
  }));
  const universeIds = Array.from(
    new Set(withGames.flatMap((s) => s.games.map((g) => g.universeId)).filter(Boolean)),
  );
  const iconResults = universeIds.length
    ? await multiGetUniverseIcons({ universeIds, size: '150x150' })
    : [];
  return { sorts: withGames, icons: buildThumbMap(iconResults) };
};

function GameCard({ game, iconUrl }: { game: Game; iconUrl?: string }) {
  const total = game.totalUpVotes + game.totalDownVotes;
  const likePct = total > 0 ? Math.round((game.totalUpVotes / total) * 100) : null;
  return (
    <Link
      href={getGameUrl({ placeId: game.placeId, name: game.name })}
      className="group block w-[150px] shrink-0"
    >
      <div className="overflow-hidden rounded-rbx border border-border bg-surface shadow-rbx transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:shadow-rbx-hover">
        <div className="aspect-square w-full overflow-hidden rounded-t-rbx bg-surface-alt">
          {iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={iconUrl} alt={game.name} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="p-2">
          <p className="line-clamp-2 text-sm font-semibold leading-tight text-text" title={game.name}>
            {game.name}
          </p>
          <div className="mt-1 flex items-center justify-between text-xs text-text-muted">
            {likePct !== null ? (
              <span className="font-semibold text-positive">{likePct}%</span>
            ) : (
              <span />
            )}
            <span>{abbreviateNumber(game.playerCount)} playing</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function GameRows() {
  const { data, isLoading } = useQuery({
    queryKey: ['home-games'],
    queryFn: fetchHomeGames,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {Array.from({ length: 2 }, (_, row) => (
          <section key={row}>
            <div className="mb-2 h-6 w-40 animate-pulse rounded-rbx bg-surface-alt" />
            <div className="flex gap-3 overflow-hidden pb-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="w-[150px] shrink-0">
                  <div className="aspect-square w-full animate-pulse rounded-rbx bg-surface-alt" />
                  <div className="mt-2 h-4 w-3/4 animate-pulse rounded-rbx bg-surface-alt" />
                  <div className="mt-1 h-3 w-1/2 animate-pulse rounded-rbx bg-surface-alt" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }
  if (!data || data.sorts.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {data.sorts.map((sort) =>
        sort.games.length === 0 ? null : (
          <section key={sort.displayName}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text">{sort.displayName}</h2>
              <Link href="/games" className="text-sm text-accent hover:underline">
                See All
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
              {sort.games.map((g) => (
                <GameCard key={g.placeId} game={g} iconUrl={data.icons[g.universeId]} />
              ))}
            </div>
          </section>
        ),
      )}
    </div>
  );
}
