import crypto from 'node:crypto';
import { getMetaPixelSettings } from '@/app/actions/meta-events';
import { headers, cookies } from 'next/headers';

/**
 * SHA-256 Hashing utility for Meta CAPI Customer Data
 */
export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * Normalizes email address: lowercase and trimmed.
 */
export function normalizeEmail(email?: string | null): string | null {
  if (!email || typeof email !== 'string') return null;
  const clean = email.trim().toLowerCase();
  return clean.length > 3 && clean.includes('@') ? clean : null;
}

/**
 * Normalizes Bangladeshi phone numbers into standard Meta 8801XXXXXXXXX format.
 * Reference: Developer Implementation Guide Page 12 & 18.
 */
export function normalizeBdPhone(phone?: string | null): string | null {
  if (!phone || typeof phone !== 'string') return null;
  let digits = phone.replace(/\D/g, '');

  if (digits.startsWith('880')) {
    // Already in 880... format
  } else if (digits.startsWith('0')) {
    digits = '88' + digits;
  } else if (digits.length === 10 && digits.startsWith('1')) {
    digits = '880' + digits;
  }

  return digits.length >= 11 ? digits : null;
}

/**
 * Extracts real visitor IP from incoming request headers.
 * Handles Cloudflare (cf-connecting-ip), Nginx (x-real-ip), and proxy chains (x-forwarded-for).
 * Reference: Developer Implementation Guide Page 14 & 18.
 */
export function extractClientIp(headerList: { get(name: string): string | null }): string | null {
  const cfIp = headerList.get('cf-connecting-ip');
  if (cfIp && cfIp.trim()) return cfIp.trim();

  const xff = headerList.get('x-forwarded-for');
  if (xff && xff.trim()) {
    const firstIp = xff.split(',')[0].trim();
    if (firstIp && !firstIp.startsWith('127.') && firstIp !== '::1') {
      return firstIp;
    }
  }

  const realIp = headerList.get('x-real-ip');
  if (realIp && realIp.trim()) return realIp.trim();

  return null;
}

export interface CapiUserDataInput {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  externalId?: string | number | null;
  clientIp?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  city?: string | null;
  country?: string;
}

/**
 * Builds and hashes Meta CAPI user_data payload.
 * Sensitive fields (em, ph, fn, ln, external_id) are SHA-256 hashed.
 * Context fields (ip, user_agent, fbp, fbc) remain unhashed per Meta specs.
 * Reference: Developer Implementation Guide Page 12 & 18.
 */
export function buildCapiUserData(input: CapiUserDataInput): Record<string, unknown> {
  const userData: Record<string, unknown> = {};

  // 1. IP & User-Agent (raw strings, do NOT hash)
  if (input.clientIp) {
    userData.client_ip_address = input.clientIp;
  }
  if (input.userAgent) {
    userData.client_user_agent = input.userAgent;
  }

  // 2. Browser cookies (_fbp and _fbc)
  if (input.fbp) {
    userData.fbp = input.fbp;
  }
  if (input.fbc) {
    userData.fbc = input.fbc;
  }

  // 3. Email (hashed)
  const normEm = normalizeEmail(input.email);
  if (normEm) {
    userData.em = [sha256(normEm)];
  }

  // 4. Phone (normalized to 8801... and hashed)
  const normPh = normalizeBdPhone(input.phone);
  if (normPh) {
    userData.ph = [sha256(normPh)];
  }

  // 5. First & Last name (hashed)
  if (input.firstName && input.firstName.trim()) {
    userData.fn = [sha256(input.firstName.trim().toLowerCase())];
  }
  if (input.lastName && input.lastName.trim()) {
    userData.ln = [sha256(input.lastName.trim().toLowerCase())];
  }

  // 6. External User ID (hashed)
  if (input.externalId) {
    userData.external_id = [sha256(String(input.externalId).trim())];
  }

  // 7. Country code (hashed 2-letter ISO lowercase, default 'bd')
  const countryCode = (input.country || 'bd').trim().toLowerCase();
  userData.country = [sha256(countryCode)];

  if (input.city && input.city.trim()) {
    userData.ct = [sha256(input.city.trim().toLowerCase().replace(/\s+/g, ''))];
  }

  return userData;
}

export interface SendMetaCapiEventOptions {
  eventName: 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Lead' | 'Purchase' | (string & {});
  eventId: string;
  eventSourceUrl?: string;
  userData?: CapiUserDataInput;
  customData?: Record<string, unknown>;
  eventTime?: number;
}

