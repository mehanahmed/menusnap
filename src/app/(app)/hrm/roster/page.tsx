"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Settings,
  Phone,
  KeyRound,
  Clock,
  Wallet,
  Calendar,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useClientAuth } from '@/hooks/use-client-auth';
import { cn } from '@/lib/utils';
import { getStaffRosterAction } from '@/app/actions/hrm';
import { StaffModal } from '@/components/hrm/StaffModal';
import { formatShiftRange } from '@/lib/hrm-constants';

export default function HrmStaffRosterPage() {
  const { clientUser } = useClientAuth();
  const { toast } = useToast();

  const businessId = clientUser?.id || clientUser?.businessName || '';
  const businessType = clientUser?.type || 'restaurant';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roster, setRoster] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  // Add / Edit Modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);

  // Load Staff Roster
  const loadRoster = useCallback(async (showToast = false) => {
    try {
      if (!businessId) return;
      setRefreshing(true);
      const res = await getStaffRosterAction(businessId);
      if (res.success && res.staff) {
        setRoster(res.staff);
        if (showToast) {
          toast({ title: 'Roster Refreshed', description: `Loaded ${res.staff.length} staff records.` });
        }
      }
    } catch (err: any) {
      console.error('Failed to load roster:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [businessId, toast]);

  useEffect(() => {
    if (businessId) {
      loadRoster();
    }
  }, [businessId, loadRoster]);

  // Search filter
  const filteredRoster = useMemo(() => {
    if (!search.trim()) return roster;
    const q = search.toLowerCase();
    return roster.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.role && s.role.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q))
    );
  }, [roster, search]);

  // Pagination
  const [rosterPage, setRosterPage] = useState(1);
  const ROSTER_ITEMS_PER_PAGE = 9;

  useEffect(() => {
    setRosterPage(1);
  }, [search]);

  const totalRosterPages = Math.max(1, Math.ceil(filteredRoster.length / ROSTER_ITEMS_PER_PAGE));
  const paginatedRoster = useMemo(() => {
    const start = (rosterPage - 1) * ROSTER_ITEMS_PER_PAGE;
    return filteredRoster.slice(start, start + ROSTER_ITEMS_PER_PAGE);
  }, [filteredRoster, rosterPage]);

  const openAddStaff = () => {
    setEditingStaff(null);
    setIsStaffModalOpen(true);
  };

  const openEditStaff = (st: any) => {
    setEditingStaff(st);
    setIsStaffModalOpen(true);
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-card p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-border/60 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-foreground tracking-tight">
              Staff Roster Directory
            </h1>
            <Badge variant="secondary" className="text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200">
              {roster.length} Employees
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-muted-foreground font-medium">
            Manage your employees, 6-digit terminal PIN codes, roles, shift timings, and base salaries.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadRoster(true)}
            disabled={refreshing}
            className="h-10 rounded-xl border-slate-300 dark:border-border bg-white dark:bg-card hover:bg-slate-100 dark:hover:bg-muted text-slate-700 dark:text-foreground text-xs font-semibold shadow-2xs"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1 text-slate-500', refreshing && 'animate-spin')} />
            Refresh
          </Button>

          <Button
            onClick={openAddStaff}
            className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add New Employee
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          type="text"
          placeholder="Search by name, role, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-11 rounded-2xl border-slate-200 dark:border-border bg-white dark:bg-card text-xs sm:text-sm shadow-2xs"
        />
      </div>

      {/* Roster Cards Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 animate-pulse" />
          Loading staff directory...
        </div>
      ) : filteredRoster.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-card rounded-3xl border border-slate-200/80 dark:border-border p-8">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h3 className="font-bold text-base text-slate-800 dark:text-foreground">No employees found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search ? 'No staff matched your search filter.' : 'Start by adding your first employee to this store.'}
          </p>
          {!search && (
            <Button
              onClick={openAddStaff}
              className="mt-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add First Employee
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedRoster.map((st) => (
            <Card
              key={st.id}
              className="rounded-3xl border-slate-200/80 dark:border-border/60 shadow-xs hover:shadow-md transition-all bg-white dark:bg-card overflow-hidden"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center font-black text-base text-blue-700 dark:text-blue-300 uppercase shadow-2xs">
                      {st.name.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-foreground text-sm line-clamp-1">{st.name}</h3>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[10px] font-bold rounded-md px-2 py-0.5 mt-0.5 border',
                          businessType === 'parlour'
                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300'
                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300'
                        )}
                      >
                        {st.role}
                      </Badge>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditStaff(st)}
                    className="rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-foreground h-8 w-8 p-0"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-border/60 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" /> Phone
                    </span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 text-xs mt-0.5 block truncate">
                      {st.phone || 'Not set'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-slate-400" /> Kiosk PIN
                    </span>
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md inline-block text-xs mt-0.5 border border-blue-100 dark:border-blue-900/40">
                      {st.pin_code}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" /> Shift Timing
                    </span>
                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300 text-xs mt-0.5 block">
                      {formatShiftRange(st.shift_start, st.shift_end)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                      <Wallet className="w-3 h-3 text-slate-400" /> Base Salary
                    </span>
                    <span className="font-bold text-slate-900 dark:text-foreground text-xs mt-0.5 block">
                      ৳{Number(st.base_salary || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {st.joining_date && (
                  <div className="mt-3 pt-2 border-t border-slate-50 dark:border-border/30 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Joined: {st.joining_date}
                    </span>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => openEditStaff(st)}
                      className="p-0 h-auto text-[11px] text-blue-600 font-semibold"
                    >
                      Edit Profile &rarr;
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filteredRoster.length > ROSTER_ITEMS_PER_PAGE && (
        <div className="p-3 sm:p-4 bg-white dark:bg-card rounded-2xl border border-slate-200/80 dark:border-border/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p className="text-[11px] sm:text-xs">
            Showing{' '}
            <span className="font-bold text-slate-800 dark:text-foreground">
              {(rosterPage - 1) * ROSTER_ITEMS_PER_PAGE + 1}
            </span>{' '}
            to{' '}
            <span className="font-bold text-slate-800 dark:text-foreground">
              {Math.min(rosterPage * ROSTER_ITEMS_PER_PAGE, filteredRoster.length)}
            </span>{' '}
            of <span className="font-bold text-slate-800 dark:text-foreground">{filteredRoster.length}</span> team members
          </p>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRosterPage((p) => Math.max(1, p - 1))}
              disabled={rosterPage === 1}
              className="h-8 px-2.5 text-xs rounded-lg border-slate-300 dark:border-border bg-white dark:bg-card hover:bg-slate-100 dark:hover:bg-muted text-slate-700 dark:text-foreground disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
            </Button>

            <span className="px-2 font-bold text-slate-800 dark:text-foreground text-xs">
              {rosterPage} / {totalRosterPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setRosterPage((p) => Math.min(totalRosterPages, p + 1))}
              disabled={rosterPage === totalRosterPages}
              className="h-8 px-2.5 text-xs rounded-lg border-slate-300 dark:border-border bg-white dark:bg-card hover:bg-slate-100 dark:hover:bg-muted text-slate-700 dark:text-foreground disabled:opacity-40"
            >
              Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Staff Modal */}
      <StaffModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        editingStaff={editingStaff}
        businessId={businessId}
        businessType={businessType}
        onSuccess={() => loadRoster()}
      />
    </div>
  );
}
