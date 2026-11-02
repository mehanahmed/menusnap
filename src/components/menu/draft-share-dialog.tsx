'use client';

import React, { useMemo, useState } from 'react';
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
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { decodeHtmlEntities } from '@/lib/utils';
import { usePreferences } from '@/context/PreferencesContext';
import { useClientAuth } from '@/hooks/use-client-auth';
import { useToast } from '@/hooks/use-toast';

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

    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/draft/view/${draft.id}`
      : '';

    // Build text summary
    const lines: string[] = [
      `Menu Selection for: ${businessName}`,
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
        description: 'Shareable menu text and link copied, ready to send via WhatsApp or chat.',
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] sm:w-[92vw] max-h-[92vh] p-0 overflow-y-auto bg-muted border border-border shadow-2xl rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Menu Selection Sheet - {businessName}</DialogTitle>
          <DialogDescription>View draft menu items in selection sheet format</DialogDescription>
        </DialogHeader>

        {/* Sticky top action bar */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/30">
              Menu Sheet View
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {draft.itemCount} items
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="bg-card hover:bg-muted font-medium gap-2 shadow-sm text-xs sm:text-sm"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4 text-primary" />}
              {copied ? 'Copied!' : 'Share Text'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/draft/view/${draft.id}` : '';
                const waText = encodeURIComponent(`Menu Selection for: ${businessName}\nView menu sheet: ${shareUrl}`);
                window.open(`https://api.whatsapp.com/send?text=${waText}`, '_blank');
              }}
              className="bg-card hover:bg-muted font-medium gap-1.5 shadow-sm text-xs sm:text-sm text-green-600 hover:text-green-700"
            >
              <span className="text-sm">💬</span> WhatsApp
            </Button>
            <Link href={`/draft/view/${draft.id}`} target="_blank" className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-3.5 w-3.5" /> Full Page
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Sheet Container matching image 1 */}
        <div className="p-3 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto bg-card text-card-foreground p-6 sm:p-12 shadow-xl rounded-xl bg-watermark border border-border/40 overflow-hidden relative">
            {/* Sheet Header: Logo on left, For: Business on right */}
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
                    {/* Orange category header with line */}
                    <h3 className="text-xl font-semibold mb-4 border-b-2 border-primary/20 pb-2 text-primary">
                      {translateText(decodeHtmlEntities(categoryName))}
                    </h3>

                    {/* 2-column food items grid */}
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
