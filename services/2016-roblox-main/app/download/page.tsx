'use client';

import React from 'react';
import getFlag from '../../lib/getFlag';
import Card from '../../components/ui/Card';

interface GameClient {
  title: string;
  url: string;
  imageUrl: string;
}

/**
 * Download page (replaces pages/download.js + components/download). Re-skinned
 * to 2020 tokens. Content is entirely flag-driven: `downloadPageEnabled` gates
 * the page and `downloadGameClients` supplies the client cards.
 */
export default function DownloadPage() {
  const enabled = getFlag('downloadPageEnabled', false) as boolean;
  const clients = getFlag('downloadGameClients', []) as GameClient[];

  if (!enabled) {
    return (
      <Card className="mx-auto mt-8 max-w-md text-center">
        <h1 className="text-xl font-bold">Downloads unavailable</h1>
        <p className="mt-2 text-text-muted">The download page is not currently available.</p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-3xl font-black">Download</h1>
        <p className="text-text-muted">Download the ROBLOX Player to get into the game.</p>
      </header>

      {clients.length === 0 ? (
        <p className="text-text-muted">No download clients are available right now.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {clients.map((c) => (
            <a
              key={c.title + c.url}
              href={c.url}
              className="group block"
            >
              <Card className="flex flex-col items-center gap-3 text-center transition-transform group-hover:-translate-y-0.5">
                {/* Legacy used a grayscale→color hover; mirror with opacity for the flat look. */}
                <img
                  src={c.imageUrl}
                  alt={`${c.title} player icon`}
                  className="h-[120px] w-[120px] object-contain opacity-80 transition-opacity group-hover:opacity-100"
                />
                <h2 className="font-semibold">{c.title}</h2>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
