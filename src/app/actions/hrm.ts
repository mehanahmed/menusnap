"use server";

import pool from '@/lib/mysql';
import { resolveAuthenticatedRestaurantId, getClientBusinessType } from './accounts';
import { calculateDistanceInMeters, formatMinutesHuman, formatTime12h, type HrmSettings, type StaffAttendanceItem } from '@/lib/hrm-constants';
import { getDhakaDate } from '@/lib/accounts/helpers';

/**
 * Ensures required HRM tables and columns exist in MySQL.
 */
let hrmSchemaChecked = false;
export async function ensureHrmSchema(): Promise<void> {
  if (hrmSchemaChecked) return;
  try {
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
        console.warn(`HRM schema check warning for ${table}.${column}:`, err);
      }
    };

    // 1. Ensure staff table exists
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
    `);

    // 2. Ensure staff_attendance table exists
    await pool.execute(`
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
    `);

    // Columns on staff (safe migration for existing tables)
    await checkAndAddColumn('staff', 'pin_code', "VARCHAR(10) NULL DEFAULT '123456'");
    await checkAndAddColumn('staff', 'shift_start', "TIME NULL DEFAULT '09:00:00'");
    await checkAndAddColumn('staff', 'shift_end', "TIME NULL DEFAULT '18:00:00'");

    // Columns on staff_attendance (safe migration for existing tables)
    await checkAndAddColumn('staff_attendance', 'check_in_time', "DATETIME NULL");
    await checkAndAddColumn('staff_attendance', 'check_out_time', "DATETIME NULL");
    await checkAndAddColumn('staff_attendance', 'hours_worked', "DECIMAL(5, 2) NOT NULL DEFAULT 0.00");
    await checkAndAddColumn('staff_attendance', 'late_reason', "TEXT NULL");
    await checkAndAddColumn('staff_attendance', 'early_out_reason', "TEXT NULL");
    await checkAndAddColumn('staff_attendance', 'check_in_lat', "DECIMAL(10, 8) NULL");
    await checkAndAddColumn('staff_attendance', 'check_in_lng', "DECIMAL(11, 8) NULL");
    await checkAndAddColumn('staff_attendance', 'check_out_lat', "DECIMAL(10, 8) NULL");
    await checkAndAddColumn('staff_attendance', 'check_out_lng', "DECIMAL(11, 8) NULL");
    await checkAndAddColumn('staff_attendance', 'distance_meters', "INT NULL");

    // Table hrm_settings
    await pool.execute(`
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
    `);

    // Ensure columns in hrm_settings if table already existed
    await checkAndAddColumn('hrm_settings', 'latitude', 'DECIMAL(10, 8) NULL');
    await checkAndAddColumn('hrm_settings', 'longitude', 'DECIMAL(11, 8) NULL');
    await checkAndAddColumn('hrm_settings', 'radius_meters', 'INT NOT NULL DEFAULT 100');
    await checkAndAddColumn('hrm_settings', 'enforce_geofence', 'TINYINT(1) NOT NULL DEFAULT 0');
    hrmSchemaChecked = true;
  } catch (error) {
    console.error('Error running ensureHrmSchema:', error);
  }
}

/**
 * Auto Check-Out after 12:00 AM (Midnight)
 * Closes unclosed shifts from previous days (date < today in Asia/Dhaka timezone).
 * Sets check_out_time to scheduled shift_end (or 23:59:59), calculates hours_worked,
 * and records transparent audit notes.
 */
export async function autoCloseMidnightShifts(restaurantId?: string | number): Promise<{
  success: boolean;
  closedCount: number;
  error?: string;
}> {
  try {
    await ensureHrmSchema();
    const todayDhaka = getDhakaDate().dateStr;

    const whereClauses = [
      'a.date < ?',
      'a.check_in_time IS NOT NULL',
      'a.check_out_time IS NULL',
    ];
    const params: any[] = [todayDhaka];

    if (restaurantId) {
      whereClauses.push('a.restaurant_id = ?');
      params.push(String(restaurantId).trim());
    }

    const [res]: any = await pool.query(
      `UPDATE staff_attendance a
       JOIN staff s ON a.staff_id = s.id
       SET 
         a.check_out_time = CASE
           WHEN TIMESTAMP(CONCAT(a.date, ' ', COALESCE(s.shift_end, '18:00:00'))) > a.check_in_time 
             THEN TIMESTAMP(CONCAT(a.date, ' ', COALESCE(s.shift_end, '18:00:00')))
           ELSE TIMESTAMP(CONCAT(a.date, ' 23:59:59'))
         END,
         a.hours_worked = ROUND(
           TIMESTAMPDIFF(
             SECOND, 
             a.check_in_time, 
             CASE
               WHEN TIMESTAMP(CONCAT(a.date, ' ', COALESCE(s.shift_end, '18:00:00'))) > a.check_in_time 
                 THEN TIMESTAMP(CONCAT(a.date, ' ', COALESCE(s.shift_end, '18:00:00')))
               ELSE TIMESTAMP(CONCAT(a.date, ' 23:59:59'))
             END
           ) / 3600, 
           2
         ),
         a.early_out_reason = COALESCE(a.early_out_reason, 'Auto check-out (Midnight)'),
         a.note = CASE 
           WHEN a.note IS NULL OR a.note = '' THEN 'System auto check-out after 12:00 AM'
           WHEN a.note NOT LIKE '%auto check-out%' THEN CONCAT(a.note, ' | System auto check-out after 12:00 AM')
           ELSE a.note
         END
       WHERE ${whereClauses.join(' AND ')}`,
      params
    );

    return { success: true, closedCount: Number(res.affectedRows || 0) };
  } catch (error: any) {
    console.error('Error running autoCloseMidnightShifts:', error);
    return { success: false, closedCount: 0, error: error?.message || 'Failed to auto check out shifts.' };
  }
}

/**
 * Get HRM Settings for a restaurant, with fallbacks.
 */
export async function getHrmSettingsAction(restaurantId?: string | number): Promise<{
  success: boolean;
  settings?: HrmSettings;
  error?: string;
}> {
  try {
    await ensureHrmSchema();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;

    const [rows]: any = await pool.execute(
      `SELECT restaurant_id, 
              TIME_FORMAT(shift_start, '%H:%i') as shift_start, 
              TIME_FORMAT(shift_end, '%H:%i') as shift_end, 
              grace_period_minutes, half_day_hours, weekend_days, allow_self_punch,
              latitude, longitude, radius_meters, enforce_geofence
       FROM hrm_settings WHERE restaurant_id = ? LIMIT 1`,
      [cleanId]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      const row = rows[0];
      return {
        success: true,
        settings: {
          restaurant_id: cleanId,
          shift_start: row.shift_start || '09:00',
          shift_end: row.shift_end || '18:00',
          grace_period_minutes: Number(row.grace_period_minutes || 15),
          half_day_hours: Number(row.half_day_hours || 4.0),
          weekend_days: row.weekend_days || 'Friday',
          allow_self_punch: Boolean(row.allow_self_punch),
          latitude: row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : null,
          longitude: row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : null,
          radius_meters: Number(row.radius_meters || 100),
          enforce_geofence: Boolean(row.enforce_geofence),
        },
      };
    }

    // Default settings if not configured
    const defaultSettings: HrmSettings = {
      restaurant_id: cleanId,
      shift_start: '09:00',
      shift_end: '18:00',
      grace_period_minutes: 15,
      half_day_hours: 4.0,
      weekend_days: 'Friday',
      allow_self_punch: true,
      latitude: null,
      longitude: null,
      radius_meters: 100,
      enforce_geofence: false,
    };

    return { success: true, settings: defaultSettings };
  } catch (error: any) {
    console.error('Failed to get HRM settings:', error);
    return { success: false, error: error?.message || 'Failed to get settings.' };
  }
}

/**
 * Update HRM Settings for a restaurant.
 */
export async function updateHrmSettingsAction(
  restaurantId: string | number,
  settings: Partial<HrmSettings>
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await ensureHrmSchema();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;

    const shiftStart = settings.shift_start || '09:00';
    const shiftEnd = settings.shift_end || '18:00';
    const graceMin = Math.max(0, Number(settings.grace_period_minutes ?? 15));
    const halfDay = Math.max(1, Number(settings.half_day_hours ?? 4.0));
    const weekends = (settings.weekend_days || 'Friday').trim();
    const allowSelfPunch = settings.allow_self_punch === false ? 0 : 1;
    const latitude =
      settings.latitude !== undefined && settings.latitude !== null && String(settings.latitude).trim() !== ''
        ? Number(settings.latitude)
        : null;
    const longitude =
      settings.longitude !== undefined && settings.longitude !== null && String(settings.longitude).trim() !== ''
        ? Number(settings.longitude)
        : null;
    const radiusMeters = Math.max(10, Number(settings.radius_meters || 100));
    const enforceGeofence = settings.enforce_geofence ? 1 : 0;

    await pool.execute(
      `INSERT INTO hrm_settings 
        (restaurant_id, shift_start, shift_end, grace_period_minutes, half_day_hours, weekend_days, allow_self_punch, latitude, longitude, radius_meters, enforce_geofence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        shift_start = VALUES(shift_start),
        shift_end = VALUES(shift_end),
        grace_period_minutes = VALUES(grace_period_minutes),
        half_day_hours = VALUES(half_day_hours),
        weekend_days = VALUES(weekend_days),
        allow_self_punch = VALUES(allow_self_punch),
        latitude = VALUES(latitude),
        longitude = VALUES(longitude),
        radius_meters = VALUES(radius_meters),
        enforce_geofence = VALUES(enforce_geofence)`,
      [cleanId, shiftStart, shiftEnd, graceMin, halfDay, weekends, allowSelfPunch, latitude, longitude, radiusMeters, enforceGeofence]
    );

    return { success: true, message: 'HRM Settings updated successfully.' };
  } catch (error: any) {
    console.error('Failed to update HRM settings:', error);
    return { success: false, error: error?.message || 'Failed to update settings.' };
  }
}

/**
 * Today's HRM Live Board Overview (KPIs + Today's real-time roster attendance).
 */
export async function getHrmOverviewAction(
  restaurantId?: string | number,
  dateStr?: string
): Promise<{
  success: boolean;
  businessType?: 'restaurant' | 'parlour';
  restaurantId?: string;
  date?: string;
  kpis?: {
    totalStaff: number;
    checkedIn: number;
    onTime: number;
    late: number;
    absent: number;
    onLeave: number;
  };
  todayAttendance?: StaffAttendanceItem[];
  settings?: HrmSettings;
  error?: string;
}> {
  try {
    await ensureHrmSchema();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;
    // Auto-checkout any unclosed shifts from previous days after midnight
    await autoCloseMidnightShifts(cleanId);
    const businessType = await getClientBusinessType(cleanId);
    const targetDate = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? dateStr
      : getDhakaDate().dateStr; // 'YYYY-MM-DD' (Asia/Dhaka)

    // Get Settings
    const settingsRes = await getHrmSettingsAction(cleanId);
    const settings = settingsRes.settings || {
      restaurant_id: cleanId,
      shift_start: '09:00',
      shift_end: '18:00',
      grace_period_minutes: 15,
      half_day_hours: 4.0,
      weekend_days: 'Friday',
      allow_self_punch: true,
    };

    // Query active staff and join with today's attendance record
    const sql = `
      SELECT 
        s.id as staff_id,
        s.name,
        s.phone,
        COALESCE(s.role, 'Staff') as role,
        COALESCE(s.pin_code, '123456') as pin_code,
        COALESCE(TIME_FORMAT(s.shift_start, '%H:%i'), ?) as shift_start,
        COALESCE(TIME_FORMAT(s.shift_end, '%H:%i'), ?) as shift_end,
        s.base_salary,
        a.id as attendance_id,
        a.date,
        a.status,
        a.check_in_time,
        a.check_out_time,
        COALESCE(a.hours_worked, 0.00) as hours_worked,
        a.late_reason,
        a.early_out_reason,
        a.note,
        a.check_in_lat,
        a.check_in_lng,
        a.check_out_lat,
        a.check_out_lng,
        a.distance_meters
      FROM staff s
      LEFT JOIN staff_attendance a 
        ON s.id = a.staff_id AND a.date = ? AND a.restaurant_id = ?
      WHERE s.restaurant_id = ? AND s.is_active = TRUE AND s.deleted_at IS NULL
      ORDER BY s.name ASC
    `;

    const [rows]: any = await pool.execute(sql, [
      settings.shift_start,
      settings.shift_end,
      targetDate,
      cleanId,
      cleanId,
    ]);

    let checkedInCount = 0;
    let onTimeCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let onLeaveCount = 0;

    const list: StaffAttendanceItem[] = (rows || []).map((r: any) => {
      let status: StaffAttendanceItem['status'] = 'not_marked';

      if (r.status === 'present') {
        status = 'present';
        checkedInCount++;
        onTimeCount++;
      } else if (r.status === 'late') {
        status = 'late';
        checkedInCount++;
        lateCount++;
      } else if (r.status === 'half_day') {
        status = 'half_day';
        checkedInCount++;
      } else if (r.status === 'absent') {
        status = 'absent';
        absentCount++;
      } else if (r.status === 'leave') {
        status = 'leave';
        onLeaveCount++;
      } else if (r.check_in_time) {
        // Fallback if check_in_time exists but status wasn't set
        status = 'present';
        checkedInCount++;
        onTimeCount++;
      }

      return {
        id: r.attendance_id || undefined,
        staff_id: Number(r.staff_id),
        name: r.name,
        phone: r.phone,
        role: r.role,
        pin_code: r.pin_code,
        shift_start: r.shift_start || settings.shift_start,
        shift_end: r.shift_end || settings.shift_end,
        base_salary: Number(r.base_salary || 0),
        date: targetDate,
        status,
        check_in_time: r.check_in_time ? new Date(r.check_in_time).toISOString() : null,
        check_out_time: r.check_out_time ? new Date(r.check_out_time).toISOString() : null,
        hours_worked: Number(r.hours_worked || 0),
        late_reason: r.late_reason,
        early_out_reason: r.early_out_reason,
        note: r.note,
        check_in_lat: r.check_in_lat !== null && r.check_in_lat !== undefined ? Number(r.check_in_lat) : null,
        check_in_lng: r.check_in_lng !== null && r.check_in_lng !== undefined ? Number(r.check_in_lng) : null,
        check_out_lat: r.check_out_lat !== null && r.check_out_lat !== undefined ? Number(r.check_out_lat) : null,
        check_out_lng: r.check_out_lng !== null && r.check_out_lng !== undefined ? Number(r.check_out_lng) : null,
        distance_meters: r.distance_meters !== null && r.distance_meters !== undefined ? Number(r.distance_meters) : null,
      };
    });

    const totalStaff = list.length;
    // Unmarked staff are considered pending or absent for today
    const pendingCount = totalStaff - (checkedInCount + absentCount + onLeaveCount);

    return {
      success: true,
      businessType,
      restaurantId: cleanId,
      date: targetDate,
      kpis: {
        totalStaff,
        checkedIn: checkedInCount,
        onTime: onTimeCount,
        late: lateCount,
        absent: absentCount + Math.max(0, pendingCount),
        onLeave: onLeaveCount,
      },
      todayAttendance: list,
      settings,
    };
  } catch (error: any) {
    console.error('Failed to get HRM overview:', error);
    return { success: false, error: error?.message || 'Failed to load HRM overview.' };
  }
}

/**
 * Get Staff Roster for HRM directory & kiosk.
 */
export async function getStaffRosterAction(restaurantId?: string | number): Promise<{
  success: boolean;
  businessType?: 'restaurant' | 'parlour';
  staff?: Array<{
    id: number;
    name: string;
    phone: string | null;
    role: string;
    pin_code: string;
    shift_start: string;
    shift_end: string;
    salary_type: string;
    base_salary: number;
    is_active: boolean;
    joining_date: string | null;
  }>;
  error?: string;
}> {
  try {
    await ensureHrmSchema();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;
    const businessType = await getClientBusinessType(cleanId);

    const [rows]: any = await pool.execute(
      `SELECT 
        id, name, phone, 
        COALESCE(role, 'Staff') as role, 
        COALESCE(pin_code, '123456') as pin_code,
        COALESCE(TIME_FORMAT(shift_start, '%H:%i'), '09:00') as shift_start,
        COALESCE(TIME_FORMAT(shift_end, '%H:%i'), '18:00') as shift_end,
        salary_type,
        base_salary,
        is_active,
        DATE_FORMAT(joining_date, '%Y-%m-%d') as joining_date
       FROM staff 
       WHERE restaurant_id = ? AND deleted_at IS NULL 
       ORDER BY is_active DESC, name ASC`,
      [cleanId]
    );

    return {
      success: true,
      businessType,
      staff: (rows || []).map((r: any) => ({
        id: Number(r.id),
        name: r.name,
        phone: r.phone,
        role: r.role,
        pin_code: r.pin_code,
        shift_start: r.shift_start,
        shift_end: r.shift_end,
        salary_type: r.salary_type || 'monthly',
        base_salary: Number(r.base_salary || 0),
        is_active: Boolean(r.is_active),
        joining_date: r.joining_date,
      })),
    };
  } catch (error: any) {
    console.error('Failed to get staff roster:', error);
    return { success: false, error: error?.message || 'Failed to load staff roster.' };
  }
}

/**
 * Save / Update Staff profile with HRM fields (PIN, Shift Start, Shift End).
 */
export async function saveStaffRosterAction(
  restaurantId: string | number,
  data: {
    id?: number;
    name: string;
    phone?: string;
    role: string;
    pin_code?: string;
    shift_start?: string;
    shift_end?: string;
    salary_type?: string;
    base_salary?: number;
    is_active?: boolean;
    joining_date?: string;
  }
): Promise<{ success: boolean; id?: number; message?: string; error?: string }> {
  try {
    await ensureHrmSchema();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;

    const trimmedName = (data.name || '').trim();
    if (!trimmedName) {
      return { success: false, error: 'Staff name is required.' };
    }

    const pin = (data.pin_code || '123456').trim().slice(0, 10);
    const shiftStart = data.shift_start || '09:00:00';
    const shiftEnd = data.shift_end || '18:00:00';
    const baseSal = Math.max(0, Number(data.base_salary || 0));
    const role = (data.role || 'Staff').trim();
    const salaryType = data.salary_type || 'monthly';
    const phone = data.phone ? data.phone.trim() : null;
    const joiningDate = data.joining_date || null;
    const isActive = data.is_active === false ? 0 : 1;

    if (data.id) {
      // Update existing
      await pool.execute(
        `UPDATE staff SET 
          name = ?, phone = ?, role = ?, pin_code = ?, shift_start = ?, shift_end = ?, 
          salary_type = ?, base_salary = ?, is_active = ?, joining_date = ?
         WHERE id = ? AND restaurant_id = ?`,
        [
          trimmedName,
          phone,
          role,
          pin,
          shiftStart,
          shiftEnd,
          salaryType,
          baseSal,
          isActive,
          joiningDate,
          Number(data.id),
          cleanId,
        ]
      );
      return { success: true, id: Number(data.id), message: 'Staff profile updated.' };
    } else {
      // Create new
      const [res]: any = await pool.execute(
        `INSERT INTO staff (
          restaurant_id, name, phone, role, pin_code, shift_start, shift_end, 
          salary_type, base_salary, is_active, joining_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cleanId,
          trimmedName,
          phone,
          role,
          pin,
          shiftStart,
          shiftEnd,
          salaryType,
          baseSal,
          isActive,
          joiningDate,
        ]
      );
      return { success: true, id: res.insertId, message: 'Staff member added successfully.' };
    }
  } catch (error: any) {
    console.error('Failed to save staff roster:', error);
    return { success: false, error: error?.message || 'Failed to save staff.' };
  }
}

