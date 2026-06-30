'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../providers/AuthProvider';
import { useTheme } from '../providers/ThemeProvider';
import Button from '../ui/Button';

/**
 * 2020-era Roblox top navigation (dark bar in both themes). This is the App
 * Router shell navbar that replaces the legacy 2016 JSS navbar. It is fleshed
 * out (search, robux balance, notifications, avatar menu) in Phase 2+.
 */
export const Navbar: React.FC = () => {
  const { isAuthenticated, isPending, username, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-50 bg-nav-bg text-white">
      <div className="mx-auto flex h-14 max-w-[1100px] items-center gap-4 px-4">
        <Link href="/home" className="text-xl font-bold tracking-tight text-white">
          ROBLOX
        </Link>

        <div className="hidden flex-1 items-center gap-4 md:flex">
          <Link href="/games" className="text-sm text-white/80 hover:text-white">
            Games
          </Link>
          <Link href="/catalog" className="text-sm text-white/80 hover:text-white">
            Catalog
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            className="rounded-rbx px-2 py-1 text-sm text-white/80 hover:bg-white/10 hover:text-white"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {isPending ? null : isAuthenticated ? (
            <>
              <span className="text-sm text-white/90">{username}</span>
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-rbx px-2 py-1 text-sm text-white/70 hover:bg-white/10 hover:text-white"
              >
                Log out
              </button>
            </>
          ) : (
            <Link href="/auth/login">
              <Button size="sm">Login</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
