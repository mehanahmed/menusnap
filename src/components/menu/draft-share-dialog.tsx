'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CalendarDays,
  Share2,
  X,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Check,
  Palette,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  BookmarkCheck,
  Lock,
  Loader2,
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { decodeHtmlEntities, cn } from '@/lib/utils';
import { usePreferences } from '@/context/PreferencesContext';
import { useClientAuth } from '@/hooks/use-client-auth';
import { useToast } from '@/hooks/use-toast';
import { MENU_SHEET_THEMES, getMenuSheetTheme, type MenuSheetTheme, type CustomThemeConfig } from './menu-sheet-themes';
import { CustomDesignControls } from './custom-design-controls';
import { getClientCustomThemeAction, saveClientCustomThemeAction, deleteClientCustomBackgroundAction } from '@/app/actions/custom-theme';
import { useActiveSavedDraft } from '@/hooks/use-active-saved-draft';

export interface DraftSubItem {
  id?: string;
  name: string;
  price: number;
  categoryId?: string;
  category?: string;
  categoryName?: string;
  description?: string | null;
  subItems?: Array<{ id?: string; name: string; price?: number }>;
}

export interface DraftItemData {
  id: string;
  name: string;
  createdAt: string;
  itemCount: number;
  primaryTag: string;
  price?: number;
  previewAvatars?: string[];
  items?: DraftSubItem[];
  isSaved?: boolean;
  whatsappNumber?: string;
  businessName?: string;
  clientId?: number | null;
}

export interface CategoryLookup {
  id: string;
  name: string;
  icon?: string;
}

interface DraftShareDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  draft: DraftItemData | null;
  masterCategoryList: CategoryLookup[];
}

