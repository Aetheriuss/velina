'use client';

import React from 'react';
import Card from '../../../components/ui/Card';

/**
 * The legacy dashboard embedded the server-rendered user feed (/Feeds/GetUserFeed)
 * in an iframe and injected CSS into it. We keep the same same-origin iframe source
 * (served by the .NET backend) inside a 2020 card; deep restyling of the feed
 * fragment itself is out of scope.
 */
export default function Feed() {
  return (
    <Card>
      <h2 className="mb-3 text-xl font-light uppercase">My Feed</h2>
      <iframe
        title="My Feed"
        src="/Feeds/GetUserFeed"
        className="h-[420px] w-full rounded-rbx border border-border bg-surface"
      />
    </Card>
  );
}
