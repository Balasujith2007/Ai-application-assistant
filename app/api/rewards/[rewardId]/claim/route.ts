import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { rewardEngine } from '@/lib/gamification/rewardEngine';
import prisma from '@/lib/prisma';

/**
 * POST /api/rewards/[rewardId]/claim
 * Claims a specific reward for the authenticated student
 */
export async function POST(
  req: Request,
  { params }: { params: { rewardId: string } }
) {
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

    const { rewardId } = params;

    // Claim the reward
    const result = await rewardEngine.claimReward(userId, rewardId);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error claiming reward:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to claim reward' },
      { status: 500 }
    );
  }
}
