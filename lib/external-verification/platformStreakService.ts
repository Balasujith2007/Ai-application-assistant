import prisma from '@/lib/prisma';
import { platformRegistry } from '@/lib/leaderboard/adapters/adapterRegistry';
import { EXTERNAL_VERIFIED_PLATFORMS } from '@/lib/leaderboard/types';
import { CODING_STREAK_BADGE_IDS } from '@/lib/gamification/badgeConfig';
import { normalizeOwnershipStatus, OwnershipStatus } from './ownershipStatus';
import {
  CodingStreakSummary,
  CodingStreakUnknownRange,
  DEFAULT_STREAK_TIME_ZONE,
  PlatformHistoryCoverage,
  STREAK_QUALIFYING_ACTIVITY_TYPE,
  computeCodingStreak,
  toPlatformLocalDate,
} from './platformStreak';

/**
 * Platform-specific coding-streak service (Phase 2, Steps 2/4/5).
 *
 * An independent streak is computed per platform from VERIFIED ACCEPTED
 * submissions only. The global `student_daily_streaks` table is deliberately
 * NOT used as the platform store — its unique key is (studentId, activityDate)
 * and cannot represent per-platform days.
 *
 * Reliability is modelled explicitly:
 *  - A provider that cannot expose accepted submissions (LeetCode, CodeChef)
 *    yields `supported: false` — never a fabricated zero streak.
 *  - Provider outages / missing history produce `unknownRanges`, so those days
 *    stop the count instead of counting as a missed day, and the result is
 *    flagged `PARTIAL HISTORY`.
 *
 * Derived snapshots are cached in `student_platform_streaks` (additive, optional
 * table). When that table has not been migrated the service degrades silently to
 * on-the-fly computation — nothing breaks and no verified evidence is touched.
 */

export const STREAK_SOURCE_TYPE = 'CONTEST';

/** Per-platform streak view enriched with ownership + sync context. */
export interface PlatformCodingStreakView extends CodingStreakSummary {
  /** True when the student has linked (and had verified) an account here. */
  connected: boolean;
  ownershipStatus: OwnershipStatus;
  ownershipVerified: boolean;
  /** True only when the streak may back a high-value streak badge. */
  eligibleForStreakBadges: boolean;
  ineligibilityReason: string | null;
  lastSuccessfulSyncAt: string | null;
  lastAttemptAt: string | null;
  /** Raw latest sync result: SUCCESS | FAILED | NEVER (or provider specific). */
  latestSyncStatus: string | null;
  providerAvailable: boolean | null;
}

/** An earned Phase 2 coding-streak badge, attributed to the platform in its evidence. */
export interface EarnedCodingStreakBadge {
  badgeId: string;
  title: string;
  platform: string | null;
  awardedAt: string;
  credentialId: string | null;
}

export interface CodingStreakStats {
  /** Longest qualifying streak among OWNERSHIP_VERIFIED, supported platforms. */
  verifiedCodingStreakDays: number;
  /** Platform that produced `verifiedCodingStreakDays`, if any. */
  codingStreakPlatform: string | null;
  /** Total qualifying (accepted) days across ownership-verified platforms. */
  codingAcceptedActivityCount: number;
  /** Evidence reference for the awarded streak badge, if eligible. */
  codingStreakEvidence: {
    platform: string;
    longestStreak: number;
    acceptedActivityCount: number;
    firstActivityDate: string | null;
    lastActivityDate: string | null;
    coverage: PlatformHistoryCoverage;
  } | null;
}

export interface StudentCodingStreaksResult {
  studentId: string;
  generatedAt: string;
  timeZone: string;
  platforms: PlatformCodingStreakView[];
  /** Best ownership-verified platform streak (badge-eligible). */
  bestVerified: PlatformCodingStreakView | null;
  /** Informational only — platforms are never combined for badge eligibility. */
  combinedLongestStreak: number;
  partialHistory: boolean;
  stats: CodingStreakStats;
}

