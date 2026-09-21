import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { processOpportunityLifecycles } from '@/lib/opportunity/lifecycle.service';

/**
 * Automates opportunity lifecycle tasks:
 * 1. Checks and closes expired opportunities.
 * 2. Idempotently dispatches 3-day and 1-day deadline reminders.
 * 3. Identifies and marks overdue workflow steps.
 */
export async function GET(req: Request) {
  return handleLifecycleExecution(req);
}

export async function POST(req: Request) {
  return handleLifecycleExecution(req);
}

async function handleLifecycleExecution(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Check if authorized by CRON_SECRET
    let isAuthorized = false;
    if (cronSecret && (authHeader === `Bearer ${cronSecret}` || req.headers.get('x-cron-secret') === cronSecret)) {
      isAuthorized = true;
    }

    // Otherwise check if authenticated as ADMIN or SUPER_ADMIN
    if (!isAuthorized) {
      const userId = getUserIdFromRequest(req);
      if (userId) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'PLACEMENT_CELL' || user.role === 'HOD' || user.role === 'MENTOR')) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      // In local dev allow triggering
      if (process.env.NODE_ENV === 'development') {
        isAuthorized = true;
      } else {
        return NextResponse.json({ message: 'Unauthorized lifecycle trigger.' }, { status: 401 });
      }
    }

    console.log('[OpportunityLifecycleCron] Starting automated lifecycle execution...');
    const result = await processOpportunityLifecycles();
    console.log('[OpportunityLifecycleCron] Execution complete:', result);

    return NextResponse.json({
      success: true,
      message: 'Opportunity lifecycle automation processed successfully.',
      data: result
    });
  } catch (error: any) {
    console.error('[OpportunityLifecycleCron] Lifecycle execution error:', error);
    return NextResponse.json({
      success: false,
      message: error?.message || 'Lifecycle execution failed.'
    }, { status: 500 });
  }
}
