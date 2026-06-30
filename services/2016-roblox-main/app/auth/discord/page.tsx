import React from 'react';
import type { Metadata } from 'next';
import AuthCard from '../_components/AuthCard';

export const metadata: Metadata = { title: 'Discord Server' };

export default function DiscordInfoPage() {
  return (
    <AuthCard title="Discord" className="mt-10">
      <p>
        You may{' '}
        <a href="https://discord.gg/aCMvJctUPu" className="text-accent hover:underline">
          join our Discord server here
        </a>
        .
      </p>
    </AuthCard>
  );
}
