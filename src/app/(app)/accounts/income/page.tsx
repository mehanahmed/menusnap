'use client';

import { AccountsMobileCards } from '@/components/accounts/AccountsTopNavbar';

import { useState, useEffect, useTransition, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useClientAuth } from '@/hooks/use-client-auth';
import { usePreferences } from '@/context/PreferencesContext';
import { AccountsGate } from '@/components/accounts/AccountsGate';
import { formatCurrency, formatAccountDate } from '@/lib/accounts/helpers';
import { toPng } from 'html-to-image';
import { getCustomerOrderByIdAction, type CustomerOrderRecord } from '@/app/actions/customer-orders';
import { format, parseISO, isValid } from 'date-fns';
import {
  getIncomesAction,
  createIncomeAction,
  updateIncomeAction,
  deleteIncomeAction,
  getServicesAction,
  getPaymentMethodsAction,
} from '@/app/actions/accounts';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  AccountsSheet,
  AccountsSheetContent,
  AccountsSheetHeader,
  AccountsSheetTitle,
  AccountsSheetDescription,
  AccountsSheetFooter,
} from '@/components/accounts/AccountsSheet';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowDownLeft,
  Plus,
  Search,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  Receipt,
  Edit2,
  Trash2,
  Lock,
  Loader2,
  Sparkles,
  AlertCircle,
  Scissors,
  Printer,
  RotateCcw,
  FileSpreadsheet,
  ArrowUpRight,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
  Phone,
  Download,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

export default function ParlourIncomePage() {
  return (
    <AccountsGate>
      <IncomeContent />
    </AccountsGate>
  );
}

