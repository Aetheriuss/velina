'use client';

import React, { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getFriends,
  getFollowers,
  getFollowings,
  getFriendRequests,
  unfriendUser,
  unfollowUser,
  acceptFriendRequest,
  declineFriendRequest,
} from '../../../../services/friends';
import { getUserInfo } from '../../../../services/users';
import { multiGetUserHeadshots } from '../../../../services/thumbnails';
import { useAuth } from '../../../../components/providers/AuthProvider';
import { buildThumbMap } from '../../../../lib/thumbnailMap';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

interface UserRef {
  id: number;
  name: string;
}
type Tab = 'Friends' | 'Followers' | 'Followings' | 'Requests';
const LIMIT = 18;

export default function FriendsPage() {
  const params = useParams();
  const userId = Number(Array.isArray(params?.userId) ? params?.userId[0] : params?.userId);
  const { userId: authId } = useAuth();
  const isSelf = authId === userId;
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>('Friends');
  const [cursor, setCursor] = useState('');

  const { data: userInfo } = useQuery({
    queryKey: ['user-info', userId],
    queryFn: () => getUserInfo({ userId }),
    enabled: Number.isFinite(userId),
  });

  const listQuery = useQuery({
    queryKey: ['friends-list', tab, userId, cursor],
    enabled: Number.isFinite(userId),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (tab === 'Friends') {
        const arr: UserRef[] = await getFriends({ userId });
        return { users: arr, next: null as string | null, prev: null as string | null };
      }
      if (tab === 'Requests') {
        const res = await getFriendRequests({ cursor, limit: LIMIT });
        return { users: res.data as UserRef[], next: res.nextPageCursor, prev: res.previousPageCursor };
      }
      const fn = tab === 'Followers' ? getFollowers : getFollowings;
      const res = await fn({ userId, cursor, limit: LIMIT, sort: 'Asc' });
      return { users: res.data as UserRef[], next: res.nextPageCursor, prev: res.previousPageCursor };
    },
  });

  const users = listQuery.data?.users || [];
  const ids = useMemo(() => users.map((u) => u.id), [users]);
  const { data: heads } = useQuery({
    queryKey: ['friends-heads', ids],
    queryFn: () => multiGetUserHeadshots({ userIds: ids }),
    enabled: ids.length > 0,
  });
  const headMap = useMemo(() => buildThumbMap(heads), [heads]);

  const changeTab = (t: Tab) => {
    setTab(t);
    setCursor('');
  };
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['friends-list', tab, userId, cursor] });

  const tabs: Tab[] = ['Friends', 'Followers', 'Followings', ...(isSelf ? (['Requests'] as Tab[]) : [])];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-text">{userInfo?.name ? `${userInfo.name}'s Friends` : 'Friends'}</h1>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => changeTab(t)}
            className={`flex h-9 items-center rounded-rbx px-3 text-sm font-semibold ${
              tab === t
                ? 'bg-accent text-white'
                : 'border border-border bg-surface text-text hover:bg-bg'
            }`}
          >
            {t === 'Requests' ? 'Friend Requests' : t}
          </button>
        ))}
      </div>

      {listQuery.isFetching && users.length === 0 ? (
        <p className="text-text-muted">Loading…</p>
      ) : users.length === 0 ? (
        <p className="text-text-muted">Nothing to show here.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {users.map((u) => (
            <Card key={u.id} className="flex flex-col items-center gap-3 text-center">
              <a href={`/users/${u.id}/profile`} className="flex min-w-0 flex-col items-center gap-2">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-surface-alt ring-1 ring-border">
                  {headMap[u.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={headMap[u.id]} alt={u.name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <span className="w-full truncate text-sm font-semibold text-text">{u.name}</span>
              </a>
              {isSelf && tab === 'Friends' ? (
                <Button size="sm" variant="secondary" onClick={async () => { await unfriendUser({ userId: u.id }); refresh(); }}>
                  Remove
                </Button>
              ) : isSelf && tab === 'Followings' ? (
                <Button size="sm" variant="secondary" onClick={async () => { await unfollowUser({ userId: u.id }); refresh(); }}>
                  Unfollow
                </Button>
              ) : tab === 'Requests' ? (
                <div className="flex gap-1">
                  <Button size="sm" onClick={async () => { await acceptFriendRequest({ userId: u.id }); refresh(); }}>
                    Accept
                  </Button>
                  <Button size="sm" variant="ghost" onClick={async () => { await declineFriendRequest({ userId: u.id }); refresh(); }}>
                    Ignore
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      {tab !== 'Friends' ? (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            disabled={!listQuery.data?.prev || listQuery.isFetching}
            onClick={() => listQuery.data?.prev && setCursor(listQuery.data.prev)}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={!listQuery.data?.next || listQuery.isFetching}
            onClick={() => listQuery.data?.next && setCursor(listQuery.data.next)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
