'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminGet } from '../../../../lib/adminClient';
import dayjs from '../../../../lib/dayjs';

interface Entry { id: number; reason: string; created_at: string; author_user_id?: number; internal_reason?: string; expired_at?: string | null }

export default function ModerationHistoryPage() {
  const params = useParams();
  const userId = String(Array.isArray(params?.userId) ? params?.userId[0] : params?.userId);
  const { data } = useQuery({ queryKey: ['admin-mod-history', userId], queryFn: () => adminGet<Entry[]>(`/users/${userId}/moderation-history`) });
  const rows = data || [];
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Moderation History — User {userId}</h1>
      {rows.length === 0 ? <p className="text-text-muted">No moderation history.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-text-muted"><tr className="border-b border-border"><th className="py-2">ID</th><th>Reason</th><th>Internal</th><th>Author</th><th>Created</th><th>Expires</th></tr></thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-b border-border align-top">
                  <td className="py-2">{e.id}</td>
                  <td>{e.reason}</td>
                  <td className="text-text-muted">{e.internal_reason || '—'}</td>
                  <td>{e.author_user_id ? <a href={`/admin/manage-user/${e.author_user_id}`} className="text-accent hover:underline">{e.author_user_id}</a> : '—'}</td>
                  <td>{dayjs(e.created_at).format('M/D/YY h:mm A')}</td>
                  <td>{e.expired_at ? dayjs(e.expired_at).format('M/D/YY') : 'Permanent'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
