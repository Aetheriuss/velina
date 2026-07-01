'use client';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getUserInfo, getPreviousUsernames, getMembershipType } from '../../../../services/users';
import { getFriends, getFollowersCount, getFollowingsCount } from '../../../../services/friends';
import { multiGetPresence } from '../../../../services/presence';
import { getAvatar } from '../../../../services/avatar';
import { getUserGroups } from '../../../../services/groups';
import { getUserGames, getGameUrl } from '../../../../services/games';
import { getUserRobloxBadges } from '../../../../services/accountInformation';
import {
  multiGetUserHeadshots,
  multiGetAssetThumbnails,
  multiGetGroupIcons,
  multiGetUniverseIcons,
} from '../../../../services/thumbnails';
import { getItemUrl } from '../../../../services/catalog';
import { buildThumbMap } from '../../../../lib/thumbnailMap';
import dayjs from '../../../../lib/dayjs';
import Card from '../../../../components/ui/Card';
import ProfileActions from './_components/ProfileActions';

const MEMBERSHIP: Record<number, string> = { 1: 'Builders Club', 2: 'Turbo BC', 3: 'Outrageous BC', 4: 'Premium' };

function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-xl font-light">{title}</h2>
        {href ? <a href={href} className="text-sm text-accent hover:underline">See All</a> : null}
      </div>
      {children}
    </section>
  );
}

