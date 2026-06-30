'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../providers/AuthProvider';
// Bridge: the legacy chat widget reads auth.userId from the unstated-next
// AuthenticationStore (self-fetching), so we wrap it in that provider rather than
// rewriting it. Internal JSS/store modernization is deferred to a later phase.
import AuthenticationStore from '../../stores/authentication';

// Browser-only: the chat container imports @microsoft/signalr and touches
// window/setInterval, so it must not run during SSR.
const Chat = dynamic(() => import('../chat'), { ssr: false });

/**
 * Mounts the floating chat widget into the App Router shell. Only rendered for
 * authenticated users (the legacy _app.js mounted it unconditionally, which
 * spammed 401s while logged out). SignalR realtime is gated behind the
 * `useSignalCoreForRealTimeChat` flag inside the widget; otherwise it polls.
 */
export default function ChatMount() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;
  return (
    <AuthenticationStore.Provider>
      <Chat />
    </AuthenticationStore.Provider>
  );
}
