'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';

export type LanguageCode = 'en' | 'bn' | 'ar' | 'es';
export type CurrencyCode = 'tk' | 'USD' | 'EURO' | 'AED' | 'Rupe';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}

export interface CurrencyOption {
  code: CurrencyCode;
  symbol: string;
  label: string;
  name: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'EN (English)', flag: '🇺🇸', dir: 'ltr' },
  { code: 'bn', label: 'Bangla', nativeLabel: 'BN (বাংলা)', flag: '🇧🇩', dir: 'ltr' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'Arabic (العربية)', flag: '🇸🇦', dir: 'rtl' },
  { code: 'es', label: 'Spanish', nativeLabel: 'ES (Español)', flag: '🇪🇸', dir: 'ltr' },
];

export const CURRENCIES: CurrencyOption[] = [
  { code: 'tk', symbol: '৳', label: 'tk (৳)', name: 'BDT' },
  { code: 'USD', symbol: '$', label: 'USD ($)', name: 'US Dollar' },
  { code: 'EURO', symbol: '€', label: 'EURO (€)', name: 'Euro' },
  { code: 'AED', symbol: 'AED', label: 'AED (د.إ)', name: 'Dirham' },
  { code: 'Rupe', symbol: '₹', label: 'Rupe (₹)', name: 'Indian Rupee' },
];

// UI labels dictionary
const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    magictab: 'MagicTab',
    magicCalc: 'Magic Calculation',
    templates: 'Templates',
    draft: 'Draft',
    orderHistory: 'Order History',
    happyClients: 'Happy Clients',
    store: 'Store',
    plan: 'Plan',
    logout: 'Logout',
    language: 'Language',
    currency: 'Currency',
    online: 'Online',
    dashboard: 'Dashboard',
    categories: 'Categories',
    searchCategories: 'Search categories...',
    searchItems: 'Search items...',
    variations: 'Variations',
    showVariations: 'Show Variations',
    hideVariations: 'Hide Variations',
    basePrice: 'Base Price',
    editItem: 'Edit item',
    totalItems: 'Total Items',
    selectedItems: 'Selected Items',
    previewMenu: 'Preview Menu',
    saveChanges: 'Save Changes',
    generateMenu: 'Generate Menu',
    noItemsFound: 'No items found',
    filterCategories: 'Filter Categories',
    myBusiness: 'My Business',
    templateLibrary: 'Template Library',
    customerOrders: 'Customer Orders',
    hrm: 'HRM',
  },
  bn: {
    magictab: 'ম্যাজিকট্যাব',
    magicCalc: 'ম্যাজিক ক্যালকুলেশন',
    templates: 'টেমপ্লেট',
    draft: 'ড্রাফট',
    orderHistory: 'অর্ডার হিস্ট্রি',
    happyClients: 'হ্যাপি ক্লায়েন্টস',
    store: 'স্টোর',
    plan: 'প্ল্যান',
    logout: 'লগআউট',
    language: 'ভাষা',
    currency: 'কারেন্সি',
    online: 'অনলাইন',
    dashboard: 'ড্যাশবোর্ড',
    categories: 'ক্যাটাগরি',
    searchCategories: 'ক্যাটাগরি খুঁজুন...',
    searchItems: 'আইটেম খুঁজুন...',
    variations: 'ভেরিয়েশন',
    showVariations: 'ভেরিয়েশন দেখুন',
    hideVariations: 'ভেরিয়েশন লুকান',
    basePrice: 'মূল দাম',
    editItem: 'আইটেম এডিট করুন',
    totalItems: 'মোট আইটেম',
    selectedItems: 'নির্বাচিত আইটেম',
    previewMenu: 'মেনু প্রিভিউ',
    saveChanges: 'পরিবর্তন সংরক্ষণ করুন',
    generateMenu: 'মেনু তৈরি করুন',
    noItemsFound: 'কোনো আইটেম পাওয়া যায়নি',
    filterCategories: 'ক্যাটাগরি ফিল্টার',
    myBusiness: 'আমার ব্যবসা',
    templateLibrary: 'টেমপ্লেট লাইব্রেরি',
    customerOrders: 'কাস্টমার অর্ডার',
    hrm: 'এইচআরএম',
  },
  ar: {
    magictab: 'ماجيك تاب',
    magicCalc: 'الحساب السحري',
    templates: 'القوالب',
    draft: 'المسودات',
    orderHistory: 'سجل الطلبات',
    happyClients: 'عملاؤنا المميزون',
    store: 'المتجر',
    plan: 'الخطة',
    logout: 'تسجيل خروج',
    language: 'اللغة',
    currency: 'العملة',
    online: 'متصل',
    dashboard: 'لوحة التحكم',
    categories: 'الفئات',
    searchCategories: 'ابحث عن الفئات...',
    searchItems: 'ابحث عن العناصر...',
    variations: 'الخيارات',
    showVariations: 'عرض الخيارات',
    hideVariations: 'إخفاء الخيارات',
    basePrice: 'السعر الأساسي',
    editItem: 'تعديل العنصر',
    totalItems: 'إجمالي العناصر',
    selectedItems: 'العناصر المحددة',
    previewMenu: 'معاينة القائمة',
    saveChanges: 'حفظ التغييرات',
    generateMenu: 'إنشاء القائمة',
    noItemsFound: 'لم يتم العثور على عناصر',
    filterCategories: 'تصفية الفئات',
    myBusiness: 'نشاطي التجاري',
    templateLibrary: 'مكتبة القوالب',
    customerOrders: 'طلبات العملاء',
    hrm: 'الموارد البشرية',
  },
  es: {
    magictab: 'MagicTab',
    magicCalc: 'Cálculo Mágico',
    templates: 'Plantillas',
    draft: 'Borradores',
    orderHistory: 'Historial',
    happyClients: 'Clientes Felices',
    store: 'Tienda',
    plan: 'Plan',
    logout: 'Cerrar sesión',
    language: 'Idioma',
    currency: 'Moneda',
    online: 'En línea',
    dashboard: 'Panel',
    categories: 'Categorías',
    searchCategories: 'Buscar categorías...',
    searchItems: 'Buscar artículos...',
    variations: 'Variaciones',
    showVariations: 'Ver variaciones',
    hideVariations: 'Ocultar variaciones',
    basePrice: 'Precio base',
    editItem: 'Editar artículo',
    totalItems: 'Total artículos',
    selectedItems: 'Seleccionados',
    previewMenu: 'Vista previa',
    saveChanges: 'Guardar cambios',
    generateMenu: 'Generar menú',
    noItemsFound: 'No se encontraron artículos',
    filterCategories: 'Filtrar categorías',
    myBusiness: 'Mi Negocio',
    templateLibrary: 'Biblioteca de Plantillas',
    customerOrders: 'Pedidos de Clientes',
    hrm: 'RRHH',
  },
};

