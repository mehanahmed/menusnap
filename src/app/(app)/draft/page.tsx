
"use client";

import type { ReactNode } from 'react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Clock,
  ListChecks,
  RotateCcw,
  Trash2,
  CalendarDays,
  Tag,
  ChevronRight,
  ChevronDown,
  FileText,
  AlertTriangle,
  Square,
  Utensils,
  Sparkles,
  FolderOpen,
  Share2,
  Camera,
  ShoppingBag,
  CheckCircle2,
  BookmarkCheck,
  Check,
} from "lucide-react";
import { cn, decodeHtmlEntities } from "@/lib/utils";
import { format, formatDistanceToNowStrict, parseISO, isValid } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { getCategoriesFromMySql } from '@/app/actions/orders';
import { usePreferences } from '@/context/PreferencesContext';
import { DraftShareDialog } from '@/components/menu/draft-share-dialog';
import { MenuScannerDialog } from '@/components/menu/menu-scanner-dialog';
import { useClientAuth } from '@/hooks/use-client-auth';
import { batchSyncUserDraftsAction, deleteUserDraftAction, getUserDraftsAction, saveUserDraftAction } from '@/app/actions/user-drafts';
import { useActiveSavedDraft } from '@/hooks/use-active-saved-draft';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

const STATIC_AVATAR_IMAGE_URL = '/assets/image.svg';
const DRAFTS_STORAGE_KEY = 'menuBuilderDrafts';


interface Category {
  id: string;
  name: string;
  icon: string;
  itemCount?: number;
  status?: string;
  createdAt?: string;
  description?: string;
  visibleToUsers?: boolean;
}

interface DraftSubItem {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  category?: string;
  categoryName?: string;
  description?: string | null;
  image?: string | null;
  subItems?: Array<{ id?: string; name: string; price?: number }>;
}

interface DraftItem {
  id: string;
  name: string;
  createdAt: string;
  itemCount: number;
  primaryTag: string;
  price: number;
  previewAvatars: string[];
  items?: DraftSubItem[];
  isSaved?: boolean;
  clientId?: number | null;
}

interface DraftCardProps {
  draft: DraftItem;
  isExpanded: boolean;
  isSaved: boolean;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleExpand: (id: string) => void;
  masterCategoryList: Category[];
  onShare: (draft: DraftItem) => void;
  onSaveDraft: (draft: DraftItem) => void;
}

const extractMenuTypeFromTag = (tag: string): string => {
  if (!tag) return 'Unknown Type';
  const parts = tag.split('-');
  if (parts.length > 0) {
    const type = parts[0];
    const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
    if (capitalizedType === "Restaurant" || capitalizedType === "Parlour") {
      return capitalizedType;
    }
  }
  return 'Unknown Type';
};

