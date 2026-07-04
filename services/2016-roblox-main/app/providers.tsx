'use client';

import React from 'react';
import { QueryProvider } from '../components/providers/QueryProvider';
import { ThemeProvider } from '../components/providers/ThemeProvider';
import { AuthProvider } from '../components/providers/AuthProvider';
import { SidebarProvider } from '../components/appShell/SidebarContext';
import TopBar from '../components/appShell/TopBar';
import Sidebar from '../components/appShell/Sidebar';
import Backdrop from '../components/appShell/Backdrop';
import Footer from '../components/appShell/Footer';
import ChatMount from '../components/appShell/ChatMount';

/**
 * Client provider tree for the App Router. Mirrors the responsibilities of the
 * legacy pages/_app.js (theme, auth, global chrome) but with React Query for
 * server state and Context for UI state.
 *
 * 2020 shell layout: a slim fixed dark <TopBar/> across the top, a persistent
 * white left <Sidebar/> (off-canvas drawer below `lg`), and a light-gray content
 * column offset by the sidebar on desktop.
 *
 * <ChatMount/> (Phase 2) bridges the legacy SignalR chat widget into the shell;
 * it renders browser-only and only for authenticated users.
 */
export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryProvider>
    <ThemeProvider>
      <AuthProvider>
        <SidebarProvider>
          <div className="rbx-app min-h-screen bg-bg text-text">
            <TopBar />
            <div className="flex pt-topbar">
              <Sidebar />
              <main className="min-h-[calc(100vh-50px)] flex-1 bg-bg lg:ml-sidebar">
                <div className="mx-auto w-full max-w-content px-6 py-6">{children}</div>
                <Footer />
              </main>
            </div>
            <Backdrop />
          </div>
          <ChatMount />
        </SidebarProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryProvider>
);

export default Providers;
