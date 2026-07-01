'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../lib/apiClient';
import { useAuth } from '../../../components/providers/AuthProvider';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

export default function AgePage() {
  const { isAuthenticated, isPending } = useAuth();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['age-cert'],
    enabled: isAuthenticated,
    queryFn: () => apiRequest<{ is18Plus: boolean }>('GET', 'internal-forms', '/v1/age'),
  });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isPending) return null;
  if (!isAuthenticated) return <p className="text-center text-text-muted">Please sign in.</p>;

  const submit = async () => {
    if (!consent || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiRequest('POST', 'internal-forms', '/v1/age');
      await queryClient.invalidateQueries({ queryKey: ['age-cert'] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not certify.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-3xl font-black">18+ Certification</h1>
      <Card>
        {data?.is18Plus ? (
          <div className="flex flex-col gap-3">
            <p>Your account is marked as 18 or over. You now have access to assets marked 18+. This certification cannot be revoked.</p>
            <a href="/home"><Button>Home</Button></a>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
              <span>
                By checking this box and clicking submit, I certify that I am 18 years of age or older, I consent to
                viewing 18+ material on the website, and I understand this certification cannot be revoked.
              </span>
            </label>
            {error ? <p className="text-sm text-negative">{error}</p> : null}
            <div><Button onClick={submit} disabled={!consent || busy}>{busy ? 'Submitting…' : 'Submit'}</Button></div>
          </div>
        )}
      </Card>
    </div>
  );
}
