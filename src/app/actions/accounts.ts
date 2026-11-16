'use server';

import { cookies } from 'next/headers';
import pool from '@/lib/mysql';
import { tenantFilter, softDeleteFilter, getPagination, buildPaginationMeta, getDhakaDate, isFutureDate, isValidBdPhone, formatBdPhone } from '@/lib/accounts/helpers';
import { getAdminSessionAction } from './admin-auth';

let accountsTablesChecked = false;

/**
 * Migration runner: ensures accounts tables and seeds exist in MySQL
 */
export async function ensureAccountsTables() {
  if (accountsTablesChecked) return;

  try {
    // 1. Accounts Settings Table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS accounts_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        restaurant_id VARCHAR(100) NOT NULL UNIQUE,
        currency VARCHAR(20) NOT NULL DEFAULT 'tk',
        currency_symbol VARCHAR(10) NOT NULL DEFAULT '৳',
        financial_year_start VARCHAR(20) NOT NULL DEFAULT '01-01',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_accounts_settings_restaurant (restaurant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Expense Categories Table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS expense_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        restaurant_id VARCHAR(100) NULL,
        name VARCHAR(150) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'expense',
        business_type VARCHAR(50) NOT NULL DEFAULT 'restaurant',
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_expense_categories_restaurant (restaurant_id),
        INDEX idx_expense_categories_business_type (business_type),
        INDEX idx_expense_categories_deleted (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Safe migration: check information_schema for business_type column on existing tables
    try {
      const [colRows]: any = await pool.execute(`
        SELECT COLUMN_NAME 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'expense_categories' 
          AND COLUMN_NAME = 'business_type'
        LIMIT 1
      `);
      if (!colRows || colRows.length === 0) {
        await pool.execute(`
          ALTER TABLE expense_categories 
          ADD COLUMN business_type VARCHAR(50) NOT NULL DEFAULT 'restaurant' AFTER type
        `);
      }
    } catch (schemaErr) {
      console.warn('Could not verify/add business_type column to expense_categories:', schemaErr);
    }

    // 3. Payment Methods Table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        restaurant_id VARCHAR(100) NULL,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'standard',
        is_default BOOLEAN NOT NULL DEFAULT TRUE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_payment_methods_restaurant (restaurant_id),
        INDEX idx_payment_methods_deleted (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Expenses Table (Step 2)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        restaurant_id VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        category_id INT NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        payment_method_id INT NOT NULL,
        vendor_id INT NULL,
        staff_id INT NULL,
        description TEXT NULL,
        attachment VARCHAR(500) NULL,
        created_by VARCHAR(100) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        INDEX idx_expenses_restaurant (restaurant_id),
        INDEX idx_expenses_date (date),
        INDEX idx_expenses_category (category_id),
        INDEX idx_expenses_payment_method (payment_method_id),
        INDEX idx_expenses_deleted (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Vendors Table (Step 3)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS vendors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        restaurant_id VARCHAR(100) NOT NULL,
        name VARCHAR(150) NOT NULL,
        phone VARCHAR(50) NULL,
        address TEXT NULL,
        category VARCHAR(100) NULL DEFAULT 'Grocery',
        opening_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        note TEXT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        INDEX idx_vendors_restaurant (restaurant_id),
        INDEX idx_vendors_active (is_active),
        INDEX idx_vendors_deleted (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Vendor Bills Table (Step 3)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS vendor_bills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        restaurant_id VARCHAR(100) NOT NULL,
        vendor_id INT NOT NULL,
        bill_date DATE NOT NULL,
        due_date DATE NULL,
        bill_no VARCHAR(100) NULL,
        total_amount DECIMAL(12, 2) NOT NULL,
        note TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        INDEX idx_vendor_bills_restaurant (restaurant_id),
        INDEX idx_vendor_bills_vendor (vendor_id),
        INDEX idx_vendor_bills_date (bill_date),
        INDEX idx_vendor_bills_due (due_date),
        INDEX idx_vendor_bills_deleted (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Vendor Payments Table (Step 3)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS vendor_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        restaurant_id VARCHAR(100) NOT NULL,
        vendor_id INT NOT NULL,
        bill_id INT NULL,
        date DATE NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        payment_method_id INT NOT NULL,
        expense_id INT NULL,
        note TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        INDEX idx_vendor_payments_restaurant (restaurant_id),
        INDEX idx_vendor_payments_vendor (vendor_id),
        INDEX idx_vendor_payments_bill (bill_id),
        INDEX idx_vendor_payments_date (date),
        INDEX idx_vendor_payments_deleted (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. Staff Table (Step 4)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS staff (
        id INT AUTO_INCREMENT PRIMARY KEY,
        restaurant_id VARCHAR(100) NOT NULL,
        name VARCHAR(150) NOT NULL,
        phone VARCHAR(50) NULL,
        role VARCHAR(100) NULL DEFAULT 'Staff',
        joining_date DATE NULL,
        salary_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
        base_salary DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        INDEX idx_staff_restaurant (restaurant_id),
        INDEX idx_staff_active (is_active),
        INDEX idx_staff_deleted (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 9. Staff Attendance Table (Step 4)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS staff_attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        restaurant_id VARCHAR(100) NOT NULL,
        staff_id INT NOT NULL,
        date DATE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'present',
        note VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_staff_attendance (staff_id, date),
        INDEX idx_staff_attendance_restaurant (restaurant_id),
        INDEX idx_staff_attendance_date (date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 10. Staff Salary Records Table (Step 4)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS staff_salary_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        restaurant_id VARCHAR(100) NOT NULL,
        staff_id INT NOT NULL,
        month VARCHAR(10) NOT NULL,
        base_salary DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        bonus DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        overtime DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        deduction DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        advance_adjusted DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        net_payable DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
        paid_date DATE NULL,
        payment_method_id INT NULL,
        expense_id INT NULL,
        note TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        INDEX idx_salary_records_restaurant (restaurant_id),
        INDEX idx_salary_records_staff (staff_id),
        INDEX idx_salary_records_month (month),
        INDEX idx_salary_records_status (status),
        INDEX idx_salary_records_deleted (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 11. Staff Advances Table (Step 4)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS staff_advances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        restaurant_id VARCHAR(100) NOT NULL,
        staff_id INT NOT NULL,
        date DATE NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        adjusted_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        payment_method_id INT NULL,
        expense_id INT NULL,
        note TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        INDEX idx_staff_advances_restaurant (restaurant_id),
        INDEX idx_staff_advances_staff (staff_id),
        INDEX idx_staff_advances_date (date),
        INDEX idx_staff_advances_deleted (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 12. Services Table (Parlour Commission Module)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        restaurant_id VARCHAR(100) NOT NULL,
        name VARCHAR(150) NOT NULL,
        price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        default_commission_type VARCHAR(20) NOT NULL DEFAULT 'percent',
        default_commission_value DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        INDEX idx_services_restaurant (restaurant_id),
        INDEX idx_services_deleted (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 13. Staff Commissions Table (Parlour Commission Module)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS staff_commissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        restaurant_id VARCHAR(100) NOT NULL,
        staff_id INT NOT NULL,
        service_id INT NULL,
        date DATE NOT NULL,
        service_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        commission_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        tip_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        customer_name VARCHAR(150) NULL,
        note TEXT NULL,
        salary_record_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        INDEX idx_staff_commissions_restaurant (restaurant_id),
        INDEX idx_staff_commissions_staff (staff_id),
        INDEX idx_staff_commissions_date (date),
        INDEX idx_staff_commissions_deleted (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 14. Incomes Table (Restaurant & Parlour Manual & Auto Income)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS incomes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        restaurant_id VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        service_id INT NULL,
        amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        payment_method_id INT NULL,
        customer_name VARCHAR(150) NULL,
        customer_phone VARCHAR(50) NULL,
        customer_due_id INT NULL,
        customer_payment_id INT NULL,
        order_id VARCHAR(50) NULL,
        note TEXT NULL,
        created_by VARCHAR(100) DEFAULT 'Manual',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        INDEX idx_incomes_restaurant (restaurant_id),
        INDEX idx_incomes_date (date),
        INDEX idx_incomes_service (service_id),
        INDEX idx_incomes_due (customer_due_id),
        INDEX idx_incomes_order (order_id),
        INDEX idx_incomes_deleted (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Safe migration: check information_schema for order_id column on incomes table
    try {
      const [orderColRows]: any = await pool.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'incomes' 
          AND COLUMN_NAME = 'order_id'
        LIMIT 1;
      `);
      if (!orderColRows || orderColRows.length === 0) {
        await pool.execute(`
          ALTER TABLE incomes 
          ADD COLUMN order_id VARCHAR(50) NULL AFTER customer_payment_id,
          ADD INDEX idx_incomes_order (order_id);
        `);
      }
    } catch {}

    // 15. Customers Due Table (Parlour Customer Accounts Receivable)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS customers_due (
        id INT AUTO_INCREMENT PRIMARY KEY,
        restaurant_id VARCHAR(100) NOT NULL,
        customer_name VARCHAR(150) NOT NULL,
        phone VARCHAR(50) NULL,
        service_id INT NULL,
        total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        advance_paid DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        due_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        due_date DATE NULL,
        status ENUM('unpaid', 'partial', 'paid') DEFAULT 'unpaid',
        advance_income_id INT NULL,
        note TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        INDEX idx_customers_due_restaurant (restaurant_id),
        INDEX idx_customers_due_status (status),
        INDEX idx_customers_due_date (due_date),
        INDEX idx_customers_due_deleted (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 16. Customer Payments Table (Parlour Customer Dues Settlements)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS customer_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        restaurant_id VARCHAR(100) NOT NULL,
        customer_due_id INT NOT NULL,
        date DATE NOT NULL,
        amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        payment_method_id INT NULL,
        income_id INT NULL,
        note TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        INDEX idx_customer_payments_restaurant (restaurant_id),
        INDEX idx_customer_payments_due (customer_due_id),
        INDEX idx_customer_payments_date (date),
        INDEX idx_customer_payments_deleted (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Safe migration column checks for staff and staff_salary_records
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
        console.warn(`Migration check failed for ${table}.${column}:`, err);
      }
    };

    await checkAndAddColumn('staff', 'commission_type', "VARCHAR(20) NULL DEFAULT 'percent'");
    await checkAndAddColumn('staff', 'commission_value', "DECIMAL(12, 2) NULL DEFAULT 0.00");
    await checkAndAddColumn('staff_salary_records', 'commission_amount', "DECIMAL(12, 2) NOT NULL DEFAULT 0.00");
    await checkAndAddColumn('staff_salary_records', 'tip_amount', "DECIMAL(12, 2) NOT NULL DEFAULT 0.00");
    await checkAndAddColumn('incomes', 'customer_due_id', "INT NULL");
    await checkAndAddColumn('incomes', 'customer_payment_id', "INT NULL");
    await checkAndAddColumn('incomes', 'customer_phone', "VARCHAR(50) NULL");
    await checkAndAddColumn('incomes', 'created_by', "VARCHAR(100) DEFAULT 'Manual'");
    await checkAndAddColumn('customers_due', 'advance_income_id', "INT NULL");
    await checkAndAddColumn('customer_payments', 'income_id', "INT NULL");

    // Safe backfill: sync customer_phone for incomes linked to customer_orders
    try {
      await pool.execute(`
        UPDATE incomes inc
        JOIN customer_orders co ON (inc.order_id COLLATE utf8mb4_unicode_ci = co.order_id COLLATE utf8mb4_unicode_ci)
        SET inc.customer_phone = co.customer_phone
        WHERE (inc.customer_phone IS NULL OR inc.customer_phone = '') AND co.customer_phone IS NOT NULL AND co.customer_phone != ''
      `);
    } catch {}

    // Seed default expense categories for restaurants if none exist (idempotent)
    const restaurantCategories = [
      { name: 'Rent', type: 'fixed' },
      { name: 'Utilities', type: 'variable' },
      { name: 'Raw Material', type: 'cogs' },
      { name: 'Maintenance', type: 'variable' },
      { name: 'Marketing', type: 'operating' },
      { name: 'Transport', type: 'operating' },
      { name: 'Staff Salary', type: 'operating' },
      { name: 'Staff Advance', type: 'operating' },
      { name: 'Others', type: 'misc' },
    ];

    for (const cat of restaurantCategories) {
      await pool.execute(
        `INSERT INTO expense_categories (restaurant_id, name, type, business_type, is_default)
         SELECT NULL, ?, ?, 'restaurant', TRUE
         WHERE NOT EXISTS (
           SELECT 1 FROM expense_categories 
           WHERE name = ? AND restaurant_id IS NULL AND deleted_at IS NULL AND (business_type = 'restaurant' OR business_type IS NULL)
         )`,
        [cat.name, cat.type, cat.name]
      );
    }

    // Seed default expense categories for parlours (idempotent)
    const parlourCategories = [
      { name: 'Product Purchase', type: 'cogs' },
      { name: 'Salon Supplies', type: 'cogs' },
      { name: 'Equipment', type: 'fixed' },
      { name: 'Rent', type: 'fixed' },
      { name: 'Utilities', type: 'variable' },
      { name: 'Marketing', type: 'operating' },
      { name: 'Maintenance', type: 'variable' },
      { name: 'Laundry', type: 'operating' },
      { name: 'Staff Salary', type: 'operating' },
      { name: 'Others', type: 'misc' },
    ];

    for (const cat of parlourCategories) {
      await pool.execute(
        `INSERT INTO expense_categories (restaurant_id, name, type, business_type, is_default)
         SELECT NULL, ?, ?, 'parlour', TRUE
         WHERE NOT EXISTS (
           SELECT 1 FROM expense_categories 
           WHERE name = ? AND restaurant_id IS NULL AND deleted_at IS NULL AND business_type = 'parlour'
         )`,
        [cat.name, cat.type, cat.name]
      );
    }

    // Seed default payment methods if none exist
    const defaultPaymentMethods = [
      { name: 'Cash', type: 'cash' },
      { name: 'bKash', type: 'mfs' },
      { name: 'Nagad', type: 'mfs' },
      { name: 'Bank', type: 'bank' },
      { name: 'Card', type: 'card' },
    ];

    for (const pm of defaultPaymentMethods) {
      await pool.execute(
        `INSERT INTO payment_methods (restaurant_id, name, type, is_default, is_active)
         SELECT NULL, ?, ?, TRUE, TRUE
         WHERE NOT EXISTS (
           SELECT 1 FROM payment_methods 
           WHERE name = ? AND restaurant_id IS NULL AND deleted_at IS NULL
         )`,
        [pm.name, pm.type, pm.name]
      );
    }

    accountsTablesChecked = true;
  } catch (error) {
    console.error('Failed to initialize accounts tables:', error);
  }
}

/**
 * Resolves the authenticated restaurant/client ID from the server session/cookie.
 * Enforces strict anti-IDOR validation: if caller provides a restaurantId different from session, it is rejected.
 */
export async function resolveAuthenticatedRestaurantId(
  requestedRestaurantId?: string | number
): Promise<{ success: boolean; restaurantId?: string; error?: string }> {
  try {
    let sessionClientId: string | null = null;
    let isAdmin = false;

    try {
      const cookieStore = await cookies();
      sessionClientId = cookieStore.get('client_session')?.value || null;
      const adminToken = cookieStore.get('admin_session')?.value;
      if (adminToken) {
        const adminSession = await getAdminSessionAction();
        if (adminSession) {
          isAdmin = true;
        }
      }
    } catch {
      // Cookies not available (e.g. non-HTTP script context)
    }

    const cleanRequested = requestedRestaurantId !== undefined && requestedRestaurantId !== null
      ? String(requestedRestaurantId).trim()
      : '';

    // Admins can act on any requested restaurant ID
    if (isAdmin) {
      if (!cleanRequested) {
        return { success: false, error: 'Restaurant ID is required for admin session.' };
      }
      return { success: true, restaurantId: cleanRequested };
    }

    // If client session cookie exists:
    if (sessionClientId) {
      if (cleanRequested && cleanRequested !== sessionClientId) {
        return {
          success: false,
          error: 'Unauthorized: Session client ID does not match the requested restaurant ID.',
        };
      }
      return { success: true, restaurantId: sessionClientId };
    }

    // If no session cookie exists: verify client by ID or business_name
    if (cleanRequested) {
      const [rows]: any = await pool.execute(
        `SELECT id, business_name FROM clients WHERE id = ? OR business_name = ? LIMIT 1`,
        [cleanRequested, cleanRequested]
      );
      if (!rows || rows.length === 0) {
        return { success: false, error: `Client account not found for ID: ${cleanRequested}` };
      }
      return { success: true, restaurantId: String(rows[0].id) };
    }

    return { success: false, error: 'Authentication required. Active client session not found.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Authentication error.' };
  }
}

/**
 * Sets the client session cookie.
 */
export async function setClientSessionAction(clientId: number | string): Promise<{ success: boolean }> {
  try {
    const cookieStore = await cookies();
    cookieStore.set('client_session', String(clientId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
    return { success: true };
  } catch (e: any) {
    return { success: false };
  }
}

/**
 * Clears the client session cookie on logout.
 */
export async function clearClientSessionAction(): Promise<{ success: boolean }> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('client_session');
    return { success: true };
  } catch (e: any) {
    return { success: false };
  }
}

/**
 * Backend PRO plan check.
 * Verifies whether the client has an active Pro subscription in the database strictly by ID.
 */
export async function verifyProUser(restaurantId: string | number): Promise<{
  isPro: boolean;
  businessName?: string;
  clientId?: string;
  error?: string;
}> {
  try {
    const cleanId = String(restaurantId || '').trim();
    if (!cleanId) {
      return { isPro: false, error: 'Restaurant ID is required.' };
    }

    // Check by clients.id or clients.business_name
    const [rows]: any = await pool.execute(
      `SELECT id, business_name, is_subscriber, subscription_package 
       FROM clients 
       WHERE id = ? OR business_name = ? 
       LIMIT 1`,
      [cleanId, cleanId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return { isPro: false, error: `Client account not found for ID: ${cleanId}` };
    }

    const client = rows[0];
    const pkg = String(client.subscription_package || '').toLowerCase();
    const isPro = Boolean(
      client.is_subscriber == 1 ||
      pkg.includes('pro') ||
      pkg.includes('agency') ||
      pkg.includes('enterprise') ||
      pkg.includes('lifetime') ||
      pkg.includes('premium')
    );

    return {
      isPro,
      businessName: client.business_name,
      clientId: String(client.id),
    };
  } catch (error: any) {
    console.error('Error verifying Pro status:', error);
    return { isPro: false, error: error?.message || 'Verification failed.' };
  }
}

/**
 * Resolves the business type ('restaurant' | 'parlour') directly from MySQL clients table
 * using clients.id or business_name. Never defaults to 'restaurant' on missing clients; throws an error.
 */
export async function getClientBusinessType(restaurantId: string | number): Promise<'restaurant' | 'parlour'> {
  const cleanId = String(restaurantId || '').trim();
  if (!cleanId) {
    throw new Error('Restaurant ID is required.');
  }

  const [rows]: any = await pool.execute(
    `SELECT business_type FROM clients WHERE id = ? OR business_name = ? LIMIT 1`,
    [cleanId, cleanId]
  );

  if (!rows || rows.length === 0) {
    throw new Error(`Client account not found for ID: ${cleanId}`);
  }

  const rawType = rows[0]?.business_type;
  if (!rawType) {
    throw new Error(`Business type not configured for client ID: ${cleanId}`);
  }

  const type = String(rawType).toLowerCase().trim();
  if (type !== 'parlour' && type !== 'restaurant') {
    throw new Error(`Invalid business type '${type}' for client ID: ${cleanId}`);
  }

  return type as 'restaurant' | 'parlour';
}

/**
 * Get or initialize accounts settings for a restaurant.
 * Protected by Pro plan backend verification.
 */
export async function getAccountsSettingsAction(restaurantId: string | number) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();

    // Backend Pro verification
    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return {
        success: false,
        error: 'Accounts module is available exclusively for Pro subscribers.',
        isPro: false,
      };
    }

    const businessType = await getClientBusinessType(cleanId);

    // Fetch existing settings
    const [rows]: any = await pool.execute(
      `SELECT * FROM accounts_settings WHERE restaurant_id = ? LIMIT 1`,
      [cleanId]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      return {
        success: true,
        data: rows[0],
        businessType,
        isPro: true,
      };
    }

    // Auto-create default settings if none exist yet for this restaurant
    await pool.execute(
      `INSERT INTO accounts_settings (restaurant_id, currency, currency_symbol, financial_year_start)
       VALUES (?, 'tk', '৳', '01-01')
       ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
      [cleanId]
    );

    const [newRows]: any = await pool.execute(
      `SELECT * FROM accounts_settings WHERE restaurant_id = ? LIMIT 1`,
      [cleanId]
    );

    return {
      success: true,
      data: newRows?.[0] || { restaurant_id: cleanId, currency: 'tk', currency_symbol: '৳', financial_year_start: '01-01' },
      businessType,
      isPro: true,
    };
  } catch (error: any) {
    console.error('Failed to get accounts settings:', error);
    return { success: false, error: error?.message || 'Database error occurred.' };
  }
}

/**
 * Fetch expense categories for a specific business (including global defaults).
 * Protected by Pro plan backend verification.
 */
export async function getExpenseCategoriesAction(restaurantId: string | number) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return {
        success: false,
        error: 'Pro subscription required.',
        isPro: false,
      };
    }

    // Server-side authoritative business type resolution
    const businessType = await getClientBusinessType(cleanId);
    const softDel = softDeleteFilter();

    const [rows]: any = await pool.execute(
      `SELECT id, restaurant_id, name, type, business_type, is_default, created_at 
       FROM expense_categories 
       WHERE (
         restaurant_id = ? 
         OR (
           is_default = 1 
           AND restaurant_id IS NULL 
           AND (business_type = ? OR (business_type IS NULL AND ? = 'restaurant'))
         )
       ) 
       AND ${softDel}
       ORDER BY is_default DESC, name ASC`,
      [cleanId, businessType, businessType]
    );

    return {
      success: true,
      data: Array.isArray(rows) ? rows : [],
      businessType,
      isPro: true,
    };
  } catch (error: any) {
    console.error('Failed to fetch expense categories:', error);
    return { success: false, error: error?.message || 'Database error occurred.' };
  }
}

/**
 * Fetch payment methods for a specific restaurant (including defaults).
 * Protected by Pro plan backend verification.
 */
export async function getPaymentMethodsAction(restaurantId: string | number) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return {
        success: false,
        error: proCheck.error || 'Pro subscription required.',
        isPro: false,
      };
    }

    const resolvedId = String(proCheck.clientId || cleanId);
    const { clause, params } = tenantFilter(resolvedId, '', true);
    const softDel = softDeleteFilter();

    const [rows]: any = await pool.execute(
      `SELECT id, restaurant_id, name, type, is_default, is_active, created_at 
       FROM payment_methods 
       WHERE ${clause} AND ${softDel} AND is_active = TRUE
       ORDER BY id ASC`,
      params
    );

    const paymentMethodsList = Array.isArray(rows) && rows.length > 0
      ? rows
      : [
          { id: 1, name: 'Cash', type: 'cash', is_default: true, is_active: true },
          { id: 2, name: 'bKash', type: 'mfs', is_default: true, is_active: true },
          { id: 3, name: 'Nagad', type: 'mfs', is_default: true, is_active: true },
          { id: 4, name: 'Bank', type: 'bank', is_default: true, is_active: true },
          { id: 5, name: 'Card', type: 'card', is_default: true, is_active: true },
        ];

    return {
      success: true,
      data: paymentMethodsList,
      isPro: true,
    };
  } catch (error: any) {
    console.error('Failed to fetch payment methods:', error);
    return { success: false, error: error?.message || 'Database error occurred.' };
  }
}

/* ========================================================================== */
/*                           STEP 2: EXPENSES ACTIONS                         */
/* ========================================================================== */

export interface GetExpensesParams {
  restaurantId: string | number;
  search?: string;
  categoryId?: number | string;
  paymentMethodId?: number | string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateExpenseInput {
  date: string;
  category_id: number | string;
  amount: number | string;
  payment_method_id: number | string;
  vendor_id?: number | string | null;
  staff_id?: number | string | null;
  description?: string;
  attachment?: string;
  created_by?: string;
}

export interface UpdateExpenseInput {
  date?: string;
  category_id?: number | string;
  amount?: number | string;
  payment_method_id?: number | string;
  vendor_id?: number | string | null;
  staff_id?: number | string | null;
  description?: string;
  attachment?: string;
}

/**
 * Fetch list of expenses with filters, pagination, and top summary cards.
 */
export async function getExpensesAction(params: GetExpensesParams) {
  try {
    await ensureAccountsTables();
    const authCheck = await resolveAuthenticatedRestaurantId(params.restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return {
        success: false,
        error: authCheck.error || 'Unauthorized.',
        isPro: false,
      };
    }
    const cleanId = authCheck.restaurantId;

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return {
        success: false,
        error: 'Pro subscription required.',
        isPro: false,
      };
    }

    // Base conditions
    const conditions: string[] = ['e.restaurant_id = ?', 'e.deleted_at IS NULL'];
    const queryParams: any[] = [cleanId];

    if (params.categoryId && String(params.categoryId) !== 'all') {
      conditions.push('e.category_id = ?');
      queryParams.push(Number(params.categoryId));
    }

    if (params.paymentMethodId && String(params.paymentMethodId) !== 'all') {
      conditions.push('e.payment_method_id = ?');
      queryParams.push(Number(params.paymentMethodId));
    }

    if (params.fromDate) {
      conditions.push('e.date >= ?');
      queryParams.push(params.fromDate);
    }

    if (params.toDate) {
      conditions.push('e.date <= ?');
      queryParams.push(params.toDate);
    }

    if (params.search && params.search.trim()) {
      conditions.push('(e.description LIKE ? OR c.name LIKE ? OR pm.name LIKE ?)');
      const term = `%${params.search.trim()}%`;
      queryParams.push(term, term, term);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Total count for pagination
    const countSql = `
      SELECT COUNT(*) as total 
      FROM expenses e
      LEFT JOIN expense_categories c ON e.category_id = c.id
      LEFT JOIN payment_methods pm ON e.payment_method_id = pm.id
      ${whereClause}
    `;
    const [countRows]: any = await pool.execute(countSql, queryParams);
    const total = Number(countRows?.[0]?.total || 0);

    const pagination = getPagination(params.page || 1, params.limit || 10);

    // List query
    const listSql = `
      SELECT 
        e.id,
        e.restaurant_id,
        DATE_FORMAT(e.date, '%Y-%m-%d') as date,
        e.category_id,
        c.name as category_name,
        c.type as category_type,
        e.amount,
        e.payment_method_id,
        pm.name as payment_method_name,
        e.vendor_id,
        e.staff_id,
        e.description,
        e.attachment,
        e.created_by,
        e.created_at,
        e.updated_at
      FROM expenses e
      LEFT JOIN expense_categories c ON e.category_id = c.id
      LEFT JOIN payment_methods pm ON e.payment_method_id = pm.id
      ${whereClause}
      ORDER BY e.date DESC, e.id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows]: any = await pool.execute(listSql, [...queryParams, pagination.limit, pagination.offset]);

    const dhakaNow = getDhakaDate();
    // Top Summary metrics for the restaurant calculated in Asia/Dhaka timezone
    const todaySql = `
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM expenses 
      WHERE restaurant_id = ? AND deleted_at IS NULL AND date = ?
    `;
    const [todayRows]: any = await pool.execute(todaySql, [cleanId, dhakaNow.dateStr]);
    const todayTotal = Number(todayRows?.[0]?.total || 0);

    const monthSql = `
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM expenses 
      WHERE restaurant_id = ? AND deleted_at IS NULL 
        AND YEAR(date) = ? 
        AND MONTH(date) = ?
    `;
    const [monthRows]: any = await pool.execute(monthSql, [cleanId, dhakaNow.year, dhakaNow.month]);
    const monthTotal = Number(monthRows?.[0]?.total || 0);

    // Top Category (this month in Dhaka, or fallback to all-time)
    const topCatMonthSql = `
      SELECT c.name, COALESCE(SUM(e.amount), 0) as total 
      FROM expenses e 
      JOIN expense_categories c ON e.category_id = c.id 
      WHERE e.restaurant_id = ? AND e.deleted_at IS NULL 
        AND YEAR(e.date) = ? 
        AND MONTH(e.date) = ?
      GROUP BY e.category_id, c.name 
      ORDER BY total DESC 
      LIMIT 1
    `;
    let [topCatRows]: any = await pool.execute(topCatMonthSql, [cleanId, dhakaNow.year, dhakaNow.month]);
    if (!Array.isArray(topCatRows) || topCatRows.length === 0) {
      const topCatAllSql = `
        SELECT c.name, COALESCE(SUM(e.amount), 0) as total 
        FROM expenses e 
        JOIN expense_categories c ON e.category_id = c.id 
        WHERE e.restaurant_id = ? AND e.deleted_at IS NULL
        GROUP BY e.category_id, c.name 
        ORDER BY total DESC 
        LIMIT 1
      `;
      const [allCatRows]: any = await pool.execute(topCatAllSql, [cleanId]);
      topCatRows = allCatRows;
    }

    const topCategoryName = topCatRows?.[0]?.name || 'N/A';
    const topCategoryAmount = Number(topCatRows?.[0]?.total || 0);
    const businessType = await getClientBusinessType(cleanId);

    return {
      success: true,
      data: Array.isArray(rows) ? rows : [],
      pagination: buildPaginationMeta(total, pagination),
      summary: {
        todayTotal,
        monthTotal,
        topCategory: topCategoryName,
        topCategoryAmount,
      },
      businessType,
      isPro: true,
    };
  } catch (error: any) {
    console.error('Failed to get expenses:', error);
    return { success: false, error: error?.message || 'Failed to retrieve expenses.' };
  }
}

/**
 * Create a new expense entry.
 */
export async function createExpenseAction(restaurantId: string | number, input: CreateExpenseInput) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const numAmount = Number(input.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return { success: false, error: 'Amount must be greater than 0.' };
    }

    if (!input.date) {
      return { success: false, error: 'Date is required.' };
    }

    if (!input.category_id) {
      return { success: false, error: 'Category is required.' };
    }

    if (!input.payment_method_id) {
      return { success: false, error: 'Payment method is required.' };
    }

    const [result]: any = await pool.execute(
      `INSERT INTO expenses (
        restaurant_id, date, category_id, amount, payment_method_id, 
        vendor_id, staff_id, description, attachment, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cleanId,
        input.date,
        Number(input.category_id),
        numAmount,
        Number(input.payment_method_id),
        input.vendor_id ? Number(input.vendor_id) : null,
        input.staff_id ? Number(input.staff_id) : null,
        input.description ? String(input.description).trim() : null,
        input.attachment ? String(input.attachment).trim() : null,
        input.created_by ? String(input.created_by).trim() : null,
      ]
    );

    return {
      success: true,
      id: result?.insertId,
      message: 'Expense created successfully.',
    };
  } catch (error: any) {
    console.error('Failed to create expense:', error);
    return { success: false, error: error?.message || 'Failed to create expense.' };
  }
}

/**
 * Update an existing expense entry.
 */
export async function updateExpenseAction(
  restaurantId: string | number,
  expenseId: number | string,
  input: UpdateExpenseInput
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanExpId = Number(expenseId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    // Verify ownership
    const [existing]: any = await pool.execute(
      `SELECT id FROM expenses WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL LIMIT 1`,
      [cleanExpId, cleanId]
    );

    if (!Array.isArray(existing) || existing.length === 0) {
      return { success: false, error: 'Expense record not found or access denied.' };
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (input.date) {
      updates.push('date = ?');
      values.push(input.date);
    }

    if (input.category_id !== undefined) {
      updates.push('category_id = ?');
      values.push(Number(input.category_id));
    }

    if (input.amount !== undefined) {
      const num = Number(input.amount);
      if (isNaN(num) || num <= 0) {
        return { success: false, error: 'Amount must be greater than 0.' };
      }
      updates.push('amount = ?');
      values.push(num);
    }

    if (input.payment_method_id !== undefined) {
      updates.push('payment_method_id = ?');
      values.push(Number(input.payment_method_id));
    }

    if (input.vendor_id !== undefined) {
      updates.push('vendor_id = ?');
      values.push(input.vendor_id ? Number(input.vendor_id) : null);
    }

    if (input.staff_id !== undefined) {
      updates.push('staff_id = ?');
      values.push(input.staff_id ? Number(input.staff_id) : null);
    }

    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description ? String(input.description).trim() : null);
    }

    if (input.attachment !== undefined) {
      updates.push('attachment = ?');
      values.push(input.attachment ? String(input.attachment).trim() : null);
    }

    if (updates.length === 0) {
      return { success: true, message: 'No changes detected.' };
    }

    values.push(cleanExpId, cleanId);

    await pool.execute(
      `UPDATE expenses SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?`,
      values
    );

    return { success: true, message: 'Expense updated successfully.' };
  } catch (error: any) {
    console.error('Failed to update expense:', error);
    return { success: false, error: error?.message || 'Failed to update expense.' };
  }
}

/**
 * Soft delete an expense entry.
 */
export async function deleteExpenseAction(restaurantId: string | number, expenseId: number | string) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanExpId = Number(expenseId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const [result]: any = await pool.execute(
      `UPDATE expenses SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL`,
      [cleanExpId, cleanId]
    );

    if (result?.affectedRows === 0) {
      return { success: false, error: 'Expense not found or already deleted.' };
    }

    return { success: true, message: 'Expense deleted successfully.' };
  } catch (error: any) {
    console.error('Failed to delete expense:', error);
    return { success: false, error: error?.message || 'Failed to delete expense.' };
  }
}

/**
 * Add a new custom expense category for a restaurant.
 */
export async function createExpenseCategoryAction(
  restaurantId: string | number,
  category: { name: string; type?: string }
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const trimmedName = (category.name || '').trim();
    if (!trimmedName) {
      return { success: false, error: 'Category name cannot be empty.' };
    }

    const businessType = await getClientBusinessType(cleanId);

    // Check duplicate
    const [existing]: any = await pool.execute(
      `SELECT id FROM expense_categories 
       WHERE name = ? 
         AND (
           restaurant_id = ? 
           OR (restaurant_id IS NULL AND is_default = 1 AND (business_type = ? OR business_type IS NULL))
         ) 
         AND deleted_at IS NULL 
       LIMIT 1`,
      [trimmedName, cleanId, businessType]
    );

    if (Array.isArray(existing) && existing.length > 0) {
      return { success: false, error: 'A category with this name already exists.' };
    }

    const [result]: any = await pool.execute(
      `INSERT INTO expense_categories (restaurant_id, name, type, business_type, is_default) VALUES (?, ?, ?, ?, FALSE)`,
      [cleanId, trimmedName, category.type || 'variable', businessType]
    );

    return {
      success: true,
      id: result?.insertId,
      message: 'Category added successfully.',
    };
  } catch (error: any) {
    console.error('Failed to add category:', error);
    return { success: false, error: error?.message || 'Failed to add category.' };
  }
}

/**
 * Rename/update an expense category.
 */
export async function updateExpenseCategoryAction(
  restaurantId: string | number,
  categoryId: number | string,
  update: { name: string; type?: string }
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanCatId = Number(categoryId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const trimmedName = (update.name || '').trim();
    if (!trimmedName) {
      return { success: false, error: 'Category name cannot be empty.' };
    }

    // Check if category is default
    const [catRows]: any = await pool.execute(
      `SELECT id, restaurant_id, is_default FROM expense_categories WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [cleanCatId]
    );

    if (!Array.isArray(catRows) || catRows.length === 0) {
      return { success: false, error: 'Category not found.' };
    }

    const cat = catRows[0];
    if (cat.is_default && !cat.restaurant_id) {
      return { success: false, error: 'System default categories cannot be modified.' };
    }

    if (cat.restaurant_id && cat.restaurant_id !== cleanId) {
      return { success: false, error: 'Access denied.' };
    }

    await pool.execute(
      `UPDATE expense_categories SET name = ?, type = COALESCE(?, type), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [trimmedName, update.type || null, cleanCatId]
    );

    return { success: true, message: 'Category updated successfully.' };
  } catch (error: any) {
    console.error('Failed to update category:', error);
    return { success: false, error: error?.message || 'Failed to update category.' };
  }
}

/**
 * Delete a category (soft delete).
 * Default categories cannot be deleted.
 * Categories with active expense entries cannot be deleted.
 */
export async function deleteExpenseCategoryAction(
  restaurantId: string | number,
  categoryId: number | string
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanCatId = Number(categoryId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const [catRows]: any = await pool.execute(
      `SELECT id, restaurant_id, is_default, name FROM expense_categories WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [cleanCatId]
    );

    if (!Array.isArray(catRows) || catRows.length === 0) {
      return { success: false, error: 'Category not found.' };
    }

    const cat = catRows[0];
    if (cat.is_default) {
      return { success: false, error: 'Default categories cannot be deleted.' };
    }

    if (cat.restaurant_id && cat.restaurant_id !== cleanId) {
      return { success: false, error: 'Access denied.' };
    }

    // Check if any active expenses use this category
    const [expenseCount]: any = await pool.execute(
      `SELECT COUNT(*) as count FROM expenses WHERE category_id = ? AND deleted_at IS NULL`,
      [cleanCatId]
    );

    if (Number(expenseCount?.[0]?.count || 0) > 0) {
      return {
        success: false,
        error: `Category "${cat.name}" is used in ${expenseCount[0].count} recorded expense(s) and cannot be deleted.`,
      };
    }

    await pool.execute(
      `UPDATE expense_categories SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [cleanCatId]
    );

    return { success: true, message: 'Category deleted successfully.' };
  } catch (error: any) {
    console.error('Failed to delete category:', error);
    return { success: false, error: error?.message || 'Failed to delete category.' };
  }
}

/**
 * Export expenses matching the active filter criteria to CSV.
 */
export async function exportExpensesCsvAction(params: Omit<GetExpensesParams, 'page' | 'limit'>) {
  try {
    await ensureAccountsTables();
    const cleanId = String(params.restaurantId || '').trim();

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const conditions: string[] = ['e.restaurant_id = ?', 'e.deleted_at IS NULL'];
    const queryParams: any[] = [cleanId];

    if (params.categoryId && String(params.categoryId) !== 'all') {
      conditions.push('e.category_id = ?');
      queryParams.push(Number(params.categoryId));
    }

    if (params.paymentMethodId && String(params.paymentMethodId) !== 'all') {
      conditions.push('e.payment_method_id = ?');
      queryParams.push(Number(params.paymentMethodId));
    }

    if (params.fromDate) {
      conditions.push('e.date >= ?');
      queryParams.push(params.fromDate);
    }

    if (params.toDate) {
      conditions.push('e.date <= ?');
      queryParams.push(params.toDate);
    }

    if (params.search && params.search.trim()) {
      conditions.push('(e.description LIKE ? OR c.name LIKE ? OR pm.name LIKE ?)');
      const term = `%${params.search.trim()}%`;
      queryParams.push(term, term, term);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const exportSql = `
      SELECT 
        e.id,
        DATE_FORMAT(e.date, '%Y-%m-%d') as date,
        COALESCE(c.name, 'Uncategorized') as category,
        e.amount,
        COALESCE(pm.name, 'Other') as payment_method,
        COALESCE(e.description, '') as description,
        COALESCE(e.attachment, '') as attachment,
        DATE_FORMAT(e.created_at, '%Y-%m-%d %H:%i') as created_at
      FROM expenses e
      LEFT JOIN expense_categories c ON e.category_id = c.id
      LEFT JOIN payment_methods pm ON e.payment_method_id = pm.id
      ${whereClause}
      ORDER BY e.date DESC, e.id DESC
    `;

    const [rows]: any = await pool.execute(exportSql, queryParams);

    // Build CSV string
    const headers = ['ID', 'Date', 'Category', 'Amount (BDT)', 'Payment Method', 'Description', 'Receipt Link', 'Created At'];
    const csvLines = [headers.join(',')];

    if (Array.isArray(rows)) {
      for (const row of rows) {
        const cleanDesc = `"${String(row.description || '').replace(/"/g, '""')}"`;
        const line = [
          row.id,
          row.date,
          `"${String(row.category).replace(/"/g, '""')}"`,
          row.amount,
          `"${String(row.payment_method).replace(/"/g, '""')}"`,
          cleanDesc,
          row.attachment ? `"${row.attachment}"` : '""',
          `"${row.created_at}"`,
        ];
        csvLines.push(line.join(','));
      }
    }

    const csvContent = csvLines.join('\r\n');
    const filename = `expenses_${cleanId}_${new Date().toISOString().split('T')[0]}.csv`;

    return {
      success: true,
      csv: csvContent,
      filename,
    };
  } catch (error: any) {
    console.error('Failed to export CSV:', error);
    return { success: false, error: error?.message || 'Failed to export CSV.' };
  }
}

/* ========================================================================== */
/*                           STEP 3: VENDORS ACTIONS                          */
/* ========================================================================== */

export interface GetVendorsParams {
  restaurantId: string | number;
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  page?: number;
  limit?: number;
}

export interface CreateVendorInput {
  name: string;
  phone?: string;
  address?: string;
  category?: string;
  opening_balance?: number | string;
  note?: string;
}

export interface UpdateVendorInput {
  name?: string;
  phone?: string;
  address?: string;
  category?: string;
  opening_balance?: number | string;
  note?: string;
  is_active?: boolean;
}

export interface CreateVendorBillInput {
  bill_date: string;
  due_date?: string;
  bill_no?: string;
  total_amount: number | string;
  note?: string;
}

export interface CreateVendorPaymentInput {
  date: string;
  amount: number | string;
  payment_method_id: number | string;
  bill_id?: number | string | null;
  note?: string;
}

/**
 * Fetch vendors with total purchases, total payments, and current due balance.
 */
export async function getVendorsAction(params: GetVendorsParams) {
  try {
    await ensureAccountsTables();
    const cleanId = String(params.restaurantId || '').trim();

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const conditions: string[] = ['v.restaurant_id = ?', 'v.deleted_at IS NULL'];
    const queryParams: any[] = [cleanId];

    if (params.status === 'active') {
      conditions.push('v.is_active = TRUE');
    } else if (params.status === 'inactive') {
      conditions.push('v.is_active = FALSE');
    }

    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      conditions.push('(v.name LIKE ? OR v.phone LIKE ? OR v.category LIKE ?)');
      queryParams.push(term, term, term);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Total count for pagination
    const countSql = `SELECT COUNT(*) as total FROM vendors v ${whereClause}`;
    const [countRows]: any = await pool.execute(countSql, queryParams);
    const total = Number(countRows?.[0]?.total || 0);

    const pagination = getPagination(params.page || 1, params.limit || 10);

    // List query with aggregated purchases and payments
    const listSql = `
      SELECT 
        v.id,
        v.restaurant_id,
        v.name,
        v.phone,
        v.address,
        v.category,
        v.opening_balance,
        v.note,
        v.is_active,
        v.created_at,
        COALESCE(b.total_bills, 0) AS total_purchases,
        COALESCE(p.total_payments, 0) AS total_paid,
        (v.opening_balance + COALESCE(b.total_bills, 0) - COALESCE(p.total_payments, 0)) AS current_due,
        COALESCE(b.overdue_count, 0) AS overdue_count
      FROM vendors v
      LEFT JOIN (
        SELECT 
          vendor_id, 
          SUM(total_amount) AS total_bills,
          SUM(CASE WHEN due_date IS NOT NULL AND due_date < CURDATE() THEN 1 ELSE 0 END) AS overdue_count
        FROM vendor_bills 
        WHERE restaurant_id = ? AND deleted_at IS NULL 
        GROUP BY vendor_id
      ) b ON v.id = b.vendor_id
      LEFT JOIN (
        SELECT 
          vendor_id, 
          SUM(amount) AS total_payments 
        FROM vendor_payments 
        WHERE restaurant_id = ? AND deleted_at IS NULL 
        GROUP BY vendor_id
      ) p ON v.id = p.vendor_id
      ${whereClause}
      ORDER BY current_due DESC, v.name ASC
      LIMIT ? OFFSET ?
    `;

    const fullQueryParams = [
      cleanId,
      cleanId,
      ...queryParams,
      pagination.limit,
      pagination.offset,
    ];

    const [rows]: any = await pool.execute(listSql, fullQueryParams);

    // Top Summary: Total Due, Paid This Month, Overdue Bills Count
    const totalDueSql = `
      SELECT 
        COALESCE(SUM(v.opening_balance), 0) + 
        COALESCE((SELECT SUM(total_amount) FROM vendor_bills WHERE restaurant_id = ? AND deleted_at IS NULL), 0) - 
        COALESCE((SELECT SUM(amount) FROM vendor_payments WHERE restaurant_id = ? AND deleted_at IS NULL), 0) AS total_due
      FROM vendors v
      WHERE v.restaurant_id = ? AND v.deleted_at IS NULL AND v.is_active = TRUE
    `;
    const [dueRows]: any = await pool.execute(totalDueSql, [cleanId, cleanId, cleanId]);
    const totalDue = Math.max(0, Number(dueRows?.[0]?.total_due || 0));

    const monthPaidSql = `
      SELECT COALESCE(SUM(amount), 0) AS month_paid 
      FROM vendor_payments 
      WHERE restaurant_id = ? AND deleted_at IS NULL 
        AND YEAR(date) = YEAR(CURDATE()) AND MONTH(date) = MONTH(CURDATE())
    `;
    const [monthPaidRows]: any = await pool.execute(monthPaidSql, [cleanId]);
    const paidThisMonth = Number(monthPaidRows?.[0]?.month_paid || 0);

    const overdueCountSql = `
      SELECT COUNT(*) as overdue_count
      FROM vendor_bills b
      LEFT JOIN (
        SELECT bill_id, SUM(amount) as paid_amount 
        FROM vendor_payments 
        WHERE restaurant_id = ? AND deleted_at IS NULL AND bill_id IS NOT NULL 
        GROUP BY bill_id
      ) p ON b.id = p.bill_id
      WHERE b.restaurant_id = ? AND b.deleted_at IS NULL 
        AND b.due_date IS NOT NULL AND b.due_date < CURDATE()
        AND (b.total_amount - COALESCE(p.paid_amount, 0)) > 0
    `;
    const [overdueRows]: any = await pool.execute(overdueCountSql, [cleanId, cleanId]);
    const overdueBillsCount = Number(overdueRows?.[0]?.overdue_count || 0);

    const businessType = await getClientBusinessType(cleanId);

    return {
      success: true,
      data: Array.isArray(rows) ? rows : [],
      pagination: buildPaginationMeta(total, pagination),
      summary: {
        totalDue,
        paidThisMonth,
        overdueBillsCount,
      },
      businessType,
      isPro: true,
    };
  } catch (error: any) {
    console.error('Failed to get vendors:', error);
    return { success: false, error: error?.message || 'Failed to retrieve vendors.' };
  }
}

/**
 * Add a new vendor.
 */
export async function createVendorAction(restaurantId: string | number, input: CreateVendorInput) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const trimmedName = (input.name || '').trim();
    if (!trimmedName) {
      return { success: false, error: 'Vendor name is required.' };
    }

    if (input.phone) {
      if (!isValidBdPhone(input.phone)) {
        return { success: false, error: 'Phone number must be a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX).' };
      }
    }

    const openingBalance = Number(input.opening_balance || 0);

    const [result]: any = await pool.execute(
      `INSERT INTO vendors (
        restaurant_id, name, phone, address, category, opening_balance, note, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        cleanId,
        trimmedName,
        input.phone ? formatBdPhone(input.phone) : null,
        input.address ? input.address.trim() : null,
        input.category ? input.category.trim() : 'Grocery',
        isNaN(openingBalance) ? 0 : openingBalance,
        input.note ? input.note.trim() : null,
      ]
    );

    return {
      success: true,
      id: result?.insertId,
      message: 'Vendor created successfully.',
    };
  } catch (error: any) {
    console.error('Failed to create vendor:', error);
    return { success: false, error: error?.message || 'Failed to create vendor.' };
  }
}

/**
 * Update an existing vendor.
 */
export async function updateVendorAction(
  restaurantId: string | number,
  vendorId: number | string,
  input: UpdateVendorInput
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanVenId = Number(vendorId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      if (!trimmedName) return { success: false, error: 'Vendor name cannot be empty.' };
      updates.push('name = ?');
      values.push(trimmedName);
    }

    if (input.phone !== undefined) {
      if (input.phone && !isValidBdPhone(input.phone)) {
        return { success: false, error: 'Phone number must be a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX).' };
      }
      updates.push('phone = ?');
      values.push(input.phone ? formatBdPhone(input.phone) : null);
    }

    if (input.address !== undefined) {
      updates.push('address = ?');
      values.push(input.address ? input.address.trim() : null);
    }

    if (input.category !== undefined) {
      updates.push('category = ?');
      values.push(input.category ? input.category.trim() : 'Grocery');
    }

    if (input.opening_balance !== undefined) {
      const num = Number(input.opening_balance);
      updates.push('opening_balance = ?');
      values.push(isNaN(num) ? 0 : num);
    }

    if (input.note !== undefined) {
      updates.push('note = ?');
      values.push(input.note ? input.note.trim() : null);
    }

    if (input.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(Boolean(input.is_active));
    }

    if (updates.length === 0) {
      return { success: true, message: 'No changes detected.' };
    }

    values.push(cleanVenId, cleanId);

    await pool.execute(
      `UPDATE vendors SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?`,
      values
    );

    return { success: true, message: 'Vendor updated successfully.' };
  } catch (error: any) {
    console.error('Failed to update vendor:', error);
    return { success: false, error: error?.message || 'Failed to update vendor.' };
  }
}

/**
 * Toggle vendor active/inactive status.
 */
export async function toggleVendorStatusAction(
  restaurantId: string | number,
  vendorId: number | string
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanVenId = Number(vendorId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    await pool.execute(
      `UPDATE vendors SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?`,
      [cleanVenId, cleanId]
    );

    return { success: true, message: 'Vendor status updated.' };
  } catch (error: any) {
    console.error('Failed to toggle vendor status:', error);
    return { success: false, error: error?.message || 'Failed to update status.' };
  }
}

/**
 * Soft delete a vendor.
 */
export async function deleteVendorAction(
  restaurantId: string | number,
  vendorId: number | string
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanVenId = Number(vendorId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    await pool.execute(
      `UPDATE vendors SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?`,
      [cleanVenId, cleanId]
    );

    return { success: true, message: 'Vendor deleted successfully.' };
  } catch (error: any) {
    console.error('Failed to delete vendor:', error);
    return { success: false, error: error?.message || 'Failed to delete vendor.' };
  }
}

/**
 * Get detailed profile, bills, payments, and chronological ledger for a specific vendor.
 */
export async function getVendorDetailsAction(
  restaurantId: string | number,
  vendorId: number | string
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanVenId = Number(vendorId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    // 1. Vendor Profile
    const [vendorRows]: any = await pool.execute(
      `SELECT * FROM vendors WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL LIMIT 1`,
      [cleanVenId, cleanId]
    );

    if (!Array.isArray(vendorRows) || vendorRows.length === 0) {
      return { success: false, error: 'Vendor not found.' };
    }
    const vendor = vendorRows[0];

    // 2. Vendor Bills with paid amounts and overdue status
    const billsSql = `
      SELECT 
        b.id,
        DATE_FORMAT(b.bill_date, '%Y-%m-%d') as bill_date,
        DATE_FORMAT(b.due_date, '%Y-%m-%d') as due_date,
        b.bill_no,
        b.total_amount,
        b.note,
        b.created_at,
        COALESCE(p.paid_amount, 0) as paid_amount,
        (b.total_amount - COALESCE(p.paid_amount, 0)) as remaining_amount,
        CASE 
          WHEN COALESCE(p.paid_amount, 0) >= b.total_amount THEN 'Paid'
          WHEN COALESCE(p.paid_amount, 0) > 0 THEN 'Partial'
          ELSE 'Unpaid'
        END as payment_status,
        (b.due_date IS NOT NULL AND b.due_date < CURDATE() AND (b.total_amount - COALESCE(p.paid_amount, 0)) > 0) as is_overdue
      FROM vendor_bills b
      LEFT JOIN (
        SELECT bill_id, SUM(amount) as paid_amount
        FROM vendor_payments
        WHERE vendor_id = ? AND restaurant_id = ? AND deleted_at IS NULL AND bill_id IS NOT NULL
        GROUP BY bill_id
      ) p ON b.id = p.bill_id
      WHERE b.vendor_id = ? AND b.restaurant_id = ? AND b.deleted_at IS NULL
      ORDER BY b.bill_date DESC, b.id DESC
    `;
    const [bills]: any = await pool.execute(billsSql, [cleanVenId, cleanId, cleanVenId, cleanId]);

    // 3. Vendor Payments
    const paymentsSql = `
      SELECT 
        vp.id,
        DATE_FORMAT(vp.date, '%Y-%m-%d') as date,
        vp.amount,
        vp.payment_method_id,
        COALESCE(pm.name, 'Cash') as payment_method_name,
        vp.bill_id,
        vb.bill_no,
        vp.note,
        vp.created_at
      FROM vendor_payments vp
      LEFT JOIN payment_methods pm ON vp.payment_method_id = pm.id
      LEFT JOIN vendor_bills vb ON vp.bill_id = vb.id
      WHERE vp.vendor_id = ? AND vp.restaurant_id = ? AND vp.deleted_at IS NULL
      ORDER BY vp.date DESC, vp.id DESC
    `;
    const [payments]: any = await pool.execute(paymentsSql, [cleanVenId, cleanId]);

    // 4. Compute Totals & Ledger (Chronological)
    const totalPurchases = (bills || []).reduce((acc: number, b: any) => acc + Number(b.total_amount), 0);
    const totalPaid = (payments || []).reduce((acc: number, p: any) => acc + Number(p.amount), 0);
    const openingBal = Number(vendor.opening_balance || 0);
    const currentDue = openingBal + totalPurchases - totalPaid;

    // Build Chronological Ledger
    interface LedgerEntry {
      id: string;
      date: string;
      type: 'Opening Balance' | 'Bill' | 'Payment';
      ref: string;
      debit: number; // Bill adds to due
      credit: number; // Payment reduces due
      balance: number;
      note?: string;
    }

    const rawTransactions: Array<{ date: string; type: 'Bill' | 'Payment'; ref: string; debit: number; credit: number; note?: string; timestamp: number }> = [];

    for (const b of (bills || [])) {
      rawTransactions.push({
        date: b.bill_date,
        type: 'Bill',
        ref: b.bill_no ? `Bill #${b.bill_no}` : `Bill #${b.id}`,
        debit: Number(b.total_amount),
        credit: 0,
        note: b.note,
        timestamp: new Date(b.bill_date).getTime(),
      });
    }

    for (const p of (payments || [])) {
      rawTransactions.push({
        date: p.date,
        type: 'Payment',
        ref: p.bill_no ? `Payment (${p.payment_method_name}) for #${p.bill_no}` : `Payment (${p.payment_method_name})`,
        debit: 0,
        credit: Number(p.amount),
        note: p.note,
        timestamp: new Date(p.date).getTime(),
      });
    }

    // Sort ascending for accurate cumulative balance calculation
    rawTransactions.sort((a, b) => a.timestamp - b.timestamp);

    let runningBalance = openingBal;
    const ledger: LedgerEntry[] = [];

    if (openingBal !== 0) {
      ledger.push({
        id: 'opening',
        date: String(vendor.created_at).split('T')[0] || 'Initial',
        type: 'Opening Balance',
        ref: 'Opening Balance',
        debit: openingBal > 0 ? openingBal : 0,
        credit: openingBal < 0 ? Math.abs(openingBal) : 0,
        balance: runningBalance,
      });
    }

    rawTransactions.forEach((tx, idx) => {
      runningBalance = runningBalance + tx.debit - tx.credit;
      ledger.push({
        id: `tx-${idx}`,
        date: tx.date,
        type: tx.type,
        ref: tx.ref,
        debit: tx.debit,
        credit: tx.credit,
        balance: runningBalance,
        note: tx.note,
      });
    });

    // Reverse ledger for user presentation (newest first)
    const presentationLedger = [...ledger].reverse();

    return {
      success: true,
      data: {
        vendor: {
          ...vendor,
          total_purchases: totalPurchases,
          total_paid: totalPaid,
          current_due: currentDue,
        },
        bills: bills || [],
        payments: payments || [],
        ledger: presentationLedger,
      },
      isPro: true,
    };
  } catch (error: any) {
    console.error('Failed to get vendor details:', error);
    return { success: false, error: error?.message || 'Failed to retrieve vendor details.' };
  }
}

/**
 * Record a new bill for a vendor (Goods/Materials purchased).
 */
export async function createVendorBillAction(
  restaurantId: string | number,
  vendorId: number | string,
  input: CreateVendorBillInput
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanVenId = Number(vendorId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const amount = Number(input.total_amount);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Bill amount must be greater than 0.' };
    }

    if (!input.bill_date) {
      return { success: false, error: 'Bill date is required.' };
    }

    const [result]: any = await pool.execute(
      `INSERT INTO vendor_bills (
        restaurant_id, vendor_id, bill_date, due_date, bill_no, total_amount, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        cleanId,
        cleanVenId,
        input.bill_date,
        input.due_date || null,
        input.bill_no ? input.bill_no.trim() : null,
        amount,
        input.note ? input.note.trim() : null,
      ]
    );

    return {
      success: true,
      id: result?.insertId,
      message: 'Vendor bill recorded successfully.',
    };
  } catch (error: any) {
    console.error('Failed to create vendor bill:', error);
    return { success: false, error: error?.message || 'Failed to record bill.' };
  }
}

/**
 * Record a payment made to a vendor.
 * Automatically logs a matching entry in the expenses table (with vendor_id)
 * to ensure expense reports remain accurate without double counting.
 */
export async function createVendorPaymentAction(
  restaurantId: string | number,
  vendorId: number | string,
  input: CreateVendorPaymentInput
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanVenId = Number(vendorId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const amount = Number(input.amount);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Payment amount must be greater than 0.' };
    }

    if (!input.date) {
      return { success: false, error: 'Payment date is required.' };
    }

    if (!input.payment_method_id) {
      return { success: false, error: 'Payment method is required.' };
    }

    // 1. Fetch vendor info to get name and category
    const [vendorRows]: any = await pool.execute(
      `SELECT name, category FROM vendors WHERE id = ? AND restaurant_id = ? LIMIT 1`,
      [cleanVenId, cleanId]
    );
    const vendorName = vendorRows?.[0]?.name || 'Vendor';

    // 2. Fetch bill_no if bill_id was specified
    let billRef = '';
    if (input.bill_id) {
      const [billRows]: any = await pool.execute(
        `SELECT bill_no FROM vendor_bills WHERE id = ? AND restaurant_id = ? LIMIT 1`,
        [Number(input.bill_id), cleanId]
      );
      if (billRows?.[0]?.bill_no) {
        billRef = ` (Bill #${billRows[0].bill_no})`;
      }
    }

    // 3. Find appropriate expense category (e.g. Raw Material for restaurant, Product Purchase / Salon Supplies for parlour)
    const businessType = await getClientBusinessType(cleanId);
    let catRows: any;
    if (businessType === 'parlour') {
      [catRows] = await pool.execute(
        `SELECT id FROM expense_categories 
         WHERE (name = 'Product Purchase' OR name = 'Salon Supplies' OR type = 'cogs') 
           AND (restaurant_id = ? OR (is_default = 1 AND (business_type = 'parlour' OR business_type = 'all'))) 
         ORDER BY is_default DESC LIMIT 1`,
        [cleanId]
      );
    } else {
      [catRows] = await pool.execute(
        `SELECT id FROM expense_categories 
         WHERE (name = 'Raw Material' OR name = 'Raw Materials' OR type = 'cogs') 
           AND (restaurant_id = ? OR (is_default = 1 AND (business_type = 'restaurant' OR business_type IS NULL))) 
         ORDER BY is_default DESC LIMIT 1`,
        [cleanId]
      );
    }
    const categoryId = catRows?.[0]?.id || 1;

    // 4. Create matching expense entry (Auto-logged with vendor_id)
    const expenseDesc = `Vendor Payment: ${vendorName}${billRef}${input.note ? ` - ${input.note.trim()}` : ''}`;
    const [expResult]: any = await pool.execute(
      `INSERT INTO expenses (
        restaurant_id, date, category_id, amount, payment_method_id, vendor_id, description, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Vendor Module')`,
      [
        cleanId,
        input.date,
        categoryId,
        amount,
        Number(input.payment_method_id),
        cleanVenId,
        expenseDesc,
      ]
    );
    const expenseId = expResult?.insertId || null;

    // 5. Insert vendor payment record linked with expense_id
    const [payResult]: any = await pool.execute(
      `INSERT INTO vendor_payments (
        restaurant_id, vendor_id, bill_id, date, amount, payment_method_id, expense_id, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cleanId,
        cleanVenId,
        input.bill_id ? Number(input.bill_id) : null,
        input.date,
        amount,
        Number(input.payment_method_id),
        expenseId,
        input.note ? input.note.trim() : null,
      ]
    );

    return {
      success: true,
      id: payResult?.insertId,
      expenseId,
      message: 'Payment recorded and synced with Expenses successfully.',
    };
  } catch (error: any) {
    console.error('Failed to record vendor payment:', error);
    return { success: false, error: error?.message || 'Failed to record payment.' };
  }
}

/**
 * Soft delete a vendor bill.
 */
export async function deleteVendorBillAction(
  restaurantId: string | number,
  billId: number | string
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanBillId = Number(billId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    await pool.execute(
      `UPDATE vendor_bills SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?`,
      [cleanBillId, cleanId]
    );

    return { success: true, message: 'Vendor bill deleted successfully.' };
  } catch (error: any) {
    console.error('Failed to delete bill:', error);
    return { success: false, error: error?.message || 'Failed to delete bill.' };
  }
}

/**
 * Soft delete a vendor payment and its corresponding auto-generated expense.
 */
export async function deleteVendorPaymentAction(
  restaurantId: string | number,
  paymentId: number | string
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanPayId = Number(paymentId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    // Get linked expense_id
    const [payRows]: any = await pool.execute(
      `SELECT expense_id FROM vendor_payments WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL LIMIT 1`,
      [cleanPayId, cleanId]
    );

    const expenseId = payRows?.[0]?.expense_id;

    // Soft delete vendor payment
    await pool.execute(
      `UPDATE vendor_payments SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?`,
      [cleanPayId, cleanId]
    );

    // Soft delete linked expense if present
    if (expenseId) {
      await pool.execute(
        `UPDATE expenses SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?`,
        [expenseId, cleanId]
      );
    }

    return { success: true, message: 'Vendor payment and linked expense removed.' };
  } catch (error: any) {
    console.error('Failed to delete payment:', error);
    return { success: false, error: error?.message || 'Failed to delete payment.' };
  }
}

/* ========================================================================== */
/*                           STEP 4: STAFF COST ACTIONS                       */
/* ========================================================================== */

export interface GetStaffParams {
  restaurantId: string | number;
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  page?: number;
  limit?: number;
}

export interface CreateStaffInput {
  name: string;
  phone?: string;
  role?: string;
  joining_date?: string;
  salary_type?: 'monthly' | 'daily';
  base_salary?: number | string;
  commission_type?: 'percent' | 'fixed';
  commission_value?: number | string;
}

export interface UpdateStaffInput {
  name?: string;
  phone?: string;
  role?: string;
  joining_date?: string;
  salary_type?: 'monthly' | 'daily';
  base_salary?: number | string;
  commission_type?: 'percent' | 'fixed';
  commission_value?: number | string;
  is_active?: boolean;
}

export interface CreateStaffAdvanceInput {
  staff_id: number | string;
  date: string;
  amount: number | string;
  payment_method_id: number | string;
  note?: string;
}

export interface SaveSalaryRecordInput {
  staff_id: number | string;
  month: string;
  base_salary: number | string;
  bonus?: number | string;
  overtime?: number | string;
  commission_amount?: number | string;
  tip_amount?: number | string;
  deduction?: number | string;
  advance_adjusted?: number | string;
  net_payable: number | string;
  note?: string;
}

export interface CreateServiceInput {
  name: string;
  price: number | string;
  default_commission_type?: 'percent' | 'fixed';
  default_commission_value?: number | string;
}

export interface UpdateServiceInput {
  name?: string;
  price?: number | string;
  default_commission_type?: 'percent' | 'fixed';
  default_commission_value?: number | string;
  is_active?: boolean;
}

export interface CreateStaffCommissionInput {
  staff_id: number | string;
  service_id?: number | string | null;
  date: string;
  service_amount: number | string;
  commission_amount?: number | string;
  tip_amount?: number | string;
  customer_name?: string;
  note?: string;
}

export interface UpdateStaffCommissionInput {
  staff_id?: number | string;
  service_id?: number | string | null;
  date?: string;
  service_amount?: number | string;
  commission_amount?: number | string;
  tip_amount?: number | string;
  customer_name?: string;
  note?: string;
}

export interface GetStaffCommissionsParams {
  restaurantId: string | number;
  staffId?: number | string;
  month?: string;
  fromDate?: string;
  toDate?: string;
}

export interface PaySalaryInput {
  paid_date: string;
  paid_amount: number | string;
  payment_method_id: number | string;
  note?: string;
}

/**
 * Fetch staff list with pending advances, unpaid salary, and top summary cards.
 */
export async function getStaffListAction(params: GetStaffParams) {
  try {
    await ensureAccountsTables();
    const cleanId = String(params.restaurantId || '').trim();

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const conditions: string[] = ['s.restaurant_id = ?', 's.deleted_at IS NULL'];
    const queryParams: any[] = [cleanId];

    if (params.status === 'active') {
      conditions.push('s.is_active = TRUE');
    } else if (params.status === 'inactive') {
      conditions.push('s.is_active = FALSE');
    }

    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      conditions.push('(s.name LIKE ? OR s.phone LIKE ? OR s.role LIKE ?)');
      queryParams.push(term, term, term);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Total count for pagination
    const countSql = `SELECT COUNT(*) as total FROM staff s ${whereClause}`;
    const [countRows]: any = await pool.execute(countSql, queryParams);
    const total = Number(countRows?.[0]?.total || 0);

    const pagination = getPagination(params.page || 1, params.limit || 15);

    // List query with pending advance, unpaid salary, and commissions subqueries
    const listSql = `
      SELECT 
        s.id,
        s.restaurant_id,
        s.name,
        s.phone,
        s.role,
        DATE_FORMAT(s.joining_date, '%Y-%m-%d') as joining_date,
        s.salary_type,
        s.base_salary,
        s.commission_type,
        s.commission_value,
        s.is_active,
        s.created_at,
        COALESCE(adv.pending_advance, 0) as pending_advance,
        COALESCE(sal.unpaid_salary, 0) as unpaid_salary,
        COALESCE(comm.month_services, 0) as month_services,
        COALESCE(comm.month_commission, 0) as month_commission,
        COALESCE(comm.month_tips, 0) as month_tips
      FROM staff s
      LEFT JOIN (
        SELECT 
          staff_id, 
          SUM(amount - adjusted_amount) as pending_advance 
        FROM staff_advances 
        WHERE restaurant_id = ? AND deleted_at IS NULL 
        GROUP BY staff_id
      ) adv ON s.id = adv.staff_id
      LEFT JOIN (
        SELECT 
          staff_id, 
          SUM(net_payable - paid_amount) as unpaid_salary 
        FROM staff_salary_records 
        WHERE restaurant_id = ? AND deleted_at IS NULL AND status != 'paid' 
        GROUP BY staff_id
      ) sal ON s.id = sal.staff_id
      LEFT JOIN (
        SELECT 
          staff_id, 
          COUNT(id) as month_services, 
          SUM(commission_amount) as month_commission, 
          SUM(tip_amount) as month_tips 
        FROM staff_commissions 
        WHERE restaurant_id = ? AND deleted_at IS NULL AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE()) 
        GROUP BY staff_id
      ) comm ON s.id = comm.staff_id
      ${whereClause}
      ORDER BY s.is_active DESC, s.name ASC
      LIMIT ? OFFSET ?
    `;

    const fullQueryParams = [
      cleanId,
      cleanId,
      cleanId,
      ...queryParams,
      pagination.limit,
      pagination.offset,
    ];

    const [rows]: any = await pool.execute(listSql, fullQueryParams);

    // Top Summary:
    // 1. This month's total staff cost (Salaries paid this month [excluding tips] + Advances given this month)
    const monthCostSql = `
      SELECT 
        (SELECT COALESCE(SUM(GREATEST(0, paid_amount - COALESCE(tip_amount, 0))), 0) FROM staff_salary_records WHERE restaurant_id = ? AND deleted_at IS NULL AND (MONTH(paid_date) = MONTH(CURDATE()) AND YEAR(paid_date) = YEAR(CURDATE()) OR month = DATE_FORMAT(CURDATE(), '%Y-%m')))
        +
        (SELECT COALESCE(SUM(amount), 0) FROM staff_advances WHERE restaurant_id = ? AND deleted_at IS NULL AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE()))
        AS month_cost
    `;
    const [costRows]: any = await pool.execute(monthCostSql, [cleanId, cleanId]);
    const thisMonthStaffCost = Number(costRows?.[0]?.month_cost || 0);

    // 2. Unpaid salary (total pending salary across active records)
    const unpaidSalarySql = `
      SELECT COALESCE(SUM(net_payable - paid_amount), 0) as unpaid_total 
      FROM staff_salary_records 
      WHERE restaurant_id = ? AND deleted_at IS NULL AND status != 'paid'
    `;
    const [unpaidRows]: any = await pool.execute(unpaidSalarySql, [cleanId]);
    const unpaidSalary = Math.max(0, Number(unpaidRows?.[0]?.unpaid_total || 0));

    // 3. Total Advance pending across all staff
    const totalAdvanceSql = `
      SELECT COALESCE(SUM(amount - adjusted_amount), 0) as total_advance 
      FROM staff_advances 
      WHERE restaurant_id = ? AND deleted_at IS NULL
    `;
    const [advRows]: any = await pool.execute(totalAdvanceSql, [cleanId]);
    const totalAdvancePending = Math.max(0, Number(advRows?.[0]?.total_advance || 0));

    // 4. This month's total commissions and tips (for parlour intelligence)
    const monthCommSql = `
      SELECT 
        COALESCE(SUM(commission_amount), 0) as month_commission,
        COALESCE(SUM(tip_amount), 0) as month_tips,
        COUNT(id) as month_services
      FROM staff_commissions 
      WHERE restaurant_id = ? AND deleted_at IS NULL AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())
    `;
    const [commTotalRows]: any = await pool.execute(monthCommSql, [cleanId]);
    const thisMonthCommissions = Number(commTotalRows?.[0]?.month_commission || 0);
    const thisMonthTips = Number(commTotalRows?.[0]?.month_tips || 0);
    const thisMonthServices = Number(commTotalRows?.[0]?.month_services || 0);

    const businessType = await getClientBusinessType(cleanId);

    return {
      success: true,
      data: Array.isArray(rows) ? rows : [],
      pagination: buildPaginationMeta(total, pagination),
      summary: {
        thisMonthStaffCost,
        unpaidSalary,
        totalAdvancePending,
        thisMonthCommissions,
        thisMonthTips,
        thisMonthServices,
      },
      businessType,
      isPro: true,
    };
  } catch (error: any) {
    console.error('Failed to get staff list:', error);
    return { success: false, error: error?.message || 'Failed to retrieve staff list.' };
  }
}

/**
 * Add a new staff member.
 */
export async function createStaffAction(restaurantId: string | number, input: CreateStaffInput) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const trimmedName = (input.name || '').trim();
    if (!trimmedName) {
      return { success: false, error: 'Staff name is required.' };
    }

    if (input.phone) {
      if (!isValidBdPhone(input.phone)) {
        return { success: false, error: 'Phone number must be a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX).' };
      }
    }

    const baseSalary = Number(input.base_salary || 0);
    const commType = input.commission_type === 'fixed' ? 'fixed' : 'percent';
    let commVal = Math.max(0, Number(input.commission_value || 0));
    if (commType === 'percent') {
      commVal = Math.min(100, commVal);
    }

    const [result]: any = await pool.execute(
      `INSERT INTO staff (
        restaurant_id, name, phone, role, joining_date, salary_type, base_salary, commission_type, commission_value, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        cleanId,
        trimmedName,
        input.phone ? formatBdPhone(input.phone) : null,
        input.role ? input.role.trim() : 'Staff',
        input.joining_date || null,
        input.salary_type || 'monthly',
        isNaN(baseSalary) ? 0 : baseSalary,
        commType,
        commVal,
      ]
    );

    return {
      success: true,
      id: result?.insertId,
      message: 'Staff member added successfully.',
    };
  } catch (error: any) {
    console.error('Failed to create staff:', error);
    return { success: false, error: error?.message || 'Failed to add staff.' };
  }
}

