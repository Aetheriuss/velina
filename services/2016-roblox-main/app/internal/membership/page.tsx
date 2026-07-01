'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../lib/apiClient';
import { useAuth } from '../../../components/providers/AuthProvider';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

const OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'None', label: 'None' },
  { value: 'BuildersClub', label: "Builder's Club" },
  { value: 'TurboBuildersClub', label: 'Turbo Builders Club' },
  { value: 'OutrageousBuildersClub', label: 'Outrageous Builders Club' },
];

export default function MembershipPage() {
  const { isAuthenticated, isPending } = useAuth();
  const { data } = useQuery({
    queryKey: ['membership'],
    enabled: isAuthenticated,
    queryFn: () => apiRequest<{ membershipType: string }>('GET', 'internal-forms', '/v1/membership'),
  });
  const [value, setValue] = useState('None');
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data?.membershipType) setValue(data.membershipType); }, [data]);

  if (isPending) return null;
  if (!isAuthenticated) return <p className="text-center text-text-muted">Please sign in to manage your membership.</p>;

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await apiRequest('POST', 'internal-forms', '/v1/membership', { body: { membershipType: value } });
      setMsg('Membership updated. You will receive the daily Robux stipend for your tier.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not update membership.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-3xl font-black">Membership</h1>
      <Card className="flex flex-col gap-3">
        <label className="text-sm text-text-muted">Membership tier</label>
        <select value={value} onChange={(e) => setValue(e.target.value)} className="rounded-rbx border border-border bg-surface px-3 py-2">
          {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {msg ? <p className="text-sm text-text-muted">{msg}</p> : null}
        <div><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Submit Changes'}</Button></div>
      </Card>
    </div>
  );
}
