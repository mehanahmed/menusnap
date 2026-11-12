export interface MenuSheetTheme {
  id: string;
  name: string;
  shortName: string;
  badgeLabel: string;
  description: string;
  swatchColor: string;
  accentColor: string;
  paperColorName: string;
  isDark?: boolean;

  // Sheet Container Atmosphere
  sheetWrapperClass: string;
  sheetCardClass: string;
  watermarkStyle?: React.CSSProperties;

  // Header Elements
  logoBoxClass: string;
  headerBorderClass: string;
  businessTitleClass: string;
  dateTextClass: string;
  dateIconClass: string;

  // Category Elements
  categoryTitleClass: string;
  categoryBorderClass: string;

  // Items Elements
  itemNameClass: string;
  itemPriceClass: string;
  itemDescClass: string;

  // Variations Elements
  variationLinkClass: string;
  variationBoxClass: string;
  variationSubItemClass: string;
  variationPriceClass: string;

  // Footer Elements
  footerBorderClass: string;
  footerTextClass: string;
}

export const MENU_SHEET_THEMES: MenuSheetTheme[] = [
  {
    id: 'sunset',
    name: 'Classic Sunset',
    shortName: 'Sunset',
    badgeLabel: 'Pure White',
    paperColorName: 'Crisp White Paper',
    description: 'Crisp pure white canvas with vibrant warm amber lines. Casual dining and fast food standard.',
    swatchColor: '#EA580C',
    accentColor: '#F97316',
    isDark: false,
    sheetWrapperClass: 'bg-[#F9F5F0]',
    sheetCardClass: 'bg-white text-slate-900 border border-orange-200/80 shadow-[0_12px_45px_rgba(234,88,12,0.07)]',
    watermarkStyle: {
      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3e%3ctext x='50%25' y='50%25' font-family='Arial, sans-serif' font-size='24' fill='rgba(234,88,12,0.06)' text-anchor='middle' dominant-baseline='middle' transform='rotate(-30, 150, 100)'%3eCOLOR HUT%3c/text%3e%3c/svg%3e")`,
    },
    logoBoxClass: 'bg-black shadow-[inset_0_0_20px_rgba(255,255,255,0.12)] border border-orange-500/20',
    headerBorderClass: 'border-b-[1.5px] border-orange-200/90',
    businessTitleClass: 'text-slate-900 font-extrabold',
    dateTextClass: 'text-slate-500 font-medium',
    dateIconClass: 'text-orange-500',
    categoryTitleClass: 'text-orange-600 font-extrabold tracking-tight',
    categoryBorderClass: 'border-b-[1.5px] border-orange-300/80',
    itemNameClass: 'text-slate-900 font-bold',
    itemPriceClass: 'text-orange-600 font-extrabold',
    itemDescClass: 'text-slate-500 leading-relaxed',
    variationLinkClass: 'text-orange-600 hover:text-orange-700 font-semibold',
    variationBoxClass: 'bg-orange-50/70 border-l-[3px] border-orange-400 border-y border-r border-orange-200/60 shadow-xs',
    variationSubItemClass: 'bg-white text-slate-800 border border-orange-100 shadow-xs',
    variationPriceClass: 'text-orange-600 font-bold',
    footerBorderClass: 'border-t-[1.5px] border-orange-200/70',
    footerTextClass: 'text-slate-500 font-medium',
  },
  {
    id: 'vintage',
    name: 'Royal Vintage',
    shortName: 'Royal Vintage',
    badgeLabel: 'Designer Frame',
    paperColorName: 'Ornate Filigree Cream',
    description: 'Authentic warm ivory canvas with designer vintage corner filigrees and royal wine typography.',
    swatchColor: '#5C3A21',
    accentColor: '#881337',
    isDark: false,
    sheetWrapperClass: 'bg-[#EDE4D8]',
    sheetCardClass: 'bg-[#FDF8ED] text-[#2C1810] border border-[#DFCFC0] shadow-[0_15px_45px_rgba(92,58,33,0.08)] max-w-[820px] min-h-[400px] sm:min-h-[600px] flex flex-col justify-between px-4 sm:px-14 md:px-16 py-6 sm:py-14 md:py-16',
    watermarkStyle: {
      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3e%3ctext x='50%25' y='50%25' font-family='Arial, sans-serif' font-size='24' fill='rgba(136,19,55,0.045)' text-anchor='middle' dominant-baseline='middle' transform='rotate(-30, 150, 100)'%3eCOLOR HUT%3c/text%3e%3c/svg%3e"), url('/templates/royal-vintage-bg.jpeg')`,
      backgroundSize: '300px 200px, 100% 100%',
      backgroundPosition: '0 0, center',
      backgroundRepeat: 'repeat, no-repeat',
    },
    logoBoxClass: 'bg-[#2B0813] shadow-[inset_0_0_20px_rgba(244,63,94,0.15)] border border-[#881337]/40',
    headerBorderClass: 'border-b-[1.5px] border-[#881337]/25',
    businessTitleClass: 'text-[#2C1810] font-extrabold',
    dateTextClass: 'text-[#7D6B5D] font-medium',
    dateIconClass: 'text-[#881337]',
    categoryTitleClass: 'text-[#881337] font-extrabold tracking-tight',
    categoryBorderClass: 'border-b-[1.5px] border-[#881337]/35',
    itemNameClass: 'text-[#2C1810] font-bold',
    itemPriceClass: 'text-[#881337] font-extrabold',
    itemDescClass: 'text-[#7D6B5D] leading-relaxed',
    variationLinkClass: 'text-[#881337] hover:text-[#9F1239] font-semibold',
    variationBoxClass: 'bg-[#F5EFE6]/85 border-l-[3px] border-[#881337] border-y border-r border-[#DFCFC0] shadow-xs backdrop-blur-xs',
    variationSubItemClass: 'bg-[#FAF6F0] text-[#2C1810] border border-[#E5DACD] shadow-xs',
    variationPriceClass: 'text-[#881337] font-bold',
    footerBorderClass: 'border-t-[1.5px] border-[#DFCFC0]',
    footerTextClass: 'text-[#7D6B5D] font-medium',
  },
  {
    id: 'midnight',
    name: 'Midnight Gold',
    shortName: 'Midnight Gold',
    badgeLabel: 'Dark Luxury',
    paperColorName: 'Obsidian Matte Slate',
    description: 'Deep obsidian matte canvas with radiant champagne gold lines. VIP lounges & luxury evening venues.',
    swatchColor: '#D97706',
    accentColor: '#F59E0B',
    isDark: true,
    sheetWrapperClass: 'bg-[#08090C]',
    sheetCardClass: 'bg-[#121317] text-zinc-100 border border-amber-500/30 shadow-[0_25px_60px_rgba(0,0,0,0.85)] ring-1 ring-amber-500/15',
    watermarkStyle: {
      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3e%3ctext x='50%25' y='50%25' font-family='Arial, sans-serif' font-size='24' fill='rgba(245,158,11,0.04)' text-anchor='middle' dominant-baseline='middle' transform='rotate(-30, 150, 100)'%3eCOLOR HUT%3c/text%3e%3c/svg%3e")`,
    },
    logoBoxClass: 'bg-zinc-950 border border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]',
    headerBorderClass: 'border-b-[1.5px] border-zinc-800',
    businessTitleClass: 'text-zinc-50 font-extrabold',
    dateTextClass: 'text-zinc-400 font-medium',
    dateIconClass: 'text-amber-400',
    categoryTitleClass: 'text-amber-400 font-extrabold tracking-wide',
    categoryBorderClass: 'border-b-[1.5px] border-amber-500/35',
    itemNameClass: 'text-zinc-100 font-bold',
    itemPriceClass: 'text-amber-400 font-extrabold',
    itemDescClass: 'text-zinc-400 leading-relaxed',
    variationLinkClass: 'text-amber-400 hover:text-amber-300 font-semibold',
    variationBoxClass: 'bg-zinc-900/90 border-l-[3px] border-amber-400 border-y border-r border-amber-500/25 shadow-xs',
    variationSubItemClass: 'bg-zinc-950 text-zinc-100 border border-zinc-800 shadow-xs',
    variationPriceClass: 'text-amber-400 font-bold',
    footerBorderClass: 'border-t-[1.5px] border-zinc-800',
    footerTextClass: 'text-zinc-500 font-medium',
  },
  {
    id: 'rose',
    name: 'Rose Salon & Spa',
    shortName: 'Rose Salon',
    badgeLabel: 'Pearl Blush',
    paperColorName: 'Soft Pearl Blush',
    description: 'Delicate pearl blush paper with luxurious dark plum typography. Beauty parlours, salons & bridal spas.',
    swatchColor: '#BE185D',
    accentColor: '#DB2777',
    isDark: false,
    sheetWrapperClass: 'bg-[#FDF0F4]',
    sheetCardClass: 'bg-[#FFF5F8] text-[#331120] border border-pink-200/90 shadow-[0_12px_45px_rgba(190,24,93,0.07)]',
    watermarkStyle: {
      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3e%3ctext x='50%25' y='50%25' font-family='Arial, sans-serif' font-size='24' fill='rgba(190,24,93,0.05)' text-anchor='middle' dominant-baseline='middle' transform='rotate(-30, 150, 100)'%3eCOLOR HUT%3c/text%3e%3c/svg%3e")`,
    },
    logoBoxClass: 'bg-[#4A0423] shadow-[inset_0_0_20px_rgba(244,114,182,0.2)] border border-pink-400/40',
    headerBorderClass: 'border-b-[1.5px] border-pink-200/90',
    businessTitleClass: 'text-[#331120] font-extrabold',
    dateTextClass: 'text-pink-900/60 font-medium',
    dateIconClass: 'text-pink-600',
    categoryTitleClass: 'text-pink-800 font-extrabold tracking-tight',
    categoryBorderClass: 'border-b-[1.5px] border-pink-300/80',
    itemNameClass: 'text-[#331120] font-bold',
    itemPriceClass: 'text-pink-600 font-extrabold',
    itemDescClass: 'text-pink-900/65 leading-relaxed',
    variationLinkClass: 'text-pink-600 hover:text-pink-700 font-semibold',
    variationBoxClass: 'bg-pink-100/50 border-l-[3px] border-pink-400 border-y border-r border-pink-200 shadow-xs',
    variationSubItemClass: 'bg-white text-pink-950 border border-pink-100 shadow-xs',
    variationPriceClass: 'text-pink-600 font-bold',
    footerBorderClass: 'border-t-[1.5px] border-pink-200/80',
    footerTextClass: 'text-pink-900/50 font-medium',
  },
  {
    id: 'emerald',
    name: 'Bistro Sage',
    shortName: 'Bistro Sage',
    badgeLabel: 'Sage Herbal',
    paperColorName: 'Fresh Sage Herbal Paper',
    description: 'Fresh herbal sage paper with deep botanical forest green lines. Cafes, bakeries & organic bistros.',
    swatchColor: '#065F46',
    accentColor: '#059669',
    isDark: false,
    sheetWrapperClass: 'bg-[#E7F3EC]',
    sheetCardClass: 'bg-[#F3FAF5] text-[#0C2419] border border-emerald-200/90 shadow-[0_12px_45px_rgba(6,95,70,0.07)]',
    watermarkStyle: {
      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3e%3ctext x='50%25' y='50%25' font-family='Arial, sans-serif' font-size='24' fill='rgba(6,95,70,0.05)' text-anchor='middle' dominant-baseline='middle' transform='rotate(-30, 150, 100)'%3eCOLOR HUT%3c/text%3e%3c/svg%3e")`,
    },
    logoBoxClass: 'bg-[#064E3B] shadow-[inset_0_0_20px_rgba(16,185,129,0.2)] border border-emerald-400/40',
    headerBorderClass: 'border-b-[1.5px] border-emerald-200/90',
    businessTitleClass: 'text-[#0C2419] font-extrabold',
    dateTextClass: 'text-emerald-900/60 font-medium',
    dateIconClass: 'text-emerald-600',
    categoryTitleClass: 'text-emerald-800 font-extrabold tracking-tight',
    categoryBorderClass: 'border-b-[1.5px] border-emerald-300/80',
    itemNameClass: 'text-[#0C2419] font-bold',
    itemPriceClass: 'text-emerald-700 font-extrabold',
    itemDescClass: 'text-emerald-900/65 leading-relaxed',
    variationLinkClass: 'text-emerald-700 hover:text-emerald-800 font-semibold',
    variationBoxClass: 'bg-emerald-100/50 border-l-[3px] border-emerald-400 border-y border-r border-emerald-200 shadow-xs',
    variationSubItemClass: 'bg-white text-emerald-950 border border-emerald-100 shadow-xs',
    variationPriceClass: 'text-emerald-700 font-bold',
    footerBorderClass: 'border-t-[1.5px] border-emerald-200/80',
    footerTextClass: 'text-emerald-900/50 font-medium',
  },
  {
    id: 'sapphire',
    name: 'Minimal Slate',
    shortName: 'Minimal Slate',
    badgeLabel: 'Cool Porcelain',
    paperColorName: 'Cool Porcelain Slate',
    description: 'Cool porcelain slate background with royal sapphire navy lines. Modern dining & corporate catering.',
    swatchColor: '#1E3A8A',
    accentColor: '#2563EB',
    isDark: false,
    sheetWrapperClass: 'bg-[#E7EFF7]',
    sheetCardClass: 'bg-[#F6F9FD] text-[#0A1629] border border-blue-200/90 shadow-[0_12px_45px_rgba(30,58,138,0.07)]',
    watermarkStyle: {
      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3e%3ctext x='50%25' y='50%25' font-family='Arial, sans-serif' font-size='24' fill='rgba(30,58,138,0.05)' text-anchor='middle' dominant-baseline='middle' transform='rotate(-30, 150, 100)'%3eCOLOR HUT%3c/text%3e%3c/svg%3e")`,
    },
    logoBoxClass: 'bg-[#09152C] shadow-[inset_0_0_20px_rgba(59,130,246,0.2)] border border-blue-400/40',
    headerBorderClass: 'border-b-[1.5px] border-blue-200/90',
    businessTitleClass: 'text-[#0A1629] font-extrabold',
    dateTextClass: 'text-slate-500 font-medium',
    dateIconClass: 'text-blue-600',
    categoryTitleClass: 'text-blue-900 font-extrabold tracking-tight',
    categoryBorderClass: 'border-b-[1.5px] border-blue-300/80',
    itemNameClass: 'text-[#0A1629] font-bold',
    itemPriceClass: 'text-blue-700 font-extrabold',
    itemDescClass: 'text-slate-500 leading-relaxed',
    variationLinkClass: 'text-blue-600 hover:text-blue-700 font-semibold',
    variationBoxClass: 'bg-blue-100/50 border-l-[3px] border-blue-400 border-y border-r border-blue-200 shadow-xs',
    variationSubItemClass: 'bg-white text-slate-900 border border-blue-100 shadow-xs',
    variationPriceClass: 'text-blue-700 font-bold',
    footerBorderClass: 'border-t-[1.5px] border-blue-200/80',
    footerTextClass: 'text-slate-400 font-medium',
  },
  {
    id: 'custom',
    name: 'Custom Design',
    shortName: 'Custom Design',
    badgeLabel: 'Your Image',
    paperColorName: 'Custom Background Canvas',
    description: 'Upload your own background flyer image and pick matching text shades.',
    swatchColor: '#6366F1',
    accentColor: '#4F46E5',
    isDark: false,
    sheetWrapperClass: 'bg-[#181920]',
    sheetCardClass: 'bg-[#FDF8ED] text-[#0F172A] border border-border/60 shadow-2xl max-w-[820px] aspect-[1566/2430] min-h-[750px] sm:min-h-[1050px] md:min-h-[1240px] flex flex-col justify-between px-8 sm:px-14 md:px-16 py-10 sm:py-14 md:py-16',
    watermarkStyle: {
      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3e%3ctext x='50%25' y='50%25' font-family='Arial, sans-serif' font-size='24' fill='rgba(0,0,0,0.035)' text-anchor='middle' dominant-baseline='middle' transform='rotate(-30, 150, 100)'%3eCOLOR HUT%3c/text%3e%3c/svg%3e")`,
    },
    logoBoxClass: 'bg-black shadow-md border border-slate-700',
    headerBorderClass: 'border-b-[1.5px] border-slate-900/25',
    businessTitleClass: 'text-slate-900 font-extrabold',
    dateTextClass: 'text-slate-600 font-medium',
    dateIconClass: 'text-slate-800',
    categoryTitleClass: 'text-slate-900 font-extrabold tracking-tight',
    categoryBorderClass: 'border-b-[1.5px] border-slate-900/30',
    itemNameClass: 'text-slate-950 font-bold',
    itemPriceClass: 'text-slate-900 font-extrabold',
    itemDescClass: 'text-slate-600 leading-relaxed',
    variationLinkClass: 'text-slate-800 hover:text-black font-semibold',
    variationBoxClass: 'bg-slate-100/90 border-l-[3px] border-slate-900 border-y border-r border-slate-300 shadow-xs backdrop-blur-xs',
    variationSubItemClass: 'bg-white text-slate-900 border border-slate-200 shadow-xs',
    variationPriceClass: 'text-slate-900 font-bold',
    footerBorderClass: 'border-t-[1.5px] border-slate-300',
    footerTextClass: 'text-slate-600 font-medium',
  },
];

