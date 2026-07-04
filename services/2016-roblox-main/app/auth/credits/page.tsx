import React from 'react';
import type { Metadata } from 'next';
import Card from '../../../components/ui/Card';

export const metadata: Metadata = { title: 'Credits' };

const CREDITS: Array<{ name: string; note: string }> = [
  { name: 'floatzel', note: 'Owner and developer of the original Economy Simulator at economy-simulator.com. It has since shut down and the source code is public there.' },
  { name: 'tenshi/temmie', note: 'Old Co-Owner of the original Economy Simulator.' },
  { name: 'LA/Judge', note: 'Giving us the exact settings ROBLOX used for the headshot angles back in 2016–2020.' },
  { name: 'Samuel', note: 'Helping us patch some stuff.' },
  { name: 'Jaiz', note: 'Helping set up Cloudflare Tunnels.' },
];

export default function CreditsPage() {
  return (
    <Card className="max-w-3xl">
      <h1 className="mb-4 text-2xl font-semibold text-text">Credits</h1>
      <ul className="space-y-3 text-text">
        {CREDITS.map((c) => (
          <li key={c.name}>
            <span className="font-semibold">{c.name}</span>{' '}
            <span className="text-text-muted">— {c.note}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
