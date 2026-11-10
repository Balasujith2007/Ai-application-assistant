import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { badgeEngine } from '@/lib/gamification/badgeEngine';
import { platformStreakService } from '@/lib/external-verification/platformStreakService';
import { contestVerificationService } from '@/lib/external-verification/contestService';
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

    // Phase 2 — per-platform coding streaks for the External Coding Achievements
    // area. Degrades gracefully: if the streak view cannot be computed the badge
    // data above is still returned.
    let codingStreaks: Awaited<ReturnType<typeof platformStreakService.getStudentCodingStreakView>> | null = null;
    try {
      codingStreaks = await platformStreakService.getStudentCodingStreakView(userId);
    } catch (err) {
      console.error('Coding streak view unavailable:', err);
    }

    // Phase 3 — verified contest participation for the External Coding
    // Achievements area. Degrades gracefully: badges + streaks are still
    // returned if the additive contest tables are not yet present.
    let contests: Awaited<ReturnType<typeof contestVerificationService.getStudentContestView>> | null = null;
    try {
      contests = await contestVerificationService.getStudentContestView(userId);
    } catch (err) {
      console.error('Contest view unavailable:', err);
    }

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
      categories: overview.categories,
      monthlyAwards: overview.monthlyAwards,
      badges: filteredBadges,
      badgesByStatus: overview.badges,
      history: overview.history,
      codingStreaks,
      contests,
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

    // NOTE: Client-supplied activity claims are intentionally NOT processed here.
    // A Career Activity Streak day (and any associated reward) is awarded only
    // by a verified server-side career submission event, never by a frontend
    // claim. This endpoint only (re)evaluates badges for the authenticated user.
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
