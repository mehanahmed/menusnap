/**
 * Accounts Module Helper Utilities
 * Currency formatting, date formatting, pagination, and multi-tenant soft-delete helpers.
 */

import { format, parseISO, isValid } from 'date-fns';

/**
 * Format currency with default symbol '৳' (e.g., 1200 -> "৳ 1,200")
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currencySymbol: string = '৳'
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return `${currencySymbol} 0`;
  }

  const numeric = typeof amount === 'number' ? amount : parseFloat(amount);
  const isNegative = numeric < 0;
  const absFormatted = Math.abs(numeric).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: numeric % 1 === 0 ? 0 : 2,
  });

  return isNegative ? `-${currencySymbol} ${absFormatted}` : `${currencySymbol} ${absFormatted}`;
}

/**
 * Format account dates consistently across the module (e.g., "12 Nov, 2026")
 */
export function formatAccountDate(
  dateValue: string | Date | null | undefined,
  pattern: string = 'dd MMM, yyyy'
): string {
  if (!dateValue) return 'N/A';

  try {
    const dateObj = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
    if (!isValid(dateObj)) return 'Invalid Date';
    return format(dateObj, pattern);
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Standard pagination parameter parser and SQL offset generator
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationMeta {
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function getPagination(
  rawPage: number | string = 1,
  rawLimit: number | string = 10,
  maxLimit: number = 100
): PaginationParams {
  const pageNumber = Math.max(1, parseInt(String(rawPage), 10) || 1);
  const limitNumber = Math.min(maxLimit, Math.max(1, parseInt(String(rawLimit), 10) || 10));
  const offset = (pageNumber - 1) * limitNumber;

  return {
    page: pageNumber,
    limit: limitNumber,
    offset,
  };
}

export function buildPaginationMeta(
  total: number,
  params: PaginationParams
): PaginationMeta {
  const totalPages = Math.ceil(total / params.limit) || 1;
  return {
    total,
    totalPages,
    currentPage: params.page,
    limit: params.limit,
    hasNext: params.page < totalPages,
    hasPrev: params.page > 1,
  };
}

/**
 * SQL clause helpers for soft delete (deleted_at IS NULL)
 */
export function softDeleteFilter(alias?: string): string {
  const prefix = alias ? `${alias}.` : '';
  return `${prefix}deleted_at IS NULL`;
}

/**
 * SQL clause helpers for tenant isolation by restaurant_id
 */
export function tenantFilter(restaurantId: string | number, alias?: string, includeGlobalDefaults: boolean = false): {
  clause: string;
  params: (string | number)[];
} {
  const prefix = alias ? `${alias}.` : '';
  const cleanId = String(restaurantId).trim();

  if (includeGlobalDefaults) {
    return {
      clause: `(${prefix}restaurant_id = ? OR (${prefix}is_default = 1 AND ${prefix}restaurant_id IS NULL))`,
      params: [cleanId],
    };
  }

  return {
    clause: `${prefix}restaurant_id = ?`,
    params: [cleanId],
  };
}

/**
 * Returns current date and time components in Asia/Dhaka (UTC+6) timezone.
 * Immune to host machine or MySQL system timezones.
 */
export function getDhakaDate(refDate?: Date): {
  dateStr: string;   // 'YYYY-MM-DD'
  year: number;      // e.g. 2026
  month: number;     // 1-12
  day: number;       // 1-31
  monthStr: string;  // 'YYYY-MM'
} {
  const d = refDate || new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(d);
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  return {
    dateStr,
    year: parseInt(yearStr, 10),
    month: parseInt(monthStr, 10),
    day: parseInt(dayStr, 10),
    monthStr: `${yearStr}-${monthStr}`,
  };
}

/**
 * Checks if a date is in the future in Asia/Dhaka (UTC+6) timezone.
 */
export function isFutureDate(dateStr?: string | null, refDate?: Date): boolean {
  if (!dateStr) return false;
  const dhakaToday = getDhakaDate(refDate).dateStr;
  return String(dateStr).slice(0, 10) > dhakaToday;
}

/**
 * Sanitize and extract up to 11 digits for BD phone input (stripping +88 or 88 if present)
 */
export function sanitizeBdPhone(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  let clean = String(rawPhone).trim().replace(/[^0-9+]/g, '');
  if (clean.startsWith('+88')) clean = clean.slice(3);
  else if (clean.startsWith('88')) clean = clean.slice(2);
  return clean.replace(/\D/g, '').slice(0, 11);
}

/**
 * Validate BD phone number (must be exactly 11 digits starting with 01[3-9])
 */
export function isValidBdPhone(phone?: string | null): boolean {
  const digits = sanitizeBdPhone(phone);
  return /^01[3-9]\d{8}$/.test(digits);
}

/**
 * Format 11-digit phone with +88 prefix for database storage (+8801XXXXXXXXX)
 */
export function formatBdPhone(phone?: string | null): string {
  const digits = sanitizeBdPhone(phone);
  return digits ? `+88${digits}` : '';
}
