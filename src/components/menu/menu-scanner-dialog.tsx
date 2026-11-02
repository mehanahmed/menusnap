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
  Camera,
  X,
  Loader2,
  AlertCircle
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

  // Initialize business type from logged-in clientUser silently
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
      setErrorMessage(`You only have ${remainingScans} menu scan(s) remaining in your package, but selected ${selectedFiles.length} photo(s). Please select fewer photos or upgrade your package.`);
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
      console.error("Menu scan failed:", err);
      setErrorMessage(err.message || "Something went wrong while processing the menu.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-xl w-[95vw] p-5 sm:p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Import from Menu Photo
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Upload photos of your menu or price list to automatically extract all dishes, categories, and prices.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Quota warning only if normal client has exhausted scans */}
          {isQuotaExhausted && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Menu Scan Limit Reached</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                    Your plan quota is exhausted ({aiLimit} images). Upgrade your package to scan more menus.
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
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-7 text-center transition-all duration-200 cursor-pointer ${
              isScanning || isQuotaExhausted
                ? 'opacity-50 pointer-events-none bg-muted/20 border-border cursor-not-allowed'
                : 'border-orange-200 hover:border-orange-400 bg-orange-50/20 hover:bg-orange-50/50 dark:border-slate-800 dark:hover:border-orange-500/70 dark:bg-slate-900/30'
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
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400 flex items-center justify-center shadow-xs">
                <Camera className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Click to upload or drag & drop menu photos
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
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
                    className="relative group rounded-xl overflow-hidden border border-border aspect-square bg-muted shadow-xs"
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
                    <span className="absolute bottom-1 left-1 bg-black/60 text-[9px] text-white px-1.5 py-0.5 rounded font-mono">
                      #{index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Draft Title Input */}
          <div className="space-y-1.5 pt-1">
            <Label htmlFor="draft-name-input" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Draft Title <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="draft-name-input"
              placeholder="e.g. Main Dining Menu, Lunch Menu, Beverage List"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              disabled={isScanning}
              className="h-10 text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 focus:bg-white focus:border-orange-500"
            />
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
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200/60 dark:border-orange-800/50 text-orange-900 dark:text-orange-200">
              <Loader2 className="w-5 h-5 animate-spin shrink-0 text-orange-600 dark:text-orange-400" />
              <div className="text-xs space-y-0.5">
                <p className="font-semibold">Analyzing your menu photos...</p>
                <p className="text-muted-foreground text-[11px]">
                  Extracting dishes, section categories, and pricing directly into your draft.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDialogClose(false)}
            disabled={isScanning}
            className="text-xs h-10 px-4 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartScan}
            disabled={isScanning || isQuotaExhausted || selectedFiles.length === 0}
            size="sm"
            className="text-xs h-10 px-5 font-semibold gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition-colors"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scanning menu photos...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                Scan & Create Draft
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
