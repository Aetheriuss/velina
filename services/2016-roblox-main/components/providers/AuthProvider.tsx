'use client';

import React, { createContext, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/apiClient';
import { useRouter } from 'next/navigation';

/**
 * Auth state for the App Router tree. Replaces the unstated-next
 * AuthenticationStore: the authoritative source is GET
 * /apisite/users/v1/users/authenticated (the .ROBLOSECURITY cookie is HttpOnly
 * and can never be read directly). Robux/notification fan-out is split into
 * separate queries so they refetch independently.
 *
 * After login (Phase 3) call `refresh()` to re-run the authenticated query so
 * the UI reflects the freshly-set cookie.
 */

export interface AuthenticatedUser {
  id: number;
  name: string;
  displayName?: string;
}

export const AUTH_QUERY_KEY = ['authenticated'] as const;

interface AuthContextValue {
  user: AuthenticatedUser | null;
  userId: number | null;
  username: string | null;
  isAuthenticated: boolean;
  isPending: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const fetchAuthenticated = async (): Promise<AuthenticatedUser | null> => {
  try {
    return await apiRequest<AuthenticatedUser>('GET', 'users', '/v1/users/authenticated');
  } catch {
    // 401/403 → not logged in.
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchAuthenticated,
    staleTime: 60_000,
    retry: false,
  });

  const user = data ?? null;

  const value: AuthContextValue = {
    user,
    userId: user?.id ?? null,
    username: user?.name ?? null,
    isAuthenticated: !!user,
    isPending: isLoading,
    refresh: async () => {
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    },
    logout: async () => {
      // Server clears the .ROBLOSECURITY cookie + session; swallow errors (e.g. already logged out).
      try {
        await apiRequest('POST', 'auth', '/v2/logout');
      } catch {
        /* ignore */
      }
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      router.push('/');
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
