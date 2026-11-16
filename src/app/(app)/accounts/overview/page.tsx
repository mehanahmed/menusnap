'use client';

import { AccountsMobileCards } from '@/components/accounts/AccountsTopNavbar';

import { useEffect, useState, useTransition, useCallback } from 'react';
import Link from 'next/link';
import { AccountsGate } from '@/components/accounts/AccountsGate';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePreferences } from '@/context/PreferencesContext';
import { useClientAuth } from '@/hooks/use-client-auth';
import { formatCurrency, formatAccountDate } from '@/lib/accounts/helpers';
import { getAccountsOverviewAction } from '@/app/actions/accounts';
import {
  BarChart3,
  Receipt,
  Truck,
  Users,
  Wallet,
  Calendar,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Printer,
  ChevronRight,
  Loader2,
  FileSpreadsheet,
  Layers,
  Sparkles,
  DollarSign,
  AlertCircle,
  ArrowDownLeft,
  Clock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const RechartsXAxis: any = XAxis;
const RechartsYAxis: any = YAxis;

const CHART_COLORS = [
  '#FF5A36', // Primary Orange
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#64748B', // Slate
];

export default function AccountsOverviewPage() {
  const { t, currencySymbol } = usePreferences();
  const { clientUser } = useClientAuth();

  // Date Range State (default to Last 30 Days)
  const [activePreset, setActivePreset] = useState<'today' | 'weekly' | 'last30' | 'thisYear' | 'all'>('last30');
  const [fromDate, setFromDate] = useState<string>(() => {
    const past30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return past30.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Overview Data
  const [overviewData, setOverviewData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const restaurantId = clientUser?.id || clientUser?.businessName || '';

  // Quick Preset Handlers
  const handlePresetSelect = (preset: 'today' | 'weekly' | 'last30' | 'thisYear' | 'all') => {
    setActivePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'today') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'weekly') {
      const past7 = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setFromDate(past7);
      setToDate(todayStr);
    } else if (preset === 'last30') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setFromDate(past30);
      setToDate(todayStr);
    } else if (preset === 'thisYear') {
      const firstJan = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      setFromDate(firstJan);
      setToDate(todayStr);
    } else if (preset === 'all') {
      setFromDate('');
      setToDate('');
    }
  };

  // Load Overview Data
  const loadOverview = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await getAccountsOverviewAction({
        restaurantId,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });

      if (res.success && res.data) {
        setOverviewData(res.data);
      } else {
        setErrorMsg(res.error || 'Failed to load accounts overview.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error fetching overview.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, fromDate, toDate]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const summary = overviewData?.summary || {
    totalExpenses: 0,
    staffCost: 0,
    vendorPaid: 0,
    totalDue: 0,
    vendorDue: 0,
    staffDue: 0,
  };

  const categoryBreakdown = overviewData?.categoryBreakdown || [];
  const trendData = overviewData?.trendData || [];
  const incomeTrendData = overviewData?.incomeTrendData || [];
  const recentTransactions = overviewData?.recentTransactions || [];
  const topVendorsDue = overviewData?.topVendorsDue || [];
  const salesVsExpenses = overviewData?.salesVsExpenses || null;
  const isParlour = (overviewData?.businessType || clientUser?.type) === 'parlour';

  // Timeline Chart Mode: defaults to 'income' as requested
  const [chartMode, setChartMode] = useState<'income' | 'outflow'>('income');

  return (
    <AccountsGate>
      <div className="flex flex-col min-h-screen bg-background pb-32 sm:pb-20 md:pb-12 space-y-3.5 sm:space-y-6 p-2.5 xs:p-3.5 sm:p-6 lg:p-8 xl:p-10 w-full max-w-full overflow-x-hidden min-w-0 print:p-0 print:m-0 print:w-full print:max-w-none print:min-h-0 print:h-auto print:space-y-4">
        {/* Global Print Stylesheet */}
        <style jsx global>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm 12mm 12mm 12mm;
            }
            body, html {
              background: #ffffff !important;
              color: #111827 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            nav, aside, header:not(.print-header), footer:not(.print-footer), [role="navigation"] {
              display: none !important;
            }
            .print-break-before-page {
              break-before: page !important;
              page-break-before: always !important;
            }
            .print-break-inside-avoid,
            .rounded-2xl {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
          }
        `}</style>
        {/* Header Section */}
        <div className="flex flex-col gap-3 pb-4 border-b border-border/40 w-full min-w-0 max-w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-orange-500/10 text-[#FF5A36]">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    {t('accounts', 'Accounts')}
                  </h1>
                  <Badge className="bg-gradient-to-r from-[#FF5A36] to-orange-500 text-white font-bold text-[10px] py-0.5 px-2.5 rounded-full border-none shadow-xs">
                    {t('financialHealth', 'Financial Health')}
                  </Badge>
        </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {clientUser?.businessName ? `${clientUser.businessName} • ` : ''}
                  {t('accountsSubtitle', 'Comprehensive financial intelligence, expense metrics, payables, and reports.')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 1. Date Range & Quick Preset Filter Bar — unified toolbar */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 p-1.5 sm:p-2 rounded-2xl bg-muted/30 border border-border/50 shadow-xs w-full min-w-0 max-w-full print:hidden">
          {/* Presets Row: smooth horizontal touch swipe on mobile, inline on desktop */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none [touch-action:pan-x] w-full sm:w-auto min-w-0 py-0.5">
            {(['today', 'weekly', 'last30', 'thisYear', 'all'] as const).map((preset) => {
              const labels: Record<string, string> = {
                today: t('today', 'Today'),
                weekly: t('weekly', 'Weekly'),
                last30: t('last30Days', 'Last 30 Days'),
                thisYear: t('thisYear', 'This Year'),
                all: t('allTime', 'All Time'),
              };
              return (
                <button
                  key={preset}
                  onClick={() => handlePresetSelect(preset)}
                  className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                    activePreset === preset
                      ? 'bg-[#FF5A36] text-white shadow-sm shadow-orange-500/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/80'
                  }`}
                >
                  {labels[preset]}
                </button>
              );
            })}
          </div>

          {/* Divider (desktop only) */}
          <div className="hidden sm:block w-px h-6 bg-border/60 shrink-0" />

          {/* Date range + actions: stacked cleanly on mobile, inline right on desktop */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto sm:flex-1 sm:justify-end min-w-0">
            {/* Integrated Date Range */}
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 h-8 rounded-xl bg-card border border-border/70 px-2 sm:px-2.5 shadow-2xs hover:border-[#FF5A36]/40 focus-within:border-[#FF5A36] focus-within:ring-2 focus-within:ring-[#FF5A36]/15 transition-all w-full sm:w-auto min-w-0 max-w-full">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setActivePreset('all'); }}
                className="bg-transparent text-[11px] sm:text-xs font-semibold text-foreground outline-none cursor-pointer flex-1 sm:w-28 text-center sm:text-left min-w-0"
              />
              <span className="text-muted-foreground/60 font-bold text-xs select-none px-0.5">→</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setActivePreset('all'); }}
                className="bg-transparent text-[11px] sm:text-xs font-semibold text-foreground outline-none cursor-pointer flex-1 sm:w-28 text-center sm:text-left min-w-0"
              />
            </div>

            {/* Action buttons: Print & Full Reports */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => window.print()}
                className="h-8 px-2.5 sm:px-3 rounded-xl border border-border/70 bg-card hover:bg-muted text-xs font-semibold text-foreground flex items-center justify-center gap-1.5 transition-all shadow-2xs flex-1 sm:flex-initial whitespace-nowrap"
                title={t('printPdf', 'Print / PDF')}
              >
                <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{t('printPdf', 'Print / PDF')}</span>
              </button>

              <Link
                href="/accounts/reports"
                className="hidden sm:inline-flex h-8 px-3 sm:px-3.5 rounded-xl bg-gradient-to-r from-[#FF5A36] to-orange-500 hover:from-[#e04b2a] hover:to-orange-600 text-white text-xs font-semibold items-center justify-center gap-1.5 transition-all shadow-sm shadow-orange-500/20 sm:flex-initial whitespace-nowrap"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{t('reports', 'Full Reports')}</span>
                <ArrowUpRight className="w-3 h-3 opacity-80" />
              </Link>
            </div>
          </div>
        </div>

        {/* 2. Top Stat Summary Cards */}
        {isParlour ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 md:gap-5 w-full min-w-0 max-w-full">
            {/* Parlour Card 1: Total Income */}
            <Card className="rounded-2xl border border-border/60 bg-card shadow-xs transition-all hover:shadow-md hover:border-emerald-500/30 overflow-hidden group min-w-0">
              <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-400" />
              <div className="p-2.5 xs:p-3 sm:p-4 md:p-5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between gap-1 mb-1 sm:mb-3">
                  <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                    {t('totalIncome', 'Total Income')}
                  </span>
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <ArrowDownLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="text-base xs:text-lg sm:text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight truncate">
                  {formatCurrency(summary.totalIncome, currencySymbol)}
                </div>
                <p className="text-[9px] xs:text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  {t('revenueAndAdvances', 'Revenues & advances')}
                </p>
              </div>
            </Card>

            {/* Parlour Card 2: Total Expenses */}
            <Card className="rounded-2xl border border-border/60 bg-card shadow-xs transition-all hover:shadow-md hover:border-[#FF5A36]/30 overflow-hidden group min-w-0">
              <div className="h-1 w-full bg-gradient-to-r from-[#FF5A36] to-orange-400" />
              <div className="p-2.5 xs:p-3 sm:p-4 md:p-5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between gap-1 mb-1 sm:mb-3">
                  <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                    {t('totalExpenses', 'Total Expenses')}
                  </span>
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-orange-500/10 text-[#FF5A36] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="text-base xs:text-lg sm:text-2xl md:text-3xl font-black text-foreground tracking-tight truncate">
                  {formatCurrency(summary.totalExpenses, currencySymbol)}
                </div>
                <p className="text-[9px] xs:text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  {t('operationalExpenditures', 'Operational costs')}
                </p>
              </div>
            </Card>

            {/* Parlour Card 3: Net Profit / Loss */}
            <Card className="rounded-2xl border border-border/60 bg-card shadow-xs transition-all hover:shadow-md hover:border-blue-500/30 overflow-hidden group min-w-0">
              <div
                className={`h-1 w-full bg-gradient-to-r ${
                  (summary.netProfit ?? 0) >= 0 ? 'from-emerald-500 to-teal-400' : 'from-rose-500 to-pink-400'
                }`}
              />
              <div className="p-2.5 xs:p-3 sm:p-4 md:p-5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between gap-1 mb-1 sm:mb-3">
                  <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                    {t('netProfit', 'Net Profit')}
                  </span>
                  <div
                    className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${
                      (summary.netProfit ?? 0) >= 0
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-rose-500/10 text-rose-600'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div
                  className={`text-base xs:text-lg sm:text-2xl md:text-3xl font-black tracking-tight truncate ${
                    (summary.netProfit ?? 0) >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatCurrency(summary.netProfit ?? 0, currencySymbol)}
                </div>
                <p className="text-[9px] xs:text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  {summary.profitMargin ?? 0}% {t('netMargin', 'Margin')}
                </p>
              </div>
            </Card>

            {/* Parlour Card 4: Customer Due */}
            <Card className="rounded-2xl border border-border/60 bg-card shadow-xs transition-all hover:shadow-md hover:border-amber-500/30 overflow-hidden group min-w-0">
              <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-amber-400" />
              <div className="p-2.5 xs:p-3 sm:p-4 md:p-5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between gap-1 mb-1 sm:mb-3">
                  <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                    {t('customerDue', 'Customer Due')}
                  </span>
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="text-base xs:text-lg sm:text-2xl md:text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight truncate">
                  {formatCurrency(summary.customerDue, currencySymbol)}
                </div>
                <p className="text-[9px] xs:text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  {t('clientReceivables', 'Unsettled receivables')}
                </p>
              </div>
            </Card>

            {/* Parlour Card 5: Commission (Earned) */}
            <Card className="rounded-2xl border border-border/60 bg-card shadow-xs transition-all hover:shadow-md hover:border-purple-500/30 overflow-hidden group min-w-0">
              <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-indigo-400" />
              <div className="p-2.5 xs:p-3 sm:p-4 md:p-5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between gap-1 mb-1 sm:mb-3">
                  <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                    {t('commissionEarned', 'Commission (Earned)')}
                  </span>
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="text-base xs:text-lg sm:text-2xl md:text-3xl font-black text-purple-600 dark:text-purple-400 tracking-tight truncate">
                  {formatCurrency(summary.earnedCommission, currencySymbol)}
                </div>
                <p className="text-[9px] xs:text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  {t('currentMonthCommissions', 'Staff earnings this month')}
                </p>
              </div>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-5 w-full min-w-0 max-w-full">
            {/* Restaurant Card 1: Total Expenses */}
            <Card className="rounded-2xl border border-border/60 bg-card shadow-xs transition-all hover:shadow-md hover:border-[#FF5A36]/30 overflow-hidden group min-w-0">
              <div className="h-1 w-full bg-gradient-to-r from-[#FF5A36] to-orange-400" />
              <div className="p-2.5 xs:p-3 sm:p-4 md:p-5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between gap-1 mb-1 sm:mb-3">
                  <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                    {activePreset === 'today'
                      ? t('todayExpenses', "Today's Outflow")
                      : activePreset === 'weekly'
                      ? t('weeklyExpenses', 'Weekly Expenses')
                      : t('thisMonthExpenses', 'Total Outflow')}
                  </span>
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-orange-500/10 text-[#FF5A36] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="text-base xs:text-lg sm:text-2xl md:text-3xl font-black text-foreground tracking-tight truncate">
                  {formatCurrency(summary.totalExpenses, currencySymbol)}
                </div>
                <p className="text-[9px] xs:text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  {t('operationalExpenditures', 'Operational expenditures')}
                </p>
              </div>
            </Card>

            {/* Restaurant Card 2: Staff Cost */}
            <Card className="rounded-2xl border border-border/60 bg-card shadow-xs transition-all hover:shadow-md hover:border-blue-500/30 overflow-hidden group min-w-0">
              <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-blue-400" />
              <div className="p-2.5 xs:p-3 sm:p-4 md:p-5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between gap-1 mb-1 sm:mb-3">
                  <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                    {t('staffCost', 'Staff Cost')}
                  </span>
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="text-base xs:text-lg sm:text-2xl md:text-3xl font-black text-foreground tracking-tight truncate">
                  {formatCurrency(summary.staffCost, currencySymbol)}
                </div>
                <p className="text-[9px] xs:text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  {t('salariesAndAdvances', 'Salaries & advances')}
                </p>
              </div>
            </Card>

            {/* Restaurant Card 3: Vendor Payments */}
            <Card className="rounded-2xl border border-border/60 bg-card shadow-xs transition-all hover:shadow-md hover:border-emerald-500/30 overflow-hidden group min-w-0">
              <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-400" />
              <div className="p-2.5 xs:p-3 sm:p-4 md:p-5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between gap-1 mb-1 sm:mb-3">
                  <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                    {t('vendorPaid', 'Vendor Paid')}
                  </span>
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="text-base xs:text-lg sm:text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight truncate">
                  {formatCurrency(summary.vendorPaid, currencySymbol)}
                </div>
                <p className="text-[9px] xs:text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  {t('procurementPaid', 'Procurement paid')}
                </p>
              </div>
            </Card>

            {/* Restaurant Card 4: Total Due (Payables) */}
            <Card className="rounded-2xl border border-border/60 bg-card shadow-xs transition-all hover:shadow-md hover:border-rose-500/30 overflow-hidden group min-w-0">
              <div className="h-1 w-full bg-gradient-to-r from-rose-500 to-pink-400" />
              <div className="p-2.5 xs:p-3 sm:p-4 md:p-5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between gap-1 mb-1 sm:mb-3">
                  <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                    {t('totalDue', 'Total Due')}
                  </span>
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="text-base xs:text-lg sm:text-2xl md:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight truncate">
                  {formatCurrency(summary.totalDue, currencySymbol)}
                </div>
                <p className="text-[9px] xs:text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  {t('venDue', 'Ven')}: {formatCurrency(summary.vendorDue)} • {t('stfDue', 'Stf')}: {formatCurrency(summary.staffDue)}
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* 3. Optional Feature: Sales vs Expenses Comparison (if orders available) */}
        {salesVsExpenses && (
          <Card className="rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/20 p-4 sm:p-6 shadow-xs w-full min-w-0 max-w-full overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-extrabold text-foreground">
                    {t('salesVsExpenses', 'Sales vs. Expense Performance')}
                  </h3>
                  <Badge
                    className={`text-[10px] py-0.5 px-2 rounded-full font-bold ${
                      salesVsExpenses.netProfit >= 0
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                    }`}
                  >
                    {salesVsExpenses.netProfit >= 0 ? '+' : ''}
                    {salesVsExpenses.profitMargin}% {t('netMargin', 'Net Margin')}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t(
                    'syncWithOrders',
                    isParlour ? 'Synchronized with MenuSnap Service History' : 'Synchronized with MenuSnap Order History'
                  )}{' '}
                  ({salesVsExpenses.orderCount} {isParlour ? 'bookings' : 'orders'} completed).
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-6 w-full md:w-auto text-left md:text-right">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">{t('totalRevenue', 'Total Revenue')}</span>
                  <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatCurrency(salesVsExpenses.totalSales, currencySymbol)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">{t('totalOutflow', 'Total Outflow')}</span>
                  <p className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">
                    {formatCurrency(summary.totalExpenses, currencySymbol)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">{t('netMargin', 'Net Margin')}</span>
                  <p
                    className={`text-base sm:text-lg font-black mt-0.5 ${
                      salesVsExpenses.netProfit >= 0 ? 'text-foreground' : 'text-rose-600'
                    }`}
                  >
                    {formatCurrency(salesVsExpenses.netProfit, currencySymbol)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 4. Interactive Charts Section: Category Donut + Outflow Trend Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full min-w-0 max-w-full">
          {/* Chart 1: Category Breakdown (Donut Chart) */}
          <Card className="rounded-2xl border border-border/60 bg-card shadow-xs flex flex-col overflow-hidden min-w-0 max-w-full">
            <div className="flex items-center justify-between gap-2 p-3.5 sm:p-5 border-b border-border/30 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-foreground">{t('expenseBreakdownByCategory', 'Expense Breakdown by Category')}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('expenseBreakdownSubtitle', 'Proportional cost distribution for selected period')}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-muted/40 shrink-0">
                <Layers className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <div className="p-3.5 sm:p-5 flex-1 min-w-0 max-w-full">
              {isLoading ? (
                <div className="h-60 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#FF5A36]" />
                </div>
              ) : categoryBreakdown.length === 0 ? (
                <div className="h-60 flex flex-col items-center justify-center text-center gap-3 p-4">
                  <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center border border-border/40">
                    <Receipt className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">{t('noExpensesYet', 'No expenses yet')}</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">{t('noExpensesForDateRange', 'No expenses recorded for this date range.')}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="w-full sm:w-1/2 h-56 relative flex items-center justify-center min-w-0 max-w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={3}
                        >
                          {categoryBreakdown.map((_: any, index: number) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: any) => [formatCurrency(value, currencySymbol), 'Amount']}
                          contentStyle={{
                            backgroundColor: 'rgba(23, 23, 23, 0.95)',
                            borderColor: '#404040',
                            borderRadius: '12px',
                            color: '#ffffff',
                            fontSize: '12px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">{t('total', 'Total')}</span>
                      <span className="text-sm font-black text-foreground">
                        {formatCurrency(summary.totalExpenses, currencySymbol)}
                      </span>
                    </div>
                  </div>

                  {/* Legend Table */}
                  <div className="w-full sm:w-1/2 max-h-56 overflow-y-auto space-y-2 pr-1 min-w-0">
                    {categoryBreakdown.map((item: any, idx: number) => {
                      const pct = summary.totalExpenses > 0
                        ? ((item.value / summary.totalExpenses) * 100).toFixed(1)
                        : '0';
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-border/20 last:border-0 gap-2">
                          <div className="flex items-center gap-2 truncate min-w-0 flex-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                            />
                            <span className="text-foreground truncate font-medium">{item.name}</span>
                          </div>
                          <div className="text-right flex items-center gap-1.5 shrink-0">
                            <span className="font-bold text-foreground">{formatCurrency(item.value, currencySymbol)}</span>
                            <span className="text-[10px] text-muted-foreground font-medium bg-muted/50 px-1.5 py-0.5 rounded-md">
                              {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Chart 2: Revenue / Income Timeline (Default) with Outflow Toggle */}
          <Card className="rounded-2xl border border-border/60 bg-card shadow-xs flex flex-col overflow-hidden min-w-0 max-w-full print:break-before-page print-break-before-page print:break-inside-avoid print-break-inside-avoid">
            <div className="flex items-center justify-between gap-2 p-3.5 sm:p-5 border-b border-border/30 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {chartMode === 'income'
                    ? t('incomeTimeline', 'Revenue / Income Timeline')
                    : t('cashOutflowTimeline', 'Cash Outflow Timeline')}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {chartMode === 'income'
                    ? t('incomeTimelineSubtitle', 'Daily income and revenue volume for selected period')
                    : t('cashOutflowSubtitle', 'Daily expenditure volume for selected period')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/40 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setChartMode('income')}
                    className={`px-2.5 py-1 font-bold rounded-lg transition-all ${
                      chartMode === 'income'
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('income', 'Income')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMode('outflow')}
                    className={`px-2.5 py-1 font-bold rounded-lg transition-all ${
                      chartMode === 'outflow'
                        ? 'bg-[#FF5A36] text-white shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('outflow', 'Outflow')}
                  </button>
                </div>
                <div className={`p-2 rounded-xl shrink-0 ${chartMode === 'income' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-orange-500/10 text-[#FF5A36]'}`}>
                  {chartMode === 'income' ? <DollarSign className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                </div>
              </div>
            </div>

            <div className="p-3.5 sm:p-5 flex-1 min-w-0 max-w-full">
              {isLoading ? (
                <div className="h-60 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#FF5A36]" />
                </div>
              ) : (chartMode === 'income' ? incomeTrendData : trendData).length === 0 ? (
                <div className="h-60 flex flex-col items-center justify-center text-center gap-3 p-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                    chartMode === 'income'
                      ? 'bg-emerald-500/10 text-emerald-600/60 border-emerald-500/20'
                      : 'bg-muted/50 text-muted-foreground/40 border-border/40'
                  }`}>
                    {chartMode === 'income' ? <Receipt className="w-7 h-7" /> : <Calendar className="w-7 h-7" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">
                      {chartMode === 'income' ? t('noIncomeYet', 'No income records yet') : t('noTransactions', 'No transactions')}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {chartMode === 'income'
                        ? t('noDailyIncomeInRange', 'No daily income transactions logged in this range.')
                        : t('noDailyTransactionsInRange', 'No daily transactions logged in this range.')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-60 w-full pt-2 min-w-0 max-w-full overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartMode === 'income' ? incomeTrendData : trendData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <RechartsXAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} />
                      <RechartsYAxis
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val: any) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                      />
                      <RechartsTooltip
                        formatter={(val: any) => [
                          formatCurrency(val, currencySymbol),
                          chartMode === 'income' ? 'Income' : 'Outflow',
                        ]}
                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                        contentStyle={{
                          backgroundColor: 'rgba(23, 23, 23, 0.95)',
                          borderColor: '#404040',
                          borderRadius: '12px',
                          color: '#ffffff',
                          fontSize: '12px',
                        }}
                      />
                      <Bar
                        dataKey="amount"
                        fill={chartMode === 'income' ? '#10B981' : '#FF5A36'}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* 5. Insight Feeds: Recent 10 Transactions & Top 5 Vendors Due */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full min-w-0 max-w-full">
          {/* Feed 1: Recent 10 Transactions */}
          <Card className="rounded-2xl border border-border/60 bg-card shadow-xs overflow-hidden min-w-0 max-w-full print:break-inside-avoid print-break-inside-avoid">
            <div className="flex items-center justify-between gap-2 p-3.5 sm:p-5 border-b border-border/30 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-foreground">{t('recentAccountTransactions', 'Recent Account Transactions')}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t('recentTransactionsSubtitle', 'Latest 10 logged entries across modules')}</p>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs h-7 px-2 text-[#FF5A36] hover:text-[#e04b2a] hover:bg-orange-500/10 font-semibold shrink-0">
                <Link href="/accounts/expenses" className="flex items-center gap-1">
                  <span>{t('viewAll', 'View All')}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>

            <div className="divide-y divide-border/30">
              {recentTransactions.length === 0 ? (
                <div className="py-14 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-3 border border-border/30">
                    <Receipt className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">{t('noTransactionsRecordedYet', 'No account transactions recorded yet.')}</p>
                </div>
              ) : (
                recentTransactions.map((tx: any) => (
                  <div key={tx.id} className="px-3.5 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-2.5 sm:gap-3 truncate min-w-0 flex-1">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-orange-500/10 text-[#FF5A36] flex items-center justify-center shrink-0 group-hover:bg-orange-500/20 transition-colors">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div className="truncate min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{tx.description || tx.category_name}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                          <span>{formatAccountDate(tx.date)}</span>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/40 inline-block" />
                          <span className="capitalize">{tx.payment_method_name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right whitespace-nowrap shrink-0">
                      <span className="text-xs font-bold text-foreground block">
                        {formatCurrency(tx.amount, currencySymbol)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{tx.category_name}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Feed 2: Top 5 Vendors with Outstanding Due */}
          <Card className="rounded-2xl border border-border/60 bg-card shadow-xs overflow-hidden min-w-0 max-w-full print:break-inside-avoid print-break-inside-avoid">
            <div className="flex items-center justify-between gap-2 p-3.5 sm:p-5 border-b border-border/30 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-foreground">{t('topOutstandingVendorDues', 'Top Outstanding Vendor Dues')}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t('topVendorsSubtitle', 'Highest payables requiring settlement')}</p>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 font-semibold shrink-0">
                <Link href="/accounts/vendors" className="flex items-center gap-1">
                  <span>{t('manageVendors', 'Manage Vendors')}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>

            <div className="divide-y divide-border/30">
              {topVendorsDue.length === 0 ? (
                <div className="py-14 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/5 flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
                    <Truck className="w-5 h-5 text-emerald-500/60" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">{t('allVendorAccountsSettled', 'All vendor accounts settled')}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">{t('zeroOutstandingDues', 'Zero outstanding dues.')}</p>
                </div>
              ) : (
                topVendorsDue.map((ven: any) => (
                  <div key={ven.id} className="px-3.5 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-2.5 sm:gap-3 truncate min-w-0 flex-1">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 group-hover:bg-rose-500/20 transition-colors">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div className="truncate min-w-0 flex-1">
                        <Link href="/accounts/vendors" className="text-xs font-semibold text-foreground hover:text-[#FF5A36] truncate block transition-colors">
                          {ven.name}
                        </Link>
                        <p className="text-[10px] text-muted-foreground">{ven.category || 'Vendor'}</p>
                      </div>
                    </div>

                    <div className="text-right whitespace-nowrap shrink-0">
                      <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 block">
                        {formatCurrency(ven.current_due, currencySymbol)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{t('payableDue', 'Payable Due')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </AccountsGate>
  );
}
