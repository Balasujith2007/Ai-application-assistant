import { NextResponse } from 'next/server';
import { getRewardConfig } from '@/lib/gamification/rewardConfigService';
import {
  runWeeklyDistribution,
  isWithinDistributionWindow,
  getDistributionStatus,
} from '@/lib/gamification/weeklyDistributionService';
import { getWeekKey } from '@/lib/gamification/rewardEngine';

/**
 * POST /api/cron/weekly-rewards
 * Automated weekly Mystery Gift distribution.
 *
 * Schedule (deployed via vercel.json): Saturday 18:00 Asia/Kolkata
 *   -> Saturday 12:30 UTC -> cron expression "30 12 * * 6".
 *
 * Authorization: Vercel Cron automatically sends
 *   `Authorization: Bearer ${CRON_SECRET}` when CRON_SECRET is configured.
 * Requests without a valid secret are rejected before any work happens.
 *
 * The endpoint is idempotent: re-execution never allocates a second gift for a
 * student, and a delayed execution inside the grace window still recovers.
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
  // 1. Authorization — fail closed if the secret is missing or wrong.
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { success: false, message: 'Cron secret is not configured on the server.' },
      { status: 500 }
    );
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  // 2. Schedule validation (day + hour, in the configured timezone).
  const config = await getRewardConfig();
  const window = isWithinDistributionWindow(config);
  if (!window.ok) {
    return NextResponse.json({
      success: false,
      message: window.reason,
      currentDay: window.dayName,
      currentHour: window.hour,
      weekKey: getWeekKey(),
    });
  }

  // 3. Distribute.
  const result = await runWeeklyDistribution({ triggeredBy: 'CRON' });

  return NextResponse.json(
    {
      success: result.success,
      message: result.success
        ? result.alreadyCompleted
          ? 'Weekly rewards already distributed for this week'
          : 'Weekly reward distribution completed'
        : 'Weekly reward distribution failed',
      weekKey: result.weekKey,
      duration: result.durationMs,
      skipped: result.skipped,
      alreadyCompleted: result.alreadyCompleted,
      stats: result.stats,
      errors: result.errors.length > 0 ? result.errors : undefined,
    },
    { status: result.success ? 200 : 500 }
  );
}

/**
 * GET /api/cron/weekly-rewards
 * Returns the status of the current week's reward distribution.
 * Requires the same secret as POST — distribution data is not public.
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const status = await getDistributionStatus();
  return NextResponse.json({ success: true, ...status });
}
