import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Updates' };

/** Static updates/notice page (ports the Razor /internal/updates content). */
export default function UpdatesPage() {
  return (
    <div className="mx-auto max-w-xl py-8">
      <div className="rounded-rbx border border-border bg-surface p-6 shadow-rbx">
        <h1 className="mb-2 text-2xl font-bold">Updates</h1>
        <p className="text-text-muted">
          We had to wipe the database on 5/31/2023 due to it getting corrupted. Sorry for this.
        </p>
      </div>
    </div>
  );
}
