'use client';

import { AccountsMobileCards } from '@/components/accounts/AccountsTopNavbar';

import { useEffect, useState, useCallback } from 'react';
import { AccountsGate } from '@/components/accounts/AccountsGate';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { usePreferences } from '@/context/PreferencesContext';
import { useClientAuth } from '@/hooks/use-client-auth';
import { formatCurrency, formatAccountDate } from '@/lib/accounts/helpers';
import { getAccountsReportAction, exportAccountsReportCsvAction } from '@/app/actions/accounts';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Receipt,
  Truck,
  Users,
  CreditCard,
  Loader2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Clock,
  Sparkles,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  Scissors,
} from 'lucide-react';

const REPORT_METADATA: Record<string, { title: string; subtitle: string; code: string; subject: string }> = {
  profit_loss: {
    title: 'STATEMENT OF PROFIT & LOSS',
    subtitle: 'Comprehensive financial performance, operating cost, and net margin audit statement',
    code: 'FS-PL',
    subject: 'Profit & Loss Statement (Cash-Basis)',
  },
  income: {
    title: 'SERVICE REVENUE & INCOME STATEMENT',
    subtitle: 'Audited log of service billings, transaction volumes, and revenue share',
    code: 'FS-INC',
    subject: 'Service Income & Customer Billings',
  },
  commissions: {
    title: 'STAFF COMMISSION & INCENTIVE STATEMENT',
    subtitle: 'Staff service compensation log, commission distributions, and tips breakdown',
    code: 'HR-COMM',
    subject: 'Staff Service Commissions Audit',
  },
  customer_dues: {
    title: 'ACCOUNTS RECEIVABLE (CUSTOMER DUE) STATEMENT',
    subtitle: 'Outstanding customer receivables, advance deposits, and settlement status',
    code: 'AR-DUES',
    subject: 'Accounts Receivable Ledger',
  },
  expenses: {
    title: 'STATEMENT OF EXPENDITURE BY CATEGORY',
    subtitle: 'Itemized business operational expenditures, category allocations, and outflow share',
    code: 'EXP-CAT',
    subject: 'Operational Expense Audit',
  },
  vendors: {
    title: 'ACCOUNTS PAYABLE & VENDOR LEDGER',
    subtitle: 'Supplier purchasing records, cumulative disbursements, and outstanding payables',
    code: 'AP-VEN',
    subject: 'Accounts Payable Summary',
  },
  staff: {
    title: 'STAFF PAYROLL & DISBURSEMENT AUDIT',
    subtitle: 'Monthly salary records, advance deductions, disbursed compensations, and company costs',
    code: 'PAY-AUDIT',
    subject: 'Monthly Payroll Audit',
  },
  payment_methods: {
    title: 'PAYMENT GATEWAY & CHANNEL SUMMARY',
    subtitle: 'Financial disbursement and settlement volume across recorded payment channels',
    code: 'PM-MTHD',
    subject: 'Payment Channel Audit',
  },
};

