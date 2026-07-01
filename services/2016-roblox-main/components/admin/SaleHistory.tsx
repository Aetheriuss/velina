'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminGet, adminPost } from '../../lib/adminClient';
import { useAdminPerms } from './AdminPermissionsProvider';
import dayjs from '../../lib/dayjs';

interface Sale { id: number; user_id_one: number; username?: string; amount: number; currency_type: number; user_asset_id?: number; created_at: string }

export default function SaleHistory({ assetId }: { assetId: number }) {
  const { hasPermission } = useAdminPerms();
  const canRefund = hasPermission('RefundAndDeleteFirstPartyAssetSale');
  const [limit, setLimit] = useState(100);
  const { data, refetch } = useQuery({
    queryKey: ['sale-history', assetId, limit],
    queryFn: () => adminGet<Sale[]>(`/asset/sale-history?assetId=${assetId}&limit=${limit}&offset=0&start=&end=`),
  });
  const rows = data || [];

  const refund = async (s: Sale) => {
    if (!confirm(`Refund transaction ${s.id}?`)) return;
    try { await adminPost(`/asset/refund-transaction?transactionId=${s.id}&assetId=${assetId}&userId=${s.user_id_one}&expectedAmount=${s.amount}`); refetch(); }
    catch (e) { alert((e as Error).message); }
  };

  return (
    <div className="flex flex-col gap-2">
      <select value={limit} onChange={(e) => setLimit(parseInt(e.target.value, 10))} className="w-24 rounded-rbx border border-border bg-surface px-2 py-1 text-sm">
        {[10, 100, 1000].map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
      {rows.length === 0 ? <p className="text-sm text-text-muted">No sales.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-text-muted"><tr className="border-b border-border"><th className="py-2">ID</th><th>Buyer</th><th>Amount</th><th>UAID</th><th>Date</th>{canRefund ? <th></th> : null}</tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b border-border">
                  <td className="py-2">{s.id}</td>
                  <td><a href={`/admin/manage-user/${s.user_id_one}`} className="text-accent hover:underline">{s.username || s.user_id_one}</a></td>
                  <td>{s.currency_type === 1 ? 'R$' : 'Tix'} {s.amount.toLocaleString()}</td>
                  <td>{s.user_asset_id ?? '—'}</td>
                  <td>{dayjs(s.created_at).format('M/D/YY')}</td>
                  {canRefund ? <td><button type="button" onClick={() => refund(s)} className="text-negative hover:underline">Refund</button></td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