/**
 * Check In / Check Out Action (Supports both Mobile Phone + PIN, or Staff ID + PIN).
 * Can be used by Counter Kiosk tablet or Staff Mobile Phone.
 */
export async function staffPunchAction(params: {
  restaurantId?: string | number;
  staffId?: number;
  phone?: string;
  pinCode?: string;
  actionType?: 'in' | 'out';
  note?: string;
  lateReason?: string;
  latitude?: number;
  longitude?: number;
  bypassShiftWindow?: boolean;
}): Promise<{
  success: boolean;
  actionType?: 'in' | 'out';
  status?: string;
  staffName?: string;
  role?: string;
  checkInTime?: string;
  checkOutTime?: string;
  hoursWorked?: number;
  message?: string;
  distanceMeters?: number | null;
  error?: string;
}> {
  try {
    await ensureHrmSchema();

    let cleanId = '';
    let staffMember: any = null;

    if (params.phone) {
      const rawDigits = String(params.phone).trim().replace(/\D/g, '');
      const phone11 = rawDigits.startsWith('8801') ? rawDigits.slice(2) : rawDigits;
      const phonePrefixed = `+88${phone11}`;

      const conditions = [
        'is_active = TRUE',
        'deleted_at IS NULL',
        '(phone = ? OR phone = ? OR phone LIKE ?)',
      ];
      const qParams: any[] = [phone11, phonePrefixed, `%${phone11}`];

      if (params.restaurantId) {
        conditions.push('restaurant_id = ?');
        qParams.push(String(params.restaurantId).trim());
      }

      const [staffRows]: any = await pool.execute(
        `SELECT id, restaurant_id, name, role, phone, pin_code, 
                TIME_FORMAT(shift_start, '%H:%i') as shift_start, 
                TIME_FORMAT(shift_end, '%H:%i') as shift_end 
         FROM staff WHERE ${conditions.join(' AND ')} LIMIT 1`,
        qParams
      );

      if (!Array.isArray(staffRows) || staffRows.length === 0) {
        return { success: false, error: 'No active employee found with this mobile number.' };
      }
      staffMember = staffRows[0];
      cleanId = staffMember.restaurant_id;
    } else if (params.staffId) {
      const authCheck = await resolveAuthenticatedRestaurantId(params.restaurantId);
      if (!authCheck.success || !authCheck.restaurantId) {
        return { success: false, error: authCheck.error || 'Unauthorized.' };
      }
      cleanId = authCheck.restaurantId;
      const staffId = Number(params.staffId);

      const [staffRows]: any = await pool.execute(
        `SELECT id, restaurant_id, name, role, phone, pin_code, 
                TIME_FORMAT(shift_start, '%H:%i') as shift_start, 
                TIME_FORMAT(shift_end, '%H:%i') as shift_end 
         FROM staff WHERE id = ? AND restaurant_id = ? AND is_active = TRUE AND deleted_at IS NULL LIMIT 1`,
        [staffId, cleanId]
      );

      if (!Array.isArray(staffRows) || staffRows.length === 0) {
        return { success: false, error: 'Staff member not found or inactive.' };
      }
      staffMember = staffRows[0];
    } else {
      return { success: false, error: 'Employee mobile number or staff ID is required.' };
    }

    const staffId = Number(staffMember.id);

    // Verify 6-digit PIN code
    if (params.pinCode !== undefined && params.pinCode !== null && params.pinCode !== '') {
      const storedPin = String(staffMember.pin_code || '123456').trim();
      const enteredPin = String(params.pinCode).trim();
      if (storedPin !== enteredPin) {
        return { success: false, error: 'Incorrect 6-digit PIN code. Please try again.' };
      }
    }

    // Get HRM Shift Settings
    const settingsRes = await getHrmSettingsAction(cleanId);
    const settings = settingsRes.settings || {
      restaurant_id: cleanId,
      shift_start: '09:00',
      shift_end: '18:00',
      grace_period_minutes: 15,
      half_day_hours: 4.0,
      weekend_days: 'Friday',
      allow_self_punch: true,
    };

    // Auto-checkout any unclosed shifts from previous days after midnight
    await autoCloseMidnightShifts(cleanId);

    const todayDate = getDhakaDate().dateStr; // 'YYYY-MM-DD' (Asia/Dhaka)
    const now = new Date();

    // Check existing attendance for today
    const [attRows]: any = await pool.execute(
      `SELECT id, status, check_in_time, check_out_time, hours_worked 
       FROM staff_attendance 
       WHERE restaurant_id = ? AND staff_id = ? AND date = ? LIMIT 1`,
      [cleanId, staffId, todayDate]
    );

    const existing = Array.isArray(attRows) && attRows.length > 0 ? attRows[0] : null;

    // Auto-detect actionType if not provided
    let effectiveAction = params.actionType;
    if (!effectiveAction) {
      if (!existing || !existing.check_in_time) {
        effectiveAction = 'in';
      } else if (!existing.check_out_time) {
        effectiveAction = 'out';
      } else {
        return {
          success: false,
          error: `Shift already completed for today (${existing.hours_worked} hrs worked).`,
        };
      }
    }

    if (effectiveAction === 'in') {
      if (existing && existing.check_in_time) {
        const inTimeStr = new Date(existing.check_in_time).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        return {
          success: false,
          error: `Already checked in today at ${inTimeStr}.`,
        };
      }

      // Geofence GPS Validation if enabled by business
      let distanceRecorded: number | null = null;
      const paramLat = params.latitude !== undefined && params.latitude !== null && !isNaN(Number(params.latitude)) ? Number(params.latitude) : null;
      const paramLng = params.longitude !== undefined && params.longitude !== null && !isNaN(Number(params.longitude)) ? Number(params.longitude) : null;

      if (settings.enforce_geofence && settings.latitude !== null && settings.latitude !== undefined && settings.longitude !== null && settings.longitude !== undefined) {
        if (paramLat === null || paramLng === null) {
          return {
            success: false,
            error: 'GPS location required. Please allow location access on your device to check in.',
          };
        }

        const dist = calculateDistanceInMeters(
          paramLat,
          paramLng,
          Number(settings.latitude),
          Number(settings.longitude)
        );
        distanceRecorded = Math.round(dist);
        const allowedRadius = Number(settings.radius_meters || 100);

        if (dist > allowedRadius) {
          return {
            success: false,
            error: `Outside business premises (${distanceRecorded}m away). Check-in allowed only within ${allowedRadius}m.`,
          };
        }
      } else if (paramLat !== null && paramLng !== null && settings.latitude && settings.longitude) {
        // Record distance for auditing even if not strictly enforced
        const dist = calculateDistanceInMeters(
          paramLat,
          paramLng,
          Number(settings.latitude),
          Number(settings.longitude)
        );
        distanceRecorded = Math.round(dist);
      }

      // Shift Schedule Window Validation
      const expectedShiftStart = staffMember.shift_start || settings.shift_start || '09:00';
      const expectedShiftEnd = staffMember.shift_end || settings.shift_end || '18:00';

      const [startHour, startMin] = String(expectedShiftStart).split(':').map(Number);
      const shiftStartTimeToday = new Date(now);
      shiftStartTimeToday.setHours(isNaN(startHour) ? 9 : startHour, isNaN(startMin) ? 0 : startMin, 0, 0);

      const [endHour, endMin] = String(expectedShiftEnd).split(':').map(Number);
      const shiftEndTimeToday = new Date(now);
      shiftEndTimeToday.setHours(isNaN(endHour) ? 18 : endHour, isNaN(endMin) ? 0 : endMin, 0, 0);

      // Handle overnight shifts crossing midnight (e.g. 20:00 to 04:00)
      if (shiftEndTimeToday <= shiftStartTimeToday) {
        if (now.getHours() >= (isNaN(startHour) ? 9 : startHour)) {
          shiftEndTimeToday.setDate(shiftEndTimeToday.getDate() + 1);
        } else {
          shiftStartTimeToday.setDate(shiftStartTimeToday.getDate() - 1);
        }
      }

      // Block check-in if scheduled shift has already passed
      if (!params.bypassShiftWindow && now > shiftEndTimeToday) {
        const formattedEndTime = formatTime12h(expectedShiftEnd);
        return {
          success: false,
          error: `Shift ended at ${formattedEndTime}. Check-in is not allowed after scheduled shift hours. Please contact your manager.`,
        };
      }

      // Calculate On Time vs Late
      const graceMinutes = settings.grace_period_minutes || 15;
      const graceThresholdTime = new Date(shiftStartTimeToday.getTime() + graceMinutes * 60 * 1000);

      const isLate = now > graceThresholdTime;
      const status = isLate ? 'late' : 'present';
      const lateDiffMinutes = Math.max(0, Math.round((now.getTime() - shiftStartTimeToday.getTime()) / 60000));
      const autoLateReason = isLate ? `Late by ${formatMinutesHuman(lateDiffMinutes)}` : null;
      const lateReason = params.lateReason || autoLateReason;

      await pool.execute(
        `INSERT INTO staff_attendance 
          (restaurant_id, staff_id, date, status, check_in_time, late_reason, note, check_in_lat, check_in_lng, distance_meters)
         VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          status = VALUES(status),
          check_in_time = VALUES(check_in_time),
          late_reason = VALUES(late_reason),
          note = VALUES(note),
          check_in_lat = VALUES(check_in_lat),
          check_in_lng = VALUES(check_in_lng),
          distance_meters = VALUES(distance_meters)`,
        [cleanId, staffId, todayDate, status, lateReason, params.note || null, paramLat, paramLng, distanceRecorded]
      );

      return {
        success: true,
        actionType: 'in',
        status: isLate ? 'Late' : 'On Time',
        staffName: staffMember.name,
        role: staffMember.role,
        checkInTime: now.toISOString(),
        distanceMeters: distanceRecorded,
        message: isLate
          ? `Checked In (Late by ${formatMinutesHuman(lateDiffMinutes)}). Have a productive shift!`
          : `Checked In On Time! Have a great shift, ${staffMember.name}.`,
      };
    } else {
      // actionType === 'out'
      if (!existing || !existing.check_in_time) {
        return {
          success: false,
          error: 'Cannot Check Out without checking in first today.',
        };
      }

      if (existing.check_out_time) {
        return {
          success: false,
          error: 'Already clocked out for today.',
        };
      }

      const paramLat = params.latitude !== undefined && params.latitude !== null && !isNaN(Number(params.latitude)) ? Number(params.latitude) : null;
      const paramLng = params.longitude !== undefined && params.longitude !== null && !isNaN(Number(params.longitude)) ? Number(params.longitude) : null;

      // Calculate hours worked
      const checkInDate = new Date(existing.check_in_time);
      const diffMs = Math.max(0, now.getTime() - checkInDate.getTime());
      const hoursWorked = Number((diffMs / (1000 * 60 * 60)).toFixed(2));

      // Early out check
      const expectedShiftEnd = staffMember.shift_end || settings.shift_end || '18:00';
      const [endHour, endMin] = expectedShiftEnd.split(':').map(Number);
      const shiftEndTimeToday = new Date(now);
      shiftEndTimeToday.setHours(endHour, endMin, 0, 0);

      let earlyOutReason: string | null = null;
      if (now < shiftEndTimeToday) {
        const earlyDiffMins = Math.round((shiftEndTimeToday.getTime() - now.getTime()) / 60000);
        earlyOutReason = `Early leave by ${formatMinutesHuman(earlyDiffMins)}`;
      }

      // Check if half day
      let finalStatus = existing.status || 'present';
      if (hoursWorked < settings.half_day_hours && hoursWorked >= 1.0) {
        finalStatus = 'half_day';
      }

      await pool.execute(
        `UPDATE staff_attendance SET 
          check_out_time = NOW(),
          hours_worked = ?,
          status = ?,
          early_out_reason = ?,
          check_out_lat = ?,
          check_out_lng = ?
         WHERE id = ?`,
        [hoursWorked, finalStatus, earlyOutReason, paramLat, paramLng, existing.id]
      );

      return {
        success: true,
        actionType: 'out',
        status: finalStatus,
        staffName: staffMember.name,
        role: staffMember.role,
        checkOutTime: now.toISOString(),
        hoursWorked,
        message: `Clocked Out successfully! Worked ${hoursWorked} hrs today. Take care, ${staffMember.name}!`,
      };
    }
  } catch (error: any) {
    console.error('Failed to process staff punch:', error);
    return { success: false, error: error?.message || 'Failed to punch attendance.' };
  }
}

