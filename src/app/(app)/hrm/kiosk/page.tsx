"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Fingerprint,
  Clock,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  LogIn,
  LogOut,
  Users,
  Search,
  Sparkles,
  Delete,
  Check,
  Building2,
  UtensilsCrossed,
  Scissors,
  Phone,
  Smartphone,
  LayoutGrid,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useClientAuth } from '@/hooks/use-client-auth';
import { cn } from '@/lib/utils';
import { getStaffRosterAction, staffPunchAction } from '@/app/actions/hrm';
import { formatShiftRange } from '@/lib/hrm-constants';

export default function HrmKioskPage() {
  const { clientUser } = useClientAuth();
  const { toast } = useToast();

  const businessId = clientUser?.id || clientUser?.businessName || '';
  const businessName = clientUser?.businessName || 'Business Counter';
  const businessType = clientUser?.type || 'restaurant';

  const [liveTime, setLiveTime] = useState('');
  const [liveDate, setLiveDate] = useState('');
  const [liveDateShort, setLiveDateShort] = useState('');

  // Ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setLiveDate(
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      );
      setLiveDateShort(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Kiosk Mode: 'phone' (recommended for 10-15+ staff) or 'roster' (visual grid)
  const [kioskMode, setKioskMode] = useState<'phone' | 'roster'>('phone');

  // Phone Mode State
  const [phoneInput, setPhoneInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [activeInput, setActiveInput] = useState<'phone' | 'pin'>('phone');

  // Roster Mode State
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [punchResult, setPunchResult] = useState<{
    success: boolean;
    type: 'in' | 'out';
    message: string;
    staffName: string;
    role?: string;
    time: string;
  } | null>(null);

  // Load Staff
  const loadStaff = useCallback(async () => {
    try {
      if (!businessId) return;
      const res = await getStaffRosterAction(businessId);
      if (res.success && res.staff) {
        setStaffList(res.staff.filter((s: any) => s.is_active));
      }
    } catch (err: any) {
      console.error('Kiosk load staff error:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  // Filtered staff for Roster Mode
  const filteredStaff = useMemo(() => {
    if (!search.trim()) return staffList;
    const q = search.toLowerCase();
    return staffList.filter((s) => s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q));
  }, [staffList, search]);

  // Handle Numpad Key Press
  const handleNumpad = (num: string) => {
    if (kioskMode === 'phone') {
      if (activeInput === 'phone') {
        if (phoneInput.length < 11) {
          const next = phoneInput + num;
          setPhoneInput(next);
          // Auto switch to PIN once 11 digits are entered
          if (next.length === 11) {
            setActiveInput('pin');
          }
        }
      } else {
        if (pinInput.length < 6) {
          setPinInput((prev) => prev + num);
        }
      }
    } else {
      if (pinInput.length < 6) {
        setPinInput((prev) => prev + num);
      }
    }
  };

  const handleBackspace = () => {
    if (kioskMode === 'phone') {
      if (activeInput === 'pin') {
        if (pinInput.length > 0) {
          setPinInput((prev) => prev.slice(0, -1));
        } else {
          setActiveInput('phone');
        }
      } else {
        setPhoneInput((prev) => prev.slice(0, -1));
      }
    } else {
      setPinInput((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (kioskMode === 'phone') {
      setPhoneInput('');
      setPinInput('');
      setActiveInput('phone');
    } else {
      setPinInput('');
    }
  };

  // Trigger Punch (In or Out)
  const handlePunch = async (actionType?: 'in' | 'out') => {
    let payload: any = {
      restaurantId: businessId,
      actionType,
    };

    if (kioskMode === 'phone') {
      if (!phoneInput || phoneInput.length < 11) {
        toast({
          title: 'Enter Phone Number',
          description: 'Please enter your complete 11-digit mobile number (e.g. 017XXXXXXXX).',
          variant: 'destructive',
        });
        setActiveInput('phone');
        return;
      }
      if (!pinInput) {
        toast({
          title: 'Enter PIN Code',
          description: 'Please enter your 6-digit security PIN.',
          variant: 'destructive',
        });
        setActiveInput('pin');
        return;
      }
      payload.phone = phoneInput;
      payload.pinCode = pinInput;
    } else {
      if (!selectedStaff) {
        toast({ title: 'Select Your Name', description: 'Please tap your name from the roster.', variant: 'destructive' });
        return;
      }
      if (!pinInput) {
        toast({ title: 'Enter PIN Code', description: 'Please enter your 6-digit security PIN.', variant: 'destructive' });
        return;
      }
      payload.staffId = selectedStaff.id;
      payload.pinCode = pinInput;
    }

    try {
      setSubmitting(true);
      const res = await staffPunchAction(payload);

      if (res.success) {
        // Broadcast to HRM dashboard for instant live-update
        if (typeof window !== 'undefined') {
          try {
            const bc = new BroadcastChannel('menubldr_hrm_sync');
            bc.postMessage({ type: 'punch_updated', timestamp: Date.now() });
            bc.close();
          } catch {}
          try {
            localStorage.setItem('menubldr_hrm_punch_sync', String(Date.now()));
          } catch {}
        }

        setPunchResult({
          success: true,
          type: res.actionType || 'in',
          message: res.message || 'Punch processed successfully!',
          staffName: res.staffName || selectedStaff?.name || 'Staff Member',
          role: res.role || selectedStaff?.role,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });

        // Clear inputs and auto-reset after 3.5 seconds
        setTimeout(() => {
          setPunchResult(null);
          setSelectedStaff(null);
          setPhoneInput('');
          setPinInput('');
          setActiveInput('phone');
        }, 3500);
      } else {
        toast({
          title: 'Punch Failed',
          description: res.error || 'Verification failed. Please check your phone number and PIN.',
          variant: 'destructive',
        });
        setPinInput('');
        if (kioskMode === 'phone') setActiveInput('pin');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Server error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center justify-between w-full sm:w-auto gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-base sm:text-lg text-white tracking-tight truncate max-w-[200px] sm:max-w-none">
                {businessName}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] font-bold border-slate-700 bg-slate-900 text-slate-300 shrink-0"
              >
                {businessType === 'parlour' ? (
                  <>
                    <Scissors className="w-3 h-3 mr-1 inline text-purple-400" /> Parlour Terminal
                  </>
                ) : (
                  <>
                    <UtensilsCrossed className="w-3 h-3 mr-1 inline text-amber-400" /> Restaurant Terminal
                  </>
                )}
              </Badge>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400">Staff Counter Attendance Kiosk</p>
          </div>

          {/* Live Clock Display (Mobile: sits neatly at top right) */}
          <div className="sm:hidden text-right shrink-0 pl-2">
            <div className="text-base font-mono font-black text-emerald-400 tracking-tight whitespace-nowrap tabular-nums">
              {liveTime || '--:--:--'}
            </div>
            <div className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
              {liveDateShort || liveDate}
            </div>
          </div>
        </div>

        {/* Live Clock Display & Mode Switcher */}
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          {/* Mode Switcher */}
          <div className="bg-slate-900 p-1 rounded-2xl border border-slate-800 flex items-center gap-1 w-full sm:w-auto">
            <button
              onClick={() => {
                setKioskMode('phone');
                setSelectedStaff(null);
                setPinInput('');
              }}
              className={cn(
                'flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all',
                kioskMode === 'phone'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Number &amp; PIN</span>
            </button>
            <button
              onClick={() => {
                setKioskMode('roster');
                setPhoneInput('');
                setPinInput('');
              }}
              className={cn(
                'flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all',
                kioskMode === 'roster'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Roster Grid</span>
            </button>
          </div>

          {/* Live Clock Display (Desktop / Tablet) */}
          <div className="hidden sm:block text-right pl-3 border-l border-slate-800 shrink-0">
            <div className="text-xl lg:text-2xl font-mono font-black text-emerald-400 tracking-tight whitespace-nowrap tabular-nums">
              {liveTime || '--:--:--'}
            </div>
            <div className="text-[11px] font-medium text-slate-400 whitespace-nowrap">{liveDate}</div>
          </div>
        </div>
      </div>

      {/* Main Kiosk Content */}
      <div className="flex-1 flex items-center justify-center py-6 max-w-5xl mx-auto w-full">
        {punchResult ? (
          /* Success Screen */
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center space-y-5 animate-in zoom-in-95 shadow-2xl">
            <div
              className={cn(
                'w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-white shadow-xl',
                punchResult.type === 'in'
                  ? 'bg-emerald-600 shadow-emerald-900/40'
                  : 'bg-rose-600 shadow-rose-900/40'
              )}
            >
              {punchResult.type === 'in' ? <LogIn className="w-10 h-10" /> : <LogOut className="w-10 h-10" />}
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 mb-2">
                {punchResult.role || 'Staff'}
              </span>
              <h3 className="text-2xl font-black text-white">{punchResult.message}</h3>
              <p className="text-sm text-slate-400 mt-1">
                {punchResult.staffName} • {punchResult.time}
              </p>
            </div>
            <div className="pt-2">
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full animate-[progress_3.5s_linear_forwards]" />
              </div>
              <p className="text-[11px] text-slate-500 mt-2 font-medium">
                Resetting for next employee...
              </p>
            </div>
          </div>
        ) : kioskMode === 'phone' ? (
          /* MODE 1: PHONE NUMBER & PIN (Recommended for 10-15+ staff) */
          <div className="w-full max-w-lg bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-1">
                <Smartphone className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Staff Attendance Punch</h2>
              <p className="text-xs text-slate-400 font-medium">
                Enter your 11-digit Mobile Number and 6-digit PIN to Check In / Out
              </p>
            </div>

            {/* Inputs Container */}
            <div className="space-y-3">
              {/* Phone Field */}
              <button
                type="button"
                onClick={() => setActiveInput('phone')}
                className={cn(
                  'w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between',
                  activeInput === 'phone'
                    ? 'bg-blue-600/10 border-blue-500 ring-2 ring-blue-500/40'
                    : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800'
                )}
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Mobile Number
                  </span>
                  <span className="text-lg font-mono font-bold text-white tracking-wider">
                    {phoneInput || '01XXXXXXXXX'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-500">{phoneInput.length}/11</span>
                  {phoneInput.length === 11 && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
              </button>

              {/* PIN Field */}
              <button
                type="button"
                onClick={() => setActiveInput('pin')}
                className={cn(
                  'w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between',
                  activeInput === 'pin'
                    ? 'bg-blue-600/10 border-blue-500 ring-2 ring-blue-500/40'
                    : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800'
                )}
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    6-Digit Security PIN
                  </span>
                  <div className="flex items-center gap-2 pt-1">
                    {[0, 1, 2, 3, 4, 5].map((idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'w-3.5 h-3.5 rounded-full border-2 transition-all',
                          pinInput.length > idx
                            ? 'bg-blue-500 border-blue-400 scale-110 shadow-sm shadow-blue-500/50'
                            : 'border-slate-700 bg-slate-800'
                        )}
                      />
                    ))}
                  </div>
                </div>
                <KeyRound className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Tactile Touch Keypad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto w-full pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleNumpad(digit)}
                  disabled={submitting}
                  className="h-13 sm:h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 active:scale-95 text-xl font-bold font-mono text-white transition-all shadow-sm"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={handleClear}
                disabled={submitting}
                className="h-13 sm:h-14 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-400 active:scale-95 transition-all"
              >
                CLEAR
              </button>
              <button
                onClick={() => handleNumpad('0')}
                disabled={submitting}
                className="h-13 sm:h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 active:scale-95 text-xl font-bold font-mono text-white transition-all shadow-sm"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                disabled={submitting}
                className="h-13 sm:h-14 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-400 active:scale-95 transition-all"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* In / Out Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                type="button"
                size="lg"
                onClick={() => handlePunch('in')}
                disabled={submitting || phoneInput.length < 11 || pinInput.length < 6}
                className="h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm tracking-wide shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-40"
              >
                <LogIn className="w-5 h-5 mr-2" /> Check In
              </Button>

              <Button
                type="button"
                size="lg"
                onClick={() => handlePunch('out')}
                disabled={submitting || phoneInput.length < 11 || pinInput.length < 6}
                className="h-14 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm tracking-wide shadow-lg shadow-rose-950/40 transition-all disabled:opacity-40"
              >
                <LogOut className="w-5 h-5 mr-2" /> Check Out
              </Button>
            </div>

            <div className="text-center pt-1">
              <p className="text-[11px] text-slate-500 font-medium">
                Tap Check In when starting shift • Tap Check Out when leaving
              </p>
            </div>
          </div>
        ) : (
          /* MODE 2: ROSTER GRID (Tap name from cards) */
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Staff Cards */}
            <div className="lg:col-span-7 flex flex-col bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 overflow-hidden min-h-[550px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-800/80">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    Select Your Name
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Tap your card from the active roster</p>
                </div>

                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    type="text"
                    placeholder="Search staff..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9 text-xs bg-slate-800/80 border-slate-700 text-white rounded-xl focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              {/* Roster Cards Grid with sleek dark scrollbar */}
              <div className="flex-1 overflow-y-auto pr-1.5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 auto-rows-max [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-700/80 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                {loading ? (
                  <div className="col-span-full text-center py-16 text-slate-500 text-sm">
                    Loading staff roster...
                  </div>
                ) : filteredStaff.length === 0 ? (
                  <div className="col-span-full text-center py-16 text-slate-500 text-sm">
                    No matching staff found
                  </div>
                ) : (
                  filteredStaff.map((st) => {
                    const isSelected = selectedStaff?.id === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setSelectedStaff(st);
                          setPinInput('');
                        }}
                        className={cn(
                          'p-4 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between relative group shadow-sm',
                          isSelected
                            ? 'bg-blue-600/15 border-blue-500 ring-2 ring-blue-500/50 shadow-md shadow-blue-950/50'
                            : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-600'
                        )}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm shadow-blue-500/50">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm uppercase transition-colors shrink-0 shadow-xs',
                              isSelected
                                ? 'bg-blue-500 text-white shadow-blue-500/30'
                                : 'bg-slate-700/80 text-slate-200 group-hover:bg-slate-600'
                            )}
                          >
                            {st.name.slice(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1 pr-4">
                            <p className="font-bold text-sm text-white truncate">{st.name}</p>
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-[10px] font-semibold rounded-md px-1.5 py-0 mt-0.5 inline-block truncate max-w-full',
                                isSelected ? 'bg-blue-500/30 text-blue-200 border-blue-400/40' : 'bg-slate-700/60 text-slate-300 border-slate-600/40'
                              )}
                            >
                              {st.role}
                            </Badge>
                          </div>
                        </div>

                        {/* Shift timing pill */}
                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] font-mono text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="truncate">{formatShiftRange(st.shift_start, st.shift_end)}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Selected Staff PIN Pad */}
            <div className="lg:col-span-5 flex flex-col justify-between bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 min-h-[550px]">
              <div className="bg-slate-800/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                {selectedStaff ? (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-black text-base flex items-center justify-center">
                      {selectedStaff.name.slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">{selectedStaff.name}</h4>
                      <p className="text-xs text-blue-400 font-medium">{selectedStaff.role}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-slate-400">
                    <Fingerprint className="w-10 h-10 text-slate-600" />
                    <div>
                      <p className="font-bold text-sm text-slate-300">No Employee Selected</p>
                      <p className="text-xs text-slate-500">Tap your name from the left</p>
                    </div>
                  </div>
                )}
              </div>

              {/* PIN Code Circles */}
              <div className="text-center py-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Enter 6-Digit Security PIN
                </span>
                <div className="flex items-center justify-center gap-3">
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'w-4 h-4 rounded-full border-2 transition-all',
                        pinInput.length > idx
                          ? 'bg-blue-500 border-blue-400 scale-110 shadow-sm shadow-blue-500/50'
                          : 'border-slate-700 bg-slate-800'
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto w-full">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    onClick={() => handleNumpad(digit)}
                    disabled={submitting}
                    className="h-13 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 active:scale-95 text-xl font-bold font-mono text-white transition-all shadow-sm"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  onClick={handleClear}
                  disabled={submitting}
                  className="h-13 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-400 active:scale-95 transition-all"
                >
                  CLEAR
                </button>
                <button
                  onClick={() => handleNumpad('0')}
                  disabled={submitting}
                  className="h-13 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 active:scale-95 text-xl font-bold font-mono text-white transition-all shadow-sm"
                >
                  0
                </button>
                <button
                  onClick={handleBackspace}
                  disabled={submitting}
                  className="h-13 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-400 active:scale-95 transition-all"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  onClick={() => handlePunch('in')}
                  disabled={submitting || !selectedStaff || pinInput.length < 6}
                  className="h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm tracking-wide disabled:opacity-40"
                >
                  <LogIn className="w-5 h-5 mr-2" /> Check In
                </Button>
                <Button
                  onClick={() => handlePunch('out')}
                  disabled={submitting || !selectedStaff || pinInput.length < 6}
                  className="h-13 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm tracking-wide disabled:opacity-40"
                >
                  <LogOut className="w-5 h-5 mr-2" /> Check Out
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
