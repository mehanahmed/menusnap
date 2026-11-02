"use client";

import type { ReactNode } from 'react';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Mail, Facebook, Tag, X, Calendar, Eye, EyeOff, RefreshCw, Bot, Check, Sparkles } from 'lucide-react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMetaPixelSettings, saveMetaPixelSettings, type MetaPixelSettings } from '@/app/actions/meta-events';
import { getGtmSettings, saveGtmSettings, type GtmSettings } from '@/app/actions/gtm-settings';
import { getGeminiSettings, saveGeminiSettings, testGeminiConnection } from '@/app/actions/gemini-settings';
import { AVAILABLE_GEMINI_MODELS } from '@/lib/gemini-models';
import {
  getBookingSlotsAction,
  addBookingSlotAction,
  deleteBookingSlotAction,
  clearAllBookingSlotsAction,
  generateBookingSlotsAction,
  resetBookingSlotsToDefaultAction
} from '@/app/actions/bookings';

const emailFormSchema = z.object({
  newEmail: z.string().email("Invalid email address."),
  currentPassword: z.string().min(1, "Current password is required."),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

const metaPixelFormSchema = z.object({
  isEnabled: z.boolean(),
  pixelId: z.string().optional(),
  accessToken: z.string().optional(),
  testEventCode: z.string().optional(),
});

const gtmFormSchema = z.object({
  isEnabled: z.boolean(),
  gtmId: z.string().optional(),
});

type EmailFormValues = z.infer<typeof emailFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;
type MetaPixelFormValues = z.infer<typeof metaPixelFormSchema>;
type GtmFormValues = z.infer<typeof gtmFormSchema>;

function ChangeEmailForm(): ReactNode {
  const { adminUser, updateAdminEmail } = useAdminAuth();
  const { toast } = useToast();
  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      newEmail: "",
      currentPassword: "",
    }
  });
  
  const { isSubmitting } = form.formState;

  async function onSubmit(data: EmailFormValues) {
    try {
      await updateAdminEmail(data.newEmail, data.currentPassword);
      form.reset();
      toast({
        title: "Email Updated",
        description: "Your email address has been updated successfully.",
        variant: "success",
      });
    } catch (error) {
    }
  }

  return (
    <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden p-6">
      <CardHeader className="p-0 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">Admin Email</CardTitle>
            <CardDescription className="text-xs text-slate-500">Update primary admin contact email</CardDescription>
          </div>
        </div>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="p-0 space-y-4">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">Current Email</Label>
            <div className="px-3.5 py-2.5 bg-slate-50/70 rounded-xl border border-slate-200 text-slate-600 font-medium text-xs select-none">
              {adminUser?.email || 'Loading...'}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="newEmail" className="text-xs font-semibold text-slate-700">New Email Address</Label>
            <Input id="newEmail" type="email" {...form.register("newEmail")} placeholder="name@domain.com" className="h-10 rounded-xl border-slate-200 bg-slate-50/40 text-xs focus:bg-white focus:border-slate-400 focus:ring-0" />
            {form.formState.errors.newEmail && <p className="text-[11px] text-destructive font-medium mt-0.5">{form.formState.errors.newEmail.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="currentPasswordEmail" className="text-xs font-semibold text-slate-700">Confirm Password</Label>
            <Input id="currentPasswordEmail" type="password" {...form.register("currentPassword")} placeholder="••••••••" className="h-10 rounded-xl border-slate-200 bg-slate-50/40 text-xs focus:bg-white focus:border-slate-400 focus:ring-0" />
            {form.formState.errors.currentPassword && <p className="text-[11px] text-destructive font-medium mt-0.5">{form.formState.errors.currentPassword.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="p-0 pt-5">
          <Button type="submit" disabled={isSubmitting} className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors">
            {isSubmitting ? "Updating..." : "Update Email"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function ChangePasswordForm(): ReactNode {
  const { updateAdminPassword } = useAdminAuth();
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(data: PasswordFormValues) {
    try {
      await updateAdminPassword(data.newPassword, data.currentPassword);
      form.reset();
    } catch (error) {
    }
  }

  return (
    <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden p-6">
      <CardHeader className="p-0 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">Security</CardTitle>
            <CardDescription className="text-xs text-slate-500">Change account password</CardDescription>
          </div>
        </div>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="p-0 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="currentPasswordPass" className="text-xs font-semibold text-slate-700">Current Password</Label>
            <Input id="currentPasswordPass" type="password" {...form.register("currentPassword")} placeholder="••••••••" className="h-10 rounded-xl border-slate-200 bg-slate-50/40 text-xs focus:bg-white focus:border-slate-400 focus:ring-0" />
            {form.formState.errors.currentPassword && <p className="text-[11px] text-destructive font-medium mt-0.5">{form.formState.errors.currentPassword.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="newPassword" className="text-xs font-semibold text-slate-700">New Password</Label>
            <Input id="newPassword" type="password" {...form.register("newPassword")} placeholder="Minimum 6 characters" className="h-10 rounded-xl border-slate-200 bg-slate-50/40 text-xs focus:bg-white focus:border-slate-400 focus:ring-0" />
            {form.formState.errors.newPassword && <p className="text-[11px] text-destructive font-medium mt-0.5">{form.formState.errors.newPassword.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700">Confirm Password</Label>
            <Input id="confirmPassword" type="password" {...form.register("confirmPassword")} placeholder="Repeat new password" className="h-10 rounded-xl border-slate-200 bg-slate-50/40 text-xs focus:bg-white focus:border-slate-400 focus:ring-0" />
            {form.formState.errors.confirmPassword && <p className="text-[11px] text-destructive font-medium mt-0.5">{form.formState.errors.confirmPassword.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="p-0 pt-5">
          <Button type="submit" disabled={isSubmitting} className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors">
            {isSubmitting ? "Saving..." : "Update Password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}




function GeminiSettingsForm(): ReactNode {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("googleai/gemini-2.5-flash");
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelName, setCustomModelName] = useState("");
  const [maskedKey, setMaskedKey] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getGeminiSettings();
        setApiKey(data.apiKey || "");
        setModel(data.model || "googleai/gemini-2.5-flash");
        setIsCustomModel(Boolean(data.isCustomModel));
        setCustomModelName(data.customModelName || "");
        setMaskedKey(data.maskedKey || "");
        setIsConfigured(data.isConfigured);
      } catch (err) {
        console.error("Failed to load Gemini settings:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setTestResult(null);
    try {
      const res = await saveGeminiSettings({
        apiKey,
        model: isCustomModel ? customModelName : model,
        isCustomModel,
        customModelName,
      });

      if (res.success) {
        toast({
          title: "Settings Saved",
          description: "Google Gemini API key and model updated successfully.",
          variant: "success",
        });
        const updated = await getGeminiSettings();
        setMaskedKey(updated.maskedKey);
        setIsConfigured(updated.isConfigured);
      } else {
        toast({
          title: "Error",
          description: res.error || "Failed to save settings.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const effectiveModel = isCustomModel ? customModelName : model;
      const res = await testGeminiConnection(apiKey, effectiveModel);
      if (res.success) {
        setTestResult({
          success: true,
          message: `Connected successfully! Response latency: ${res.latencyMs}ms.`,
        });
        toast({
          title: "Connection Succeeded",
          description: `Google Gemini responded in ${res.latencyMs}ms.`,
          variant: "success",
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || "Connection failed. Please verify your API key.",
        });
        toast({
          title: "Connection Failed",
          description: res.error || "Invalid API key or network error.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Test failed unexpectedly.",
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden p-6">
      <CardHeader className="p-0 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">Google Gemini AI</CardTitle>
              <CardDescription className="text-xs text-slate-500">API key & model for menu scanning & eBook studio</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isConfigured ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                Not Set
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <form onSubmit={handleSave}>
        <CardContent className="p-0 space-y-4">
          {/* API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="geminiApiKey" className="text-xs font-semibold text-slate-700">Gemini API Key</Label>
              {maskedKey && !showKey && (
                <span className="text-[10px] text-slate-400 font-mono">Current: {maskedKey}</span>
              )}
            </div>
            <div className="relative">
              <Input
                id="geminiApiKey"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy... or paste your Gemini API key"
                className="h-10 pr-10 rounded-xl border-slate-200 bg-slate-50/40 text-xs font-mono focus:bg-white focus:border-slate-400 focus:ring-0"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                title={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 font-normal">
              Obtain an API key from{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-purple-600 hover:underline font-medium"
              >
                Google AI Studio
              </a>
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="geminiModel" className="text-xs font-semibold text-slate-700">AI Model</Label>
            <select
              id="geminiModel"
              value={isCustomModel ? "custom" : model}
              onChange={(e) => {
                if (e.target.value === "custom") {
                  setIsCustomModel(true);
                } else {
                  setIsCustomModel(false);
                  setModel(e.target.value);
                }
              }}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/40 text-xs font-medium text-slate-800 focus:bg-white focus:border-slate-400 focus:ring-0 cursor-pointer"
            >
              {AVAILABLE_GEMINI_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} ({m.description})
                </option>
              ))}
              <option value="custom">Custom Model Name...</option>
            </select>
          </div>

          {/* Custom Model Input if selected */}
          {isCustomModel && (
            <div className="space-y-1.5 pl-3 border-l-2 border-purple-300">
              <Label htmlFor="customModelName" className="text-xs font-semibold text-slate-700">Custom Model Identifier</Label>
              <Input
                id="customModelName"
                type="text"
                value={customModelName}
                onChange={(e) => setCustomModelName(e.target.value)}
                placeholder="e.g. googleai/gemini-2.0-flash-exp"
                className="h-9 rounded-xl border-slate-200 bg-slate-50/40 text-xs font-mono focus:bg-white focus:border-slate-400 focus:ring-0"
              />
              <p className="text-[10px] text-slate-400">Enter full provider prefix if needed, e.g. googleai/gemini-2.0-flash</p>
            </div>
          )}

          {/* Test connection output message */}
          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                testResult.success
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {testResult.success ? (
                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <X className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{testResult.message}</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="p-0 pt-5 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={testing || !apiKey}
            className="flex-1 h-10 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
          >
            {testing ? "Testing..." : "Test Connection"}
          </Button>

          <Button
            type="submit"
            disabled={saving || loading}
            className="flex-1 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition-colors"
          >
            {saving ? "Saving..." : "Save Gemini Settings"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function GtmSettingsForm(): ReactNode {
  const { toast } = useToast();
  const form = useForm<GtmFormValues>({
    resolver: zodResolver(gtmFormSchema),
    defaultValues: {
      isEnabled: true,
      gtmId: "",
    },
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getGtmSettings();
        form.reset(settings);
      } catch (error: any) {
        console.error("Failed to load GTM settings", error);
      }
    }
    loadSettings();
  }, [form]);

  const { isSubmitting } = form.formState;

  async function onSubmit(data: GtmFormValues) {
    try {
      await saveGtmSettings(data);
      toast({
        title: "Success",
        description: "Google Tag Manager settings saved.",
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update GTM settings.",
        variant: "destructive",
      });
    }
  }

  return (
    <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden p-6">
      <CardHeader className="p-0 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Tag className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">Google Tag Manager</CardTitle>
              <CardDescription className="text-xs text-slate-500">Global script & tracking code</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="gtmIsEnabled"
              checked={form.watch("isEnabled")}
              onCheckedChange={(checked) => form.setValue("isEnabled", checked)}
              className="data-[state=checked]:bg-slate-900"
            />
            <Label htmlFor="gtmIsEnabled" className="text-xs font-medium text-slate-600 cursor-pointer">
              {form.watch("isEnabled") ? "Active" : "Disabled"}
            </Label>
          </div>
        </div>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="p-0 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="gtmId" className="text-xs font-semibold text-slate-700">Container ID</Label>
            <Input id="gtmId" {...form.register("gtmId")} placeholder="GTM-XXXXXXX" className="h-10 rounded-xl border-slate-200 bg-slate-50/40 text-xs font-mono focus:bg-white focus:border-slate-400 focus:ring-0" />
            <p className="text-[11px] text-slate-400 font-normal">Format: GTM-XXXXXXX</p>
          </div>
        </CardContent>
        <CardFooter className="p-0 pt-5">
          <Button type="submit" disabled={isSubmitting} className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors">
            {isSubmitting ? "Saving..." : "Save GTM Settings"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function MetaPixelSettingsForm(): ReactNode {
  const { toast } = useToast();
  const form = useForm<MetaPixelFormValues>({
    resolver: zodResolver(metaPixelFormSchema),
    defaultValues: {
      isEnabled: false,
      pixelId: "",
      accessToken: "",
      testEventCode: "",
    },
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getMetaPixelSettings();
        form.reset(settings);
      } catch (error: any) {
      }
    }
    loadSettings();
  }, [form]);

  const { isSubmitting } = form.formState;

  async function onSubmit(data: MetaPixelFormValues) {
    try {
      await saveMetaPixelSettings(data);
      toast({
        title: "Success",
        description: "Meta Pixel settings updated.",
        variant: "success",
      });
    } catch (error: any) {
    }
  }

  return (
    <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden p-6">
      <CardHeader className="p-0 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Facebook className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">Meta Pixel & Conversions</CardTitle>
              <CardDescription className="text-xs text-slate-500">Facebook Pixel & API integration</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="isEnabled"
              checked={form.watch("isEnabled")}
              onCheckedChange={(checked) => form.setValue("isEnabled", checked)}
              className="data-[state=checked]:bg-slate-900"
            />
            <Label htmlFor="isEnabled" className="text-xs font-medium text-slate-600 cursor-pointer">
              {form.watch("isEnabled") ? "Active" : "Disabled"}
            </Label>
          </div>
        </div>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="p-0 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="pixelId" className="text-xs font-semibold text-slate-700">Pixel ID</Label>
              <Input id="pixelId" {...form.register("pixelId")} placeholder="00000000000000" className="h-10 rounded-xl border-slate-200 bg-slate-50/40 text-xs focus:bg-white focus:border-slate-400 focus:ring-0" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="testEventCode" className="text-xs font-semibold text-slate-700">Test Event Code</Label>
              <Input id="testEventCode" {...form.register("testEventCode")} placeholder="TEST00000" className="h-10 rounded-xl border-slate-200 bg-slate-50/40 text-xs focus:bg-white focus:border-slate-400 focus:ring-0" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="accessToken" className="text-xs font-semibold text-slate-700">Access Token</Label>
            <Input id="accessToken" type="password" {...form.register("accessToken")} placeholder="EAAb..." className="h-10 rounded-xl border-slate-200 bg-slate-50/40 text-xs font-mono focus:bg-white focus:border-slate-400 focus:ring-0" />
            <p className="text-[11px] text-slate-400 font-normal">Encrypted for secure API calls</p>
          </div>
        </CardContent>
        <CardFooter className="p-0 pt-5">
          <Button type="submit" disabled={isSubmitting} className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors">
            {isSubmitting ? "Saving..." : "Save Meta Settings"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

const TIME_OPTIONS = (() => {
  const options = [];
  const periods = ["AM", "PM"];
  for (const period of periods) {
    options.push(`12:00 ${period}`);
    options.push(`12:30 ${period}`);
    for (let hour = 1; hour <= 11; hour++) {
      const paddedHour = hour.toString().padStart(2, "0");
      options.push(`${paddedHour}:00 ${period}`);
      options.push(`${paddedHour}:30 ${period}`);
    }
  }
  return options;
})();

const timeToMinutes = (timeStr: string): number => {
  const match = timeStr.match(/^(\d{2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let hour = parseInt(match[1]);
  const minute = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
};

function BookingSlotsSettingsForm(): ReactNode {
  const { toast } = useToast();
  const [slots, setSlots] = useState<{ id: number; time_slot: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newSlot, setNewSlot] = useState("");

  const [startTime, setStartTime] = useState("09:00 AM");
  const [endTime, setEndTime] = useState("09:00 PM");
  const [interval, setIntervalVal] = useState(30);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    if (startMinutes >= endMinutes) {
      const firstValidOption = TIME_OPTIONS.find((opt) => timeToMinutes(opt) > startMinutes);
      if (firstValidOption) {
        setEndTime(firstValidOption);
      }
    }
  }, [startTime, endTime]);

  const filteredEndTimeOptions = TIME_OPTIONS.filter((opt) => {
    return timeToMinutes(opt) > timeToMinutes(startTime);
  });

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const res = await getBookingSlotsAction();
      if (res.success && res.data) {
        setSlots(res.data);
      } else {
        toast({ title: "Error", description: res.error || "Failed to load slots.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to connect to server.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlot) return;

    setAdding(true);
    try {
      const res = await addBookingSlotAction(newSlot);
      if (res.success) {
        toast({ title: "Success", description: `Slot ${newSlot} added.`, variant: "success" });
        setNewSlot("");
        fetchSlots();
      } else {
        toast({ title: "Error", description: res.error || "Failed to add slot.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "An error occurred.", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSlot = async (id: number, time_slot: string) => {
    try {
      const res = await deleteBookingSlotAction(id);
      if (res.success) {
        toast({ title: "Deleted", description: `Slot ${time_slot} removed.`, variant: "success" });
        setSlots((prev) => prev.filter((s) => s.id !== id));
      } else {
        toast({ title: "Error", description: res.error || "Failed to delete slot.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "An error occurred.", variant: "destructive" });
    }
  };

  const handleGenerateSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await generateBookingSlotsAction(startTime, endTime, interval);
      if (res.success) {
        toast({ title: "Success", description: `Generated ${res.count} slots.`, variant: "success" });
        fetchSlots();
      } else {
        toast({ title: "Error", description: res.error || "Failed to generate slots.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "An error occurred.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to delete all booking slots?")) return;
    try {
      const res = await clearAllBookingSlotsAction();
      if (res.success) {
        toast({ title: "Success", description: "All slots cleared.", variant: "success" });
        setSlots([]);
      } else {
        toast({ title: "Error", description: res.error || "Failed to clear slots.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "An error occurred.", variant: "destructive" });
    }
  };

  const handleResetToDefault = async () => {
    if (!confirm("Reset slots to default (09:30 AM to 04:00 PM)?")) return;
    try {
      const res = await resetBookingSlotsToDefaultAction();
      if (res.success) {
        toast({ title: "Success", description: "Slots reset to default.", variant: "success" });
        fetchSlots();
      } else {
        toast({ title: "Error", description: res.error || "Failed to reset slots.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "An error occurred.", variant: "destructive" });
    }
  };

  return (
    <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden p-6">
      <CardHeader className="p-0 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">Consultation Slots</CardTitle>
              <CardDescription className="text-xs text-slate-500">Available time slots for booking</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetToDefault}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg px-2.5 h-8 text-xs font-medium"
            >
              Reset
            </Button>
            {slots.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg px-2.5 h-8 text-xs font-medium"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-700">Active Slots ({slots.length})</Label>
          </div>
          <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200/80 min-h-[72px] flex flex-wrap gap-1.5 items-center">
            {loading ? (
              <p className="text-slate-400 text-xs font-medium mx-auto">Loading slots...</p>
            ) : slots.length === 0 ? (
              <p className="text-slate-400 text-xs font-medium mx-auto">No slots configured.</p>
            ) : (
              <AnimatePresence>
                {slots.map((slot) => (
                  <motion.div
                    key={slot.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-medium text-xs shadow-2xs"
                  >
                    <span>{slot.time_slot}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSlot(slot.id, slot.time_slot)}
                      className="text-slate-400 hover:text-red-500 rounded p-0.5 transition-colors"
                      title="Remove Slot"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        <form onSubmit={handleAddSlot} className="space-y-1.5">
          <Label htmlFor="newSlot" className="text-xs font-semibold text-slate-700">Add Slot</Label>
          <div className="flex gap-2">
            <select
              id="newSlot"
              value={newSlot}
              onChange={(e) => setNewSlot(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/40 text-xs font-medium text-slate-800 focus:bg-white focus:border-slate-400 focus:ring-0"
            >
              <option value="">Select time...</option>
              {TIME_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <Button
              type="submit"
              disabled={adding || !newSlot}
              className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shrink-0"
            >
              Add
            </Button>
          </div>
        </form>

        <hr className="border-slate-100" />

        <div className="space-y-3">
          <div>
            <Label className="text-xs font-semibold text-slate-700">Batch Generate</Label>
            <p className="text-[11px] text-slate-400">Generate multiple slots automatically by time range.</p>
          </div>

          <form onSubmit={handleGenerateSlots} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="startTime" className="text-[11px] font-medium text-slate-500">Start Time</Label>
                <select
                  id="startTime"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50/40 text-xs font-medium text-slate-800 focus:bg-white focus:border-slate-400 focus:ring-0"
                >
                  {TIME_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="endTime" className="text-[11px] font-medium text-slate-500">End Time</Label>
                <select
                  id="endTime"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50/40 text-xs font-medium text-slate-800 focus:bg-white focus:border-slate-400 focus:ring-0"
                >
                  {filteredEndTimeOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="interval" className="text-[11px] font-medium text-slate-500">Interval</Label>
                <select
                  id="interval"
                  value={interval}
                  onChange={(e) => setIntervalVal(parseInt(e.target.value))}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50/40 text-xs font-medium text-slate-800 focus:bg-white focus:border-slate-400 focus:ring-0"
                >
                  <option value={15}>15 Mins</option>
                  <option value={30}>30 Mins</option>
                  <option value={45}>45 Mins</option>
                  <option value={60}>1 Hour</option>
                  <option value={120}>2 Hours</option>
                </select>
              </div>
            </div>
            <Button
              type="submit"
              disabled={generating}
              variant="outline"
              className="w-full h-9 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium"
            >
              {generating ? "Generating..." : "Generate Slots"}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminSettingsPage(): ReactNode {
  const { adminLoading } = useAdminAuth();

  if (adminLoading) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] w-full text-slate-900 selection:bg-slate-200 p-6 sm:p-8 md:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-8 w-full"
        >
          {/* Header */}
          <div className="border-b border-slate-200/80 pb-5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage integrations, consultation availability, and security preferences.
            </p>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            <div className="space-y-6">
              <GeminiSettingsForm />
              <GtmSettingsForm />
              <MetaPixelSettingsForm />
              <BookingSlotsSettingsForm />
            </div>

            <div className="space-y-6">
              <ChangeEmailForm />
              <ChangePasswordForm />
            </div>
          </div>
        </motion.div>
    </div>
  );
}
