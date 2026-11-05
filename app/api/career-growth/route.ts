import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { getRewardConfig } from '@/lib/gamification/rewardConfigService';
import { careerGrowthEngine } from '@/lib/gamification/careerGrowthEngine';
import { getWeekKey, getEvaluationPeriod } from '@/lib/gamification/rewardEngine';

/**
 * GET /api/career-growth
 *
 * Transparent weekly Career Growth Summary for the authenticated student.
 *
 * Career growth is derived exclusively from this platform's actual purpose —
 * a Student Career Growth & Opportunity Platform (internship/job applications,
 * hackathons & competitions, resume strength). No LMS metrics are used.
 *
 * Returns:
 *  - `careerGrowth`: the live breakdown for the current evaluation week
 *    (category scores, milestone achievements, resume criteria & improvement,
 *    final Career Growth Score and the tier that score maps to).
 *  - `latestFinalized`: the most recent immutable weekly snapshot (the score
 *    actually used for reward allocation), when one exists.
 *  - `latestGift`: the most recent allocated weekly Mystery Gift (assigned tier).
 */
export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, active: true },
    });

    if (!user || !user.active) {
      return NextResponse.json(
        { success: false, message: 'User not found or deactivated' },
        { status: 403 }
      );
    }

    const config = await getRewardConfig();
    const weekKey = getWeekKey();
    const { startDate, endDate } = getEvaluationPeriod(weekKey);

    const result = await careerGrowthEngine.computeCareerGrowthScore(
      userId,
      weekKey,
      startDate,
      endDate,
      config
    );

    // Latest immutable weekly snapshot (score used for reward allocation).
    const latestSnapshot = await prisma.weeklyPerformanceSnapshot.findFirst({
      where: { studentId: userId },
      orderBy: { weekKey: 'desc' },
      select: { weekKey: true, weightedScore: true, rankTier: true, createdAt: true },
    });

    // Latest allocated weekly Mystery Gift (assigned gift tier).
    const latestGift = await prisma.studentReward.findFirst({
      where: { studentId: userId, triggerType: 'WEEKLY_SATURDAY' },
      orderBy: { allocatedAt: 'desc' },
      select: {
        id: true,
        rewardRarity: true,
        weeklyRank: true,
        weeklyScore: true,
        status: true,
        evaluationWeekKey: true,
        allocatedAt: true,
      },
    });

    const improvement = result.resumeCriteria.find((c) => c.key === 'improvement') ?? null;

    const categoryDto = (c: typeof result.categories.internshipApplications) => ({
      key: c.key,
      label: c.label,
      weight: c.weight,
      rawScore: c.rawScore,
      weightedPoints: c.weightedPoints,
      milestones: c.milestones,
    });

    return NextResponse.json({
      success: true,
      week: {
        weekKey,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      careerGrowth: {
        finalScore: result.finalScore,
        tier: result.tier,
        categories: {
          internshipApplications: categoryDto(result.categories.internshipApplications),
          hackathonsCompetitions: categoryDto(result.categories.hackathonsCompetitions),
          resumeStrength: categoryDto(result.categories.resumeStrength),
        },
        resumeCriteria: result.resumeCriteria,
        resumeImprovement: improvement,
        counts: result.counts,
        unavailableCriteria: result.unavailableCriteria,
        computedAt: result.computedAt,
      },
      latestFinalized: latestSnapshot
        ? {
            weekKey: latestSnapshot.weekKey,
            finalScore: latestSnapshot.weightedScore,
            tier: latestSnapshot.rankTier,
            snapshotAt: latestSnapshot.createdAt.toISOString(),
          }
        : null,
      latestGift: latestGift
        ? {
            id: latestGift.id,
            tier: latestGift.weeklyRank,
            rewardRarity: latestGift.rewardRarity,
            weeklyScore: latestGift.weeklyScore,
            status: latestGift.status,
            weekKey: latestGift.evaluationWeekKey,
            allocatedAt: latestGift.allocatedAt.toISOString(),
          }
        : null,
    });
  } catch (error: unknown) {
    console.error('Error computing career growth summary:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to compute career growth' },
      { status: 500 }
    );
  }
}
