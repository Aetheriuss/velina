import React from 'react';
import type { Metadata } from 'next';
import AuthCard from '../_components/AuthCard';
import DiscordButton from '../_components/DiscordButton';

export const metadata: Metadata = { title: 'Login' };

/**
 * User-facing sign-in (re-skinned, App Router). Velina is Discord-only, so this is a CTA, not a
 * password form. The staff break-glass password login lives on .NET at /auth/break-glass.
 */
export default function LoginPage() {
  return (
    <AuthCard title="Sign In" className="mt-10">
      <p className="mb-5 text-text-muted">
        Velina uses Discord to sign in — no password or invite key required.
      </p>
      <DiscordButton className="w-full" />
    </AuthCard>
  );
}
