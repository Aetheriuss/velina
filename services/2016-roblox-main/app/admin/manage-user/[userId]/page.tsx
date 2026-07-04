'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminGet, adminPost } from '../../../../lib/adminClient';
import { useAdminPerms } from '../../../../components/admin/AdminPermissionsProvider';
import ManageTextContent from '../../../../components/admin/ManageTextContent';
import ManagePermissions from '../../../../components/admin/ManagePermissions';
import dayjs from '../../../../lib/dayjs';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

interface AdminUser {
  id: number; username: string; status: string; is_admin?: boolean; is_moderator?: boolean;
  thumbnail_url?: string; created_at?: string; online_at?: string;
  balance_robux?: number; balance_tickets?: number;
  membership?: { membershipType?: string } | null;
  ban_reason?: string; ban_reason_internal?: string; ban_author_username?: string; ban_created_at?: string;
}

export default function ManageUserPage() {
  const params = useParams();
  const router = useRouter();
  const userId = String(Array.isArray(params?.userId) ? params?.userId[0] : params?.userId);
  const { hasPermission, is } = useAdminPerms();
  const [msg, setMsg] = useState<string | null>(null);

  const { data: user, refetch } = useQuery({ queryKey: ['admin-user', userId], queryFn: () => adminGet<AdminUser>(`/user?userId=${userId}`) });

  const action = async (path: string, opts?: { confirm?: string; body?: object; then?: (r: unknown) => void }) => {
    if (opts?.confirm && !confirm(opts.confirm)) return;
    setMsg(null);
    try {
      const r = await adminPost(path, opts?.body ?? { userId });
      if (opts?.then) opts.then(r);
      else refetch();
    } catch (e) { setMsg((e as Error).message); }
  };

  if (!user) return <p className="text-text-muted">Loading user…</p>;

  const linkBtn = (label: string, href: string, perm?: string) =>
    !perm || hasPermission(perm) ? <a key={label} href={href}><Button size="sm" variant="secondary">{label}</Button></a> : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-surface-alt">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={user.thumbnail_url || `/Thumbs/Avatar.ashx?height=420&width=420&userid=${user.id}`} alt={user.username} className="h-full w-full object-cover" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{user.username}</h1>
          <p className="text-sm text-text-muted">
            ID {user.id}
            {user.is_admin ? ' · Admin' : user.is_moderator ? ' · Moderator' : ''}
            {' · '}<span className={user.status === 'Ok' ? 'text-positive' : 'text-negative'}>{user.status}</span>
            {user.membership?.membershipType && user.membership.membershipType !== 'None' ? ` · ${user.membership.membershipType}` : ''}
          </p>
          <p className="text-sm text-text-muted">
            Joined {user.created_at ? dayjs(user.created_at).format('MMM DD YYYY') : '—'} · R${(user.balance_robux ?? 0).toLocaleString()} · T${(user.balance_tickets ?? 0).toLocaleString()}
          </p>
          <p className="mt-1 flex gap-2 text-xs">
            <a href={`/users/${user.id}/profile`} className="text-accent hover:underline">View profile</a>
          </p>
        </div>
      </header>

      {msg ? <p className="text-sm text-negative">{msg}</p> : null}

      {user.status !== 'Ok' && user.ban_reason ? (
        <Card className="border-negative/40">
          <h2 className="font-semibold text-negative">Ban</h2>
          <p className="text-sm">Reason: {user.ban_reason}</p>
          {user.ban_reason_internal ? <p className="text-sm text-text-muted">Internal: {user.ban_reason_internal}</p> : null}
          <p className="text-xs text-text-muted">By {user.ban_author_username || '—'} · {user.ban_created_at ? dayjs(user.ban_created_at).format('MMM DD YYYY') : ''}</p>
        </Card>
      ) : null}

      <section>
        <h2 className="mb-2 text-lg font-semibold">Actions</h2>
        <div className="flex flex-wrap gap-2">
          {linkBtn('Ban', `/admin/ban-user/${userId}`, 'BanUser')}
          {hasPermission('UnbanUser') ? <Button size="sm" variant="secondary" onClick={() => action('/unban', { confirm: 'Unban this user?' })}>Unban</Button> : null}
          {hasPermission('LockAccount') ? <Button size="sm" variant="secondary" onClick={() => action('/user/lock', { confirm: 'Lock this account?' })}>Lock</Button> : null}
          {hasPermission('NullifyPassword') ? <Button size="sm" variant="secondary" onClick={() => action('/user/nullify-password', { confirm: 'Nullify password?' })}>Nullify Password</Button> : null}
          {hasPermission('DestroyAllSessionsForUser') ? <Button size="sm" variant="secondary" onClick={() => action('/user/logout', { confirm: 'Destroy all sessions?' })}>Reset Sessions</Button> : null}
          {hasPermission('ResetUsername') ? <Button size="sm" variant="secondary" onClick={() => action(`/users/${userId}/reset-username`, { confirm: 'Reset username?', body: {} })}>Reset Username</Button> : null}
          {hasPermission('ResetDescription') ? <Button size="sm" variant="secondary" onClick={() => action(`/users/${userId}/reset-description`, { confirm: 'Reset description?', body: {} })}>Reset Description</Button> : null}
          {is('admin') && hasPermission('DeleteUser') ? <Button size="sm" className="bg-negative text-white" onClick={() => action('/user/delete', { confirm: 'GDPR-delete this user? This is irreversible.' })}>Delete User</Button> : null}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Manage</h2>
        <div className="flex flex-wrap gap-2">
          {linkBtn('Currency', `/admin/manage-robux-user/${userId}`, 'GiveUserRobux')}
          {linkBtn('Transactions', `/admin/user-transactions/${userId}`, 'GetUserTransactions')}
          {linkBtn('Trades', `/admin/user-trades/${userId}`, 'GetUserTransactions')}
          {hasPermission('GiveUserItem') || hasPermission('RemoveUserItem') ? linkBtn('Inventory', `/admin/manage-inventory-user/${userId}`) : null}
          {hasPermission('GiveUserBadge') || hasPermission('DeleteUserBadge') ? linkBtn('Badges', `/admin/manage-badges-user/${userId}`) : null}
          {linkBtn('Moderation History', `/admin/moderation-history/${userId}`, 'GetUserModerationHistory')}
          {linkBtn('Usernames', `/admin/manage-usernames/${userId}`, 'DeleteUsername')}
          {linkBtn('Message', `/admin/message-user/${userId}`)}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Avatar</h2>
        <div className="flex flex-wrap gap-2">
          {hasPermission('CreateGameForUser') ? <Button size="sm" variant="secondary" onClick={() => action('/create-game', { then: (r) => { const p = (r as { placeId?: number })?.placeId; if (p) router.push(`/games/${p}/--`); } })}>Create Game</Button> : null}
          {hasPermission('RegenerateAvatar') ? <Button size="sm" variant="secondary" onClick={() => action('/user/regenerate-avatar')}>Regenerate Avatar</Button> : null}
          {hasPermission('ResetAvatar') ? <Button size="sm" variant="secondary" onClick={() => action('/user/reset-avatar', { confirm: 'Reset avatar to default?' })}>Reset Avatar</Button> : null}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Text Content</h2>
        <Card><ManageTextContent userId={userId} /></Card>
      </section>

      {is('owner') ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Staff Permissions</h2>
          <Card><ManagePermissions userId={userId} /></Card>
        </section>
      ) : null}
    </div>
  );
}
