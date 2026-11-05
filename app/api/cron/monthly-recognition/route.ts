import { NextResponse } from 'next/server';
import {
  runMonthlyRecognition,
  isWithinMonthlyWindow,
  getMonthlyRecognitionStatus,
} from '@/lib/gamification/monthlyRecognitionService';

/**
 * POST /api/cron/monthly-recognition
 * Automated Monthly Performance Recognition.
 *
 * Schedule (deployed via vercel.json): 1st of each month, 00:30 Asia/Kolkata
 *   -> previous day 19:00 UTC -> cron expression "0 19 1 * *".
 *
 * Authorization: Vercel Cron automatically sends
 *   `Authorization: Bearer ${CRON_SECRET}` when CRON_SECRET is configured.
 * Requests without a valid secret are rejected before any work happens.
 *
 * Idempotent: the closing month is processed at most once; re-execution never
 * produces duplicate badges, rewards or notifications, and a delayed run inside
 * the grace window still recovers.
 */
export const maxDuration = 300;

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const querySecret = new URL(req.url).searchParams.get('secret') || '';
  return bearer === secret || querySecret === secret;
}

export async function POST(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { success: false, message: 'Cron secret is not configured on the server.' },
      { status: 500 }
    );
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const explicitMonth = url.searchParams.get('monthKey') || undefined;
  const force = url.searchParams.get('force') === '1';

  // When no explicit month is supplied, only run inside the monthly window.
  if (!explicitMonth) {
    const window = isWithinMonthlyWindow();
    if (!window.ok) {
      return NextResponse.json({
        success: false,
        message: window.reason,
        currentDay: window.day,
      });
    }
  }

  const result = await runMonthlyRecognition({ monthKey: explicitMonth, force, triggeredBy: 'CRON' });

  return NextResponse.json(
    {
      success: result.success,
      message: result.success
        ? result.alreadyCompleted
          ? 'Monthly recognition already completed for this month'
          : 'Monthly recognition completed'
        : 'Monthly recognition failed',
      monthKey: result.monthKey,
      duration: result.durationMs,
      alreadyCompleted: result.alreadyCompleted,
      stats: result.stats,
      errors: result.errors.length > 0 ? result.errors : undefined,
    },
    { status: result.success ? 200 : 500 }
  );
}

/**
 * GET /api/cron/monthly-recognition
 * Returns the status of recent monthly recognition runs. Requires the same
 * secret as POST — recognition data is not public.
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const status = await getMonthlyRecognitionStatus();
  return NextResponse.json({ success: true, ...status });
}