/**
 * Staff Self-Service Login & Portal View (for staff personal phone).
 */
export async function staffLoginPortalAction(params: {
  phone: string;
  pinCode: string;
  restaurantId?: string | number;
}): Promise<{
  success: boolean;
  staff?: {
    id: number;
    name: string;
    role: string;
    phone: string;
    shift_start: string;
    shift_end: string;
    restaurant_id: string;
    business_name: string;
  };
  todayAttendance?: {
    date: string;
    status: string;
    check_in_time: string | null;
    check_out_time: string | null;
    hours_worked: number;
    late_reason: string | null;
  };
  monthSummary?: {
    presentDays: number;
    lateDays: number;
    totalHoursWorked: number;
  };
  multipleWorkplaces?: boolean;
  workplaces?: Array<{
    restaurantId: string;
    businessName: string;
    role: string;
    name: string;
  }>;
  geofence?: {
    latitude: number | null;
    longitude: number | null;
    radius_meters: number;
    enforce_geofence: boolean;
  };
  error?: string;
}> {
  try {
    await ensureHrmSchema();

    const rawDigits = String(params.phone || '').trim().replace(/\D/g, '');
    const phone11 = rawDigits.startsWith('8801') ? rawDigits.slice(2) : rawDigits;
    const phonePrefixed = `+88${phone11}`;

    const conditions = [
      's.is_active = TRUE',
      's.deleted_at IS NULL',
      '(s.phone = ? OR s.phone = ? OR s.phone LIKE ?)',
    ];
    const qParams: any[] = [phone11, phonePrefixed, `%${phone11}`];

    if (params.restaurantId) {
      const cleanRid = String(params.restaurantId).trim();
      conditions.push('(s.restaurant_id = ? OR c.id = ? OR c.business_name = ?)');
      qParams.push(cleanRid, cleanRid, cleanRid);
    }

    const [staffRows]: any = await pool.execute(
      `SELECT s.id, s.restaurant_id, s.name, s.role, s.phone, s.pin_code, 
              TIME_FORMAT(s.shift_start, '%H:%i') as shift_start, 
              TIME_FORMAT(s.shift_end, '%H:%i') as shift_end,
              COALESCE(c.business_name, 'Business') as business_name
       FROM staff s
       LEFT JOIN clients c ON s.restaurant_id = c.id OR s.restaurant_id = c.business_name
       WHERE ${conditions.join(' AND ')} 
       LIMIT 5`,
      qParams
    );

    if (!Array.isArray(staffRows) || staffRows.length === 0) {
      return { success: false, error: 'No registered employee found with this phone number.' };
    }

    // If staff member works at multiple businesses with the same phone and no specific business was requested
    if (staffRows.length > 1 && !params.restaurantId) {
      return {
        success: true,
        multipleWorkplaces: true,
        workplaces: staffRows.map((r: any) => ({
          restaurantId: r.restaurant_id,
          businessName: r.business_name,
          role: r.role || 'Staff',
          name: r.name,
        })),
      };
    }

    const staffMember = staffRows[0];

    // Verify 6-digit PIN code
    const storedPin = String(staffMember.pin_code || '123456').trim();
    const enteredPin = String(params.pinCode || '').trim();
    if (storedPin !== enteredPin) {
      return { success: false, error: 'Incorrect 6-digit PIN code. Please try again.' };
    }

    // Auto-checkout any unclosed shifts from previous days after midnight
    await autoCloseMidnightShifts(staffMember.restaurant_id);

    const dhakaNow = getDhakaDate();
    const todayDate = dhakaNow.dateStr;

    // Get today's attendance
    const [attRows]: any = await pool.execute(
      `SELECT id, status, check_in_time, check_out_time, hours_worked, late_reason 
       FROM staff_attendance 
       WHERE staff_id = ? AND date = ? LIMIT 1`,
      [staffMember.id, todayDate]
    );

    const todayRecord = Array.isArray(attRows) && attRows.length > 0 ? attRows[0] : null;

    // Get this month's stats
    const currentMonthStr = dhakaNow.monthStr;

    const [monthRows]: any = await pool.execute(
      `SELECT 
         SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as presents,
         SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as lates,
         COALESCE(SUM(hours_worked), 0.00) as total_hours
       FROM staff_attendance 
       WHERE staff_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?`,
      [staffMember.id, currentMonthStr]
    );

    const m = monthRows?.[0] || {};

    // Get Business HRM Geofence Settings
    const settingsRes = await getHrmSettingsAction(staffMember.restaurant_id);
    const hrmSet = settingsRes.settings;

    return {
      success: true,
      staff: {
        id: Number(staffMember.id),
        name: staffMember.name,
        role: staffMember.role || 'Staff',
        phone: staffMember.phone,
        shift_start: staffMember.shift_start || '09:00',
        shift_end: staffMember.shift_end || '18:00',
        restaurant_id: staffMember.restaurant_id,
        business_name: staffMember.business_name,
      },
      geofence: {
        latitude: hrmSet?.latitude ?? null,
        longitude: hrmSet?.longitude ?? null,
        radius_meters: hrmSet?.radius_meters ?? 100,
        enforce_geofence: Boolean(hrmSet?.enforce_geofence),
      },
      todayAttendance: todayRecord
        ? {
            date: todayDate,
            status: todayRecord.status,
            check_in_time: todayRecord.check_in_time ? new Date(todayRecord.check_in_time).toISOString() : null,
            check_out_time: todayRecord.check_out_time ? new Date(todayRecord.check_out_time).toISOString() : null,
            hours_worked: Number(todayRecord.hours_worked || 0),
            late_reason: todayRecord.late_reason,
          }
        : undefined,
      monthSummary: {
        presentDays: Number(m.presents || 0) + Number(m.lates || 0),
        lateDays: Number(m.lates || 0),
        totalHoursWorked: Number(Number(m.total_hours || 0).toFixed(2)),
      },
    };
  } catch (error: any) {
    console.error('Failed to authenticate staff portal:', error);
    return { success: false, error: error?.message || 'Login failed.' };
  }
}

