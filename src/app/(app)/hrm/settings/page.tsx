"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  SlidersHorizontal,
  MapPin,
  ClipboardPaste,
  Navigation,
  ExternalLink,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { getHrmOverviewAction, updateHrmSettingsAction } from '@/app/actions/hrm';
import { type HrmSettings, formatTime12h } from '@/lib/hrm-constants';

export default function HrmShiftPolicySettingsPage() {
  const { clientUser } = useClientAuth();
  const { toast } = useToast();

  const businessId = clientUser?.id || clientUser?.businessName || '';

  const [loading, setLoading] = useState(true);
  const [settingsSubmitting, setSettingsSubmitting] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);

  const [settingsForm, setSettingsForm] = useState<HrmSettings>({
    restaurant_id: String(businessId),
    shift_start: '09:00',
    shift_end: '18:00',
    grace_period_minutes: 15,
    half_day_hours: 4.0,
    weekend_days: 'Friday',
    allow_self_punch: true,
    latitude: null,
    longitude: null,
    radius_meters: 100,
    enforce_geofence: false,
  });

  // Load current settings from overview action
  useEffect(() => {
    if (businessId) {
      getHrmOverviewAction(businessId, new Date().toLocaleDateString('en-CA')).then((res) => {
        if (res.success && res.settings) {
          setSettingsForm(res.settings);
        }
        setLoading(false);
      });
    }
  }, [businessId]);

  // GPS Geolocation Handler
  const handleDetectCurrentLocation = () => {
    if (typeof window === 'undefined') return;
    if (!('geolocation' in navigator)) {
      toast({
        title: 'GPS Not Supported',
        description: 'Your browser or device does not support geolocation.',
        variant: 'destructive',
      });
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetectingGps(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setSettingsForm((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
        toast({
          title: 'Location Captured',
          description: `Coordinates: ${lat}, ${lng}`,
        });
      },
      (err) => {
        setDetectingGps(false);
        toast({
          title: 'Location Failed',
          description: err.message || 'Could not acquire GPS coordinates.',
          variant: 'destructive',
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Paste from Google Maps button
  const handlePasteCoordinates = async () => {
    try {
      if (typeof window === 'undefined' || !navigator.clipboard) {
        toast({ title: 'Clipboard Unavailable', description: 'Please paste manually into the Latitude box.', variant: 'destructive' });
        return;
      }
      const text = await navigator.clipboard.readText();
      const match = text.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
      if (match) {
        const lat = Number(parseFloat(match[1]).toFixed(6));
        const lng = Number(parseFloat(match[2]).toFixed(6));
        setSettingsForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
        toast({
          title: 'Coordinates Pasted!',
          description: `Latitude: ${lat}, Longitude: ${lng}`,
        });
      } else {
        toast({
          title: 'No Coordinates Found',
          description: 'Copy coordinates like "23.810331, 90.412521" from Google Maps first.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Clipboard Access Blocked',
        description: 'You can paste directly into the Latitude field.',
        variant: 'destructive',
      });
    }
  };

  // Coordinate text input parser
  const handleCoordinateInput = (val: string, field: 'latitude' | 'longitude') => {
    const match = val.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (match) {
      const lat = Number(parseFloat(match[1]).toFixed(6));
      const lng = Number(parseFloat(match[2]).toFixed(6));
      setSettingsForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
      toast({
        title: 'Coordinates Extracted',
        description: `Latitude: ${lat}, Longitude: ${lng}`,
      });
      return;
    }
    const clean = val.replace(/[^0-9.-]/g, '');
    const num = clean === '' ? null : Number(clean);
    setSettingsForm((prev) => ({
      ...prev,
      [field]: clean === '' ? null : (isNaN(num as any) ? prev[field] : num),
    }));
  };

  const handleCoordinatePasteEvent = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    const match = text.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (match) {
      e.preventDefault();
      const lat = Number(parseFloat(match[1]).toFixed(6));
      const lng = Number(parseFloat(match[2]).toFixed(6));
      setSettingsForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
      toast({
        title: 'Coordinates Pasted',
        description: `Latitude: ${lat}, Longitude: ${lng}`,
      });
    }
  };

  // Submit Shift Policy
  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSettingsSubmitting(true);
      const res = await updateHrmSettingsAction(businessId, settingsForm);
      if (res.success) {
        toast({ title: 'Shift Policy Saved', description: 'Shift rules & geofencing updated successfully.' });
        if (typeof window !== 'undefined') {
          try {
            const bc = new BroadcastChannel('menubldr_hrm_sync');
            bc.postMessage({ type: 'settings_updated', timestamp: Date.now() });
            bc.close();
          } catch {}
          try {
            localStorage.setItem('menubldr_hrm_punch_sync', String(Date.now()));
          } catch {}
        }
      } else {
        toast({ title: 'Error', description: res.error || 'Failed to update settings', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Server error', variant: 'destructive' });
    } finally {
      setSettingsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <Card className="max-w-2xl mx-auto rounded-3xl border-slate-200/90 dark:border-border/60 shadow-sm bg-white dark:bg-card">
        <CardHeader className="p-6 border-b border-slate-100 dark:border-border/60">
          <CardTitle className="text-lg font-black text-slate-900 dark:text-foreground">Shift Timings &amp; Attendance Policy</CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-muted-foreground">
            Configure your business default shift timings, grace periods for late detection, and half-day rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <form onSubmit={handleSettingsSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-foreground">Default Shift Start</Label>
                <Input
                  type="time"
                  value={settingsForm.shift_start}
                  onChange={(e) => setSettingsForm({ ...settingsForm, shift_start: e.target.value })}
                  required
                  className="mt-1.5 rounded-xl border-slate-300 dark:border-border"
                />
                <span className="text-[11px] font-semibold text-primary block mt-1">
                  Arrival: {formatTime12h(settingsForm.shift_start)}
                  {settingsForm.shift_start === '00:00' ? ' (Midnight)' : settingsForm.shift_start === '12:00' ? ' (Noon / Midday)' : ''}
                </span>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-foreground">Default Shift End</Label>
                <Input
                  type="time"
                  value={settingsForm.shift_end}
                  onChange={(e) => setSettingsForm({ ...settingsForm, shift_end: e.target.value })}
                  required
                  className="mt-1.5 rounded-xl border-slate-300 dark:border-border"
                />
                <span className="text-[11px] font-semibold text-primary block mt-1">
                  Departure: {formatTime12h(settingsForm.shift_end)}
                  {settingsForm.shift_end === '00:00' ? ' (Midnight)' : settingsForm.shift_end === '12:00' ? ' (Noon / Midday)' : ''}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-foreground">Late Grace Period (Minutes)</Label>
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={settingsForm.grace_period_minutes}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, grace_period_minutes: Number(e.target.value) })
                  }
                  required
                  className="mt-1.5 rounded-xl border-slate-300 dark:border-border"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  Check-in within this period is considered &quot;On Time&quot;
                </span>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-foreground">Minimum Hours for Half Day</Label>
                <Input
                  type="number"
                  step="0.5"
                  min={1}
                  max={12}
                  value={settingsForm.half_day_hours}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, half_day_hours: Number(e.target.value) })
                  }
                  required
                  className="mt-1.5 rounded-xl border-slate-300 dark:border-border"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  Shifts below this count as Half-Day
                </span>
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-foreground">Weekly Off Day / Weekend</Label>
              <Select
                value={settingsForm.weekend_days}
                onValueChange={(v) => setSettingsForm({ ...settingsForm, weekend_days: v })}
              >
                <SelectTrigger className="mt-1.5 rounded-xl border-slate-300 dark:border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Friday">Friday (Standard Bangladesh)</SelectItem>
                  <SelectItem value="Sunday">Sunday</SelectItem>
                  <SelectItem value="Saturday,Friday">Friday &amp; Saturday (Two Days)</SelectItem>
                  <SelectItem value="None">None (7 Days Open)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* GPS Geofence Check-in Restriction */}
            <div className="pt-4 border-t border-slate-100 dark:border-border/60 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-slate-800 dark:text-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    Enforce GPS Geofence Check-In
                  </Label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Require staff to be physically present inside restaurant/parlour premises to Check In.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'text-[11px] font-bold px-2 py-0.5 rounded-full border transition-colors',
                      settingsForm.enforce_geofence
                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                        : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-muted'
                    )}
                  >
                    {settingsForm.enforce_geofence ? 'Active' : 'Off'}
                  </span>
                  <Switch
                    checked={Boolean(settingsForm.enforce_geofence)}
                    onCheckedChange={(checked) =>
                      setSettingsForm({ ...settingsForm, enforce_geofence: checked })
                    }
                  />
                </div>
              </div>

              {Boolean(settingsForm.enforce_geofence) && (
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-muted/30 border border-slate-200/80 dark:border-border space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-foreground">Business Premises Coordinates</span>
                      <p className="text-[11px] text-slate-500">Latitude & Longitude of your store or salon</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handlePasteCoordinates}
                        className="h-8 text-xs font-semibold text-slate-700 dark:text-foreground hover:text-slate-900 border-slate-300 dark:border-border bg-white dark:bg-card hover:bg-slate-100 w-fit shadow-xs transition-colors"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
                        Paste from Google Maps
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDetectCurrentLocation}
                        disabled={detectingGps}
                        className="h-8 text-xs font-semibold text-blue-600 hover:text-blue-700 border-blue-200 bg-white dark:bg-card hover:bg-blue-50 w-fit shadow-xs transition-colors"
                      >
                        <Navigation className={cn("w-3.5 h-3.5 mr-1.5", detectingGps && "animate-spin")} />
                        {detectingGps ? 'Detecting GPS...' : 'Set to My Current Location'}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Latitude</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 23.810331"
                        value={settingsForm.latitude ?? ''}
                        onChange={(e) => handleCoordinateInput(e.target.value, 'latitude')}
                        onPaste={handleCoordinatePasteEvent}
                        className="mt-1 h-9 rounded-xl border-slate-300 dark:border-border text-xs font-mono"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Longitude</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 90.412521"
                        value={settingsForm.longitude ?? ''}
                        onChange={(e) => handleCoordinateInput(e.target.value, 'longitude')}
                        onPaste={handleCoordinatePasteEvent}
                        className="mt-1 h-9 rounded-xl border-slate-300 dark:border-border text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Map verification & quick Google Maps guide */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-border/60 text-[11px]">
                    <span className="text-slate-500">
                      Tip: Copy coordinates from Google Maps and click <strong className="text-slate-700 dark:text-foreground">Paste from Google Maps</strong> or paste into either box.
                    </span>
                    {settingsForm.latitude && settingsForm.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${settingsForm.latitude},${settingsForm.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 underline transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Verify Location on Google Maps
                      </a>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        Allowed Radius:{' '}
                        <span className="font-bold text-blue-600">
                          {settingsForm.radius_meters ?? 100} meters{' '}
                          <span className="font-normal text-slate-500 text-[10px]">
                            (~{Math.round((settingsForm.radius_meters ?? 100) * 3.28084).toLocaleString()} ft)
                          </span>
                        </span>
                      </Label>
                      <span className="text-[10px] text-slate-400">Default: 100m (~328 ft)</span>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: '50m (~164 ft) - Store Area', value: 50 },
                        { label: '100m (~328 ft) - Standard', value: 100 },
                        { label: '200m (~656 ft) - Building', value: 200 },
                        { label: '500m (~1,640 ft) - Compound', value: 500 },
                      ].map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setSettingsForm({ ...settingsForm, radius_meters: preset.value })}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors',
                            (settingsForm.radius_meters ?? 100) === preset.value
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white dark:bg-card text-slate-600 dark:text-slate-300 border-slate-200 dark:border-border hover:bg-slate-100'
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <Input
                      type="number"
                      min={20}
                      max={5000}
                      step={10}
                      placeholder="e.g. 100"
                      value={settingsForm.radius_meters ?? 100}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          radius_meters: Number(e.target.value),
                        })
                      }
                      className="mt-1 h-9 rounded-xl border-slate-300 dark:border-border text-xs font-mono"
                    />
                    <span className="text-[11px] text-slate-500 block">
                      Staff mobile check-in will strictly lock if they are further than this distance from your premises ({settingsForm.radius_meters ?? 100}m / ~{Math.round((settingsForm.radius_meters ?? 100) * 3.28084).toLocaleString()} ft).
                    </span>
                  </div>

                  {/* Map Preview & Google Maps Helper */}
                  {settingsForm.latitude && settingsForm.longitude ? (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-border bg-white dark:bg-card mt-2">
                      <iframe
                        title="Business Location Preview"
                        width="100%"
                        height="160"
                        className="border-0 w-full"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(settingsForm.longitude) - 0.002}%2C${Number(settingsForm.latitude) - 0.002}%2C${Number(settingsForm.longitude) + 0.002}%2C${Number(settingsForm.latitude) + 0.002}&layer=mapnik&marker=${settingsForm.latitude}%2C${settingsForm.longitude}`}
                      />
                      <div className="p-2.5 bg-slate-50 dark:bg-muted/40 border-t border-slate-200 dark:border-border flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px]">
                        <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1 font-mono">
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                          {settingsForm.latitude}, {settingsForm.longitude} &bull; {settingsForm.radius_meters ?? 100}m radius
                        </span>
                        <a
                          href={`https://www.google.com/maps?q=${settingsForm.latitude},${settingsForm.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 hover:underline w-fit"
                        >
                          <ExternalLink className="w-3 h-3" /> View on Google Maps
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
                      <span className="font-bold text-blue-900 dark:text-blue-200 block">How to set your location:</span>
                      <p>&bull; <strong>Option 1 (Fastest):</strong> While present inside your store, tap <em>&quot;Set to My Current Location&quot;</em> above.</p>
                      <p>&bull; <strong>Option 2 (PC / Laptop):</strong> Open Google Maps, right-click on your restaurant, click on the coordinates to copy, and click <em>&quot;Paste from Google Maps&quot;</em>.</p>
                      <p>&bull; <strong>Option 3 (Mobile Phone):</strong> Open Google Maps app, long-press (tap &amp; hold) on your restaurant to drop a red pin, tap the coordinates in the top search bar to copy, and click <em>&quot;Paste from Google Maps&quot;</em>.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-border/60 flex justify-end">
              <Button
                type="submit"
                disabled={settingsSubmitting}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 shadow-xs"
              >
                {settingsSubmitting ? 'Saving...' : 'Save Shift Policy'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
