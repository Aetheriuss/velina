'use client';

import React from 'react';
import Link from 'next/link';

/** Minimal 2020 footer for the App Router shell; expanded in Phase 2. */
export const Footer: React.FC = () => (
  <footer className="border-t border-border bg-surface-alt text-text-muted">
    <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-sm">
      <Link href="/auth/tos" className="hover:text-text">
        Terms of Use
      </Link>
      <Link href="/auth/privacy" className="hover:text-text">
        Privacy
      </Link>
      <Link href="/auth/credits" className="hover:text-text">
        Credits
      </Link>
      <span className="ml-auto">© {new Date().getFullYear()} Velina</span>
    </div>
  </footer>
);

export default Footer;
