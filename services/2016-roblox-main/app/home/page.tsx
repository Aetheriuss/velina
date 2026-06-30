'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../components/providers/AuthProvider';
import { multiGetUserHeadshots } from '../../services/thumbnails';
import { buildThumbMap } from '../../lib/thumbnailMap';
import getFlag from '../../lib/getFlag';
import FriendsStrip from './_components/FriendsStrip';
import GameRows from './_components/GameRows';
import Feed from './_components/Feed';

/**
 * Authenticated dashboard (replaces pages/home.js + components/myDashboard).
 * Rebuilt for the App Router: data via React Query against the existing
 * services/* layer, styling via 2020 Tailwind tokens. The legacy Theme2016
 * marker wrapper is intentionally dropped — theming is token-driven now.
 */
export default function HomePage() {
  const { userId, username, isAuthenticated, isPending } = useAuth();
  const router = useRouter();

  // /home is authenticated-only; bounce logged-out users to the landing.
  useEffect(() => {
    if (!isPending && !isAuthenticated) router.replace('/');
  }, [isPending, isAuthenticated, router]);

  const { data: headshots } = useQuery({
    queryKey: ['self-headshot', userId],
    queryFn: () => multiGetUserHeadshots({ userIds: [userId as number] }),
    enabled: !!userId,
  });
  const selfHeadshot = userId ? buildThumbMap(headshots)[userId] : undefined;

  if (isPending || !isAuthenticated || !userId) return null;

  const feedEnabled = getFlag('userFeedEnabled', true) as boolean;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-full border border-border bg-surface-alt shadow-rbx">
          {selfHeadshot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selfHeadshot} alt={username || 'You'} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold sm:text-4xl">Hello, {username}!</h1>
      </header>

      <FriendsStrip userId={userId} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <GameRows />
        </div>
        {feedEnabled ? (
          <div className="min-w-0">
            <Feed />
          </div>
        ) : null}
      </div>
    </div>
  );
}