// Pre-seeded high-frequency restaurant and parlor items/categories for instant switching
const PRESEEDED_TERMS: Record<LanguageCode, Record<string, string>> = {
  en: {},
  bn: {
    'appetizers': 'অ্যাপেটাইজার',
    'burger': 'বার্গার',
    'pizza': 'পিজ্জা',
    'pizza (পিজ্জা)': 'পিজ্জা',
    'pasta': 'পাস্তা',
    'pasta (পাস্তা)': 'পাস্তা',
    'biriyani': 'বিরিয়ানি',
    'biriyani (বিরিয়ানি)': 'বিরিয়ানি',
    'meat box': 'মিট বক্স',
    'meat box (মিট বক্স)': 'মিট বক্স',
    'soup': 'স্যুপ',
    'soup (সুপ)': 'স্যুপ',
    'rice': 'রাইস',
    'rice (রাইস)': 'রাইস',
    'sandwich': 'স্যান্ডউইচ',
    'sandwich (স্যান্ডউইচ)': 'স্যান্ডউইচ',
    'japanese food': 'জাপানিজ ফুড',
    'crispy chicken fry (1 pc)': 'ক্রিস্পি চিকেন ফ্রাই (১ টি)',
    'crispy fried chicken (4 pcs)': 'ক্রিস্পি ফ্রাইড চিকেন (৪ টি)',
    'crispy fried chicken (8 pcs)': 'ক্রিস্পি ফ্রাইড চিকেন (৮ টি)',
    'chicken wings (5 pcs)': 'চিকেন উইংস (৫ টি)',
    'chicken strips (5 pcs)': 'চিকেন স্ট্রিপস (৫ টি)',
    'chicken strips (10 pcs)': 'চিকেন স্ট্রিপস (১০ টি)',
    'thai fried chicken (6 pcs)': 'থাই ফ্রাইড চিকেন (৬ টি)',
    'french fry regular': 'ফ্রেঞ্চ ফ্রাই রেগুলার',
    'french fry large': 'ফ্রেঞ্চ ফ্রাই লার্জ',
    'chinatown chicken loaded fries': 'চায়নাটাউন চিকেন লোডেড ফ্রাইজ',
    'crispy chicken fry': 'ক্রিস্পি চিকেন ফ্রাই',
    'thai chicken fry': 'থাই চিকেন ফ্রাই',
    'hot wings (4 pcs)': 'হট উইংস (৪ টি)',
    'naga wings (4 pcs)': 'নাগা উইংস (৪ টি)',
    'bbq wings (4 pcs)': 'বারবিকিউ উইংস (৪ টি)',
    'thai fry (1pc) regular': 'থাই ফ্রাই (১টি) রেগুলার',
    'thai fry (1pc) bbq': 'থাই ফ্রাই (১টি) বারবিকিউ',
    'thai fry (4pc) regular': 'থাই ফ্রাই (৪টি) রেগুলার',
    'thai fry (4pc) bbq': 'থাই ফ্রাই (৪টি) বারবিকিউ',
    'chicken wings (6pc) regular': 'চিকেন উইংস (৬টি) রেগুলার',
    'facial': 'ফেসিয়াল',
    'hair cut': 'হেয়ার কাট',
    'hair treatment': 'হেয়ার ট্রিটমেন্ট',
    'hair rebonding': 'হেয়ার রিবন্ডিং',
    'fair polish': 'ফেয়ার পলিশ',
    'bridal mackeup': 'ব্রাইডাল মেকআপ',
    'massage': 'ম্যাসেজ',
    'hair color': 'হেয়ার কালার',
    'body massage': 'বডি ম্যাসেজ',
    'wax': 'ওয়াক্স',
    'hair style': 'হেয়ার স্টাইল',
    'gents parlor facial': 'জেন্টস পার্লার ফেসিয়াল',
    'extensions': 'এক্সটেনশন',
    'hair spa': 'হেয়ার স্পা',
    'special facial': 'স্পেশাল ফেসিয়াল',
  },
  ar: {
    'appetizers': 'المقبلات',
    'burger': 'برجر',
    'pizza': 'بيتزا',
    'pizza (পিজ্জা)': 'بيتزا',
    'pasta': 'معكرونة',
    'pasta (পাস্তা)': 'معكرونة',
    'biriyani': 'برياني',
    'biriyani (বিরিয়ানি)': 'برياني',
    'meat box': 'علبة لحم',
    'meat box (মিট বক্স)': 'علبة لحم',
    'soup': 'شوربة',
    'soup (সুপ)': 'شوربة',
    'rice': 'أرز',
    'rice (রাইস)': 'أرز',
    'sandwich': 'ساندويتش',
    'sandwich (স্যান্ডউইচ)': 'ساندويتش',
    'japanese food': 'الطعام الياباني',
    'crispy chicken fry (1 pc)': 'دجاج مقرمش (قطعة واحدة)',
    'crispy fried chicken (4 pcs)': 'دجاج مقلي مقرمش (4 قطع)',
    'crispy fried chicken (8 pcs)': 'دجاج مقلي مقرمش (8 قطع)',
    'chicken wings (5 pcs)': 'أجنحة الدجاج (5 قطع)',
    'chicken strips (5 pcs)': 'شرائح الدجاج (5 قطع)',
    'chicken strips (10 pcs)': 'شرائح الدجاج (10 قطع)',
    'thai fried chicken (6 pcs)': 'دجاج تايلاندي مقلي (6 قطع)',
    'french fry regular': 'بطاطس مقلية عادية',
    'french fry large': 'بطاطس مقلية كبيرة',
    'chinatown chicken loaded fries': 'تشاينا تاون تشيكن فرايز مقلية',
    'crispy chicken fry': 'دجاج مقرمش مقلي',
    'thai chicken fry': 'دجاج تايلاندي مقلي',
    'hot wings (4 pcs)': 'أجنحة حارة (4 قطع)',
    'naga wings (4 pcs)': 'أجنحة ناجا (4 قطع)',
    'bbq wings (4 pcs)': 'أجنحة باربكيو (4 قطع)',
    'thai fry (1pc) regular': 'تايلندي فراي (1 قطعة) عادي',
    'thai fry (1pc) bbq': 'تايلندي فراي (1 قطعة) باربيكيو',
    'thai fry (4pc) regular': 'تايلندي فراي (4 قطع) عادي',
    'thai fry (4pc) bbq': 'تايلندي فراي (4 قطع) باربيكيو',
    'chicken wings (6pc) regular': 'أجنحة الدجاج (6 قطع) عادية',
    'facial': 'تنظيف الوجه',
    'hair cut': 'قص الشعر',
    'hair treatment': 'علاج الشعر',
    'hair rebonding': 'فرد الشعر',
    'fair polish': 'تلميع البشرة',
    'bridal mackeup': 'مكياج عرائس',
    'massage': 'تدليك',
    'hair color': 'صبغ الشعر',
    'body massage': 'مساج للجسم',
    'wax': 'شمع لإزالة الشعر',
    'hair style': 'تصفيف الشعر',
    'gents parlor facial': 'فيشل صالون رجالي',
    'extensions': 'وصلات شعر',
    'hair spa': 'سبا للشعر',
    'special facial': 'تنظيف وجه خاص',
  },
  es: {
    'appetizers': 'Aperitivos',
    'burger': 'Hamburguesas',
    'pizza': 'Pizzas',
    'pizza (পিজ্জা)': 'Pizzas',
    'pasta': 'Pastas',
    'pasta (পাস্তা)': 'Pastas',
    'biriyani': 'Biryani',
    'biriyani (বিরিয়ানি)': 'Biryani',
    'meat box': 'Caja de Carne',
    'meat box (মিট বক্স)': 'Caja de Carne',
    'soup': 'Sopas',
    'soup (সুপ)': 'Sopas',
    'rice': 'Arroz',
    'rice (রাইস)': 'Arroz',
    'sandwich': 'Sándwiches',
    'sandwich (স্যান্ডউইচ)': 'Sándwiches',
    'japanese food': 'Comida Japonesa',
    'crispy chicken fry (1 pc)': 'Pollo Frito Crujiente (1 pieza)',
    'crispy fried chicken (4 pcs)': 'Pollo Frito Crujiente (4 piezas)',
    'crispy fried chicken (8 pcs)': 'Pollo Frito Crujiente (8 piezas)',
    'chicken wings (5 pcs)': 'Alitas de Pollo (5 piezas)',
    'chicken strips (5 pcs)': 'Tiras de Pollo (5 piezas)',
    'chicken strips (10 pcs)': 'Tiras de Pollo (10 piezas)',
    'thai fried chicken (6 pcs)': 'Pollo Frito Tailandés (6 piezas)',
    'french fry regular': 'Papas Fritas Regular',
    'french fry large': 'Papas Fritas Grande',
    'chinatown chicken loaded fries': 'Papas Fritas con Pollo Chinatown',
    'crispy chicken fry': 'Pollo Frito Crujiente',
    'thai chicken fry': 'Pollo Frito Tailandés',
    'hot wings (4 pcs)': 'Alitas Picantes (4 piezas)',
    'naga wings (4 pcs)': 'Alitas Naga (4 piezas)',
    'bbq wings (4 pcs)': 'Alitas BBQ (4 piezas)',
    'thai fry (1pc) regular': 'Frito Tailandés (1 pieza) Regular',
    'thai fry (1pc) bbq': 'Frito Tailandés (1 pieza) BBQ',
    'thai fry (4pc) regular': 'Frito Tailandés (4 piezas) Regular',
    'thai fry (4pc) bbq': 'Frito Tailandés (4 piezas) BBQ',
    'chicken wings (6pc) regular': 'Alitas de Pollo (6 piezas) Regular',
    'facial': 'Facial',
    'hair cut': 'Corte de Cabello',
    'hair treatment': 'Tratamiento Capilar',
    'hair rebonding': 'Alisado Permanente',
    'fair polish': 'Pulido Facial',
    'bridal mackeup': 'Maquillaje de Novia',
    'massage': 'Masaje',
    'hair color': 'Tinte de Cabello',
    'body massage': 'Masaje Corporal',
    'wax': 'Depilación con Cera',
    'hair style': 'Peinado',
    'gents parlor facial': 'Facial Masculino',
    'extensions': 'Extensiones',
    'hair spa': 'Spa Capilar',
    'special facial': 'Facial Especial',
  },
};

