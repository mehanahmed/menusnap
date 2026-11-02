import { usePreferences, type LanguageCode } from '@/context/PreferencesContext';

export interface MagicCalcDictionary {
  pageTitle: string;
  badgeCosting: string;
  pageSubtitle: string;
  autoSaved: string;
  tabRecipeStudio: string;
  tabAllItems: string;
  tabIngredients: string;
  dishes: string;
  searchRecipe: string;
  newDish: string;
  editDishSubtitle: string;
  duplicate: string;
  delete: string;
  dishName: string;
  category: string;
  currentMenuPrice: string;
  sellingPriceLabel: string;
  portionsYield: string;
  totalPlates: string;
  plate: string;
  plates: string;
  recipeIngredients: string;
  itemsCount: string;
  addIngredient: string;
  colIngredientName: string;
  colMeasurement: string;
  colQuantity: string;
  colRateUnit: string;
  colLineCost: string;
  totalBatchCost: string;
  slipTitle: string;
  slipSubtitle: string;
  print: string;
  totalRealCost: string;
  pureRawCostNote: string;
  rawIngredientsPerPlate: string;
  realKitchenCost: string;
  costProfitShare: string;
  highFoodCost: string;
  healthyMargin: string;
  customerPrice: string;
  foodCostLabel: string;
  netRealProfit: string;
  yourMenuPrice: string;
  realProfitPerPlate: string;
  overviewTitle: string;
  overviewSubtitle: string;
  colBatchPortions: string;
  colTotalCost: string;
  colFoodCostPct: string;
  colMarginStatus: string;
  colActions: string;
  ingredientsTitle: string;
  ingredientsSubtitle: string;
  formulaNote: string;
  colUnitType: string;
  colPurchasePrice: string;
  colUsableYield: string;
  colRealCostUnit: string;
  colCostBase: string;
  colInRecipes: string;
  recipesCount: string;
  addMarketIngredient: string;
  dialogAddTitle: string;
  dialogAddDesc: string;
  cancel: string;
  confirm: string;
}

