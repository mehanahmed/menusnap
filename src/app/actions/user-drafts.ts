'use server';

import pool from '@/lib/mysql';
import { revalidatePath } from 'next/cache';
import { formatUtcDateTime } from '@/lib/dateUtils';

export interface UserDraftItem {
  id: string;
  name: string;
  price: number;
  category?: string | null;
  categoryId?: string | number | null;
  description?: string | null;
  banglaName?: string | null;
  arabicName?: string | null;
  spanishName?: string | null;
  subItems?: Array<{
    id?: string;
    name: string;
    price?: number;
  }>;
  [key: string]: any;
}

export interface UserDraftRecord {
  id: number;
  draftId: string;
  clientId: number | null;
  businessName: string;
  businessType: 'restaurant' | 'parlour';
  whatsappNumber: string | null;
  email: string | null;
  draftName: string;
  itemCount: number;
  primaryTag: string | null;
  items: UserDraftItem[];
  createdAt: string;
  updatedAt: string;
}

export interface UserDraftStats {
  totalDrafts: number;
  totalUniqueBusinesses: number;
  totalSavedItems: number;
  restaurantDrafts: number;
  parlourDrafts: number;
}

export interface SaveUserDraftInput {
  draftId?: string;
  id?: string;
  draftName?: string;
  name?: string;
  businessName?: string;
  businessType?: 'restaurant' | 'parlour' | string;
  whatsappNumber?: string;
  email?: string;
  clientId?: number;
  primaryTag?: string;
  items: UserDraftItem[];
  itemCount?: number;
  createdAt?: string;
}

/**
 * Ensures user_drafts schema exists in MySQL.
 */
async function ensureUserDraftsSchema(): Promise<void> {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_drafts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        draft_id VARCHAR(100) NOT NULL UNIQUE,
        client_id INT NULL,
        business_name VARCHAR(255) NOT NULL,
        business_type VARCHAR(50) DEFAULT 'restaurant',
        whatsapp_number VARCHAR(50) NULL,
        email VARCHAR(255) NULL,
        draft_name VARCHAR(255) NOT NULL,
        item_count INT DEFAULT 0,
        primary_tag VARCHAR(100) NULL,
        items_json LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_draft_id (draft_id),
        INDEX idx_business_name (business_name),
        INDEX idx_whatsapp (whatsapp_number),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (error) {
    console.error('Failed to ensure user_drafts schema:', error);
  }
}

/**
 * Saves or updates a user draft in the database.
 */