interface ActivityRow {
  sourcePlatform: string;
  occurredAt: Date | null;
}

interface SyncRow {
  sourcePlatform: string;
  status: string;
  lastAttemptAt: Date;
  lastSuccessfulSyncAt: Date | null;
}

function platformCapabilityView(platform: string) {
  return platformRegistry.getProvider(platform)?.getProviderCapabilities() ?? null;
}

/** Reads the platform recorded in a coding-streak badge's award evidence. */
function readEvidencePlatform(evidenceData: unknown): string | null {
  if (!evidenceData || typeof evidenceData !== 'object') return null;
  const evidence = (evidenceData as { evidence?: unknown }).evidence;
  if (!evidence || typeof evidence !== 'object') return null;
  const platform = (evidence as { platform?: unknown }).platform;
  return typeof platform === 'string' ? platform.toUpperCase() : null;
}

/**
 * Derives coverage + unverifiable windows from real sync history. A failed sync
 * followed by a later success means the gap between them is unknown activity —
 * exactly the case that must NOT be treated as a missed day.
 */
export function deriveCoverage(
  syncs: SyncRow[],
  timeZone: string,
): { coverage: PlatformHistoryCoverage; unknownRanges: CodingStreakUnknownRange[] } {
  const ordered = [...syncs].sort((a, b) => a.lastAttemptAt.getTime() - b.lastAttemptAt.getTime());
  const unknownRanges: CodingStreakUnknownRange[] = [];

  let lastSuccessKey: string | null = null;
  let pendingFailure = false;

  for (const sync of ordered) {
    const attemptKey = toPlatformLocalDate(sync.lastAttemptAt, timeZone);
    if (sync.status === 'SUCCESS') {
      if (pendingFailure && lastSuccessKey && attemptKey) {
        unknownRanges.push({ from: lastSuccessKey, to: attemptKey });
      }
      lastSuccessKey = attemptKey;
      pendingFailure = false;
    } else {
      pendingFailure = true;
    }
  }

  const todayKey = toPlatformLocalDate(new Date(), timeZone);
  if (pendingFailure && lastSuccessKey && todayKey) {
    unknownRanges.push({ from: lastSuccessKey, to: todayKey });
  }

  const everSucceeded = ordered.some((s) => s.status === 'SUCCESS');
  const coverage: PlatformHistoryCoverage =
    everSucceeded && unknownRanges.length === 0 ? 'FULL' : 'PARTIAL';

  return { coverage, unknownRanges };
}

export class PlatformStreakService {
  private unsupportedReason(platform: string): string | null {
    const caps = platformCapabilityView(platform);
    if (!caps) return `No provider adapter registered for ${platform}.`;
    if (!caps.acceptedSubmissions || !caps.submissionTimestamps) {
      return `${platform} does not expose accepted submissions with reliable timestamps, so a verified coding streak cannot be computed.`;
    }
    return null;
  }

