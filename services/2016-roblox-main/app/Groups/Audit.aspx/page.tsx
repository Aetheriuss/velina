'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getGroupAuditLog, getGroupInfo } from '../../../services/groups';
import dayjs from '../../../lib/dayjs';
import Card from '../../../components/ui/Card';

interface Entry {
  created: string;
  actor?: { user?: { userId: number; username: string }; role?: { name: string } };
  actionType?: string;
  description?: Record<string, unknown>;
}

const describe = (e: Entry): string => {
  const d = (e.description || {}) as Record<string, string | number>;
  switch (e.actionType) {
    case 'Spend Group Funds': return `One-time payout of ${d.Amount} ${d.CurrencyTypeName} to ${d.TargetName ?? 'a user'}`;
    case 'Update Roleset Data': return `Configured ${d.RoleSetName}`;
    case 'Update Roleset Rank': return `Changed ${d.RoleSetName} rank from ${d.OldRank} to ${d.NewRank}`;
    case 'Change Rank': return `Changed ${d.TargetName}'s rank from ${d.OldRoleSetName} to ${d.NewRoleSetName}`;
    case 'Change Owner': return `Changed the group owner to ${d.NewOwnerName}`;
    case 'Delete Post': return `Deleted a post by ${d.TargetName}`;
    case 'Lock': return 'Locked the group';
    case 'Unlock': return 'Unlocked the group';
    default: return e.actionType || 'Unknown action';
  }
};

function AuditInner() {
  const searchParams = useSearchParams();
  const groupId = Number(searchParams?.get('groupid') || 0);
  const [cursor, setCursor] = useState('');

  const { data: info } = useQuery({ queryKey: ['group-info', groupId], queryFn: () => getGroupInfo({ groupId }), enabled: groupId > 0 });
  const { data, isFetching } = useQuery({
    queryKey: ['audit', groupId, cursor],
    enabled: groupId > 0,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await getGroupAuditLog({ groupId, cursor, userId: '', action: '' });
      return { rows: (res.data || []) as Entry[], next: res.nextPageCursor as string | null, prev: res.previousPageCursor as string | null };
    },
  });
  const rows = data?.rows || [];

  if (!groupId) return <p className="text-text-muted">No group specified.</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{info?.name ? `${info.name} — Audit Log` : 'Audit Log'}</h1>
      {isFetching && rows.length === 0 ? (
        <p className="text-text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-text-muted">No audit entries.</p>
      ) : (
        <Card flush className="overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead className="text-left text-text-muted"><tr className="border-b border-border"><th className="py-2">Date</th><th>User</th><th>Rank</th><th>Action</th></tr></thead>
            <tbody>
              {rows.map((e, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-2">{dayjs(e.created).format('M/D/YY h:mm A')}</td>
                  <td>{e.actor?.user ? <a href={`/users/${e.actor.user.userId}/profile`} className="text-accent hover:underline">{e.actor.user.username}</a> : '—'}</td>
                  <td>{e.actor?.role?.name || '—'}</td>
                  <td>{describe(e)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <div className="flex justify-center gap-3">
        <button type="button" disabled={!data?.prev || isFetching} onClick={() => data?.prev && setCursor(data.prev)} className="rounded-rbx border border-border px-4 py-1.5 text-sm disabled:opacity-40">Previous</button>
        <button type="button" disabled={!data?.next || isFetching} onClick={() => data?.next && setCursor(data.next)} className="rounded-rbx border border-border px-4 py-1.5 text-sm disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}

export default function GroupAuditPage() {
  return <Suspense fallback={null}><AuditInner /></Suspense>;
}
