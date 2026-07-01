'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { multiGetGameVotes, voteOnGame } from '../../../../../services/games';
import { useAuth } from '../../../../../components/providers/AuthProvider';

interface Votes {
  upVotes: number;
  downVotes: number;
}

export default function Vote({ universeId }: { universeId: number }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const key = ['game-votes', universeId];
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const { data } = useQuery<Votes | null>({
    queryKey: key,
    queryFn: async () => {
      const res = await multiGetGameVotes({ universeIds: [universeId] });
      return (res[0] as Votes) || null;
    },
  });

  const vote = async (isUpvote: boolean) => {
    if (locked || !isAuthenticated) return;
    setError(null);
    setLocked(true);
    try {
      await voteOnGame({ universeId, isUpvote });
      await queryClient.invalidateQueries({ queryKey: key });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'You can only vote after playing the game.');
    } finally {
      setLocked(false);
    }
  };

  const up = data?.upVotes ?? 0;
  const down = data?.downVotes ?? 0;
  const total = up + down;
  const pct = total > 0 ? Math.round((up / total) * 100) : null;

  return (
    <div>
      <div className="flex items-center gap-4 text-sm">
        <button type="button" onClick={() => vote(true)} disabled={!isAuthenticated || locked} className="hover:text-positive disabled:opacity-50">
          👍 {up.toLocaleString()}
        </button>
        <button type="button" onClick={() => vote(false)} disabled={!isAuthenticated || locked} className="hover:text-negative disabled:opacity-50">
          👎 {down.toLocaleString()}
        </button>
      </div>
      {pct !== null ? (
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-negative/40">
          <div className="h-full bg-positive" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
      {error ? <p className="mt-1 text-xs text-negative">{error}</p> : null}
    </div>
  );
}
