'use client';

import React, { useState } from 'react';
import { apiRequest } from '../../../lib/apiClient';
import AuthCard from '../_components/AuthCard';
import Button from '../../../components/ui/Button';

/**
 * Account deletion (App Router port of the Razor AccountDeletion page). Posts username+password to
 * POST /apisite/auth/v2/account-deletion, which verifies credentials, enforces the per-IP daily
 * rate limit, and deletes the account server-side. Destructive + irreversible.
 */
export default function AccountDeletionPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await apiRequest('POST', 'auth', '/v2/account-deletion', { body: { username, password } });
      setSuccess('Your account has been successfully deleted.');
      setUsername('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard title="Account Deletion" className="mt-10">
      <p className="text-text-muted">
        To delete your account, enter your credentials below. You must be offline for at least 1 week
        before you can delete your account.
      </p>
      <p className="mt-2">
        <span className="font-semibold text-negative">There is no way to undo an account deletion.</span>{' '}
        Your account and all its information (such as items and creations) will be permanently scrubbed
        from the website.
      </p>
      {success ? <p className="mt-3 text-sm text-positive">{success}</p> : null}
      {error ? <p className="mt-3 text-sm text-negative">{error}</p> : null}
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="rounded-rbx border border-border bg-surface px-3 py-2"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-rbx border border-border bg-surface px-3 py-2"
        />
        <div className="mt-1">
          <Button
            type="submit"
            disabled={submitting}
            className="border border-negative bg-negative text-white hover:opacity-90"
          >
            {submitting ? 'Deleting…' : 'Delete Account'}
          </Button>
        </div>
      </form>
      <p className="mt-4 text-sm text-text-muted">
        If you do not remember your username or password, you cannot delete your account — we&apos;d
        have no way to verify you are the true account owner.
      </p>
    </AuthCard>
  );
}
