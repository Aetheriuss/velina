'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminPerms } from './AdminPermissionsProvider';

interface NavItem {
  name: string;
  href: string;
  permission?: string;
}

// Ports the SideNav nav items (permission-gated). "Catalog" items are grouped below.
const MAIN: NavItem[] = [
  { name: 'Dashboard', href: '/admin' },
  { name: 'Players', href: '/admin/players', permission: 'GetUsersList' },
  { name: 'Groups', href: '/admin/groups', permission: 'GetGroupManageInfo' },
  { name: 'Game History', href: '/admin/game-history', permission: 'GetUsersInGame' },
  { name: 'Logs', href: '/admin/logs', permission: 'GetAdminLogs' },
  { name: 'Create Player', href: '/admin/user/create', permission: 'CreateUser' },
  { name: 'Text Moderation', href: '/admin/text-posts', permission: 'GetAllAssetComments' },
  { name: 'Asset Moderation', href: '/admin/asset/approval', permission: 'GetPendingModerationItems' },
  { name: 'Lottery', href: '/admin/lottery', permission: 'RunLottery' },
  { name: 'Feature Flags', href: '/admin/feature-flags', permission: 'ManageFeatureFlags' },
  { name: 'Reports', href: '/admin/reports', permission: 'ManageReports' },
  { name: 'Resolve URL', href: '/admin/resolve-url', permission: 'GetDetailsFromThumbnail' },
];

const CATALOG: NavItem[] = [
  { name: 'Create Item', href: '/admin/asset/create', permission: 'CreateAsset' },
  { name: 'Update Item Product', href: '/admin/product/update', permission: 'SetAssetProduct' },
  { name: 'Create Item Asset', href: '/admin/asset/create-for-item', permission: 'MigrateAssetFromRoblox' },
  { name: 'Update Item RBXM', href: '/admin/asset/version/create', permission: 'CreateAssetVersion' },
  { name: 'Track User Assets', href: '/admin/asset/track', permission: 'GiveUserItem' },
  { name: 'Force Item Re-Render', href: '/admin/asset/re-render', permission: 'RequestAssetReRender' },
];

export default function AdminSideNav() {
  const { hasPermission, isPending } = useAdminPerms();
  const pathname = usePathname();
  const show = (i: NavItem) => !i.permission || hasPermission(i.permission);
  const linkCls = (href: string) =>
    `block rounded-rbx px-3 py-1.5 text-sm ${pathname === href ? 'bg-accent/10 font-semibold text-accent' : 'text-text-muted hover:bg-surface-alt hover:text-text'}`;

  const catalog = CATALOG.filter(show);

  return (
    <nav className="flex w-full flex-col gap-1">
      {isPending ? <p className="px-3 text-sm text-text-muted">Loading…</p> : null}
      {MAIN.filter(show).map((i) => (
        <Link key={i.href} href={i.href} className={linkCls(i.href)}>
          {i.name}
        </Link>
      ))}
      {catalog.length ? (
        <>
          <p className="mt-3 px-3 text-xs font-bold uppercase text-text-muted">Catalog</p>
          {catalog.map((i) => (
            <Link key={i.href} href={i.href} className={linkCls(i.href)}>
              {i.name}
            </Link>
          ))}
        </>
      ) : null}
      <Link href="/" className="mt-3 block rounded-rbx px-3 py-1.5 text-sm text-text-muted hover:text-text">
        ← Back to site
      </Link>
    </nav>
  );
}
