"use client";

import type { ReactNode } from 'react';
import React, { useMemo, useState, useEffect } from 'react';
import {
  Edit,
  PlusCircle,
  Search,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, decodeHtmlEntities } from "@/lib/utils";
import { usePreferences } from '@/context/PreferencesContext';

function formatCategoryName(name: string): string {
  if (!name) return "";
  const decoded = decodeHtmlEntities(name);
  return decoded
    .replace(/\s+/g, ' ')
    .replace(/\s*\(\s*/g, ' (')
    .replace(/\s*\)\s*/g, ')')
    .trim();
}

// Re-defining the interface here to make the component self-contained
interface Category {
  id: string; 
  name: string;
  icon: string;
  itemCount?: number;
  totalCount?: number;
  status?: string;
  createdAt?: string;
  description?: string;
  visibleToUsers?: boolean;
}

interface CategoryListProps {
  categories: Category[];
  activeCategoryId?: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  onEditCategory?: (category: Category) => void;
  onQuickAdd?: (name: string) => void;
  loading: boolean;
  error: string | null;
}

function CategoryListComponent({
  categories,
  activeCategoryId,
  onCategoryChange,
  onEditCategory,
  onQuickAdd,
  loading,
  error,
}: CategoryListProps): ReactNode {

  const { t, translateText, translateBatch, language } = usePreferences();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(activeCategoryId ?? null);
  const [catSearch, setCatSearch] = useState('');

  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeCategoryId !== undefined) {
      setSelectedCategoryId(activeCategoryId);
    }
  }, [activeCategoryId]);

  useEffect(() => {
    if (language !== 'en' && categories.length > 0) {
      translateBatch(categories.map(c => decodeHtmlEntities(c.name)));
    }
  }, [categories, language, translateBatch]);

  useEffect(() => {
    // If there's no selection or the current selection is no longer valid, select the top category (by item count)
    if (categories.length > 0 && (!selectedCategoryId || !categories.some(c => String(c.id).toLowerCase() === String(selectedCategoryId).toLowerCase()))) {
      const sorted = [...categories].sort((a, b) => {
        const diff = (b.itemCount || 0) - (a.itemCount || 0);
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });
      const firstCategoryId = sorted[0]?.id;
      if (firstCategoryId) {
        setSelectedCategoryId(firstCategoryId);
        onCategoryChange(firstCategoryId);
      }
    } else if (categories.length === 0) {
      setSelectedCategoryId(null);
      onCategoryChange(null);
    }
  }, [categories, selectedCategoryId, onCategoryChange]);

  // Scroll to active category on mobile horizontal scroll
  useEffect(() => {
    if (selectedCategoryId && containerRef.current) {
        const activeElement = containerRef.current.querySelector(`[data-category-id="${selectedCategoryId}"]`);
        if (activeElement) {
            activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }
  }, [selectedCategoryId]);

  const handleSelectCategory = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    onCategoryChange(categoryId);
  };

  const filteredCategories = useMemo(() => {
    // Categories with the most items stay at the top
    const sorted = [...categories].sort((a, b) => {
      const diff = (b.itemCount || 0) - (a.itemCount || 0);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });
    if (!catSearch.trim()) return sorted;
    
    const term = catSearch.toLowerCase();
    return sorted.filter(c => 
      c.name.toLowerCase().includes(term) || 
      (c.icon && c.icon.includes(term))
    );
  }, [categories, catSearch]);

  return (
    <aside className="w-full h-full bg-card border-r border-border flex flex-col shrink-0 overflow-hidden">
      <div className="p-4 border-b border-border flex flex-col gap-3">
        <div className="flex justify-between items-center w-full">
          <h2 className="text-lg font-bold tracking-tight text-foreground">{t('categories', 'Categories')}</h2>
        </div>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder={t('searchCategories', 'Search categories...')} 
            className="h-9 pl-9 pr-9 text-sm bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/30 transition-all rounded-lg"
            value={catSearch}
            onChange={(e) => setCatSearch(e.target.value)}
          />
          {catSearch && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-transparent text-muted-foreground hover:text-foreground"
              onClick={() => setCatSearch('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 w-full overflow-hidden [&>[data-radix-scroll-area-viewport]>div]:!block [&>[data-radix-scroll-area-viewport]>div]:!w-full [&>[data-radix-scroll-area-viewport]>div]:!min-w-0">
        <div className="p-2.5 pr-4 space-y-1 w-full min-w-0">
          {loading && (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          )}
          
          {error && (
            <div className="p-4 text-center">
              <p className="text-sm text-destructive">Error: {error}</p>
            </div>
          )}
          
          {!loading && !error && filteredCategories.length === 0 && (
            <div className="p-8 text-center flex flex-col items-center gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {catSearch ? `No matches found for "${catSearch}"` : "No categories yet."}
                </p>
                <p className="text-xs text-muted-foreground/60">
                  {catSearch ? "Create it now to start adding items." : "Click the + button to create one."}
                </p>
              </div>
              
              {catSearch && (
                <Button 
                  onClick={() => {
                    if (onQuickAdd) {
                      onQuickAdd(catSearch);
                      setCatSearch('');
                    }
                  }}
                  className="rounded-full bg-primary/10 text-primary hover:bg-primary/20 border-none shadow-none"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add "{catSearch}"
                </Button>
              )}
            </div>
          )}
          
          {!loading && !error && filteredCategories.length > 0 && filteredCategories.map(category => {
            const effectiveCount = Number(category.itemCount ?? category.totalCount ?? 0);
            const isSelected = selectedCategoryId && String(selectedCategoryId).toLowerCase() === String(category.id).toLowerCase();
            const displayName = formatCategoryName(category.name);

            return (
              <div 
                key={`${category.id}-${language}`} 
                className="group relative w-full min-w-0"
              >
                <div 
                  className={cn(
                    'w-full min-w-0 max-w-full flex items-center gap-2 rounded-lg px-2.5 py-2 transition-all duration-150 cursor-pointer overflow-hidden select-none',
                    isSelected
                      ? 'bg-primary/10 text-primary font-semibold shadow-2xs'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  )}
                  onClick={() => handleSelectCategory(category.id)}
                >
                  <span className="text-lg flex-shrink-0 w-6 text-center">{category.icon || "📁"}</span>
                  
                  {/* Category Name: standard truncation with hover tooltip for long titles */}
                  <span 
                    className="flex-1 min-w-0 font-medium truncate text-sm leading-snug"
                    title={displayName}
                  >
                    {translateText(displayName)}
                  </span>
                  
                  {/* Right side: Badge safely inset with breathing room */}
                  {effectiveCount > 0 && (
                    <span className={cn(
                      "text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-auto mr-1.5 transition-colors flex items-center gap-1 shadow-2xs border",
                      isSelected
                        ? "bg-primary/15 text-primary border-primary/25"
                        : "bg-muted text-muted-foreground/90 border-border/60 group-hover:bg-muted/90 group-hover:text-foreground"
                    )}>
                      {category.totalCount && category.itemCount !== undefined && category.totalCount > category.itemCount ? (
                        <>
                          <span className="line-through text-muted-foreground/50 text-[10px] decoration-muted-foreground/60">{category.totalCount}</span>
                          <span className="text-orange-600 dark:text-orange-400 font-bold">{category.itemCount}</span>
                        </>
                      ) : (
                        <span>{effectiveCount}</span>
                      )}
                    </span>
                  )}

                  {isSelected && (
                    <motion.div 
                      layoutId="activeCategory"
                      className="absolute left-0 w-1 h-6 bg-primary rounded-full"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}

export const CategoryList = React.memo(CategoryListComponent);