export async function saveUserDraftAction(input: SaveUserDraftInput): Promise<{ success: boolean; error?: string; draftId?: string }> {
  try {
    await ensureUserDraftsSchema();

    const rawDraftId = input.draftId || input.id;
    const cleanDraftId = String(rawDraftId || `draft-${Date.now()}`).trim();

    let cleanBusinessName = String(input.businessName || 'Anonymous Restaurant').trim();
    let cleanBusinessType = input.businessType === 'parlour' ? 'parlour' : 'restaurant';
    let cleanWhatsapp = input.whatsappNumber ? String(input.whatsappNumber).trim() : null;
    let cleanEmail = input.email ? String(input.email).trim() : null;
    let clientId = typeof input.clientId === 'number' ? input.clientId : null;

    const rawDraftName = input.draftName || input.name;
    const cleanDraftName = String(rawDraftName || `Draft - ${new Date().toLocaleString()}`).trim();
    const items = Array.isArray(input.items) ? input.items : [];
    const itemCount = typeof input.itemCount === 'number' ? input.itemCount : items.length;
    const primaryTag = input.primaryTag ? String(input.primaryTag).trim() : (cleanBusinessType === 'parlour' ? 'parlour' : 'restaurant');

    // Auto-enrich client details from clients table if missing
    if ((!cleanWhatsapp || !cleanEmail || !clientId) && cleanBusinessName) {
      try {
        const [clientRows]: any = await pool.execute(
          'SELECT id, business_name, business_type, whatsapp_number, email FROM clients WHERE LOWER(business_name) = LOWER(?) OR (whatsapp_number = ? AND ? != "") LIMIT 1',
          [cleanBusinessName, cleanWhatsapp || '', cleanWhatsapp || '']
        );
        if (clientRows && clientRows.length > 0) {
          const matched = clientRows[0];
          if (!clientId && matched.id) clientId = matched.id;
          if (!cleanWhatsapp && matched.whatsapp_number) cleanWhatsapp = matched.whatsapp_number;
          if (!cleanEmail && matched.email) cleanEmail = matched.email;
          if (matched.business_type) cleanBusinessType = matched.business_type === 'parlour' ? 'parlour' : 'restaurant';
          if (matched.business_name && cleanBusinessName.toLowerCase() === matched.business_name.toLowerCase()) {
            cleanBusinessName = matched.business_name;
          }
        }
      } catch (clientLookupErr) {
        console.warn('Client lookup error during draft save:', clientLookupErr);
      }
    }

    const itemsJson = JSON.stringify(items);

    // Format created_at if provided
    let formattedCreatedAt: string | null = null;
    if (input.createdAt) {
      try {
        formattedCreatedAt = formatUtcDateTime(input.createdAt);
      } catch {
        formattedCreatedAt = null;
      }
    }

    if (formattedCreatedAt) {
      await pool.execute(
        `INSERT INTO user_drafts (
          draft_id, client_id, business_name, business_type,
          whatsapp_number, email, draft_name, item_count, primary_tag, items_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          client_id = COALESCE(VALUES(client_id), client_id),
          business_name = VALUES(business_name),
          business_type = VALUES(business_type),
          whatsapp_number = COALESCE(VALUES(whatsapp_number), whatsapp_number),
          email = COALESCE(VALUES(email), email),
          draft_name = VALUES(draft_name),
          item_count = VALUES(item_count),
          primary_tag = VALUES(primary_tag),
          items_json = VALUES(items_json),
          updated_at = CURRENT_TIMESTAMP`,
        [
          cleanDraftId,
          clientId,
          cleanBusinessName,
          cleanBusinessType,
          cleanWhatsapp,
          cleanEmail,
          cleanDraftName,
          itemCount,
          primaryTag,
          itemsJson,
          formattedCreatedAt,
        ]
      );
    } else {
      await pool.execute(
        `INSERT INTO user_drafts (
          draft_id, client_id, business_name, business_type,
          whatsapp_number, email, draft_name, item_count, primary_tag, items_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          client_id = COALESCE(VALUES(client_id), client_id),
          business_name = VALUES(business_name),
          business_type = VALUES(business_type),
          whatsapp_number = COALESCE(VALUES(whatsapp_number), whatsapp_number),
          email = COALESCE(VALUES(email), email),
          draft_name = VALUES(draft_name),
          item_count = VALUES(item_count),
          primary_tag = VALUES(primary_tag),
          items_json = VALUES(items_json),
          updated_at = CURRENT_TIMESTAMP`,
        [
          cleanDraftId,
          clientId,
          cleanBusinessName,
          cleanBusinessType,
          cleanWhatsapp,
          cleanEmail,
          cleanDraftName,
          itemCount,
          primaryTag,
          itemsJson,
        ]
      );
    }

    try {
      revalidatePath('/m-admin/user-drafts');
    } catch (_) {}
    return { success: true, draftId: cleanDraftId };
  } catch (error: any) {
    console.error('Error saving user draft:', error);
    return { success: false, error: error.message || 'Failed to save draft' };
  }
}

/**
 * Batch syncs multiple user drafts (e.g. from local storage).
 */
export async function batchSyncUserDraftsAction(
  drafts: SaveUserDraftInput[]
): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  if (!Array.isArray(drafts) || drafts.length === 0) {
    return { success: true, syncedCount: 0 };
  }

  let count = 0;
  for (const draft of drafts) {
    if (draft) {
      const resolvedId = draft.draftId || draft.id;
      if (resolvedId) {
        const res = await saveUserDraftAction(draft);
        if (res.success) count++;
      }
    }
  }

  return { success: true, syncedCount: count };
}

/**
 * Retrieves all user drafts for the admin panel with search, filters, and statistics.
 */
