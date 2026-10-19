import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { badgeEngine } from '@/lib/gamification/badgeEngine';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to view achievements.' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, active: true },
    });

    if (!user || user.active === false) {
      return NextResponse.json({ success: false, message: 'User not found or deactivated.' }, { status: 401 });
    }

    // Parse filters
    const url = new URL(req.url);
    const categoryFilter = (url.searchParams.get('category') || 'ALL').toUpperCase();
    const statusFilter = (url.searchParams.get('status') || 'ALL').toUpperCase();

    const overview = await badgeEngine.getStudentBadgesOverview(userId);

    // Filter badges if requested
    let filteredBadges = overview.badges.all;
    if (categoryFilter !== 'ALL') {
      filteredBadges = filteredBadges.filter((b) => b.category === categoryFilter);
    }
    if (statusFilter !== 'ALL') {
      filteredBadges = filteredBadges.filter((b) => b.status === statusFilter);
    }

    return NextResponse.json({
      success: true,
      summary: overview.summary,
      nextMilestone: overview.nextMilestone,
      stats: overview.stats,
      badges: filteredBadges,
      history: overview.history,
    });
  } catch (err: any) {
    console.error('Error fetching achievements:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch student achievements.', error: err?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required.' },
        { status: 401 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }

    // Optional daily activity recording
    if (body.activityType) {
      await badgeEngine.recordDailyActivity(userId, body.activityType, body.sourceReference);
    }

    // Evaluate badges
    const result = await badgeEngine.evaluateAndAwardBadges(userId);

    return NextResponse.json({
      success: true,
      newlyUnlocked: result.newlyUnlocked,
      totalEarned: result.totalEarned,
      totalAvailable: result.totalAvailable,
    });
  } catch (err: any) {
    console.error('Error evaluating achievements:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to evaluate achievements.', error: err?.message },
      { status: 500 }
    );
  }
}
