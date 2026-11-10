import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { platformRegistry } from '@/lib/leaderboard/adapters/adapterRegistry';
import { ProviderId } from '@/lib/leaderboard/adapters/providerTypes';
import { EXTERNAL_VERIFIED_PLATFORMS } from '@/lib/leaderboard/types';
import { normalizeOwnershipStatus, OwnershipStatus } from './ownershipStatus';
import {
  ContestCoverage,
  ContestEvidenceSource,
  ContestNormalizationResult,
  ContestRecordStatus,
  ContestReviewStatus,
  PROVIDER_CONTEST_CAPABILITY_MATRIX,
  ProviderContestCapability,
  NormalizedContestRecord,
  CONTEST_EVIDENCE_SOURCE_LABELS,
  getContestCapability,
} from './contestTypes';
import {
  ContestStats,
  PlatformContestStats,
  computeContestStats,
  computeFinishPercentile,
  normalizeContestFeed,
} from './contestVerification';

/**
 * Contest verification service (Phase 3 §2/§6/§7/§8).
 *
 * Persistence is fully additive:
 *   - `verified_contests`          — one row per (student, platform, contest)
 *   - `contest_review_requests`    — manual-review queue
 *   - `platform_contest_sync`      — per-platform contest sync coverage
 *
 * Every DB access degrades gracefully: if the additive migration has not been
 * applied the service returns empty results instead of breaking the app, and it
 * never mutates an existing Phase 1/2 table.
 *
 * OWNERSHIP IS SEPARATE FROM PARTICIPATION: approving a manual participation
 * review writes to `verified_contests` ONLY. It never edits
 * `verified_profiles.verificationStatus`, so a manual participation approval can
 * never silently upgrade an account to ownership-verified.
 */

const PENDING_REVIEW_PLATFORM_SOURCE = 'MANUAL_REVIEW';

export interface PlatformContestSync {
  platform: ProviderId;
  ok: boolean;
  coverage: ContestCoverage;
  evidenceSource: ContestEvidenceSource;
  contestsFound: number;
  contestsPersisted: number;
  recordsRejected: number;
  status: string;
  errorKind?: string;
  message?: string;
}

export interface StudentContestSyncResult {
  studentId: string;
  startedAt: string;
  finishedAt: string;
  platforms: PlatformContestSync[];
  totalPersisted: number;
}

export interface StudentContestRecordView {
  platform: string;
  externalContestId: string;
  contestName: string;
  participatedAt: string;
  rank: number | null;
  totalParticipants: number | null;
  oldRating: number | null;
  newRating: number | null;
  ratingChange: number | null;
  finishPercentile: number | null;
  personalBest: boolean;
  status: ContestRecordStatus;
  evidenceSource: ContestEvidenceSource;
  evidenceReference: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
}

export interface PlatformContestView {
  platform: string;
  connected: boolean;
  ownershipStatus: OwnershipStatus;
  ownershipVerified: boolean;
  available: boolean;
  coverage: ContestCoverage;
  evidenceSource: ContestEvidenceSource;
  evidenceSourceLabel: string;
  apiKind: string;
  contestCount: number;
  ratedContestsCount: number;
  personalBestRating: number | null;
  cumulativeRatingImprovement: number;
  top10PercentFinishes: number;
  top5PercentFinishes: number;
  lastSuccessfulSyncAt: string | null;
  lastAttemptAt: string | null;
  latestSyncStatus: string | null;
  unavailableReason: string | null;
  eligibleForAutomatedContestBadges: boolean;
  ineligibilityReason: string | null;
  supportsRank: boolean;
  supportsTotalParticipants: boolean;
  supportsRatingChange: boolean;
  notes: string[];
}

export interface PendingContestReview {
  id: string;
  platform: string;
  externalContestId: string;
  contestName: string | null;
  status: ContestReviewStatus;
  requestedRank: number | null;
  requestedTotalParticipants: number | null;
  requestedOldRating: number | null;
  requestedNewRating: number | null;
  evidenceUrl: string | null;
  evidenceNote: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewReason: string | null;
  createdAt: string;
  studentId?: string;
  student?: { id: string; name: string; email: string } | null;
}

export interface EarnedContestBadge {
  badgeId: string;
  title: string;
  platform: string | null;
  awardedAt: string;
  credentialId: string | null;
}

export interface StudentContestView {
  studentId: string;
  generatedAt: string;
  timeZone: string;
  platforms: PlatformContestView[];
  records: StudentContestRecordView[];
  pendingReviews: PendingContestReview[];
  earnedBadges: EarnedContestBadge[];
  partialHistory: boolean;
  stats: ContestStats;
}

