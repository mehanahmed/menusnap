export const RESTAURANT_ROLES = [
  'Store Manager',
  'Floor Manager',
  'Head Chef',
  'Assistant Cook',
  'Kitchen Staff',
  'Kitchen Helper',
  'Waiter',
  'Captain',
  'Cashier',
  'Barista',
  'Cleaner',
  'Delivery Rider',
  'General Staff',
  'Other',
] as const;

export const PARLOUR_ROLES = [
  'Branch Manager',
  'Floor Manager',
  'Hair Stylist',
  'Senior Hair Stylist',
  'Junior Stylist',
  'Makeup Artist',
  'Beautician',
  'Skin & Facial Specialist',
  'Nail Tech',
  'Nail Technician',
  'Salon Receptionist',
  'Cleaner',
  'Helper',
  'General Staff',
  'Other',
] as const;

export interface HrmSettings {
  restaurant_id: string;
  shift_start: string;
  shift_end: string;
  grace_period_minutes: number;
  half_day_hours: number;
  weekend_days: string;
  allow_self_punch: boolean;
  latitude?: number | null;
  longitude?: number | null;
  radius_meters?: number;
  enforce_geofence?: boolean;
}

export interface StaffAttendanceItem {
  id?: number;
  staff_id: number;
  name: string;
  phone: string | null;
  role: string;
  pin_code: string;
  shift_start: string;
  shift_end: string;
  base_salary: number;
  date: string;
  status: 'present' | 'late' | 'half_day' | 'absent' | 'leave' | 'not_marked';
  check_in_time: string | null;
  check_out_time: string | null;
  hours_worked: number;
  late_reason: string | null;
  early_out_reason: string | null;
  note: string | null;
  check_in_lat?: number | null;
  check_in_lng?: number | null;
  check_out_lat?: number | null;
  check_out_lng?: number | null;
  distance_meters?: number | null;
}

/**
 * Haversine formula to calculate distance in meters between two GPS coordinates
 */
export function calculateDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Convert 24-hour time string ("09:00", "18:00", "18:00:00") into 12-hour format ("9:00 am" or "6:00 pm")
 */
export function formatTime12h(timeStr?: string | null): string {
  if (!timeStr) return '--';
  const clean = String(timeStr).trim();
  if (clean.toLowerCase().includes('am') || clean.toLowerCase().includes('pm')) {
    return clean;
  }
  const parts = clean.split(':');
  if (parts.length < 2) return clean;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, '0');
  if (isNaN(hours)) return clean;
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Format shift hours range into "9:00 am - 6:00 pm"
 */
export function formatShiftRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return '--';
  const s = formatTime12h(start || '09:00');
  const e = formatTime12h(end || '18:00');
  return `${s} - ${e}`;
}

/**
 * Convert minutes into human-readable duration e.g.
 * 231 -> "3 hr 51 min"
 * 60  -> "1 hr"
 * 45  -> "45 min"
 * 0   -> "0 min"
 */
export function formatMinutesHuman(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
}

/**
 * Convert hours (float e.g. 0.34, 5.58, 0 or checkIn/checkOut timestamps)
 * into friendly human-readable duration like "20 min", "0 min", "5 hr 35 min", "1 hr".
 */
export function formatHoursHuman(
  hours?: number | null,
  checkIn?: string | null,
  checkOut?: string | null
): string {
  // If both timestamps are present, calculate exact difference
  if (checkIn && checkOut) {
    const start = new Date(checkIn).getTime();
    const end = new Date(checkOut).getTime();
    if (!isNaN(start) && !isNaN(end)) {
      const diffMins = Math.max(0, Math.round((end - start) / 60000));
      return formatMinutesHuman(diffMins);
    }
  }

  // If hours is provided
  if (hours !== undefined && hours !== null) {
    if (hours === 0 && checkIn && checkOut) return '0 min';
    if (hours === 0) return '--';
    return formatMinutesHuman(Math.round(hours * 60));
  }

  return '--';
}

/**
 * Standardize late/early messages:
 * e.g. "Late by 231 mins" -> "Late by 3 hr 51 min"
 * e.g. "Early leave by 125 mins" -> "Early leave by 2 hr 5 min"
 */
export function formatLateReason(text?: string | null): string | null {
  if (!text) return null;
  return text
    .replace(/Late by (\d+)\s*(?:mins|min|m)/i, (_, mStr) => {
      const m = parseInt(mStr, 10);
      return `Late by ${formatMinutesHuman(m)}`;
    })
    .replace(/Early leave by (\d+)\s*(?:mins|min|m)/i, (_, mStr) => {
      const m = parseInt(mStr, 10);
      return `Early leave by ${formatMinutesHuman(m)}`;
    });
}

