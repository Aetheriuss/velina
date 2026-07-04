'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/providers/AuthProvider';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';

/**
 * Root route. Mirrors the legacy pages/index.js behavior: authenticated users
 * are sent to /home. Logged-out users get a 2020 landing hero with a sign-in
 * CTA (the legacy page rendered blank here).
 *
 * Auth is necessarily a client decision — the .ROBLOSECURITY cookie is HttpOnly,
 * so the only signal is the /v1/users/authenticated query behind useAuth().
 */
export default function HomeRedirectPage() {
  const { isAuthenticated, isPending } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) router.replace('/home');
  }, [isAuthenticated, router]);

  // Don't flash the landing while auth resolves, or while redirecting — but
  // never render a fully blank page (a hung auth check should look like loading).
  if (isPending || isAuthenticated) return <Spinner />;

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-16 text-center">
      <h1 className="text-4xl font-black tracking-tight">
        Welcome to <span className="text-accent">Velina</span>
      </h1>
      <p className="max-w-md text-lg text-text-muted">
        Powering imagination. Sign in to play games, customize your avatar, and trade with
        the community.
      </p>
      <Link href="/auth/login">
        <Button size="lg">Sign In</Button>
      </Link>
    </div>
  );
}
