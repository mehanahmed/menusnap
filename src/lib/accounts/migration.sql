-- Migration: Accounts Module Tables
-- Target Database: menubldr (or menusnap)

-- 1. Accounts Settings Table
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

-- 2. Expense Categories Table
CREATE TABLE IF NOT EXISTS expense_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id VARCHAR(100) NULL,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'expense',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_expense_categories_restaurant (restaurant_id),
  INDEX idx_expense_categories_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Payment Methods Table
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

-- Seed Default Expense Categories (Global Defaults with restaurant_id IS NULL)
INSERT INTO expense_categories (restaurant_id, name, type, is_default)
SELECT NULL, 'Rent', 'fixed', TRUE
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE name = 'Rent' AND restaurant_id IS NULL AND deleted_at IS NULL);

INSERT INTO expense_categories (restaurant_id, name, type, is_default)
SELECT NULL, 'Utilities', 'variable', TRUE
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE name = 'Utilities' AND restaurant_id IS NULL AND deleted_at IS NULL);

INSERT INTO expense_categories (restaurant_id, name, type, is_default)
SELECT NULL, 'Raw Material', 'cogs', TRUE
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE name = 'Raw Material' AND restaurant_id IS NULL AND deleted_at IS NULL);

INSERT INTO expense_categories (restaurant_id, name, type, is_default)
SELECT NULL, 'Maintenance', 'variable', TRUE
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE name = 'Maintenance' AND restaurant_id IS NULL AND deleted_at IS NULL);

INSERT INTO expense_categories (restaurant_id, name, type, is_default)
SELECT NULL, 'Marketing', 'operating', TRUE
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE name = 'Marketing' AND restaurant_id IS NULL AND deleted_at IS NULL);

INSERT INTO expense_categories (restaurant_id, name, type, is_default)
SELECT NULL, 'Transport', 'operating', TRUE
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE name = 'Transport' AND restaurant_id IS NULL AND deleted_at IS NULL);

INSERT INTO expense_categories (restaurant_id, name, type, is_default)
SELECT NULL, 'Others', 'misc', TRUE
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE name = 'Others' AND restaurant_id IS NULL AND deleted_at IS NULL);

-- Seed Default Payment Methods (Global Defaults with restaurant_id IS NULL)
INSERT INTO payment_methods (restaurant_id, name, type, is_default, is_active)
SELECT NULL, 'Cash', 'cash', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE name = 'Cash' AND restaurant_id IS NULL AND deleted_at IS NULL);

INSERT INTO payment_methods (restaurant_id, name, type, is_default, is_active)
SELECT NULL, 'bKash', 'mfs', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE name = 'bKash' AND restaurant_id IS NULL AND deleted_at IS NULL);

INSERT INTO payment_methods (restaurant_id, name, type, is_default, is_active)
SELECT NULL, 'Nagad', 'mfs', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE name = 'Nagad' AND restaurant_id IS NULL AND deleted_at IS NULL);

INSERT INTO payment_methods (restaurant_id, name, type, is_default, is_active)
SELECT NULL, 'Bank', 'bank', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE name = 'Bank' AND restaurant_id IS NULL AND deleted_at IS NULL);

INSERT INTO payment_methods (restaurant_id, name, type, is_default, is_active)
SELECT NULL, 'Card', 'card', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE name = 'Card' AND restaurant_id IS NULL AND deleted_at IS NULL);

-- 4. Expenses Table (Step 2)
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

-- 5. Vendors Table (Step 3)
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

-- 6. Vendor Bills Table (Step 3)
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

-- 7. Vendor Payments Table (Step 3)
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

-- 8. Staff Table (Step 4)
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

-- 9. Staff Attendance Table (Step 4)
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

-- 10. Staff Salary Records Table (Step 4)
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

-- 11. Staff Advances Table (Step 4)
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

-- Seed Staff Salary & Advance Categories
INSERT INTO expense_categories (restaurant_id, name, type, is_default)
SELECT NULL, 'Staff Salary', 'operating', TRUE
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE name = 'Staff Salary' AND restaurant_id IS NULL AND deleted_at IS NULL);

INSERT INTO expense_categories (restaurant_id, name, type, is_default)
SELECT NULL, 'Staff Advance', 'operating', TRUE
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE name = 'Staff Advance' AND restaurant_id IS NULL AND deleted_at IS NULL);

-- 12. Services Table (Parlour Service Catalog)
CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  category VARCHAR(100) NULL,
  duration_minutes INT NULL,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_services_restaurant (restaurant_id),
  INDEX idx_services_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Staff Commissions Table (Parlour Commission Module)
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

-- 14. Incomes Table (Restaurant & Parlour Manual & Auto Income)
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

-- 15. Customers Due Table (Parlour Customer Accounts Receivable)
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

-- 16. Customer Payments Table (Parlour Customer Dues Settlements)
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