/**
 * Sends a server-side Conversions API event to Meta Graph API.
 * Reference: Developer Implementation Guide Page 10, 18, 24.
 */
export async function sendMetaCapiEvent(options: SendMetaCapiEventOptions): Promise<{
  success: boolean;
  eventsReceived?: number;
  fbtraceId?: string;
  error?: string;
}> {
  try {
    const settings = await getMetaPixelSettings();

    // Require both enabled flag, Pixel ID, and Access Token
    const pixelId = process.env.META_PIXEL_ID || settings.pixelId;
    const accessToken = process.env.META_CAPI_TOKEN || settings.accessToken;
    const isEnabled = settings.isEnabled || Boolean(process.env.META_CAPI_TOKEN);
    const testCode = settings.testEventCode || process.env.META_TEST_EVENT_CODE;
    const graphVersion = process.env.META_GRAPH_VERSION || 'v26.0';

    if (!isEnabled || !pixelId || !accessToken) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[Meta CAPI] Skipped: Meta Pixel ID or Access Token is missing.');
      }
      return { success: false, error: 'Meta Pixel ID or Access Token is missing.' };
    }

    // Auto-extract request headers and cookies if running in Next.js Server Action context
    let clientIp = options.userData?.clientIp;
    let userAgent = options.userData?.userAgent;
    let fbp = options.userData?.fbp;
    let fbc = options.userData?.fbc;

    try {
      const headerList = await headers();
      if (!clientIp) clientIp = extractClientIp(headerList);
      if (!userAgent) userAgent = headerList.get('user-agent') || undefined;

      const cookieStore = await cookies();
      if (!fbp) fbp = cookieStore.get('_fbp')?.value || undefined;
      if (!fbc) fbc = cookieStore.get('_fbc')?.value || undefined;
    } catch {
      // Headers/cookies may not be available outside HTTP context (e.g. background queue)
    }

    const compiledUserData = buildCapiUserData({
      ...options.userData,
      clientIp,
      userAgent,
      fbp,
      fbc,
    });

    const eventPayload: Record<string, unknown> = {
      event_name: options.eventName,
      event_time: options.eventTime || Math.floor(Date.now() / 1000),
      event_id: options.eventId,
      action_source: 'website',
      event_source_url: options.eventSourceUrl || 'https://menusnap.colorhatbd.xyz',
      user_data: compiledUserData,
    };

    if (options.customData && Object.keys(options.customData).length > 0) {
      eventPayload.custom_data = options.customData;
    }

    const requestBody: Record<string, unknown> = {
      data: [eventPayload],
      access_token: accessToken,
    };

    if (testCode && testCode.trim()) {
      requestBody.test_event_code = testCode.trim();
    }

    const endpoint = `https://graph.facebook.com/${graphVersion}/${pixelId}/events`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseBody = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('[Meta CAPI Error]', {
        eventName: options.eventName,
        eventId: options.eventId,
        status: response.status,
        fbtrace_id: responseBody?.fbtrace_id,
        message: responseBody?.error?.message,
      });
      return {
        success: false,
        error: responseBody?.error?.message || 'Meta CAPI request failed',
        fbtraceId: responseBody?.fbtrace_id,
      };
    }

    // Success logging (Page 24 of guide)
    console.log('[Meta CAPI Success]', {
      event_name: options.eventName,
      event_id: options.eventId,
      events_received: responseBody?.events_received,
      fbtrace_id: responseBody?.fbtrace_id,
      has_fbp: Boolean(fbp),
      has_fbc: Boolean(fbc),
      has_ip: Boolean(clientIp),
    });

    return {
      success: true,
      eventsReceived: responseBody?.events_received,
      fbtraceId: responseBody?.fbtrace_id,
    };
  } catch (err: any) {
    console.error('[Meta CAPI Unexpected Error]', err);
    return { success: false, error: err?.message || 'Network exception' };
  }
}

/**
 * Dispatches Meta CAPI event in background without blocking the caller's response.
 * Reference: Developer Implementation Guide Page 20 (Non-blocking queue/worker).
 */
export function sendMetaCapiEventAsync(options: SendMetaCapiEventOptions): void {
  // Fire and forget asynchronously
  Promise.resolve()
    .then(() => sendMetaCapiEvent(options))
    .catch((err) => console.error('[Meta CAPI Async Error]', err));
}
