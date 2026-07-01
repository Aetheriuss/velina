'use client';

import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminGet } from '../../lib/adminClient';

/** GET /admin-api/api/permissions — the admin rank + permission list (ports stores/rank.ts). */
export interface RankResponse {
  rank: {
    name: string;
    details: { isAdmin: boolean; isModerator: boolean; isOwner: boolean };
    permissions: string[];
  };
  restrictions?: Record<string, boolean>;
}

interface AdminPermsValue {
  data: RankResponse | null;
  isPending: boolean;
  isError: boolean;
  hasPermission: (p: string) => boolean;
  is: (rank: 'owner' | 'admin' | 'moderator' | 'mod') => boolean;
}

const Ctx = createContext<AdminPermsValue | null>(null);

export const AdminPermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, isLoading, isError } = useQuery<RankResponse>({
    queryKey: ['admin-permissions'],
    queryFn: () => adminGet<RankResponse>('/permissions'),
    retry: false,
    staleTime: 300_000,
  });

  const value: AdminPermsValue = {
    data: data ?? null,
    isPending: isLoading,
    isError,
    hasPermission: (p) => !!data?.rank?.permissions?.includes(p),
    is: (rank) => {
      const d = data?.rank?.details;
      if (!d) return false;
      const r = rank.toLowerCase();
      if (r === 'owner') return d.isOwner;
      if (r === 'admin') return d.isAdmin;
      return d.isModerator; // mod / moderator
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAdminPerms = (): AdminPermsValue => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdminPerms must be used within AdminPermissionsProvider');
  return ctx;
};
