'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGameSorts, getGameList, getGameUrl } from '../../services/games';
import { multiGetUniverseIcons } from '../../services/thumbnails';
import { buildThumbMap } from '../../lib/thumbnailMap';
import { abbreviateNumber } from '../../lib/numberUtils';
import Card from '../../components/ui/Card';

interface Game {
  placeId: number;
  universeId: number;
  name: string;
  playerCount: number;
  totalUpVotes: number;
  totalDownVotes: number;
}
interface SortWithGames {
  displayName: string;
  games: Game[];
}

const ROWS_PER_SORT = 18;

const fetchGames = async (): Promise<{ sorts: SortWithGames[]; icons: Record<number, string> }> => {
  const sortsResp: { sorts: Array<{ token: string; displayName: string }> } = await getGameSorts({
    gameSortsContext: 'GamesDefaultSorts',
  });
  const sorts = sortsResp.sorts || [];
  const lists = await Promise.all(
    sorts.map((s) => getGameList({ sortToken: s.token, limit: ROWS_PER_SORT, genre: 0, keyword: '' })),
  );
  const withGames: SortWithGames[] = sorts.map((s, i) => ({
    displayName: s.displayName,
    games: (lists[i]?.games || []) as Game[],
  }));
  const universeIds = Array.from(
    new Set(withGames.flatMap((s) => s.games.map((g) => g.universeId)).filter(Boolean)),
  );
  const icons = universeIds.length ? await multiGetUniverseIcons({ universeIds, size: '150x150' }) : [];
  return { sorts: withGames, icons: buildThumbMap(icons) };
};

function GameCard({ game, iconUrl }: { game: Game; iconUrl?: string }) {
  const total = game.totalUpVotes + game.totalDownVotes;
  const likePct = total > 0 ? Math.round((game.totalUpVotes / total) * 100) : null;
  return (
    <a href={getGameUrl({ placeId: game.placeId, name: game.name })} className="block w-[150px] shrink-0">
      <Card flush className="overflow-hidden transition-transform hover:-translate-y-0.5">
        <div className="aspect-square w-full bg-surface-alt">
          {iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={iconUrl} alt={game.name} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="p-2">
          <p className="truncate text-sm font-medium" title={game.name}>
            {game.name}
          </p>
          <p className="text-xs text-text-muted">{abbreviateNumber(game.playerCount)} playing</p>
          {likePct !== null ? (
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-negative/40">
              <div className="h-full bg-positive" style={{ width: `${likePct}%` }} />
            </div>
          ) : null}
        </div>
      </Card>
    </a>
  );
}

export default function GamesPage() {
  const { data, isLoading } = useQuery({ queryKey: ['games-listing'], queryFn: fetchGames, staleTime: 60_000 });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-black">Games</h1>
      {isLoading ? (
        <p className="text-text-muted">Loading…</p>
      ) : !data || data.sorts.length === 0 ? (
        <p className="text-text-muted">No games available.</p>
      ) : (
        data.sorts.map((sort) =>
          sort.games.length === 0 ? null : (
            <section key={sort.displayName}>
              <h2 className="mb-2 text-xl font-light uppercase">{sort.displayName}</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {sort.games.map((g) => (
                  <GameCard key={g.placeId} game={g} iconUrl={data.icons[g.universeId]} />
                ))}
              </div>
            </section>
          ),
        )
      )}
    </div>
  );
}
