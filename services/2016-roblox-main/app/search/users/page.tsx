'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { searchUsers } from '../../../services/users';
import { multiGetPresence } from '../../../services/presence';
import { multiGetUserHeadshots } from '../../../services/thumbnails';
import { buildThumbMap } from '../../../lib/thumbnailMap';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

interface Result {
  UserId: number;
  Name: string;
  UserProfilePageUrl?: string;
}
interface Presence {
  userId: number;
  userPresenceType: string;
}

function SearchInner() {
  const searchParams = useSearchParams();
  const [box, setBox] = useState(searchParams?.get('keyword') || '');
  const [keyword, setKeyword] = useState(box);

  const { data, isFetching } = useQuery({
    queryKey: ['user-search', keyword],
    enabled: keyword.trim().length > 0,
    queryFn: async () => {
      const res = await searchUsers({ keyword, limit: 12, offset: 0 });
      const results: Result[] = res.UserSearchResults || [];
      return { results };
    },
  });

  const results = data?.results || [];
  const ids = useMemo(() => results.map((r) => r.UserId), [results]);

  const { data: presenceData } = useQuery({
    queryKey: ['user-search-presence', ids],
    queryFn: () => multiGetPresence({ userIds: ids }),
    enabled: ids.length > 0,
  });
  const presence = useMemo(() => {
    const pMap: Record<number, Presence> = {};
    ((presenceData || []) as Presence[]).forEach((p) => (pMap[p.userId] = p));
    return pMap;
  }, [presenceData]);

  const { data: headsData } = useQuery({
    queryKey: ['user-search-heads', ids],
    queryFn: () => multiGetUserHeadshots({ userIds: ids }),
    enabled: ids.length > 0,
  });
  const heads = buildThumbMap(headsData);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-text">User Search</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setKeyword(box);
        }}
        className="flex gap-2"
      >
        <input
          value={box}
          onChange={(e) => setBox(e.target.value)}
          placeholder="Search for a username"
          className="h-9 flex-1 rounded-rbx border border-border bg-surface px-3 text-sm text-text placeholder:text-text-muted"
        />
        <Button type="submit">Search</Button>
      </form>

      {isFetching ? (
        <p className="text-text-muted">Searching…</p>
      ) : keyword && results.length === 0 ? (
        <p className="text-text-muted">No users found.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {results.map((r) => {
            const online = presence[r.UserId]?.userPresenceType !== 'Offline' && !!presence[r.UserId];
            return (
              <a key={r.UserId} href={`/users/${r.UserId}/profile`} className="block">
                <Card className="flex items-center gap-3 transition-shadow hover:shadow-rbx-hover">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-surface-alt ring-1 ring-border">
                    {heads[r.UserId] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={heads[r.UserId]} alt={r.Name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <span className="font-semibold text-text">{r.Name}</span>
                  <span
                    className={`ml-auto h-2.5 w-2.5 rounded-full ${
                      online ? 'bg-positive' : 'bg-text-muted/40'
                    }`}
                  />
                </Card>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SearchUsersPage() {
  return (
    <Suspense fallback={null}>
      <SearchInner />
    </Suspense>
  );
}
