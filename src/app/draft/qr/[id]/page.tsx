'use client';

import React, { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Printer,
  Download,
  Share2,
  ExternalLink,
  Palette,
  Sparkles,
  QrCode as QrIcon,
  Info,
  Loader2,
  CheckCircle2,
  BookmarkCheck,
  AlertTriangle,
  UtensilsCrossed,
} from 'lucide-react';
import { decodeHtmlEntities, cn } from '@/lib/utils';
import { getUserDraftByIdAction } from '@/app/actions/user-drafts';
import { useClientAuth } from '@/hooks/use-client-auth';
import { useToast } from '@/hooks/use-toast';
import { useActiveSavedDraft } from '@/hooks/use-active-saved-draft';
import type { DraftItemData } from '@/components/menu/draft-share-dialog';
import { MENU_SHEET_THEMES, getMenuSheetTheme, type MenuSheetTheme } from '@/components/menu/menu-sheet-themes';
import { MENUSNAP_WHITE_LOGO_DATA_URL } from '@/components/menu/menusnap-logo-data';

const DRAFTS_STORAGE_KEY = 'menuBuilderDrafts';

function DraftQrContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const draftId = params.id as string;
  const router = useRouter();
  const { clientUser } = useClientAuth();
  const { toast } = useToast();

  const [draft, setDraft] = useState<DraftItemData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Active saved draft verification (only active saved draft can have a live QR stand)
  const {
    activeSavedDraftId,
    activeSavedDraftName,
    isDraftSaved,
    saveAsActiveDraft,
    isLoading: isDraftSavedLoading,
  } = useActiveSavedDraft();

  const isSaved = useMemo(() => {
    // If another draft is active in this session, this draft is inactive
    if (activeSavedDraftId && activeSavedDraftId !== draftId) {
      return false;
    }
    if (isDraftSaved(draftId)) {
      return true;
    }
    return Boolean(draft?.isSaved);
  }, [activeSavedDraftId, draftId, isDraftSaved, draft?.isSaved]);

  const [isActivating, setIsActivating] = useState(false);

  const handleSaveAndUnlockQr = async () => {
    if (!draft) return;
    setIsActivating(true);
    try {
      const res = await saveAsActiveDraft({ id: draftId, name: draft.name });
      if (res.success) {
        toast({
          title: 'Active QR Menu Saved!',
          description: `"${decodeHtmlEntities(draft.name)}" is now your active menu. QR Stand unlocked!`,
        });
      } else {
        toast({
          title: 'Save Failed',
          description: res.error || 'Could not save draft.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsActivating(false);
    }
  };

  // Synchronously resolve theme from searchParams (eliminates SSR hydration mismatch)
  const urlTheme = searchParams.get('theme');
  const [selectedThemeId, setSelectedThemeId] = useState<string>(urlTheme || 'sunset');

  useEffect(() => {
    if (urlTheme) {
      setSelectedThemeId(urlTheme);
    } else if (draftId && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`menuSheetTheme_${draftId}`);
      if (saved) setSelectedThemeId(saved);
    }
  }, [urlTheme, draftId]);

  const activeTheme: MenuSheetTheme = useMemo(
    () => getMenuSheetTheme(selectedThemeId),
    [selectedThemeId]
  );

  const businessName = useMemo(() => {
    return clientUser?.businessName || draft?.name || 'Our Menu';
  }, [clientUser?.businessName, draft?.name]);

  // Table number assignment for table-specific QR stands
  const [tableNumber, setTableNumber] = useState<string>('');

  // Construct the public customer view URL (dynamically includes table parameter when assigned)
  const customerMenuUrl = useMemo(() => {
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    if (!origin) return '';
    const base = `${origin}/draft/view/${draftId}?theme=${activeTheme.id}&customer=1`;
    return tableNumber.trim() ? `${base}&table=${encodeURIComponent(tableNumber.trim())}` : base;
  }, [draftId, activeTheme.id, tableNumber]);

  // Fetch draft data
  useEffect(() => {
    async function fetchDraft() {
      if (!draftId) return;
      setIsLoading(true);
      try {
        // Check localStorage first
        const stored = localStorage.getItem(DRAFTS_STORAGE_KEY);
        let found: DraftItemData | null = null;
        if (stored) {
          try {
            const drafts: DraftItemData[] = JSON.parse(stored);
            found = drafts.find((d) => String(d.id) === String(draftId)) || null;
          } catch (_) {}
        }

        // Always check MySQL to ensure fresh isSaved status and as fallback
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
            };
          } else {
            found.isSaved = Boolean(dbDraft.isSaved);
          }
        }

        if (found) {
          setDraft(found);
        } else {
          setError('The requested draft could not be found.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load draft for QR generation.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDraft();
  }, [draftId]);

  // Generate high-resolution QR code whenever customerMenuUrl changes
  useEffect(() => {
    if (!customerMenuUrl) return;

    QRCode.toDataURL(customerMenuUrl, {
      width: 1024,
      margin: 2,
      color: {
        dark: '#111827',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR Generation failed:', err));
  }, [customerMenuUrl]);

  const handleThemeChange = (themeId: string) => {
    setSelectedThemeId(themeId);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`menuSheetTheme_${draftId}`, themeId);
        const url = new URL(window.location.href);
        url.searchParams.set('theme', themeId);
        window.history.replaceState({}, '', url.toString());
      } catch (_) {}
    }
  };


  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    const safeName = (businessName || 'menu').replace(/[^a-zA-Z0-9_-]/g, '_');
    const tableSuffix = tableNumber.trim() ? `-Table_${tableNumber.trim().replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
    a.download = `menu-qr-${safeName}${tableSuffix}-${activeTheme.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({
      title: 'QR Code Downloaded',
      description: `Saved standalone QR code PNG${tableNumber.trim() ? ` for Table ${tableNumber.trim()}` : ` for ${businessName}`}.`,
    });
  };

  const handleDownloadCard = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      // 2.5x pixelRatio for ultra-sharp, high-resolution stand card graphic
      // skipFonts: true prevents html-to-image from scanning remote CSS/Google Fonts stylesheets which throws SecurityError/Error inserting rule
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
        skipFonts: true,
        backgroundColor: activeTheme.isDark ? '#121317' : '#FFFFFF',
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      const safeName = (businessName || 'menu').replace(/[^a-zA-Z0-9_-]/g, '_');
      const tableSuffix = tableNumber.trim() ? `-Table_${tableNumber.trim().replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
      a.download = `menu-stand-card-${safeName}${tableSuffix}-${activeTheme.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast({
        title: 'Stand Card Image Downloaded!',
        description: `Saved stand card graphic${tableNumber.trim() ? ` for Table ${tableNumber.trim()}` : ''} as high-resolution PNG.`,
      });
    } catch (err) {
      console.error('Failed to export stand card image:', err);
      toast({
        title: 'Download Failed',
        description: 'Could not generate stand card image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 p-6 flex flex-col items-center justify-center space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-80 rounded-2xl" />
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="min-h-screen bg-muted/30 p-6 flex flex-col items-center justify-center space-y-4">
        <p className="text-destructive font-semibold">{error || 'Draft not found.'}</p>
        <Button onClick={() => router.back()} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  // Enforcement: Only the single active saved draft can generate and display a QR stand
  if (!isDraftSavedLoading && !isSaved && draft) {
    const isReplacing = Boolean(activeSavedDraftName && activeSavedDraftId !== draftId);

    return (
      <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-10 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-card rounded-2xl border border-border shadow-2xl p-6 sm:p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-xs">
            <QrIcon className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold border border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5" /> Save Required
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Save Draft to Enable QR Stand
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Customer QR stands are strictly reserved for your <strong>single active saved menu</strong>.
              <span className="font-semibold text-foreground block mt-1">"{decodeHtmlEntities(draft.name)}" is currently not saved.</span>
            </p>
          </div>

          {isReplacing && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-left space-y-2 text-xs">
              <p className="font-bold text-amber-700 dark:text-amber-300 text-[11px]">
                Active Menu Replacement Warning:
              </p>
              <div className="bg-background/80 rounded-lg p-2 border border-border flex items-center justify-between">
                <span className="font-medium line-through opacity-70 truncate max-w-[200px]">
                  {decodeHtmlEntities(activeSavedDraftName || 'Previous Menu')}
                </span>
                <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                  Will Unsave
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Only one menu draft can be active at a time. Saving this menu will deactivate the previous one.
              </p>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <Button
              onClick={handleSaveAndUnlockQr}
              disabled={isActivating}
              className="w-full h-10 font-bold text-xs sm:text-sm rounded-xl gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20"
            >
              {isActivating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BookmarkCheck className="w-4 h-4" />
              )}
              <span>
                {isActivating
                  ? 'Saving Menu...'
                  : isReplacing
                  ? 'Unsave Previous & Activate This QR Stand'
                  : 'Save This Draft & Enable QR Stand'}
              </span>
            </Button>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full h-9 text-xs font-semibold rounded-xl border-border bg-card hover:bg-muted"
            >
              <Link href="/draft/">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Saved Drafts
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print-specific style rules */}
      <style jsx global>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          @page {
            size: portrait;
            margin: 6mm auto;
          }
          html,
          body {
            height: 100% !important;
            min-height: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-page-root {
            min-height: calc(100vh - 20mm) !important;
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            padding: 0 !important;
            margin: 0 auto !important;
            background: #ffffff !important;
          }
          .print-main-root {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 auto !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            flex: 1 1 auto !important;
          }
          .print-grid-root {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            flex: 1 1 auto !important;
          }
          .print-card-column {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            flex: 1 1 auto !important;
          }
          .printable-card-wrapper {
            box-shadow: none !important;
            border: 2px solid #e2e8f0 !important;
            margin: auto !important;
            max-width: 440px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-foreground transition-colors print-page-root">
        {/* Top Navigation Bar (Hidden during print) */}
        <header className="no-print sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border shadow-xs">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
            {/* Desktop View (sm and up) */}
            <div className="hidden sm:flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Link href="/draft">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1.5 h-8 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back to Draft
                  </Button>
                </Link>
                <div className="h-4 w-px bg-border" />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm font-bold truncate max-w-xs">
                      {decodeHtmlEntities(businessName)}
                    </h1>
                    {isSaved && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" /> Active Saved Menu
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Digital Menu QR Stand</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <Link href={customerMenuUrl} target="_blank">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-8 text-xs bg-card hover:bg-muted hover:text-foreground font-medium text-foreground shadow-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-primary" /> Preview Menu
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mobile View (below sm) */}
            <div className="sm:hidden space-y-1.5">
              {/* Row 1: Back to Draft */}
              <div className="flex items-center">
                <Link href="/draft">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1.5 h-7 px-2 text-muted-foreground hover:text-foreground -ml-1"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Draft
                  </Button>
                </Link>
              </div>

              {/* Row 2: Title & QR Stand on left, Preview Menu on right */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h1 className="text-sm font-bold truncate text-foreground">
                      {decodeHtmlEntities(businessName)}
                    </h1>
                    {isSaved && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Saved
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Digital Menu QR Stand</p>
                </div>

                <Link href={customerMenuUrl} target="_blank" className="shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-7.5 px-2.5 text-xs bg-card hover:bg-muted hover:text-foreground font-medium text-foreground shadow-xs rounded-lg"
                  >
                    <ExternalLink className="h-3 w-3 text-primary" /> Preview Menu
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 print-main-root">
          {/* Theme Selector (Hidden during print) */}
          <div className="no-print mb-6 sm:mb-8 bg-card border border-border/80 p-2.5 sm:p-3 rounded-2xl shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground px-1 shrink-0">
                <Palette className="w-4 h-4 text-primary" />
                <span className="text-foreground font-bold">Customer Menu Theme</span>
              </div>

              {/* Theme Selector Pills */}
              <div className="flex items-center gap-1 bg-muted/80 p-1 rounded-xl border border-border/60 overflow-x-auto scrollbar-none max-w-full">
                {MENU_SHEET_THEMES.map((theme) => {
                  const isActive = activeTheme.id === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeChange(theme.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
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
          </div>

          {/* Grid: Table Stand Mockup (Printable) on left, Setup details on right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start print-grid-root">
            {/* The Printable Table Stand Card (Takes full width in print) */}
            <div className="lg:col-span-7 flex justify-center print-card-column">
              <div
                ref={cardRef}
                className={cn(
                  "printable-card-wrapper w-full max-w-[390px] sm:max-w-[410px] rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden transition-all duration-300 shadow-xl border",
                  activeTheme.isDark
                    ? "bg-[#121317] text-zinc-100 border-zinc-800"
                    : "bg-white text-slate-900 border-slate-200"
                )}
              >
                {/* Decorative Top Accent Bar */}
                <div
                  className="h-1.5 w-20 mx-auto rounded-full mb-5"
                  style={{ backgroundColor: activeTheme.accentColor }}
                />

                {/* Brand / Logo Container - SVG ensures the dark pill and white logo are rendered as vector content, so browser print engines cannot strip the black background even with 'Background graphics' disabled */}
                <div className="inline-flex items-center justify-center mb-4">
                  <svg
                    width="156"
                    height="40"
                    viewBox="0 0 156 40"
                    className="h-8 sm:h-9 w-auto"
                    xmlns="http://www.w3.org/2000/svg"
                    role="img"
                    aria-label="MenuSnap"
                  >
                    <rect width="156" height="40" rx="8" fill="#121317" />
                    <image
                      href={MENUSNAP_WHITE_LOGO_DATA_URL}
                      xlinkHref={MENUSNAP_WHITE_LOGO_DATA_URL}
                      x="12"
                      y="6"
                      width="132"
                      height="28"
                      preserveAspectRatio="xMidYMid meet"
                    />
                  </svg>
                </div>

                {/* Business Name */}
                <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1 mb-0.5">
                  {decodeHtmlEntities(businessName)}
                </h2>

                {/* Table Badge on Stand (if selected) or Subtitle */}
                {tableNumber.trim() ? (
                  <div
                    className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full mb-4 mt-1 shadow-xs border"
                    style={{
                      backgroundColor: activeTheme.isDark ? '#1F2028' : '#F1F5F9',
                      borderColor: activeTheme.isDark ? '#2E303E' : '#CBD5E1',
                      color: activeTheme.accentColor,
                    }}
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    <span className="text-xs font-black tracking-wider uppercase">
                      Table {tableNumber.replace(/^table\s*/i, '').trim()}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm font-semibold opacity-75 mb-5">
                    Digital Menu & Pricing
                  </p>
                )}

                {/* The QR Code in a crisp framed container */}
                <div className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-md border border-slate-200/80 inline-block mx-auto mb-4">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code for ${businessName}`}
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain mx-auto"
                    />
                  ) : (
                    <Skeleton className="w-48 h-48 sm:w-56 sm:h-56" />
                  )}
                </div>

                {/* Scan Instruction */}
                <div className="space-y-1 mb-5">
                  <p className="text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5">
                    <QrIcon className="w-4 h-4" style={{ color: activeTheme.accentColor }} />
                    <span>Scan with Your Phone Camera</span>
                  </p>
                  <p className="text-[11px] sm:text-xs opacity-70">
                    No app download needed • Instant live menu
                  </p>
                </div>

                {/* Footer Credits */}
                <div className="pt-3.5 border-t border-border/60 text-[11px] opacity-75">
                  <p className="font-medium">Powered by MenuSnap</p>
                  <p className="mt-0.5">For inquiries: +8801919760626</p>
                </div>
              </div>
            </div>

            {/* Right Side: Setup Controls & Instructions (Hidden during print) */}
            <div className="no-print lg:col-span-5 space-y-4 lg:sticky lg:top-20">
              {/* Table Assignment Controller Card */}
              <div className="bg-card border border-border p-4 sm:p-5 rounded-2xl shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <UtensilsCrossed className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Table Assignment</h3>
                      <p className="text-[11px] text-muted-foreground">Pre-assign a table to this QR stand</p>
                    </div>
                  </div>
                  {tableNumber.trim() && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTableNumber('')}
                      className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Reset
                    </Button>
                  )}
                </div>

                {/* Quick Table Presets */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Quick Table Presets
                  </span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((num) => {
                      const isSelected = tableNumber.trim() === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setTableNumber(isSelected ? '' : num)}
                          className={cn(
                            "h-7 rounded-lg text-xs font-bold transition-all border",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/20 scale-105"
                              : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-border/80"
                          )}
                        >
                          T-{num}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Input */}
                <div className="space-y-1 pt-1 border-t border-border/40">
                  <label className="text-[11px] font-medium text-muted-foreground block">
                    Custom Table Name / Zone
                  </label>
                  <Input
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="e.g. 4B, VIP-1, Terrace 2"
                    className="h-8 text-xs rounded-lg"
                  />
                  <p className="text-[10px] text-muted-foreground leading-tight pt-0.5">
                    {tableNumber.trim() ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        Encoded for Table {tableNumber.trim()} — customers won&apos;t have to enter their table!
                      </span>
                    ) : (
                      'Leave empty for a general stand (customers enter table number at checkout).'
                    )}
                  </p>
                </div>
              </div>

              {/* Action Card */}
              <div className="bg-card border border-border p-5 sm:p-6 rounded-2xl shadow-xs space-y-4">
                <h3 className="text-sm sm:text-base font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Ready to Print or Save
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Use this high-resolution QR card on your restaurant tables, salon reception, billing counters, or acrylic stands.
                </p>

                <div className="space-y-2.5 pt-1">
                  <Button
                    onClick={handlePrint}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 h-10 text-sm shadow-xs transition-colors"
                  >
                    <Printer className="h-4 w-4" /> Print Stand Card / Save as PDF
                  </Button>
                  <Button
                    onClick={handleDownloadCard}
                    disabled={isExporting}
                    className="w-full border border-primary/30 bg-card text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary font-semibold gap-2 h-10 text-sm shadow-xs transition-colors group"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-primary group-hover:text-primary-foreground" />
                        Generating Card Image...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 text-primary group-hover:text-primary-foreground transition-colors" />
                        Download Stand Card (PNG)
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleDownloadQr}
                    className="w-full border border-border/80 bg-card text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary font-semibold gap-2 h-10 text-sm shadow-xs transition-colors group"
                  >
                    <QrIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                    Download QR Code Only (PNG)
                  </Button>
                </div>
              </div>

              {/* Print Guidelines */}
              <div className="bg-muted/50 border border-border/70 p-4 rounded-xl text-xs space-y-2">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>How to Save as PDF:</span>
                </p>
                <ol className="list-decimal list-inside text-muted-foreground space-y-1.5 pl-1 leading-relaxed">
                  <li>Click <strong>Print Stand Card / Save as PDF</strong> above.</li>
                  <li>In your browser's print preview window, change the <em>Destination</em> to <strong>Save as PDF</strong>.</li>
                  <li>Click <strong>Save</strong> to get a print-ready vector PDF file.</li>
                </ol>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

function DraftQrLoadingFallback() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 flex items-center justify-center">
      <div className="w-full max-w-sm p-8 bg-card rounded-3xl border border-border/80 shadow-2xl animate-pulse space-y-6">
        <div className="h-10 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg mx-auto" />
        <div className="h-64 w-64 bg-slate-200 dark:bg-slate-800 rounded-2xl mx-auto" />
        <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded mx-auto" />
      </div>
    </div>
  );
}

export default function DraftQrPage() {
  return (
    <Suspense fallback={<DraftQrLoadingFallback />}>
      <DraftQrContent />
    </Suspense>
  );
}

