'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminGet } from '../../lib/adminClient';
import dayjs from '../../lib/dayjs';

interface Row {
  id: number; actor_id: number; username?: string; is_for_sale: boolean;
  price_in_robux?: number | null; price_in_tickets?: number | null;
  is_limited: boolean; is_limited_unique: boolean; max_copies?: number | null;
  offsale_at?: string | null; created_at: string;
}

export default function ProductHistory({ assetId }: { assetId: number }) {
  const { data } = useQuery({ queryKey: ['product-history', assetId], queryFn: () => adminGet<Row[]>(`/asset/product-history?assetId=${assetId}`) });
  const rows = data || [];
  if (rows.length === 0) return <p className="text-sm text-text-muted">No product history.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-text-muted"><tr className="border-b border-border"><th className="py-2">Actor</th><th>Sale</th><th>R$</th><th>T$</th><th>Limited</th><th>Max</th><th>Offsale</th><th>When</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border">
              <td className="py-2"><a href={`/admin/manage-user/${r.actor_id}`} className="text-accent hover:underline">{r.username || r.actor_id}</a></td>
              <td>{r.is_for_sale ? 'Yes' : 'No'}</td>
              <td>{r.price_in_robux ?? '—'}</td>
              <td>{r.price_in_tickets ?? '—'}</td>
              <td>{r.is_limited_unique ? 'LU' : r.is_limited ? 'L' : '—'}</td>
              <td>{r.max_copies ?? '—'}</td>
              <td>{r.offsale_at ? dayjs(r.offsale_at).format('M/D/YY') : '—'}</td>
              <td>{dayjs(r.created_at).format('M/D/YY')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
