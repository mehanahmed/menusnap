'use client';

import { AccountsMobileCards } from '@/components/accounts/AccountsTopNavbar';

import { useEffect, useState, useTransition, useCallback, useRef } from 'react';
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
  AccountsSheet,
  AccountsSheetContent,
  AccountsSheetHeader,
  AccountsSheetTitle,
  AccountsSheetDescription,
  AccountsSheetFooter,
} from '@/components/accounts/AccountsSheet';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  getVendorsAction,
  createVendorAction,
  updateVendorAction,
  toggleVendorStatusAction,
  deleteVendorAction,
  getVendorDetailsAction,
  createVendorBillAction,
  createVendorPaymentAction,
  deleteVendorBillAction,
  deleteVendorPaymentAction,
  getPaymentMethodsAction,
} from '@/app/actions/accounts';
import { formatCurrency, formatAccountDate, sanitizeBdPhone, isValidBdPhone, formatBdPhone } from '@/lib/accounts/helpers';
import {
  Truck,
  PlusCircle,
  Search,
  Calendar,
  CreditCard,
  Edit2,
  Trash2,
  Eye,
  AlertTriangle,
  RotateCcw,
  Receipt,
  Wallet,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  BookOpen,
  DollarSign,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Phone,
  MapPin,
  Tag,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  UserX,
  MoreHorizontal,
} from 'lucide-react';

interface VendorItem {
  id: number;
  restaurant_id: string;
  name: string;
  phone?: string;
  address?: string;
  category?: string;
  opening_balance: number;
  note?: string;
  is_active: boolean;
  total_purchases: number;
  total_paid: number;
  current_due: number;
  overdue_count: number;
  created_at: string;
}

const RESTAURANT_VENDOR_CATEGORIES = [
  'Grocery',
  'Meat & Poultry',
  'Dairy & Eggs',
  'Vegetables & Fruits',
  'Gas & Fuel',
  'Packaging',
  'Beverages & Syrups',
  'Bakery & Flour',
  'Spices & Condiments',
  'Equipment & Utensils',
  'Others',
];

const PARLOUR_VENDOR_CATEGORIES = [
  'Beauty Products',
  'Cosmetics',
  'Salon Supplies',
  'Equipment',
  'Furniture',
  'Cleaning',
  'Others',
];