export default function ProfilePage() {
  const params = useParams();
  const userId = Number(Array.isArray(params?.userId) ? params?.userId[0] : params?.userId);
  const enabled = Number.isFinite(userId);

  const { data: userInfo, isLoading, error } = useQuery({
    queryKey: ['user-info', userId],
    queryFn: () => getUserInfo({ userId }),
    enabled,
  });

  const { data: heads } = useQuery({ queryKey: ['self-head', userId], queryFn: () => multiGetUserHeadshots({ userIds: [userId] }), enabled });
  const { data: presence } = useQuery({ queryKey: ['profile-presence', userId], queryFn: () => multiGetPresence({ userIds: [userId] }), enabled });
  const { data: membership } = useQuery({ queryKey: ['membership', userId], queryFn: () => getMembershipType({ userId }), enabled });
  const { data: followers } = useQuery({ queryKey: ['followers-count', userId], queryFn: () => getFollowersCount({ userId }), enabled });
  const { data: followings } = useQuery({ queryKey: ['followings-count', userId], queryFn: () => getFollowingsCount({ userId }), enabled });
  const { data: friends } = useQuery({ queryKey: ['profile-friends', userId], queryFn: () => getFriends({ userId }), enabled });
  const { data: avatar } = useQuery({ queryKey: ['avatar', userId], queryFn: () => getAvatar({ userId }), enabled });
  const { data: groups } = useQuery({ queryKey: ['profile-groups', userId], queryFn: () => getUserGroups({ userId }), enabled });
  const { data: games } = useQuery({ queryKey: ['profile-games', userId], queryFn: async () => (await getUserGames({ userId, cursor: '' })).data, enabled });
  const { data: badges } = useQuery({ queryKey: ['badges', userId], queryFn: async () => { const r = await getUserRobloxBadges({ userId }); return Array.isArray(r) ? r : (r?.data || []); }, enabled });
  const { data: prevNames } = useQuery({ queryKey: ['prev-names', userId], queryFn: () => getPreviousUsernames({ userId }), enabled });

  // Thumbnail lookups
  const wearingIds = useMemo(() => (avatar?.assets || []).map((a: { id: number }) => a.id), [avatar]);
  const { data: wearingThumbs } = useQuery({ queryKey: ['wearing-thumbs', wearingIds], queryFn: () => multiGetAssetThumbnails({ assetIds: wearingIds }), enabled: wearingIds.length > 0 });
  const friendPreview = useMemo(() => (friends || []).slice(0, 12), [friends]);
  const friendIds = useMemo(() => friendPreview.map((f: { id: number }) => f.id), [friendPreview]);
  const { data: friendHeads } = useQuery({ queryKey: ['pf-heads', friendIds], queryFn: () => multiGetUserHeadshots({ userIds: friendIds }), enabled: friendIds.length > 0 });
  const groupIds = useMemo(() => (groups || []).map((g: { group: { id: number } }) => g.group.id), [groups]);
  const { data: groupIcons } = useQuery({ queryKey: ['group-icons', groupIds], queryFn: () => multiGetGroupIcons({ groupIds }), enabled: groupIds.length > 0 });
  const gameList = useMemo(() => (games || []).slice(0, 12), [games]);
  const gameUniverseIds = useMemo(() => gameList.map((g: { id: number }) => g.id), [gameList]);
  const { data: gameIcons } = useQuery({ queryKey: ['pf-game-icons', gameUniverseIds], queryFn: () => multiGetUniverseIcons({ universeIds: gameUniverseIds, size: '150x150' }), enabled: gameUniverseIds.length > 0 });

  if (isLoading) return <p className="text-text-muted">Loading…</p>;
  if (error || !userInfo) return <div className="py-10 text-center"><h1 className="text-xl font-bold">User not found</h1></div>;
  if (userInfo.isBanned) return <div className="py-10 text-center"><h1 className="text-2xl font-bold">Account Unavailable</h1><p className="mt-2 text-text-muted">This account has been banned.</p></div>;

  const headUrl = buildThumbMap(heads)[userId];
  const p = (presence as Array<{ userPresenceType: string; lastLocation?: string }>)?.[0];
  const online = p && p.userPresenceType && p.userPresenceType !== 'Offline';
  const membershipLabel = typeof membership === 'number' ? MEMBERSHIP[membership] : undefined;
  const wearingMap = buildThumbMap(wearingThumbs);
  const friendHeadMap = buildThumbMap(friendHeads);
  const groupIconMap = buildThumbMap(groupIcons);
  const gameIconMap = buildThumbMap(gameIcons);
  const previousNames: string[] = (prevNames || []).map((v: string | { name: string }) => (typeof v === 'string' ? v : v.name));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border border-border bg-surface-alt shadow-rbx">
          {headUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={headUrl} alt={userInfo.name} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{userInfo.displayName || userInfo.name}</h1>
            <span className={`h-3 w-3 rounded-full ${online ? 'bg-positive' : 'bg-text-muted/40'}`} title={online ? p?.lastLocation || 'Online' : 'Offline'} />
          </div>
          <p className="text-text-muted">@{userInfo.name}{membershipLabel ? ` · ${membershipLabel}` : ''}</p>
          <p className="mt-1 text-sm text-text-muted">
            {(friends?.length ?? 0).toLocaleString()} Friends · {(followers ?? 0).toLocaleString()} Followers · {(followings ?? 0).toLocaleString()} Following
          </p>
          <div className="mt-3">
            <ProfileActions userId={userId} />
          </div>
        </div>
      </header>

      {userInfo.description ? (
        <Section title="About">
          <p className="whitespace-pre-wrap">{userInfo.description}</p>
        </Section>
      ) : null}

      {wearingIds.length ? (
        <Section title="Currently Wearing">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {(avatar.assets as Array<{ id: number; name: string }>).map((a) => (
              <a key={a.id} href={getItemUrl({ assetId: a.id, name: a.name })} className="block">
                <div className="aspect-square overflow-hidden rounded-rbx border border-border bg-surface-alt">
                  {wearingMap[a.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={wearingMap[a.id]} alt={a.name} className="h-full w-full object-contain" />
                  ) : null}
                </div>
              </a>
            ))}
          </div>
        </Section>
      ) : null}

      {friendPreview.length ? (
        <Section title={`Friends (${(friends?.length ?? 0).toLocaleString()})`} href={`/users/${userId}/friends`}>
          <div className="flex flex-wrap gap-3">
            {friendPreview.map((f: { id: number; name: string }) => (
              <a key={f.id} href={`/users/${f.id}/profile`} className="flex w-[72px] flex-col items-center gap-1">
                <div className="h-14 w-14 overflow-hidden rounded-full bg-surface-alt">
                  {friendHeadMap[f.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={friendHeadMap[f.id]} alt={f.name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <span className="w-full truncate text-center text-xs">{f.name}</span>
              </a>
            ))}
          </div>
        </Section>
      ) : null}

      {groupIds.length ? (
        <Section title="Groups">
          <div className="flex flex-wrap gap-3">
            {(groups as Array<{ group: { id: number; name: string } }>).map((g) => (
              <a key={g.group.id} href={`/My/Groups.aspx?gid=${g.group.id}`} className="flex w-[88px] flex-col items-center gap-1">
                <div className="h-16 w-16 overflow-hidden rounded-rbx bg-surface-alt">
                  {groupIconMap[g.group.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={groupIconMap[g.group.id]} alt={g.group.name} className="h-full w-full object-contain" />
                  ) : null}
                </div>
                <span className="w-full truncate text-center text-xs">{g.group.name}</span>
              </a>
            ))}
          </div>
        </Section>
      ) : null}

      {gameList.length ? (
        <Section title="Places">
          <div className="flex flex-wrap gap-3">
            {gameList.map((g: { id: number; name: string; rootPlace: { id: number } }) => (
              <a key={g.id} href={getGameUrl({ placeId: g.rootPlace.id, name: g.name })} className="w-[150px]">
                <Card flush className="overflow-hidden">
                  <div className="aspect-square w-full bg-surface-alt">
                    {gameIconMap[g.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={gameIconMap[g.id]} alt={g.name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <p className="truncate p-2 text-sm font-medium">{g.name}</p>
                </Card>
              </a>
            ))}
          </div>
        </Section>
      ) : null}

      {badges && badges.length ? (
        <Section title="Roblox Badges">
          <div className="flex flex-wrap gap-2">
            {(badges as Array<{ name: string }>).map((b) => (
              <span key={b.name} className="rounded-rbx bg-surface-alt px-3 py-1 text-sm">{b.name}</span>
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="Statistics">
        <Card className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between"><span className="text-text-muted">Join Date</span><span>{userInfo.created ? dayjs(userInfo.created).format('M/D/YYYY') : '—'}</span></div>
          <div className="flex justify-between"><span className="text-text-muted">Forum Posts</span><span>{(userInfo.postCount ?? 0).toLocaleString()}</span></div>
          {previousNames.length ? (
            <div className="flex justify-between gap-4"><span className="text-text-muted">Previous Names</span><span className="text-right">{previousNames.join(', ')}</span></div>
          ) : null}
        </Card>
      </Section>
    </div>
  );
}
