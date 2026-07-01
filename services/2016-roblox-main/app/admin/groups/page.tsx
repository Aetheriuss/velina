'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { adminGet, adminPost } from '../../../lib/adminClient';
import dayjs from '../../../lib/dayjs';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

interface GroupInfo { id: number; name: string; description?: string; user_id?: number; locked?: boolean; created_at?: string }
interface GroupDetail { info: GroupInfo; icon?: { name?: string; is_approved?: boolean } }

export default function AdminGroupsPage() {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [byId, setById] = useState('');
  const [byName, setByName] = useState('');
  const [selected, setSelected] = useState<{ kind: 'id' | 'name'; value: string } | null>(null);

  const list = useQuery({
    queryKey: ['admin-groups-list', offset],
    placeholderData: keepPreviousData,
    queryFn: () => adminGet<GroupInfo[]>(`/groups/list?sortOrder=asc&sortColumn=group.id&limit=10&offset=${offset}`),
  });

  const detail = useQuery({
    queryKey: ['admin-group', selected],
    enabled: !!selected,
    queryFn: () => adminGet<GroupDetail>(selected!.kind === 'id' ? `/groups/get-by-id?groupId=${encodeURIComponent(selected!.value)}` : `/groups/get-by-name?name=${encodeURIComponent(selected!.value)}`),
  });
  const g = detail.data?.info;

  const audit = useQuery({
    queryKey: ['admin-group-audit', g?.id],
    enabled: !!g?.id,
    queryFn: () => adminGet<Array<Record<string, unknown>>>(`/groups/audit-log?groupId=${g!.id}`),
  });
  const auditCols = audit.data && audit.data.length ? Object.keys(audit.data[0]) : [];

  const refreshDetail = () => queryClient.invalidateQueries({ queryKey: ['admin-group', selected] });
  const toggleLock = async () => { if (!g) return; try { await adminPost(`/groups/toggle-lock-status?groupId=${g.id}&locked=${!g.locked}`); refreshDetail(); } catch (e) { alert((e as Error).message); } };
  const reset = async () => { if (!g) return; if (prompt("Type 'yes' to confirm deletion.") !== 'yes') return; try { await adminPost(`/groups/reset?groupId=${g.id}`); refreshDetail(); } catch (e) { alert((e as Error).message); } };

  const input = 'rounded-rbx border border-border bg-surface px-3 py-2 text-sm';
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-black">Groups</h1>
      <Card className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-xs text-text-muted">By ID<input className={input} value={byId} onChange={(e) => setById(e.target.value)} /></label>
        <Button size="sm" disabled={!byId} onClick={() => setSelected({ kind: 'id', value: byId })}>Find</Button>
        <label className="flex flex-col text-xs text-text-muted">By Name<input className={input} value={byName} onChange={(e) => setByName(e.target.value)} /></label>
        <Button size="sm" disabled={!byName} onClick={() => setSelected({ kind: 'name', value: byName })}>Find</Button>
      </Card>

      {g ? (
        <Card className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">{g.name} <span className="text-sm text-text-muted">#{g.id}</span></h2>
              <p className="text-sm text-text-muted">Owner: {g.user_id ? <a href={`/admin/manage-user/${g.user_id}`} className="text-accent hover:underline">{g.user_id}</a> : 'None'} · {g.locked ? 'Locked' : 'Unlocked'}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{g.description}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button size="sm" variant="secondary" onClick={toggleLock}>{g.locked ? 'Unlock' : 'Lock'}</Button>
              <Button size="sm" className="bg-negative text-white" onClick={reset}>Delete</Button>
            </div>
          </div>
          {auditCols.length ? (
            <div className="mt-2 overflow-x-auto">
              <p className="mb-1 text-sm font-semibold">Audit Log</p>
              <table className="w-full text-xs">
                <thead className="text-left text-text-muted"><tr className="border-b border-border">{auditCols.map((c) => <th key={c} className="py-1 pr-3">{c}</th>)}</tr></thead>
                <tbody>{(audit.data || []).map((r, i) => <tr key={i} className="border-b border-border">{auditCols.map((c) => <td key={c} className="py-1 pr-3">{String(r[c] ?? '')}</td>)}</tr>)}</tbody>
              </table>
            </div>
          ) : null}
        </Card>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-text-muted"><tr className="border-b border-border"><th className="py-2">ID</th><th>Name</th><th>Owner</th><th>Created</th></tr></thead>
          <tbody>
            {(list.data || []).map((row) => (
              <tr key={row.id} className="border-b border-border">
                <td className="py-2">{row.id}</td>
                <td><button type="button" onClick={() => setSelected({ kind: 'id', value: String(row.id) })} className="text-accent hover:underline">{row.name}</button>{row.locked ? ' 🔒' : ''}</td>
                <td>{row.user_id ?? '—'}</td>
                <td>{row.created_at ? dayjs(row.created_at).format('M/D/YY') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center gap-3">
        <button type="button" disabled={list.isFetching || !offset} onClick={() => setOffset((o) => Math.max(0, o - 10))} className="rounded-rbx border border-border px-4 py-1.5 text-sm disabled:opacity-40">Previous</button>
        <button type="button" disabled={list.isFetching || (list.data?.length || 0) < 10} onClick={() => setOffset((o) => o + 10)} className="rounded-rbx border border-border px-4 py-1.5 text-sm disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