/**
 * Update staff profile.
 */
export async function updateStaffAction(
  restaurantId: string | number,
  staffId: number | string,
  input: UpdateStaffInput
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanStaffId = Number(staffId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      const trimmed = input.name.trim();
      if (!trimmed) return { success: false, error: 'Staff name cannot be empty.' };
      updates.push('name = ?');
      values.push(trimmed);
    }

    if (input.phone !== undefined) {
      if (input.phone && !isValidBdPhone(input.phone)) {
        return { success: false, error: 'Phone number must be a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX).' };
      }
      updates.push('phone = ?');
      values.push(input.phone ? formatBdPhone(input.phone) : null);
    }

    if (input.role !== undefined) {
      updates.push('role = ?');
      values.push(input.role ? input.role.trim() : 'Staff');
    }

    if (input.joining_date !== undefined) {
      updates.push('joining_date = ?');
      values.push(input.joining_date || null);
    }

    if (input.salary_type !== undefined) {
      updates.push('salary_type = ?');
      values.push(input.salary_type);
    }

    if (input.base_salary !== undefined) {
      const num = Number(input.base_salary);
      updates.push('base_salary = ?');
      values.push(isNaN(num) ? 0 : num);
    }

    if (input.commission_type !== undefined) {
      updates.push('commission_type = ?');
      values.push(input.commission_type === 'fixed' ? 'fixed' : 'percent');
    }

    if (input.commission_value !== undefined) {
      let num = Number(input.commission_value);
      num = isNaN(num) ? 0 : Math.max(0, num);
      if (input.commission_type === 'percent') {
        num = Math.min(100, num);
      }
      updates.push('commission_value = ?');
      values.push(num);
    }

    if (input.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(Boolean(input.is_active));
    }

    if (updates.length === 0) {
      return { success: true, message: 'No changes detected.' };
    }

    values.push(cleanStaffId, cleanId);

    await pool.execute(
      `UPDATE staff SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?`,
      values
    );

    return { success: true, message: 'Staff profile updated successfully.' };
  } catch (error: any) {
    console.error('Failed to update staff:', error);
    return { success: false, error: error?.message || 'Failed to update staff.' };
  }
}

