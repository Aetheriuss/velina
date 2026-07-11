'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '../../../components/providers/AuthProvider';
import { getInfo, getUserGroups, getWall, postToWall, deletePost, getMembers, joinGroup, leaveGroup } from '../../../services/groups';
import { multiGetGroupIcons, multiGetUserHeadshots } from '../../../services/thumbnails';
import { buildThumbMap } from '../../../lib/thumbnailMap';
import dayjs from '../../../lib/dayjs';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

const posterOf = (p: unknown) => {
  const pp = p as { user?: { userId: number; username: string }; userId?: number; username?: string };
  return pp?.user || (pp?.userId ? { userId: pp.userId, username: pp.username || '' } : null);
};

function GroupInner() {
  const searchParams = useSearchParams();
  const explicitGroupId = Number(searchParams?.get('gid') || 0);
  const { userId, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: myGroups } = useQuery({ queryKey: ['my-groups', userId], queryFn: () => getUserGroups({ userId: userId as number }), enabled: !!userId });
  // Default to the user's first group when no ?gid is given, instead of showing an empty page.
  const groupId = explicitGroupId || (myGroups && myGroups.length > 0 ? myGroups[0].group.id : 0);

  const myGroupIds = useMemo(() => (myGroups || []).map((g: { group: { id: number } }) => g.group.id), [myGroups]);
  const { data: myGroupIcons } = useQuery({ queryKey: ['my-group-icons', myGroupIds], queryFn: () => multiGetGroupIcons({ groupIds: myGroupIds }), enabled: myGroupIds.length > 0 });
  const myGroupIconMap = buildThumbMap(myGroupIcons);

  const { data: info, error } = useQuery({ queryKey: ['group', groupId], queryFn: () => getInfo({ groupId }), enabled: groupId > 0 });
  const { data: icons } = useQuery({ queryKey: ['group-icon', groupId], queryFn: () => multiGetGroupIcons({ groupIds: [groupId] }), enabled: groupId > 0 });
  const iconUrl = buildThumbMap(icons)[groupId];

  const membership = useMemo(() => (myGroups || []).find((g: { group: { id: number } }) => g.group.id === groupId), [myGroups, groupId]);
  const isMember = !!membership;

  const wallKey = ['group-wall', groupId];
  const { data: wall } = useQuery({
    queryKey: wallKey,
    enabled: groupId > 0,
    queryFn: async () => (await getWall({ groupId, cursor: '', sort: 'Desc', limit: 15 })).data as Array<{ id: number; body: string; created: string; poster: unknown }>,
  });

  const [memberCursor, setMemberCursor] = useState('');
  const { data: members } = useQuery({
    queryKey: ['group-members', groupId, memberCursor],
    enabled: groupId > 0,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await getMembers({ groupId, cursor: memberCursor, limit: 12, sortOrder: 'Asc' });
      return { rows: (res.data || []) as Array<{ user: { userId: number; username: string }; role?: { name: string } }>, next: res.nextPageCursor as string | null };
    },
  });
  const memberIds = useMemo(() => (members?.rows || []).map((m) => m.user.userId), [members]);
  const { data: memberHeads } = useQuery({ queryKey: ['gm-heads', memberIds], queryFn: () => multiGetUserHeadshots({ userIds: memberIds }), enabled: memberIds.length > 0 });
  const memberHeadMap = buildThumbMap(memberHeads);

  const [wallText, setWallText] = useState('');
  const refreshWall = () => queryClient.invalidateQueries({ queryKey: wallKey });

  const sidebar = isAuthenticated ? (
    <Card className="flex flex-col gap-3 lg:w-[260px] lg:shrink-0">
      <h2 className="text-sm font-semibold text-text-muted">My Groups</h2>
      {!myGroups ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : myGroups.length === 0 ? (
        <p className="text-sm text-text-muted">You haven&apos;t joined any groups yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {myGroups.map((g: { group: { id: number; name: string } }) => (
            <li key={g.group.id}>
              <a
                href={`/My/Groups.aspx?gid=${g.group.id}`}
                className={`flex items-center gap-2 rounded-rbx px-2 py-1.5 text-sm ${
                  g.group.id === groupId ? 'bg-sidebar-active font-semibold text-accent' : 'text-text hover:bg-sidebar-hover'
                }`}
              >
                <span className="h-8 w-8 shrink-0 overflow-hidden rounded-rbx bg-surface-alt">
                  {myGroupIconMap[g.group.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={myGroupIconMap[g.group.id]} alt={g.group.name} className="h-full w-full object-contain" />
                  ) : null}
                </span>
                <span className="truncate">{g.group.name}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <a href="/My/CreateGroup.aspx" className="text-sm font-semibold text-accent hover:underline">+ Create a Group</a>
    </Card>
  ) : null;

  let detail: React.ReactNode;
  if (!groupId) {
    if (!isAuthenticated) {
      detail = <p className="text-text-muted">No group specified.</p>;
    } else if (!myGroups) {
      detail = <p className="text-text-muted">Loading…</p>;
    } else {
      detail = (
        <div className="py-10 text-center">
          <h1 className="mb-2 text-2xl font-semibold">You&apos;re not in any groups yet</h1>
          <p className="mb-4 text-text-muted">Join a group or create your own to get started.</p>
          <a href="/My/CreateGroup.aspx" className="inline-flex h-9 items-center rounded-rbx bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover">Create a Group</a>
        </div>
      );
    }
  } else if (error) {
    detail = <div className="py-10 text-center"><h1 className="text-2xl font-semibold">Group not found</h1></div>;
  } else if (!info) {
    detail = <p className="text-text-muted">Loading…</p>;
  } else {
    detail = (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row">
          <div className="h-28 w-28 shrink-0 overflow-hidden rounded-rbx border border-border bg-surface-alt">
            {iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={iconUrl} alt={info.name} className="h-full w-full object-contain" />
            ) : null}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">{info.name}</h1>
            <p className="text-sm text-text-muted">
              Owner: {info.owner ? <a href={`/users/${info.owner.userId}/profile`} className="text-accent hover:underline">{info.owner.username}</a> : 'None'} · {(info.memberCount ?? 0).toLocaleString()} members
            </p>
            {isAuthenticated ? (
              <div className="mt-2">
                {isMember ? (
                  <Button size="sm" variant="secondary" onClick={async () => { await leaveGroup({ groupId, userId: userId as number }); queryClient.invalidateQueries({ queryKey: ['my-groups', userId] }); }}>Leave Group</Button>
                ) : (
                  <Button size="sm" onClick={async () => { await joinGroup({ groupId }); queryClient.invalidateQueries({ queryKey: ['my-groups', userId] }); }}>Join Group</Button>
                )}
              </div>
            ) : null}
          </div>
        </header>

        {info.shout?.body ? (
          <Card><p className="text-sm text-text-muted">Shout</p><p className="whitespace-pre-wrap">{info.shout.body}</p></Card>
        ) : null}

        {info.description ? (
          <section><h2 className="mb-1 text-lg font-semibold">About</h2><p className="whitespace-pre-wrap">{info.description}</p></section>
        ) : null}

        <section>
          <h2 className="mb-2 text-lg font-semibold">Wall</h2>
          {isMember ? (
            <Card className="mb-3 flex flex-col gap-2">
              <textarea value={wallText} onChange={(e) => setWallText(e.target.value)} rows={2} placeholder="Post to the group wall…" className="rounded-rbx border border-border bg-surface px-3 py-2 text-sm" />
              <div><Button size="sm" onClick={async () => { if (!wallText.trim()) return; await postToWall({ groupId, content: wallText }); setWallText(''); refreshWall(); }}>Post</Button></div>
            </Card>
          ) : null}
          <div className="flex flex-col gap-2">
            {(wall || []).length === 0 ? <p className="text-text-muted">No posts yet.</p> : (wall || []).map((post) => {
              const poster = posterOf(post.poster);
              return (
                <Card key={post.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm">
                      {poster ? <a href={`/users/${poster.userId}/profile`} className="font-semibold text-accent hover:underline">{poster.username}</a> : 'Unknown'}
                      <span className="ml-2 text-xs text-text-muted">{dayjs(post.created).format('M/D/YYYY h:mm A')}</span>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{post.body}</p>
                  </div>
                  {isMember ? (
                    <Button size="sm" variant="ghost" className="shrink-0 !text-negative hover:!bg-negative/10" onClick={async () => { await deletePost({ groupId, postId: post.id }); refreshWall(); }}>Delete</Button>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Members</h2>
          <div className="flex flex-wrap gap-3">
            {(members?.rows || []).map((m) => (
              <a key={m.user.userId} href={`/users/${m.user.userId}/profile`} className="flex w-[72px] flex-col items-center gap-1">
                <div className="h-14 w-14 overflow-hidden rounded-full bg-surface-alt">
                  {memberHeadMap[m.user.userId] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={memberHeadMap[m.user.userId]} alt={m.user.username} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <span className="w-full truncate text-center text-xs">{m.user.username}</span>
              </a>
            ))}
          </div>
          {members?.next ? (
            <div className="mt-3"><Button size="sm" variant="secondary" onClick={() => setMemberCursor(members.next as string)}>Load more</Button></div>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {sidebar}
      <div className="min-w-0 flex-1">{detail}</div>
    </div>
  );
}

export default function GroupPage() {
  return <Suspense fallback={null}><GroupInner /></Suspense>;
}
