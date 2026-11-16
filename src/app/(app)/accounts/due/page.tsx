'use client';

import { AccountsMobileCards } from '@/components/accounts/AccountsTopNavbar';

import { useState, useEffect, useTransition, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useClientAuth } from '@/hooks/use-client-auth';
import { usePreferences } from '@/context/PreferencesContext';
import { AccountsGate } from '@/components/accounts/AccountsGate';
import { formatCurrency, formatAccountDate, sanitizeBdPhone, isValidBdPhone, formatBdPhone } from '@/lib/accounts/helpers';
import {
  getCustomersDueAction,
  createCustomerDueAction,
  updateCustomerDueAction,
  deleteCustomerDueAction,
  collectCustomerDuePaymentAction,
  reverseCustomerPaymentAction,
  getCustomerDueDetailsAction,
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
  Clock,
  Plus,
  Search,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Calendar,
  History,
  RotateCcw,
  Edit2,
  Trash2,
  Loader2,
  User,
  Phone,
  Scissors,
  CreditCard,
  Sparkles,
  Printer,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowLeft,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function CustomerDuePage() {
  return (
    <AccountsGate>
      <DueContent />
    </AccountsGate>
  );
}

function DueContent() {
  const { clientUser } = useClientAuth();
  const { t, currencySymbol } = usePreferences();
  const restaurantId = clientUser?.id ? String(clientUser.id) : (clientUser?.businessName || '');
  const isParlour = clientUser?.type === 'parlour';

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid'>('all');
  const [search, setSearch] = useState<string>('');

  // Data states
  const [dues, setDues] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ totalDue: 0, totalAdvance: 0, totalPaid: 0, pendingCount: 0 });
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

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDue, setSelectedDue] = useState<any>(null);
  const [dueDetails, setDueDetails] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Add Due Form State
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formServiceId, setFormServiceId] = useState('');
  const [formTotalAmount, setFormTotalAmount] = useState('');
  const [formAdvancePaid, setFormAdvancePaid] = useState('');
  const [formAdvancePmId, setFormAdvancePmId] = useState('1');
  const [formDueDate, setFormDueDate] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Collect Payment Form State
  const [collectAmount, setCollectAmount] = useState('');
  const [collectDate, setCollectDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [collectPmId, setCollectPmId] = useState('1');
  const [collectNote, setCollectNote] = useState('');
  const [collectError, setCollectError] = useState<string | null>(null);

  // Edit Due Form State
  const [editTotalAmount, setEditTotalAmount] = useState('');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editServiceId, setEditServiceId] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch dues and lookups
  const fetchData = useCallback(async () => {
    if (!restaurantId || !isParlour) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [dueRes, servRes, pmRes]: any = await Promise.all([
        getCustomersDueAction(restaurantId, {
          status: statusFilter,
          search: search.trim() || undefined,
          page: currentPage,
          limit: 10,
        }),
        getServicesAction(restaurantId),
        getPaymentMethodsAction(restaurantId),
      ]);

      if (dueRes.success && dueRes.data) {
        setDues(dueRes.data);
        if (dueRes.summary) setSummary(dueRes.summary);
        if (dueRes.pagination) {
          setTotalPages(dueRes.pagination.totalPages || 1);
          setTotalCount(dueRes.pagination.total || 0);
        }
      }
      if (servRes.success && servRes.data) {
        setServices(servRes.data);
      }
      if (pmRes.success && pmRes.data) {
        setPaymentMethods(pmRes.data);
      }
    } catch (err) {
      console.error('Failed to load customer dues:', err);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, isParlour, statusFilter, search, currentPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
  };

  // Open Add Due Modal
  const handleOpenAdd = () => {
    setFormCustomerName('');
    setFormPhone('');
    setFormServiceId('');
    setFormTotalAmount('');
    setFormAdvancePaid('');
    setFormAdvancePmId(paymentMethods[0]?.id ? String(paymentMethods[0].id) : '1');
    setFormDueDate('');
    setFormNote('');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Create Due
  const handleCreateDue = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = Number(formTotalAmount);
    if (isNaN(total) || total <= 0) {
      setFormError(t('invalidAmount', 'Total amount must be greater than 0.'));
      return;
    }
    const advance = formAdvancePaid ? Number(formAdvancePaid) : 0;
    if (isNaN(advance) || advance < 0) {
      setFormError(t('invalidAdvance', 'Advance cannot be negative.'));
      return;
    }
    if (advance > total) {
      setFormError(t('advanceExceedsTotal', 'Advance cannot exceed total amount.'));
      return;
    }

    if (formPhone && !isValidBdPhone(formPhone)) {
      setFormError('Phone number must be a valid 11-digit Bangladeshi mobile number starting with 01 (e.g. 017XXXXXXXX).');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await createCustomerDueAction(restaurantId, {
        customer_name: formCustomerName,
        phone: formPhone ? formatBdPhone(formPhone) : null,
        service_id: formServiceId && formServiceId !== 'custom' ? Number(formServiceId) : null,
        total_amount: total,
        advance_paid: advance,
        advance_payment_method_id: advance > 0 ? Number(formAdvancePmId) : null,
        due_date: formDueDate || null,
        note: formNote || null,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to record customer due.');
        setIsSubmitting(false);
        return;
      }

      setIsAddModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to record customer due.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Collect Modal
  const handleOpenCollect = (due: any) => {
    setSelectedDue(due);
    setCollectAmount(String(due.due_amount));
    setCollectDate(new Date().toISOString().slice(0, 10));
    setCollectPmId(paymentMethods[0]?.id ? String(paymentMethods[0].id) : '1');
    setCollectNote('');
    setCollectError(null);
    setIsCollectModalOpen(true);
  };

  // Submit Collect Payment
  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDue) return;
    const amount = Number(collectAmount);
    if (isNaN(amount) || amount <= 0) {
      setCollectError(t('invalidAmount', 'Payment amount must be greater than 0.'));
      return;
    }
    if (amount > Number(selectedDue.due_amount)) {
      setCollectError(
        `${t('amountExceedsDue', 'Amount exceeds remaining due balance')} (${formatCurrency(selectedDue.due_amount, currencySymbol)})`
      );
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (collectDate > today) {
      setCollectError(t('futureDateError', 'Payment date cannot be in the future.'));
      return;
    }

    setIsSubmitting(true);
    setCollectError(null);
    try {
      const res = await collectCustomerDuePaymentAction(restaurantId, selectedDue.id, {
        amount,
        payment_method_id: Number(collectPmId),
        date: collectDate,
        note: collectNote || null,
      });

      if (!res.success) {
        setCollectError(res.error || 'Failed to collect payment.');
        setIsSubmitting(false);
        return;
      }

      setIsCollectModalOpen(false);
      fetchData();
    } catch (err: any) {
      setCollectError(err?.message || 'Failed to collect payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollPosRef = useRef<number>(0);

  // Open Payment History & Reversals Modal / Mobile Detail View
  const handleOpenHistory = async (due: any) => {
    scrollPosRef.current = typeof window !== 'undefined' ? window.scrollY : 0;
    setSelectedDue(due);
    setDueDetails(null);
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res: any = await getCustomerDueDetailsAction(restaurantId, due.id);
      if (res.success && res.data) {
        setDueDetails(res.data);
      }
    } catch (err) {
      console.error('Failed to load due details:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCloseHistory = () => {
    setIsHistoryModalOpen(false);
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: scrollPosRef.current, behavior: 'instant' });
      }
    }, 10);
  };

  // Reverse Payment
  const handleReversePayment = async (paymentId: number) => {
    if (!selectedDue) return;
    if (!confirm(t('confirmReverseNotice', 'Are you sure you want to reverse this payment? This will restore the customer due balance and remove the associated income entry.'))) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await reverseCustomerPaymentAction(restaurantId, paymentId);
      if (!res.success) {
        alert(res.error || 'Failed to reverse payment.');
        setIsSubmitting(false);
        return;
      }

      const refreshed: any = await getCustomerDueDetailsAction(restaurantId, selectedDue.id);
      if (refreshed.success && refreshed.data) {
        setDueDetails(refreshed.data);
        setSelectedDue(refreshed.data.due);
      }
      fetchData();
    } catch (err: any) {
      alert(err?.message || 'Failed to reverse payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Due Modal
  const handleOpenEdit = (due: any) => {
    setSelectedDue(due);
    setEditCustomerName(due.customer_name || '');
    setEditPhone(sanitizeBdPhone(due.phone || ''));
    setEditServiceId(due.service_id ? String(due.service_id) : '');
    setEditTotalAmount(String(due.total_amount));
    setEditDueDate(due.due_date ? String(due.due_date).slice(0, 10) : '');
    setEditNote(due.note || '');
    setEditError(null);
    setIsEditModalOpen(true);
  };

  // Update Due
  const handleUpdateDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDue) return;
    const total = Number(editTotalAmount);
    if (isNaN(total) || total <= 0) {
      setEditError(t('invalidAmount', 'Total amount must be greater than 0.'));
      return;
    }
    const totalPaid = Number(selectedDue.total_paid) || 0;
    if (total < totalPaid) {
      setEditError(
        `${t('totalLessThanPaid', 'Total amount cannot be less than total collected so far')} (${formatCurrency(totalPaid, currencySymbol)})`
      );
      return;
    }

    if (editPhone && !isValidBdPhone(editPhone)) {
      setEditError('Phone number must be a valid 11-digit Bangladeshi mobile number starting with 01 (e.g. 017XXXXXXXX).');
      return;
    }

    setIsSubmitting(true);
    setEditError(null);
    try {
      const res = await updateCustomerDueAction(restaurantId, selectedDue.id, {
        customer_name: editCustomerName,
        phone: editPhone ? formatBdPhone(editPhone) : null,
        service_id: editServiceId && editServiceId !== 'custom' ? Number(editServiceId) : null,
        total_amount: total,
        due_date: editDueDate || null,
        note: editNote || null,
      });

      if (!res.success) {
        setEditError(res.error || 'Failed to update customer due.');
        setIsSubmitting(false);
        return;
      }

      setIsEditModalOpen(false);
      fetchData();
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update customer due.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Delete Due Modal
  const handleOpenDelete = (due: any) => {
    setSelectedDue(due);
    setIsDeleteModalOpen(true);
  };

  // Delete Due
  const handleDeleteDue = async () => {
    if (!selectedDue) return;
    setIsSubmitting(true);
    try {
      const res = await deleteCustomerDueAction(restaurantId, selectedDue.id);
      if (!res.success) {
        alert(res.error || 'Failed to delete customer due.');
        setIsSubmitting(false);
        return;
      }
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete customer due.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isParlour) {
    return (
      <div className="flex flex-col min-h-screen bg-background pb-32 sm:pb-20 md:pb-12 space-y-4 sm:space-y-6 p-3 sm:p-6 lg:p-8 xl:p-10 w-full max-w-full overflow-x-hidden min-w-0 print:p-0 print:m-0 print:w-full print:max-w-5xl print:mx-auto print:space-y-4">
        <div className="flex flex-col gap-3 pb-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-[#FF5A36]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {t('customerDue', 'Customer Due')}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('dueSubtitle', 'Manage salon client payables, advance booking deposits, and installment collections.')}
              </p>
        </div>
          </div>
        </div>

        <Card className="rounded-3xl border border-border/60 p-8 sm:p-12 text-center bg-card max-w-2xl mx-auto my-8">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-[#FF5A36] flex items-center justify-center mx-auto">
              <Scissors className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              {t('parlourOnlyFeature', 'Parlour Accounts Feature')}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {t(
                'dueParlourOnlyNotice',
                'Customer Due & Accounts Receivable tracking is available for Parlour accounts.'
              )}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const hasActiveFilters = Boolean(search || statusFilter !== 'all');

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32 sm:pb-20 md:pb-12 space-y-3.5 sm:space-y-6 p-2.5 xs:p-3.5 sm:p-6 lg:p-8 xl:p-10 w-full max-w-full overflow-x-hidden min-w-0">
      {/* Header Section */}
      <div className="flex flex-col gap-3 pb-4 border-b border-border/40 w-full min-w-0 max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-orange-500/10 text-[#FF5A36]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {t('customerDue', 'Customer Due')}
                </h1>
                <Badge className="bg-gradient-to-r from-[#FF5A36] to-orange-500 text-white font-bold text-[10px] py-0.5 px-2.5 rounded-full border-none shadow-xs">
                  {t('receivablesLedger', 'Receivables Ledger')}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {clientUser?.businessName ? `${clientUser.businessName} • ` : ''}
                {t('dueSubtitle', 'Manage salon client payables, advance booking deposits, and installment collections.')}
              </p>
            </div>
          </div>

          <Button
            onClick={handleOpenAdd}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#FF5A36] to-orange-500 hover:from-[#e04b2a] hover:to-orange-600 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm shadow-orange-500/20 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{t('recordCustomerDue', 'New Due Entry')}</span>
          </Button>
        </div>
      </div>

      {/* 1. Status Filter Bar & Actions — unified toolbar */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 p-1.5 sm:p-2 rounded-2xl bg-muted/30 border border-border/50 shadow-xs w-full min-w-0 max-w-full print:hidden">
        {/* Presets Row: status tabs */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none [touch-action:pan-x] w-full sm:w-auto min-w-0 py-0.5">
          {(['all', 'unpaid', 'partial', 'paid'] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setCurrentPage(1);
              }}
              className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap shrink-0 ${
                statusFilter === s
                  ? 'bg-[#FF5A36] text-white shadow-sm shadow-orange-500/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/80'
              }`}
            >
              {t(s, s)}
            </button>
          ))}
        </div>

        {/* Divider (desktop only) */}
        <div className="hidden sm:block w-px h-6 bg-border/60 shrink-0" />

        {/* Actions: Print & Reports */}
        <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1 sm:justify-end min-w-0">
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

      {/* 2. Top Stat Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-5 w-full min-w-0 max-w-full">
        {/* Card 1: Total Due Balance */}
        <Card className="rounded-2xl border border-border/60 bg-card shadow-xs transition-all hover:shadow-md hover:border-amber-500/30 overflow-hidden group min-w-0">
          <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-yellow-400" />
          <div className="p-3.5 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                  {t('totalDueBalance', 'Total Due Balance')}
                </p>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-amber-600 dark:text-amber-400 mt-1.5 tracking-tight truncate">
                  {formatCurrency(summary.totalDue, currencySymbol)}
                </h3>
              </div>
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform shrink-0 ml-2">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3 flex items-center text-[11px] sm:text-xs text-muted-foreground font-medium truncate">
              <span>{summary.pendingCount} {t('unsettledClients', 'clients with pending dues')}</span>
            </div>
          </div>
        </Card>

        {/* Card 2: Advance Received */}
        <Card className="rounded-2xl border border-border/60 bg-card shadow-xs transition-all hover:shadow-md hover:border-purple-500/30 overflow-hidden group min-w-0">
          <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-indigo-400" />
          <div className="p-3.5 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                  {t('advanceDeposits', 'Advance Received')}
                </p>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground mt-1.5 tracking-tight truncate">
                  {formatCurrency(summary.totalAdvance, currencySymbol)}
                </h3>
              </div>
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform shrink-0 ml-2">
                <CreditCard className="w-5 h-5 text-purple-500" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3 flex items-center text-[11px] sm:text-xs text-muted-foreground font-medium truncate">
              <span>{t('advanceBookingDeposits', 'Booking advances logged as income')}</span>
            </div>
          </div>
        </Card>

        {/* Card 3: Total Collected */}
        <Card className="rounded-2xl border border-border/60 bg-card shadow-xs transition-all hover:shadow-md hover:border-emerald-500/30 overflow-hidden group min-w-0">
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="p-3.5 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                  {t('totalCollected', 'Total Collected')}
                </p>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 tracking-tight truncate">
                  {formatCurrency(summary.totalPaid, currencySymbol)}
                </h3>
              </div>
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform shrink-0 ml-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3 flex items-center text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-medium truncate">
              <span>{t('advancePlusCollections', 'Advances + installment settlements')}</span>
            </div>
          </div>
        </Card>

        {/* Card 4: Client Directory */}
        <Card className="rounded-2xl border border-border/60 bg-card shadow-xs transition-all hover:shadow-md hover:border-blue-500/30 overflow-hidden group min-w-0">
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-cyan-400" />
          <div className="p-3.5 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                  {t('clientDirectory', 'Client Records')}
                </p>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground mt-1.5 tracking-tight truncate">
                  {dues.length}
                </h3>
              </div>
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform shrink-0 ml-2">
                <User className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3 flex items-center text-[11px] sm:text-xs text-muted-foreground font-medium truncate">
              <span>{t('totalDueEntries', 'Total due records')}</span>
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
              placeholder={t('searchDuePlaceholder', 'Search by customer name, phone or note...')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-10 rounded-xl bg-muted/20 border-border/70 text-xs sm:text-sm w-full"
            />
          </div>

          <Button
            type="submit"
            variant="outline"
            className="h-10 px-3.5 rounded-xl border-border/70 text-xs font-semibold hover:bg-muted"
          >
            <Search className="w-3.5 h-3.5 mr-1.5" />
            <span>{t('search', 'Search')}</span>
          </Button>
        </form>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 text-xs border-t border-border/40">
            <span className="text-muted-foreground">
              Showing filtered results ({dues.length} record{dues.length === 1 ? '' : 's'})
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

      {/* 4. Customer Dues Table */}
      <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60 flex flex-row items-center justify-between">
          <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-500/10 text-[#FF5A36]">
              <Clock className="w-4 h-4" />
            </div>
            <span>{t('customerDuesLedger', 'Customer Dues Ledger')}</span>
            <Badge variant="outline" className="ml-1 text-[11px] font-semibold">
              {dues.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF5A36]" />
              <p className="text-xs text-muted-foreground">{t('loadingDues', 'Loading customer dues...')}</p>
            </div>
          ) : dues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 text-muted-foreground/60 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">{t('noDuesYet', 'No customer due records found')}</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {t('recordFirstDueNotice', 'Record client due bookings or packages with the button above.')}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card List (< md): Clean touch cards, 0 horizontal scroll */}
              <div className="md:hidden divide-y divide-border/50">
                {dues.map((due) => {
                  const hasPayments = Number(due.advance_paid) > 0 || Number(due.collected_installments) > 0;
                  const isFullyPaid = due.status === 'paid' || Number(due.due_amount) === 0;

                  return (
                    <div key={due.id} className="p-3.5 space-y-3 bg-card">
                      {/* Top: Customer & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-foreground text-sm leading-tight">{due.customer_name}</h4>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span className="font-medium text-foreground/80">{due.service_name || t('generalSales', 'General Service')}</span>
                            {due.phone && (
                              <span className="flex items-center gap-1 text-[11px]">
                                <Phone className="w-2.5 h-2.5 text-muted-foreground/60" />
                                {due.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge
                          className={`rounded-lg text-[10px] uppercase font-bold py-0.5 px-2 shrink-0 ${
                            due.status === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : due.status === 'partial'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                          }`}
                        >
                          {due.status}
                        </Badge>
                      </div>

                      {/* Amount Grid */}
                      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/40 text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">{t('totalAmount', 'Total')}</span>
                          <span className="font-semibold text-foreground">{formatCurrency(due.total_amount, currencySymbol)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">{t('paid', 'Paid')}</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(due.total_paid, currencySymbol)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">{t('remainingDue', 'Due')}</span>
                          <span className={`font-extrabold ${due.due_amount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                            {formatCurrency(due.due_amount, currencySymbol)}
                          </span>
                        </div>
                      </div>

                      {/* Due date if available */}
                      {due.due_date && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground/60" />
                          <span>Due Date: {formatAccountDate(due.due_date)}</span>
                        </div>
                      )}

                      {/* Action Buttons (at least 44px tap targets) */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          disabled={isFullyPaid}
                          onClick={() => handleOpenCollect(due)}
                          className="flex-1 min-h-[44px] h-11 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 active:scale-98 transition-all"
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          <span>{t('collect', 'Collect Payment')}</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenHistory(due)}
                          className="min-h-[44px] h-11 px-3 rounded-xl text-xs font-semibold border-border/70 text-foreground hover:bg-muted active:scale-98 transition-all flex items-center gap-1"
                          title={t('paymentHistory', 'Payment History & Reversals')}
                        >
                          <History className="w-4 h-4 text-[#FF5A36]" />
                          <span>History</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(due)}
                          className="min-h-[44px] w-11 p-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
                          title={t('edit', 'Edit Due Record')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={hasPayments}
                          onClick={() => handleOpenDelete(due)}
                          className="min-h-[44px] w-11 p-0 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
                          title={
                            hasPayments
                              ? t('deleteBlockedCollected', 'Cannot delete due: funds have already been collected')
                              : t('delete', 'Delete')
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
                    <th className="p-3.5 pl-6">{t('customer', 'Customer')}</th>
                    <th className="p-3.5">{t('service', 'Service')}</th>
                    <th className="p-3.5 text-right">{t('totalAmount', 'Total Amount')}</th>
                    <th className="p-3.5 text-right">{t('advance', 'Advance')}</th>
                    <th className="p-3.5 text-right">{t('paid', 'Paid')}</th>
                    <th className="p-3.5 text-right">{t('remainingDue', 'Due Balance')}</th>
                    <th className="p-3.5">{t('dueDate', 'Due Date')}</th>
                    <th className="p-3.5 text-center">{t('status', 'Status')}</th>
                    <th className="p-3.5 pr-6 text-right">{t('actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {dues.map((due) => {
                    const hasPayments = Number(due.advance_paid) > 0 || Number(due.collected_installments) > 0;
                    const isFullyPaid = due.status === 'paid' || Number(due.due_amount) === 0;

                    return (
                      <tr key={due.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-3.5 pl-6">
                          <div className="font-bold text-foreground">{due.customer_name}</div>
                          {due.phone && (
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5" />
                              {due.phone}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-foreground">
                            {due.service_name || t('generalSales', 'General Service')}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-medium text-foreground whitespace-nowrap">
                          {formatCurrency(due.total_amount, currencySymbol)}
                        </td>
                        <td className="p-3.5 text-right text-muted-foreground whitespace-nowrap">
                          {formatCurrency(due.advance_paid, currencySymbol)}
                        </td>
                        <td className="p-3.5 text-right text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                          {formatCurrency(due.total_paid, currencySymbol)}
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <span
                            className={`font-black text-sm ${
                              due.due_amount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                            }`}
                          >
                            {formatCurrency(due.due_amount, currencySymbol)}
                          </span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap text-muted-foreground">
                          {due.due_date ? formatAccountDate(due.due_date) : '—'}
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <Badge
                            className={`rounded-lg text-[10px] uppercase font-bold py-0.5 px-2 ${
                              due.status === 'paid'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : due.status === 'partial'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                            }`}
                          >
                            {due.status}
                          </Badge>
                        </td>
                        <td className="p-3.5 pr-6 text-right whitespace-nowrap">
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
                              {!isFullyPaid && (
                                <DropdownMenuItem
                                  onClick={() => handleOpenCollect(due)}
                                  className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 focus:text-emerald-600 focus:bg-emerald-500/10"
                                >
                                  <DollarSign className="w-3.5 h-3.5" />
                                  <span>{t('collectPayment', 'Collect Payment')}</span>
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={() => handleOpenHistory(due)}
                                className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium focus:bg-muted"
                              >
                                <History className="w-3.5 h-3.5" />
                                <span>{t('paymentHistory', 'Payment History')}</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleOpenEdit(due)}
                                className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium focus:bg-muted"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>{t('edit', 'Edit Due Record')}</span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator className="my-1 border-border/40" />

                              <DropdownMenuItem
                                disabled={hasPayments}
                                onClick={() => handleOpenDelete(due)}
                                className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-rose-600 focus:text-rose-600 focus:bg-rose-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{t('delete', 'Delete')}</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* 1. Modal: Record Customer Due (Create) - Bottom Sheet on mobile, Dialog on desktop */}
      <AccountsSheet open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <AccountsSheetContent className="overflow-y-auto max-h-[88vh]">
          <AccountsSheetHeader>
            <AccountsSheetTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              <span>{t('recordCustomerDue', 'New Customer Due')}</span>
            </AccountsSheetTitle>
            <AccountsSheetDescription>
              {t('recordDueDesc', 'Create an accounts receivable entry for a client package with optional advance deposit.')}
            </AccountsSheetDescription>
          </AccountsSheetHeader>

          <form onSubmit={handleCreateDue} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-semibold">{t('customerName', 'Customer Name')} *</Label>
              <Input
                type="text"
                placeholder="e.g. Farzana Chowdhury"
                value={formCustomerName}
                onChange={(e) => setFormCustomerName(e.target.value)}
                className="h-10 rounded-xl text-xs bg-muted/20"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-primary" /> {t('phone', 'Phone Number')}
                  </Label>
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
                    placeholder="e.g. 01712345678"
                    value={formPhone}
                    onChange={(e) => setFormPhone(sanitizeBdPhone(e.target.value))}
                    maxLength={11}
                    className="flex-1 bg-transparent px-3 text-xs outline-none font-mono text-foreground placeholder:text-muted-foreground placeholder:font-sans h-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t('service', 'Service')}</Label>
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
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t('totalAmount', 'Total Package Amount')} (৳) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 5000"
                  value={formTotalAmount}
                  onChange={(e) => setFormTotalAmount(e.target.value)}
                  className="h-10 rounded-xl text-xs bg-muted/20 placeholder:text-muted-foreground"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t('advanceDeposit', 'Advance Paid')} (৳)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 1000"
                  value={formAdvancePaid}
                  onChange={(e) => setFormAdvancePaid(e.target.value)}
                  className="h-10 rounded-xl text-xs bg-muted/20 placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {Number(formAdvancePaid) > 0 && (
              <div className="space-y-1 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                <Label className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                  {t('advancePaymentMethod', 'Advance Payment Method')} *
                </Label>
                <Select value={formAdvancePmId} onValueChange={setFormAdvancePmId}>
                  <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                    <SelectValue placeholder="Select Method" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.id} value={String(pm.id)}>
                        {pm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t('advanceIncomeNote', 'An income entry will be created automatically for this advance deposit.')}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t('dueDate', 'Due Settlement Date')}</Label>
                <Input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="h-10 rounded-xl text-xs bg-muted/20"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t('note', 'Note')}</Label>
                <Input
                  type="text"
                  placeholder="e.g. Bridal package, makeup booking..."
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="h-10 rounded-xl text-xs bg-muted/20"
                />
              </div>
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
                {t('save', 'Record Due')}
              </Button>
            </AccountsSheetFooter>
          </form>
        </AccountsSheetContent>
      </AccountsSheet>

      {/* 2. Modal: Collect Payment - Bottom Sheet on mobile, Dialog on desktop */}
      <AccountsSheet open={isCollectModalOpen} onOpenChange={setIsCollectModalOpen}>
        <AccountsSheetContent className="overflow-y-auto max-h-[88vh]">
          <AccountsSheetHeader>
            <AccountsSheetTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              <span>{t('collectPayment', 'Collect Due Payment')}</span>
            </AccountsSheetTitle>
            <AccountsSheetDescription>
              {selectedDue?.customer_name} — {t('remainingDue', 'Due Balance')}:{' '}
              <span className="font-bold text-foreground">
                {formatCurrency(selectedDue?.due_amount, currencySymbol)}
              </span>
            </AccountsSheetDescription>
          </AccountsSheetHeader>

          <form onSubmit={handleCollectPayment} className="space-y-4 pt-2">
            {collectError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{collectError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t('amount', 'Collection Amount')} (৳) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedDue?.due_amount}
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  className="h-10 rounded-xl text-xs bg-muted/20 font-bold text-emerald-600 dark:text-emerald-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t('paymentDate', 'Payment Date')} *</Label>
                <Input
                  type="date"
                  value={collectDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setCollectDate(e.target.value)}
                  className="h-10 rounded-xl text-xs bg-muted/20"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">{t('paymentMethod', 'Payment Method')} *</Label>
              <Select value={collectPmId} onValueChange={setCollectPmId}>
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

            <div className="space-y-1">
              <Label className="text-xs font-semibold">{t('note', 'Note')} (Optional)</Label>
              <Input
                type="text"
                placeholder="e.g. 2nd installment, final settlement..."
                value={collectNote}
                onChange={(e) => setCollectNote(e.target.value)}
                className="h-10 rounded-xl text-xs bg-muted/20"
              />
            </div>

            <AccountsSheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCollectModalOpen(false)}
                className="rounded-xl text-xs h-10 min-h-[44px]"
              >
                {t('cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl text-xs h-10 min-h-[44px] bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                {t('confirmCollection', 'Confirm Collection')}
              </Button>
            </AccountsSheetFooter>
          </form>
        </AccountsSheetContent>
      </AccountsSheet>

      {/* 3. Payment History & Reverse: Dedicated Mobile View (< md) + Desktop Dialog (>= md) */}
      {/* 3A. Mobile Dedicated Screen (< md) */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto flex flex-col md:hidden animate-in fade-in-0 duration-200">
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/70 px-4 py-3 flex items-center justify-between shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={handleCloseHistory}
              className="min-h-[44px] flex items-center gap-2 text-sm font-bold text-foreground hover:text-[#FF5A36] transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#FF5A36]" />
              <span>{t('backToDues', 'Back to Customer Dues')}</span>
            </button>
            <Badge variant="outline" className="text-xs font-semibold">
              {selectedDue?.customer_name}
            </Badge>
          </div>

          <div className="p-4 space-y-4 flex-1">
            <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t('customer', 'Customer')}</span>
                <span className="text-sm font-bold text-foreground">{selectedDue?.customer_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t('totalAmount', 'Total Package')}</span>
                <span className="text-sm font-bold text-foreground">{formatCurrency(selectedDue?.total_amount, currencySymbol)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t('totalPaid', 'Total Collected')}</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(selectedDue?.total_paid, currencySymbol)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <span className="text-xs font-bold text-foreground">{t('remainingDue', 'Due Balance')}</span>
                <span className="text-base font-black text-rose-600 dark:text-rose-400">{formatCurrency(selectedDue?.due_amount, currencySymbol)}</span>
              </div>
            </div>

            <div className="space-y-3">
              {historyLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#FF5A36]" />
                  <p className="text-xs">{t('loadingHistory', 'Loading payment history...')}</p>
                </div>
              ) : (
                <>
                  {Number(dueDetails?.due?.advance_paid) > 0 && (
                    <div className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] py-0 px-1.5 rounded">
                            Advance Deposit
                          </Badge>
                          <span className="text-xs font-bold text-foreground">
                            {formatCurrency(dueDetails.due.advance_paid, currencySymbol)}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Recorded on booking creation</p>
                      </div>
                    </div>
                  )}

                  {dueDetails?.payments && dueDetails.payments.length > 0 ? (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('installments', 'Installment Payments')} ({dueDetails.payments.length})
                      </Label>
                      <div className="divide-y divide-border/40 border border-border/60 rounded-xl overflow-hidden bg-card">
                        {dueDetails.payments.map((p: any) => (
                          <div key={p.id} className="p-3.5 flex items-center justify-between hover:bg-muted/20 transition-colors">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">
                                  {formatCurrency(p.amount, currencySymbol)}
                                </span>
                                <Badge variant="outline" className="text-[10px] py-0">
                                  {p.payment_method_name || 'Cash'}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {formatAccountDate(p.date)}
                                </span>
                              </div>
                              {p.note && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">{p.note}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isSubmitting}
                              onClick={() => handleReversePayment(p.id)}
                              className="min-h-[44px] px-2.5 rounded-xl text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title={t('reversePayment', 'Reverse this payment')}
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1" />
                              <span>{t('reverse', 'Reverse')}</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-muted-foreground text-xs rounded-xl border border-dashed border-border/60">
                      {t('noInstallmentsYet', 'No installment collections recorded yet.')}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3B. Desktop Dialog (>= md) */}
      <div className="hidden md:block">
        <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
          <DialogContent className="max-w-lg w-[95vw] sm:w-full rounded-2xl p-4 sm:p-6 bg-card border border-border/80 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <History className="w-5 h-5 text-orange-500" />
                {t('paymentHistory', 'Payment History & Reversals')}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {selectedDue?.customer_name} — Total: {formatCurrency(selectedDue?.total_amount, currencySymbol)} | Due: {formatCurrency(selectedDue?.due_amount, currencySymbol)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              {historyLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#FF5A36]" />
                  <p className="text-xs">{t('loadingHistory', 'Loading payment history...')}</p>
                </div>
              ) : (
                <>
                  {Number(dueDetails?.due?.advance_paid) > 0 && (
                    <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] py-0 px-1.5 rounded">
                            Advance Deposit
                          </Badge>
                          <span className="text-xs font-semibold text-foreground">
                            {formatCurrency(dueDetails.due.advance_paid, currencySymbol)}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Recorded on creation
                        </p>
                      </div>
                    </div>
                  )}

                  {dueDetails?.payments && dueDetails.payments.length > 0 ? (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('installments', 'Installment Payments')} ({dueDetails.payments.length})
                      </Label>
                      <div className="divide-y divide-border/40 border border-border/60 rounded-xl overflow-hidden bg-muted/10">
                        {dueDetails.payments.map((p: any) => (
                          <div key={p.id} className="p-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">
                                  {formatCurrency(p.amount, currencySymbol)}
                                </span>
                                <Badge variant="outline" className="text-[10px] py-0">
                                  {p.payment_method_name || 'Cash'}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {formatAccountDate(p.date)}
                                </span>
                              </div>
                              {p.note && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">{p.note}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isSubmitting}
                              onClick={() => handleReversePayment(p.id)}
                              className="h-7 px-2 rounded-lg text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title={t('reversePayment', 'Reverse this payment')}
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              {t('reverse', 'Reverse')}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground text-xs">
                      {t('noInstallmentsYet', 'No installment collections recorded yet.')}
                    </div>
                  )}
                </>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsHistoryModalOpen(false)}
                className="rounded-xl text-xs h-9"
              >
                {t('close', 'Close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 4. Modal: Edit Due Record - Bottom Sheet on mobile, Dialog on desktop */}
      <AccountsSheet open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <AccountsSheetContent className="overflow-y-auto max-h-[88vh]">
          <AccountsSheetHeader>
            <AccountsSheetTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-orange-500" />
              <span>{t('editDue', 'Edit Due Record')}</span>
            </AccountsSheetTitle>
          </AccountsSheetHeader>

          <form onSubmit={handleUpdateDue} className="space-y-4 pt-2">
            {editError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-semibold">{t('customerName', 'Customer Name')} *</Label>
              <Input
                type="text"
                value={editCustomerName}
                onChange={(e) => setEditCustomerName(e.target.value)}
                className="h-10 rounded-xl text-xs bg-muted/20"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-primary" /> {t('phone', 'Phone Number')}
                  </Label>
                  <span className={`text-[10px] font-mono font-bold ${editPhone.length === 11 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {editPhone.length}/11
                  </span>
                </div>
                <div className="flex rounded-xl border border-input bg-muted/20 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary overflow-hidden h-10 transition-all">
                  <span className="inline-flex items-center px-3 bg-muted/70 text-foreground font-mono font-bold text-xs border-r border-border/60 select-none">
                    +88
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="e.g. 01712345678"
                    value={editPhone}
                    onChange={(e) => setEditPhone(sanitizeBdPhone(e.target.value))}
                    maxLength={11}
                    className="flex-1 bg-transparent px-3 text-xs outline-none font-mono text-foreground placeholder:text-muted-foreground placeholder:font-sans h-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t('service', 'Service')}</Label>
                <Select value={editServiceId} onValueChange={setEditServiceId}>
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
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t('totalAmount', 'Total Amount')} (৳) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 5000"
                  value={editTotalAmount}
                  onChange={(e) => setEditTotalAmount(e.target.value)}
                  className="h-10 rounded-xl text-xs bg-muted/20 placeholder:text-muted-foreground"
                  required
                />
                <p className="text-[10px] text-muted-foreground">
                  Must be &ge; collected so far ({formatCurrency(selectedDue?.total_paid, currencySymbol)})
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t('dueDate', 'Due Date')}</Label>
                <Input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="h-10 rounded-xl text-xs bg-muted/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">{t('note', 'Note')}</Label>
              <Input
                type="text"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
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
                {t('update', 'Update Due')}
              </Button>
            </AccountsSheetFooter>
          </form>
        </AccountsSheetContent>
      </AccountsSheet>

      {/* 5. Modal: Delete Due Confirmation - Bottom Sheet on mobile, Dialog on desktop */}
      <AccountsSheet open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AccountsSheetContent className="overflow-y-auto max-h-[85vh]">
          <AccountsSheetHeader>
            <AccountsSheetTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{t('confirmDeleteDue', 'Delete Due Record?')}</span>
            </AccountsSheetTitle>
            <AccountsSheetDescription>
              {Number(selectedDue?.advance_paid) > 0 || Number(selectedDue?.collected_installments) > 0 ? (
                <span className="text-destructive font-semibold">
                  {t('cannotDeleteNotice', 'Cannot delete this record: payments have already been received. Please reverse all payments first if entered in error.')}
                </span>
              ) : (
                t('deleteDueConfirmDesc', 'Are you sure you want to delete this zero-collection due record? This action cannot be undone.')
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
              disabled={isSubmitting || Number(selectedDue?.advance_paid) > 0 || Number(selectedDue?.collected_installments) > 0}
              onClick={handleDeleteDue}
              className="rounded-xl text-xs h-10 min-h-[44px] font-bold"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              {t('delete', 'Delete')}
            </Button>
          </AccountsSheetFooter>
        </AccountsSheetContent>
      </AccountsSheet>
    </div>
  );
}
