'use client';

import {
  AccountsSheet,
  AccountsSheetContent,
  AccountsSheetHeader,
  AccountsSheetTitle,
  AccountsSheetDescription,
  AccountsSheetFooter,
} from '@/components/accounts/AccountsSheet';

import { useEffect, useState, useTransition, useCallback } from 'react';
import Image from 'next/image';
import { AccountsGate } from '@/components/accounts/AccountsGate';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { usePreferences } from '@/context/PreferencesContext';
import { useClientAuth } from '@/hooks/use-client-auth';
import {
  getExpensesAction,
  createExpenseAction,
  updateExpenseAction,
  deleteExpenseAction,
  getExpenseCategoriesAction,
  getPaymentMethodsAction,
  createExpenseCategoryAction,
  updateExpenseCategoryAction,
  deleteExpenseCategoryAction,
  exportExpensesCsvAction,
} from '@/app/actions/accounts';
import { uploadFileLocally } from '@/app/actions/uploads';
import { formatCurrency, formatAccountDate } from '@/lib/accounts/helpers';
import {
  Receipt,
  PlusCircle,
  Filter,
  Search,
  Download,
  Calendar,
  Tag,
  CreditCard,
  Edit2,
  Trash2,
  Eye,
  X,
  UploadCloud,
  TrendingUp,
  FolderPlus,
  Loader2,
  Lock,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  MoreHorizontal,
} from 'lucide-react';

interface ExpenseItem {
  id: number;
  restaurant_id: string;
  date: string;
  category_id: number;
  category_name?: string;
  category_type?: string;
  amount: number;
  payment_method_id: number;
  payment_method_name?: string;
  vendor_id?: number | null;
  staff_id?: number | null;
  description?: string;
  attachment?: string;
  created_by?: string;
  created_at: string;
}

interface SummaryData {
  todayTotal: number;
  monthTotal: number;
  topCategory: string;
  topCategoryAmount: number;
}