/**
 * Manager Manual Override for Attendance Record.
 */
export async function manualMarkAttendanceAction(
  restaurantId: string | number,
  record: {
    staffId: number;
    date: string;
    status: 'present' | 'late' | 'half_day' | 'absent' | 'leave';
    checkInTime?: string | null;
    checkOutTime?: string | null;
    hoursWorked?: number;
    note?: string | null;
    lateReason?: string | null;
  }
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await ensureHrmSchema();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;

    const staffId = Number(record.staffId);
    const date = record.date;
    const status = record.status;
    const checkIn = record.checkInTime ? new Date(record.checkInTime) : null;
    const checkOut = record.checkOutTime ? new Date(record.checkOutTime) : null;
    const hours = record.hoursWorked !== undefined ? Math.max(0, Number(record.hoursWorked)) : 0.00;

    await pool.execute(
      `INSERT INTO staff_attendance 
        (restaurant_id, staff_id, date, status, check_in_time, check_out_time, hours_worked, late_reason, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        check_in_time = VALUES(check_in_time),
        check_out_time = VALUES(check_out_time),
        hours_worked = VALUES(hours_worked),
        late_reason = VALUES(late_reason),
        note = VALUES(note)`,
      [
        cleanId,
        staffId,
        date,
        status,
        checkIn,
        checkOut,
        hours,
        record.lateReason || null,
        record.note || null,
      ]
    );

    return { success: true, message: 'Attendance record updated successfully.' };
  } catch (error: any) {
    console.error('Failed to manually mark attendance:', error);
    return { success: false, error: error?.message || 'Failed to update record.' };
  }
}

