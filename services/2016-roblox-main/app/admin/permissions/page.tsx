'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminGet } from '../../../lib/adminClient';
import Card from '../../../components/ui/Card';

export default function AdminPermissionsPage() {
  const { data } = useQuery({
    queryKey: ['admin-staff-list'],
    queryFn: () => adminGet<Array<{ userId: number }>>('/staff/list'),
  });
  const staff = data || [];
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Staff List</h1>
      <Card>
        {staff.length === 0 ? (
          <p className="text-text-muted">No staff.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {staff.map((s) => (
              <li key={s.userId}>
                <a href={`/admin/manage-user/${s.userId}`} className="text-accent hover:underline">
                  User {s.userId}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
