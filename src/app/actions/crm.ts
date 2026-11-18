"use server";

import pool from '@/lib/mysql';
import { resolveAuthenticatedRestaurantId, getClientBusinessType } from './accounts';
import { getDhakaDate } from '@/lib/accounts/helpers';

let crmSchemaChecked = false;

/**
 * Ensures required CRM tables and migrations exist in MySQL.
 * Tracks executed migrations via the app_migrations table to run each migration
 * exactly once and prevent duplicate ALTER TABLE or DDL executions across server restarts/workers.
 */
export async function ensureCrmSchema(): Promise<void> {
  if (crmSchemaChecked) return;
  try {
    // 0. Ensure persistent migrations tracking table exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS app_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration_name VARCHAR(150) NOT NULL UNIQUE,
        batch VARCHAR(50) NOT NULL DEFAULT 'crm',
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_app_migrations_name (migration_name),
        INDEX idx_app_migrations_batch (batch)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Helper: checks information_schema and only adds column if missing (safe from ER_DUP_FIELDNAME 1060)
    const checkAndAddColumn = async (table: string, column: string, columnDef: string) => {
      try {
        const [rows]: any = await pool.execute(
          `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
          [table, column]
        );
        if (!rows || rows.length === 0) {
          await pool.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${columnDef}`);
        }
      } catch (err) {
        console.warn(`CRM schema check warning for ${table}.${column}:`, err);
      }
    };

    // Helper: executes a migration function exactly once, tracked persistently in app_migrations
    const runMigrationOnce = async (migrationName: string, migrationFn: () => Promise<void>) => {
      try {
        const [rows]: any = await pool.execute(
          `SELECT id FROM app_migrations WHERE migration_name = ? LIMIT 1`,
          [migrationName]
        );
        if (rows && rows.length > 0) {
          return; // Already executed once, skip
        }

        await migrationFn();

        await pool.execute(
          `INSERT IGNORE INTO app_migrations (migration_name, batch) VALUES (?, 'crm')`,
          [migrationName]
        );
      } catch (mErr) {
        console.error(`Error running CRM migration ${migrationName}:`, mErr);
      }
    };

    // Migration 1: Base CRM tables (crm_customers, crm_membership_cards, crm_settings)
    await runMigrationOnce('2026_11_crm_initial_tables_v1', async () => {
      // 1. Table: crm_customers
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS crm_customers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          restaurant_id VARCHAR(100) NOT NULL,
          name VARCHAR(150) NOT NULL,
          phone VARCHAR(50) NOT NULL,
          email VARCHAR(150) NULL,
          address TEXT NULL,
          total_orders INT NOT NULL DEFAULT 0,
          total_spent DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
          first_order_date DATETIME NULL,
          last_order_date DATETIME NULL,
          tier VARCHAR(50) NOT NULL DEFAULT 'Regular',
          notes TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP NULL DEFAULT NULL,
          UNIQUE KEY uq_crm_customer_phone (restaurant_id, phone),
          INDEX idx_crm_cust_restaurant (restaurant_id),
          INDEX idx_crm_cust_phone (phone),
          INDEX idx_crm_cust_spent (total_spent),
          INDEX idx_crm_cust_tier (tier)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 2. Table: crm_membership_cards
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS crm_membership_cards (
          id INT AUTO_INCREMENT PRIMARY KEY,
          restaurant_id VARCHAR(100) NOT NULL,
          customer_id INT NOT NULL,
          card_number VARCHAR(50) NOT NULL UNIQUE,
          tier VARCHAR(50) NOT NULL DEFAULT 'Silver',
          discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          issued_at DATE NOT NULL,
          expires_at DATE NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_crm_card_cust (customer_id),
          INDEX idx_crm_card_rest (restaurant_id),
          INDEX idx_crm_card_num (card_number),
          INDEX idx_crm_card_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 3. Table: crm_settings
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS crm_settings (
          restaurant_id VARCHAR(100) PRIMARY KEY,
          silver_enabled TINYINT(1) NOT NULL DEFAULT 1,
          silver_min_spend DECIMAL(10, 2) NOT NULL DEFAULT 3000.00,
          silver_discount DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
          gold_enabled TINYINT(1) NOT NULL DEFAULT 1,
          gold_min_spend DECIMAL(10, 2) NOT NULL DEFAULT 7000.00,
          gold_discount DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
          platinum_enabled TINYINT(1) NOT NULL DEFAULT 1,
          platinum_min_spend DECIMAL(10, 2) NOT NULL DEFAULT 15000.00,
          platinum_discount DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
          vip_enabled TINYINT(1) NOT NULL DEFAULT 1,
          vip_min_spend DECIMAL(10, 2) NOT NULL DEFAULT 25000.00,
          vip_discount DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
          card_validity_months INT NOT NULL DEFAULT 12,
          auto_issue_cards TINYINT(1) NOT NULL DEFAULT 0,
          card_custom_note VARCHAR(255) NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    });

    // Migration 2: Tier policy columns on crm_settings for existing installations
    await runMigrationOnce('2026_11_crm_settings_tier_columns_v2', async () => {
      await checkAndAddColumn('crm_settings', 'silver_enabled', 'TINYINT(1) NOT NULL DEFAULT 1');
      await checkAndAddColumn('crm_settings', 'gold_enabled', 'TINYINT(1) NOT NULL DEFAULT 1');
      await checkAndAddColumn('crm_settings', 'platinum_enabled', 'TINYINT(1) NOT NULL DEFAULT 1');
      await checkAndAddColumn('crm_settings', 'vip_enabled', 'TINYINT(1) NOT NULL DEFAULT 1');
      await checkAndAddColumn('crm_settings', 'vip_min_spend', 'DECIMAL(10, 2) NOT NULL DEFAULT 25000.00');
      await checkAndAddColumn('crm_settings', 'vip_discount', 'DECIMAL(5, 2) NOT NULL DEFAULT 20.00');
      await checkAndAddColumn('crm_settings', 'card_custom_note', 'VARCHAR(255) NULL');
    });

    // Migration 3: Customer soft-delete & index safety
    await runMigrationOnce('2026_11_crm_customer_soft_delete_and_indexes_v3', async () => {
      await checkAndAddColumn('crm_customers', 'deleted_at', 'TIMESTAMP NULL DEFAULT NULL');
      await checkAndAddColumn('crm_customers', 'notes', 'TEXT NULL');
    });

    crmSchemaChecked = true;
  } catch (error) {
    console.error('Error running ensureCrmSchema:', error);
  }
}

/**
 * Normalize phone numbers to standard format (e.g. 01859594373)
 * Strips whitespace, hyphens, and handles +880 / 880 prefixes.
 */
function normalizeCustomerPhone(rawPhone: string): string {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).replace(/[\s\-\(\)\.]+/g, '').trim();
  if (cleaned.startsWith('+880')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('880') && cleaned.length === 13) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('+88') && cleaned.length === 14) {
    cleaned = '0' + cleaned.slice(3);
  }
  return cleaned;
}

