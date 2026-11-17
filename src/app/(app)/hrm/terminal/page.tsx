"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Fingerprint,
  Phone,
  KeyRound,
  LogIn,
  LogOut,
  CheckCircle2,
  Copy,
  Monitor,
  Smartphone,
  Check,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { useClientAuth } from '@/hooks/use-client-auth';
import { cn } from '@/lib/utils';
import { staffPunchAction, getStaffRosterAction } from '@/app/actions/hrm';
import { LiveClockDisplay } from '@/components/hrm/LiveClockDisplay';
import { sanitizeBdPhone } from '@/lib/accounts/helpers';

export default function HrmPunchTerminalPage() {
  const { clientUser } = useClientAuth();
  const { toast } = useToast();

  const businessId = clientUser?.id || clientUser?.businessName || '';

  const [roster, setRoster] = useState<any[]>([]);
  const [terminalMode, setTerminalMode] = useState<'phone' | 'select'>('phone');
  const [terminalPhone, setTerminalPhone] = useState('');
  const [terminalStaffId, setTerminalStaffId] = useState<string>('');
  const [terminalPin, setTerminalPin] = useState('');
  const [terminalPunching, setTerminalPunching] = useState(false);
  const [terminalSuccessBanner, setTerminalSuccessBanner] = useState<string | null>(null);

  // Load roster
  useEffect(() => {
    if (businessId) {
      getStaffRosterAction(businessId).then((res) => {
        if (res.success && res.staff) {
          setRoster(res.staff);
        }
      });
    }
  }, [businessId]);

  // Broadcast sync to other tabs
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

  // Handle Terminal Punch
  const handleTerminalPunch = async (actionType: 'in' | 'out') => {
    let payload: any = {
      restaurantId: businessId,
      actionType,
      pinCode: terminalPin || undefined,
    };

    if (terminalMode === 'phone') {
      const cleanPhone = sanitizeBdPhone(terminalPhone);
      if (!cleanPhone || cleanPhone.length < 11) {
        toast({
          title: 'Enter Phone',
          description: 'Please enter your complete 11-digit mobile number.',
          variant: 'destructive',
        });
        return;
      }
      payload.phone = cleanPhone;
    } else {
      if (!terminalStaffId) {
        toast({ title: 'Select Staff', description: 'Please select your name first.', variant: 'destructive' });
        return;
      }
      payload.staffId = Number(terminalStaffId);
    }

    try {
      setTerminalPunching(true);
      setTerminalSuccessBanner(null);
      const res = await staffPunchAction(payload);

      if (res.success) {
        setTerminalSuccessBanner(res.message || 'Punch processed successfully!');
        setTerminalPin('');
        if (terminalMode === 'phone') setTerminalPhone('');
        toast({
          title: actionType === 'in' ? 'Checked In' : 'Checked Out',
          description: res.message,
        });
        broadcastPunchSync();
        setTimeout(() => setTerminalSuccessBanner(null), 4000);
      } else {
        toast({
          title: 'Punch Failed',
          description: res.error || 'Invalid PIN or already processed.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Server error', variant: 'destructive' });
    } finally {
      setTerminalPunching(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="max-w-xl mx-auto bg-white dark:bg-card p-6 sm:p-8 rounded-3xl border border-slate-200/90 dark:border-border/60 shadow-lg text-center space-y-6">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-blue-600 mb-1">
          <Fingerprint className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-foreground tracking-tight">Staff Attendance Terminal</h1>
          <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1 font-medium">
            Select your name or enter mobile number, type your 6-digit PIN, and Check In or Out.
          </p>
        </div>

        {/* Big Live Clock */}
        <div className="py-3 px-6 rounded-2xl bg-slate-50 dark:bg-muted/40 border border-slate-100 dark:border-border inline-block font-mono font-black text-3xl sm:text-4xl text-slate-900 dark:text-foreground tracking-tight shadow-inner">
          <LiveClockDisplay />
        </div>

        {/* Success Banner */}
        {terminalSuccessBanner && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            {terminalSuccessBanner}
          </div>
        )}

        {/* Mode Switcher */}
        <div className="bg-slate-100 dark:bg-muted p-1 rounded-2xl flex items-center justify-center gap-1 max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => setTerminalMode('phone')}
            className={cn(
              'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all',
              terminalMode === 'phone'
                ? 'bg-white dark:bg-card text-slate-900 dark:text-foreground shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-foreground'
            )}
          >
            Mobile &amp; PIN
          </button>
          <button
            type="button"
            onClick={() => setTerminalMode('select')}
            className={cn(
              'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all',
              terminalMode === 'select'
                ? 'bg-white dark:bg-card text-slate-900 dark:text-foreground shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-foreground'
            )}
          >
            Select Name
          </button>
        </div>

        {/* Form Inputs */}
        <div className="space-y-4 text-left">
          {terminalMode === 'phone' ? (
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-foreground">Mobile Phone Number</Label>
                <span className={`text-[10px] font-mono font-bold ${terminalPhone.length === 11 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  {terminalPhone.length}/11
                </span>
              </div>
              <div className="mt-1.5 flex rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden h-11 transition-all">
                <span className="inline-flex items-center px-3.5 bg-muted/60 text-foreground font-mono font-bold text-sm border-r border-input select-none">
                  +88
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="01XXXXXXXXX"
                  value={terminalPhone}
                  onChange={(e) => setTerminalPhone(sanitizeBdPhone(e.target.value))}
                  maxLength={11}
                  className="flex-1 bg-transparent px-3 text-base outline-none font-mono font-bold tracking-wider text-foreground placeholder:text-muted-foreground/50 h-full"
                />
              </div>
            </div>
          ) : (
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-foreground">Select Employee</Label>
              <Select value={terminalStaffId} onValueChange={(v) => setTerminalStaffId(v)}>
                <SelectTrigger className="w-full mt-1.5 h-11 rounded-xl border-slate-300 dark:border-border text-sm font-medium">
                  <SelectValue placeholder="Choose your name..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {roster.map((st) => (
                    <SelectItem key={st.id} value={String(st.id)}>
                      {st.name} ({st.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-foreground">Enter 6-Digit Security PIN</Label>
            <div className="relative mt-1.5">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="password"
                maxLength={6}
                placeholder="••••••"
                value={terminalPin}
                onChange={(e) => setTerminalPin(e.target.value)}
                className="pl-10 h-11 rounded-xl border-slate-300 dark:border-border text-center font-mono tracking-widest text-lg font-bold"
              />
            </div>
          </div>
        </div>

        {/* Check In / Check Out Action Buttons */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <Button
            type="button"
            size="lg"
            disabled={
              terminalPunching ||
              (terminalMode === 'phone' ? terminalPhone.length < 11 : !terminalStaffId) ||
              terminalPin.length < 6
            }
            onClick={() => handleTerminalPunch('in')}
            className="h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm sm:text-base shadow-md hover:shadow-lg transition-all disabled:opacity-40"
          >
            <LogIn className="w-5 h-5 mr-2" /> Check In
          </Button>

          <Button
            type="button"
            size="lg"
            disabled={
              terminalPunching ||
              (terminalMode === 'phone' ? terminalPhone.length < 11 : !terminalStaffId) ||
              terminalPin.length < 6
            }
            onClick={() => handleTerminalPunch('out')}
            className="h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm sm:text-base shadow-md hover:shadow-lg transition-all disabled:opacity-40"
          >
            <LogOut className="w-5 h-5 mr-2" /> Check Out
          </Button>
        </div>

        {/* Direct Staff Mobile Link Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-muted/40 border border-slate-200 dark:border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-left">
          <div>
            <span className="font-bold text-slate-800 dark:text-foreground block">Your Store Mobile Attendance Link:</span>
            <span className="font-mono text-slate-500 text-[11px] block mt-0.5 break-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/hrm/punch?b=${businessId}` : `/hrm/punch?b=${businessId}`}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (typeof window !== 'undefined') {
                navigator.clipboard.writeText(`${window.location.origin}/hrm/punch?b=${businessId}`);
                toast({ title: 'Link Copied!', description: 'Share this link with your staff via WhatsApp or QR code.' });
              }
            }}
            className="h-8 rounded-xl border-slate-300 dark:border-border bg-white dark:bg-card hover:bg-slate-100 dark:hover:bg-muted text-xs font-semibold text-slate-700 dark:text-foreground shrink-0 w-fit shadow-xs transition-colors"
          >
            <Copy className="w-3.5 h-3.5 mr-1 text-blue-600" /> Copy WhatsApp Link
          </Button>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs">
          <Link
            href="/hrm/kiosk"
            className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-bold"
          >
            <Monitor className="w-3.5 h-3.5" />
            Fullscreen Counter Kiosk
          </Link>
          <span className="text-slate-300 hidden sm:inline">&bull;</span>
          <Link
            href="/hrm/punch"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-emerald-600 hover:underline font-bold"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Staff Mobile Punch Portal (/hrm/punch)
          </Link>
        </div>
      </div>
    </div>
  );
}
