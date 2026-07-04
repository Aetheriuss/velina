'use client';

import React, { useState } from 'react';
import { adminGet } from '../../../../lib/adminClient';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

type Row = Record<string, unknown>;

export default function TrackAssetPage() {
  const [assetId, setAssetId] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [cols, setCols] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async (path: string) => {
    if (!assetId) return;
    setBusy(true);
    setMsg(null);
    try {
      const data = await adminGet<Row[]>(path);
      setRows(data || []);
      setCols(data && data.length ? Object.keys(data[0]) : []);
      if (!data || data.length === 0) setMsg('No results.');
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Track User Assets</h1>
      <Card className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-xs text-text-muted">Asset ID<input className="rounded-rbx border border-border bg-surface px-3 py-2" value={assetId} onChange={(e) => setAssetId(e.target.value)} /></label>
        <Button size="sm" disabled={busy || !assetId} onClick={() => load(`/assets/giveitem-circ?assetId=${assetId}&limit=100`)}>Rollback Circulation</Button>
        <Button size="sm" variant="secondary" disabled={busy || !assetId} onClick={() => load(`/assets/${assetId}/owners`)}>All Owners</Button>
      </Card>
      {msg ? <p className="text-sm text-text-muted">{msg}</p> : null}
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-text-muted"><tr className="border-b border-border">{cols.map((c) => <th key={c} className="py-2 pr-4">{c}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border">
                  {cols.map((c) => (
                    <td key={c} className="py-1 pr-4">
                      {c === 'UserID' && r[c] ? <a href={`/admin/manage-user/${String(r[c])}`} className="text-accent hover:underline">{String(r[c])}</a> : String(r[c] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
