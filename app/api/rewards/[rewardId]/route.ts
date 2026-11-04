import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';

/**
 * GET /api/rewards/[rewardId]
 * Returns details for a specific reward
 */
export async function GET(
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

    const reward = await prisma.studentReward.findUnique({
      where: { id: rewardId },
    });

    if (!reward) {
      return NextResponse.json(
        { success: false, message: 'Reward not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (reward.studentId !== userId) {
      return NextResponse.json(
        { success: false, message: 'Reward does not belong to student' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      reward,
    });
  } catch (error: any) {
    console.error('Error fetching reward:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch reward' },
      { status: 500 }
    );
  }
}
