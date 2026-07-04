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
    return (
      <Card>
        <div className="mb-3 h-6 w-32 animate-pulse rounded-rbx bg-surface-alt" />
        <div className="flex gap-4 overflow-hidden pb-2">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex w-16 shrink-0 flex-col items-center gap-1">
              <div className="h-14 w-14 animate-pulse rounded-full bg-surface-alt" />
              <div className="h-3 w-12 animate-pulse rounded-rbx bg-surface-alt" />
            </div>
          ))}
        </div>
      </Card>
    );
  }
  if (!friends || friends.length === 0) {
    return null;
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Friends ({friends.length})</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {sorted.map((f) => {
          const p = presenceMap[f.id];
          const online = p && p.userPresenceType && p.userPresenceType !== 'Offline';
          return (
            <Link
              key={f.id}
              href={`/users/${f.id}/profile`}
              className="flex w-16 shrink-0 flex-col items-center gap-1"
              title={f.name}
            >
              <div className="relative">
                <div className="h-14 w-14 overflow-hidden rounded-full object-cover ring-1 ring-border bg-surface-alt">
                  {headshotMap[f.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={headshotMap[f.id]} alt={f.name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                {online ? (
                  <span
                    className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-positive ring-2 ring-surface"
                    title={p.lastLocation || 'Online'}
                  />
                ) : null}
              </div>
              <span className="w-full truncate text-center text-xs text-text">{f.name}</span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
