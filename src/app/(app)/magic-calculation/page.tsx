"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Calculator,
  UtensilsCrossed,
  ShoppingBasket,
  Sliders,
  Plus,
  Trash2,
  Copy,
  Info,
  Search,
  ChevronRight,
  ChefHat,
  Printer,
  Sparkles,
  Store,
  Percent,
  AlertTriangle,
  PieChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useClientAuth } from "@/hooks/use-client-auth";
import { useMagicCalcTranslation } from "@/lib/magic-calc-translations";
import {
  IngredientItem,
  RecipeItem,
  RecipeLine,
  CostingSettings,
  UnitKey,
  UNITS,
  DEFAULT_SETTINGS,
  SAMPLE_INGREDIENTS,
  SAMPLE_RECIPES,
  calculateUnitCost,
  calculateRecipeCost,
} from "@/types/magic-calculation";
import {
  getMagicCalculationAction,
  saveMagicCalculationAction,
  deleteMagicCalculationAction,
} from "@/app/actions/magic-calculation";

const LOCAL_STORAGE_KEY = "menusnap_restaurant_costing_v2";

export default function MagicCalculationPage() {
  const { toast } = useToast();
  const { clientUser } = useClientAuth();
  const { dict, language, isRTL, currencySymbol, formatPrice, translateText } = useMagicCalcTranslation();

  // Primary State
  const [activeTab, setActiveTab] = useState<"recipe" | "menu" | "ing">("recipe");
  const [ingredients, setIngredients] = useState<Record<string, IngredientItem>>(SAMPLE_INGREDIENTS);
  const [recipes, setRecipes] = useState<Record<string, RecipeItem>>(SAMPLE_RECIPES);
  const [settings, setSettings] = useState<CostingSettings>(DEFAULT_SETTINGS);

  // UI State
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>("burger");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [isCloudSaving, setIsCloudSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Dialog State
  const [itemToDelete, setItemToDelete] = useState<{
    type: "recipe" | "ingredient" | "reset" | "clear";
    id?: string;
    name?: string;
  } | null>(null);

  const [isAddIngredientOpen, setIsAddIngredientOpen] = useState(false);
  const [newIngredient, setNewIngredient] = useState<Omit<IngredientItem, "id">>({
    name: "",
    unit: "kg",
    price: 0,
    yield: 100,
  });

  // 1. Initial Load: Cloud MySQL first, fallback to localStorage, fallback to sampleData
  useEffect(() => {
    async function loadData() {
      setInitialLoading(true);
      try {
        let loaded = false;

        // Try loading from Cloud MySQL
        if (clientUser?.id || clientUser?.whatsappNumber || clientUser?.email) {
          const res = await getMagicCalculationAction({
            clientId: clientUser.id,
            whatsappNumber: clientUser.whatsappNumber,
            email: clientUser.email,
          });

          if (res.success && res.data) {
            setIngredients(res.data.ingredients || SAMPLE_INGREDIENTS);
            setRecipes(res.data.recipes || SAMPLE_RECIPES);
            setSettings({ ...DEFAULT_SETTINGS, ...(res.data.settings || {}) });
            if (res.data.updatedAt) {
              setLastSavedTime(
                new Date(res.data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              );
            }
            loaded = true;
          }
        }

        // Fallback to localStorage if cloud returned no saved user data
        if (!loaded && typeof window !== "undefined") {
          const localStored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (localStored) {
            try {
              const parsed = JSON.parse(localStored);
              if (parsed.ingredients) setIngredients(parsed.ingredients);
              if (parsed.recipes) setRecipes(parsed.recipes);
              if (parsed.settings) setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
              loaded = true;
            } catch {}
          }
        }

        if (!loaded) {
          setIngredients(SAMPLE_INGREDIENTS);
          setRecipes(SAMPLE_RECIPES);
          setSettings(DEFAULT_SETTINGS);
        }
      } catch (err) {
        console.error("Failed to load calculation data:", err);
      } finally {
        setInitialLoading(false);
      }
    }

    loadData();
  }, [clientUser?.id, clientUser?.whatsappNumber, clientUser?.email]);

  // 2. LocalStorage Sync & Auto-save tracker
  useEffect(() => {
    if (initialLoading) return;
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({ ingredients, recipes, settings, timestamp: Date.now() })
      );
      setHasUnsavedChanges(true);
    } catch (e) {
      console.warn("LocalStorage save warning:", e);
    }
  }, [ingredients, recipes, settings, initialLoading]);

  // 3. Debounced Auto-Save to Cloud
  useEffect(() => {
    if (initialLoading || !hasUnsavedChanges) return;

    const timer = setTimeout(() => {
      handleSaveToCloud(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, [ingredients, recipes, settings, hasUnsavedChanges, initialLoading]);

  // Save to Cloud Handler
  const handleSaveToCloud = async (showToast = true) => {
    setIsCloudSaving(true);
    try {
      const res = await saveMagicCalculationAction({
        clientId: clientUser?.id,
        businessName: clientUser?.businessName || "My Restaurant",
        whatsappNumber: clientUser?.whatsappNumber,
        email: clientUser?.email,
        ingredients,
        recipes,
        settings,
      });

      if (res.success) {
        setHasUnsavedChanges(false);
        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setLastSavedTime(timeStr);
        if (showToast) {
          toast({
            title: "Calculations Saved",
            description: "All recipes, ingredients, and settings are stored in the cloud.",
          });
        }
      } else {
        if (showToast) {
          toast({
            title: "Save Failed",
            description: res.error || "Could not save to cloud.",
            variant: "destructive",
          });
        }
      }
    } catch (err: any) {
      if (showToast) {
        toast({
          title: "Network Error",
          description: err.message || "Failed to reach server.",
          variant: "destructive",
        });
      }
    } finally {
      setIsCloudSaving(false);
    }
  };

  // Helper to format currency
  const formatTaka = (amount: number | string | null | undefined, digits = 2) => {
    return formatPrice(amount, digits);
  };

  const formatPct = (val: number | null) => {
    if (val === null || !Number.isFinite(val)) return "—";
    return val.toLocaleString("en-IN", { maximumFractionDigits: 1 }) + "%";
  };

  // Precalculate all recipes
  const evaluatedRecipes = useMemo(() => {
    return Object.entries(recipes).map(([id, recipe]) => {
      const breakdown = calculateRecipeCost(recipe, ingredients, settings);
      return {
        id,
        recipe,
        breakdown,
      };
    });
  }, [recipes, ingredients, settings]);

  // Aggregate Metrics for Menu Tab
  const metrics = useMemo(() => {
    const totalCount = evaluatedRecipes.length;
    const pricedRecipes = evaluatedRecipes.filter((r) => (r.recipe.menuPrice || 0) > 0);
    const avgFoodCost =
      pricedRecipes.length > 0
        ? pricedRecipes.reduce((acc, curr) => acc + (curr.breakdown.fc || 0), 0) / pricedRecipes.length
        : null;

    const underpricedCount = evaluatedRecipes.filter(
      (r) => r.breakdown.st === "bad" || r.breakdown.st === "warn"
    ).length;

    const categories = Array.from(
      new Set(evaluatedRecipes.map((r) => r.recipe.category?.trim()).filter(Boolean))
    );

    return {
      totalCount,
      pricedCount: pricedRecipes.length,
      avgFoodCost,
      underpricedCount,
      categories,
    };
  }, [evaluatedRecipes]);

  // Filtered recipes for Menu Table
  const filteredRecipes = useMemo(() => {
    return evaluatedRecipes.filter(({ recipe }) => {
      const matchesSearch =
        searchQuery === "" ||
        recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" ||
        recipe.category.toLowerCase() === categoryFilter.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [evaluatedRecipes, searchQuery, categoryFilter]);

  // Selected Recipe details for Studio
  const selectedRecipe = useMemo(() => {
    if (!selectedRecipeId || !recipes[selectedRecipeId]) {
      const keys = Object.keys(recipes);
      return keys.length > 0 ? recipes[keys[0]] : null;
    }
    return recipes[selectedRecipeId];
  }, [recipes, selectedRecipeId]);

  const selectedRecipeCost = useMemo(() => {
    if (!selectedRecipe) return null;
    return calculateRecipeCost(selectedRecipe, ingredients, settings);
  }, [selectedRecipe, ingredients, settings]);

  // Count usage of each ingredient in recipes
  const ingredientUsageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(recipes).forEach((recipe) => {
      (recipe.lines || []).forEach((line) => {
        if (line.ing) {
          counts[line.ing] = (counts[line.ing] || 0) + 1;
        }
      });
    });
    return counts;
  }, [recipes]);

  // ----------------------------------------------------
  // Recipe Mutations
  // ----------------------------------------------------
  const handleAddRecipe = () => {
    const newId = `rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const newRecipe: RecipeItem = {
      id: newId,
      name: "New Recipe Dish",
      category: metrics.categories[0] || "Main Course",
      portions: 1,
      packaging: 0,
      other: 0,
      menuPrice: 0,
      lines: [
        { ing: "", customName: "", unit: "kg", price: 0, qty: 100 }
      ],
    };

    setRecipes((prev) => ({
      ...prev,
      [newId]: newRecipe,
    }));
    setSelectedRecipeId(newId);
    setActiveTab("recipe");
    toast({
      title: "New Recipe Created",
      description: "Start typing ingredients, measurements, and quantities.",
    });
  };

  const handleDuplicateRecipe = (recipeId: string) => {
    const src = recipes[recipeId];
    if (!src) return;

    const newId = `rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const duplicated: RecipeItem = {
      ...src,
      id: newId,
      name: `${src.name} (Copy)`,
      lines: (src.lines || []).map((l) => ({ ...l })),
    };

    setRecipes((prev) => ({
      ...prev,
      [newId]: duplicated,
    }));
    setSelectedRecipeId(newId);
    setActiveTab("recipe");
    toast({
      title: "Recipe Duplicated",
      description: `Created copy of "${src.name}".`,
    });
  };

  const handleUpdateRecipeField = (field: keyof RecipeItem, value: any) => {
    if (!selectedRecipeId) return;
    setRecipes((prev) => {
      const current = prev[selectedRecipeId];
      if (!current) return prev;
      return {
        ...prev,
        [selectedRecipeId]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  // Add line to recipe
  const handleAddRecipeLine = () => {
    if (!selectedRecipeId) return;
    setRecipes((prev) => {
      const current = prev[selectedRecipeId];
      if (!current) return prev;
      return {
        ...prev,
        [selectedRecipeId]: {
          ...current,
          lines: [
            ...(current.lines || []),
            { ing: "", customName: "", unit: "kg", price: 0, qty: 100 },
          ],
        },
      };
    });
  };

  // Update line in recipe (with text input, unit select, qty input, price input)
  const handleUpdateRecipeLine = (index: number, patch: Partial<RecipeLine>) => {
    if (!selectedRecipeId) return;
    setRecipes((prev) => {
      const current = prev[selectedRecipeId];
      if (!current) return prev;
      const updatedLines = [...(current.lines || [])];
      const existingLine = updatedLines[index] || { ing: "", qty: 0 };
      const mergedLine = { ...existingLine, ...patch };

      // If user typed an item name, check if it matches an existing ingredient in pantry
      if (patch.customName !== undefined || patch.ing !== undefined) {
        const queryText = (patch.customName ?? patch.ing ?? "").trim().toLowerCase();
        const found = Object.values(ingredients).find(
          (item) => item.name.toLowerCase() === queryText || item.id === queryText
        );
        if (found) {
          mergedLine.ing = found.id;
          mergedLine.customName = found.name;
          if (patch.unit === undefined) mergedLine.unit = found.unit;
          if (patch.price === undefined) mergedLine.price = found.price;
          if (patch.yield === undefined) mergedLine.yield = found.yield;
        } else {
          // Custom item
          if (patch.customName !== undefined) {
            mergedLine.ing = patch.customName;
            mergedLine.customName = patch.customName;
          }
        }
      }

      updatedLines[index] = mergedLine;

      return {
        ...prev,
        [selectedRecipeId]: {
          ...current,
          lines: updatedLines,
        },
      };
    });
  };

  const handleRemoveRecipeLine = (index: number) => {
    if (!selectedRecipeId) return;
    setRecipes((prev) => {
      const current = prev[selectedRecipeId];
      if (!current) return prev;
      return {
        ...prev,
        [selectedRecipeId]: {
          ...current,
          lines: (current.lines || []).filter((_, idx) => idx !== index),
        },
      };
    });
  };

  // ----------------------------------------------------
  // Ingredient Mutations
  // ----------------------------------------------------
  const handleAddIngredient = () => {
    if (!newIngredient.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter an ingredient name.",
        variant: "destructive",
      });
      return;
    }

    const id = `ing_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const added: IngredientItem = {
      id,
      name: newIngredient.name.trim(),
      unit: newIngredient.unit,
      price: Math.max(0, Number(newIngredient.price) || 0),
      yield: Math.min(100, Math.max(1, Number(newIngredient.yield) || 100)),
    };

    setIngredients((prev) => ({
      ...prev,
      [id]: added,
    }));

    setNewIngredient({
      name: "",
      unit: "kg",
      price: 0,
      yield: 100,
    });
    setIsAddIngredientOpen(false);

    toast({
      title: "Ingredient Added",
      description: `"${added.name}" added to market ingredients list.`,
    });
  };

  const handleUpdateIngredient = (id: string, patch: Partial<IngredientItem>) => {
    setIngredients((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      return {
        ...prev,
        [id]: {
          ...existing,
          ...patch,
        },
      };
    });
  };

  // ----------------------------------------------------
  // Delete & Confirmation Handlers
  // ----------------------------------------------------
  const confirmDeletion = async () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === "recipe" && itemToDelete.id) {
      setRecipes((prev) => {
        const next = { ...prev };
        delete next[itemToDelete.id!];
        return next;
      });
      if (selectedRecipeId === itemToDelete.id) {
        const remainingKeys = Object.keys(recipes).filter((k) => k !== itemToDelete.id);
        setSelectedRecipeId(remainingKeys.length > 0 ? remainingKeys[0] : null);
      }
      toast({
        title: "Recipe Removed",
        description: `Recipe "${itemToDelete.name}" was deleted.`,
      });
    } else if (itemToDelete.type === "ingredient" && itemToDelete.id) {
      setIngredients((prev) => {
        const next = { ...prev };
        delete next[itemToDelete.id!];
        return next;
      });
      toast({
        title: "Ingredient Removed",
        description: `Ingredient "${itemToDelete.name}" was deleted.`,
      });
    } else if (itemToDelete.type === "reset") {
      setIngredients(SAMPLE_INGREDIENTS);
      setRecipes(SAMPLE_RECIPES);
      setSettings(DEFAULT_SETTINGS);
      setSelectedRecipeId("burger");
      toast({
        title: "Reset to Default Recipes",
        description: "Benchmark dishes, ingredients, and settings restored.",
      });
    } else if (itemToDelete.type === "clear") {
      setIngredients({});
      setRecipes({});
      setSelectedRecipeId(null);
      await deleteMagicCalculationAction({
        clientId: clientUser?.id,
        whatsappNumber: clientUser?.whatsappNumber,
        email: clientUser?.email,
      });
      toast({
        title: "All Data Cleared",
        description: "All recipes and ingredients have been removed.",
      });
    }

    setItemToDelete(null);
  };

  // Print slip handler - generates isolated, professional A4 costing slip without web UI chrome
  const handlePrintSlip = () => {
    if (!selectedRecipe || !selectedRecipeCost) return;

    const restaurantName = clientUser?.businessName || "Restaurant Kitchen";
    const dateStr = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timeStr = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const refCode = `RCP-${selectedRecipe.id.toUpperCase()}`;

    const rowsHtml = (!selectedRecipe.lines || selectedRecipe.lines.length === 0)
      ? '<tr><td colspan="7" style="padding:16px;text-align:center;color:#64748b;">No ingredients listed in this recipe.</td></tr>'
      : selectedRecipe.lines.map((line, idx) => {
          const foundIng = ingredients[line.ing];
          const currentName = line.customName || foundIng?.name || line.ing || "Unnamed Item";
          const currentUnit = (line.unit || foundIng?.unit || "kg");
          const unitInfo = UNITS[currentUnit] || UNITS.kg;
          const currentPrice = line.price !== undefined && line.price > 0 ? line.price : (foundIng?.price || 0);
          const currentYield = line.yield !== undefined && line.yield > 0 ? line.yield : (foundIng?.yield || 100);
          const costLine = selectedRecipeCost.lines[idx]?.cost || 0;
          const linePct = selectedRecipeCost.total > 0 ? ((costLine / selectedRecipeCost.total) * 100).toFixed(1) : "0.0";

          return `
            <tr style="border-bottom:1px solid #e2e8f0;${idx % 2 === 1 ? 'background-color:#f8fafc;' : ''}">
              <td style="padding:8px 10px;text-align:center;color:#94a3b8;font-family:monospace;font-size:11px;">${idx + 1}</td>
              <td style="padding:8px 10px;font-weight:600;color:#0f172a;font-size:12px;">${currentName}</td>
              <td style="padding:8px 10px;text-align:center;font-family:monospace;font-size:11px;color:#334155;">${line.qty} ${unitInfo.base}</td>
              <td style="padding:8px 10px;text-align:right;font-family:monospace;font-size:11px;color:#334155;">৳${currentPrice.toFixed(2)} / ${unitInfo.label}</td>
              <td style="padding:8px 10px;text-align:center;font-family:monospace;font-size:11px;color:#64748b;">${currentYield}%</td>
              <td style="padding:8px 10px;text-align:right;font-weight:700;font-family:monospace;font-size:12px;color:#0f172a;">৳${costLine.toFixed(2)}</td>
              <td style="padding:8px 10px;text-align:right;font-family:monospace;font-size:11px;color:#64748b;">${linePct}%</td>
            </tr>
          `;
        }).join("");

    const menuPriceFormatted = selectedRecipe.menuPrice ? `৳${selectedRecipe.menuPrice.toFixed(2)}` : "Not Set";
    const realCostFormatted = `৳${selectedRecipeCost.total.toFixed(2)}`;
    const profitFormatted = selectedRecipeCost.profit !== null ? `${selectedRecipeCost.profit >= 0 ? "+" : ""}৳${selectedRecipeCost.profit.toFixed(2)}` : "—";
    const marginFormatted = selectedRecipeCost.profitMarginPct !== null ? `${selectedRecipeCost.profitMarginPct.toFixed(1)}% margin` : "";
    const fcFormatted = selectedRecipeCost.fc !== null ? `${selectedRecipeCost.fc.toFixed(1)}%` : "—";
    const recommendedPriceFormatted = selectedRecipeCost.recommendedPrice ? `৳${selectedRecipeCost.recommendedPrice.toFixed(2)}` : "—";

    const reportHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Recipe Costing - ${selectedRecipe.name}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 14mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 12px;
            line-height: 1.4;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .brand-title {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: -0.5px;
            color: #0f172a;
            text-transform: uppercase;
          }
          .sub-title {
            font-size: 13px;
            font-weight: 700;
            color: #475569;
            margin-top: 2px;
          }
          .meta-text {
            font-size: 11px;
            color: #64748b;
            text-align: right;
            line-height: 1.5;
          }
          .meta-text strong {
            color: #1e293b;
          }
          .meta-ref {
            font-family: monospace;
            font-size: 10px;
            color: #94a3b8;
            margin-top: 2px;
          }
          .dish-banner {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr;
            gap: 12px;
            padding: 12px 14px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            background-color: #f8fafc;
            margin-bottom: 16px;
          }
          .banner-label {
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
          }
          .banner-value {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 2px;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 18px;
          }
          .kpi-card {
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            background: #ffffff;
            text-align: center;
          }
          .kpi-card-highlight {
            border: 2px solid #ea580c !important;
            background: #fff7ed !important;
          }
          .kpi-card-profit {
            border: 1px solid #10b981 !important;
            background: #ecfdf5 !important;
          }
          .kpi-label {
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            color: #64748b;
            display: block;
          }
          .kpi-val {
            font-size: 17px;
            font-weight: 900;
            font-family: monospace;
            margin: 3px 0 2px;
            color: #0f172a;
          }
          .kpi-sub {
            font-size: 9px;
            color: #64748b;
            display: block;
          }
          .table-title-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
          }
          .table-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #1e293b;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #cbd5e1;
            font-size: 11px;
            margin-bottom: 16px;
          }
          th {
            background-color: #f1f5f9;
            color: #334155;
            font-weight: 700;
            padding: 8px 10px;
            border-bottom: 1px solid #cbd5e1;
            border-right: 1px solid #e2e8f0;
          }
          th:last-child {
            border-right: none;
          }
          tfoot tr {
            background-color: #f8fafc;
            border-top: 2px solid #0f172a;
            font-weight: 800;
          }
          tfoot td {
            padding: 8px 10px;
          }
          .guidelines-box {
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 20px;
            padding-top: 14px;
            border-top: 1px solid #cbd5e1;
            margin-bottom: 24px;
            page-break-inside: avoid;
          }
          .notes-title {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #475569;
            margin-bottom: 6px;
          }
          .notes-list {
            margin: 0;
            padding-left: 14px;
            font-size: 10px;
            color: #475569;
            line-height: 1.5;
          }
          .signatures-row {
            display: flex;
            gap: 20px;
            align-items: flex-end;
          }
          .sig-box {
            flex: 1;
            border-top: 1px solid #64748b;
            padding-top: 4px;
            text-align: center;
            font-size: 10px;
            color: #334155;
            font-weight: 600;
          }
          .doc-footer {
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div class="brand-title">${restaurantName}</div>
            <div class="sub-title">Recipe Costing & Menu Pricing Slip</div>
            <div style="font-size:10px;color:#64748b;margin-top:2px;">Official Kitchen Production & Profitability Analysis</div>
          </div>
          <div class="meta-text">
            <div><strong>Date:</strong> ${dateStr}</div>
            <div><strong>Time:</strong> ${timeStr}</div>
            <div class="meta-ref">REF: ${refCode}</div>
          </div>
        </div>

        <div class="dish-banner">
          <div>
            <div class="banner-label">Dish / Recipe Name</div>
            <div class="banner-value">${selectedRecipe.name}</div>
          </div>
          <div>
            <div class="banner-label">Category</div>
            <div class="banner-value" style="font-size:13px;">${selectedRecipe.category || "General"}</div>
          </div>
          <div>
            <div class="banner-label">Batch Portion Yield</div>
            <div class="banner-value" style="font-size:13px;">${selectedRecipe.portions} ${selectedRecipe.portions === 1 ? "Plate" : "Plates"} Batch</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <span class="kpi-label">Current Menu Price</span>
            <div class="kpi-val">${menuPriceFormatted}</div>
            <span class="kpi-sub">Customer Selling Rate</span>
          </div>

          <div class="kpi-card kpi-card-highlight">
            <span class="kpi-label" style="color:#c2410c;">Total Real Cost / Plate</span>
            <div class="kpi-val" style="color:#ea580c;">${realCostFormatted}</div>
            <span class="kpi-sub">Pure Kitchen Ingredients</span>
          </div>

          <div class="kpi-card kpi-card-profit">
            <span class="kpi-label" style="color:#047857;">Net Profit / Plate</span>
            <div class="kpi-val" style="color:#059669;">${profitFormatted}</div>
            <span class="kpi-sub" style="color:#047857;font-weight:700;">${marginFormatted}</span>
          </div>

          <div class="kpi-card">
            <span class="kpi-label">Food Cost %</span>
            <div class="kpi-val">${fcFormatted}</div>
            <span class="kpi-sub">Target: ${selectedRecipe.targetFoodCost || 30}% (Rec: ${recommendedPriceFormatted})</span>
          </div>
        </div>

        <div class="table-title-bar">
          <div class="table-title">Kitchen Recipe Ingredients (${selectedRecipe.lines?.length || 0} Items)</div>
          <div style="font-size:10px;color:#64748b;">Calculated for 1 plate portion yield</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:30px;text-align:center;">#</th>
              <th style="text-align:left;">Ingredient / Item Name</th>
              <th style="width:85px;text-align:center;">Qty / Plate</th>
              <th style="width:110px;text-align:right;">Market Rate (৳)</th>
              <th style="width:75px;text-align:center;">Yield %</th>
              <th style="width:90px;text-align:right;">Line Cost (৳)</th>
              <th style="width:65px;text-align:right;">% Cost</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" style="text-align:right;font-size:11px;color:#0f172a;border-right:1px solid #cbd5e1;">
                {dict.totalRealCost} per Plate:
              </td>
              <td style="text-align:right;font-family:monospace;font-size:13px;color:#ea580c;border-right:1px solid #cbd5e1;">
                ${realCostFormatted}
              </td>
              <td style="text-align:right;font-family:monospace;font-size:11px;color:#0f172a;">
                100%
              </td>
            </tr>
          </tfoot>
        </table>

        <div class="guidelines-box">
          <div>
            <div class="notes-title">Costing Notes & Kitchen Principles</div>
            <ul class="notes-list">
              <li>Costing calculated on real usable weight after kitchen prep, trim, and shrink.</li>
              <li>Pure kitchen production value without arbitrary hidden overhead markups.</li>
              <li>Target food cost range is 28% – 35% for balanced restaurant profitability.</li>
            </ul>
          </div>
          <div class="signatures-row">
            <div class="sig-box">Head Chef Signature</div>
            <div class="sig-box">Manager / Owner Approval</div>
          </div>
        </div>

        <div class="doc-footer">
          <span>Generated via MenuSnap Kitchen Costing Studio</span>
          <span>Confidential Restaurant Operating Record</span>
        </div>
      </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.setAttribute("style", "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;");
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(reportHtml);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error("Print error:", e);
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 300);
  };

  return (
    <>
      {/* Screen App UI - Hidden when printing */}
      <div className={cn("flex flex-col min-h-screen bg-background pb-20 print:hidden", isRTL && "rtl text-right")} dir={isRTL ? "rtl" : "ltr"}>
      <div className="w-full max-w-[1600px] mx-auto p-3 sm:p-4 lg:p-6 space-y-5">
        {/* ======================================================== */}
        {/* Top Header Card - Clean, Modern & Elegant                */}
        {/* ======================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-border/80 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-orange-500/15 to-amber-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/20 shadow-2xs">
              <Calculator className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {dict.pageTitle}
                </h1>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/20 font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5"
                >
                  Restaurant Costing
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {dict.pageSubtitle}
              </p>
            </div>
          </div>

          {/* Discreet Auto-save Indicator */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 text-[11px] font-medium text-muted-foreground border border-border/50">
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  isCloudSaving ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                )}
              />
              <span>{isCloudSaving ? "Syncing..." : "{dict.autoSaved}"}</span>
            </div>
          </div>
        </div>

        {/* Datalist for fast ingredient autocomplete */}
        <datalist id="recipe-market-ingredients">
          {Object.values(ingredients).map((ingItem) => (
            <option key={ingItem.id} value={ingItem.name}>
              {formatTaka(ingItem.price)} / {UNITS[ingItem.unit]?.label}
            </option>
          ))}
        </datalist>

        {/* Datalist for category autocomplete */}
        <datalist id="recipe-categories">
          {metrics.categories.map((cat) => (
            <option key={cat} value={cat} />
          ))}
        </datalist>

        {/* ======================================================== */}
        {/* Primary Tabs Navigation (3 Complete Tabs)                */}
        {/* ======================================================== */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full space-y-5">
          <div className="flex items-center overflow-x-auto pb-1">
            <TabsList className="bg-muted/70 p-1.5 rounded-2xl border border-border/60 inline-flex h-auto gap-1 shadow-2xs">
              <TabsTrigger
                value="recipe"
                className="rounded-xl py-2 px-3 sm:px-4 text-xs font-semibold gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-border/60 transition-all"
              >
                <ChefHat className="w-4 h-4 text-orange-500" />
                {dict.tabRecipeStudio}
              </TabsTrigger>
              <TabsTrigger
                value="menu"
                className="rounded-xl py-2 px-3 sm:px-4 text-xs font-semibold gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-border/60 transition-all"
              >
                <UtensilsCrossed className="w-4 h-4 text-amber-500" />
                All Items Overview ({metrics.totalCount})
              </TabsTrigger>
              <TabsTrigger
                value="ing"
                className="rounded-xl py-2 px-3 sm:px-4 text-xs font-semibold gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-border/60 transition-all"
              >
                <ShoppingBasket className="w-4 h-4 text-emerald-500" />
                {dict.tabIngredients} ({Object.keys(ingredients).length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: RECIPE COSTING STUDIO (Spacious 3-Panel Layout)   */}
          {/* ======================================================== */}
          <TabsContent value="recipe" className="space-y-5 m-0">
            <div className="flex flex-col lg:flex-row gap-5 items-start w-full">
              {/* Left Column: Dishes List Panel */}
              <div className="w-full lg:w-72 xl:w-80 shrink-0 space-y-3">
                <Card className="border border-border/80 bg-card rounded-2xl shadow-xs overflow-hidden">
                  <div className="p-3.5 border-b border-border/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <ChefHat className="h-4 w-4 text-orange-500" />
                        Dishes ({Object.keys(recipes).length})
                      </span>
                      <Button
                        size="sm"
                        onClick={handleAddRecipe}
                        className="h-7 px-2.5 text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-lg shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 mr-0.5" /> New Dish
                      </Button>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder={dict.searchRecipe}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-xs bg-background/50 border-border/70 rounded-xl focus:bg-background"
                      />
                    </div>
                  </div>

                  {/* Recipes List */}
                  <div className="p-2 space-y-1.5 max-h-[calc(100vh-260px)] min-h-[520px] overflow-y-auto">
                    {Object.entries(recipes)
                      .filter(([_, r]) => !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(([id, r]) => {
                        const isSelected = selectedRecipeId === id;
                        const c = calculateRecipeCost(r, ingredients, settings);

                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setSelectedRecipeId(id)}
                            className={cn(
                              "w-full text-left p-3 rounded-xl transition-all flex items-center justify-between cursor-pointer border",
                              isSelected
                                ? "bg-orange-500/10 border-orange-500/40 text-foreground ring-1 ring-orange-500/20 shadow-xs font-semibold"
                                : "border-transparent hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <div className="min-w-0 pr-2">
                              <p className="text-xs font-bold truncate leading-tight text-foreground">{r.name || "Untitled Dish"}</p>
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{r.category || "General"}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 dark:bg-orange-500/20 px-2 py-0.5 rounded-lg">
                                {formatTaka(c.total)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </Card>
              </div>

              {/* Middle Column: Recipe Editor Studio */}
              <div className="flex-1 min-w-0 w-full space-y-4">
                {selectedRecipe ? (
                  <Card className="border border-border/80 bg-card rounded-2xl shadow-xs p-5 sm:p-6 space-y-6">
                    {/* Header with Title & Action buttons */}
                    <div className="flex flex-wrap items-center justify-between pb-3 border-b border-border/60 gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg sm:text-xl font-bold text-foreground">
                            {selectedRecipe.name}
                          </h2>
                          {selectedRecipe.category && (
                            <Badge variant="secondary" className="text-[10px] rounded-lg px-2 py-0.5">
                              {selectedRecipe.category}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground mt-0.5 block">
                          {dict.editDishSubtitle}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicateRecipe(selectedRecipe.id)}
                          className="h-8 px-3 text-xs rounded-xl border-border/80 hover:bg-muted font-medium"
                        >
                          <Copy className="w-3.5 h-3.5 mr-1" /> {dict.duplicate}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setItemToDelete({
                              type: "recipe",
                              id: selectedRecipe.id,
                              name: selectedRecipe.name,
                            })
                          }
                          className="h-8 px-3 text-xs rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> {dict.delete}
                        </Button>
                      </div>
                    </div>

                    {/* Dish Profile Inputs: Clean single row with Name, Category, and Menu Price */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                      <div className="space-y-1.5 sm:col-span-5">
                        <Label className="text-xs font-semibold text-foreground">
                          Dish Name
                        </Label>
                        <Input
                          value={selectedRecipe.name}
                          onChange={(e) => handleUpdateRecipeField("name", e.target.value)}
                          className="h-10 text-xs sm:text-sm font-semibold rounded-xl bg-background/50 border-border/70 focus:bg-background"
                          placeholder="e.g. Beef Cheese Burger"
                        />
                      </div>

                      <div className="space-y-1.5 sm:col-span-4">
                        <Label className="text-xs font-semibold text-foreground">
                          Category
                        </Label>
                        <Input
                          list="recipe-categories"
                          value={selectedRecipe.category}
                          onChange={(e) => handleUpdateRecipeField("category", e.target.value)}
                          className="h-10 text-xs rounded-xl bg-background/50 border-border/70 focus:bg-background"
                          placeholder="e.g. Burgers, Pizza, Rice"
                        />
                      </div>

                      <div className="space-y-1.5 sm:col-span-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-foreground">
                            Current Menu Price (৳)
                          </Label>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Selling price</span>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          value={selectedRecipe.menuPrice || ""}
                          onChange={(e) => handleUpdateRecipeField("menuPrice", Number(e.target.value) || 0)}
                          className="h-10 text-xs font-mono font-bold rounded-xl bg-background/50 border-emerald-500/40 focus:bg-background focus-visible:ring-emerald-500"
                          placeholder="e.g. 320"
                        />
                      </div>
                    </div>

                    {/* Recipe Line Items Section */}
                    <div className="space-y-3 pt-3 border-t border-border/60">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                            <ShoppingBasket className="w-4 h-4 text-orange-500" />
                            Recipe Ingredients ({selectedRecipe.lines?.length || 0})
                          </h3>
                          <span className="text-[11px] text-muted-foreground">
                            Set ingredient quantities and unit rates directly.
                          </span>
                        </div>
                        <Button
                          onClick={handleAddRecipeLine}
                          size="sm"
                          className="h-8 px-3 text-xs font-semibold bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl shadow-xs gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Ingredient
                        </Button>
                      </div>

                      {/* Ingredients Line Table */}
                      <div className="border border-border/70 rounded-2xl overflow-hidden shadow-2xs bg-card">
                        <Table className="w-full text-xs">
                          <TableHeader className="bg-muted/40">
                            <TableRow className="border-border/60">
                              <TableHead className="font-semibold text-muted-foreground text-[11px] min-w-[200px]">
                                Ingredient / Item Name
                              </TableHead>
                              <TableHead className="font-semibold text-muted-foreground text-[11px] min-w-[120px]">
                                Measurement
                              </TableHead>
                              <TableHead className="font-semibold text-muted-foreground text-[11px] min-w-[100px]">
                                Quantity
                              </TableHead>
                              <TableHead className="font-semibold text-muted-foreground text-[11px] min-w-[120px]">
                                Rate / Unit (৳)
                              </TableHead>
                              <TableHead className="font-semibold text-muted-foreground text-[11px] text-right min-w-[90px]">
                                Line Cost
                              </TableHead>
                              <TableHead className="w-[44px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {!selectedRecipe.lines || selectedRecipe.lines.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                  No ingredients in this recipe yet. Click "+ Add Ingredient" above to begin.
                                </TableCell>
                              </TableRow>
                            ) : (
                              selectedRecipe.lines.map((line, idx) => {
                                const foundIng = ingredients[line.ing];
                                const currentName = line.customName || foundIng?.name || line.ing || "";
                                const currentUnit: UnitKey = (line.unit || foundIng?.unit || "kg") as UnitKey;
                                const unitInfo = UNITS[currentUnit] || UNITS.kg;
                                const currentPrice =
                                  line.price !== undefined && line.price > 0
                                    ? line.price
                                    : (foundIng?.price || 0);
                                const costLine = selectedRecipeCost?.lines[idx]?.cost || 0;

                                return (
                                  <TableRow key={idx} className="border-border/50 hover:bg-muted/30 transition-colors">
                                    {/* 1. Item Name */}
                                    <TableCell className="p-2.5">
                                      <div className="relative">
                                        <Input
                                          list="recipe-market-ingredients"
                                          placeholder="Type item name..."
                                          value={currentName}
                                          onChange={(e) =>
                                            handleUpdateRecipeLine(idx, {
                                              customName: e.target.value,
                                              ing: e.target.value,
                                            })
                                          }
                                          className="h-9 text-xs font-semibold rounded-lg bg-background/50 border-border/60 focus:bg-background"
                                        />
                                      </div>
                                    </TableCell>

                                    {/* 2. Measurement */}
                                    <TableCell className="p-2.5">
                                      <Select
                                        value={currentUnit}
                                        onValueChange={(val: UnitKey) =>
                                          handleUpdateRecipeLine(idx, { unit: val })
                                        }
                                      >
                                        <SelectTrigger className="h-9 text-xs rounded-lg bg-background/50 border-border/60">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {Object.entries(UNITS).map(([key, u]) => (
                                            <SelectItem key={key} value={key}>
                                              {u.label} ({u.base})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </TableCell>

                                    {/* 3. Quantity */}
                                    <TableCell className="p-2.5">
                                      <div className="flex items-center gap-1.5">
                                        <Input
                                          type="number"
                                          min={0}
                                          value={line.qty}
                                          onChange={(e) =>
                                            handleUpdateRecipeLine(idx, {
                                              qty: Math.max(0, Number(e.target.value) || 0),
                                            })
                                          }
                                          className="h-9 text-xs font-mono text-right rounded-lg bg-background/50 border-border/60 focus:bg-background"
                                        />
                                        <span className="text-[11px] text-muted-foreground font-medium shrink-0 w-8">
                                          {unitInfo.base}
                                        </span>
                                      </div>
                                    </TableCell>

                                    {/* 4. Rate */}
                                    <TableCell className="p-2.5">
                                      <div className="flex items-center gap-1.5">
                                        <Input
                                          type="number"
                                          min={0}
                                          value={currentPrice || ""}
                                          placeholder="0"
                                          onChange={(e) =>
                                            handleUpdateRecipeLine(idx, {
                                              price: Math.max(0, Number(e.target.value) || 0),
                                            })
                                          }
                                          className="h-9 text-xs font-mono text-right rounded-lg bg-background/50 border-border/60 focus:bg-background"
                                        />
                                        <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                                          /{unitInfo.label}
                                        </span>
                                      </div>
                                    </TableCell>

                                    {/* 5. Line Cost */}
                                    <TableCell className="p-2.5 text-right font-mono font-bold text-foreground text-xs">
                                      {formatTaka(costLine)}
                                    </TableCell>

                                    {/* 6. Delete */}
                                    <TableCell className="p-2.5 text-right">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveRecipeLine(idx)}
                                        className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Total Batch Ingredient Cost summary row */}
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 text-xs border border-border/60">
                        <span className="font-semibold text-muted-foreground">
                          Total Batch Ingredient Cost ({selectedRecipe.portions}{" "}
                          {selectedRecipe.portions === 1 ? "plate" : "plates"}):
                        </span>
                        <span className="font-mono font-bold text-base text-foreground">
                          {formatTaka(selectedRecipeCost?.batch || 0)}
                        </span>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-16 text-center border-dashed border-2 rounded-2xl">
                    <ChefHat className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="font-bold text-foreground">No Recipe Selected</p>
                    <p className="text-xs text-muted-foreground mt-1">Select a dish from the left or create a new recipe.</p>
                  </Card>
                )}
              </div>

              {/* Right Column: Calculation Slip */}
              <div className="w-full lg:w-80 xl:w-96 shrink-0 space-y-4">
                {selectedRecipe && selectedRecipeCost && (
                  <div className="space-y-4 sticky top-4">
                    <Card className="border border-border/80 bg-card shadow-sm rounded-2xl p-5 space-y-4">
                      {/* Slip Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-border/60">
                        <div>
                          <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-orange-500" />
                            {dict.slipTitle}
                          </h3>
                          <span className="text-[11px] text-muted-foreground">
                            {dict.slipSubtitle}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handlePrintSlip}
                          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-lg"
                        >
                          <Printer className="w-3.5 h-3.5 mr-1" /> {dict.print}
                        </Button>
                      </div>

                      {/* Hero Highlight Card: Total Real Production Cost */}
                      <div className="bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 rounded-2xl p-4 text-center space-y-1 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                          Total Real Production Cost
                        </span>
                        <div className="text-3xl font-black font-mono tracking-tight text-orange-600 dark:text-orange-400">
                          {formatTaka(selectedRecipeCost.total)}
                        </div>
                        <span className="text-[10px] text-muted-foreground block">
                          {dict.pureRawCostNote}
                        </span>
                      </div>

                      {/* Line breakdown items: Pure Real Costs Only */}
                      <div className="space-y-2 text-xs p-3 rounded-xl bg-muted/30 border border-border/60">
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span>{dict.rawIngredientsPerPlate}</span>
                          <span className="font-mono font-bold text-foreground">
                            {formatTaka(selectedRecipeCost.ing)}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-border/60 flex justify-between items-center text-xs font-bold text-foreground">
                          <span>{dict.realKitchenCost}</span>
                          <span className="font-mono text-orange-600 dark:text-orange-400">
                            {formatTaka(selectedRecipeCost.total)}
                          </span>
                        </div>
                      </div>

                      {/* Cost Breakdown Summary Card */}
                      <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-3.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                            <PieChart className="w-3.5 h-3.5 text-amber-500" />
                            {dict.costProfitShare}
                          </span>
                          {selectedRecipeCost.fc !== null ? (
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                selectedRecipeCost.fc <= 35
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-700"
                                  : selectedRecipeCost.fc <= 45
                                  ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-700"
                                  : "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-700"
                              }`}
                            >
                              {selectedRecipeCost.fc <= 35
                                ? "Healthy Food Cost"
                                : selectedRecipeCost.fc <= 45
                                ? "Moderate Food Cost"
                                : "{dict.highFoodCost}"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground rounded-full">
                              Cost Shares
                            </Badge>
                          )}
                        </div>

                        {/* Multi-segment distribution visual bar */}
                        {selectedRecipe.menuPrice && selectedRecipe.menuPrice > 0 ? (
                          <div className="space-y-1.5">
                            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex shadow-inner">
                              <div
                                style={{ width: `${Math.min(100, Math.max(0, selectedRecipeCost.ingPct))}%` }}
                                className="bg-amber-500 transition-all duration-300"
                                title={`Raw Ingredients: ${selectedRecipeCost.ingPct.toFixed(1)}%`}
                              />
                              {selectedRecipeCost.profitMarginPct && selectedRecipeCost.profitMarginPct > 0 ? (
                                <div
                                  style={{ width: `${Math.min(100, Math.max(0, selectedRecipeCost.profitMarginPct))}%` }}
                                  className="bg-emerald-500 transition-all duration-300"
                                  title={`Net Profit: ${selectedRecipeCost.profitMarginPct.toFixed(1)}%`}
                                />
                              ) : null}
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                              <span>{dict.customerPrice}: 100%</span>
                              <span>Food Cost: {selectedRecipeCost.fc?.toFixed(1) || 0}%</span>
                            </div>
                          </div>
                        ) : null}

                        {/* Detailed Rows: Raw Ingredients % vs Net Profit % */}
                        <div className="space-y-2 text-xs divide-y divide-border/40">
                          <div className="flex justify-between items-center pt-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                              <span className="text-muted-foreground font-medium">{dict.colIngredientName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-foreground font-semibold">
                                {formatTaka(selectedRecipeCost.ing)}
                              </span>
                              <Badge variant="secondary" className="font-mono font-bold text-[10px] px-1.5 py-0 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                {selectedRecipeCost.ingPct.toFixed(1)}%
                              </Badge>
                            </div>
                          </div>

                          {selectedRecipeCost.profit !== null && (
                            <div className="flex justify-between items-center pt-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${selectedRecipeCost.profit >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
                                <span className="text-muted-foreground font-medium">{dict.netRealProfit}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`font-mono font-bold ${selectedRecipeCost.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                  {selectedRecipeCost.profit >= 0 ? "+" : ""}{formatTaka(selectedRecipeCost.profit)}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className={`font-mono font-bold text-[10px] px-1.5 py-0 rounded-md ${
                                    selectedRecipeCost.profit >= 0
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                  }`}
                                >
                                  {selectedRecipeCost.profitMarginPct !== null
                                    ? `${selectedRecipeCost.profitMarginPct >= 0 ? "+" : ""}${selectedRecipeCost.profitMarginPct.toFixed(1)}%`
                                    : "0%"}
                                </Badge>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Real Selling Price & Profit Comparison (Only if menu price entered) */}
                      {selectedRecipe.menuPrice && selectedRecipe.menuPrice > 0 ? (
                        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2 text-xs">
                          <div className="flex justify-between items-center font-semibold">
                            <span className="text-muted-foreground">{dict.yourMenuPrice}</span>
                            <span className="font-mono font-bold text-foreground">
                              {formatTaka(selectedRecipe.menuPrice, 0)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span>{dict.realProfitPerPlate}</span>
                            <span
                              className={`font-mono font-bold text-sm ${
                                selectedRecipeCost.profit && selectedRecipeCost.profit > 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {selectedRecipeCost.profit && selectedRecipeCost.profit > 0 ? "+" : ""}
                              {formatTaka(selectedRecipeCost.profit || 0)}
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ======================================================== */}
          {/* TAB 2: ALL ITEMS / MENU COSTING OVERVIEW                 */}
          {/* ======================================================== */}
          <TabsContent value="menu" className="space-y-5 m-0">
            {/* Real Product KPI Cards Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total Menu Dishes
                  </CardTitle>
                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <UtensilsCrossed className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold font-mono text-foreground">
                    {metrics.totalCount}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {metrics.pricedCount} dishes active on menu
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Average Real Cost / Plate
                  </CardTitle>
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Calculator className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold font-mono text-foreground">
                    {formatTaka(
                      metrics.totalCount > 0
                        ? evaluatedRecipes.reduce((sum, r) => sum + r.breakdown.total, 0) / metrics.totalCount
                        : 0
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Mean kitchen production cost
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Market Ingredients
                  </CardTitle>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <ShoppingBasket className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold font-mono text-foreground">
                    {Object.keys(ingredients).length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Raw materials in pantry list
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Menu Priced Dishes
                  </CardTitle>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Store className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {metrics.pricedCount}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Dishes with active selling price
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Menu Items Table Card */}
            <Card className="border border-border/80 bg-card rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search dish or category..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-xl bg-background/50 border-border/70 focus:bg-background"
                    />
                  </div>

                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-44 h-9 text-xs rounded-xl bg-background/50 border-border/70">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {metrics.categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleAddRecipe}
                    className="h-9 px-3.5 text-xs font-semibold gap-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Recipe
                  </Button>
                </div>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto w-full">
                <Table className="w-full">
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-border/60">
                      <TableHead className="text-xs font-semibold text-muted-foreground min-w-[200px]">Item & Category</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-center min-w-[90px]">Portions</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right min-w-[110px]">Raw Ingredients</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right min-w-[130px]">Total Real Cost</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right min-w-[110px]">Menu Price</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right min-w-[110px]">Profit / Plate</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right min-w-[80px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecipes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                          <ChefHat className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p className="font-semibold text-foreground">No dishes match criteria</p>
                          <p className="text-xs mt-1">Try another search term or click "Add New Recipe".</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecipes.map(({ id, recipe, breakdown }) => {
                        return (
                          <TableRow
                            key={id}
                            className="border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => {
                              setSelectedRecipeId(id);
                              setActiveTab("recipe");
                            }}
                          >
                            <TableCell className="align-middle">
                              <div className="font-bold text-foreground text-xs sm:text-sm">
                                {recipe.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                <span>{recipe.category || "General"}</span>
                                {breakdown.missing > 0 && (
                                  <span className="text-rose-500 font-semibold">
                                    · {breakdown.missing} missing ingredients
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="align-middle text-center font-mono text-xs">
                              {recipe.portions} {recipe.portions === 1 ? "plate" : "plates"}
                            </TableCell>

                            <TableCell className="align-middle text-right font-mono text-xs">
                              {formatTaka(breakdown.ing)}
                            </TableCell>

                            <TableCell className="align-middle text-right font-mono font-bold text-orange-600 dark:text-orange-400 text-xs">
                              {formatTaka(breakdown.total)}
                            </TableCell>

                            <TableCell className="align-middle text-right font-mono text-xs font-bold">
                              {breakdown.menu > 0 ? formatTaka(breakdown.menu, 0) : "—"}
                            </TableCell>

                            <TableCell className="align-middle text-right font-mono text-xs font-bold">
                              {breakdown.profit !== null ? (
                                <span className={breakdown.profit < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                                  {breakdown.profit > 0 ? "+" : ""}
                                  {formatTaka(breakdown.profit)}
                                </span>
                              ) : (
                                "—"
                              )}
                            </TableCell>

                            <TableCell className="align-middle text-right" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRecipeId(id);
                                  setActiveTab("recipe");
                                }}
                                className="h-7 px-2 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg"
                              >
                                Edit <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* ======================================================== */}
          {/* TAB 3: INGREDIENTS & MARKET RATES                        */}
          {/* ======================================================== */}
          <TabsContent value="ing" className="space-y-5 m-0">
            <Card className="border border-border/80 bg-card rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <ShoppingBasket className="w-5 h-5 text-emerald-500" />
                    Ingredients & Market Rates
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Update market purchase rates here. All connected recipes dynamically update their costs.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search ingredient..."
                      value={ingredientSearch}
                      onChange={(e) => setIngredientSearch(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-xl bg-background/50 border-border/70 focus:bg-background"
                    />
                  </div>

                  <Button
                    onClick={() => setIsAddIngredientOpen(true)}
                    className="h-9 px-3.5 text-xs font-semibold gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-xs shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Add Ingredient
                  </Button>
                </div>
              </div>

              {/* Informational Formula Strip */}
              <div className="p-3 bg-emerald-500/10 border-b border-emerald-500/20 text-xs text-emerald-950 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    <strong>Real Cost Formula:</strong> Real Cost = Purchase Price ÷ (Usable Yield % ÷ 100).
                    e.g. 1kg Chicken @ ৳220 with 70% yield costs <strong>৳314 / kg (৳0.314/g)</strong> after trimming.
                  </span>
                </div>
              </div>

              {/* Ingredients Table */}
              <div className="overflow-x-auto w-full">
                <Table className="w-full">
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-border/60">
                      <TableHead className="text-xs font-semibold text-muted-foreground min-w-[200px]">Ingredient Name</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground min-w-[100px]">Unit Type</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right min-w-[130px]">Purchase Price (৳)</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right min-w-[120px]">Usable Yield %</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right min-w-[140px]">Real Cost / Unit</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right min-w-[130px]">Cost / Base (g/ml)</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-center min-w-[100px]">In Recipes</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right min-w-[70px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(ingredients)
                      .filter(
                        ([_, ing]) =>
                          !ingredientSearch ||
                          ing.name.toLowerCase().includes(ingredientSearch.toLowerCase())
                      )
                      .map(([id, ing]) => {
                        const unitInfo = UNITS[ing.unit] || UNITS.kg;
                        const yieldRatio = Math.min(Math.max(ing.yield || 100, 1), 100) / 100;
                        const realCost = (ing.price || 0) / yieldRatio;
                        const baseCost = realCost / unitInfo.factor;

                        const usageCount = Object.values(recipes).filter((r) =>
                          r.lines?.some(
                            (l) => l.ing === id || (l.customName && l.customName === ing.name)
                          )
                        ).length;

                        return (
                          <TableRow key={id} className="border-border/50 hover:bg-muted/30 transition-colors">
                            <TableCell className="align-middle">
                              <Input
                                value={ing.name}
                                onChange={(e) => handleUpdateIngredient(id, { name: e.target.value })}
                                className="h-8 text-xs font-semibold rounded-lg bg-background/50 border-border/60 focus:bg-background"
                              />
                            </TableCell>

                            <TableCell className="align-middle">
                              <Select
                                value={ing.unit}
                                onValueChange={(val: UnitKey) => handleUpdateIngredient(id, { unit: val })}
                              >
                                <SelectTrigger className="h-8 text-xs rounded-lg bg-background/50 border-border/60">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(UNITS).map(([key, u]) => (
                                    <SelectItem key={key} value={key}>
                                      {u.label} ({u.base})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>

                            <TableCell className="align-middle text-right">
                              <Input
                                type="number"
                                min={0}
                                value={ing.price}
                                onChange={(e) =>
                                  handleUpdateIngredient(id, { price: Number(e.target.value) || 0 })
                                }
                                className="h-8 w-24 text-xs text-right font-mono rounded-lg bg-background/50 border-border/60 focus:bg-background ml-auto"
                              />
                            </TableCell>

                            <TableCell className="align-middle text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={ing.yield}
                                  onChange={(e) =>
                                    handleUpdateIngredient(id, { yield: Number(e.target.value) || 100 })
                                  }
                                  className="h-8 w-16 text-xs text-right font-mono rounded-lg bg-background/50 border-border/60 focus:bg-background"
                                />
                                <span className="text-xs text-muted-foreground">%</span>
                              </div>
                            </TableCell>

                            <TableCell className="align-middle text-right font-mono text-xs font-bold text-foreground">
                              {formatTaka(realCost)}{" "}
                              <span className="text-[10px] text-muted-foreground font-normal">/{unitInfo.label}</span>
                            </TableCell>

                            <TableCell className="align-middle text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              {formatTaka(baseCost, 3)}{" "}
                              <span className="text-[10px] text-muted-foreground font-normal">/{unitInfo.base}</span>
                            </TableCell>

                            <TableCell className="align-middle text-center">
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full">
                                {usageCount} {usageCount === 1 ? "recipe" : "recipes"}
                              </Badge>
                            </TableCell>

                            <TableCell className="align-middle text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setItemToDelete({ type: "ingredient", id, name: ing.name })}
                                className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>

    {/* ======================================================== */}
    {/* Dedicated Print Report (Only visible when printing)     */}
    {/* ======================================================== */}
      <div className="hidden print:block print:w-full print:bg-white print:text-slate-900 print:p-6 print:m-0 font-sans text-xs">
        {selectedRecipe && selectedRecipeCost ? (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* 1. Header Banner */}
            <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
              <div>
                <div className="text-xl font-black uppercase tracking-tight text-slate-900">
                  {clientUser?.businessName || "Restaurant Kitchen"}
                </div>
                <h1 className="text-lg font-bold text-slate-700 mt-0.5">
                  Recipe Costing & Pricing Report
                </h1>
                <p className="text-[11px] text-slate-500">
                  Official Kitchen Production & Profitability Analysis
                </p>
              </div>

              <div className="text-right text-[11px] text-slate-600 space-y-0.5">
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date().toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <p>
                  <strong>Time:</strong>{" "}
                  {new Date().toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
                <p className="font-mono text-[10px] text-slate-400">
                  REF: RCP-{selectedRecipe.id.toUpperCase()}
                </p>
              </div>
            </div>

            {/* 2. Dish Profile Summary Box */}
            <div className="grid grid-cols-3 gap-4 p-4 rounded-xl border border-slate-300 bg-slate-50/70">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Dish / Recipe Name
                </span>
                <p className="text-base font-black text-slate-900">
                  {selectedRecipe.name}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Category
                </span>
                <p className="text-sm font-bold text-slate-800">
                  {selectedRecipe.category || "General"}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Portion / Batch Yield
                </span>
                <p className="text-sm font-bold text-slate-800">
                  {selectedRecipe.portions} {selectedRecipe.portions === 1 ? "Plate" : "Plates"} Batch
                </p>
              </div>
            </div>

            {/* 3. Core Financial KPIs (4 Cards in a Row) */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-slate-300 bg-white text-center">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Current Menu Price
                </span>
                <p className="text-lg font-black text-slate-900 mt-1">
                  {selectedRecipe.menuPrice ? formatTaka(selectedRecipe.menuPrice, 0) : "Not Set"}
                </p>
                <span className="text-[9px] text-slate-400">Customer Selling Rate</span>
              </div>

              <div className="p-3 rounded-lg border-2 border-orange-500/40 bg-orange-50/30 text-center">
                <span className="text-[10px] font-bold uppercase text-orange-700">
                  Total Real Cost / Plate
                </span>
                <p className="text-lg font-black text-orange-600 mt-1 font-mono">
                  {formatTaka(selectedRecipeCost.total)}
                </p>
                <span className="text-[9px] text-slate-500">Pure Raw Ingredients</span>
              </div>

              <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-50/30 text-center">
                <span className="text-[10px] font-bold uppercase text-emerald-700">
                  Net Profit / Plate
                </span>
                <p className="text-lg font-black text-emerald-600 mt-1 font-mono">
                  {selectedRecipeCost.profit !== null
                    ? `${selectedRecipeCost.profit >= 0 ? "+" : ""}${formatTaka(selectedRecipeCost.profit)}`
                    : "—"}
                </p>
                <span className="text-[9px] text-emerald-700 font-semibold">
                  {selectedRecipeCost.profitMarginPct !== null
                    ? `${selectedRecipeCost.profitMarginPct.toFixed(1)}% margin`
                    : ""}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-300 bg-white text-center">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Food Cost %
                </span>
                <p className="text-lg font-black text-slate-900 mt-1 font-mono">
                  {selectedRecipeCost.fc !== null
                    ? `${selectedRecipeCost.fc.toFixed(1)}%`
                    : "—"}
                </p>
              </div>
            </div>

            {/* 4. Recipe Ingredients Breakdown Table */}
            <div>
              <div className="mb-2 flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Kitchen Recipe Ingredients ({selectedRecipe.lines?.length || 0} Items)
                </h3>
                <span className="text-[11px] text-slate-500">
                  Calculated for 1 plate portion
                </span>
              </div>

              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                    <th className="p-2 text-center w-10 border-r border-slate-300">#</th>
                    <th className="p-2 text-left border-r border-slate-300">Ingredient / Item Name</th>
                    <th className="p-2 text-center w-28 border-r border-slate-300">Quantity / Plate</th>
                    <th className="p-2 text-right w-28 border-r border-slate-300">Market Rate (৳)</th>
                    <th className="p-2 text-right w-28 border-r border-slate-300">Line Cost (৳)</th>
                    <th className="p-2 text-right w-20">% of Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {!selectedRecipe.lines || selectedRecipe.lines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400">
                        No ingredients listed in this recipe.
                      </td>
                    </tr>
                  ) : (
                    selectedRecipe.lines.map((line, idx) => {
                      const foundIng = ingredients[line.ing];
                      const currentName = line.customName || foundIng?.name || line.ing || "";
                      const currentUnit = (line.unit || foundIng?.unit || "kg");
                      const unitInfo = UNITS[currentUnit] || UNITS.kg;
                      const currentPrice =
                        line.price !== undefined && line.price > 0
                          ? line.price
                          : foundIng?.price || 0;
                      const costLine = selectedRecipeCost.lines[idx]?.cost || 0;
                      const linePct = selectedRecipeCost.total > 0
                        ? (costLine / selectedRecipeCost.total) * 100
                        : 0;

                      return (
                        <tr
                          key={idx}
                          className="border-b border-slate-200 even:bg-slate-50/50"
                        >
                          <td className="p-2 text-center text-slate-400 font-mono border-r border-slate-200">
                            {idx + 1}
                          </td>
                          <td className="p-2 font-medium text-slate-900 border-r border-slate-200">
                            {currentName}
                          </td>
                          <td className="p-2 text-center font-mono text-slate-700 border-r border-slate-200">
                            {line.qty} {unitInfo.base}
                          </td>
                          <td className="p-2 text-right font-mono text-slate-700 border-r border-slate-200">
                            {formatTaka(currentPrice)} / {unitInfo.label}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                            {formatTaka(costLine)}
                          </td>
                          <td className="p-2 text-right font-mono text-slate-500">
                            {linePct.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-900 text-slate-900">
                    <td colSpan={4} className="p-2.5 text-right border-r border-slate-300">
                      Total Real Cost per Plate:
                    </td>
                    <td className="p-2.5 text-right font-mono text-sm text-orange-600 border-r border-slate-300">
                      {formatTaka(selectedRecipeCost.total)}
                    </td>
                    <td className="p-2.5 text-right font-mono">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 5. Production Notes & Signatures */}
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-300">
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  Costing Notes & Guidelines
                </span>
                <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside">
                  <li>Costing is calculated on real edible yield after kitchen trimming.</li>
                  <li>No arbitrary overhead markups or artificial waste factors added.</li>
                  <li>Review ingredient market prices periodically for margin accuracy.</li>
                </ul>
              </div>

              <div className="space-y-8 flex flex-col justify-end">
                <div className="flex justify-between gap-6 text-[11px] text-slate-700">
                  <div className="border-t border-slate-400 pt-1 flex-1 text-center">
                    <span>Head Chef Signature</span>
                  </div>
                  <div className="border-t border-slate-400 pt-1 flex-1 text-center">
                    <span>Manager / Owner Approval</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 flex justify-between">
              <span>Generated via MenuSnap Kitchen Costing Studio</span>
              <span>Confidential Restaurant Operating Record</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-slate-500">
            <p className="font-bold">No Dish Selected for Printing</p>
            <p className="text-xs">Please select a dish from the Recipe Costing Studio before printing.</p>
          </div>
        )}
      </div>
      
{/* Modal: Add New Ingredient                                */}
      {/* ======================================================== */}
      <Dialog open={isAddIngredientOpen} onOpenChange={setIsAddIngredientOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShoppingBasket className="w-5 h-5 text-emerald-600" />
              Add Market Ingredient
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Add a new raw ingredient with its bulk purchase rate and usable yield percentage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Ingredient Name</Label>
              <Input
                placeholder="e.g. Fresh Tomatoes, Mozzarella Cheese"
                value={newIngredient.name}
                onChange={(e) => setNewIngredient((prev) => ({ ...prev, name: e.target.value }))}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Unit Type</Label>
                <Select
                  value={newIngredient.unit}
                  onValueChange={(val: UnitKey) => setNewIngredient((prev) => ({ ...prev, unit: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(UNITS).map(([key, u]) => (
                      <SelectItem key={key} value={key}>
                        {u.label} (Base: {u.base})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Purchase Price (৳)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 220"
                  value={newIngredient.price || ""}
                  onChange={(e) =>
                    setNewIngredient((prev) => ({ ...prev, price: Math.max(0, Number(e.target.value) || 0) }))
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Usable Yield %</Label>
                <span className="text-[11px] text-slate-400">100% means zero prep waste</span>
              </div>
              <Input
                type="number"
                min={1}
                max={100}
                placeholder="100"
                value={newIngredient.yield}
                onChange={(e) =>
                  setNewIngredient((prev) => ({
                    ...prev,
                    yield: Math.min(100, Math.max(1, Number(e.target.value) || 100)),
                  }))
                }
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddIngredientOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddIngredient}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Add to Rate List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* Alert Dialog: Confirm Deletion / Clear / Reset           */}
      {/* ======================================================== */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              {itemToDelete?.type === "recipe"
                ? `Delete Recipe "${itemToDelete.name}"?`
                : itemToDelete?.type === "ingredient"
                ? `Delete Ingredient "${itemToDelete.name}"?`
                : itemToDelete?.type === "reset"
                ? "Reset to Sample Benchmark Data?"
                : "Clear All Calculation Data?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              {itemToDelete?.type === "recipe"
                ? "This will permanently remove this dish from your kitchen costing recipes."
                : itemToDelete?.type === "ingredient"
                ? "Recipes currently using this ingredient will display zero cost for this line until updated."
                : itemToDelete?.type === "reset"
                ? "This will replace your current recipes and ingredients with default restaurant benchmarks."
                : "This will remove all your saved recipes and ingredient rate lists permanently."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletion}
              className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
