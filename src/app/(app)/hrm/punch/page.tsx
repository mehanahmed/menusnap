"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Smartphone,
  KeyRound,
  LogIn,
  LogOut,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building2,
  User,
  ShieldCheck,
  ArrowRight,
  LogOut as ExitIcon,
  RefreshCw,
  Sparkles,
  MapPin,
  MapPinOff,
  Lock,
  Unlock,
  Navigation,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { staffLoginPortalAction, staffPunchAction, getMonthlyAttendanceCalendarAction } from '@/app/actions/hrm';
import { sanitizeBdPhone } from '@/lib/accounts/helpers';
import { calculateDistanceInMeters, formatShiftRange, formatLateReason, formatTime12h, formatHoursHuman } from '@/lib/hrm-constants';

const REMEMBER_PHONE_KEY = 'menubldr_staff_phone';

function StaffPunchContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const urlBusinessId = searchParams.get('b') || searchParams.get('restaurantId') || '';

  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [punching, setPunching] = useState(false);

  // Workplace selection when phone exists in multiple businesses
  const [workplaces, setWorkplaces] = useState<Array<{
    restaurantId: string;
    businessName: string;
    role: string;
    name: string;
  }> | null>(null);

  // Authenticated Staff Profile & Session
  const [staffData, setStaffData] = useState<{
    id: number;
    name: string;
    role: string;
    phone: string;
    shift_start: string;
    shift_end: string;
    restaurant_id: string;
    business_name: string;
  } | null>(null);

  const [geofence, setGeofence] = useState<{
    latitude: number | null;
    longitude: number | null;
    radius_meters: number;
    enforce_geofence: boolean;
  } | null>(null);

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [todayAttendance, setTodayAttendance] = useState<{
    date: string;
    status: string;
    check_in_time: string | null;
    check_out_time: string | null;
    hours_worked: number;
    late_reason: string | null;
  } | null>(null);

  const [monthSummary, setMonthSummary] = useState<{
    presentDays: number;
    lateDays: number;
    totalHoursWorked: number;
  } | null>(null);

  // Active Tab: 'punch' | 'history'
  const [activeTab, setActiveTab] = useState<'punch' | 'history'>('punch');

  // History Tab States
  const [historyYear, setHistoryYear] = useState(() => new Date().getFullYear());
  const [historyMonth, setHistoryMonth] = useState(() => new Date().getMonth() + 1); // 1-12
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [historySummary, setHistorySummary] = useState<{
    totalRecords: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    halfDayCount: number;
    leaveCount: number;
    totalHoursWorked: number;
  } | null>(null);
  const [selectedDayRecord, setSelectedDayRecord] = useState<any | null>(null);
  const [historyWeekendDays, setHistoryWeekendDays] = useState<string>('Friday');

  const fetchHistory = useCallback(
    async (year: number, month: number, staffId?: number, restaurantId?: string) => {
      const targetStaffId = staffId || staffData?.id;
      const targetRestId = restaurantId || staffData?.restaurant_id;
      if (!targetStaffId || !targetRestId) return;

      setHistoryLoading(true);
      try {
        const res = await getMonthlyAttendanceCalendarAction(targetRestId, {
          year,
          month,
          staffId: targetStaffId,
        });
        if (res.success) {
          setHistoryRecords(res.records || []);
          setHistorySummary(res.summary || null);
          if ((res as any).weekend_days) {
            setHistoryWeekendDays((res as any).weekend_days);
          }
          const todayDateStr = new Date().toLocaleDateString('en-CA');
          const todayRec = (res.records || []).find((r: any) => r.date === todayDateStr);
          setSelectedDayRecord(todayRec || null);
        }
      } catch (err) {
        console.error('Failed to load staff history:', err);
      } finally {
        setHistoryLoading(false);
      }
    },
    [staffData?.id, staffData?.restaurant_id]
  );

  const handlePrevMonth = () => {
    if (historyMonth === 1) {
      const newY = historyYear - 1;
      const newM = 12;
      setHistoryYear(newY);
      setHistoryMonth(newM);
      fetchHistory(newY, newM);
    } else {
      const newM = historyMonth - 1;
      setHistoryMonth(newM);
      fetchHistory(historyYear, newM);
    }
  };

  const handleNextMonth = () => {
    if (historyMonth === 12) {
      const newY = historyYear + 1;
      const newM = 1;
      setHistoryYear(newY);
      setHistoryMonth(newM);
      fetchHistory(newY, newM);
    } else {
      const newM = historyMonth + 1;
      setHistoryMonth(newM);
      fetchHistory(historyYear, newM);
    }
  };

  const recordsMap = useMemo(() => {
    const map: Record<string, any> = {};
    for (const r of historyRecords) {
      if (r.date) map[r.date] = r;
    }
    return map;
  }, [historyRecords]);

  const calendarDays = useMemo(() => {
    const totalDays = new Date(historyYear, historyMonth, 0).getDate();
    const firstDayRaw = new Date(historyYear, historyMonth - 1, 1).getDay();
    // Monday = 0, Tuesday = 1, ..., Sunday = 6
    const startOffset = (firstDayRaw + 6) % 7;

    const days: Array<{ dayNumber: number; dateStr: string; isCurrentMonth: boolean }> = [];
    for (let i = 0; i < startOffset; i++) {
      days.push({ dayNumber: 0, dateStr: '', isCurrentMonth: false });
    }
    for (let d = 1; d <= totalDays; d++) {
      const dStr = `${historyYear}-${String(historyMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr: dStr, isCurrentMonth: true });
    }
    return days;
  }, [historyYear, historyMonth]);

  const dynamicSummary = useMemo(() => {
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let totalHours = 0;

    const todayDateStr = new Date().toLocaleDateString('en-CA');
    const weekendList = (historyWeekendDays || 'Friday')
      .split(',')
      .map((s: string) => s.trim().toLowerCase());

    for (const item of calendarDays) {
      if (!item.isCurrentMonth) continue;
      const dateObj = new Date(historyYear, historyMonth - 1, item.dayNumber);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const isWeekend = weekendList.includes(dayName);

      // Weekends have NO mark and are not counted as absent
      if (isWeekend) continue;

      const rec = recordsMap[item.dateStr];
      if (rec) {
        if (rec.status === 'present') presentCount++;
        else if (rec.status === 'late') lateCount++;
        else if (rec.status === 'absent') absentCount++;
        else if (rec.status === 'half_day') lateCount++;
        totalHours += Number(rec.hours_worked || 0);
      } else {
        // Past working days with no attendance count as absent
        if (item.dateStr < todayDateStr) {
          absentCount++;
        }
      }
    }

    const totalWorked = presentCount + lateCount;
    const totalRecorded = totalWorked + absentCount;

    return {
      presentCount,
      lateCount,
      absentCount,
      totalWorked,
      totalRecorded,
      totalHoursWorked: Number(totalHours.toFixed(2)),
    };
  }, [calendarDays, recordsMap, historyWeekendDays, historyYear, historyMonth]);

  // Fetch current GPS location
  const fetchGpsLocation = (targetGeo = geofence) => {
    if (typeof window === 'undefined') return;
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        setLocating(false);

        if (targetGeo?.latitude != null && targetGeo?.longitude != null) {
          const dist = calculateDistanceInMeters(latitude, longitude, targetGeo.latitude, targetGeo.longitude);
          setDistanceMeters(dist);
        }
      },
      (err) => {
        setLocating(false);
        let msg = 'Unable to retrieve GPS location.';
        if (err.code === 1) msg = 'Location access denied. Please allow GPS permissions in your browser.';
        else if (err.code === 2) msg = 'Location unavailable. Turn on device GPS/Location.';
        else if (err.code === 3) msg = 'Location request timed out. Please tap retry.';
        setLocationError(msg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Live time & dynamic duration
  const [liveTime, setLiveTime] = useState('');
  const [liveDate, setLiveDate] = useState('');
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const updateTicker = () => {
      const now = new Date();
      setCurrentTime(now);
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
    };
    updateTicker();
    const interval = setInterval(updateTicker, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentDutyDuration = useMemo(() => {
    if (!todayAttendance?.check_in_time) return null;
    const inMs = new Date(todayAttendance.check_in_time).getTime();
    const outMs = todayAttendance.check_out_time
      ? new Date(todayAttendance.check_out_time).getTime()
      : currentTime.getTime();
    const diffMinutes = Math.max(0, Math.floor((outMs - inMs) / 60000));
    const h = Math.floor(diffMinutes / 60);
    const m = diffMinutes % 60;
    if (h > 0 && m > 0) return `${h} hr ${m} min`;
    if (h > 0) return `${h} hr`;
    return `${m} min`;
  }, [todayAttendance?.check_in_time, todayAttendance?.check_out_time, currentTime]);

  // Check if current time is outside the valid shift window (standard 30-min early window + shift end lock)
  const shiftWindow = useMemo(() => {
    if (!staffData?.shift_start || !staffData?.shift_end) {
      return { isEnded: false, isTooEarly: false, openTimeStr: '', startTimeStr: '' };
    }
    const [endHour, endMin] = String(staffData.shift_end).split(':').map(Number);
    const [startHour, startMin] = String(staffData.shift_start || '09:00').split(':').map(Number);
    const end = new Date(currentTime);
    end.setHours(isNaN(endHour) ? 18 : endHour, isNaN(endMin) ? 0 : endMin, 0, 0);
    const start = new Date(currentTime);
    start.setHours(isNaN(startHour) ? 9 : startHour, isNaN(startMin) ? 0 : startMin, 0, 0);

    // Overnight shift crossing midnight
    if (end <= start) {
      if (currentTime.getHours() >= (isNaN(startHour) ? 9 : startHour)) {
        end.setDate(end.getDate() + 1);
      } else {
        start.setDate(start.getDate() - 1);
      }
    }

    // Standard 30-minute early check-in window
    const earlyOpen = new Date(start.getTime() - 30 * 60 * 1000);
    const isEnded = currentTime.getTime() > end.getTime();
    const isTooEarly = currentTime.getTime() < earlyOpen.getTime();

    return {
      isEnded,
      isTooEarly,
      openTimeStr: formatTime12h(earlyOpen.toTimeString().slice(0, 5)),
      startTimeStr: formatTime12h(staffData.shift_start),
    };
  }, [staffData?.shift_start, staffData?.shift_end, currentTime]);

  // Restore remembered phone on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(REMEMBER_PHONE_KEY);
      if (saved) {
        setPhone(sanitizeBdPhone(saved));
      }
    }
  }, []);

  // Handle Login
  const handleLogin = async (e?: React.FormEvent, targetBusinessId?: string) => {
    if (e) e.preventDefault();
    const cleanPhone = sanitizeBdPhone(phone);
    if (!cleanPhone || cleanPhone.length < 11) {
      toast({
        title: 'Invalid Mobile Number',
        description: 'Please enter your 11-digit mobile number (e.g. 017XXXXXXXX).',
        variant: 'destructive',
      });
      return;
    }
    if (!pin || pin.length < 6) {
      toast({
        title: 'Invalid PIN',
        description: 'Please enter your 6-digit security PIN.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const res = await staffLoginPortalAction({
        phone: cleanPhone,
        pinCode: pin,
        restaurantId: targetBusinessId || urlBusinessId || undefined,
      });

      if (res.multipleWorkplaces && res.workplaces && res.workplaces.length > 1) {
        setWorkplaces(res.workplaces);
        return;
      }

      if (res.success && res.staff) {
        setWorkplaces(null);
        setStaffData(res.staff);
        setTodayAttendance(res.todayAttendance || null);
        setMonthSummary(res.monthSummary || null);
        fetchHistory(historyYear, historyMonth, res.staff.id, res.staff.restaurant_id);

        if (res.geofence) {
          setGeofence(res.geofence);
          fetchGpsLocation(res.geofence);
        }

        if (rememberMe && typeof window !== 'undefined') {
          localStorage.setItem(REMEMBER_PHONE_KEY, phone);
        }

        toast({
          title: `Welcome, ${res.staff.name}!`,
          description: `Logged in to ${res.staff.business_name}.`,
        });
      } else {
        toast({
          title: 'Login Failed',
          description: res.error || 'Incorrect mobile number or PIN code.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Server error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Handle Punch In / Out
  const handlePunch = async (actionType: 'in' | 'out') => {
    if (!staffData) return;
    try {
      setPunching(true);
      const res = await staffPunchAction({
        phone: staffData.phone,
        pinCode: pin,
        actionType,
        latitude: userCoords?.lat,
        longitude: userCoords?.lng,
      });

      if (res.success) {
        toast({
          title: actionType === 'in' ? 'Checked In Successfully' : 'Checked Out Successfully',
          description: res.message,
        });

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

        // Refresh portal data
        const refresh = await staffLoginPortalAction({ phone: staffData.phone, pinCode: pin });
        if (refresh.success && refresh.staff) {
          setStaffData(refresh.staff);
          setTodayAttendance(refresh.todayAttendance || null);
          setMonthSummary(refresh.monthSummary || null);
          fetchHistory(historyYear, historyMonth, refresh.staff.id, refresh.staff.restaurant_id);
          if (refresh.geofence) {
            setGeofence(refresh.geofence);
          }
        }
      } else {
        toast({
          title: 'Punch Failed',
          description: res.error || 'Could not record attendance.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Server error', variant: 'destructive' });
    } finally {
      setPunching(false);
    }
  };

  // Logout / Switch Account
  const handleLogout = () => {
    setStaffData(null);
    setPin('');
    setTodayAttendance(null);
    setGeofence(null);
    setUserCoords(null);
    setDistanceMeters(null);
    setLocationError(null);
  };

  // Cross-tab auto-sync: instantly updates shift timings and policy when changed in Settings
  useEffect(() => {
    if (!staffData?.phone || !pin) return;

    const handleSync = async () => {
      try {
        const refresh = await staffLoginPortalAction({ phone: staffData.phone, pinCode: pin });
        if (refresh.success && refresh.staff) {
          setStaffData(refresh.staff);
          setTodayAttendance(refresh.todayAttendance || null);
          setMonthSummary(refresh.monthSummary || null);
          if (refresh.geofence) {
            setGeofence(refresh.geofence);
          }
        }
      } catch {}
    };

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('menubldr_hrm_sync');
      bc.onmessage = (event) => {
        if (event.data?.type === 'settings_updated' || event.data?.type === 'punch_updated') {
          handleSync();
        }
      };
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'menubldr_hrm_punch_sync') {
        handleSync();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [staffData?.phone, pin]);

  const isGeofenceActive = Boolean(
    geofence?.enforce_geofence &&
    geofence?.latitude !== null &&
    geofence?.latitude !== undefined &&
    geofence?.longitude !== null &&
    geofence?.longitude !== undefined
  );

  const allowedRadius = geofence?.radius_meters || 100;
  const isInsideGeofence = isGeofenceActive
    ? distanceMeters !== null && distanceMeters <= allowedRadius
    : true;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center py-4 space-y-1">
        <div className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 mb-2">
          <Clock className="w-7 h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Staff Attendance Portal</h1>
        <p className="text-xs text-slate-400 font-medium">Check in and track your daily shifts</p>

        {/* Live Clock */}
        <div className="pt-2">
          <span className="font-mono text-2xl sm:text-3xl font-black text-emerald-400 block tracking-tight">
            {liveTime || '--:--:--'}
          </span>
          <span className="text-xs text-slate-400 font-medium">{liveDate}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center py-4">
        {workplaces && workplaces.length > 1 ? (
          /* WORKPLACE SELECTION (When phone exists across multiple businesses) */
          <Card className="rounded-3xl bg-slate-900/90 border-slate-800 shadow-2xl p-6 text-left space-y-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold mb-2">
                <Building2 className="w-3.5 h-3.5" /> Multiple Workplaces Found
              </div>
              <h2 className="text-lg font-bold text-white">Select Your Workplace</h2>
              <p className="text-xs text-slate-400">Where are you clocking in today?</p>
            </div>

            <div className="space-y-2.5">
              {workplaces.map((wp) => (
                <button
                  key={wp.restaurantId}
                  type="button"
                  onClick={() => handleLogin(undefined, wp.restaurantId)}
                  disabled={loading}
                  className="w-full p-4 rounded-2xl bg-slate-800/80 hover:bg-blue-600/20 border border-slate-700/80 hover:border-blue-500/50 text-left transition-all flex items-center justify-between group"
                >
                  <div>
                    <span className="font-bold text-sm text-white group-hover:text-blue-300 block transition-colors">
                      {wp.businessName}
                    </span>
                    <span className="text-xs text-slate-400">
                      {wp.role} &bull; {wp.name}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setWorkplaces(null)}
              className="w-full text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
          </Card>
        ) : !staffData ? (
          /* LOGIN FORM (Mobile Number & 6-Digit PIN) */
          <Card className="rounded-3xl bg-slate-900/90 border-slate-800 shadow-2xl p-6 text-left space-y-5">
            <div>
              {urlBusinessId ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-bold mb-2">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  Store: {urlBusinessId}
                </div>
              ) : null}
              <h2 className="text-lg font-bold text-white">Employee Login</h2>
              <p className="text-xs text-slate-400">Enter your registered mobile number and PIN</p>
            </div>

            <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-blue-400" /> Mobile Number
                  </Label>
                  <span className={`text-[10px] font-mono font-bold ${phone.length === 11 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {phone.length}/11
                  </span>
                </div>
                <div className="flex rounded-xl border border-slate-700 bg-slate-800/80 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 overflow-hidden h-11 transition-all">
                  <span className="inline-flex items-center px-3.5 bg-slate-900/70 text-slate-300 font-mono font-bold text-sm border-r border-slate-700 select-none">
                    +88
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    placeholder="01XXXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(sanitizeBdPhone(e.target.value))}
                    maxLength={11}
                    className="flex-1 bg-transparent px-3 text-base outline-none font-mono tracking-wider text-white placeholder:text-slate-500 h-full"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-400" /> 6-Digit Security PIN
                </Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  placeholder="••••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="h-11 rounded-xl bg-slate-800/80 border-slate-700 text-white font-mono text-center text-lg tracking-widest font-bold focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-400">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span>Remember my mobile</span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-900/40 transition-all mt-2"
              >
                {loading ? 'Verifying...' : 'Sign In & View Shift'}
              </Button>
            </form>
          </Card>
        ) : (
          /* AUTHENTICATED STAFF DASHBOARD */
          <div className="space-y-4">
            {/* Profile Card */}
            <Card className="rounded-3xl bg-slate-900/90 border-slate-800 shadow-xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg uppercase shadow-sm">
                    {staffData.name.slice(0, 2)}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white leading-tight">{staffData.name}</h2>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="secondary" className="bg-slate-800 text-blue-300 text-[10px] font-bold">
                        {staffData.role}
                      </Badge>
                      <span className="text-[11px] text-slate-400">• {staffData.business_name}</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-xs text-slate-400 hover:text-white h-8 px-2"
                >
                  <ExitIcon className="w-3.5 h-3.5 mr-1" /> Logout
                </Button>
              </div>

              {/* Shift Hours Banner */}
              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Scheduled Shift</span>
                <span className="font-mono font-bold text-white">
                  {formatShiftRange(staffData.shift_start, staffData.shift_end)}
                </span>
              </div>
            </Card>

            {/* 2-Tab Navigation Switcher */}
            <div className="flex p-1 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
              <button
                type="button"
                onClick={() => setActiveTab('punch')}
                className={cn(
                  "flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                  activeTab === 'punch'
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Clock className="w-4 h-4" />
                Today&apos;s Punch
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('history');
                  if (historyRecords.length === 0) {
                    fetchHistory(historyYear, historyMonth);
                  }
                }}
                className={cn(
                  "flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                  activeTab === 'history'
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Calendar className="w-4 h-4" />
                My History
              </button>
            </div>

            {activeTab === 'punch' ? (
              <>
                {/* Today's Punch Action Card */}
                <Card className="rounded-3xl bg-slate-900/90 border-slate-800 shadow-xl p-5 text-center space-y-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Today&apos;s Status
                    </span>

                    {todayAttendance?.check_out_time ? (
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                          Shift Completed
                        </div>
                        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium">
                          <Clock className="w-3.5 h-3.5 text-blue-400" />
                          <span>Duration:</span>
                          <span className="font-mono font-bold text-white text-sm bg-slate-800/80 px-2.5 py-0.5 rounded-lg border border-slate-700/60">
                            {formatHoursHuman(todayAttendance.hours_worked, todayAttendance.check_in_time, todayAttendance.check_out_time)}
                          </span>
                        </div>
                      </div>
                    ) : todayAttendance?.check_in_time ? (
                      <div className="space-y-2.5">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Checked In at{' '}
                          {new Date(todayAttendance.check_in_time).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}{' '}
                          ({todayAttendance.status === 'present' ? 'On Time' : 'Late'})
                        </div>

                        {currentDutyDuration && (
                          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-300 font-medium">
                            <Clock className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Duration:</span>
                            <span className="font-mono font-bold text-emerald-300 text-sm bg-emerald-950/40 px-2.5 py-0.5 rounded-lg border border-emerald-800/40 shadow-inner">
                              {currentDutyDuration}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Not Checked In Yet
                      </div>
                    )}
                  </div>

                  {/* Geofence Status Indicator (Inside/Outside Office Location) */}
                  {isGeofenceActive && (
                    <div className="space-y-2 text-left">
                      {locating ? (
                        <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Navigation className="w-4 h-4 text-blue-400 animate-spin" />
                            <span>Verifying GPS location...</span>
                          </div>
                        </div>
                      ) : locationError ? (
                        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPinOff className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>{locationError}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => fetchGpsLocation()}
                            className="h-7 px-2 text-amber-400 hover:text-white"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : distanceMeters !== null ? (
                        isInsideGeofence ? (
                          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                                <MapPin className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-bold text-emerald-300">Inside Office Location</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => fetchGpsLocation()}
                              title="Refresh GPS"
                              className="h-8 px-2 text-emerald-400 hover:text-white"
                            >
                              <RefreshCw className={cn("w-3.5 h-3.5", locating && "animate-spin")} />
                            </Button>
                          </div>
                        ) : (
                          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                                <MapPinOff className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-bold text-rose-300">Outside Office Location</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => fetchGpsLocation()}
                              title="Refresh GPS"
                              className="h-8 px-2 text-rose-400 hover:text-white"
                            >
                              <RefreshCw className={cn("w-3.5 h-3.5", locating && "animate-spin")} />
                            </Button>
                          </div>
                        )
                      ) : null}
                    </div>
                  )}

                  {/* Big Punch Button */}
                  {!todayAttendance?.check_in_time ? (
                    shiftWindow.isEnded ? (
                      <div className="space-y-2">
                        <Button
                          disabled
                          className="w-full h-14 rounded-2xl bg-slate-800/80 text-amber-400 font-bold text-sm tracking-wide cursor-not-allowed border border-amber-500/20 shadow-none"
                        >
                          <Lock className="w-4 h-4 mr-2 text-amber-400" /> Shift Ended • Check In Closed
                        </Button>
                        <p className="text-xs text-amber-400/80 font-medium">
                          Your scheduled shift ({formatShiftRange(staffData.shift_start, staffData.shift_end)}) has ended for today. Check-in is not allowed after shift hours.
                        </p>
                      </div>
                    ) : shiftWindow.isTooEarly ? (
                      <div className="space-y-2">
                        <Button
                          disabled
                          className="w-full h-14 rounded-2xl bg-slate-800/80 text-blue-400 font-bold text-sm tracking-wide cursor-not-allowed border border-blue-500/20 shadow-none"
                        >
                          <Clock className="w-4 h-4 mr-2 text-blue-400" /> Shift Starts at {shiftWindow.startTimeStr}
                        </Button>
                        <p className="text-xs text-blue-400/80 font-medium">
                          Early check-in opens 30 minutes before your shift (at {shiftWindow.openTimeStr}).
                        </p>
                      </div>
                    ) : isGeofenceActive && !isInsideGeofence ? (
                      <Button
                        disabled
                        className="w-full h-14 rounded-2xl bg-slate-800/80 text-slate-400 font-bold text-sm tracking-wide cursor-not-allowed border border-slate-700/60 shadow-none"
                      >
                        <Lock className="w-4 h-4 mr-2 text-rose-400" /> Check In Locked (Outside Office)
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handlePunch('in')}
                        disabled={punching || (isGeofenceActive && locating)}
                        className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base tracking-wide shadow-xl shadow-emerald-950/50 transition-all"
                      >
                        <LogIn className="w-5 h-5 mr-2" /> Check In Now
                      </Button>
                    )
                  ) : !todayAttendance?.check_out_time ? (
                    <Button
                      onClick={() => handlePunch('out')}
                      disabled={punching}
                      className="w-full h-14 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-base tracking-wide shadow-xl shadow-rose-950/50 transition-all"
                    >
                      <LogOut className="w-5 h-5 mr-2" /> Check Out (End Shift)
                    </Button>
                  ) : (
                    <p className="text-xs text-slate-500 font-medium">
                      Your attendance for today is saved. Enjoy your rest!
                    </p>
                  )}
                </Card>
              </>
            ) : (
              /* TAB 2: MY HISTORY */
              <div className="space-y-4">
                {/* Month Navigator Header */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevMonth}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="font-bold text-sm text-white">
                    {new Date(historyYear, historyMonth - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleNextMonth}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Monthly Calendar View (Matching Reference Image) */}
                <Card className="rounded-3xl bg-slate-900/90 border-slate-800 shadow-xl p-4 text-center space-y-3">
                  {/* Weekday headers: Mo, Tu, We, Th, Fr, Sa, Su */}
                  <div className="grid grid-cols-7 gap-1 text-[11px] font-bold text-slate-400 border-b border-slate-800 pb-2">
                    {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                      <div key={day} className="py-0.5">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1.5 pt-1">
                    {calendarDays.map((item, idx) => {
                      if (!item.isCurrentMonth) {
                        return <div key={`empty-${idx}`} className="h-9 w-full" />;
                      }

                      const rec = recordsMap[item.dateStr];
                      const todayDateStr = new Date().toLocaleDateString('en-CA');
                      const isToday = item.dateStr === todayDateStr;
                      const isSelected = selectedDayRecord?.date === item.dateStr;

                      // Check if day is weekend
                      const dateObj = new Date(historyYear, historyMonth - 1, item.dayNumber);
                      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                      const weekendList = (historyWeekendDays || 'Friday')
                        .split(',')
                        .map((s: string) => s.trim().toLowerCase());
                      const isWeekend = weekendList.includes(dayName);
                      const isPast = item.dateStr < todayDateStr;

                      // Effective Status:
                      // - Weekend: NO MARK (plain number)
                      // - Has record: present (green), late (yellow), absent (red)
                      // - Past working day without record: absent (red)
                      // - Today without record: blue circle
                      // - Future day: plain number
                      const effectiveStatus = isWeekend
                        ? 'weekend'
                        : rec?.status
                        ? rec.status
                        : isPast
                        ? 'absent'
                        : null;

                      return (
                        <button
                          key={item.dateStr}
                          type="button"
                          onClick={() => {
                            if (rec) {
                              setSelectedDayRecord(rec);
                            } else if (isWeekend) {
                              setSelectedDayRecord({
                                date: item.dateStr,
                                status: 'weekend',
                                check_in_time: null,
                                check_out_time: null,
                                hours_worked: 0,
                                note: 'Weekend / Weekly Off (No shift scheduled)',
                              });
                            } else if (isPast) {
                              setSelectedDayRecord({
                                date: item.dateStr,
                                status: 'absent',
                                check_in_time: null,
                                check_out_time: null,
                                hours_worked: 0,
                                note: 'No attendance recorded (Absent)',
                              });
                            } else {
                              setSelectedDayRecord(null);
                            }
                          }}
                          className={cn(
                            "h-9 w-full rounded-full flex items-center justify-center relative transition-all text-xs font-semibold",
                            // Weekend day: strictly NO mark, clean neutral number
                            isWeekend
                              ? "text-slate-500 hover:text-slate-300 hover:bg-slate-800/40"
                              // Present (On Time): Green
                              : effectiveStatus === 'present'
                              ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                              // Late: Yellow / Amber
                              : effectiveStatus === 'late'
                              ? "border border-dashed border-amber-500/70 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                              // Absent: Red
                              : effectiveStatus === 'absent'
                              ? "border border-dashed border-rose-500/70 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                              // Today without checkin yet: Blue filled circle
                              : isToday
                              ? "bg-blue-600 text-white font-black shadow-md shadow-blue-600/40"
                              // Future day: plain number
                              : "text-slate-500 hover:bg-slate-800/60",
                            // If today has status, ring highlight
                            isToday && effectiveStatus && effectiveStatus !== 'weekend' && "ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900",
                            isSelected && !isToday && "ring-2 ring-blue-500"
                          )}
                        >
                          {isWeekend ? (
                            item.dayNumber
                          ) : effectiveStatus === 'present' ? (
                            <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                          ) : effectiveStatus === 'late' ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          ) : effectiveStatus === 'absent' ? (
                            <X className="w-3.5 h-3.5 text-rose-400 stroke-[2.5]" />
                          ) : isToday ? (
                            item.dayNumber
                          ) : (
                            item.dayNumber
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Date Detail Drawer */}
                  {selectedDayRecord && (
                    <div className="mt-3 p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-left space-y-1 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">
                          {new Date(selectedDayRecord.date + 'T00:00:00').toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'short',
                            weekday: 'short',
                          })}
                        </span>
                        <Badge
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5",
                            selectedDayRecord.status === 'present' && "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
                            selectedDayRecord.status === 'late' && "bg-amber-500/20 text-amber-300 border-amber-500/40",
                            selectedDayRecord.status === 'half_day' && "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
                            selectedDayRecord.status === 'absent' && "bg-rose-500/20 text-rose-300 border-rose-500/40",
                            selectedDayRecord.status === 'weekend' && "bg-slate-700/50 text-slate-300 border-slate-600/40"
                          )}
                        >
                          {selectedDayRecord.status === 'present'
                            ? 'On Time'
                            : selectedDayRecord.status === 'late'
                            ? 'Late'
                            : selectedDayRecord.status === 'half_day'
                            ? 'Half Day'
                            : selectedDayRecord.status === 'weekend'
                            ? 'Weekend'
                            : 'Absent'}
                        </Badge>
                      </div>

                      {selectedDayRecord.status === 'weekend' ? (
                        <p className="text-xs text-slate-400 pt-0.5">
                          Weekly Holiday / Off-Day
                        </p>
                      ) : selectedDayRecord.status === 'absent' ? (
                        <p className="text-xs text-rose-400/90 pt-0.5 font-medium">
                          No attendance recorded (Absent)
                        </p>
                      ) : (
                        <div className="flex items-center justify-between text-xs text-slate-300 pt-0.5">
                          <span>
                            In: <b className="text-white font-mono">{selectedDayRecord.check_in_time ? new Date(selectedDayRecord.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</b>
                            {' • '}
                            Out: <b className="text-white font-mono">{selectedDayRecord.check_out_time ? new Date(selectedDayRecord.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</b>
                          </span>
                          <span className="font-mono font-bold text-emerald-400">
                            {selectedDayRecord.check_out_time ? formatHoursHuman(selectedDayRecord.hours_worked, selectedDayRecord.check_in_time, selectedDayRecord.check_out_time) : 'On Shift'}
                          </span>
                        </div>
                      )}

                      {selectedDayRecord.late_reason && (
                        <p className="text-[11px] text-amber-400 font-medium">
                          {formatLateReason(selectedDayRecord.late_reason)}
                        </p>
                      )}
                    </div>
                  )}
                </Card>

                {/* "Your Attendance" Breakdown Card (Donut Chart) */}
                <Card className="rounded-3xl bg-slate-900/90 border-slate-800 shadow-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Your Attendance</h3>
                    <span className="text-xs text-blue-400 font-semibold">
                      {dynamicSummary.totalRecorded} days recorded
                    </span>
                  </div>

                  <div className="flex items-center gap-5">
                    {/* Conic Gradient Donut Ring */}
                    {(() => {
                      const present = dynamicSummary.presentCount;
                      const late = dynamicSummary.lateCount;
                      const absent = dynamicSummary.absentCount;
                      const total = present + late + absent;

                      const pPct = total > 0 ? (present / total) * 360 : 0;
                      const lPct = total > 0 ? (late / total) * 360 : 0;

                      const gradient =
                        total === 0
                          ? '#334155'
                          : `conic-gradient(#10b981 0deg ${pPct}deg, #f59e0b ${pPct}deg ${pPct + lPct}deg, #f43f5e ${pPct + lPct}deg 360deg)`;

                      return (
                        <div
                          className="w-24 h-24 rounded-full flex items-center justify-center shrink-0 shadow-lg"
                          style={{ background: gradient }}
                        >
                          <div className="w-16 h-16 rounded-full bg-slate-900 flex flex-col items-center justify-center text-center p-1">
                            <span className="text-[9px] uppercase font-bold text-slate-400">Worked</span>
                            <span className="text-sm font-black text-white">{dynamicSummary.totalWorked}d</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Breakdown legend */}
                    <div className="flex-1 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> On Time
                        </span>
                        <span className="font-bold text-white">{dynamicSummary.presentCount} days</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Late
                        </span>
                        <span className="font-bold text-amber-400">{dynamicSummary.lateCount} days</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Absent
                        </span>
                        <span className="font-bold text-rose-400">{dynamicSummary.absentCount} days</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Shift Logs for Current Month */}
                <div className="space-y-2 text-left">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block px-1">
                    Past Shift Logs
                  </span>

                  {historyRecords.length === 0 ? (
                    <Card className="rounded-2xl bg-slate-900/60 border-slate-800 p-4 text-center text-xs text-slate-500">
                      No past records for this month.
                    </Card>
                  ) : (
                    historyRecords.slice(0, 8).map((r: any) => (
                      <div
                        key={r.id}
                        className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">
                              {new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                r.status === 'present' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                                r.status === 'late' && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                                r.status === 'half_day' && "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
                                r.status === 'absent' && "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              )}
                            >
                              {r.status === 'present' ? 'On Time' : r.status === 'late' ? 'Late' : r.status === 'half_day' ? 'Half Day' : 'Absent'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 mt-0.5 block font-mono">
                            {r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            {' → '}
                            {r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-bold text-sm text-emerald-400 block">
                            {r.check_out_time ? formatHoursHuman(r.hours_worked, r.check_in_time, r.check_out_time) : 'On Shift'}
                          </span>
                          {r.late_reason && (
                            <span className="text-[10px] text-amber-400/90 font-medium block">
                              {formatLateReason(r.late_reason)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-3 text-[11px] text-slate-600">
        MenuSnap HRM &bull; Multi-Tenant Attendance System
      </div>
    </div>
  );
}

export default function StaffPunchMobilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center text-slate-400 text-sm">
          <Clock className="w-8 h-8 text-blue-500 animate-spin mb-3" />
          <p>Loading attendance portal...</p>
        </div>
      }
    >
      <StaffPunchContent />
    </Suspense>
  );
}
