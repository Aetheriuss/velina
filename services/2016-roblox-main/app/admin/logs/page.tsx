'use client';

import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { adminGet } from '../../../lib/adminClient';

// 'applications' dropped — applications were removed in Phase R.
const LOG_TYPES = ['ban', 'unban', 'robux', 'tickets', 'item', 'alert', 'asset', 'message', 'product', 'refund'];
const USER_COLS = new Set(['user_id', 'author_user_id', 'actor_id', 'actor_user_id']);
const LIMIT = 10;

export default function LogsPage() {
  const [logType, setLogType] = useState('ban');
  const [offset, setOffset] = useState(0);

  const { data, isFetching } = useQuery({
    queryKey: ['admin-logs', logType, offset],
    placeholderData: keepPreviousData,
    queryFn: () => adminGet<{ data: Array<Record<string, unknown>>; columns: string[] }>(`/logs?logType=${logType}&offset=${offset}&limit=${LIMIT}`),
  });
  const rows = data?.data || [];
  const columns = data?.columns || (rows[0] ? Object.keys(rows[0]) : []);

  const cell = (col: string, val: unknown) => {
    if (val == null) return '—';
    if (USER_COLS.has(col)) return <a href={`/admin/manage-user/${String(val)}`} className="text-accent hover:underline">{String(val)}</a>;
    if (col === 'asset_id') return <a href={`/admin/product/update?assetId=${String(val)}`} className="text-accent hover:underline">{String(val)}</a>;
    return String(val);
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Moderation Logs</h1>
      <select value={logType} onChange={(e) => { setLogType(e.target.value); setOffset(0); }} className="w-40 rounded-rbx border border-border bg-surface px-2 py-1.5 text-sm">
        {LOG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      {rows.length === 0 ? <p className="text-text-muted">No log entries.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-text-muted"><tr className="border-b border-border">{columns.map((c) => <th key={c} className="py-2 pr-4">{c}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border">{columns.map((c) => <td key={c} className="py-1 pr-4">{cell(c, r[c])}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex justify-center gap-3">
        <button type="button" disabled={isFetching || !offset} onClick={() => setOffset((o) => Math.max(0, o - LIMIT))} className="rounded-rbx border border-border px-4 py-1.5 text-sm disabled:opacity-40">Previous</button>
        <span className="text-sm text-text-muted">Page {offset / LIMIT + 1}</span>
        <button type="button" disabled={isFetching || rows.length < LIMIT} onClick={() => setOffset((o) => o + LIMIT)} className="rounded-rbx border border-border px-4 py-1.5 text-sm disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