  async getStudentCodingStreaks(studentId: string, asOf: Date = new Date()): Promise<StudentCodingStreaksResult> {
    const timeZone = DEFAULT_STREAK_TIME_ZONE;

    const [verifiedProfiles, activityRows, syncRows] = await Promise.all([
      prisma.verifiedProfile.findMany({ where: { studentId } }),
      prisma.verifiedActivity.findMany({
        where: {
          studentId,
          sourceType: STREAK_SOURCE_TYPE,
          activityType: STREAK_QUALIFYING_ACTIVITY_TYPE,
          verificationStatus: 'VERIFIED',
        },
        select: { sourcePlatform: true, occurredAt: true },
      }),
      prisma.syncHistory.findMany({
        where: { studentId },
        orderBy: { lastAttemptAt: 'desc' },
        take: 300,
        select: { sourcePlatform: true, status: true, lastAttemptAt: true, lastSuccessfulSyncAt: true },
      }),
    ]);

    const activityByPlatform = new Map<string, Date[]>();
    for (const row of activityRows) {
      if (!row.occurredAt) continue;
      const platform = (row.sourcePlatform || '').toUpperCase();
      if (!platform) continue;
      if (!activityByPlatform.has(platform)) activityByPlatform.set(platform, []);
      activityByPlatform.get(platform)!.push(row.occurredAt as Date);
    }

    const syncsByPlatform = new Map<string, SyncRow[]>();
    for (const row of syncRows) {
      const platform = (row.sourcePlatform || '').toUpperCase();
      if (!platform) continue;
      if (!syncsByPlatform.has(platform)) syncsByPlatform.set(platform, []);
      syncsByPlatform.get(platform)!.push(row as SyncRow);
    }

    const platforms: PlatformCodingStreakView[] = [];

    for (const platform of EXTERNAL_VERIFIED_PLATFORMS) {
      const adapter = platformRegistry.getAdapter(platform);
      if (!adapter) continue;

      const reason = this.unsupportedReason(platform);
      const supported = reason === null;
      const platformSyncs = syncsByPlatform.get(platform) ?? [];
      const { coverage, unknownRanges } = supported
        ? deriveCoverage(platformSyncs, timeZone)
        : { coverage: 'UNAVAILABLE' as PlatformHistoryCoverage, unknownRanges: [] };

      const summary = computeCodingStreak(activityByPlatform.get(platform) ?? [], {
        timeZone,
        asOf,
        supported,
        unsupportedReason: reason,
        coverage,
        unknownRanges,
      });

      const ownershipStatus = normalizeOwnershipStatus(
        verifiedProfiles.find((v) => v.platform === platform)?.verificationStatus,
      );
      const ownershipVerified = ownershipStatus === 'OWNERSHIP_VERIFIED';
      const connected = verifiedProfiles.some((v) => v.platform === platform);

      const latestSync = platformSyncs
        .slice()
        .sort((a, b) => b.lastAttemptAt.getTime() - a.lastAttemptAt.getTime())[0] ?? null;
      const lastSuccess = platformSyncs.find((s) => s.status === 'SUCCESS') ?? null;

      let ineligibilityReason: string | null = null;
      if (!supported) ineligibilityReason = reason;
      else if (!ownershipVerified) {
        ineligibilityReason =
          'Account ownership is not proven for this platform, so it cannot back a high-value streak badge automatically.';
      } else if (coverage === 'PARTIAL') {
        ineligibilityReason = 'History is incomplete (PARTIAL HISTORY) — the streak is reported but not badge-eligible yet.';
      }

      platforms.push({
        ...summary,
        platform,
        connected,
        coverage: supported ? coverage : 'UNAVAILABLE',
        ownershipStatus,
        ownershipVerified,
        eligibleForStreakBadges: supported && ownershipVerified && coverage !== 'UNAVAILABLE',
        ineligibilityReason,
        lastSuccessfulSyncAt: lastSuccess?.lastSuccessfulSyncAt?.toISOString() ?? null,
        lastAttemptAt: latestSync?.lastAttemptAt?.toISOString() ?? null,
        latestSyncStatus: latestSync?.status ?? null,
        providerAvailable: latestSync ? latestSync.status === 'SUCCESS' : null,
      });
    }

    await this.persistSnapshots(studentId, platforms).catch(() => {});

    const verified = platforms
      .filter((p) => p.eligibleForStreakBadges)
      .sort((a, b) => b.longestStreak - a.longestStreak);
    const bestVerified = verified[0] ?? null;

    const stats: CodingStreakStats = {
      verifiedCodingStreakDays: bestVerified?.longestStreak ?? 0,
      codingStreakPlatform: bestVerified?.platform ?? null,
      codingAcceptedActivityCount: verified.reduce((sum, p) => sum + p.acceptedActivityCount, 0),
      codingStreakEvidence: bestVerified
        ? {
            platform: bestVerified.platform,
            longestStreak: bestVerified.longestStreak,
            acceptedActivityCount: bestVerified.acceptedActivityCount,
            firstActivityDate: bestVerified.firstActivityDate,
            lastActivityDate: bestVerified.lastActivityDate,
            coverage: bestVerified.coverage,
          }
        : null,
    };

    return {
      studentId,
      generatedAt: new Date().toISOString(),
      timeZone,
      platforms,
      bestVerified,
      combinedLongestStreak: platforms.reduce((max, p) => Math.max(max, p.longestStreak), 0),
      partialHistory: platforms.some((p) => p.partialHistory),
      stats,
    };
  }

