'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../providers/AuthProvider';
import { useTheme } from '../providers/ThemeProvider';
import { useRobux, useUnreadMessages, useSelfHeadshot, useIsStaff } from './useNavData';
import { useSidebar } from './SidebarContext';
import { abbreviateNumber } from '../../lib/numberUtils';
import Button from '../ui/Button';

/**
 * 2020-era slim dark top bar (dark in both themes). Navigation links live in
 * the left <Sidebar/>; the top bar carries only the drawer toggle, wordmark,
 * search, and the user chrome (Robux, messages, friends, admin, theme, avatar).
 */

const MENU_LINKS = (userId: number) => [
  { name: 'Profile', href: `/users/${userId}/profile` },
  { name: 'Avatar', href: '/My/Character.aspx' },
  { name: 'Inventory', href: `/users/${userId}/inventory` },
  { name: 'Friends', href: `/users/${userId}/friends` },
  { name: 'Money', href: '/My/Money.aspx' },
  { name: 'Settings', href: '/My/Account' },
];

/* Inline icons — no icon dependency. */
const SearchIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
    <circle cx="9" cy="9" r="6" />
    <path d="m14 14 4 4" strokeLinecap="round" />
  </svg>
);
const RobuxIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M10 2 3 6v8l7 4 7-4V6l-7-4Z" strokeLinejoin="round" />
    <rect x="7.5" y="7.5" width="5" height="5" rx="1" fill="currentColor" stroke="none" />
  </svg>
);
const MessageIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <rect x="2" y="4" width="16" height="12" rx="2" />
    <path d="m3 6 7 5 7-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const FriendsIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <circle cx="7.5" cy="7" r="2.5" />
    <path d="M3 16a4.5 4.5 0 0 1 9 0" strokeLinecap="round" />
    <path d="M13 5a2.5 2.5 0 0 1 0 4.5M14 11.5A4.5 4.5 0 0 1 17 16" strokeLinecap="round" />
  </svg>
);
const ShieldIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <path d="M10 2 4 4.5v5c0 3.7 2.6 6.6 6 8 3.4-1.4 6-4.3 6-8v-5L10 2Z" strokeLinejoin="round" />
    <path d="m7.5 9.5 2 2 3.5-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const HamburgerIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
    <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
  </svg>
);

const SearchBox = ({ className = '', onNavigate }: { className?: string; onNavigate?: () => void }) => {
  const router = useRouter();
  const [value, setValue] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const keyword = value.trim();
    if (!keyword) return;
    router.push(`/search/users?keyword=${encodeURIComponent(keyword)}`);
    onNavigate?.();
  };
  return (
    <form onSubmit={submit} className={`relative ${className}`} role="search">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/50">
        <SearchIcon />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search"
        aria-label="Search users"
        className="h-8 w-full rounded-rbx bg-white/10 pl-9 pr-3 text-sm text-white placeholder:text-white/50 outline-none transition-colors focus:bg-white/20"
      />
    </form>
  );
};

/** Badge-capable icon button used for messages/friends/admin. */
const IconLink = ({
  href,
  label,
  badge,
  children,
}: {
  href: string;
  label: string;
  badge?: number;
  children: React.ReactNode;
}) => (
  <Link
    href={href}
    aria-label={label}
    title={label}
    className="relative grid h-9 w-9 place-items-center rounded-rbx text-white/80 transition-colors hover:bg-white/10 hover:text-white"
  >
    {children}
    {badge ? (
      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-negative px-1 text-[10px] font-bold leading-none text-white">
        {badge > 99 ? '99+' : badge}
      </span>
    ) : null}
  </Link>
);

const AvatarMenu = () => {
  const { userId, username, logout } = useAuth();
  const headshot = useSelfHeadshot();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close on outside click / Escape / navigation.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  useEffect(() => setOpen(false), [pathname]);

  if (!userId) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-rbx py-1 pl-1 pr-2 transition-colors hover:bg-white/10"
      >
        <span className="h-8 w-8 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/20">
          {headshot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={headshot} alt="" className="h-full w-full object-cover" />
          ) : null}
        </span>
        <span className="hidden max-w-[120px] truncate text-sm font-semibold text-white lg:block">
          {username}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 top-full mt-1 w-48 overflow-hidden rounded-rbx border border-border bg-surface py-1 text-text shadow-rbx">
          {MENU_LINKS(userId).map((l) => (
            <Link
              key={l.name}
              href={l.href}
              className="block px-4 py-2 text-sm transition-colors hover:bg-surface-alt"
            >
              {l.name}
            </Link>
          ))}
          <hr className="my-1 border-border" />
          <button
            type="button"
            onClick={() => logout()}
            className="block w-full px-4 py-2 text-left text-sm text-negative transition-colors hover:bg-surface-alt"
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
};

export const TopBar: React.FC = () => {
  const { userId, isAuthenticated, isPending } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toggle } = useSidebar();
  const robux = useRobux();
  const unread = useUnreadMessages();
  const isStaff = useIsStaff();

  return (
    <header className="fixed inset-x-0 top-0 z-topbar flex h-topbar items-center gap-3 bg-nav-bg px-3 text-white">
      <button
        type="button"
        onClick={toggle}
        aria-label="Toggle navigation"
        className="grid h-9 w-9 place-items-center rounded-rbx text-white/80 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
      >
        <HamburgerIcon />
      </button>

      <Link
        href={isAuthenticated ? '/home' : '/'}
        className="shrink-0 text-xl font-black tracking-tight text-white"
      >
        ROBLOX
      </Link>

      <SearchBox className="mx-2 w-full max-w-[420px] flex-1" />

      <div className="ml-auto flex items-center gap-1">
        {isPending ? (
          <span className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
        ) : isAuthenticated ? (
          <>
            <Link
              href="/My/Money.aspx"
              title="Robux"
              className="flex h-9 items-center gap-1.5 rounded-rbx px-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            >
              <span className="text-positive">
                <RobuxIcon />
              </span>
              {robux === null ? '—' : abbreviateNumber(robux)}
            </Link>
            <IconLink href="/My/Messages" label="Messages" badge={unread}>
              <MessageIcon />
            </IconLink>
            {userId ? (
              <IconLink href={`/users/${userId}/friends`} label="Friends">
                <FriendsIcon />
              </IconLink>
            ) : null}
            {isStaff ? (
              <IconLink href="/admin" label="Admin">
                <ShieldIcon />
              </IconLink>
            ) : null}
          </>
        ) : (
          <>
            <Link href="/auth/login" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="!text-white/90 hover:!bg-white/10 hover:!text-white">
                Log in
              </Button>
            </Link>
            <Link href="/auth/home">
              <Button size="sm">Sign Up</Button>
            </Link>
          </>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          className="grid h-9 w-9 place-items-center rounded-rbx text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {isAuthenticated ? <AvatarMenu /> : null}
      </div>
    </header>
  );
};

export default TopBar;