export default function ExpensesPage() {
  const { t } = usePreferences();
  const { clientUser } = useClientAuth();

  // Primary data states
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([
    { id: 1, name: 'Cash' },
    { id: 2, name: 'bKash' },
    { id: 3, name: 'Nagad' },
    { id: 4, name: 'Bank' },
    { id: 5, name: 'Card' },
  ]);
  const [summary, setSummary] = useState<SummaryData>({
    todayTotal: 0,
    monthTotal: 0,
    topCategory: 'N/A',
    topCategoryAmount: 0,
  });

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<'restaurant' | 'parlour' | null>(null);
  const isParlour = (businessType || clientUser?.type) === 'parlour';

  // Add / Edit Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [formDate, setFormDate] = useState<string>('');
  const [formCategoryId, setFormCategoryId] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formPaymentMethodId, setFormPaymentMethodId] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formAttachment, setFormAttachment] = useState<string>('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation state
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Category Manager Modal state
  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('variable');
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [catManagerError, setCatManagerError] = useState<string | null>(null);

  // Lightbox Receipt Preview state
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const restaurantId = clientUser?.id || clientUser?.businessName || '';

  // Load Categories & Payment Methods
  const loadMetadata = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const [catRes, pmRes] = await Promise.all([
        getExpenseCategoriesAction(restaurantId),
        getPaymentMethodsAction(restaurantId),
      ]);
      if (catRes.success) {
        setCategories(catRes.data || []);
        if ((catRes as any).businessType) setBusinessType((catRes as any).businessType);
      }
      if (pmRes.success) setPaymentMethods(pmRes.data || []);
    } catch (err) {
      console.error('Failed to load categories/payment methods:', err);
    }
  }, [restaurantId]);

  // Load Expenses List & Top Summary
  const loadExpenses = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await getExpensesAction({
        restaurantId,
        search,
        categoryId: selectedCategory,
        paymentMethodId: selectedPaymentMethod,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page: currentPage,
        limit: 10,
      });

      if (res.success) {
        setExpenses(res.data || []);
        if ((res as any).businessType) setBusinessType((res as any).businessType);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.total || 0);
        }
        if (res.summary) {
          setSummary(res.summary);
        }
      } else {
        setErrorMessage(res.error || 'Failed to load expenses');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error occurred while fetching expenses');
    } finally {
      setIsLoading(false);
    }
  }, [
    restaurantId,
    search,
    selectedCategory,
    selectedPaymentMethod,
    fromDate,
    toDate,
    currentPage,
  ]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Reset page when filter changes
  const handleFilterChange = (setter: (val: any) => void, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedPaymentMethod('all');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    search || selectedCategory !== 'all' || selectedPaymentMethod !== 'all' || fromDate || toDate
  );

  // Open Add Dialog
  const handleOpenAdd = () => {
    setEditingExpense(null);
    const today = new Date().toISOString().split('T')[0];
    setFormDate(today);
    setFormCategoryId(categories[0]?.id ? String(categories[0].id) : '');
    setFormAmount('');
    setFormPaymentMethodId(paymentMethods[0]?.id ? String(paymentMethods[0].id) : '');
    setFormDescription('');
    setFormAttachment('');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (expense: ExpenseItem) => {
    setEditingExpense(expense);
    setFormDate(expense.date);
    setFormCategoryId(String(expense.category_id));
    setFormAmount(String(expense.amount));
    setFormPaymentMethodId(String(expense.payment_method_id));
    setFormDescription(expense.description || '');
    setFormAttachment(expense.attachment || '');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Handle Receipt Upload (Max 2MB, JPG/PNG/WebP)
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size <= 2MB
    if (file.size > 2 * 1024 * 1024) {
      setFormError('Receipt image must be smaller than 2MB.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setFormError('Receipt must be a JPG, PNG, or WebP image.');
      return;
    }

    setUploadingReceipt(true);
    setFormError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadFileLocally(formData, 'receipts');
      if (res.success && res.data?.url) {
        setFormAttachment(res.data.url);
      } else {
        const errorMsg = 'message' in res ? res.message : undefined;
        setFormError(errorMsg || 'Failed to upload receipt image.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Failed to upload receipt image.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  // Submit Expense Form (Add or Edit)
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const numAmount = parseFloat(formAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid amount greater than 0.');
      return;
    }

    if (!formDate) {
      setFormError('Date is required.');
      return;
    }

    if (!formCategoryId) {
      setFormError('Please select a category.');
      return;
    }

    if (!formPaymentMethodId) {
      setFormError('Please select a payment method.');
      return;
    }

    startTransition(async () => {
      try {
        if (editingExpense) {
          const res = await updateExpenseAction(restaurantId, editingExpense.id, {
            date: formDate,
            category_id: formCategoryId,
            amount: numAmount,
            payment_method_id: formPaymentMethodId,
            description: formDescription,
            attachment: formAttachment,
          });
          if (res.success) {
            setIsFormOpen(false);
            loadExpenses();
          } else {
            setFormError(res.error || 'Failed to update expense.');
          }
        } else {
          const res = await createExpenseAction(restaurantId, {
            date: formDate,
            category_id: formCategoryId,
            amount: numAmount,
            payment_method_id: formPaymentMethodId,
            description: formDescription,
            attachment: formAttachment,
            created_by: String(clientUser?.email || clientUser?.businessName || 'admin'),
          });
          if (res.success) {
            setIsFormOpen(false);
            loadExpenses();
          } else {
            setFormError(res.error || 'Failed to create expense.');
          }
        }
      } catch (err: any) {
        setFormError(err?.message || 'An error occurred while saving.');
      }
    });
  };

  // Confirm Delete Expense
  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const res = await deleteExpenseAction(restaurantId, deleteTargetId);
      if (res.success) {
        setDeleteTargetId(null);
        loadExpenses();
      } else {
        alert(res.error || 'Failed to delete expense.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error deleting expense.');
    } finally {
      setIsDeleting(false);
    }
  };

  // CSV Export
  const handleExportCsv = async () => {
    try {
      const res = await exportExpensesCsvAction({
        restaurantId,
        search,
        categoryId: selectedCategory,
        paymentMethodId: selectedPaymentMethod,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });

      if (res.success && res.csv) {
        const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', res.filename || 'expenses.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert(res.error || 'Failed to export CSV.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error generating CSV.');
    }
  };

  // Add Category Handler
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatManagerError(null);
    try {
      const res = await createExpenseCategoryAction(restaurantId, {
        name: newCatName.trim(),
        type: newCatType,
      });
      if (res.success) {
        setNewCatName('');
        loadMetadata();
      } else {
        setCatManagerError(res.error || 'Failed to add category.');
      }
    } catch (err: any) {
      setCatManagerError(err?.message || 'Error adding category.');
    }
  };

  // Rename Category Handler
  const handleUpdateCategory = async (catId: number) => {
    if (!editingCatName.trim()) return;
    setCatManagerError(null);
    try {
      const res = await updateExpenseCategoryAction(restaurantId, catId, {
        name: editingCatName.trim(),
      });
      if (res.success) {
        setEditingCatId(null);
        setEditingCatName('');
        loadMetadata();
      } else {
        setCatManagerError(res.error || 'Failed to rename category.');
      }
    } catch (err: any) {
      setCatManagerError(err?.message || 'Error updating category.');
    }
  };

  // Delete Category Handler
  const handleDeleteCategory = async (catId: number) => {
    setCatManagerError(null);
    try {
      const res = await deleteExpenseCategoryAction(restaurantId, catId);
      if (res.success) {
        loadMetadata();
      } else {
        setCatManagerError(res.error || 'Cannot delete category.');
      }
    } catch (err: any) {
      setCatManagerError(err?.message || 'Error deleting category.');
    }
  };

  return (
    <AccountsGate>
      <div className="flex flex-col min-h-screen bg-background pb-20 md:pb-12 space-y-4 sm:space-y-6 p-3 sm:p-6 lg:p-8 xl:p-10 w-full max-w-full overflow-x-hidden">
        {/* Header & Sub Navigation */}
        <div className="flex flex-col gap-3 pb-4 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-orange-500/10 text-[#FF5A36]">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    {t('expenses', 'Expenses')}
                  </h1>
                  <Badge className="bg-orange-500/10 text-[#FF5A36] border border-orange-500/20 text-[10px] font-bold py-0.5 px-2.5 rounded-full">
                    {t('ledgerLive', 'Ledger Live')}
                  </Badge>
        </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t(
                    isParlour ? 'expensesSubtitleParlour' : 'expensesSubtitle',
                    isParlour
                      ? 'Track, categorize, and control parlour daily operational costs.'
                      : 'Track, categorize, and control restaurant daily operational costs.'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 1. Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Today's Expenses */}
          <Card className="rounded-2xl border border-border/60 bg-card shadow-xs relative overflow-hidden transition-all hover:shadow-md hover:border-[#FF5A36]/30 group">
            <div className="h-1 w-full bg-gradient-to-r from-[#FF5A36] to-orange-400" />
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                    {t('todayExpenses', "Today's Expenses")}
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-black text-foreground mt-1.5 tracking-tight">
                    {formatCurrency(summary.todayTotal)}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-[#FF5A36] flex items-center justify-center border border-orange-500/20 group-hover:scale-110 transition-transform">
                  <Calendar className="w-5 h-5 text-[#FF5A36]" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-xs text-muted-foreground font-medium">
                <span>{formatAccountDate(new Date())}</span>
              </div>
            </div>
          </Card>

          {/* This Month's Expenses */}
          <Card className="rounded-2xl border border-border/60 bg-card shadow-xs relative overflow-hidden transition-all hover:shadow-md hover:border-emerald-500/30 group">
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-400" />
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                    {t('thisMonthExpenses', "This Month's Expenses")}
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-black text-foreground mt-1.5 tracking-tight">
                    {formatCurrency(summary.monthTotal)}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <Receipt className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
                <span>{t('currentMonthlyTotal', 'Current monthly total')}</span>
              </div>
            </div>
          </Card>

          {/* Top Expense Category */}
          <Card className="rounded-2xl border border-border/60 bg-card shadow-xs relative overflow-hidden transition-all hover:shadow-md hover:border-blue-500/30 group">
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-400" />
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="max-w-[70%]">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                    {t('topCategory', 'Top Category')}
                  </p>
                  <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1.5 truncate tracking-tight">
                    {summary.topCategory}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                  <Tag className="w-5 h-5 text-blue-500" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-xs text-muted-foreground font-medium">
                <span>{formatCurrency(summary.topCategoryAmount)} {t('logged', 'logged')}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* 2. Action Controls & Filter Bar */}
        <Card className="rounded-2xl border border-border/60 bg-card p-3.5 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('searchExpenses', 'Search expenses by note, category or payment method...')}
                value={search}
                onChange={(e) => handleFilterChange(setSearch, e.target.value)}
                className="pl-9 h-10 rounded-xl bg-muted/30 border-border/70 text-xs sm:text-sm w-full"
              />
            </div>

            {/* Main Action Buttons */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full lg:w-auto">
              <Button
                size="sm"
                onClick={handleOpenAdd}
                className="col-span-2 sm:col-span-1 h-10 px-4 rounded-xl bg-gradient-to-r from-[#FF5A36] to-orange-500 hover:from-[#e04b2a] hover:to-orange-600 text-white font-semibold text-xs shadow-sm shadow-orange-500/20 justify-center order-first sm:order-last w-full sm:w-auto"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" />
                <span>{t('addExpense', 'Add Expense')}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="h-10 px-3 sm:px-3.5 rounded-xl border-border/70 font-medium text-xs hover:bg-muted justify-center w-full sm:w-auto"
                title={t('exportCsv', 'Export CSV')}
              >
                <Download className="w-4 h-4 mr-1.5 text-foreground/70" />
                <span>{t('exportCsv', 'Export CSV')}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCatManagerOpen(true)}
                className="h-10 px-3 sm:px-3.5 rounded-xl border-border/70 font-medium text-xs hover:bg-muted justify-center w-full sm:w-auto"
                title={t('manageCategories', 'Manage Categories')}
              >
                <FolderPlus className="w-4 h-4 mr-1.5 text-foreground/70" />
                <span className="sm:hidden">{t('categories', 'Categories')}</span>
                <span className="hidden sm:inline">{t('manageCategories', 'Manage Categories')}</span>
              </Button>
            </div>
          </div>

          {/* Filter Dropdowns & Date Pickers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-border/40">
            {/* Category Filter */}
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase mb-1 block">
                {t('category', 'Category')}
              </Label>
              <Select
                value={selectedCategory}
                onValueChange={(val) => handleFilterChange(setSelectedCategory, val)}
              >
                <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/20 border-border/60">
                  <SelectValue placeholder={t('allCategories', 'All Categories')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">{t('allCategories', 'All Categories')}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method Filter */}
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase mb-1 block">
                {t('paymentMethod', 'Payment Method')}
              </Label>
              <Select
                value={selectedPaymentMethod}
                onValueChange={(val) => handleFilterChange(setSelectedPaymentMethod, val)}
              >
                <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/20 border-border/60">
                  <SelectValue placeholder={t('allPaymentMethods', 'All Payment Methods')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">{t('allPaymentMethods', 'All Payment Methods')}</SelectItem>
                  {paymentMethods.map((pm) => (
                    <SelectItem key={pm.id} value={String(pm.id)}>
                      {pm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* From Date */}
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase mb-1 block">
                {t('fromDate', 'From Date')}
              </Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => handleFilterChange(setFromDate, e.target.value)}
                className="h-9 rounded-xl text-xs bg-muted/20 border-border/60"
              />
            </div>

            {/* To Date */}
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase mb-1 block">
                {t('toDate', 'To Date')}
              </Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => handleFilterChange(setToDate, e.target.value)}
                className="h-9 rounded-xl text-xs bg-muted/20 border-border/60"
              />
            </div>
          </div>

          {/* Active Filter Badge & Reset Button */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-muted-foreground">
                Showing filtered results ({totalCount} record{totalCount === 1 ? '' : 's'})
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-7 text-xs text-[#FF5A36] hover:bg-orange-500/10 hover:text-[#FF5A36] px-2 rounded-lg"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset Filters
              </Button>
            </div>
          )}
        </Card>

        {/* 3. Expenses List Table / Card View */}
        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF5A36]" />
              <p className="text-xs text-muted-foreground">Loading expenses...</p>
            </div>
          ) : errorMessage ? (
            <div className="py-12 px-4 text-center">
              <p className="text-sm font-semibold text-destructive mb-2">{errorMessage}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={loadExpenses}
                className="rounded-xl text-xs"
              >
                Try Again
              </Button>
            </div>
          ) : expenses.length === 0 ? (
            <div className="py-16 px-4 text-center max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[#FF5A36] flex items-center justify-center mx-auto mb-3 border border-orange-500/20">
                <Receipt className="w-6 h-6 text-[#FF5A36]" />
              </div>
              <h4 className="text-base font-bold text-foreground mb-1">
                {hasActiveFilters ? 'No Matching Expenses Found' : 'No Expenses Recorded Yet'}
              </h4>
              <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                {hasActiveFilters
                  ? 'Try adjusting your search criteria, category, or date range.'
                  : isParlour
                  ? 'Start tracking parlour outgoings by clicking the Add Expense button above.'
                  : 'Start tracking restaurant outgoings by clicking the Add Expense button above.'}
              </p>
              {!hasActiveFilters && (
                <Button
                  size="sm"
                  onClick={handleOpenAdd}
                  className="rounded-xl bg-gradient-to-r from-[#FF5A36] to-orange-500 text-white text-xs font-semibold"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                  <span>{t('addExpense', 'Add Expense')}</span>
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Card List (< md): Touch-first cards, zero horizontal scroll */}
              <div className="md:hidden divide-y divide-border/50">
                {expenses.map((item) => (
                  <div key={item.id} className="p-3.5 space-y-2.5 bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className="text-[11px] font-semibold py-0.5 px-2 rounded-lg bg-orange-500/5 text-[#FF5A36] border-orange-500/20"
                          >
                            {item.category_name || 'Uncategorized'}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-medium">
                            {formatAccountDate(item.date)}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-foreground/80 mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <span className="font-extrabold text-foreground text-sm whitespace-nowrap tracking-tight shrink-0">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/30">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-medium py-0.5 px-2 rounded-lg bg-muted/40 border-border/70 text-foreground/80"
                        >
                          <CreditCard className="w-3 h-3 mr-1 text-muted-foreground" />
                          {item.payment_method_name || 'Other'}
                        </Badge>
                        {item.attachment && (
                          <button
                            type="button"
                            onClick={() => setPreviewImageUrl(item.attachment || null)}
                            className="min-h-[44px] px-2.5 rounded-lg inline-flex items-center gap-1 text-[11px] text-[#FF5A36] hover:underline font-semibold bg-orange-500/10 border border-orange-500/20 active:scale-95 transition-all"
                            title="View Receipt"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{t('receipt', 'Receipt')}</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(item)}
                          className="min-h-[44px] w-10 p-0 rounded-xl text-muted-foreground hover:text-foreground active:scale-95"
                          title={t('edit', 'Edit')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTargetId(item.id)}
                          className="min-h-[44px] w-10 p-0 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-95"
                          title={t('delete', 'Delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">{t('date', 'Date')}</th>
                    <th className="py-3 px-4">{t('category', 'Category')}</th>
                    <th className="py-3 px-4">{t('amount', 'Amount')}</th>
                    <th className="py-3 px-4 hidden md:table-cell">{t('paymentMethod', 'Payment Method')}</th>
                    <th className="py-3 px-4 hidden lg:table-cell">{t('note', 'Note')}</th>
                    <th className="py-3 px-4 text-center hidden sm:table-cell">{t('receipt', 'Receipt')}</th>
                    <th className="py-3 px-4 text-right">{t('actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {expenses.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/30 transition-colors group border-l-2 border-l-transparent hover:border-l-[#FF5A36]/40"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 font-medium text-foreground whitespace-nowrap">
                        {formatAccountDate(item.date)}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className="text-[11px] font-medium py-0.5 px-2.5 rounded-lg bg-orange-500/5 text-[#FF5A36] border-orange-500/20"
                        >
                          {item.category_name || 'Uncategorized'}
                        </Badge>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-extrabold text-foreground whitespace-nowrap tracking-tight">
                        {formatCurrency(item.amount)}
                      </td>

                      {/* Payment Method — hidden on mobile */}
                      <td className="py-3.5 px-4 whitespace-nowrap hidden md:table-cell">
                        <Badge
                          variant="outline"
                          className="text-[11px] font-medium py-0.5 px-2 rounded-lg bg-muted/40 border-border/70 text-foreground/80"
                        >
                          <CreditCard className="w-3 h-3 mr-1 text-muted-foreground" />
                          {item.payment_method_name || 'Other'}
                        </Badge>
                      </td>

                      {/* Note — hidden on tablet and below */}
                      <td className="py-3.5 px-4 text-muted-foreground max-w-xs truncate text-xs hidden lg:table-cell">
                        {item.description || '-'}
                      </td>

                      {/* Receipt — hidden on mobile */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap hidden sm:table-cell">
                        {item.attachment ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImageUrl(item.attachment || null)}
                            className="inline-flex items-center gap-1 text-[11px] text-[#FF5A36] hover:underline font-semibold bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20 transition-all hover:bg-orange-500/20"
                            title="Click to view full receipt"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground/50 text-xs">-</span>
                        )}
                      </td>

                      {/* Actions Dropdown */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 rounded-xl border border-border/60 bg-card shadow-lg p-1">
                            {item.attachment && (
                              <DropdownMenuItem
                                onClick={() => setPreviewImageUrl(item.attachment || null)}
                                className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-[#FF5A36] focus:text-[#FF5A36] focus:bg-orange-500/10"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>{t('viewReceipt', 'View Receipt')}</span>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={() => handleOpenEdit(item)}
                              className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium focus:bg-muted"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>{t('edit', 'Edit Expense')}</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1 border-border/40" />

                            <DropdownMenuItem
                              onClick={() => setDeleteTargetId(item.id)}
                              className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-rose-600 focus:text-rose-600 focus:bg-rose-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{t('delete', 'Delete')}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

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
                  disabled={currentPage <= 1 || isLoading}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2.5 rounded-lg text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages || isLoading}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-2.5 rounded-lg text-xs"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* 4. Add / Edit Expense (Bottom Sheet on mobile, Dialog on desktop) */}
        <AccountsSheet open={isFormOpen} onOpenChange={setIsFormOpen}>
          <AccountsSheetContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 bg-card border border-border/80">
            <AccountsSheetHeader>
              <AccountsSheetTitle className="text-lg font-bold text-foreground">
                {editingExpense ? t('editExpense', 'Edit Expense') : t('addExpense', 'Add New Expense')}
              </AccountsSheetTitle>
              <AccountsSheetDescription className="text-xs text-muted-foreground">
                Fill in the expense details below. Amount and date are mandatory.
              </AccountsSheetDescription>
            </AccountsSheetHeader>

            <form onSubmit={handleSaveExpense} className="space-y-4 pt-2">
              {formError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                  {formError}
                </div>
              )}

              {/* Date & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    {t('date', 'Date')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="h-10 rounded-xl text-xs bg-muted/20"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    {t('amount', 'Amount (BDT ৳)')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="h-10 rounded-xl text-xs bg-muted/20 font-bold"
                  />
                </div>
              </div>

              {/* Category & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    {t('category', 'Category')} <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                    <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/20">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    {t('paymentMethod', 'Payment Method')} <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formPaymentMethodId} onValueChange={setFormPaymentMethodId}>
                    <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/20">
                      <SelectValue placeholder="Select Payment Method" />
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

              {/* Note / Description */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">
                  {t('note', 'Description / Note')}
                </Label>
                <Textarea
                  placeholder="Optional details (e.g. Daily vegetable market purchase from vendor)"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="rounded-xl text-xs bg-muted/20 resize-none"
                />
              </div>

              {/* Receipt Image Upload (Max 2MB) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  {t('receipt', 'Receipt Attachment')} (JPG/PNG, Max 2MB)
                </Label>

                {formAttachment ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/80 bg-muted/30">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-background relative shrink-0 border border-border/60">
                        <Image
                          src={formAttachment}
                          alt="Receipt thumbnail"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {formAttachment}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setFormAttachment('')}
                      className="w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive"
                      title="Remove receipt"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <label className="flex flex-col items-center justify-center p-4 border border-dashed border-border/80 hover:border-[#FF5A36]/60 rounded-xl cursor-pointer bg-muted/10 hover:bg-muted/20 transition-all">
                      {uploadingReceipt ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin text-[#FF5A36]" />
                          <span>Uploading receipt...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-center">
                          <UploadCloud className="w-6 h-6 text-[#FF5A36] mb-1" />
                          <span className="text-xs font-medium text-foreground">
                            Click to upload receipt photo
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            JPEG, PNG or WebP (max 2MB)
                          </span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleReceiptUpload}
                        disabled={uploadingReceipt}
                      />
                    </label>
                  </div>
                )}
              </div>

              <AccountsSheetFooter className="pt-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-xl text-xs h-9 min-h-[44px] sm:min-h-0"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || uploadingReceipt}
                  className="rounded-xl text-xs h-9 min-h-[44px] sm:min-h-0 bg-gradient-to-r from-[#FF5A36] to-orange-500 text-white font-semibold"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                  {editingExpense ? 'Save Changes' : 'Record Expense'}
                </Button>
              </AccountsSheetFooter>
            </form>
          </AccountsSheetContent>
        </AccountsSheet>

        {/* 5. Category Manager (Bottom Sheet on mobile, Dialog on desktop) */}
        <AccountsSheet open={isCatManagerOpen} onOpenChange={setIsCatManagerOpen}>
          <AccountsSheetContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 bg-card border border-border/80">
            <AccountsSheetHeader>
              <AccountsSheetTitle className="text-lg font-bold text-foreground">
                {t('manageCategories', 'Manage Expense Categories')}
              </AccountsSheetTitle>
              <AccountsSheetDescription className="text-xs text-muted-foreground">
                Default system categories cannot be deleted. Custom categories can be added or removed if unused.
              </AccountsSheetDescription>
            </AccountsSheetHeader>

            {catManagerError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                {catManagerError}
              </div>
            )}

            {/* Add Category Form */}
            <form onSubmit={handleAddCategory} className="flex gap-2 pt-2">
              <Input
                placeholder="New category name (e.g. Packaging)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="h-9 rounded-xl text-xs bg-muted/20"
              />
              <Button
                type="submit"
                size="sm"
                className="h-9 px-3 rounded-xl bg-[#FF5A36] hover:bg-[#e04b2a] text-white text-xs font-semibold shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                Add
              </Button>
            </form>

            {/* Categories List */}
            <div className="mt-4 max-h-72 overflow-y-auto space-y-2 pr-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  {editingCatId === cat.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <Input
                        value={editingCatName}
                        onChange={(e) => setEditingCatName(e.target.value)}
                        className="h-8 rounded-lg text-xs"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdateCategory(cat.id)}
                        className="h-8 px-2 rounded-lg text-xs bg-[#FF5A36] text-white"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingCatId(null)}
                        className="h-8 px-2 rounded-lg text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{cat.name}</span>
                      {cat.is_default ? (
                        <Badge
                          variant="secondary"
                          className="text-[10px] py-0 px-1.5 rounded-md bg-muted text-muted-foreground flex items-center gap-1 font-normal"
                        >
                          <Lock className="w-2.5 h-2.5" />
                          Default
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 rounded-md text-[#FF5A36] border-orange-500/30"
                        >
                          Custom
                        </Badge>
                      )}
                    </div>
                  )}

                  {!cat.is_default && editingCatId !== cat.id && (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setEditingCatName(cat.name);
                        }}
                        className="w-7 h-7 rounded-lg hover:bg-muted text-muted-foreground"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="w-7 h-7 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <AccountsSheetFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCatManagerOpen(false)}
                className="rounded-xl text-xs min-h-[44px] sm:min-h-0"
              >
                Done
              </Button>
            </AccountsSheetFooter>
          </AccountsSheetContent>
        </AccountsSheet>

        {/* 6. Receipt Lightbox Preview Modal */}
        <Dialog open={Boolean(previewImageUrl)} onOpenChange={() => setPreviewImageUrl(null)}>
          <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto rounded-2xl p-3 sm:p-4 bg-card border border-border/80">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-sm font-bold text-foreground flex items-center justify-between">
                <span>Receipt Preview</span>
              </DialogTitle>
            </DialogHeader>
            {previewImageUrl && (
              <div className="relative w-full h-[60vh] max-h-[450px] rounded-xl overflow-hidden bg-black/5 dark:bg-black/40 flex items-center justify-center">
                <Image
                  src={previewImageUrl}
                  alt="Full receipt"
                  fill
                  className="object-contain"
                />
              </div>
            )}
            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewImageUrl(null)}
                className="rounded-xl text-xs"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 7. Delete Confirmation Alert Dialog */}
        <AlertDialog open={Boolean(deleteTargetId)} onOpenChange={() => setDeleteTargetId(null)}>
          <AlertDialogContent className="rounded-2xl max-w-md w-[95vw] sm:w-full p-4 sm:p-6 bg-card border border-border/80">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-bold text-foreground">
                Delete Expense Record?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                This will soft-delete the expense entry. It will no longer appear in your active reports or calculations.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="rounded-xl text-xs h-9 min-h-[44px] sm:min-h-0">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="rounded-xl text-xs h-9 min-h-[44px] sm:min-h-0 bg-destructive hover:bg-destructive/90 text-white font-semibold"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AccountsGate>
  );
}
