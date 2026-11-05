import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { rescueStreak, TokenUsageError, type TokenErrorCode } from '@/lib/gamification/tokenService';

/**
 * POST /api/gamification/tokens/streak-rescue
 * Consumes one Streak Rescue token to restore an eligible missed career-activity
 * day. Atomic and idempotent-safe: the token consumption and the day restoration
 * happen in a single transaction. Body: { tokenId: string, date?: "YYYY-MM-DD" }.
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
    const date = typeof body?.date === 'string' ? body.date : undefined;
    if (!tokenId) {
      return NextResponse.json({ success: false, message: 'tokenId is required' }, { status: 400 });
    }

    const result = await rescueStreak(userId, tokenId, date);
    return NextResponse.json({ ...result, success: true });
  } catch (error: any) {
    if (error instanceof TokenUsageError) {
      const statusMap: Record<TokenErrorCode, number> = {
        DISABLED: 403,
        NOT_FOUND: 404,
        NOT_OWNER: 403,
        ALREADY_USED: 409,
        EXPIRED: 410,
        LIMIT_REACHED: 429,
        WINDOW_LIMIT_REACHED: 429,
        NO_ELIGIBLE_DATE: 409,
        NOT_ELIGIBLE: 400,
        ALREADY_RESTORED: 409,
        UNAVAILABLE: 503,
      };
      return NextResponse.json(
        { success: false, code: error.code, message: error.message },
        { status: statusMap[error.code] ?? 400 }
      );
    }
    console.error('Error rescuing streak:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to rescue streak' },
      { status: 500 }
    );
  }
}