function DraftCard({ draft, isExpanded, isSaved, onRestore, onDelete, onToggleExpand, masterCategoryList, onShare, onSaveDraft }: DraftCardProps): ReactNode {
  const { currencySymbol, t } = usePreferences();
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const createdAtDate = parseISO(draft.createdAt);
  const isValidDate = isValid(createdAtDate);

  const formattedTitleDate = isValidDate ? format(createdAtDate, 'dd/MM/yyyy') : 'Invalid Date';
  const relativeTime = isValidDate && hasMounted ? formatDistanceToNowStrict(createdAtDate, { addSuffix: true }) : 'Calculating...';
  const formattedCreationDate = isValidDate ? format(createdAtDate, 'EEE, MMM d, hh:mm a') : 'Invalid Date';
  const formattedShortDateBadge = isValidDate ? format(createdAtDate, 'MMM d') : 'N/A';

  const avatarsToShowCount = Math.min(draft.itemCount > 0 ? 3 : draft.previewAvatars.length, 3);
  const remainingAvatars = Math.max(0, draft.itemCount - avatarsToShowCount);

  const menuTypeDisplay = extractMenuTypeFromTag(draft.primaryTag);
  const MenuTypeIcon = menuTypeDisplay === 'Parlour' ? Sparkles : Utensils;

  const idPrefixForDraft = useMemo(() => {
    const type = draft.primaryTag.split('-')[0].toLowerCase();
    return (type === "restaurant" || type === "parlour") ? type : "unknown";
  }, [draft.primaryTag]);

  const itemsByCategoryId = useMemo(() => {
    if (!draft.items) return {};
    return draft.items.reduce((acc, item) => {
      const catKey = String(item.categoryId || (item as any).category || 'general');
      if (!acc[catKey]) acc[catKey] = [];
      acc[catKey].push(item);
      return acc;
    }, {} as Record<string, DraftSubItem[]>);
  }, [draft.items]);

  const categoriesInDraftOrder = useMemo(() => {
    if (!draft.items) return [];

    const categoryMap = new Map<string, { id: string; name: string; icon: string | ReactNode }>();

    draft.items.forEach(item => {
      const catKey = String(item.categoryId || (item as any).category || 'general');
      const prefixedId = idPrefixForDraft !== 'unknown' ? `${idPrefixForDraft}-${catKey}` : catKey;

      if (!categoryMap.has(catKey)) {
        // Try finding matching category from masterCategoryList
        const masterCat = masterCategoryList?.find(c =>
          c.id === prefixedId ||
          c.id === catKey ||
          c.name.toLowerCase() === catKey.toLowerCase()
        );

        if (masterCat) {
          categoryMap.set(catKey, {
            id: catKey,
            name: masterCat.name,
            icon: masterCat.icon || (idPrefixForDraft === 'parlour' ? '✨' : '📁')
          });
        } else {
          // Dynamic category from scanned menu or custom draft
          const displayName = (item as any).category || (catKey !== 'unknown' && catKey !== 'general' ? catKey : 'General');
          categoryMap.set(catKey, {
            id: catKey,
            name: decodeHtmlEntities(displayName),
            icon: idPrefixForDraft === 'parlour' ? '✨' : '🍽️'
          });
        }
      }
    });

    return Array.from(categoryMap.values());
  }, [draft.items, masterCategoryList, idPrefixForDraft]);


  return (
    <Card className="shadow-lg rounded-xl overflow-hidden bg-card border border-border transition-all hover:shadow-xl">
      <CardHeader className="p-2 pb-1">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-bold text-primary truncate max-w-[200px]">{`${decodeHtmlEntities(draft.name)}`}</h3>
            <div className="flex items-center space-x-2 text-[10px] text-muted-foreground mt-0.5">
              <span className="flex items-center"><Clock className="h-3 w-3 mr-1" /> {relativeTime}</span>
              <span className="flex items-center"><ListChecks className="h-3 w-3 mr-1" /> {draft.itemCount} items</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onShare(draft)} aria-label="Share draft" title="Share Draft">
              <Share2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              onClick={() => onRestore(draft.id)}
              aria-label="Restore draft"
              title="Restore to MagicTab"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(draft.id)} aria-label="Delete draft">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {isSaved && (
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold py-0.5 px-2 text-[9px] flex items-center gap-1 shadow-2xs">
              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
              Active Saved Menu
            </Badge>
          )}
          <Badge variant="default" className="bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-700/20 dark:text-orange-400 dark:border-orange-600 font-normal py-0.5 px-2 text-[9px]">
            <MenuTypeIcon className="h-2.5 w-2.5 mr-1 opacity-80" />
            {menuTypeDisplay}
          </Badge>
          <Badge variant="outline" className="border-border text-muted-foreground font-medium py-0.5 px-2 text-[9px]">
            <CalendarDays className="h-2.5 w-2.5 mr-1 opacity-70" />
            {formattedShortDateBadge}
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex -space-x-2">
            {Array.from({ length: avatarsToShowCount }).map((_, index) => (
              <Avatar key={index} className="h-7 w-7 border-2 border-card shadow-sm bg-muted">
                <AvatarImage
                  src={STATIC_AVATAR_IMAGE_URL}
                  alt="Item preview"
                  data-ai-hint="item illustration"
                  className="object-contain"
                />
                <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                  {draft.previewAvatars[index] || '?'}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          {remainingAvatars > 0 && (
            <span className="text-xs font-medium text-muted-foreground ml-1">+{remainingAvatars}</span>
          )}
          <Button
            variant="link"
            className="text-xs h-auto p-0 text-primary hover:text-primary/80"
            onClick={() => onToggleExpand(draft.id)}
            disabled={!draft.items || draft.items.length === 0}
          >
            {isExpanded ? "Hide details" : "Show details"}
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5 ml-0.5" /> : <ChevronRight className="h-3.5 w-3.5 ml-0.5" />}
          </Button>
        </div>
        {isExpanded && draft.items && draft.items.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border space-y-4">
            {categoriesInDraftOrder.map(category => {
              const itemsForCategory = itemsByCategoryId[category.id] || [];
              if (itemsForCategory.length === 0) return null;

              return (
                <div key={category.id}>
                  <div className="flex items-center mb-2">
                    <span className="text-lg mr-2 text-primary">{category.icon || <FolderOpen className="h-5 w-5" />}</span>
                    <h4 className="text-md font-semibold text-foreground">{decodeHtmlEntities(category.name)}</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {itemsForCategory.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
                        <div className="flex items-center overflow-hidden mr-2">
                          <Square className="h-4 w-4 text-muted-foreground mr-2 opacity-50 shrink-0" />
                          <span className="text-foreground truncate" title={decodeHtmlEntities(item.name)}>{decodeHtmlEntities(item.name)}</span>
                        </div>
                        <span className="text-muted-foreground font-medium whitespace-nowrap">{currencySymbol}{item.price.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {categoriesInDraftOrder.length === 0 && (
              <div className="mt-4 pt-4 border-t border-border text-center text-sm text-muted-foreground">
                Could not match items to any known categories for this draft type.
              </div>
            )}
          </div>
        )}
        {isExpanded && (!draft.items || draft.items.length === 0) && (
          <div className="mt-4 pt-4 border-t border-border text-center text-sm text-muted-foreground">
            No item details available for this draft.
          </div>
        )}
      </CardContent>
      <CardFooter className="bg-muted/20 px-2 py-1.5 flex justify-between items-center border-t border-border/50">
        <p className="text-[9px] text-muted-foreground opacity-70">Saved {formattedCreationDate}</p>
        <div className="flex items-center gap-1.5">
          {isSaved ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Saved Menu
            </span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] font-bold px-2.5 flex items-center gap-1 border-amber-500/40 bg-card text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 hover:text-amber-700 dark:hover:text-amber-300 hover:border-amber-500 shadow-2xs transition-colors"
              onClick={() => onSaveDraft(draft)}
              title="Save as active QR menu"
            >
              <BookmarkCheck className="h-3 w-3" />
              Save Draft
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] font-semibold px-2.5 flex items-center gap-1 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
            onClick={() => onShare(draft)}
          >
            <Share2 className="h-3 w-3" />
            Share
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-7 text-[10px] bg-foreground text-background hover:bg-foreground/80 font-bold px-3"
            onClick={() => onRestore(draft.id)}
          >
            Restore
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function DraftSkeletonCard(): ReactNode {
  return (
    <Card className="shadow-lg rounded-xl overflow-hidden bg-card border-border">
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex justify-between items-start">
          <div>
            <Skeleton className="h-6 w-48 mb-1.5" />
            <div className="flex items-center space-x-3 mt-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 pt-2 pb-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Skeleton className="h-6 w-24 rounded-full" /> { }
          <Skeleton className="h-6 w-20 rounded-full" /> { }
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex -space-x-2">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-7 w-7 rounded-full" />
          </div>
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
      <CardFooter className="bg-muted/30 px-5 py-3 flex justify-between items-center border-t border-border">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </CardFooter>
    </Card>
  );
}


export default function DraftPage(): ReactNode {
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDrafts, setExpandedDrafts] = useState<Record<string, boolean>>({});
  const [masterCategoryList, setMasterCategoryList] = useState<Category[]>([]);
  const [selectedDraftForShare, setSelectedDraftForShare] = useState<DraftItem | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const { clientUser } = useClientAuth();
  const { currencySymbol } = usePreferences();
  const { toast } = useToast();
  const router = useRouter();

  // Active saved draft management (single active draft rule)
  const { activeSavedDraftId, activeSavedDraftName, isDraftSaved, saveAsActiveDraft } = useActiveSavedDraft();
  const [draftToSave, setDraftToSave] = useState<DraftItem | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const previousSavedDraft = useMemo(() => {
    if (!activeSavedDraftId) return null;
    return (
      drafts.find((d) => d.id === activeSavedDraftId) || {
        id: activeSavedDraftId,
        name: activeSavedDraftName || 'Active Menu',
      }
    );
  }, [activeSavedDraftId, activeSavedDraftName, drafts]);

  const isReplacingSavedDraft = Boolean(
    draftToSave &&
    previousSavedDraft &&
    previousSavedDraft.id !== draftToSave.id
  );

  const handleInitiateSaveDraft = (draft: DraftItem) => {
    setDraftToSave(draft);
  };

  const handleConfirmSaveDraft = async () => {
    if (!draftToSave) return;
    setIsSavingDraft(true);
    try {
      const res = await saveAsActiveDraft(draftToSave);
      if (res.success) {
        toast({
          title: 'Active QR Menu Saved!',
          description: `"${decodeHtmlEntities(draftToSave.name)}" is now your active saved menu. QR stands are enabled for this menu.`,
        });
      } else {
        toast({
          title: 'Save Failed',
          description: res.error || 'Could not save draft as active menu.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSavingDraft(false);
      setDraftToSave(null);
    }
  };

  // Redirect legacy ?tab=orders links to dedicated Customer QR Orders page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'orders') {
        router.replace('/customer-orders/');
      }
    }
  }, [router]);

  const handleDraftCreated = (newDraft: DraftItem) => {
    setDrafts(prev => [newDraft, ...prev]);
    setExpandedDrafts(prev => ({ ...prev, [newDraft.id]: true }));
  };

  useEffect(() => {
    async function fetchAllCategories() {
      setIsLoadingCategories(true);
      try {
        const result = await getCategoriesFromMySql();

        if (!result.success) {
            throw new Error(result.message || "Failed to fetch categories from local DB");
        }

        const categories = result.data as any[];
        const combinedCategories: Category[] = categories.map((cat: any): Category => ({
            id: `${cat.type}-${String(cat.id)}`,
            name: String(cat.name || 'Unnamed Category'),
            icon: String(cat.icon || (cat.type === 'parlour' ? '✨' : '📁')),
            visibleToUsers: Boolean(cat.visibleToUsers)
        }));

        setMasterCategoryList(combinedCategories);
      } catch (e) {
        console.error("Error fetching master category list:", e);
        toast({ title: "Error", description: "Could not load category details from local DB.", variant: "destructive" });
      } finally {
        setIsLoadingCategories(false);
      }
    }
    fetchAllCategories();
  }, [toast]);

  useEffect(() => {
    let isCancelled = false;
    async function loadDrafts() {
      setIsLoading(true);
      setError(null);

      // 1. Commit active draft staged from MagicTab if any
      const activeDraftRaw = localStorage.getItem('magicTabActiveDraft');
      let storedDrafts = localStorage.getItem(DRAFTS_STORAGE_KEY);
      let stagedDrafts: any[] = [];
      if (storedDrafts) {
        try {
          stagedDrafts = JSON.parse(storedDrafts);
        } catch {
          stagedDrafts = [];
        }
      }

      // Synchronously resolve current logged-in client if auth state is still loading
      let effectiveClientId = clientUser?.id;
      let effectiveBusinessName = clientUser?.businessName;
      let effectiveBusinessType = clientUser?.type;
      let effectiveWhatsapp = clientUser?.whatsappNumber;
      let effectiveEmail = clientUser?.email;

      if (!effectiveClientId && typeof window !== 'undefined') {
        try {
          const rawClient = localStorage.getItem('colorHutClientUser');
          if (rawClient) {
            const u = JSON.parse(rawClient);
            effectiveClientId = u.id;
            effectiveBusinessName = u.businessName || u.name;
            effectiveBusinessType = u.type || u.businessType;
            effectiveWhatsapp = u.whatsappNumber || u.phone;
            effectiveEmail = u.email;
          }
        } catch {}
      }

      if (activeDraftRaw) {
        try {
          const activeDraft = JSON.parse(activeDraftRaw);
          if (activeDraft && Array.isArray(activeDraft.items) && activeDraft.items.length > 0) {
            const finalDraftId = activeDraft.id || `draft-${Date.now()}`;
            const finalDraftName = activeDraft.name || `Draft - ${new Date().toLocaleString()}`;
            const finalDraft = {
              id: finalDraftId,
              name: finalDraftName,
              createdAt: activeDraft.createdAt || new Date().toISOString(),
              itemCount: activeDraft.items.length,
              primaryTag: activeDraft.primaryTag || 'restaurant',
              price: activeDraft.price || activeDraft.items.reduce((s: number, i: any) => s + Number(i.price || 0), 0),
              previewAvatars: Array.isArray(activeDraft.previewAvatars) && activeDraft.previewAvatars.length > 0
                ? activeDraft.previewAvatars
                : activeDraft.items.slice(0, 3).map((i: any) => (i.name ? i.name.charAt(0) : '?')),
              items: activeDraft.items,
              clientId: effectiveClientId || activeDraft.clientId || undefined,
            };

            if (activeDraft.restoredFromId) {
              const existingIdx = stagedDrafts.findIndex((d: any) => String(d.id) === String(activeDraft.restoredFromId));
              if (existingIdx !== -1) {
                stagedDrafts[existingIdx] = {
                  ...stagedDrafts[existingIdx],
                  ...finalDraft,
                  id: activeDraft.restoredFromId,
                };
              } else {
                stagedDrafts.unshift(finalDraft);
              }
            } else {
              const existingIdx = stagedDrafts.findIndex((d: any) => String(d.id) === String(finalDraftId));
              if (existingIdx !== -1) {
                stagedDrafts[existingIdx] = finalDraft;
              } else {
                stagedDrafts.unshift(finalDraft);
              }
            }

            localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(stagedDrafts));
            storedDrafts = JSON.stringify(stagedDrafts);

            // Immediately persist this new draft to MySQL if client is authenticated
            if (effectiveClientId || effectiveBusinessName) {
              saveUserDraftAction({
                draftId: finalDraft.id,
                draftName: finalDraft.name,
                businessName: effectiveBusinessName || (finalDraft.primaryTag === 'parlour' ? 'Anonymous Parlour' : 'Anonymous Restaurant'),
                businessType: effectiveBusinessType || (finalDraft.primaryTag === 'parlour' ? 'parlour' : 'restaurant'),
                whatsappNumber: effectiveWhatsapp,
                email: effectiveEmail,
                clientId: effectiveClientId,
                primaryTag: finalDraft.primaryTag,
                items: finalDraft.items || [],
                itemCount: finalDraft.itemCount,
                createdAt: finalDraft.createdAt,
              }).catch((syncErr: any) => console.error('[DraftPage] Error syncing staged draft:', syncErr));
            }
          }
        } catch (commitErr) {
          console.error("Error committing active draft in DraftPage:", commitErr);
        } finally {
          localStorage.removeItem('magicTabActiveDraft');
        }
      }

      // 2. Authoritative client drafts from MySQL if logged in
      if (effectiveClientId || effectiveBusinessName) {
        try {
          const dbRes = await getUserDraftsAction({
            clientId: effectiveClientId || undefined,
            businessName: !effectiveClientId ? (effectiveBusinessName || undefined) : undefined,
            limit: 100,
          });

          if (!isCancelled && dbRes.success) {
            const serverDrafts: DraftItem[] = dbRes.drafts.map((d) => ({
              id: d.draftId,
              name: d.draftName,
              createdAt: d.createdAt,
              itemCount: d.itemCount || d.items.length,
              primaryTag: d.primaryTag || 'restaurant',
              price: d.items.reduce((s, it) => s + (Number(it.price) || 0), 0),
              previewAvatars: d.items.slice(0, 3).map((it) => (it.name ? it.name.charAt(0) : '?')),
              items: d.items.map((it: any) => ({
                id: it.id ? String(it.id) : `item-${Math.random()}`,
                name: String(it.name || 'Unnamed Dish'),
                price: Number(it.price) || 0,
                categoryId: it.categoryId ? String(it.categoryId) : (it.category ? String(it.category) : 'unknown'),
                category: it.category ? String(it.category) : undefined,
                categoryName: it.categoryName ? String(it.categoryName) : undefined,
                description: it.description || null,
                image: it.image || null,
                subItems: Array.isArray(it.subItems) ? it.subItems : [],
              })),
              isSaved: Boolean(d.isSaved),
            }));

            // Merge local staged drafts that belong to this client and are not yet on the server
            const serverDraftIdSet = new Set(serverDrafts.map((sd) => String(sd.id)));
            const localUnsyncedDrafts: DraftItem[] = [];

            for (const ld of stagedDrafts) {
              if (!ld || !ld.id) continue;
              // Strict tenant isolation: skip drafts that belong to a different client
              if (effectiveClientId && ld.clientId && Number(ld.clientId) !== Number(effectiveClientId)) {
                continue;
              }
              if (!serverDraftIdSet.has(String(ld.id))) {
                localUnsyncedDrafts.push({
                  id: String(ld.id),
                  name: String(ld.name || 'Saved Draft'),
                  createdAt: ld.createdAt || new Date().toISOString(),
                  itemCount: typeof ld.itemCount === 'number' ? ld.itemCount : (Array.isArray(ld.items) ? ld.items.length : 0),
                  primaryTag: ld.primaryTag || 'restaurant',
                  price: typeof ld.price === 'number' ? ld.price : (Array.isArray(ld.items) ? ld.items.reduce((s: number, i: any) => s + Number(i.price || 0), 0) : 0),
                  previewAvatars: Array.isArray(ld.previewAvatars) && ld.previewAvatars.length > 0
                    ? ld.previewAvatars
                    : (Array.isArray(ld.items) ? ld.items.slice(0, 3).map((i: any) => (i.name ? i.name.charAt(0) : '?')) : []),
                  items: Array.isArray(ld.items)
                    ? ld.items.map((it: any) => ({
                        id: it.id ? String(it.id) : `item-${Math.random()}`,
                        name: String(it.name || 'Unnamed Dish'),
                        price: Number(it.price) || 0,
                        categoryId: it.categoryId ? String(it.categoryId) : (it.category ? String(it.category) : 'unknown'),
                        category: it.category ? String(it.category) : undefined,
                        categoryName: it.categoryName ? String(it.categoryName) : undefined,
                        description: it.description || null,
                        image: it.image || null,
                        subItems: Array.isArray(it.subItems) ? it.subItems : [],
                      }))
                    : [],
                  isSaved: false,
                });
              }
            }

            const combinedDrafts = [...localUnsyncedDrafts, ...serverDrafts];

            setDrafts(combinedDrafts);
            if (typeof window !== 'undefined') {
              if (combinedDrafts.length > 0) {
                localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(combinedDrafts));
              } else {
                localStorage.removeItem(DRAFTS_STORAGE_KEY);
              }
            }

            // Sync any local un-synced drafts to MySQL in the background
            if (localUnsyncedDrafts.length > 0 && effectiveClientId) {
              batchSyncUserDraftsAction(
                localUnsyncedDrafts.map((d) => ({
                  draftId: d.id,
                  draftName: d.name,
                  businessName: effectiveBusinessName || (d.primaryTag === 'parlour' ? 'Anonymous Parlour' : 'Anonymous Restaurant'),
                  businessType: effectiveBusinessType || (d.primaryTag === 'parlour' ? 'parlour' : 'restaurant'),
                  whatsappNumber: effectiveWhatsapp,
                  email: effectiveEmail,
                  clientId: effectiveClientId,
                  primaryTag: d.primaryTag,
                  items: d.items || [],
                  itemCount: d.itemCount,
                  createdAt: d.createdAt,
                }))
              ).catch((err: any) => console.error('[DraftPage] Background sync of unsynced drafts failed:', err));
            }

            setIsLoading(false);
            return;
          }
        } catch (fetchErr) {
          console.error('Error fetching client drafts from MySQL:', fetchErr);
        }
      }

      // 3. Fallback to localStorage if guest or offline
      if (storedDrafts) {
        try {
          const parsedDrafts: any[] = JSON.parse(storedDrafts);
          const validatedDrafts = parsedDrafts
            .filter((d: any) => {
              if (effectiveClientId && d.clientId && Number(d.clientId) !== Number(effectiveClientId)) {
                return false;
              }
              return true;
            })
            .map((draft) => {
              const validatedItems = Array.isArray(draft.items)
                ? draft.items.map((item: any) => ({
                    ...item,
                    categoryId: item.categoryId || item.category || 'unknown',
                    description: item.description || null,
                    image: item.image || null,
                    subItems: Array.isArray(item.subItems) ? item.subItems : [],
                  }))
                : [];
              return {
                ...draft,
                items: validatedItems,
                previewAvatars: Array.isArray(draft.previewAvatars) ? draft.previewAvatars : [],
              };
            });
          setDrafts(validatedDrafts);
        } catch (_) {
          setDrafts([]);
        }
      } else {
        setDrafts([]);
      }

      setIsLoading(false);
    }

    loadDrafts();

    return () => {
      isCancelled = true;
    };
  }, [clientUser?.id, clientUser?.businessName, toast]);

  const handleRestoreDraft = (id: string) => {
    try {
      localStorage.setItem('draftToRestoreId', id);
      router.push('/magictab');
      toast({ title: "Restoring Draft...", description: "You will be redirected to the MagicTab page." });
    } catch (e) {
      console.error("Error setting item in localStorage for draft restoration:", e);
      toast({ title: "Error", description: "Could not initiate draft restoration.", variant: "destructive" });
    }
  };

  const handleShareDraft = (draft: DraftItem) => {
    setSelectedDraftForShare(draft);
  };

  const handleDeleteDraft = (id: string) => {
    const draftName = drafts.find(d => d.id === id)?.name || "Draft";

    try {
      const storedDrafts = localStorage.getItem(DRAFTS_STORAGE_KEY);
      let updatedDrafts: DraftItem[] = [];
      if (storedDrafts) {
        const parsedDrafts: DraftItem[] = JSON.parse(storedDrafts);
        updatedDrafts = parsedDrafts.filter(draft => draft.id !== id);
        localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(updatedDrafts));
      }
      deleteUserDraftAction(id).catch(() => {});
      if (id === activeSavedDraftId && typeof window !== 'undefined') {
        localStorage.removeItem('menusnap_active_saved_draft_id');
        localStorage.removeItem('menusnap_active_saved_draft_name');
      }
      setDrafts(prevDrafts => prevDrafts.filter(draft => draft.id !== id));
      setExpandedDrafts(prev => {
        const newExpanded = { ...prev };
        delete newExpanded[id];
        return newExpanded;
      });
      toast({ title: "Draft Deleted", description: `"${decodeHtmlEntities(draftName)}" has been removed.` });
    } catch (e) {
      console.error("Error deleting draft from localStorage:", e);
      toast({ title: "Error", description: "Could not remove draft from storage.", variant: "destructive" });
    }
  };

  const handleToggleExpand = (id: string) => {
    setExpandedDrafts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredDrafts = useMemo(() => {
    if (!searchTerm) return drafts;
    return drafts.filter(draft =>
      decodeHtmlEntities(draft.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
      extractMenuTypeFromTag(draft.primaryTag).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (isValid(parseISO(draft.createdAt)) && format(parseISO(draft.createdAt), 'dd/MM/yyyy').includes(searchTerm))
    );
  }, [drafts, searchTerm]);

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden p-2 sm:p-3 lg:p-4 space-y-4 pb-40 md:pb-12">

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/60 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search saved drafts by title, dish, or date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs sm:text-sm bg-background border-border/70 rounded-xl"
          />
        </div>
        <Button
          onClick={() => setIsScannerOpen(true)}
          className="h-9 text-xs sm:text-sm font-bold gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl shadow-sm shrink-0"
        >
          <Camera className="w-4 h-4" />
          Scan Menu Photo
        </Button>
      </div>

      <main className="space-y-6">
        {isLoading || isLoadingCategories ? (
          Array.from({ length: 3 }).map((_, index) => <DraftSkeletonCard key={index} />)
        ) : error ? (
          <div className="flex flex-col items-center justify-center text-center py-10 bg-card border border-destructive/50 rounded-lg shadow-md">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Drafts</h2>
            <p className="text-muted-foreground max-w-md">{error}</p>
          </div>
        ) : filteredDrafts.length === 0 ? (
          <div className="text-center py-12 px-4 bg-card rounded-2xl shadow-sm border border-border space-y-4">
            <div className="w-16 h-16 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto">
              <Camera className="h-8 w-8" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <p className="text-foreground text-lg font-bold">
                {searchTerm ? "No drafts match your search." : "No saved drafts yet"}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {searchTerm
                  ? "Try searching for a different dish name or menu type."
                  : "Upload a photo of your printed menu or price list to instantly create a digital draft."}
              </p>
            </div>
            {!searchTerm && (
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                <Button
                  onClick={() => setIsScannerOpen(true)}
                  className="h-9 text-xs font-bold gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl shadow-md"
                >
                  <Camera className="w-4 h-4" />
                  Scan Menu Photo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/magictab')}
                  className="h-9 text-xs font-semibold rounded-xl"
                >
                  Browse Item Database
                </Button>
              </div>
            )}
          </div>
        ) : (
          filteredDrafts.map(draft => (
            <DraftCard
              key={draft.id}
              draft={draft}
              isExpanded={!!expandedDrafts[draft.id]}
              isSaved={isDraftSaved(draft.id)}
              onRestore={handleRestoreDraft}
              onDelete={handleDeleteDraft}
              onToggleExpand={handleToggleExpand}
              masterCategoryList={masterCategoryList}
              onShare={handleShareDraft}
              onSaveDraft={handleInitiateSaveDraft}
            />
          ))
        )}
      </main>

      <DraftShareDialog
        isOpen={!!selectedDraftForShare}
        onOpenChange={(open) => !open && setSelectedDraftForShare(null)}
        draft={selectedDraftForShare}
        masterCategoryList={masterCategoryList}
      />

      <MenuScannerDialog
        isOpen={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onDraftCreated={handleDraftCreated}
      />

      {/* Save Draft as Active Menu Confirmation Modal */}
      <AlertDialog
        open={Boolean(draftToSave)}
        onOpenChange={(open) => {
          if (!open && !isSavingDraft) {
            setDraftToSave(null);
            if (typeof document !== 'undefined') {
              document.body.style.pointerEvents = '';
              document.body.removeAttribute('data-scroll-locked');
            }
          }
        }}
      >
        <AlertDialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            if (typeof document !== 'undefined') {
              document.body.style.pointerEvents = '';
              document.body.removeAttribute('data-scroll-locked');
            }
          }}
          className="max-w-md w-[92vw] rounded-2xl p-5 border border-border shadow-2xl bg-card"
        >
          <AlertDialogHeader className="space-y-2 text-left">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                isReplacingSavedDraft
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              )}
            >
              {isReplacingSavedDraft ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <BookmarkCheck className="w-5 h-5" />
              )}
            </div>

            <AlertDialogTitle className="text-base font-bold text-foreground">
              {isReplacingSavedDraft ? "Replace Active Saved Menu?" : "Save as Active QR Menu?"}
            </AlertDialogTitle>

            <AlertDialogDescription asChild>
              <div className="text-xs text-muted-foreground space-y-3 pt-1">
                {isReplacingSavedDraft && previousSavedDraft ? (
                  <>
                    <p className="leading-relaxed">
                      Only <strong>one draft can be saved as your active QR menu</strong> at a time. Saving this menu will automatically <strong>unsave</strong> your previous menu:
                    </p>

                    <div className="space-y-2 bg-muted/40 p-3 rounded-xl border border-border/60">
                      {/* Previous saved draft to be unsaved */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                            Currently Saved
                          </span>
                          <span className="font-semibold text-foreground text-xs line-through opacity-70 truncate block">
                            {decodeHtmlEntities(previousSavedDraft.name || 'Previous Draft')}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-bold text-destructive border-destructive/30 bg-destructive/10 shrink-0">
                          Will Unsave
                        </Badge>
                      </div>

                      {/* New draft to be saved */}
                      <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                            New Active Menu
                          </span>
                          <span className="font-bold text-foreground text-xs truncate block">
                            {draftToSave ? decodeHtmlEntities(draftToSave.name) : 'Selected Draft'}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/10 shrink-0">
                          Will Activate
                        </Badge>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-normal">
                      When confirmed, all customer QR stands and table scans will immediately display this new menu.
                    </p>
                  </>
                ) : (
                  <p className="leading-relaxed">
                    Set <strong className="text-foreground">"{draftToSave ? decodeHtmlEntities(draftToSave.name) : 'Draft'}"</strong> as your active saved menu. This will enable its live customer QR stand for printing, tabletop acrylic stands, and smartphone scanning.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex-row items-center justify-end gap-2 pt-3 sm:space-x-0">
            <AlertDialogCancel
              disabled={isSavingDraft}
              onClick={() => {
                setDraftToSave(null);
                if (typeof document !== 'undefined') {
                  document.body.style.pointerEvents = '';
                  document.body.removeAttribute('data-scroll-locked');
                }
              }}
              className="mt-0 h-9 rounded-xl text-xs font-semibold flex-1 sm:flex-none border-border"
            >
              Cancel
            </AlertDialogCancel>

            <Button
              disabled={isSavingDraft}
              onClick={handleConfirmSaveDraft}
              className={cn(
                "h-9 rounded-xl text-xs font-bold gap-1.5 flex-1 sm:flex-none shadow-sm text-white",
                isReplacingSavedDraft
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              {isSavingDraft ? (
                <span className="animate-spin">⏳</span>
              ) : isReplacingSavedDraft ? (
                <BookmarkCheck className="w-3.5 h-3.5" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>
                {isSavingDraft
                  ? 'Saving...'
                  : isReplacingSavedDraft
                  ? 'Unsave & Activate New'
                  : 'Confirm & Save'}
              </span>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
