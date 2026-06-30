'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getFriends } from '../../../services/friends';
import { multiGetPresence } from '../../../services/presence';
import { multiGetUserHeadshots } from '../../../services/thumbnails';
import { buildThumbMap } from '../../../lib/thumbnailMap';
import Card from '../../../components/ui/Card';

interface Friend {
  id: number;
  name: string;
}
interface Presence {
  userId: number;
  userPresenceType: string;
  lastLocation?: string;
  placeId?: number | null;
}

/** Horizontal friends list with avatar + online indicator (2020 re-skin of myDashboard's friend row). */
export default function FriendsStrip({ userId }: { userId: number }) {
  const { data: friends, isLoading } = useQuery<Friend[]>({
    queryKey: ['friends', userId],
    queryFn: () => getFriends({ userId }),
  });

  const friendIds = useMemo(() => (friends || []).map((f) => f.id), [friends]);

  const { data: presence } = useQuery<Presence[]>({
    queryKey: ['friends-presence', friendIds],
    queryFn: () => multiGetPresence({ userIds: friendIds }),
    enabled: friendIds.length > 0,
  });

  const { data: headshots } = useQuery({
    queryKey: ['friends-headshots', friendIds],
    queryFn: () => multiGetUserHeadshots({ userIds: friendIds }),
    enabled: friendIds.length > 0,
  });

  const headshotMap = useMemo(() => buildThumbMap(headshots), [headshots]);
  const presenceMap = useMemo(() => {
    const m: Record<number, Presence> = {};
    (presence || []).forEach((p) => {
      m[p.userId] = p;
    });
    return m;
  }, [presence]);

  // Sort online friends first (presence type other than "Offline").
  const sorted = useMemo(() => {
    const isOnline = (id: number) => {
      const p = presenceMap[id];
      return p && p.userPresenceType && p.userPresenceType !== 'Offline' ? 1 : 0;
    };
    return [...(friends || [])].sort((a, b) => isOnline(b.id) - isOnline(a.id));
  }, [friends, presenceMap]);

  if (isLoading) {
    return <Card className="animate-pulse text-text-muted">Loading friends…</Card>;
  }
  if (!friends || friends.length === 0) {
    return null;
  }

  return (
    <Card>
      <h2 className="mb-3 text-xl font-light">Friends ({friends.length})</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {sorted.map((f) => {
          const p = presenceMap[f.id];
          const online = p && p.userPresenceType && p.userPresenceType !== 'Offline';
          return (
            <Link
              key={f.id}
              href={`/users/${f.id}/profile`}
              className="flex w-[84px] shrink-0 flex-col items-center gap-1"
              title={f.name}
            >
              <div className="relative">
                <div className="h-[72px] w-[72px] overflow-hidden rounded-full border border-border bg-surface-alt shadow-rbx">
                  {headshotMap[f.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={headshotMap[f.id]} alt={f.name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <span
                  className={`absolute bottom-0 right-1 h-3 w-3 rounded-full border-2 border-surface ${
                    online ? 'bg-positive' : 'bg-text-muted/40'
                  }`}
                  title={online ? p.lastLocation || 'Online' : 'Offline'}
                />
              </div>
              <span className="w-full truncate text-center text-sm font-medium">{f.name}</span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