function IncomeContent() {
  const { clientUser } = useClientAuth();
  const { t, currencySymbol } = usePreferences();
  const restaurantId = clientUser?.id ? String(clientUser.id) : (clientUser?.businessName || '');
  const isParlour = clientUser?.type === 'parlour';

  // Date Presets State
  const [activePreset, setActivePreset] = useState<'today' | 'weekly' | 'last30' | 'thisYear' | 'all'>('last30');
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Data states
  const [incomes, setIncomes] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ todayIncome: 0, thisMonthIncome: 0, totalIncome: 0, count: 0 });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [services, setServices] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([
    { id: 1, name: 'Cash' },
    { id: 2, name: 'bKash' },
    { id: 3, name: 'Nagad' },
    { id: 4, name: 'Bank' },
    { id: 5, name: 'Card' },
  ]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<any>(null);

  // Receipt Modal State
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptIncome, setReceiptIncome] = useState<any>(null);
  const [receiptOrderRecord, setReceiptOrderRecord] = useState<CustomerOrderRecord | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);
  const receiptSlipRef = useRef<HTMLDivElement>(null);

  // Form State
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [formAmount, setFormAmount] = useState<string>('');
  const [formServiceId, setFormServiceId] = useState<string>('');
  const [formPaymentMethodId, setFormPaymentMethodId] = useState<string>('1');
  const [formCustomerName, setFormCustomerName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formTableNumber, setFormTableNumber] = useState<string>('');
  const [formNote, setFormNote] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preset Handlers
  const handlePresetSelect = (preset: 'today' | 'weekly' | 'last30' | 'thisYear' | 'all') => {
    setActivePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (preset === 'today') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'weekly') {
      const past7 = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      setFromDate(past7);
      setToDate(todayStr);
    } else if (preset === 'last30') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      setFromDate(past30);
      setToDate(todayStr);
    } else if (preset === 'thisYear') {
      const firstJan = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      setFromDate(firstJan);
      setToDate(todayStr);
    } else if (preset === 'all') {
      setFromDate('');
      setToDate('');
    }
  };

  // Load initial data
  const fetchData = useCallback(async () => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [incRes, servRes, pmRes]: any = await Promise.all([
        getIncomesAction(restaurantId, {
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          serviceId: serviceFilter !== 'all' ? serviceFilter : undefined,
          search: search.trim() || undefined,
          page: currentPage,
          limit: 10,
        }),
        isParlour ? getServicesAction(restaurantId) : Promise.resolve({ success: true, data: [] }),
        getPaymentMethodsAction(restaurantId),
      ]);

      if (incRes.success && incRes.data) {
        setIncomes(incRes.data);
        if (incRes.summary) setSummary(incRes.summary);
        if (incRes.pagination) {
          setTotalPages(incRes.pagination.totalPages || 1);
          setTotalCount(incRes.pagination.total || 0);
        }
      }
      if (servRes.success && servRes.data) {
        setServices(servRes.data);
      }
      if (pmRes.success && pmRes.data) {
        setPaymentMethods(pmRes.data);
      }
    } catch (err) {
      console.error('Failed to load income data:', err);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, isParlour, fromDate, toDate, serviceFilter, search, currentPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleResetFilters = () => {
    setSearch('');
    setServiceFilter('all');
    handlePresetSelect('today');
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormAmount('');
    setFormServiceId('');
    setFormPaymentMethodId(paymentMethods[0]?.id ? String(paymentMethods[0].id) : '1');
    setFormCustomerName('');
    setFormPhone('');
    setFormTableNumber('');
    setFormNote('');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Helper to determine if an income record is genuinely from a synced customer QR order
  const checkIsQr = (inc: any): boolean => {
    if (!inc) return false;
    if (inc.created_by === 'QR Order') return true;
    const ordId = inc.order_id ? String(inc.order_id) : '';
    const isManual = inc.created_by === 'Manual' || inc.created_by === 'Manual Order' || ordId.startsWith('ORD-M-') || ordId.startsWith('ORD-P-');
    return Boolean(ordId && !isManual);
  };

  // Open Edit Modal
  const handleOpenEdit = (inc: any) => {
    if (inc.is_auto) {
      const isQr = checkIsQr(inc);
      if (isQr) {
        alert(t('qrOrderLockNotice', 'QR Order income is synced with customer orders. To update it, please manage the order in Customer Orders.'));
      } else {
        alert(t('autoIncomeLockNotice', 'Auto-generated income linked to customer due must be managed from Customer Due.'));
      }
      return;
    }
    setSelectedIncome(inc);
    setFormDate(inc.date);
    setFormAmount(String(inc.amount));
    setFormServiceId(inc.service_id ? String(inc.service_id) : '');
    setFormPaymentMethodId(inc.payment_method_id ? String(inc.payment_method_id) : '1');
    setFormCustomerName(inc.customer_name || '');
    setFormPhone(inc.customer_phone || '');
    setFormNote(inc.note || '');
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Open Receipt Modal
  const handleOpenReceipt = async (inc: any) => {
    setReceiptIncome(inc);
    setReceiptOrderRecord(null);
    setIsReceiptOpen(true);

    if (inc.order_id) {
      setLoadingReceipt(true);
      try {
        const res = await getCustomerOrderByIdAction(inc.order_id);
        if (res.success && res.order) {
          setReceiptOrderRecord(res.order);
        }
      } catch (err) {
        console.warn('Could not fetch full order details for receipt:', err);
      } finally {
        setLoadingReceipt(false);
      }
    }
  };

  // Download Receipt Slip Image as PNG
  const handleDownloadReceiptImage = async () => {
    if (!receiptSlipRef.current) return;
    setIsDownloadingReceipt(true);
    try {
      const dataUrl = await toPng(receiptSlipRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
        skipFonts: true,
        backgroundColor: '#FFFFFF',
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      const refId = receiptOrderRecord?.orderId || receiptIncome?.order_id || `REC-${receiptIncome?.id || Date.now()}`;
      a.download = `receipt-${refId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download receipt image:', err);
      alert('Failed to generate receipt image.');
    } finally {
      setIsDownloadingReceipt(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (inc: any) => {
    if (inc.is_auto) {
      const isQr = checkIsQr(inc);
      if (isQr) {
        alert(t('qrOrderLockNotice', 'QR Order income is synced with customer orders. To delete it, please manage the order in Customer Orders.'));
      } else {
        alert(t('autoIncomeLockNotice', 'Auto-generated income linked to customer due must be managed from Customer Due.'));
      }
      return;
    }
    setSelectedIncome(inc);
    setIsDeleteModalOpen(true);
  };

  // Save Income (Add)
  const handleCreateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(formAmount);
    if (isNaN(amount) || amount <= 0) {
      setFormError(t('invalidAmount', 'Amount must be greater than 0.'));
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (formDate > today) {
      setFormError(t('futureDateError', 'Transaction date cannot be in the future.'));
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const orderTypeLabels: Record<string, string> = {
        dine_in: 'Dine-in Order',
        takeaway: 'Takeaway / Parcel',
        delivery: 'Home Delivery',
        catering: 'Catering / Event',
      };
      const orderPrefix = !isParlour && orderTypeLabels[formServiceId] ? `[${orderTypeLabels[formServiceId]}] ` : '';
      const finalNote = orderPrefix ? (formNote ? `${orderPrefix}${formNote}` : orderTypeLabels[formServiceId]) : formNote;

      const res: any = await createIncomeAction(restaurantId, {
        date: formDate,
        amount,
        service_id: isParlour && formServiceId && formServiceId !== 'custom' ? Number(formServiceId) : null,
        payment_method_id: formPaymentMethodId ? Number(formPaymentMethodId) : null,
        customer_name: formCustomerName,
        customer_phone: formPhone || null,
        table_number: formTableNumber || null,
        created_by: !isParlour ? 'Manual Order' : 'Manual',
        note: finalNote,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to save income.');
        setIsSubmitting(false);
        return;
      }

      setIsAddModalOpen(false);
      await fetchData();

      // Auto-open generated receipt slip for immediate verification & PNG download
      handleOpenReceipt({
        id: res.incomeId,
        order_id: res.orderId,
        customer_name: formCustomerName || 'Walk-in Customer',
        customer_phone: formPhone || '',
        table_number: formTableNumber || '',
        amount,
        date: formDate,
        payment_method_name: paymentMethods.find((p) => String(p.id) === String(formPaymentMethodId))?.name || 'Cash',
        service_name: orderTypeLabels[formServiceId] || 'General Food Sales',
        note: finalNote,
        created_by: !isParlour ? 'Manual Order' : 'Manual',
      });
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save income.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Income (Update)
  const handleUpdateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncome) return;
    const amount = Number(formAmount);
    if (isNaN(amount) || amount <= 0) {
      setFormError(t('invalidAmount', 'Amount must be greater than 0.'));
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (formDate > today) {
      setFormError(t('futureDateError', 'Transaction date cannot be in the future.'));
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await updateIncomeAction(restaurantId, selectedIncome.id, {
        date: formDate,
        amount,
        service_id: formServiceId && formServiceId !== 'custom' ? Number(formServiceId) : null,
        payment_method_id: formPaymentMethodId ? Number(formPaymentMethodId) : null,
        customer_name: formCustomerName,
        customer_phone: formPhone || null,
        note: formNote,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to update income.');
        setIsSubmitting(false);
        return;
      }

      setIsEditModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to update income.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Income
  const handleDeleteIncome = async () => {
    if (!selectedIncome) return;
    setIsSubmitting(true);
    try {
      const res = await deleteIncomeAction(restaurantId, selectedIncome.id);
      if (!res.success) {
        alert(res.error || 'Failed to delete income.');
        setIsSubmitting(false);
        return;
      }
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete income.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasActiveFilters = Boolean(search || serviceFilter !== 'all');

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32 sm:pb-20 md:pb-12 space-y-3.5 sm:space-y-6 p-2.5 xs:p-3.5 sm:p-6 lg:p-8 xl:p-10 w-full max-w-full overflow-x-hidden min-w-0">
      {/* Header Section */}
      <div className="flex flex-col gap-3 pb-4 border-b border-border/40 w-full min-w-0 max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-orange-500/10 text-[#FF5A36]">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {t('income', 'Income')}
                </h1>
                <Badge className="bg-gradient-to-r from-[#FF5A36] to-orange-500 text-white font-bold text-[10px] py-0.5 px-2.5 rounded-full border-none shadow-xs">
                  {t('revenueLive', 'Revenue Live')}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {clientUser?.businessName ? `${clientUser.businessName} • ` : ''}
                {isParlour
                  ? t('incomeSubtitle', 'Track salon revenue, services rendered, and customer collections.')
                  : t('incomeSubtitleRestaurant', 'Track orders revenue, customer QR sales, and manual billing.')}
              </p>
            </div>
          </div>

          <Button
            onClick={handleOpenAdd}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#FF5A36] to-orange-500 hover:from-[#e04b2a] hover:to-orange-600 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm shadow-orange-500/20 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{isParlour ? t('addIncome', 'Record Income') : t('newOrderIncome', 'New Order / Income')}</span>
          </Button>
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
              onChange={(e) => {
                setFromDate(e.target.value);
                setActivePreset('all');
              }}
              className="bg-transparent text-[11px] sm:text-xs font-semibold text-foreground outline-none cursor-pointer flex-1 sm:w-28 text-center sm:text-left min-w-0"
            />
            <span className="text-muted-foreground/60 font-bold text-xs select-none px-0.5">→</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setActivePreset('all');
              }}
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
              <span>{t('reports', 'Reports')}</span>
              <ArrowUpRight className="w-3 h-3 opacity-80" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Top Stat Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-5 w-full min-w-0 max-w-full">
        {/* Card 1: Today's Income */}
        <Card className="rounded-2xl border border-border/60 bg-card shadow-xs transition-all hover:shadow-md hover:border-emerald-500/30 overflow-hidden group min-w-0">
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="p-3.5 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                  {t('todayIncome', "Today's Income")}
                </p>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground mt-1.5 tracking-tight truncate">
                  {formatCurrency(summary.todayIncome, currencySymbol)}
                </h3>
              </div>
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform shrink-0 ml-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3 flex items-center text-[11px] sm:text-xs text-muted-foreground font-medium truncate">
              <span>{t('todayRevenue', 'Revenue collected today')}</span>
            </div>
          </div>
        </Card>

        {/* Card 2: This Month's Income */}
        <Card className="rounded-2xl border border-border/60 bg-card shadow-xs transition-all hover:shadow-md hover:border-[#FF5A36]/30 overflow-hidden group min-w-0">
          <div className="h-1 w-full bg-gradient-to-r from-[#FF5A36] to-orange-400" />
          <div className="p-3.5 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                  {t('thisMonthIncome', "This Month's Income")}
                </p>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground mt-1.5 tracking-tight truncate">
                  {formatCurrency(summary.thisMonthIncome, currencySymbol)}
                </h3>
              </div>
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-orange-500/10 text-[#FF5A36] flex items-center justify-center border border-orange-500/20 group-hover:scale-110 transition-transform shrink-0 ml-2">
                <TrendingUp className="w-5 h-5 text-[#FF5A36]" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3 flex items-center text-[11px] sm:text-xs text-[#FF5A36] font-medium truncate">
              <span>{t('activeMonthTotal', 'Active calendar month total')}</span>
            </div>
          </div>
        </Card>

        {/* Card 3: Selected Period Income */}
        <Card className="rounded-2xl border border-border/60 bg-card shadow-xs transition-all hover:shadow-md hover:border-blue-500/30 overflow-hidden group min-w-0">
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-400" />
          <div className="p-3.5 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                  {t('filteredIncome', 'Period Income')}
                </p>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground mt-1.5 tracking-tight truncate">
                  {formatCurrency(summary.totalIncome, currencySymbol)}
                </h3>
              </div>
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform shrink-0 ml-2">
                <Receipt className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3 flex items-center text-[11px] sm:text-xs text-muted-foreground font-medium truncate">
              <span>{summary.count} {t('transactions', 'transactions logged')}</span>
            </div>
          </div>
        </Card>

        {/* Card 4: Service Catalog (Parlour) or Orders Synced (Restaurant) */}
        <Card className="rounded-2xl border border-border/60 bg-card shadow-xs transition-all hover:shadow-md hover:border-purple-500/30 overflow-hidden group min-w-0">
          <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-indigo-400" />
          <div className="p-3.5 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                  {isParlour ? t('serviceCatalog', 'Service Catalog') : t('ordersLogged', 'Orders / Entries')}
                </p>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground mt-1.5 tracking-tight truncate">
                  {isParlour ? services.length : summary.count}
                </h3>
              </div>
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform shrink-0 ml-2">
                {isParlour ? <Scissors className="w-5 h-5 text-purple-500" /> : <Receipt className="w-5 h-5 text-purple-500" />}
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3 flex items-center text-[11px] sm:text-xs text-muted-foreground font-medium truncate">
              <span>{isParlour ? t('activeServices', 'Active salon services') : t('syncedAndManualOrders', 'QR orders & manual sales')}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Search & Filter Bar */}
      <Card className="rounded-2xl border border-border/60 bg-card p-3.5 sm:p-5 shadow-xs space-y-3.5">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('searchIncomePlaceholder', 'Search by customer name or note...')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-10 rounded-xl bg-muted/20 border-border/70 text-xs sm:text-sm w-full"
            />
          </div>

          {/* Service Selector & Controls */}
          <div className="flex items-center gap-2">
            {isParlour ? (
              <Select
                value={serviceFilter}
                onValueChange={(val) => {
                  setServiceFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/20 border-border/60 min-w-[150px]">
                  <SelectValue placeholder={t('allServices', 'All Services')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">{t('allServices', 'All Services')}</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            <Button
              type="submit"
              variant="outline"
              className="h-10 px-3.5 rounded-xl border-border/70 text-xs font-semibold hover:bg-muted"
            >
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              <span>{t('filter', 'Filter')}</span>
            </Button>
          </div>
        </form>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 text-xs border-t border-border/40">
            <span className="text-muted-foreground">
              Showing filtered results ({incomes.length} record{incomes.length === 1 ? '' : 's'})
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-7 text-xs text-[#FF5A36] hover:bg-orange-500/10 hover:text-[#FF5A36] px-2 rounded-lg"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset Filters
            </Button>
          </div>
        )}
      </Card>

      {/* 4. Income Records Table */}
      <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60 flex flex-row items-center justify-between">
          <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-500/10 text-[#FF5A36]">
              <Receipt className="w-4 h-4" />
            </div>
            <span>{t('incomeLedger', 'Income Records')}</span>
            <Badge variant="outline" className="ml-1 text-[11px] font-semibold">
              {incomes.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF5A36]" />
              <p className="text-xs text-muted-foreground">{t('loadingIncomes', 'Loading income ledger...')}</p>
            </div>
          ) : incomes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 text-muted-foreground/60 flex items-center justify-center mb-3">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">{t('noIncomesYet', 'No income records found')}</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {t('recordFirstIncome', 'Record customer payments or advance collections above.')}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card List (< md): Touch-first cards, zero horizontal scroll */}
              <div className="md:hidden divide-y divide-border/50">
                {incomes.map((inc) => {
                  const isQr = checkIsQr(inc);
                  const isDue = Boolean(inc.customer_due_id || (inc.created_by && String(inc.created_by).startsWith('Customer')));
                  const isBoilerplate = Boolean(inc.note && (inc.note.startsWith('Customer QR Order #') || inc.note.startsWith('QR Order #') || inc.note.startsWith('Table ')));
                  const cleanNote = isBoilerplate ? null : (inc.note ? inc.note.trim() : null);

                  return (
                    <div key={inc.id} className="p-3.5 space-y-2.5 bg-card">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-foreground text-sm">
                            {inc.service_name || (isParlour ? t('generalSales', 'General Sales') : (isQr ? `QR Order #${inc.order_id}` : (inc.order_id ? `Manual Order #${inc.order_id}` : 'Manual Order')))}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-foreground">{inc.customer_name || 'Walk-in'}</span>
                            {inc.customer_phone ? (
                              <>
                                <span>•</span>
                                <span className="font-mono text-foreground/80 flex items-center gap-0.5">
                                  <Phone className="w-2.5 h-2.5 text-muted-foreground" />
                                  {inc.customer_phone}
                                </span>
                              </>
                            ) : null}
                            <span>•</span>
                            <span>{formatAccountDate(inc.date)}</span>
                          </div>
                        </div>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap">
                          +{formatCurrency(inc.amount, currencySymbol)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="rounded-lg text-[10px] font-medium py-0.5">
                            {inc.payment_method_name || 'Cash'}
                          </Badge>
                          {isQr ? (
                            <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-[10px] py-0 px-1.5 rounded">
                              {isParlour ? <Sparkles className="w-2.5 h-2.5 mr-1 inline" /> : <UtensilsCrossed className="w-2.5 h-2.5 mr-1 inline" />}
                              QR Order #{inc.order_id || ''}
                            </Badge>
                          ) : isDue ? (
                            <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] py-0 px-1.5 rounded">
                              <Lock className="w-2.5 h-2.5 mr-1 inline" />
                              {inc.created_by || 'Customer Due'}
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] py-0 px-1.5 rounded">
                              {inc.created_by || (isParlour ? 'Manual' : 'Manual Order')}
                            </Badge>
                          )}
                          {cleanNote && (
                            <span className="text-muted-foreground text-[11px] truncate max-w-[140px]">{cleanNote}</span>
                          )}
                        </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReceipt(inc)}
                          className="min-h-[36px] h-8 px-2.5 rounded-lg text-xs font-semibold border-orange-500/30 text-orange-600 hover:bg-orange-500/10 flex items-center gap-1"
                          title="View & Download Receipt"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={inc.is_auto}
                          onClick={() => handleOpenEdit(inc)}
                          className="min-h-[36px] w-8 h-8 p-0 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={inc.is_auto}
                          onClick={() => handleOpenDelete(inc)}
                          className="min-h-[36px] w-8 h-8 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>

              {/* Desktop Table (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border/60 text-muted-foreground font-semibold">
                      <th className="p-3.5 pl-6">{t('date', 'Date')}</th>
                      <th className="p-3.5">{isParlour ? t('service', 'Service') : t('itemOrService', 'Service / Type')}</th>
                      <th className="p-3.5">{isParlour ? t('customer', 'Customer') : t('tableOrCustomer', 'Table / Customer')}</th>
                      <th className="p-3.5">{t('paymentMethod', 'Method')}</th>
                      <th className="p-3.5">{t('typeSource', 'Source / Note')}</th>
                      <th className="p-3.5 text-right">{t('amount', 'Amount')}</th>
                      <th className="p-3.5 pr-6 text-right">{t('actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {incomes.map((inc) => {
                      const isQr = checkIsQr(inc);
                      const isDue = Boolean(inc.customer_due_id || (inc.created_by && String(inc.created_by).startsWith('Customer')));
                      const isBoilerplate = Boolean(inc.note && (inc.note.startsWith('Customer QR Order #') || inc.note.startsWith('QR Order #') || inc.note.startsWith('Table ')));
                      const cleanNote = isBoilerplate ? null : (inc.note ? inc.note.trim() : null);

                      return (
                        <tr key={inc.id} className="hover:bg-muted/10 transition-colors">
                          <td className="p-3.5 pl-6 font-medium text-foreground whitespace-nowrap">
                            {formatAccountDate(inc.date)}
                          </td>
                          <td className="p-3.5">
                            <span className="font-semibold text-foreground">
                              {inc.service_name || (isParlour ? t('generalSales', 'General Sales') : (isQr ? `QR Order #${inc.order_id}` : (inc.order_id ? `Manual Order #${inc.order_id}` : 'Manual Order')))}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-foreground">{inc.customer_name || '—'}</div>
                            {inc.customer_phone ? (
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono mt-0.5">
                                <Phone className="w-2.5 h-2.5 text-muted-foreground/70" />
                                <span>{inc.customer_phone}</span>
                              </div>
                            ) : null}
                          </td>
                          <td className="p-3.5">
                            <Badge variant="outline" className="rounded-lg text-[10px] font-medium py-0.5">
                              {inc.payment_method_name || 'Cash'}
                            </Badge>
                          </td>
                          <td className="p-3.5 max-w-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isQr ? (
                                <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-[10px] py-0 px-1.5 rounded">
                                  {isParlour ? <Sparkles className="w-2.5 h-2.5 mr-1 inline" /> : <UtensilsCrossed className="w-2.5 h-2.5 mr-1 inline" />}
                                  QR Order #{inc.order_id || ''}
                                </Badge>
                              ) : isDue ? (
                                <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] py-0 px-1.5 rounded">
                                  <Lock className="w-2.5 h-2.5 mr-1 inline" />
                                  {inc.created_by || 'Customer Due'}
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] py-0 px-1.5 rounded">
                                  {inc.created_by || (isParlour ? 'Manual' : 'Manual Order')}
                                </Badge>
                              )}
                              {cleanNote ? (
                                <span className="text-muted-foreground truncate text-[11px]">{cleanNote}</span>
                              ) : null}
                            </div>
                          </td>
                        <td className="p-3.5 text-right font-bold text-foreground text-sm whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(inc.amount, currencySymbol)}
                        </td>
                        <td className="p-3.5 pr-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenReceipt(inc)}
                              className="w-8 h-8 rounded-lg hover:bg-orange-500/10 text-orange-600 hover:text-orange-700"
                              title="View & Download Receipt"
                            >
                              <Receipt className="w-4 h-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                  <span className="sr-only">{t('actions', 'Actions')}</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-xl border border-border/60 bg-card shadow-lg p-1">
                                <DropdownMenuItem
                                  onClick={() => handleOpenReceipt(inc)}
                                  className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-orange-600 focus:bg-orange-500/10 focus:text-orange-600"
                                >
                                  <Receipt className="w-3.5 h-3.5 text-orange-500" />
                                  <span>View & Download Receipt</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="my-1 border-border/40" />

                                <DropdownMenuItem
                                  disabled={inc.is_auto}
                                  onClick={() => handleOpenEdit(inc)}
                                  className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium focus:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>{t('edit', 'Edit Income')}</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="my-1 border-border/40" />

                                <DropdownMenuItem
                                  disabled={inc.is_auto}
                                  onClick={() => handleOpenDelete(inc)}
                                  className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-rose-600 focus:text-rose-600 focus:bg-rose-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{t('delete', 'Delete')}</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-border/40 text-xs text-muted-foreground">
                  <span>
                    Page {currentPage} of {totalPages} ({totalCount} total)
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1 || loading}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="h-8 px-2.5 rounded-lg text-xs"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages || loading}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="h-8 px-2.5 rounded-lg text-xs"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Record Income Modal (Create) - Bottom Sheet on mobile, Dialog on desktop */}
      <AccountsSheet open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <AccountsSheetContent className="overflow-y-auto max-h-[88vh]">
          <AccountsSheetHeader>
            <AccountsSheetTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              <span>{isParlour ? t('addIncome', 'Record Income') : t('newOrderIncome', 'New Order / Income')}</span>
            </AccountsSheetTitle>
            <AccountsSheetDescription>
              {isParlour
                ? t('addIncomeDesc', 'Log parlour service earnings or general client payments directly.')
                : t('addOrderDesc', 'Record walk-in, offline, dine-in, takeaway, or catering order revenue.')}
            </AccountsSheetDescription>
          </AccountsSheetHeader>

          <form onSubmit={handleCreateIncome} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t('date', 'Date')} *</Label>
                <Input
                  type="date"
                  value={formDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="h-10 rounded-xl text-xs bg-muted/20"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t('amount', 'Amount')} (৳) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="h-10 rounded-xl text-xs bg-muted/20 font-bold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{isParlour ? t('service', 'Service') : t('orderType', 'Order Type')} (Optional)</Label>
                {isParlour ? (
                  <Select value={formServiceId} onValueChange={setFormServiceId}>
                    <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/20">
                      <SelectValue placeholder={t('selectService', 'General Sales')} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="custom">{t('generalSales', 'General Sales')}</SelectItem>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name} (৳{s.price})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={formServiceId} onValueChange={setFormServiceId}>
                    <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/20">
                      <SelectValue placeholder="General Food Sales" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="custom">General Food Sales</SelectItem>
                      <SelectItem value="dine_in">Dine-in Order</SelectItem>
                      <SelectItem value="takeaway">Takeaway / Parcel</SelectItem>
                      <SelectItem value="delivery">Home Delivery</SelectItem>
                      <SelectItem value="catering">Catering / Event</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t('paymentMethod', 'Payment Method')} *</Label>
                <Select value={formPaymentMethodId} onValueChange={setFormPaymentMethodId}>
                  <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/20">
                    <SelectValue placeholder="Payment Method" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.id} value={String(pm.id)}>
                        {pm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t('customerName', 'Customer Name')} (Optional)</Label>
                <Input
                  type="text"
                  placeholder={isParlour ? 'e.g. Farzana Chowdhury' : 'e.g. Tanvir Ahmed / Walk-in'}
                  value={formCustomerName}
                  onChange={(e) => setFormCustomerName(e.target.value)}
                  className="h-10 rounded-xl text-xs bg-muted/20"
                />
              </div>

              {!isParlour ? (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">{t('tableNumber', 'Table No.')} (Optional)</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Table 4 / Parcel"
                    value={formTableNumber}
                    onChange={(e) => setFormTableNumber(e.target.value)}
                    className="h-10 rounded-xl text-xs bg-muted/20"
                  />
                </div>
              ) : null}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">{t('phone', 'Customer Phone Number')} (Optional)</Label>
                <span className={`text-[10px] font-mono font-bold ${formPhone.length === 11 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                  {formPhone.length}/11
                </span>
              </div>
              <div className="flex rounded-xl border border-input bg-muted/20 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary overflow-hidden h-10 transition-all">
                <span className="inline-flex items-center px-3 bg-muted/70 text-foreground font-mono font-bold text-xs border-r border-border/60 select-none">
                  +88
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="017xxxxxxxx"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  maxLength={11}
                  className="flex-1 bg-transparent px-3 text-xs outline-none font-mono text-foreground placeholder:text-muted-foreground placeholder:font-sans h-full"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">{t('note', 'Note')} (Optional)</Label>
              <Input
                type="text"
                placeholder={isParlour ? 'e.g. Bridal package booking, hair treatment...' : 'e.g. 2 Kacchi, 2 Borhani, 1 Salad'}
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                className="h-10 rounded-xl text-xs bg-muted/20"
              />
            </div>

            <AccountsSheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl text-xs h-10 min-h-[44px]"
              >
                {t('cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl text-xs h-10 min-h-[44px] bg-gradient-to-r from-[#FF5A36] to-orange-500 text-white font-bold"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                {isParlour ? t('save', 'Save Income') : t('saveOrderIncome', 'Save Order Income')}
              </Button>
            </AccountsSheetFooter>
          </form>
        </AccountsSheetContent>
      </AccountsSheet>

      {/* Edit Income Modal - Bottom Sheet on mobile, Dialog on desktop */}
      <AccountsSheet open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <AccountsSheetContent className="overflow-y-auto max-h-[88vh]">
          <AccountsSheetHeader>
            <AccountsSheetTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-orange-500" />
              <span>{t('editIncome', 'Edit Income Record')}</span>
            </AccountsSheetTitle>
          </AccountsSheetHeader>

          <form onSubmit={handleUpdateIncome} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t('date', 'Date')} *</Label>
                <Input
                  type="date"
                  value={formDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="h-10 rounded-xl text-xs bg-muted/20"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t('amount', 'Amount')} (৳) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="h-10 rounded-xl text-xs bg-muted/20 font-bold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{isParlour ? t('service', 'Service') : t('orderType', 'Order Type')}</Label>
                {isParlour ? (
                  <Select value={formServiceId} onValueChange={setFormServiceId}>
                    <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/20">
                      <SelectValue placeholder={t('selectService', 'General Sales')} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="custom">{t('generalSales', 'General Sales')}</SelectItem>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name} (৳{s.price})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={formServiceId} onValueChange={setFormServiceId}>
                    <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/20">
                      <SelectValue placeholder="General Food Sales" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="custom">General Food Sales</SelectItem>
                      <SelectItem value="dine_in">Dine-in Order</SelectItem>
                      <SelectItem value="takeaway">Takeaway / Parcel</SelectItem>
                      <SelectItem value="delivery">Home Delivery</SelectItem>
                      <SelectItem value="catering">Catering / Event</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t('paymentMethod', 'Payment Method')} *</Label>
                <Select value={formPaymentMethodId} onValueChange={setFormPaymentMethodId}>
                  <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/20">
                    <SelectValue placeholder="Payment Method" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.id} value={String(pm.id)}>
                        {pm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">{isParlour ? t('customerName', 'Customer Name') : t('tableOrCustomer', 'Table No. / Customer Name')}</Label>
              <Input
                type="text"
                placeholder={isParlour ? 'e.g. Farzana Chowdhury' : 'e.g. Table 4 or Walk-in'}
                value={formCustomerName}
                onChange={(e) => setFormCustomerName(e.target.value)}
                className="h-10 rounded-xl text-xs bg-muted/20"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">{t('phone', 'Phone Number')} (Optional)</Label>
                <span className={`text-[10px] font-mono font-bold ${formPhone.length === 11 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                  {formPhone.length}/11
                </span>
              </div>
              <div className="flex rounded-xl border border-input bg-muted/20 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary overflow-hidden h-10 transition-all">
                <span className="inline-flex items-center px-3 bg-muted/70 text-foreground font-mono font-bold text-xs border-r border-border/60 select-none">
                  +88
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="017xxxxxxxx"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  maxLength={11}
                  className="flex-1 bg-transparent px-3 text-xs outline-none font-mono text-foreground placeholder:text-muted-foreground placeholder:font-sans h-full"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">{t('note', 'Note')}</Label>
              <Input
                type="text"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                className="h-10 rounded-xl text-xs bg-muted/20"
              />
            </div>

            <AccountsSheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-xl text-xs h-10 min-h-[44px]"
              >
                {t('cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl text-xs h-10 min-h-[44px] bg-gradient-to-r from-[#FF5A36] to-orange-500 text-white font-bold"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                {t('update', 'Update Income')}
              </Button>
            </AccountsSheetFooter>
          </form>
        </AccountsSheetContent>
      </AccountsSheet>

      {/* Delete Confirmation Modal - Bottom Sheet on mobile, Dialog on desktop */}
      <AccountsSheet open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AccountsSheetContent className="overflow-y-auto max-h-[85vh]">
          <AccountsSheetHeader>
            <AccountsSheetTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{t('confirmDelete', 'Delete Income Record?')}</span>
            </AccountsSheetTitle>
            <AccountsSheetDescription>
              {t(
                'deleteIncomeConfirmDesc',
                'Are you sure you want to delete this income entry? This will remove the transaction from revenue and financial statements.'
              )}
            </AccountsSheetDescription>
          </AccountsSheetHeader>

          <AccountsSheetFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="rounded-xl text-xs h-10 min-h-[44px]"
            >
              {t('cancel', 'Cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={isSubmitting}
              onClick={handleDeleteIncome}
              className="rounded-xl text-xs h-10 min-h-[44px] font-bold"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              {t('delete', 'Delete')}
            </Button>
          </AccountsSheetFooter>
        </AccountsSheetContent>
      </AccountsSheet>

      {/* Receipt Modal: View, Print, WhatsApp & Download as PNG */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border/80 bg-card">
          <DialogHeader className="pb-2 border-b border-border/40 pr-10">
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Receipt className={`w-5 h-5 ${isParlour ? 'text-pink-500' : 'text-orange-500'}`} />
                <span>{isParlour ? t('serviceReceipt', 'Service Receipt') : t('orderReceipt', 'Order Receipt')}</span>
              </DialogTitle>
              <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold">
                {t('verified', 'Verified Paid')}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {t('orderReceiptDesc', 'Preview, download receipt image (PNG), or share directly via WhatsApp.')}
            </DialogDescription>
          </DialogHeader>

          {loadingReceipt ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              <p className="text-xs text-muted-foreground font-medium">Loading verified order details...</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Receipt Slip container (rendered as clean thermal invoice) */}
              <div
                ref={receiptSlipRef}
                className="bg-white text-zinc-900 p-5 sm:p-6 rounded-2xl border border-zinc-200/90 shadow-sm max-w-sm mx-auto font-sans"
              >
                {/* Header */}
                <div className="text-center pb-3 border-b border-dashed border-zinc-300">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-2 border ${isParlour ? 'bg-pink-50 text-pink-600 border-pink-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                    {isParlour ? <Sparkles className="w-5 h-5" /> : <UtensilsCrossed className="w-5 h-5" />}
                  </div>
                  <h3 className="text-sm sm:text-base font-black tracking-tight text-zinc-950 uppercase">
                    {receiptOrderRecord?.businessName || clientUser?.businessName || 'MenuSnap'}
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mt-0.5">
                    Official Payment Receipt
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 text-[11px] font-mono font-bold text-zinc-800 border border-zinc-200">
                    <span>#{receiptOrderRecord?.orderId || receiptIncome?.order_id || `REC-${receiptIncome?.id || ''}`}</span>
                  </div>
                </div>

                {/* Details */}
                <div className="py-3 border-b border-dashed border-zinc-300 text-xs space-y-1.5">
                  <div className="flex justify-between items-center text-zinc-600">
                    <span>Date & Time</span>
                    <span className="font-mono text-zinc-900 font-medium text-[11px]">
                      {receiptOrderRecord?.createdAt
                        ? (() => {
                            try {
                              const p = parseISO(receiptOrderRecord.createdAt);
                              return isValid(p) ? format(p, 'dd MMM yyyy, hh:mm a') : receiptOrderRecord.createdAt;
                            } catch {
                              return receiptOrderRecord.createdAt;
                            }
                          })()
                        : formatAccountDate(receiptIncome?.date || new Date().toISOString())}
                    </span>
                  </div>

                  {(receiptOrderRecord?.customerName || receiptIncome?.customer_name) && (
                    <div className="flex justify-between items-center text-zinc-600">
                      <span>Customer</span>
                      <span className="font-semibold text-zinc-900">
                        {receiptOrderRecord?.customerName || receiptIncome?.customer_name}
                      </span>
                    </div>
                  )}

                  {(receiptOrderRecord?.customerPhone || receiptIncome?.customer_phone) && (
                    <div className="flex justify-between items-center text-zinc-600">
                      <span>Phone</span>
                      <span className="font-mono font-semibold text-zinc-900">
                        {receiptOrderRecord?.customerPhone || receiptIncome?.customer_phone}
                      </span>
                    </div>
                  )}

                  {(receiptOrderRecord?.tableNumber || receiptIncome?.table_number) && (
                    <div className="flex justify-between items-center text-zinc-600">
                      <span>Table No.</span>
                      <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-[11px] border border-orange-200/50">
                        Table {receiptOrderRecord?.tableNumber || receiptIncome?.table_number}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-zinc-600">
                    <span>Payment Method</span>
                    <span className="font-medium text-zinc-900">
                      {receiptIncome?.payment_method_name || 'Cash'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-zinc-600">
                    <span>Status</span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Paid / Completed
                    </span>
                  </div>
                </div>

                {/* Items Breakdown */}
                <div className="py-3 border-b border-dashed border-zinc-300">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Order Items / Description
                  </div>
                  {receiptOrderRecord?.items && receiptOrderRecord.items.length > 0 ? (
                    <div className="space-y-1.5">
                      {receiptOrderRecord.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-start text-xs">
                          <div className="flex-1 pr-2">
                            <span className="font-medium text-zinc-900">{it.name}</span>
                            <span className="text-zinc-400 text-[11px] ml-1.5 font-mono">x{it.quantity || 1}</span>
                          </div>
                          <span className="font-mono font-semibold text-zinc-900">
                            ৳{(Number(it.price) * (Number(it.quantity) || 1)).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-between items-start text-xs">
                      <span className="font-medium text-zinc-900">
                        {receiptIncome?.service_name || receiptIncome?.note || 'Food & Beverage Order'}
                      </span>
                      <span className="font-mono font-semibold text-zinc-900">
                        ৳{Number(receiptIncome?.amount || 0).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {(receiptOrderRecord?.specialNote || (receiptIncome?.note && !receiptOrderRecord)) && (
                    <div className="mt-2 text-[11px] bg-zinc-50 p-2 rounded-lg text-zinc-600 italic border border-zinc-100">
                      Note: {receiptOrderRecord?.specialNote || receiptIncome?.note}
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="py-3 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-zinc-900">Total Bill</span>
                  <span className="text-xl font-black text-emerald-600 font-mono">
                    ৳{Number(receiptOrderRecord?.totalAmount || receiptIncome?.amount || 0).toLocaleString()}
                  </span>
                </div>

                {/* Footer Branding */}
                <div className="pt-3 border-t border-dashed border-zinc-300 text-center">
                  <p className="text-xs font-semibold text-zinc-800">
                    {isParlour ? 'Thank you for visiting us!' : 'Thank you for dining with us!'}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-0.5 font-medium">Powered by MenuSnap</p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="space-y-2 pt-2">
                <Button
                  type="button"
                  onClick={handleDownloadReceiptImage}
                  disabled={isDownloadingReceipt}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold h-11 rounded-xl gap-2 shadow-md transition-all active:scale-[0.99]"
                >
                  {isDownloadingReceipt ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                  )}
                  <span>{isDownloadingReceipt ? 'Generating Receipt Image...' : 'Download Receipt (PNG)'}</span>
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  {(receiptOrderRecord?.customerPhone || receiptIncome?.customer_phone) ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const raw = (receiptOrderRecord?.customerPhone || receiptIncome?.customer_phone || '').replace(/\D/g, '');
                        const cleanPhone = raw.startsWith('880') ? raw : (raw.startsWith('0') ? '88' + raw : '880' + raw);
                        const refId = receiptOrderRecord?.orderId || receiptIncome?.order_id || '';
                        const msg = `Hello! Here is your verified receipt #${refId} from ${clientUser?.businessName || 'our restaurant'} for ৳${receiptOrderRecord?.totalAmount || receiptIncome?.amount}.`;
                        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                      className="text-xs font-semibold gap-1.5 h-10 rounded-xl border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>WhatsApp Customer</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => window.print()}
                      className="text-xs font-semibold gap-1.5 h-10 rounded-xl"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Receipt</span>
                    </Button>
                  )}

                  {(receiptOrderRecord?.orderId || receiptIncome?.order_id) ? (
                    <Button
                      type="button"
                      variant="outline"
                      asChild
                      className="text-xs font-semibold gap-1.5 h-10 rounded-xl"
                    >
                      <Link href={`/order-receipt/${receiptOrderRecord?.orderId || receiptIncome?.order_id}`} target="_blank">
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Public Link</span>
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsReceiptOpen(false)}
                      className="text-xs font-semibold h-10 rounded-xl"
                    >
                      Close
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
