'use client';

import React from 'react';
import { QueryProvider } from '../components/providers/QueryProvider';
import { ThemeProvider } from '../components/providers/ThemeProvider';
import { AuthProvider } from '../components/providers/AuthProvider';
import Navbar from '../components/appShell/Navbar';
import Footer from '../components/appShell/Footer';
import ChatMount from '../components/appShell/ChatMount';

/**
 * Client provider tree for the App Router. Mirrors the responsibilities of the
 * legacy pages/_app.js (theme, auth, global chrome) but with React Query for
 * server state and Context for UI state. The two trees coexist during the
 * migration; keep auth/theme behavior in sync until pages/ is empty.
 *
 * <ChatMount/> (Phase 2) bridges the legacy SignalR chat widget into the shell;
 * it renders browser-only and only for authenticated users.
 */
export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryProvider>
    <ThemeProvider>
      <AuthProvider>
        <div className="rbx-app flex min-h-screen flex-col">
          <Navbar />
          <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-6">{children}</main>
          <Footer />
        </div>
        <ChatMount />
      </AuthProvider>
    </ThemeProvider>
  </QueryProvider>
);

export default Providers;
