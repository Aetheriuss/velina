'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { searchUsers } from '../../../services/users';
import { multiGetPresence } from '../../../services/presence';
import { multiGetUserHeadshots } from '../../../services/thumbnails';
import { buildThumbMap } from '../../../lib/thumbnailMap';
import Card from '../../../components/ui/Card';

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
      const ids = results.map((r) => r.UserId);
      const [presence, heads] = await Promise.all([
        ids.length ? multiGetPresence({ userIds: ids }) : Promise.resolve([]),
        ids.length ? multiGetUserHeadshots({ userIds: ids }) : Promise.resolve([]),
      ]);
      const pMap: Record<number, Presence> = {};
      (presence as Presence[]).forEach((p) => (pMap[p.userId] = p));
      return { results, presence: pMap, heads: buildThumbMap(heads) };
    },
  });

  const results = data?.results || [];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-3xl font-black">User Search</h1>
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
          className="flex-1 rounded-rbx border border-border bg-surface px-3 py-1.5"
        />
        <button type="submit" className="rounded-rbx bg-accent px-4 font-semibold text-white hover:bg-accent-hover">
          Search
        </button>
      </form>

      {isFetching ? (
        <p className="text-text-muted">Searching…</p>
      ) : keyword && results.length === 0 ? (
        <p className="text-text-muted">No users found.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {results.map((r) => {
            const online = data?.presence[r.UserId]?.userPresenceType !== 'Offline' && !!data?.presence[r.UserId];
            return (
              <a key={r.UserId} href={`/users/${r.UserId}/profile`}>
                <Card className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-surface-alt">
                    {data?.heads[r.UserId] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={data.heads[r.UserId]} alt={r.Name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <span className="font-medium">{r.Name}</span>
                  <span className={`ml-auto h-2.5 w-2.5 rounded-full ${online ? 'bg-positive' : 'bg-text-muted/40'}`} />
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
