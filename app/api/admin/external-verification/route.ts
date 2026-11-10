import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAuthAndPermission } from '@/lib/serverAuth';
import { requireSuperAdmin } from '@/lib/gamification/adminGuard';
import { platformRegistry } from '@/lib/leaderboard/adapters/adapterRegistry';
import { contestVerificationService } from '@/lib/external-verification/contestService';
import { getContestCapability } from '@/lib/external-verification/contestTypes';

/**
 * Super Admin monitoring for the external verification foundation (Phase 1) and
 * contest evidence (Phase 3).
 *
 * GET is read-only visibility — no badge, reward, or gamification mutation.
 * POST is the ONLY mutating action and is strictly Super-Admin-gated: it
 * approves/rejects a manual contest-evidence review with a mandatory reason.
 * A manual participation approval writes `verified_contests` only and can never
 * upgrade account ownership (`verified_profiles` is untouched).
 *
 * GET /api/admin/external-verification
 *   - per-platform connected / ownership-verified / ownership-unverified counts
 *   - last successful sync and failure counts per platform
 *   - most recent provider errors with the affected student
 *   - Phase 3: per-platform contest coverage (Phase 3 §7)
 *   - Phase 3: pending manual-review queue with evidence (Phase 3 §7)
 *
 * GET /api/admin/external-verification?format=capabilities
 *   - the provider capability matrix actually reported by the adapters
 *
 * GET /api/admin/external-verification?format=contest-capabilities
 *   - the Phase 3 contest capability matrix (evidence sources, coverage, notes)
 *
 * POST /api/admin/external-verification
 *   - body: { requestId, decision: 'APPROVE' | 'REJECT', reason }
 */

const MONITOR_RESOURCE = 'External Verification';