/**
 * Return all common stored variants of a phone number for comprehensive SQL matching.
 */
function getPhoneVariants(phone: string): string[] {
  const norm = normalizeCustomerPhone(phone);
  if (!norm) return [phone];
  const variants = new Set<string>();
  variants.add(phone.trim());
  variants.add(norm);
  if (norm.startsWith('01') && norm.length === 11) {
    variants.add('+88' + norm);
    variants.add('88' + norm);
    variants.add('+880' + norm.slice(1));
  }
  return Array.from(variants);
}

/**
 * Automatically aggregates customers from existing customer_orders (QR menu orders)
 * and incomes (Manual orders/sales with customer_phone) for a restaurant.
 * Normalizes phone numbers so +8801... and 01... merge into the same customer record.
 */
export async function syncCustomersFromOrders(cleanId: string): Promise<void> {
  try {
    await ensureCrmSchema();

    // 1. Determine strict client identifier (prevents cross-tenant leaks if businesses share the same name)
    const isNumericId = !isNaN(Number(cleanId)) && Number(cleanId) > 0;
    let businessName = String(cleanId);
    if (isNumericId) {
      const [clientRows]: any = await pool.execute(
        `SELECT business_name FROM clients WHERE id = ? LIMIT 1`,
        [Number(cleanId)]
      );
      if (clientRows?.[0]?.business_name) {
        businessName = clientRows[0].business_name;
      }
    }

    const qrClientClause = isNumericId ? 'client_id = ?' : 'business_name = ?';
    const qrClientParam = isNumericId ? Number(cleanId) : businessName;

    // 2. Fetch loyalty settings for spend thresholds
    const [settingRows]: any = await pool.execute(
      `SELECT * FROM crm_settings WHERE restaurant_id = ? LIMIT 1`,
      [cleanId]
    );
    const settings = settingRows?.[0] || {
      silver_enabled: 1,
      silver_min_spend: 3000,
      gold_enabled: 1,
      gold_min_spend: 7000,
      platinum_enabled: 1,
      platinum_min_spend: 15000,
      vip_enabled: 1,
      vip_min_spend: 25000,
    };

    // 3A. Fetch QR orders from customer_orders (ONLY completed orders strictly for this client)
    const [qrOrders]: any = await pool.execute(
      `SELECT 
         order_id,
         TRIM(customer_phone) as phone,
         TRIM(customer_name) as clean_name,
         CAST(total_amount AS DECIMAL(12, 2)) as amount,
         created_at as order_date
       FROM customer_orders
       WHERE ${qrClientClause}
         AND status = 'completed'
         AND customer_phone IS NOT NULL 
         AND TRIM(customer_phone) != ''`,
      [qrClientParam]
    );

    // Track existing QR order_ids to prevent duplicates
    const qrOrderIds = new Set<string>();
    if (Array.isArray(qrOrders)) {
      for (const ord of qrOrders) {
        if (ord.order_id) qrOrderIds.add(String(ord.order_id).trim().toLowerCase());
      }
    }

    // 3B. Fetch manual orders / sales from incomes table (excluding deleted incomes)
    const [incomeOrders]: any = await pool.execute(
      `SELECT 
         order_id,
         created_by,
         TRIM(customer_phone) as phone,
         TRIM(customer_name) as clean_name,
         CAST(amount AS DECIMAL(12, 2)) as amount,
         CAST(COALESCE(created_at, date) AS DATETIME) as order_date
       FROM incomes
       WHERE restaurant_id = ?
         AND deleted_at IS NULL
         AND customer_phone IS NOT NULL 
         AND TRIM(customer_phone) != ''`,
      [cleanId]
    );

    // Filter incomes in memory to avoid duplicate QR orders
    const validManualOrders: any[] = [];
    if (Array.isArray(incomeOrders)) {
      for (const inc of incomeOrders) {
        const createdBy = String(inc.created_by || '').toLowerCase();
        if (createdBy.includes('qr order') || createdBy.startsWith('qr')) continue;
        const ordId = inc.order_id ? String(inc.order_id).trim().toLowerCase() : '';
        if (ordId && qrOrderIds.has(ordId)) continue;
        validManualOrders.push(inc);
      }
    }

    const orderRows = [...(qrOrders || []), ...validManualOrders];

    if (orderRows.length === 0) {
      // If all orders were deleted, reset customer counts or delete orphaned records
      await pool.execute(
        `UPDATE crm_customers SET total_orders = 0, total_spent = 0.00 WHERE restaurant_id = ?`,
        [cleanId]
      );
      await pool.execute(
        `DELETE FROM crm_customers WHERE restaurant_id = ? AND id NOT IN (SELECT customer_id FROM crm_membership_cards WHERE restaurant_id = ?)`,
        [cleanId, cleanId]
      );
      return;
    }

    // 4. Group and normalize by phone in memory to merge +8801... and 01... into one customer
    const aggregatedMap = new Map<string, {
      normalizedPhone: string;
      name: string;
      total_orders: number;
      total_spent: number;
      first_order_date: any;
      last_order_date: any;
      allPhoneVariants: Set<string>;
    }>();

    for (const row of orderRows) {
      if (!row.phone) continue;
      const normPhone = normalizeCustomerPhone(row.phone);
      if (!normPhone) continue;

      let cleanName = row.clean_name ? String(row.clean_name).replace(/\s*\(Table\s*[^)]+\)/i, '').trim() : '';
      if (cleanName === 'Anonymous' || cleanName.toLowerCase().startsWith('walk-in')) {
        cleanName = '';
      }

      const amt = Number(row.amount || 0);

      if (!aggregatedMap.has(normPhone)) {
        aggregatedMap.set(normPhone, {
          normalizedPhone: normPhone,
          name: cleanName,
          total_orders: 1,
          total_spent: amt,
          first_order_date: row.order_date,
          last_order_date: row.order_date,
          allPhoneVariants: new Set([String(row.phone).trim(), normPhone]),
        });
      } else {
        const item = aggregatedMap.get(normPhone)!;
        item.total_orders += 1;
        item.total_spent += amt;
        item.allPhoneVariants.add(String(row.phone).trim());
        if (!item.name && cleanName) {
          item.name = cleanName;
        } else if (cleanName && cleanName.length > item.name.length && !cleanName.toLowerCase().startsWith('test')) {
          item.name = cleanName;
        }
        if (new Date(row.order_date).getTime() < new Date(item.first_order_date).getTime()) {
          item.first_order_date = row.order_date;
        }
        if (new Date(row.order_date).getTime() > new Date(item.last_order_date).getTime()) {
          item.last_order_date = row.order_date;
        }
      }
    }

    // 5. Upsert into crm_customers and merge duplicate entries if any exist
    for (const [normPhone, item] of aggregatedMap.entries()) {
      const finalName = item.name || 'Valued Customer';
      const totalSpent = Number(item.total_spent || 0);

      let calculatedTier = 'Regular';
      const isVipOn = settings.vip_enabled !== 0 && settings.vip_enabled !== false;
      const isPlatOn = settings.platinum_enabled !== 0 && settings.platinum_enabled !== false;
      const isGoldOn = settings.gold_enabled !== 0 && settings.gold_enabled !== false;
      const isSilverOn = settings.silver_enabled !== 0 && settings.silver_enabled !== false;

      if (isVipOn && totalSpent >= Number(settings.vip_min_spend || 25000)) {
        calculatedTier = 'VIP';
      } else if (isPlatOn && totalSpent >= Number(settings.platinum_min_spend || 15000)) {
        calculatedTier = 'Platinum';
      } else if (isGoldOn && totalSpent >= Number(settings.gold_min_spend || 7000)) {
        calculatedTier = 'Gold';
      } else if (isSilverOn && totalSpent >= Number(settings.silver_min_spend || 3000)) {
        calculatedTier = 'Silver';
      }

      const tierRank: Record<string, number> = {
        Regular: 0,
        Silver: 1,
        Gold: 2,
        Platinum: 3,
        VIP: 4,
      };

      const getTierDiscount = (t: string) => {
        if (t === 'VIP') return Number(settings.vip_discount || 20);
        if (t === 'Platinum') return Number(settings.platinum_discount || 15);
        if (t === 'Gold') return Number(settings.gold_discount || 10);
        if (t === 'Silver') return Number(settings.silver_discount || 5);
        return 0;
      };

      const computeExpiresAt = () => {
        const valMonths = Number(settings.card_validity_months !== undefined ? settings.card_validity_months : 12);
        if (valMonths <= 0) return null; // Lifetime validity
        const expDate = new Date();
        expDate.setMonth(expDate.getMonth() + valMonths);
        return expDate.toISOString().slice(0, 10);
      };

      const isAutoPromotionOn = Boolean(settings.auto_issue_cards);

      // Check existing customer records matching this normalized phone or any variant
      const variants = Array.from(item.allPhoneVariants);
      const placeholders = variants.map(() => '?').join(',');
      const [existingRows]: any = await pool.execute(
        `SELECT id, phone, name, tier FROM crm_customers WHERE restaurant_id = ? AND phone IN (${placeholders})`,
        [cleanId, ...variants]
      );

      let primaryId: number;

      if (Array.isArray(existingRows) && existingRows.length > 0) {
        // Choose primary record (preferably one already matching normPhone, or the oldest one)
        const primary = existingRows.find((r: any) => r.phone === normPhone) || existingRows[0];
        primaryId = primary.id;
        const existingTier = primary.tier || 'Regular';

        // If duplicate rows exist (e.g. one had +88018... and one had 018...):
        for (const other of existingRows) {
          if (other.id !== primaryId) {
            // Re-link cards to primary customer
            await pool.execute(
              `UPDATE crm_membership_cards SET customer_id = ? WHERE customer_id = ? AND restaurant_id = ?`,
              [primaryId, other.id, cleanId]
            );
            // Delete redundant customer row
            await pool.execute(
              `DELETE FROM crm_customers WHERE id = ? AND restaurant_id = ?`,
              [other.id, cleanId]
            );
          }
        }

        const bestName = primary.name && primary.name !== 'Valued Customer' && primary.name !== 'Anonymous' && !primary.name.toLowerCase().startsWith('test')
          ? primary.name
          : finalName;

        let finalTier = calculatedTier;
        if (!isAutoPromotionOn && existingTier !== 'Regular') {
          finalTier = existingTier;
        } else if ((tierRank[calculatedTier] || 0) < (tierRank[existingTier] || 0)) {
          finalTier = existingTier; // Preserve higher manually assigned tier
        }

        await pool.execute(
          `UPDATE crm_customers 
           SET phone = ?, name = ?, total_orders = ?, total_spent = ?, first_order_date = ?, last_order_date = ?, tier = ?
           WHERE id = ?`,
          [normPhone, bestName, item.total_orders, totalSpent, item.first_order_date, item.last_order_date, finalTier, primaryId]
        );
      } else {
        const [insertRes]: any = await pool.execute(
          `INSERT INTO crm_customers 
            (restaurant_id, name, phone, total_orders, total_spent, first_order_date, last_order_date, tier)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
            phone = VALUES(phone),
            total_orders = VALUES(total_orders),
            total_spent = VALUES(total_spent),
            name = VALUES(name),
            first_order_date = VALUES(first_order_date),
            last_order_date = VALUES(last_order_date),
            tier = VALUES(tier)`,
          [cleanId, finalName, normPhone, item.total_orders, totalSpent, item.first_order_date, item.last_order_date, calculatedTier]
        );
        primaryId = insertRes.insertId;
      }

      // AUTOMATIC TIER PROMOTION & CARD ISSUANCE
      if (isAutoPromotionOn && calculatedTier !== 'Regular' && primaryId) {
        const [activeCards]: any = await pool.execute(
          `SELECT id, card_number, tier, discount_percent FROM crm_membership_cards WHERE customer_id = ? AND restaurant_id = ? AND status = 'active' LIMIT 1`,
          [primaryId, cleanId]
        );

        const targetDiscount = getTierDiscount(calculatedTier);
        const expiresAt = computeExpiresAt();
        const todayStr = getDhakaDate().dateStr;

        if (!activeCards || activeCards.length === 0) {
          // Auto-issue a new digital card
          const prefix = calculatedTier.toUpperCase().slice(0, 4);
          const randCode = Math.floor(1000 + Math.random() * 9000);
          const cardNumber = `MS-${prefix}-${randCode}`;

          await pool.execute(
            `INSERT INTO crm_membership_cards 
              (restaurant_id, customer_id, card_number, tier, discount_percent, status, issued_at, expires_at)
             VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
            [cleanId, primaryId, cardNumber, calculatedTier, targetDiscount, todayStr, expiresAt]
          );
        } else {
          const currentCard = activeCards[0];
          if ((tierRank[calculatedTier] || 0) > (tierRank[currentCard.tier] || 0)) {
            // Auto-upgrade existing card to higher tier
            await pool.execute(
              `UPDATE crm_membership_cards 
               SET tier = ?, discount_percent = ?, expires_at = COALESCE(?, expires_at)
               WHERE id = ?`,
              [calculatedTier, targetDiscount, expiresAt, currentCard.id]
            );
          }
        }
      }
    }

    // 6. Prune or reset customers whose orders have all been deleted or cancelled
    const activeNormalizedPhones = Array.from(aggregatedMap.keys());
    const [allDbCusts]: any = await pool.execute(
      `SELECT c.id, c.phone, 
              (SELECT COUNT(*) FROM crm_membership_cards m WHERE m.customer_id = c.id AND m.status = 'active') as active_cards
       FROM crm_customers c
       WHERE c.restaurant_id = ? AND c.deleted_at IS NULL`,
      [cleanId]
    );

    if (Array.isArray(allDbCusts)) {
      for (const dbCust of allDbCusts) {
        const norm = normalizeCustomerPhone(dbCust.phone);
        if (!activeNormalizedPhones.includes(norm)) {
          if (Number(dbCust.active_cards || 0) > 0) {
            await pool.execute(
              `UPDATE crm_customers SET total_orders = 0, total_spent = 0.00 WHERE id = ? AND restaurant_id = ?`,
              [dbCust.id, cleanId]
            );
          } else {
            await pool.execute(
              `DELETE FROM crm_customers WHERE id = ? AND restaurant_id = ?`,
              [dbCust.id, cleanId]
            );
          }
        }
      }
    }
  } catch (err) {
    console.warn('Auto customer aggregation warning:', err);
  }
}

/**
 * Get customers directory with search, filter, pagination, and KPI metrics.
 */
export async function getCrmCustomersAction(
  restaurantId?: string | number,
  params?: {
    search?: string;
    tier?: string;
    sortBy?: 'spent' | 'orders' | 'recent' | 'name';
    page?: number;
    limit?: number;
  }
) {
  try {
    await ensureCrmSchema();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;

    // Run safe auto-sync from customer_orders
    await syncCustomersFromOrders(cleanId);

    const page = Math.max(1, Number(params?.page || 1));
    const limit = Math.max(1, Math.min(100, Number(params?.limit || 20)));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ['c.restaurant_id = ?', 'c.deleted_at IS NULL'];
    const queryParams: any[] = [cleanId];

    if (params?.search && params.search.trim()) {
      const q = `%${params.search.trim()}%`;
      whereClauses.push('(c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)');
      queryParams.push(q, q, q);
    }

    if (params?.tier && params.tier !== 'all') {
      whereClauses.push('c.tier = ?');
      queryParams.push(params.tier);
    }

    let orderBy = 'c.last_order_date DESC, c.id DESC';
    if (params?.sortBy === 'spent') orderBy = 'c.total_spent DESC, c.last_order_date DESC';
    else if (params?.sortBy === 'orders') orderBy = 'c.total_orders DESC, c.last_order_date DESC';
    else if (params?.sortBy === 'recent') orderBy = 'c.last_order_date DESC, c.id DESC';
    else if (params?.sortBy === 'name') orderBy = 'c.name ASC';

    // Total Count
    const countSql = `SELECT COUNT(*) as total FROM crm_customers c WHERE ${whereClauses.join(' AND ')}`;
    const [countRows]: any = await pool.execute(countSql, queryParams);
    const totalRecords = Number(countRows?.[0]?.total || 0);

    // Fetch Paginated Customers with active card info
    const dataSql = `
      SELECT 
        c.id,
        c.name,
        c.phone,
        c.email,
        c.address,
        c.total_orders,
        c.total_spent,
        DATE_FORMAT(c.first_order_date, '%Y-%m-%d') as first_order_date,
        DATE_FORMAT(c.last_order_date, '%Y-%m-%d') as last_order_date,
        c.tier,
        c.notes,
        card.card_number,
        card.discount_percent as card_discount,
        card.tier as card_tier,
        card.status as card_status,
        DATE_FORMAT(card.issued_at, '%Y-%m-%d') as card_issued_at,
        DATE_FORMAT(card.expires_at, '%Y-%m-%d') as card_expires_at,
        s.card_custom_note
      FROM crm_customers c
      LEFT JOIN crm_membership_cards card ON (card.customer_id = c.id AND card.status = 'active')
      LEFT JOIN crm_settings s ON c.restaurant_id = s.restaurant_id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows]: any = await pool.execute(dataSql, queryParams);

    // KPI Metrics across all customers
    const [kpiRows]: any = await pool.execute(
      `SELECT 
         COUNT(*) as total_customers,
         COALESCE(SUM(total_spent), 0) as total_revenue,
         COALESCE(SUM(total_orders), 0) as total_orders,
         COUNT(CASE WHEN last_order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as active_30d
       FROM crm_customers
       WHERE restaurant_id = ? AND deleted_at IS NULL`,
      [cleanId]
    );

    const [cardCountRows]: any = await pool.execute(
      `SELECT COUNT(*) as total_cards FROM crm_membership_cards WHERE restaurant_id = ? AND status = 'active'`,
      [cleanId]
    );

    const kpis = {
      totalCustomers: Number(kpiRows?.[0]?.total_customers || 0),
      totalRevenue: Number(kpiRows?.[0]?.total_revenue || 0),
      totalOrders: Number(kpiRows?.[0]?.total_orders || 0),
      activeCustomers: Number(kpiRows?.[0]?.active_30d || 0),
      totalMembers: Number(cardCountRows?.[0]?.total_cards || 0),
    };

    return {
      success: true,
      customers: rows || [],
      pagination: {
        total: totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit) || 1,
      },
      kpis,
    };
  } catch (error: any) {
    console.error('Failed to get CRM customers:', error);
    return { success: false, error: error?.message || 'Failed to load customers.' };
  }
}

/**
 * Get single customer details with complete order history and active card.
 */
export async function getCustomerDetailsAction(
  restaurantId: string | number | undefined,
  customerId: number
) {
  try {
    await ensureCrmSchema();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;
    const cleanCustId = Number(customerId);

    // 1. Customer Profile
    const [custRows]: any = await pool.execute(
      `SELECT 
         c.*,
         DATE_FORMAT(c.first_order_date, '%Y-%m-%d %H:%i') as formatted_first_order,
         DATE_FORMAT(c.last_order_date, '%Y-%m-%d %H:%i') as formatted_last_order,
         DATE_FORMAT(c.created_at, '%Y-%m-%d') as formatted_joined
       FROM crm_customers c
       WHERE c.id = ? AND c.restaurant_id = ? AND c.deleted_at IS NULL
       LIMIT 1`,
      [cleanCustId, cleanId]
    );

    if (!Array.isArray(custRows) || custRows.length === 0) {
      return { success: false, error: 'Customer not found.' };
    }
    const customer = custRows[0];

    // 2. Active Membership Card
    const [cardRows]: any = await pool.execute(
      `SELECT 
         card.id,
         card.card_number,
         card.tier,
         card.discount_percent,
         card.status,
         DATE_FORMAT(card.issued_at, '%Y-%m-%d') as issued_at,
         DATE_FORMAT(card.expires_at, '%Y-%m-%d') as expires_at,
         s.card_custom_note
       FROM crm_membership_cards card
       LEFT JOIN crm_settings s ON card.restaurant_id = s.restaurant_id
       WHERE card.customer_id = ? AND card.restaurant_id = ? AND card.status = 'active'
       ORDER BY card.id DESC LIMIT 1`,
      [cleanCustId, cleanId]
    );
    const activeCard = cardRows?.[0] || null;

    // 3. Customer Past Order History from BOTH customer_orders AND manual incomes
    const isNumericId = !isNaN(Number(cleanId)) && Number(cleanId) > 0;
    let businessName = String(cleanId);
    if (isNumericId) {
      const [clientRows]: any = await pool.execute(
        `SELECT business_name FROM clients WHERE id = ? LIMIT 1`,
        [Number(cleanId)]
      );
      if (clientRows?.[0]?.business_name) {
        businessName = clientRows[0].business_name;
      }
    }

    const qrClientClause = isNumericId ? 'client_id = ?' : 'business_name = ?';
    const qrClientParam = isNumericId ? Number(cleanId) : businessName;

    const phoneVariants = getPhoneVariants(customer.phone);
    const placeholders = phoneVariants.map(() => '?').join(',');

    // 3A. QR Orders from customer_orders (ONLY completed orders strictly for this client)
    const [orders]: any = await pool.execute(
      `SELECT 
         order_id,
         total_amount,
         status,
         table_number,
         special_note,
         items_json,
         DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as order_date
       FROM customer_orders
       WHERE ${qrClientClause}
         AND status = 'completed'
         AND TRIM(customer_phone) IN (${placeholders})
       ORDER BY created_at DESC
       LIMIT 50`,
      [qrClientParam, ...phoneVariants]
    );

    const detailQrOrderIds = new Set<string>();
    if (Array.isArray(orders)) {
      for (const ord of orders) {
        if (ord.order_id) detailQrOrderIds.add(String(ord.order_id).trim().toLowerCase());
      }
    }

    // 3B. Manual Orders / Incomes from incomes table (excluding mirrored QR orders)
    const [manualIncomes]: any = await pool.execute(
      `SELECT 
         i.id,
         i.order_id,
         i.amount as total_amount,
         i.customer_name,
         i.note as special_note,
         i.created_by,
         s.name as service_name,
         pm.name as payment_method_name,
         DATE_FORMAT(COALESCE(i.created_at, CAST(i.date AS DATETIME)), '%Y-%m-%d %H:%i') as order_date
       FROM incomes i
       LEFT JOIN services s ON i.service_id = s.id
       LEFT JOIN payment_methods pm ON i.payment_method_id = pm.id
       WHERE i.restaurant_id = ?
         AND i.deleted_at IS NULL
         AND TRIM(i.customer_phone) IN (${placeholders})
       ORDER BY i.date DESC, i.id DESC
       LIMIT 50`,
      [cleanId, ...phoneVariants]
    );

    const validManualIncomes = (manualIncomes || []).filter((inc: any) => {
      const createdBy = String(inc.created_by || '').toLowerCase();
      if (createdBy.includes('qr order') || createdBy.startsWith('qr')) return false;
      const ordId = inc.order_id ? String(inc.order_id).trim().toLowerCase() : '';
      if (ordId && detailQrOrderIds.has(ordId)) return false;
      return true;
    });

    const parsedOrders = [
      ...(orders || []).map((ord: any) => {
        let items: any[] = [];
        try {
          items = typeof ord.items_json === 'string' ? JSON.parse(ord.items_json) : ord.items_json || [];
        } catch { }
        return {
          order_id: ord.order_id || 'QR-ORDER',
          source: 'qr' as const,
          source_label: 'QR Order',
          total_amount: Number(ord.total_amount || 0),
          status: ord.status || 'completed',
          table_number: ord.table_number,
          special_note: ord.special_note,
          items,
          order_date: ord.order_date,
        };
      }),
      ...validManualIncomes.map((inc: any) => {
        let tableNum: string | null = null;
        const tableMatch = String(inc.customer_name || '').match(/\(Table\s+([^)]+)\)/i);
        if (tableMatch) {
          tableNum = tableMatch[1].trim();
        }
        const itemName = inc.service_name || 'Manual Sale';
        const items = [{ name: itemName, quantity: 1, price: Number(inc.total_amount || 0) }];
        return {
          order_id: inc.order_id || `INC-${inc.id}`,
          source: 'manual' as const,
          source_label: inc.created_by || 'Manual Order',
          total_amount: Number(inc.total_amount || 0),
          status: 'completed',
          table_number: tableNum,
          special_note: inc.special_note || (inc.payment_method_name ? `Paid via ${inc.payment_method_name}` : null),
          items,
          order_date: inc.order_date,
        };
      }),
    ].sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());

    const averageOrderValue = customer.total_orders > 0
      ? Number((Number(customer.total_spent) / Number(customer.total_orders)).toFixed(2))
      : 0;

    return {
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        total_orders: Number(customer.total_orders || 0),
        total_spent: Number(customer.total_spent || 0),
        average_order_value: averageOrderValue,
        first_order_date: customer.formatted_first_order,
        last_order_date: customer.formatted_last_order,
        joined_date: customer.formatted_joined,
        tier: customer.tier,
        notes: customer.notes,
      },
      activeCard,
      orders: parsedOrders,
    };
  } catch (error: any) {
    console.error('Failed to get customer details:', error);
    return { success: false, error: error?.message || 'Failed to load customer profile.' };
  }
}

