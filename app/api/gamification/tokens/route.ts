import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { getTokenInventory } from '@/lib/gamification/tokenService';

/**
 * GET /api/gamification/tokens
 * Centralized token inventory for the authenticated student: available tokens,
 * used/expired counts, expiry information, eligible streak-rescue dates, and the
 * (intentionally unavailable) leaderboard boost status.
 */
export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, active: true },
    });
    if (!user || !user.active) {
      return NextResponse.json({ success: false, message: 'User not found or deactivated' }, { status: 403 });
    }

    const inventory = await getTokenInventory(userId);
    return NextResponse.json({ success: true, ...inventory });
  } catch (error: any) {
    console.error('Error fetching token inventory:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch token inventory' },
      { status: 500 }
    );
  }
}
