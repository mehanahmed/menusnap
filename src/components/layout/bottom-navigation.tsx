"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ListOrdered,
  FileEdit,
  UtensilsCrossed,
  HeartHandshake,
  MoreHorizontal,
  Layers,
  Calculator,
  History as HistoryIcon,
  ShoppingBag,
  LogOut,
  Globe,
  Coins,
  Check,
  Building,
  Utensils,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useClientAuth } from '@/hooks/use-client-auth';
import { usePreferences } from '@/context/PreferencesContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

const navItemsLeft = [
  { href: '/magictab/', label: 'MagicTab', icon: ListOrdered },
  { href: '/customer-orders/', label: 'Customer Orders', icon: UtensilsCrossed, isLive: true },
];

const centerNavItem = { href: '/happy-clients/', label: 'Happy Clients', icon: HeartHandshake };

const draftNavItem = { href: '/draft/', label: 'Draft', icon: FileEdit };

const allNavItems = [...navItemsLeft, centerNavItem, draftNavItem];

export function BottomNavigation() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { clientUser, logout, isSubscriber } = useClientAuth();
  const {
    t,
    language,
    setLanguage,
    currentLanguage,
    languages,
    currency,
    setCurrency,
    currentCurrency,
    currencies,
    currencySymbol,
  } = usePreferences();

  const activeItem = useMemo(() => {
    let activeItemHref: string | undefined;
    const sorted = [...allNavItems].sort((a, b) => b.href.length - a.href.length);
    for (const item of sorted) {
      const cleanItemHref = item.href.replace(/\/$/, '');
      const cleanPathname = pathname.replace(/\/$/, '');
      if (
        cleanPathname === cleanItemHref ||
        pathname.startsWith(item.href) ||
        pathname.startsWith(cleanItemHref + '/')
      ) {
        activeItemHref = item.href;
        break;
      }
    }
    return allNavItems.find((item) => item.href === activeItemHref) || allNavItems[0];
  }, [pathname]);

  const isCenterActive = activeItem.href === centerNavItem.href;

  const isMoreActive = useMemo(() => {
    const moreRoutes = [
      '/templates',
      '/magic-calculation',
      '/magic-calc',
      '/order-history',
    ];
    return moreRoutes.some((route) => pathname.startsWith(route));
  }, [pathname]);

  const moreMenuItems = [
    {
      href: '/templates/',
      label: 'Templates',
      translationKey: 'templates',
      icon: Layers,
      description: 'Explore and switch digital menu designs',
    },
    {
      href: '/magic-calculation/',
      label: 'Magic Calculation',
      translationKey: 'magicCalc',
      icon: Calculator,
      description: 'Calculate food costs, margins & sales',
    },
    {
      href: '/order-history/',
      label: 'Order History',
      translationKey: 'orderHistory',
      icon: HistoryIcon,
      description: 'View previous completed menu orders',
    },
    {
      href: '/happy-clients/',
      label: 'Happy Clients',
      translationKey: 'happyClients',
      icon: HeartHandshake,
      description: 'Client reviews and testimonials',
    },
    {
      href: 'https://store.colorhutbd.xyz',
      label: 'Store',
      translationKey: 'store',
      icon: ShoppingBag,
      description: 'Order physical QR stands & acrylics',
      isExternal: true,
    },
  ];

  return (
    <>
      <div data-wf--new-navbar--variant="primary" className="rd-navbar_wrapper md:hidden print:hidden">
        <div className="relative w-full h-[80px] pointer-events-auto">
          {/* Main Grid Navigation */}
          <nav className="rd-navbar w-full h-full">
            {/* Curve Shape SVG Background */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 375 92"
              fill="none"
              className="rd-navbar_curve-shape"
              preserveAspectRatio="none"
            >
              <g filter="url(#filter0_i_14_1436_menusnap)">
                <path
                  d="M150 8C150 3.58172 146.418 0 142 0H18C8.05908 0 0 8.05859 0 18V92H375V18C375 8.05859 366.941 0 357 0H232C227.582 0 224 3.58172 224 8V21C224 34.8066 218.307 46 204.5 46H170C156.193 46 150 34.8066 150 21V8Z"
                  fill="#FFFFFF"
                />
              </g>
              <defs>
                <filter
                  id="filter0_i_14_1436_menusnap"
                  x="0"
                  y="0"
                  width="375"
                  height="95"
                  filterUnits="userSpaceOnUse"
                  colorInterpolationFilters="sRGB"
                >
                  <feFlood floodOpacity="0" result="BackgroundImageFix" />
                  <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                  <feColorMatrix
                    in="SourceAlpha"
                    type="matrix"
                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                    result="hardAlpha"
                  />
                  <feOffset dy="3" />
                  <feGaussianBlur stdDeviation="2" />
                  <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
                  <feColorMatrix
                    type="matrix"
                    values="0 0 0 0 0.95 0 0 0 0 0.6 0 0 0 0 0.15 0 0 0 0.5 0"
                  />
                  <feBlend mode="normal" in2="shape" result="effect1_innerShadow_14_1436" />
                </filter>
              </defs>
            </svg>

            {/* Left Nav Items */}
            {navItemsLeft.map((item) => {
              const isActive = activeItem.href === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn("rd-navbar_link group", isActive && "is-active")}
                >
                  <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center">
                    <div className="relative flex items-center justify-center">
                      <Icon className={cn("rd-navbar_link_icon transition-transform", isActive && "scale-110")} />
                      {(item as any).isLive && (
                        <span className="absolute -top-0.5 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                      )}
                    </div>
                    <span className="rd-navbar_link_text whitespace-nowrap tracking-tight text-[9px] sm:text-[10px]">
                      {t(item.href.replace(/\//g, ''), item.label)}
                    </span>
                  </motion.div>
                </Link>
              );
            })}

            {/* Center Notch Spacer */}
            <div className="w-[80px] h-full" />

            {/* Right Nav Item 1: Draft (Replaced Templates) */}
            <Link
              href={draftNavItem.href}
              className={cn("rd-navbar_link group", activeItem.href === draftNavItem.href && "is-active")}
            >
              <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center">
                <div className="relative flex items-center justify-center">
                  <draftNavItem.icon
                    className={cn(
                      "rd-navbar_link_icon transition-transform",
                      activeItem.href === draftNavItem.href && "scale-110"
                    )}
                  />
                </div>
                <span className="rd-navbar_link_text whitespace-nowrap tracking-tight text-[9px] sm:text-[10px]">
                  {t('draft', draftNavItem.label)}
                </span>
              </motion.div>
            </Link>

            {/* Right Nav Item 2: More Three-Dots Button (Replaced Draft) */}
            <button
              type="button"
              onClick={() => setIsMoreOpen(true)}
              className={cn(
                "rd-navbar_link group cursor-pointer bg-transparent border-none appearance-none focus:outline-none",
                isMoreActive && "is-active"
              )}
              aria-label="More navigation options"
            >
              <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center">
                <div className="relative flex items-center justify-center">
                  <MoreHorizontal
                    className={cn(
                      "rd-navbar_link_icon transition-transform",
                      (isMoreActive || isMoreOpen) && "scale-110"
                    )}
                  />
                </div>
                <span className="rd-navbar_link_text whitespace-nowrap tracking-tight text-[9px] sm:text-[10px]">
                  {t('more', 'More')}
                </span>
              </motion.div>
            </button>
          </nav>

          {/* Center Action Button (Absolute Centered in Notch) */}
          <Link href={centerNavItem.href} className="rd-navbar_btn group">
            <div className="rd-navbar_btn_bg" />
            <div className={cn("rd-navbar_btn_content", isCenterActive && "is-active")}>
              <centerNavItem.icon
                className={cn(
                  "rd-navbar_btn_icon transition-transform group-hover:scale-110",
                  isCenterActive && "rotate-6"
                )}
              />
            </div>
          </Link>
        </div>
      </div>

      {/* Slide-Up Bottom Sheet Drawer for More Options */}
      <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <SheetContent
          side="bottom"
          className="bg-[#121215] text-white border-t border-white/15 shadow-2xl rounded-t-[28px] max-h-[85vh] overflow-y-auto px-4 pb-8 pt-3 focus:outline-none z-50"
        >
          {/* Top Swipe Indicator Handle */}
          <div className="w-10 h-1.5 rounded-full bg-white/20 mx-auto mb-3.5" />

          <SheetHeader className="sr-only">
            <SheetTitle>Navigation & Preferences</SheetTitle>
            <SheetDescription>Explore other sections, language, currency, and account settings.</SheetDescription>
          </SheetHeader>

          {/* User Profile Card */}
          {clientUser ? (
            <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF5A36] via-orange-500 to-amber-400 text-white flex items-center justify-center font-extrabold text-sm shadow-md uppercase shrink-0">
                  {clientUser.businessName ? clientUser.businessName.charAt(0) : <Building className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate leading-tight">
                    {clientUser.businessName || 'My Business'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-400">
                    <span className="capitalize">{clientUser.type || 'Business'}</span>
                    <span>•</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                      {clientUser.subscriptionPackage?.replace(/_plan$/i, '') || (isSubscriber ? 'Pro' : 'Free')}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMoreOpen(false);
                  logout();
                }}
                title={t('logout', 'Logout')}
                className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 transition-all shrink-0 cursor-pointer active:scale-95"
              >
                <LogOut className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ) : null}

          {/* More Navigation Links */}
          <div className="space-y-1.5 mb-5">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1 mb-1">
              Menu Navigation
            </p>
            {moreMenuItems.map((item) => {
              const isExternal = Boolean(item.isExternal);
              const isActive =
                !isExternal &&
                (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noopener noreferrer' : undefined}
                  onClick={() => setIsMoreOpen(false)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-2xl transition-all",
                    isActive
                      ? "bg-primary/20 text-primary border border-primary/35 font-bold"
                      : "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.06]"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                        isActive ? "bg-primary text-white" : "bg-white/[0.08] text-zinc-300"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold block leading-tight">
                        {t(item.translationKey, item.label)}
                      </span>
                      <span className="text-[11px] text-zinc-400 font-normal truncate block mt-0.5">
                        {item.description}
                      </span>
                    </div>
                  </div>
                  {isExternal ? (
                    <ExternalLink className="w-4 h-4 text-zinc-500 shrink-0 ml-2" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0 ml-2" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Preferences: Language & Currency */}
          <div className="space-y-3 pt-3 border-t border-white/10 mb-5">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1">
              Preferences
            </p>

            {/* Language Selector */}
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-3">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-zinc-400" />
                  Language
                </span>
                <span className="text-xs text-orange-400 font-bold">
                  {currentLanguage.flag} {currentLanguage.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {languages.map((l) => {
                  const isSelected = language === l.code;
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setLanguage(l.code)}
                      className={cn(
                        "flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer",
                        isSelected
                          ? "bg-primary text-white font-bold shadow-xs"
                          : "bg-white/[0.05] hover:bg-white/10 text-zinc-300"
                      )}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span>{l.flag}</span>
                        <span className="truncate">{l.nativeLabel}</span>
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Currency Selector */}
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-3">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                  <Coins className="w-3.5 h-3.5 text-zinc-400" />
                  Currency
                </span>
                <span className="text-xs text-orange-400 font-bold">
                  {currencySymbol} ({currentCurrency.name})
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {currencies.map((c) => {
                  const isSelected = currency === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setCurrency(c.code)}
                      className={cn(
                        "flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer",
                        isSelected
                          ? "bg-primary text-white font-bold shadow-xs"
                          : "bg-white/[0.05] hover:bg-white/10 text-zinc-300"
                      )}
                    >
                      <span className="font-semibold">{c.symbol} {c.code}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Full Logout Button at Bottom */}
          {clientUser && (
            <button
              type="button"
              onClick={() => {
                setIsMoreOpen(false);
                logout();
              }}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 font-bold text-sm transition-all active:scale-98 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('logout', 'Logout')}</span>
            </button>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