/**
 * Manually add a new customer or update notes.
 */
export async function createCrmCustomerAction(
  restaurantId: string | number | undefined,
  input: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    notes?: string;
  }
) {
  try {
    await ensureCrmSchema();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;

    const name = input.name.trim();
    const phone = input.phone.trim();
    if (!name || !phone) {
      return { success: false, error: 'Customer Name and Phone Number are required.' };
    }

    await pool.execute(
      `INSERT INTO crm_customers (restaurant_id, name, phone, email, address, notes)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        email = COALESCE(VALUES(email), email),
        address = COALESCE(VALUES(address), address),
        notes = COALESCE(VALUES(notes), notes)`,
      [cleanId, name, phone, input.email?.trim() || null, input.address?.trim() || null, input.notes?.trim() || null]
    );

    return { success: true, message: 'Customer added successfully.' };
  } catch (error: any) {
    console.error('Failed to create CRM customer:', error);
    return { success: false, error: error?.message || 'Failed to create customer.' };
  }
}

/**
 * Fetch all membership cards.
 */
export async function getCrmMembershipCardsAction(
  restaurantId?: string | number,
  params?: {
    search?: string;
    tier?: string;
    status?: string;
  }
) {
  try {
    await ensureCrmSchema();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;

    const whereClauses: string[] = ['card.restaurant_id = ?'];
    const queryParams: any[] = [cleanId];

    if (params?.search && params.search.trim()) {
      const q = `%${params.search.trim()}%`;
      whereClauses.push('(c.name LIKE ? OR c.phone LIKE ? OR card.card_number LIKE ?)');
      queryParams.push(q, q, q);
    }

    if (params?.tier && params.tier !== 'all') {
      whereClauses.push('card.tier = ?');
      queryParams.push(params.tier);
    }

    if (params?.status && params.status !== 'all') {
      whereClauses.push('card.status = ?');
      queryParams.push(params.status);
    }

    const sql = `
      SELECT 
        card.id,
        card.card_number,
        card.tier,
        card.discount_percent,
        card.status,
        DATE_FORMAT(card.issued_at, '%Y-%m-%d') as issued_at,
        DATE_FORMAT(card.expires_at, '%Y-%m-%d') as expires_at,
        c.id as customer_id,
        c.name as customer_name,
        c.phone as customer_phone,
        c.total_spent,
        s.card_custom_note
      FROM crm_membership_cards card
      JOIN crm_customers c ON card.customer_id = c.id
      LEFT JOIN crm_settings s ON card.restaurant_id = s.restaurant_id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY card.id DESC
    `;

    const [rows]: any = await pool.execute(sql, queryParams);

    return { success: true, cards: rows || [] };
  } catch (error: any) {
    console.error('Failed to get membership cards:', error);
    return { success: false, error: error?.message || 'Failed to load membership cards.' };
  }
}

