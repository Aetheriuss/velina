'use client';

import React, { Suspense, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getInfo, getRoles, getMembers, setUserRole, setGroupDescription, setGroupIcon,
  getGroupSettings, setGroupSettings, oneTimePayout,
} from '../../../services/groups';
import { getRobuxGroup, getGroupTransactionSummary, formatSummaryResponse } from '../../../services/economy';
import { getUserIdByUsername } from '../../../services/users';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

type Tab = 'Group Info' | 'Members' | 'Settings' | 'Payouts' | 'Revenue';
const input = 'rounded-rbx border border-border bg-surface px-3 py-2';

function GroupInfoTab({ groupId }: { groupId: number }) {
  const { data: info } = useQuery({ queryKey: ['group', groupId], queryFn: () => getInfo({ groupId }) });
  const [desc, setDesc] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const iconRef = useRef<HTMLInputElement>(null);
  React.useEffect(() => { if (info?.description != null) setDesc(info.description); }, [info]);
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-semibold">Group Info</h2>
      <label className="text-sm text-text-muted">Description</label>
      <textarea value={desc} rows={5} onChange={(e) => setDesc(e.target.value)} className={input} />
      <div><Button size="sm" onClick={async () => { setMsg(null); try { await setGroupDescription({ groupId, description: desc }); setMsg('Saved.'); } catch (e) { setMsg((e as Error).message); } }}>Save Description</Button></div>
      <label className="text-sm text-text-muted">Emblem</label>
      <input ref={iconRef} type="file" accept="image/*" className="text-sm" />
      <div><Button size="sm" variant="secondary" onClick={async () => { const f = iconRef.current?.files?.[0]; if (!f) return; setMsg(null); try { await setGroupIcon({ groupId, icon: f }); setMsg('Icon updated.'); } catch (e) { setMsg((e as Error).message); } }}>Upload Emblem</Button></div>
      {msg ? <p className="text-sm text-text-muted">{msg}</p> : null}
    </Card>
  );
}

function MembersTab({ groupId }: { groupId: number }) {
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState('');
  const { data: roles } = useQuery({ queryKey: ['group-roles', groupId], queryFn: () => getRoles({ groupId }) });
  const key = ['admin-members', groupId, cursor];
  const { data } = useQuery({
    queryKey: key,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await getMembers({ groupId, cursor, limit: 12, sortOrder: 'Asc' });
      return { rows: (res.data || []) as Array<{ user: { userId: number; username: string }; role?: { id: number; name: string } }>, next: res.nextPageCursor as string | null };
    },
  });
  const roleList = (roles || []) as Array<{ id: number; name: string; rank: number }>;
  return (
    <Card className="flex flex-col gap-2">
      <h2 className="font-semibold">Members</h2>
      {(data?.rows || []).map((m) => (
        <div key={m.user.userId} className="flex items-center justify-between gap-2 border-b border-border py-2 text-sm last:border-0">
          <a href={`/users/${m.user.userId}/profile`} className="truncate text-accent hover:underline">{m.user.username}</a>
          <select
            defaultValue={m.role?.id}
            onChange={async (e) => { await setUserRole({ groupId, userId: m.user.userId, roleId: parseInt(e.target.value, 10) }); queryClient.invalidateQueries({ queryKey: key }); }}
            className="rounded-rbx border border-border bg-surface px-2 py-1"
          >
            {roleList.filter((r) => r.rank !== 0).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      ))}
      {data?.next ? <div className="mt-2"><Button size="sm" variant="secondary" onClick={() => setCursor(data.next as string)}>Load more</Button></div> : null}
    </Card>
  );
}

function SettingsTab({ groupId }: { groupId: number }) {
  const { data } = useQuery({ queryKey: ['group-settings', groupId], queryFn: () => getGroupSettings({ groupId }) });
  const [s, setS] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<string | null>(null);
  React.useEffect(() => { if (data) setS({ isApprovalRequired: !!data.isApprovalRequired, areEnemiesAllowed: !!data.areEnemiesAllowed, areGroupFundsVisible: !!data.areGroupFundsVisible, areGroupGamesVisible: !!data.areGroupGamesVisible }); }, [data]);
  const toggle = (k: string) => setS((prev) => ({ ...prev, [k]: !prev[k] }));
  const labels: Record<string, string> = { isApprovalRequired: 'Manual approval to join', areEnemiesAllowed: 'Allow enemy declarations', areGroupFundsVisible: 'Group funds visible', areGroupGamesVisible: 'Group games visible' };
  return (
    <Card className="flex flex-col gap-2">
      <h2 className="font-semibold">Settings</h2>
      {Object.keys(labels).map((k) => (
        <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!s[k]} onChange={() => toggle(k)} /> {labels[k]}</label>
      ))}
      <div><Button size="sm" onClick={async () => { setMsg(null); try { await setGroupSettings({ groupId, isApprovalRequired: !!s.isApprovalRequired, areEnemiesAllowed: !!s.areEnemiesAllowed, areGroupFundsVisible: !!s.areGroupFundsVisible, areGroupGamesVisible: !!s.areGroupGamesVisible }); setMsg('Saved.'); } catch (e) { setMsg((e as Error).message); } }}>Save Settings</Button></div>
      {msg ? <p className="text-sm text-text-muted">{msg}</p> : null}
    </Card>
  );
}

