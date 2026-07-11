'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminPost } from '../../../../lib/adminClient';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

export default function ManageRobuxPage() {
  const params = useParams();
  const router = useRouter();
  const userId = String(Array.isArray(params?.userId) ? params?.userId[0] : params?.userId);
  const [robux, setRobux] = useState('');
  const [tickets, setTickets] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const act = async (path: string, body: object) => {
    setMsg(null);
    try { await adminPost(path, body); router.push(`/admin/manage-user/${userId}`); }
    catch (e) { setMsg((e as Error).message); }
  };

  const input = 'rounded-rbx border border-border bg-surface px-3 py-2';
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <h1 className="text-2xl font-semibold">Manage Currency</h1>
      {msg ? <p className="text-sm text-negative">{msg}</p> : null}
      <Card className="flex flex-col gap-2">
        <h2 className="font-semibold">Robux</h2>
        <input className={input} type="number" value={robux} onChange={(e) => setRobux(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => act('/giverobux', { userId: Number(userId), robux: parseInt(robux, 10) })}>Give</Button>
          <Button size="sm" variant="secondary" onClick={() => act('/removerobux', { userId: Number(userId), robux: parseInt(robux, 10) })}>Remove</Button>
        </div>
      </Card>
      <Card className="flex flex-col gap-2">
        <h2 className="font-semibold">Tickets</h2>
        <input className={input} type="number" value={tickets} onChange={(e) => setTickets(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => act('/givetickets', { userId: Number(userId), tickets: parseInt(tickets, 10) })}>Give</Button>
          <Button size="sm" variant="secondary" onClick={() => act('/removetickets', { userId: Number(userId), tickets: parseInt(tickets, 10) })}>Remove</Button>
        </div>
      </Card>
    </div>
  );
}
