'use client';

import React, { useState } from 'react';
import { getServers } from '../../../../../services/games';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';

interface Player {
  Id: number;
  Username: string;
}
interface Server {
  Guid: string;
  CurrentPlayers: Player[];
  Fps: number;
  Ping: number;
}

/** Active servers list with load-more (ports gameServers.js; per-server join isn't supported by the API). */
export default function Servers({ placeId }: { placeId: number }) {
  const [servers, setServers] = useState<Server[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [more, setMore] = useState(true);
  const [started, setStarted] = useState(false);

  const load = async () => {
    setLoading(true);
    setStarted(true);
    try {
      const res = await getServers({ placeId, offset });
      const list: Server[] = res.Collection || [];
      setServers((prev) => [...prev, ...list]);
      setMore(list.length >= 10);
      setOffset((o) => o + 10);
    } finally {
      setLoading(false);
    }
  };

  if (!started) {
    return (
      <Button variant="secondary" size="sm" onClick={load}>
        Show servers
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {servers.length === 0 && !loading ? (
        <p className="text-text-muted">No active servers.</p>
      ) : (
        servers.map((s) => (
          <Card key={s.Guid} className="text-sm">
            <p className="font-medium">
              {s.CurrentPlayers.length} {s.CurrentPlayers.length === 1 ? 'player' : 'players'}
              <span className="text-text-muted"> · {s.Fps?.toFixed?.(0) ?? s.Fps} FPS · {s.Ping} ms ping</span>
            </p>
            {s.CurrentPlayers.length ? (
              <p className="mt-1 truncate text-xs text-text-muted">
                {s.CurrentPlayers.map((p) => p.Username).join(', ')}
              </p>
            ) : null}
          </Card>
        ))
      )}
      {more ? (
        <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Load more servers'}
        </Button>
      ) : null}
    </div>
  );
}
