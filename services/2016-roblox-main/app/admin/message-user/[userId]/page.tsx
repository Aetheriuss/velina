'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminPost } from '../../../../lib/adminClient';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

const TEMPLATES: Array<{ label: string; subject: string; body: string }> = [
  { label: 'Inventory Adjustment', subject: 'Inventory Adjustment', body: 'Hello,\n\nWe removed [Item Name Here] from your account and granted [Item Granted]. If you have questions, reply to this message.' },
  { label: 'Compromised Cleanup', subject: 'Inventory Adjustment', body: 'Hello,\n\nYour account appears to have been compromised. We removed [Item Names Here] and granted [Item Granted].' },
  { label: 'Won Giveaway', subject: 'Giveaway Award', body: 'Congratulations! You won [Item Name or Robux Amount Here] in our giveaway.' },
];

export default function MessageUserPage() {
  const params = useParams();
  const router = useRouter();
  const userId = String(Array.isArray(params?.userId) ? params?.userId[0] : params?.userId);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (/\[.*\]/.test(body)) return setMsg('Please replace all [placeholders] before sending.');
    setBusy(true);
    setMsg(null);
    try { await adminPost('/user/create-message', { userId: Number(userId), subject, body }); router.push(`/admin/manage-user/${userId}`); }
    catch (e) { setMsg((e as Error).message); setBusy(false); }
  };

  const input = 'rounded-rbx border border-border bg-surface px-3 py-2';
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-2xl font-semibold">Message User {userId}</h1>
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1">
          {TEMPLATES.map((t) => <button key={t.label} type="button" onClick={() => { setSubject(t.subject); setBody(t.body); }} className="rounded bg-surface-alt px-2 py-0.5 text-xs hover:bg-surface">{t.label}</button>)}
        </div>
        <label className="text-sm text-text-muted">Subject</label>
        <input className={input} value={subject} onChange={(e) => setSubject(e.target.value)} />
        <label className="text-sm text-text-muted">Body</label>
        <textarea className={input} rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
        {msg ? <p className="text-sm text-negative">{msg}</p> : null}
        <div><Button onClick={send} disabled={busy}>{busy ? 'Sending…' : 'Send Message'}</Button></div>
      </Card>
    </div>
  );
}