export async function getUserDraftsAction(params?: {
  search?: string;
  businessType?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  drafts: UserDraftRecord[];
  stats: UserDraftStats;
  total: number;
  page: number;
  totalPages: number;
  error?: string;
}> {
  try {
    await ensureUserDraftsSchema();

    const search = params?.search ? params.search.trim().toLowerCase() : '';
    const businessType = params?.businessType && params.businessType !== 'all' ? params.businessType.trim() : null;
    const page = Math.max(1, Number(params?.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(params?.limit) || 100));
    const offset = (page - 1) * limit;

    // Base query conditions
    const whereClauses: string[] = ['1=1'];
    const queryParams: any[] = [];

    if (businessType) {
      whereClauses.push('business_type = ?');
      queryParams.push(businessType);
    }

    if (search) {
      whereClauses.push('(LOWER(business_name) LIKE ? OR LOWER(draft_name) LIKE ? OR LOWER(COALESCE(whatsapp_number, "")) LIKE ? OR LOWER(items_json) LIKE ?)');
      const pattern = `%${search}%`;
      queryParams.push(pattern, pattern, pattern, pattern);
    }

    const whereSql = whereClauses.join(' AND ');

    // Total filtered count
    const [countRows]: any = await pool.execute(
      `SELECT COUNT(*) as total FROM user_drafts WHERE ${whereSql}`,
      queryParams
    );
    const total = countRows?.[0]?.total || 0;

    // Fetch records
    const [rows]: any = await pool.execute(
      `SELECT 
        id,
        draft_id as draftId,
        client_id as clientId,
        business_name as businessName,
        business_type as businessType,
        whatsapp_number as whatsappNumber,
        email,
        draft_name as draftName,
        item_count as itemCount,
        primary_tag as primaryTag,
        items_json as itemsJson,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt
      FROM user_drafts
      WHERE ${whereSql}
      ORDER BY created_at DESC, updated_at DESC
      LIMIT ? OFFSET ?`,
      [...queryParams, String(limit), String(offset)]
    );

    const drafts: UserDraftRecord[] = (Array.isArray(rows) ? rows : []).map((row: any) => {
      let items: UserDraftItem[] = [];
      try {
        if (typeof row.itemsJson === 'string') {
          items = JSON.parse(row.itemsJson);
        } else if (Array.isArray(row.itemsJson)) {
          items = row.itemsJson;
        }
      } catch (e) {
        items = [];
      }

      return {
        id: row.id,
        draftId: row.draftId,
        clientId: row.clientId,
        businessName: row.businessName || 'Anonymous Restaurant',
        businessType: row.businessType || 'restaurant',
        whatsappNumber: row.whatsappNumber,
        email: row.email,
        draftName: row.draftName,
        itemCount: row.itemCount || items.length,
        primaryTag: row.primaryTag,
        items,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });

    // Overall stats
    const [statsRows]: any = await pool.execute(`
      SELECT 
        COUNT(*) as totalDrafts,
        COUNT(DISTINCT business_name) as totalUniqueBusinesses,
        COALESCE(SUM(item_count), 0) as totalSavedItems,
        SUM(CASE WHEN business_type = 'restaurant' THEN 1 ELSE 0 END) as restaurantDrafts,
        SUM(CASE WHEN business_type = 'parlour' THEN 1 ELSE 0 END) as parlourDrafts
      FROM user_drafts
    `);

    const rawStat = statsRows?.[0] || {};
    const stats: UserDraftStats = {
      totalDrafts: Number(rawStat.totalDrafts) || 0,
      totalUniqueBusinesses: Number(rawStat.totalUniqueBusinesses) || 0,
      totalSavedItems: Number(rawStat.totalSavedItems) || 0,
      restaurantDrafts: Number(rawStat.restaurantDrafts) || 0,
      parlourDrafts: Number(rawStat.parlourDrafts) || 0,
    };

    return {
      success: true,
      drafts,
      stats,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  } catch (error: any) {
    console.error('Error fetching user drafts:', error);
    return {
      success: false,
      drafts: [],
      stats: {
        totalDrafts: 0,
        totalUniqueBusinesses: 0,
        totalSavedItems: 0,
        restaurantDrafts: 0,
        parlourDrafts: 0,
      },
      total: 0,
      page: 1,
      totalPages: 1,
      error: error.message || 'Failed to fetch user drafts',
    };
  }
}

/**
 * Retrieves a single draft by draftId.
 */
export async function getUserDraftByIdAction(draftId: string): Promise<{
  success: boolean;
  draft?: UserDraftRecord;
  error?: string;
}> {
  try {
    await ensureUserDraftsSchema();

    const [rows]: any = await pool.execute(
      `SELECT 
        id,
        draft_id as draftId,
        client_id as clientId,
        business_name as businessName,
        business_type as businessType,
        whatsapp_number as whatsappNumber,
        email,
        draft_name as draftName,
        item_count as itemCount,
        primary_tag as primaryTag,
        items_json as itemsJson,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt
      FROM user_drafts
      WHERE draft_id = ?
      LIMIT 1`,
      [draftId]
    );

    if (!rows || rows.length === 0) {
      return { success: false, error: 'Draft not found' };
    }

    const row = rows[0];
    let items: UserDraftItem[] = [];
    try {
      items = JSON.parse(row.itemsJson);
    } catch {
      items = [];
    }

    return {
      success: true,
      draft: {
        id: row.id,
        draftId: row.draftId,
        clientId: row.clientId,
        businessName: row.businessName,
        businessType: row.businessType,
        whatsappNumber: row.whatsappNumber,
        email: row.email,
        draftName: row.draftName,
        itemCount: row.itemCount,
        primaryTag: row.primaryTag,
        items,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    };
  } catch (error: any) {
    console.error('Error fetching user draft by id:', error);
    return { success: false, error: error.message || 'Failed to fetch draft' };
  }
}

/**
 * Deletes a draft by draftId.
 */
export async function deleteUserDraftAction(draftId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureUserDraftsSchema();

    await pool.execute(`DELETE FROM user_drafts WHERE draft_id = ?`, [draftId]);
    try {
      revalidatePath('/m-admin/user-drafts');
    } catch (_) {}
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting user draft:', error);
    return { success: false, error: error.message || 'Failed to delete draft' };
  }
}