/**
 * Issue a new membership card to a customer.
 */
export async function issueMembershipCardAction(
  restaurantId: string | number | undefined,
  input: {
    customerId: number;
    tier: 'Silver' | 'Gold' | 'Platinum' | 'VIP';
    discountPercent: number;
    validityMonths?: number; // 0 = Lifetime, 6, 12, 24
  }
) {
  try {
    await ensureCrmSchema();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;
    const cleanCustId = Number(input.customerId);

    // Verify customer exists
    const [custRows]: any = await pool.execute(
      `SELECT name, phone FROM crm_customers WHERE id = ? AND restaurant_id = ? LIMIT 1`,
      [cleanCustId, cleanId]
    );
    if (!custRows || custRows.length === 0) {
      return { success: false, error: 'Customer not found.' };
    }

    // Deactivate any existing active cards for this customer
    await pool.execute(
      `UPDATE crm_membership_cards SET status = 'expired' WHERE customer_id = ? AND restaurant_id = ?`,
      [cleanCustId, cleanId]
    );

    // Generate unique card number: e.g. MS-GOLD-8492
    const prefix = input.tier.toUpperCase().slice(0, 4);
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const cardNumber = `MS-${prefix}-${randCode}`;

    const todayStr = getDhakaDate().dateStr; // 'YYYY-MM-DD'
    let expiresAt: string | null = null;
    let months = input.validityMonths !== undefined ? Number(input.validityMonths) : undefined;
    if (months === undefined) {
      const [setRows]: any = await pool.execute(
        `SELECT card_validity_months FROM crm_settings WHERE restaurant_id = ? LIMIT 1`,
        [cleanId]
      );
      months = setRows?.[0]?.card_validity_months !== undefined ? Number(setRows[0].card_validity_months) : 12;
    }

    if (months > 0) {
      const expDate = new Date();
      expDate.setMonth(expDate.getMonth() + months);
      expiresAt = expDate.toISOString().slice(0, 10);
    }

    await pool.execute(
      `INSERT INTO crm_membership_cards 
        (restaurant_id, customer_id, card_number, tier, discount_percent, status, issued_at, expires_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
      [cleanId, cleanCustId, cardNumber, input.tier, Number(input.discountPercent || 10), todayStr, expiresAt]
    );

    // Update customer tier badge in crm_customers
    await pool.execute(
      `UPDATE crm_customers SET tier = ? WHERE id = ? AND restaurant_id = ?`,
      [input.tier, cleanCustId, cleanId]
    );

    return {
      success: true,
      cardNumber,
      message: `${input.tier} Membership Card issued successfully!`,
    };
  } catch (error: any) {
    console.error('Failed to issue membership card:', error);
    return { success: false, error: error?.message || 'Failed to issue card.' };
  }
}

/**
 * Fetch or initialize CRM loyalty rules & settings.
 */
export async function getCrmSettingsAction(restaurantId?: string | number) {
  try {
    await ensureCrmSchema();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;

    const [rows]: any = await pool.execute(
      `SELECT * FROM crm_settings WHERE restaurant_id = ? LIMIT 1`,
      [cleanId]
    );

    if (rows && rows.length > 0) {
      const s = rows[0];
      return {
        success: true,
        settings: {
          ...s,
          silver_enabled: s.silver_enabled !== undefined ? Boolean(s.silver_enabled) : true,
          silver_min_spend: Number(s.silver_min_spend || 3000),
          silver_discount: Number(s.silver_discount || 5),
          gold_enabled: s.gold_enabled !== undefined ? Boolean(s.gold_enabled) : true,
          gold_min_spend: Number(s.gold_min_spend || 7000),
          gold_discount: Number(s.gold_discount || 10),
          platinum_enabled: s.platinum_enabled !== undefined ? Boolean(s.platinum_enabled) : true,
          platinum_min_spend: Number(s.platinum_min_spend || 15000),
          platinum_discount: Number(s.platinum_discount || 15),
          vip_enabled: s.vip_enabled !== undefined ? Boolean(s.vip_enabled) : true,
          vip_min_spend: Number(s.vip_min_spend || 25000),
          vip_discount: Number(s.vip_discount || 20),
          card_validity_months: Number(s.card_validity_months || 12),
          auto_issue_cards: Boolean(s.auto_issue_cards),
          card_custom_note: s.card_custom_note || '',
        },
      };
    }

    // Default Settings
    const defaultSettings = {
      restaurant_id: cleanId,
      silver_enabled: true,
      silver_min_spend: 3000,
      silver_discount: 5,
      gold_enabled: true,
      gold_min_spend: 7000,
      gold_discount: 10,
      platinum_enabled: true,
      platinum_min_spend: 15000,
      platinum_discount: 15,
      vip_enabled: true,
      vip_min_spend: 25000,
      vip_discount: 20,
      card_validity_months: 12,
      auto_issue_cards: false,
      card_custom_note: 'Present this card at billing to redeem your exclusive discount.',
    };

    await pool.execute(
      `INSERT INTO crm_settings 
        (restaurant_id, silver_enabled, silver_min_spend, silver_discount, gold_enabled, gold_min_spend, gold_discount, platinum_enabled, platinum_min_spend, platinum_discount, vip_enabled, vip_min_spend, vip_discount, card_validity_months, auto_issue_cards, card_custom_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE updated_at = NOW()`,
      [
        cleanId,
        1,
        defaultSettings.silver_min_spend,
        defaultSettings.silver_discount,
        1,
        defaultSettings.gold_min_spend,
        defaultSettings.gold_discount,
        1,
        defaultSettings.platinum_min_spend,
        defaultSettings.platinum_discount,
        1,
        defaultSettings.vip_min_spend,
        defaultSettings.vip_discount,
        defaultSettings.card_validity_months,
        0,
        defaultSettings.card_custom_note,
      ]
    );

    return { success: true, settings: defaultSettings };
  } catch (error: any) {
    console.error('Failed to get CRM settings:', error);
    return { success: false, error: error?.message || 'Failed to load CRM settings.' };
  }
}

/**
 * Update CRM loyalty settings.
 */
export async function updateCrmSettingsAction(
  restaurantId: string | number | undefined,
  settings: {
    silver_enabled?: boolean;
    silver_min_spend: number;
    silver_discount: number;
    gold_enabled?: boolean;
    gold_min_spend: number;
    gold_discount: number;
    platinum_enabled?: boolean;
    platinum_min_spend: number;
    platinum_discount: number;
    vip_enabled?: boolean;
    vip_min_spend?: number;
    vip_discount?: number;
    card_validity_months: number;
    auto_issue_cards: boolean;
    card_custom_note?: string;
  }
) {
  try {
    await ensureCrmSchema();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;

    await pool.execute(
      `INSERT INTO crm_settings 
        (restaurant_id, silver_enabled, silver_min_spend, silver_discount, gold_enabled, gold_min_spend, gold_discount, platinum_enabled, platinum_min_spend, platinum_discount, vip_enabled, vip_min_spend, vip_discount, card_validity_months, auto_issue_cards, card_custom_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        silver_enabled = VALUES(silver_enabled),
        silver_min_spend = VALUES(silver_min_spend),
        silver_discount = VALUES(silver_discount),
        gold_enabled = VALUES(gold_enabled),
        gold_min_spend = VALUES(gold_min_spend),
        gold_discount = VALUES(gold_discount),
        platinum_enabled = VALUES(platinum_enabled),
        platinum_min_spend = VALUES(platinum_min_spend),
        platinum_discount = VALUES(platinum_discount),
        vip_enabled = VALUES(vip_enabled),
        vip_min_spend = VALUES(vip_min_spend),
        vip_discount = VALUES(vip_discount),
        card_validity_months = VALUES(card_validity_months),
        auto_issue_cards = VALUES(auto_issue_cards),
        card_custom_note = VALUES(card_custom_note)`,
      [
        cleanId,
        settings.silver_enabled === false ? 0 : 1,
        Number(settings.silver_min_spend || 3000),
        Number(settings.silver_discount || 5),
        settings.gold_enabled === false ? 0 : 1,
        Number(settings.gold_min_spend || 7000),
        Number(settings.gold_discount || 10),
        settings.platinum_enabled === false ? 0 : 1,
        Number(settings.platinum_min_spend || 15000),
        Number(settings.platinum_discount || 15),
        settings.vip_enabled === false ? 0 : 1,
        Number(settings.vip_min_spend || 25000),
        Number(settings.vip_discount || 20),
        Number(settings.card_validity_months || 12),
        settings.auto_issue_cards ? 1 : 0,
        settings.card_custom_note?.trim() || null,
      ]
    );

    // Re-evaluate customer tiers based on updated settings
    await syncCustomersFromOrders(cleanId);

    return { success: true, message: 'CRM Loyalty settings saved successfully.' };
  } catch (error: any) {
    console.error('Failed to update CRM settings:', error);
    return { success: false, error: error?.message || 'Failed to save settings.' };
  }
}

export interface CheckMembershipInput {
  restaurantId?: string | number | null;
  draftId?: string | null;
  businessName?: string | null;
  phone: string;
}

export interface CustomerMembershipResult {
  customerId: number;
  customerName: string;
  customerPhone: string;
  cardNumber: string;
  tier: 'Silver' | 'Gold' | 'Platinum' | 'VIP';
  discountPercent: number;
  expiresAt?: string | null;
}

/**
 * Live lookup to check if a phone number belongs to an active membership holder for the restaurant.
 * Called automatically during QR menu checkout or POS manual order creation.
 */
export async function checkCustomerMembershipAction(input: CheckMembershipInput): Promise<{
  success: boolean;
  found: boolean;
  membership?: CustomerMembershipResult;
  error?: string;
}> {
  try {
    await ensureCrmSchema();

    const rawPhone = String(input.phone || '').trim();
    if (!rawPhone || rawPhone.length < 5) {
      return { success: true, found: false };
    }

    const phoneVariants = getPhoneVariants(rawPhone);
    if (!phoneVariants || phoneVariants.length === 0) {
      return { success: true, found: false };
    }

    // Resolve candidate restaurant identifiers
    const candidateRestIds = new Set<string>();

    if (input.restaurantId) {
      candidateRestIds.add(String(input.restaurantId).trim());
      const numId = Number(input.restaurantId);
      if (!isNaN(numId) && numId > 0) {
        try {
          const [cRows]: any = await pool.execute(
            'SELECT businessName FROM clients WHERE id = ? LIMIT 1',
            [numId]
          );
          if (cRows?.[0]?.businessName) {
            candidateRestIds.add(String(cRows[0].businessName).trim());
          }
        } catch {}
      }
    }

    if (input.draftId) {
      try {
        const [dRows]: any = await pool.execute(
          'SELECT client_id, business_name FROM user_drafts WHERE draft_id = ? LIMIT 1',
          [input.draftId.trim()]
        );
        if (dRows && dRows.length > 0) {
          if (dRows[0].client_id) {
            candidateRestIds.add(String(dRows[0].client_id).trim());
          }
          if (dRows[0].business_name) {
            candidateRestIds.add(String(dRows[0].business_name).trim());
          }
        }
      } catch {}
    }

    if (input.businessName) {
      candidateRestIds.add(String(input.businessName).trim());
    }

    // Fallback: Check if caller is authenticated staff/manager in dashboard
    if (candidateRestIds.size === 0) {
      try {
        const auth = await resolveAuthenticatedRestaurantId();
        if (auth.success && auth.restaurantId) {
          candidateRestIds.add(String(auth.restaurantId).trim());
        }
      } catch {}
    }

    const restIdsArray = Array.from(candidateRestIds).filter(Boolean);
    if (restIdsArray.length === 0) {
      return { success: true, found: false };
    }

    const restPlaceholders = restIdsArray.map(() => '?').join(',');
    const phonePlaceholders = phoneVariants.map(() => '?').join(',');

    // 1. Primary check: Active card in crm_membership_cards
    const [cardRows]: any = await pool.execute(
      `SELECT 
         c.id AS customer_id,
         c.name AS customer_name,
         c.phone AS customer_phone,
         card.card_number,
         card.tier AS card_tier,
         card.discount_percent,
         card.expires_at
       FROM crm_customers c
       JOIN crm_membership_cards card ON card.customer_id = c.id
       WHERE c.restaurant_id IN (${restPlaceholders})
         AND c.deleted_at IS NULL
         AND card.status = 'active'
         AND (card.expires_at IS NULL OR card.expires_at >= CURDATE())
         AND c.phone IN (${phonePlaceholders})
       ORDER BY card.discount_percent DESC, card.id DESC
       LIMIT 1`,
      [...restIdsArray, ...phoneVariants]
    );

    if (cardRows && cardRows.length > 0) {
      const row = cardRows[0];
      return {
        success: true,
        found: true,
        membership: {
          customerId: Number(row.customer_id),
          customerName: String(row.customer_name || 'Loyalty Member'),
          customerPhone: String(row.customer_phone),
          cardNumber: String(row.card_number),
          tier: row.card_tier,
          discountPercent: Number(row.discount_percent || 0),
          expiresAt: row.expires_at ? String(row.expires_at).slice(0, 10) : null,
        },
      };
    }

    // 2. Secondary check: Customer has a recognized loyalty tier in crm_customers
    const [custRows]: any = await pool.execute(
      `SELECT c.id, c.name, c.phone, c.tier, c.restaurant_id
       FROM crm_customers c
       WHERE c.restaurant_id IN (${restPlaceholders})
         AND c.deleted_at IS NULL
         AND c.phone IN (${phonePlaceholders})
         AND c.tier IN ('Silver', 'Gold', 'Platinum', 'VIP')
       LIMIT 1`,
      [...restIdsArray, ...phoneVariants]
    );

    if (custRows && custRows.length > 0) {
      const cust = custRows[0];
      const settingsRes = await getCrmSettingsAction(cust.restaurant_id);
      const settings = settingsRes.settings;
      let discountRate = 0;
      if (cust.tier === 'VIP' && settings.vip_enabled !== false) discountRate = Number(settings.vip_discount || 20);
      else if (cust.tier === 'Platinum' && settings.platinum_enabled !== false) discountRate = Number(settings.platinum_discount || 15);
      else if (cust.tier === 'Gold' && settings.gold_enabled !== false) discountRate = Number(settings.gold_discount || 10);
      else if (cust.tier === 'Silver' && settings.silver_enabled !== false) discountRate = Number(settings.silver_discount || 5);

      if (discountRate > 0) {
        return {
          success: true,
          found: true,
          membership: {
            customerId: Number(cust.id),
            customerName: String(cust.name || 'Loyalty Member'),
            customerPhone: String(cust.phone),
            cardNumber: `MS-${cust.tier.toUpperCase()}-${cust.id}`,
            tier: cust.tier,
            discountPercent: discountRate,
            expiresAt: null,
          },
        };
      }
    }

    return { success: true, found: false };
  } catch (error: any) {
    console.error('Error in checkCustomerMembershipAction:', error);
    return { success: false, found: false, error: error?.message || 'Failed to check membership.' };
  }
}