/**
 * Monthly Attendance Calendar & History.
 */
export async function getMonthlyAttendanceCalendarAction(
  restaurantId?: string | number,
  params?: {
    year?: number;
    month?: number; // 1-12
    staffId?: number;
  }
): Promise<{
  success: boolean;
  year?: number;
  month?: number;
  records?: Array<{
    id: number;
    staff_id: number;
    staff_name: string;
    role: string;
    date: string;
    status: string;
    check_in_time: string | null;
    check_out_time: string | null;
    hours_worked: number;
    late_reason: string | null;
    note: string | null;
  }>;
  weekend_days?: string;
  summary?: {
    totalRecords: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    halfDayCount: number;
    leaveCount: number;
    totalHoursWorked: number;
  };
  error?: string;
}> {
  try {
    await ensureHrmSchema();
    const authCheck = await resolveAuthenticatedRestaurantId(restaurantId);
    if (!authCheck.success || !authCheck.restaurantId) {
      return { success: false, error: authCheck.error || 'Unauthorized.' };
    }
    const cleanId = authCheck.restaurantId;
    await autoCloseMidnightShifts(cleanId);

    const dhakaNow = getDhakaDate();
    const year = params?.year || dhakaNow.year;
    const month = params?.month || dhakaNow.month;
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    const conditions: string[] = [
      'a.restaurant_id = ?',
      "DATE_FORMAT(a.date, '%Y-%m') = ?",
      's.deleted_at IS NULL',
    ];
    const queryParams: any[] = [cleanId, monthStr];

    if (params?.staffId) {
      conditions.push('a.staff_id = ?');
      queryParams.push(Number(params.staffId));
    }

    const sql = `
      SELECT 
        a.id,
        a.staff_id,
        s.name as staff_name,
        COALESCE(s.role, 'Staff') as role,
        DATE_FORMAT(a.date, '%Y-%m-%d') as date,
        a.status,
        a.check_in_time,
        a.check_out_time,
        COALESCE(a.hours_worked, 0.00) as hours_worked,
        a.late_reason,
        a.note
      FROM staff_attendance a
      JOIN staff s ON a.staff_id = s.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.date DESC, s.name ASC
    `;

    const [rows]: any = await pool.execute(sql, queryParams);

    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;
    let leaveCount = 0;
    let totalHoursWorked = 0;

    const records = (rows || []).map((r: any) => {
      const hours = Number(r.hours_worked || 0);
      totalHoursWorked += hours;

      if (r.status === 'present') presentCount++;
      else if (r.status === 'late') lateCount++;
      else if (r.status === 'absent') absentCount++;
      else if (r.status === 'half_day') halfDayCount++;
      else if (r.status === 'leave') leaveCount++;

      return {
        id: Number(r.id),
        staff_id: Number(r.staff_id),
        staff_name: r.staff_name,
        role: r.role,
        date: r.date,
        status: r.status,
        check_in_time: r.check_in_time ? new Date(r.check_in_time).toISOString() : null,
        check_out_time: r.check_out_time ? new Date(r.check_out_time).toISOString() : null,
        hours_worked: hours,
        late_reason: r.late_reason,
        note: r.note,
      };
    });

    const settingsRes = await getHrmSettingsAction(cleanId);
    const weekendDays = settingsRes.settings?.weekend_days || 'Friday';

    return {
      success: true,
      year,
      month,
      records,
      weekend_days: weekendDays,
      summary: {
        totalRecords: records.length,
        presentCount,
        lateCount,
        absentCount,
        halfDayCount,
        leaveCount,
        totalHoursWorked: Number(totalHoursWorked.toFixed(2)),
      },
    };
  } catch (error: any) {
    console.error('Failed to get monthly attendance calendar:', error);
    return { success: false, error: error?.message || 'Failed to load attendance calendar.' };
  }
}
