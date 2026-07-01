'use client';

import React, { useState } from 'react';
import { apiRequest } from '../../../lib/apiClient';
import { useAuth } from '../../../components/providers/AuthProvider';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

const REASONS: Array<{ value: string; label: string }> = [
  { value: 'BadChatMessagesInGame', label: 'In-Game Chat (harassment, slurs, etc.)' },
  { value: 'BadPrivateMessage', label: 'Private Message' },
];

export default function ReportAbusePage() {
  const { isAuthenticated, isPending } = useAuth();
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (isPending) return null;
  if (!isAuthenticated) return <p className="text-center text-text-muted">Please sign in to submit a report.</p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setResult(null);
    if (!reason) return setResult({ ok: false, text: 'Please select a report reason.' });
    setBusy(true);
    try {
      await apiRequest('POST', 'internal-forms', '/v1/report-abuse', { body: { reportReason: reason, reportMessage: message } });
      setResult({ ok: true, text: 'Your report has been sent successfully.' });
      setReason('');
      setMessage('');
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : 'Could not submit report.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-3xl font-black">Report Abuse</h1>
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-sm text-text-muted">Report reason</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-rbx border border-border bg-surface px-3 py-2">
            <option value="">Select a reason…</option>
            {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <label className="text-sm text-text-muted">Details (include as much as possible)</label>
          <textarea value={message} rows={5} maxLength={1000} onChange={(e) => setMessage(e.target.value)} className="rounded-rbx border border-border bg-surface px-3 py-2" />
          {result ? <p className={`text-sm ${result.ok ? 'text-positive' : 'text-negative'}`}>{result.text}</p> : null}
          <div><Button type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit'}</Button></div>
        </form>
      </Card>
    </div>
  );
}
