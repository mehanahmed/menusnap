"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useClientAuth } from '@/hooks/use-client-auth';
import { cn } from '@/lib/utils';
import { getMonthlyAttendanceCalendarAction, getStaffRosterAction } from '@/app/actions/hrm';
import { formatLateReason } from '@/lib/hrm-constants';

export default function HrmMonthlyHistoryPage() {
  const { clientUser } = useClientAuth();
  const { toast } = useToast();

  const businessId = clientUser?.id || clientUser?.businessName || '';

  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth() + 1);
  const [calendarStaffFilter, setCalendarStaffFilter] = useState<string>('all');
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarData, setCalendarData] = useState<{
    records: any[];
    summary: {
      totalRecords: number;
      presentCount: number;
      lateCount: number;
      absentCount: number;
      halfDayCount: number;
      leaveCount: number;
      totalHoursWorked: number;
    };
  } | null>(null);

  const [roster, setRoster] = useState<any[]>([]);

  // Load Roster for staff filter dropdown
  useEffect(() => {
    if (businessId) {
      getStaffRosterAction(businessId).then((res) => {
        if (res.success && res.staff) {
          setRoster(res.staff);
        }
      });
    }
  }, [businessId]);

  // Load Monthly Calendar Data
  const loadCalendar = useCallback(async () => {
    try {
      if (!businessId) return;
      setCalendarLoading(true);
      const staffId = calendarStaffFilter !== 'all' ? Number(calendarStaffFilter) : undefined;
      const res = await getMonthlyAttendanceCalendarAction(businessId, {
        year: calendarYear,
        month: calendarMonth,
        staffId,
      });
      if (res.success && res.records && res.summary) {
        setCalendarData({
          records: res.records,
          summary: res.summary,
        });
      }
    } catch (err: any) {
      console.error('Failed to load calendar:', err);
    } finally {
      setCalendarLoading(false);
    }
  }, [businessId, calendarYear, calendarMonth, calendarStaffFilter]);

  useEffect(() => {
    if (businessId) {
      loadCalendar();
    }
  }, [businessId, loadCalendar]);

  // Pagination
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setHistoryPage(1);
  }, [calendarYear, calendarMonth, calendarStaffFilter]);

  const historyRecords = useMemo(() => calendarData?.records || [], [calendarData?.records]);
  const totalHistoryPages = Math.max(1, Math.ceil(historyRecords.length / HISTORY_ITEMS_PER_PAGE));
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * HISTORY_ITEMS_PER_PAGE;
    return historyRecords.slice(start, start + HISTORY_ITEMS_PER_PAGE);
  }, [historyRecords, historyPage]);

  // Export Monthly CSV
  const exportMonthlyCsv = () => {
    if (!calendarData?.records || calendarData.records.length === 0) {
      toast({ title: 'No Data', description: 'No attendance records to export.' });
      return;
    }
    const headers = ['Date', 'Staff Name', 'Role', 'Status', 'Check In', 'Check Out', 'Hours Worked', 'Late Reason', 'Note'];
    const rows = calendarData.records.map((r) => [
      r.date,
      `"${r.staff_name}"`,
      `"${r.role}"`,
      r.status,
      r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : '',
      r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '',
      r.hours_worked,
      `"${r.late_reason || ''}"`,
      `"${r.note || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hrm_attendance_${calendarYear}_${calendarMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Export Successful', description: `Downloaded CSV for ${calendarYear}-${calendarMonth}.` });
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Filter & Export Card */}
      <div className="bg-white dark:bg-card p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-border/60 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-foreground tracking-tight">
              Monthly Attendance History
            </h1>
            <p className="text-xs text-slate-500 dark:text-muted-foreground font-medium mt-0.5">
              Review full shift hours, tardiness logs, monthly payroll readiness, and export reports.
            </p>
          </div>

          <Button
            onClick={exportMonthlyCsv}
            variant="outline"
            className="rounded-xl border-slate-300 dark:border-border text-xs font-semibold shadow-2xs self-stretch sm:self-auto"
          >
            <Download className="w-4 h-4 mr-1.5 text-blue-600" /> Export CSV Report
          </Button>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Year Select */}
          <div className="w-28">
            <Label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Year</Label>
            <Select value={String(calendarYear)} onValueChange={(v) => setCalendarYear(Number(v))}>
              <SelectTrigger className="rounded-xl text-xs font-bold h-9 bg-slate-50/70 dark:bg-muted/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[calendarYear - 1, calendarYear, calendarYear + 1].map((y) => (
                  <SelectItem key={y} value={String(y)} className="text-xs font-medium">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month Select */}
          <div className="w-36">
            <Label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Month</Label>
            <Select value={String(calendarMonth)} onValueChange={(v) => setCalendarMonth(Number(v))}>
              <SelectTrigger className="rounded-xl text-xs font-bold h-9 bg-slate-50/70 dark:bg-muted/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  'January',
                  'February',
                  'March',
                  'April',
                  'May',
                  'June',
                  'July',
                  'August',
                  'September',
                  'October',
                  'November',
                  'December',
                ].map((name, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)} className="text-xs font-medium">
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Staff Member Select */}
          <div className="w-48 sm:w-60">
            <Label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Staff Member</Label>
            <Select value={calendarStaffFilter} onValueChange={(v) => setCalendarStaffFilter(v)}>
              <SelectTrigger className="rounded-xl text-xs font-bold h-9 bg-slate-50/70 dark:bg-muted/40">
                <SelectValue placeholder="All Staff Members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-bold">
                  All Team Members ({roster.length})
                </SelectItem>
                {roster.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                    {s.name} ({s.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Monthly Summary Statistics */}
        {calendarData?.summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100 dark:border-border/60">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-muted/30 border border-slate-100 dark:border-border/40">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Entries</span>
              <span className="text-xl font-black text-slate-800 dark:text-foreground">{calendarData.summary.totalRecords}</span>
            </div>
            <div className="p-3 rounded-2xl bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30">
              <span className="text-[10px] text-green-700 dark:text-green-400 uppercase font-bold block">On Time Days</span>
              <span className="text-xl font-black text-green-800 dark:text-green-300">{calendarData.summary.presentCount}</span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
              <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-bold block">Late Days</span>
              <span className="text-xl font-black text-amber-800 dark:text-amber-300">{calendarData.summary.lateCount}</span>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
              <span className="text-[10px] text-indigo-700 dark:text-indigo-400 uppercase font-bold block">Half Days</span>
              <span className="text-xl font-black text-indigo-800 dark:text-indigo-300">{calendarData.summary.halfDayCount}</span>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
              <span className="text-[10px] text-rose-700 dark:text-rose-400 uppercase font-bold block">Absent Days</span>
              <span className="text-xl font-black text-rose-800 dark:text-rose-300">{calendarData.summary.absentCount}</span>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
              <span className="text-[10px] text-blue-700 dark:text-blue-400 uppercase font-bold block">Hours Logged</span>
              <span className="text-xl font-black text-blue-800 dark:text-blue-300">{calendarData.summary.totalHoursWorked} hrs</span>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Detailed Log Table */}
      <div className="bg-white dark:bg-card rounded-3xl border border-slate-200/80 dark:border-border/60 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-border/60 font-bold text-sm text-slate-800 dark:text-foreground flex items-center justify-between">
          <span>Attendance Log Sheet</span>
          <span className="text-xs font-normal text-slate-400">
            {calendarData?.records?.length || 0} records
          </span>
        </div>
        {/* Mobile View: Clean Card Layout (Matching Reference Image) */}
        <div className="md:hidden p-3 sm:p-4 space-y-3 bg-slate-50/50 dark:bg-muted/10">
          {calendarLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Loading monthly records...
            </div>
          ) : !calendarData?.records || calendarData.records.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-white dark:bg-card rounded-2xl border border-slate-200/80 dark:border-border/60">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="font-medium text-sm text-slate-600 dark:text-slate-300">No records for this month</p>
            </div>
          ) : (
            paginatedHistory.map((r) => {
              const formattedDate = new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              return (
                <div key={r.id} className="p-4 bg-white dark:bg-card rounded-2xl border border-slate-200/80 dark:border-border/60 shadow-xs space-y-3">
                  {/* Top Header Row: Date Pill (left) & Status Pill (right) */}
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-muted text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formattedDate}
                    </div>

                    {r.status === 'present' ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full px-2.5 py-0.5 shadow-none">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> On Time
                      </Badge>
                    ) : r.status === 'late' ? (
                      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-full px-2.5 py-0.5 shadow-none">
                        <AlertCircle className="w-3 h-3 mr-1 text-amber-600" /> Late
                      </Badge>
                    ) : r.status === 'half_day' ? (
                      <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-full px-2.5 py-0.5 shadow-none">
                        Half Day
                      </Badge>
                    ) : r.status === 'absent' ? (
                      <Badge className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-full px-2.5 py-0.5 shadow-none">
                        Absent
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-400 border-slate-200 text-xs rounded-full px-2.5 py-0.5">
                        {r.status}
                      </Badge>
                    )}
                  </div>

                  {/* Middle Row: Staff info + Role badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-muted border border-slate-200 dark:border-border flex items-center justify-center font-bold text-xs text-slate-700 dark:text-foreground uppercase shrink-0">
                        {r.staff_name.slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-foreground text-sm leading-snug">{r.staff_name}</h4>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          Date: {r.date}
                        </p>
                      </div>
                    </div>

                    <Badge variant="secondary" className="text-[11px] font-semibold rounded-lg px-2 py-0.5 border shrink-0">
                      {r.role}
                    </Badge>
                  </div>

                  {/* Inner Details Box (Matching User Reference Image Gray Box) */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-muted/40 border border-slate-100 dark:border-border/60 flex items-center justify-between">
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <span className="text-[10px] uppercase font-bold text-slate-400">In:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-foreground">
                          {r.check_in_time
                            ? new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '--:--'}
                        </span>
                        {r.late_reason && (
                          <span className="text-[10px] text-amber-600 font-medium">({formatLateReason(r.late_reason)})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Out:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-foreground">
                          {r.check_out_time
                            ? new Date(r.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '--:--'}
                        </span>
                      </div>

                      {r.note && (
                        <p className="text-[11px] text-slate-500 italic pt-0.5">
                          Note: {r.note}
                        </p>
                      )}
                    </div>

                    {/* Right side Hours */}
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Logged</span>
                      <span className="font-mono font-black text-sm text-slate-900 dark:text-foreground">
                        {r.hours_worked > 0 ? `${r.hours_worked} hrs` : '--'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Attendance Log Table (Unchanged) */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-muted/50">
              <TableRow>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground">Date</TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground">Employee</TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground">Role</TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground">Check In</TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground">Check Out</TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground">Hours</TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground">Status</TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-foreground">Notes / Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calendarLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-slate-400 text-sm">
                    Loading monthly records...
                  </TableCell>
                </TableRow>
              ) : !calendarData?.records || calendarData.records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-sm text-slate-600 dark:text-slate-300">No records for this month</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedHistory.map((r) => (
                  <TableRow key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-muted/40">
                    <TableCell className="font-mono text-xs font-bold text-slate-800 dark:text-foreground">{r.date}</TableCell>
                    <TableCell className="font-bold text-sm text-slate-900 dark:text-foreground">{r.staff_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {r.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-700 dark:text-slate-300">
                      {r.check_in_time
                        ? new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '--'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-700 dark:text-slate-300">
                      {r.check_out_time
                        ? new Date(r.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '--'}
                    </TableCell>
                    <TableCell className="font-bold text-xs text-slate-800 dark:text-foreground">
                      {r.hours_worked > 0 ? `${r.hours_worked}h` : '--'}
                    </TableCell>
                    <TableCell>
                      {r.status === 'present' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                          On Time
                        </Badge>
                      ) : r.status === 'late' ? (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Late</Badge>
                      ) : r.status === 'half_day' ? (
                        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px]">
                          Half Day
                        </Badge>
                      ) : r.status === 'absent' ? (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">Absent</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          {r.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatLateReason(r.late_reason) || r.note || '--'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {historyRecords.length > 0 && (
          <div className="p-3 sm:p-4 bg-slate-50/80 dark:bg-muted/40 border-t border-slate-200/80 dark:border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p className="text-[11px] sm:text-xs">
              Showing{' '}
              <span className="font-bold text-slate-800 dark:text-foreground">
                {(historyPage - 1) * HISTORY_ITEMS_PER_PAGE + 1}
              </span>{' '}
              to{' '}
              <span className="font-bold text-slate-800 dark:text-foreground">
                {Math.min(historyPage * HISTORY_ITEMS_PER_PAGE, historyRecords.length)}
              </span>{' '}
              of <span className="font-bold text-slate-800 dark:text-foreground">{historyRecords.length}</span> log records
            </p>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                disabled={historyPage === 1}
                className="h-8 px-2.5 text-xs rounded-lg border-slate-300 dark:border-border bg-white dark:bg-card hover:bg-slate-100 dark:hover:bg-muted text-slate-700 dark:text-foreground disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
              </Button>

              <span className="px-2 font-bold text-slate-800 dark:text-foreground text-xs">
                {historyPage} / {totalHistoryPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                disabled={historyPage === totalHistoryPages}
                className="h-8 px-2.5 text-xs rounded-lg border-slate-300 dark:border-border bg-white dark:bg-card hover:bg-slate-100 dark:hover:bg-muted text-slate-700 dark:text-foreground disabled:opacity-40"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
