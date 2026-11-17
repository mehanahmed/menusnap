-- ==============================================================================
-- Migration: HRM (Human Resource Management) & Staff Attendance Module Tables
-- Target Database: menubldr / menusnap (MySQL)
-- Safe Migration: Run automatically via ensureHrmSchema() or manually via SQL
-- ==============================================================================

-- 1. Staff Members Table
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
  pin_code VARCHAR(10) NULL DEFAULT '123456',
  shift_start TIME NULL DEFAULT '09:00:00',
  shift_end TIME NULL DEFAULT '18:00:00',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_staff_restaurant (restaurant_id),
  INDEX idx_staff_active (is_active),
  INDEX idx_staff_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Staff Attendance Logs Table
CREATE TABLE IF NOT EXISTS staff_attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id VARCHAR(100) NOT NULL,
  staff_id INT NOT NULL,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'present',
  check_in_time DATETIME NULL,
  check_out_time DATETIME NULL,
  hours_worked DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  late_reason TEXT NULL,
  early_out_reason TEXT NULL,
  note VARCHAR(255) NULL,
  check_in_lat DECIMAL(10, 8) NULL,
  check_in_lng DECIMAL(11, 8) NULL,
  check_out_lat DECIMAL(10, 8) NULL,
  check_out_lng DECIMAL(11, 8) NULL,
  distance_meters INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_staff_attendance (staff_id, date),
  INDEX idx_staff_attendance_restaurant (restaurant_id),
  INDEX idx_staff_attendance_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. HRM Global / Business Shift & Geofence Policy Settings Table
CREATE TABLE IF NOT EXISTS hrm_settings (
  restaurant_id VARCHAR(100) PRIMARY KEY,
  shift_start TIME NOT NULL DEFAULT '09:00:00',
  shift_end TIME NOT NULL DEFAULT '18:00:00',
  grace_period_minutes INT NOT NULL DEFAULT 15,
  half_day_hours DECIMAL(4, 1) NOT NULL DEFAULT 4.0,
  weekend_days VARCHAR(100) NOT NULL DEFAULT 'Friday',
  allow_self_punch TINYINT(1) NOT NULL DEFAULT 1,
  latitude DECIMAL(10, 8) NULL,
  longitude DECIMAL(11, 8) NULL,
  radius_meters INT NOT NULL DEFAULT 100,
  enforce_geofence TINYINT(1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
