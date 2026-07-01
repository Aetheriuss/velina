'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminGet } from '../../../lib/adminClient';
import { useAdminPerms } from '../../../components/admin/AdminPermissionsProvider';
import dayjs from '../../../lib/dayjs';

interface Play { asset_id: number; name: string; user_id: number; username: string; created_at: string; ended_at?: string | null }

export default function GameHistoryPage() {
  const { hasPermission } = useAdminPerms();
  const { data } = useQuery({ queryKey: ['game-history'], enabled: hasPermission('GetUsersInGame'), queryFn: () => adminGet<Play[]>('/games/play-history?limit=100&offset=0') });
  const rows = data || [];

  if (!hasPermission('GetUsersInGame')) return <p className="text-text-muted">You do not have permission to view game history.</p>;

  const dur = (p: Play) => {
    const end = p.ended_at ? dayjs(p.ended_at) : dayjs();
    const secs = Math.max(0, end.diff(dayjs(p.created_at), 'second'));
    const m = Math.floor(secs / 60);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-black">Game Play History</h1>
      {rows.length === 0 ? <p className="text-text-muted">No history.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-text-muted"><tr className="border-b border-border"><th className="py-2">Game</th><th>User</th><th>Started</th><th>Ended</th><th>Duration</th></tr></thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-2"><a href={`/games/${p.asset_id}/--`} target="_blank" rel="noreferrer" className="text-accent hover:underline">{p.name}</a></td>
                  <td><a href={`/admin/manage-user/${p.user_id}`} className="text-accent hover:underline">{p.username}</a></td>
                  <td>{dayjs(p.created_at).format('M/D/YY h:mm A')}</td>
                  <td>{p.ended_at ? dayjs(p.ended_at).format('M/D/YY h:mm A') : <span className="rounded bg-positive px-2 py-0.5 text-xs text-white">Running</span>}</td>
                  <td>{dur(p)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
