'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminGet, adminRequest } from '../../lib/adminClient';
import { useAdminPerms } from './AdminPermissionsProvider';
import dayjs from '../../lib/dayjs';

/** User status + comment history with delete (ports ManageTextContent.svelte; invites tab dropped — Phase R). */
export default function ManageTextContent({ userId }: { userId: string }) {
  const { hasPermission } = useAdminPerms();
  const canStatus = hasPermission('GetUserStatusHistory');
  const canComments = hasPermission('GetUserCommentHistory');
  const [tab, setTab] = useState<'status' | 'comments'>(canStatus ? 'status' : 'comments');

  const status = useQuery({ queryKey: ['adm-status', userId], enabled: canStatus, queryFn: () => adminGet<Array<{ id: number; status: string; created_at: string }>>(`/user/status-history?userId=${userId}`) });
  const comments = useQuery({ queryKey: ['adm-comments', userId], enabled: canComments, queryFn: () => adminGet<Array<{ id: number; comment: string; created_at: string }>>(`/user/comment-history?userId=${userId}`) });

  if (!canStatus && !canComments) return null;

  const delStatus = async (id: number) => { await adminRequest('DELETE', `/user/status?userId=${userId}&statusId=${id}`); status.refetch(); };
  const delComment = async (id: number) => { await adminRequest('DELETE', `/user/comment?userId=${userId}&commentId=${id}`); comments.refetch(); };

  return (
    <div>
      <div className="mb-2 flex gap-2">
        {canStatus ? <button type="button" onClick={() => setTab('status')} className={`rounded-rbx px-3 py-1 text-sm ${tab === 'status' ? 'bg-accent text-white' : 'bg-surface-alt'}`}>Status</button> : null}
        {canComments ? <button type="button" onClick={() => setTab('comments')} className={`rounded-rbx px-3 py-1 text-sm ${tab === 'comments' ? 'bg-accent text-white' : 'bg-surface-alt'}`}>Comments</button> : null}
      </div>
      {tab === 'status' && canStatus ? (
        <div className="flex flex-col gap-1 text-sm">
          {(status.data || []).map((s) => (
            <div key={s.id} className="flex items-center justify-between border-b border-border py-1">
              <span className="min-w-0 truncate">{s.status} <span className="text-text-muted">· {dayjs(s.created_at).format('M/D/YY')}</span></span>
              <button type="button" onClick={() => delStatus(s.id)} className="text-negative hover:underline">Delete</button>
            </div>
          ))}
          {(status.data || []).length === 0 ? <p className="text-text-muted">No status history.</p> : null}
        </div>
      ) : null}
      {tab === 'comments' && canComments ? (
        <div className="flex flex-col gap-1 text-sm">
          {(comments.data || []).map((c) => (
            <div key={c.id} className="flex items-center justify-between border-b border-border py-1">
              <span className="min-w-0 truncate">{c.comment} <span className="text-text-muted">· {dayjs(c.created_at).format('M/D/YY')}</span></span>
              <button type="button" onClick={() => delComment(c.id)} className="text-negative hover:underline">Delete</button>
            </div>
          ))}
          {(comments.data || []).length === 0 ? <p className="text-text-muted">No comments.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