/**
 * Toggle staff active status.
 */
export async function toggleStaffStatusAction(
  restaurantId: string | number,
  staffId: number | string
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanStaffId = Number(staffId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    await pool.execute(
      `UPDATE staff SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?`,
      [cleanStaffId, cleanId]
    );

    return { success: true, message: 'Staff status updated.' };
  } catch (error: any) {
    console.error('Failed to toggle staff status:', error);
    return { success: false, error: error?.message || 'Failed to update status.' };
  }
}

/**
 * Soft delete a staff member.
 */
export async function deleteStaffAction(
  restaurantId: string | number,
  staffId: number | string
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanStaffId = Number(staffId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    await pool.execute(
      `UPDATE staff SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?`,
      [cleanStaffId, cleanId]
    );

    return { success: true, message: 'Staff member deleted.' };
  } catch (error: any) {
    console.error('Failed to delete staff:', error);
    return { success: false, error: error?.message || 'Failed to delete staff.' };
  }
}

/**
 * Fetch daily attendance sheet for all active staff on a given date.
 */
export async function getDailyAttendanceAction(restaurantId: string | number, date: string) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const targetDate = date || new Date().toISOString().split('T')[0];

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const sql = `
      SELECT 
        s.id,
        s.name,
        s.role,
        s.salary_type,
        s.base_salary,
        COALESCE(a.status, 'present') as status,
        COALESCE(a.note, '') as note
      FROM staff s
      LEFT JOIN staff_attendance a ON s.id = a.staff_id AND a.date = ?
      WHERE s.restaurant_id = ? AND s.is_active = TRUE AND s.deleted_at IS NULL
      ORDER BY s.name ASC
    `;

    const [rows]: any = await pool.execute(sql, [targetDate, cleanId]);

    return {
      success: true,
      data: Array.isArray(rows) ? rows : [],
      date: targetDate,
    };
  } catch (error: any) {
    console.error('Failed to get daily attendance:', error);
    return { success: false, error: error?.message || 'Failed to load attendance.' };
  }
}

