import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/gamification/adminGuard';
import {
  runMonthlyRecognition,
  getMonthlyRecognitionStatus,
} from '@/lib/gamification/monthlyRecognitionService';

/**
 * GET  /api/admin/gamification/monthly-recognition — last run + status.
 * POST /api/admin/gamification/monthly-recognition — run monthly recognition
 *      for a month (defaults to the closing month). Idempotent: an already
 *      COMPLETED month is a no-op unless `{ force: true }` is supplied.
 * Super Admin only.
 */
export async function GET(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return auth.response;

  const status = await getMonthlyRecognitionStatus();
  return NextResponse.json({ success: true, ...status });
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return auth.response;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Body optional
  }

  const monthKey = body?.monthKey ? String(body.monthKey) : undefined;
  if (monthKey && !/^\d{4}-\d{2}$/.test(monthKey)) {
    return NextResponse.json({ success: false, message: 'monthKey must be formatted YYYY-MM.' }, { status: 400 });
  }
  const force = Boolean(body?.force);

  const result = await runMonthlyRecognition({ monthKey, force, triggeredBy: auth.userId });

  await prisma.auditLog.create({
    data: {
      userId: auth.userId,
      action: 'MONTHLY_RECOGNITION_RUN',
      target: result.monthKey,
      details: `Monthly recognition run (force=${force}). champions=${result.stats.champions.length}, badgesAwarded=${result.stats.badgesAwarded}, alreadyCompleted=${result.alreadyCompleted}.`,
    },
  });

  return NextResponse.json({ ...result });
}
