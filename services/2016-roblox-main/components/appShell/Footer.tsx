'use client';

import React from 'react';
import Link from 'next/link';

const COLUMNS: Array<{ heading: string; links: Array<{ name: string; href: string }> }> = [
  {
    heading: 'Explore',
    links: [
      { name: 'Games', href: '/games' },
      { name: 'Catalog', href: '/catalog' },
      { name: 'Develop', href: '/develop' },
      { name: 'Updates', href: '/internal/updates' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { name: 'Terms of Use', href: '/auth/tos' },
      { name: 'Privacy', href: '/auth/privacy' },
      { name: 'Account Deletion', href: '/auth/account-deletion' },
    ],
  },
  {
    heading: 'About',
    links: [
      { name: 'Credits', href: '/auth/credits' },
      { name: 'Collectibles', href: '/internal/collectibles' },
    ],
  },
];

export const Footer: React.FC = () => (
  <footer className="border-t border-border bg-surface-alt text-text-muted">
    <div className="mx-auto max-w-content px-6 py-8">
      <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
        {COLUMNS.map((col) => (
          <div key={col.heading}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted/80">
              {col.heading}
            </h3>
            <ul className="flex flex-col gap-1.5 text-sm">
              {col.links.map((l) => (
                <li key={l.name}>
                  <Link href={l.href} className="transition-colors hover:text-text">
                    {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-8 border-t border-border pt-4 text-xs">
        © {new Date().getFullYear()} Velina. Velina is a fan-made recreation and is not affiliated
        with Roblox Corporation.
      </p>
    </div>
  </footer>
);

export default Footer;
