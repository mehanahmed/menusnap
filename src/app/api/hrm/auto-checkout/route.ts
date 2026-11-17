import { NextResponse } from 'next/server';
import { autoCloseMidnightShifts } from '@/app/actions/hrm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/hrm/auto-checkout
 * Triggered automatically or via cron after 12:00 AM (midnight).
 * Automatically clocks out any staff with unclosed shifts from previous days.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const restaurantId = url.searchParams.get('restaurantId') || undefined;

    const result = await autoCloseMidnightShifts(restaurantId);

    return NextResponse.json({
      success: result.success,
      closedCount: result.closedCount,
      message: `Auto check-out executed. ${result.closedCount} unclosed shift(s) closed.`,
      error: result.error,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to execute auto check-out' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hrm/auto-checkout
 * Also supports POST requests from webhooks or scheduled runners.
 */
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    let restaurantId = url.searchParams.get('restaurantId') || undefined;

    try {
      const body = await request.json();
      if (body?.restaurantId) {
        restaurantId = body.restaurantId;
      }
    } catch {
      // Body is optional
    }

    const result = await autoCloseMidnightShifts(restaurantId);

    return NextResponse.json({
      success: result.success,
      closedCount: result.closedCount,
      message: `Auto check-out executed. ${result.closedCount} unclosed shift(s) closed.`,
      error: result.error,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to execute auto check-out' },
      { status: 500 }
    );
  }
}
