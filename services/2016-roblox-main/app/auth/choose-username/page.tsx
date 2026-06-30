'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest, ApiError } from '../../../lib/apiClient';
import { AUTH_QUERY_KEY } from '../../../components/providers/AuthProvider';
import AuthCard from '../_components/AuthCard';
import Button from '../../../components/ui/Button';

/**
 * Discord new-account step (App Router port of the Razor ChooseUsername page). The suggested
 * username lives in the HttpOnly es_discord_pending cookie, which JS can't read — so we fetch it
 * from GET /apisite/auth/v2/discord/pending. Submitting POSTs to the JSON endpoint that creates
 * the account + sets the .ROBLOSECURITY session cookie, after which we refresh auth and go /home.
 */
export default function ChooseUsernamePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiRequest<{ suggestedUsername: string }>('GET', 'auth', '/v2/discord/pending')
      .then((d) => {
        if (!active) return;
        setUsername(d.suggestedUsername || '');
        setLoading(false);
      })
      .catch(() => {
        // 401 → expired / no pending Discord signup. Restart the flow.
        window.location.href = '/auth/discord/login';
      });
    return () => {
      active = false;
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await apiRequest('POST', 'auth', '/v2/discord/choose-username', {
        body: { username, password: password || undefined },
      });
      // Session cookie is now set; refresh auth state and enter the site.
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      router.push('/home');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        window.location.href = '/auth/discord/login';
        return;
      }
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <AuthCard title="Choose your username" className="mt-10">
      <p className="mb-4 text-text-muted">
        Your Discord account is verified. Pick the username you&apos;ll use on the site — this is
        public and permanent.
      </p>
      {error ? <p className="mb-3 text-sm text-negative">{error}</p> : null}
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <input
          type="text"
          placeholder="Username"
          value={username}
          autoFocus
          onChange={(e) => setUsername(e.target.value)}
          className="rounded-rbx border border-border bg-surface px-3 py-2"
        />
        <input
          type="password"
          placeholder="Password (optional)"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-rbx border border-border bg-surface px-3 py-2"
        />
        <small className="mb-2 text-text-muted">
          Optional. Set a password to also sign in with username + password; leave blank to use
          Discord only.
        </small>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Creating…' : 'Create my account'}
        </Button>
      </form>
    </AuthCard>
  );
}
