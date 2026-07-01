'use client';

import React from 'react';
import { useAdminPerms } from '../../../components/admin/AdminPermissionsProvider';
import Card from '../../../components/ui/Card';

// Ported from Memos.svelte (static, client-side). Add memos here; visibility is filtered by rank group.
const MEMOS: Array<{ group: 'owner' | 'admin' | 'mod'; title: string; message: string }> = [
  { group: 'mod', title: 'Hello World', message: 'Test 1234' },
];

export default function MemosPage() {
  const { is } = useAdminPerms();
  const visible = MEMOS.filter((m) => is(m.group));
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-black">Memos</h1>
      {visible.length === 0 ? <p className="text-text-muted">No memos for you.</p> : (
        <div className="flex flex-col gap-2">
          {visible.map((m, i) => (
            <Card key={i}>
              <p className="font-semibold">{m.title} <span className="text-xs text-text-muted">({m.group})</span></p>
              <p className="mt-1 whitespace-pre-wrap">{m.message}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
