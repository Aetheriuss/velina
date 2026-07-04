'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * UI state for the mobile off-canvas sidebar drawer. Irrelevant on desktop
 * (>=1024px) where the sidebar is always pinned; below `lg` the top-bar
 * hamburger toggles `open`. Any route change closes the drawer.
 */
interface SidebarContextValue {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  // Close the drawer whenever navigation occurs.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <SidebarContext.Provider value={{ open, toggle, close }}>{children}</SidebarContext.Provider>
  );
};

export const useSidebar = (): SidebarContextValue => {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within a SidebarProvider');
  return ctx;
};
