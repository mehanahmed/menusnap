'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CalendarDays,
  Share2,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  AlertTriangle,
  Check,
  Palette,
  QrCode,
  Plus,
  Minus,
  UtensilsCrossed,
  CheckCircle2,
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { decodeHtmlEntities, cn } from '@/lib/utils';
import { getCategoriesFromMySql } from '@/app/actions/orders';
import { getUserDraftByIdAction, getActiveSavedDraftAction } from '@/app/actions/user-drafts';
import { usePreferences } from '@/context/PreferencesContext';
import { useClientAuth } from '@/hooks/use-client-auth';
import { useToast } from '@/hooks/use-toast';
import { useActiveSavedDraft } from '@/hooks/use-active-saved-draft';
import type { DraftItemData, DraftSubItem, CategoryLookup } from '@/components/menu/draft-share-dialog';
import { MENU_SHEET_THEMES, getMenuSheetTheme, type MenuSheetTheme, type CustomThemeConfig } from '@/components/menu/menu-sheet-themes';
import { CustomDesignControls } from '@/components/menu/custom-design-controls';
import { CustomerOrderBar, type CartItem } from '@/components/menu/customer-order-bar';
import { getClientCustomThemeAction, saveClientCustomThemeAction, deleteClientCustomBackgroundAction } from '@/app/actions/custom-theme';

const DRAFTS_STORAGE_KEY = 'menuBuilderDrafts';

function DraftViewContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const draftId = params.id as string;
  const router = useRouter();
  const { currencySymbol, translateText } = usePreferences();
  const { clientUser } = useClientAuth();
  const { toast } = useToast();

  // Resolve search parameters synchronously during SSR & client render (eliminates hydration mismatches)
  const urlTheme = searchParams.get('theme');
  const tableNumber = searchParams.get('table')?.trim() || '';
  const urlWa = searchParams.get('wa')?.trim() || '';
  const isCustomerMode = searchParams.get('customer') === '1' || searchParams.get('mode') === 'customer' || searchParams.get('view') === 'public' || Boolean(tableNumber) || Boolean(urlWa);

  // Active saved draft verification (only active saved draft can be viewed / ordered from)
  const {
    activeSavedDraftId,
    activeSavedDraftName,
    isDraftSaved,
    isLoading: isActiveDraftLoading,
  } = useActiveSavedDraft();

  // Server-resolved fallback for active draft (when customer is on mobile without localStorage)
  const [serverActiveDraft, setServerActiveDraft] = useState<{ id: string; name: string } | null>(null);

  const [draft, setDraft] = useState<DraftItemData | null>(null);
  const [categories, setCategories] = useState<CategoryLookup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedVariations, setExpandedVariations] = useState<Record<string, boolean>>({});
  const [cart, setCart] = useState<Record<string, CartItem>>({});

  const resolvedActiveDraftId = activeSavedDraftId || serverActiveDraft?.id || null;
  const resolvedActiveDraftName = activeSavedDraftName || serverActiveDraft?.name || null;

  // Strict tenant boundary: Check if current logged-in browser session actually owns this draft
  const isDraftOwner = Boolean(clientUser?.id && draft?.clientId && clientUser.id === draft.clientId);

  const isCurrentlyActive = useMemo(() => {
    // 1. If viewer is the owner reviewing in internal draft mode, enforce single active draft check
    if (isDraftOwner && !isCustomerMode) {
      if (resolvedActiveDraftId && resolvedActiveDraftId !== draftId) {
        return false;
      }
      if (isDraftSaved(draftId)) {
        return true;
      }
    }
    // 2. In customer mode (QR code scan or public menu link), check MySQL record isSaved status
    if (draft?.isSaved) {
      return true;
    }
    // 3. Fallback for draft owner or when resolvedActiveDraftId matches
    return Boolean(resolvedActiveDraftId === draftId || isDraftSaved(draftId));
  }, [isDraftOwner, isCustomerMode, resolvedActiveDraftId, draftId, isDraftSaved, draft?.isSaved]);

  const handleUpdateQuantity = (key: string, delta: number) => {
    setCart((prev) => {
      const current = prev[key];
      if (!current) return prev;
      const newQty = current.quantity + delta;
      if (newQty <= 0) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { ...current, quantity: newQty } };
    });
  };

  const handleAddToCart = (item: DraftSubItem, variation?: { name: string; price?: number; id?: string | number }) => {
    const key = variation
      ? `var-${item.id || item.name}-${variation.id || variation.name}`
      : `item-${item.id || item.name}`;
    const price = variation
      ? (typeof variation.price === 'number' && variation.price > 0 ? variation.price : item.price)
      : item.price;

    setCart((prev) => {
      const existing = prev[key];
      return {
        ...prev,
        [key]: {
          key,
          name: item.name,
          variationName: variation?.name,
          price: Number(price) || 0,
          quantity: (existing?.quantity || 0) + 1,
        },
      };
    });
  };

  const handleRemoveItem = (key: string) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleClearCart = () => setCart({});

  // Theme selection state, initialized from URL query param or default
  const [selectedThemeId, setSelectedThemeId] = useState<string>(urlTheme || 'sunset');

  // Initialize with null on both SSR and client to ensure identical initial hydration
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
      draftId,
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
  }, [clientUser, draftId]);

  const activeTheme = useMemo(
    () => getMenuSheetTheme(selectedThemeId, customConfig),
    [selectedThemeId, customConfig]
  );

  const handleThemeChange = (themeId: string) => {
    setSelectedThemeId(themeId);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`menuSheetTheme_${draftId}`, themeId);
        const url = new URL(window.location.href);
        url.searchParams.set('theme', themeId);
        window.history.replaceState({}, '', url.toString());
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
      draftId,
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
      draftId,
    }).catch(() => {});

    toast({
      title: 'Background Removed',
      description: 'Your custom background image has been deleted.',
    });
  };

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch categories
        const catRes = await getCategoriesFromMySql();
        if (catRes.success && Array.isArray(catRes.data)) {
          setCategories(
            catRes.data.map((cat: any) => ({
              id: `${cat.type}-${String(cat.id)}`,
              name: String(cat.name || 'Unnamed Category'),
              icon: String(cat.icon || ''),
            }))
          );
        }

        // Fetch draft from localStorage first
        const stored = localStorage.getItem(DRAFTS_STORAGE_KEY);
        let found: DraftItemData | null = null;
        if (stored) {
          try {
            const drafts: DraftItemData[] = JSON.parse(stored);
            found = drafts.find((d) => String(d.id) === String(draftId)) || null;
          } catch (_) {}
        }

        // Always check MySQL to ensure fresh isSaved status and fallback
        const dbRes = await getUserDraftByIdAction(String(draftId));
        if (dbRes.success && dbRes.draft) {
          const dbDraft = dbRes.draft;
          if (!found) {
            found = {
              id: dbDraft.draftId,
              name: dbDraft.draftName,
              createdAt: dbDraft.createdAt,
              itemCount: dbDraft.itemCount || dbDraft.items.length,
              primaryTag: dbDraft.primaryTag || 'restaurant',
              items: dbDraft.items as any,
              isSaved: Boolean(dbDraft.isSaved),
              whatsappNumber: dbDraft.whatsappNumber || undefined,
              businessName: dbDraft.businessName || undefined,
              clientId: dbDraft.clientId || undefined,
            };
          } else {
            found = {
              ...found,
              items: (dbDraft.items && dbDraft.items.length > 0) ? (dbDraft.items as any) : found.items,
              isSaved: Boolean(dbDraft.isSaved),
              whatsappNumber: dbDraft.whatsappNumber || found.whatsappNumber,
              businessName: dbDraft.businessName || found.businessName,
              clientId: dbDraft.clientId || found.clientId,
            };
          }

          // If this draft is inactive/unsaved, resolve the currently active draft for this business
          if (!dbDraft.isSaved) {
            getActiveSavedDraftAction({
              clientId: dbDraft.clientId,
              businessName: dbDraft.businessName,
            })
              .then((activeRes) => {
                if (activeRes.success && activeRes.activeDraftId) {
                  setServerActiveDraft({
                    id: activeRes.activeDraftId,
                    name: activeRes.draftName || 'Active Menu',
                  });
                }
              })
              .catch(() => {});
          }
        }

        if (found) {
          setDraft(found);
        } else {
          setError('The requested draft could not be found.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load draft menu.');
      } finally {
        setIsLoading(false);
      }
    }

    if (draftId) {
      loadData();
    }
  }, [draftId]);

  const idPrefixForDraft = useMemo(() => {
    if (!draft?.primaryTag) return 'restaurant';
    const type = draft.primaryTag.split('-')[0].toLowerCase();
    return type === 'restaurant' || type === 'parlour' ? type : 'restaurant';
  }, [draft?.primaryTag]);

  const isParlour = useMemo(() => {
    const tag = draft?.primaryTag?.toLowerCase() || '';
    const type = ((draft as any)?.businessType || '').toLowerCase();
    if (tag.includes('parlour') || type === 'parlour' || tag.includes('salon')) {
      return true;
    }
    if (tag.includes('restaurant') || type === 'restaurant') {
      return false;
    }
    if (isDraftOwner && clientUser?.type) {
      return clientUser.type === 'parlour';
    }
    return false;
  }, [draft?.primaryTag, (draft as any)?.businessType, isDraftOwner, clientUser?.type]);

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

  const businessName = useMemo(() => {
    // 1. Prioritize draft's own businessName saved in DB
    if (draft?.businessName && draft.businessName !== 'Anonymous Restaurant') {
      return draft.businessName;
    }
    // 2. Only if the logged-in user is the verified owner of this draft, fallback to clientUser.businessName
    if (isDraftOwner && clientUser?.businessName) {
      return clientUser.businessName;
    }
    // 3. Fallback to draft.name cleaned
    if (draft?.name) {
      return draft.name.replace(/^Draft\s*-\s*/i, '') || draft.name;
    }
    return 'Our Menu';
  }, [draft?.businessName, isDraftOwner, clientUser?.businessName, draft?.name]);

  const resolvedBusinessPhone = useMemo(() => {
    if (urlWa) return urlWa;
    if (draft?.whatsappNumber) return draft.whatsappNumber;
    if (isDraftOwner && clientUser?.whatsappNumber) {
      return clientUser.whatsappNumber;
    }
    return undefined;
  }, [urlWa, draft?.whatsappNumber, isDraftOwner, clientUser?.whatsappNumber]);

  const groupedItems = useMemo(() => {
    if (!draft?.items || draft.items.length === 0) return {};

    const catMap = new Map<string, string>();
    categories.forEach((c) => {
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
  }, [draft?.items, idPrefixForDraft, categories]);

  const toggleVariation = (key: string) => {
    setExpandedVariations((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleShare = async () => {
    if (!draft) return;

    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/draft/view/${draft.id}?theme=${activeTheme.id}`
      : '';

    const lines: string[] = [
      `Menu Selection for: ${businessName}`,
      `Template Style: ${activeTheme.name}`,
      `Date: ${formattedDate}`,
      '',
    ];

    Object.entries(groupedItems).forEach(([categoryName, items]) => {
      lines.push(`--- ${categoryName} ---`);
      items.forEach((item) => {
        lines.push(`• ${decodeHtmlEntities(item.name)}: ${currencySymbol}${item.price.toLocaleString()}`);
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
        // User cancelled
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(fullText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        toast({
          title: 'Menu Copied to Clipboard!',
          description: `Shareable menu text with "${activeTheme.name}" theme copied, ready to send via WhatsApp or chat.`,
        });
      } catch {
        toast({
          title: 'Copy Failed',
          description: 'Could not copy menu to clipboard.',
          variant: 'destructive',
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div
        className={cn(
          "min-h-screen bg-muted/30 transition-colors duration-200 ease-in-out",
          isCustomerMode ? "py-4 sm:py-10 px-2 sm:px-6" : "p-2 sm:p-6 lg:p-8"
        )}
      >
        {!isCustomerMode && (
          <header className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 mb-5 px-2 sm:px-0">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-64 rounded-xl" />
            <Skeleton className="h-8 w-44 rounded-lg" />
          </header>
        )}

        <main
          className="max-w-5xl mx-auto p-5 sm:p-10 lg:p-14 rounded-2xl relative overflow-hidden min-h-[85vh] space-y-10 bg-card border border-border shadow-2xl"
        >
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start pb-8 mb-8 gap-6 border-b border-border/40">
            <div className="rounded-lg px-5 py-2.5 flex items-center justify-center bg-muted/60">
              <div className="h-9 w-32 bg-muted-foreground/20 animate-pulse rounded" />
            </div>
            <div className="space-y-2 text-center sm:text-right w-full sm:w-auto">
              <Skeleton className="h-7 w-48 sm:ml-auto" />
              <Skeleton className="h-4 w-32 sm:ml-auto" />
            </div>
          </div>

          {/* Full Page Categories Skeleton */}
          <section className="space-y-10">
            {Array.from({ length: 3 }).map((_, catIdx) => (
              <div key={catIdx} className="space-y-6">
                {/* Category title skeleton */}
                <div className="pb-2.5 border-b border-border/40">
                  <Skeleton className="h-6 w-36 rounded" />
                </div>
                {/* 2-column grid of menu items skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  {Array.from({ length: 4 }).map((_, itemIdx) => (
                    <div key={itemIdx} className="space-y-2">
                      <div className="flex justify-between items-baseline gap-4">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                      <Skeleton className="h-3 w-4/5 opacity-60" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* Footer Skeleton */}
          <div className="text-center mt-12 pt-8 border-t border-border/40 flex flex-col items-center justify-center gap-1.5 opacity-60">
            <Skeleton className="h-4 w-44 mx-auto" />
            <Skeleton className="h-3 w-28 mx-auto" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="bg-muted min-h-screen p-8 flex flex-col items-center justify-center text-center">
        <div className="bg-card p-8 rounded-2xl shadow-xl border border-destructive/50 max-w-lg space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold text-destructive">Could Not Load Draft Menu</h2>
          <p className="text-muted-foreground">{error || 'Draft not found.'}</p>
          <Button variant="outline" onClick={() => router.push('/draft')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Return to Drafts
          </Button>
        </div>
      </div>
    );
  }

  // Enforcement: Only the single active saved draft can be viewed or ordered from via QR stand / public link
  if (!isCurrentlyActive) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-md w-full bg-card rounded-2xl border border-border shadow-2xl p-6 sm:p-8 text-center space-y-5 animate-in fade-in-50 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-xs">
            <QrCode className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-bold border border-amber-500/25">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Menu Inactive / Replaced
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              This QR Menu is Not Active
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {isCustomerMode ? (
                <>
                  This digital menu is no longer active or has been replaced with an updated menu.
                  Please scan the current tabletop QR stand or ask your waiter for assistance.
                </>
              ) : (
                <>
                  &ldquo;{decodeHtmlEntities(draft.name)}&rdquo; is currently not saved as your active live menu.
                  Customer QR ordering and menu viewing are strictly reserved for your single active saved draft.
                </>
              )}
            </p>
          </div>

          {/* If an active saved menu is known and different, offer a 1-click link to view the live menu */}
          {resolvedActiveDraftId && resolvedActiveDraftId !== draftId && (
            <div className="bg-muted/50 rounded-xl p-3.5 border border-border/80 text-left space-y-2.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                {isCustomerMode ? 'Updated Live Menu Available' : 'Current Active Menu'}
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-xs text-foreground truncate">
                  {decodeHtmlEntities(resolvedActiveDraftName || 'Live Menu')}
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                  Active
                </span>
              </div>
              <Button
                asChild
                className="w-full h-9 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs rounded-xl mt-1"
              >
                <Link href={`/draft/view/${resolvedActiveDraftId}${isCustomerMode ? '?customer=1' : ''}`}>
                  <span>View Updated Live Menu</span>
                </Link>
              </Button>
            </div>
          )}

          {/* Navigation action for admin */}
          {!isCustomerMode && (
            <div className="pt-2 border-t border-border/60">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs font-semibold rounded-xl border-border bg-card hover:bg-muted"
              >
                <Link href="/draft">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Saved Drafts
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      suppressHydrationWarning
      className={cn(
        "min-h-screen transition-colors duration-200 ease-in-out",
        isCustomerMode ? "pt-4 sm:pt-10 pb-28 sm:pb-28 px-2 sm:px-6" : "pt-2 sm:pt-6 pb-12 sm:pb-16 px-2 sm:px-6 lg:px-8",
        activeTheme.sheetWrapperClass
      )}
    >
      {/* Top action bar: only shown for admin/owner; completely hidden for customers */}
      {!isCustomerMode && (
        <header className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 mb-5 px-2 sm:px-0">
          <Link href="/draft">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to Drafts
            </Button>
          </Link>

          {/* Curated Theme Selector */}
          <div className="flex items-center gap-1 bg-card/90 backdrop-blur p-1 rounded-xl border border-border shadow-xs overflow-x-auto max-w-full">
            <span className="text-[11px] font-semibold text-muted-foreground px-1.5 hidden md:flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-primary" /> Template:
            </span>
            {MENU_SHEET_THEMES.map((theme) => {
              const isActive = activeTheme.id === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                    isActive
                      ? "bg-background text-foreground font-bold shadow-xs ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
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

          <div className="flex items-center gap-2">
            <Link href={`/draft/qr/${draft.id}?theme=${activeTheme.id}`} target="_blank">
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold border border-primary/30 bg-card text-primary hover:bg-primary hover:text-white hover:border-primary shadow-xs transition-colors group"
              >
                <QrCode className="h-3.5 w-3.5 text-primary group-hover:text-white transition-colors" /> QR Code
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => {
                const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/draft/view/${draft.id}?theme=${activeTheme.id}` : '';
                const waText = encodeURIComponent(`Menu Selection for: ${businessName}\nView menu sheet: ${shareUrl}`);
                window.open(`https://api.whatsapp.com/send?text=${waText}`, '_blank');
              }}
              className="h-8 gap-1.5 text-xs font-medium border border-green-500/30 bg-card text-green-600 hover:bg-green-600 hover:text-white hover:border-green-600 shadow-xs transition-colors group"
            >
              <span className="text-sm">💬</span> WhatsApp
            </Button>
            <Button
              size="sm"
              onClick={handleShare}
              className="h-8 gap-1.5 text-xs font-medium border border-border bg-card text-foreground hover:bg-muted hover:text-foreground shadow-xs transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Share2 className="h-3.5 w-3.5 text-primary" />}
              {copied ? 'Copied!' : 'Share'}
            </Button>
          </div>
        </header>
      )}

      {/* Custom Design Controls (When Custom Design template is active in owner mode) */}
      {!isCustomerMode && selectedThemeId === 'custom' && (
        <div className="max-w-5xl mx-auto mb-6">
          <CustomDesignControls
            customConfig={customConfig}
            onUpdateConfig={handleUpdateCustomConfig}
            onDeleteBackground={handleDeleteCustomBackground}
          />
        </div>
      )}

      {/* Main presentation sheet matching activeTheme */}
      <main
        suppressHydrationWarning
        className={cn(
          "max-w-5xl mx-auto p-6 sm:p-12 rounded-2xl overflow-hidden relative shadow-lg transition-colors duration-200 ease-in-out",
          activeTheme.sheetCardClass
        )}
        style={activeTheme.watermarkStyle}
      >
        {/* Header: Logo on left, For + Date on right */}
        <div className={cn("flex flex-col sm:flex-row justify-between items-center sm:items-start pb-8 mb-8 gap-6 transition-colors", activeTheme.headerBorderClass)}>
          <div className={cn("rounded-lg w-full sm:w-auto px-5 py-2.5 flex items-center justify-center transition-all", activeTheme.logoBoxClass)}>
            <Image
              src="/menusnap-logo-white.png"
              alt="MenuSnap Logo"
              width={180}
              height={48}
              className="h-9 sm:h-11 w-auto object-contain"
              priority
            />
          </div>
          <div className="text-center sm:text-right text-sm space-y-1">
            <p className={cn("text-xl sm:text-2xl transition-colors", activeTheme.businessTitleClass)}>
              For: {decodeHtmlEntities(businessName)}
            </p>
            {tableNumber && (
              <div className="flex items-center justify-center sm:justify-end gap-1.5 pt-0.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide border shadow-2xs",
                    activeTheme.isDark
                      ? "bg-zinc-800/90 border-zinc-700 text-zinc-100"
                      : "bg-slate-100 border-slate-200/90 text-slate-800"
                  )}
                >
                  <UtensilsCrossed className="w-3.5 h-3.5" style={{ color: activeTheme.accentColor }} />
                  <span>Table {tableNumber.replace(/^table\s*/i, '').trim()}</span>
                </span>
              </div>
            )}
            <p className={cn("flex items-center justify-center sm:justify-end gap-2 text-xs sm:text-sm", activeTheme.dateTextClass)}>
              <CalendarDays className={cn("h-4 w-4", activeTheme.dateIconClass)} />
              {formattedDate}
            </p>
          </div>
        </div>

        {/* Selected Items grouped by category */}
        <section className="space-y-8 flex-1">
          {Object.keys(groupedItems).length > 0 ? (
            Object.entries(groupedItems).map(([categoryName, items]) => (
              <div key={categoryName}>
                {/* Themed category header with refined border-bottom */}
                <h3 className={cn("text-lg sm:text-xl pb-2.5 mb-5 transition-colors", activeTheme.categoryTitleClass, activeTheme.categoryBorderClass)}>
                  {translateText(decodeHtmlEntities(categoryName))}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  {items.map((item, index) => {
                    const itemKey = `${item.id || item.name}-${index}`;
                    const isExpanded = !!expandedVariations[itemKey];
                    const hasSubItems = item.subItems && item.subItems.length > 0;
                    const mainCartKey = `item-${item.id || item.name}`;
                    const mainCartItem = cart[mainCartKey];
                    const mainQty = mainCartItem?.quantity || 0;

                    return (
                      <div key={itemKey} className="space-y-1">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className={cn("text-base", activeTheme.itemNameClass)}>
                              {translateText(decodeHtmlEntities(item.name))}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            {item.price > 0 && (
                              <p className={cn("shrink-0 font-bold", activeTheme.itemPriceClass)}>
                                {currencySymbol}{item.price.toLocaleString()}
                              </p>
                            )}

                            {/* Cart Add / Stepper button for items without variations (only in customer QR mode) */}
                            {isCustomerMode && !hasSubItems && (
                              <div>
                                {mainQty > 0 ? (
                                  <div className="flex items-center gap-1 bg-primary/10 border border-primary/30 rounded-full p-0.5 shadow-xs">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateQuantity(mainCartKey, -1)}
                                      className="w-5 h-5 rounded-full flex items-center justify-center bg-card text-foreground hover:bg-primary hover:text-white transition-colors text-xs"
                                      title="Decrease"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="text-xs font-black min-w-4 text-center text-primary px-0.5">
                                      {mainQty}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateQuantity(mainCartKey, 1)}
                                      className="w-5 h-5 rounded-full flex items-center justify-center bg-card text-foreground hover:bg-primary hover:text-white transition-colors text-xs"
                                      title="Increase"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleAddToCart(item)}
                                    className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-white transition-all shadow-xs active:scale-95"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Add</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {item.description && (
                          <p className={cn("text-xs sm:text-sm leading-relaxed", activeTheme.itemDescClass)}>
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
                          <div className={cn("mt-2 pl-3 p-2.5 rounded-lg space-y-1.5 transition-all", activeTheme.variationBoxClass)}>
                            {item.subItems!.map((sub, sIdx) => {
                              const varCartKey = `var-${item.id || item.name}-${sub.id || sub.name}`;
                              const varCartItem = cart[varCartKey];
                              const varQty = varCartItem?.quantity || 0;

                              return (
                                <div
                                  key={sub.id || sIdx}
                                  className={cn("flex justify-between items-center text-xs p-1.5 rounded-md gap-2", activeTheme.variationSubItemClass)}
                                >
                                  <p className="font-medium flex-1">{translateText(decodeHtmlEntities(sub.name))}</p>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {typeof sub.price === 'number' && sub.price > 0 && (
                                      <p className={cn("font-bold", activeTheme.variationPriceClass)}>
                                        +{currencySymbol}{sub.price.toLocaleString()}
                                      </p>
                                    )}

                                    {isCustomerMode && (
                                      varQty > 0 ? (
                                        <div className="flex items-center gap-1 bg-primary/10 border border-primary/30 rounded-full p-0.5 shadow-xs">
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateQuantity(varCartKey, -1)}
                                            className="w-4 h-4 rounded-full flex items-center justify-center bg-card text-foreground hover:bg-primary hover:text-white transition-colors text-[10px]"
                                            title="Decrease"
                                          >
                                            <Minus className="w-2.5 h-2.5" />
                                          </button>
                                          <span className="text-[11px] font-black min-w-3 text-center text-primary px-0.5">
                                            {varQty}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateQuantity(varCartKey, 1)}
                                            className="w-4 h-4 rounded-full flex items-center justify-center bg-card text-foreground hover:bg-primary hover:text-white transition-colors text-[10px]"
                                            title="Increase"
                                          >
                                            <Plus className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleAddToCart(item, sub)}
                                          className="flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-bold rounded-full bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-white transition-all shadow-xs active:scale-95"
                                        >
                                          <Plus className="w-2.5 h-2.5" />
                                          <span>Add</span>
                                        </button>
                                      )
                                    )}
                                  </div>
                                </div>
                              );
                            })}
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
        <footer className={cn("text-center text-xs mt-12 pt-8 transition-colors duration-200 ease-in-out mt-auto", activeTheme.footerBorderClass, activeTheme.footerTextClass)}>
          <p className="font-semibold tracking-wide">
            Powered by <span className="font-bold">MenuSnap</span>
          </p>
          <p className="mt-1 opacity-80">For inquiries, please contact Color Hut at +8801805561178.</p>
        </footer>
      </main>

      {/* Floating Customer Order Bar & Modal (only in customer QR mode) */}
      {isCustomerMode && (
        <CustomerOrderBar
          cart={cart}
          currencySymbol={currencySymbol}
          businessName={businessName}
          businessPhone={resolvedBusinessPhone}
          draftId={draft?.id || draftId}
          clientId={draft?.clientId || (isDraftOwner ? clientUser?.id : undefined)}
          tableNumber={tableNumber || undefined}
          isParlour={isParlour}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
        />
      )}
    </div>
  );
}

function DraftViewLoadingFallback() {
  return (
    <div className="min-h-screen bg-[#F9F5F0] py-4 sm:py-10 px-2 sm:px-6">
      <div className="max-w-5xl mx-auto p-5 sm:p-10 lg:p-14 rounded-2xl bg-white shadow-xl min-h-[85vh] space-y-10 animate-pulse">
        <div className="flex justify-between items-center pb-8 border-b border-orange-200/60">
          <div className="h-9 w-32 bg-slate-200 rounded-lg" />
          <div className="h-7 w-48 bg-slate-200 rounded" />
        </div>
        <div className="space-y-6">
          <div className="h-6 w-36 bg-slate-200 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="h-16 bg-slate-100 rounded-lg" />
            <div className="h-16 bg-slate-100 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DraftViewPage() {
  return (
    <Suspense fallback={<DraftViewLoadingFallback />}>
      <DraftViewContent />
    </Suspense>
  );
}
