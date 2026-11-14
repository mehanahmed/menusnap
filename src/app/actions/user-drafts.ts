'use server';

import pool from '@/lib/mysql';
import { revalidatePath } from 'next/cache';
import { formatLocalDateTime } from '@/lib/dateUtils';

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
  isSaved?: boolean;
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
  isSaved?: boolean;
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
        is_saved TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_draft_id (draft_id),
        INDEX idx_business_name (business_name),
        INDEX idx_whatsapp (whatsapp_number),
        INDEX idx_created_at (created_at),
        INDEX idx_is_saved (is_saved)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Migration in case table already existed without is_saved column
    try {
      await pool.execute(`ALTER TABLE user_drafts ADD COLUMN is_saved TINYINT(1) DEFAULT 0`);
    } catch (_) {}
  } catch (error) {
    console.error('Failed to ensure user_drafts schema:', error);
  }
}

/**
 * Enriches draft items with master variations (subItems) and descriptions from menu_items if missing.
 */
async function enrichDraftItemsWithMenuData(items: any[]): Promise<any[]> {
  if (!Array.isArray(items) || items.length === 0) return items;
  const needsEnrichment = items.some(it => !it.subItems || it.subItems.length === 0);
  if (!needsEnrichment) return items;

  try {
    const itemIds = items.map(it => it.id).filter(Boolean);
    const itemNames = items.map(it => it.name).filter(Boolean);
    if (itemIds.length === 0 && itemNames.length === 0) return items;

    const conditions: string[] = [];
    const params: any[] = [];
    if (itemIds.length > 0) {
      conditions.push(`id IN (${itemIds.map(() => '?').join(',')})`);
      params.push(...itemIds);
    }
    if (itemNames.length > 0) {
      conditions.push(`name IN (${itemNames.map(() => '?').join(',')})`);
      params.push(...itemNames);
    }

    const [menuItemRows]: any = await pool.execute(
      `SELECT id, name, description, price, subItems FROM menu_items WHERE ${conditions.join(' OR ')}`,
      params
    );

    if (menuItemRows && menuItemRows.length > 0) {
      for (const it of items) {
        if (!it.subItems || it.subItems.length === 0) {
          const match = menuItemRows.find((m: any) =>
            (it.id && String(m.id) === String(it.id)) ||
            (it.name && String(m.name).trim().toLowerCase() === String(it.name).trim().toLowerCase())
          );
          if (match && match.subItems) {
            try {
              const parsedSub = typeof match.subItems === 'string' ? JSON.parse(match.subItems) : match.subItems;
              if (Array.isArray(parsedSub) && parsedSub.length > 0) {
                it.subItems = parsedSub;
              }
            } catch {}
          }
          if (!it.description && match && match.description) {
            it.description = match.description;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[enrichDraftItemsWithMenuData] Notice:', err);
  }
  return items;
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

    const enrichedItems = await enrichDraftItemsWithMenuData(items);
    const itemsJson = JSON.stringify(enrichedItems);

    // Format created_at if provided
    let formattedCreatedAt: string | null = null;
    if (input.createdAt) {
      try {
        formattedCreatedAt = formatLocalDateTime(input.createdAt);
      } catch {
        formattedCreatedAt = null;
      }
    }

    // Anti-hijacking guard: prevent an account or guest from overwriting another client's existing draft
    const [existingRows]: any = await pool.execute(
      'SELECT client_id FROM user_drafts WHERE draft_id = ? LIMIT 1',
      [cleanDraftId]
    );
    if (existingRows && existingRows.length > 0) {
      const existingOwnerId = existingRows[0].client_id;
      if (existingOwnerId && (!clientId || Number(existingOwnerId) !== Number(clientId))) {
        console.warn(`[saveUserDraftAction] Blocked draft hijack: draft ${cleanDraftId} belongs to client ${existingOwnerId}, attempted update by client ${clientId}`);
        return { success: false, error: 'Draft belongs to another client' };
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
  clientId?: number | null;
  businessName?: string | null;
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

    // Strict multi-tenant isolation: If clientId is provided, filter strictly by client_id (never match by business_name)
    if (params?.clientId) {
      whereClauses.push('client_id = ?');
      queryParams.push(params.clientId);
    } else if (params?.businessName) {
      whereClauses.push('LOWER(business_name) = LOWER(?)');
      queryParams.push(params.businessName.trim());
    }

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
        is_saved as isSaved,
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
        isSaved: Boolean(row.isSaved),
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

    const enrichedDrafts: UserDraftRecord[] = await Promise.all(
      drafts.map(async (d) => ({
        ...d,
        items: await enrichDraftItemsWithMenuData(d.items),
      }))
    );

    return {
      success: true,
      drafts: enrichedDrafts,
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
        COALESCE(is_saved, 0) as isSaved,
        items_json as itemsJson,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt
      FROM user_drafts
      WHERE draft_id = ? OR CAST(id AS CHAR) = ?
      LIMIT 1`,
      [draftId, draftId]
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
    items = await enrichDraftItemsWithMenuData(items);

    let businessWhatsapp = row.whatsappNumber ? String(row.whatsappNumber).trim() : null;
    if (!businessWhatsapp && (row.clientId || row.businessName)) {
      try {
        const [clientRows]: any = await pool.execute(
          'SELECT whatsapp_number FROM clients WHERE id = ? OR LOWER(business_name) = LOWER(?) LIMIT 1',
          [row.clientId || 0, row.businessName ? String(row.businessName).trim() : '']
        );
        if (clientRows && clientRows.length > 0 && clientRows[0].whatsapp_number) {
          businessWhatsapp = String(clientRows[0].whatsapp_number).trim();
        }
      } catch (_) {}
    }

    return {
      success: true,
      draft: {
        id: row.id,
        draftId: row.draftId,
        clientId: row.clientId,
        businessName: row.businessName,
        businessType: row.businessType,
        whatsappNumber: businessWhatsapp,
        email: row.email,
        draftName: row.draftName,
        itemCount: row.itemCount,
        primaryTag: row.primaryTag,
        isSaved: Boolean(row.isSaved),
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

/**
 * Sets a single draft as the active saved menu for digital QR stands and customer ordering.
 * Automatically deactivates/unsaves any previously saved drafts for this account/business.
 */
export async function setActiveSavedDraftAction(params: {
  draftId: string;
  clientId?: number | null;
  businessName?: string | null;
}): Promise<{ success: boolean; activeDraftId?: string; previousDraftId?: string | null; error?: string }> {
  try {
    await ensureUserDraftsSchema();
    const { draftId, clientId, businessName } = params;

    // 1. Identify previous saved draft
    let prevQuery = `SELECT draft_id FROM user_drafts WHERE is_saved = 1`;
    const prevParams: any[] = [];
    if (clientId) {
      prevQuery += ` AND client_id = ?`;
      prevParams.push(clientId);
    } else if (businessName) {
      prevQuery += ` AND business_name = ?`;
      prevParams.push(businessName);
    }
    const [prevRows]: any = await pool.execute(prevQuery, prevParams);
    const previousDraftId = prevRows && prevRows.length > 0 ? prevRows[0].draft_id : null;

    // 2. Unsave all drafts for this account or globally
    if (clientId) {
      await pool.execute(`UPDATE user_drafts SET is_saved = 0 WHERE client_id = ?`, [clientId]);
    } else if (businessName) {
      await pool.execute(`UPDATE user_drafts SET is_saved = 0 WHERE business_name = ?`, [businessName]);
    } else {
      await pool.execute(`UPDATE user_drafts SET is_saved = 0`);
    }

    // 3. Mark the new target draft as saved (is_saved = 1)
    await pool.execute(`UPDATE user_drafts SET is_saved = 1 WHERE draft_id = ? OR CAST(id AS CHAR) = ?`, [draftId, draftId]);

    return { success: true, activeDraftId: draftId, previousDraftId };
  } catch (error: any) {
    console.error('Error in setActiveSavedDraftAction:', error);
    return { success: false, error: error.message || 'Failed to set active saved draft' };
  }
}

/**
 * Retrieves the currently active saved draft for this client or business.
 */
export async function getActiveSavedDraftAction(params?: {
  clientId?: number | null;
  businessName?: string | null;
}): Promise<{ success: boolean; activeDraftId?: string | null; draftName?: string | null; error?: string }> {
  try {
    await ensureUserDraftsSchema();
    const clientId = params?.clientId;
    const businessName = params?.businessName;

    // Strict multi-tenant check: if no client identification is provided, return empty
    if (!clientId && !businessName) {
      return { success: true, activeDraftId: null, draftName: null };
    }

    let query = `SELECT draft_id, draft_name FROM user_drafts WHERE is_saved = 1`;
    const queryParams: any[] = [];

    if (clientId) {
      query += ` AND client_id = ?`;
      queryParams.push(clientId);
    } else if (businessName) {
      query += ` AND business_name = ?`;
      queryParams.push(businessName);
    }

    query += ` ORDER BY updated_at DESC LIMIT 1`;

    const [rows]: any = await pool.execute(query, queryParams);

    if (rows && rows.length > 0) {
      return {
        success: true,
        activeDraftId: rows[0].draft_id,
        draftName: rows[0].draft_name,
      };
    }

    return { success: true, activeDraftId: null, draftName: null };
  } catch (error: any) {
    console.error('Error in getActiveSavedDraftAction:', error);
    return { success: false, error: error.message || 'Failed to fetch active saved draft' };
  }
}

/**
 * Updates the order-receiving WhatsApp number for a specific draft.
 */
export async function updateDraftWhatsappNumberAction(
  draftId: string,
  whatsappNumber: string
): Promise<{ success: boolean; formattedNumber?: string; error?: string }> {
  try {
    await ensureUserDraftsSchema();
    const cleanDigits = whatsappNumber.replace(/\D/g, '').slice(-11);
    if (cleanDigits.length !== 11 || !cleanDigits.startsWith('01')) {
      return {
        success: false,
        error: 'Please enter a valid 11-digit Bangladeshi mobile number starting with 01.',
      };
    }

    await pool.execute(
      `UPDATE user_drafts SET whatsapp_number = ?, updated_at = CURRENT_TIMESTAMP WHERE draft_id = ? OR CAST(id AS CHAR) = ?`,
      [cleanDigits, draftId, draftId]
    );

    try {
      revalidatePath(`/draft/qr/${draftId}`);
      revalidatePath(`/draft/view/${draftId}`);
    } catch (_) {}

    return { success: true, formattedNumber: cleanDigits };
  } catch (error: any) {
    console.error('Error in updateDraftWhatsappNumberAction:', error);
    return { success: false, error: error.message || 'Failed to update WhatsApp number' };
  }
}
