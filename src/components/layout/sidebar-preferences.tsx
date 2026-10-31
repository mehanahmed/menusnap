'use client';

import React from 'react';
import { Globe, Coins, Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePreferences, type LanguageCode, type CurrencyCode } from '@/context/PreferencesContext';
import { cn } from '@/lib/utils';

export function SidebarPreferences() {
  const {
    language,
    setLanguage,
    currentLanguage,
    languages,
    currency,
    setCurrency,
    currentCurrency,
    currencies,
    currencySymbol,
    t,
  } = usePreferences();

  return (
    <div className="px-2 py-2 space-y-1.5 border-t border-sidebar-border/60">
      {/* 1. Language Selector (Expanded Mode) */}
      <div className="group-data-[collapsible=icon]:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl",
                "bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/[0.12]",
                "text-xs text-slate-300 font-medium transition-all duration-150 cursor-pointer text-left"
              )}
              aria-label="Select Language"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-md bg-white/[0.06] flex items-center justify-center text-slate-400 shrink-0">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider leading-none">
                    {t('language', 'Language')}
                  </span>
                  <span className="text-xs font-semibold text-white mt-0.5 truncate flex items-center gap-1.5">
                    <span>{currentLanguage.flag}</span>
                    <span>{currentLanguage.nativeLabel}</span>
                  </span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-auto" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="top"
            sideOffset={6}
            className="w-56 bg-[#18181b] border-white/10 text-slate-200 shadow-xl backdrop-blur-md z-50 p-1.5"
          >
            <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
              {t('language', 'Select Language')}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            {languages.map((lang) => {
              const isSelected = language === lang.code;
              return (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-2 text-xs rounded-lg cursor-pointer transition-colors",
                    isSelected
                      ? "bg-primary/15 text-primary font-bold"
                      : "hover:bg-white/5 text-slate-300"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{lang.flag}</span>
                    <span className="font-medium">{lang.nativeLabel}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 2. Currency Selector (Expanded Mode) */}
      <div className="group-data-[collapsible=icon]:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl",
                "bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/[0.12]",
                "text-xs text-slate-300 font-medium transition-all duration-150 cursor-pointer text-left"
              )}
              aria-label="Select Currency"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-md bg-white/[0.06] flex items-center justify-center text-slate-400 shrink-0 font-bold text-xs">
                  {currencySymbol}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider leading-none">
                    {t('currency', 'Currency')}
                  </span>
                  <span className="text-xs font-semibold text-white mt-0.5 truncate flex items-center gap-1.5">
                    <span className="font-bold text-primary">{currencySymbol}</span>
                    <span>{currentCurrency.label}</span>
                  </span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-auto" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="top"
            sideOffset={6}
            className="w-56 bg-[#18181b] border-white/10 text-slate-200 shadow-xl backdrop-blur-md z-50 p-1.5"
          >
            <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
              {t('currency', 'Select Currency')}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            {currencies.map((curr) => {
              const isSelected = currency === curr.code;
              return (
                <DropdownMenuItem
                  key={curr.code}
                  onClick={() => setCurrency(curr.code)}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-2 text-xs rounded-lg cursor-pointer transition-colors",
                    isSelected
                      ? "bg-primary/15 text-primary font-bold"
                      : "hover:bg-white/5 text-slate-300"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                      {curr.symbol}
                    </span>
                    <span className="font-medium">{curr.label}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Collapsed State: Icon-only buttons with side dropdowns */}
      <div className="hidden group-data-[collapsible=icon]:flex flex-col items-center gap-2 py-1">
        {/* Language Icon */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={`${t('language', 'Language')}: ${currentLanguage.nativeLabel}`}
              className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-slate-300 flex items-center justify-center text-xs font-bold transition-all cursor-pointer relative"
            >
              <span>{currentLanguage.flag}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="end"
            sideOffset={8}
            className="w-52 bg-[#18181b] border-white/10 text-slate-200 shadow-xl backdrop-blur-md z-50 p-1.5"
          >
            <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
              {t('language', 'Language')}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            {languages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={cn(
                  "flex items-center justify-between px-2 py-1.5 text-xs rounded-md cursor-pointer",
                  language === lang.code ? "bg-primary/15 text-primary font-bold" : "hover:bg-white/5 text-slate-300"
                )}
              >
                <div className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <span>{lang.nativeLabel}</span>
                </div>
                {language === lang.code && <Check className="w-3.5 h-3.5 text-primary ml-2" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Currency Icon */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={`${t('currency', 'Currency')}: ${currentCurrency.label}`}
              className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-primary flex items-center justify-center text-xs font-extrabold transition-all cursor-pointer"
            >
              {currencySymbol}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="end"
            sideOffset={8}
            className="w-52 bg-[#18181b] border-white/10 text-slate-200 shadow-xl backdrop-blur-md z-50 p-1.5"
          >
            <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
              {t('currency', 'Currency')}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            {currencies.map((curr) => (
              <DropdownMenuItem
                key={curr.code}
                onClick={() => setCurrency(curr.code)}
                className={cn(
                  "flex items-center justify-between px-2 py-1.5 text-xs rounded-md cursor-pointer",
                  currency === curr.code ? "bg-primary/15 text-primary font-bold" : "hover:bg-white/5 text-slate-300"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary w-4 text-center">{curr.symbol}</span>
                  <span>{curr.label}</span>
                </div>
                {currency === curr.code && <Check className="w-3.5 h-3.5 text-primary ml-2" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