const emptyStats = (): ContestStats => computeContestStats([]);

function deterministicContestRowId(studentId: string, platform: string, externalContestId: string): string {
  const digest = crypto
    .createHash('sha1')
    .update(`${studentId}|${platform}|${externalContestId}`)
    .digest('hex')
    .slice(0, 32);
  return `vc_${digest}`;
}

export class ContestVerificationService {
  // ── Provider fetch + normalize ────────────────────────────────────────────

  private capabilityFor(platform: string): ProviderContestCapability | null {
    return getContestCapability(platform);
  }

  /**
   * Reads one provider's contest feed and normalizes it. Never throws for
   * expected provider conditions.
   */
  async fetchPlatformContests(
    platform: string,
    username: string,
  ): Promise<ContestNormalizationResult> {
    const key = platform.toUpperCase() as ProviderId;
    const capability = this.capabilityFor(key);
    const adapter = platformRegistry.getProvider(key);

    if (!capability || !adapter) {
      return normalizeContestFeed({
        platform: key,
        capability:
          capability ??
          ({
            platform: key,
            evidenceSource: 'PUBLIC_PROFILE',
          } as ProviderContestCapability),
        available: false,
        unavailableReason: `No contest capability registered for ${key}.`,
      });
    }

    if (!capability.contestHistory) {
      return normalizeContestFeed({
        platform: key,
        capability,
        available: false,
        unavailableReason: `${key} does not publish a contest-history feed.`,
      });
    }

    const evidenceReference = platformRegistry.getAdapter(key)?.getCanonicalUrl(username) ?? '';
    const result = await adapter.fetchContestHistory(username, { limit: 500 });

    if (!result.ok) {
      return normalizeContestFeed({
        platform: key,
        capability,
        available: false,
        unavailableReason: `${result.errorKind}: ${result.error}`,
      });
    }

    return normalizeContestFeed({
      platform: key,
      capability,
      results: result.data.map((c) => ({
        externalActivityId: c.externalActivityId,
        contestName: c.contestName,
        rank: c.rank,
        totalParticipants: c.totalParticipants,
        oldRating: c.oldRating,
        newRating: c.newRating,
        ratingChange: c.ratingChange,
        participatedAt: c.participatedAt,
      })),
      available: true,
      evidenceReference,
    });
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  /**
   * Idempotently persists normalized records. Retrying an import is safe:
   *  - the composite unique key (studentId, platform, externalContestId) dedupes
   *  - `participatedAt` is written once and never rewritten
   *  - a NULL from a later sync NEVER overwrites an already-known value
   *  - a record is never downgraded from VERIFIED back to PARTIAL
   */
  async persistContests(
    studentId: string,
    records: NormalizedContestRecord[],
  ): Promise<number> {
    let persisted = 0;
    for (const record of records) {
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "verified_contests" (
             id, "studentId", platform, "externalContestId", "contestName", "participatedAt",
             rank, "totalParticipants", "oldRating", "newRating", "ratingChange",
             status, "evidenceSource", "evidenceReference", "rawMetadata", "createdAt", "updatedAt"
           ) VALUES ($1,$2,$3,$4,$5,$6::timestamp,$7,$8,$9,$10,$11,$12,$13,$14,null,NOW(),NOW())
           ON CONFLICT ("studentId", platform, "externalContestId") DO UPDATE SET
             "contestName"        = EXCLUDED."contestName",
             rank                 = COALESCE(EXCLUDED.rank, verified_contests.rank),
             "totalParticipants"  = COALESCE(EXCLUDED."totalParticipants", verified_contests."totalParticipants"),
             "oldRating"          = COALESCE(EXCLUDED."oldRating", verified_contests."oldRating"),
             "newRating"          = COALESCE(EXCLUDED."newRating", verified_contests."newRating"),
             "ratingChange"       = COALESCE(EXCLUDED."ratingChange", verified_contests."ratingChange"),
             -- evidence may only strengthen; never downgrade VERIFIED to PARTIAL
             status               = CASE
                                      WHEN verified_contests.status = 'VERIFIED' THEN 'VERIFIED'
                                      WHEN verified_contests.status = 'REJECTED' THEN 'REJECTED'
                                      ELSE EXCLUDED.status
                                    END,
             "evidenceReference"  = COALESCE(EXCLUDED."evidenceReference", verified_contests."evidenceReference"),
             "updatedAt"          = NOW()`,
          deterministicContestRowId(studentId, record.platform, record.externalContestId),
          studentId,
          record.platform,
          record.externalContestId,
          record.contestName,
          record.participatedAt,
          record.rank ?? null,
          record.totalParticipants ?? null,
          record.oldRating ?? null,
          record.newRating ?? null,
          record.ratingChange ?? null,
          record.status,
          record.evidenceSource,
          record.evidenceReference ?? null,
        );
        persisted++;
      } catch {
        // Table not migrated yet or transient error — skip this row only.
      }
    }
    return persisted;
  }

  private async recordPlatformSync(
    studentId: string,
    platform: string,
    sync: Omit<PlatformContestSync, 'platform'>,
  ): Promise<void> {
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "platform_contest_sync" (
           id, "studentId", platform, status, coverage, "evidenceSource",
           "contestsFound", "contestsPersisted", "recordsRejected",
           "errorCode", "errorMessage", "lastAttemptAt", "lastSuccessfulSyncAt", "createdAt", "updatedAt"
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),$12,NOW(),NOW())
         ON CONFLICT ("studentId", platform) DO UPDATE SET
           status = EXCLUDED.status,
           coverage = EXCLUDED.coverage,
           "evidenceSource" = EXCLUDED."evidenceSource",
           "contestsFound" = EXCLUDED."contestsFound",
           "contestsPersisted" = EXCLUDED."contestsPersisted",
           "recordsRejected" = EXCLUDED."recordsRejected",
           "errorCode" = EXCLUDED."errorCode",
           "errorMessage" = EXCLUDED."errorMessage",
           "lastAttemptAt" = NOW(),
           "lastSuccessfulSyncAt" = COALESCE(EXCLUDED."lastSuccessfulSyncAt", platform_contest_sync."lastSuccessfulSyncAt"),
           "updatedAt" = NOW()`,
        `pcsync_${studentId}_${platform}`,
        studentId,
        platform,
        sync.status,
        sync.coverage,
        sync.evidenceSource,
        sync.contestsFound,
        sync.contestsPersisted,
        sync.recordsRejected,
        sync.errorKind ?? null,
        sync.message ?? null,
        sync.ok ? new Date() : null,
      );
    } catch {
      // Additive table absent — coverage simply isn't cached.
    }
  }

