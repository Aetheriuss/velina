'use client';

import React from 'react';
import { useSidebar } from './SidebarContext';

/**
 * Dimming scrim shown behind the mobile sidebar drawer. Mobile-only
 * (hidden at `lg`); clicking it closes the drawer.
 */
export const Backdrop: React.FC = () => {
  const { open, close } = useSidebar();
  if (!open) return null;
  return (
    <div
      aria-hidden
      onClick={close}
      className="fixed inset-0 top-topbar z-scrim bg-black/40 lg:hidden"
    />
  );
};

export default Backdrop;
