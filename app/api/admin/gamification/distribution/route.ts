import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAuthAndPermission } from '@/lib/serverAuth';
import {
  getDistributionStatus,
  runWeeklyDistribution,
} from '@/lib/gamification/weeklyDistributionService';

/**
 * GET /api/admin/gamification/distribution
 * Real distribution execution records for the admin monitoring panel.
 * Admin-only. No synthetic statistics — values come from
 * `weekly_reward_allocations`.
 */
export async function GET(req: Request) {
  try {
    const auth = await checkAuthAndPermission(req, 'Gamification', 'VIEW');
    if (!auth.allowed) {
      return NextResponse.json({ message: auth.message || 'Forbidden' }, { status: auth.status || 403 });
    }

    const status = await getDistributionStatus();
    return NextResponse.json({ success: true, ...status });
  } catch (error) {
    console.error('Error fetching distribution status:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/gamification/distribution
 * Authorized manual recovery run. Used when an automated Saturday execution
 * was missed or partially failed. Allocations are idempotent, so re-running
 * never grants a second gift to a student who already received one.
 *
 * Body (optional): { weekKey?: string }
 * Admin-only.
 */
export async function POST(req: Request) {
  try {
    const auth = await checkAuthAndPermission(req, 'Gamification', 'EDIT');
    if (!auth.allowed) {
      return NextResponse.json({ message: auth.message || 'Forbidden' }, { status: auth.status || 403 });
    }

    let weekKey: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.weekKey === 'string' && body.weekKey.trim()) {
        weekKey = body.weekKey.trim();
      }
    } catch {
      // Body is optional — ignore parse errors.
    }

    const result = await runWeeklyDistribution({
      weekKey,
      force: true,
      triggeredBy: auth.user!.id,
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.user!.id,
        action: 'WEEKLY_REWARD_MANUAL_RUN',
        target: result.weekKey,
        details: `Manual weekly reward run. success=${result.success}, allocated=${result.stats.allocatedRewards}, failed=${result.stats.failedAllocations}`,
      },
    });

    return NextResponse.json({ success: result.success, result });
  } catch (error) {
    console.error('Error running manual distribution:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