/**
 * Save / Upsert bulk daily attendance records for a specific date.
 */
export async function saveDailyAttendanceAction(
  restaurantId: string | number,
  date: string,
  records: Array<{ staff_id: number | string; status: string; note?: string }>
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const targetDate = date || new Date().toISOString().split('T')[0];

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    for (const rec of records) {
      await pool.execute(
        `INSERT INTO staff_attendance (restaurant_id, staff_id, date, status, note)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           status = VALUES(status),
           note = VALUES(note),
           updated_at = CURRENT_TIMESTAMP`,
        [cleanId, Number(rec.staff_id), targetDate, rec.status || 'present', rec.note ? rec.note.trim() : null]
      );
    }

    return { success: true, message: 'Attendance records saved successfully.' };
  } catch (error: any) {
    console.error('Failed to save attendance:', error);
    return { success: false, error: error?.message || 'Failed to save attendance.' };
  }
}

/**
 * Month-End Salary calculation helper / preview.
 * Aggregates attendance in the month and pending unadjusted advances.
 */
export async function calculateSalaryPreviewAction(restaurantId: string | number, month: string) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const targetMonth = month || new Date().toISOString().slice(0, 7); // 'YYYY-MM'

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    // Days in target month
    const [yearStr, monthStr] = targetMonth.split('-');
    const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();

    // 1. Fetch active staff
    const [staffList]: any = await pool.execute(
      `SELECT id, name, role, salary_type, base_salary 
       FROM staff 
       WHERE restaurant_id = ? AND is_active = TRUE AND deleted_at IS NULL 
       ORDER BY name ASC`,
      [cleanId]
    );

    // 2. Fetch attendance counts for the month
    const [attRows]: any = await pool.execute(
      `SELECT 
         staff_id,
         SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as presents,
         SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absents,
         SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END) as leaves,
         SUM(CASE WHEN status = 'half_day' THEN 1 ELSE 0 END) as half_days
       FROM staff_attendance 
       WHERE restaurant_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?
       GROUP BY staff_id`,
      [cleanId, targetMonth]
    );
    const attMap = new Map();
    for (const a of (attRows || [])) {
      attMap.set(Number(a.staff_id), a);
    }

    // 3. Fetch pending advances available
    const [advRows]: any = await pool.execute(
      `SELECT staff_id, SUM(amount - adjusted_amount) as pending_advance 
       FROM staff_advances 
       WHERE restaurant_id = ? AND deleted_at IS NULL 
       GROUP BY staff_id`,
      [cleanId]
    );
    const advMap = new Map();
    for (const a of (advRows || [])) {
      advMap.set(Number(a.staff_id), Math.max(0, Number(a.pending_advance || 0)));
    }

    // 3.5 Fetch staff commissions and tips for targetMonth (Parlour staff commission integration)
    const [commRows]: any = await pool.execute(
      `SELECT 
         staff_id,
         COUNT(id) as total_services,
         COALESCE(SUM(commission_amount), 0) as total_commission,
         COALESCE(SUM(tip_amount), 0) as total_tips
       FROM staff_commissions
       WHERE restaurant_id = ? AND deleted_at IS NULL AND DATE_FORMAT(date, '%Y-%m') = ?
       GROUP BY staff_id`,
      [cleanId, targetMonth]
    );
    const commMap = new Map();
    for (const c of (commRows || [])) {
      commMap.set(Number(c.staff_id), c);
    }

    // 4. Fetch already generated salary record for this month if any
    const [salRows]: any = await pool.execute(
      `SELECT * FROM staff_salary_records 
       WHERE restaurant_id = ? AND month = ? AND deleted_at IS NULL`,
      [cleanId, targetMonth]
    );
    const salMap = new Map();
    for (const s of (salRows || [])) {
      salMap.set(Number(s.staff_id), s);
    }

    const previewList = (staffList || []).map((s: any) => {
      const att = attMap.get(s.id) || { presents: 0, absents: 0, leaves: 0, half_days: 0 };
      const pendingAdvance = advMap.get(s.id) || 0;
      const existing = salMap.get(s.id);
      const comm = commMap.get(s.id) || { total_services: 0, total_commission: 0, total_tips: 0 };
      const commissionAmount = existing ? Number(existing.commission_amount || 0) : Number(comm.total_commission || 0);
      const tipAmount = existing ? Number(existing.tip_amount || 0) : Number(comm.total_tips || 0);
      const totalServices = Number(comm.total_services || 0);

      if (existing) {
        return {
          staff_id: s.id,
          name: s.name,
          role: s.role,
          salary_type: s.salary_type,
          base_salary: Number(existing.base_salary),
          bonus: Number(existing.bonus),
          overtime: Number(existing.overtime),
          commission_amount: commissionAmount,
          tip_amount: tipAmount,
          total_services: totalServices,
          deduction: Number(existing.deduction),
          advance_adjusted: Number(existing.advance_adjusted),
          net_payable: Number(existing.net_payable),
          paid_amount: Number(existing.paid_amount),
          status: existing.status,
          existing_id: existing.id,
          attendance: att,
          pending_advance: pendingAdvance,
        };
      }

      const base = Number(s.base_salary || 0);
      let calculatedDeduction = 0;
      let calculatedBase = base;

      if (s.salary_type === 'monthly') {
        const dailyRate = daysInMonth > 0 ? base / daysInMonth : 0;
        calculatedDeduction = Math.round(Number(att.absents || 0) * dailyRate);
      } else {
        // Daily wage staff
        const attendedDays = Number(att.presents || 0) + Number(att.leaves || 0) + (Number(att.half_days || 0) * 0.5);
        calculatedBase = Math.round(attendedDays * base);
      }

      // Default suggested advance adjustment (capped at 50% of salary or pending advance)
      const suggestedAdvanceAdjust = Math.min(pendingAdvance, Math.max(0, Math.round(calculatedBase * 0.3)));
      const netPayable = Math.max(
        0,
        calculatedBase + commissionAmount + tipAmount - calculatedDeduction - suggestedAdvanceAdjust
      );

      return {
        staff_id: s.id,
        name: s.name,
        role: s.role,
        salary_type: s.salary_type,
        base_salary: calculatedBase,
        bonus: 0,
        overtime: 0,
        commission_amount: commissionAmount,
        tip_amount: tipAmount,
        total_services: totalServices,
        deduction: calculatedDeduction,
        advance_adjusted: suggestedAdvanceAdjust,
        net_payable: netPayable,
        paid_amount: 0,
        status: 'unpaid',
        attendance: att,
        pending_advance: pendingAdvance,
      };
    });

    return {
      success: true,
      month: targetMonth,
      data: previewList,
    };
  } catch (error: any) {
    console.error('Failed to calculate salary preview:', error);
    return { success: false, error: error?.message || 'Failed to preview salary.' };
  }
}

/**
 * Save / Update a staff member's month salary record.
 */
