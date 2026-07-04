'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminGet, adminPost } from '../../../../lib/adminClient';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

const BADGES: Record<number, string> = {
  1: 'Administrator', 2: 'Friendship', 3: 'Combat Initiation', 4: 'Warrior', 5: 'Bloxxer',
  6: 'Homestead', 7: 'Bricksmith', 8: 'Inviter', 11: 'Builders Club', 12: 'Veteran',
  14: 'Ambassador', 15: 'Turbo Builders Club', 16: 'Outrageous Builders Club',
  17: 'Official Model Maker', 18: 'Welcome To The Club',
};

export default function ManageBadgesPage() {
  const params = useParams();
  const userId = String(Array.isArray(params?.userId) ? params?.userId[0] : params?.userId);
  const { data, refetch } = useQuery({ queryKey: ['admin-badges', userId], queryFn: () => adminGet<Array<{ id: number; name: string }>>(`/getbadges?userId=${userId}`) });
  const owned = data || [];
  const [addBadge, setAddBadge] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const give = async () => { if (!addBadge) return; setMsg(null); try { await adminPost('/givebadge', { userId, badgeId: parseInt(addBadge, 10) }); setMsg('Badge given.'); refetch(); } catch (e) { setMsg((e as Error).message); } };
  const remove = async (id: number) => { setMsg(null); try { await adminPost('/deletebadge', { userId, badgeId: id }); refetch(); } catch (e) { setMsg((e as Error).message); } };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <h1 className="text-2xl font-semibold">Manage Badges</h1>
      {msg ? <p className="text-sm text-text-muted">{msg}</p> : null}
      <Card className="flex flex-col gap-2">
        <h2 className="font-semibold">Give Badge</h2>
        <select value={addBadge} onChange={(e) => setAddBadge(e.target.value)} className="rounded-rbx border border-border bg-surface px-3 py-2">
          <option value="">Select a badge…</option>
          {Object.entries(BADGES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <div><Button size="sm" disabled={!addBadge} onClick={give}>Add Badge</Button></div>
      </Card>
      <Card className="flex flex-col gap-2">
        <h2 className="font-semibold">Owned Badges</h2>
        {owned.length === 0 ? <p className="text-sm text-text-muted">No badges.</p> : owned.map((b) => (
          <div key={b.id} className="flex items-center justify-between text-sm">
            <span>{b.name || BADGES[b.id] || `Badge ${b.id}`}</span>
            <button type="button" onClick={() => remove(b.id)} className="text-negative hover:underline">Remove</button>
          </div>
        ))}
      </Card>
    </div>
  );
}
