export type UnitKey = 'kg' | 'litre' | 'pcs' | 'dozen';

export interface UnitInfo {
  label: string;
  banglaLabel: string;
  base: string;
  banglaBase: string;
  factor: number;
}

export const UNITS: Record<UnitKey, UnitInfo> = {
  kg: { label: 'kg', banglaLabel: 'কেজি', base: 'g', banglaBase: 'গ্রাম', factor: 1000 },
  litre: { label: 'Litre', banglaLabel: 'লিটার', base: 'ml', banglaBase: 'মিলি', factor: 1000 },
  pcs: { label: 'Piece', banglaLabel: 'পিস', base: 'pcs', banglaBase: 'পিস', factor: 1 },
  dozen: { label: 'Dozen', banglaLabel: 'ডজন', base: 'pcs', banglaBase: 'পিস', factor: 12 },
};

export interface IngredientItem {
  id: string;
  name: string;
  unit: UnitKey;
  price: number; // Market purchase price in BDT
  yield: number; // Usable portion % (1 to 100, default 100)
}

export interface RecipeLine {
  ing: string; // Ingredient ID or typed name
  customName?: string; // Custom typed item name
  unit?: UnitKey; // Unit of measurement
  price?: number; // Custom rate / price override (BDT)
  yield?: number; // Custom usable yield % (1 to 100)
  qty: number; // Quantity in base unit (grams, ml, or pieces)
}

export interface RecipeItem {
  id: string;
  name: string;
  category: string;
  portions: number; // plates per batch
  packaging?: number; // packaging per plate
  other?: number; // gas & other per plate
  menuPrice?: number; // current menu price
  targetFoodCost?: number; // target food cost % (e.g. 30%)
  lines: RecipeLine[];
}

export interface CostingSettings {
  wastage: number; // % wastage & shrink (default 5%)
  rent: number; // monthly shop rent BDT
  salary: number; // monthly staff salary BDT
  bills: number; // monthly utilities bills BDT
  otherOverhead: number; // other monthly fixed overhead BDT
  plates: number; // monthly plates sold (default 6000)
  foodCost: number; // target food cost % (default 30%)
  margin: number; // target margin % (default 30%)
  vat: number; // VAT % (default 5%)
  commission: number; // delivery app commission % (default 25%)
  rounding: number; // round price to nearest (default 5)
  method: 'cost' | 'foodcost'; // 'cost' = total cost + margin, 'foodcost' = target food cost %
}

export const DEFAULT_SETTINGS: CostingSettings = {
  wastage: 0,
  rent: 0,
  salary: 0,
  bills: 0,
  otherOverhead: 0,
  plates: 0,
  foodCost: 0,
  margin: 0,
  vat: 0,
  commission: 0,
  rounding: 1,
  method: 'cost',
};

export interface CostBreakdown {
  portions: number;
  lines: Array<{ cost: number; g: IngredientItem; unitInfo: UnitInfo }>;
  batch: number; // Total batch ingredient cost
  ing: number; // Per plate raw ingredient cost
  wastage: number; // Wastage cost per plate
  extras: number; // Packaging + gas per plate
  overhead: number; // Fixed overhead per plate
  total: number; // Total cost per plate
  priceA: number; // Price based on target food cost %
  priceB: number; // Price based on total cost + margin %
  suggested: number; // Suggested price before VAT
  withVat: number; // Menu price with VAT
  delivery: number; // Food delivery app price
  menu: number; // Current menu price
  profit: number | null; // Net profit per plate
  fc: number | null; // Actual food cost %
  targetFc: number; // Target food cost % (e.g. 30%)
  recommendedPrice: number; // Recommended selling price based on target food cost %
  ingPct: number; // Raw ingredients % of selling price (or of total cost)
  extrasPct: number; // Packaging % of selling price (or of total cost)
  profitMarginPct: number | null; // Net profit margin % of selling price
  st: 'good' | 'warn' | 'bad' | 'none';
  stLabel: string;
  missing: number;
}

