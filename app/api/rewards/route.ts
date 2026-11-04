import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { rewardEngine } from '@/lib/gamification/rewardEngine';
import { championRewardEngine } from '@/lib/gamification/championRewardEngine';
import prisma from '@/lib/prisma';

/**
 * GET /api/rewards
 * Returns available unclaimed rewards and reward history for the authenticated student
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

    if (!user || !user.active) {
      return NextResponse.json(
        { success: false, message: 'User not found or deactivated' },
        { status: 403 }
      );
    }

    // Get available (unclaimed) rewards
    const availableRewards = await rewardEngine.getAvailableRewards(userId);

    // Get reward history
    const rewardHistory = await rewardEngine.getRewardHistory(userId);

    // Get champion history
    const championHistory = await championRewardEngine.getChampionHistory(userId);

    // Get token counts
    const streakRescueTokens = await prisma.streakRescueToken.count({
      where: {
        studentId: userId,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    const leaderboardBoostTokens = await prisma.leaderboardBoostToken.count({
      where: {
        studentId: userId,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    return NextResponse.json({
      success: true,
      availableRewards,
      rewardHistory,
      championHistory,
      tokens: {
        streakRescue: streakRescueTokens,
        leaderboardBoost: leaderboardBoostTokens,
      },
    });
  } catch (error: any) {
    console.error('Error fetching rewards:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch rewards' },
      { status: 500 }
    );
  }
}
