import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { verificationLedger } from '@/lib/leaderboard/verificationLedger';
import { getAuthoritativeStudentClass } from '@/lib/leaderboard/accessControl';
import { scoringEngine } from '@/lib/leaderboard/scoringEngine';

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to sync performance data.' },
        { status: 401 }
      );
    }

    // 1. Trigger synchronization of connected contest accounts and local opportunities
    const syncResult = await verificationLedger.syncStudentActivities(userId);

    // 2. Authoritative student class check
    const { classIdentity } = await getAuthoritativeStudentClass(userId);

    let recalculated = false;
    if (classIdentity.isComplete) {
      // Recompute snapshots for student's class
      await scoringEngine.computeClassLeaderboard(classIdentity, 'ALL_TIME', userId);
      recalculated = true;
    }

    return NextResponse.json({
      success: true,
      syncedPlatforms: syncResult.syncedPlatforms,
      recordsProcessed: syncResult.recordsCount,
      recalculated,
      errors: syncResult.errors,
      syncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error during leaderboard synchronization:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Synchronization failed.' },
      { status: 500 }
    );
  }
}