export const MAGIC_CALC_TRANSLATIONS: Record<LanguageCode, MagicCalcDictionary> = {
  en: {
    pageTitle: 'Magic Calculation',
    badgeCosting: 'RESTAURANT COSTING',
    pageSubtitle: 'Real restaurant menu costing, raw kitchen ingredients yield, and profit analyzer.',
    autoSaved: 'Auto-saved',
    tabRecipeStudio: 'Recipe Costing Studio',
    tabAllItems: 'All Items Overview',
    tabIngredients: 'Ingredients & Market Rates',
    dishes: 'DISHES',
    searchRecipe: 'Search recipe...',
    newDish: 'New Dish',
    editDishSubtitle: 'Edit dish recipe, portion yield, and ingredient measurements',
    duplicate: 'Duplicate',
    delete: 'Delete',
    dishName: 'Dish Name',
    category: 'Category',
    currentMenuPrice: 'Current Menu Price',
    sellingPriceLabel: 'Selling price',
    portionsYield: 'Portions / Batch Yield',
    totalPlates: 'Total plates',
    plate: 'Plate',
    plates: 'Plates',
    recipeIngredients: 'RECIPE INGREDIENTS',
    itemsCount: 'Items',
    addIngredient: 'Add Ingredient',
    colIngredientName: 'INGREDIENT / ITEM NAME',
    colMeasurement: 'MEASUREMENT',
    colQuantity: 'QUANTITY',
    colRateUnit: 'RATE / UNIT',
    colLineCost: 'LINE COST',
    totalBatchCost: 'Total Batch Ingredient Cost',
    slipTitle: 'Cost & Pricing Slip',
    slipSubtitle: '1 Plate production analysis',
    print: 'Print',
    totalRealCost: 'TOTAL REAL PRODUCTION COST',
    pureRawCostNote: 'Pure raw kitchen ingredients per plate',
    rawIngredientsPerPlate: 'Raw Ingredients / Plate',
    realKitchenCost: 'Real Kitchen Cost',
    costProfitShare: 'COST & PROFIT SHARE',
    highFoodCost: 'High Food Cost',
    healthyMargin: 'Healthy Margin',
    customerPrice: 'Customer Price',
    foodCostLabel: 'Food Cost',
    netRealProfit: 'Net Real Profit',
    yourMenuPrice: 'Your Menu Price',
    realProfitPerPlate: 'Real Profit / Plate',
    overviewTitle: 'All Dishes & Menu Profitability',
    overviewSubtitle: 'Compare food cost percentages and real profits across your entire restaurant menu.',
    colBatchPortions: 'Batch Portions',
    colTotalCost: 'Real Kitchen Cost',
    colFoodCostPct: 'Food Cost %',
    colMarginStatus: 'Margin Status',
    colActions: 'Actions',
    ingredientsTitle: 'Ingredients & Market Rates',
    ingredientsSubtitle: 'Update market purchase rates here. All connected recipes dynamically update their costs.',
    formulaNote: 'Real Cost Formula: Real Cost = Purchase Price / (Usable Yield % / 100). e.g. 1kg Chicken at wholesale with 70% yield costs more per kg after trimming.',
    colUnitType: 'UNIT TYPE',
    colPurchasePrice: 'PURCHASE PRICE',
    colUsableYield: 'USABLE YIELD %',
    colRealCostUnit: 'REAL COST / UNIT',
    colCostBase: 'COST / BASE (G/ML)',
    colInRecipes: 'IN RECIPES',
    recipesCount: 'recipes',
    addMarketIngredient: 'Add Ingredient',
    dialogAddTitle: 'Add Market Ingredient',
    dialogAddDesc: 'Add a new raw ingredient with its bulk purchase rate and usable yield percentage.',
    cancel: 'Cancel',
    confirm: 'Confirm',
  },
  ar: {
    pageTitle: 'الحساب السحري',
    badgeCosting: 'تكلفة المطاعم',
    pageSubtitle: 'حساب تكلفة قائمة طعام المطعم بدقة، وحساب هدر المطبخ وتحليل الأرباح.',
    autoSaved: 'تم الحفظ تلقائياً',
    tabRecipeStudio: 'استوديو تكلفة الوصفات',
    tabAllItems: 'نظرة عامة على العناصر',
    tabIngredients: 'المكونات وأسعار السوق',
    dishes: 'الأطباق',
    searchRecipe: 'البحث في الوصفات...',
    newDish: 'طبق جديد',
    editDishSubtitle: 'تعديل وصفة الطبق، وإنتاج الحصص، وكميات المكونات',
    duplicate: 'نسخ',
    delete: 'حذف',
    dishName: 'اسم الطبق',
    category: 'الفئة',
    currentMenuPrice: 'سعر القائمة الحالي',
    sellingPriceLabel: 'سعر البيع',
    portionsYield: 'عدد الحصص / إنتاج الوجبة',
    totalPlates: 'إجمالي الوجبات',
    plate: 'وجبة',
    plates: 'وجبات',
    recipeIngredients: 'مكونات الوصفة',
    itemsCount: 'عناصر',
    addIngredient: 'إضافة مكون',
    colIngredientName: 'اسم المكون / الصنف',
    colMeasurement: 'وحدة القياس',
    colQuantity: 'الكمية',
    colRateUnit: 'السعر / الوحدة',
    colLineCost: 'التكلفة',
    totalBatchCost: 'إجمالي تكلفة مكونات الوجبة',
    slipTitle: 'إيصال التكلفة والتسعير',
    slipSubtitle: 'تحليل إنتاج الوجبة الواحدة',
    print: 'طباعة',
    totalRealCost: 'إجمالي تكلفة الإنتاج الحقيقية',
    pureRawCostNote: 'المكونات الخام النقية لكل وجبة',
    rawIngredientsPerPlate: 'المكونات الخام / وجبة',
    realKitchenCost: 'تكلفة المطبخ الحقيقية',
    costProfitShare: 'نسبة التكلفة والربح',
    highFoodCost: 'تكلفة طعام مرتفعة',
    healthyMargin: 'هامش ربح ممتاز',
    customerPrice: 'سعر العميل',
    foodCostLabel: 'تكلفة الطعام',
    netRealProfit: 'صافي الربح الحقيقي',
    yourMenuPrice: 'سعر البيع لديك',
    realProfitPerPlate: 'الربح الحقيقي / وجبة',
    overviewTitle: 'جميع الأطباق وربحية القائمة',
    overviewSubtitle: 'قارن نسب تكلفة الطعام والأرباح الحقيقية عبر قائمة مطعمك بالكامل.',
    colBatchPortions: 'حصص الوجبة',
    colTotalCost: 'تكلفة المطبخ الحقيقية',
    colFoodCostPct: 'نسبة تكلفة الطعام %',
    colMarginStatus: 'حالة الهامش',
    colActions: 'الإجراءات',
    ingredientsTitle: 'المكونات وأسعار السوق',
    ingredientsSubtitle: 'قم بتحديث أسعار الشراء هنا. يتم تحديث تكاليف جميع الوصفات المرتبطة تلقائياً.',
    formulaNote: 'معادلة التكلفة الحقيقية: التكلفة الحقيقية = سعر الشراء / (نسبة الجزء القابل للاستخدام / 100).',
    colUnitType: 'نوع الوحدة',
    colPurchasePrice: 'سعر الشراء',
    colUsableYield: 'نسبة الاستخدام %',
    colRealCostUnit: 'التكلفة الحقيقية / الوحدة',
    colCostBase: 'التكلفة / الأساس (غ/مل)',
    colInRecipes: 'في الوصفات',
    recipesCount: 'وصفات',
    addMarketIngredient: 'إضافة مكون جديد',
    dialogAddTitle: 'إضافة مكون من السوق',
    dialogAddDesc: 'أضف مكوناً خاماً جديداً مع سعر الشراء بالجملة ونسبة الاستخدام الصافية.',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
  },
  es: {
    pageTitle: 'Cálculo Mágico',
    badgeCosting: 'COSTEO DE RESTAURANTE',
    pageSubtitle: 'Costeo real de menú de restaurante, rendimiento de ingredientes y análisis de ganancias.',
    autoSaved: 'Guardado automático',
    tabRecipeStudio: 'Estudio de Costeo de Recetas',
    tabAllItems: 'Resumen de Artículos',
    tabIngredients: 'Ingredientes y Precios de Mercado',
    dishes: 'PLATOS',
    searchRecipe: 'Buscar receta...',
    newDish: 'Nuevo Plato',
    editDishSubtitle: 'Editar receta de plato, rendimiento de porciones y medidas de ingredientes',
    duplicate: 'Duplicar',
    delete: 'Eliminar',
    dishName: 'Nombre del Plato',
    category: 'Categoría',
    currentMenuPrice: 'Precio Actual del Menú',
    sellingPriceLabel: 'Precio de venta',
    portionsYield: 'Porciones / Rendimiento',
    totalPlates: 'Total de platos',
    plate: 'Plato',
    plates: 'Platos',
    recipeIngredients: 'INGREDIENTES DE LA RECETA',
    itemsCount: 'Artículos',
    addIngredient: 'Añadir Ingrediente',
    colIngredientName: 'NOMBRE DEL INGREDIENTE',
    colMeasurement: 'MEDIDA',
    colQuantity: 'CANTIDAD',
    colRateUnit: 'PRECIO / UNIDAD',
    colLineCost: 'COSTO LÍNEA',
    totalBatchCost: 'Costo Total de Ingredientes del Lote',
    slipTitle: 'Ficha de Costo y Precios',
    slipSubtitle: 'Análisis de producción de 1 plato',
    print: 'Imprimir',
    totalRealCost: 'COSTO REAL TOTAL DE PRODUCCIÓN',
    pureRawCostNote: 'Ingredientes crudos puros por plato',
    rawIngredientsPerPlate: 'Ingredientes Crudos / Plato',
    realKitchenCost: 'Costo Real de Cocina',
    costProfitShare: 'DISTRIBUCIÓN DE COSTO Y GANANCIA',
    highFoodCost: 'Costo de Comida Alto',
    healthyMargin: 'Margen Saludable',
    customerPrice: 'Precio al Cliente',
    foodCostLabel: 'Costo de Alimentos',
    netRealProfit: 'Ganancia Real Neta',
    yourMenuPrice: 'Su Precio de Menú',
    realProfitPerPlate: 'Ganancia Real / Plato',
    overviewTitle: 'Todos los Platos y Rentabilidad del Menú',
    overviewSubtitle: 'Compare los porcentajes de costo de alimentos y las ganancias reales en todo su menú.',
    colBatchPortions: 'Porciones del Lote',
    colTotalCost: 'Costo Real de Cocina',
    colFoodCostPct: '% Costo Alimentos',
    colMarginStatus: 'Estado del Margen',
    colActions: 'Acciones',
    ingredientsTitle: 'Ingredientes y Precios de Mercado',
    ingredientsSubtitle: 'Actualice los precios de compra aquí. Todas las recetas conectadas se actualizan automáticamente.',
    formulaNote: 'Fórmula de Costo Real: Costo Real = Precio de Compra / (Rendimiento Útil % / 100).',
    colUnitType: 'TIPO DE UNIDAD',
    colPurchasePrice: 'PRECIO DE COMPRA',
    colUsableYield: '% RENDIMIENTO ÚTIL',
    colRealCostUnit: 'COSTO REAL / UNIDAD',
    colCostBase: 'COSTO / BASE (G/ML)',
    colInRecipes: 'EN RECETAS',
    recipesCount: 'recetas',
    addMarketIngredient: 'Añadir Ingrediente',
    dialogAddTitle: 'Añadir Ingrediente de Mercado',
    dialogAddDesc: 'Añada un nuevo ingrediente crudo con su precio al por mayor y porcentaje de rendimiento.',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
  },
  bn: {
    pageTitle: '\u09ae\u09cd\u09af\u09be\u099c\u09bf\u0995 \u0995\u09cd\u09af\u09be\u09b2\u0995\u09c1\u09b2\u09c7\u09b6\u09a8',
    badgeCosting: '\u09b0\u09c7\u09b8\u09cd\u09a4\u09cb\u09b0\u09be\u0981 \u0995\u09b8\u09cd\u099f\u09bf\u0982',
    pageSubtitle: '\u09b0\u09c7\u09b8\u09cd\u09a4\u09cb\u09b0\u09be\u0981 \u09ae\u09c7\u09a8\u09c1\u09b0 \u09b8\u09a0\u09bf\u0995 \u0995\u09b8\u09cd\u099f\u09bf\u0982, \u0995\u09bf\u099a\u09c7\u09a8 \u0987\u09df\u09bf\u09b2\u09cd\u09a1 \u0993 \u09aa\u09cd\u09b0\u09ab\u09bf\u099f \u098f\u09a8\u09be\u09b2\u09be\u0987\u099c\u09be\u09b0\u0964',
    autoSaved: '\u0985\u099f\u09cb-\u09b8\u09c7\u09ad\u09a1',
    tabRecipeStudio: '\u09b0\u09c7\u09b8\u09bf\u09aa\u09bf \u0995\u09b8\u09cd\u099f\u09bf\u0982 \u09b8\u09cd\u099f\u09c1\u09a1\u09bf\u0993',
    tabAllItems: '\u09b8\u0995\u09b2 \u0986\u0987\u099f\u09c7\u09ae \u0993\u09ad\u09be\u09b0\u09ad\u09bf\u0989',
    tabIngredients: '\u0989\u09aa\u0995\u09b0\u09a3 \u0993 \u09ac\u09be\u099c\u09be\u09b0 \u09a6\u09b0',
    dishes: '\u09a1\u09bf\u09b6 \u09b8\u09ae\u09c2\u09b9',
    searchRecipe: '\u09b0\u09c7\u09b8\u09bf\u09aa\u09bf \u0996\u09c1\u0981\u099c\u09c1\u09a8...',
    newDish: '\u09a8\u09a4\u09c1\u09a8 \u09a1\u09bf\u09b6',
    editDishSubtitle: '\u09a1\u09bf\u09b6 \u09b0\u09c7\u09b8\u09bf\u09aa\u09bf, \u09aa\u09b0\u09bf\u09ae\u09be\u09a3 \u0993 \u0989\u09aa\u0995\u09b0\u09a3 \u098f\u09a1\u09bf\u099f \u0995\u09b0\u09c1\u09a8',
    duplicate: '\u0995\u09aa\u09bf \u0995\u09b0\u09c1\u09a8',
    delete: '\u09ae\u09c1\u099b\u09c1\u09a8',
    dishName: '\u09a1\u09bf\u09b6\u09c7\u09b0 \u09a8\u09be\u09ae',
    category: '\u0995\u09cd\u09af\u09be\u099f\u09be\u0997\u09b0\u09bf',
    currentMenuPrice: '\u09ac\u09b0\u09cd\u09a4\u09ae\u09be\u09a8 \u09ae\u09c7\u09a8\u09c1 \u09ae\u09c2\u09b2\u09cd\u09af',
    sellingPriceLabel: '\u09ac\u09bf\u0995\u09cd\u09b0\u09df \u09ae\u09c2\u09b2\u09cd\u09af',
    portionsYield: '\u09aa\u09b0\u09bf\u09ae\u09be\u09a3 / \u09ac\u09cd\u09af\u09be\u099a \u0987\u09df\u09bf\u09b2\u09cd\u09a1',
    totalPlates: '\u09ae\u09cb\u099f \u09aa\u09cd\u09b2\u09c7\u099f',
    plate: '\u09aa\u09cd\u09b2\u09c7\u099f',
    plates: '\u09aa\u09cd\u09b2\u09c7\u099f',
    recipeIngredients: '\u09b0\u09c7\u09b8\u09bf\u09aa\u09bf\u09b0 \u0989\u09aa\u0995\u09b0\u09a3\u09b8\u09ae\u09c2\u09b9',
    itemsCount: '\u0986\u0987\u099f\u09c7\u09ae',
    addIngredient: '\u0989\u09aa\u0995\u09b0\u09a3 \u09af\u09c1\u0995\u09cd\u09a4 \u0995\u09b0\u09c1\u09a8',
    colIngredientName: '\u0989\u09aa\u0995\u09b0\u09a3\u09c7\u09b0 \u09a8\u09be\u09ae',
    colMeasurement: '\u098f\u0995\u0995',
    colQuantity: '\u09aa\u09b0\u09bf\u09ae\u09be\u09a3',
    colRateUnit: '\u09a6\u09b0 / \u098f\u0995\u0995',
    colLineCost: '\u0996\u09b0\u099a',
    totalBatchCost: '\u09ac\u09cd\u09af\u09be\u099a\u09c7\u09b0 \u09ae\u09cb\u099f \u0989\u09aa\u0995\u09b0\u09a3 \u0996\u09b0\u099a',
    slipTitle: '\u0995\u09b8\u09cd\u099f \u0993 \u09aa\u09cd\u09b0\u09be\u0987\u09b8\u09bf\u0982 \u09b8\u09cd\u09b2\u09bf\u09aa',
    slipSubtitle: '\u09e7 \u09aa\u09cd\u09b2\u09c7\u099f \u09aa\u09cd\u09b0\u09a1\u09be\u0995\u09b6\u09a8 \u098f\u09a8\u09be\u09b2\u09be\u0987\u09b8\u09bf\u09b8',
    print: '\u09aa\u09cd\u09b0\u09bf\u09a8\u09cd\u099f',
    totalRealCost: '\u09aa\u09cd\u09b0\u0995\u09c3\u09a4 \u09ae\u09cb\u099f \u09aa\u09cd\u09b0\u09a1\u09be\u0995\u09b6\u09a8 \u0996\u09b0\u099a',
    pureRawCostNote: '\u09aa\u09cd\u09b2\u09c7\u099f \u09aa\u09cd\u09b0\u09a4\u09bf \u09aa\u09cd\u09b0\u0995\u09c3\u09a4 \u0989\u09aa\u0995\u09b0\u09a3 \u0996\u09b0\u099a',
    rawIngredientsPerPlate: '\u09b0\u09be \u0987\u09a8\u0997\u09cd\u09b0\u09c7\u09a1\u09bf\u09df\u09c7\u09a8\u09cd\u099f\u09b8 / \u09aa\u09cd\u09b2\u09c7\u099f',
    realKitchenCost: '\u09aa\u09cd\u09b0\u0995\u09c3\u09a4 \u0995\u09bf\u099a\u09c7\u09a8 \u0996\u09b0\u099a',
    costProfitShare: '\u0996\u09b0\u099a \u0993 \u09b2\u09be\u09ad\u09c7\u09b0 \u09b9\u09be\u09b0',
    highFoodCost: '\u0989\u099a\u09cd\u099a \u0996\u09be\u09ac\u09be\u09b0 \u0996\u09b0\u099a',
    healthyMargin: '\u09b8\u09a0\u09bf\u0995 \u09ae\u09be\u09b0\u09cd\u099c\u09bf\u09a8',
    customerPrice: '\u0995\u09be\u09b8\u09cd\u099f\u09ae\u09be\u09b0 \u09ae\u09c2\u09b2\u09cd\u09af',
    foodCostLabel: '\u09ab\u09c1\u09a1 \u0995\u09b8\u09cd\u099f',
    netRealProfit: '\u09aa\u09cd\u09b0\u0995\u09c3\u09a4 \u09a8\u09bf\u099f \u09b2\u09be\u09ad',
    yourMenuPrice: '\u0986\u09aa\u09a8\u09be\u09b0 \u09ae\u09c7\u09a8\u09c1 \u09ae\u09c2\u09b2\u09cd\u09af',
    realProfitPerPlate: '\u09aa\u09cd\u09b0\u0995\u09c3\u09a4 \u09b2\u09be\u09ad / \u09aa\u09cd\u09b2\u09c7\u099f',
    overviewTitle: '\u09b8\u09ac \u09a1\u09bf\u09b6 \u0993 \u09ae\u09c7\u09a8\u09c1 \u09b2\u09be\u09ad\u099c\u09a8\u0995\u09a4\u09be',
    overviewSubtitle: '\u0986\u09aa\u09a8\u09be\u09b0 \u09b0\u09c7\u09b8\u09cd\u09a4\u09cb\u09b0\u09be\u0981 \u09ae\u09c7\u09a8\u09c1\u09b0 \u09ab\u09c1\u09a1 \u0995\u09b8\u09cd\u099f \u0993 \u09aa\u09cd\u09b0\u09ab\u09bf\u099f \u09a4\u09c1\u09b2\u09a8\u09be \u0995\u09b0\u09c1\u09a8\u0964',
    colBatchPortions: '\u09ac\u09cd\u09af\u09be\u099a \u09aa\u09b0\u09bf\u09ae\u09be\u09a3',
    colTotalCost: '\u09aa\u09cd\u09b0\u0995\u09c3\u09a4 \u0995\u09bf\u099a\u09c7\u09a8 \u0996\u09b0\u099a',
    colFoodCostPct: '\u09ab\u09c1\u09a1 \u0995\u09b8\u09cd\u099f %',
    colMarginStatus: '\u09ae\u09be\u09b0\u09cd\u099c\u09bf\u09a8 \u09b8\u09cd\u099f\u09cd\u09af\u09be\u099f\u09be\u09b8',
    colActions: '\u0985\u09cd\u09af\u09be\u0995\u09b6\u09a8',
    ingredientsTitle: '\u0989\u09aa\u0995\u09b0\u09a3 \u0993 \u09ac\u09be\u099c\u09be\u09b0 \u09a6\u09b0',
    ingredientsSubtitle: '\u098f\u0996\u09be\u09a8\u09c7 \u09ac\u09be\u099c\u09be\u09b0 \u09a6\u09b0 \u0986\u09aa\u09a1\u09c7\u099f \u0995\u09b0\u09c1\u09a8, \u09b8\u09ac \u09b0\u09c7\u09b8\u09bf\u09aa\u09bf \u0985\u099f\u09cb \u0986\u09aa\u09a1\u09c7\u099f \u09b9\u09ac\u09c7\u0964',
    formulaNote: '\u0986\u09b6\u09b2 \u0996\u09b0\u099a \u09b8\u09c2\u09a4\u09cd\u09b0: \u0986\u09b6\u09b2 \u0996\u09b0\u099a = \u09ac\u09be\u099c\u09be\u09b0 \u09a6\u09b0 / (\u0987\u09df\u09bf\u09b2\u09cd\u09a1 % / \u09e7\u09e6\u09e6)\u0964',
    colUnitType: '\u098f\u0995\u0995\u09c7\u09b0 \u09a7\u09b0\u09a8',
    colPurchasePrice: '\u0995\u09cd\u09b0\u09df \u09ae\u09c2\u09b2\u09cd\u09af',
    colUsableYield: '\u09ac\u09cd\u09af\u09ac\u09b9\u09be\u09b0\u09af\u09cb\u0997\u09cd\u09af %',
    colRealCostUnit: '\u0986\u09b6\u09b2 \u0996\u09b0\u099a / \u098f\u0995\u0995',
    colCostBase: '\u0996\u09b0\u099a / \u0997\u09cd\u09b0\u09be\u09ae-\u09ae\u09bf\u09b2\u09bf',
    colInRecipes: '\u09b0\u09c7\u09b8\u09bf\u09aa\u09bf\u09a4\u09c7',
    recipesCount: '\u09b0\u09c7\u09b8\u09bf\u09aa\u09bf',
    addMarketIngredient: '\u0989\u09aa\u0995\u09b0\u09a3 \u09af\u09c1\u0995\u09cd\u09a4 \u0995\u09b0\u09c1\u09a8',
    dialogAddTitle: '\u09a8\u09a4\u09c1\u09a8 \u09ac\u09be\u099c\u09be\u09b0 \u0989\u09aa\u0995\u09b0\u09a3',
    dialogAddDesc: '\u09ac\u09be\u099c\u09be\u09b0 \u09a6\u09b0 \u0993 \u0987\u09df\u09bf\u09b2\u09cd\u09a1 \u09b6\u09a4\u0995\u09b0\u09be \u09b8\u09b9 \u09a8\u09a4\u09c1\u09a8 \u0989\u09aa\u0995\u09b0\u09a3 \u09af\u09c1\u0995\u09cd\u09a4 \u0995\u09b0\u09c1\u09a8\u0964',
    cancel: '\u09ac\u09be\u09a4\u09bf\u09b2',
    confirm: '\u09a8\u09bf\u09b6\u09cd\u099a\u09bf\u09a4 \u0995\u09b0\u09c1\u09a8',
  },
};

export function useMagicCalcTranslation() {
  const { language, currencySymbol, translateText } = usePreferences();
  const dict = MAGIC_CALC_TRANSLATIONS[language] || MAGIC_CALC_TRANSLATIONS.en;
  const isRTL = language === 'ar';

  const formatPrice = (amount: number | string | null | undefined, digits = 2): string => {
    if (amount === null || amount === undefined || amount === '') return `${currencySymbol}0.00`;
    const num = Number(amount);
    if (isNaN(num)) return `${currencySymbol}${amount}`;
    return `${currencySymbol}${num.toLocaleString('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })}`;
  };

  return {
    dict,
    language,
    isRTL,
    currencySymbol,
    formatPrice,
    translateText,
  };
}
