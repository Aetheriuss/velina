'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { multiGetUniverseIcons } from '../../../../../services/thumbnails';
import Card from '../../../../../components/ui/Card';

// Read-only: there is no game/universe icon-update endpoint on the backend (only
// groups have one, see Roblox.Website/Controllers/v1/Groups.cs `PATCH groups/icon`),
// so — same as the old Pages-Router components/updatePlace/components/icon.js — this
// only displays the current icon and does not offer an upload control.
export default function GameIcon({ universeId }: { universeId: number }) {
  const { data: icons } = useQuery({
    queryKey: ['place-update-icon', universeId],
    enabled: Number.isFinite(universeId),
    queryFn: () => multiGetUniverseIcons({ universeIds: [universeId], size: '420x420' }),
  });
  const iconUrl = icons?.[0]?.imageUrl;

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-semibold">Game Icon</h2>
      <div className="h-[105px] w-[105px] overflow-hidden rounded-rbx bg-surface-alt">
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl} alt="Your game icon" className="h-full w-full object-cover" />
        ) : null}
      </div>
    </Card>
  );
}
