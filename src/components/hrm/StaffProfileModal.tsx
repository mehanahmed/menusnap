"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  KeyRound,
  Phone,
  Calendar,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Clock4,
  XCircle,
  ExternalLink,
  Edit,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getHrmStaffProfileAction } from '@/app/actions/hrm';
import { formatShiftRange, formatHoursHuman } from '@/lib/hrm-constants';

interface StaffProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffId: number | null;
  businessId: string | number;
  businessType?: string;
  onEditStaff?: (staff: any) => void;
}

export function StaffProfileModal({
  isOpen,
  onClose,
  staffId,
  businessId,
  businessType = 'restaurant',
  onEditStaff,
}: StaffProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    staff?: any;
    attendanceSummary?: any;
    recentLogs?: any[];
    pendingAdvance?: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen && staffId && businessId) {
      setLoading(true);
      getHrmStaffProfileAction(businessId, staffId)
        .then((res) => {
          if (res.success) {
            setData(res);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setData(null);
    }
  }, [isOpen, staffId, businessId]);

  const staff = data?.staff;
  const summary = data?.attendanceSummary;
  const recentLogs = data?.recentLogs || [];
  const pendingAdvance = data?.pendingAdvance || 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl p-5 sm:p-7 bg-white dark:bg-card border-slate-200/80 dark:border-border/60 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-border/60">
          <DialogTitle className="text-lg font-black text-slate-900 dark:text-foreground flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Staff Member Profile
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Comprehensive profile, shift credentials, salary remuneration, and monthly attendance.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            <p className="text-xs font-medium">Loading employee details...</p>
          </div>
        ) : !staff ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            Employee record not found.
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* 1. Profile Header Hero */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-muted/40 border border-slate-100 dark:border-border/60">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-md uppercase shrink-0">
                {staff.name.slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-lg text-slate-900 dark:text-foreground leading-tight truncate">
                    {staff.name}
                  </h3>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[10px] font-bold rounded-md px-2 py-0.5 border',
                      businessType === 'parlour'
                        ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300'
                        : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300'
                    )}
                  >
                    {staff.role}
                  </Badge>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border',
                      staff.is_active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {staff.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {staff.phone || 'No phone set'}
                  </span>
                  {staff.joining_date && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Joined: {staff.joining_date}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Key Attributes Grid: Shift & Kiosk PIN, Salary & Advance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Shift Hours & PIN */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-card border border-slate-200/80 dark:border-border/60 shadow-2xs space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Duty &amp; Kiosk Credentials
                </span>
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-500" /> Shift Hours:
                  </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-foreground">
                    {formatShiftRange(staff.shift_start, staff.shift_end)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-border/40">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-500" /> Kiosk PIN:
                  </span>
                  <span className="font-mono font-black text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/40">
                    {staff.pin_code}
                  </span>
                </div>
              </div>

              {/* Salary & Remuneration */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-card border border-slate-200/80 dark:border-border/60 shadow-2xs space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Remuneration &amp; Beton
                </span>
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-500" /> Base Salary:
                  </span>
                  <span className="font-black text-slate-900 dark:text-foreground">
                    ৳{Number(staff.base_salary || 0).toLocaleString()}{' '}
                    <span className="text-[10px] font-medium text-slate-400 capitalize">
                      ({staff.salary_type || 'monthly'})
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-border/40">
                  <span className="text-slate-500">Advance Balance:</span>
                  <span className={cn('font-bold', pendingAdvance > 0 ? 'text-amber-600 font-mono' : 'text-slate-400')}>
                    {pendingAdvance > 0 ? `৳${pendingAdvance.toLocaleString()}` : 'None (৳0)'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Monthly Attendance Scorecard */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-700 dark:text-foreground uppercase tracking-wider flex items-center justify-between">
                <span>This Month Attendance Summary</span>
                <span className="text-[10px] font-normal text-slate-400 lowercase">
                  ({summary?.total || 0} total records)
                </span>
              </span>

              <div className="grid grid-cols-4 gap-2">
                <div className="p-2.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-center">
                  <span className="text-[9px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                    On Time
                  </span>
                  <span className="text-lg font-black text-emerald-800 dark:text-emerald-300">
                    {summary?.present || 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-center">
                  <span className="text-[9px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
                    Late
                  </span>
                  <span className="text-lg font-black text-amber-800 dark:text-amber-300">
                    {summary?.late || 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-center">
                  <span className="text-[9px] uppercase font-bold text-indigo-700 dark:text-indigo-400 block">
                    Half Day
                  </span>
                  <span className="text-lg font-black text-indigo-800 dark:text-indigo-300">
                    {summary?.half_day || 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-center">
                  <span className="text-[9px] uppercase font-bold text-rose-700 dark:text-rose-400 block">
                    Absent
                  </span>
                  <span className="text-lg font-black text-rose-800 dark:text-rose-300">
                    {summary?.absent || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Recent Attendance Punch Activity */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-700 dark:text-foreground uppercase tracking-wider block">
                Recent Shift Activity (Last 5 Punches)
              </span>

              {recentLogs.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-muted/30 text-center text-xs text-slate-400">
                  No attendance records logged yet for this employee.
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-100 dark:border-border/60 overflow-hidden divide-y divide-slate-100 dark:divide-border/40">
                  {recentLogs.map((log) => {
                    const inTimeFormatted = log.check_in_time
                      ? new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '--:--';
                    const outTimeFormatted = log.check_out_time
                      ? new Date(log.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '--:--';

                    return (
                      <div
                        key={log.id}
                        className="p-3 bg-white dark:bg-card hover:bg-slate-50/50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-800 dark:text-foreground">
                              {log.date}
                            </span>
                            {log.status === 'present' ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px] px-1.5 py-0">
                                On Time
                              </Badge>
                            ) : log.status === 'late' ? (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[9px] px-1.5 py-0">
                                Late
                              </Badge>
                            ) : log.status === 'half_day' ? (
                              <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[9px] px-1.5 py-0">
                                Half Day
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                {log.status}
                              </Badge>
                            )}
                          </div>
                          <span className="font-mono text-[11px] text-slate-500 mt-0.5 block">
                            {inTimeFormatted} &rarr; {outTimeFormatted}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-xs text-slate-800 dark:text-foreground font-mono block">
                            {formatHoursHuman(log.hours_worked, log.check_in_time, log.check_out_time)}
                          </span>
                          {log.late_reason && (
                            <span className="text-[10px] text-amber-600 italic block">
                              {log.late_reason}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 5. Footer Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-border/60 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full sm:w-auto rounded-xl text-xs font-semibold"
              >
                <Link href={`/hrm/history?staffId=${staff.id}`} onClick={onClose}>
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  View in Attendance History
                </Link>
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {onEditStaff && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onClose();
                      onEditStaff(staff);
                    }}
                    className="flex-1 sm:flex-initial rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    <Edit className="w-3.5 h-3.5 mr-1.5" />
                    Edit Details &amp; Salary
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="rounded-xl text-xs font-semibold text-slate-500"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