export default function AccountsReportsPage() {
  const { t, currencySymbol } = usePreferences();
  const { clientUser } = useClientAuth();
  const isParlour = clientUser?.type === 'parlour';

  const [printDateStr, setPrintDateStr] = useState('');
  useEffect(() => {
    setPrintDateStr(
      new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  }, []);

  // Active Report Tab: expenses, vendors, staff, payment_methods, income, commissions, customer_dues, profit_loss
  const [activeReportTab, setActiveReportTab] = useState<
    'expenses' | 'vendors' | 'staff' | 'payment_methods' | 'income' | 'commissions' | 'customer_dues' | 'profit_loss'
  >(() => (isParlour ? 'profit_loss' : 'expenses'));

  // Date Range Filters (default to Today)
  const [activePreset, setActivePreset] = useState<'today' | 'weekly' | 'last30' | 'thisYear' | 'all'>('today');
  const [fromDate, setFromDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Report Data State
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportTotalSum, setReportTotalSum] = useState<number>(0);
  const [reportTotalNetSum, setReportTotalNetSum] = useState<number>(0);
  const [reportSummary, setReportSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const restaurantId = clientUser?.id || clientUser?.businessName || '';

  const currentMeta = REPORT_METADATA[activeReportTab] || {
    title: 'FINANCIAL ACCOUNTING STATEMENT',
    subtitle: 'Official financial records and audit statement',
    code: 'ACC-AUDIT',
    subject: 'Accounting Statement',
  };

  // Preset Handlers
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

  // Load Report Data
  const loadReport = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res: any = await getAccountsReportAction({
        restaurantId,
        reportType: activeReportTab,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });

      if (res.success && res.data) {
        setReportData(res.data);
        setReportTotalSum(Number(res.totalSum || (res.summary as any)?.totalIncome || (res.summary as any)?.totalCommission || 0));
        setReportTotalNetSum(Number(res.totalNetSum || (res.summary as any)?.totalDue || 0));
        setReportSummary(res.summary || null);
      } else {
        setErrorMsg(res.error || 'Failed to load report data.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error generating report.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, activeReportTab, fromDate, toDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Export CSV
  const handleExportCsv = async () => {
    if (!restaurantId) return;
    setIsExporting(true);
    try {
      const res = await exportAccountsReportCsvAction({
        restaurantId,
        reportType: activeReportTab,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });

      if (res.success && res.csv) {
        const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', res.filename || `report_${activeReportTab}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert(res.error || 'Failed to export CSV.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error exporting report.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AccountsGate>
      <div className="flex flex-col min-h-screen bg-background pb-20 md:pb-12 space-y-4 sm:space-y-6 p-3 sm:p-6 lg:p-8 xl:p-10 w-full max-w-full overflow-x-hidden print:p-0 print:m-0 print:w-full print:max-w-none print:min-h-0 print:h-auto print:space-y-0 print:pb-0 print:bg-white print:overflow-visible print:block">
        {/* Global Print Media Stylesheet */}
        <style jsx global>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm 12mm 12mm 12mm;
            }
            *, *::before, *::after {
              box-sizing: border-box !important;
            }
            html, body {
              background: #ffffff !important;
              color: #111827 !important;
              font-size: 9.5pt !important;
              width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            /* Hide all navigation, sidebars, headers, and floating widgets */
            nav,
            aside,
            header:not(.print-header),
            footer:not(.print-footer),
            [role="navigation"],
            [data-sidebar="sidebar"],
            [data-sidebar="rail"],
            [data-sidebar="trigger"],
            .group\/sidebar-wrapper > div:first-child,
            .group.peer,
            [data-state][data-side] {
              display: none !important;
              width: 0 !important;
              min-width: 0 !important;
              max-width: 0 !important;
              height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              visibility: hidden !important;
            }
            /* Flatten ancestor layout containers to 100% width block */
            .group\/sidebar-wrapper,
            [data-sidebar="inset"],
            main,
            [data-radix-scroll-area-viewport],
            [data-radix-scroll-area-viewport] > div {
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              min-width: 100% !important;
              height: auto !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              overflow: visible !important;
              background: #ffffff !important;
            }
            [data-radix-scroll-area-viewport] {
              margin-right: 0 !important;
              margin-bottom: 0 !important;
              overflow: visible !important;
            }
            [data-radix-scroll-area-scrollbar],
            [data-radix-scroll-area-thumb],
            [data-radix-scroll-area-corner] {
              display: none !important;
              visibility: hidden !important;
              width: 0 !important;
              height: 0 !important;
              border: none !important;
            }
            .print-table {
              width: 100% !important;
              max-width: 100% !important;
              border-collapse: collapse !important;
              page-break-inside: auto !important;
            }
            .print-table th {
              background-color: #f3f4f6 !important;
              color: #111827 !important;
              border-top: 1.5pt solid #111827 !important;
              border-bottom: 1.5pt solid #111827 !important;
              padding: 6.5pt 10pt !important;
              font-size: 8.5pt !important;
              font-weight: 800 !important;
              text-transform: uppercase !important;
              letter-spacing: 0.05em !important;
            }
            .print-table td {
              border-bottom: 0.5pt solid #e5e7eb !important;
              padding: 6.5pt 10pt !important;
              font-size: 9pt !important;
              color: #1f2937 !important;
            }
            .print-table tbody tr:nth-child(even) {
              background-color: #f9fafb !important;
            }
            .print-table tfoot tr {
              border-top: 1.5pt solid #111827 !important;
              border-bottom: 2.5pt double #111827 !important;
              background-color: #f3f4f6 !important;
              font-weight: 800 !important;
            }
            .print-table tfoot td {
              padding: 7pt 10pt !important;
              font-size: 9.5pt !important;
              color: #111827 !important;
            }
            .print-footer {
              margin-top: 55pt !important;
            }
            .print-avoid-break {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}</style>

        {/* ============================================================== */}
        {/*               OFFICIAL INSTITUTIONAL PRINT HEADER               */}
        {/* ============================================================== */}
        <div className="hidden print:block w-full mb-3 pb-2.5 border-b-2 border-neutral-900 print-avoid-break">
          {/* Top Organization & Audit Banner */}
          <div className="flex items-start justify-between pb-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black text-neutral-900 tracking-tight uppercase">
                  {clientUser?.businessName || 'Business Statement'}
                </h1>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-neutral-800 text-neutral-900">
                  {isParlour ? 'Beauty & Salon' : 'Restaurant & Dining'}
                </span>
              </div>
              <p className="text-xs font-semibold text-neutral-600 mt-0.5 tracking-wide">
                Official Accounting Statement & Financial Audit Document
              </p>
              <div className="text-[11px] text-neutral-600 mt-1.5 flex items-center gap-4">
                {clientUser?.whatsappNumber && <span><strong>Phone:</strong> {clientUser.whatsappNumber}</span>}
                {clientUser?.email && <span><strong>Email:</strong> {clientUser.email}</span>}
                {clientUser?.district && <span><strong>Location:</strong> {clientUser.district}</span>}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-black tracking-wider text-neutral-900 border-2 border-neutral-900 px-3 py-1 rounded bg-neutral-100 uppercase inline-block">
                {currentMeta.code}
              </div>
              <div className="text-[11px] text-neutral-600 mt-2">
                Date Printed: <strong className="text-neutral-900">{printDateStr}</strong>
              </div>
              <div className="text-[11px] text-neutral-600">
                Currency: <strong className="text-neutral-900">BDT (৳)</strong>
              </div>
            </div>
          </div>

          {/* Statement Subject & Meta Bar */}
          <div className="mt-2 p-3 bg-neutral-50 border border-neutral-300 rounded-md flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider block">Statement Subject</span>
              <h2 className="text-sm font-black text-neutral-900 uppercase tracking-tight">
                {currentMeta.title}
              </h2>
              <p className="text-[11px] text-neutral-600 mt-0.5">
                {currentMeta.subtitle}
              </p>
            </div>
            <div className="text-right flex items-center gap-6">
              <div>
                <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider block">Accounting Period</span>
                <div className="text-xs font-black text-neutral-900">
                  {fromDate ? formatAccountDate(fromDate) : 'Start'} — {toDate ? formatAccountDate(toDate) : 'Today'}
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded inline-block mt-0.5">
                  Audit Status: Verified
                </span>
              </div>
              <div className="pl-6 border-l border-neutral-300">
                <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider block">
                  {activeReportTab === 'profit_loss' ? 'Net Profit' : 'Total in Statement'}
                </span>
                <div className="text-base font-black text-neutral-900">
                  {activeReportTab === 'profit_loss'
                    ? formatCurrency(reportSummary?.netProfit || 0, currencySymbol)
                    : formatCurrency(reportTotalSum, currencySymbol)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Web Only Header Section */}
        <div className="flex flex-col gap-3 pb-4 border-b border-border/40 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-orange-500/10 text-[#FF5A36]">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    {t('reports', 'Reports')}
                  </h1>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold py-0.5 px-2.5 rounded-full">
                    {t('auditReady', 'Audit Ready')}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('reportsSubtitle', 'Exportable accounting statements, category distributions, vendor balances, and payroll audits.')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 1. Date Range & Preset Filter Bar — unified toolbar */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 p-1.5 sm:p-2 rounded-2xl bg-muted/30 border border-border/50 shadow-xs w-full min-w-0 max-w-full print:hidden">
          {/* Preset Pills */}
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

          {/* Date range + actions: stacked on mobile, inline right on desktop */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto sm:flex-1 sm:justify-end min-w-0">
            {/* Integrated Date Range */}
            <div className="flex items-center justify-center gap-1.5 h-8 rounded-xl bg-card border border-border/70 px-2 sm:px-2.5 shadow-2xs hover:border-[#FF5A36]/40 focus-within:border-[#FF5A36] focus-within:ring-2 focus-within:ring-[#FF5A36]/15 transition-all w-full sm:w-auto min-w-0">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setActivePreset('all'); }}
                className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer flex-1 sm:w-28 text-center sm:text-left min-w-0"
              />
              <span className="text-muted-foreground/60 font-bold text-xs select-none px-0.5">→</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setActivePreset('all'); }}
                className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer flex-1 sm:w-28 text-center sm:text-left min-w-0"
              />
            </div>

            {/* Action buttons: Print & Export CSV */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => window.print()}
                className="h-8 px-3 rounded-xl border border-border/70 bg-card hover:bg-muted text-xs font-semibold text-foreground flex items-center justify-center gap-1.5 transition-all shadow-2xs flex-1 sm:flex-initial whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{t('printPdf', 'Print / PDF')}</span>
              </button>

              <button
                onClick={handleExportCsv}
                disabled={isExporting || isLoading}
                className="h-8 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-emerald-600/20 flex-1 sm:flex-initial whitespace-nowrap"
              >
                {isExporting
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Download className="w-3.5 h-3.5" />}
                <span>{t('exportCsv', 'Export CSV')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Report Type Tabs */}
        <Tabs
          value={activeReportTab}
          onValueChange={(val: any) => setActiveReportTab(val)}
          className="w-full space-y-4 print:space-y-0 print:m-0 print:p-0"
        >
          <TabsList className={`grid ${isParlour ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-8' : 'grid-cols-2 lg:grid-cols-4'} w-full rounded-2xl bg-muted/40 p-1 sm:p-1.5 border border-border/40 shadow-xs h-auto gap-1 print:hidden`}>
            {isParlour && (
              <>
                <TabsTrigger value="profit_loss" className="rounded-xl text-[11px] sm:text-xs font-semibold py-2 px-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs truncate">
                  <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-500 shrink-0" />
                  <span className="truncate">{t('profitLossReport', 'Profit & Loss')}</span>
                </TabsTrigger>
                <TabsTrigger value="income" className="rounded-xl text-[11px] sm:text-xs font-semibold py-2 px-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs truncate">
                  <ArrowDownLeft className="w-3.5 h-3.5 mr-1 text-[#FF5A36] shrink-0" />
                  <span className="truncate">{t('incomeReport', 'Income (Service)')}</span>
                </TabsTrigger>
                <TabsTrigger value="commissions" className="rounded-xl text-[11px] sm:text-xs font-semibold py-2 px-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs truncate">
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-500 shrink-0" />
                  <span className="truncate">{t('commissionReport', 'Commissions')}</span>
                </TabsTrigger>
                <TabsTrigger value="customer_dues" className="rounded-xl text-[11px] sm:text-xs font-semibold py-2 px-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs truncate">
                  <Clock className="w-3.5 h-3.5 mr-1 text-amber-500 shrink-0" />
                  <span className="truncate">{t('customerDuesReport', 'Customer Due')}</span>
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="expenses" className="rounded-xl text-[11px] sm:text-xs font-semibold py-2 px-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs truncate">
              <Receipt className="w-3.5 h-3.5 mr-1 text-[#FF5A36] shrink-0" />
              <span className="truncate">{t('expenseBreakdown', 'Expenses')}</span>
            </TabsTrigger>
            <TabsTrigger value="vendors" className="rounded-xl text-[11px] sm:text-xs font-semibold py-2 px-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs truncate">
              <Truck className="w-3.5 h-3.5 mr-1 text-blue-500 shrink-0" />
              <span className="truncate">{t('vendorLedgerAndDues', 'Vendors')}</span>
            </TabsTrigger>
            <TabsTrigger value="staff" className="rounded-xl text-[11px] sm:text-xs font-semibold py-2 px-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs truncate">
              <Users className="w-3.5 h-3.5 mr-1 text-emerald-500 shrink-0" />
              <span className="truncate">{t('staffSalaryReport', 'Staff')}</span>
            </TabsTrigger>
            <TabsTrigger value="payment_methods" className="rounded-xl text-[11px] sm:text-xs font-semibold py-2 px-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs truncate">
              <CreditCard className="w-3.5 h-3.5 mr-1 text-amber-500 shrink-0" />
              <span className="truncate">{t('paymentMethods', 'Methods')}</span>
            </TabsTrigger>
          </TabsList>

          {/* PARLOUR REPORT A: PROFIT & LOSS */}
          <TabsContent value="profit_loss">
            <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs print:border-0 print:shadow-none print:rounded-none print:bg-transparent print:p-0 print:m-0">
              <div className="p-4 sm:p-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 print:hidden">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">
                      {t('profitLossStatement', 'Profit & Loss Statement')}
                    </h3>
                    {reportSummary && (
                      <Badge
                        className={`text-[10px] py-0.5 px-2 rounded-full font-bold ${
                          reportSummary.netProfit >= 0
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                        }`}
                      >
                        {reportSummary.netProfit >= 0 ? '+' : ''}
                        {reportSummary.profitMargin}% Net Margin
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t(
                      'cashBasisNotice',
                      'Cash-basis accounting: Revenues and operating costs are recognized when cash is received or disbursed.'
                    )}
                  </p>
                </div>
                {reportSummary && (
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">{t('netProfit', 'Net Profit')}</span>
                    <p
                      className={`text-xl font-black ${
                        reportSummary.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatCurrency(reportSummary.netProfit, currencySymbol)}
                    </p>
                  </div>
                )}
              </div>

              {isLoading ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="w-7 h-7 animate-spin text-[#FF5A36]" />
                </div>
              ) : (
                <>
                  {/* Mobile Card View (sm:hidden) — No horizontal scrolling on small devices */}
                  <div className="sm:hidden print:hidden p-3 space-y-2.5">
                    {reportData.map((row, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-border/60 bg-muted/15 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div>
                          <div className="font-bold text-sm text-foreground">{row.item}</div>
                          <Badge
                            variant="outline"
                            className={`text-[9px] uppercase font-bold py-0.5 px-2 mt-1 ${
                              row.type === 'revenue'
                                ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
                                : row.type === 'expense'
                                ? 'border-orange-500/30 text-orange-600 bg-orange-500/10'
                                : row.type === 'profit'
                                ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
                                : 'border-rose-500/30 text-rose-600 bg-rose-500/10'
                            }`}
                          >
                            {row.type}
                          </Badge>
                        </div>
                        <div
                          className={`text-base font-black ${
                            row.type === 'revenue'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : row.type === 'expense'
                              ? 'text-foreground'
                              : row.amount >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {formatCurrency(row.amount, currencySymbol)}
                        </div>
                      </div>
                    ))}
                    <div className="p-3 rounded-xl border border-border/40 bg-muted/10 text-xs text-muted-foreground flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span>
                        Note: Staff gratuity tips belong directly to stylists and are strictly excluded from company Income and Expenses.
                      </span>
                    </div>
                  </div>

                  {/* Desktop & Print Table View */}
                  <div className="hidden sm:block print:block overflow-x-auto print:overflow-visible print:w-full print:max-w-none">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm print-table">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                          <th className="py-3 px-4">Financial Metric / Line Item</th>
                          <th className="py-3 px-4 text-center">Type</th>
                          <th className="py-3 px-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {reportData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-foreground">{row.item}</td>
                            <td className="py-3.5 px-4 text-center">
                              <Badge
                                variant="outline"
                                className={`text-[10px] uppercase font-bold py-0.5 px-2 ${
                                  row.type === 'revenue'
                                    ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
                                    : row.type === 'expense'
                                    ? 'border-orange-500/30 text-orange-600 bg-orange-500/10'
                                    : row.type === 'profit'
                                    ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
                                    : 'border-rose-500/30 text-rose-600 bg-rose-500/10'
                                }`}
                              >
                                {row.type}
                              </Badge>
                            </td>
                            <td
                              className={`py-3.5 px-4 text-right font-black ${
                                row.type === 'revenue'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : row.type === 'expense'
                                  ? 'text-foreground'
                                  : row.amount >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {formatCurrency(row.amount, currencySymbol)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="p-4 border-t border-border/40 bg-muted/10 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span>
                          Note: Staff gratuity tips belong directly to stylists and are strictly excluded from company Income and Expenses.
                        </span>
                      </p>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </TabsContent>

          {/* PARLOUR REPORT B: INCOME BY SERVICE */}
          <TabsContent value="income">
            <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs print:border-0 print:shadow-none print:rounded-none print:bg-transparent print:p-0 print:m-0">
              <div className="p-4 sm:p-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 print:hidden">
                <div>
                  <h3 className="text-base font-bold text-foreground">{t('incomeByServiceTitle', 'Income by Service')}</h3>
                  <p className="text-xs text-muted-foreground">{t('incomeByServiceSubtitle', 'Revenue breakdown categorized by salon treatments and services')}</p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">{t('totalIncome', 'Total Income')}</span>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(reportTotalSum, currencySymbol)}</p>
                </div>
              </div>

              {isLoading ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="w-7 h-7 animate-spin text-[#FF5A36]" />
                </div>
              ) : reportData.length === 0 ? (
                <div className="py-16 text-center text-xs text-muted-foreground">
                  No income transactions logged in this date range.
                </div>
              ) : (
                <>
                  {/* Mobile Card View (sm:hidden) — No horizontal scrolling on small devices */}
                  <div className="sm:hidden print:hidden p-3 space-y-2.5">
                    {reportData.map((row, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-border/60 bg-muted/15 space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-sm text-foreground flex items-center gap-2">
                            <Scissors className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>{row.service_name}</span>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md shrink-0">
                            {row.percentage}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/30">
                          <span className="text-muted-foreground">{row.transaction_count} transactions</span>
                          <span className="text-sm font-black text-foreground">{formatCurrency(row.total_amount, currencySymbol)}</span>
                        </div>
                      </div>
                    ))}
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 flex items-center justify-between shadow-2xs">
                      <span className="text-xs font-bold text-foreground">Total ({reportSummary?.transactionCount || 0} txn)</span>
                      <span className="text-base font-black text-emerald-600">{formatCurrency(reportTotalSum, currencySymbol)}</span>
                    </div>
                  </div>

                  {/* Desktop & Print Table View */}
                  <div className="hidden sm:block print:block overflow-x-auto print:overflow-visible print:w-full print:max-w-none">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm print-table">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                          <th className="py-3 px-4">Service</th>
                          <th className="py-3 px-4 text-center">Transactions</th>
                          <th className="py-3 px-4 text-right">Total Revenue</th>
                          <th className="py-3 px-4 text-right">Revenue Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {reportData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-foreground flex items-center gap-2">
                              <Scissors className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>{row.service_name}</span>
                            </td>
                            <td className="py-3.5 px-4 text-center text-muted-foreground font-semibold">{row.transaction_count}</td>
                            <td className="py-3.5 px-4 text-right font-black text-foreground">{formatCurrency(row.total_amount, currencySymbol)}</td>
                            <td className="py-3.5 px-4 text-right font-semibold text-muted-foreground">{row.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border/70 bg-muted/30 font-black text-xs sm:text-sm">
                          <td className="py-3 px-4">Total</td>
                          <td className="py-3 px-4 text-center">{reportSummary?.transactionCount || 0}</td>
                          <td className="py-3 px-4 text-right text-emerald-600">{formatCurrency(reportTotalSum, currencySymbol)}</td>
                          <td className="py-3 px-4 text-right">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </Card>
          </TabsContent>

          {/* PARLOUR REPORT C: STAFF COMMISSIONS */}
          <TabsContent value="commissions">
            <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs print:border-0 print:shadow-none print:rounded-none print:bg-transparent print:p-0 print:m-0">
              <div className="p-4 sm:p-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 print:hidden">
                <div>
                  <h3 className="text-base font-bold text-foreground">{t('staffCommissionsTitle', 'Staff Commissions Report')}</h3>
                  <p className="text-xs text-muted-foreground">{t('staffCommissionsSubtitle', 'Stylist commission earnings and treatment volumes')}</p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">{t('totalCommission', 'Total Commission')}</span>
                  <p className="text-xl font-black text-purple-600 dark:text-purple-400">{formatCurrency(reportTotalSum, currencySymbol)}</p>
                </div>
              </div>

              {isLoading ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="w-7 h-7 animate-spin text-[#FF5A36]" />
                </div>
              ) : reportData.length === 0 ? (
                <div className="py-16 text-center text-xs text-muted-foreground">
                  No commission entries recorded in this date range.
                </div>
              ) : (
                <>
                  {/* Mobile Card View (sm:hidden) — No horizontal scrolling on small devices */}
                  <div className="sm:hidden print:hidden p-3 space-y-2.5">
                    {reportData.map((row, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-border/60 bg-muted/15 space-y-2 shadow-2xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-foreground truncate">{row.staff_name}</h4>
                            <p className="text-[11px] text-muted-foreground">{row.service_name}</p>
                          </div>
                          <span className="text-xs font-black text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md shrink-0">
                            {formatCurrency(row.total_commission, currencySymbol)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/30">
                          <span className="text-muted-foreground">{row.service_count} services done</span>
                          <span className="text-xs font-semibold text-muted-foreground">
                            Value: {formatCurrency(row.total_service_value, currencySymbol)}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 flex items-center justify-between shadow-2xs">
                      <span className="text-xs font-bold text-foreground">Total ({reportSummary?.serviceCount || 0} services)</span>
                      <span className="text-base font-black text-purple-600">{formatCurrency(reportTotalSum, currencySymbol)}</span>
                    </div>
                  </div>

                  {/* Desktop & Print Table View */}
                  <div className="hidden sm:block print:block overflow-x-auto print:overflow-visible print:w-full print:max-w-none">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm print-table">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                          <th className="py-3 px-4">Staff Member</th>
                          <th className="py-3 px-4">Service</th>
                          <th className="py-3 px-4 text-center">Services Done</th>
                          <th className="py-3 px-4 text-right">Service Value</th>
                          <th className="py-3 px-4 text-right">Earned Commission</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {reportData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-foreground">{row.staff_name}</td>
                            <td className="py-3.5 px-4 text-muted-foreground">{row.service_name}</td>
                            <td className="py-3.5 px-4 text-center text-muted-foreground font-semibold">{row.service_count}</td>
                            <td className="py-3.5 px-4 text-right text-muted-foreground">{formatCurrency(row.total_service_value, currencySymbol)}</td>
                            <td className="py-3.5 px-4 text-right font-black text-purple-600 dark:text-purple-400">
                              {formatCurrency(row.total_commission, currencySymbol)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border/70 bg-muted/30 font-black text-xs sm:text-sm">
                          <td className="py-3 px-4" colSpan={2}>Total</td>
                          <td className="py-3 px-4 text-center">{reportSummary?.serviceCount || 0}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(reportSummary?.totalServiceValue || 0, currencySymbol)}</td>
                          <td className="py-3 px-4 text-right text-purple-600">{formatCurrency(reportTotalSum, currencySymbol)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </Card>
          </TabsContent>

          {/* PARLOUR REPORT D: CUSTOMER DUES */}
          <TabsContent value="customer_dues">
            <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs print:border-0 print:shadow-none print:rounded-none print:bg-transparent print:p-0 print:m-0">
              <div className="p-4 sm:p-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 print:hidden">
                <div>
                  <h3 className="text-base font-bold text-foreground">{t('customerDueLedgerTitle', 'Customer Dues Ledger')}</h3>
                  <p className="text-xs text-muted-foreground">{t('customerDueLedgerSubtitle', 'Receivables from client bridal bookings and services')}</p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">{t('totalDue', 'Total Outstanding Due')}</span>
                  <p className="text-xl font-black text-amber-600 dark:text-amber-400">{formatCurrency(reportSummary?.totalDue || 0, currencySymbol)}</p>
                </div>
              </div>

              {isLoading ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="w-7 h-7 animate-spin text-[#FF5A36]" />
                </div>
              ) : reportData.length === 0 ? (
                <div className="py-16 text-center text-xs text-muted-foreground">
                  No customer dues recorded in this period.
                </div>
              ) : (
                <>
                  {/* Mobile Card View (sm:hidden) — No horizontal scrolling on small devices */}
                  <div className="sm:hidden print:hidden p-3 space-y-2.5">
                    {reportData.map((row) => (
                      <div key={row.id} className="p-3.5 rounded-xl border border-border/60 bg-muted/15 space-y-2.5 shadow-2xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-foreground truncate">{row.customer_name}</h4>
                            <p className="text-[11px] text-muted-foreground">
                              {row.service_name} {row.phone ? `• ${row.phone}` : ''}
                            </p>
                          </div>
                          <Badge
                            className={`text-[10px] uppercase font-bold py-0.5 px-2 shrink-0 ${
                              row.status === 'paid'
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                : row.status === 'partial'
                                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                            }`}
                          >
                            {row.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-2 py-2 border-y border-border/30 text-xs">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Total</span>
                            <span className="font-semibold text-foreground">{formatCurrency(row.total_amount, currencySymbol)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Advance</span>
                            <span className="font-medium text-muted-foreground">{formatCurrency(row.advance_paid, currencySymbol)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Paid</span>
                            <span className="font-semibold text-emerald-600">{formatCurrency(row.total_paid, currencySymbol)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-0.5 text-xs">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Due Date</span>
                            <span className="text-xs text-muted-foreground">{row.due_date ? formatAccountDate(row.due_date) : '—'}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Due Balance</span>
                            <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                              {formatCurrency(row.due_amount, currencySymbol)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop & Print Table View */}
                  <div className="hidden sm:block print:block overflow-x-auto print:overflow-visible print:w-full print:max-w-none">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm print-table">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                          <th className="py-3 px-4">Customer</th>
                          <th className="py-3 px-4">Service</th>
                          <th className="py-3 px-4 text-right">Total Amount</th>
                          <th className="py-3 px-4 text-right">Advance Paid</th>
                          <th className="py-3 px-4 text-right">Total Paid</th>
                          <th className="py-3 px-4 text-right">Due Balance</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4">Due Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {reportData.map((row) => (
                          <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-foreground">
                              <div>{row.customer_name}</div>
                              {row.phone && <div className="text-[10px] text-muted-foreground font-normal">{row.phone}</div>}
                            </td>
                            <td className="py-3.5 px-4 text-muted-foreground">{row.service_name}</td>
                            <td className="py-3.5 px-4 text-right font-medium text-foreground">{formatCurrency(row.total_amount, currencySymbol)}</td>
                            <td className="py-3.5 px-4 text-right text-muted-foreground">{formatCurrency(row.advance_paid, currencySymbol)}</td>
                            <td className="py-3.5 px-4 text-right text-emerald-600 font-semibold">{formatCurrency(row.total_paid, currencySymbol)}</td>
                            <td className="py-3.5 px-4 text-right font-black text-amber-600 dark:text-amber-400">
                              {formatCurrency(row.due_amount, currencySymbol)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <Badge
                                className={`text-[10px] uppercase font-bold py-0.5 px-2 ${
                                  row.status === 'paid'
                                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                    : row.status === 'partial'
                                    ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                    : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                }`}
                              >
                                {row.status}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-muted-foreground text-xs whitespace-nowrap">
                              {row.due_date ? formatAccountDate(row.due_date) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Card>
          </TabsContent>

          {/* REPORT 1: EXPENSE BREAKDOWN */}
          <TabsContent value="expenses">
            <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs print:border-0 print:shadow-none print:rounded-none print:bg-transparent print:p-0 print:m-0">
              <div className="p-4 sm:p-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 print:hidden">
                <div>
                  <h3 className="text-base font-bold text-foreground">{t('expenseBreakdownByCategory', 'Expense Breakdown by Category')}</h3>
                  <p className="text-xs text-muted-foreground">{t('expenseBreakdownSubtitle', 'Aggregated expenditures grouped by active category')}</p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">{t('totalInRange', 'Total In Range')}</span>
                  <p className="text-xl font-black text-foreground">{formatCurrency(reportTotalSum, currencySymbol)}</p>
                </div>
              </div>

              {isLoading ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="w-7 h-7 animate-spin text-[#FF5A36]" />
                </div>
              ) : reportData.length === 0 ? (
                <div className="py-16 text-center text-xs text-muted-foreground">
                  {t('noExpensesForDateRange', 'No expenses found for the selected period.')}
                </div>
              ) : (
                <>
                  {/* Mobile Card View (sm:hidden) — No horizontal scrolling on small devices */}
                  <div className="sm:hidden print:hidden p-3 space-y-2.5">
                    {reportData.map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-border/60 bg-muted/15 space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-sm text-foreground">{item.category}</h4>
                          <span className="text-xs font-bold text-[#FF5A36] bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md shrink-0">
                            {item.percentage}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/30">
                          <span className="text-muted-foreground">{item.transaction_count} transactions</span>
                          <span className="text-sm font-black text-foreground">{formatCurrency(item.total_amount, currencySymbol)}</span>
                        </div>
                      </div>
                    ))}
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 flex items-center justify-between shadow-2xs">
                      <span className="text-xs font-bold text-foreground">{t('total', 'Total')}</span>
                      <span className="text-base font-black text-foreground">{formatCurrency(reportTotalSum, currencySymbol)}</span>
                    </div>
                  </div>

                  {/* Desktop & Print Table View */}
                  <div className="hidden sm:block print:block overflow-x-auto print:overflow-visible print:w-full print:max-w-none">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm print-table">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                          <th className="py-3 px-4">{t('category', 'Category')}</th>
                          <th className="py-3 px-4 text-center">{t('transactions', 'Transactions')}</th>
                          <th className="py-3 px-4 text-right">{t('totalAmount', 'Total Amount')}</th>
                          <th className="py-3 px-4 text-right">{t('sharePercentage', 'Share (%)')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {reportData.map((item, idx) => (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 font-bold text-foreground">{item.category}</td>
                            <td className="py-3 px-4 text-center text-muted-foreground">{item.transaction_count}</td>
                            <td className="py-3 px-4 text-right font-extrabold text-foreground">
                              {formatCurrency(item.total_amount, currencySymbol)}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-[#FF5A36]">
                              {item.percentage}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border/70 bg-muted/30 font-black text-xs sm:text-sm">
                          <td className="py-3 px-4">{t('total', 'Total')}</td>
                          <td className="py-3 px-4 text-center">
                            {reportData.reduce((acc, r) => acc + Number(r.transaction_count), 0)}
                          </td>
                          <td className="py-3 px-4 text-right text-foreground">
                            {formatCurrency(reportTotalSum, currencySymbol)}
                          </td>
                          <td className="py-3 px-4 text-right text-[#FF5A36]">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </Card>
          </TabsContent>

          {/* REPORT 2: VENDOR LEDGER & DUE */}
          <TabsContent value="vendors">
            <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs print:border-0 print:shadow-none print:rounded-none print:bg-transparent print:p-0 print:m-0">
              <div className="p-4 sm:p-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 print:hidden">
                <div>
                  <h3 className="text-base font-bold text-foreground">{t('vendorLedgerAndDuesTitle', 'Vendor Ledger & Outstanding Dues')}</h3>
                  <p className="text-xs text-muted-foreground">{t('vendorLedgerSubtitle', 'Cumulative procurement bills, payments, and payable dues')}</p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">{t('totalOutstandingDue', 'Total Outstanding Due')}</span>
                  <p className="text-xl font-black text-rose-600 dark:text-rose-400">
                    {formatCurrency(reportTotalSum, currencySymbol)}
                  </p>
                </div>
              </div>

              {isLoading ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="w-7 h-7 animate-spin text-[#FF5A36]" />
                </div>
              ) : reportData.length === 0 ? (
                <div className="py-16 text-center text-xs text-muted-foreground">
                  No vendor records available.
                </div>
              ) : (
                <>
                  {/* Mobile Card View (sm:hidden) — No horizontal scrolling on small devices */}
                  <div className="sm:hidden print:hidden p-3 space-y-2.5">
                    {reportData.map((v) => (
                      <div key={v.id} className="p-3.5 rounded-xl border border-border/60 bg-muted/15 space-y-2.5 shadow-2xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-foreground truncate">{v.name}</h4>
                            <p className="text-[11px] text-muted-foreground">
                              {v.category || 'Vendor'} {v.phone ? `• ${v.phone}` : ''}
                            </p>
                          </div>
                          {v.overdue_count > 0 ? (
                            <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] shrink-0">
                              {v.overdue_count} Overdue
                            </Badge>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-2 gap-2 py-2 border-y border-border/30 text-xs">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Purchases</span>
                            <span className="font-semibold text-foreground">{formatCurrency(v.total_purchases, currencySymbol)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Total Paid</span>
                            <span className="font-semibold text-emerald-600">{formatCurrency(v.total_paid, currencySymbol)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-0.5 text-xs">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Opening Bal</span>
                            <span className="text-xs text-muted-foreground">{formatCurrency(v.opening_balance, currencySymbol)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Outstanding Due</span>
                            <span className="text-sm font-black text-rose-600">
                              {formatCurrency(v.current_due, currencySymbol)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop & Print Table View */}
                  <div className="hidden sm:block print:block overflow-x-auto print:overflow-visible print:w-full print:max-w-none">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm print-table">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                          <th className="py-3 px-4">Vendor</th>
                          <th className="py-3 px-4 hidden md:table-cell print:table-cell">Category</th>
                          <th className="py-3 px-4 text-right hidden lg:table-cell print:table-cell">Opening Bal</th>
                          <th className="py-3 px-4 text-right hidden md:table-cell print:table-cell">Total Purchases</th>
                          <th className="py-3 px-4 text-right">Total Paid</th>
                          <th className="py-3 px-4 text-right">Outstanding Due</th>
                          <th className="py-3 px-4 text-center hidden lg:table-cell print:table-cell">Overdue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {reportData.map((v) => (
                          <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 font-bold text-foreground">
                              <div>{v.name}</div>
                              {v.phone && <span className="text-[11px] text-muted-foreground font-normal">{v.phone}</span>}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground hidden md:table-cell print:table-cell">{v.category || 'Grocery'}</td>
                            <td className="py-3 px-4 text-right text-muted-foreground hidden lg:table-cell print:table-cell">{formatCurrency(v.opening_balance, currencySymbol)}</td>
                            <td className="py-3 px-4 text-right font-semibold text-foreground hidden md:table-cell print:table-cell">{formatCurrency(v.total_purchases, currencySymbol)}</td>
                            <td className="py-3 px-4 text-right font-semibold text-emerald-600">{formatCurrency(v.total_paid, currencySymbol)}</td>
                            <td className="py-3 px-4 text-right font-extrabold text-rose-600">
                              {formatCurrency(v.current_due, currencySymbol)}
                            </td>
                            <td className="py-3 px-4 text-center hidden lg:table-cell print:table-cell">
                              {v.overdue_count > 0 ? (
                                <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px]">
                                  {v.overdue_count} Overdue
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground/50 text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Card>
          </TabsContent>

          {/* REPORT 3: STAFF SALARY REPORT */}
          <TabsContent value="staff">
            <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs print:border-0 print:shadow-none print:rounded-none print:bg-transparent print:p-0 print:m-0">
              <div className="p-4 sm:p-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 print:hidden">
                <div>
                  <h3 className="text-base font-bold text-foreground">{t('staffSalaryReportTitle', 'Staff Salary & Payroll Report')}</h3>
                  <p className="text-xs text-muted-foreground">{t('staffSalaryReportSubtitle', 'Monthly compensation breakdown and disbursement status')}</p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">{t('totalPaid', 'Total Paid In Range')}</span>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(reportTotalSum, currencySymbol)}
                  </p>
                </div>
              </div>

              {isLoading ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="w-7 h-7 animate-spin text-[#FF5A36]" />
                </div>
              ) : reportData.length === 0 ? (
                <div className="py-16 text-center text-xs text-muted-foreground">
                  No salary records found for this period.
                </div>
              ) : (
                <>
                  {/* Mobile Card View (sm:hidden) — No horizontal scrolling on small devices */}
                  <div className="sm:hidden print:hidden p-3 space-y-2.5">
                    {reportData.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-border/60 bg-muted/15 space-y-2.5 shadow-2xs"
                      >
                        {/* Header: Name, Role, Month, Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-foreground truncate">{s.staff_name}</h4>
                            <p className="text-[11px] text-muted-foreground">
                              {s.role || 'Staff'} {s.month ? `• ${s.month}` : ''}
                            </p>
                          </div>
                          <Badge
                            className={`text-[10px] py-0.5 px-2 font-bold capitalize shrink-0 ${
                              s.status === 'paid'
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                            }`}
                          >
                            {s.status}
                          </Badge>
                        </div>

                        {/* Breakdown: Base, Bonus/OT, Deductions */}
                        <div className="grid grid-cols-3 gap-2 py-2 border-y border-border/30 text-xs">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Base</span>
                            <span className="font-medium text-foreground">{formatCurrency(s.base_salary, currencySymbol)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Bonus / OT</span>
                            <span className="font-semibold text-emerald-600">
                              +{formatCurrency(Number(s.bonus || 0) + Number(s.overtime || 0), currencySymbol)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Deductions</span>
                            <span className="font-semibold text-rose-600">
                              -{formatCurrency(Number(s.deduction || 0) + Number(s.advance_adjusted || 0), currencySymbol)}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Row: Net Payable & Paid Amount */}
                        <div className="flex items-center justify-between pt-0.5">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Net Payable</span>
                            <span className="text-sm font-extrabold text-foreground">
                              {formatCurrency(s.net_payable, currencySymbol)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Paid Amount</span>
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(s.paid_amount, currencySymbol)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Mobile Summary Card */}
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 flex items-center justify-between shadow-2xs">
                      <div>
                        <span className="text-xs font-bold text-foreground block">Total Payable vs Disbursed</span>
                        <span className="text-[11px] text-muted-foreground">
                          Payable: <strong className="text-foreground">{formatCurrency(reportTotalNetSum, currencySymbol)}</strong>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Disbursed</span>
                        <span className="text-base font-black text-emerald-600">
                          {formatCurrency(reportTotalSum, currencySymbol)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Desktop & Print Table View */}
                  <div className="hidden sm:block print:block overflow-x-auto print:overflow-visible print:w-full print:max-w-none">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm print-table">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                          <th className="py-3 px-4">Staff Member</th>
                          <th className="py-3 px-4 hidden md:table-cell print:table-cell">Month</th>
                          <th className="py-3 px-4 text-right hidden md:table-cell print:table-cell">Base</th>
                          <th className="py-3 px-4 text-right hidden lg:table-cell print:table-cell">Bonus/OT</th>
                          <th className="py-3 px-4 text-right hidden lg:table-cell print:table-cell">Deductions</th>
                          <th className="py-3 px-4 text-right">Net Payable</th>
                          <th className="py-3 px-4 text-right">Paid Amount</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {reportData.map((s, idx) => (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 font-bold text-foreground">
                              <div>{s.staff_name}</div>
                              <span className="text-[10px] text-muted-foreground font-normal">{s.role}</span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell print:table-cell">{s.month}</td>
                            <td className="py-3 px-4 text-right text-muted-foreground hidden md:table-cell print:table-cell">{formatCurrency(s.base_salary, currencySymbol)}</td>
                            <td className="py-3 px-4 text-right text-emerald-600 hidden lg:table-cell print:table-cell">
                              +{formatCurrency(Number(s.bonus) + Number(s.overtime), currencySymbol)}
                            </td>
                            <td className="py-3 px-4 text-right text-rose-600 hidden lg:table-cell print:table-cell">
                              -{formatCurrency(Number(s.deduction) + Number(s.advance_adjusted), currencySymbol)}
                            </td>
                            <td className="py-3 px-4 text-right font-extrabold text-foreground">
                              {formatCurrency(s.net_payable, currencySymbol)}
                            </td>
                            <td className="py-3 px-4 text-right font-extrabold text-emerald-600">
                              {formatCurrency(s.paid_amount, currencySymbol)}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <Badge
                                className={`text-[10px] py-0 px-2 ${
                                  s.status === 'paid'
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : 'bg-rose-500/10 text-rose-600'
                                }`}
                              >
                                {s.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border/70 bg-muted/30 font-black text-xs sm:text-sm">
                          <td className="py-3 px-4" colSpan={5}>Total Payable vs Disbursed</td>
                          <td className="py-3 px-4 text-right text-foreground">
                            {formatCurrency(reportTotalNetSum, currencySymbol)}
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-600">
                            {formatCurrency(reportTotalSum, currencySymbol)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </Card>
          </TabsContent>

          {/* REPORT 4: PAYMENT METHODS */}
          <TabsContent value="payment_methods">
            <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs print:border-0 print:shadow-none print:rounded-none print:bg-transparent print:p-0 print:m-0">
              <div className="p-4 sm:p-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 print:hidden">
                <div>
                  <h3 className="text-base font-bold text-foreground">{t('paymentMethodOutflowTitle', 'Payment Method Outflow Statement')}</h3>
                  <p className="text-xs text-muted-foreground">{t('paymentMethodOutflowSubtitle', 'Distribution of funds across Cash, bKash, Nagad, Bank, and Cards')}</p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">{t('totalDisbursed', 'Total Disbursed')}</span>
                  <p className="text-xl font-black text-foreground">{formatCurrency(reportTotalSum, currencySymbol)}</p>
                </div>
              </div>

              {isLoading ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="w-7 h-7 animate-spin text-[#FF5A36]" />
                </div>
              ) : reportData.length === 0 ? (
                <div className="py-16 text-center text-xs text-muted-foreground">
                  No payment method data available in this range.
                </div>
              ) : (
                <>
                  {/* Mobile Card View (sm:hidden) — No horizontal scrolling on small devices */}
                  <div className="sm:hidden print:hidden p-3 space-y-2.5">
                    {reportData.map((pm, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-border/60 bg-muted/15 space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-sm text-foreground flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span>{pm.payment_method}</span>
                          </div>
                          <span className="text-sm font-black text-foreground">
                            {formatCurrency(pm.total_amount, currencySymbol)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/30">
                          <span className="text-muted-foreground">{t('transactions', 'Transactions')}</span>
                          <span className="text-xs font-semibold text-muted-foreground">{pm.transaction_count}</span>
                        </div>
                      </div>
                    ))}
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 flex items-center justify-between shadow-2xs">
                      <span className="text-xs font-bold text-foreground">{t('total', 'Total')}</span>
                      <span className="text-base font-black text-foreground">{formatCurrency(reportTotalSum, currencySymbol)}</span>
                    </div>
                  </div>

                  {/* Desktop & Print Table View */}
                  <div className="hidden sm:block print:block overflow-x-auto print:overflow-visible print:w-full print:max-w-none">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm print-table">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                          <th className="py-3 px-4">Payment Method</th>
                          <th className="py-3 px-4 text-center">Transaction Count</th>
                          <th className="py-3 px-4 text-right">Total Disbursed Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {reportData.map((pm, idx) => (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-foreground flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-muted-foreground" />
                              <span>{pm.payment_method}</span>
                            </td>
                            <td className="py-3.5 px-4 text-center text-muted-foreground font-semibold">
                              {pm.transaction_count}
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-foreground">
                              {formatCurrency(pm.total_amount, currencySymbol)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border/70 bg-muted/30 font-black text-xs sm:text-sm">
                          <td className="py-3 px-4">Total</td>
                          <td className="py-3 px-4 text-center">
                            {reportData.reduce((acc, r) => acc + Number(r.transaction_count), 0)}
                          </td>
                          <td className="py-3 px-4 text-right text-foreground">
                            {formatCurrency(reportTotalSum, currencySymbol)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* ============================================================== */}
        {/*               OFFICIAL INSTITUTIONAL PRINT FOOTER               */}
        {/* ============================================================== */}
        <div className="hidden print:block w-full print:mt-20 pt-4 print-avoid-break print-footer">
          {/* Three Signatory Columns */}
          <div className="grid grid-cols-3 gap-8 pt-8">
            <div className="text-center">
              <div className="border-t-2 border-neutral-800 pt-1.5">
                <span className="text-xs font-bold text-neutral-900 block">Prepared By</span>
                <span className="text-[10px] text-neutral-600">Accountant / Cashier</span>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-neutral-800 pt-1.5">
                <span className="text-xs font-bold text-neutral-900 block">Verified & Audited</span>
                <span className="text-[10px] text-neutral-600">Accounts Manager</span>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-neutral-800 pt-1.5">
                <span className="text-xs font-bold text-neutral-900 block">Authorized Signature</span>
                <span className="text-[10px] text-neutral-600">Proprietor / Director</span>
              </div>
            </div>
          </div>

          {/* Legal / Compliance Disclaimer */}
          <div className="mt-8 pt-3 border-t border-neutral-300 flex items-center justify-between text-[10px] text-neutral-500">
            <span>MenuSnap Enterprise Accounts Management System • Internal Financial Audit Copy</span>
            <span>Confidential Accounting Document • Generated {printDateStr}</span>
          </div>
        </div>
      </div>
    </AccountsGate>
  );
}
