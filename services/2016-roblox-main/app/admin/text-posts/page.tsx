'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminGet, adminPost, adminRequest } from '../../../lib/adminClient';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

interface RawPost { type: string; id: number; userId?: number; user_id?: number; username?: string; name?: string; comment?: string; post?: string; status?: string; assetId?: number; groupId?: number; group_id?: number }
interface Norm { key: string; type: string; id: number; userId?: number; username: string; text: string }

const Q = 'limit=25&offset=0&sortOrder=asc&exclusiveStartId=';

/** Text moderation queues (asset comments, group wall, user status, group status). Forum posts were
 * removed in a prior phase; the localStorage "clock" paging is simplified to first-page fetches. */
export default function TextModerationPage() {
  const { data, refetch } = useQuery({
    queryKey: ['text-mod'],
    queryFn: async () => {
      const [comments, wall, userStatus, groupStatus] = await Promise.all([
        adminGet<RawPost[]>(`/assets/comments?${Q}`).catch(() => [] as RawPost[]),
        adminGet<RawPost[]>(`/groups/wall?${Q}`).catch(() => [] as RawPost[]),
        adminGet<RawPost[]>(`/users/status?${Q}`).catch(() => [] as RawPost[]),
        adminGet<RawPost[]>(`/groups/status?${Q}`).catch(() => [] as RawPost[]),
      ]);
      const norm: Norm[] = [];
      (comments || []).forEach((p) => norm.push({ key: `c${p.id}`, type: 'AssetComment', id: p.id, userId: p.userId, username: p.username || '', text: p.comment || '' }));
      (wall || []).forEach((p) => norm.push({ key: `w${p.id}`, type: 'GroupWallPost', id: p.id, userId: p.userId, username: p.username || '', text: p.post || '' }));
      (userStatus || []).forEach((p) => norm.push({ key: `s${p.id}`, type: 'UserStatusPost', id: p.id, userId: p.userId, username: p.username || '', text: p.post || '' }));
      (groupStatus || []).forEach((p) => norm.push({ key: `gs${p.id}`, type: 'GroupStatusPost', id: p.id, userId: p.user_id, username: p.username || '', text: p.status || '' }));
      return norm;
    },
  });
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [payMsg, setPayMsg] = useState<string | null>(null);
  const posts = (data || []).filter((p) => !deleted.has(p.key));

  const del = async (p: Norm) => {
    try {
      if (p.type === 'AssetComment') await adminRequest('DELETE', `/user/comment?userId=${p.userId}&commentId=${p.id}`);
      else if (p.type === 'GroupWallPost') await adminPost(`/groups/wall/remove?id=${p.id}`);
      else if (p.type === 'GroupStatusPost') await adminPost(`/groups/status/delete?id=${p.id}`);
      else await adminRequest('DELETE', `/user/status?statusId=${p.id}&userId=${p.userId}`);
      setDeleted((s) => new Set(s).add(p.key));
    } catch (e) { alert((e as Error).message); }
  };
  const requestPayment = async () => {
    try { const r = await adminPost<{ robuxAmount: number }>('/text-moderation/request-payment'); setPayMsg(`You were given ${r.robuxAmount} Robux.`); }
    catch (e) { setPayMsg((e as Error).message); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">Text Moderation ({posts.length})</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => { setDeleted(new Set()); refetch(); }}>Refresh</Button>
          <Button size="sm" onClick={requestPayment}>Request Payment</Button>
        </div>
      </div>
      {payMsg ? <p className="text-sm text-positive">{payMsg}</p> : null}
      {posts.length === 0 ? <p className="text-text-muted">No posts to moderate.</p> : (
        <div className="flex flex-col gap-2">
          {posts.map((p) => (
            <Card key={p.key} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-text-muted">{p.type} · {p.userId ? <a href={`/admin/manage-user/${p.userId}`} className="text-accent hover:underline">{p.username || p.userId}</a> : p.username}</p>
                <p className="mt-1 break-words">{p.text}</p>
              </div>
              <button type="button" onClick={() => del(p)} className="shrink-0 text-sm text-negative hover:underline">Delete</button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
