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
  getStaffListAction,
  createStaffAction,
  updateStaffAction,
  toggleStaffStatusAction,
  deleteStaffAction,
  getDailyAttendanceAction,
  saveDailyAttendanceAction,
  calculateSalaryPreviewAction,
  saveSalaryRecordAction,
  paySalaryAction,
  createStaffAdvanceAction,
  deleteStaffAdvanceAction,
  getStaffDetailsAction,
  getPaymentMethodsAction,
  getServicesAction,
  createServiceAction,
  updateServiceAction,
  deleteServiceAction,
  getStaffCommissionsAction,
  createStaffCommissionAction,
  updateStaffCommissionAction,
  deleteStaffCommissionAction,
} from '@/app/actions/accounts';
import { formatCurrency, formatAccountDate, sanitizeBdPhone, isValidBdPhone, formatBdPhone } from '@/lib/accounts/helpers';
import {
  Users,
  PlusCircle,
  Search,
  Calendar,
  CreditCard,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Phone,
  UserCheck,
  UserX,
  ClipboardList,
  Calculator,
  HandCoins,
  Wallet,
  AlertCircle,
  FileText,
  BadgePercent,
  Check,
  MoreHorizontal,
  Sparkles,
  Scissors,
  Settings2,
  Percent,
  RotateCcw,
  Lock,
} from 'lucide-react';

interface StaffItem {
  id: number;
  restaurant_id: string;
  name: string;
  phone?: string;
  role?: string;
  joining_date?: string;
  salary_type: 'monthly' | 'daily';
  base_salary: number;
  commission_type?: 'percent' | 'fixed';
  commission_value?: number;
  is_active: boolean;
  pending_advance: number;
  unpaid_salary: number;
  month_services?: number;
  month_commission?: number;
  month_tips?: number;
  created_at: string;
}

interface ServiceItem {
  id: number;
  restaurant_id: string;
  name: string;
  price: number;
  default_commission_type: 'percent' | 'fixed';
  default_commission_value: number;
  is_active: boolean;
  created_at: string;
}

interface CommissionItem {
  id: number;
  restaurant_id: string;
  staff_id: number;
  staff_name: string;
  staff_role?: string;
  service_id?: number | null;
  service_name?: string;
  date: string;
  service_amount: number;
  commission_amount: number;
  tip_amount: number;
  customer_name?: string;
  note?: string;
  salary_record_id?: number | null;
  is_locked?: boolean;
  created_at: string;
}

const RESTAURANT_STAFF_ROLES = [
  'Head Chef',
  'Assistant Cook',
  'Kitchen Staff',
  'Waiter',
  'Captain',
  'Barista',
  'Cashier',
  'Floor Manager',
  'Cleaner',
  'Delivery Boy',
  'Other',
];

const PARLOUR_STAFF_ROLES = [
  'Hair Stylist',
  'Beautician',
  'Makeup Artist',
  'Nail Tech',
  'Receptionist',
  'Helper',
  'Floor Manager',
  'Other',
];