export const SAMPLE_INGREDIENTS: Record<string, IngredientItem> = {
  chicken: { id: 'chicken', name: 'Chicken / Broiler (মুরগি)', unit: 'kg', price: 220, yield: 70 },
  beef: { id: 'beef', name: 'Beef (গরুর মাংস)', unit: 'kg', price: 780, yield: 85 },
  beefmince: { id: 'beefmince', name: 'Beef Mince (বিফ কিমা)', unit: 'kg', price: 750, yield: 90 },
  rice: { id: 'rice', name: 'Basmati Rice (বাসমতি চাল)', unit: 'kg', price: 140, yield: 100 },
  flour: { id: 'flour', name: 'Flour (ময়দা)', unit: 'kg', price: 70, yield: 100 },
  oil: { id: 'oil', name: 'Soybean Oil (সয়াবিন তেল)', unit: 'litre', price: 180, yield: 100 },
  ghee: { id: 'ghee', name: 'Ghee (ঘি)', unit: 'kg', price: 1400, yield: 100 },
  onion: { id: 'onion', name: 'Onion (পেঁয়াজ)', unit: 'kg', price: 80, yield: 90 },
  potato: { id: 'potato', name: 'Potato (আলু)', unit: 'kg', price: 45, yield: 85 },
  veg: { id: 'veg', name: 'Vegetables & Salad (লেটুস, টমেটো, ক্যাপসিকাম)', unit: 'kg', price: 160, yield: 85 },
  egg: { id: 'egg', name: 'Eggs (ডিম)', unit: 'dozen', price: 150, yield: 100 },
  spice: { id: 'spice', name: 'Spices Mix (মসলা মিক্স)', unit: 'kg', price: 600, yield: 100 },
  yogurt: { id: 'yogurt', name: 'Sour Curd / Tok Doi (টক দই)', unit: 'kg', price: 200, yield: 100 },
  bun: { id: 'bun', name: 'Burger Buns (বার্গার বান)', unit: 'pcs', price: 15, yield: 100 },
  cheeseslice: { id: 'cheeseslice', name: 'Cheddar Cheese Slice (চিজ স্লাইস)', unit: 'pcs', price: 25, yield: 100 },
  mozzarella: { id: 'mozzarella', name: 'Mozzarella Cheese (মোজারেলা চিজ)', unit: 'kg', price: 1200, yield: 100 },
  mayo: { id: 'mayo', name: 'Burger Sauce & Mayo (মেয়োনেজ)', unit: 'kg', price: 400, yield: 100 },
  pizzasauce: { id: 'pizzasauce', name: 'Pizza Sauce (পিৎজা সস)', unit: 'kg', price: 300, yield: 100 },
  yeast: { id: 'yeast', name: 'Active Yeast (ইস্ট)', unit: 'kg', price: 600, yield: 100 },
};

export const SAMPLE_RECIPES: Record<string, RecipeItem> = {
  burger: {
    id: 'burger',
    name: 'Beef Cheese Burger',
    category: 'Burgers',
    portions: 1,
    packaging: 0,
    other: 4,
    menuPrice: 300,
    targetFoodCost: 30,
    lines: [
      { ing: 'bun', qty: 1 },
      { ing: 'beefmince', qty: 120 },
      { ing: 'cheeseslice', qty: 1 },
      { ing: 'veg', qty: 40 },
      { ing: 'mayo', qty: 25 },
      { ing: 'oil', qty: 10 },
    ],
  },
  pizza10: {
    id: 'pizza10',
    name: 'Chicken Pizza (10 inch)',
    category: 'Pizza',
    portions: 1,
    packaging: 0,
    other: 15,
    menuPrice: 450,
    targetFoodCost: 30,
    lines: [
      { ing: 'flour', qty: 250 },
      { ing: 'yeast', qty: 5 },
      { ing: 'mozzarella', qty: 150 },
      { ing: 'chicken', qty: 100 },
      { ing: 'pizzasauce', qty: 60 },
      { ing: 'veg', qty: 60 },
      { ing: 'oil', qty: 15 },
    ],
  },
  pizza12: {
    id: 'pizza12',
    name: 'Chicken Pizza (12 inch)',
    category: 'Pizza',
    portions: 1,
    packaging: 0,
    other: 20,
    menuPrice: 650,
    lines: [
      { ing: 'flour', qty: 360 },
      { ing: 'yeast', qty: 7 },
      { ing: 'mozzarella', qty: 216 },
      { ing: 'chicken', qty: 144 },
      { ing: 'pizzasauce', qty: 86 },
      { ing: 'veg', qty: 86 },
      { ing: 'oil', qty: 22 },
    ],
  },
  biryani: {
    id: 'biryani',
    name: 'Chicken Biryani Special',
    category: 'Rice & Biryani',
    portions: 10,
    packaging: 0,
    other: 6,
    menuPrice: 220,
    lines: [
      { ing: 'chicken', qty: 2000 },
      { ing: 'rice', qty: 1500 },
      { ing: 'oil', qty: 250 },
      { ing: 'ghee', qty: 100 },
      { ing: 'onion', qty: 500 },
      { ing: 'potato', qty: 800 },
      { ing: 'yogurt', qty: 300 },
      { ing: 'spice', qty: 120 },
    ],
  },
  tehari: {
    id: 'tehari',
    name: 'Beef Tehari Traditional',
    category: 'Rice & Biryani',
    portions: 10,
    packaging: 0,
    other: 6,
    menuPrice: 250,
    lines: [
      { ing: 'beef', qty: 1500 },
      { ing: 'rice', qty: 1500 },
      { ing: 'oil', qty: 300 },
      { ing: 'onion', qty: 600 },
      { ing: 'spice', qty: 120 },
    ],
  },
  eggcurry: {
    id: 'eggcurry',
    name: 'Egg Bhuna (2 pcs)',
    category: 'Curry & Mains',
    portions: 1,
    packaging: 0,
    other: 3,
    menuPrice: 60,
    lines: [
      { ing: 'egg', qty: 2 },
      { ing: 'oil', qty: 20 },
      { ing: 'onion', qty: 60 },
      { ing: 'spice', qty: 8 },
    ],
  },
};

