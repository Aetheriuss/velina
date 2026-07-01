'use client';

import React from 'react';
import { AdminPermissionsProvider, useAdminPerms } from '../../components/admin/AdminPermissionsProvider';
import AdminSideNav from '../../components/admin/AdminSideNav';
import { useAuth } from '../../components/providers/AuthProvider';

/**
 * Admin shell (App Router port of the Svelte admin's templates + router). Renders inside the site
 * shell; provides the permission context + sidenav. Access is enforced server-side by StaffFilter on
 * every /admin-api/* call, so this UI just reflects what the API allows (and shows a gate on error).
 */
function Guard({ children }: { children: React.ReactNode }) {
  const { isPending, isError, data } = useAdminPerms();
  const { isAuthenticated, isPending: authPending } = useAuth();

  if (authPending || isPending) return <p className="text-text-muted">Loading admin…</p>;
  if (!isAuthenticated || isError || !data) {
    return (
      <div className="py-10 text-center">
        <h1 className="text-xl font-bold">Admin access required</h1>
        <p className="mt-2 text-text-muted">You don&apos;t have permission to view the admin panel.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
      <aside className="md:sticky md:top-16 md:self-start">
        <AdminSideNav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminPermissionsProvider>
      <Guard>{children}</Guard>
    </AdminPermissionsProvider>
  );
}
