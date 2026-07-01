'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { sendMessage } from '../../../services/privateMessages';
import { getUserInfo } from '../../../services/users';
import AuthCard from '../../auth/_components/AuthCard';
import Button from '../../../components/ui/Button';

function ComposeInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = Number(searchParams?.get('userId') || searchParams?.get('recipientId') || 0);

  const { data: recipient } = useQuery({
    queryKey: ['user-info', userId],
    queryFn: () => getUserInfo({ userId }),
    enabled: Number.isFinite(userId) && userId > 0,
  });

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setError(null);
    setSending(true);
    try {
      await sendMessage({ userId, subject, body, replyMessageId: undefined, includePreviousMessage: undefined });
      router.push('/My/Messages');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message.');
      setSending(false);
    }
  };

  return (
    <AuthCard title="New Message" className="mt-8">
      <form onSubmit={send} className="flex flex-col gap-2">
        <label className="text-sm text-text-muted">To</label>
        <input value={recipient?.name || (userId ? `User ${userId}` : '')} readOnly className="rounded-rbx border border-border bg-surface-alt px-3 py-2" />
        <label className="text-sm text-text-muted">Subject</label>
        <input value={subject} maxLength={256} onChange={(e) => setSubject(e.target.value)} className="rounded-rbx border border-border bg-surface px-3 py-2" />
        <label className="text-sm text-text-muted">Message</label>
        <textarea value={body} maxLength={1000} rows={6} onChange={(e) => setBody(e.target.value)} className="rounded-rbx border border-border bg-surface px-3 py-2" />
        {error ? <p className="text-sm text-negative">{error}</p> : null}
        <div className="mt-1">
          <Button type="submit" disabled={sending || !userId}>{sending ? 'Sending…' : 'Send'}</Button>
        </div>
      </form>
    </AuthCard>
  );
}

export default function ComposePage() {
  return (
    <Suspense fallback={null}>
      <ComposeInner />
    </Suspense>
  );
}
