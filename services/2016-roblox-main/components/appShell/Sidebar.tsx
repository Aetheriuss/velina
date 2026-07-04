'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../providers/AuthProvider';
import { useIsStaff } from './useNavData';
import { useSidebar } from './SidebarContext';

/**
 * 2020-era persistent left navigation. Pinned white column on desktop
 * (>=1024px); off-canvas drawer below `lg`, toggled by the top-bar hamburger.
 * Links point only to routes that actually exist in the App Router.
 */

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

/* Inline icons — 20px, stroke = currentColor, no icon dependency. */
type IconProps = { className?: string };
const iconBase = 'h-5 w-5';

const HomeIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cx(iconBase, className)}>
    <path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const GamesIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cx(iconBase, className)}>
    <path d="M8 6h8a5 5 0 0 1 5 5v2a4 4 0 0 1-7 3l-.5-.5h-3L10 16a4 4 0 0 1-7-3v-2a5 5 0 0 1 5-5Z" strokeLinejoin="round" />
    <path d="M7 11v3M5.5 12.5h3" strokeLinecap="round" />
    <circle cx="16" cy="11.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="18" cy="13.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);
const CatalogIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cx(iconBase, className)}>
    <path d="M6 8h12l-1 12H7L6 8Z" strokeLinejoin="round" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
  </svg>
);
const CreateIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cx(iconBase, className)}>
    <path d="M4 20l1-4L16 5l3 3L8 19l-4 1Z" strokeLinejoin="round" />
    <path d="m14 7 3 3" strokeLinecap="round" />
  </svg>
);
const RobuxIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cx(iconBase, className)}>
    <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" strokeLinejoin="round" />
    <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" stroke="none" />
  </svg>
);
const GroupsIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cx(iconBase, className)}>
    <circle cx="9" cy="9" r="3" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" strokeLinecap="round" />
    <path d="M16 6.5a3 3 0 0 1 0 5.5M17 14a5.5 5.5 0 0 1 3.5 5" strokeLinecap="round" />
  </svg>
);
const TradeIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cx(iconBase, className)}>
    <path d="M4 8h13l-3-3M20 16H7l3 3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const MessagesIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cx(iconBase, className)}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const UserSearchIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cx(iconBase, className)}>
    <circle cx="10" cy="8" r="4" />
    <path d="M3.5 20a6.5 6.5 0 0 1 11-4.5" strokeLinecap="round" />
    <circle cx="17" cy="16" r="3" />
    <path d="m19.2 18.2 2 2" strokeLinecap="round" />
  </svg>
);
const DownloadIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cx(iconBase, className)}>
    <path d="M12 4v10m0 0 4-4m-4 4-4-4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 18h16" strokeLinecap="round" />
  </svg>
);
const SettingsIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cx(iconBase, className)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2m0 14v2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M3 12h2m14 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" strokeLinecap="round" />
  </svg>
);
const ShieldIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cx(iconBase, className)}>
    <path d="M12 3 5 5.5v6c0 4.4 3.1 7.9 7 9.5 3.9-1.6 7-5.1 7-9.5v-6L12 3Z" strokeLinejoin="round" />
    <path d="m9 12 2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type NavItem = {
  label: string;
  href: string;
  Icon: React.FC<IconProps>;
  /** When set, the row only renders under this condition. */
  show?: boolean;
};

const SidebarLink: React.FC<{ item: NavItem; active: boolean; onNavigate: () => void }> = ({
  item,
  active,
  onNavigate,
}) => {
  const { Icon } = item;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'flex h-10 items-center gap-3 px-4 text-sm transition-colors',
        active
          ? 'relative bg-sidebar-active text-accent before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-accent [&>svg]:text-accent'
          : 'text-text hover:bg-sidebar-hover [&>svg]:text-text-muted'
      )}
    >
      <Icon className="shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
};

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const isStaff = useIsStaff();
  const { open, close } = useSidebar();

  const primary: NavItem[] = [
    { label: 'Home', href: isAuthenticated ? '/home' : '/', Icon: HomeIcon },
    { label: 'Games', href: '/games', Icon: GamesIcon },
    { label: 'Catalog', href: '/catalog', Icon: CatalogIcon },
    { label: 'Create', href: '/develop', Icon: CreateIcon },
    { label: 'Robux', href: '/My/Money.aspx', Icon: RobuxIcon, show: isAuthenticated },
    { label: 'Groups', href: '/My/Groups.aspx', Icon: GroupsIcon, show: isAuthenticated },
    { label: 'Trade', href: '/My/Trades.aspx', Icon: TradeIcon, show: isAuthenticated },
  ];

  const secondary: NavItem[] = [
    { label: 'Messages', href: '/My/Messages', Icon: MessagesIcon, show: isAuthenticated },
    { label: 'Search People', href: '/search/users', Icon: UserSearchIcon },
    { label: 'Download', href: '/download', Icon: DownloadIcon },
    { label: 'Settings', href: '/My/Account', Icon: SettingsIcon, show: isAuthenticated },
    { label: 'Admin', href: '/admin', Icon: ShieldIcon, show: isStaff },
  ];

  const isActive = (href: string) => {
    if (href === '/' || href === '/home') return pathname === href;
    return pathname === href || (pathname?.startsWith(href + '/') ?? false);
  };

  const visible = (items: NavItem[]) => items.filter((i) => i.show === undefined || i.show);

  return (
    <aside
      aria-label="Primary navigation"
      className={cx(
        'fixed left-0 top-topbar z-sidebar h-[calc(100vh-50px)] w-sidebar shrink-0',
        'overflow-y-auto border-r border-border bg-sidebar-bg',
        'transition-transform duration-200 lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      <nav className="flex flex-col py-2">
        {visible(primary).map((item) => (
          <SidebarLink key={item.href} item={item} active={isActive(item.href)} onNavigate={close} />
        ))}
        <hr className="my-2 border-border" />
        {visible(secondary).map((item) => (
          <SidebarLink key={item.href} item={item} active={isActive(item.href)} onNavigate={close} />
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