  /**
   * Streak statistics consumed by the badge engine. Only ownership-verified,
   * fully-supported platforms contribute, which is why Callers must not derive
   * these values by combining platforms themselves.
   */
  async getCodingStreakStats(studentId: string): Promise<CodingStreakStats> {
    const result = await this.getStudentCodingStreaks(studentId);
    return result.stats;
  }

  /**
   * Earned Phase 2 coding-streak badges, attributed to the platform recorded in
   * the award evidence. Read-only — never mutates an award.
   */
  async getEarnedCodingStreakBadges(studentId: string): Promise<EarnedCodingStreakBadge[]> {
    const rows = await prisma.studentBadge.findMany({
      where: { studentId, badgeId: { in: [...CODING_STREAK_BADGE_IDS] } },
      select: { badgeId: true, title: true, awardedAt: true, credentialId: true, evidenceData: true },
      orderBy: { awardedAt: 'asc' },
    });
    return rows.map((r) => ({
      badgeId: r.badgeId,
      title: r.title,
      platform: readEvidencePlatform(r.evidenceData),
      awardedAt: r.awardedAt.toISOString(),
      credentialId: r.credentialId ?? null,
    }));
  }

  /**
   * Full student-facing view: computed per-platform streaks + the coding-streak
   * badges already earned. Used by the External Coding Achievements area.
   */
  async getStudentCodingStreakView(studentId: string): Promise<
    StudentCodingStreaksResult & { earnedBadges: EarnedCodingStreakBadge[] }
  > {
    const [result, earnedBadges] = await Promise.all([
      this.getStudentCodingStreaks(studentId),
      this.getEarnedCodingStreakBadges(studentId),
    ]);
    return { ...result, earnedBadges };
  }

  /**
   * Caches the derived snapshot. `longestStreak` is monotonic (GREATEST) so a
   * later partial or failed sync can never shrink an already-verified record.
   * Any failure (e.g. table not migrated) is swallowed — this is a cache only.
   */
  private async persistSnapshots(studentId: string, platforms: PlatformCodingStreakView[]): Promise<void> {
    for (const p of platforms) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO student_platform_streaks (
           id, "studentId", platform, "currentStreak", "longestStreak", "lastActivityDate",
           "observedDays", "timeZone", coverage, "acceptedActivityCount", "firstActivityDate",
           "streakSupported", "calculatedAt", "createdAt", "updatedAt"
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(), NOW())
         ON CONFLICT ("studentId", platform) DO UPDATE SET
           "currentStreak" = EXCLUDED."currentStreak",
           "longestStreak" = GREATEST(student_platform_streaks."longestStreak", EXCLUDED."longestStreak"),
           "lastActivityDate" = EXCLUDED."lastActivityDate",
           "observedDays" = EXCLUDED."observedDays",
           "timeZone" = EXCLUDED."timeZone",
           coverage = EXCLUDED.coverage,
           "acceptedActivityCount" = EXCLUDED."acceptedActivityCount",
           "firstActivityDate" = EXCLUDED."firstActivityDate",
           "streakSupported" = EXCLUDED."streakSupported",
           "calculatedAt" = NOW(),
           "updatedAt" = NOW()`,
        `pstreak_${studentId}_${p.platform}`,
        studentId,
        p.platform,
        p.currentStreak,
        p.longestStreak,
        p.lastActivityDate,
        p.observedDays,
        p.timeZone,
        p.coverage,
        p.acceptedActivityCount,
        p.firstActivityDate,
        p.supported,
      );
    }
  }
}

export const platformStreakService = new PlatformStreakService();
