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
  Download,
  Upload,
  RotateCcw,
  Save,
  Info,
  Search,
  ChevronRight,
  ChefHat,
  Printer,
  Sparkles,
  Store,
  Percent,
  AlertTriangle,
} from "lucide-react";
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

  // Primary State
  const [activeTab, setActiveTab] = useState<"menu" | "recipe" | "ing" | "set">("recipe");
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

  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const formatTaka = (amount: number, digits = 2) => {
    return (
      "৳" +
      (Number.isFinite(amount) ? amount : 0).toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: digits,
      })
    );
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

  // ----------------------------------------------------
  // Export & Import Backup JSON
  // ----------------------------------------------------
  const handleExportBackup = () => {
    const payload = {
      app: "restaurant-costing-v1",
      savedAt: new Date().toISOString(),
      businessName: clientUser?.businessName || "My Restaurant",
      ingredients,
      recipes,
      settings,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `menu-costing-backup-${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    toast({
      title: "Backup Exported",
      description: "Downloaded JSON backup file to your device.",
    });
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed || typeof parsed.ingredients !== "object" || typeof parsed.recipes !== "object") {
          throw new Error("Invalid backup file format");
        }

        setIngredients(parsed.ingredients);
        setRecipes(parsed.recipes);
        if (parsed.settings) setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });

        const recipeKeys = Object.keys(parsed.recipes);
        if (recipeKeys.length > 0) {
          setSelectedRecipeId(recipeKeys[0]);
        }

        toast({
          title: "Backup Restored Successfully!",
          description: `Loaded ${Object.keys(parsed.ingredients).length} ingredients & ${recipeKeys.length} recipes.`,
        });
      } catch (err: any) {
        toast({
          title: "Import Failed",
          description: "Could not parse JSON backup file.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Print slip handler
  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 dark:bg-slate-950/40 pb-16">
      {/* Full-width spacious container: no cramped 1280px limit */}
      <div className="w-full max-w-[1760px] mx-auto px-3 sm:px-6 lg:px-8 py-5 space-y-5">
        {/* ======================================================== */}
        {/* Top Header Card                                         */}
        {/* ======================================================== */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400">
                <Calculator className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  Magic Calculation
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/20 font-bold uppercase tracking-wider"
                  >
                    Restaurant Costing
                  </Badge>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                  Complete restaurant menu costing, raw ingredients yield, overheads, and profit analyzer.
                </p>
              </div>
            </div>
          </div>

          {/* Cloud Sync Status & Primary Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-[11px] font-medium text-slate-600 dark:text-slate-300">
              <span
                className={`w-2 h-2 rounded-full ${
                  isCloudSaving ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                }`}
              />
              {isCloudSaving
                ? "Saving to cloud..."
                : lastSavedTime
                ? `Cloud Saved (${lastSavedTime})`
                : "Local & Cloud Ready"}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSaveToCloud(true)}
              disabled={isCloudSaving}
              className="h-9 px-3 text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
            >
              <Save className="h-3.5 w-3.5" />
              Save Now
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportBackup}
              className="h-9 px-3 text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-700"
              title="Download backup file"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-9 px-3 text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-700"
              title="Import backup file"
            >
              <Upload className="h-3.5 w-3.5" />
              Import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportBackup}
            />
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
        {/* Primary Tabs Navigation (4 Complete Tabs)                */}
        {/* ======================================================== */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full space-y-5">
          <div className="flex items-center justify-between overflow-x-auto pb-1 border-b border-slate-200/80 dark:border-slate-800">
            <TabsList className="bg-slate-100/80 dark:bg-slate-900 p-1 rounded-xl h-auto gap-1">
              <TabsTrigger
                value="recipe"
                className="rounded-lg py-2 px-3 sm:px-4 text-xs font-bold gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xs"
              >
                <ChefHat className="w-3.5 h-3.5 text-orange-500" />
                Recipe Costing Studio
              </TabsTrigger>
              <TabsTrigger
                value="menu"
                className="rounded-lg py-2 px-3 sm:px-4 text-xs font-bold gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xs"
              >
                <UtensilsCrossed className="w-3.5 h-3.5 text-amber-500" />
                All Items Overview ({metrics.totalCount})
              </TabsTrigger>
              <TabsTrigger
                value="ing"
                className="rounded-lg py-2 px-3 sm:px-4 text-xs font-bold gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xs"
              >
                <ShoppingBasket className="w-3.5 h-3.5 text-emerald-500" />
                Ingredients & Market Rates ({Object.keys(ingredients).length})
              </TabsTrigger>
              <TabsTrigger
                value="set"
                className="rounded-lg py-2 px-3 sm:px-4 text-xs font-bold gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-purple-500" />
                Backup & Data
              </TabsTrigger>
            </TabsList>

            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setItemToDelete({ type: "reset", name: "Sample Benchmark Data" })}
                className="h-8 text-xs text-slate-500 hover:text-slate-900 gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Defaults
              </Button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: RECIPE COSTING STUDIO (Spacious 3-Panel Layout)   */}
          {/* ======================================================== */}
          <TabsContent value="recipe" className="space-y-5 m-0">
            <div className="flex flex-col lg:flex-row gap-5 items-start w-full">
              {/* Left Column: Dishes List Panel */}
              <div className="w-full lg:w-72 xl:w-80 shrink-0 space-y-3">
                <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
                  <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <ChefHat className="h-4 w-4 text-orange-500" />
                        Dishes ({Object.keys(recipes).length})
                      </span>
                      <Button
                        size="sm"
                        onClick={handleAddRecipe}
                        className="h-7 px-2.5 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 mr-0.5" /> New Dish
                      </Button>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        placeholder="Search recipe..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-xs border-slate-200 dark:border-slate-800"
                      />
                    </div>
                  </div>

                  {/* Recipes List: full height matching workspace */}
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
                            className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between cursor-pointer border ${
                              isSelected
                                ? "bg-orange-500/10 border-orange-500 text-orange-950 dark:text-orange-200 shadow-2xs font-semibold"
                                : "border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <p className="text-xs font-bold truncate leading-tight">{r.name || "Untitled Dish"}</p>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">{r.category || "General"}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md">
                                {formatTaka(c.total)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </Card>
              </div>

              {/* Middle Column: Recipe Editor (Wide, expansive, main workhorse!) */}
              <div className="flex-1 min-w-0 w-full space-y-4">
                {selectedRecipe ? (
                  <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-5 sm:p-6 space-y-6">
                    {/* Header with Title & Action buttons */}
                    <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                          {selectedRecipe.name}
                        </h2>
                        <span className="text-xs text-slate-400">
                          Edit dish recipe, portion yield, and ingredient measurements
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicateRecipe(selectedRecipe.id)}
                          className="h-8 px-3 text-xs border-slate-200 dark:border-slate-800"
                        >
                          <Copy className="w-3.5 h-3.5 mr-1" /> Duplicate
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
                          className="h-8 px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>

                    {/* Dish Profile Inputs: Clean spacious grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Dish Name
                        </Label>
                        <Input
                          value={selectedRecipe.name}
                          onChange={(e) => handleUpdateRecipeField("name", e.target.value)}
                          className="h-10 text-xs sm:text-sm font-semibold"
                          placeholder="e.g. Special Chicken Biryani"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Category
                        </Label>
                        <Input
                          list="recipe-categories"
                          value={selectedRecipe.category}
                          onChange={(e) => handleUpdateRecipeField("category", e.target.value)}
                          className="h-10 text-xs"
                          placeholder="e.g. Burgers, Pizza, Rice"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Portions / Batch Yield
                          </Label>
                          <span className="text-[10px] text-slate-400">Total plates</span>
                        </div>
                        <Input
                          type="number"
                          min={1}
                          value={selectedRecipe.portions}
                          onChange={(e) => handleUpdateRecipeField("portions", Math.max(1, Number(e.target.value) || 1))}
                          className="h-10 text-xs font-mono font-bold"
                          placeholder="1"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Current Menu Price (৳)
                          </Label>
                          <span className="text-[10px] text-slate-400">Optional</span>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          value={selectedRecipe.menuPrice || ""}
                          onChange={(e) => handleUpdateRecipeField("menuPrice", Number(e.target.value) || 0)}
                          className="h-10 text-xs font-mono font-bold"
                          placeholder="Current selling price"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Packaging / Plate (৳)
                          </Label>
                          <span className="text-[10px] text-slate-400">Box & bag</span>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          value={selectedRecipe.packaging || 0}
                          onChange={(e) => handleUpdateRecipeField("packaging", Number(e.target.value) || 0)}
                          className="h-10 text-xs font-mono"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Recipe Line Items Section */}
                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <ShoppingBasket className="w-4 h-4 text-emerald-500" />
                            Recipe Ingredients ({selectedRecipe.lines?.length || 0})
                          </h3>
                          <span className="text-[11px] text-slate-400">
                            Type any ingredient text, choose measurement, and set quantity and rate directly.
                          </span>
                        </div>
                        <Button
                          onClick={handleAddRecipeLine}
                          size="sm"
                          className="h-8 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Ingredient
                        </Button>
                      </div>

                      {/* Ingredients Line Table: Wide, spacious, with text inputs and unit selectors! */}
                      <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                        <Table className="w-full text-xs">
                          <TableHeader className="bg-slate-50 dark:bg-slate-900">
                            <TableRow className="border-slate-200 dark:border-slate-800">
                              <TableHead className="font-semibold text-slate-700 min-w-[220px]">
                                Ingredient / Item Name
                              </TableHead>
                              <TableHead className="font-semibold text-slate-700 min-w-[130px]">
                                Measurement
                              </TableHead>
                              <TableHead className="font-semibold text-slate-700 min-w-[110px]">
                                Quantity
                              </TableHead>
                              <TableHead className="font-semibold text-slate-700 min-w-[130px]">
                                Rate / Unit (৳)
                              </TableHead>
                              <TableHead className="font-semibold text-slate-700 text-right min-w-[100px]">
                                Line Cost
                              </TableHead>
                              <TableHead className="w-[44px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {!selectedRecipe.lines || selectedRecipe.lines.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="py-8 text-center text-slate-400">
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
                                  <TableRow key={idx} className="border-slate-100 dark:border-slate-800 hover:bg-slate-50/50">
                                    {/* 1. Item Name: Text Input with Autocomplete datalist */}
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
                                          className="h-9 text-xs font-semibold border-slate-200 dark:border-slate-700"
                                        />
                                      </div>
                                    </TableCell>

                                    {/* 2. Measurement / Unit Select: pcs, kg, litre, dozen */}
                                    <TableCell className="p-2.5">
                                      <Select
                                        value={currentUnit}
                                        onValueChange={(val: UnitKey) =>
                                          handleUpdateRecipeLine(idx, { unit: val })
                                        }
                                      >
                                        <SelectTrigger className="h-9 text-xs border-slate-200 dark:border-slate-700">
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

                                    {/* 3. Quantity Input with Base Unit Suffix */}
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
                                          className="h-9 text-xs font-mono text-right border-slate-200 dark:border-slate-700"
                                        />
                                        <span className="text-[11px] text-slate-500 font-medium shrink-0 w-8">
                                          {unitInfo.base}
                                        </span>
                                      </div>
                                    </TableCell>

                                    {/* 4. Unit Price / Rate (৳) */}
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
                                          className="h-9 text-xs font-mono text-right border-slate-200 dark:border-slate-700"
                                        />
                                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                                          /{unitInfo.label}
                                        </span>
                                      </div>
                                    </TableCell>

                                    {/* 5. Line Cost */}
                                    <TableCell className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white text-xs">
                                      {formatTaka(costLine)}
                                    </TableCell>

                                    {/* 6. Delete */}
                                    <TableCell className="p-2.5 text-right">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveRecipeLine(idx)}
                                        className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
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
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-xs border border-slate-100 dark:border-slate-800">
                        <span className="font-semibold text-slate-600 dark:text-slate-400">
                          Total Batch Ingredient Cost ({selectedRecipe.portions}{" "}
                          {selectedRecipe.portions === 1 ? "plate" : "plates"}):
                        </span>
                        <span className="font-mono font-bold text-base text-slate-900 dark:text-white">
                          {formatTaka(selectedRecipeCost?.batch || 0)}
                        </span>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-16 text-center border-dashed border-2">
                    <ChefHat className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-700">No Recipe Selected</p>
                    <p className="text-xs text-slate-400 mt-1">Select a dish from the left or create a new recipe.</p>
                  </Card>
                )}
              </div>

              {/* Right Column: Calculation Slip matching template */}
              <div className="w-full lg:w-80 xl:w-96 shrink-0 space-y-4">
                {selectedRecipe && selectedRecipeCost && (
                  <div className="space-y-4 sticky top-4">
                    <Card className="border-2 border-orange-500/20 bg-gradient-to-b from-white to-orange-50/20 dark:from-slate-900 dark:to-slate-900/80 shadow-md p-5 space-y-4">
                      {/* Slip Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-dashed border-slate-200 dark:border-slate-800">
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-orange-500" />
                            Cost & Pricing Slip
                          </h3>
                          <span className="text-[11px] text-slate-400">
                            1 Plate breakdown ({selectedRecipe.portions} plate batch)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handlePrintSlip}
                          className="h-8 px-2.5 text-xs text-slate-500"
                        >
                          <Printer className="w-3.5 h-3.5 mr-1" /> Print
                        </Button>
                      </div>

                      {/* Line breakdown items: Pure Real Costs Only */}
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                          <span>1. Raw Ingredients / Plate</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {formatTaka(selectedRecipeCost.ing)}
                          </span>
                        </div>

                        {selectedRecipeCost.extras > 0 && (
                          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                            <span>2. Packaging / Plate</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              +{formatTaka(selectedRecipeCost.extras)}
                            </span>
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-900 dark:border-slate-100 flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white">
                          <span>Total Real Cost per Plate</span>
                          <span className="font-mono text-base text-orange-600 dark:text-orange-400">
                            {formatTaka(selectedRecipeCost.total)}
                          </span>
                        </div>
                      </div>

                      {/* Big Highlighted Real Value for Product Box */}
                      <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white space-y-1 shadow-sm">
                        <span className="text-[11px] font-semibold tracking-wider uppercase opacity-95">
                          Total Real Cost per Plate
                        </span>
                        <div className="text-3xl font-extrabold font-mono tracking-tight">
                          {formatTaka(selectedRecipeCost.total)}
                        </div>
                        <p className="text-[10px] opacity-85">
                          Real kitchen production value ({selectedRecipe.portions} {selectedRecipe.portions === 1 ? "plate" : "plates"} batch: {formatTaka(selectedRecipeCost.total * selectedRecipe.portions)})
                        </p>
                      </div>

                      {/* Real Selling Price & Profit Comparison (Only if menu price entered) */}
                      {selectedRecipe.menuPrice && selectedRecipe.menuPrice > 0 ? (
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                          <div className="flex justify-between items-center font-semibold">
                            <span>Your Menu Price</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {formatTaka(selectedRecipe.menuPrice, 0)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span>Real Profit / Plate</span>
                            <span
                              className={`font-mono font-bold text-sm ${
                                selectedRecipeCost.profit && selectedRecipeCost.profit > 0
                                  ? "text-emerald-600"
                                  : "text-rose-600"
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
              <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total Menu Dishes
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600">
                    <UtensilsCrossed className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                    {metrics.totalCount}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {metrics.pricedCount} dishes active on menu
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Average Real Cost / Plate
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                    <Calculator className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                    {formatTaka(
                      metrics.totalCount > 0
                        ? evaluatedRecipes.reduce((sum, r) => sum + r.breakdown.total, 0) / metrics.totalCount
                        : 0
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mean kitchen production cost
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Market Ingredients
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                    <ShoppingBasket className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                    {Object.keys(ingredients).length}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Raw materials in pantry list
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Menu Priced Dishes
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                    <Store className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {metrics.pricedCount}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dishes with active selling price
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Menu Items Table Card */}
            <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Search dish or category..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-xs border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-44 h-9 text-xs border-slate-200 dark:border-slate-700">
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
                    className="h-9 px-3.5 text-xs font-bold gap-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Recipe
                  </Button>
                </div>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto w-full">
                <Table className="w-full">
                  <TableHeader className="bg-slate-50/70 dark:bg-slate-900/60">
                    <TableRow className="border-slate-200 dark:border-slate-800">
                      <TableHead className="text-xs font-semibold min-w-[200px]">Item & Category</TableHead>
                      <TableHead className="text-xs font-semibold text-center min-w-[90px]">Portions</TableHead>
                      <TableHead className="text-xs font-semibold text-right min-w-[110px]">Raw Ingredients</TableHead>
                      <TableHead className="text-xs font-semibold text-right min-w-[110px]">Packaging</TableHead>
                      <TableHead className="text-xs font-semibold text-right min-w-[130px]">Total Real Cost</TableHead>
                      <TableHead className="text-xs font-semibold text-right min-w-[110px]">Menu Price</TableHead>
                      <TableHead className="text-xs font-semibold text-right min-w-[110px]">Profit / Plate</TableHead>
                      <TableHead className="text-xs font-semibold text-right min-w-[80px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecipes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-12 text-center text-slate-400">
                          <ChefHat className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p className="font-semibold text-slate-600 dark:text-slate-300">No dishes match criteria</p>
                          <p className="text-xs mt-1">Try another search term or click "Add New Recipe".</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecipes.map(({ id, recipe, breakdown }) => {
                        return (
                          <TableRow
                            key={id}
                            className="border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 cursor-pointer"
                            onClick={() => {
                              setSelectedRecipeId(id);
                              setActiveTab("recipe");
                            }}
                          >
                            <TableCell className="align-middle">
                              <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                                {recipe.name}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
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

                            <TableCell className="align-middle text-right font-mono text-xs">
                              {formatTaka(breakdown.extras)}
                            </TableCell>

                            <TableCell className="align-middle text-right font-mono font-bold text-orange-600 dark:text-orange-400 text-xs">
                              {formatTaka(breakdown.total)}
                            </TableCell>

                            <TableCell className="align-middle text-right font-mono text-xs font-bold">
                              {breakdown.menu > 0 ? formatTaka(breakdown.menu, 0) : "—"}
                            </TableCell>

                            <TableCell className="align-middle text-right font-mono text-xs font-bold">
                              {breakdown.profit !== null ? (
                                <span className={breakdown.profit < 0 ? "text-rose-600" : "text-emerald-600"}>
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
                                className="h-7 px-2 text-xs font-semibold text-orange-600 hover:text-orange-700 hover:bg-orange-50"
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
            <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShoppingBasket className="w-5 h-5 text-emerald-500" />
                    Ingredients & Market Rates (উপাদান ও বাজার দর)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update market purchase rates here. All connected recipes dynamically update their costs.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Search ingredient..."
                      value={ingredientSearch}
                      onChange={(e) => setIngredientSearch(e.target.value)}
                      className="pl-9 h-9 text-xs border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <Button
                    onClick={() => setIsAddIngredientOpen(true)}
                    className="h-9 px-3.5 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Add Ingredient
                  </Button>
                </div>
              </div>

              {/* Informational Formula Strip */}
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/30 text-xs text-emerald-900 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Real Cost Formula:</strong> Real Cost = Purchase Price ÷ (Usable Yield % ÷ 100).
                    e.g. 1kg Chicken @ ৳220 with 70% yield costs <strong>৳314 / kg (৳0.314/g)</strong> after trimming.
                  </span>
                </div>
              </div>

              {/* Ingredients Table */}
              <div className="overflow-x-auto w-full">
                <Table className="w-full">
                  <TableHeader className="bg-slate-50/70 dark:bg-slate-900/60">
                    <TableRow className="border-slate-200 dark:border-slate-800">
                      <TableHead className="text-xs font-semibold min-w-[200px]">Ingredient Name</TableHead>
                      <TableHead className="text-xs font-semibold min-w-[100px]">Unit Type</TableHead>
                      <TableHead className="text-xs font-semibold text-right min-w-[130px]">Purchase Price (৳)</TableHead>
                      <TableHead className="text-xs font-semibold text-right min-w-[120px]">Usable Yield %</TableHead>
                      <TableHead className="text-xs font-semibold text-right min-w-[140px]">Real Cost / Unit</TableHead>
                      <TableHead className="text-xs font-semibold text-right min-w-[130px]">Cost / Base (g/ml)</TableHead>
                      <TableHead className="text-xs font-semibold text-center min-w-[100px]">In Recipes</TableHead>
                      <TableHead className="text-xs font-semibold text-right min-w-[70px]">Action</TableHead>
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
                        const baseCost = calculateUnitCost(ing);
                        const realCost = baseCost * unitInfo.factor;
                        const usageCount = ingredientUsageCounts[id] || 0;

                        return (
                          <TableRow key={id} className="border-slate-100 dark:border-slate-800">
                            <TableCell className="align-middle">
                              <Input
                                value={ing.name}
                                onChange={(e) => handleUpdateIngredient(id, { name: e.target.value })}
                                className="h-8 text-xs font-semibold"
                              />
                            </TableCell>

                            <TableCell className="align-middle">
                              <Select
                                value={ing.unit}
                                onValueChange={(val: UnitKey) => handleUpdateIngredient(id, { unit: val })}
                              >
                                <SelectTrigger className="h-8 text-xs">
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
                                onChange={(e) => handleUpdateIngredient(id, { price: Number(e.target.value) || 0 })}
                                className="h-8 text-xs text-right font-mono"
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
                                  className="h-8 w-16 text-xs text-right font-mono"
                                />
                                <span className="text-xs text-slate-400">%</span>
                              </div>
                            </TableCell>

                            <TableCell className="align-middle text-right font-mono text-xs font-bold text-slate-900 dark:text-white">
                              {formatTaka(realCost)}{" "}
                              <span className="text-[10px] text-slate-400 font-normal">/{unitInfo.label}</span>
                            </TableCell>

                            <TableCell className="align-middle text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              {formatTaka(baseCost, 3)}{" "}
                              <span className="text-[10px] text-slate-400 font-normal">/{unitInfo.base}</span>
                            </TableCell>

                            <TableCell className="align-middle text-center">
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                {usageCount} {usageCount === 1 ? "recipe" : "recipes"}
                              </Badge>
                            </TableCell>

                            <TableCell className="align-middle text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setItemToDelete({ type: "ingredient", id, name: ing.name })}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
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

          {/* ======================================================== */}
          {/* TAB 4: BACKUP & DATA (ব্যাকআপ ও ডেটাবেস)                 */}
          {/* ======================================================== */}
          <TabsContent value="set" className="space-y-5 m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Pure Real Food Costing Guide Card */}
              <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-5 space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Pure Real Food Costing (বাস্তব খাদ্য খরচ)
                    </h3>
                    <p className="text-xs text-slate-400">
                      100% real product value based only on ingredients and direct consumables
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      How Real Cost per Plate is Calculated:
                    </p>
                    <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <li>
                        <strong>Line Item Cost:</strong> Quantity × (Market Price ÷ Usable Yield %).
                      </li>
                      <li>
                        <strong>Raw Ingredients / Plate:</strong> Total Batch Ingredient Cost ÷ Portions cooked.
                      </li>
                      <li>
                        <strong>Packaging:</strong> Specific dish packaging box or container (only if entered for that recipe).
                      </li>
                      <li>
                        <strong>Total Real Cost:</strong> Raw Ingredients + Direct Extras.
                      </li>
                    </ul>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    No artificial wastage percentages, no assumed overheads, no mandatory VAT, and no arbitrary profit markups.
                  </p>
                </div>
              </Card>

              {/* Backup & Persistence Card */}
              <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-5 space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Backup & Data Storage (ব্যাকআপ ও ডেটাবেস)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Export your restaurant costing configuration as a JSON file, or restore from backup anytime.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2.5">
                    <Button
                      onClick={handleExportBackup}
                      className="h-9 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Backup (JSON)
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-9 text-xs font-bold gap-1.5 border-slate-200 dark:border-slate-700"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Restore from Backup
                    </Button>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setItemToDelete({ type: "reset", name: "Sample Benchmark Recipes" })}
                      className="h-8 text-xs text-slate-600 hover:text-slate-900 gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset Sample Dishes
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setItemToDelete({ type: "clear", name: "All Recipes and Ingredients" })}
                      className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1.5 border-rose-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear All Records
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ======================================================== */}
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
    </div>
  );
}
