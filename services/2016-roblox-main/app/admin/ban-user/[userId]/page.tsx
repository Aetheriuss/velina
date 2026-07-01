'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminPost } from '../../../../lib/adminClient';
import dayjs from '../../../../lib/dayjs';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

const EXPIRY: Array<{ label: string; days: number | null }> = [
  { label: 'Permanent', days: null },
  { label: '1 Day', days: 1 },
  { label: '3 Days', days: 3 },
  { label: '1 Week', days: 7 },
  { label: '2 Weeks', days: 14 },
];
const QUICK = ['TOS Violation', 'Bad Username', 'Spam', 'Inappropriate Behaviour', 'Hate Speech', 'Real-Life Information', 'Scamming', 'Account Theft', 'Ban Evasion'];

export default function BanUserPage() {
  const params = useParams();
  const router = useRouter();
  const userId = String(Array.isArray(params?.userId) ? params?.userId[0] : params?.userId);
  const [reason, setReason] = useState('');
  const [internalReason, setInternalReason] = useState('');
  const [expiryDays, setExpiryDays] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return setMsg('Please provide a reason.');
    setBusy(true);
    setMsg(null);
    try {
      const expires = expiryDays == null ? '' : dayjs().add(expiryDays, 'day').toISOString();
      await adminPost('/ban', { userId, reason, internalReason, expires });
      router.push(`/admin/manage-user/${userId}`);
    } catch (e) { setMsg((e as Error).message); setBusy(false); }
  };

  const input = 'rounded-rbx border border-border bg-surface px-3 py-2';
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-3xl font-black">Ban User {userId}</h1>
      <Card className="flex flex-col gap-3">
        <label className="text-sm text-text-muted">Reason (public)</label>
        <textarea className={input} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="flex flex-wrap gap-1">
          {QUICK.map((q) => <button key={q} type="button" onClick={() => setReason(q)} className="rounded bg-surface-alt px-2 py-0.5 text-xs hover:bg-surface">{q}</button>)}
        </div>
        <label className="text-sm text-text-muted">Internal reason (staff-only)</label>
        <textarea className={input} rows={2} value={internalReason} onChange={(e) => setInternalReason(e.target.value)} />
        <label className="text-sm text-text-muted">Expiry</label>
        <select className={input} onChange={(e) => setExpiryDays(EXPIRY[parseInt(e.target.value, 10)].days)}>
          {EXPIRY.map((x, i) => <option key={x.label} value={i}>{x.label}</option>)}
        </select>
        {msg ? <p className="text-sm text-negative">{msg}</p> : null}
        <div><Button onClick={submit} disabled={busy} className="bg-negative text-white">{busy ? 'Banning…' : 'Ban User'}</Button></div>
      </Card>
    </div>
  );
}
