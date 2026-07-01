'use client';

import React, { useState } from 'react';
import { adminGet } from '../../../lib/adminClient';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

interface Result { assets?: Array<{ assetId: number }>; users?: Array<{ userId: number }>; groups?: Array<{ groupId: number }> }

export default function ResolveUrlPage() {
  const [url, setUrl] = useState('');
  const [data, setData] = useState<Result | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lookup = async () => {
    setBusy(true);
    setMsg(null);
    try { setData(await adminGet<Result>(`/moderation/get-by-thumbnail?url=${encodeURIComponent(url)}`)); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-xl flex flex-col gap-4">
      <h1 className="text-3xl font-black">Resolve URL</h1>
      <Card className="flex gap-2">
        <input className="flex-1 rounded-rbx border border-border bg-surface px-3 py-2" placeholder="Thumbnail / asset URL" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button size="sm" disabled={busy || !url} onClick={lookup}>Lookup</Button>
      </Card>
      {msg ? <p className="text-sm text-negative">{msg}</p> : null}
      {data ? (
        <Card className="flex flex-col gap-1 text-sm">
          {(data.assets || []).map((a) => <a key={`a${a.assetId}`} href={`/catalog/${a.assetId}/-`} className="text-accent hover:underline">Asset {a.assetId}</a>)}
          {(data.users || []).map((u) => <a key={`u${u.userId}`} href={`/admin/manage-user/${u.userId}`} className="text-accent hover:underline">User {u.userId}</a>)}
          {(data.groups || []).map((g) => <a key={`g${g.groupId}`} href={`/My/Groups.aspx?gid=${g.groupId}`} className="text-accent hover:underline">Group {g.groupId}</a>)}
          {!(data.assets?.length || data.users?.length || data.groups?.length) ? <p className="text-text-muted">No matches.</p> : null}
        </Card>
      ) : null}
    </div>
  );
}
