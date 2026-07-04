'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../providers/AuthProvider';
import { adminGet } from '../../lib/adminClient';
import { getRobux } from '../../services/economy';
import { getUnreadMessageCount } from '../../services/privateMessages';
import { multiGetUserHeadshots } from '../../services/thumbnails';
import { buildThumbMap } from '../../lib/thumbnailMap';
import type { RankResponse } from '../admin/AdminPermissionsProvider';

/**
 * Data hooks for the navbar chrome (robux pill, unread badge, avatar, admin
 * link). All are gated on authentication so the logged-out shell makes no
 * extra requests.
 */

export const useRobux = (): number | null => {
  const { userId } = useAuth();
  const { data } = useQuery<{ robux: number }>({
    queryKey: ['self-robux', userId],
    queryFn: () => getRobux({ userId }),
    enabled: !!userId,
    staleTime: 30_000,
  });
  return data?.robux ?? null;
};

export const useUnreadMessages = (): number => {
  const { isAuthenticated } = useAuth();
  const { data } = useQuery<number>({
    queryKey: ['unread-messages'],
    queryFn: () => getUnreadMessageCount(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
  return data ?? 0;
};

export const useSelfHeadshot = (): string | undefined => {
  const { userId } = useAuth();
  const { data } = useQuery({
    // Same key as the /home dashboard header so the image is fetched once.
    queryKey: ['self-headshot', userId],
    queryFn: () => multiGetUserHeadshots({ userIds: [userId as number] }),
    enabled: !!userId,
    staleTime: 300_000,
  });
  return userId ? buildThumbMap(data)[userId] : undefined;
};

/**
 * True when the current user can open /admin. Probes the same
 * /admin-api/api/permissions endpoint (and query key) the admin shell uses.
 * The endpoint returns 200 with an empty rank (name null, no permissions) for
 * ordinary logged-in users, so staff means owner/admin/mod or ≥1 permission —
 * a bare `rank` object is not enough.
 */
export const useIsStaff = (): boolean => {
  const { isAuthenticated } = useAuth();
  const { data } = useQuery<RankResponse>({
    queryKey: ['admin-permissions'],
    queryFn: () => adminGet<RankResponse>('/permissions'),
    enabled: isAuthenticated,
    retry: false,
    staleTime: 300_000,
  });
  const rank = data?.rank;
  if (!rank) return false;
  const d = rank.details;
  return !!(d?.isOwner || d?.isAdmin || d?.isModerator || (rank.permissions?.length ?? 0) > 0);
};
