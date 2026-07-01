'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../components/providers/AuthProvider';
import {
  getMessages,
  getAnnouncements,
  toggleReadStatus,
  toggleArchiveStatus,
  sendMessage,
} from '../../../services/privateMessages';
import dayjs from '../../../lib/dayjs';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

type Tab = 'inbox' | 'sent' | 'notifications' | 'archive';
interface Msg {
  id: number;
  subject: string;
  body: string;
  isRead: boolean;
  created: string;
  sender: { id: number; name: string };
  recipient?: { id: number; name: string };
}
const LIMIT = 20;

export default function MessagesPage() {
  const { isAuthenticated, isPending } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('inbox');
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Msg | null>(null);
  const [reply, setReply] = useState('');
  const [replyOpen, setReplyOpen] = useState(false);

  const key = ['messages', tab, page];
  const { data, isFetching } = useQuery({
    queryKey: key,
    enabled: isAuthenticated,
    queryFn: async () => {
      if (tab === 'notifications') {
        const res = await getAnnouncements();
        return { collection: (res.collection || []) as Msg[], totalPages: 1 };
      }
      const res = await getMessages({ tab, offset: page * LIMIT, limit: LIMIT });
      return { collection: (res.collection || []) as Msg[], totalPages: res.totalPages || 1 };
    },
  });

  if (isPending) return null;
  if (!isAuthenticated) return <p className="text-center text-text-muted">Please sign in to view your messages.</p>;

  const changeTab = (t: Tab) => { setTab(t); setPage(0); setOpen(null); };
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  const openMessage = async (m: Msg) => {
    setOpen(m);
    setReplyOpen(false);
    setReply('');
    if (!m.isRead && tab !== 'notifications') {
      try { await toggleReadStatus({ messageIds: [m.id], isRead: true }); refresh(); } catch { /* ignore */ }
    }
  };
  const sendReply = async () => {
    if (!open || !reply.trim()) return;
    await sendMessage({ userId: open.sender.id, subject: 'RE: ' + open.subject, body: reply, replyMessageId: open.id, includePreviousMessage: true });
    setReplyOpen(false);
    setReply('');
    setOpen(null);
  };

  const messages = data?.collection || [];

  if (open) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        <button type="button" onClick={() => setOpen(null)} className="text-left text-sm text-accent hover:underline">← Back to {tab}</button>
        <Card className="flex flex-col gap-2">
          <h1 className="text-xl font-bold">{open.subject}</h1>
          <p className="text-sm text-text-muted">
            From <a href={`/users/${open.sender.id}/profile`} className="text-accent hover:underline">{open.sender.name}</a> · {dayjs(open.created).format('M/D/YYYY h:mm A')}
          </p>
          <p className="mt-2 whitespace-pre-wrap">{open.body}</p>
          {tab !== 'notifications' && open.sender.id !== 1 ? (
            replyOpen ? (
              <div className="mt-2 flex flex-col gap-2">
                <textarea value={reply} rows={4} onChange={(e) => setReply(e.target.value)} className="rounded-rbx border border-border bg-surface px-3 py-2" placeholder="Write a reply…" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={sendReply}>Send Reply</Button>
                  <Button size="sm" variant="ghost" onClick={() => setReplyOpen(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div><Button size="sm" onClick={() => setReplyOpen(true)}>Reply</Button></div>
            )
          ) : null}
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-3xl font-black">Messages</h1>
      <div className="flex flex-wrap gap-2">
        {(['inbox', 'sent', 'notifications', 'archive'] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => changeTab(t)} className={`rounded-rbx px-3 py-1.5 text-sm font-semibold capitalize ${tab === t ? 'bg-accent text-white' : 'bg-surface-alt hover:bg-surface'}`}>{t}</button>
        ))}
      </div>

      {isFetching && messages.length === 0 ? (
        <p className="text-text-muted">Loading…</p>
      ) : messages.length === 0 ? (
        <p className="text-text-muted">No messages here.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {messages.map((m) => (
            <Card key={m.id} className="flex items-center gap-3">
              <button type="button" onClick={() => openMessage(m)} className="min-w-0 flex-1 text-left">
                <p className={`truncate ${m.isRead ? 'text-text-muted' : 'font-semibold'}`}>{m.subject}</p>
                <p className="truncate text-xs text-text-muted">
                  {tab === 'sent' ? `To ${m.recipient?.name || '—'}` : m.sender?.name} · {dayjs(m.created).format('M/D/YYYY')}
                </p>
              </button>
              {tab !== 'notifications' ? (
                <Button size="sm" variant="ghost" onClick={async () => { await toggleArchiveStatus({ messageIds: [m.id], isArchived: tab !== 'archive' }); refresh(); }}>
                  {tab === 'archive' ? 'Unarchive' : 'Archive'}
                </Button>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      {tab !== 'notifications' && (data?.totalPages || 1) > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <button type="button" disabled={page === 0 || isFetching} onClick={() => setPage((p) => Math.max(0, p - 1))} className="rounded-rbx border border-border px-4 py-1.5 text-sm disabled:opacity-40">Previous</button>
          <span className="text-sm text-text-muted">Page {page + 1} of {data?.totalPages}</span>
          <button type="button" disabled={page + 1 >= (data?.totalPages || 1) || isFetching} onClick={() => setPage((p) => p + 1)} className="rounded-rbx border border-border px-4 py-1.5 text-sm disabled:opacity-40">Next</button>
        </div>
      ) : null}
    </div>
  );
}