  /**
   * Syncs contest history for every connected platform. One provider failing
   * does NOT stop the others (each platform is isolated).
   */
  async syncStudentContests(studentId: string): Promise<StudentContestSyncResult> {
    const startedAt = new Date().toISOString();
    const verifiedProfiles = await prisma.verifiedProfile
      .findMany({ where: { studentId } })
      .catch(() => [] as Array<{ platform: string; username: string | null }>);
    const profile = await prisma.profile.findUnique({ where: { userId: studentId } }).catch(() => null);

    const platforms: PlatformContestSync[] = [];

    for (const platform of EXTERNAL_VERIFIED_PLATFORMS) {
      const capability = this.capabilityFor(platform);
      if (!capability) continue;

      const verifiedRow = verifiedProfiles.find((v) => v.platform === platform);
      const adapter = platformRegistry.getAdapter(platform);
      const storedUrl = (profile as Record<string, unknown> | null)?.[
        `${platform.toLowerCase()}Url`
      ] as string | undefined;
      const username =
        verifiedRow?.username || (storedUrl && adapter ? adapter.parseUsernameFromUrl(storedUrl) : null) || null;

      if (!username) continue;

      let normalized: ContestNormalizationResult;
      try {
        normalized = await this.fetchPlatformContests(platform, username);
      } catch (err: any) {
        normalized = normalizeContestFeed({
          platform: platform as ProviderId,
          capability,
          available: false,
          unavailableReason: err?.message || 'Provider read failed.',
        });
      }

      let persisted = 0;
      if (normalized.records.length > 0) {
        persisted = await this.persistContests(studentId, normalized.records);
      }

      const sync: Omit<PlatformContestSync, 'platform'> = {
        ok: normalized.available && normalized.coverage !== 'UNAVAILABLE',
        coverage: normalized.coverage,
        evidenceSource: normalized.evidenceSource,
        contestsFound: normalized.records.length,
        contestsPersisted: persisted,
        recordsRejected: normalized.rejected.length,
        status: normalized.available ? (normalized.coverage === 'UNAVAILABLE' ? 'UNSUPPORTED' : 'SUCCESS') : 'FAILED',
        message: normalized.unavailableReason ?? undefined,
      };

      await this.recordPlatformSync(studentId, platform, sync);
      platforms.push({ platform: platform as ProviderId, ...sync });
    }

    return {
      studentId,
      startedAt,
      finishedAt: new Date().toISOString(),
      platforms,
      totalPersisted: platforms.reduce((sum, p) => sum + p.contestsPersisted, 0),
    };
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  private async readPersistedRecords(studentId: string): Promise<Array<Record<string, unknown>>> {
    try {
      return await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT "platform", "externalContestId", "contestName", "participatedAt",
                "rank", "totalParticipants", "oldRating", "newRating", "ratingChange",
                "status", "evidenceSource", "evidenceReference", "reviewedById", "reviewedAt"
         FROM "verified_contests"
         WHERE "studentId" = $1
         ORDER BY "participatedAt" DESC`,
        studentId,
      );
    } catch {
      return [];
    }
  }

  private async readSyncRows(studentId: string): Promise<Array<Record<string, unknown>>> {
    try {
      return await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT platform, status, coverage, "evidenceSource", "contestsFound", "contestsPersisted",
                "recordsRejected", "errorCode", "errorMessage", "lastAttemptAt", "lastSuccessfulSyncAt"
         FROM "platform_contest_sync" WHERE "studentId" = $1`,
        studentId,
      );
    } catch {
      return [];
    }
  }

