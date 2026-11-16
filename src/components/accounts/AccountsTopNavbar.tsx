'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Receipt,
  Truck,
  Users,
  FileSpreadsheet,
  ArrowDownLeft,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePreferences } from '@/context/PreferencesContext';
import { useClientAuth } from '@/hooks/use-client-auth';

export interface NavItem {
  href: string;
  labelKey: string;
  defaultLabel: string;
  icon: React.ElementType;
}

// 4. Tab order: Overview, Income, Expenses, Vendors, Staff, Reports (Restaurant)
export const restaurantNavItems: NavItem[] = [
  { href: '/accounts/overview', labelKey: 'accountsOverview', defaultLabel: 'Overview', icon: BarChart3 },
  { href: '/accounts/income', labelKey: 'income', defaultLabel: 'Income', icon: ArrowDownLeft },
  { href: '/accounts/expenses', labelKey: 'expenses', defaultLabel: 'Expenses', icon: Receipt },
  { href: '/accounts/vendors', labelKey: 'vendors', defaultLabel: 'Vendors', icon: Truck },
  { href: '/accounts/staff', labelKey: 'staff', defaultLabel: 'Staff', icon: Users },
  { href: '/accounts/reports', labelKey: 'reports', defaultLabel: 'Reports', icon: FileSpreadsheet },
];

// 4. Tab order: Overview, Income, Customer Due, Expenses, Vendors, Staff, Reports (Parlour)
export const parlourNavItems: NavItem[] = [
  { href: '/accounts/overview', labelKey: 'accountsOverview', defaultLabel: 'Overview', icon: BarChart3 },
  { href: '/accounts/income', labelKey: 'income', defaultLabel: 'Income', icon: ArrowDownLeft },
  { href: '/accounts/due', labelKey: 'customerDue', defaultLabel: 'Customer Due', icon: Clock },
  { href: '/accounts/expenses', labelKey: 'expenses', defaultLabel: 'Expenses', icon: Receipt },
  { href: '/accounts/vendors', labelKey: 'vendors', defaultLabel: 'Vendors', icon: Truck },
  { href: '/accounts/staff', labelKey: 'staff', defaultLabel: 'Staff', icon: Users },
  { href: '/accounts/reports', labelKey: 'reports', defaultLabel: 'Reports', icon: FileSpreadsheet },
];

/**
 * Accounts Sub Navigation Bar (AccountsSubNav / AccountsTopNavbar)
 * - Desktop (md+): Standard horizontal top navbar (unmodified).
 * - Mobile (< md): Single-line sticky horizontal scroll pill bar with smooth scrollIntoView on active tab.
 */
export function AccountsTopNavbar() {
  const pathname = usePathname();
  const { t } = usePreferences();
  const { clientUser } = useClientAuth();
  const isParlour = clientUser?.type === 'parlour';
  const navItems = isParlour ? parlourNavItems : restaurantNavItems;

  const activeTabRef = useRef<HTMLAnchorElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 2. Auto-scroll active tab into view (centered, smooth) on mount & route change
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [pathname]);

  return (
    <header className="sticky top-0 z-20 w-full bg-background/95 backdrop-blur-md border-b border-border/60 shadow-2xs print:hidden">
      {/* 1. Desktop & Tablet Navbar (md and wider) — desktop behavior unchanged */}
      <div className="hidden md:flex w-full px-4 lg:px-8 xl:px-10 py-2.5 items-center justify-between gap-3">
        <nav className="flex items-center gap-1.5 min-w-0" aria-label="Accounts Desktop Navigation">
          {navItems.map((item) => {
            const cleanHref = item.href.replace(/\/$/, '');
            const cleanPath = pathname.replace(/\/$/, '');
            const isActive =
              cleanPath === cleanHref ||
              (cleanHref === '/accounts/overview' && (cleanPath === '/accounts' || cleanPath === ''));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'h-9 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0',
                  isActive
                    ? 'bg-[#FF5A36] text-white shadow-sm shadow-orange-500/25 font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70 font-medium'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{t(item.labelKey, item.defaultLabel)}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 2. Mobile Single-Line Horizontal Scroll Pill Bar (< md) */}
      <div className="md:hidden relative w-full overflow-hidden">
        {/* Subtle left & right edge fades */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-background via-background/80 to-transparent z-10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-5 bg-gradient-to-l from-background via-background/80 to-transparent z-10"
        />

        {/* Scrollable pill track */}
        <nav
          ref={scrollContainerRef}
          aria-label="Accounts Mobile Sub Navigation"
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-none [touch-action:pan-x] px-3 py-1.5 min-h-[44px] w-full"
        >
          {navItems.map((item) => {
            const cleanHref = item.href.replace(/\/$/, '');
            const cleanPath = pathname.replace(/\/$/, '');
            const isActive =
              cleanPath === cleanHref ||
              (cleanHref === '/accounts/overview' && (cleanPath === '/accounts' || cleanPath === ''));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                ref={isActive ? activeTabRef : null}
                href={item.href}
                className={cn(
                  // Minimum 44px touch target, 40-44px visual height
                  'min-h-[44px] h-10 px-3 rounded-xl flex items-center gap-1.5 shrink-0 text-xs transition-all active:scale-95 whitespace-nowrap border shadow-2xs',
                  isActive
                    ? 'bg-[#FF5A36] text-white border-transparent shadow-sm shadow-orange-500/25 font-bold'
                    : 'bg-card border-border/70 text-foreground hover:bg-muted/60 hover:border-border font-medium'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5 shrink-0', isActive ? 'text-white' : 'text-foreground/70')} />
                <span>{t(item.labelKey, item.defaultLabel)}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

// Alias for backwards compatibility & clean naming
export { AccountsTopNavbar as AccountsSubNav };

/**
 * Backwards compatibility helper:
 * Since the sticky single-line horizontal bar in AccountsTopNavbar now handles mobile navigation,
 * AccountsMobileCards returns null so the old 4+3 grid is removed without breaking page imports.
 */
export function AccountsMobileCards() {
  return null;
}