interface PreferencesContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  currentLanguage: LanguageOption;
  languages: LanguageOption[];
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  currencySymbol: string;
  currentCurrency: CurrencyOption;
  currencies: CurrencyOption[];
  translationVersion: number;
  t: (key: string, fallback?: string) => string;
  formatPrice: (amount: number | string | null | undefined) => string;
  translateText: (text: string | null | undefined) => string;
  translateBatch: (texts: (string | null | undefined)[]) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('en');
  const [currency, setCurrencyState] = useState<CurrencyCode>('tk');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translationVersion, setTranslationVersion] = useState(0);

  const pendingBatchRef = useRef<Set<string>>(new Set());
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inFlightBatchRef = useRef(false);

  // Load from localStorage and sanitize poisoned fallback cache
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('menusnap_pref_lang') as LanguageCode | null;
      if (savedLang && (savedLang === 'en' || savedLang === 'bn' || savedLang === 'ar' || savedLang === 'es')) {
        setLanguageState(savedLang);
      }
      const savedCurr = localStorage.getItem('menusnap_pref_curr') as CurrencyCode | null;
      if (savedCurr && (savedCurr === 'tk' || savedCurr === 'USD' || savedCurr === 'EURO' || savedCurr === 'AED' || savedCurr === 'Rupe')) {
        setCurrencyState(savedCurr);
      }
      const savedTrans = localStorage.getItem('menusnap_item_translations');
      if (savedTrans) {
        const parsed = JSON.parse(savedTrans);
        const cleanMap: Record<string, string> = {};
        // Strip out any keys where the translated text is identical to the English original
        Object.entries(parsed).forEach(([k, v]) => {
          if (typeof v === 'string') {
            const colonIdx = k.indexOf(':');
            const orig = colonIdx > -1 ? k.substring(colonIdx + 1) : k;
            if (v.trim().toLowerCase() !== orig.trim().toLowerCase()) {
              cleanMap[k] = v;
            }
          }
        });
        setTranslations(cleanMap);
      }
    } catch (_) {
      // LocalStorage access failsafe
    }
  }, []);

  const setLanguage = useCallback((newLang: LanguageCode) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem('menusnap_pref_lang', newLang);
    } catch (_) {}
  }, []);

  const setCurrency = useCallback((newCurr: CurrencyCode) => {
    setCurrencyState(newCurr);
    try {
      localStorage.setItem('menusnap_pref_curr', newCurr);
    } catch (_) {}
  }, []);

  const currentLanguage = useMemo(() => {
    return LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];
  }, [language]);

  const currentCurrency = useMemo(() => {
    return CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];
  }, [currency]);

  const currencySymbol = currentCurrency.symbol;

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const dict = TRANSLATIONS[language];
      if (dict && dict[key]) {
        return dict[key];
      }
      const enDict = TRANSLATIONS.en;
      if (enDict && enDict[key]) {
        return enDict[key];
      }
      return fallback !== undefined ? fallback : key;
    },
    [language]
  );

  const formatPrice = useCallback(
    (amount: number | string | null | undefined): string => {
      if (amount === null || amount === undefined || amount === '') return '';
      const num = Number(amount);
      if (isNaN(num)) return `${currencySymbol}${amount}`;
      return `${currencySymbol}${num.toLocaleString()}`;
    },
    [currencySymbol]
  );

  // Translate a batch of texts for the active language
  const translateBatch = useCallback(
    async (texts: (string | null | undefined)[]) => {
      if (language === 'en' || !texts || texts.length === 0) return;

      const preseeded = PRESEEDED_TERMS[language] || {};

      // Filter texts that truly need network translation
      const cleanList = texts
        .map((t) => (t ? t.trim() : ''))
        .filter((t): t is string => {
          if (!t) return false;
          const lower = t.toLowerCase();
          // Already pre-seeded?
          if (preseeded[lower]) return false;
          // Already in dynamic cache?
          const cacheKey = `${language}:${lower}`;
          if (translations[cacheKey]) return false;
          return true;
        });

      const uniqueList = Array.from(new Set(cleanList));
      if (uniqueList.length === 0) return;

      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: uniqueList, targetLang: language }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.translations && Array.isArray(data.translations)) {
            let updatedCount = 0;
            setTranslations((prev) => {
              const next = { ...prev };
              uniqueList.forEach((orig, idx) => {
                const trans = data.translations[idx];
                // Only save if it actually translated (not identical to English)
                if (trans && trans.trim().toLowerCase() !== orig.trim().toLowerCase()) {
                  next[`${language}:${orig.toLowerCase()}`] = trans;
                  updatedCount++;
                }
              });

              if (updatedCount > 0) {
                try {
                  localStorage.setItem('menusnap_item_translations', JSON.stringify(next));
                } catch (_) {}
              }
              return next;
            });

            if (updatedCount > 0) {
              setTranslationVersion((v) => v + 1);
            }
          }
        }
      } catch (_) {
        // Fallback gracefully
      }
    },
    [language, translations]
  );

  // Schedule auto-batch fetch for text discovered during rendering
  const scheduleBatchFetch = useCallback(() => {
    if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
    batchTimerRef.current = setTimeout(() => {
      if (inFlightBatchRef.current) return;
      const queue = Array.from(pendingBatchRef.current);
      pendingBatchRef.current.clear();
      if (queue.length > 0) {
        inFlightBatchRef.current = true;
        translateBatch(queue).finally(() => {
          inFlightBatchRef.current = false;
        });
      }
    }, 80);
  }, [translateBatch]);

  // Translate a single text string (checks preseed, dynamic cache, or queues for fetch)
  const translateText = useCallback(
    (text: string | null | undefined): string => {
      if (!text) return '';
      if (language === 'en') return text;

      const clean = text.trim();
      const lower = clean.toLowerCase();

      // 1. Check pre-seeded instant dictionary
      const preseeded = PRESEEDED_TERMS[language];
      if (preseeded && preseeded[lower]) {
        return preseeded[lower];
      }

      // 2. Check dynamic translation cache
      const cacheKey = `${language}:${lower}`;
      if (translations[cacheKey]) {
        return translations[cacheKey];
      }

      // 3. Queue for translation batch
      if (!pendingBatchRef.current.has(clean)) {
        pendingBatchRef.current.add(clean);
        scheduleBatchFetch();
      }

      return text;
    },
    [language, translations, scheduleBatchFetch]
  );

  return (
    <PreferencesContext.Provider
      value={{
        language,
        setLanguage,
        currentLanguage,
        languages: LANGUAGES,
        currency,
        setCurrency,
        currencySymbol,
        currentCurrency,
        currencies: CURRENCIES,
        translationVersion,
        t,
        formatPrice,
        translateText,
        translateBatch,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    const defaultCurr = CURRENCIES[0];
    const defaultLang = LANGUAGES[0];
    return {
      language: 'en' as LanguageCode,
      setLanguage: () => {},
      currentLanguage: defaultLang,
      languages: LANGUAGES,
      currency: 'tk' as CurrencyCode,
      setCurrency: () => {},
      currencySymbol: '৳',
      currentCurrency: defaultCurr,
      currencies: CURRENCIES,
      translationVersion: 0,
      t: (key: string, fallback?: string) => fallback || key,
      formatPrice: (amount: number | string | null | undefined) => {
        if (amount === null || amount === undefined || amount === '') return '';
        const num = Number(amount);
        return isNaN(num) ? `৳${amount}` : `৳${num.toLocaleString()}`;
      },
      translateText: (text: string | null | undefined) => text || '',
      translateBatch: async () => {},
    };
  }
  return context;
}
