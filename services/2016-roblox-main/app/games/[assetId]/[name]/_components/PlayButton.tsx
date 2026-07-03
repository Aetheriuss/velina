'use client';

import React, { useState } from 'react';
import { launchGame } from '../../../../../services/games';
import { useAuth } from '../../../../../components/providers/AuthProvider';
import Button from '../../../../../components/ui/Button';

/**
 * Play button. Ports playButton.js: unauthenticated → login; otherwise launch via the join script
 * (launchGame hits /game/get-join-script and clicks the protocol URL). The legacy no-flag default
 * redirected to roblox.com, which is nonsensical for this clone — we always use the join-script
 * launch. (The legacy launchUsingEsWeb branch pointed at /RobloxApp/Play, a route that has never
 * existed here.)
 */
export default function PlayButton({ placeId }: { placeId: number }) {
  const { isAuthenticated, isPending } = useAuth();
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const play = async () => {
    if (isPending) return;
    if (!isAuthenticated) {
      window.location.href = '/auth/login';
      return;
    }
    setLaunching(true);
    setError(null);
    try {
      await launchGame({ placeId });
    } catch {
      setError('Could not launch the game. Make sure the client is installed.');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div>
      <Button className="w-full" onClick={play} disabled={launching}>
        {launching ? 'Launching…' : '▶ Play'}
      </Button>
      {error ? <p className="mt-1 text-sm text-negative">{error}</p> : null}
    </div>
  );
}