function PayoutsTab({ groupId }: { groupId: number }) {
  const [username, setUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const pay = async () => {
    setMsg(null);
    try {
      const r = await getUserIdByUsername(username);
      const uid = (r?.data?.[0]?.id ?? r?.id ?? r) as number;
      if (!uid) return setMsg('User not found.');
      await oneTimePayout({ groupId, userId: uid, amount: parseInt(amount, 10) || 0 });
      setMsg('Payout sent.');
    } catch (e) { setMsg((e as Error).message); }
  };
  return (
    <Card className="flex flex-col gap-2">
      <h2 className="font-semibold">One-Time Payout</h2>
      <label className="text-sm text-text-muted">Recipient username</label>
      <input value={username} onChange={(e) => setUsername(e.target.value)} className={input} />
      <label className="text-sm text-text-muted">Amount (Robux)</label>
      <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className={`${input} w-40`} />
      <div><Button size="sm" onClick={pay}>Pay</Button></div>
      {msg ? <p className="text-sm text-text-muted">{msg}</p> : null}
    </Card>
  );
}

function RevenueTab({ groupId }: { groupId: number }) {
  const [period, setPeriod] = useState('Month');
  const { data } = useQuery({
    queryKey: ['group-revenue', groupId, period],
    queryFn: async () => formatSummaryResponse(await getGroupTransactionSummary({ groupId, timePeriod: period }), 'Group') as Array<[string, string]>,
  });
  return (
    <Card className="flex flex-col gap-2">
      <h2 className="font-semibold">Revenue</h2>
      <select value={period} onChange={(e) => setPeriod(e.target.value)} className={`${input} w-40`}>
        {['Day', 'Week', 'Month', 'Year'].map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <table className="w-full text-sm">
        <tbody>{(data || []).map(([l, v]) => <tr key={l} className="border-b border-border last:border-0"><td className="py-2 text-text-muted">{l}</td><td className="py-2 text-right font-medium">{v || '—'}</td></tr>)}</tbody>
      </table>
    </Card>
  );
}

function AdminInner() {
  const searchParams = useSearchParams();
  const groupId = Number(searchParams?.get('gid') || 0);
  const [tab, setTab] = useState<Tab>('Group Info');
  const { data: info } = useQuery({ queryKey: ['group', groupId], queryFn: () => getInfo({ groupId }), enabled: groupId > 0 });
  const { data: funds } = useQuery({ queryKey: ['group-funds', groupId], queryFn: () => getRobuxGroup({ groupId }), enabled: groupId > 0 });

  if (!groupId) return <p className="text-text-muted">No group specified.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">{info?.name ? `Manage ${info.name}` : 'Manage Group'}</h1>
        <span className="text-sm text-text-muted">Funds: R$ {(funds?.robux ?? 0).toLocaleString()}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {(['Group Info', 'Members', 'Settings', 'Payouts', 'Revenue'] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-rbx px-3 py-1.5 text-sm font-semibold ${tab === t ? 'bg-accent text-white' : 'bg-surface-alt hover:bg-surface'}`}>{t}</button>
        ))}
      </div>
      {tab === 'Group Info' ? <GroupInfoTab groupId={groupId} /> :
        tab === 'Members' ? <MembersTab groupId={groupId} /> :
        tab === 'Settings' ? <SettingsTab groupId={groupId} /> :
        tab === 'Payouts' ? <PayoutsTab groupId={groupId} /> :
        <RevenueTab groupId={groupId} />}
      <p className="text-xs text-text-muted">Role &amp; permission editing is not yet available in the new UI.</p>
    </div>
  );
}

export default function GroupAdminPage() {
  return <Suspense fallback={null}><AdminInner /></Suspense>;
}