export async function GET(req: Request) {
  try {
    const auth = await checkAuthAndPermission(req, MONITOR_RESOURCE, 'VIEW');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, message: auth.message || 'Forbidden' }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    if (searchParams.get('format') === 'capabilities') {
      return NextResponse.json({ success: true, capabilities: buildCapabilityMatrix() });
    }
    if (searchParams.get('format') === 'contest-capabilities') {
      return NextResponse.json({ success: true, capabilities: buildContestCapabilityMatrix() });
    }

    const [profileCounts, syncFailures, syncSummary, recentErrors, monitoredStudents, contestCoverage, contestReviewQueue] =
      await Promise.all([
      // Legacy statuses ("VERIFIED", "FORMAT_VERIFIED", ...) are deliberately
      // counted as NOT ownership-verified, matching the application's read-time
      // normalization.
      prisma.$queryRaw<Array<{ platform: string; connected: number; verified: number; unverified: number }>>`
        SELECT "platform",
               COUNT(*)::int AS connected,
               COUNT(*) FILTER (WHERE UPPER("verificationStatus") = 'OWNERSHIP_VERIFIED')::int AS verified,
               COUNT(*) FILTER (WHERE UPPER("verificationStatus") <> 'OWNERSHIP_VERIFIED')::int AS unverified
        FROM "verified_profiles"
        GROUP BY "platform"
        ORDER BY "platform"
      `,
      prisma.$queryRaw<Array<{ sourcePlatform: string; failures: number }>>`
        SELECT "sourcePlatform", COUNT(*)::int AS failures
        FROM "sync_history"
        WHERE "status" <> 'SUCCESS' AND "createdAt" > NOW() - INTERVAL '7 days'
        GROUP BY "sourcePlatform"
        ORDER BY "sourcePlatform"
      `,
      prisma.syncHistory.groupBy({
        by: ['sourcePlatform'],
        _max: { lastSuccessfulSyncAt: true, lastAttemptAt: true },
        _count: { _all: true },
      }),
      prisma.syncHistory.findMany({
        where: { status: { not: 'SUCCESS' } },
        orderBy: { createdAt: 'desc' },
        take: 25,
        include: { student: { select: { id: true, name: true, email: true } } },
      }),
      prisma.syncHistory.findMany({ distinct: ['studentId'], select: { studentId: true } }),
      // Phase 3 — additive; returns [] when the migration is not yet applied.
      contestVerificationService.getPlatformContestCoverage(),
      contestVerificationService.listReviewQueue({ status: 'PENDING' }),
    ]);

    const verifiedByPlatform = new Map(profileCounts.map((r) => [r.platform, r]));
    const failuresByPlatform = new Map(syncFailures.map((r) => [r.sourcePlatform, r.failures]));

    const platforms = Array.from(
      new Set([
        ...profileCounts.map((r) => r.platform),
        ...syncSummary.map((r) => r.sourcePlatform),
      ]),
    )
      .sort()
      .map((platform) => {
        const counts = verifiedByPlatform.get(platform);
        const summary = syncSummary.find((s) => s.sourcePlatform === platform);
        const adapter = platformRegistry.getProvider(platform);
        const caps = adapter?.getProviderCapabilities();
        return {
          platform,
          connectedAccounts: counts?.connected ?? 0,
          ownershipVerifiedAccounts: counts?.verified ?? 0,
          ownershipUnverifiedAccounts: counts?.unverified ?? 0,
          lastSuccessfulSyncAt: summary?._max.lastSuccessfulSyncAt?.toISOString() ?? null,
          lastAttemptAt: summary?._max.lastAttemptAt?.toISOString() ?? null,
          totalSyncAttempts: summary?._count._all ?? 0,
          failedSyncsLast7Days: failuresByPlatform.get(platform) ?? 0,
          ownershipMechanism: caps?.ownership ?? 'UNKNOWN',
          apiKind: caps?.apiKind ?? 'UNKNOWN',
        };
      });

    const totals = platforms.reduce(
      (acc, p) => ({
        connectedAccounts: acc.connectedAccounts + p.connectedAccounts,
        ownershipVerifiedAccounts: acc.ownershipVerifiedAccounts + p.ownershipVerifiedAccounts,
        ownershipUnverifiedAccounts: acc.ownershipUnverifiedAccounts + p.ownershipUnverifiedAccounts,
        failedSyncsLast7Days: acc.failedSyncsLast7Days + p.failedSyncsLast7Days,
      }),
      { connectedAccounts: 0, ownershipVerifiedAccounts: 0, ownershipUnverifiedAccounts: 0, failedSyncsLast7Days: 0 },
    );

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      totals: {
        ...totals,
        monitoredStudents: monitoredStudents.length,
        contestsStored: contestCoverage.reduce((sum, c) => sum + c.contestsStored, 0),
        pendingContestReviews: contestReviewQueue.length,
      },
      platforms,
      recentProviderErrors: recentErrors.map((row) => ({
        id: row.id,
        platform: row.sourcePlatform,
        status: row.status,
        errorCode: row.errorCode,
        errorMessage: row.errorMessage,
        attemptedAt: row.lastAttemptAt.toISOString(),
        student: row.student ? { id: row.student.id, name: row.student.name, email: row.student.email } : null,
      })),
      // Phase 3 — contest evidence coverage and the manual-review queue.
      contestCoverage,
      contestReviewQueue,
    });
  } catch (error: any) {
    console.error('Error loading external verification monitoring:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * Approve or reject a manual contest-evidence review (Phase 3 §7).
 *
 * STRICTLY Super-Admin-gated (`requireSuperAdmin`), a reason is mandatory, and
 * the service writes `verified_contests` only — it never upgrades ownership.
 * Every decision is also written to the audit log with the reviewer's id.
 */
export async function POST(req: Request) {
  try {
    const guard = await requireSuperAdmin(req);
    if (!guard.ok) return guard.response;

    const body = await req.json().catch(() => ({}));
    const requestId = typeof body?.requestId === 'string' ? body.requestId.trim() : '';
    const decision = body?.decision === 'APPROVE' ? 'APPROVE' : body?.decision === 'REJECT' ? 'REJECT' : null;
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

    if (!requestId) {
      return NextResponse.json({ success: false, message: 'requestId is required.' }, { status: 400 });
    }
    if (!decision) {
      return NextResponse.json({ success: false, message: "decision must be 'APPROVE' or 'REJECT'." }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ success: false, message: 'A reason is required for every review decision.' }, { status: 400 });
    }

    const result = await contestVerificationService.decideReview({
      reviewerId: guard.userId,
      requestId,
      decision,
      reason,
    });
    if (!result.ok) {
      return NextResponse.json({ success: false, message: result.error || 'Review failed.' }, { status: 400 });
    }

    await prisma.auditLog
      .create({
        data: {
          userId: guard.userId,
          action: 'CONTEST_REVIEW_DECISION',
          target: requestId,
          details: JSON.stringify({ decision, reason }),
        },
      })
      .catch(() => undefined);

    return NextResponse.json({ success: true, status: result.status });
  } catch (error: any) {
    console.error('Error deciding contest review:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Internal server error' },
      { status: 500 },
    );
  }
}

function buildContestCapabilityMatrix() {
  return ['LEETCODE', 'CODECHEF', 'ATCODER', 'CODEFORCES'].map((platform) => {
    const cap = getContestCapability(platform);
    if (!cap) return { platform, registered: false };
    return {
      platform: cap.platform,
      registered: true,
      apiKind: cap.apiKind,
      evidenceSource: cap.evidenceSource,
      contestHistory: cap.contestHistory,
      ratingHistory: cap.ratingHistory,
      ownership: cap.ownership,
      dataFreshness: cap.dataFreshness,
      supportsRatingChange: cap.supportsRatingChange,
      supportsTotalParticipants: cap.supportsTotalParticipants,
      supportsPersonalBest: cap.supportsPersonalBest,
      historicalCompleteness: cap.historicalCompleteness,
      notes: cap.notes,
    };
  });
}

function buildCapabilityMatrix() {
  return ['LEETCODE', 'CODECHEF', 'ATCODER', 'CODEFORCES', 'CODOLIO']
    .map((platform) => {
      const adapter = platformRegistry.getProvider(platform);
      if (!adapter) {
        return { platform, registered: false };
      }
      const caps = adapter.getProviderCapabilities();
      return {
        platform,
        registered: true,
        profileLookup: caps.profileLookup,
        dailyActivity: caps.dailyActivity,
        acceptedSubmissions: caps.acceptedSubmissions,
        submissionTimestamps: caps.submissionTimestamps,
        contestHistory: caps.contestHistory,
        ratingHistory: caps.ratingHistory,
        ownership: caps.ownership,
        apiKind: caps.apiKind,
        dataFreshness: caps.dataFreshness,
        notes: caps.notes,
      };
    });
}
