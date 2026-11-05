import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { useLeaderboardBoost, TokenUsageError } from '@/lib/gamification/tokenService';

/**
 * POST /api/gamification/tokens/leaderboard-boost
 *
 * Intentionally returns 503 UNAVAILABLE. The official leaderboard and Top-3
 * Champion ranking are derived solely from the Career Growth Score and must
 * never be altered by a token. No ranking-safe benefit exists, so the token is
 * not consumable and nothing is modified.
 */
export async function POST(req: Request) {
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
      return NextResponse.json({ success: false, message: 'User not found or deactivated' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const tokenId = typeof body?.tokenId === 'string' ? body.tokenId : '';
    if (!tokenId) {
      return NextResponse.json({ success: false, message: 'tokenId is required' }, { status: 400 });
    }

    await useLeaderboardBoost(userId, tokenId);
    // Unreachable — useLeaderboardBoost always throws UNAVAILABLE.
    return NextResponse.json({ success: false, message: 'Unavailable' }, { status: 503 });
  } catch (error: any) {
    if (error instanceof TokenUsageError) {
      return NextResponse.json(
        { success: false, code: error.code, message: error.message },
        { status: error.code === 'UNAVAILABLE' ? 503 : 400 }
      );
    }
    console.error('Error using leaderboard boost:', error);
    return NextResponse.json({ success: false, message: 'Failed to use leaderboard boost' }, { status: 500 });
  }
}
