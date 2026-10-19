import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { checkInService } from '@/lib/gamification/checkInService';
import prisma from '@/lib/prisma';

/**
 * POST /api/leaderboard/reverse
 * Audited reversal endpoint to deduct XP and reject an activity when a previously verified event is invalidated.
 * Strictly protected: requires FACULTY, HOD, ADMIN, or SUPER_ADMIN role.
 */
export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required for reversal.' },
        { status: 401 }
      );
    }

    const reviewer = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, active: true },
    });

    const authorizedRoles = ['SUPER_ADMIN', 'ADMIN', 'HOD', 'FACULTY', 'PLACEMENT_CELL'];
    if (!reviewer || !reviewer.active || !authorizedRoles.includes(reviewer.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Insufficient privileges to reverse verified activities.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { activityId, reason } = body;

    if (!activityId || !reason) {
      return NextResponse.json(
        { success: false, message: 'Both activityId and reason are required for an audited reversal.' },
        { status: 400 }
      );
    }

    const result = await checkInService.reverseActivityXP(activityId, reason);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    // Log to AuditLog if available
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'REVERSE_VERIFIED_ACTIVITY_XP',
          target: activityId,
          details: JSON.stringify({ reason, reversedXp: result.reversedXp }),
        },
      });
    } catch {
      // Non-critical audit log fallback
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in XP reversal endpoint:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to reverse activity XP.' },
      { status: 500 }
    );
  }
}
