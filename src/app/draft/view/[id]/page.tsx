'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { decodeHtmlEntities } from '@/lib/utils';
import { getCategoriesFromMySql } from '@/app/actions/orders';
import { getUserDraftByIdAction } from '@/app/actions/user-drafts';
import { usePreferences } from '@/context/PreferencesContext';
import { useClientAuth } from '@/hooks/use-client-auth';
import { useToast } from '@/hooks/use-toast';
import type { DraftItemData, DraftSubItem, CategoryLookup } from '@/components/menu/draft-share-dialog';

const DRAFTS_STORAGE_KEY = 'menuBuilderDrafts';

export default function DraftViewPage() {
  const params = useParams();
  const draftId = params.id as string;
  const router = useRouter();
  const { currencySymbol, translateText } = usePreferences();
  const { clientUser } = useClientAuth();
  const { toast } = useToast();

  const [draft, setDraft] = useState<DraftItemData | null>(null);
  const [categories, setCategories] = useState<CategoryLookup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedVariations, setExpandedVariations] = useState<Record<string, boolean>>({});

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

        // If not found in localStorage, fetch from MySQL
        if (!found) {
          const dbRes = await getUserDraftByIdAction(String(draftId));
          if (dbRes.success && dbRes.draft) {
            found = {
              id: dbRes.draft.draftId,
              name: dbRes.draft.draftName,
              createdAt: dbRes.draft.createdAt,
              itemCount: dbRes.draft.itemCount || dbRes.draft.items.length,
              primaryTag: dbRes.draft.primaryTag || 'restaurant',
              items: dbRes.draft.items as any,
            };
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
    if (clientUser?.businessName) {
      return clientUser.businessName;
    }
    if (!draft?.name) return 'Customer Selection';
    return draft.name.replace(/^Draft\s*-\s*/i, '') || draft.name;
  }, [clientUser?.businessName, draft?.name]);

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

    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    const lines: string[] = [
      `Menu Selection for: ${businessName}`,
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

    lines.push(`View menu sheet: ${shareUrl}`);
    lines.push('Prepared with Color Hut Menu Builder');
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
          description: 'Shareable menu text and link copied, ready to send via WhatsApp or chat.',
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
      <div className="bg-muted min-h-screen p-4 sm:p-8">
        <main className="max-w-5xl mx-auto bg-card p-6 sm:p-12 shadow-2xl rounded-lg space-y-8">
          <div className="flex justify-between items-start border-b pb-8">
            <Skeleton className="h-14 w-1/3" />
            <div className="space-y-2 text-right">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          <Skeleton className="h-6 w-40" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </main>
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="bg-muted min-h-screen p-8 flex flex-col items-center justify-center text-center">
        <div className="bg-card p-8 rounded-lg shadow-xl border border-destructive/50 max-w-lg space-y-4">
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

  return (
    <div className="bg-muted min-h-screen p-2 sm:p-6 lg:p-8">
      {/* Top action bar: Back to drafts + Share button (no print) */}
      <header className="max-w-5xl mx-auto flex items-center justify-between gap-2 mb-4 px-2 sm:px-0">
        <Link href="/draft">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Drafts
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={handleShare}
          className="bg-card w-full sm:w-auto shadow-sm hover:bg-muted font-medium gap-2"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4 text-primary" />}
          {copied ? 'Copied!' : 'Share'}
        </Button>
      </header>

      {/* Main presentation sheet matching image 1 */}
      <main className="max-w-5xl mx-auto bg-card text-card-foreground p-6 sm:p-12 shadow-2xl rounded-lg bg-watermark border border-border/40 overflow-hidden">
        {/* Header: Logo on left, For + Date on right */}
        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start border-b pb-8 mb-6 border-border gap-6">
          <div className="bg-black rounded-lg w-full sm:w-auto px-5 py-2.5 flex items-center justify-center shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]">
            <Image
              src="/menusnap-logo-white.png"
              alt="MenuSnap Logo"
              width={180}
              height={48}
              className="h-9 sm:h-11 w-auto object-contain"
              priority
            />
          </div>
          <div className="text-center sm:text-right text-muted-foreground text-sm space-y-1">
            <p className="font-bold text-lg sm:text-2xl text-foreground">
              For: {decodeHtmlEntities(businessName)}
            </p>
            <p className="flex items-center justify-center sm:justify-end gap-2 text-xs sm:text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              {formattedDate}
            </p>
          </div>
        </div>

        {/* Selected Items grouped by category */}
        <section className="space-y-8">
          {Object.keys(groupedItems).length > 0 ? (
            Object.entries(groupedItems).map(([categoryName, items]) => (
              <div key={categoryName}>
                <h3 className="text-xl font-semibold mb-4 border-b-2 border-primary/20 pb-2 text-primary">
                  {translateText(decodeHtmlEntities(categoryName))}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  {items.map((item, index) => {
                    const itemKey = `${item.id || item.name}-${index}`;
                    const isExpanded = !!expandedVariations[itemKey];
                    const hasSubItems = item.subItems && item.subItems.length > 0;

                    return (
                      <div key={itemKey} className="space-y-1">
                        <div className="flex justify-between items-baseline gap-4">
                          <h4 className="font-bold text-foreground text-base">
                            {translateText(decodeHtmlEntities(item.name))}
                          </h4>
                          {item.price > 0 && (
                            <p className="font-bold text-foreground shrink-0">
                              {currencySymbol}{item.price.toLocaleString()}
                            </p>
                          )}
                        </div>

                        {item.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {translateText(decodeHtmlEntities(item.description))}
                          </p>
                        )}

                        {hasSubItems && (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => toggleVariation(itemKey)}
                            className="text-xs h-auto p-0 mt-1 text-primary hover:text-primary/80"
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
                          <div className="mt-2 pl-3 border-l-2 border-primary/20 space-y-1 bg-muted/30 p-2 rounded-r-md">
                            {item.subItems!.map((sub, sIdx) => (
                              <div
                                key={sub.id || sIdx}
                                className="flex justify-between items-baseline text-xs text-muted-foreground p-1 bg-card rounded"
                              >
                                <p className="text-foreground/90">{translateText(decodeHtmlEntities(sub.name))}</p>
                                {typeof sub.price === 'number' && sub.price > 0 && (
                                  <p className="font-medium text-primary">
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
        <footer className="text-center text-muted-foreground text-xs mt-12 pt-8 border-t border-border">
          <p>Menu selection prepared with Color Hut Menu Builder.</p>
          <p>For inquiries, please contact Color Hut at +8801919760626.</p>
        </footer>
      </main>
    </div>
  );
}
