'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../components/providers/AuthProvider';
import { getUserGroups, getPermissionsForRoleset } from '../../services/groups';
import { DEVELOPER_PAGES, findDeveloperPage } from './_constants';
import GamesSubPage from './_components/GamesSubPage';
import ClothingSubPage from './_components/ClothingSubPage';
import AdsSubPage from './_components/AdsSubPage';
import Card from '../../components/ui/Card';

interface GroupRole {
  group: { id: number; name: string };
  role: { id: number };
}

/** Groups where the authenticated user can manage games (the only ones relevant to develop). */
const useManageableGroups = (userId: number | null) =>
  useQuery<GroupRole[]>({
    queryKey: ['develop-manageable-groups', userId],
    enabled: !!userId,
    queryFn: async () => {
      const groups: GroupRole[] = await getUserGroups({ userId });
      const checked = await Promise.all(
        groups.map(async (g) => {
          try {
            const perm = await getPermissionsForRoleset({ groupId: g.group.id, rolesetId: g.role.id });
            return perm?.permissions?.groupEconomyPermissions?.manageGroupGames ? g : null;
          } catch {
            return null;
          }
        }),
      );
      return checked.filter((g): g is GroupRole => g !== null);
    },
  });

function DevelopInner() {
  const { userId, isAuthenticated, isPending } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parseInt(searchParams?.get('View') || '0', 10) || 0;
  const page = findDeveloperPage(view);

  const [tab, setTab] = useState<'user' | 'group'>('user');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  useEffect(() => {
    if (!isPending && !isAuthenticated) router.replace('/');
  }, [isPending, isAuthenticated, router]);

  const { data: groups } = useManageableGroups(userId);
  // Default the group selection to the first manageable group.
  useEffect(() => {
    if (selectedGroupId === null && groups && groups.length > 0) {
      setSelectedGroupId(groups[0].group.id);
    }
  }, [groups, selectedGroupId]);

  const groupId = tab === 'group' && selectedGroupId ? selectedGroupId : undefined;

  const subPage = useMemo(() => {
    if (!userId) return null;
    if (page.kind === 'games') return <GamesSubPage userId={userId} groupId={groupId} />;
    if (page.kind === 'ads') return <AdsSubPage userId={userId} groupId={groupId} />;
    if (page.kind === 'clothing' && page.assetType)
      return <ClothingSubPage assetType={page.assetType} groupId={groupId} />;
    return null;
  }, [page, userId, groupId]);

  if (isPending || !isAuthenticated || !userId) return null;

  const tabClass = (active: boolean) =>
    `rounded-rbx px-3 py-1.5 text-sm font-semibold ${
      active ? 'bg-accent text-white' : 'bg-surface-alt text-text hover:bg-surface'
    }`;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-black">Develop</h1>

      <div className="flex items-center gap-2">
        <button type="button" className={tabClass(tab === 'user')} onClick={() => setTab('user')}>
          My Creations
        </button>
        <button
          type="button"
          className={tabClass(tab === 'group')}
          onClick={() => setTab('group')}
          disabled={!groups || groups.length === 0}
        >
          Group Creations
        </button>
      </div>

      {tab === 'group' ? (
        groups && groups.length > 0 ? (
          <select
            value={selectedGroupId ?? ''}
            onChange={(e) => setSelectedGroupId(parseInt(e.target.value, 10))}
            className="w-full max-w-xs rounded-rbx border border-border bg-surface px-2 py-1.5"
          >
            {groups.map((g) => (
              <option key={g.group.id} value={g.group.id}>
                {g.group.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-text-muted">You don&apos;t manage games for any groups.</p>
        )
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
        <nav className="flex flex-col gap-1">
          {DEVELOPER_PAGES.map((p) => (
            <Link
              key={p.view}
              href={`/develop?View=${p.view}`}
              className={`rounded-rbx px-3 py-2 text-sm ${
                p.view === view ? 'bg-accent/10 font-semibold text-accent' : 'hover:bg-surface-alt'
              }`}
            >
              {p.label}
            </Link>
          ))}
        </nav>

        <Card className="min-w-0">{subPage}</Card>
      </div>
    </div>
  );
}

export default function DevelopPage() {
  // useSearchParams requires a Suspense boundary for static prerendering.
  return (
    <Suspense fallback={null}>
      <DevelopInner />
    </Suspense>
  );
}
