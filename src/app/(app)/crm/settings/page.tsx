"use client";

import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Crown,
  Sparkles,
  Percent,
  DollarSign,
  Calendar,
  Save,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useClientAuth } from '@/hooks/use-client-auth';
import { getCrmSettingsAction, updateCrmSettingsAction } from '@/app/actions/crm';

export default function CrmSettingsPage() {
  const { clientUser } = useClientAuth();
  const { toast } = useToast();
  const businessId = clientUser?.id || clientUser?.businessName || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    silver_enabled: true,
    silver_min_spend: 3000,
    silver_discount: 5,
    gold_enabled: true,
    gold_min_spend: 7000,
    gold_discount: 10,
    platinum_enabled: true,
    platinum_min_spend: 15000,
    platinum_discount: 15,
    vip_enabled: true,
    vip_min_spend: 25000,
    vip_discount: 20,
    card_validity_months: 12,
    auto_issue_cards: false,
    card_custom_note: 'Present this card at billing to redeem your exclusive discount.',
  });

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    getCrmSettingsAction(businessId)
      .then((res) => {
        if (res.success && res.settings) {
          setForm({
            silver_enabled: res.settings.silver_enabled !== undefined ? Boolean(res.settings.silver_enabled) : true,
            silver_min_spend: Number(res.settings.silver_min_spend || 3000),
            silver_discount: Number(res.settings.silver_discount || 5),
            gold_enabled: res.settings.gold_enabled !== undefined ? Boolean(res.settings.gold_enabled) : true,
            gold_min_spend: Number(res.settings.gold_min_spend || 7000),
            gold_discount: Number(res.settings.gold_discount || 10),
            platinum_enabled: res.settings.platinum_enabled !== undefined ? Boolean(res.settings.platinum_enabled) : true,
            platinum_min_spend: Number(res.settings.platinum_min_spend || 15000),
            platinum_discount: Number(res.settings.platinum_discount || 15),
            vip_enabled: res.settings.vip_enabled !== undefined ? Boolean(res.settings.vip_enabled) : true,
            vip_min_spend: Number(res.settings.vip_min_spend || 25000),
            vip_discount: Number(res.settings.vip_discount || 20),
            card_validity_months: Number(res.settings.card_validity_months || 12),
            auto_issue_cards: Boolean(res.settings.auto_issue_cards),
            card_custom_note: res.settings.card_custom_note || '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, [businessId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await updateCrmSettingsAction(businessId, form);
      if (res.success) {
        toast({ title: 'Loyalty Rules Saved', description: res.message || 'Settings updated successfully.' });
      } else {
        toast({ title: 'Error', description: res.error || 'Failed to save settings', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Server error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-6 h-6 rounded-lg bg-slate-200/80 dark:bg-muted" />
            <Skeleton className="h-7 w-64 rounded-xl bg-slate-200/80 dark:bg-muted" />
          </div>
          <Skeleton className="h-4 w-96 max-w-full rounded-md bg-slate-100 dark:bg-muted/60" />
        </div>

        {/* 1. Tiers Skeleton Card */}
        <Card className="rounded-3xl border-slate-200/80 dark:border-border/60 bg-white dark:bg-card shadow-xs">
          <CardHeader className="pb-3 space-y-1.5">
            <Skeleton className="h-5 w-72 rounded-lg bg-slate-200/80 dark:bg-muted" />
            <Skeleton className="h-3.5 w-96 max-w-full rounded-md bg-slate-100 dark:bg-muted/60" />
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-4 rounded-2xl border border-slate-200/70 dark:border-border/60 bg-slate-50/50 dark:bg-muted/20 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-3.5 h-3.5 rounded-full bg-slate-200/80 dark:bg-muted" />
                    <Skeleton className="h-4 w-32 rounded-lg bg-slate-200/80 dark:bg-muted" />
                    <Skeleton className="h-4 w-16 rounded-full bg-slate-200/80 dark:bg-muted" />
                  </div>
                  <Skeleton className="h-5 w-12 rounded-full bg-slate-200/80 dark:bg-muted" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-28 rounded-md bg-slate-200/80 dark:bg-muted" />
                    <Skeleton className="h-10 w-full rounded-xl bg-slate-200/60 dark:bg-muted/50" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-24 rounded-md bg-slate-200/80 dark:bg-muted" />
                    <Skeleton className="h-10 w-full rounded-xl bg-slate-200/60 dark:bg-muted/50" />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 2. Validity & Automation Skeleton Card */}
        <Card className="rounded-3xl border-slate-200/80 dark:border-border/60 bg-white dark:bg-card shadow-xs">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-52 rounded-lg bg-slate-200/80 dark:bg-muted" />
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-36 rounded-md bg-slate-200/80 dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-xl bg-slate-200/60 dark:bg-muted/50" />
              </div>
              <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-border/40 bg-slate-50 dark:bg-muted/30 flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-36 rounded-md bg-slate-200/80 dark:bg-muted" />
                  <Skeleton className="h-2.5 w-48 rounded-md bg-slate-100 dark:bg-muted/60" />
                </div>
                <Skeleton className="h-5 w-10 rounded-full bg-slate-200/80 dark:bg-muted" />
              </div>
            </div>
            <div className="space-y-1.5 pt-1">
              <Skeleton className="h-3.5 w-60 rounded-md bg-slate-200/80 dark:bg-muted" />
              <Skeleton className="h-10 w-full rounded-xl bg-slate-200/60 dark:bg-muted/50" />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button Skeleton */}
        <div className="pt-2 pb-6 sm:pb-2 flex flex-col sm:flex-row justify-end gap-3">
          <Skeleton className="h-11 w-full sm:w-44 rounded-2xl bg-amber-500/30" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-foreground tracking-tight flex items-center gap-2">
          <SlidersHorizontal className="w-6 h-6 text-amber-500" />
          Loyalty &amp; Membership Rules
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure minimum spend thresholds, discount privileges, and validity policies for your customers.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Membership Tiers & Discount Matrix */}
        <Card className="rounded-3xl border-slate-200/80 dark:border-border/60 bg-white dark:bg-card shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              Tier Qualification Thresholds &amp; Discount Privileges
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Set the minimum order spend required for customers to unlock each tier and their respective discount rates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            {/* Silver Tier */}
            <div className={`p-4 rounded-2xl border space-y-3 transition-all ${
              form.silver_enabled 
                ? 'bg-slate-50/70 dark:bg-muted/30 border-slate-200/70 dark:border-border/60' 
                : 'bg-slate-100/40 dark:bg-muted/10 border-dashed border-slate-200 opacity-60'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-400 shadow-xs" />
                  <span className="font-bold text-xs text-slate-800 dark:text-foreground">
                    Silver Member Tier
                  </span>
                  {form.silver_enabled ? (
                    <Badge variant="outline" className="text-[10px] font-bold">Standard</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-300">Disabled</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500">
                    {form.silver_enabled ? 'Active' : 'Off'}
                  </span>
                  <Switch
                    checked={form.silver_enabled}
                    onCheckedChange={(val) => setForm((prev) => ({ ...prev, silver_enabled: val }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Min Spend Threshold (৳)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    disabled={!form.silver_enabled}
                    value={form.silver_min_spend}
                    onChange={(e) => setForm((prev) => ({ ...prev, silver_min_spend: Number(e.target.value) }))}
                    className="h-10 text-xs font-mono font-bold rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Discount Rate (%)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    disabled={!form.silver_enabled}
                    value={form.silver_discount}
                    onChange={(e) => setForm((prev) => ({ ...prev, silver_discount: Number(e.target.value) }))}
                    className="h-10 text-xs font-mono font-bold rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Gold Tier */}
            <div className={`p-4 rounded-2xl border space-y-3 transition-all ${
              form.gold_enabled 
                ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40' 
                : 'bg-amber-50/20 dark:bg-muted/10 border-dashed border-amber-200/40 opacity-60'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-bold text-xs text-amber-950 dark:text-amber-200">
                    Gold Member Tier
                  </span>
                  {form.gold_enabled ? (
                    <Badge className="bg-amber-500 text-white text-[10px] font-bold">Popular</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-300">Disabled</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-amber-900/70 dark:text-amber-300">
                    {form.gold_enabled ? 'Active' : 'Off'}
                  </span>
                  <Switch
                    checked={form.gold_enabled}
                    onCheckedChange={(val) => setForm((prev) => ({ ...prev, gold_enabled: val }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Min Spend Threshold (৳)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    disabled={!form.gold_enabled}
                    value={form.gold_min_spend}
                    onChange={(e) => setForm((prev) => ({ ...prev, gold_min_spend: Number(e.target.value) }))}
                    className="h-10 text-xs font-mono font-bold rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Discount Rate (%)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    disabled={!form.gold_enabled}
                    value={form.gold_discount}
                    onChange={(e) => setForm((prev) => ({ ...prev, gold_discount: Number(e.target.value) }))}
                    className="h-10 text-xs font-mono font-bold rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Platinum Tier */}
            <div className={`p-4 rounded-2xl border space-y-3 transition-all ${
              form.platinum_enabled 
                ? 'bg-cyan-50/40 dark:bg-cyan-950/20 border-cyan-200/60 dark:border-cyan-900/40' 
                : 'bg-cyan-50/15 dark:bg-muted/10 border-dashed border-cyan-200/40 opacity-60'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                  <span className="font-bold text-xs text-cyan-950 dark:text-cyan-200">
                    Platinum Member Tier
                  </span>
                  {form.platinum_enabled ? (
                    <Badge className="bg-cyan-700 text-white text-[10px] font-bold">Premium</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-300">Disabled</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-cyan-900/70 dark:text-cyan-300">
                    {form.platinum_enabled ? 'Active' : 'Off'}
                  </span>
                  <Switch
                    checked={form.platinum_enabled}
                    onCheckedChange={(val) => setForm((prev) => ({ ...prev, platinum_enabled: val }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Min Spend Threshold (৳)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    disabled={!form.platinum_enabled}
                    value={form.platinum_min_spend}
                    onChange={(e) => setForm((prev) => ({ ...prev, platinum_min_spend: Number(e.target.value) }))}
                    className="h-10 text-xs font-mono font-bold rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Discount Rate (%)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    disabled={!form.platinum_enabled}
                    value={form.platinum_discount}
                    onChange={(e) => setForm((prev) => ({ ...prev, platinum_discount: Number(e.target.value) }))}
                    className="h-10 text-xs font-mono font-bold rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* VIP Tier */}
            <div className={`p-4 rounded-2xl border space-y-3 transition-all ${
              form.vip_enabled 
                ? 'bg-purple-50/40 dark:bg-purple-950/20 border-purple-200/60 dark:border-purple-900/40' 
                : 'bg-purple-50/15 dark:bg-muted/10 border-dashed border-purple-200/40 opacity-60'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span className="font-bold text-xs text-purple-950 dark:text-purple-200">
                    VIP Obsidian Tier
                  </span>
                  {form.vip_enabled ? (
                    <Badge className="bg-purple-900 text-purple-100 text-[10px] font-bold">VIP Elite</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-300">Disabled</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-purple-900/70 dark:text-purple-300">
                    {form.vip_enabled ? 'Active' : 'Off'}
                  </span>
                  <Switch
                    checked={form.vip_enabled}
                    onCheckedChange={(val) => setForm((prev) => ({ ...prev, vip_enabled: val }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Min Spend Threshold (৳)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    disabled={!form.vip_enabled}
                    value={form.vip_min_spend}
                    onChange={(e) => setForm((prev) => ({ ...prev, vip_min_spend: Number(e.target.value) }))}
                    className="h-10 text-xs font-mono font-bold rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Discount Rate (%)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    disabled={!form.vip_enabled}
                    value={form.vip_discount}
                    onChange={(e) => setForm((prev) => ({ ...prev, vip_discount: Number(e.target.value) }))}
                    className="h-10 text-xs font-mono font-bold rounded-xl"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Card Validity & Policy */}
        <Card className="rounded-3xl border-slate-200/80 dark:border-border/60 bg-white dark:bg-card shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              Card Validity &amp; Automation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-foreground">
                  Default Card Validity Duration
                </Label>
                <Select
                  value={String(form.card_validity_months)}
                  onValueChange={(val) => setForm((prev) => ({ ...prev, card_validity_months: Number(val) }))}
                >
                  <SelectTrigger className="h-10 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="6" className="text-xs">6 Months</SelectItem>
                    <SelectItem value="12" className="text-xs">1 Year (Standard)</SelectItem>
                    <SelectItem value="24" className="text-xs">2 Years</SelectItem>
                    <SelectItem value="0" className="text-xs">Lifetime Validity (Never Expires)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-muted/30 border border-slate-100 dark:border-border/40">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-foreground block">
                    Automatic Tier Promotion
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Auto-upgrade customer when spend threshold is met
                  </span>
                </div>
                <Switch
                  checked={form.auto_issue_cards}
                  onCheckedChange={(val) => setForm((prev) => ({ ...prev, auto_issue_cards: val }))}
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-foreground">
                Card Redemption Message (Shown on WhatsApp &amp; Card)
              </Label>
              <Input
                type="text"
                value={form.card_custom_note}
                onChange={(e) => setForm((prev) => ({ ...prev, card_custom_note: e.target.value }))}
                placeholder="Present this card at billing to redeem your exclusive discount."
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="pt-2 pb-6 sm:pb-2 flex flex-col sm:flex-row justify-end gap-3">
          <Button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs h-11 px-8 shadow-sm transition-transform active:scale-98"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Saving Rules...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                Save Loyalty Policy
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