export function DraftShareDialog({
  isOpen,
  onOpenChange,
  draft,
  masterCategoryList,
}: DraftShareDialogProps) {
  const { currencySymbol, translateText } = usePreferences();
  const { clientUser } = useClientAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [expandedVariations, setExpandedVariations] = useState<Record<string, boolean>>({});

  // Active saved draft state & inline unlock prompt for QR stand
  const { activeSavedDraftId, activeSavedDraftName, isDraftSaved, saveAsActiveDraft } = useActiveSavedDraft();
  const isSaved = isDraftSaved(draft?.id);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [isActivatingDraft, setIsActivatingDraft] = useState(false);

  // Reset prompt whenever the dialog is opened, closed, or draft changes
  useEffect(() => {
    setShowSavePrompt(false);
  }, [isOpen, draft?.id]);

  const handleSaveAndOpenQr = async () => {
    if (!draft) return;
    setIsActivatingDraft(true);
    try {
      const res = await saveAsActiveDraft(draft);
      if (res.success) {
        toast({
          title: 'Active QR Menu Saved!',
          description: `"${decodeHtmlEntities(draft.name)}" is now your active menu. Opening QR stand...`,
        });
        setShowSavePrompt(false);
        if (typeof window !== 'undefined') {
          window.open(`/draft/qr/${draft.id}?theme=${activeTheme.id}`, '_blank');
        }
      } else {
        toast({
          title: 'Save Failed',
          description: res.error || 'Could not save draft.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsActivatingDraft(false);
    }
  };

  // Theme selection with local draft memory and parlour-aware default
  const [selectedThemeId, setSelectedThemeId] = useState<string>(() => {
    if (typeof window !== 'undefined' && draft?.id) {
      const stored = localStorage.getItem(`menuSheetTheme_${draft.id}`);
      if (stored) return stored;
    }
    return draft?.primaryTag === 'parlour' ? 'rose' : 'sunset';
  });

  const [customConfig, setCustomConfig] = useState<CustomThemeConfig | null>(null);

  // Load saved custom theme from client storage & server database after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('menusnap_custom_theme');
      if (stored) {
        setCustomConfig(JSON.parse(stored));
      }
    } catch {}

    getClientCustomThemeAction({
      clientId: clientUser?.id,
      whatsappNumber: clientUser?.whatsappNumber,
      email: clientUser?.email,
      draftId: draft?.id,
    })
      .then((res) => {
        if (res.success && res.themeConfig) {
          setCustomConfig(res.themeConfig);
          try {
            localStorage.setItem('menusnap_custom_theme', JSON.stringify(res.themeConfig));
          } catch {}
        }
      })
      .catch(() => {});
  }, [clientUser, draft?.id]);

  const activeTheme = useMemo(
    () => getMenuSheetTheme(selectedThemeId, customConfig),
    [selectedThemeId, customConfig]
  );

  const handleThemeChange = (themeId: string) => {
    setSelectedThemeId(themeId);
    if (typeof window !== 'undefined' && draft?.id) {
      try {
        localStorage.setItem(`menuSheetTheme_${draft.id}`, themeId);
      } catch {}
    }
  };

  const handleUpdateCustomConfig = async (newConfig: CustomThemeConfig) => {
    setCustomConfig(newConfig);
    try {
      localStorage.setItem('menusnap_custom_theme', JSON.stringify(newConfig));
    } catch {}

    saveClientCustomThemeAction({
      clientId: clientUser?.id,
      whatsappNumber: clientUser?.whatsappNumber,
      email: clientUser?.email,
      draftId: draft?.id,
      themeConfig: newConfig,
    }).catch(() => {});
  };

  const handleDeleteCustomBackground = async () => {
    const updated: CustomThemeConfig = {
      bgImageUrl: null,
      shadeId: customConfig?.shadeId || 'charcoal',
      updatedAt: new Date().toISOString(),
    };
    setCustomConfig(updated);
    try {
      localStorage.setItem('menusnap_custom_theme', JSON.stringify(updated));
    } catch {}

    deleteClientCustomBackgroundAction({
      clientId: clientUser?.id,
      whatsappNumber: clientUser?.whatsappNumber,
      email: clientUser?.email,
      draftId: draft?.id,
    }).catch(() => {});

    toast({
      title: 'Background Removed',
      description: 'Your custom background image has been deleted.',
    });
  };

  const idPrefixForDraft = useMemo(() => {
    if (!draft?.primaryTag) return 'restaurant';
    const type = draft.primaryTag.split('-')[0].toLowerCase();
    return type === 'restaurant' || type === 'parlour' ? type : 'restaurant';
  }, [draft?.primaryTag]);

  // Formatted creation date (e.g. "October 31, 2026")
  const formattedDate = useMemo(() => {
    if (!draft?.createdAt) return format(new Date(), 'MMMM d, yyyy');
    try {
      const parsed = parseISO(draft.createdAt);
      if (isValid(parsed)) return format(parsed, 'MMMM d, yyyy');
      const nativeDate = new Date(draft.createdAt);
      return isValid(nativeDate) ? format(nativeDate, 'MMMM d, yyyy') : format(new Date(), 'MMMM d, yyyy');
    } catch {
      return format(new Date(), 'MMMM d, yyyy');
    }
  }, [draft?.createdAt]);

  // Restaurant / Business Name (prioritize client account name, fallback to draft name)
  const businessName = useMemo(() => {
    if (clientUser?.businessName) {
      return clientUser.businessName;
    }
    if (!draft?.name) return 'Customer Selection';
    return draft.name.replace(/^Draft\s*-\s*/i, '') || draft.name;
  }, [clientUser?.businessName, draft?.name]);

  // Group items by category
  const groupedItems = useMemo(() => {
    if (!draft?.items || draft.items.length === 0) return {};

    const catMap = new Map<string, string>();
    masterCategoryList.forEach((c) => {
      catMap.set(c.id, c.name);
      const rawId = c.id.replace(/^(restaurant|parlour)-/, '');
      if (rawId) catMap.set(rawId, c.name);
    });

    const groups: Record<string, DraftSubItem[]> = {};

    draft.items.forEach((item) => {
      const rawCatId = item.categoryId || item.category || 'unknown';
      const prefixedCatId = `${idPrefixForDraft}-${rawCatId}`;
      const categoryName =
        item.categoryName ||
        catMap.get(prefixedCatId) ||
        catMap.get(String(rawCatId)) ||
        'Selected Items';

      if (!groups[categoryName]) {
        groups[categoryName] = [];
      }
      groups[categoryName].push(item);
    });

    return groups;
  }, [draft?.items, idPrefixForDraft, masterCategoryList]);

  const toggleVariation = (key: string) => {
    setExpandedVariations((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleShare = async () => {
    if (!draft) return;

    const appOrigin = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const shareUrl = appOrigin ? `${appOrigin}/draft/view/${draft.id}?theme=${activeTheme.id}` : '';

    // Build text summary
    const lines: string[] = [
      `Menu Selection for: ${businessName}`,
      `Template Style: ${activeTheme.name}`,
      `Date: ${formattedDate}`,
      '',
    ];

    Object.entries(groupedItems).forEach(([categoryName, items]) => {
      lines.push(`--- ${categoryName} ---`);
      items.forEach((item) => {
        lines.push(`• ${decodeHtmlEntities(item.name)}: ${currencySymbol}${(Number(item.price) || 0).toLocaleString()}`);
        if (item.description) {
          lines.push(`  ${decodeHtmlEntities(item.description)}`);
        }
      });
      lines.push('');
    });

    lines.push(`View styled menu sheet: ${shareUrl}`);
    lines.push('Powered by MenuSnap');
    const fullText = lines.join('\n');

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Menu Selection for ${businessName}`,
          text: fullText,
          url: shareUrl,
        });
        return;
      } catch {
        // User dismissed share dialog, continue to copy fallback
      }
    }

    let copiedSuccessfully = false;

    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(fullText);
        copiedSuccessfully = true;
      } catch {
        copiedSuccessfully = false;
      }
    }

    if (!copiedSuccessfully && typeof document !== 'undefined') {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = fullText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        textArea.setAttribute('readonly', '');
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        copiedSuccessfully = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch {}
    }

    if (copiedSuccessfully) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast({
        title: 'Menu Copied to Clipboard!',
        description: `Shareable menu text with "${activeTheme.name}" theme copied, ready to send via WhatsApp or chat.`,
      });
    } else {
      toast({
        title: 'Copy Failed',
        description: 'Could not copy menu to clipboard.',
        variant: 'destructive',
      });
    }
  };

  if (!draft) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setShowSavePrompt(false);
          if (typeof document !== 'undefined') {
            document.body.style.pointerEvents = '';
            document.body.removeAttribute('data-scroll-locked');
          }
        }
        onOpenChange(open);
      }}
    >
      <DialogContent
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          if (typeof document !== 'undefined') {
            document.body.style.pointerEvents = '';
            document.body.removeAttribute('data-scroll-locked');
          }
        }}
        className="w-[95vw] sm:w-full sm:max-w-3xl lg:max-w-4xl max-h-[90vh] p-0 flex flex-col overflow-hidden bg-muted border border-border shadow-2xl rounded-2xl [&>button.absolute]:hidden min-w-0"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Menu Selection Sheet - {businessName}</DialogTitle>
          <DialogDescription>View draft menu items in selection sheet format</DialogDescription>
        </DialogHeader>

        {/* Sticky top action bar */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-3 sm:px-6 py-2.5 space-y-2 shrink-0 w-full min-w-0">
          {/* Row 1: Badge on left, Close button (X) on far right */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/30 px-2 py-0.5">
                Menu Sheet View
              </Badge>
              <span className="text-xs text-muted-foreground">
                {draft.itemCount} items
              </span>
            </div>

            {/* Cross close button on far right of top row */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/80 transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Row 2: Template selector taking full dedicated row (natural scroll on mobile, right-aligned on desktop) */}
          <div className="flex items-center justify-start sm:justify-end w-full min-w-0 pt-0.5 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1 bg-muted/90 p-1 rounded-xl border border-border/70 overflow-x-auto max-w-full sm:ml-auto scrollbar-none shrink-0">
              <span className="text-[11px] font-semibold text-muted-foreground px-1.5 hidden md:flex items-center gap-1 shrink-0">
                <Palette className="w-3.5 h-3.5 text-primary" /> Template:
              </span>
              {MENU_SHEET_THEMES.map((theme) => {
                const isActive = activeTheme.id === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => handleThemeChange(theme.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0",
                      isActive
                        ? "bg-card text-foreground font-bold shadow-xs ring-1 ring-border/80"
                        : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                    )}
                    title={`${theme.name} — ${theme.description}`}
                  >
                    <span
                      className={cn(
                        "w-2.5 h-2.5 rounded-full shrink-0 shadow-xs transition-transform",
                        isActive ? "scale-110 ring-1 ring-offset-1 ring-foreground" : "opacity-80"
                      )}
                      style={{ backgroundColor: theme.swatchColor }}
                    />
                    <span>{theme.shortName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Action buttons (Sharing & QR Code strictly available for active saved draft) */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1.5 border-t border-border/40 w-full min-w-0">
            {isSaved ? (
              <>
                <Button
                  size="sm"
                  onClick={handleShare}
                  className="h-8 gap-1.5 text-xs font-medium border border-border bg-card text-foreground hover:bg-muted hover:text-foreground shadow-xs transition-colors flex-1 min-w-[calc(50%-6px)] sm:flex-none sm:min-w-0"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Share2 className="h-3.5 w-3.5 text-primary" />}
                  {copied ? 'Copied!' : 'Share Text'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const appOrigin = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
                    const shareUrl = appOrigin ? `${appOrigin}/draft/view/${draft.id}?theme=${activeTheme.id}` : '';
                    const waText = encodeURIComponent(`Menu Selection for: ${businessName}\nView menu sheet: ${shareUrl}`);
                    window.open(`https://api.whatsapp.com/send?text=${waText}`, '_blank');
                  }}
                  className="h-8 gap-1.5 text-xs font-medium border border-green-500/30 bg-card text-green-600 hover:bg-green-600 hover:text-white hover:border-green-600 shadow-xs transition-colors group flex-1 min-w-[calc(50%-6px)] sm:flex-none sm:min-w-0"
                >
                  <span className="text-sm">💬</span> WhatsApp
                </Button>
                <Link href={`/draft/view/${draft.id}?theme=${activeTheme.id}`} target="_blank" className="flex-1 min-w-[calc(50%-6px)] sm:flex-none sm:min-w-0">
                  <Button size="sm" className="w-full sm:w-auto h-8 gap-1 text-xs font-medium border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground shadow-xs transition-colors">
                    <ExternalLink className="h-3.5 w-3.5" /> Full Page
                  </Button>
                </Link>
                <Link href={`/draft/qr/${draft.id}?theme=${activeTheme.id}`} target="_blank" className="flex-1 min-w-[calc(50%-6px)] sm:flex-none sm:min-w-0">
                  <Button size="sm" className="w-full sm:w-auto h-8 gap-1.5 text-xs font-semibold border border-primary/30 bg-card text-primary hover:bg-primary hover:text-white hover:border-primary shadow-xs transition-colors group">
                    <QrCode className="h-3.5 w-3.5 text-primary group-hover:text-white transition-colors" />
                    <span>QR Code</span>
                    <span className="text-[9px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider">
                      Active
                    </span>
                  </Button>
                </Link>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2 py-0.5">
                <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span className="text-[11px]">This draft is unsaved. Save it as your active menu to enable sharing and QR stands.</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowSavePrompt((prev) => !prev)}
                  className={cn(
                    "h-8 gap-1.5 text-xs font-bold border transition-colors shrink-0 shadow-xs rounded-xl",
                    showSavePrompt
                      ? "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      : "border-amber-500/40 bg-card text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 hover:text-amber-700 hover:border-amber-500"
                  )}
                  title="Draft must be saved as active menu to generate QR Stand and share"
                >
                  <BookmarkCheck className="h-3.5 w-3.5 text-amber-500" />
                  <span>Save Draft to Share & Unlock QR</span>
                </Button>
              </div>
            )}
          </div>

          {/* Inline Activation Prompt for Unsaved Draft */}
          {showSavePrompt && !isSaved && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs space-y-2.5 animate-in fade-in-50 duration-150 mt-1">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    Save this draft to enable customer QR stand?
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Customer QR stands and live table ordering only work for your <strong>single active saved menu</strong>.
                  </p>
                  {activeSavedDraftName && activeSavedDraftId !== draft.id && (
                    <div className="bg-background/80 p-2 rounded-lg border border-amber-500/25 flex items-center justify-between text-[11px] gap-2">
                      <span className="truncate">
                        Current active menu: <span className="line-through font-medium opacity-75">{decodeHtmlEntities(activeSavedDraftName)}</span>
                      </span>
                      <span className="text-[9px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded shrink-0">
                        Will Unsave
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0 rounded-full"
                  onClick={() => setShowSavePrompt(false)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-500/20">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isActivatingDraft}
                  onClick={() => setShowSavePrompt(false)}
                  className="h-7 text-xs px-3 border-border hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={isActivatingDraft}
                  onClick={handleSaveAndOpenQr}
                  className="h-7 text-xs px-3 font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  {isActivatingDraft ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <BookmarkCheck className="w-3.5 h-3.5" />
                  )}
                  <span>{isActivatingDraft ? 'Saving...' : 'Save Draft & Open QR Stand'}</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Custom Design Controls (When Custom Design template is active) */}
        {selectedThemeId === 'custom' && (
          <div className="p-2 sm:p-4 bg-card border-b border-border shadow-xs w-full min-w-0 shrink-0">
            <CustomDesignControls
              customConfig={customConfig}
              onUpdateConfig={handleUpdateCustomConfig}
              onDeleteBackground={handleDeleteCustomBackground}
            />
          </div>
        )}

        {/* Main Sheet Container styled with activeTheme */}
        <div className={cn("flex-1 overflow-y-auto overflow-x-hidden min-w-0 w-full p-2.5 sm:p-5 lg:p-6 transition-colors duration-200 ease-in-out", activeTheme.sheetWrapperClass)}>
          <div
            className={cn(
              "w-full mx-auto p-4 sm:p-7 lg:p-10 rounded-2xl overflow-hidden relative shadow-lg transition-colors duration-200 ease-in-out min-w-0",
              activeTheme.sheetCardClass
            )}
            style={activeTheme.watermarkStyle}
          >
            {/* Sheet Header: Logo on left, For: Business on right */}
            <div className={cn("flex flex-col sm:flex-row justify-between items-center sm:items-start pb-5 sm:pb-8 mb-5 sm:mb-8 gap-4 sm:gap-6 transition-colors w-full min-w-0", activeTheme.headerBorderClass)}>
              <div className={cn("rounded-lg w-full sm:w-auto px-4 py-2 sm:px-5 sm:py-2.5 flex items-center justify-center transition-all shrink-0", activeTheme.logoBoxClass)}>
                <Image
                  src="/menusnap-logo-white.png"
                  alt="MenuSnap Logo"
                  width={180}
                  height={48}
                  className="h-8 sm:h-11 w-auto object-contain max-w-full"
                  priority
                />
              </div>

              <div className="text-center sm:text-right text-sm space-y-1 w-full sm:w-auto min-w-0">
                <p className={cn("text-lg sm:text-2xl transition-colors truncate max-w-full", activeTheme.businessTitleClass)}>
                  For: {decodeHtmlEntities(businessName)}
                </p>
                <p className={cn("flex items-center justify-center sm:justify-end gap-1.5 text-xs sm:text-sm", activeTheme.dateTextClass)}>
                  <CalendarDays className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0", activeTheme.dateIconClass)} />
                  <span>{formattedDate}</span>
                </p>
              </div>
            </div>

            {/* Selected Items grouped by category */}
            <section className="space-y-6 sm:space-y-8 flex-1 w-full min-w-0">
              {Object.keys(groupedItems).length > 0 ? (
                Object.entries(groupedItems).map(([categoryName, items]) => (
                  <div key={categoryName} className="w-full min-w-0">
                    {/* Themed category header with refined border-bottom */}
                    <h3 className={cn("text-base sm:text-xl pb-2 sm:pb-2.5 mb-4 sm:mb-5 transition-colors", activeTheme.categoryTitleClass, activeTheme.categoryBorderClass)}>
                      {translateText(decodeHtmlEntities(categoryName))}
                    </h3>

                    {/* 2-column food items grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 lg:gap-x-12 gap-y-4 sm:gap-y-6 w-full min-w-0">
                      {items.map((item, index) => {
                        const itemKey = `${item.id || item.name}-${index}`;
                        const isExpanded = !!expandedVariations[itemKey];
                        const hasSubItems = item.subItems && item.subItems.length > 0;

                        return (
                          <div key={itemKey} className="space-y-1 min-w-0">
                            <div className="flex justify-between items-start gap-3 min-w-0">
                              <h4 className={cn("text-sm sm:text-base font-bold flex-1 min-w-0 break-words", activeTheme.itemNameClass)}>
                                {translateText(decodeHtmlEntities(item.name))}
                              </h4>
                              {item.price > 0 && (
                                <p className={cn("shrink-0 font-bold text-sm sm:text-base", activeTheme.itemPriceClass)}>
                                  {currencySymbol}{item.price.toLocaleString()}
                                </p>
                              )}
                            </div>

                            {item.description && (
                              <p className={cn("text-xs sm:text-sm leading-relaxed break-words", activeTheme.itemDescClass)}>
                                {translateText(decodeHtmlEntities(item.description))}
                              </p>
                            )}

                            {hasSubItems && (
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => toggleVariation(itemKey)}
                                className={cn("text-xs h-auto p-0 mt-1", activeTheme.variationLinkClass)}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-3 w-3 mr-1 inline" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 mr-1 inline" />
                                )}
                                {isExpanded ? 'Hide' : 'Show'} Variations ({item.subItems!.length})
                              </Button>
                            )}

                            {hasSubItems && isExpanded && (
                              <div className={cn("mt-2 pl-3 p-2.5 rounded-lg space-y-1.5 transition-all min-w-0", activeTheme.variationBoxClass)}>
                                {item.subItems!.map((sub, sIdx) => (
                                  <div
                                    key={sub.id || sIdx}
                                    className={cn("flex justify-between items-center text-xs p-1.5 rounded-md gap-2 min-w-0", activeTheme.variationSubItemClass)}
                                  >
                                    <p className="font-medium flex-1 min-w-0 break-words">{translateText(decodeHtmlEntities(sub.name))}</p>
                                    {typeof sub.price === 'number' && sub.price > 0 && (
                                      <p className={cn("shrink-0 font-bold", activeTheme.variationPriceClass)}>
                                        +{currencySymbol}{sub.price.toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No items were found in this draft.
                </p>
              )}
            </section>

            {/* Footer */}
            <footer className={cn("text-center text-xs mt-8 sm:mt-12 pt-6 sm:pt-8 transition-colors duration-200 ease-in-out w-full min-w-0 mt-auto", activeTheme.footerBorderClass, activeTheme.footerTextClass)}>
              <p className="font-semibold tracking-wide">
                Powered by <span className="font-bold">MenuSnap</span>
              </p>
              <p className="mt-1 opacity-80">For inquiries, please contact Color Hut at +8801919760626.</p>
            </footer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
