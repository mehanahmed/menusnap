'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { 
  UploadCloud, 
  Trash2, 
  RefreshCw, 
  Sparkles, 
  Check, 
  ImageIcon, 
  Sun, 
  Moon,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { 
  CUSTOM_THEME_SHADES, 
  type CustomThemeConfig, 
  type CustomShadeId,
  type CustomThemeShadeOption 
} from './menu-sheet-themes';
import { uploadFileLocally } from '@/app/actions/uploads';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CustomDesignControlsProps {
  customConfig: CustomThemeConfig | null;
  onUpdateConfig: (newConfig: CustomThemeConfig) => void;
  onDeleteBackground: () => void;
  className?: string;
}

export function CustomDesignControls({
  customConfig,
  onUpdateConfig,
  onDeleteBackground,
  className,
}: CustomDesignControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const hasBgImage = Boolean(customConfig?.bgImageUrl);
  const activeShadeId: CustomShadeId = customConfig?.shadeId || 'charcoal';
  const activeShade = CUSTOM_THEME_SHADES.find((s) => s.id === activeShadeId) || CUSTOM_THEME_SHADES[0];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload a valid image file (PNG, JPG, WebP).',
        variant: 'destructive',
      });
      return;
    }

    // Size limit: 15MB
    if (file.size > 15 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Image size should be under 15MB.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await uploadFileLocally(formData, 'custom-themes', {
        maxWidth: 2000,
        maxHeight: 3000,
        quality: 85,
      });

      const uploadedUrl = res.data?.url;
      if (res.success && uploadedUrl) {
        const updated: CustomThemeConfig = {
          bgImageUrl: uploadedUrl,
          shadeId: activeShadeId,
          updatedAt: new Date().toISOString(),
        };
        onUpdateConfig(updated);
        toast({
          title: 'Background Uploaded',
          description: 'Your custom menu background is now active.',
        });
      } else {
        toast({
          title: 'Upload Failed',
          description: res.message || 'Could not upload background image.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      console.error('Custom background upload error:', err);
      toast({
        title: 'Upload Error',
        description: err.message || 'Failed to upload image.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleShadeSelect = (shadeId: CustomShadeId) => {
    const updated: CustomThemeConfig = {
      bgImageUrl: customConfig?.bgImageUrl || null,
      shadeId,
      updatedAt: new Date().toISOString(),
    };
    onUpdateConfig(updated);
  };

  const lightBgShades = CUSTOM_THEME_SHADES.filter((s) => s.group === 'light-bg');
  const darkBgShades = CUSTOM_THEME_SHADES.filter((s) => s.group === 'dark-bg');

  return (
    <div className={cn('w-full space-y-3', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* State A: No background image uploaded yet */}
      {!hasBgImage ? (
        <div className="bg-card border-2 border-dashed border-primary/30 rounded-2xl p-5 sm:p-7 text-center shadow-xs transition-all">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
              {isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1">
              <h4 className="text-sm sm:text-base font-bold text-foreground flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" /> Upload Custom Menu Background
              </h4>
              <p className="text-xs text-muted-foreground">
                Upload your flyer or background image (PNG, JPG, WebP). Your menu items and logo will be placed on top of it.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="gap-2 text-xs font-semibold px-5 py-2 h-9 rounded-xl shadow-xs"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading & Optimizing...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4" /> Choose Background Image
                  </>
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground/80">
              Tip: Standard portrait image (A4 or 1:1.5 ratio) fits best.
            </p>
          </div>
        </div>
      ) : (
        /* State B: Background image active - Control Bar & Shade Selector */
        <div className="bg-card/95 backdrop-blur border border-border rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
            {/* Active Image Indicator */}
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-10 rounded-md overflow-hidden border border-border/80 shadow-xs shrink-0 bg-muted">
                {customConfig?.bgImageUrl && (
                  <Image
                    src={customConfig.bgImageUrl}
                    alt="Custom Background"
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-green-500" /> Custom Background Active
                </p>
                <p className="text-[11px] text-muted-foreground">1 Custom Design saved</p>
              </div>
            </div>

            {/* Action buttons: Replace or Remove */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="h-8 gap-1.5 text-xs font-semibold rounded-lg flex-1 sm:flex-initial"
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-primary" />
                )}
                Replace Image
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDeleteBackground}
                className="h-8 gap-1.5 text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg flex-1 sm:flex-initial"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Image
              </Button>
            </div>
          </div>

          {/* Typography Shade Picker */}
          <div className="space-y-2">
            {/* Mobile View: Compact Dropdown (< md) */}
            <div className="md:hidden flex items-center justify-between gap-2.5 bg-muted/50 p-2 rounded-xl border border-border/70">
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-border"
                  style={{ backgroundColor: activeShade.swatch }}
                />
                <span className="text-xs font-bold text-foreground">Text Shade:</span>
              </div>

              <div className="relative flex-1 min-w-0">
                <select
                  value={activeShadeId}
                  onChange={(e) => handleShadeSelect(e.target.value as CustomShadeId)}
                  className="w-full h-8 text-xs font-semibold rounded-lg bg-card border border-border text-foreground px-2.5 pr-7 focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer shadow-xs truncate"
                >
                  <optgroup label="For Light Backgrounds (Dark Text)">
                    {lightBgShades.map((shade) => (
                      <option key={shade.id} value={shade.id}>
                        {shade.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="For Dark Backgrounds (Light Text)">
                    {darkBgShades.map((shade) => (
                      <option key={shade.id} value={shade.id}>
                        {shade.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Desktop View: Full Swatch Grid (md and up) */}
            <div className="hidden md:block space-y-2">
              <div className="flex flex-row items-center justify-between gap-1">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  Content Text Color & Shade
                </p>
                <span className="text-[11px] text-muted-foreground">
                  Match text with your background lightness
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Group 1: For Light Backgrounds (Dark text) */}
                <div className="bg-muted/40 p-2 sm:p-2.5 rounded-xl border border-border/50 space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-500" /> For Light Background Images
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {lightBgShades.map((shade) => {
                      const isSelected = activeShadeId === shade.id;
                      return (
                        <button
                          key={shade.id}
                          type="button"
                          onClick={() => handleShadeSelect(shade.id)}
                          className={cn(
                            'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-left border',
                            isSelected
                              ? 'bg-background text-foreground font-bold border-primary shadow-xs ring-1 ring-primary/30'
                              : 'border-transparent hover:bg-background/60 text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-xs border border-black/10"
                            style={{ backgroundColor: shade.swatch }}
                          />
                          <span className="truncate">{shade.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Group 2: For Dark Backgrounds (Light text) */}
                <div className="bg-muted/40 p-2 sm:p-2.5 rounded-xl border border-border/50 space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Moon className="w-3 h-3 text-indigo-400" /> For Dark Background Images
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {darkBgShades.map((shade) => {
                      const isSelected = activeShadeId === shade.id;
                      return (
                        <button
                          key={shade.id}
                          type="button"
                          onClick={() => handleShadeSelect(shade.id)}
                          className={cn(
                            'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-left border',
                            isSelected
                              ? 'bg-background text-foreground font-bold border-primary shadow-xs ring-1 ring-primary/30'
                              : 'border-transparent hover:bg-background/60 text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-xs border border-white/20"
                            style={{ backgroundColor: shade.swatch }}
                          />
                          <span className="truncate">{shade.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