export async function saveSalaryRecordAction(
  restaurantId: string | number,
  input: SaveSalaryRecordInput
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanStaffId = Number(input.staff_id);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const baseSalary = Number(input.base_salary || 0);
    const bonus = Number(input.bonus || 0);
    const overtime = Number(input.overtime || 0);
    const commissionAmount = Number(input.commission_amount || 0);
    const tipAmount = Number(input.tip_amount || 0);
    const deduction = Number(input.deduction || 0);
    const advanceAdjusted = Number(input.advance_adjusted || 0);
    const netPayable = Number(input.net_payable || 0);

    // Upsert salary record
    const [existing]: any = await pool.execute(
      `SELECT id, advance_adjusted FROM staff_salary_records 
       WHERE restaurant_id = ? AND staff_id = ? AND month = ? AND deleted_at IS NULL LIMIT 1`,
      [cleanId, cleanStaffId, input.month]
    );

    let recordId: number;

    if (Array.isArray(existing) && existing.length > 0) {
      recordId = existing[0].id;
      await pool.execute(
        `UPDATE staff_salary_records SET
           base_salary = ?, bonus = ?, overtime = ?, commission_amount = ?, tip_amount = ?, deduction = ?, advance_adjusted = ?, net_payable = ?, note = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [baseSalary, bonus, overtime, commissionAmount, tipAmount, deduction, advanceAdjusted, netPayable, input.note ? input.note.trim() : null, recordId]
      );
    } else {
      const [res]: any = await pool.execute(
        `INSERT INTO staff_salary_records (
           restaurant_id, staff_id, month, base_salary, bonus, overtime, commission_amount, tip_amount, deduction, advance_adjusted, net_payable, note
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [cleanId, cleanStaffId, input.month, baseSalary, bonus, overtime, commissionAmount, tipAmount, deduction, advanceAdjusted, netPayable, input.note ? input.note.trim() : null]
      );
      recordId = res.insertId;
    }

    // Link staff commissions for this month to this salary record
    await pool.execute(
      `UPDATE staff_commissions 
       SET salary_record_id = ? 
       WHERE restaurant_id = ? AND staff_id = ? AND DATE_FORMAT(date, '%Y-%m') = ? AND deleted_at IS NULL`,
      [recordId, cleanId, cleanStaffId, input.month]
    );

    // If advance adjusted, deduct from unadjusted advances for this staff
    if (advanceAdjusted > 0) {
      let remainingToAdjust = advanceAdjusted;
      const [advances]: any = await pool.execute(
        `SELECT id, amount, adjusted_amount FROM staff_advances 
         WHERE restaurant_id = ? AND staff_id = ? AND deleted_at IS NULL AND (amount - adjusted_amount) > 0 
         ORDER BY date ASC`,
        [cleanId, cleanStaffId]
      );

      for (const adv of (advances || [])) {
        if (remainingToAdjust <= 0) break;
        const unadjusted = Number(adv.amount) - Number(adv.adjusted_amount);
        const apply = Math.min(unadjusted, remainingToAdjust);
        await pool.execute(
          `UPDATE staff_advances SET adjusted_amount = adjusted_amount + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [apply, adv.id]
        );
        remainingToAdjust -= apply;
      }
    }

    return { success: true, id: recordId, message: 'Salary record saved successfully.' };
  } catch (error: any) {
    console.error('Failed to save salary record:', error);
    return { success: false, error: error?.message || 'Failed to save salary record.' };
  }
}

/**
 * Disburse / Pay Salary to staff member.
 * Automatically logs a matching entry in Expenses under 'Staff Salary' with staff_id.
 */
export async function paySalaryAction(
  restaurantId: string | number,
  salaryRecordId: number | string,
  input: PaySalaryInput
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanRecId = Number(salaryRecordId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const payAmount = Number(input.paid_amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return { success: false, error: 'Payment amount must be greater than 0.' };
    }

    // 1. Fetch salary record and staff info
    const [recRows]: any = await pool.execute(
      `SELECT r.*, s.name as staff_name 
       FROM staff_salary_records r
       JOIN staff s ON r.staff_id = s.id
       WHERE r.id = ? AND r.restaurant_id = ? AND r.deleted_at IS NULL LIMIT 1`,
      [cleanRecId, cleanId]
    );

    if (!Array.isArray(recRows) || recRows.length === 0) {
      return { success: false, error: 'Salary record not found.' };
    }
    const rec = recRows[0];

    const currentPaid = Number(rec.paid_amount || 0);
    const netPayable = Number(rec.net_payable || 0);
    if (currentPaid >= netPayable && netPayable > 0) {
      return { success: false, error: 'Salary record has already been fully paid.' };
    }
    const remainingPayable = Math.max(0, Math.round((netPayable - currentPaid) * 100) / 100);
    if (payAmount > remainingPayable) {
      return {
        success: false,
        error: `Payment amount (৳${payAmount}) exceeds remaining payable balance (৳${remainingPayable}).`,
      };
    }

    const newPaidTotal = Math.round((currentPaid + payAmount) * 100) / 100;
    const newStatus = newPaidTotal >= netPayable ? 'paid' : 'partial';

    // 2. Company expense portion calculation vs staff tips
    // Company Expense Portion = base_salary + bonus + overtime + commission_amount - deduction - advance_adjusted
    const companyExpensePortion = Math.max(
      0,
      Number(rec.base_salary || 0) +
      Number(rec.bonus || 0) +
      Number(rec.overtime || 0) +
      Number(rec.commission_amount || 0) -
      Number(rec.deduction || 0) -
      Number(rec.advance_adjusted || 0)
    );
    const tipAmount = Math.max(0, Number(rec.tip_amount || 0));

    // Rule: Tips are paid out first to staff (tips are client gratuities, never company expenditure).
    // Cumulative company expense up to currentPaid:
    const oldExpenseLogged = Math.min(companyExpensePortion, Math.max(0, currentPaid - tipAmount));
    // Cumulative company expense up to newPaidTotal:
    const newExpenseLogged = Math.min(companyExpensePortion, Math.max(0, newPaidTotal - tipAmount));

    // Incremental expense for THIS specific payment:
    const expenseForThisPayment = Math.max(0, Math.round((newExpenseLogged - oldExpenseLogged) * 100) / 100);

    // 3. Find category for 'Staff Salary' (matching business type or restaurant)
    const businessType = await getClientBusinessType(cleanId);
    const [catRows]: any = await pool.execute(
      `SELECT id FROM expense_categories 
       WHERE (name LIKE '%Staff Salary%' OR name LIKE '%Salary%') 
         AND (restaurant_id = ? OR (is_default = 1 AND (business_type = ? OR business_type IS NULL)))
         AND deleted_at IS NULL
       ORDER BY is_default DESC, id ASC LIMIT 1`,
      [cleanId, businessType]
    );
    const categoryId = catRows?.[0]?.id || 1;

    // 4. Auto-insert expense entry ONLY for company expense portion
    let expenseId: number | null = null;
    if (expenseForThisPayment > 0) {
      const tipPortionInThisPayment = Math.max(0, Math.round((payAmount - expenseForThisPayment) * 100) / 100);
      const expenseDesc = `Staff Salary: ${rec.staff_name} (${rec.month}) [Payment ৳${payAmount}${tipPortionInThisPayment > 0 ? ` - ৳${tipPortionInThisPayment} tip excluded` : ''}]${input.note ? ` - ${input.note.trim()}` : ''}`;
      const [expRes]: any = await pool.execute(
        `INSERT INTO expenses (
           restaurant_id, date, category_id, amount, payment_method_id, staff_id, description, created_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Staff Module')`,
        [
          cleanId,
          input.paid_date,
          categoryId,
          expenseForThisPayment,
          Number(input.payment_method_id),
          rec.staff_id,
          expenseDesc,
        ]
      );
      expenseId = expRes?.insertId || null;
    }

    // 5. Update salary record
    await pool.execute(
      `UPDATE staff_salary_records SET
         paid_amount = ?, status = ?, paid_date = ?, payment_method_id = ?, expense_id = COALESCE(?, expense_id), updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newPaidTotal, newStatus, input.paid_date, Number(input.payment_method_id), expenseId, cleanRecId]
    );

    return {
      success: true,
      message: 'Salary payment recorded and synced to Expenses.',
      expenseId,
    };
  } catch (error: any) {
    console.error('Failed to pay salary:', error);
    return { success: false, error: error?.message || 'Failed to disburse salary.' };
  }
}

/**
 * Grant staff advance.
 * Automatically logs a matching entry in Expenses under 'Staff Advance'.
 */
export async function createStaffAdvanceAction(
  restaurantId: string | number,
  input: CreateStaffAdvanceInput
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanStaffId = Number(input.staff_id);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const amount = Number(input.amount);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Advance amount must be greater than 0.' };
    }

    if (!input.date) {
      return { success: false, error: 'Date is required.' };
    }

    if (!input.payment_method_id) {
      return { success: false, error: 'Payment method is required.' };
    }

    // 1. Fetch staff name
    const [staffRows]: any = await pool.execute(
      `SELECT name FROM staff WHERE id = ? AND restaurant_id = ? LIMIT 1`,
      [cleanStaffId, cleanId]
    );
    const staffName = staffRows?.[0]?.name || 'Staff';

    // 2. Find category for 'Staff Advance' (matching business type or restaurant)
    const businessType = await getClientBusinessType(cleanId);
    const [catRows]: any = await pool.execute(
      `SELECT id FROM expense_categories 
       WHERE (name LIKE '%Staff Advance%' OR name LIKE '%Advance%' OR name LIKE '%Staff Salary%' OR name LIKE '%Salary%')
         AND (restaurant_id = ? OR (is_default = 1 AND (business_type = ? OR business_type IS NULL)))
         AND deleted_at IS NULL
       ORDER BY is_default DESC, id ASC LIMIT 1`,
      [cleanId, businessType]
    );
    const categoryId = catRows?.[0]?.id || 1;

    // 3. Auto-insert expense
    const expenseDesc = `Staff Advance: ${staffName}${input.note ? ` - ${input.note.trim()}` : ''}`;
    const [expRes]: any = await pool.execute(
      `INSERT INTO expenses (
         restaurant_id, date, category_id, amount, payment_method_id, staff_id, description, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Staff Module')`,
      [
        cleanId,
        input.date,
        categoryId,
        amount,
        Number(input.payment_method_id),
        cleanStaffId,
        expenseDesc,
      ]
    );
    const expenseId = expRes?.insertId;

    // 4. Insert staff advance record
    const [advRes]: any = await pool.execute(
      `INSERT INTO staff_advances (
         restaurant_id, staff_id, date, amount, adjusted_amount, payment_method_id, expense_id, note
       ) VALUES (?, ?, ?, ?, 0.00, ?, ?, ?)`,
      [
        cleanId,
        cleanStaffId,
        input.date,
        amount,
        Number(input.payment_method_id),
        expenseId,
        input.note ? input.note.trim() : null,
      ]
    );

    return {
      success: true,
      id: advRes?.insertId,
      expenseId,
      message: 'Advance recorded and logged in Expenses.',
    };
  } catch (error: any) {
    console.error('Failed to create staff advance:', error);
    return { success: false, error: error?.message || 'Failed to grant advance.' };
  }
}

/**
 * Soft delete staff advance and corresponding auto-expense.
 */
export async function deleteStaffAdvanceAction(
  restaurantId: string | number,
  advanceId: number | string
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanAdvId = Number(advanceId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const [advRows]: any = await pool.execute(
      `SELECT expense_id FROM staff_advances WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL LIMIT 1`,
      [cleanAdvId, cleanId]
    );
    const expenseId = advRows?.[0]?.expense_id;

    await pool.execute(
      `UPDATE staff_advances SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?`,
      [cleanAdvId, cleanId]
    );

    if (expenseId) {
      await pool.execute(
        `UPDATE expenses SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?`,
        [expenseId, cleanId]
      );
    }

    return { success: true, message: 'Staff advance and linked expense removed.' };
  } catch (error: any) {
    console.error('Failed to delete staff advance:', error);
    return { success: false, error: error?.message || 'Failed to delete advance.' };
  }
}

/**
 * Fetch detailed staff profile, attendance history, monthly salary history, and advances.
 */
export async function getStaffDetailsAction(
  restaurantId: string | number,
  staffId: number | string,
  month?: string
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanStaffId = Number(staffId);
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    // 1. Staff Profile
    const [staffRows]: any = await pool.execute(
      `SELECT * FROM staff WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL LIMIT 1`,
      [cleanStaffId, cleanId]
    );

    if (!Array.isArray(staffRows) || staffRows.length === 0) {
      return { success: false, error: 'Staff member not found.' };
    }
    const staff = staffRows[0];

    // 2. Attendance Summary for selected month
    const [attRows]: any = await pool.execute(
      `SELECT 
         status, COUNT(*) as count 
       FROM staff_attendance 
       WHERE staff_id = ? AND restaurant_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?
       GROUP BY status`,
      [cleanStaffId, cleanId, targetMonth]
    );
    const attendanceSummary = {
      present: 0,
      absent: 0,
      leave: 0,
      half_day: 0,
    };
    for (const a of (attRows || [])) {
      if (a.status in attendanceSummary) {
        (attendanceSummary as any)[a.status] = Number(a.count);
      }
    }

    // 3. Salary History
    const [salaryRows]: any = await pool.execute(
      `SELECT 
         r.*,
         pm.name as payment_method_name
       FROM staff_salary_records r
       LEFT JOIN payment_methods pm ON r.payment_method_id = pm.id
       WHERE r.staff_id = ? AND r.restaurant_id = ? AND r.deleted_at IS NULL
       ORDER BY r.month DESC`,
      [cleanStaffId, cleanId]
    );

    // 4. Advances History
    const [advRows]: any = await pool.execute(
      `SELECT 
         a.*,
         DATE_FORMAT(a.date, '%Y-%m-%d') as date,
         pm.name as payment_method_name,
         (a.amount - a.adjusted_amount) as remaining_balance
       FROM staff_advances a
       LEFT JOIN payment_methods pm ON a.payment_method_id = pm.id
       WHERE a.staff_id = ? AND a.restaurant_id = ? AND a.deleted_at IS NULL
       ORDER BY a.date DESC`,
      [cleanStaffId, cleanId]
    );

    // Pending advance total
    const pendingAdvance = (advRows || []).reduce((acc: number, item: any) => acc + Number(item.remaining_balance || 0), 0);

    // 5. Commissions History (for parlour staff)
    const [commRows]: any = await pool.execute(
      `SELECT c.*, COALESCE(srv.name, 'Custom Service') as service_name, DATE_FORMAT(c.date, '%Y-%m-%d') as date
       FROM staff_commissions c
       LEFT JOIN services srv ON c.service_id = srv.id
       WHERE c.staff_id = ? AND c.restaurant_id = ? AND c.deleted_at IS NULL
       ORDER BY c.date DESC
       LIMIT 50`,
      [cleanStaffId, cleanId]
    );

    return {
      success: true,
      data: {
        staff: {
          ...staff,
          pending_advance: pendingAdvance,
        },
        attendance_summary: attendanceSummary,
        salaries: salaryRows || [],
        advances: advRows || [],
        commissions: commRows || [],
        month: targetMonth,
      },
      isPro: true,
    };
  } catch (error: any) {
    console.error('Failed to get staff details:', error);
    return { success: false, error: error?.message || 'Failed to retrieve staff details.' };
  }
}

/* ========================================================================== */
/*               STEP 4.5: PARLOUR SERVICES & COMMISSIONS ACTIONS            */
/* ========================================================================== */

/**
 * Synchronize an unpaid salary record when commissions/tips for that month change.
 * If a salary record exists and paid_amount === 0 (or null), recalculates commission_amount, tip_amount, and net_payable.
 */
async function syncUnpaidSalaryRecordForStaffMonth(
  restaurantId: string,
  staffId: number,
  month: string
) {
  try {
    const [salRows]: any = await pool.execute(
      `SELECT id, base_salary, bonus, overtime, deduction, advance_adjusted, paid_amount 
       FROM staff_salary_records 
       WHERE restaurant_id = ? AND staff_id = ? AND month = ? AND deleted_at IS NULL LIMIT 1`,
      [restaurantId, staffId, month]
    );

    if (!Array.isArray(salRows) || salRows.length === 0) return;
    const sal = salRows[0];
    if (Number(sal.paid_amount || 0) > 0) return; // Do not touch if already paid or partially paid

    const [commTotals]: any = await pool.execute(
      `SELECT 
         COALESCE(SUM(commission_amount), 0) as total_comm,
         COALESCE(SUM(tip_amount), 0) as total_tips
       FROM staff_commissions
       WHERE restaurant_id = ? AND staff_id = ? AND DATE_FORMAT(date, '%Y-%m') = ? AND deleted_at IS NULL`,
      [restaurantId, staffId, month]
    );

    const totalComm = Number(commTotals?.[0]?.total_comm || 0);
    const totalTips = Number(commTotals?.[0]?.total_tips || 0);
    const baseSalary = Number(sal.base_salary || 0);
    const bonus = Number(sal.bonus || 0);
    const overtime = Number(sal.overtime || 0);
    const deduction = Number(sal.deduction || 0);
    const advanceAdjusted = Number(sal.advance_adjusted || 0);

    const newNetPayable = Math.max(0, baseSalary + bonus + overtime + totalComm + totalTips - deduction - advanceAdjusted);

    await pool.execute(
      `UPDATE staff_salary_records SET
         commission_amount = ?,
         tip_amount = ?,
         net_payable = ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [totalComm, totalTips, newNetPayable, sal.id]
    );

    await pool.execute(
      `UPDATE staff_commissions SET salary_record_id = ? 
       WHERE restaurant_id = ? AND staff_id = ? AND DATE_FORMAT(date, '%Y-%m') = ? AND deleted_at IS NULL`,
      [sal.id, restaurantId, staffId, month]
    );
  } catch (err) {
    console.error('Failed to sync unpaid salary record:', err);
  }
}

/**
 * Fetch services for parlour commission tracking.
 */
export async function getServicesAction(restaurantId?: string | number) {
  try {
    await ensureAccountsTables();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const businessType = await getClientBusinessType(cleanId);
    if (businessType !== 'parlour') {
      return { success: false, error: 'Services and staff commissions are only available for parlour accounts.' };
    }

    const [rows]: any = await pool.execute(
      `SELECT id, restaurant_id, name, price, default_commission_type, default_commission_value, is_active, created_at 
       FROM services 
       WHERE restaurant_id = ? AND deleted_at IS NULL 
       ORDER BY is_active DESC, name ASC`,
      [cleanId]
    );

    return {
      success: true,
      data: Array.isArray(rows) ? rows : [],
      isPro: true,
    };
  } catch (error: any) {
    console.error('Failed to get services:', error);
    return { success: false, error: error?.message || 'Failed to retrieve services.' };
  }
}

/**
 * Add a new parlour service.
 */
export async function createServiceAction(restaurantId: string | number, input: CreateServiceInput) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const businessType = await getClientBusinessType(cleanId);
    if (businessType !== 'parlour') {
      return { success: false, error: 'Services and staff commissions are only available for parlour accounts.' };
    }

    const trimmedName = (input.name || '').trim();
    if (!trimmedName) {
      return { success: false, error: 'Service name is required.' };
    }

    const price = Math.max(0, Number(input.price || 0));
    const commType = input.default_commission_type === 'fixed' ? 'fixed' : 'percent';
    let commVal = Math.max(0, Number(input.default_commission_value || 0));

    if (commType === 'percent' && commVal > 100) {
      return { success: false, error: 'Percentage commission cannot exceed 100%.' };
    }
    if (commType === 'fixed' && commVal > price) {
      return { success: false, error: 'Fixed commission cannot exceed the service price.' };
    }

    const [res]: any = await pool.execute(
      `INSERT INTO services (restaurant_id, name, price, default_commission_type, default_commission_value) 
       VALUES (?, ?, ?, ?, ?)`,
      [cleanId, trimmedName, price, commType, commVal]
    );

    return {
      success: true,
      id: res.insertId,
      message: 'Service added successfully.',
    };
  } catch (error: any) {
    console.error('Failed to create service:', error);
    return { success: false, error: error?.message || 'Failed to add service.' };
  }
}

/**
 * Update an existing service.
 */
export async function updateServiceAction(
  restaurantId: string | number,
  serviceId: number | string,
  input: UpdateServiceInput
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanServId = Number(serviceId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const businessType = await getClientBusinessType(cleanId);
    if (businessType !== 'parlour') {
      return { success: false, error: 'Services and staff commissions are only available for parlour accounts.' };
    }

    // Verify service belongs to this restaurant
    const [existingRows]: any = await pool.execute(
      `SELECT * FROM services WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL LIMIT 1`,
      [cleanServId, cleanId]
    );
    if (!Array.isArray(existingRows) || existingRows.length === 0) {
      return { success: false, error: 'Service not found or does not belong to this account.' };
    }
    const currentService = existingRows[0];

    const updates: string[] = [];
    const values: any[] = [];

    const effectivePrice = input.price !== undefined ? Math.max(0, Number(input.price || 0)) : Number(currentService.price || 0);
    const effectiveCommType = input.default_commission_type !== undefined ? (input.default_commission_type === 'fixed' ? 'fixed' : 'percent') : currentService.default_commission_type;
    let effectiveCommVal = input.default_commission_value !== undefined ? Math.max(0, Number(input.default_commission_value || 0)) : Number(currentService.default_commission_value || 0);

    if (effectiveCommType === 'percent' && effectiveCommVal > 100) {
      return { success: false, error: 'Percentage commission cannot exceed 100%.' };
    }
    if (effectiveCommType === 'fixed' && effectiveCommVal > effectivePrice) {
      return { success: false, error: 'Fixed commission cannot exceed the service price.' };
    }

    if (input.name !== undefined) {
      const trimmed = input.name.trim();
      if (!trimmed) return { success: false, error: 'Service name cannot be empty.' };
      updates.push('name = ?');
      values.push(trimmed);
    }
    if (input.price !== undefined) {
      updates.push('price = ?');
      values.push(effectivePrice);
    }
    if (input.default_commission_type !== undefined) {
      updates.push('default_commission_type = ?');
      values.push(effectiveCommType);
    }
    if (input.default_commission_value !== undefined) {
      updates.push('default_commission_value = ?');
      values.push(effectiveCommVal);
    }
    if (input.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(Boolean(input.is_active));
    }

    if (updates.length === 0) {
      return { success: false, error: 'No fields to update.' };
    }

    values.push(cleanServId, cleanId);
    await pool.execute(
      `UPDATE services SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?`,
      values
    );

    return { success: true, message: 'Service updated successfully.' };
  } catch (error: any) {
    console.error('Failed to update service:', error);
    return { success: false, error: error?.message || 'Failed to update service.' };
  }
}

/**
 * Delete a service (soft delete).
 */
export async function deleteServiceAction(restaurantId: string | number, serviceId: number | string) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanServId = Number(serviceId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const businessType = await getClientBusinessType(cleanId);
    if (businessType !== 'parlour') {
      return { success: false, error: 'Services and staff commissions are only available for parlour accounts.' };
    }

    await pool.execute(
      `UPDATE services SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?`,
      [cleanServId, cleanId]
    );

    return { success: true, message: 'Service deleted successfully.' };
  } catch (error: any) {
    console.error('Failed to delete service:', error);
    return { success: false, error: error?.message || 'Failed to delete service.' };
  }
}

/**
 * Fetch commissions list with staff, service details, and salary lock status.
 */
export async function getStaffCommissionsAction(params: GetStaffCommissionsParams) {
  try {
    await ensureAccountsTables();
    const authCheck = await resolveAuthenticatedRestaurantId(params.restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const businessType = await getClientBusinessType(cleanId);
    if (businessType !== 'parlour') {
      return { success: false, error: 'Services and staff commissions are only available for parlour accounts.' };
    }

    const conditions: string[] = ['c.restaurant_id = ?', 'c.deleted_at IS NULL'];
    const queryParams: any[] = [cleanId];

    if (params.staffId && String(params.staffId) !== 'all') {
      conditions.push('c.staff_id = ?');
      queryParams.push(Number(params.staffId));
    }

    if (params.month) {
      conditions.push("DATE_FORMAT(c.date, '%Y-%m') = ?");
      queryParams.push(params.month);
    } else {
      if (params.fromDate) {
        conditions.push('c.date >= ?');
        queryParams.push(params.fromDate);
      }
      if (params.toDate) {
        conditions.push('c.date <= ?');
        queryParams.push(params.toDate);
      }
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [rows]: any = await pool.execute(
      `SELECT 
         c.id,
         c.restaurant_id,
         c.staff_id,
         s.name as staff_name,
         s.role as staff_role,
         c.service_id,
         COALESCE(srv.name, 'Custom Service') as service_name,
         DATE_FORMAT(c.date, '%Y-%m-%d') as date,
         c.service_amount,
         c.commission_amount,
         c.tip_amount,
         c.customer_name,
         c.note,
         c.salary_record_id,
         c.created_at,
         (
           SELECT COALESCE(r.paid_amount, 0) > 0 
           FROM staff_salary_records r 
           WHERE r.restaurant_id = c.restaurant_id 
             AND r.staff_id = c.staff_id 
             AND r.month = DATE_FORMAT(c.date, '%Y-%m') 
             AND r.deleted_at IS NULL 
           LIMIT 1
         ) as is_locked
       FROM staff_commissions c
       JOIN staff s ON c.staff_id = s.id
       LEFT JOIN services srv ON c.service_id = srv.id
       ${whereClause}
       ORDER BY c.date DESC, c.id DESC`,
      queryParams
    );

    const commissionList = (Array.isArray(rows) ? rows : []).map((r) => ({
      ...r,
      is_locked: Boolean(r.is_locked),
    }));

    const totalServices = commissionList.length;
    const totalServiceAmount = commissionList.reduce((acc, r) => acc + Number(r.service_amount || 0), 0);
    const totalCommissionAmount = commissionList.reduce((acc, r) => acc + Number(r.commission_amount || 0), 0);
    const totalTipAmount = commissionList.reduce((acc, r) => acc + Number(r.tip_amount || 0), 0);

    return {
      success: true,
      data: commissionList,
      summary: {
        totalServices,
        totalServiceAmount,
        totalCommissionAmount,
        totalTipAmount,
      },
      isPro: true,
    };
  } catch (error: any) {
    console.error('Failed to get staff commissions:', error);
    return { success: false, error: error?.message || 'Failed to retrieve commissions.' };
  }
}

/**
 * Record a new staff commission entry with server-side validation & recalculation.
 */
export async function createStaffCommissionAction(
  restaurantId: string | number,
  input: CreateStaffCommissionInput
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanStaffId = Number(input.staff_id);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const businessType = await getClientBusinessType(cleanId);
    if (businessType !== 'parlour') {
      return { success: false, error: 'Services and staff commissions are only available for parlour accounts.' };
    }

    if (!cleanStaffId) {
      return { success: false, error: 'Staff member is required.' };
    }
    if (!input.date) {
      return { success: false, error: 'Date is required.' };
    }

    // 1. Verify staff belongs to this restaurant
    const [staffRows]: any = await pool.execute(
      `SELECT id, commission_type, commission_value FROM staff WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL LIMIT 1`,
      [cleanStaffId, cleanId]
    );
    if (!Array.isArray(staffRows) || staffRows.length === 0) {
      return { success: false, error: 'Staff member not found or does not belong to this account.' };
    }
    const staff = staffRows[0];

    // 2. Lock check: cannot add commission if month already has salary disbursements (paid_amount > 0)
    const commMonth = String(input.date).slice(0, 7);
    const [salRows]: any = await pool.execute(
      `SELECT id, paid_amount FROM staff_salary_records WHERE restaurant_id = ? AND staff_id = ? AND month = ? AND deleted_at IS NULL LIMIT 1`,
      [cleanId, cleanStaffId, commMonth]
    );
    if (Array.isArray(salRows) && salRows.length > 0 && Number(salRows[0].paid_amount || 0) > 0) {
      return {
        success: false,
        error: `Cannot record commission: salary for this staff member in month ${commMonth} already has disbursements (paid_amount > 0).`,
      };
    }

    // 3. Verify service belongs to this restaurant if provided
    let service: any = null;
    const serviceId = input.service_id && input.service_id !== 'custom' ? Number(input.service_id) : null;
    if (serviceId) {
      const [srvRows]: any = await pool.execute(
        `SELECT id, name, price, default_commission_type, default_commission_value FROM services WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL LIMIT 1`,
        [serviceId, cleanId]
      );
      if (!Array.isArray(srvRows) || srvRows.length === 0) {
        return { success: false, error: 'Service not found or does not belong to this account.' };
      }
      service = srvRows[0];
    }

    // 4. Validate amounts
    const serviceAmount = Math.max(0, Number(input.service_amount || (service ? service.price : 0)));
    const tipAmount = Math.max(0, Number(input.tip_amount || 0));

    // 5. Server-side Commission Recalculation (Staff custom override takes priority over service default rate)
    let calculatedComm = 0;
    if (staff.commission_value != null && Number(staff.commission_value) > 0) {
      const type = staff.commission_type || 'percent';
      const val = Number(staff.commission_value);
      if (type === 'percent') {
        const rate = Math.min(100, Math.max(0, val));
        calculatedComm = Math.round(((serviceAmount * rate) / 100) * 100) / 100;
      } else {
        calculatedComm = Math.max(0, val);
      }
    } else if (service && service.default_commission_value != null && Number(service.default_commission_value) > 0) {
      const type = service.default_commission_type || 'percent';
      const val = Number(service.default_commission_value);
      if (type === 'percent') {
        const rate = Math.min(100, Math.max(0, val));
        calculatedComm = Math.round(((serviceAmount * rate) / 100) * 100) / 100;
      } else {
        calculatedComm = Math.max(0, val);
      }
    } else {
      // Manual / custom commission value with boundary checks
      calculatedComm = Math.max(0, Number(input.commission_amount || 0));
    }

    // Boundary check: commission cannot exceed service bill amount
    calculatedComm = Math.min(calculatedComm, serviceAmount);

    const [res]: any = await pool.execute(
      `INSERT INTO staff_commissions (
         restaurant_id, staff_id, service_id, date, service_amount, commission_amount, tip_amount, customer_name, note
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cleanId,
        cleanStaffId,
        serviceId,
        input.date,
        serviceAmount,
        calculatedComm,
        tipAmount,
        input.customer_name ? input.customer_name.trim() : null,
        input.note ? input.note.trim() : null,
      ]
    );

    // Sync unpaid salary record if already generated
    await syncUnpaidSalaryRecordForStaffMonth(cleanId, cleanStaffId, commMonth);

    return {
      success: true,
      id: res.insertId,
      commission_amount: calculatedComm,
      message: 'Commission recorded successfully.',
    };
  } catch (error: any) {
    console.error('Failed to create staff commission:', error);
    return { success: false, error: error?.message || 'Failed to record commission.' };
  }
}

/**
 * Update an existing staff commission entry.
 */
export async function updateStaffCommissionAction(
  restaurantId: string | number,
  commissionId: number | string,
  input: UpdateStaffCommissionInput
) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanCommId = Number(commissionId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const businessType = await getClientBusinessType(cleanId);
    if (businessType !== 'parlour') {
      return { success: false, error: 'Services and staff commissions are only available for parlour accounts.' };
    }

    // 1. Fetch existing commission
    const [commRows]: any = await pool.execute(
      `SELECT * FROM staff_commissions WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL LIMIT 1`,
      [cleanCommId, cleanId]
    );
    if (!Array.isArray(commRows) || commRows.length === 0) {
      return { success: false, error: 'Commission record not found.' };
    }
    const oldComm = commRows[0];
    const oldStaffId = Number(oldComm.staff_id);
    const oldMonth = String(oldComm.date).slice(0, 7);

    // 2. Lock check on OLD staff and OLD month: cannot edit if paid_amount > 0
    const [oldSalRows]: any = await pool.execute(
      `SELECT id, paid_amount FROM staff_salary_records WHERE restaurant_id = ? AND staff_id = ? AND month = ? AND deleted_at IS NULL LIMIT 1`,
      [cleanId, oldStaffId, oldMonth]
    );
    if (Array.isArray(oldSalRows) && oldSalRows.length > 0 && Number(oldSalRows[0].paid_amount || 0) > 0) {
      return {
        success: false,
        error: `Cannot modify commission: salary for this staff member in month ${oldMonth} already has disbursements (paid_amount > 0).`,
      };
    }

    // 3. New staff and New date / month check
    const newStaffId = input.staff_id !== undefined ? Number(input.staff_id) : oldStaffId;
    const newDate = input.date !== undefined ? input.date : String(oldComm.date).slice(0, 10);
    const newMonth = newDate.slice(0, 7);

    if (newStaffId !== oldStaffId || newMonth !== oldMonth) {
      const [newSalRows]: any = await pool.execute(
        `SELECT id, paid_amount FROM staff_salary_records WHERE restaurant_id = ? AND staff_id = ? AND month = ? AND deleted_at IS NULL LIMIT 1`,
        [cleanId, newStaffId, newMonth]
      );
      if (Array.isArray(newSalRows) && newSalRows.length > 0 && Number(newSalRows[0].paid_amount || 0) > 0) {
        return {
          success: false,
          error: `Cannot move commission to month ${newMonth}: salary for that staff member already has disbursements (paid_amount > 0).`,
        };
      }
    }

    // 4. Verify staff belongs to this restaurant
    const [staffRows]: any = await pool.execute(
      `SELECT id, commission_type, commission_value FROM staff WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL LIMIT 1`,
      [newStaffId, cleanId]
    );
    if (!Array.isArray(staffRows) || staffRows.length === 0) {
      return { success: false, error: 'Target staff member not found or does not belong to this account.' };
    }
    const staff = staffRows[0];

    // 5. Verify service belongs to this restaurant if provided
    let service: any = null;
    const newServiceId =
      input.service_id !== undefined
        ? input.service_id && input.service_id !== 'custom'
          ? Number(input.service_id)
          : null
        : oldComm.service_id;

    if (newServiceId) {
      const [srvRows]: any = await pool.execute(
        `SELECT id, name, price, default_commission_type, default_commission_value FROM services WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL LIMIT 1`,
        [newServiceId, cleanId]
      );
      if (!Array.isArray(srvRows) || srvRows.length === 0) {
        return { success: false, error: 'Service not found or does not belong to this account.' };
      }
      service = srvRows[0];
    }

    // 6. Validate amounts
    const serviceAmount = Math.max(
      0,
      Number(input.service_amount !== undefined ? input.service_amount : oldComm.service_amount)
    );
    const tipAmount = Math.max(
      0,
      Number(input.tip_amount !== undefined ? input.tip_amount : oldComm.tip_amount)
    );

    // 7. Server-side Commission Recalculation
    let calculatedComm = 0;
    if (staff.commission_value != null && Number(staff.commission_value) > 0) {
      const type = staff.commission_type || 'percent';
      const val = Number(staff.commission_value);
      if (type === 'percent') {
        const rate = Math.min(100, Math.max(0, val));
        calculatedComm = Math.round(((serviceAmount * rate) / 100) * 100) / 100;
      } else {
        calculatedComm = Math.max(0, val);
      }
    } else if (service && service.default_commission_value != null && Number(service.default_commission_value) > 0) {
      const type = service.default_commission_type || 'percent';
      const val = Number(service.default_commission_value);
      if (type === 'percent') {
        const rate = Math.min(100, Math.max(0, val));
        calculatedComm = Math.round(((serviceAmount * rate) / 100) * 100) / 100;
      } else {
        calculatedComm = Math.max(0, val);
      }
    } else {
      calculatedComm = Math.max(
        0,
        Number(input.commission_amount !== undefined ? input.commission_amount : oldComm.commission_amount)
      );
    }

    calculatedComm = Math.min(calculatedComm, serviceAmount);

    const customerName =
      input.customer_name !== undefined
        ? input.customer_name
          ? input.customer_name.trim()
          : null
        : oldComm.customer_name;
    const note =
      input.note !== undefined ? (input.note ? input.note.trim() : null) : oldComm.note;

    await pool.execute(
      `UPDATE staff_commissions SET
         staff_id = ?, service_id = ?, date = ?, service_amount = ?, commission_amount = ?, tip_amount = ?, customer_name = ?, note = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND restaurant_id = ?`,
      [
        newStaffId,
        newServiceId,
        newDate,
        serviceAmount,
        calculatedComm,
        tipAmount,
        customerName,
        note,
        cleanCommId,
        cleanId,
      ]
    );

    // Sync unpaid salary records
    await syncUnpaidSalaryRecordForStaffMonth(cleanId, oldStaffId, oldMonth);
    if (newStaffId !== oldStaffId || newMonth !== oldMonth) {
      await syncUnpaidSalaryRecordForStaffMonth(cleanId, newStaffId, newMonth);
    }

    return {
      success: true,
      commission_amount: calculatedComm,
      message: 'Commission updated successfully.',
    };
  } catch (error: any) {
    console.error('Failed to update staff commission:', error);
    return { success: false, error: error?.message || 'Failed to update commission.' };
  }
}

/**
 * Delete a staff commission entry with lock protection and unpaid salary sync.
 */
export async function deleteStaffCommissionAction(restaurantId: string | number, commissionId: number | string) {
  try {
    await ensureAccountsTables();
    const cleanId = String(restaurantId || '').trim();
    const cleanCommId = Number(commissionId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const businessType = await getClientBusinessType(cleanId);
    if (businessType !== 'parlour') {
      return { success: false, error: 'Services and staff commissions are only available for parlour accounts.' };
    }

    // 1. Fetch commission
    const [commRows]: any = await pool.execute(
      `SELECT * FROM staff_commissions WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL LIMIT 1`,
      [cleanCommId, cleanId]
    );
    if (!Array.isArray(commRows) || commRows.length === 0) {
      return { success: false, error: 'Commission record not found.' };
    }
    const comm = commRows[0];
    const commStaffId = Number(comm.staff_id);
    const commMonth = String(comm.date).slice(0, 7);

    // 2. Lock check: cannot delete if salary for this staff member in this month has paid_amount > 0
    const [salRows]: any = await pool.execute(
      `SELECT id, paid_amount FROM staff_salary_records WHERE restaurant_id = ? AND staff_id = ? AND month = ? AND deleted_at IS NULL LIMIT 1`,
      [cleanId, commStaffId, commMonth]
    );
    if (Array.isArray(salRows) && salRows.length > 0 && Number(salRows[0].paid_amount || 0) > 0) {
      return {
        success: false,
        error: `Cannot delete commission: salary for this staff member in month ${commMonth} already has disbursements (paid_amount > 0).`,
      };
    }

    await pool.execute(
      `UPDATE staff_commissions SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?`,
      [cleanCommId, cleanId]
    );

    // 3. Sync unpaid salary record if exists
    await syncUnpaidSalaryRecordForStaffMonth(cleanId, commStaffId, commMonth);

    return { success: true, message: 'Commission record removed successfully.' };
  } catch (error: any) {
    console.error('Failed to delete staff commission:', error);
    return { success: false, error: error?.message || 'Failed to remove commission.' };
  }
}

/* ========================================================================== */
/*                 STEP 4.5: PARLOUR INCOMES & CUSTOMER DUE ACTIONS           */
/* ========================================================================== */

export interface CreateIncomeInput {
  date: string;
  amount: number | string;
  payment_method_id?: number | string | null;
  service_id?: number | string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  table_number?: string | null;
  order_id?: string | null;
  created_by?: string | null;
  note?: string | null;
}

export interface UpdateIncomeInput {
  date?: string;
  amount?: number | string;
  payment_method_id?: number | string | null;
  service_id?: number | string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  note?: string | null;
}

export interface GetIncomesParams {
  restaurantId?: string | number;
  fromDate?: string;
  toDate?: string;
  serviceId?: number | string;
  paymentMethodId?: number | string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateCustomerDueInput {
  customer_name: string;
  phone?: string | null;
  service_id?: number | string | null;
  total_amount: number | string;
  advance_paid?: number | string;
  advance_payment_method_id?: number | string | null;
  due_date?: string | null;
  note?: string | null;
}

export interface UpdateCustomerDueInput {
  customer_name?: string;
  phone?: string | null;
  service_id?: number | string | null;
  total_amount?: number | string;
  due_date?: string | null;
  note?: string | null;
}

export interface CollectCustomerDuePaymentInput {
  date: string;
  amount: number | string;
  payment_method_id?: number | string | null;
  note?: string | null;
}

export interface GetCustomersDueParams {
  restaurantId?: string | number;
  status?: 'all' | 'unpaid' | 'partial' | 'paid';
  search?: string;
  page?: number;
  limit?: number;
}

async function ensureParlourAccount(cleanId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const businessType = await getClientBusinessType(cleanId);
    if (businessType !== 'parlour') {
      return { success: false, error: 'Income tracking and customer due are only available for parlour accounts.' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Client account not found.' };
  }
}

async function verifyServiceBelongs(serviceId: number | string, restaurantId: string): Promise<boolean> {
  const [rows]: any = await pool.execute(
    `SELECT id FROM services WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL LIMIT 1`,
    [Number(serviceId), restaurantId]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function verifyPaymentMethodBelongs(paymentMethodId: number | string, restaurantId: string): Promise<boolean> {
  const pmId = Number(paymentMethodId);
  if (pmId >= 1 && pmId <= 5) return true;
  const [rows]: any = await pool.execute(
    `SELECT id FROM payment_methods WHERE id = ? AND (restaurant_id = ? OR is_default = 1) AND deleted_at IS NULL LIMIT 1`,
    [pmId, restaurantId]
  );
  return Array.isArray(rows) && rows.length > 0;
}

/**
 * Automatically synchronizes completed customer orders for a restaurant into incomes
 */
export async function syncCompletedOrdersForRestaurant(restaurantId: string): Promise<number> {
  try {
    // 1. Get client's business_name and id
    const [cRows]: any = await pool.execute(
      `SELECT id, business_name FROM clients WHERE id = ? OR business_name = ? LIMIT 1`,
      [restaurantId, String(restaurantId)]
    );
    const clientId = cRows && cRows.length > 0 ? Number(cRows[0].id) : (Number(restaurantId) || null);
    const businessName = cRows && cRows.length > 0 ? cRows[0].business_name : restaurantId;

    // 2. Strict tenant isolation: match orders that belong to this client
    let orderMatchClause = '';
    const queryParams: any[] = [];
    if (clientId) {
      // If clientId is known, match by client_id strictly. 
      // Only fall back to business_name if co.client_id is NULL (legacy unassigned orders)
      orderMatchClause = `((co.client_id = ?) OR (co.client_id IS NULL AND co.business_name = ?))`;
      queryParams.push(clientId, String(businessName || ''));
    } else {
      orderMatchClause = `(co.business_name = ?)`;
      queryParams.push(String(businessName || restaurantId || ''));
    }

    const [orders]: any = await pool.execute(
      `SELECT 
         co.order_id, co.client_id, co.business_name, co.customer_name, co.customer_phone, 
         co.table_number, co.special_note, co.total_amount, co.created_at,
         inc.id AS existing_income_id, inc.deleted_at AS income_deleted_at
       FROM customer_orders co
       LEFT JOIN incomes inc ON (
         co.order_id COLLATE utf8mb4_unicode_ci = inc.order_id COLLATE utf8mb4_unicode_ci
         AND inc.restaurant_id = ?
       )
       WHERE ${orderMatchClause}
         AND co.status = 'completed'
         AND (inc.id IS NULL OR inc.deleted_at IS NOT NULL)`,
      [String(clientId || restaurantId), ...queryParams]
    );

    if (!Array.isArray(orders) || orders.length === 0) {
      return 0;
    }

    let syncedCount = 0;
    for (const ord of orders) {
      const orderDate = ord.created_at
        ? new Date(ord.created_at).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      const tableInfo = ord.table_number ? ` (Table ${ord.table_number})` : '';
      const custName = ((ord.customer_name || 'Customer') + tableInfo).slice(0, 150);
      const custPhone = ord.customer_phone ? String(ord.customer_phone).trim() : null;
      const noteText = ord.special_note ? String(ord.special_note).trim() : null;

      if (ord.existing_income_id) {
        await pool.execute(
          `UPDATE incomes 
           SET deleted_at = NULL, amount = ?, date = ?, customer_name = ?, customer_phone = ?, note = ?, updated_at = NOW() 
           WHERE id = ?`,
          [Number(ord.total_amount) || 0, orderDate, custName, custPhone, noteText, ord.existing_income_id]
        );
      } else {
        await pool.execute(
          `INSERT INTO incomes (
            restaurant_id,
            date,
            amount,
            payment_method_id,
            customer_name,
            customer_phone,
            order_id,
            created_by,
            note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            String(clientId || restaurantId),
            orderDate,
            Number(ord.total_amount) || 0,
            1, // Cash
            custName,
            custPhone,
            ord.order_id,
            'QR Order',
            noteText
          ]
        );
      }
      syncedCount++;
    }

    // Backfill any existing incomes that don't have customer_phone yet
    try {
      await pool.execute(`
        UPDATE incomes inc
        JOIN customer_orders co ON (inc.order_id COLLATE utf8mb4_unicode_ci = co.order_id COLLATE utf8mb4_unicode_ci)
        SET inc.customer_phone = co.customer_phone
        WHERE (inc.customer_phone IS NULL OR inc.customer_phone = '') 
          AND co.customer_phone IS NOT NULL AND co.customer_phone != ''
      `);
    } catch {}

    // Clean up redundant auto-generated note text for QR orders so table/phone/name are not repeated
    try {
      await pool.execute(`
        UPDATE incomes inc
        JOIN customer_orders co ON (inc.order_id COLLATE utf8mb4_unicode_ci = co.order_id COLLATE utf8mb4_unicode_ci)
        SET inc.note = NULLIF(TRIM(co.special_note), '')
        WHERE inc.created_by = 'QR Order' 
          AND (inc.note LIKE 'Customer QR Order #%' OR inc.note LIKE 'QR Order #%' OR inc.note LIKE 'Table %')
      `);
    } catch {}

    // Multi-tenant safety: Ensure incomes linked to customer_orders always belong to the actual order's client_id
    try {
      await pool.execute(`
        UPDATE incomes inc
        JOIN customer_orders co ON (inc.order_id COLLATE utf8mb4_unicode_ci = co.order_id COLLATE utf8mb4_unicode_ci)
        SET inc.restaurant_id = CAST(co.client_id AS CHAR)
        WHERE co.client_id IS NOT NULL 
          AND inc.restaurant_id != CAST(co.client_id AS CHAR)
      `);
    } catch {}

    return syncedCount;
  } catch (err) {
    console.warn('Completed orders auto-sync error:', err);
    return 0;
  }
}

/**
 * Fetch paginated incomes for restaurant & parlour accounts with search, filter, and KPI summary.
 */
export async function getIncomesAction(restaurantId?: string | number, params?: GetIncomesParams) {
  try {
    await ensureAccountsTables();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId || params?.restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    // Auto-sync completed customer orders for this restaurant into incomes
    await syncCompletedOrdersForRestaurant(cleanId);

    const conditions = ['i.restaurant_id = ?', 'i.deleted_at IS NULL'];
    const queryParams: any[] = [cleanId];

    if (params?.fromDate) {
      conditions.push('i.date >= ?');
      queryParams.push(params.fromDate);
    }
    if (params?.toDate) {
      conditions.push('i.date <= ?');
      queryParams.push(params.toDate);
    }
    if (params?.serviceId) {
      conditions.push('i.service_id = ?');
      queryParams.push(Number(params.serviceId));
    }
    if (params?.paymentMethodId) {
      conditions.push('i.payment_method_id = ?');
      queryParams.push(Number(params.paymentMethodId));
    }
    if (params?.search && params.search.trim()) {
      conditions.push('(i.customer_name LIKE ? OR i.customer_phone LIKE ? OR i.note LIKE ? OR i.order_id LIKE ?)');
      const s = `%${params.search.trim()}%`;
      queryParams.push(s, s, s, s);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Total count
    const [countRows]: any = await pool.execute(
      `SELECT COUNT(*) as total FROM incomes i ${whereClause}`,
      queryParams
    );
    const totalCount = Number(countRows?.[0]?.total || 0);

    const pagination = getPagination(params?.page || 1, params?.limit || 20);

    const sql = `
      SELECT 
        i.id,
        i.restaurant_id,
        DATE_FORMAT(i.date, '%Y-%m-%d') as date,
        i.service_id,
        s.name as service_name,
        i.amount,
        i.payment_method_id,
        pm.name as payment_method_name,
        i.customer_name,
        i.customer_phone,
        i.customer_due_id,
        i.customer_payment_id,
        i.order_id,
        i.note,
        i.created_by,
        i.created_at
      FROM incomes i
      LEFT JOIN services s ON i.service_id = s.id AND s.deleted_at IS NULL
      LEFT JOIN payment_methods pm ON i.payment_method_id = pm.id AND pm.deleted_at IS NULL
      ${whereClause}
      ORDER BY i.date DESC, i.id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows]: any = await pool.execute(sql, [...queryParams, pagination.limit, pagination.offset]);

    const dhakaNow = getDhakaDate();
    // Summary Cards (Today, Month, Filtered Total) calculated in Asia/Dhaka timezone
    const [todayRows]: any = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as today_income 
       FROM incomes 
       WHERE restaurant_id = ? AND date = ? AND deleted_at IS NULL`,
      [cleanId, dhakaNow.dateStr]
    );
    const [monthRows]: any = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as month_income 
       FROM incomes 
       WHERE restaurant_id = ? AND MONTH(date) = ? AND YEAR(date) = ? AND deleted_at IS NULL`,
      [cleanId, dhakaNow.month, dhakaNow.year]
    );
    const [totalFilteredRows]: any = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as filtered_total FROM incomes i ${whereClause}`,
      queryParams
    );

    const formattedRows = (Array.isArray(rows) ? rows : []).map((r: any) => {
      const ordId = r.order_id ? String(r.order_id) : '';
      const isManual = r.created_by === 'Manual' || r.created_by === 'Manual Order' || ordId.startsWith('ORD-M-') || ordId.startsWith('ORD-P-');
      const isQr = r.created_by === 'QR Order' || (Boolean(ordId) && !isManual);
      const isDue = Boolean(r.customer_due_id || (r.created_by && String(r.created_by).startsWith('Customer')));

      return {
        ...r,
        amount: Number(r.amount),
        customer_phone: r.customer_phone || null,
        is_auto: Boolean(isDue || isQr),
      };
    });

    return {
      success: true,
      data: formattedRows,
      summary: {
        todayIncome: Number(todayRows?.[0]?.today_income || 0),
        thisMonthIncome: Number(monthRows?.[0]?.month_income || 0),
        totalIncome: Number(totalFilteredRows?.[0]?.filtered_total || 0),
        count: totalCount,
      },
      pagination: buildPaginationMeta(totalCount, pagination),
    };
  } catch (error: any) {
    console.error('Failed to get incomes:', error);
    return { success: false, error: error?.message || 'Failed to retrieve incomes.' };
  }
}

/**
 * Record a manual income entry for parlour accounts.
 */
export async function createIncomeAction(restaurantId: string | number, input: CreateIncomeInput) {
  try {
    await ensureAccountsTables();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const amount = Number(input.amount);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Amount must be greater than 0.' };
    }

    if (!input.date) {
      return { success: false, error: 'Transaction date is required.' };
    }

    if (isFutureDate(input.date)) {
      return { success: false, error: 'Transaction date cannot be in the future.' };
    }

    const cleanServiceId = input.service_id && input.service_id !== 'custom' ? Number(input.service_id) : null;
    if (cleanServiceId) {
      const validService = await verifyServiceBelongs(cleanServiceId, cleanId);
      if (!validService) {
        return { success: false, error: 'Service not found or does not belong to this account.' };
      }
    }

    const cleanPmId = input.payment_method_id ? Number(input.payment_method_id) : 1;
    const validPm = await verifyPaymentMethodBelongs(cleanPmId, cleanId);
    if (!validPm) {
      return { success: false, error: 'Payment method not found or does not belong to this account.' };
    }

    const customerName = input.customer_name ? input.customer_name.trim() : null;
    const customerPhone = input.customer_phone ? input.customer_phone.trim() : null;
    const note = input.note ? input.note.trim() : null;

    const businessType = await getClientBusinessType(cleanId);
    let orderId = input.order_id || null;

    // Auto-generate a manual order/receipt reference (ORD-P-XXXX for parlour, ORD-M-XXXX for restaurant)
    if (!orderId) {
      const prefix = businessType === 'parlour' ? 'ORD-P' : 'ORD-M';
      orderId = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const tableInfo = input.table_number ? ` (Table ${input.table_number})` : '';
    const finalCustomerName = customerName ? (customerName + tableInfo).slice(0, 150) : (tableInfo ? `Walk-in${tableInfo}` : null);
    const createdBy = input.created_by || (orderId ? 'Manual Order' : 'Manual');

    const [res]: any = await pool.execute(
      `INSERT INTO incomes (
         restaurant_id, date, service_id, amount, payment_method_id, customer_name, customer_phone, note, order_id, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cleanId, input.date, cleanServiceId, amount, cleanPmId, finalCustomerName, customerPhone, note, orderId, createdBy]
    );

    return { success: true, incomeId: res.insertId, orderId, message: 'Income recorded successfully.' };
  } catch (error: any) {
    console.error('Failed to create income:', error);
    return { success: false, error: error?.message || 'Failed to record income.' };
  }
}

/**
 * Update a manual income entry. Auto-generated entries from customer due cannot be updated here.
 */
export async function updateIncomeAction(
  restaurantId: string | number,
  incomeId: number | string,
  input: UpdateIncomeInput
) {
  try {
    await ensureAccountsTables();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;
    const cleanIncId = Number(incomeId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const [rows]: any = await pool.execute(
      `SELECT * FROM incomes WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL LIMIT 1`,
      [cleanIncId, cleanId]
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: 'Income record not found.' };
    }
    const income = rows[0];

    // Lock auto-generated due or QR order income from editing in income page
    const ordId = income.order_id ? String(income.order_id) : '';
    const isManual = income.created_by === 'Manual' || income.created_by === 'Manual Order' || ordId.startsWith('ORD-M-') || ordId.startsWith('ORD-P-');
    const isDue = Boolean(income.customer_due_id || (income.created_by && String(income.created_by).startsWith('Customer')));
    const isQr = income.created_by === 'QR Order' || (Boolean(ordId) && !isManual);
    if (isDue || isQr) {
      return {
        success: false,
        error: isQr
          ? 'Auto-generated QR order income cannot be modified manually. Please update the order from Customer Orders.'
          : 'Auto-generated income linked to customer due cannot be modified from the Income module. Please manage it from the Customer Due module.',
      };
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (input.date !== undefined) {
      if (!input.date) return { success: false, error: 'Transaction date cannot be empty.' };
      if (isFutureDate(input.date)) return { success: false, error: 'Transaction date cannot be in the future.' };
      updates.push('date = ?');
      values.push(input.date);
    }

    if (input.amount !== undefined) {
      const amount = Number(input.amount);
      if (isNaN(amount) || amount <= 0) return { success: false, error: 'Amount must be greater than 0.' };
      updates.push('amount = ?');
      values.push(amount);
    }

    if (input.service_id !== undefined) {
      const serviceId = input.service_id && input.service_id !== 'custom' ? Number(input.service_id) : null;
      if (serviceId) {
        const validService = await verifyServiceBelongs(serviceId, cleanId);
        if (!validService) return { success: false, error: 'Service not found or does not belong to this account.' };
      }
      updates.push('service_id = ?');
      values.push(serviceId);
    }

    if (input.payment_method_id !== undefined) {
      const pmId = input.payment_method_id ? Number(input.payment_method_id) : null;
      if (pmId) {
        const validPm = await verifyPaymentMethodBelongs(pmId, cleanId);
        if (!validPm) return { success: false, error: 'Payment method not found or does not belong to this account.' };
      }
      updates.push('payment_method_id = ?');
      values.push(pmId);
    }

    if (input.customer_name !== undefined) {
      updates.push('customer_name = ?');
      values.push(input.customer_name ? input.customer_name.trim() : null);
    }

    if (input.customer_phone !== undefined) {
      updates.push('customer_phone = ?');
      values.push(input.customer_phone ? input.customer_phone.trim() : null);
    }

    if (input.note !== undefined) {
      updates.push('note = ?');
      values.push(input.note ? input.note.trim() : null);
    }

    if (updates.length === 0) {
      return { success: false, error: 'No fields to update.' };
    }

    values.push(cleanIncId, cleanId);
    await pool.execute(
      `UPDATE incomes SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?`,
      values
    );

    return { success: true, message: 'Income record updated successfully.' };
  } catch (error: any) {
    console.error('Failed to update income:', error);
    return { success: false, error: error?.message || 'Failed to update income.' };
  }
}

/**
 * Delete a manual income entry. Auto-generated entries from customer due cannot be deleted here.
 */
export async function deleteIncomeAction(restaurantId: string | number, incomeId: number | string) {
  try {
    await ensureAccountsTables();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;
    const cleanIncId = Number(incomeId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const [rows]: any = await pool.execute(
      `SELECT * FROM incomes WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL LIMIT 1`,
      [cleanIncId, cleanId]
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: 'Income record not found.' };
    }
    const income = rows[0];

    // Lock auto-generated due income from deletion in income page
    if (income.customer_due_id || (income.created_by && String(income.created_by).startsWith('Customer'))) {
      return {
        success: false,
        error: 'Auto-generated income linked to customer due cannot be deleted from the Income module. Please manage it from the Customer Due module.',
      };
    }
    const ordId = income.order_id ? String(income.order_id) : '';
    const isManual = income.created_by === 'Manual' || income.created_by === 'Manual Order' || ordId.startsWith('ORD-M-') || ordId.startsWith('ORD-P-');
    const isQr = income.created_by === 'QR Order' || (Boolean(ordId) && !isManual);
    if (isQr) {
      return {
        success: false,
        error: 'QR Order income is synced with the customer order. To remove it, update or delete the order in Customer Orders.',
      };
    }

    await pool.execute(
      `UPDATE incomes SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?`,
      [cleanIncId, cleanId]
    );

    return { success: true, message: 'Income record deleted successfully.' };
  } catch (error: any) {
    console.error('Failed to delete income:', error);
    return { success: false, error: error?.message || 'Failed to delete income.' };
  }
}

/**
 * Record a new customer due with optional advance payment and automatic income creation.
 */
export async function createCustomerDueAction(restaurantId: string | number, input: CreateCustomerDueInput) {
  try {
    await ensureAccountsTables();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const parlourGuard = await ensureParlourAccount(cleanId);
    if (!parlourGuard.success) {
      return parlourGuard;
    }

    const customerName = input.customer_name ? input.customer_name.trim() : '';
    if (!customerName) {
      return { success: false, error: 'Customer name is required.' };
    }

    const totalAmount = Number(input.total_amount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      return { success: false, error: 'Total amount must be greater than 0.' };
    }

    const advancePaid = input.advance_paid !== undefined ? Number(input.advance_paid) : 0;
    if (isNaN(advancePaid) || advancePaid < 0) {
      return { success: false, error: 'Advance paid cannot be negative.' };
    }
    if (advancePaid > totalAmount) {
      return { success: false, error: 'Advance paid cannot exceed the total amount.' };
    }

    const cleanServiceId = input.service_id && input.service_id !== 'custom' ? Number(input.service_id) : null;
    if (cleanServiceId) {
      const validService = await verifyServiceBelongs(cleanServiceId, cleanId);
      if (!validService) {
        return { success: false, error: 'Service not found or does not belong to this account.' };
      }
    }

    let cleanAdvancePmId: number | null = null;
    if (advancePaid > 0) {
      cleanAdvancePmId = input.advance_payment_method_id ? Number(input.advance_payment_method_id) : 1;
      const validPm = await verifyPaymentMethodBelongs(cleanAdvancePmId, cleanId);
      if (!validPm) {
        return { success: false, error: 'Advance payment method not found or does not belong to this account.' };
      }
    }

    const phone = input.phone ? input.phone.trim() : null;
    const dueDate = input.due_date ? input.due_date : null;
    const note = input.note ? input.note.trim() : null;

    const dueAmount = Math.max(0, Math.round((totalAmount - advancePaid) * 100) / 100);
    const initialStatus = dueAmount === 0 ? 'paid' : (advancePaid > 0 ? 'partial' : 'unpaid');

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Insert customer due
      const [dueRes]: any = await conn.execute(
        `INSERT INTO customers_due (
           restaurant_id, customer_name, phone, service_id, total_amount, advance_paid, due_amount, due_date, status, note
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [cleanId, customerName, phone, cleanServiceId, totalAmount, advancePaid, dueAmount, dueDate, initialStatus, note]
      );
      const dueId = dueRes.insertId;

      // 2. If advance_paid > 0, auto-create income copying service_id
      if (advancePaid > 0) {
        const today = getDhakaDate().dateStr;
        const incomeDesc = `Advance for Due #${dueId} - ${customerName}${note ? ` (${note})` : ''}`;
        const [incRes]: any = await conn.execute(
          `INSERT INTO incomes (
             restaurant_id, date, service_id, amount, payment_method_id, customer_name, customer_due_id, note, created_by
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Customer Advance')`,
          [cleanId, today, cleanServiceId, advancePaid, cleanAdvancePmId, customerName, dueId, incomeDesc]
        );
        const incomeId = incRes.insertId;

        await conn.execute(
          `UPDATE customers_due SET advance_income_id = ? WHERE id = ?`,
          [incomeId, dueId]
        );
      }

      await conn.commit();
      return {
        success: true,
        dueId,
        due_amount: dueAmount,
        status: initialStatus,
        message: 'Customer due recorded successfully.',
      };
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (error: any) {
    console.error('Failed to create customer due:', error);
    return { success: false, error: error?.message || 'Failed to record customer due.' };
  }
}

/**
 * Collect a payment towards a customer due with concurrency lock (SELECT ... FOR UPDATE) and auto income logging.
 */
export async function collectCustomerDuePaymentAction(
  restaurantId: string | number,
  dueId: number | string,
  input: CollectCustomerDuePaymentInput
) {
  try {
    await ensureAccountsTables();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;
    const cleanDueId = Number(dueId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const parlourGuard = await ensureParlourAccount(cleanId);
    if (!parlourGuard.success) {
      return parlourGuard;
    }

    const payAmount = Number(input.amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return { success: false, error: 'Payment amount must be greater than 0.' };
    }

    if (!input.date) {
      return { success: false, error: 'Payment date is required.' };
    }

    if (isFutureDate(input.date)) {
      return { success: false, error: 'Payment date cannot be in the future.' };
    }

    const cleanPmId = input.payment_method_id ? Number(input.payment_method_id) : 1;
    const validPm = await verifyPaymentMethodBelongs(cleanPmId, cleanId);
    if (!validPm) {
      return { success: false, error: 'Payment method not found or does not belong to this account.' };
    }

    const note = input.note ? input.note.trim() : null;

    // Transaction with row lock on customer due record
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [dueRows]: any = await conn.execute(
        `SELECT * FROM customers_due WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL FOR UPDATE`,
        [cleanDueId, cleanId]
      );
      if (!Array.isArray(dueRows) || dueRows.length === 0) {
        await conn.rollback();
        return { success: false, error: 'Customer due record not found.' };
      }
      const due = dueRows[0];
      const currentDue = Number(due.due_amount || 0);

      if (currentDue <= 0) {
        await conn.rollback();
        return { success: false, error: 'Customer due is already fully settled.' };
      }

      if (payAmount > currentDue) {
        await conn.rollback();
        return {
          success: false,
          error: `Payment amount (৳${payAmount}) exceeds remaining due balance (৳${currentDue}).`,
        };
      }

      // 1. Auto-create income entry (copying service_id!)
      const incomeDesc = `Due Collection for #${due.id} - ${due.customer_name}${note ? ` (${note})` : ''}`;
      const [incRes]: any = await conn.execute(
        `INSERT INTO incomes (
           restaurant_id, date, service_id, amount, payment_method_id, customer_name, customer_due_id, note, created_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Customer Due Collection')`,
        [cleanId, input.date, due.service_id, payAmount, cleanPmId, due.customer_name, due.id, incomeDesc]
      );
      const incomeId = incRes.insertId;

      // 2. Insert customer payment
      const [payRes]: any = await conn.execute(
        `INSERT INTO customer_payments (
           restaurant_id, customer_due_id, date, amount, payment_method_id, income_id, note
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [cleanId, due.id, input.date, payAmount, cleanPmId, incomeId, note]
      );
      const paymentId = payRes.insertId;

      // 3. Link customer_payment_id to the income record
      await conn.execute(
        `UPDATE incomes SET customer_payment_id = ? WHERE id = ?`,
        [paymentId, incomeId]
      );

      // 4. Update customer due record
      const newDueAmount = Math.max(0, Math.round((currentDue - payAmount) * 100) / 100);
      const newStatus = newDueAmount === 0 ? 'paid' : 'partial';

      await conn.execute(
        `UPDATE customers_due SET due_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [newDueAmount, newStatus, due.id]
      );

      await conn.commit();
      return {
        success: true,
        paymentId,
        remainingDue: newDueAmount,
        status: newStatus,
        message: 'Payment collected and income logged successfully.',
      };
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (error: any) {
    console.error('Failed to collect customer due payment:', error);
    return { success: false, error: error?.message || 'Failed to collect payment.' };
  }
}

/**
 * Reverse/delete an incorrect customer payment: restores due_amount and soft-deletes linked income.
 */
export async function reverseCustomerPaymentAction(restaurantId: string | number, paymentId: number | string) {
  try {
    await ensureAccountsTables();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;
    const cleanPayId = Number(paymentId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const parlourGuard = await ensureParlourAccount(cleanId);
    if (!parlourGuard.success) {
      return parlourGuard;
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Fetch payment with row-level lock
      const [payRows]: any = await conn.execute(
        `SELECT * FROM customer_payments WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL FOR UPDATE`,
        [cleanPayId, cleanId]
      );
      if (!Array.isArray(payRows) || payRows.length === 0) {
        await conn.rollback();
        return { success: false, error: 'Customer payment record not found.' };
      }
      const payment = payRows[0];
      const payAmount = Number(payment.amount || 0);
      const dueId = payment.customer_due_id;

      // 2. Lock customer due record
      const [dueRows]: any = await conn.execute(
        `SELECT * FROM customers_due WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL FOR UPDATE`,
        [dueId, cleanId]
      );
      if (!Array.isArray(dueRows) || dueRows.length === 0) {
        await conn.rollback();
        return { success: false, error: 'Associated customer due record not found.' };
      }
      const due = dueRows[0];

      // 3. Soft-delete the payment
      await conn.execute(
        `UPDATE customer_payments SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [cleanPayId]
      );

      // 4. Soft-delete the linked income record
      if (payment.income_id) {
        await conn.execute(
          `UPDATE incomes SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?`,
          [payment.income_id, cleanId]
        );
      }

      // 5. Restore due amount and update status
      const totalAmount = Number(due.total_amount || 0);
      const advancePaid = Number(due.advance_paid || 0);
      const restoredDue = Math.round((Number(due.due_amount || 0) + payAmount) * 100) / 100;
      const maxPossibleDue = Math.round((totalAmount - advancePaid) * 100) / 100;
      const finalDue = Math.min(maxPossibleDue, restoredDue);
      const newStatus = finalDue >= maxPossibleDue ? (advancePaid > 0 ? 'partial' : 'unpaid') : 'partial';

      await conn.execute(
        `UPDATE customers_due SET due_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [finalDue, newStatus, dueId]
      );

      await conn.commit();
      return {
        success: true,
        restoredDue: finalDue,
        status: newStatus,
        message: 'Payment reversed successfully. Due balance and income have been restored.',
      };
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (error: any) {
    console.error('Failed to reverse customer payment:', error);
    return { success: false, error: error?.message || 'Failed to reverse payment.' };
  }
}

/**
 * Delete a customer due record: ONLY permitted if zero money has been collected (advance_paid == 0 and no payments).
 */
export async function deleteCustomerDueAction(restaurantId: string | number, dueId: number | string) {
  try {
    await ensureAccountsTables();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;
    const cleanDueId = Number(dueId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const parlourGuard = await ensureParlourAccount(cleanId);
    if (!parlourGuard.success) {
      return parlourGuard;
    }

    const [dueRows]: any = await pool.execute(
      `SELECT * FROM customers_due WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL LIMIT 1`,
      [cleanDueId, cleanId]
    );
    if (!Array.isArray(dueRows) || dueRows.length === 0) {
      return { success: false, error: 'Customer due record not found.' };
    }
    const due = dueRows[0];

    // Block delete if advance was taken
    if (Number(due.advance_paid || 0) > 0) {
      return {
        success: false,
        error: 'Cannot delete customer due: an advance payment was already collected for this record.',
      };
    }

    // Block delete if any installments were collected
    const [payRows]: any = await pool.execute(
      `SELECT COUNT(*) as count FROM customer_payments WHERE customer_due_id = ? AND restaurant_id = ? AND deleted_at IS NULL`,
      [cleanDueId, cleanId]
    );
    if (payRows?.[0]?.count > 0) {
      return {
        success: false,
        error: 'Cannot delete customer due: payments have already been collected for this record.',
      };
    }

    await pool.execute(
      `UPDATE customers_due SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?`,
      [cleanDueId, cleanId]
    );

    return { success: true, message: 'Customer due record deleted successfully.' };
  } catch (error: any) {
    console.error('Failed to delete customer due:', error);
    return { success: false, error: error?.message || 'Failed to delete customer due.' };
  }
}

/**
 * Update an existing customer due record. Total amount cannot be set lower than already collected funds.
 */
export async function updateCustomerDueAction(
  restaurantId: string | number,
  dueId: number | string,
  input: UpdateCustomerDueInput
) {
  try {
    await ensureAccountsTables();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;
    const cleanDueId = Number(dueId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const parlourGuard = await ensureParlourAccount(cleanId);
    if (!parlourGuard.success) {
      return parlourGuard;
    }

    const [dueRows]: any = await pool.execute(
      `SELECT * FROM customers_due WHERE id = ? AND restaurant_id = ? AND deleted_at IS NULL LIMIT 1`,
      [cleanDueId, cleanId]
    );
    if (!Array.isArray(dueRows) || dueRows.length === 0) {
      return { success: false, error: 'Customer due record not found.' };
    }
    const due = dueRows[0];

    // Total collected so far = advance + sum of active payments
    const [paySumRows]: any = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as paid_total 
       FROM customer_payments 
       WHERE customer_due_id = ? AND restaurant_id = ? AND deleted_at IS NULL`,
      [cleanDueId, cleanId]
    );
    const totalCollectedSoFar = Math.round((Number(due.advance_paid || 0) + Number(paySumRows?.[0]?.paid_total || 0)) * 100) / 100;

    const updates: string[] = [];
    const values: any[] = [];

    if (input.customer_name !== undefined) {
      const name = input.customer_name.trim();
      if (!name) return { success: false, error: 'Customer name cannot be empty.' };
      updates.push('customer_name = ?');
      values.push(name);
    }

    if (input.phone !== undefined) {
      if (input.phone && !isValidBdPhone(input.phone)) {
        return { success: false, error: 'Phone number must be a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX).' };
      }
      updates.push('phone = ?');
      values.push(input.phone ? formatBdPhone(input.phone) : null);
    }

    if (input.service_id !== undefined) {
      const serviceId = input.service_id && input.service_id !== 'custom' ? Number(input.service_id) : null;
      if (serviceId) {
        const validService = await verifyServiceBelongs(serviceId, cleanId);
        if (!validService) return { success: false, error: 'Service not found or does not belong to this account.' };
      }
      updates.push('service_id = ?');
      values.push(serviceId);
    }

    if (input.due_date !== undefined) {
      updates.push('due_date = ?');
      values.push(input.due_date ? input.due_date : null);
    }

    if (input.note !== undefined) {
      updates.push('note = ?');
      values.push(input.note ? input.note.trim() : null);
    }

    if (input.total_amount !== undefined) {
      const newTotal = Number(input.total_amount);
      if (isNaN(newTotal) || newTotal <= 0) {
        return { success: false, error: 'Total amount must be greater than 0.' };
      }
      if (newTotal < totalCollectedSoFar) {
        return {
          success: false,
          error: `Total amount cannot be less than the amount already collected (৳${totalCollectedSoFar}).`,
        };
      }
      const newDueAmount = Math.max(0, Math.round((newTotal - totalCollectedSoFar) * 100) / 100);
      const newStatus = newDueAmount === 0 ? 'paid' : (totalCollectedSoFar > 0 ? 'partial' : 'unpaid');

      updates.push('total_amount = ?', 'due_amount = ?', 'status = ?');
      values.push(newTotal, newDueAmount, newStatus);
    }

    if (updates.length === 0) {
      return { success: false, error: 'No fields to update.' };
    }

    values.push(cleanDueId, cleanId);
    await pool.execute(
      `UPDATE customers_due SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND restaurant_id = ?`,
      values
    );

    return { success: true, message: 'Customer due updated successfully.' };
  } catch (error: any) {
    console.error('Failed to update customer due:', error);
    return { success: false, error: error?.message || 'Failed to update customer due.' };
  }
}

/**
 * Fetch paginated customer due records with search, status filters, and receivables summary.
 */
export async function getCustomersDueAction(restaurantId?: string | number, params?: GetCustomersDueParams) {
  try {
    await ensureAccountsTables();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId || params?.restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const parlourGuard = await ensureParlourAccount(cleanId);
    if (!parlourGuard.success) {
      return parlourGuard;
    }

    const conditions = ['cd.restaurant_id = ?', 'cd.deleted_at IS NULL'];
    const queryParams: any[] = [cleanId];

    if (params?.status && params.status !== 'all') {
      conditions.push('cd.status = ?');
      queryParams.push(params.status);
    }

    if (params?.search && params.search.trim()) {
      conditions.push('(cd.customer_name LIKE ? OR cd.phone LIKE ? OR cd.note LIKE ?)');
      const s = `%${params.search.trim()}%`;
      queryParams.push(s, s, s);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Total count
    const [countRows]: any = await pool.execute(
      `SELECT COUNT(*) as total FROM customers_due cd ${whereClause}`,
      queryParams
    );
    const totalCount = Number(countRows?.[0]?.total || 0);

    const pagination = getPagination(params?.page || 1, params?.limit || 20);

    const sql = `
      SELECT 
        cd.id,
        cd.restaurant_id,
        cd.customer_name,
        cd.phone,
        cd.service_id,
        s.name as service_name,
        cd.total_amount,
        cd.advance_paid,
        cd.due_amount,
        DATE_FORMAT(cd.due_date, '%Y-%m-%d') as due_date,
        cd.status,
        cd.note,
        cd.created_at,
        COALESCE(p.collected_sum, 0) as collected_installments,
        (cd.advance_paid + COALESCE(p.collected_sum, 0)) as total_paid
      FROM customers_due cd
      LEFT JOIN services s ON cd.service_id = s.id AND s.deleted_at IS NULL
      LEFT JOIN (
        SELECT customer_due_id, SUM(amount) as collected_sum 
        FROM customer_payments 
        WHERE restaurant_id = ? AND deleted_at IS NULL 
        GROUP BY customer_due_id
      ) p ON cd.id = p.customer_due_id
      ${whereClause}
      ORDER BY cd.id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows]: any = await pool.execute(sql, [cleanId, ...queryParams, pagination.limit, pagination.offset]);

    // Summary Cards
    const [summaryRows]: any = await pool.execute(
      `SELECT 
         COALESCE(SUM(CASE WHEN cd.status != 'paid' THEN cd.due_amount ELSE 0 END), 0) as total_due,
         COALESCE(SUM(cd.advance_paid), 0) as total_advance,
         COUNT(CASE WHEN cd.status != 'paid' THEN 1 END) as pending_count
       FROM customers_due cd
       WHERE cd.restaurant_id = ? AND cd.deleted_at IS NULL`,
      [cleanId]
    );

    const [paySumRows]: any = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as total_installments_collected 
       FROM customer_payments 
       WHERE restaurant_id = ? AND deleted_at IS NULL`,
      [cleanId]
    );

    const totalAdvance = Number(summaryRows?.[0]?.total_advance || 0);
    const totalInstallments = Number(paySumRows?.[0]?.total_installments_collected || 0);
    const totalPaid = Math.round((totalAdvance + totalInstallments) * 100) / 100;

    const formattedRows = (Array.isArray(rows) ? rows : []).map((r: any) => ({
      ...r,
      total_amount: Number(r.total_amount),
      advance_paid: Number(r.advance_paid),
      due_amount: Number(r.due_amount),
      collected_installments: Number(r.collected_installments),
      total_paid: Number(r.total_paid),
    }));

    return {
      success: true,
      data: formattedRows,
      summary: {
        totalDue: Number(summaryRows?.[0]?.total_due || 0),
        totalAdvance,
        totalPaid,
        pendingCount: Number(summaryRows?.[0]?.pending_count || 0),
      },
      pagination: buildPaginationMeta(totalCount, pagination),
    };
  } catch (error: any) {
    console.error('Failed to get customers due:', error);
    return { success: false, error: error?.message || 'Failed to retrieve customers due.' };
  }
}

/**
 * Fetch detailed view of a customer due record with its installment transaction history.
 */
export async function getCustomerDueDetailsAction(restaurantId: string | number, dueId: number | string) {
  try {
    await ensureAccountsTables();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;
    const cleanDueId = Number(dueId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    const parlourGuard = await ensureParlourAccount(cleanId);
    if (!parlourGuard.success) {
      return parlourGuard;
    }

    const [dueRows]: any = await pool.execute(
      `SELECT 
         cd.*, 
         DATE_FORMAT(cd.due_date, '%Y-%m-%d') as due_date,
         s.name as service_name
       FROM customers_due cd
       LEFT JOIN services s ON cd.service_id = s.id AND s.deleted_at IS NULL
       WHERE cd.id = ? AND cd.restaurant_id = ? AND cd.deleted_at IS NULL LIMIT 1`,
      [cleanDueId, cleanId]
    );
    if (!Array.isArray(dueRows) || dueRows.length === 0) {
      return { success: false, error: 'Customer due record not found.' };
    }

    const [payments]: any = await pool.execute(
      `SELECT 
         cp.id,
         cp.customer_due_id,
         DATE_FORMAT(cp.date, '%Y-%m-%d') as date,
         cp.amount,
         cp.payment_method_id,
         pm.name as payment_method_name,
         cp.income_id,
         cp.note,
         cp.created_at
       FROM customer_payments cp
       LEFT JOIN payment_methods pm ON cp.payment_method_id = pm.id AND pm.deleted_at IS NULL
       WHERE cp.customer_due_id = ? AND cp.restaurant_id = ? AND cp.deleted_at IS NULL
       ORDER BY cp.date DESC, cp.id DESC`,
      [cleanDueId, cleanId]
    );

    return {
      success: true,
      data: {
        due: {
          ...dueRows[0],
          total_amount: Number(dueRows[0].total_amount),
          advance_paid: Number(dueRows[0].advance_paid),
          due_amount: Number(dueRows[0].due_amount),
        },
        payments: Array.isArray(payments) ? payments.map((p: any) => ({ ...p, amount: Number(p.amount) })) : [],
      },
    };
  } catch (error: any) {
    console.error('Failed to get customer due details:', error);
    return { success: false, error: error?.message || 'Failed to retrieve due details.' };
  }
}

/* ========================================================================== */
/*                 STEP 5: ACCOUNTS OVERVIEW & REPORTS ACTIONS                */
/* ========================================================================== */

export interface GetAccountsOverviewParams {
  restaurantId: string | number;
  fromDate?: string;
  toDate?: string;
}

export interface GetAccountsReportParams {
  restaurantId: string | number;
  reportType: 'expenses' | 'vendors' | 'staff' | 'payment_methods' | 'income' | 'commissions' | 'customer_dues' | 'profit_loss';
  fromDate?: string;
  toDate?: string;
}

/**
 * Fetch complete dashboard overview metrics: 4 stats, charts, recent transactions, top vendors, and sales comparison.
 */
export async function getAccountsOverviewAction(params: GetAccountsOverviewParams) {
  try {
    await ensureAccountsTables();
    const authCheck = await resolveAuthenticatedRestaurantId(params.restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    // Date filters for expenses
    const expConditions = ['e.restaurant_id = ?', 'e.deleted_at IS NULL'];
    const expParams: any[] = [cleanId];

    if (params.fromDate) {
      expConditions.push('e.date >= ?');
      expParams.push(params.fromDate);
    }
    if (params.toDate) {
      expConditions.push('e.date <= ?');
      expParams.push(params.toDate);
    }
    const expWhere = `WHERE ${expConditions.join(' AND ')}`;

    // 1. Total Expenses in range
    const [expTotalRows]: any = await pool.execute(
      `SELECT COALESCE(SUM(e.amount), 0) as total FROM expenses e ${expWhere}`,
      expParams
    );
    const totalExpenses = Number(expTotalRows?.[0]?.total || 0);

    // 2. Staff Cost in range (salaries paid excluding tips + advances given)
    const staffSalConditions = ['restaurant_id = ?', 'deleted_at IS NULL', 'paid_amount > 0'];
    const staffSalParams: any[] = [cleanId];
    if (params.fromDate) {
      staffSalConditions.push('paid_date >= ?');
      staffSalParams.push(params.fromDate);
    }
    if (params.toDate) {
      staffSalConditions.push('paid_date <= ?');
      staffSalParams.push(params.toDate);
    }
    const [staffSalRows]: any = await pool.execute(
      `SELECT COALESCE(SUM(GREATEST(0, paid_amount - COALESCE(tip_amount, 0))), 0) as total FROM staff_salary_records WHERE ${staffSalConditions.join(' AND ')}`,
      staffSalParams
    );

    const staffAdvConditions = ['restaurant_id = ?', 'deleted_at IS NULL'];
    const staffAdvParams: any[] = [cleanId];
    if (params.fromDate) {
      staffAdvConditions.push('date >= ?');
      staffAdvParams.push(params.fromDate);
    }
    if (params.toDate) {
      staffAdvConditions.push('date <= ?');
      staffAdvParams.push(params.toDate);
    }
    const [staffAdvRows]: any = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as total FROM staff_advances WHERE ${staffAdvConditions.join(' AND ')}`,
      staffAdvParams
    );

    const staffCost = Number(staffSalRows?.[0]?.total || 0) + Number(staffAdvRows?.[0]?.total || 0);

    // 3. Vendor Paid in range
    const venPayConditions = ['restaurant_id = ?', 'deleted_at IS NULL'];
    const venPayParams: any[] = [cleanId];
    if (params.fromDate) {
      venPayConditions.push('date >= ?');
      venPayParams.push(params.fromDate);
    }
    if (params.toDate) {
      venPayConditions.push('date <= ?');
      venPayParams.push(params.toDate);
    }
    const [venPayRows]: any = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as total FROM vendor_payments WHERE ${venPayConditions.join(' AND ')}`,
      venPayParams
    );
    const vendorPaid = Number(venPayRows?.[0]?.total || 0);

    // 4. Total Outstanding Due (Vendor Dues + Staff Unpaid Salary)
    const [venDueRows]: any = await pool.execute(
      `SELECT 
         COALESCE(SUM(v.opening_balance), 0) + 
         COALESCE((SELECT SUM(total_amount) FROM vendor_bills WHERE restaurant_id = ? AND deleted_at IS NULL), 0) - 
         COALESCE((SELECT SUM(amount) FROM vendor_payments WHERE restaurant_id = ? AND deleted_at IS NULL), 0) AS total_due
       FROM vendors v
       WHERE v.restaurant_id = ? AND v.deleted_at IS NULL AND v.is_active = TRUE`,
      [cleanId, cleanId, cleanId]
    );
    const vendorDue = Math.max(0, Number(venDueRows?.[0]?.total_due || 0));

    const [staffUnpaidRows]: any = await pool.execute(
      `SELECT COALESCE(SUM(net_payable - paid_amount), 0) as unpaid_total 
       FROM staff_salary_records 
       WHERE restaurant_id = ? AND deleted_at IS NULL AND status != 'paid'`,
      [cleanId]
    );
    const staffDue = Math.max(0, Number(staffUnpaidRows?.[0]?.unpaid_total || 0));
    const totalDue = vendorDue + staffDue;

    // 5. Category Breakdown for Donut / Pie Chart
    const catBreakdownSql = `
      SELECT 
        COALESCE(c.name, 'Uncategorized') as name,
        COALESCE(SUM(e.amount), 0) as value,
        COUNT(e.id) as count
      FROM expenses e
      LEFT JOIN expense_categories c ON e.category_id = c.id
      ${expWhere}
      GROUP BY e.category_id, c.name
      ORDER BY value DESC
    `;
    const [catBreakdownRows]: any = await pool.execute(catBreakdownSql, expParams);
    const categoryBreakdown = (Array.isArray(catBreakdownRows) ? catBreakdownRows : []).map((row: any) => ({
      name: row.name,
      value: Number(row.value),
      count: Number(row.count),
    }));

    // 6. Day / Date Trend for Bar / Line Chart (Expenses)
    const trendSql = `
      SELECT 
        DATE_FORMAT(e.date, '%d %b') as label,
        DATE_FORMAT(e.date, '%Y-%m-%d') as fullDate,
        COALESCE(SUM(e.amount), 0) as amount
      FROM expenses e
      ${expWhere}
      GROUP BY e.date
      ORDER BY e.date ASC
      LIMIT 31
    `;
    const [trendRows]: any = await pool.execute(trendSql, expParams);
    const trendData = (Array.isArray(trendRows) ? trendRows : []).map((row: any) => ({
      label: row.label,
      fullDate: row.fullDate,
      amount: Number(row.amount),
    }));

    // 6b. Day / Date Income Trend for Income Timeline Chart
    const incTrendConditions = ['restaurant_id = ?', 'deleted_at IS NULL'];
    const incTrendParams: any[] = [cleanId];
    if (params.fromDate) {
      incTrendConditions.push('date >= ?');
      incTrendParams.push(params.fromDate);
    }
    if (params.toDate) {
      incTrendConditions.push('date <= ?');
      incTrendParams.push(params.toDate);
    }
    const incTrendWhere = `WHERE ${incTrendConditions.join(' AND ')}`;

    const incTrendSql = `
      SELECT 
        DATE_FORMAT(date, '%d %b') as label,
        DATE_FORMAT(date, '%Y-%m-%d') as fullDate,
        COALESCE(SUM(amount), 0) as amount,
        COUNT(id) as count
      FROM incomes
      ${incTrendWhere}
      GROUP BY date
      ORDER BY date ASC
      LIMIT 31
    `;
    const [incTrendRows]: any = await pool.execute(incTrendSql, incTrendParams);
    const incomeTrendData = (Array.isArray(incTrendRows) ? incTrendRows : []).map((row: any) => ({
      label: row.label,
      fullDate: row.fullDate,
      amount: Number(row.amount),
      count: Number(row.count),
    }));

    // 7. Recent 10 Unified Transactions
    const recentSql = `
      SELECT 
        e.id,
        DATE_FORMAT(e.date, '%Y-%m-%d') as date,
        e.amount,
        COALESCE(e.description, 'Expense') as description,
        COALESCE(c.name, 'Expense') as category_name,
        COALESCE(pm.name, 'Cash') as payment_method_name,
        e.vendor_id,
        v.name as vendor_name,
        e.staff_id,
        s.name as staff_name,
        e.created_at
      FROM expenses e
      LEFT JOIN expense_categories c ON e.category_id = c.id
      LEFT JOIN payment_methods pm ON e.payment_method_id = pm.id
      LEFT JOIN vendors v ON e.vendor_id = v.id
      LEFT JOIN staff s ON e.staff_id = s.id
      WHERE e.restaurant_id = ? AND e.deleted_at IS NULL
      ORDER BY e.date DESC, e.id DESC
      LIMIT 10
    `;
    const [recentRows]: any = await pool.execute(recentSql, [cleanId]);

    // 8. Top 5 Vendors by Due Balance
    const topVendorsSql = `
      SELECT 
        v.id,
        v.name,
        v.phone,
        v.category,
        (v.opening_balance + COALESCE(b.total_bills, 0) - COALESCE(p.total_payments, 0)) AS current_due
      FROM vendors v
      LEFT JOIN (
        SELECT vendor_id, SUM(total_amount) AS total_bills FROM vendor_bills WHERE restaurant_id = ? AND deleted_at IS NULL GROUP BY vendor_id
      ) b ON v.id = b.vendor_id
      LEFT JOIN (
        SELECT vendor_id, SUM(amount) AS total_payments FROM vendor_payments WHERE restaurant_id = ? AND deleted_at IS NULL GROUP BY vendor_id
      ) p ON v.id = p.vendor_id
      WHERE v.restaurant_id = ? AND v.deleted_at IS NULL AND v.is_active = TRUE
      HAVING current_due > 0
      ORDER BY current_due DESC
      LIMIT 5
    `;
    const [topVendorsRows]: any = await pool.execute(topVendorsSql, [cleanId, cleanId, cleanId]);

    // 9. Sales vs Expenses & Parlour Financial Overview
    const businessType = await getClientBusinessType(cleanId);
    let salesData: any = null;
    let parlourMetrics: any = null;

    if (businessType === 'parlour') {
      const incConditions = ['restaurant_id = ?', 'deleted_at IS NULL'];
      const incParams: any[] = [cleanId];
      if (params.fromDate) {
        incConditions.push('date >= ?');
        incParams.push(params.fromDate);
      }
      if (params.toDate) {
        incConditions.push('date <= ?');
        incParams.push(params.toDate);
      }
      const incWhere = `WHERE ${incConditions.join(' AND ')}`;

      const [incRows]: any = await pool.execute(
        `SELECT COALESCE(SUM(amount), 0) as total_income, COUNT(id) as income_count FROM incomes ${incWhere}`,
        incParams
      );
      const totalIncome = Number(incRows?.[0]?.total_income || 0);
      const incomeCount = Number(incRows?.[0]?.income_count || 0);

      // Customer Due Total (unpaid or partial)
      const [dueRows]: any = await pool.execute(
        `SELECT COALESCE(SUM(due_amount), 0) as total_customer_due FROM customers_due WHERE restaurant_id = ? AND status != 'paid' AND deleted_at IS NULL`,
        [cleanId]
      );
      const customerDueTotal = Math.max(0, Number(dueRows?.[0]?.total_customer_due || 0));

      // Monthly Earned Commissions (staff_commissions in current month)
      const dhakaNow = getDhakaDate();
      const [commEarnedRows]: any = await pool.execute(
        `SELECT COALESCE(SUM(commission_amount), 0) as monthly_earned_commission 
         FROM staff_commissions 
         WHERE restaurant_id = ? AND MONTH(date) = ? AND YEAR(date) = ? AND deleted_at IS NULL`,
        [cleanId, dhakaNow.month, dhakaNow.year]
      );
      const monthlyEarnedCommission = Number(commEarnedRows?.[0]?.monthly_earned_commission || 0);

      // Net profit = totalIncome - totalExpenses (Expenses come strictly from expenses table; tips never counted)
      const netProfit = totalIncome - totalExpenses;
      const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

      salesData = {
        totalSales: totalIncome,
        orderCount: incomeCount,
        netProfit,
        profitMargin,
      };

      parlourMetrics = {
        totalIncome,
        incomeCount,
        netProfit,
        profitMargin,
        customerDueTotal,
        monthlyEarnedCommission,
      };
    } else {
      // Restaurant orders & income logic
      try {
        await syncCompletedOrdersForRestaurant(cleanId);

        const incConditions = ['restaurant_id = ?', 'deleted_at IS NULL'];
        const incParams: any[] = [cleanId];
        if (params.fromDate) {
          incConditions.push('date >= ?');
          incParams.push(params.fromDate);
        }
        if (params.toDate) {
          incConditions.push('date <= ?');
          incParams.push(params.toDate);
        }
        const incWhere = `WHERE ${incConditions.join(' AND ')}`;

        const [incRows]: any = await pool.execute(
          `SELECT COALESCE(SUM(amount), 0) as total_income, COUNT(id) as income_count FROM incomes ${incWhere}`,
          incParams
        );
        const totalIncome = Number(incRows?.[0]?.total_income || 0);
        const incomeCount = Number(incRows?.[0]?.income_count || 0);

        if (totalIncome > 0 || incomeCount > 0) {
          const netProfit = totalIncome - totalExpenses;
          const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;
          salesData = {
            totalSales: totalIncome,
            orderCount: incomeCount,
            netProfit,
            profitMargin,
          };
        } else {
          // Fallback to legacy orders table if incomes has no records
          const clientName = proCheck.businessName || cleanId;
          const [orderRows]: any = await pool.execute(
            `SELECT 
               COALESCE(SUM(totalAmount), 0) as total_sales,
               COUNT(*) as order_count
             FROM orders
             WHERE (businessName = ? OR customerData LIKE ?)` +
             (params.fromDate ? ` AND orderDate >= '${params.fromDate}'` : '') +
             (params.toDate ? ` AND orderDate <= '${params.toDate} 23:59:59'` : ''),
            [clientName, `%"restaurant":"${clientName}"%`]
          );

          const totalSales = Number(orderRows?.[0]?.total_sales || 0);
          const orderCount = Number(orderRows?.[0]?.order_count || 0);

          if (totalSales > 0 || orderCount > 0) {
            const netProfit = totalSales - totalExpenses;
            const profitMargin = totalSales > 0 ? Math.round((netProfit / totalSales) * 100) : 0;
            salesData = {
              totalSales,
              orderCount,
              netProfit,
              profitMargin,
            };
          }
        }
      } catch {
        salesData = null;
      }
    }

    return {
      success: true,
      data: {
        businessType,
        summary: {
          totalExpenses,
          staffCost,
          vendorPaid,
          totalDue,
          vendorDue,
          staffDue,
          customerDue: parlourMetrics?.customerDueTotal || 0,
          earnedCommission: parlourMetrics?.monthlyEarnedCommission || 0,
          totalIncome: parlourMetrics?.totalIncome || 0,
          netProfit: parlourMetrics !== null ? parlourMetrics.netProfit : (salesData?.netProfit ?? null),
          profitMargin: parlourMetrics !== null ? parlourMetrics.profitMargin : (salesData?.profitMargin ?? null),
        },
        parlourMetrics,
        categoryBreakdown,
        trendData,
        incomeTrendData,
        recentTransactions: Array.isArray(recentRows) ? recentRows : [],
        topVendorsDue: Array.isArray(topVendorsRows) ? topVendorsRows : [],
        salesVsExpenses: salesData,
      },
      businessType,
      isPro: true,
    };
  } catch (error: any) {
    console.error('Failed to get accounts overview:', error);
    return { success: false, error: error?.message || 'Failed to retrieve accounts overview.' };
  }
}

/**
 * Fetch structured accounting reports: Expenses, Vendors, Staff, or Payment Methods.
 */
export async function getAccountsReportAction(params: GetAccountsReportParams) {
  try {
    await ensureAccountsTables();
    const authCheck = await resolveAuthenticatedRestaurantId(params.restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;
    const businessType = await getClientBusinessType(cleanId);

    const proCheck = await verifyProUser(cleanId);
    if (!proCheck.isPro) {
      return { success: false, error: 'Pro subscription required.', isPro: false };
    }

    if (params.reportType === 'expenses') {
      const conditions = ['e.restaurant_id = ?', 'e.deleted_at IS NULL'];
      const queryParams: any[] = [cleanId];
      if (params.fromDate) {
        conditions.push('e.date >= ?');
        queryParams.push(params.fromDate);
      }
      if (params.toDate) {
        conditions.push('e.date <= ?');
        queryParams.push(params.toDate);
      }
      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const sql = `
        SELECT 
          COALESCE(c.name, 'Uncategorized') as category,
          COUNT(e.id) as transaction_count,
          COALESCE(SUM(e.amount), 0) as total_amount
        FROM expenses e
        LEFT JOIN expense_categories c ON e.category_id = c.id
        ${whereClause}
        GROUP BY e.category_id, c.name
        ORDER BY total_amount DESC
      `;
      const [rows]: any = await pool.execute(sql, queryParams);
      const totalSum = (rows || []).reduce((acc: number, r: any) => acc + Number(r.total_amount), 0);

      const dataWithPercent = (rows || []).map((r: any) => ({
        ...r,
        total_amount: Number(r.total_amount),
        percentage: totalSum > 0 ? ((Number(r.total_amount) / totalSum) * 100).toFixed(1) : '0.0',
      }));

      return {
        success: true,
        reportType: 'expenses',
        data: dataWithPercent,
        totalSum,
        businessType,
      };
    }

    if (params.reportType === 'vendors') {
      const sql = `
        SELECT 
          v.id,
          v.name,
          v.phone,
          v.category,
          v.opening_balance,
          COALESCE(b.total_bills, 0) AS total_purchases,
          COALESCE(p.total_payments, 0) AS total_paid,
          (v.opening_balance + COALESCE(b.total_bills, 0) - COALESCE(p.total_payments, 0)) AS current_due,
          COALESCE(b.overdue_count, 0) AS overdue_count
        FROM vendors v
        LEFT JOIN (
          SELECT vendor_id, SUM(total_amount) AS total_bills,
                 SUM(CASE WHEN due_date IS NOT NULL AND due_date < CURDATE() THEN 1 ELSE 0 END) AS overdue_count
          FROM vendor_bills WHERE restaurant_id = ? AND deleted_at IS NULL GROUP BY vendor_id
        ) b ON v.id = b.vendor_id
        LEFT JOIN (
          SELECT vendor_id, SUM(amount) AS total_payments FROM vendor_payments WHERE restaurant_id = ? AND deleted_at IS NULL GROUP BY vendor_id
        ) p ON v.id = p.vendor_id
        WHERE v.restaurant_id = ? AND v.deleted_at IS NULL
        ORDER BY current_due DESC, v.name ASC
      `;
      const [rows]: any = await pool.execute(sql, [cleanId, cleanId, cleanId]);
      const totalDueSum = (rows || []).reduce((acc: number, r: any) => acc + Number(r.current_due), 0);

      return {
        success: true,
        reportType: 'vendors',
        data: rows || [],
        totalSum: totalDueSum,
        businessType,
      };
    }

    if (params.reportType === 'staff') {
      const conditions = ['r.restaurant_id = ?', 'r.deleted_at IS NULL'];
      const queryParams: any[] = [cleanId];
      if (params.fromDate) {
        conditions.push(`r.month >= '${params.fromDate.slice(0, 7)}'`);
      }
      if (params.toDate) {
        conditions.push(`r.month <= '${params.toDate.slice(0, 7)}'`);
      }

      const sql = `
        SELECT 
          r.id,
          s.name as staff_name,
          s.role as role,
          r.month,
          r.base_salary,
          r.bonus,
          r.overtime,
          r.commission_amount,
          r.tip_amount,
          r.deduction,
          r.advance_adjusted,
          r.net_payable,
          r.paid_amount,
          GREATEST(0, r.paid_amount - COALESCE(r.tip_amount, 0)) as staff_cost_paid,
          r.status,
          DATE_FORMAT(r.paid_date, '%Y-%m-%d') as paid_date
        FROM staff_salary_records r
        JOIN staff s ON r.staff_id = s.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY r.month DESC, s.name ASC
      `;
      const [rows]: any = await pool.execute(sql, queryParams);
      const totalNetSum = (rows || []).reduce((acc: number, r: any) => acc + Number(r.net_payable), 0);
      const totalPaidSum = (rows || []).reduce((acc: number, r: any) => acc + Number(r.staff_cost_paid), 0);
      const totalTipsSum = (rows || []).reduce((acc: number, r: any) => acc + Number(r.tip_amount || 0), 0);

      return {
        success: true,
        reportType: 'staff',
        data: rows || [],
        totalSum: totalPaidSum,
        totalNetSum,
        totalTipsSum,
        businessType,
      };
    }

    if (params.reportType === 'payment_methods') {
      const conditions = ['e.restaurant_id = ?', 'e.deleted_at IS NULL'];
      const queryParams: any[] = [cleanId];
      if (params.fromDate) {
        conditions.push('e.date >= ?');
        queryParams.push(params.fromDate);
      }
      if (params.toDate) {
        conditions.push('e.date <= ?');
        queryParams.push(params.toDate);
      }

      const sql = `
        SELECT 
          COALESCE(pm.name, 'Cash') as payment_method,
          COUNT(e.id) as transaction_count,
          COALESCE(SUM(e.amount), 0) as total_amount
        FROM expenses e
        LEFT JOIN payment_methods pm ON e.payment_method_id = pm.id
        WHERE ${conditions.join(' AND ')}
        GROUP BY e.payment_method_id, pm.name
        ORDER BY total_amount DESC
      `;
      const [rows]: any = await pool.execute(sql, queryParams);
      const totalSum = (rows || []).reduce((acc: number, r: any) => acc + Number(r.total_amount), 0);

      return {
        success: true,
        reportType: 'payment_methods',
        data: rows || [],
        totalSum,
        businessType,
      };
    }

    // Report: Income by Service / Category (Restaurant & Parlour)
    if (params.reportType === 'income') {
      const conditions = ['i.restaurant_id = ?', 'i.deleted_at IS NULL'];
      const queryParams: any[] = [cleanId];
      if (params.fromDate) {
        conditions.push('i.date >= ?');
        queryParams.push(params.fromDate);
      }
      if (params.toDate) {
        conditions.push('i.date <= ?');
        queryParams.push(params.toDate);
      }
      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const [rows]: any = await pool.execute(
        `SELECT 
           COALESCE(s.name, 'General Sales') as service_name,
           COUNT(i.id) as transaction_count,
           COALESCE(SUM(i.amount), 0) as total_amount
         FROM incomes i
         LEFT JOIN services s ON i.service_id = s.id AND s.deleted_at IS NULL
         ${whereClause}
         GROUP BY i.service_id, s.name
         ORDER BY total_amount DESC`,
        queryParams
      );

      const totalIncome = (Array.isArray(rows) ? rows : []).reduce((sum: number, r: any) => sum + Number(r.total_amount), 0);
      const data = (Array.isArray(rows) ? rows : []).map((r: any) => ({
        service_name: r.service_name,
        transaction_count: Number(r.transaction_count),
        total_amount: Number(r.total_amount),
        percentage: totalIncome > 0 ? Math.round((Number(r.total_amount) / totalIncome) * 100) : 0,
      }));

      return {
        success: true,
        reportType: 'income',
        data,
        summary: {
          totalIncome,
          transactionCount: data.reduce((sum: number, r: any) => sum + r.transaction_count, 0),
        },
        businessType,
      };
    }

    // Parlour Report 2: Staff Commissions
    if (params.reportType === 'commissions') {
      const parlourGuard = await ensureParlourAccount(cleanId);
      if (!parlourGuard.success) return parlourGuard;

      const conditions = ['sc.restaurant_id = ?', 'sc.deleted_at IS NULL'];
      const queryParams: any[] = [cleanId];
      if (params.fromDate) {
        conditions.push('sc.date >= ?');
        queryParams.push(params.fromDate);
      }
      if (params.toDate) {
        conditions.push('sc.date <= ?');
        queryParams.push(params.toDate);
      }
      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const [rows]: any = await pool.execute(
        `SELECT 
           st.name as staff_name,
           COALESCE(s.name, 'Custom Service') as service_name,
           COUNT(sc.id) as service_count,
           COALESCE(SUM(sc.service_amount), 0) as total_service_value,
           COALESCE(SUM(sc.commission_amount), 0) as total_commission
         FROM staff_commissions sc
         JOIN staff st ON sc.staff_id = st.id AND st.deleted_at IS NULL
         LEFT JOIN services s ON sc.service_id = s.id AND s.deleted_at IS NULL
         ${whereClause}
         GROUP BY sc.staff_id, sc.service_id, st.name, s.name
         ORDER BY total_commission DESC`,
        queryParams
      );

      const data = (Array.isArray(rows) ? rows : []).map((r: any) => ({
        staff_name: r.staff_name,
        service_name: r.service_name,
        service_count: Number(r.service_count),
        total_service_value: Number(r.total_service_value),
        total_commission: Number(r.total_commission),
      }));

      const totalCommission = data.reduce((sum: number, r: any) => sum + r.total_commission, 0);
      const totalServiceValue = data.reduce((sum: number, r: any) => sum + r.total_service_value, 0);

      return {
        success: true,
        reportType: 'commissions',
        data,
        summary: {
          totalCommission,
          totalServiceValue,
          serviceCount: data.reduce((sum: number, r: any) => sum + r.service_count, 0),
        },
        businessType,
      };
    }

    // Parlour Report 3: Customer Dues
    if (params.reportType === 'customer_dues') {
      const parlourGuard = await ensureParlourAccount(cleanId);
      if (!parlourGuard.success) return parlourGuard;

      const conditions = ['cd.restaurant_id = ?', 'cd.deleted_at IS NULL'];
      const queryParams: any[] = [cleanId];
      if (params.fromDate) {
        conditions.push('cd.created_at >= ?');
        queryParams.push(params.fromDate);
      }
      if (params.toDate) {
        conditions.push('cd.created_at <= ?');
        queryParams.push(`${params.toDate} 23:59:59`);
      }
      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const [rows]: any = await pool.execute(
        `SELECT 
           cd.id,
           cd.customer_name,
           cd.phone,
           COALESCE(s.name, 'General') as service_name,
           cd.total_amount,
           cd.advance_paid,
           COALESCE(p.paid_sum, 0) as installments_paid,
           (cd.advance_paid + COALESCE(p.paid_sum, 0)) as total_paid,
           cd.due_amount,
           cd.status,
           DATE_FORMAT(cd.due_date, '%Y-%m-%d') as due_date
         FROM customers_due cd
         LEFT JOIN services s ON cd.service_id = s.id AND s.deleted_at IS NULL
         LEFT JOIN (
           SELECT customer_due_id, SUM(amount) as paid_sum 
           FROM customer_payments 
           WHERE restaurant_id = ? AND deleted_at IS NULL 
           GROUP BY customer_due_id
         ) p ON cd.id = p.customer_due_id
         ${whereClause}
         ORDER BY cd.id DESC`,
        [cleanId, ...queryParams]
      );

      const data = (Array.isArray(rows) ? rows : []).map((r: any) => ({
        ...r,
        total_amount: Number(r.total_amount),
        advance_paid: Number(r.advance_paid),
        installments_paid: Number(r.installments_paid),
        total_paid: Number(r.total_paid),
        due_amount: Number(r.due_amount),
      }));

      const totalDue = data.reduce((sum: number, r: any) => sum + (r.status !== 'paid' ? r.due_amount : 0), 0);
      const totalCollected = data.reduce((sum: number, r: any) => sum + r.total_paid, 0);

      return {
        success: true,
        reportType: 'customer_dues',
        data,
        summary: {
          totalDue,
          totalCollected,
          customersCount: data.length,
        },
        businessType,
      };
    }

    // Parlour Report 4: Profit & Loss (Cash-basis)
    if (params.reportType === 'profit_loss') {
      const parlourGuard = await ensureParlourAccount(cleanId);
      if (!parlourGuard.success) return parlourGuard;

      // Income in range
      const incConditions = ['restaurant_id = ?', 'deleted_at IS NULL'];
      const incParams: any[] = [cleanId];
      if (params.fromDate) {
        incConditions.push('date >= ?');
        incParams.push(params.fromDate);
      }
      if (params.toDate) {
        incConditions.push('date <= ?');
        incParams.push(params.toDate);
      }
      const [incRows]: any = await pool.execute(
        `SELECT COALESCE(SUM(amount), 0) as total FROM incomes WHERE ${incConditions.join(' AND ')}`,
        incParams
      );
      const totalIncome = Number(incRows?.[0]?.total || 0);

      // Expenses in range (Strictly from expenses table)
      const expConditions = ['restaurant_id = ?', 'deleted_at IS NULL'];
      const expParams: any[] = [cleanId];
      if (params.fromDate) {
        expConditions.push('date >= ?');
        expParams.push(params.fromDate);
      }
      if (params.toDate) {
        expConditions.push('date <= ?');
        expParams.push(params.toDate);
      }
      const [expRows]: any = await pool.execute(
        `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE ${expConditions.join(' AND ')}`,
        expParams
      );
      const totalExpenses = Number(expRows?.[0]?.total || 0);

      const netProfit = totalIncome - totalExpenses;
      const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

      const data = [
        { item: 'Total Income (Collections & Advances)', amount: totalIncome, type: 'revenue' },
        { item: 'Total Operating Expenses (Disbursed)', amount: totalExpenses, type: 'expense' },
        { item: 'Net Profit / Loss', amount: netProfit, type: netProfit >= 0 ? 'profit' : 'loss' },
      ];

      return {
        success: true,
        reportType: 'profit_loss',
        data,
        summary: {
          totalIncome,
          totalExpenses,
          netProfit,
          profitMargin,
          accountingBasis: 'Cash-basis accounting: Revenues and expenses are recognized when cash is received or disbursed.',
        },
        businessType,
      };
    }

    return { success: false, error: 'Invalid report type requested.' };
  } catch (error: any) {
    console.error('Failed to get accounts report:', error);
    return { success: false, error: error?.message || 'Failed to generate report.' };
  }
}

/**
 * Export Accounts Report to CSV string.
 */
export async function exportAccountsReportCsvAction(params: GetAccountsReportParams) {
  try {
    const reportRes: any = await getAccountsReportAction(params);
    if (!reportRes.success || !reportRes.data) {
      return { success: false, error: reportRes.error || 'Failed to fetch report data.' };
    }

    const { reportType, data } = reportRes;
    const cleanId = String(params.restaurantId || '').trim();
    let headers: string[] = [];
    const lines: string[] = [];

    if (reportType === 'expenses') {
      headers = ['Category', 'Transactions Count', 'Total Amount (BDT)', 'Percentage (%)'];
      lines.push(headers.join(','));
      for (const r of data) {
        lines.push([`"${r.category}"`, r.transaction_count, r.total_amount, `"${r.percentage}%"`].join(','));
      }
    } else if (reportType === 'vendors') {
      headers = ['Vendor Name', 'Phone', 'Category', 'Opening Balance', 'Total Purchases', 'Total Paid', 'Current Due', 'Overdue Bills'];
      lines.push(headers.join(','));
      for (const r of data) {
        lines.push([
          `"${r.name}"`,
          `"${r.phone || ''}"`,
          `"${r.category || ''}"`,
          r.opening_balance,
          r.total_purchases,
          r.total_paid,
          r.current_due,
          r.overdue_count,
        ].join(','));
      }
    } else if (reportType === 'staff') {
      headers = [
        'Staff Name',
        'Role',
        'Month',
        'Base Salary',
        'Bonus',
        'Overtime',
        'Commission',
        'Deduction',
        'Advance Adjusted',
        'Tips (Direct to Staff)',
        'Net Payable',
        'Staff Cost (Company Expense)',
        'Total Disbursed',
        'Status',
        'Paid Date',
      ];
      lines.push(headers.join(','));
      for (const r of data) {
        lines.push([
          `"${r.staff_name}"`,
          `"${r.role}"`,
          `"${r.month}"`,
          r.base_salary,
          r.bonus,
          r.overtime,
          r.commission_amount || 0,
          r.deduction,
          r.advance_adjusted,
          r.tip_amount || 0,
          r.net_payable,
          r.staff_cost_paid !== undefined ? r.staff_cost_paid : Math.max(0, Number(r.paid_amount) - Number(r.tip_amount || 0)),
          r.paid_amount,
          `"${r.status}"`,
          `"${r.paid_date || ''}"`,
        ].join(','));
      }
    } else if (reportType === 'payment_methods') {
      headers = ['Payment Method', 'Transaction Count', 'Total Processed (BDT)'];
      lines.push(headers.join(','));
      for (const r of data) {
        lines.push([`"${r.payment_method}"`, r.transaction_count, r.total_amount].join(','));
      }
    } else if (reportType === 'income') {
      headers = ['Service Name', 'Transaction Count', 'Total Income (BDT)', 'Percentage (%)'];
      lines.push(headers.join(','));
      for (const r of data) {
        lines.push([`"${r.service_name}"`, r.transaction_count, r.total_amount, `"${r.percentage}%"`].join(','));
      }
    } else if (reportType === 'commissions') {
      headers = ['Staff Name', 'Service Name', 'Service Count', 'Total Service Value (BDT)', 'Total Commission (BDT)'];
      lines.push(headers.join(','));
      for (const r of data) {
        lines.push([`"${r.staff_name}"`, `"${r.service_name}"`, r.service_count, r.total_service_value, r.total_commission].join(','));
      }
    } else if (reportType === 'customer_dues') {
      headers = ['Customer Name', 'Phone', 'Service', 'Total Amount (BDT)', 'Advance Paid (BDT)', 'Total Paid (BDT)', 'Due Balance (BDT)', 'Status', 'Due Date'];
      lines.push(headers.join(','));
      for (const r of data) {
        lines.push([
          `"${r.customer_name}"`,
          `"${r.phone || ''}"`,
          `"${r.service_name || ''}"`,
          r.total_amount,
          r.advance_paid,
          r.total_paid,
          r.due_amount,
          `"${r.status}"`,
          `"${r.due_date || ''}"`,
        ].join(','));
      }
    } else if (reportType === 'profit_loss') {
      headers = ['Financial Line Item', 'Amount (BDT)', 'Type'];
      lines.push(headers.join(','));
      for (const r of data) {
        lines.push([`"${r.item}"`, r.amount, `"${r.type}"`].join(','));
      }
      lines.push(['"Note: Cash-basis accounting: Revenues and expenses are recognized when cash is received or disbursed."', '0', '"info"'].join(','));
    }

    const csvContent = lines.join('\r\n');
    const filename = `report_${reportType}_${cleanId}_${new Date().toISOString().split('T')[0]}.csv`;

    return {
      success: true,
      csv: csvContent,
      filename,
    };
  } catch (error: any) {
    console.error('Failed to export report CSV:', error);
    return { success: false, error: error?.message || 'Failed to export CSV.' };
  }
}