export const CUSTOM_THEME_ID = 'custom';

export type CustomShadeId = 'charcoal' | 'wine' | 'espresso' | 'white' | 'gold' | 'cream';

export interface CustomThemeConfig {
  bgImageUrl?: string | null;
  shadeId: CustomShadeId;
  updatedAt?: string;
}

export interface CustomThemeShadeOption {
  id: CustomShadeId;
  name: string;
  group: 'light-bg' | 'dark-bg';
  groupLabel: string;
  swatch: string;
  previewBg: string;
  previewText: string;
}

export const CUSTOM_THEME_SHADES: CustomThemeShadeOption[] = [
  // For Light Background Images (Dark Text)
  { id: 'charcoal', name: 'Charcoal Black', group: 'light-bg', groupLabel: 'For Light Images', swatch: '#0F172A', previewBg: '#F8FAFC', previewText: '#0F172A' },
  { id: 'wine', name: 'Royal Wine', group: 'light-bg', groupLabel: 'For Light Images', swatch: '#881337', previewBg: '#FFF1F2', previewText: '#881337' },
  { id: 'espresso', name: 'Espresso Brown', group: 'light-bg', groupLabel: 'For Light Images', swatch: '#3E2723', previewBg: '#EFEBE9', previewText: '#3E2723' },

  // For Dark Background Images (Light Text)
  { id: 'white', name: 'Pure White', group: 'dark-bg', groupLabel: 'For Dark Images', swatch: '#FFFFFF', previewBg: '#090A0F', previewText: '#FFFFFF' },
  { id: 'gold', name: 'Champagne Gold', group: 'dark-bg', groupLabel: 'For Dark Images', swatch: '#F59E0B', previewBg: '#18181B', previewText: '#F59E0B' },
  { id: 'cream', name: 'Soft Cream', group: 'dark-bg', groupLabel: 'For Dark Images', swatch: '#FEF3C7', previewBg: '#27272A', previewText: '#FEF3C7' },
];

