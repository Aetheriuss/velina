'use client';

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminGet, adminPost } from '../../../lib/adminClient';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

export default function FeatureFlagsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['feature-flags'], queryFn: () => adminGet<Record<string, boolean>>('/feature-flags/all') });
  const flags = data || {};

  const toggle = async (flag: string, enabled: boolean) => {
    try {
      await adminPost(`/feature-flags/${enabled ? 'disable' : 'enable'}?featureFlag=${encodeURIComponent(flag)}`);
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
    } catch (e) { alert((e as Error).message); }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-black">Feature Flags</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(flags).sort(([a], [b]) => a.localeCompare(b)).map(([flag, enabled]) => (
          <Card key={flag} className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{flag}</p>
              <p className={`text-xs ${enabled ? 'text-positive' : 'text-text-muted'}`}>{enabled ? 'Enabled' : 'Disabled'}</p>
            </div>
            <Button size="sm" variant={enabled ? 'secondary' : 'primary'} onClick={() => toggle(flag, enabled)}>{enabled ? 'Disable' : 'Enable'}</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