export default function VendorsPage() {
  const { t } = usePreferences();
  const { clientUser } = useClientAuth();

  // Primary list state
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([
    { id: 1, name: 'Cash' },
    { id: 2, name: 'bKash' },
    { id: 3, name: 'Nagad' },
    { id: 4, name: 'Bank' },
    { id: 5, name: 'Card' },
  ]);
  const [businessType, setBusinessType] = useState<'restaurant' | 'parlour' | null>(null);
  const [summary, setSummary] = useState({
    totalDue: 0,
    paidThisMonth: 0,
    overdueBillsCount: 0,
  });

  const isParlour = (businessType || clientUser?.type) === 'parlour';
  const vendorCategories = isParlour ? PARLOUR_VENDOR_CATEGORIES : RESTAURANT_VENDOR_CATEGORIES;

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Add / Edit Vendor Dialog
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorItem | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');
  const [vendorCategory, setVendorCategory] = useState('Grocery');
  const [vendorOpeningBal, setVendorOpeningBal] = useState('');
  const [vendorNote, setVendorNote] = useState('');
  const [vendorFormError, setVendorFormError] = useState<string | null>(null);

  // Delete Vendor Dialog
  const [deleteVendorId, setDeleteVendorId] = useState<number | null>(null);

  // Detailed Ledger / Profile Dialog state
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [vendorDetails, setVendorDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsTab, setDetailsTab] = useState<'ledger' | 'bills' | 'payments'>('ledger');

  // Add Bill Modal state
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [billDate, setBillDate] = useState('');
  const [billDueDate, setBillDueDate] = useState('');
  const [billNo, setBillNo] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billNote, setBillNote] = useState('');
  const [billError, setBillError] = useState<string | null>(null);

  // Add Payment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payDate, setPayDate] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethodId, setPayMethodId] = useState('');
  const [payBillId, setPayBillId] = useState<string>('none');
  const [payNote, setPayNote] = useState('');
  const [payError, setPayError] = useState<string | null>(null);

  // Delete confirmation for bills & payments
  const [deleteBillId, setDeleteBillId] = useState<number | null>(null);
  const [deletePaymentId, setDeletePaymentId] = useState<number | null>(null);

  const restaurantId = clientUser?.id || clientUser?.businessName || '';

  // Load Payment Methods for dropdowns
  const loadPaymentMethods = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const pmRes = await getPaymentMethodsAction(restaurantId);
      if (pmRes.success && Array.isArray(pmRes.data)) {
        setPaymentMethods(pmRes.data);
      }
    } catch (err) {
      console.error('Failed to load payment methods:', err);
    }
  }, [restaurantId]);

  // Load Vendors List & Summary
  const loadVendors = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await getVendorsAction({
        restaurantId,
        search,
        status: statusFilter,
        page: currentPage,
        limit: 10,
      });

      if (res.success) {
        setVendors(res.data || []);
        if ((res as any).businessType) {
          setBusinessType((res as any).businessType);
        }
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.total || 0);
        }
        if (res.summary) {
          setSummary(res.summary);
        }
      } else {
        setErrorMessage(res.error || 'Failed to load vendors');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error fetching vendors');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, search, statusFilter, currentPage]);

  useEffect(() => {
    loadPaymentMethods();
  }, [loadPaymentMethods]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  // Load specific vendor details
  const loadVendorDetails = useCallback(
    async (vendorId: number) => {
      if (!restaurantId || !vendorId) return;
      setDetailsLoading(true);
      try {
        const res = await getVendorDetailsAction(restaurantId, vendorId);
        if (res.success && res.data) {
          setVendorDetails(res.data);
        } else {
          alert(res.error || 'Failed to load vendor ledger.');
        }
      } catch (err: any) {
        alert(err?.message || 'Error loading vendor details.');
      } finally {
        setDetailsLoading(false);
      }
    },
    [restaurantId]
  );

  const scrollPosRef = useRef<number>(0);

  const handleOpenDetails = (vendorId: number) => {
    scrollPosRef.current = typeof window !== 'undefined' ? window.scrollY : 0;
    setSelectedVendorId(vendorId);
    setDetailsTab('ledger');
    loadVendorDetails(vendorId);
  };

  const handleCloseDetails = () => {
    setSelectedVendorId(null);
    setVendorDetails(null);
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: scrollPosRef.current, behavior: 'instant' });
      }
    }, 10);
  };

  // Open Add Vendor Modal
  const handleOpenAddVendor = () => {
    setEditingVendor(null);
    setVendorName('');
    setVendorPhone('');
    setVendorAddress('');
    setVendorCategory(isParlour ? 'Beauty Products' : 'Grocery');
    setVendorOpeningBal('0');
    setVendorNote('');
    setVendorFormError(null);
    setIsVendorModalOpen(true);
  };

  // Open Edit Vendor Modal
  const handleOpenEditVendor = (v: VendorItem) => {
    setEditingVendor(v);
    setVendorName(v.name);
    setVendorPhone(sanitizeBdPhone(v.phone));
    setVendorAddress(v.address || '');
    setVendorCategory(v.category || (isParlour ? 'Beauty Products' : 'Grocery'));
    setVendorOpeningBal(String(v.opening_balance || 0));
    setVendorNote(v.note || '');
    setVendorFormError(null);
    setIsVendorModalOpen(true);
  };

  // Save Vendor (Create or Update)
  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      setVendorFormError('Vendor name is required.');
      return;
    }

    if (!isValidBdPhone(vendorPhone)) {
      setVendorFormError('Phone number must be a valid 11-digit Bangladeshi mobile number starting with 01 (e.g. 017XXXXXXXX).');
      return;
    }

    startTransition(async () => {
      try {
        if (editingVendor) {
          const res = await updateVendorAction(restaurantId, editingVendor.id, {
            name: vendorName.trim(),
            phone: formatBdPhone(vendorPhone),
            address: vendorAddress.trim() || undefined,
            category: vendorCategory,
            opening_balance: parseFloat(vendorOpeningBal) || 0,
            note: vendorNote.trim() || undefined,
          });
          if (res.success) {
            setIsVendorModalOpen(false);
            loadVendors();
            if (selectedVendorId === editingVendor.id) {
              loadVendorDetails(editingVendor.id);
            }
          } else {
            setVendorFormError(res.error || 'Failed to update vendor.');
          }
        } else {
          const res = await createVendorAction(restaurantId, {
            name: vendorName.trim(),
            phone: formatBdPhone(vendorPhone),
            address: vendorAddress.trim() || undefined,
            category: vendorCategory,
            opening_balance: parseFloat(vendorOpeningBal) || 0,
            note: vendorNote.trim() || undefined,
          });
          if (res.success) {
            setIsVendorModalOpen(false);
            loadVendors();
          } else {
            setVendorFormError(res.error || 'Failed to add vendor.');
          }
        }
      } catch (err: any) {
        setVendorFormError(err?.message || 'Error saving vendor.');
      }
    });
  };

  // Toggle Vendor Active / Inactive
  const handleToggleStatus = async (vendorId: number) => {
    try {
      const res = await toggleVendorStatusAction(restaurantId, vendorId);
      if (res.success) {
        loadVendors();
      } else {
        alert(res.error || 'Failed to update vendor status.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error updating status.');
    }
  };

  // Confirm Delete Vendor
  const handleConfirmDeleteVendor = async () => {
    if (!deleteVendorId) return;
    try {
      const res = await deleteVendorAction(restaurantId, deleteVendorId);
      if (res.success) {
        setDeleteVendorId(null);
        if (selectedVendorId === deleteVendorId) {
          setSelectedVendorId(null);
          setVendorDetails(null);
        }
        loadVendors();
      } else {
        alert(res.error || 'Failed to delete vendor.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error deleting vendor.');
    } finally {
      if (typeof document !== 'undefined') {
        document.body.style.pointerEvents = '';
      }
    }
  };

  // Open Add Bill Modal
  const handleOpenAddBill = () => {
    const today = new Date().toISOString().split('T')[0];
    setBillDate(today);
    setBillDueDate('');
    setBillNo('');
    setBillAmount('');
    setBillNote('');
    setBillError(null);
    setIsBillModalOpen(true);
  };

  // Save Bill
  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) return;

    const amount = parseFloat(billAmount);
    if (isNaN(amount) || amount <= 0) {
      setBillError('Please enter a valid bill amount greater than 0.');
      return;
    }

    if (!billDate) {
      setBillError('Bill date is required.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await createVendorBillAction(restaurantId, selectedVendorId, {
          bill_date: billDate,
          due_date: billDueDate || undefined,
          bill_no: billNo.trim() || undefined,
          total_amount: amount,
          note: billNote.trim() || undefined,
        });

        if (res.success) {
          setIsBillModalOpen(false);
          loadVendorDetails(selectedVendorId);
          loadVendors();
        } else {
          setBillError(res.error || 'Failed to record bill.');
        }
      } catch (err: any) {
        setBillError(err?.message || 'Error saving bill.');
      }
    });
  };

  // Open Add Payment Modal
  const handleOpenAddPayment = (suggestedBillId?: number, suggestedAmount?: number) => {
    const today = new Date().toISOString().split('T')[0];
    setPayDate(today);
    setPayAmount(suggestedAmount ? String(suggestedAmount) : '');
    setPayMethodId(paymentMethods[0]?.id ? String(paymentMethods[0].id) : '');
    setPayBillId(suggestedBillId ? String(suggestedBillId) : 'none');
    setPayNote('');
    setPayError(null);
    setIsPaymentModalOpen(true);
  };

  // Save Payment
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) return;

    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      setPayError('Please enter a valid payment amount greater than 0.');
      return;
    }

    if (!payDate) {
      setPayError('Payment date is required.');
      return;
    }

    if (!payMethodId) {
      setPayError('Please select a payment method.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await createVendorPaymentAction(restaurantId, selectedVendorId, {
          date: payDate,
          amount,
          payment_method_id: payMethodId,
          bill_id: payBillId !== 'none' ? payBillId : undefined,
          note: payNote.trim() || undefined,
        });

        if (res.success) {
          setIsPaymentModalOpen(false);
          loadVendorDetails(selectedVendorId);
          loadVendors();
        } else {
          setPayError(res.error || 'Failed to record payment.');
        }
      } catch (err: any) {
        setPayError(err?.message || 'Error saving payment.');
      }
    });
  };

  // Confirm Delete Bill
  const handleConfirmDeleteBill = async () => {
    if (!deleteBillId || !selectedVendorId) return;
    try {
      const res = await deleteVendorBillAction(restaurantId, deleteBillId);
      if (res.success) {
        setDeleteBillId(null);
        loadVendorDetails(selectedVendorId);
        loadVendors();
      } else {
        alert(res.error || 'Failed to delete bill.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error deleting bill.');
    }
  };

  // Confirm Delete Payment
  const handleConfirmDeletePayment = async () => {
    if (!deletePaymentId || !selectedVendorId) return;
    try {
      const res = await deleteVendorPaymentAction(restaurantId, deletePaymentId);
      if (res.success) {
        setDeletePaymentId(null);
        loadVendorDetails(selectedVendorId);
        loadVendors();
      } else {
        alert(res.error || 'Failed to delete payment.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error deleting payment.');
    }
  };

  return (
    <AccountsGate>
      <div className="flex flex-col min-h-screen bg-background pb-20 md:pb-12 space-y-4 sm:space-y-6 p-3 sm:p-6 lg:p-8 xl:p-10 w-full max-w-full overflow-x-hidden">
        {/* Header & Sub Navigation */}
        <div className="flex flex-col gap-3 pb-4 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    {t('vendors', 'Vendors')}
                  </h1>
                  <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px] font-bold py-0.5 px-2.5 rounded-full">
                    {t('procurement', 'Procurement')}
                  </Badge>
        </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t(
                    isParlour ? 'vendorsSubtitleParlour' : 'vendorsSubtitle',
                    isParlour
                      ? 'Supplier directories, beauty product purchase ledgers, and payable dues.'
                      : 'Supplier directories, raw material purchase ledgers, and payable dues.'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 1. Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Due Balance */}
          <Card className="rounded-2xl border border-border/60 bg-card shadow-xs relative overflow-hidden transition-all hover:shadow-md hover:border-rose-500/30 group">
            <div className="h-1 w-full bg-gradient-to-r from-rose-500 to-pink-400" />
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                    {t('totalDue', 'Total Due (Payables)')}
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-1.5 tracking-tight">
                    {formatCurrency(summary.totalDue)}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center border border-rose-500/20 group-hover:scale-110 transition-transform">
                  <Wallet className="w-5 h-5 text-rose-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-xs text-muted-foreground font-medium">
                <span>Outstanding balance across active vendors</span>
              </div>
            </div>
          </Card>

          {/* Paid This Month */}
          <Card className="rounded-2xl border border-border/60 bg-card shadow-xs relative overflow-hidden transition-all hover:shadow-md hover:border-emerald-500/30 group">
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-400" />
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                    {t('paidThisMonth', 'Paid This Month')}
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-black text-foreground mt-1.5 tracking-tight">
                    {formatCurrency(summary.paidThisMonth)}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <span>{t('currentMonthVendorDisbursements', 'Current month vendor disbursements')}</span>
              </div>
            </div>
          </Card>

          {/* Overdue Bills Count */}
          <Card className="rounded-2xl border border-border/60 bg-card shadow-xs relative overflow-hidden transition-all hover:shadow-md hover:border-amber-500/30 group">
            <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-yellow-400" />
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                    {t('overdueBills', 'Overdue Bills')}
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-black text-foreground mt-1.5 tracking-tight">
                    {summary.overdueBillsCount}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-xs text-amber-600 dark:text-amber-400 font-medium">
                <span>{t('unpaidPastDueDate', 'Unpaid past due date')}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* 2. Controls & Search Bar */}
        <Card className="rounded-2xl border border-border/60 bg-card p-3.5 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t(
                  'searchVendors',
                  isParlour
                    ? 'Search supplier by name, phone, or cosmetics...'
                    : 'Search vendor by name, phone, or category...'
                )}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-10 rounded-xl bg-muted/30 border-border/70 text-xs sm:text-sm"
              />
            </div>

            {/* Status Filter & Add Vendor Button */}
            <div className="flex items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(val: any) => {
                  setStatusFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[130px] h-10 rounded-xl text-xs bg-muted/20 border-border/60 flex-1 sm:flex-initial">
                  <SelectValue placeholder={t('status', 'Status')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">{t('allVendors', 'All Vendors')}</SelectItem>
                  <SelectItem value="active">{t('activeOnly', 'Active Only')}</SelectItem>
                  <SelectItem value="inactive">{t('inactive', 'Inactive')}</SelectItem>
                </SelectContent>
              </Select>

              <Button
                size="sm"
                onClick={handleOpenAddVendor}
                className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#FF5A36] to-orange-500 hover:from-[#e04b2a] hover:to-orange-600 text-white font-semibold text-xs shadow-sm flex-1 sm:flex-initial whitespace-nowrap"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" />
                <span>{t('addVendor', 'Add Vendor')}</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* 3. Vendors List Table */}
        <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF5A36]" />
              <p className="text-xs text-muted-foreground">Loading vendors...</p>
            </div>
          ) : errorMessage ? (
            <div className="py-12 px-4 text-center">
              <p className="text-sm font-semibold text-destructive mb-2">{errorMessage}</p>
              <Button size="sm" variant="outline" onClick={loadVendors} className="rounded-xl text-xs">
                Try Again
              </Button>
            </div>
          ) : vendors.length === 0 ? (
            <div className="py-16 px-4 text-center max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
                <Truck className="w-6 h-6 text-emerald-600" />
              </div>
              <h4 className="text-base font-bold text-foreground mb-1">
                {search || statusFilter !== 'all' ? 'No Matching Vendors Found' : 'No Vendors Added Yet'}
              </h4>
              <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                {isParlour
                  ? 'Add your beauty suppliers, cosmetics vendors, and salon equipment providers to keep track of bills and payments.'
                  : 'Add your wholesale suppliers, grocery vendors, and material providers to keep track of bills and payments.'}
              </p>
              <Button
                size="sm"
                onClick={handleOpenAddVendor}
                className="rounded-xl bg-gradient-to-r from-[#FF5A36] to-orange-500 text-white text-xs font-semibold"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                <span>{t('addVendor', 'Add First Vendor')}</span>
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile Card List (< md): Touch-first cards, zero horizontal scroll */}
              <div className="md:hidden divide-y divide-border/50">
                {vendors.map((v) => (
                  <div key={v.id} className="p-3.5 space-y-3 bg-card">
                    {/* Header: Name & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(v.id)}
                            className="font-bold text-foreground hover:text-[#FF5A36] text-sm text-left transition-colors"
                          >
                            {v.name}
                          </button>
                          {v.overdue_count > 0 && (
                            <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/30 text-[10px] py-0 px-1.5 rounded-md font-bold">
                              {v.overdue_count} Overdue
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                          <Badge variant="outline" className="text-[10px] py-0 px-2 rounded-md bg-muted/30 text-muted-foreground">
                            {v.category || 'Vendor'}
                          </Badge>
                          {v.phone && (
                            <span className="flex items-center gap-1 text-[11px]">
                              <Phone className="w-2.5 h-2.5 text-muted-foreground/60" />
                              {v.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      <Badge
                        className={`text-[10px] py-0.5 px-2 rounded-md font-semibold shrink-0 ${
                          v.is_active
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}
                      >
                        {v.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/40 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">{t('totalPurchases', 'Purchases')}</span>
                        <span className="font-semibold text-foreground">{formatCurrency(v.total_purchases)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">{t('totalPaid', 'Paid')}</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(v.total_paid)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">{t('currentDue', 'Due')}</span>
                        <span className={`font-extrabold ${v.current_due > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                          {formatCurrency(v.current_due)}
                        </span>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => handleOpenDetails(v.id)}
                        className="flex-1 min-h-[44px] h-11 rounded-xl text-xs font-bold bg-[#FF5A36] text-white hover:bg-[#e04b2a] shadow-xs active:scale-98 transition-all flex items-center justify-center gap-1.5"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>{t('vendorLedger', 'Ledger & Bills')}</span>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="min-h-[44px] w-11 h-11 rounded-xl border-border/70 hover:bg-muted text-foreground"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                            <span className="sr-only">Vendor Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl border border-border/60 bg-card shadow-lg p-1">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedVendorId(v.id);
                              handleOpenAddBill();
                            }}
                            className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium focus:bg-muted"
                          >
                            <PlusCircle className="w-3.5 h-3.5 text-[#FF5A36]" />
                            <span>{t('addBill', 'Add Bill')}</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedVendorId(v.id);
                              handleOpenAddPayment();
                            }}
                            className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium focus:bg-muted"
                          >
                            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{t('addPayment', 'Add Payment')}</span>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator className="my-1 border-border/40" />

                          <DropdownMenuItem
                            onClick={() => handleOpenEditVendor(v)}
                            className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium focus:bg-muted"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>{t('edit', 'Edit Vendor')}</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(v.id)}
                            className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium focus:bg-muted"
                          >
                            {v.is_active ? (
                              <>
                                <UserX className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Deactivate</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Activate</span>
                              </>
                            )}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator className="my-1 border-border/40" />

                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              setDeleteVendorId(v.id);
                            }}
                            className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-rose-600 focus:text-rose-600 focus:bg-rose-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{t('delete', 'Delete')}</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Vendor</th>
                    <th className="py-3 px-4 hidden md:table-cell">Phone / Address</th>
                    <th className="py-3 px-4 hidden lg:table-cell">{t('totalPurchases', 'Total Purchased')}</th>
                    <th className="py-3 px-4">{t('totalPaid', 'Total Paid')}</th>
                    <th className="py-3 px-4">{t('currentDue', 'Current Due')}</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">{t('actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-muted/30 transition-colors group">
                      {/* Name & Category */}
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(v.id)}
                            className="font-bold text-foreground hover:text-[#FF5A36] text-left transition-colors"
                          >
                            {v.name}
                          </button>
                          {v.overdue_count > 0 && (
                            <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/30 text-[10px] py-0 px-1.5 rounded-md font-bold">
                              {v.overdue_count} Overdue
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[10px] py-0 px-2 rounded-md bg-muted/30 text-muted-foreground">
                            {v.category || 'Grocery'}
                          </Badge>
                        </div>
                      </td>

                      {/* Phone & Address */}
                      <td className="py-3.5 px-4 text-muted-foreground hidden md:table-cell">
                        <div className="flex items-center gap-1 text-xs">
                          <Phone className="w-3 h-3 text-muted-foreground/60" />
                          <span>{v.phone || 'No phone'}</span>
                        </div>
                        {v.address && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80 mt-0.5 truncate max-w-[180px]">
                            <MapPin className="w-2.5 h-2.5 text-muted-foreground/50 shrink-0" />
                            <span className="truncate">{v.address}</span>
                          </div>
                        )}
                      </td>

                      {/* Total Purchases */}
                      <td className="py-3.5 px-4 font-semibold text-foreground whitespace-nowrap hidden lg:table-cell">
                        {formatCurrency(v.total_purchases)}
                      </td>

                      {/* Total Paid */}
                      <td className="py-3.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatCurrency(v.total_paid)}
                      </td>

                      {/* Current Due */}
                      <td className="py-3.5 px-4 font-extrabold whitespace-nowrap">
                        {v.current_due > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400">
                            {formatCurrency(v.current_due)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                            Settled (৳ 0)
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {v.is_active ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] py-0.5 px-2 rounded-md font-semibold">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-muted text-muted-foreground border border-border text-[10px] py-0.5 px-2 rounded-md font-semibold">
                            Inactive
                          </Badge>
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
                            <DropdownMenuItem
                              onClick={() => handleOpenDetails(v.id)}
                              className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-[#FF5A36] focus:text-[#FF5A36] focus:bg-orange-500/10"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>{t('vendorLedger', 'Ledger & Bills')}</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleOpenEditVendor(v)}
                              className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium focus:bg-muted"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>{t('edit', 'Edit Vendor')}</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(v.id)}
                              className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium focus:bg-muted"
                            >
                              {v.is_active ? (
                                <>
                                  <UserX className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Deactivate</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Activate</span>
                                </>
                              )}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1 border-border/40" />

                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                setDeleteVendorId(v.id);
                              }}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border/40 text-xs text-muted-foreground">
              <span>
                Page {currentPage} of {totalPages} ({totalCount} vendors)
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

        {/* 4. Add / Edit Vendor Modal - Bottom Sheet on mobile, Dialog on desktop */}
        <AccountsSheet open={isVendorModalOpen} onOpenChange={setIsVendorModalOpen}>
          <AccountsSheetContent className="overflow-y-auto max-h-[88vh]">
            <AccountsSheetHeader>
              <AccountsSheetTitle>
                {editingVendor ? t('editVendor', 'Edit Vendor Profile') : t('addVendor', 'Add New Vendor')}
              </AccountsSheetTitle>
              <AccountsSheetDescription>
                Enter supplier contact details and initial opening balance.
              </AccountsSheetDescription>
            </AccountsSheetHeader>

            <form onSubmit={handleSaveVendor} className="space-y-4 pt-2">
              {vendorFormError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                  {vendorFormError}
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">
                  Vendor Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  required
                  placeholder="e.g. Al-Madina Fresh Meat & Poultry"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="h-10 rounded-xl text-xs bg-muted/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-primary" /> Phone Number *
                    </Label>
                    <span className={`text-[10px] font-mono font-bold ${vendorPhone.length === 11 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                      {vendorPhone.length}/11
                    </span>
                  </div>
                  <div className="flex rounded-xl border border-input bg-muted/20 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary overflow-hidden h-10 transition-all">
                    <span className="inline-flex items-center px-3 bg-muted/70 text-foreground font-mono font-bold text-xs border-r border-border/60 select-none">
                      +88
                    </span>
                    <input
                      required
                      type="tel"
                      inputMode="numeric"
                      placeholder="01XXXXXXXXX"
                      value={vendorPhone}
                      onChange={(e) => setVendorPhone(sanitizeBdPhone(e.target.value))}
                      maxLength={11}
                      className="flex-1 bg-transparent px-3 text-xs outline-none font-mono text-foreground placeholder:text-muted-foreground/50 h-full"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Category / Type</Label>
                  <Select value={vendorCategory} onValueChange={setVendorCategory}>
                    <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/20">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {vendorCategories.concat(vendorCategory && !vendorCategories.includes(vendorCategory) ? [vendorCategory] : []).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    {t('openingBalance', 'Opening Balance (BDT ৳)')}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={vendorOpeningBal}
                    onChange={(e) => setVendorOpeningBal(e.target.value)}
                    className="h-10 rounded-xl text-xs bg-muted/20"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Address / Market Location</Label>
                  <Input
                    placeholder="e.g. Kawran Bazar, Shop #45"
                    value={vendorAddress}
                    onChange={(e) => setVendorAddress(e.target.value)}
                    className="h-10 rounded-xl text-xs bg-muted/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Internal Note</Label>
                <Textarea
                  placeholder="Terms, delivery days, or preferred payment methods"
                  value={vendorNote}
                  onChange={(e) => setVendorNote(e.target.value)}
                  rows={2}
                  className="rounded-xl text-xs bg-muted/20 resize-none"
                />
              </div>

              <AccountsSheetFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsVendorModalOpen(false)}
                  className="rounded-xl text-xs h-10 min-h-[44px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl text-xs h-10 min-h-[44px] bg-gradient-to-r from-[#FF5A36] to-orange-500 text-white font-semibold"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                  {editingVendor ? 'Save Changes' : 'Create Vendor'}
                </Button>
              </AccountsSheetFooter>
            </form>
          </AccountsSheetContent>
        </AccountsSheet>

        {/* 5A. Mobile Dedicated Screen (< md) with sticky Back header and scroll restoration */}
        {Boolean(selectedVendorId) && (
          <div className="fixed inset-0 z-50 bg-background overflow-y-auto flex flex-col md:hidden animate-in fade-in-0 duration-200">
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/70 px-4 py-3 flex items-center justify-between shrink-0 shadow-2xs">
              <button
                type="button"
                onClick={handleCloseDetails}
                className="min-h-[44px] flex items-center gap-2 text-sm font-bold text-foreground hover:text-[#FF5A36] transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#FF5A36]" />
                <span>{t('backToVendors', 'Back to Vendors')}</span>
              </button>
              <Badge variant="outline" className="text-xs font-semibold">
                {vendorDetails?.vendor?.name || 'Vendor Details'}
              </Badge>
            </div>

            <div className="p-4 flex-1">
              {detailsLoading || !vendorDetails ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#FF5A36]" />
                  <p className="text-xs text-muted-foreground">Loading vendor ledger...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Vendor Header & Metrics Banner */}
                  <div className="flex flex-col gap-3 p-4 rounded-2xl bg-muted/20 border border-border/60">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-lg font-black text-foreground">
                          {vendorDetails.vendor.name}
                        </h3>
                        <Badge className="bg-orange-500/10 text-[#FF5A36] border border-orange-500/20 text-[10px] font-semibold">
                          {vendorDetails.vendor.category || 'Vendor'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {vendorDetails.vendor.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#FF5A36]" />
                            {vendorDetails.vendor.phone}
                          </span>
                        )}
                        {vendorDetails.vendor.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-500" />
                            {vendorDetails.vendor.address}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleOpenAddBill}
                        className="flex-1 rounded-xl text-xs min-h-[44px] h-10 font-semibold border-border/80 hover:bg-muted"
                      >
                        <PlusCircle className="w-3.5 h-3.5 mr-1 text-[#FF5A36]" />
                        <span>{t('addBill', 'Add Bill')}</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleOpenAddPayment()}
                        className="flex-1 rounded-xl text-xs min-h-[44px] h-10 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-sm"
                      >
                        <DollarSign className="w-3.5 h-3.5 mr-1" />
                        <span>{t('addPayment', 'Add Payment')}</span>
                      </Button>
                    </div>
                  </div>

                  {/* 3 Metric Cards for this Vendor */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl border border-border/60 bg-card">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase truncate">
                        Purchases
                      </p>
                      <p className="text-sm sm:text-base font-black text-foreground mt-0.5">
                        {formatCurrency(vendorDetails.vendor.total_purchases)}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl border border-border/60 bg-card">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase truncate">
                        Total Paid
                      </p>
                      <p className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {formatCurrency(vendorDetails.vendor.total_paid)}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl border border-border/60 bg-card">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase truncate">
                        Current Due
                      </p>
                      <p className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400 mt-0.5">
                        {formatCurrency(vendorDetails.vendor.current_due)}
                      </p>
                    </div>
                  </div>

                  {/* Detailed Tabs: Ledger, Bills, Payments */}
                  <Tabs value={detailsTab} onValueChange={(val: any) => setDetailsTab(val)} className="w-full">
                    <TabsList className="grid grid-cols-3 w-full rounded-xl bg-muted/40 p-1">
                      <TabsTrigger value="ledger" className="rounded-lg text-xs font-semibold">
                        Ledger ({vendorDetails.ledger.length})
                      </TabsTrigger>
                      <TabsTrigger value="bills" className="rounded-lg text-xs font-semibold">
                        Bills ({vendorDetails.bills.length})
                      </TabsTrigger>
                      <TabsTrigger value="payments" className="rounded-lg text-xs font-semibold">
                        Payments ({vendorDetails.payments.length})
                      </TabsTrigger>
                    </TabsList>

                    {/* TAB 1: LEDGER */}
                    <TabsContent value="ledger" className="pt-2">
                      {vendorDetails.ledger.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                          No transactions recorded for this vendor yet.
                        </div>
                      ) : (
                        <div className="divide-y divide-border/40 border border-border/60 rounded-xl overflow-hidden bg-card">
                          {vendorDetails.ledger.map((entry: any) => (
                            <div key={entry.id} className="p-3 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground">
                                  {formatAccountDate(entry.date)}
                                </span>
                                {entry.type === 'Bill' ? (
                                  <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] py-0 px-1.5 font-semibold">
                                    Bill
                                  </Badge>
                                ) : entry.type === 'Payment' ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] py-0 px-1.5 font-semibold">
                                    Payment
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                    Opening
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs font-medium text-foreground">
                                {entry.ref} {entry.note ? `(${entry.note})` : ''}
                              </div>
                              <div className="flex items-center justify-between text-xs pt-0.5">
                                <span className="text-muted-foreground">
                                  {entry.debit > 0 ? `Debit: ${formatCurrency(entry.debit)}` : `Credit: ${formatCurrency(entry.credit)}`}
                                </span>
                                <span className="font-bold text-foreground">
                                  Bal: {formatCurrency(entry.balance)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    {/* TAB 2: BILLS */}
                    <TabsContent value="bills" className="pt-2">
                      {vendorDetails.bills.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                          No purchase bills recorded for this vendor.
                        </div>
                      ) : (
                        <div className="divide-y divide-border/40 border border-border/60 rounded-xl overflow-hidden bg-card">
                          {vendorDetails.bills.map((bill: any) => (
                            <div key={bill.id} className="p-3 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-foreground">
                                  {bill.bill_no ? `Bill #${bill.bill_no}` : formatAccountDate(bill.bill_date)}
                                </span>
                                <Badge
                                  className={`text-[10px] py-0 px-1.5 font-semibold ${
                                    bill.status === 'Paid'
                                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                      : bill.status === 'Partial'
                                      ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                      : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                  }`}
                                >
                                  {bill.status}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  Date: {formatAccountDate(bill.bill_date)}
                                </span>
                                <span className="font-bold text-foreground">
                                  {formatCurrency(bill.total_amount)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs pt-1">
                                <span className="text-[11px] text-muted-foreground">
                                  Paid: {formatCurrency(bill.paid_amount)} | Due: {formatCurrency(bill.remaining_amount)}
                                </span>
                                <div className="flex items-center gap-1">
                                  {bill.remaining_amount > 0 && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleOpenAddPayment(bill.id, bill.remaining_amount)}
                                      className="h-8 px-2 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                    >
                                      Pay Bill
                                    </Button>
                                  )}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setDeleteBillId(bill.id)}
                                    className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    {/* TAB 3: PAYMENTS */}
                    <TabsContent value="payments" className="pt-2">
                      {vendorDetails.payments.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                          No payments recorded for this vendor.
                        </div>
                      ) : (
                        <div className="divide-y divide-border/40 border border-border/60 rounded-xl overflow-hidden bg-card">
                          {vendorDetails.payments.map((p: any) => (
                            <div key={p.id} className="p-3 flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(p.amount)}
                                  </span>
                                  <Badge variant="outline" className="text-[10px] py-0">
                                    {p.payment_method_name || 'Cash'}
                                  </Badge>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {formatAccountDate(p.date)} {p.bill_no ? `• Allocated to Bill #${p.bill_no}` : ''}
                                </p>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setDeletePaymentId(p.id)}
                                className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5B. Detailed Vendor Ledger & Management Dialog (Desktop >= md) */}
        <div className="hidden md:block">
        <Dialog
          open={Boolean(selectedVendorId)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedVendorId(null);
              setVendorDetails(null);
            }
          }}
        >
          <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 bg-card border border-border/80">
            <DialogHeader className="sr-only">
              <DialogTitle>{vendorDetails?.vendor?.name || 'Vendor Ledger'}</DialogTitle>
              <DialogDescription>Vendor details, bills, and payment records</DialogDescription>
            </DialogHeader>
            {detailsLoading || !vendorDetails ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF5A36]" />
                <p className="text-xs text-muted-foreground">Loading vendor ledger...</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Vendor Header & Metrics Banner */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl bg-muted/20 border border-border/60">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-black text-foreground">
                        {vendorDetails.vendor.name}
                      </h3>
                      <Badge className="bg-orange-500/10 text-[#FF5A36] border border-orange-500/20 text-[10px] font-semibold">
                        {vendorDetails.vendor.category || 'Vendor'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {vendorDetails.vendor.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#FF5A36]" />
                          {vendorDetails.vendor.phone}
                        </span>
                      )}
                      {vendorDetails.vendor.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-500" />
                          {vendorDetails.vendor.address}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleOpenAddBill}
                      className="rounded-xl text-xs h-9 font-semibold border-border/80 hover:bg-muted"
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1 text-[#FF5A36]" />
                      <span>{t('addBill', 'Add Bill')}</span>
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleOpenAddPayment()}
                      className="rounded-xl text-xs h-9 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-sm"
                    >
                      <DollarSign className="w-3.5 h-3.5 mr-1" />
                      <span>{t('addPayment', 'Add Payment')}</span>
                    </Button>
                  </div>
                </div>

                {/* 3 Metric Cards for this Vendor */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-border/60 bg-card">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Total Purchases (Bills)
                    </p>
                    <p className="text-lg font-black text-foreground mt-1">
                      {formatCurrency(vendorDetails.vendor.total_purchases)}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border/60 bg-card">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Total Paid
                    </p>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      {formatCurrency(vendorDetails.vendor.total_paid)}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border/60 bg-card">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Current Due Balance
                    </p>
                    <p className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">
                      {formatCurrency(vendorDetails.vendor.current_due)}
                    </p>
                  </div>
                </div>

                {/* Detailed Tabs: Ledger, Bills, Payments */}
                <Tabs value={detailsTab} onValueChange={(val: any) => setDetailsTab(val)} className="w-full">
                  <TabsList className="grid grid-cols-3 w-full rounded-xl bg-muted/40 p-1">
                    <TabsTrigger value="ledger" className="rounded-lg text-xs font-semibold">
                      {t('vendorLedger', 'Chronological Ledger')} ({vendorDetails.ledger.length})
                    </TabsTrigger>
                    <TabsTrigger value="bills" className="rounded-lg text-xs font-semibold">
                      Bills ({vendorDetails.bills.length})
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="rounded-lg text-xs font-semibold">
                      Payments ({vendorDetails.payments.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* TAB 1: LEDGER */}
                  <TabsContent value="ledger" className="pt-2">
                    {vendorDetails.ledger.length === 0 ? (
                      <div className="py-12 text-center text-xs text-muted-foreground">
                        No transactions recorded for this vendor yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-border/60 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[10px] uppercase font-semibold">
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Type</th>
                              <th className="py-2.5 px-3">Reference / Details</th>
                              <th className="py-2.5 px-3 text-right">Debit (Bill)</th>
                              <th className="py-2.5 px-3 text-right">Credit (Payment)</th>
                              <th className="py-2.5 px-3 text-right">Running Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {vendorDetails.ledger.map((entry: any) => (
                              <tr key={entry.id} className="hover:bg-muted/20">
                                <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                                  {formatAccountDate(entry.date)}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  {entry.type === 'Bill' ? (
                                    <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] py-0 px-1.5 font-semibold">
                                      Bill
                                    </Badge>
                                  ) : entry.type === 'Payment' ? (
                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] py-0 px-1.5 font-semibold">
                                      Payment
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                      Opening
                                    </Badge>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-foreground font-medium max-w-xs truncate">
                                  {entry.ref}
                                  {entry.note && (
                                    <span className="text-[11px] text-muted-foreground ml-1.5 font-normal">
                                      ({entry.note})
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-semibold text-foreground whitespace-nowrap">
                                  {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                  {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-extrabold whitespace-nowrap">
                                  {formatCurrency(entry.balance)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB 2: BILLS */}
                  <TabsContent value="bills" className="pt-2">
                    {vendorDetails.bills.length === 0 ? (
                      <div className="py-12 text-center text-xs text-muted-foreground">
                        No purchase bills recorded for this vendor. Click "Add Bill" above to record procurement.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-border/60 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[10px] uppercase font-semibold">
                              <th className="py-2.5 px-3">Bill Date</th>
                              <th className="py-2.5 px-3">Due Date</th>
                              <th className="py-2.5 px-3">Bill No</th>
                              <th className="py-2.5 px-3 text-right">Total Amount</th>
                              <th className="py-2.5 px-3 text-right">Paid</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                              <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {vendorDetails.bills.map((bill: any) => (
                              <tr key={bill.id} className="hover:bg-muted/20">
                                <td className="py-2.5 px-3 whitespace-nowrap text-foreground font-medium">
                                  {formatAccountDate(bill.bill_date)}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                                  <div className="flex items-center gap-1.5">
                                    <span>{bill.due_date ? formatAccountDate(bill.due_date) : '-'}</span>
                                    {bill.is_overdue && (
                                      <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/30 text-[9px] py-0 px-1 font-bold">
                                        Overdue
                                      </Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-foreground">
                                  {bill.bill_no || `#${bill.id}`}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-foreground whitespace-nowrap">
                                  {formatCurrency(bill.total_amount)}
                                </td>
                                <td className="py-2.5 px-3 text-right text-emerald-600 font-medium whitespace-nowrap">
                                  {formatCurrency(bill.paid_amount)}
                                </td>
                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                  <Badge
                                    className={`text-[10px] py-0 px-2 font-semibold ${
                                      bill.payment_status === 'Paid'
                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                        : bill.payment_status === 'Partial'
                                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                        : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                    }`}
                                  >
                                    {bill.payment_status}
                                  </Badge>
                                </td>
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1">
                                    {bill.remaining_amount > 0 && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleOpenAddPayment(bill.id, bill.remaining_amount)}
                                        className="h-7 px-2 rounded-lg text-[11px] font-semibold text-emerald-600 hover:bg-emerald-500/10"
                                      >
                                        Pay
                                      </Button>
                                    )}
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => setDeleteBillId(bill.id)}
                                      className="w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive"
                                      title="Delete bill"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB 3: PAYMENTS */}
                  <TabsContent value="payments" className="pt-2">
                    {vendorDetails.payments.length === 0 ? (
                      <div className="py-12 text-center text-xs text-muted-foreground">
                        No payments logged for this vendor yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-border/60 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[10px] uppercase font-semibold">
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Method</th>
                              <th className="py-2.5 px-3">Against Bill</th>
                              <th className="py-2.5 px-3">Note</th>
                              <th className="py-2.5 px-3 text-right">Amount</th>
                              <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {vendorDetails.payments.map((p: any) => (
                              <tr key={p.id} className="hover:bg-muted/20">
                                <td className="py-2.5 px-3 whitespace-nowrap text-foreground font-medium">
                                  {formatAccountDate(p.date)}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <Badge variant="outline" className="text-[10px] py-0 px-2 font-medium">
                                    <CreditCard className="w-2.5 h-2.5 mr-1" />
                                    {p.payment_method_name}
                                  </Badge>
                                </td>
                                <td className="py-2.5 px-3 text-muted-foreground">
                                  {p.bill_no ? `Bill #${p.bill_no}` : 'General / Account'}
                                </td>
                                <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate">
                                  {p.note || '-'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                  {formatCurrency(p.amount)}
                                </td>
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setDeletePaymentId(p.id)}
                                    className="w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive"
                                    title="Delete payment"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </DialogContent>
        </Dialog>
        </div>

        {/* 6. Add Bill - Bottom Sheet on mobile, Dialog on desktop */}
        <AccountsSheet open={isBillModalOpen} onOpenChange={setIsBillModalOpen}>
          <AccountsSheetContent className="overflow-y-auto max-h-[88vh]">
            <AccountsSheetHeader>
              <AccountsSheetTitle>
                {t('addBill', 'Record Purchase Bill')}
              </AccountsSheetTitle>
              <AccountsSheetDescription>
                Record goods/materials received from this vendor into accounts payable.
              </AccountsSheetDescription>
            </AccountsSheetHeader>

            <form onSubmit={handleSaveBill} className="space-y-4 pt-2">
              {billError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                  {billError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Bill Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="date"
                    required
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="h-10 rounded-xl text-xs bg-muted/20"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Due Date</Label>
                  <Input
                    type="date"
                    value={billDueDate}
                    onChange={(e) => setBillDueDate(e.target.value)}
                    className="h-10 rounded-xl text-xs bg-muted/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Bill / Invoice No</Label>
                  <Input
                    placeholder="e.g. INV-8920"
                    value={billNo}
                    onChange={(e) => setBillNo(e.target.value)}
                    className="h-10 rounded-xl text-xs bg-muted/20"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Total Amount (BDT ৳) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    required
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    className="h-10 rounded-xl text-xs bg-muted/20 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Description / Notes</Label>
                <Textarea
                  placeholder="Items purchased (e.g. 50kg beef, 20kg chicken breast)"
                  value={billNote}
                  onChange={(e) => setBillNote(e.target.value)}
                  rows={2}
                  className="rounded-xl text-xs bg-muted/20 resize-none"
                />
              </div>

              <AccountsSheetFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBillModalOpen(false)}
                  className="rounded-xl text-xs h-10 min-h-[44px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl text-xs h-10 min-h-[44px] bg-gradient-to-r from-[#FF5A36] to-orange-500 text-white font-semibold"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                  Save Bill
                </Button>
              </AccountsSheetFooter>
            </form>
          </AccountsSheetContent>
        </AccountsSheet>

        {/* 7. Add Payment - Bottom Sheet on mobile, Dialog on desktop */}
        <AccountsSheet open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
          <AccountsSheetContent className="overflow-y-auto max-h-[88vh]">
            <AccountsSheetHeader>
              <AccountsSheetTitle>
                {t('addPayment', 'Record Vendor Payment')}
              </AccountsSheetTitle>
              <AccountsSheetDescription>
                Logs payment to supplier. Automatically syncs with Expenses ledger.
              </AccountsSheetDescription>
            </AccountsSheetHeader>

            <form onSubmit={handleSavePayment} className="space-y-4 pt-2">
              {payError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                  {payError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Payment Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="h-10 rounded-xl text-xs bg-muted/20"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Amount (BDT ৳) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="h-10 rounded-xl text-xs bg-muted/20 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Payment Method <span className="text-destructive">*</span>
                  </Label>
                  <Select value={payMethodId} onValueChange={setPayMethodId}>
                    <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/20">
                      <SelectValue placeholder="Method" />
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
                  <Label className="text-xs font-semibold text-foreground">Allocate to Bill</Label>
                  <Select value={payBillId} onValueChange={setPayBillId}>
                    <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/20">
                      <SelectValue placeholder="Allocate" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none">General Payment (On Account)</SelectItem>
                      {(vendorDetails?.bills || []).map((b: any) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.bill_no ? `Bill #${b.bill_no}` : `Bill #${b.id}`} (Due: {formatCurrency(b.remaining_amount)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Payment Note</Label>
                <Textarea
                  placeholder="e.g. Partial cash payment, bank transfer voucher ref"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  rows={2}
                  className="rounded-xl text-xs bg-muted/20 resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 text-[11px] text-muted-foreground flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  This payment will automatically create a matching expense entry under raw materials with this vendor linked.
                </span>
              </div>

              <AccountsSheetFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="rounded-xl text-xs h-10 min-h-[44px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl text-xs h-10 min-h-[44px] bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                  Confirm Payment
                </Button>
              </AccountsSheetFooter>
            </form>
          </AccountsSheetContent>
        </AccountsSheet>

        {/* 8. Confirmation Dialogs */}
        {/* Delete Vendor Confirmation */}
        <AlertDialog
          open={Boolean(deleteVendorId)}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteVendorId(null);
              if (typeof document !== 'undefined') {
                document.body.style.pointerEvents = '';
              }
            }
          }}
        >
          <AlertDialogContent className="rounded-2xl max-w-md w-[95vw] sm:w-full p-4 sm:p-6 bg-card border border-border/80">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-bold text-foreground">
                Delete Vendor Profile?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                This will soft-delete the vendor. Existing bills and expense records will remain preserved in history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="rounded-xl text-xs h-9">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteVendor}
                className="rounded-xl text-xs h-9 bg-destructive hover:bg-destructive/90 text-white font-semibold"
              >
                Delete Vendor
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Bill Confirmation */}
        <AlertDialog open={Boolean(deleteBillId)} onOpenChange={() => setDeleteBillId(null)}>
          <AlertDialogContent className="rounded-2xl max-w-md w-[95vw] sm:w-full p-4 sm:p-6 bg-card border border-border/80">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-bold text-foreground">
                Delete Vendor Bill?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                Are you sure you want to remove this purchase bill? This will recalculate the vendor's total due balance.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="rounded-xl text-xs h-9">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteBill}
                className="rounded-xl text-xs h-9 bg-destructive hover:bg-destructive/90 text-white font-semibold"
              >
                Delete Bill
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Payment Confirmation */}
        <AlertDialog open={Boolean(deletePaymentId)} onOpenChange={() => setDeletePaymentId(null)}>
          <AlertDialogContent className="rounded-2xl max-w-md w-[95vw] sm:w-full p-4 sm:p-6 bg-card border border-border/80">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-bold text-foreground">
                Delete Vendor Payment?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                This will remove the payment and also soft-delete the linked record in your Expenses module.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="rounded-xl text-xs h-9">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeletePayment}
                className="rounded-xl text-xs h-9 bg-destructive hover:bg-destructive/90 text-white font-semibold"
              >
                Delete Payment
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AccountsGate>
  );
}