  private async readPendingReviews(studentId: string): Promise<PendingContestReview[]> {
    try {
      const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT id, platform, "externalContestId", "contestName", status,
                "requestedRank", "requestedTotalParticipants", "requestedOldRating", "requestedNewRating",
                "evidenceUrl", "evidenceNote", "reviewedById", "reviewedAt", "reviewReason", "createdAt"
         FROM "contest_review_requests"
         WHERE "studentId" = $1
         ORDER BY "createdAt" DESC`,
        studentId,
      );
      return rows.map((r) => this.mapReviewRow(r));
    } catch {
      return [];
    }
  }

  private mapReviewRow(r: Record<string, unknown>): PendingContestReview {
    const asDate = (v: unknown): string | null => (v instanceof Date ? v.toISOString() : v ? String(v) : null);
    const asNum = (v: unknown): number | null =>
      typeof v === 'number' ? v : v == null ? null : Number(v);
    return {
      id: String(r.id),
      platform: String(r.platform),
      externalContestId: String(r.externalContestId),
      contestName: (r.contestName as string) ?? null,
      status: (r.status as ContestReviewStatus) ?? 'PENDING',
      requestedRank: asNum(r.requestedRank),
      requestedTotalParticipants: asNum(r.requestedTotalParticipants),
      requestedOldRating: asNum(r.requestedOldRating),
      requestedNewRating: asNum(r.requestedNewRating),
      evidenceUrl: (r.evidenceUrl as string) ?? null,
      evidenceNote: (r.evidenceNote as string) ?? null,
      reviewedById: (r.reviewedById as string) ?? null,
      reviewedAt: asDate(r.reviewedAt),
      reviewReason: (r.reviewReason as string) ?? null,
      createdAt: asDate(r.createdAt) ?? new Date().toISOString(),
    };
  }

  /** Full student-facing contest view (Phase 3 §8). */
  async getStudentContestView(studentId: string): Promise<StudentContestView> {
    const [rawRecords, syncRows, pendingReviews, verifiedProfiles, earnedBadges] = await Promise.all([
      this.readPersistedRecords(studentId),
      this.readSyncRows(studentId),
      this.readPendingReviews(studentId),
      prisma.verifiedProfile.findMany({ where: { studentId } }).catch(() => [] as Array<{ platform: string; verificationStatus: string | null }>),
      this.getEarnedContestBadges(studentId),
    ]);

    const records: StudentContestRecordView[] = rawRecords.map((r) => {
      const platform = String(r.platform);
      const rank = typeof r.rank === 'number' ? r.rank : r.rank == null ? null : Number(r.rank);
      const total = typeof r.totalParticipants === 'number' ? r.totalParticipants : r.totalParticipants == null ? null : Number(r.totalParticipants);
      return {
        platform,
        externalContestId: String(r.externalContestId),
        contestName: String(r.contestName),
        participatedAt: (r.participatedAt instanceof Date ? r.participatedAt.toISOString() : String(r.participatedAt)),
        rank,
        totalParticipants: total,
        oldRating: r.oldRating == null ? null : Number(r.oldRating),
        newRating: r.newRating == null ? null : Number(r.newRating),
        ratingChange: r.ratingChange == null ? null : Number(r.ratingChange),
        finishPercentile: computeFinishPercentile(rank ?? undefined, total ?? undefined),
        personalBest: false,
        status: (r.status as ContestRecordStatus) ?? 'VERIFIED',
        evidenceSource: (r.evidenceSource as ContestEvidenceSource) ?? 'OFFICIAL_API',
        evidenceReference: (r.evidenceReference as string) ?? null,
        reviewedById: (r.reviewedById as string) ?? null,
        reviewedAt: r.reviewedAt instanceof Date ? r.reviewedAt.toISOString() : (r.reviewedAt as string) ?? null,
      };
    });

    // Flag each platform's personal-best record.
    const bestByPlatform = new Map<string, number>();
    for (const r of records) {
      if (r.newRating == null) continue;
      const current = bestByPlatform.get(r.platform);
      if (current === undefined || r.newRating > current) bestByPlatform.set(r.platform, r.newRating);
    }
    for (const r of records) {
      r.personalBest = r.newRating != null && r.newRating === bestByPlatform.get(r.platform);
    }

    const normalizedRecords: NormalizedContestRecord[] = records
      .filter((r) => r.status !== 'REJECTED')
      .map((r) => ({
        platform: r.platform as ProviderId,
        externalContestId: r.externalContestId,
        contestName: r.contestName,
        participatedAt: r.participatedAt,
        participated: true,
        rank: r.rank ?? undefined,
        totalParticipants: r.totalParticipants ?? undefined,
        oldRating: r.oldRating ?? undefined,
        newRating: r.newRating ?? undefined,
        ratingChange: r.ratingChange ?? undefined,
        evidenceReference: r.evidenceReference ?? undefined,
        evidenceSource: r.evidenceSource,
        status: r.status,
      }));

    const stats = normalizedRecords.length ? computeContestStats(normalizedRecords) : emptyStats();

    const syncByPlatform = new Map(syncRows.map((s) => [String(s.platform), s]));

    const platforms: PlatformContestView[] = [];
    for (const platform of EXTERNAL_VERIFIED_PLATFORMS) {
      const capability = this.capabilityFor(platform);
      if (!capability) continue;

      const verifiedRow = verifiedProfiles.find((v) => v.platform === platform);
      const ownershipStatus = normalizeOwnershipStatus(verifiedRow?.verificationStatus ?? null);
      const ownershipVerified = ownershipStatus === 'OWNERSHIP_VERIFIED';
      const connected = Boolean(verifiedRow);

      const sync = syncByPlatform.get(platform);
      const coverage: ContestCoverage = !capability.contestHistory
        ? 'UNAVAILABLE'
        : (sync?.coverage as ContestCoverage) ?? capability.historicalCompleteness;

      const platformStats: PlatformContestStats =
        stats.byPlatform.find((p) => p.platform === platform) ?? {
          platform,
          participationCount: 0,
          ratedContestsCount: 0,
          personalBestRating: null,
          cumulativeRatingImprovement: 0,
          top10PercentFinishes: 0,
          top5PercentFinishes: 0,
          hasRankData: false,
          hasParticipantCountData: false,
        };

      const available = capability.contestHistory && (sync ? sync.status !== 'FAILED' : true);

      const eligibleForAutomatedContestBadges = available && ownershipVerified && coverage !== 'UNAVAILABLE';

      let ineligibilityReason: string | null = null;
      if (!capability.contestHistory) {
        ineligibilityReason = `${platform} does not publish contest history, so contest badges cannot be verified automatically.`;
      } else if (!available) {
        ineligibilityReason = 'The provider could not be read on the last sync, so contest evidence is unavailable.';
      } else if (!ownershipVerified) {
        ineligibilityReason =
          'Account ownership is not proven for this platform, so it cannot back a high-value contest badge automatically.';
      } else if (coverage === 'PARTIAL') {
        ineligibilityReason = 'Contest history is incomplete (PARTIAL HISTORY) — evidence is shown but not badge-eligible yet.';
      }

      platforms.push({
        platform,
        connected,
        ownershipStatus,
        ownershipVerified,
        available,
        coverage,
        evidenceSource: (sync?.evidenceSource as ContestEvidenceSource) ?? capability.evidenceSource,
        evidenceSourceLabel:
          CONTEST_EVIDENCE_SOURCE_LABELS[
            ((sync?.evidenceSource as ContestEvidenceSource) ?? capability.evidenceSource)
          ],
        apiKind: capability.apiKind,
        contestCount: platformStats.participationCount,
        ratedContestsCount: platformStats.ratedContestsCount,
        personalBestRating: platformStats.personalBestRating,
        cumulativeRatingImprovement: platformStats.cumulativeRatingImprovement,
        top10PercentFinishes: platformStats.top10PercentFinishes,
        top5PercentFinishes: platformStats.top5PercentFinishes,
        lastSuccessfulSyncAt:
          sync?.lastSuccessfulSyncAt instanceof Date
            ? sync.lastSuccessfulSyncAt.toISOString()
            : (sync?.lastSuccessfulSyncAt as string) ?? null,
        lastAttemptAt:
          sync?.lastAttemptAt instanceof Date
            ? sync.lastAttemptAt.toISOString()
            : (sync?.lastAttemptAt as string) ?? null,
        latestSyncStatus: (sync?.status as string) ?? null,
        unavailableReason: (sync?.errorMessage as string) ?? null,
        eligibleForAutomatedContestBadges,
        ineligibilityReason,
        supportsRank: capability.contestHistory,
        supportsTotalParticipants: capability.supportsTotalParticipants,
        supportsRatingChange: capability.supportsRatingChange,
        notes: capability.notes,
      });
    }

    return {
      studentId,
      generatedAt: new Date().toISOString(),
      timeZone: 'Asia/Kolkata',
      platforms,
      records,
      pendingReviews,
      earnedBadges,
      partialHistory: platforms.some((p) => p.coverage === 'PARTIAL'),
      stats,
    };
  }

  /**
   * Contest statistics for the badge engine. Only persisted, participation-
   * verified records on ownership-proven platforms contribute.
   */
  async getContestBadgeStats(studentId: string): Promise<ContestStats> {
    const view = await this.getStudentContestView(studentId);
    const eligiblePlatforms = new Set(
      view.platforms.filter((p) => p.eligibleForAutomatedContestBadges).map((p) => p.platform),
    );
    const records: NormalizedContestRecord[] = view.records
      .filter((r) => eligiblePlatforms.has(r.platform) && r.status !== 'REJECTED')
      .map((r) => ({
        platform: r.platform as ProviderId,
        externalContestId: r.externalContestId,
        contestName: r.contestName,
        participatedAt: r.participatedAt,
        participated: true,
        rank: r.rank ?? undefined,
        totalParticipants: r.totalParticipants ?? undefined,
        oldRating: r.oldRating ?? undefined,
        newRating: r.newRating ?? undefined,
        ratingChange: r.ratingChange ?? undefined,
        evidenceSource: r.evidenceSource,
        status: r.status,
      }));
    return computeContestStats(records);
  }

  /** Earned Phase 3 contest badges, attributed to the platform in the evidence. */
  async getEarnedContestBadges(studentId: string): Promise<EarnedContestBadge[]> {
    const { CONTEST_BADGE_IDS } = await import('@/lib/gamification/badgeConfig');
    try {
      const rows = await prisma.studentBadge.findMany({
        where: { studentId, badgeId: { in: [...CONTEST_BADGE_IDS] } },
        select: { badgeId: true, title: true, awardedAt: true, credentialId: true, evidenceData: true },
        orderBy: { awardedAt: 'asc' },
      });
      return rows.map((r) => {
        const evidence =
          r.evidenceData && typeof r.evidenceData === 'object'
            ? ((r.evidenceData as { evidence?: { platform?: unknown } }).evidence ?? null)
            : null;
        const platform =
          evidence && typeof evidence.platform === 'string' ? evidence.platform.toUpperCase() : null;
        return {
          badgeId: r.badgeId,
          title: r.title,
          platform,
          awardedAt: r.awardedAt.toISOString(),
          credentialId: r.credentialId ?? null,
        };
      });
    } catch {
      return [];
    }
  }

  // ── Manual review (§3/§7) ─────────────────────────────────────────────────

  /**
   * Records a student's manual-review request. Idempotent: re-requesting the
   * same (student, platform, contest) returns the existing request unchanged
   * instead of creating a duplicate.
   */
  async requestManualReview(
    studentId: string,
    input: {
      platform: string;
      externalContestId: string;
      contestName?: string | null;
      rank?: number | null;
      totalParticipants?: number | null;
      oldRating?: number | null;
      newRating?: number | null;
      evidenceUrl?: string | null;
      evidenceNote?: string | null;
    },
  ): Promise<{ ok: boolean; created: boolean; id?: string; error?: string }> {
    const platform = (input.platform || '').toUpperCase();
    const externalContestId = (input.externalContestId || '').trim();
    if (!platform || !externalContestId) {
      return { ok: false, created: false, error: 'platform and externalContestId are required.' };
    }
    if (!this.capabilityFor(platform)) {
      return { ok: false, created: false, error: `${platform} is not a supported contest platform.` };
    }

    const id = `crev_${crypto.createHash('sha1').update(`${studentId}|${platform}|${externalContestId}`).digest('hex').slice(0, 32)}`;

    try {
      const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO "contest_review_requests" (
           id, "studentId", platform, "externalContestId", "contestName",
           "requestedRank", "requestedTotalParticipants", "requestedOldRating", "requestedNewRating",
           "evidenceUrl", "evidenceNote", status, "createdAt", "updatedAt"
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'PENDING',NOW(),NOW())
         ON CONFLICT ("studentId", platform, "externalContestId") DO NOTHING
         RETURNING id`,
        id,
        studentId,
        platform,
        externalContestId,
        input.contestName ?? null,
        input.rank ?? null,
        input.totalParticipants ?? null,
        input.oldRating ?? null,
        input.newRating ?? null,
        input.evidenceUrl ?? null,
        input.evidenceNote ?? null,
      );
      return { ok: true, created: rows.length > 0, id };
    } catch (err: any) {
      return { ok: false, created: false, error: err?.message || 'Could not record review request.' };
    }
  }

  /** Manual-review queue for the Super Admin dashboard. */
  async listReviewQueue(options: { status?: ContestReviewStatus; platform?: string } = {}): Promise<
    PendingContestReview[]
  > {
    const status = options.status ?? 'PENDING';
    const platform = options.platform ? options.platform.toUpperCase() : null;
    try {
      const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT r.id, r."studentId", r.platform, r."externalContestId", r."contestName", r.status,
                r."requestedRank", r."requestedTotalParticipants", r."requestedOldRating", r."requestedNewRating",
                r."evidenceUrl", r."evidenceNote", r."reviewedById", r."reviewedAt", r."reviewReason", r."createdAt",
                u.name AS "studentName", u.email AS "studentEmail"
         FROM "contest_review_requests" r
         LEFT JOIN "users" u ON u.id = r."studentId"
         WHERE r.status = $1 AND ($2::text IS NULL OR r.platform = $2)
         ORDER BY r."createdAt" ASC
         LIMIT 200`,
        status,
        platform,
      );
      return rows.map((r) => ({
        ...this.mapReviewRow(r),
        studentId: String(r.studentId),
        student: r.studentName ? {
          id: String(r.studentId),
          name: String(r.studentName),
          email: String(r.studentEmail ?? ''),
        } : null,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Approves or rejects a manual-review request. A reason is MANDATORY.
   *
   * Approval writes a `verified_contests` row with `evidenceSource =
   * MANUAL_REVIEW`. It NEVER touches `verified_profiles`, so participation
   * approval cannot upgrade account ownership.
   */
  async decideReview(input: {
    reviewerId: string;
    requestId: string;
    decision: 'APPROVE' | 'REJECT';
    reason: string;
  }): Promise<{ ok: boolean; error?: string; status?: ContestReviewStatus }> {
    const reason = (input.reason || '').trim();
    if (!reason) return { ok: false, error: 'A reason is required for every review decision.' };
    if (input.decision !== 'APPROVE' && input.decision !== 'REJECT') {
      return { ok: false, error: 'decision must be APPROVE or REJECT.' };
    }

    let request: Record<string, unknown> | undefined;
    try {
      const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT * FROM "contest_review_requests" WHERE id = $1`,
        input.requestId,
      );
      request = rows[0];
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Review request could not be loaded.' };
    }
    if (!request) return { ok: false, error: 'Review request not found.' };

    const status: ContestReviewStatus = input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "contest_review_requests"
         SET status = $1, "reviewedById" = $2, "reviewedAt" = NOW(), "reviewReason" = $3, "updatedAt" = NOW()
         WHERE id = $4`,
        status,
        input.reviewerId,
        reason,
        input.requestId,
      );
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Could not persist the review decision.' };
    }

    if (input.decision === 'APPROVE') {
      const studentId = String(request.studentId);
      const platform = String(request.platform);
      const externalContestId = String(request.externalContestId);
      const num = (v: unknown): number | null => (typeof v === 'number' ? v : v == null ? null : Number(v));
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "verified_contests" (
             id, "studentId", platform, "externalContestId", "contestName", "participatedAt",
             rank, "totalParticipants", "oldRating", "newRating", "ratingChange",
             status, "evidenceSource", "evidenceReference", "reviewedById", "reviewedAt", "reviewReason",
             "createdAt", "updatedAt"
           ) VALUES ($1,$2,$3,$4,$5,COALESCE($6::timestamp, NOW()),$7,$8,$9,$10,$11,
                     'VERIFIED','MANUAL_REVIEW',$12,$13,NOW(),$14,NOW(),NOW())
           ON CONFLICT ("studentId", platform, "externalContestId") DO UPDATE SET
             status = 'VERIFIED',
             "evidenceSource" = 'MANUAL_REVIEW',
             rank = COALESCE(EXCLUDED.rank, verified_contests.rank),
             "totalParticipants" = COALESCE(EXCLUDED."totalParticipants", verified_contests."totalParticipants"),
             "oldRating" = COALESCE(EXCLUDED."oldRating", verified_contests."oldRating"),
             "newRating" = COALESCE(EXCLUDED."newRating", verified_contests."newRating"),
             "ratingChange" = COALESCE(EXCLUDED."ratingChange", verified_contests."ratingChange"),
             "reviewedById" = EXCLUDED."reviewedById",
             "reviewedAt" = NOW(),
             "reviewReason" = EXCLUDED."reviewReason",
             "updatedAt" = NOW()`,
          deterministicContestRowId(studentId, platform, externalContestId),
          studentId,
          platform,
          externalContestId,
          (request.contestName as string) ?? `${platform} Contest`,
          (request.requestedAt as string) ?? null,
          num(request.requestedRank),
          num(request.requestedTotalParticipants),
          num(request.requestedOldRating),
          num(request.requestedNewRating),
          num(request.requestedOldRating) !== null && num(request.requestedNewRating) !== null
            ? (num(request.requestedNewRating)! - num(request.requestedOldRating)!)
            : null,
          (request.evidenceUrl as string) ?? null,
          input.reviewerId,
          reason,
        );
      } catch {
        // Approval recorded on the request; the contest row is best-effort.
      }
    }

    return { ok: true, status };
  }

  /**
   * Per-platform contest coverage for the admin dashboard. Read-only.
   */
  async getPlatformContestCoverage(): Promise<
    Array<{
      platform: string;
      evidenceSource: ContestEvidenceSource;
      apiKind: string;
      historicalCompleteness: ContestCoverage;
      studentsSynced: number;
      successfulSyncs: number;
      failedSyncs: number;
      unsupported: number;
      contestsStored: number;
      pendingReviews: number;
      lastSuccessfulSyncAt: string | null;
      notes: string[];
    }>
  > {
    const [syncAgg, contestAgg, reviewAgg] = await Promise.all([
      prisma
        .$queryRawUnsafe<
          Array<{
            platform: string;
            studentsSynced: number;
            successful: number;
            failed: number;
            unsupported: number;
            lastSuccess: Date | null;
          }>
        >(
          `SELECT platform,
                  COUNT(DISTINCT "studentId")::int AS "studentsSynced",
                  COUNT(*) FILTER (WHERE status = 'SUCCESS')::int AS successful,
                  COUNT(*) FILTER (WHERE status = 'FAILED')::int AS failed,
                  COUNT(*) FILTER (WHERE status = 'UNSUPPORTED')::int AS unsupported,
                  MAX("lastSuccessfulSyncAt") AS "lastSuccess"
           FROM "platform_contest_sync"
           GROUP BY platform`,
        )
        .catch(() => []),
      prisma
        .$queryRawUnsafe<Array<{ platform: string; count: number }>>(
          `SELECT platform, COUNT(*)::int AS count FROM "verified_contests" GROUP BY platform`,
        )
        .catch(() => []),
      prisma
        .$queryRawUnsafe<Array<{ platform: string; count: number }>>(
          `SELECT platform, COUNT(*)::int AS count FROM "contest_review_requests" WHERE status = 'PENDING' GROUP BY platform`,
        )
        .catch(() => []),
    ]);

    const syncMap = new Map(syncAgg.map((s) => [s.platform, s]));
    const contestMap = new Map(contestAgg.map((c) => [c.platform, c.count]));
    const reviewMap = new Map(reviewAgg.map((r) => [r.platform, r.count]));

    return PROVIDER_CONTEST_CAPABILITY_MATRIX.map((cap) => {
      const sync = syncMap.get(cap.platform);
      return {
        platform: cap.platform,
        evidenceSource: cap.evidenceSource,
        apiKind: cap.apiKind,
        historicalCompleteness: cap.historicalCompleteness,
        studentsSynced: sync?.studentsSynced ?? 0,
        successfulSyncs: sync?.successful ?? 0,
        failedSyncs: sync?.failed ?? 0,
        unsupported: sync?.unsupported ?? 0,
        contestsStored: contestMap.get(cap.platform) ?? 0,
        pendingReviews: reviewMap.get(cap.platform) ?? 0,
        lastSuccessfulSyncAt: sync?.lastSuccess instanceof Date ? sync.lastSuccess.toISOString() : null,
        notes: cap.notes,
      };
    });
  }
}

export const contestVerificationService = new ContestVerificationService();
export { PENDING_REVIEW_PLATFORM_SOURCE };
