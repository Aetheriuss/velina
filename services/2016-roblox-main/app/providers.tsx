'use client';

import React from 'react';
import { QueryProvider } from '../components/providers/QueryProvider';
import { ThemeProvider } from '../components/providers/ThemeProvider';
import { AuthProvider } from '../components/providers/AuthProvider';
import Navbar from '../components/appShell/Navbar';
import Footer from '../components/appShell/Footer';

/**
 * Client provider tree for the App Router. Mirrors the responsibilities of the
 * legacy pages/_app.js (theme, auth, global chrome) but with React Query for
 * server state and Context for UI state. The two trees coexist during the
 * migration; keep auth/theme behavior in sync until pages/ is empty.
 *
 * <Chat/> (SignalR) is intentionally added in Phase 2/3 once auth is wired
 * end-to-end; it must be a browser-only client component.
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
      </AuthProvider>
    </ThemeProvider>
  </QueryProvider>
);

export default Providers;
