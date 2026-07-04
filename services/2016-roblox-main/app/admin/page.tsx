'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminGet, adminPost } from '../../lib/adminClient';
import { useAdminPerms } from '../../components/admin/AdminPermissionsProvider';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

function StatCard({ label, value, tone = 'accent' }: { label: string; value: string; tone?: string }) {
  const toneCls: Record<string, string> = { accent: 'text-accent', positive: 'text-positive', negative: 'text-negative' };
  return (
    <Card>
      <p className={`text-2xl font-semibold ${toneCls[tone] || 'text-accent'}`}>{value}</p>
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
    </Card>
  );
}

export default function AdminDashboard() {
  const { hasPermission } = useAdminPerms();

  const pending = useQuery({
    queryKey: ['admin-pending'],
    queryFn: async () => {
      const [g, a, i] = await Promise.all([
        adminGet<unknown[]>('/groups/pending-icons').catch(() => []),
        adminGet<unknown[]>('/assets/pending-assets').catch(() => []),
        adminGet<unknown[]>('/icons/pending-assets').catch(() => []),
      ]);
      return (g?.length || 0) + (a?.length || 0) + (i?.length || 0);
    },
  });

  const joinsHour = useQuery({ queryKey: ['joins', 'hour'], enabled: hasPermission('GetUserJoinCount'), queryFn: () => adminGet<{ total: number }>('/user-joins?period=past-hour') });
  const joinsDay = useQuery({ queryKey: ['joins', 'day'], enabled: hasPermission('GetUserJoinCount'), queryFn: () => adminGet<{ total: number }>('/user-joins?period=past-day') });
  const online = useQuery({ queryKey: ['online-count'], enabled: hasPermission('GetUsersOnline'), queryFn: () => adminGet<{ total: number }>('/players/online-count') });
  const inGame = useQuery({ queryKey: ['in-game'], enabled: hasPermission('GetUsersInGame'), queryFn: () => adminGet<Array<{ user_id: number; username: string; asset_id: number; asset_name: string }>>('/players/in-game') });

  const [showInGame, setShowInGame] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {hasPermission('GetUserJoinCount') ? (
          <StatCard label="Signups (past hour / day)" tone="positive" value={`${joinsHour.data?.total?.toLocaleString() ?? '-'} / ${joinsDay.data?.total?.toLocaleString() ?? '-'}`} />
        ) : null}
        {hasPermission('GetUsersOnline') || hasPermission('GetUsersInGame') ? (
          <div onClick={() => setShowInGame((v) => !v)} className="cursor-pointer">
            <StatCard label="Online / In-Game (click to expand)" value={`${online.data?.total?.toLocaleString() ?? '-'} / ${inGame.data?.length?.toLocaleString() ?? '-'}`} />
          </div>
        ) : null}
        {pending.data !== undefined ? (
          <a href="/admin/asset/approval"><StatCard label="Pending Assets" tone="negative" value={pending.data.toLocaleString()} /></a>
        ) : null}
      </div>

      {showInGame && inGame.data ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Users In-Game</h2>
          {inGame.data.length === 0 ? <p className="text-text-muted">No users in game.</p> : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {inGame.data.map((u) => (
                <Card key={u.user_id} className="text-sm">
                  <a href={`/users/${u.user_id}/profile`} className="text-accent hover:underline">{u.username}</a>
                  <p className="text-text-muted">Game: <a href={`/games/${u.asset_id}/--`} className="hover:underline">{u.asset_name}</a></p>
                </Card>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {hasPermission('SetAlert') ? <AlertManager /> : null}
    </div>
  );
}

function AlertManager() {
  const { data } = useQuery({ queryKey: ['site-alert'], queryFn: () => adminGet<{ Text: string; LinkUrl: string }>('/alert') });
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  React.useEffect(() => { if (data) { setText(data.Text || ''); setUrl(data.LinkUrl || ''); } }, [data]);
  return (
    <Card className="flex flex-col gap-2">
      <h2 className="font-semibold">Site-Wide Alert</h2>
      <p className="text-sm text-text-muted">Clear the text box and submit to remove the alert.</p>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Alert text" className="rounded-rbx border border-border bg-surface px-3 py-2" />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Alert URL" className="rounded-rbx border border-border bg-surface px-3 py-2" />
      {msg ? <p className="text-sm text-text-muted">{msg}</p> : null}
      <div><Button size="sm" onClick={async () => { setMsg(null); try { await adminPost('/alert', { text, url }); setMsg('Alert updated.'); } catch (e) { setMsg((e as Error).message); } }}>Submit</Button></div>
    </Card>
  );
}
