"use client";

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Clock,
  Users,
  Calendar,
  Fingerprint,
  SlidersHorizontal,
  Monitor,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LiveClockDisplay } from './LiveClockDisplay';

export interface HrmNavItem {
  href: string;
  defaultLabel: string;
  icon: React.ElementType;
}

export const hrmNavItems: HrmNavItem[] = [
  { href: '/hrm/live', defaultLabel: "Live Board", icon: Clock },
  { href: '/hrm/roster', defaultLabel: 'Staff Roster', icon: Users },
  { href: '/hrm/history', defaultLabel: 'Attendance History', icon: Calendar },
  { href: '/hrm/terminal', defaultLabel: 'Punch Terminal', icon: Fingerprint },
  { href: '/hrm/settings', defaultLabel: 'Shift Policy', icon: SlidersHorizontal },
];

export function HrmTopNavbar() {
  const pathname = usePathname();
  const activeTabRef = useRef<HTMLAnchorElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active tab into view on mobile
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
    <header className="sticky top-0 z-20 w-full bg-white/95 dark:bg-card/95 backdrop-blur-md border-b border-slate-200/80 dark:border-border/60 shadow-2xs print:hidden">
      {/* 1. Desktop & Tablet Navbar (md and wider) */}
      <div className="hidden md:flex w-full px-4 lg:px-8 py-2.5 items-center justify-between gap-4">
        {/* Left: Branding & Sub-navigation pills */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-200 dark:border-border/60">
            <span className="inline-flex items-center justify-center p-1.5 rounded-xl bg-blue-600 text-white shadow-xs">
              <Users className="w-4 h-4" />
            </span>
            <span className="font-black text-sm text-slate-900 dark:text-foreground tracking-tight">HRM</span>
          </div>

          <nav className="flex items-center gap-1.5 min-w-0" aria-label="HRM Desktop Navigation">
            {hrmNavItems.map((item) => {
              const cleanHref = item.href.replace(/\/$/, '');
              const cleanPath = pathname.replace(/\/$/, '');
              const isActive =
                cleanPath === cleanHref ||
                (cleanHref === '/hrm/live' && (cleanPath === '/hrm' || cleanPath === ''));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'h-9 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0',
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 font-bold'
                      : 'text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-foreground hover:bg-slate-100 dark:hover:bg-muted/70 font-medium'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.defaultLabel}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Current Time & Quick Utilities */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden lg:flex flex-col items-end pr-3 border-r border-slate-200 dark:border-border/60">
            <span className="text-[10px] uppercase font-bold text-slate-400">Current Time</span>
            <LiveClockDisplay className="text-xs font-mono font-bold text-slate-800 dark:text-foreground tracking-tight" />
          </div>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 rounded-xl border-slate-200 dark:border-border/70 bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-muted text-slate-700 dark:text-foreground font-semibold text-xs shadow-2xs transition-colors"
          >
            <Link href="/hrm/kiosk">
              <Monitor className="w-3.5 h-3.5 mr-1 text-blue-600" />
              Counter Kiosk
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 rounded-xl border-slate-200 dark:border-border/70 bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-muted text-slate-700 dark:text-foreground font-semibold text-xs shadow-2xs transition-colors"
          >
            <Link href="/accounts/staff">
              <Wallet className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Payroll &amp; Salaries
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Mobile Single-Line Horizontal Scroll Pill Bar (< md) */}
      <div className="md:hidden relative w-full overflow-hidden">
        {/* Subtle left & right edge fades */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white dark:from-card via-white/80 dark:via-card/80 to-transparent z-10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white dark:from-card via-white/80 dark:via-card/80 to-transparent z-10"
        />

        <nav
          ref={scrollContainerRef}
          aria-label="HRM Mobile Sub Navigation"
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-none [touch-action:pan-x] px-3 py-1.5 min-h-[44px] w-full"
        >
          {hrmNavItems.map((item) => {
            const cleanHref = item.href.replace(/\/$/, '');
            const cleanPath = pathname.replace(/\/$/, '');
            const isActive =
              cleanPath === cleanHref ||
              (cleanHref === '/hrm/live' && (cleanPath === '/hrm' || cleanPath === ''));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                ref={isActive ? activeTabRef : null}
                href={item.href}
                className={cn(
                  'min-h-[38px] h-9 px-3 rounded-xl flex items-center gap-1.5 shrink-0 text-xs transition-all active:scale-95 whitespace-nowrap border shadow-2xs',
                  isActive
                    ? 'bg-blue-600 text-white border-transparent shadow-sm shadow-blue-500/25 font-bold'
                    : 'bg-white dark:bg-card border-slate-200 dark:border-border/70 text-slate-700 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted font-medium'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5 shrink-0', isActive ? 'text-white' : 'text-slate-500')} />
                <span>{item.defaultLabel}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