export default function StaffPage() {
  const { t } = usePreferences();
  const { clientUser } = useClientAuth();

  // Navigation tab in Staff module: 'directory' | 'attendance' | 'payroll' | 'commissions'
  const [activeMainTab, setActiveMainTab] = useState<'directory' | 'attendance' | 'payroll' | 'commissions'>('directory');

  // Staff List State
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([
    { id: 1, name: 'Cash' },
    { id: 2, name: 'bKash' },
    { id: 3, name: 'Nagad' },
    { id: 4, name: 'Bank' },
    { id: 5, name: 'Card' },
  ]);
  const [businessType, setBusinessType] = useState<'restaurant' | 'parlour' | null>(null);
  const [summary, setSummary] = useState({
    thisMonthStaffCost: 0,
    unpaidSalary: 0,
    totalAdvancePending: 0,
    thisMonthCommissions: 0,
    thisMonthTips: 0,
    thisMonthServices: 0,
  });

  const isParlour = (businessType || clientUser?.type) === 'parlour';
  const commonRoles = isParlour ? PARLOUR_STAFF_ROLES : RESTAURANT_STAFF_ROLES;

  // Filter & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Add / Edit Staff Modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffItem | null>(null);
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffRole, setStaffRole] = useState('Staff');
  const [staffJoiningDate, setStaffJoiningDate] = useState('');
  const [staffSalaryType, setStaffSalaryType] = useState<'monthly' | 'daily'>('monthly');
  const [staffBaseSalary, setStaffBaseSalary] = useState('');
  const [staffCommType, setStaffCommType] = useState<'percent' | 'fixed'>('percent');
  const [staffCommValue, setStaffCommValue] = useState<string>('');
  const [staffFormError, setStaffFormError] = useState<string | null>(null);

  // Parlour Services & Commissions State
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [commissions, setCommissions] = useState<CommissionItem[]>([]);
  const [commissionSummary, setCommissionSummary] = useState({
    totalServices: 0,
    totalServiceAmount: 0,
    totalCommissionAmount: 0,
    totalTipAmount: 0,
  });
  const [commissionMonth, setCommissionMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [commissionStaffFilter, setCommissionStaffFilter] = useState<string>('all');
  const [isCommissionLoading, setIsCommissionLoading] = useState(false);

  // Add / Edit Commission Modal State
  const [isAddCommissionModalOpen, setIsAddCommissionModalOpen] = useState(false);
  const [editingCommission, setEditingCommission] = useState<CommissionItem | null>(null);
  const [commStaffId, setCommStaffId] = useState<string>('');
  const [commServiceId, setCommServiceId] = useState<string>('custom');
  const [commDate, setCommDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [commServiceAmount, setCommServiceAmount] = useState<string>('');
  const [commAmount, setCommAmount] = useState<string>('');
  const [commTip, setCommTip] = useState<string>('');
  const [commCustomerName, setCommCustomerName] = useState<string>('');
  const [commNote, setCommNote] = useState<string>('');
  const [commError, setCommError] = useState<string | null>(null);

  // Manage Services Modal State
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceCommType, setServiceCommType] = useState<'percent' | 'fixed'>('percent');
  const [serviceCommVal, setServiceCommVal] = useState('');
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [serviceError, setServiceError] = useState<string | null>(null);

  // Delete Staff Modal
  const [deleteStaffId, setDeleteStaffId] = useState<number | null>(null);

  // Staff Details / Profile Modal
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [staffDetails, setStaffDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Daily Attendance Tab State
  const [attendanceDate, setAttendanceDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [attendanceList, setAttendanceList] = useState<Array<{ id: number; name: string; role: string; status: string; note: string }>>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attSaving, setAttSaving] = useState(false);
  const [attSuccessMsg, setAttSuccessMsg] = useState<string | null>(null);

  // Month-end Payroll (Generate Salary) State
  const [payrollMonth, setPayrollMonth] = useState<string>(() => new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [salaryPreviewRows, setSalaryPreviewRows] = useState<any[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(false);

  // Pay Salary Modal
  const [payingSalaryRecord, setPayingSalaryRecord] = useState<any | null>(null);
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payAmount, setPayAmount] = useState('');
  const [payMethodId, setPayMethodId] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payError, setPayError] = useState<string | null>(null);

  // Give Advance Modal
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advStaffId, setAdvStaffId] = useState<string>('');
  const [advDate, setAdvDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [advAmount, setAdvAmount] = useState('');
  const [advMethodId, setAdvMethodId] = useState('');
  const [advNote, setAdvNote] = useState('');
  const [advError, setAdvError] = useState<string | null>(null);

  const restaurantId = clientUser?.id || clientUser?.businessName || '';

  // Load Payment Methods
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

  // Load Staff List
  const loadStaffList = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await getStaffListAction({
        restaurantId,
        search,
        status: statusFilter,
        page: currentPage,
        limit: 10,
      });

      if (res.success) {
        setStaffList(res.data || []);
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
        setErrorMessage(res.error || 'Failed to load staff list');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error loading staff');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, search, statusFilter, currentPage]);

  // Load Daily Attendance Sheet
  const loadDailyAttendance = useCallback(async (date: string) => {
    if (!restaurantId) return;
    setAttLoading(true);
    setAttSuccessMsg(null);
    try {
      const res = await getDailyAttendanceAction(restaurantId, date);
      if (res.success && Array.isArray(res.data)) {
        setAttendanceList(res.data);
      }
    } catch (err) {
      console.error('Failed to load daily attendance:', err);
    } finally {
      setAttLoading(false);
    }
  }, [restaurantId]);

  // Load Salary Calculation Preview
  const loadSalaryPreview = useCallback(async (month: string) => {
    if (!restaurantId) return;
    setPayrollLoading(true);
    try {
      const res = await calculateSalaryPreviewAction(restaurantId, month);
      if (res.success && Array.isArray(res.data)) {
        setSalaryPreviewRows(res.data);
      }
    } catch (err) {
      console.error('Failed to load salary preview:', err);
    } finally {
      setPayrollLoading(false);
    }
  }, [restaurantId]);

  // Load Parlour Services
  const loadServices = useCallback(async () => {
    if (!restaurantId || !isParlour) return;
    try {
      const res = await getServicesAction(restaurantId);
      if (res.success && Array.isArray(res.data)) {
        setServices(res.data);
      }
    } catch (err) {
      console.error('Failed to load services:', err);
    }
  }, [restaurantId, isParlour]);

  // Load Staff Commissions
  const loadCommissions = useCallback(async () => {
    if (!restaurantId || !isParlour) return;
    setIsCommissionLoading(true);
    try {
      const res = await getStaffCommissionsAction({
        restaurantId,
        staffId: commissionStaffFilter,
        month: commissionMonth,
      });
      if (res.success) {
        setCommissions(res.data || []);
        if (res.summary) {
          setCommissionSummary(res.summary);
        }
      }
    } catch (err) {
      console.error('Failed to load commissions:', err);
    } finally {
      setIsCommissionLoading(false);
    }
  }, [restaurantId, isParlour, commissionStaffFilter, commissionMonth]);

  useEffect(() => {
    loadPaymentMethods();
  }, [loadPaymentMethods]);

  useEffect(() => {
    loadStaffList();
  }, [loadStaffList]);

  useEffect(() => {
    if (isParlour) {
      loadServices();
    }
  }, [isParlour, loadServices]);

  useEffect(() => {
    if (activeMainTab === 'attendance') {
      loadDailyAttendance(attendanceDate);
    } else if (activeMainTab === 'payroll') {
      loadSalaryPreview(payrollMonth);
    } else if (activeMainTab === 'commissions' && isParlour) {
      loadCommissions();
    }
  }, [activeMainTab, attendanceDate, payrollMonth, commissionMonth, commissionStaffFilter, isParlour, loadDailyAttendance, loadSalaryPreview, loadCommissions]);

  const scrollPosRef = useRef<number>(0);

  // Open Staff Details Modal
  const handleOpenStaffDetails = async (staffId: number) => {
    scrollPosRef.current = typeof window !== 'undefined' ? window.scrollY : 0;
    setSelectedStaffId(staffId);
    setDetailsLoading(true);
    try {
      const res = await getStaffDetailsAction(restaurantId, staffId);
      if (res.success && res.data) {
        setStaffDetails(res.data);
      } else {
        alert(res.error || 'Failed to load staff profile.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error loading details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseStaffDetails = () => {
    setSelectedStaffId(null);
    setStaffDetails(null);
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: scrollPosRef.current, behavior: 'instant' });
      }
    }, 10);
  };

  // Open Add Staff Modal
  const handleOpenAddStaff = () => {
    setEditingStaff(null);
    setStaffName('');
    setStaffPhone('');
    setStaffRole(isParlour ? 'Hair Stylist' : 'Kitchen Staff');
    setStaffJoiningDate(new Date().toISOString().split('T')[0]);
    setStaffSalaryType('monthly');
    setStaffBaseSalary('');
    setStaffCommType('percent');
    setStaffCommValue('');
    setStaffFormError(null);
    setIsStaffModalOpen(true);
  };

  // Open Edit Staff Modal
  const handleOpenEditStaff = (s: StaffItem) => {
    setEditingStaff(s);
    setStaffName(s.name);
    setStaffPhone(sanitizeBdPhone(s.phone));
    setStaffRole(s.role || (isParlour ? 'Hair Stylist' : 'Kitchen Staff'));
    setStaffJoiningDate(s.joining_date || '');
    setStaffSalaryType(s.salary_type || 'monthly');
    setStaffBaseSalary(String(s.base_salary || 0));
    setStaffCommType((s as any).commission_type || 'percent');
    setStaffCommValue(
      (s as any).commission_value != null && Number((s as any).commission_value) > 0
        ? String((s as any).commission_value)
        : ''
    );
    setStaffFormError(null);
    setIsStaffModalOpen(true);
  };

  // Save Staff (Add or Edit)
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim()) {
      setStaffFormError('Staff name is required.');
      return;
    }

    if (!isValidBdPhone(staffPhone)) {
      setStaffFormError('Phone number must be a valid 11-digit Bangladeshi mobile number starting with 01 (e.g. 017XXXXXXXX).');
      return;
    }

    const baseSalary = parseFloat(staffBaseSalary);
    if (isNaN(baseSalary) || baseSalary < 0) {
      setStaffFormError('Please enter a valid salary amount.');
      return;
    }

    const commValNum = parseFloat(staffCommValue);

    startTransition(async () => {
      try {
        if (editingStaff) {
          const res = await updateStaffAction(restaurantId, editingStaff.id, {
            name: staffName.trim(),
            phone: formatBdPhone(staffPhone),
            role: staffRole,
            joining_date: staffJoiningDate || undefined,
            salary_type: staffSalaryType,
            base_salary: baseSalary,
            commission_type: staffCommType,
            commission_value: isNaN(commValNum) ? 0 : commValNum,
          });
          if (res.success) {
            setIsStaffModalOpen(false);
            loadStaffList();
            if (selectedStaffId === editingStaff.id) {
              handleOpenStaffDetails(editingStaff.id);
            }
          } else {
            setStaffFormError(res.error || 'Failed to update staff.');
          }
        } else {
          const res = await createStaffAction(restaurantId, {
            name: staffName.trim(),
            phone: formatBdPhone(staffPhone),
            role: staffRole,
            joining_date: staffJoiningDate || undefined,
            salary_type: staffSalaryType,
            base_salary: baseSalary,
            commission_type: staffCommType,
            commission_value: isNaN(commValNum) ? 0 : commValNum,
          });
          if (res.success) {
            setIsStaffModalOpen(false);
            loadStaffList();
          } else {
            setStaffFormError(res.error || 'Failed to add staff.');
          }
        }
      } catch (err: any) {
        setStaffFormError(err?.message || 'Error saving staff member.');
      }
    });
  };

  // Helper to calculate commission based on staff and service selection
  // Rule 3: Staff's own custom commission rate takes priority over service's default rate
  const autoCalculateCommission = (stId: string, srvId: string, customAmount?: string) => {
    const staff = staffList.find((s) => String(s.id) === String(stId));
    const service = services.find((srv) => String(srv.id) === String(srvId));
    const amount =
      customAmount !== undefined && customAmount !== ''
        ? parseFloat(customAmount) || 0
        : service
        ? Number(service.price || 0)
        : 0;

    let type: 'percent' | 'fixed' = 'percent';
    let val = 0;

    if (staff && staff.commission_value != null && Number(staff.commission_value) > 0) {
      type = staff.commission_type || 'percent';
      val = Number(staff.commission_value);
    } else if (service && service.default_commission_value != null && Number(service.default_commission_value) > 0) {
      type = service.default_commission_type || 'percent';
      val = Number(service.default_commission_value);
    }

    let calculated = 0;
    if (type === 'percent') {
      calculated = Math.round(((amount * val) / 100) * 100) / 100;
    } else {
      calculated = val;
    }

    setCommAmount(String(calculated));
  };

  const handleCommStaffChange = (stId: string) => {
    setCommStaffId(stId);
    autoCalculateCommission(stId, commServiceId, commServiceAmount);
  };

  const handleCommServiceChange = (srvId: string) => {
    setCommServiceId(srvId);
    const service = services.find((s) => String(s.id) === String(srvId));
    const newPriceStr = service ? String(service.price || 0) : commServiceAmount;
    if (service) {
      setCommServiceAmount(newPriceStr);
    }
    autoCalculateCommission(commStaffId, srvId, newPriceStr);
  };

  const handleCommServiceAmountChange = (amtStr: string) => {
    setCommServiceAmount(amtStr);
    autoCalculateCommission(commStaffId, commServiceId, amtStr);
  };

  const handleOpenAddCommission = (preselectedStaffId?: number) => {
    setEditingCommission(null);
    const defaultStaff = preselectedStaffId
      ? String(preselectedStaffId)
      : staffList[0]
      ? String(staffList[0].id)
      : '';
    setCommStaffId(defaultStaff);
    const defaultService = services[0] ? String(services[0].id) : 'custom';
    setCommServiceId(defaultService);
    const serviceObj = services[0] || null;
    const initialPrice = serviceObj ? String(serviceObj.price || 0) : '';
    setCommServiceAmount(initialPrice);
    setCommDate(new Date().toISOString().split('T')[0]);
    setCommTip('0');
    setCommCustomerName('');
    setCommNote('');
    setCommError(null);
    autoCalculateCommission(defaultStaff, defaultService, initialPrice);
    setIsAddCommissionModalOpen(true);
  };

  const handleOpenEditCommission = (comm: CommissionItem) => {
    if (comm.is_locked) {
      alert('Cannot modify this commission: salary for this staff member in this month already has disbursements.');
      return;
    }
    setEditingCommission(comm);
    setCommStaffId(String(comm.staff_id));
    setCommServiceId(comm.service_id ? String(comm.service_id) : 'custom');
    setCommServiceAmount(String(comm.service_amount));
    setCommAmount(String(comm.commission_amount));
    setCommTip(String(comm.tip_amount || 0));
    setCommDate(String(comm.date).slice(0, 10));
    setCommCustomerName(comm.customer_name || '');
    setCommNote(comm.note || '');
    setCommError(null);
    setIsAddCommissionModalOpen(true);
  };

  const handleSaveCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commStaffId) {
      setCommError('Please select a staff member.');
      return;
    }
    const servAmt = parseFloat(commServiceAmount);
    if (isNaN(servAmt) || servAmt < 0) {
      setCommError('Please enter a valid service amount.');
      return;
    }
    const commAmt = parseFloat(commAmount);
    if (isNaN(commAmt) || commAmt < 0) {
      setCommError('Please enter a valid commission amount.');
      return;
    }
    const tipAmt = parseFloat(commTip) || 0;

    startTransition(async () => {
      try {
        let res;
        if (editingCommission) {
          res = await updateStaffCommissionAction(restaurantId, editingCommission.id, {
            staff_id: commStaffId,
            service_id: commServiceId && commServiceId !== 'custom' ? commServiceId : null,
            date: commDate,
            service_amount: servAmt,
            commission_amount: commAmt,
            tip_amount: tipAmt,
            customer_name: commCustomerName.trim() || undefined,
            note: commNote.trim() || undefined,
          });
        } else {
          res = await createStaffCommissionAction(restaurantId, {
            staff_id: commStaffId,
            service_id: commServiceId && commServiceId !== 'custom' ? commServiceId : null,
            date: commDate,
            service_amount: servAmt,
            commission_amount: commAmt,
            tip_amount: tipAmt,
            customer_name: commCustomerName.trim() || undefined,
            note: commNote.trim() || undefined,
          });
        }

        if (res.success) {
          setIsAddCommissionModalOpen(false);
          setEditingCommission(null);
          loadCommissions();
          loadStaffList();
          loadSalaryPreview(payrollMonth);
        } else {
          setCommError(res.error || 'Failed to save commission.');
        }
      } catch (err: any) {
        setCommError(err?.message || 'Error saving commission.');
      }
    });
  };

  const handleDeleteCommission = async (comm: CommissionItem) => {
    if (comm.is_locked) {
      alert('Cannot delete this commission: salary for this staff member in this month already has disbursements.');
      return;
    }
    if (!confirm('Are you sure you want to delete this commission entry?')) return;
    try {
      const res = await deleteStaffCommissionAction(restaurantId, comm.id);
      if (res.success) {
        loadCommissions();
        loadStaffList();
        loadSalaryPreview(payrollMonth);
      } else {
        alert(res.error || 'Failed to delete commission.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error deleting commission.');
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) {
      setServiceError('Service name is required.');
      return;
    }
    const priceNum = parseFloat(servicePrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setServiceError('Please enter a valid price.');
      return;
    }
    const commValNum = parseFloat(serviceCommVal) || 0;

    startTransition(async () => {
      try {
        if (editingServiceId) {
          const res = await updateServiceAction(restaurantId, editingServiceId, {
            name: serviceName.trim(),
            price: priceNum,
            default_commission_type: serviceCommType,
            default_commission_value: commValNum,
          });
          if (res.success) {
            setServiceName('');
            setServicePrice('');
            setServiceCommVal('');
            setEditingServiceId(null);
            setServiceError(null);
            loadServices();
          } else {
            setServiceError(res.error || 'Failed to update service.');
          }
        } else {
          const res = await createServiceAction(restaurantId, {
            name: serviceName.trim(),
            price: priceNum,
            default_commission_type: serviceCommType,
            default_commission_value: commValNum,
          });
          if (res.success) {
            setServiceName('');
            setServicePrice('');
            setServiceCommVal('');
            setServiceError(null);
            loadServices();
          } else {
            setServiceError(res.error || 'Failed to add service.');
          }
        }
      } catch (err: any) {
        setServiceError(err?.message || 'Error saving service.');
      }
    });
  };

  const handleDeleteService = async (srvId: number) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      const res = await deleteServiceAction(restaurantId, srvId);
      if (res.success) {
        loadServices();
      } else {
        alert(res.error || 'Failed to delete service.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error deleting service.');
    }
  };

  // Toggle Staff Active / Inactive
  const handleToggleStaffStatus = async (staffId: number) => {
    try {
      const res = await toggleStaffStatusAction(restaurantId, staffId);
      if (res.success) {
        loadStaffList();
      } else {
        alert(res.error || 'Failed to toggle status.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error updating status.');
    }
  };

  // Confirm Delete Staff
  const handleConfirmDeleteStaff = async () => {
    if (!deleteStaffId) return;
    try {
      const res = await deleteStaffAction(restaurantId, deleteStaffId);
      if (res.success) {
        setDeleteStaffId(null);
        if (selectedStaffId === deleteStaffId) {
          setSelectedStaffId(null);
          setStaffDetails(null);
        }
        loadStaffList();
      } else {
        alert(res.error || 'Failed to delete staff.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error deleting staff.');
    } finally {
      if (typeof document !== 'undefined') {
        document.body.style.pointerEvents = '';
      }
    }
  };

  // Quick Attendance change
  const handleAttendanceChange = (staffId: number, status: string) => {
    setAttendanceList((prev) =>
      prev.map((item) => (item.id === staffId ? { ...item, status } : item))
    );
  };

  const handleAttendanceNoteChange = (staffId: number, note: string) => {
    setAttendanceList((prev) =>
      prev.map((item) => (item.id === staffId ? { ...item, note } : item))
    );
  };

  // Mark all present
  const handleMarkAllPresent = () => {
    setAttendanceList((prev) => prev.map((item) => ({ ...item, status: 'present' })));
  };

  // Save Daily Attendance
  const handleSaveAttendance = async () => {
    setAttSaving(true);
    setAttSuccessMsg(null);
    try {
      const records = attendanceList.map((a) => ({
        staff_id: a.id,
        status: a.status,
        note: a.note,
      }));
      const res = await saveDailyAttendanceAction(restaurantId, attendanceDate, records);
      if (res.success) {
        setAttSuccessMsg('Attendance saved successfully for ' + formatAccountDate(attendanceDate));
        setTimeout(() => setAttSuccessMsg(null), 3500);
      } else {
        alert(res.error || 'Failed to save attendance.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error saving attendance.');
    } finally {
      setAttSaving(false);
    }
  };

  // Handle Payroll Row Update (Bonus, Overtime, Commission, Tips, Deduction, Advance)
  const handlePayrollRowChange = (staffId: number, field: string, val: string) => {
    const num = parseFloat(val) || 0;
    setSalaryPreviewRows((prev) =>
      prev.map((row) => {
        if (row.staff_id !== staffId) return row;
        const updated = { ...row, [field]: num };
        // Recalculate net payable
        const base = Number(updated.base_salary || 0);
        const bonus = Number(updated.bonus || 0);
        const overtime = Number(updated.overtime || 0);
        const commission = Number(updated.commission_amount || 0);
        const tips = Number(updated.tip_amount || 0);
        const deduction = Number(updated.deduction || 0);
        const advance = Number(updated.advance_adjusted || 0);
        updated.net_payable = Math.max(0, base + bonus + overtime + commission + tips - deduction - advance);
        return updated;
      })
    );
  };

  // Save single salary record from payroll sheet
  const handleSaveSingleSalary = async (row: any) => {
    try {
      const res = await saveSalaryRecordAction(restaurantId, {
        staff_id: row.staff_id,
        month: payrollMonth,
        base_salary: row.base_salary,
        bonus: row.bonus,
        overtime: row.overtime,
        commission_amount: row.commission_amount,
        tip_amount: row.tip_amount,
        deduction: row.deduction,
        advance_adjusted: row.advance_adjusted,
        net_payable: row.net_payable,
      });

      if (res.success) {
        loadSalaryPreview(payrollMonth);
        loadStaffList();
      } else {
        alert(res.error || 'Failed to save salary record.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error saving salary record.');
    }
  };

  // Open Pay Salary Dialog
  const handleOpenPaySalary = (row: any) => {
    setPayingSalaryRecord(row);
    const today = new Date().toISOString().split('T')[0];
    setPayDate(today);
    setPayAmount(String(row.net_payable - (row.paid_amount || 0)));
    setPayMethodId(paymentMethods[0]?.id ? String(paymentMethods[0].id) : '');
    setPayNote('');
    setPayError(null);
  };

  // Submit Salary Payment
  const handleSaveSalaryPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSalaryRecord) return;

    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      setPayError('Please enter a valid disbursement amount.');
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
        // Ensure record is saved in DB first if it was just a preview
        let recordId = payingSalaryRecord.existing_id;
        if (!recordId) {
          const saveRes = await saveSalaryRecordAction(restaurantId, {
            staff_id: payingSalaryRecord.staff_id,
            month: payrollMonth,
            base_salary: payingSalaryRecord.base_salary,
            bonus: payingSalaryRecord.bonus,
            overtime: payingSalaryRecord.overtime,
            deduction: payingSalaryRecord.deduction,
            advance_adjusted: payingSalaryRecord.advance_adjusted,
            net_payable: payingSalaryRecord.net_payable,
          });
          if (!saveRes.success) {
            setPayError(saveRes.error || 'Failed to initialize salary record.');
            return;
          }
          recordId = saveRes.id;
        }

        const res = await paySalaryAction(restaurantId, recordId, {
          paid_date: payDate,
          paid_amount: amount,
          payment_method_id: payMethodId,
          note: payNote.trim() || undefined,
        });

        if (res.success) {
          setPayingSalaryRecord(null);
          loadSalaryPreview(payrollMonth);
          loadStaffList();
          if (selectedStaffId === payingSalaryRecord.staff_id) {
            handleOpenStaffDetails(payingSalaryRecord.staff_id);
          }
        } else {
          setPayError(res.error || 'Failed to disburse salary.');
        }
      } catch (err: any) {
        setPayError(err?.message || 'Error processing payment.');
      }
    });
  };

  // Open Give Advance Modal
  const handleOpenGiveAdvance = (suggestedStaffId?: number) => {
    const today = new Date().toISOString().split('T')[0];
    setAdvStaffId(suggestedStaffId ? String(suggestedStaffId) : (staffList[0]?.id ? String(staffList[0].id) : ''));
    setAdvDate(today);
    setAdvAmount('');
    setAdvMethodId(paymentMethods[0]?.id ? String(paymentMethods[0].id) : '');
    setAdvNote('');
    setAdvError(null);
    setIsAdvanceModalOpen(true);
  };

  // Save Advance
  const handleSaveAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advStaffId) {
      setAdvError('Please select a staff member.');
      return;
    }

    const amount = parseFloat(advAmount);
    if (isNaN(amount) || amount <= 0) {
      setAdvError('Please enter a valid advance amount greater than 0.');
      return;
    }

    if (!advDate) {
      setAdvError('Date is required.');
      return;
    }

    if (!advMethodId) {
      setAdvError('Please select a payment method.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await createStaffAdvanceAction(restaurantId, {
          staff_id: advStaffId,
          date: advDate,
          amount,
          payment_method_id: advMethodId,
          note: advNote.trim() || undefined,
        });

        if (res.success) {
          setIsAdvanceModalOpen(false);
          loadStaffList();
          if (selectedStaffId === Number(advStaffId)) {
            handleOpenStaffDetails(Number(advStaffId));
          }
        } else {
          setAdvError(res.error || 'Failed to record advance.');
        }
      } catch (err: any) {
        setAdvError(err?.message || 'Error recording advance.');
      }
    });
  };

  return (
    <AccountsGate>
      <div className="flex flex-col min-h-screen bg-background pb-20 md:pb-12 space-y-4 sm:space-y-6 p-3 sm:p-6 lg:p-8 xl:p-10 w-full max-w-full overflow-x-hidden">
        {/* Header Section */}
        <div className="flex flex-col gap-3 pb-4 border-b border-border/40">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {t('staff', 'Staff')}
                </h1>
                <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold py-0.5 px-2.5 rounded-full">
                  {t('payrollAndHr', 'Payroll & HR')}
                </Badge>
        </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t(
                  isParlour ? 'staffSubtitleParlour' : 'staffSubtitle',
                  isParlour
                    ? 'Stylists and staff roster, attendance, commission/salary generation, and advances.'
                    : 'Staff roster, daily attendance sheet, salary generation, and cash advances.'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* 1. Top Summary Cards */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isParlour ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
          {/* This Month's Staff Cost */}
          <Card className="rounded-2xl border border-border/60 bg-card shadow-xs relative overflow-hidden transition-all hover:shadow-md hover:border-blue-500/30 group">
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-blue-400" />
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                    {t('staffCost', 'This Month Staff Cost')}
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-black text-foreground mt-1.5 tracking-tight">
                    {formatCurrency(summary.thisMonthStaffCost)}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-xs text-muted-foreground font-medium">
                <span>{t('salariesDisbursedSubtitle', 'Salaries disbursed & advances given this month')}</span>
              </div>
            </div>
          </Card>

          {/* Unpaid Salary Due */}
          <Card className="rounded-2xl border border-border/60 bg-card shadow-xs relative overflow-hidden transition-all hover:shadow-md hover:border-rose-500/30 group">
            <div className="h-1 w-full bg-gradient-to-r from-rose-500 to-pink-400" />
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                    {t('unpaidSalary', 'Unpaid Salary Due')}
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-1.5 tracking-tight">
                    {formatCurrency(summary.unpaidSalary)}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center border border-rose-500/20 group-hover:scale-110 transition-transform">
                  <Wallet className="w-5 h-5 text-rose-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-xs text-muted-foreground font-medium">
                <span>{t('pendingPayrollSubtitle', 'Pending net payable across generated payroll')}</span>
              </div>
            </div>
          </Card>

          {/* Total Advance Pending */}
          <Card className="rounded-2xl border border-border/60 bg-card shadow-xs relative overflow-hidden transition-all hover:shadow-md hover:border-amber-500/30 group">
            <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-yellow-400" />
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                    {t('totalAdvance', 'Total Advance Pending')}
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-black text-foreground mt-1.5 tracking-tight">
                    {formatCurrency(summary.totalAdvancePending)}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
                  <HandCoins className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-xs text-muted-foreground font-medium">
                <span>{t('unadjustedAdvancesSubtitle', 'Unadjusted advances given to staff')}</span>
              </div>
            </div>
          </Card>

          {/* Parlour: Staff Commission & Tips Card */}
          {isParlour && (
            <Card className="rounded-2xl border border-border/60 bg-card shadow-xs relative overflow-hidden transition-all hover:shadow-md hover:border-orange-500/30 group">
              <div className="h-1 w-full bg-gradient-to-r from-orange-500 to-amber-400" />
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                      {t('commissions', 'Commission & Tips')}
                    </p>
                    <h3 className="text-2xl sm:text-3xl font-black text-orange-600 dark:text-orange-400 mt-1.5 tracking-tight">
                      {formatCurrency(Number(summary.thisMonthCommissions || 0) + Number(summary.thisMonthTips || 0))}
                    </h3>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center border border-orange-500/20 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
                <div className="mt-3 flex items-center text-xs text-muted-foreground font-medium">
                  <span>
                    {summary.thisMonthServices || 0} services • Comm: {formatCurrency(summary.thisMonthCommissions || 0)}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* 2. Main Section Switcher (Directory, Attendance Sheet, Generate Salary, Commissions) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Tabs
            value={activeMainTab}
            onValueChange={(val: any) => setActiveMainTab(val)}
            className="w-full sm:w-auto"
          >
            <TabsList className={`grid ${isParlour ? 'grid-cols-4' : 'grid-cols-3'} w-full sm:w-auto rounded-xl bg-muted/40 p-1`}>
              <TabsTrigger value="directory" className="rounded-lg text-xs font-semibold px-2 sm:px-4">
                <Users className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />
                <span className="truncate">{t('staffDirectory', 'Staff Directory')}</span>
              </TabsTrigger>
              <TabsTrigger value="attendance" className="rounded-lg text-xs font-semibold px-2 sm:px-4">
                <ClipboardList className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />
                <span className="truncate">{t('dailyAttendance', 'Daily Attendance')}</span>
              </TabsTrigger>
              <TabsTrigger value="payroll" className="rounded-lg text-xs font-semibold px-2 sm:px-4">
                <Calculator className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />
                <span className="truncate">{t('generateSalary', 'Generate Salary')}</span>
              </TabsTrigger>
              {isParlour && (
                <TabsTrigger value="commissions" className="rounded-lg text-xs font-semibold px-2 sm:px-4">
                  <Sparkles className="w-3.5 h-3.5 mr-1 sm:mr-1.5 text-orange-500" />
                  <span className="truncate">{t('commissions', 'Commissions')}</span>
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
            {isParlour && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenAddCommission()}
                className="h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl border-orange-500/30 bg-orange-500/5 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 text-xs font-semibold flex-1 sm:flex-initial whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 text-[#FF5A36]" />
                <span>{t('addCommission', 'Record Commission')}</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenGiveAdvance()}
              className="h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl border-border/80 text-xs font-semibold hover:bg-muted flex-1 sm:flex-initial whitespace-nowrap"
            >
              <HandCoins className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 text-amber-600" />
              <span>{t('giveAdvance', 'Give Advance')}</span>
            </Button>

            <Button
              size="sm"
              onClick={handleOpenAddStaff}
              className={`h-9 sm:h-10 px-4 rounded-xl bg-gradient-to-r from-[#FF5A36] to-orange-500 hover:from-[#e04b2a] hover:to-orange-600 text-white font-semibold text-xs shadow-sm whitespace-nowrap ${
                isParlour ? 'w-full xs:w-auto xs:flex-1 sm:w-auto sm:flex-initial' : 'flex-1 sm:flex-initial'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
              <span>{t('addStaff', 'Add Staff')}</span>
            </Button>
          </div>
        </div>

        {/* 3. TAB CONTENT 1: STAFF DIRECTORY */}
        {activeMainTab === 'directory' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <Card className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t('searchStaff', 'Search staff by name, role or phone...')}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 h-10 rounded-xl bg-muted/30 border-border/70 text-xs sm:text-sm"
                  />
                </div>

                <Select
                  value={statusFilter}
                  onValueChange={(val: any) => {
                    setStatusFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[140px] h-10 rounded-xl text-xs bg-muted/20 border-border/60">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">{t('allStaff', 'All Staff')}</SelectItem>
                    <SelectItem value="active">{t('activeOnly', 'Active Only')}</SelectItem>
                    <SelectItem value="inactive">{t('inactive', 'Inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Staff Table */}
            <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#FF5A36]" />
                  <p className="text-xs text-muted-foreground">Loading staff members...</p>
                </div>
              ) : staffList.length === 0 ? (
                <div className="py-16 px-4 text-center max-w-sm mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto mb-3 border border-blue-500/20">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="text-base font-bold text-foreground mb-1">
                    {search || statusFilter !== 'all' ? 'No Matching Staff Found' : 'No Staff Members Added Yet'}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                    {isParlour
                      ? 'Add your stylists, beauticians, artists, and salon staff to record attendance, advance payments, and calculate salaries.'
                      : 'Add your cooks, waiters, cleaners, and managers to record attendance, advance payments, and calculate salaries.'}
                  </p>
                  <Button
                    size="sm"
                    onClick={handleOpenAddStaff}
                    className="rounded-xl bg-gradient-to-r from-[#FF5A36] to-orange-500 text-white text-xs font-semibold"
                  >
                    <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                    <span>{t('addFirstStaff', 'Add First Staff')}</span>
                  </Button>
                </div>
              ) : (
                <>
                  {/* Mobile & Small Devices Card View (lg:hidden print:hidden) */}
                  <div className="lg:hidden print:hidden p-3 sm:p-4 space-y-3">
                    {staffList.map((s) => (
                      <div
                        key={s.id}
                        className="p-3.5 sm:p-4 rounded-2xl border border-border/60 bg-muted/15 space-y-3 shadow-2xs transition-all hover:border-[#FF5A36]/30"
                      >
                        {/* Top Row: Avatar, Name, Role, Status & Actions Menu */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-[#FF5A36] flex items-center justify-center font-bold text-sm shrink-0 border border-orange-500/20">
                              {s.name ? s.name.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => handleOpenStaffDetails(s.id)}
                                className="font-bold text-sm text-foreground hover:text-[#FF5A36] text-left transition-colors truncate block"
                              >
                                {s.name}
                              </button>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 rounded-md bg-muted/30 text-muted-foreground">
                                  {s.role || 'Staff'}
                                </Badge>
                                {isParlour && (s as any).commission_value != null && Number((s as any).commission_value) > 0 && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 rounded-md bg-orange-500/10 text-orange-600 border-orange-500/20 font-semibold">
                                    <Percent className="w-2.5 h-2.5 mr-0.5 inline" />
                                    {(s as any).commission_type === 'percent' ? `${(s as any).commission_value}% Comm` : `৳${(s as any).commission_value} Comm`}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {s.is_active ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] py-0.5 px-2 rounded-md font-semibold">
                                {t('active', 'Active')}
                              </Badge>
                            ) : (
                              <Badge className="bg-muted text-muted-foreground border border-border text-[10px] py-0.5 px-2 rounded-md font-semibold">
                                {t('inactive', 'Inactive')}
                              </Badge>
                            )}

                            {/* Actions Dropdown */}
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
                              <DropdownMenuContent align="end" className="w-48 rounded-xl border border-border/60 bg-card shadow-lg p-1">
                                <DropdownMenuItem
                                  onClick={() => handleOpenStaffDetails(s.id)}
                                  className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-[#FF5A36] focus:text-[#FF5A36] focus:bg-orange-500/10"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{t('profileAndHistory', 'Profile & History')}</span>
                                </DropdownMenuItem>

                                {isParlour && (
                                  <DropdownMenuItem
                                    onClick={() => handleOpenAddCommission(s.id)}
                                    className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-orange-600 focus:text-orange-600 focus:bg-orange-500/10"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>{t('addCommission', 'Record Commission')}</span>
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem
                                  onClick={() => handleOpenGiveAdvance(s.id)}
                                  className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-amber-600 focus:text-amber-600 focus:bg-amber-500/10"
                                >
                                  <HandCoins className="w-3.5 h-3.5" />
                                  <span>{t('giveAdvance', 'Give Advance')}</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleOpenEditStaff(s)}
                                  className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium focus:bg-muted"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>{t('edit', 'Edit Staff')}</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleToggleStaffStatus(s.id)}
                                  className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium focus:bg-muted"
                                >
                                  {s.is_active ? (
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
                                    setDeleteStaffId(s.id);
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

                        {/* Middle Row: Phone & Joining Date */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-1 border-t border-border/30">
                          <div className="flex items-center gap-1.5">
                            {s.phone ? (
                              <a href={`tel:${s.phone}`} className="flex items-center gap-1 text-foreground hover:text-[#FF5A36] transition-colors">
                                <Phone className="w-3 h-3 text-muted-foreground/60" />
                                <span>{s.phone}</span>
                              </a>
                            ) : (
                              <span className="text-muted-foreground/50">No phone</span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            Joined {s.joining_date ? formatAccountDate(s.joining_date) : 'N/A'}
                          </span>
                        </div>

                        {/* Financial Metrics Grid */}
                        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-card border border-border/60 text-xs">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">{t('baseSalary', 'Base Salary')}</span>
                            <span className="font-bold text-foreground block">{formatCurrency(s.base_salary)}</span>
                            <span className="text-[10px] text-muted-foreground capitalize">({s.salary_type || 'monthly'})</span>
                          </div>

                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">{t('unpaidSalary', 'Unpaid Salary')}</span>
                            {s.unpaid_salary > 0 ? (
                              <span className="font-extrabold text-rose-600 dark:text-rose-400 block">
                                {formatCurrency(s.unpaid_salary)}
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold block">
                                {t('cleared', 'Cleared')}
                              </span>
                            )}
                          </div>

                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">{t('pendingAdvance', 'Pending Adv.')}</span>
                            {s.pending_advance > 0 ? (
                              <span className="font-semibold text-amber-600 dark:text-amber-400 block">
                                {formatCurrency(s.pending_advance)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50 block">৳ 0</span>
                            )}
                          </div>
                        </div>

                        {/* Parlour Month Activity if applicable */}
                        {isParlour && ((s as any).month_commission > 0 || (s as any).month_tips > 0 || (s as any).month_services > 0) && (
                          <div className="text-[11px] text-orange-600 dark:text-orange-400 font-medium flex items-center justify-between bg-orange-500/5 border border-orange-500/15 rounded-lg px-2.5 py-1.5">
                            <span>{t('thisMonth', 'This Month')}: {(s as any).month_services || 0} services</span>
                            <span className="font-bold">+{formatCurrency(Number((s as any).month_commission || 0) + Number((s as any).month_tips || 0))}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Desktop & Large Screen Table View (hidden lg:block print:block) */}
                  <div className="hidden lg:block print:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                          <th className="py-3 px-4">{t('staffMember', 'Staff Member')}</th>
                          <th className="py-3 px-4 hidden md:table-cell">{t('phone', 'Phone')}</th>
                          <th className="py-3 px-4">{t('baseSalary', 'Base Salary')}</th>
                          <th className="py-3 px-4 hidden lg:table-cell">{t('pendingAdvance', 'Pending Advance')}</th>
                          <th className="py-3 px-4">{t('unpaidSalary', 'Unpaid Salary')}</th>
                          <th className="py-3 px-4 text-center">{t('status', 'Status')}</th>
                          <th className="py-3 px-4 text-right">{t('actions', 'Actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {staffList.map((s) => (
                          <tr key={s.id} className="hover:bg-muted/30 transition-colors group">
                            {/* Name & Role */}
                            <td className="py-3.5 px-4 font-medium text-foreground">
                              <button
                                type="button"
                                onClick={() => handleOpenStaffDetails(s.id)}
                                className="font-bold text-foreground hover:text-[#FF5A36] text-left transition-colors"
                              >
                                {s.name}
                              </button>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <Badge variant="outline" className="text-[10px] py-0 px-2 rounded-md bg-muted/30 text-muted-foreground">
                                  {s.role || 'Staff'}
                                </Badge>
                                {isParlour && (s as any).commission_value != null && Number((s as any).commission_value) > 0 && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 rounded-md bg-orange-500/10 text-orange-600 border-orange-500/20 font-semibold">
                                    <Percent className="w-2.5 h-2.5 mr-0.5 inline" />
                                    {(s as any).commission_type === 'percent' ? `${(s as any).commission_value}% Comm` : `৳${(s as any).commission_value} Comm`}
                                  </Badge>
                                )}
                                <span className="text-[10px] text-muted-foreground">
                                  • Joined {s.joining_date ? formatAccountDate(s.joining_date) : 'N/A'}
                                </span>
                              </div>
                            </td>

                            {/* Phone */}
                            <td className="py-3.5 px-4 text-muted-foreground hidden md:table-cell">
                              {s.phone ? (
                                <div className="flex items-center gap-1 text-xs">
                                  <Phone className="w-3 h-3 text-muted-foreground/60" />
                                  <span>{s.phone}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/40 text-xs">-</span>
                              )}
                            </td>

                            {/* Base Salary */}
                            <td className="py-3.5 px-4 font-semibold text-foreground whitespace-nowrap">
                              <div>{formatCurrency(s.base_salary)}</div>
                              <span className="text-[10px] text-muted-foreground capitalize">
                                ({s.salary_type || 'monthly'})
                              </span>
                              {isParlour && ((s as any).month_commission > 0 || (s as any).month_tips > 0 || (s as any).month_services > 0) && (
                                <span className="text-[10px] text-orange-600 dark:text-orange-400 block mt-0.5 font-medium">
                                  {(s as any).month_services || 0} serv • +{formatCurrency(Number((s as any).month_commission || 0) + Number((s as any).month_tips || 0))}
                                </span>
                              )}
                            </td>

                            {/* Pending Advance */}
                            <td className="py-3.5 px-4 whitespace-nowrap hidden lg:table-cell">
                              {s.pending_advance > 0 ? (
                                <span className="font-semibold text-amber-600 dark:text-amber-400">
                                  {formatCurrency(s.pending_advance)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/50 text-xs">৳ 0</span>
                              )}
                            </td>

                            {/* Unpaid Salary */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {s.unpaid_salary > 0 ? (
                                <span className="font-extrabold text-rose-600 dark:text-rose-400">
                                  {formatCurrency(s.unpaid_salary)}
                                </span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                                  {t('cleared', 'Cleared')}
                                </span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {s.is_active ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] py-0.5 px-2 rounded-md font-semibold">
                                  {t('active', 'Active')}
                                </Badge>
                              ) : (
                                <Badge className="bg-muted text-muted-foreground border border-border text-[10px] py-0.5 px-2 rounded-md font-semibold">
                                  {t('inactive', 'Inactive')}
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
                                <DropdownMenuContent align="end" className="w-48 rounded-xl border border-border/60 bg-card shadow-lg p-1">
                                  <DropdownMenuItem
                                    onClick={() => handleOpenStaffDetails(s.id)}
                                    className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-[#FF5A36] focus:text-[#FF5A36] focus:bg-orange-500/10"
                                  >
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{t('profileAndHistory', 'Profile & History')}</span>
                                  </DropdownMenuItem>

                                  {isParlour && (
                                    <DropdownMenuItem
                                      onClick={() => handleOpenAddCommission(s.id)}
                                      className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-orange-600 focus:text-orange-600 focus:bg-orange-500/10"
                                    >
                                      <Sparkles className="w-3.5 h-3.5" />
                                      <span>{t('addCommission', 'Record Commission')}</span>
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuItem
                                    onClick={() => handleOpenGiveAdvance(s.id)}
                                    className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-amber-600 focus:text-amber-600 focus:bg-amber-500/10"
                                  >
                                    <HandCoins className="w-3.5 h-3.5" />
                                    <span>{t('giveAdvance', 'Give Advance')}</span>
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => handleOpenEditStaff(s)}
                                    className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium focus:bg-muted"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span>{t('edit', 'Edit Staff')}</span>
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => handleToggleStaffStatus(s.id)}
                                    className="cursor-pointer flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium focus:bg-muted"
                                  >
                                    {s.is_active ? (
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
                                      setDeleteStaffId(s.id);
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
                </>
              )}
            </Card>
          </div>
        )}

        {/* 4. TAB CONTENT 2: DAILY ATTENDANCE KHATA */}
        {activeMainTab === 'attendance' && (
          <div className="space-y-4">
            <Card className="rounded-2xl border border-border/60 bg-card p-3.5 sm:p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Date Picker */}
                <div className="flex flex-wrap items-end gap-2.5">
                  <div className="space-y-1 flex-1 sm:flex-initial">
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                      {t('attendanceDate', 'Attendance Date')}
                    </Label>
                    <Input
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="h-10 rounded-xl text-xs bg-muted/20 border-border/60 font-semibold"
                    />
                  </div>

                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMarkAllPresent}
                      className="h-10 px-3 rounded-xl border-border/70 text-xs font-semibold hover:bg-muted whitespace-nowrap"
                    >
                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      {t('markAllPresent', 'Mark All Present')}
                    </Button>
                  </div>
                </div>

                {/* Save Attendance Button */}
                <div className="flex items-center gap-2 pt-2 sm:pt-0">
                  {attSuccessMsg && (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      {attSuccessMsg}
                    </span>
                  )}
                  <Button
                    onClick={handleSaveAttendance}
                    disabled={attSaving || attLoading}
                    className="w-full sm:w-auto h-10 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-semibold text-xs shadow-sm ml-auto"
                  >
                    {attSaving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    {t('saveAttendanceSheet', 'Save Attendance Sheet')}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Attendance Roster */}
            <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
              {attLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#FF5A36]" />
                  <p className="text-xs text-muted-foreground">Loading attendance roster...</p>
                </div>
              ) : attendanceList.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No active staff found. Please add active staff members first.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[500px]">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4">{t('staffMember', 'Staff Member')}</th>
                        <th className="py-3 px-4">Status Selector</th>
                        <th className="py-3 px-4">Note (Optional)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {attendanceList.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground whitespace-nowrap">
                            <div>{item.name}</div>
                            <span className="text-[11px] text-muted-foreground font-normal">
                              {item.role}
                            </span>
                          </td>

                          {/* 4 Attendance Status Buttons */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {/* Present */}
                              <button
                                type="button"
                                onClick={() => handleAttendanceChange(item.id, 'present')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                  item.status === 'present'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-muted/30 text-muted-foreground border-border/60 hover:bg-emerald-500/10 hover:text-emerald-600'
                                }`}
                              >
                                Present
                              </button>

                              {/* Absent */}
                              <button
                                type="button"
                                onClick={() => handleAttendanceChange(item.id, 'absent')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                  item.status === 'absent'
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                    : 'bg-muted/30 text-muted-foreground border-border/60 hover:bg-rose-500/10 hover:text-rose-600'
                                }`}
                              >
                                Absent
                              </button>

                              {/* Leave */}
                              <button
                                type="button"
                                onClick={() => handleAttendanceChange(item.id, 'leave')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                  item.status === 'leave'
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'bg-muted/30 text-muted-foreground border-border/60 hover:bg-blue-500/10 hover:text-blue-600'
                                }`}
                              >
                                Leave
                              </button>

                              {/* Half Day */}
                              <button
                                type="button"
                                onClick={() => handleAttendanceChange(item.id, 'half_day')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                  item.status === 'half_day'
                                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                    : 'bg-muted/30 text-muted-foreground border-border/60 hover:bg-amber-500/10 hover:text-amber-600'
                                }`}
                              >
                                Half Day
                              </button>
                            </div>
                          </td>

                          {/* Attendance Note */}
                          <td className="py-3 px-4">
                            <Input
                              placeholder="e.g. Late by 30 mins, sick leave"
                              value={item.note || ''}
                              onChange={(e) => handleAttendanceNoteChange(item.id, e.target.value)}
                              className="h-8 text-xs rounded-lg bg-muted/20 border-border/60 max-w-xs"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* 5. TAB CONTENT 3: GENERATE SALARY (MONTH-END PAYROLL) */}
        {activeMainTab === 'payroll' && (
          <div className="space-y-4">
            <Card className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                      {t('selectPayrollMonth', 'Select Payroll Month')}
                    </Label>
                    <Input
                      type="month"
                      value={payrollMonth}
                      onChange={(e) => setPayrollMonth(e.target.value)}
                      className="h-10 rounded-xl text-xs bg-muted/20 border-border/60 font-semibold"
                    />
                  </div>
                  <div className="pt-5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadSalaryPreview(payrollMonth)}
                      className="h-10 px-3.5 rounded-xl border-border/70 text-xs font-semibold hover:bg-muted"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      {t('recalculateSheet', 'Recalculate Sheet')}
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground text-left sm:text-right pt-2 sm:pt-0">
                  <p className="font-semibold text-foreground">Manual Override Enabled</p>
                  <p>You can freely adjust bonus, overtime, deductions, and advance amounts.</p>
                </div>
              </div>
            </Card>

            {/* Payroll Sheet */}
            <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
              {payrollLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#FF5A36]" />
                  <p className="text-xs text-muted-foreground">Calculating payroll preview...</p>
                </div>
              ) : salaryPreviewRows.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No active staff members found for salary generation.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs min-w-[780px]">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[10px] uppercase font-semibold">
                        <th className="py-3 px-3">Staff / Role</th>
                        <th className="py-3 px-3">Attendance</th>
                        <th className="py-3 px-2 w-24">Base Salary</th>
                        {isParlour && <th className="py-3 px-2 w-24 text-orange-600">Commission (+)</th>}
                        {isParlour && <th className="py-3 px-2 w-20 text-emerald-600">Tips (+)</th>}
                        <th className="py-3 px-2 w-20">Bonus (+)</th>
                        <th className="py-3 px-2 w-20">Overtime (+)</th>
                        <th className="py-3 px-2 w-20">Deduction (-)</th>
                        <th className="py-3 px-2 w-24">Advance Adj (-)</th>
                        <th className="py-3 px-3 text-right">Net Payable</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {salaryPreviewRows.map((row) => (
                        <tr key={row.staff_id} className="hover:bg-muted/20 transition-colors">
                          {/* Staff */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-bold text-foreground block">{row.name}</span>
                            <span className="text-[10px] text-muted-foreground capitalize">
                              {row.role} • {row.salary_type}
                            </span>
                          </td>

                          {/* Attendance */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-[10px]">
                              <span className="text-emerald-600 font-semibold">{row.attendance?.presents || 0}P</span>
                              <span>•</span>
                              <span className="text-rose-600 font-semibold">{row.attendance?.absents || 0}A</span>
                              <span>•</span>
                              <span className="text-blue-600 font-semibold">{row.attendance?.leaves || 0}L</span>
                              <span>•</span>
                              <span className="text-amber-600 font-semibold">{row.attendance?.half_days || 0}H</span>
                            </div>
                          </td>

                          {/* Base Salary */}
                          <td className="py-3 px-2">
                            <Input
                              type="number"
                              value={row.base_salary}
                              onChange={(e) => handlePayrollRowChange(row.staff_id, 'base_salary', e.target.value)}
                              className="h-8 text-xs font-semibold rounded-lg bg-muted/20"
                            />
                          </td>

                          {/* Parlour: Commission Amount */}
                          {isParlour && (
                            <td className="py-3 px-2">
                              <Input
                                type="number"
                                placeholder="0"
                                value={row.commission_amount ?? ''}
                                onChange={(e) => handlePayrollRowChange(row.staff_id, 'commission_amount', e.target.value)}
                                className="h-8 text-xs font-semibold rounded-lg bg-orange-500/5 border-orange-500/30 text-orange-600"
                              />
                              {row.services_count > 0 && (
                                <span className="text-[9px] text-muted-foreground block mt-0.5">
                                  {row.services_count} services
                                </span>
                              )}
                            </td>
                          )}

                          {/* Parlour: Tips Amount */}
                          {isParlour && (
                            <td className="py-3 px-2">
                              <Input
                                type="number"
                                placeholder="0"
                                value={row.tip_amount ?? ''}
                                onChange={(e) => handlePayrollRowChange(row.staff_id, 'tip_amount', e.target.value)}
                                className="h-8 text-xs font-semibold rounded-lg bg-emerald-500/5 border-emerald-500/30 text-emerald-600"
                              />
                            </td>
                          )}

                          {/* Bonus */}
                          <td className="py-3 px-2">
                            <Input
                              type="number"
                              placeholder="0"
                              value={row.bonus || ''}
                              onChange={(e) => handlePayrollRowChange(row.staff_id, 'bonus', e.target.value)}
                              className="h-8 text-xs rounded-lg bg-muted/20"
                            />
                          </td>

                          {/* Overtime */}
                          <td className="py-3 px-2">
                            <Input
                              type="number"
                              placeholder="0"
                              value={row.overtime || ''}
                              onChange={(e) => handlePayrollRowChange(row.staff_id, 'overtime', e.target.value)}
                              className="h-8 text-xs rounded-lg bg-muted/20"
                            />
                          </td>

                          {/* Deduction */}
                          <td className="py-3 px-2">
                            <Input
                              type="number"
                              placeholder="0"
                              value={row.deduction || ''}
                              onChange={(e) => handlePayrollRowChange(row.staff_id, 'deduction', e.target.value)}
                              className="h-8 text-xs rounded-lg bg-muted/20 text-rose-600"
                            />
                          </td>

                          {/* Advance Adjusted */}
                          <td className="py-3 px-2">
                            <Input
                              type="number"
                              placeholder="0"
                              value={row.advance_adjusted || ''}
                              onChange={(e) => handlePayrollRowChange(row.staff_id, 'advance_adjusted', e.target.value)}
                              className="h-8 text-xs rounded-lg bg-muted/20 text-amber-600"
                            />
                            {row.pending_advance > 0 && (
                              <span className="text-[9px] text-muted-foreground block mt-0.5">
                                Avail: {formatCurrency(row.pending_advance)}
                              </span>
                            )}
                          </td>

                          {/* Net Payable */}
                          <td className="py-3 px-3 text-right font-extrabold text-foreground whitespace-nowrap text-sm">
                            {formatCurrency(row.net_payable)}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <Badge
                              className={`text-[10px] py-0 px-2 font-semibold ${
                                row.status === 'paid'
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                  : row.status === 'partial'
                                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                              }`}
                            >
                              {row.status || 'unpaid'}
                            </Badge>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSaveSingleSalary(row)}
                                className="h-7 px-2 rounded-lg text-[11px] font-semibold border-border/70"
                                title="Save record"
                              >
                                Save
                              </Button>

                              {row.status !== 'paid' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenPaySalary(row)}
                                  className="h-7 px-2.5 rounded-lg text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  Disburse
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB CONTENT: COMMISSIONS & SERVICES (PARLOUR ONLY) */}
        {activeMainTab === 'commissions' && isParlour && (
          <div className="space-y-4">
            {/* Filter & Action Toolbar */}
            <Card className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                      {t('month', 'Month')}
                    </Label>
                    <Input
                      type="month"
                      value={commissionMonth}
                      onChange={(e) => setCommissionMonth(e.target.value)}
                      className="h-10 rounded-xl text-xs bg-muted/20 border-border/60 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                      {t('staffMember', 'Staff Member')}
                    </Label>
                    <Select
                      value={commissionStaffFilter}
                      onValueChange={(val) => setCommissionStaffFilter(val)}
                    >
                      <SelectTrigger className="w-[170px] h-10 rounded-xl text-xs bg-muted/20 border-border/60">
                        <SelectValue placeholder="All Staff" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">{t('allStaff', 'All Staff')}</SelectItem>
                        {staffList.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 md:pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsServicesModalOpen(true)}
                    className="h-10 px-3.5 rounded-xl border-border/80 text-xs font-semibold hover:bg-muted"
                  >
                    <Scissors className="w-3.5 h-3.5 mr-1.5 text-orange-500" />
                    <span>{t('manageServices', 'Manage Services')}</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleOpenAddCommission()}
                    className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#FF5A36] to-orange-500 hover:from-[#e04b2a] hover:to-orange-600 text-white font-semibold text-xs shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    <span>{t('addCommission', 'Record Commission')}</span>
                  </Button>
                </div>
              </div>
            </Card>

            {/* 4 Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Services Logged
                </span>
                <p className="text-2xl font-black text-foreground mt-1">
                  {commissionSummary.totalServices}
                </p>
                <span className="text-[10px] text-muted-foreground">In selected month</span>
              </Card>

              <Card className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Service Turnover
                </span>
                <p className="text-2xl font-black text-foreground mt-1">
                  {formatCurrency(commissionSummary.totalServiceAmount)}
                </p>
                <span className="text-[10px] text-muted-foreground">Total bill value</span>
              </Card>

              <Card className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Staff Commission
                </span>
                <p className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-1">
                  {formatCurrency(commissionSummary.totalCommissionAmount)}
                </p>
                <span className="text-[10px] text-muted-foreground">Earned by staff</span>
              </Card>

              <Card className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Staff Tips
                </span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatCurrency(commissionSummary.totalTipAmount)}
                </p>
                <span className="text-[10px] text-muted-foreground">Belongs to staff (not income)</span>
              </Card>
            </div>

            {/* Commissions Log Table */}
            <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
              {isCommissionLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#FF5A36]" />
                  <p className="text-xs text-muted-foreground">Loading commissions log...</p>
                </div>
              ) : commissions.length === 0 ? (
                <div className="py-16 px-4 text-center max-w-sm mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center mx-auto mb-3 border border-orange-500/20">
                    <Sparkles className="w-6 h-6 text-orange-600" />
                  </div>
                  <h4 className="text-base font-bold text-foreground mb-1">
                    No Commission Entries Logged
                  </h4>
                  <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                    Record service commissions and tips for your stylists, beauticians, and salon technicians after completing services.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => handleOpenAddCommission()}
                    className="rounded-xl bg-gradient-to-r from-[#FF5A36] to-orange-500 text-white text-xs font-semibold"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    <span>{t('addCommission', 'Record Commission')}</span>
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[10px] uppercase font-semibold">
                        <th className="py-3 px-4">{t('date', 'Date')}</th>
                        <th className="py-3 px-4">{t('staffMember', 'Staff Member')}</th>
                        <th className="py-3 px-4">{t('service', 'Service')}</th>
                        <th className="py-3 px-4 hidden sm:table-cell">{t('customerName', 'Customer')}</th>
                        <th className="py-3 px-4 text-right">{t('serviceAmount', 'Service Bill')}</th>
                        <th className="py-3 px-4 text-right">{t('commissionAmount', 'Commission')}</th>
                        <th className="py-3 px-4 text-right hidden md:table-cell">{t('tipAmount', 'Tips')}</th>
                        <th className="py-3 px-4 hidden lg:table-cell">{t('note', 'Note')}</th>
                        <th className="py-3 px-4 text-right">{t('actions', 'Actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {commissions.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground whitespace-nowrap">
                            {formatAccountDate(c.date)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-bold text-foreground block">{c.staff_name}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">{c.staff_role}</span>
                              {c.is_locked && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 rounded bg-amber-500/10 text-amber-600 border-amber-500/20 font-semibold flex items-center gap-0.5">
                                  <Lock className="w-2.5 h-2.5" />
                                  Paid (Locked)
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <Badge variant="outline" className="text-[11px] py-0.5 px-2 rounded-md bg-muted/30">
                              {c.service_name || 'Custom / Other'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-muted-foreground hidden sm:table-cell">
                            {c.customer_name || '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-foreground whitespace-nowrap">
                            {formatCurrency(c.service_amount)}
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                            {formatCurrency(c.commission_amount)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-emerald-600 whitespace-nowrap hidden md:table-cell">
                            {c.tip_amount > 0 ? formatCurrency(c.tip_amount) : '-'}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground max-w-xs truncate hidden lg:table-cell">
                            {c.note || '-'}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={Boolean(c.is_locked)}
                                onClick={() => handleOpenEditCommission(c)}
                                className={`w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground ${c.is_locked ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted'}`}
                                title={c.is_locked ? 'Salary already paid/partial for this month (Locked)' : 'Edit commission'}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={Boolean(c.is_locked)}
                                onClick={() => handleDeleteCommission(c)}
                                className={`w-7 h-7 rounded-lg text-rose-500 hover:text-rose-600 ${c.is_locked ? 'opacity-30 cursor-not-allowed' : 'hover:bg-rose-500/10'}`}
                                title={c.is_locked ? 'Salary already paid/partial for this month (Locked)' : 'Delete commission'}
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
            </Card>
          </div>
        )}

        {/* 6. Add / Edit Staff Modal - Bottom Sheet on mobile, Dialog on desktop */}
        <AccountsSheet open={isStaffModalOpen} onOpenChange={setIsStaffModalOpen}>
          <AccountsSheetContent className="overflow-y-auto max-h-[88vh]">
            <AccountsSheetHeader>
              <AccountsSheetTitle>
                {editingStaff ? t('editStaff', 'Edit Staff Member') : t('addStaff', 'Add Staff Member')}
              </AccountsSheetTitle>
              <AccountsSheetDescription>
                Enter employee profile, role, and salary remuneration structure.
              </AccountsSheetDescription>
            </AccountsSheetHeader>

            <form onSubmit={handleSaveStaff} className="space-y-4 pt-2">
              {staffFormError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                  {staffFormError}
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  required
                  placeholder="e.g. Md. Rafiqul Islam"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="h-10 rounded-xl text-xs bg-muted/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-primary" /> Phone Number *
                    </Label>
                    <span className={`text-[10px] font-mono font-bold ${staffPhone.length === 11 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                      {staffPhone.length}/11
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
                      value={staffPhone}
                      onChange={(e) => setStaffPhone(sanitizeBdPhone(e.target.value))}
                      maxLength={11}
                      className="flex-1 bg-transparent px-3 text-xs outline-none font-mono text-foreground placeholder:text-muted-foreground/50 h-full"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Role / Designation</Label>
                  <Select value={staffRole} onValueChange={setStaffRole}>
                    <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/20">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {commonRoles.concat(staffRole && !commonRoles.includes(staffRole) ? [staffRole] : []).map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Salary Type</Label>
                  <Select
                    value={staffSalaryType}
                    onValueChange={(val: any) => setStaffSalaryType(val)}
                  >
                    <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/20">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="monthly">Monthly Fixed</SelectItem>
                      <SelectItem value="daily">Daily Wage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Base Salary (BDT ৳) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    required
                    value={staffBaseSalary}
                    onChange={(e) => setStaffBaseSalary(e.target.value)}
                    className="h-10 rounded-xl text-xs bg-muted/20 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Joining Date</Label>
                <Input
                  type="date"
                  value={staffJoiningDate}
                  onChange={(e) => setStaffJoiningDate(e.target.value)}
                  className="h-10 rounded-xl text-xs bg-muted/20"
                />
              </div>

              {isParlour && (
                <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                      Staff Commission Rate (Optional)
                    </Label>
                    <span className="text-[10px] text-muted-foreground">Overrides service default</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Commission Type</Label>
                      <Select value={staffCommType} onValueChange={(val: any) => setStaffCommType(val)}>
                        <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/20">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="percent">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount (৳)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Commission Value</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={staffCommType === 'percent' ? 'e.g. 20 (%)' : 'e.g. 150 (৳)'}
                        value={staffCommValue}
                        onChange={(e) => setStaffCommValue(e.target.value)}
                        className="h-9 rounded-xl text-xs bg-muted/20 font-semibold"
                      />
                    </div>
                  </div>
                </div>
              )}

              <AccountsSheetFooter className="pt-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="rounded-xl text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl text-xs h-10 min-h-[44px] bg-gradient-to-r from-[#FF5A36] to-orange-500 text-white font-semibold"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                  {editingStaff ? 'Save Changes' : 'Add Staff'}
                </Button>
              </AccountsSheetFooter>
            </form>
          </AccountsSheetContent>
        </AccountsSheet>

        {/* 7. Pay Salary Modal - Bottom Sheet on mobile, Dialog on desktop */}
        <AccountsSheet open={Boolean(payingSalaryRecord)} onOpenChange={() => setPayingSalaryRecord(null)}>
          <AccountsSheetContent className="overflow-y-auto max-h-[88vh]">
            <AccountsSheetHeader>
              <AccountsSheetTitle>
                {t('paySalary', 'Disburse Staff Salary')}
              </AccountsSheetTitle>
              <AccountsSheetDescription>
                Paying salary will automatically log an expense under Staff Salary with this staff linked.
              </AccountsSheetDescription>
            </AccountsSheetHeader>

            <form onSubmit={handleSaveSalaryPayment} className="space-y-4 pt-2">
              {payError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                  {payError}
                </div>
              )}

              <div className="p-3 rounded-xl bg-muted/20 border border-border/60 text-xs">
                <div className="flex justify-between font-bold text-foreground">
                  <span>{payingSalaryRecord?.name}</span>
                  <span>Month: {payingSalaryRecord?.month || payrollMonth}</span>
                </div>
                <div className="flex justify-between text-muted-foreground mt-1">
                  <span>Net Payable: {formatCurrency(payingSalaryRecord?.net_payable)}</span>
                  <span>Already Paid: {formatCurrency(payingSalaryRecord?.paid_amount)}</span>
                </div>
              </div>

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
                    Disbursed Amount (BDT ৳) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="h-10 rounded-xl text-xs bg-muted/20 font-bold"
                  />
                </div>
              </div>

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
                <Label className="text-xs font-semibold text-foreground">Voucher / Note</Label>
                <Textarea
                  placeholder="e.g. Paid in cash with monthly slip signed"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  rows={2}
                  className="rounded-xl text-xs bg-muted/20 resize-none"
                />
              </div>

              <AccountsSheetFooter className="pt-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPayingSalaryRecord(null)}
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
                  Confirm Disbursement
                </Button>
              </AccountsSheetFooter>
            </form>
          </AccountsSheetContent>
        </AccountsSheet>

        {/* 8. Give Advance Modal - Bottom Sheet on mobile, Dialog on desktop */}
        <AccountsSheet open={isAdvanceModalOpen} onOpenChange={setIsAdvanceModalOpen}>
          <AccountsSheetContent className="overflow-y-auto max-h-[88vh]">
            <AccountsSheetHeader>
              <AccountsSheetTitle>
                {t('giveAdvance', 'Give Staff Advance')}
              </AccountsSheetTitle>
              <AccountsSheetDescription>
                Logs an advance payout and records it as an expense under Staff Advance.
              </AccountsSheetDescription>
            </AccountsSheetHeader>

            <form onSubmit={handleSaveAdvance} className="space-y-4 pt-2">
              {advError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                  {advError}
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">
                  Select Staff Member <span className="text-destructive">*</span>
                </Label>
                <Select value={advStaffId} onValueChange={setAdvStaffId}>
                  <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/20">
                    <SelectValue placeholder="Staff Member" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {staffList.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name} ({s.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="date"
                    required
                    value={advDate}
                    onChange={(e) => setAdvDate(e.target.value)}
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
                    value={advAmount}
                    onChange={(e) => setAdvAmount(e.target.value)}
                    className="h-10 rounded-xl text-xs bg-muted/20 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">
                  Payment Method <span className="text-destructive">*</span>
                </Label>
                <Select value={advMethodId} onValueChange={setAdvMethodId}>
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
                <Label className="text-xs font-semibold text-foreground">Reason / Note</Label>
                <Textarea
                  placeholder="e.g. Medical emergency advance, family travel"
                  value={advNote}
                  onChange={(e) => setAdvNote(e.target.value)}
                  rows={2}
                  className="rounded-xl text-xs bg-muted/20 resize-none"
                />
              </div>

              <AccountsSheetFooter className="pt-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="rounded-xl text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl text-xs h-10 min-h-[44px] bg-gradient-to-r from-amber-600 to-orange-500 text-white font-semibold"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                  Confirm Advance
                </Button>
              </AccountsSheetFooter>
            </form>
          </AccountsSheetContent>
        </AccountsSheet>

        {/* 9A. Mobile Dedicated Full-Screen View (< md) with sticky Back header and scroll restoration */}
        {Boolean(selectedStaffId) && (
          <div className="fixed inset-0 z-50 bg-background overflow-y-auto flex flex-col md:hidden animate-in fade-in-0 duration-200">
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/70 px-4 py-3 flex items-center justify-between shrink-0 shadow-2xs">
              <button
                type="button"
                onClick={handleCloseStaffDetails}
                className="min-h-[44px] flex items-center gap-2 text-sm font-bold text-foreground hover:text-[#FF5A36] transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#FF5A36]" />
                <span>{t('backToStaff', 'Back to Staff')}</span>
              </button>
              <Badge variant="outline" className="text-xs font-semibold">
                {staffDetails?.staff?.name || 'Staff Profile'}
              </Badge>
            </div>

            <div className="p-4 flex-1">
              {detailsLoading || !staffDetails ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#FF5A36]" />
                  <p className="text-xs text-muted-foreground">Loading staff profile...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mobile Staff Profile Content */}
                  <div className="flex flex-col gap-3 p-4 rounded-2xl bg-muted/20 border border-border/60">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-lg font-black text-foreground">{staffDetails.staff.name}</h3>
                        <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px] font-semibold">
                          {staffDetails.staff.role || 'Staff'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {staffDetails.staff.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#FF5A36]" />
                            {staffDetails.staff.phone}
                          </span>
                        )}
                        <span>
                          Base: {formatCurrency(staffDetails.staff.base_salary)} ({staffDetails.staff.salary_type})
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleOpenGiveAdvance(staffDetails.staff.id)}
                      className="rounded-xl text-xs min-h-[44px] h-10 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                    >
                      <HandCoins className="w-3.5 h-3.5 mr-1.5" />
                      Give Advance
                    </Button>
                  </div>

                  {/* 4 Metric Badges */}
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-3 rounded-xl border border-border/60 bg-card">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Present</span>
                      <p className="text-base font-black text-emerald-600 mt-0.5">{staffDetails.attendance_summary.present} Days</p>
                    </div>
                    <div className="p-3 rounded-xl border border-border/60 bg-card">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Absent</span>
                      <p className="text-base font-black text-rose-600 mt-0.5">{staffDetails.attendance_summary.absent} Days</p>
                    </div>
                    <div className="p-3 rounded-xl border border-border/60 bg-card">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Pending Adv</span>
                      <p className="text-base font-black text-amber-600 mt-0.5">{formatCurrency(staffDetails.staff.pending_advance)}</p>
                    </div>
                    <div className="p-3 rounded-xl border border-border/60 bg-card">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Paid Records</span>
                      <p className="text-base font-black text-foreground mt-0.5">{staffDetails.salaries.length}</p>
                    </div>
                  </div>

                  {/* Tabs */}
                  <Tabs defaultValue="salaryHistory" className="w-full">
                    <TabsList className={`grid ${isParlour ? 'grid-cols-3' : 'grid-cols-2'} w-full rounded-xl bg-muted/40 p-1`}>
                      <TabsTrigger value="salaryHistory" className="rounded-lg text-xs font-semibold">
                        Salaries ({staffDetails.salaries.length})
                      </TabsTrigger>
                      <TabsTrigger value="advances" className="rounded-lg text-xs font-semibold">
                        Advances ({staffDetails.advances.length})
                      </TabsTrigger>
                      {isParlour && (
                        <TabsTrigger value="commissionsHistory" className="rounded-lg text-xs font-semibold">
                          Commissions ({staffDetails.commissions?.length || 0})
                        </TabsTrigger>
                      )}
                    </TabsList>

                    <TabsContent value="salaryHistory" className="pt-2">
                      {staffDetails.salaries.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">No payroll disbursement records.</div>
                      ) : (
                        <div className="divide-y divide-border/40 border border-border/60 rounded-xl overflow-hidden bg-card">
                          {staffDetails.salaries.map((s: any) => (
                            <div key={s.id} className="p-3 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-foreground">Month: {s.month}</span>
                                <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] py-0 px-1.5 font-bold">
                                  {s.status}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Disbursed: {formatAccountDate(s.payment_date)}</span>
                                <span className="font-extrabold text-foreground">{formatCurrency(s.net_salary)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="advances" className="pt-2">
                      {staffDetails.advances.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">No advances recorded.</div>
                      ) : (
                        <div className="divide-y divide-border/40 border border-border/60 rounded-xl overflow-hidden bg-card">
                          {staffDetails.advances.map((a: any) => (
                            <div key={a.id} className="p-3 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-foreground">{formatAccountDate(a.date)}</span>
                                <Badge className={`text-[10px] py-0 px-1.5 font-semibold ${a.is_settled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                  {a.is_settled ? 'Settled' : 'Pending'}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{a.payment_method_name || 'Cash'} {a.note ? `(${a.note})` : ''}</span>
                                <span className="font-extrabold text-amber-600">{formatCurrency(a.amount)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    {isParlour && (
                      <TabsContent value="commissionsHistory" className="pt-2">
                        {(!staffDetails.commissions || staffDetails.commissions.length === 0) ? (
                          <div className="py-8 text-center text-xs text-muted-foreground">No commissions logged.</div>
                        ) : (
                          <div className="divide-y divide-border/40 border border-border/60 rounded-xl overflow-hidden bg-card">
                            {staffDetails.commissions.map((c: any) => (
                              <div key={c.id} className="p-3 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-foreground">{formatAccountDate(c.date)}</span>
                                  <Badge className="bg-purple-500/10 text-purple-600 border border-purple-500/20 text-[10px] py-0 px-1.5 font-semibold">
                                    {c.service_name || 'Service'}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Client: {c.customer_name || 'Walk-in'}</span>
                                  <span className="font-extrabold text-purple-600">{formatCurrency(c.commission_amount)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    )}
                  </Tabs>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 9B. Staff Details & Ledger Profile Modal (Desktop >= md) */}
        <div className="hidden md:block">
        <Dialog
          open={Boolean(selectedStaffId)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedStaffId(null);
              setStaffDetails(null);
            }
          }}
        >
          <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 bg-card border border-border/80">
            <DialogHeader className="sr-only">
              <DialogTitle>{staffDetails?.staff?.name || 'Staff Profile'}</DialogTitle>
              <DialogDescription>Staff profile and salary records</DialogDescription>
            </DialogHeader>
            {detailsLoading || !staffDetails ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF5A36]" />
                <p className="text-xs text-muted-foreground">Loading staff profile...</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Profile Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl bg-muted/20 border border-border/60">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-black text-foreground">{staffDetails.staff.name}</h3>
                      <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px] font-semibold">
                        {staffDetails.staff.role || 'Staff'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {staffDetails.staff.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#FF5A36]" />
                          {staffDetails.staff.phone}
                        </span>
                      )}
                      <span>
                        Base Salary: {formatCurrency(staffDetails.staff.base_salary)} ({staffDetails.staff.salary_type})
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleOpenGiveAdvance(staffDetails.staff.id)}
                    className="rounded-xl text-xs h-9 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                  >
                    <HandCoins className="w-3.5 h-3.5 mr-1.5" />
                    Give Advance
                  </Button>
                </div>

                {/* 3 Metric Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-xl border border-border/60 bg-card">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Present (This Month)</span>
                    <p className="text-lg font-black text-emerald-600 mt-0.5">{staffDetails.attendance_summary.present} Days</p>
                  </div>
                  <div className="p-3 rounded-xl border border-border/60 bg-card">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Absent (This Month)</span>
                    <p className="text-lg font-black text-rose-600 mt-0.5">{staffDetails.attendance_summary.absent} Days</p>
                  </div>
                  <div className="p-3 rounded-xl border border-border/60 bg-card">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Pending Advance</span>
                    <p className="text-lg font-black text-amber-600 mt-0.5">{formatCurrency(staffDetails.staff.pending_advance)}</p>
                  </div>
                  <div className="p-3 rounded-xl border border-border/60 bg-card">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Paid Records</span>
                    <p className="text-lg font-black text-foreground mt-0.5">{staffDetails.salaries.length}</p>
                  </div>
                </div>

                {/* Monthly Salary History & Advance History */}
                <Tabs defaultValue="salaryHistory" className="w-full">
                  <TabsList className={`grid ${isParlour ? 'grid-cols-3' : 'grid-cols-2'} w-full rounded-xl bg-muted/40 p-1`}>
                    <TabsTrigger value="salaryHistory" className="rounded-lg text-xs font-semibold">
                      Salary Records ({staffDetails.salaries.length})
                    </TabsTrigger>
                    <TabsTrigger value="advances" className="rounded-lg text-xs font-semibold">
                      Advance History ({staffDetails.advances.length})
                    </TabsTrigger>
                    {isParlour && (
                      <TabsTrigger value="commissionsHistory" className="rounded-lg text-xs font-semibold">
                        Commissions ({staffDetails.commissions?.length || 0})
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {/* Salary Records Tab */}
                  <TabsContent value="salaryHistory" className="pt-2">
                    {staffDetails.salaries.length === 0 ? (
                      <div className="py-12 text-center text-xs text-muted-foreground">
                        No monthly salary history recorded yet. Use Generate Salary tab to calculate monthly payroll.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-border/60 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[10px] uppercase font-semibold">
                              <th className="py-2.5 px-3">Month</th>
                              <th className="py-2.5 px-3 text-right">Base</th>
                              <th className="py-2.5 px-3 text-right">Bonus/OT</th>
                              <th className="py-2.5 px-3 text-right">Deduction</th>
                              <th className="py-2.5 px-3 text-right">Adv Adj</th>
                              <th className="py-2.5 px-3 text-right">Net Payable</th>
                              <th className="py-2.5 px-3 text-right">Paid</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {staffDetails.salaries.map((s: any) => (
                              <tr key={s.id} className="hover:bg-muted/20">
                                <td className="py-2.5 px-3 font-semibold text-foreground whitespace-nowrap">
                                  {s.month}
                                </td>
                                <td className="py-2.5 px-3 text-right text-muted-foreground">{formatCurrency(s.base_salary)}</td>
                                <td className="py-2.5 px-3 text-right text-emerald-600">
                                  +{formatCurrency(Number(s.bonus) + Number(s.overtime))}
                                </td>
                                <td className="py-2.5 px-3 text-right text-rose-600">-{formatCurrency(s.deduction)}</td>
                                <td className="py-2.5 px-3 text-right text-amber-600">-{formatCurrency(s.advance_adjusted)}</td>
                                <td className="py-2.5 px-3 text-right font-extrabold text-foreground">{formatCurrency(s.net_payable)}</td>
                                <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">{formatCurrency(s.paid_amount)}</td>
                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                  <Badge
                                    className={`text-[9px] py-0 px-1.5 ${
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
                        </table>
                      </div>
                    )}
                  </TabsContent>

                  {/* Advances Tab */}
                  <TabsContent value="advances" className="pt-2">
                    {staffDetails.advances.length === 0 ? (
                      <div className="py-12 text-center text-xs text-muted-foreground">
                        No advances taken by this staff member.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-border/60 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[10px] uppercase font-semibold">
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Method</th>
                              <th className="py-2.5 px-3 text-right">Amount</th>
                              <th className="py-2.5 px-3 text-right">Adjusted</th>
                              <th className="py-2.5 px-3 text-right">Remaining</th>
                              <th className="py-2.5 px-3">Note</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {staffDetails.advances.map((adv: any) => (
                              <tr key={adv.id} className="hover:bg-muted/20">
                                <td className="py-2.5 px-3 whitespace-nowrap font-medium text-foreground">
                                  {formatAccountDate(adv.date)}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                                  {adv.payment_method_name}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-foreground">{formatCurrency(adv.amount)}</td>
                                <td className="py-2.5 px-3 text-right text-emerald-600">{formatCurrency(adv.adjusted_amount)}</td>
                                <td className="py-2.5 px-3 text-right font-extrabold text-amber-600">
                                  {formatCurrency(adv.remaining_balance)}
                                </td>
                                <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate">{adv.note || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </TabsContent>

                  {/* Parlour Commissions History Tab */}
                  {isParlour && (
                    <TabsContent value="commissionsHistory" className="pt-2">
                      {!staffDetails.commissions || staffDetails.commissions.length === 0 ? (
                        <div className="py-12 text-center text-xs text-muted-foreground">
                          No commission records logged for this staff member yet.
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-border/60 rounded-xl">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[10px] uppercase font-semibold">
                                <th className="py-2.5 px-3">Date</th>
                                <th className="py-2.5 px-3">Service</th>
                                <th className="py-2.5 px-3">Customer</th>
                                <th className="py-2.5 px-3 text-right">Service Bill</th>
                                <th className="py-2.5 px-3 text-right">Commission</th>
                                <th className="py-2.5 px-3 text-right">Tip</th>
                                <th className="py-2.5 px-3">Note</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                              {staffDetails.commissions.map((c: any) => (
                                <tr key={c.id} className="hover:bg-muted/20">
                                  <td className="py-2.5 px-3 whitespace-nowrap font-medium text-foreground">
                                    {formatAccountDate(c.date)}
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap text-foreground font-semibold">
                                    {c.service_name || 'Custom / Other'}
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                                    {c.customer_name || '-'}
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-muted-foreground">
                                    {formatCurrency(c.service_amount)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-bold text-orange-600">
                                    {formatCurrency(c.commission_amount)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">
                                    {c.tip_amount > 0 ? formatCurrency(c.tip_amount) : '-'}
                                  </td>
                                  <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate">{c.note || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </TabsContent>
                  )}
                </Tabs>
              </div>
            )}
          </DialogContent>
        </Dialog>
        </div>

        {/* 10. Delete Staff Confirmation */}
        <AlertDialog
          open={Boolean(deleteStaffId)}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteStaffId(null);
              if (typeof document !== 'undefined') {
                document.body.style.pointerEvents = '';
              }
            }
          }}
        >
          <AlertDialogContent className="rounded-2xl max-w-md w-[95vw] sm:w-full p-4 sm:p-6 bg-card border border-border/80">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-bold text-foreground">
                Delete Staff Member?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                This will soft-delete the employee. Past salary records and expenses will remain preserved in historical accounts.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="rounded-xl text-xs h-10 min-h-[44px]">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteStaff}
                className="rounded-xl text-xs h-10 min-h-[44px] bg-destructive hover:bg-destructive/90 text-white font-semibold"
              >
                Delete Staff
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 11. Parlour: Record Commission - Bottom Sheet on mobile, Dialog on desktop */}
        <AccountsSheet open={isAddCommissionModalOpen} onOpenChange={setIsAddCommissionModalOpen}>
          <AccountsSheetContent className="overflow-y-auto max-h-[88vh]">
            <AccountsSheetHeader>
              <AccountsSheetTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                <span>{editingCommission ? 'Edit Service Commission' : t('addCommission', 'Record Service Commission')}</span>
              </AccountsSheetTitle>
              <AccountsSheetDescription>
                {editingCommission
                  ? 'Update commission entry. Rates and limits will be validated securely by the server.'
                  : 'Log service earnings and tips for staff members. Commission auto-calculates and will be included in monthly payroll.'}
              </AccountsSheetDescription>
            </AccountsSheetHeader>

            <form onSubmit={handleSaveCommission} className="space-y-4 pt-2">
              {commError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                  {commError}
                </div>
              )}

              {/* Staff Member & Service */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    {t('staffMember', 'Staff Member')} <span className="text-destructive">*</span>
                  </Label>
                  <Select value={commStaffId} onValueChange={handleCommStaffChange}>
                    <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/20">
                      <SelectValue placeholder="Select Staff" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {staffList.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name} ({s.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    {t('service', 'Service Done')}
                  </Label>
                  <Select value={commServiceId} onValueChange={handleCommServiceChange}>
                    <SelectTrigger className="h-10 rounded-xl text-xs bg-muted/20">
                      <SelectValue placeholder="Select Service" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="custom">Custom / Other Service</SelectItem>
                      {services.map((srv) => (
                        <SelectItem key={srv.id} value={String(srv.id)}>
                          {srv.name} (৳{srv.price})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Service Amount (Bill) & Commission */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    {t('serviceAmount', 'Service Bill (৳)')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={commServiceAmount}
                    onChange={(e) => handleCommServiceAmountChange(e.target.value)}
                    className="h-10 rounded-xl text-xs bg-muted/20 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">
                      {t('commissionAmount', 'Staff Commission (৳)')} <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-[10px] text-orange-600 font-semibold">Auto-calc</span>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={commAmount}
                    onChange={(e) => setCommAmount(e.target.value)}
                    className="h-10 rounded-xl text-xs bg-orange-500/5 border-orange-500/30 text-orange-600 font-bold"
                  />
                </div>
              </div>

              {/* Tip Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">
                      {t('tipAmount', 'Tip Amount (৳)')}
                    </Label>
                    <span className="text-[10px] text-emerald-600 font-medium">100% to staff</span>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={commTip}
                    onChange={(e) => setCommTip(e.target.value)}
                    className="h-10 rounded-xl text-xs bg-emerald-500/5 border-emerald-500/30 text-emerald-600 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    {t('date', 'Date')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="date"
                    required
                    value={commDate}
                    onChange={(e) => setCommDate(e.target.value)}
                    className="h-10 rounded-xl text-xs bg-muted/20"
                  />
                </div>
              </div>

              {/* Customer Name */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">
                  {t('customerName', 'Customer Name (Optional)')}
                </Label>
                <Input
                  placeholder="e.g. Nusrat Jahan"
                  value={commCustomerName}
                  onChange={(e) => setCommCustomerName(e.target.value)}
                  className="h-10 rounded-xl text-xs bg-muted/20"
                />
              </div>

              {/* Note */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">
                  {t('note', 'Note (Optional)')}
                </Label>
                <Input
                  placeholder="e.g. Bridal makeup package, hair spa"
                  value={commNote}
                  onChange={(e) => setCommNote(e.target.value)}
                  className="h-10 rounded-xl text-xs bg-muted/20"
                />
              </div>

              <AccountsSheetFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddCommissionModalOpen(false);
                    setEditingCommission(null);
                  }}
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
                  {editingCommission ? 'Update Commission' : 'Save Commission'}
                </Button>
              </AccountsSheetFooter>
            </form>
          </AccountsSheetContent>
        </AccountsSheet>

        {/* 12. Parlour: Manage Services - Bottom Sheet on mobile, Dialog on desktop */}
        <AccountsSheet open={isServicesModalOpen} onOpenChange={setIsServicesModalOpen}>
          <AccountsSheetContent className="overflow-y-auto max-h-[88vh]">
            <AccountsSheetHeader>
              <AccountsSheetTitle className="flex items-center gap-2">
                <Scissors className="w-5 h-5 text-orange-500" />
                <span>{t('manageServices', 'Manage Parlour Services')}</span>
              </AccountsSheetTitle>
              <AccountsSheetDescription>
                Define salon services, standard prices, and default staff commission rates.
              </AccountsSheetDescription>
            </AccountsSheetHeader>

            {/* Add / Edit Service Form */}
            <form onSubmit={handleSaveService} className="p-4 rounded-xl bg-muted/20 border border-border/60 space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                {editingServiceId ? 'Edit Service' : 'Add New Service'}
              </h4>

              {serviceError && (
                <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                  {serviceError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Service Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    required
                    placeholder="e.g. Hair Cut & Wash, Facial, Manicure"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    className="h-9 rounded-xl text-xs bg-muted/30"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Standard Price (৳) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="e.g. 500"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    className="h-9 rounded-xl text-xs bg-muted/30 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Default Commission Type
                  </Label>
                  <Select value={serviceCommType} onValueChange={(val: any) => setServiceCommType(val)}>
                    <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/30">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="percent">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (৳)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Default Commission Value
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={serviceCommType === 'percent' ? 'e.g. 15 (%)' : 'e.g. 100 (৳)'}
                    value={serviceCommVal}
                    onChange={(e) => setServiceCommVal(e.target.value)}
                    className="h-9 rounded-xl text-xs bg-muted/30 font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                {editingServiceId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingServiceId(null);
                      setServiceName('');
                      setServicePrice('');
                      setServiceCommVal('');
                    }}
                    className="rounded-xl text-xs h-8"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="rounded-xl text-xs h-8 bg-gradient-to-r from-[#FF5A36] to-orange-500 text-white font-semibold"
                >
                  {isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  {editingServiceId ? 'Update Service' : 'Add Service'}
                </Button>
              </div>
            </form>

            {/* List of Services */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Existing Services ({services.length})
              </h4>

              {services.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                  No parlour services created yet. Add services above to start tracking commissions automatically.
                </div>
              ) : (
                <div className="overflow-x-auto border border-border/60 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[10px] uppercase font-semibold">
                        <th className="py-2.5 px-3">Service Name</th>
                        <th className="py-2.5 px-3 text-right">Standard Price</th>
                        <th className="py-2.5 px-3 text-right">Default Commission</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {services.map((srv) => (
                        <tr key={srv.id} className="hover:bg-muted/20">
                          <td className="py-2.5 px-3 font-semibold text-foreground">
                            {srv.name}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-foreground">
                            {formatCurrency(srv.price)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-orange-600">
                            {srv.default_commission_value != null && Number(srv.default_commission_value) > 0
                              ? srv.default_commission_type === 'percent'
                                ? `${srv.default_commission_value}%`
                                : formatCurrency(srv.default_commission_value)
                              : '0%'}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingServiceId(srv.id);
                                  setServiceName(srv.name);
                                  setServicePrice(String(srv.price));
                                  setServiceCommType(srv.default_commission_type || 'percent');
                                  setServiceCommVal(String(srv.default_commission_value || ''));
                                }}
                                className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground"
                                title="Edit service"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteService(srv.id)}
                                className="w-7 h-7 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                title="Delete service"
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
            </div>

            <AccountsSheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsServicesModalOpen(false)}
                className="rounded-xl text-xs h-10 min-h-[44px]"
              >
                Close
              </Button>
            </AccountsSheetFooter>
          </AccountsSheetContent>
        </AccountsSheet>
      </div>
    </AccountsGate>
  );
}
