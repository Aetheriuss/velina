'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminGet } from '../../../../lib/adminClient';
import dayjs from '../../../../lib/dayjs';

interface Track {
  id: number; created_at: string; track_type: string;
  user_one_username?: string; user_two_username?: string; amount?: number; currency_type?: number;
  author_username?: string; user_id_from?: number | null; from_username?: string; to_username?: string;
}

const describe = (t: Track): string => {
  const cur = t.currency_type === 1 ? 'R$' : 'Tix';
  switch (t.track_type) {
    case 'Sale': return `${t.user_one_username} purchased from ${t.user_two_username} for ${t.amount} ${cur}`;
    case 'Trade': return `${t.user_one_username} traded the item to ${t.user_two_username} (Trade #${t.id})`;
    case 'ModerationGive':
      return t.user_id_from == null
        ? `Moderator ${t.author_username} created the item and gave it to ${t.to_username}`
        : `Moderator ${t.author_username} transferred the item from ${t.from_username} to ${t.to_username}`;
    default: return t.track_type;
  }
};

export default function ManageUserAssetPage() {
  const params = useParams();
  const userAssetId = String(Array.isArray(params?.userAssetId) ? params?.userAssetId[0] : params?.userAssetId);
  const { data } = useQuery({ queryKey: ['admin-trackitem', userAssetId], queryFn: () => adminGet<Track[]>(`/trackitem?userAssetId=${userAssetId}`) });
  const rows = data || [];
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Item History — UAID {userAssetId}</h1>
      {rows.length === 0 ? <p className="text-text-muted">No history.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-text-muted"><tr className="border-b border-border"><th className="py-2">Date</th><th>Event</th></tr></thead>
            <tbody>
              {rows.map((t, i) => (
                <tr key={i} className="border-b border-border"><td className="py-2 whitespace-nowrap">{dayjs(t.created_at).format('M/D/YY h:mm A')}</td><td>{describe(t)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
