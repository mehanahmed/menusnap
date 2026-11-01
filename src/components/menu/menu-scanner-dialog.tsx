"use client";

import React, { useState, useRef, useId } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Sparkles,
  Camera,
  Image as ImageIcon,
  X,
  Loader2,
  AlertCircle,
  Utensils,
  CheckCircle2,
  FileCheck
} from "lucide-react";
import { scanMenuImageAction } from "@/app/actions/scan-menu";
import { useToast } from "@/hooks/use-toast";
import { useClientAuth } from "@/hooks/use-client-auth";

const DRAFTS_STORAGE_KEY = 'menuBuilderDrafts';

interface MenuScannerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDraftCreated: (draft: any) => void;
}

export function MenuScannerDialog({
  isOpen,
  onOpenChange,
  onDraftCreated
}: MenuScannerDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [draftName, setDraftName] = useState('');
  const [businessType, setBusinessType] = useState<'restaurant' | 'parlour'>('restaurant');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { clientUser, packageLimits, isAdmin, refreshSubscription } = useClientAuth();

  const isUnlimited = isAdmin || (packageLimits?.isAiScanUnlimited ?? false);
  const aiLimit = packageLimits?.aiScanLimit ?? 0;
  const aiUsed = packageLimits?.aiScansUsed ?? 0;
  const remainingScans = isUnlimited ? Infinity : Math.max(0, aiLimit - aiUsed);
  const isQuotaExhausted = !isUnlimited && remainingScans <= 0;
  const { toast } = useToast();
  const uniqueInputId = useId();

  // Refresh subscription limits when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      refreshSubscription();
    }
  }, [isOpen, refreshSubscription]);

  // Initialize business type from logged-in clientUser
  React.useEffect(() => {
    if (clientUser?.type === 'parlour') {
      setBusinessType('parlour');
    }
  }, [clientUser]);

  const handleFilesSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

    Array.from(files).forEach(file => {
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Unsupported file type",
          description: `"${file.name}" is not a supported image file. Use JPG, PNG, or WEBP.`,
          variant: "destructive"
        });
        return;
      }

      if (file.size > 15 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `"${file.name}" exceeds 15MB limit.`,
          variant: "destructive"
        });
        return;
      }

      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });

    setSelectedFiles(prev => [...prev, ...newFiles].slice(0, 5));
    setFilePreviews(prev => [...prev, ...newPreviews].slice(0, 5));
  };

  const handleRemoveFile = (index: number) => {
    if (filePreviews[index]) {
      URL.revokeObjectURL(filePreviews[index]);
    }
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    filePreviews.forEach(url => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setFilePreviews([]);
    setDraftName('');
    setErrorMessage(null);
    setIsScanning(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDialogClose = (open: boolean) => {
    if (!isScanning) {
      if (!open) handleReset();
      onOpenChange(open);
    }
  };

  const handleStartScan = async () => {
    if (selectedFiles.length === 0) {
      setErrorMessage("Please select at least one menu photo to scan.");
      return;
    }

    if (!isUnlimited && selectedFiles.length > remainingScans) {
      setErrorMessage(`You only have ${remainingScans} AI image scan(s) remaining in your package, but selected ${selectedFiles.length} photo(s). Please select fewer photos or upgrade your package.`);
      return;
    }

    setIsScanning(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('images', file);
      });

      formData.append('draftName', draftName.trim());
      formData.append('businessType', businessType);
      formData.append('businessName', clientUser?.businessName || '');
      formData.append('whatsappNumber', clientUser?.whatsappNumber || '');
      formData.append('email', clientUser?.email || '');
      if (clientUser?.id) {
        formData.append('clientId', String(clientUser.id));
      }

      const result = await scanMenuImageAction(formData);

      if (!result.success || !result.draft) {
        throw new Error(result.error || "Failed to scan menu image.");
      }

      const createdDraft = result.draft;

      // Save to localStorage for the user
      try {
        const stored = localStorage.getItem(DRAFTS_STORAGE_KEY);
        const drafts = stored ? JSON.parse(stored) : [];
        drafts.unshift(createdDraft);
        localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
      } catch (storageErr) {
        console.error("Failed to write new draft to local storage:", storageErr);
      }

      toast({
        title: "Menu Scanned Successfully!",
        description: `Extracted ${result.itemsCount} dishes & items into a new draft.`,
      });

      await refreshSubscription();

      onDraftCreated(createdDraft);
      handleDialogClose(false);
    } catch (err: any) {
      console.error("AI Menu scan failed:", err);
      setErrorMessage(err.message || "Something went wrong while processing the menu.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-xl w-[95vw] p-5 sm:p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                Import from Menu Photo
                <Badge variant="secondary" className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 font-semibold border-none">
                  Gemini AI
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Upload photos of your old paper menu or price list. AI will automatically extract all dishes, categories, and prices.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* AI Scan Quota Banner */}
          {isAdmin ? (
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Admin Mode: Unlimited AI Menu Scans</span>
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px] font-bold border-none">Unlimited</Badge>
            </div>
          ) : isUnlimited ? (
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs">
              <div className="flex items-center gap-2 text-purple-800 dark:text-purple-300 font-semibold">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Package: Unlimited AI Menu Scans</span>
              </div>
              <Badge className="bg-purple-600 text-white text-[10px] font-bold border-none">Unlimited</Badge>
            </div>
          ) : (
            <div className={`flex items-center justify-between px-3.5 py-2 rounded-xl border text-xs ${
              isQuotaExhausted
                ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
                : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
            }`}>
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className={`w-4 h-4 ${isQuotaExhausted ? "text-rose-600" : "text-orange-500"}`} />
                <span>AI Menu Scan Quota:</span>
              </div>
              <div className="flex items-center gap-2 font-mono font-bold">
                <span className="text-[11px] opacity-75">{aiUsed} / {aiLimit} used</span>
                <Badge className={`text-[10px] font-bold border-none ${
                  isQuotaExhausted ? "bg-rose-600 text-white" : "bg-orange-500 text-white"
                }`}>
                  {remainingScans} {remainingScans === 1 ? 'image' : 'images'} left
                </Badge>
              </div>
            </div>
          )}

          {/* Quota Exhausted Warning */}
          {isQuotaExhausted && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">AI Menu Scan Limit Reached</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                    Your plan quota is exhausted ({aiLimit} images). Upgrade your package in the Packages section to process more menus.
                  </p>
                </div>
              </div>
              <Button asChild size="sm" className="h-8 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white shrink-0">
                <Link href="/#pricing">Upgrade Plan</Link>
              </Button>
            </div>
          )}

          {/* Upload Dropzone */}
          <div
            onClick={() => !isScanning && !isQuotaExhausted && fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!isScanning) handleFilesSelect(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
              isScanning || isQuotaExhausted
                ? 'opacity-50 pointer-events-none bg-muted/20 border-border cursor-not-allowed'
                : 'hover:border-primary/50 hover:bg-primary/5 bg-card/60 border-border/70'
            }`}
          >
            <input
              id={uniqueInputId}
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/jpg"
              multiple
              className="hidden"
              onChange={(e) => handleFilesSelect(e.target.files)}
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                <Camera className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Click to upload or drag & drop menu photos
              </p>
              <p className="text-xs text-muted-foreground">
                Supports JPG, PNG, WEBP (up to 5 photos)
              </p>
            </div>
          </div>

          {/* Image Previews */}
          {filePreviews.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">Selected Images ({filePreviews.length}/5)</span>
                {!isScanning && (
                  <button
                    onClick={handleReset}
                    type="button"
                    className="text-destructive hover:underline text-[11px]"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {filePreviews.map((preview, index) => (
                  <div
                    key={index}
                    className="relative group rounded-lg overflow-hidden border border-border aspect-square bg-muted"
                  >
                    <Image
                      src={preview}
                      alt={`Menu preview ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {!isScanning && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="absolute top-1 right-1 bg-black/70 hover:bg-destructive text-white rounded-full p-1 transition-colors shadow-sm"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <span className="absolute bottom-1 left-1 bg-black/60 text-[9px] text-white px-1.5 py-0.2 rounded font-mono">
                      #{index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Form Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="draft-name-input" className="text-xs font-semibold">
                Draft Title <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                id="draft-name-input"
                placeholder="e.g. Main Dining Menu"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                disabled={isScanning}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Menu Type</Label>
              <div className="flex rounded-lg border border-border p-1 bg-muted/40 h-9 items-center">
                <button
                  type="button"
                  onClick={() => setBusinessType('restaurant')}
                  disabled={isScanning}
                  className={`flex-1 text-xs font-medium py-1 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    businessType === 'restaurant'
                      ? 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Utensils className="w-3 h-3" />
                  Restaurant
                </button>
                <button
                  type="button"
                  onClick={() => setBusinessType('parlour')}
                  disabled={isScanning}
                  className={`flex-1 text-xs font-medium py-1 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    businessType === 'parlour'
                      ? 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  Parlour
                </button>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Unable to scan menu</p>
                <p className="mt-0.5 opacity-90">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Scanning Progress Banner */}
          {isScanning && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Loader2 className="w-5 h-5 animate-spin shrink-0 text-primary" />
              <div className="text-xs space-y-0.5">
                <p className="font-semibold">Gemini AI is analyzing your menu...</p>
                <p className="text-muted-foreground text-[11px]">
                  Extracting dishes, section categories, and pricing directly into your draft.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDialogClose(false)}
            disabled={isScanning}
            className="text-xs h-9"
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartScan}
            disabled={isScanning || isQuotaExhausted || selectedFiles.length === 0}
            size="sm"
            className="text-xs h-9 font-semibold gap-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-md"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Scanning with Gemini...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Scan & Create Draft
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
