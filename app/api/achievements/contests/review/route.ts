import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { contestVerificationService } from '@/lib/external-verification/contestService';

/**
 * Student manual-review request for contest evidence a provider cannot verify
 * (Phase 3 §3/§7).
 *
 * POST /api/achievements/contests/review
 *   body: {
 *     platform, externalContestId, contestName?, rank?, totalParticipants?,
 *     oldRating?, newRating?, evidenceUrl?, evidenceNote?
 *   }
 *
 * The requesting student is ALWAYS taken from the session — never from the
 * body. The request only enters the Super Admin queue; it does not verify
 * participation and it never touches account ownership. Repeated requests for
 * the same contest are idempotent (the service no-ops on the composite key).
 */
export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, active: true },
    });
    if (!user || user.active === false) {
      return NextResponse.json({ success: false, message: 'User not found or deactivated.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const asNumber = (v: unknown): number | null => {
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
      return null;
    };

    const result = await contestVerificationService.requestManualReview(userId, {
      platform: typeof body?.platform === 'string' ? body.platform : '',
      externalContestId: typeof body?.externalContestId === 'string' ? body.externalContestId : '',
      contestName: typeof body?.contestName === 'string' ? body.contestName : null,
      rank: asNumber(body?.rank),
      totalParticipants: asNumber(body?.totalParticipants),
      oldRating: asNumber(body?.oldRating),
      newRating: asNumber(body?.newRating),
      evidenceUrl: typeof body?.evidenceUrl === 'string' ? body.evidenceUrl : null,
      evidenceNote: typeof body?.evidenceNote === 'string' ? body.evidenceNote : null,
    });

    if (!result.ok) {
      return NextResponse.json({ success: false, message: result.error || 'Could not record review request.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      created: result.created,
      id: result.id,
      message: result.created
        ? 'Review request submitted. A Super Admin will verify your evidence.'
        : 'A review request for this contest already exists and is unchanged.',
    });
  } catch (err: any) {
    console.error('Error submitting contest review request:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to submit review request.', error: err?.message },
      { status: 500 },
    );
  }
}
