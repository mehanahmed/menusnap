"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  ShieldAlert,
  LogIn,
  LogOut,
  UserCheck,
  MapPin,
  SlidersHorizontal,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useClientAuth } from '@/hooks/use-client-auth';
import { cn } from '@/lib/utils';
import {
  getHrmOverviewAction,
  staffPunchAction,
  manualMarkAttendanceAction,
} from '@/app/actions/hrm';
import { type StaffAttendanceItem, type HrmSettings, formatShiftRange, formatLateReason, formatMinutesHuman } from '@/lib/hrm-constants';
import { StaffModal } from '@/components/hrm/StaffModal';

export default function HrmLiveBoardPage() {
  const { clientUser } = useClientAuth();
  const { toast } = useToast();

  const businessId = clientUser?.id || clientUser?.businessName || '';
  const businessType = clientUser?.type || 'restaurant';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-CA'));

  const [overview, setOverview] = useState<{
    kpis: {
      totalStaff: number;
      checkedIn: number;
      onTime: number;
      late: number;
      absent: number;
      onLeave: number;
    };
    todayAttendance: StaffAttendanceItem[];
    settings: HrmSettings;
  } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'half_day' | 'absent' | 'not_marked'>('all');

  // Add Staff Modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  // Manual Attendance Mark Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualRecord, setManualRecord] = useState<{
    staffId: number;
    staffName: string;
    date: string;
    status: 'present' | 'late' | 'half_day' | 'absent' | 'leave';
    checkInTime: string;
    checkOutTime: string;
    hoursWorked: number;
    lateReason: string;
    note: string;
  } | null>(null);
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const isOverviewFetchingRef = useRef(false);

  // Load Overview Data
  const loadOverview = useCallback(async (showToast = false) => {
    if (!businessId || isOverviewFetchingRef.current) return;
    try {
      isOverviewFetchingRef.current = true;
      const res = await getHrmOverviewAction(businessId, selectedDate);
      if (res.success && res.kpis && res.todayAttendance && res.settings) {
        const kpis = res.kpis;
        const todayAttendance = res.todayAttendance;
        const settings = res.settings;

        setOverview((prev) => {
          if (
            prev &&
            prev.kpis.totalStaff === kpis.totalStaff &&
            prev.kpis.checkedIn === kpis.checkedIn &&
            prev.kpis.onTime === kpis.onTime &&
            prev.kpis.late === kpis.late &&
            prev.kpis.absent === kpis.absent &&
            prev.todayAttendance.length === todayAttendance.length &&
            JSON.stringify(prev.todayAttendance.map((a) => `${a.staff_id}-${a.status}-${a.check_in_time}-${a.check_out_time}`)) ===
              JSON.stringify(todayAttendance.map((a) => `${a.staff_id}-${a.status}-${a.check_in_time}-${a.check_out_time}`))
          ) {
            return prev;
          }
          return {
            kpis,
            todayAttendance,
            settings,
          };
        });

        if (showToast) {
          toast({ title: 'Refreshed', description: 'HRM live board updated.' });
        }
      } else if (res.error && showToast) {
        toast({ title: 'Error', description: res.error, variant: 'destructive' });
      }
    } catch (err: any) {
      console.error('Failed to load HRM overview:', err);
    } finally {
      isOverviewFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [businessId, selectedDate, toast]);

  // Broadcast sync
  const broadcastPunchSync = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const bc = new BroadcastChannel('menubldr_hrm_sync');
      bc.postMessage({ type: 'punch_updated', timestamp: Date.now() });
      bc.close();
    } catch {}
    try {
      localStorage.setItem('menubldr_hrm_punch_sync', String(Date.now()));
    } catch {}
  }, []);

  // Initial load
  useEffect(() => {
    if (businessId) {
      loadOverview();
    }
  }, [businessId, loadOverview]);

  // Stable reference for live sync
  const loadOverviewRef = useRef(loadOverview);
  loadOverviewRef.current = loadOverview;

  // Live Sync polling (8s) + BroadcastChannel & visibility change
  useEffect(() => {
    if (!businessId) return;

    const intervalId = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        loadOverviewRef.current?.();
      }
    }, 8000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadOverviewRef.current?.();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('menubldr_hrm_sync');
      channel.onmessage = (event) => {
        if (event.data?.type === 'punch_updated') {
          loadOverviewRef.current?.();
        }
      };
    } catch {}

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'menubldr_hrm_punch_sync') {
        loadOverviewRef.current?.();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [businessId]);

  // Filtered Today's Attendance List
  const filteredAttendance = useMemo(() => {
    if (!overview?.todayAttendance) return [];
    return overview.todayAttendance.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.phone && item.phone.includes(searchQuery));
      if (!matchesSearch) return false;
      if (statusFilter === 'all') return true;
      return item.status === statusFilter;
    });
  }, [overview?.todayAttendance, searchQuery, statusFilter]);

  // Pagination
  const [livePage, setLivePage] = useState(1);
  const LIVE_ITEMS_PER_PAGE = 8;

  useEffect(() => {
    setLivePage(1);
  }, [searchQuery, statusFilter, selectedDate]);

  const totalLivePages = Math.max(1, Math.ceil(filteredAttendance.length / LIVE_ITEMS_PER_PAGE));
  const paginatedAttendance = useMemo(() => {
    const start = (livePage - 1) * LIVE_ITEMS_PER_PAGE;
    return filteredAttendance.slice(start, start + LIVE_ITEMS_PER_PAGE);
  }, [filteredAttendance, livePage]);

  // Handle Quick Punch In/Out from Live Board
  const handleLivePunch = async (staff: StaffAttendanceItem, actionType: 'in' | 'out') => {
    try {
      setRefreshing(true);
      const res = await staffPunchAction({
        restaurantId: businessId,
        staffId: staff.staff_id,
        actionType,
        bypassShiftWindow: true,
      });

      if (res.success) {
        toast({
          title: actionType === 'in' ? 'Checked In' : 'Checked Out',
          description: res.message || 'Attendance status recorded.',
        });
        broadcastPunchSync();
        await loadOverview();
      } else {
        toast({
          title: 'Action Failed',
          description: res.error || 'Could not complete punch.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Server error', variant: 'destructive' });
    } finally {
      setRefreshing(false);
    }
  };

  // Open manual mark modal
  const openManualMark = (item: StaffAttendanceItem) => {
    const inTime = item.check_in_time ? item.check_in_time.slice(11, 16) : '09:00';
    const outTime = item.check_out_time ? item.check_out_time.slice(11, 16) : '18:00';
    setManualRecord({
      staffId: item.staff_id,
      staffName: item.name,
      date: selectedDate,
      status: item.status === 'not_marked' ? 'present' : (item.status as any),
      checkInTime: inTime,
      checkOutTime: item.check_out_time ? outTime : '',
      hoursWorked: item.hours_worked || 8,
      lateReason: item.late_reason || '',
      note: item.note || '',
    });
    setIsManualModalOpen(true);
  };

  // Handle Manual Override Submit
  const handleManualMarkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRecord) return;
    try {
      setManualSubmitting(true);
      const res = await manualMarkAttendanceAction(businessId, {
        staffId: manualRecord.staffId,
        date: manualRecord.date,
        status: manualRecord.status,
        checkInTime: manualRecord.checkInTime ? `${manualRecord.date}T${manualRecord.checkInTime}:00` : null,
        checkOutTime: manualRecord.checkOutTime ? `${manualRecord.date}T${manualRecord.checkOutTime}:00` : null,
        hoursWorked: Number(manualRecord.hoursWorked || 0),
        lateReason: manualRecord.lateReason || null,
        note: manualRecord.note || null,
      });

      if (res.success) {
        toast({ title: 'Record Updated', description: 'Attendance modified by manager.' });
        setIsManualModalOpen(false);
        setManualRecord(null);
        broadcastPunchSync();
        await loadOverview();
      } else {
        toast({ title: 'Error', description: res.error || 'Update failed', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Server error', variant: 'destructive' });
    } finally {
      setManualSubmitting(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Top Banner & Date Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-foreground tracking-tight">
              Today&apos;s Live Duty Board
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-blue-700 bg-blue-50 border-blue-200">
              {businessType}
            </Badge>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-muted-foreground font-medium">
            Real-time staff check-in, presence tracking, and instant attendance updates.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-36 sm:w-40 h-9 rounded-xl border-slate-300 dark:border-border text-xs font-medium bg-white dark:bg-card shadow-2xs"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadOverview(true)}
            disabled={refreshing}
            className="h-9 rounded-xl border-slate-300 dark:border-border bg-white dark:bg-card hover:bg-slate-100 dark:hover:bg-muted text-slate-700 dark:text-foreground text-xs font-semibold shadow-2xs transition-colors"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1 text-slate-500', refreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="rounded-2xl border-slate-200/80 dark:border-border/60 shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Staff</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-foreground">
                {overview?.kpis.totalStaff ?? 0}
              </span>
              <span className="text-[11px] block text-slate-400 mt-0.5">Active team members</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-emerald-100 dark:border-emerald-950/40 shadow-xs bg-emerald-50/40 dark:bg-emerald-950/10">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Checked In</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-emerald-800 dark:text-emerald-300">
                {overview?.kpis.checkedIn ?? 0}
              </span>
              <span className="text-[11px] block text-emerald-600 dark:text-emerald-400 mt-0.5">Present on duty</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 dark:border-border/60 shadow-xs bg-white dark:bg-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">On Time</span>
              <div className="w-8 h-8 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-green-600">
                {overview?.kpis.onTime ?? 0}
              </span>
              <span className="text-[11px] block text-slate-400 mt-0.5">Within grace period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-amber-100 dark:border-amber-950/40 shadow-xs bg-amber-50/40 dark:bg-amber-950/10">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Late Arrivals</span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-amber-400">
                {overview?.kpis.late ?? 0}
              </span>
              <span className="text-[11px] block text-amber-600 dark:text-amber-400 mt-0.5">After grace threshold</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-rose-100 dark:border-rose-950/40 shadow-xs bg-rose-50/30 dark:bg-rose-950/10 col-span-2 sm:col-span-1">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Pending / Absent</span>
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
                {overview?.kpis.absent ?? 0}
              </span>
              <span className="text-[11px] block text-rose-500 mt-0.5">Not punched in yet</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table & Search Filter */}
      <div className="bg-white dark:bg-card rounded-2xl border border-slate-200/80 dark:border-border/60 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-border/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by name, role, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl border-slate-200 dark:border-border text-xs sm:text-sm bg-slate-50/50 dark:bg-muted/40"
              />
            </div>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-36 h-10 rounded-xl border-slate-200 dark:border-border text-xs font-semibold">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="present">On Time</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="half_day">Half Day</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="not_marked">Unmarked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsStaffModalOpen(true)}
              size="sm"
              className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Staff
            </Button>
          </div>
        </div>

        {/* Mobile View: Clean Card Layout (Matching Reference Image) */}
        <div className="md:hidden p-3 sm:p-4 space-y-3 bg-slate-50/50 dark:bg-muted/10">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Loading today&apos;s attendance...
            </div>
          ) : filteredAttendance.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-white dark:bg-card rounded-2xl border border-slate-200/80 dark:border-border/60">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="font-medium text-sm text-slate-600 dark:text-slate-300">No staff records found</p>
              <p className="text-xs text-slate-400">Add staff to your business or adjust your search filter.</p>
            </div>
          ) : (
            paginatedAttendance.map((item) => {
              const isCheckedIn = Boolean(item.check_in_time);
              const isCheckedOut = Boolean(item.check_out_time);
              const liveDuration = isCheckedIn && item.check_in_time && !isCheckedOut
                ? formatMinutesHuman(Math.max(0, Math.floor((new Date().getTime() - new Date(item.check_in_time).getTime()) / 60000)))
                : null;

              return (
                <div key={item.staff_id} className="p-4 bg-white dark:bg-card rounded-2xl border border-slate-200/80 dark:border-border/60 shadow-xs space-y-3">
                  {/* Top Header Row: Shift Hours Badge (left) & Status Pill (right) */}
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-muted text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formatShiftRange(item.shift_start, item.shift_end)}
                    </div>

                    {item.status === 'present' ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full px-2.5 py-0.5 shadow-none">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> On Time
                      </Badge>
                    ) : item.status === 'late' ? (
                      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-full px-2.5 py-0.5 shadow-none">
                        <AlertCircle className="w-3 h-3 mr-1 text-amber-600" /> Late
                      </Badge>
                    ) : item.status === 'half_day' ? (
                      <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-full px-2.5 py-0.5 shadow-none">
                        Half Day
                      </Badge>
                    ) : item.status === 'absent' ? (
                      <Badge className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-full px-2.5 py-0.5 shadow-none">
                        Absent
                      </Badge>
                    ) : item.status === 'leave' ? (
                      <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-full px-2.5 py-0.5 shadow-none">
                        On Leave
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-400 border-slate-200 text-xs rounded-full px-2.5 py-0.5">
                        Not Marked
                      </Badge>
                    )}
                  </div>

                  {/* Middle Row: Staff Avatar + Name + Phone/PIN & Role Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-muted border border-slate-200 dark:border-border flex items-center justify-center font-bold text-xs text-slate-700 dark:text-foreground uppercase shrink-0">
                        {item.name.slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-foreground text-sm leading-snug">{item.name}</h4>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          {item.phone || 'PIN: ' + item.pin_code}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[11px] font-semibold rounded-lg px-2 py-0.5 border shrink-0',
                        businessType === 'parlour'
                          ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300'
                          : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300'
                      )}
                    >
                      {item.role}
                    </Badge>
                  </div>

                  {/* Inner Details Box (Matching Gray Box in User Reference Image) */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-muted/40 border border-slate-100 dark:border-border/60 flex items-center justify-between">
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <span className="text-[10px] uppercase font-bold text-slate-400">In:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-foreground">
                          {item.check_in_time
                            ? new Date(item.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '--:--'}
                        </span>
                        {item.late_reason && (
                          <span className="text-[10px] text-amber-600 font-medium">({formatLateReason(item.late_reason)})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Out:</span>
                        {item.check_out_time ? (
                          <span className="font-mono font-bold text-slate-800 dark:text-foreground">
                            {new Date(item.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : isCheckedIn ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> On Shift
                          </span>
                        ) : (
                          <span className="font-mono text-slate-400">--:--</span>
                        )}
                      </div>
                    </div>

                    {/* Right Side: Prominent Duration */}
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Duration</span>
                      <span className="font-mono font-black text-sm text-slate-900 dark:text-foreground">
                        {item.hours_worked > 0 ? (
                          `${item.hours_worked} hrs`
                        ) : liveDuration ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {liveDuration} <span className="text-[9px] font-normal text-slate-400">(live)</span>
                          </span>
                        ) : (
                          '--'
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Action Row */}
                  <div className="flex items-center gap-2 pt-1">
                    {!isCheckedIn ? (
                      <Button
                        size="sm"
                        onClick={() => handleLivePunch(item, 'in')}
                        disabled={refreshing}
                        className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                      >
                        <LogIn className="w-3.5 h-3.5 mr-1.5" /> Check In Now
                      </Button>
                    ) : !isCheckedOut ? (
                      <Button
                        size="sm"
                        onClick={() => handleLivePunch(item, 'out')}
                        disabled={refreshing}
                        className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
                      >
                        <LogOut className="w-3.5 h-3.5 mr-1.5" /> Check Out (End Shift)
                      </Button>
                    ) : (
                      <div className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-muted/60 text-slate-500 flex items-center justify-center text-xs font-bold border border-slate-200 dark:border-border">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Shift Completed
                      </div>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 p-0 rounded-xl border-slate-200 dark:border-border shrink-0"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg">
                        <DropdownMenuItem onClick={() => openManualMark(item)} className="text-xs cursor-pointer">
                          Adjust Attendance
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild className="text-xs cursor-pointer">
                          <Link href="/hrm/roster">View Staff Profile</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Attendance Table (Unchanged) */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-muted/50">
              <TableRow>
                <TableHead className="font-bold text-slate-700 dark:text-foreground text-xs">Employee</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-foreground text-xs">Designation / Role</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-foreground text-xs">Shift Hours</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-foreground text-xs">In Time</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-foreground text-xs">Out Time</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-foreground text-xs">Duration</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-foreground text-xs">Today Status</TableHead>
                <TableHead className="text-right font-bold text-slate-700 dark:text-foreground text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-slate-400 text-sm">
                    Loading today&apos;s attendance...
                  </TableCell>
                </TableRow>
              ) : filteredAttendance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-sm text-slate-600 dark:text-slate-300">No staff records found</p>
                    <p className="text-xs text-slate-400">Add staff to your business or adjust your search filter.</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAttendance.map((item) => {
                  const isCheckedIn = Boolean(item.check_in_time);
                  const isCheckedOut = Boolean(item.check_out_time);

                  return (
                    <TableRow key={item.staff_id} className="hover:bg-slate-50/60 dark:hover:bg-muted/40 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-muted border border-slate-200 dark:border-border flex items-center justify-center font-bold text-xs text-slate-700 dark:text-foreground uppercase">
                            {item.name.slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-foreground text-sm">{item.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {item.phone || 'PIN: ' + item.pin_code}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[11px] font-semibold rounded-lg px-2 py-0.5 border',
                            businessType === 'parlour'
                              ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300'
                              : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300'
                          )}
                        >
                          {item.role}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-300">
                        {formatShiftRange(item.shift_start, item.shift_end)}
                      </TableCell>

                      <TableCell>
                        {item.check_in_time ? (
                          <div>
                            <span className="font-mono font-bold text-xs text-slate-800 dark:text-foreground">
                              {new Date(item.check_in_time).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {item.late_reason && (
                              <span className="block text-[10px] text-amber-600 font-medium">
                                {formatLateReason(item.late_reason)}
                              </span>
                            )}
                            {item.distance_meters !== null && item.distance_meters !== undefined && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-semibold mt-0.5">
                                <MapPin className="w-2.5 h-2.5" /> {item.distance_meters}m
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300 font-mono">--:--</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {item.check_out_time ? (
                          <div>
                            <span className="font-mono font-bold text-xs text-slate-800 dark:text-foreground">
                              {new Date(item.check_out_time).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {item.early_out_reason && (
                              <span className="block text-[10px] text-rose-500 font-medium">
                                {formatLateReason(item.early_out_reason)}
                              </span>
                            )}
                          </div>
                        ) : isCheckedIn ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            On Shift
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300 font-mono">--:--</span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs font-bold text-slate-700 dark:text-foreground">
                        {item.hours_worked > 0 ? (
                          `${item.hours_worked} hrs`
                        ) : isCheckedIn && item.check_in_time ? (
                          <span className="inline-flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            {formatMinutesHuman(Math.max(0, Math.floor((new Date().getTime() - new Date(item.check_in_time).getTime()) / 60000)))}
                            <span className="text-[10px] font-normal text-slate-400">(live)</span>
                          </span>
                        ) : (
                          '--'
                        )}
                      </TableCell>

                      <TableCell>
                        {item.status === 'present' ? (
                          <Badge className="bg-emerald-100 hover:bg-emerald-100 text-emerald-800 border-emerald-200 text-[11px]">
                            On Time
                          </Badge>
                        ) : item.status === 'late' ? (
                          <Badge className="bg-amber-100 hover:bg-amber-100 text-amber-800 border-amber-200 text-[11px]">
                            Late
                          </Badge>
                        ) : item.status === 'half_day' ? (
                          <Badge className="bg-indigo-100 hover:bg-indigo-100 text-indigo-800 border-indigo-200 text-[11px]">
                            Half Day
                          </Badge>
                        ) : item.status === 'absent' ? (
                          <Badge className="bg-rose-100 hover:bg-rose-100 text-rose-800 border-rose-200 text-[11px]">
                            Absent
                          </Badge>
                        ) : item.status === 'leave' ? (
                          <Badge className="bg-blue-100 hover:bg-blue-100 text-blue-800 border-blue-200 text-[11px]">
                            On Leave
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 border-slate-200 text-[11px]">
                            Not Marked
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isCheckedIn ? (
                            <Button
                              size="sm"
                              onClick={() => handleLivePunch(item, 'in')}
                              disabled={refreshing}
                              className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-2.5 shadow-xs"
                            >
                              <LogIn className="w-3 h-3 mr-1" /> In
                            </Button>
                          ) : !isCheckedOut ? (
                            <Button
                              size="sm"
                              onClick={() => handleLivePunch(item, 'out')}
                              disabled={refreshing}
                              className="h-8 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-2.5 shadow-xs"
                            >
                              <LogOut className="w-3 h-3 mr-1" /> Out
                            </Button>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-400 pr-2">Completed</span>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-slate-400">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-md">
                              <DropdownMenuItem onClick={() => openManualMark(item)} className="text-xs cursor-pointer">
                                Adjust Attendance
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild className="text-xs cursor-pointer">
                                <Link href="/hrm/roster">View Staff Profile</Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Live Board Pagination */}
        {totalLivePages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-border flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {filteredAttendance.length > 0 ? (livePage - 1) * LIVE_ITEMS_PER_PAGE + 1 : 0} to{' '}
              {Math.min(livePage * LIVE_ITEMS_PER_PAGE, filteredAttendance.length)} of {filteredAttendance.length} staff
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLivePage((p) => Math.max(1, p - 1))}
                disabled={livePage === 1}
                className="h-8 px-2.5 rounded-lg text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
              </Button>
              <span className="px-2 font-bold text-slate-700 dark:text-foreground">
                {livePage} / {totalLivePages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLivePage((p) => Math.min(totalLivePages, p + 1))}
                disabled={livePage === totalLivePages}
                className="h-8 px-2.5 rounded-lg text-xs"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Attendance Adjust Modal */}
      <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white dark:bg-card">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-foreground">
              Adjust Attendance: {manualRecord?.staffName}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Date: {manualRecord?.date} • Manager manual override
            </DialogDescription>
          </DialogHeader>

          {manualRecord && (
            <form onSubmit={handleManualMarkSubmit} className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-foreground">Status</Label>
                <Select
                  value={manualRecord.status}
                  onValueChange={(v) => setManualRecord({ ...manualRecord, status: v as any })}
                >
                  <SelectTrigger className="mt-1 rounded-xl text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">On Time (Present)</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="half_day">Half Day</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-foreground">Check In Time</Label>
                  <Input
                    type="time"
                    value={manualRecord.checkInTime}
                    onChange={(e) => setManualRecord({ ...manualRecord, checkInTime: e.target.value })}
                    className="mt-1 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-foreground">Check Out Time</Label>
                  <Input
                    type="time"
                    value={manualRecord.checkOutTime}
                    onChange={(e) => setManualRecord({ ...manualRecord, checkOutTime: e.target.value })}
                    className="mt-1 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-foreground">Worked Hours</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={manualRecord.hoursWorked}
                  onChange={(e) => setManualRecord({ ...manualRecord, hoursWorked: Number(e.target.value) })}
                  className="mt-1 rounded-xl font-bold"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-foreground">Manager Note / Late Reason</Label>
                <Input
                  type="text"
                  placeholder="e.g. Approved leave or transit delay"
                  value={manualRecord.lateReason}
                  onChange={(e) => setManualRecord({ ...manualRecord, lateReason: e.target.value })}
                  className="mt-1 rounded-xl text-xs"
                />
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100 dark:border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsManualModalOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={manualSubmitting}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                >
                  {manualSubmitting ? 'Updating...' : 'Save Override'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Staff Modal */}
      <StaffModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        editingStaff={null}
        businessId={businessId}
        businessType={businessType}
        defaultShiftStart={overview?.settings?.shift_start || '09:00'}
        defaultShiftEnd={overview?.settings?.shift_end || '18:00'}
        onSuccess={() => loadOverview()}
      />
    </div>
  );
}
