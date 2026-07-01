'use client';

import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { adminGet, adminPost } from '../../../lib/adminClient';
import dayjs from '../../../lib/dayjs';
import Button from '../../../components/ui/Button';

interface Report { id: number; createdAt: string; reportReason: string; reportMessage: string; userId: number }

export default function AbuseReportsPage() {
  const [mode, setMode] = useState('Pending');
  const [offset, setOffset] = useState(0);
  const { data, refetch, isFetching } = useQuery({
    queryKey: ['reports', mode, offset],
    placeholderData: keepPreviousData,
    queryFn: () => adminGet<Report[]>(`/reports/list?status=${mode}&offset=${offset}&sort=${mode === 'Pending' ? 'Asc' : 'Desc'}`),
  });
  const rows = data || [];

  const act = async (id: number, path: string) => { try { await adminPost(`/reports/${id}/${path}`); refetch(); } catch (e) { alert((e as Error).message); } };
  const sel = 'rounded-rbx border border-border bg-surface px-2 py-1.5 text-sm';

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-black">Abuse Reports</h1>
      <select className={`${sel} w-40`} value={mode} onChange={(e) => { setMode(e.target.value); setOffset(0); }}>
        {['Pending', 'Valid', 'InvalidGood', 'InvalidBad'].map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      {rows.length === 0 ? <p className="text-text-muted">No reports.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-text-muted"><tr className="border-b border-border"><th className="py-2">Submitted</th><th>Reason</th><th>Message</th><th>Author</th>{mode === 'Pending' ? <th>Actions</th> : null}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border align-top">
                  <td className="py-2 whitespace-nowrap">{dayjs(r.createdAt).format('M/D/YY h:mm A')}</td>
                  <td>{r.reportReason}</td>
                  <td className="max-w-md">{r.reportMessage}</td>
                  <td><a href={`/admin/manage-user/${r.userId}`} className="text-accent hover:underline">{r.userId}</a></td>
                  {mode === 'Pending' ? (
                    <td>
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => act(r.id, 'accept')}>Accept</Button>
                        <Button size="sm" variant="ghost" onClick={() => act(r.id, 'decline')}>Invalid</Button>
                        <Button size="sm" variant="ghost" onClick={() => act(r.id, 'invalid')}>Bad</Button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex justify-center gap-3">
        <button type="button" disabled={isFetching || !offset} onClick={() => setOffset((o) => Math.max(0, o - 25))} className="rounded-rbx border border-border px-4 py-1.5 text-sm disabled:opacity-40">Previous</button>
        <button type="button" disabled={isFetching || rows.length === 0} onClick={() => setOffset((o) => o + 25)} className="rounded-rbx border border-border px-4 py-1.5 text-sm disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
