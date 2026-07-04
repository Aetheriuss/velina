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
    `relative flex h-10 items-center px-4 text-sm ${
      pathname === href
        ? 'bg-sidebar-active font-semibold text-accent before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-accent'
        : 'text-text hover:bg-sidebar-hover'
    }`;

  const catalog = CATALOG.filter(show);

  return (
    <nav className="flex w-full flex-col overflow-hidden rounded-rbx border border-border bg-sidebar-bg py-2 shadow-rbx">
      {isPending ? <p className="px-4 py-1 text-sm text-text-muted">Loading…</p> : null}
      {MAIN.filter(show).map((i) => (
        <Link key={i.href} href={i.href} className={linkCls(i.href)}>
          {i.name}
        </Link>
      ))}
      {catalog.length ? (
        <>
          <p className="mt-3 px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Catalog</p>
          {catalog.map((i) => (
            <Link key={i.href} href={i.href} className={linkCls(i.href)}>
              {i.name}
            </Link>
          ))}
        </>
      ) : null}
      <hr className="my-2 border-border" />
      <Link href="/" className="flex h-10 items-center px-4 text-sm text-text-muted hover:bg-sidebar-hover hover:text-text">
        ← Back to site
      </Link>
    </nav>
  );
}