export function buildCustomMenuSheetTheme(config?: CustomThemeConfig | null): MenuSheetTheme {
  const shadeId: CustomShadeId = config?.shadeId || 'charcoal';
  const hasBgImage = Boolean(config?.bgImageUrl);

  const baseTheme = MENU_SHEET_THEMES.find((t) => t.id === 'custom') || MENU_SHEET_THEMES[0];

  const watermarkStyle: React.CSSProperties = hasBgImage
    ? {
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3e%3ctext x='50%25' y='50%25' font-family='Arial, sans-serif' font-size='24' fill='rgba(0,0,0,0.035)' text-anchor='middle' dominant-baseline='middle' transform='rotate(-30, 150, 100)'%3eCOLOR HUT%3c/text%3e%3c/svg%3e"), url('${config!.bgImageUrl}')`,
        backgroundSize: '300px 200px, 100% 100%',
        backgroundPosition: '0 0, center',
        backgroundRepeat: 'repeat, no-repeat',
      }
    : {
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3e%3ctext x='50%25' y='50%25' font-family='Arial, sans-serif' font-size='24' fill='rgba(0,0,0,0.04)' text-anchor='middle' dominant-baseline='middle' transform='rotate(-30, 150, 100)'%3eCOLOR HUT%3c/text%3e%3c/svg%3e")`,
        backgroundSize: '300px 200px',
        backgroundPosition: '0 0',
        backgroundRepeat: 'repeat',
      };

  const shadeDefinitions: Record<CustomShadeId, Partial<MenuSheetTheme>> = {
    charcoal: {
      isDark: false,
      businessTitleClass: 'text-slate-900 font-extrabold',
      dateTextClass: 'text-slate-600 font-medium',
      dateIconClass: 'text-slate-800',
      categoryTitleClass: 'text-slate-900 font-extrabold tracking-tight',
      categoryBorderClass: 'border-b-[1.5px] border-slate-900/30',
      itemNameClass: 'text-slate-950 font-bold',
      itemPriceClass: 'text-slate-900 font-extrabold',
      itemDescClass: 'text-slate-600 leading-relaxed',
      variationLinkClass: 'text-slate-800 hover:text-black font-semibold',
      variationBoxClass: 'bg-slate-100/90 border-l-[3px] border-slate-900 border-y border-r border-slate-300 shadow-xs backdrop-blur-xs',
      variationSubItemClass: 'bg-white text-slate-900 border border-slate-200 shadow-xs',
      variationPriceClass: 'text-slate-900 font-bold',
      footerBorderClass: 'border-t-[1.5px] border-slate-300',
      footerTextClass: 'text-slate-600 font-medium',
      logoBoxClass: 'bg-black shadow-md border border-slate-700',
    },
    wine: {
      isDark: false,
      businessTitleClass: 'text-[#2C1810] font-extrabold',
      dateTextClass: 'text-[#7D6B5D] font-medium',
      dateIconClass: 'text-[#881337]',
      categoryTitleClass: 'text-[#881337] font-extrabold tracking-tight',
      categoryBorderClass: 'border-b-[1.5px] border-[#881337]/35',
      itemNameClass: 'text-[#2C1810] font-bold',
      itemPriceClass: 'text-[#881337] font-extrabold',
      itemDescClass: 'text-[#7D6B5D] leading-relaxed',
      variationLinkClass: 'text-[#881337] hover:text-[#9F1239] font-semibold',
      variationBoxClass: 'bg-[#FFF1F2]/85 border-l-[3px] border-[#881337] border-y border-r border-[#FECDD3] shadow-xs backdrop-blur-xs',
      variationSubItemClass: 'bg-white text-[#2C1810] border border-[#FFE4E6] shadow-xs',
      variationPriceClass: 'text-[#881337] font-bold',
      footerBorderClass: 'border-t-[1.5px] border-[#881337]/25',
      footerTextClass: 'text-[#7D6B5D] font-medium',
      logoBoxClass: 'bg-[#2B0813] border border-[#881337]/40 shadow-md',
    },
    espresso: {
      isDark: false,
      businessTitleClass: 'text-[#271C16] font-extrabold',
      dateTextClass: 'text-[#6D5545] font-medium',
      dateIconClass: 'text-[#6B3E26]',
      categoryTitleClass: 'text-[#6B3E26] font-extrabold tracking-tight',
      categoryBorderClass: 'border-b-[1.5px] border-[#6B3E26]/35',
      itemNameClass: 'text-[#271C16] font-bold',
      itemPriceClass: 'text-[#6B3E26] font-extrabold',
      itemDescClass: 'text-[#6D5545] leading-relaxed',
      variationLinkClass: 'text-[#6B3E26] hover:text-[#4A2816] font-semibold',
      variationBoxClass: 'bg-[#FBF7F4]/90 border-l-[3px] border-[#6B3E26] border-y border-r border-[#E8DDD5] shadow-xs backdrop-blur-xs',
      variationSubItemClass: 'bg-white text-[#271C16] border border-[#E8DDD5] shadow-xs',
      variationPriceClass: 'text-[#6B3E26] font-bold',
      footerBorderClass: 'border-t-[1.5px] border-[#8C6239]/25',
      footerTextClass: 'text-[#6D5545] font-medium',
      logoBoxClass: 'bg-[#211510] border border-[#6B3E26]/40 shadow-md',
    },
    white: {
      isDark: true,
      businessTitleClass: 'text-white font-extrabold drop-shadow-xs',
      dateTextClass: 'text-slate-200 font-medium drop-shadow-xs',
      dateIconClass: 'text-white',
      categoryTitleClass: 'text-white font-extrabold tracking-tight drop-shadow-xs',
      categoryBorderClass: 'border-b-[1.5px] border-white/40',
      itemNameClass: 'text-white font-bold drop-shadow-xs',
      itemPriceClass: 'text-white font-extrabold drop-shadow-xs',
      itemDescClass: 'text-slate-200/90 leading-relaxed drop-shadow-xs',
      variationLinkClass: 'text-white hover:text-slate-200 underline font-semibold',
      variationBoxClass: 'bg-black/40 border-l-[3px] border-white border-y border-r border-white/20 shadow-xs backdrop-blur-sm',
      variationSubItemClass: 'bg-black/50 text-white border border-white/15 shadow-xs',
      variationPriceClass: 'text-white font-bold',
      footerBorderClass: 'border-t-[1.5px] border-white/30',
      footerTextClass: 'text-slate-200 font-medium drop-shadow-xs',
      logoBoxClass: 'bg-black/80 border border-white/30 backdrop-blur-sm shadow-md',
    },
    gold: {
      isDark: true,
      businessTitleClass: 'text-[#FFFBEB] font-extrabold drop-shadow-xs',
      dateTextClass: 'text-amber-200/90 font-medium drop-shadow-xs',
      dateIconClass: 'text-amber-400',
      categoryTitleClass: 'text-amber-400 font-extrabold tracking-wide drop-shadow-xs',
      categoryBorderClass: 'border-b-[1.5px] border-amber-400/40',
      itemNameClass: 'text-[#FFFBEB] font-bold drop-shadow-xs',
      itemPriceClass: 'text-amber-400 font-extrabold drop-shadow-xs',
      itemDescClass: 'text-amber-100/80 leading-relaxed drop-shadow-xs',
      variationLinkClass: 'text-amber-400 hover:text-amber-300 font-semibold',
      variationBoxClass: 'bg-black/50 border-l-[3px] border-amber-400 border-y border-r border-amber-500/25 shadow-xs backdrop-blur-sm',
      variationSubItemClass: 'bg-black/60 text-amber-50 border border-amber-500/20 shadow-xs',
      variationPriceClass: 'text-amber-400 font-bold',
      footerBorderClass: 'border-t-[1.5px] border-amber-400/30',
      footerTextClass: 'text-amber-200/80 font-medium drop-shadow-xs',
      logoBoxClass: 'bg-black/90 border border-amber-500/40 backdrop-blur-sm shadow-md',
    },
    cream: {
      isDark: true,
      businessTitleClass: 'text-[#FEF3C7] font-extrabold drop-shadow-xs',
      dateTextClass: 'text-amber-100/85 font-medium drop-shadow-xs',
      dateIconClass: 'text-amber-300',
      categoryTitleClass: 'text-[#FDE68A] font-extrabold tracking-tight drop-shadow-xs',
      categoryBorderClass: 'border-b-[1.5px] border-amber-200/35',
      itemNameClass: 'text-[#FEF3C7] font-bold drop-shadow-xs',
      itemPriceClass: 'text-[#FDE68A] font-extrabold drop-shadow-xs',
      itemDescClass: 'text-amber-100/75 leading-relaxed drop-shadow-xs',
      variationLinkClass: 'text-[#FDE68A] hover:text-amber-200 font-semibold',
      variationBoxClass: 'bg-black/45 border-l-[3px] border-amber-300 border-y border-r border-amber-200/20 shadow-xs backdrop-blur-sm',
      variationSubItemClass: 'bg-black/55 text-amber-100 border border-amber-200/15 shadow-xs',
      variationPriceClass: 'text-amber-300 font-bold',
      footerBorderClass: 'border-t-[1.5px] border-amber-200/25',
      footerTextClass: 'text-amber-100/75 font-medium drop-shadow-xs',
      logoBoxClass: 'bg-zinc-950/85 border border-amber-300/30 backdrop-blur-sm shadow-md',
    },
  };

  const shadeOverrides = shadeDefinitions[shadeId] || shadeDefinitions.charcoal;

  return {
    ...baseTheme,
    ...shadeOverrides,
    sheetWrapperClass: hasBgImage ? 'bg-[#121316]' : 'bg-[#F1F3F7]',
    sheetCardClass: hasBgImage
      ? 'bg-[#FDF8ED] text-[#0F172A] border border-border/60 shadow-2xl max-w-[820px] min-h-[400px] sm:min-h-[600px] flex flex-col justify-between px-4 sm:px-14 md:px-16 py-6 sm:py-14 md:py-16'
      : 'bg-white dark:bg-slate-900 text-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 min-h-[350px] sm:min-h-[500px] max-w-[820px] flex flex-col justify-between p-4 sm:p-12 rounded-2xl relative shadow-md',
    watermarkStyle,
  };
}

export function getMenuSheetTheme(
  themeId?: string | null,
  customConfig?: CustomThemeConfig | null
): MenuSheetTheme {
  if (!themeId) return MENU_SHEET_THEMES[0];
  const cleanId = themeId.toLowerCase().trim();

  // If custom theme selected, build with dynamic user config
  if (cleanId === 'custom') {
    return buildCustomMenuSheetTheme(customConfig);
  }

  // Map legacy 'burgundy' to 'vintage'
  if (cleanId === 'burgundy') {
    const v = MENU_SHEET_THEMES.find((t) => t.id === 'vintage');
    if (v) return v;
  }
  const found = MENU_SHEET_THEMES.find((t) => t.id === cleanId);
  return found || MENU_SHEET_THEMES[0];
}
