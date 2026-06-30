import React from 'react';
import Link from 'next/link';

/**
 * App Router global 404 (replaces the legacy pages/404.js). Renders inside the
 * app shell (navbar/footer/providers) defined in app/layout.tsx, re-skinned to
 * the 2020 theme tokens.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <p className="text-6xl font-black text-accent">404</p>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-text-muted">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link
        href="/home"
        className="mt-2 inline-flex items-center justify-center rounded-rbx bg-accent px-4 py-2 font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        Back to Home
      </Link>
    </div>
  );
}
