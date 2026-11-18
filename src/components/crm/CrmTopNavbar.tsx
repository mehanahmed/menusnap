"use client";

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  CreditCard,
  SlidersHorizontal,
  Crown,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CrmNavItem {
  href: string;
  defaultLabel: string;
  icon: React.ElementType;
}

export const crmNavItems: CrmNavItem[] = [
  { href: '/crm/customers', defaultLabel: 'Customers Directory', icon: Users },
  { href: '/crm/cards', defaultLabel: 'Membership Cards', icon: Crown },
  { href: '/crm/settings', defaultLabel: 'Loyalty Settings', icon: SlidersHorizontal },
];

export function CrmTopNavbar() {
  const pathname = usePathname();
  const activeTabRef = useRef<HTMLAnchorElement>(null);

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
      <div className="w-full px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Branding & Sub-navigation pills */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-200 dark:border-border/60">
            <span className="inline-flex items-center justify-center p-1.5 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-xs">
              <Crown className="w-4 h-4" />
            </span>
            <span className="font-black text-sm text-slate-900 dark:text-foreground tracking-tight">CRM</span>
          </div>

          <nav className="flex items-center gap-1.5 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="CRM Navigation">
            {crmNavItems.map((item) => {
              const cleanHref = item.href.replace(/\/$/, '');
              const cleanPath = pathname.replace(/\/$/, '');
              const isActive =
                cleanPath === cleanHref ||
                (cleanHref === '/crm/customers' && (cleanPath === '/crm' || cleanPath.startsWith('/crm/customers/')));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  ref={isActive ? activeTabRef : null}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150',
                    isActive
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-muted/60'
                  )}
                >
                  <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400')} />
                  <span>{item.defaultLabel}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side helper tag */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-medium">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-[10px] font-bold text-amber-700 dark:text-amber-300">
            <Sparkles className="w-3 h-3" /> Auto Customer Sync Active
          </span>
        </div>
      </div>
    </header>
  );
}
