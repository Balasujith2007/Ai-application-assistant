import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/gamification/analytics
 * Returns gamification analytics for Super Admin
 */
export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, active: true },
    });

    if (!user || !user.active || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Super Admin access required.' },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '7', 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Dashboard Metrics
    const totalActiveStudents = await prisma.user.count({
      where: {
        role: 'STUDENT',
        active: true,
      },
    });

    const weeklyGiftsDistributed = await prisma.studentReward.count({
      where: {
        triggerType: 'WEEKLY_SATURDAY',
        allocatedAt: { gte: startDate },
      },
    });

    const championGiftsDistributed = await prisma.studentReward.count({
      where: {
        triggerType: { in: ['CHAMPION_FIRST_PLACE', 'CHAMPION_SECOND_PLACE', 'CHAMPION_THIRD_PLACE'] },
        allocatedAt: { gte: startDate },
      },
    });

    const totalXpDistributed = await prisma.pointsLedger.aggregate({
      where: {
        createdAt: { gte: startDate },
      },
      _sum: { pointsAwarded: true },
    });

    const totalCoinsDistributed = await prisma.coinTransaction.aggregate({
      where: {
        transactionType: 'REWARD_CREDIT',
        createdAt: { gte: startDate },
      },
      _sum: { amount: true },
    });

    const totalAchievementsUnlocked = await prisma.studentBadge.count({
      where: {
        awardedAt: { gte: startDate },
      },
    });

    const totalRewardClaims = await prisma.rewardClaim.count({
      where: {
        claimedAt: { gte: startDate },
      },
    });

    const failedAllocations = await prisma.weeklyRewardAllocation.aggregate({
      where: {
        distributionDate: { gte: startDate },
      },
      _sum: { failedAllocations: true },
    });

    const weeklyAllocations = await prisma.weeklyRewardAllocation.findMany({
      where: {
        distributionDate: { gte: startDate },
      },
      orderBy: { distributionDate: 'desc' },
      take: 10,
    });

    const distributionSuccessRate = weeklyAllocations.length > 0
      ? (weeklyAllocations.reduce((acc, w) => acc + w.allocatedRewards, 0) /
          (weeklyAllocations.reduce((acc, w) => acc + w.allocatedRewards + w.failedAllocations, 0) || 1)) * 100
      : 100;

    // Weekly trends
    const weeklyRewardTrends = await prisma.weeklyRewardAllocation.findMany({
      where: {
        distributionDate: { gte: startDate },
      },
      orderBy: { distributionDate: 'desc' },
      take: Math.ceil(days / 7),
    });

    // Achievement unlock trends
    const achievementTrends = await prisma.$queryRawUnsafe<Array<{ date: string; count: number }>>(
      `SELECT 
        DATE("awardedAt") as date,
        COUNT(*) as count
       FROM student_badges
       WHERE "awardedAt" >= $1
       GROUP BY DATE("awardedAt")
       ORDER BY date DESC
       LIMIT $2`,
      startDate,
      days
    );

    // Reward category distribution
    const rewardCategoryDistribution = await prisma.studentReward.groupBy({
      by: ['rewardRarity'],
      where: {
        allocatedAt: { gte: startDate },
      },
      _count: true,
    });

    // Weekly champion statistics
    const championStats = await prisma.studentReward.groupBy({
      by: ['triggerType'],
      where: {
        triggerType: { in: ['CHAMPION_FIRST_PLACE', 'CHAMPION_SECOND_PLACE', 'CHAMPION_THIRD_PLACE'] },
        allocatedAt: { gte: startDate },
      },
      _count: true,
    });

    return NextResponse.json({
      success: true,
      metrics: {
        totalActiveStudents,
        weeklyGiftsDistributed,
        championGiftsDistributed,
        totalXpDistributed: Math.round((totalXpDistributed._sum.pointsAwarded || 0) * 10) / 10,
        totalCoinsDistributed: totalCoinsDistributed._sum.amount || 0,
        totalAchievementsUnlocked,
        totalRewardClaims,
        failedAllocations: (failedAllocations._sum?.failedAllocations || 0) as number,
        distributionSuccessRate: Math.round(distributionSuccessRate * 100) / 100,
      },
      trends: {
        weeklyRewardTrends,
        achievementTrends,
        rewardCategoryDistribution,
        championStats,
      },
      recentDistributions: weeklyAllocations,
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