/**
 * Helper to calculate actual unit cost per base unit (gram/ml/piece) considering yield %
 */
export function calculateUnitCost(ing: { price: number; unit: UnitKey; yield?: number }): number {
  const u = UNITS[ing.unit] || UNITS.kg;
  const yieldRatio = Math.min(Math.max(Number(ing.yield) || 100, 1), 100) / 100;
  return (Number(ing.price) || 0) / u.factor / yieldRatio;
}

/**
 * Calculates monthly fixed overhead per plate
 */
export function calculateOverheadPerPlate(settings: CostingSettings): number {
  const totalMonthlyOverhead =
    (Number(settings.rent) || 0) +
    (Number(settings.salary) || 0) +
    (Number(settings.bills) || 0) +
    (Number(settings.otherOverhead) || 0);
  const monthlyPlates = Math.max(Number(settings.plates) || 1, 1);
  return totalMonthlyOverhead / monthlyPlates;
}

/**
 * Helper to round a number up to the nearest step (e.g. 5 or 10)
 */
export function roundUp(x: number, step: number): number {
  return step > 0 ? Math.ceil(x / step - 1e-9) * step : x;
}

/**
 * Full costing calculation supporting both linked ingredients and direct custom items
 */
export function calculateRecipeCost(
  recipe: RecipeItem,
  ingredients: Record<string, IngredientItem>,
  settings: CostingSettings
): CostBreakdown {
  const portions = Math.max(Number(recipe.portions) || 1, 1);
  let batch = 0;
  let missing = 0;

  const lines = (recipe.lines || []).map((line) => {
    // 1. Try finding by ID
    let g: IngredientItem | null = ingredients[line.ing] || null;
    // 2. Try finding by name match
    if (!g && line.ing) {
      const match = Object.values(ingredients).find(
        (item) => item.name.toLowerCase() === line.ing.toLowerCase()
      );
      if (match) g = match;
    }

    const unitKey: UnitKey = (line.unit || g?.unit || 'kg') as UnitKey;
    const unitInfo = UNITS[unitKey] || UNITS.kg;
    const price = line.price !== undefined && line.price > 0 ? line.price : (g?.price || 0);
    const yieldPct = line.yield !== undefined && line.yield > 0 ? line.yield : (g?.yield || 100);
    const yieldRatio = Math.min(Math.max(yieldPct, 1), 100) / 100;
    const unitCostBase = (Number(price) || 0) / unitInfo.factor / yieldRatio;
    const lineCost = (Number(line.qty) || 0) * unitCostBase;
    batch += lineCost;

    if (!g && !line.price && line.ing) {
      missing++;
    }

    const displayIngredient: IngredientItem = g || {
      id: line.ing || 'custom',
      name: line.customName || line.ing || 'Custom Item',
      unit: unitKey,
      price,
      yield: yieldPct,
    };

    return { cost: lineCost, g: displayIngredient, unitInfo };
  });

  const ing = batch / portions;
  const extras = 0;
  const total = ing;

  const targetFc = Number(recipe.targetFoodCost) > 0 ? Number(recipe.targetFoodCost) : 30;
  const targetFcRatio = Math.max(targetFc, 1) / 100;
  const recommendedPrice = total > 0 ? Math.round(total / targetFcRatio) : 0;

  const menu = Number(recipe.menuPrice) || 0;
  const profit = menu > 0 ? menu - total : null;
  const fc = menu > 0 && total > 0 ? (total / menu) * 100 : null;

  const ingPct = menu > 0 ? (ing / menu) * 100 : (total > 0 ? (ing / total) * 100 : 0);
  const extrasPct = 0;
  const profitMarginPct = menu > 0 && profit !== null ? (profit / menu) * 100 : null;

  return {
    portions,
    lines,
    batch,
    ing,
    wastage: 0,
    extras,
    overhead: 0,
    total,
    priceA: total,
    priceB: total,
    suggested: recommendedPrice,
    withVat: total,
    delivery: total,
    menu,
    profit,
    fc,
    targetFc,
    recommendedPrice,
    ingPct,
    extrasPct,
    profitMarginPct,
    st: profit !== null && profit < 0 ? 'bad' : 'good',
    stLabel: profit !== null && profit < 0 ? 'Loss' : 'Profit',
    missing,
  };
}
