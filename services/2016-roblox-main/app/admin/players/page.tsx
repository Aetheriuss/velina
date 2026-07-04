'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminGet, adminPost } from '../../../lib/adminClient';
import dayjs from '../../../lib/dayjs';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

interface Player {
  id: number;
  username: string;
  created_at: string;
  online_at: string;
  status: string;
  balance_robux?: number;
  balance_tickets?: number;
  is_18_plus?: boolean;
}

export default function PlayersPage() {
  const [sortColumn, setSortColumn] = useState('user.id');
  const [sortMode, setSortMode] = useState('asc');
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState('');
  const [applied, setApplied] = useState('');
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [reason, setReason] = useState('');
  const [internalReason, setInternalReason] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['admin-players', sortColumn, sortMode, limit, offset, applied],
    queryFn: async () => {
      const res = await adminGet<{ data: Player[] }>(
        `/users?orderByColumn=${encodeURIComponent(sortColumn)}&orderByMode=${sortMode}&limit=${limit}&offset=${offset}&query=${encodeURIComponent(applied)}`,
      );
      return res.data || [];
    },
  });
  const players = data || [];
  const selected = players.filter((p) => checked.has(p.id));

  const toggle = (id: number) => setChecked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const massBan = async () => {
    if (!reason.trim()) return alert('Please specify a reason.');
    if (!confirm(`Ban ${selected.length} user(s)?`)) return;
    setBusy(true);
    try { for (const p of selected) await adminPost('/ban', { userId: p.id, reason, internalReason }); alert('Done.'); setChecked(new Set()); refetch(); }
    catch (e) { alert('Error: ' + (e as Error).message); } finally { setBusy(false); }
  };
  const massReset = async () => {
    if (!confirm(`Reset usernames of ${selected.length} user(s)?`)) return;
    setBusy(true);
    try { for (const p of selected) await adminPost(`/users/${p.id}/reset-username`); alert('Done.'); setChecked(new Set()); refetch(); }
    catch (e) { alert('Error: ' + (e as Error).message); } finally { setBusy(false); }
  };

  const sel = 'rounded-rbx border border-border bg-surface px-2 py-1.5 text-sm';

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Players</h1>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-xs text-text-muted">Sort<select className={sel} value={sortMode} onChange={(e) => setSortMode(e.target.value)}><option value="asc">ASC</option><option value="desc">DESC</option></select></label>
        <label className="flex flex-col text-xs text-text-muted">Column
          <select className={sel} value={sortColumn} onChange={(e) => setSortColumn(e.target.value)}>
            <option value="user.id">ID</option>
            <option value="user_economy.balance_robux">RBX</option>
            <option value="user_economy.balance_tickets">TIX</option>
            <option value="user.online_at">Online Time</option>
          </select>
        </label>
        <label className="flex flex-col text-xs text-text-muted">Limit
          <select className={sel} value={limit} onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setOffset(0); }}>
            {[10, 50, 100, 1000].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-xs text-text-muted">Search username<input className={sel} maxLength={32} value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        <Button size="sm" onClick={() => { setOffset(0); setApplied(query); }}>Search</Button>
      </div>

      {selected.length ? (
        <Card className="flex flex-col gap-2">
          <p className="text-sm font-bold">Mass action ({selected.length})</p>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ban reason" className={sel} />
          <textarea value={internalReason} onChange={(e) => setInternalReason(e.target.value)} rows={2} placeholder="Internal reason" className={sel} />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={massBan} className="bg-negative text-white">Ban</Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={massReset}>Reset Names</Button>
          </div>
        </Card>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-text-muted">
            <tr className="border-b border-border">
              <th className="py-2"><input type="checkbox" onChange={(e) => setChecked(e.target.checked ? new Set(players.map((p) => p.id)) : new Set())} /></th>
              <th>#</th><th>Name</th><th>Created</th><th>Online</th><th>Status</th><th>RBX</th><th>TX</th><th>18+</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id} className="border-b border-border">
                <td className="py-2"><input type="checkbox" checked={checked.has(p.id)} onChange={() => toggle(p.id)} /></td>
                <td><a href={`/admin/manage-user/${p.id}`} className="text-accent hover:underline">{p.id}</a></td>
                <td><a href={`/admin/manage-user/${p.id}`} className="text-accent hover:underline">{p.username}</a></td>
                <td>{dayjs(p.created_at).format('MMM DD YYYY, h:mm A')}</td>
                <td>{dayjs(p.online_at).format('MMM DD YYYY, h:mm A')}</td>
                <td>
                  <span className={`rounded px-2 py-0.5 text-xs text-white ${p.status === 'Ok' ? 'bg-positive' : p.status === 'Deleted' || p.status === 'Forgotten' ? 'bg-negative' : 'bg-yellow-500'}`}>{p.status}</span>
                </td>
                <td>R${(p.balance_robux ?? 0).toLocaleString()}</td>
                <td>T${(p.balance_tickets ?? 0).toLocaleString()}</td>
                <td>{p.is_18_plus ? '✓' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button type="button" disabled={isFetching || !offset} onClick={() => setOffset((o) => Math.max(0, o - limit))} className="rounded-rbx border border-border px-4 py-1.5 text-sm disabled:opacity-40">Previous</button>
        <span className="text-sm text-text-muted">Page {offset / limit + 1}</span>
        <button type="button" disabled={isFetching || players.length < limit} onClick={() => setOffset((o) => o + limit)} className="rounded-rbx border border-border px-4 py-1.5 text-sm disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
