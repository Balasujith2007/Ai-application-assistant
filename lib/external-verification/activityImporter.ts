import prisma from '@/lib/prisma';
import { platformRegistry } from '@/lib/leaderboard/adapters/adapterRegistry';
import { ExternalProviderAdapter } from '@/lib/leaderboard/adapters/providerInterface';
import { ProviderApiKind, ProviderErrorKind, ProviderId } from '@/lib/leaderboard/adapters/providerTypes';
import { verificationLedger } from '@/lib/leaderboard/verificationLedger';
import { EXTERNAL_VERIFIED_PLATFORMS } from '@/lib/leaderboard/types';

/**
 * Normalized external-activity import (Phase 1, Step 5).
 *
 * Every imported row is written through the existing `verified_activities` table
 * and its existing composite unique key
 * (studentId, sourceType, sourcePlatform, externalActivityId, activityType), so
 * repeated synchronization is idempotent by construction. `occurredAt` is only
 * written on first insert — a later sync never rewrites the historical evidence.
 *
 * `verificationMethod` is derived from the provider's real `apiKind` instead of
 * always claiming OFFICIAL_API (the previous behaviour mislabelled scraped
 * CodeChef/Codolio data as official).
 */

export const SOURCE_TYPE_CONTEST = 'CONTEST';

/** Evidence label stored on every imported activity. */
export function mapVerificationMethod(apiKind: ProviderApiKind): string {
  switch (apiKind) {
    case 'OFFICIAL':
      return 'PROVIDER_OFFICIAL_API';
    case 'DOCUMENTED_UNOFFICIAL':
      return 'PROVIDER_DOCUMENTED_UNOFFICIAL';
    case 'COMMUNITY':
      return 'PROVIDER_COMMUNITY_MIRROR';
    case 'SCRAPED':
      return 'PROVIDER_PUBLIC_SCRAPE';
    default:
      return 'PROVIDER_UNKNOWN';
  }
}

const OCCURRENCE_LOWER_BOUND = Date.UTC(2005, 0, 1);
const FUTURE_TOLERANCE_MS = 24 * 60 * 60 * 1000;

/**
 * Rejects timestamps a provider should never produce: unparseable values, dates
 * before 2005, and dates more than a day in the future. Bad records are skipped
 * (reported) rather than persisted.
 */
export function isPlausibleOccurrence(value: string | Date | null | undefined): boolean {
  if (!value) return false;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(time)) return false;
  if (time < OCCURRENCE_LOWER_BOUND) return false;
  if (time > Date.now() + FUTURE_TOLERANCE_MS) return false;
  return true;
}

export interface ImportCounts {
  rating: number;
  contests: number;
  submissions: number;
  daily: number;
  profileSnapshot: number;
  skipped: number;
}

export interface PlatformImportResult {
  platform: ProviderId;
  ok: boolean;
  errorKind?: ProviderErrorKind;
  message?: string;
  counts: ImportCounts;
  skippedReasons: string[];
}

export interface StudentSyncResult {
  studentId: string;
  startedAt: string;
  finishedAt: string;
  results: PlatformImportResult[];
  totals: ImportCounts;
  connectedPlatforms: string[];
}

const emptyCounts = (): ImportCounts => ({
  rating: 0,
  contests: 0,
  submissions: 0,
  daily: 0,
  profileSnapshot: 0,
  skipped: 0,
});

export class ExternalActivityImporter {
  resolveProvider(platform: string): ExternalProviderAdapter | null {
    return platformRegistry.getProvider(platform);
  }

  /**
   * Imports one provider's normalized activity for one student. Never throws for
   * expected provider conditions; they are returned as `ok: false` with an
   * `errorKind` so callers can render "provider unavailable" instead of zero.
   */
  async importPlatform(params: {
    studentId: string;
    platform: string;
    username: string;
    windowDays?: number;
  }): Promise<PlatformImportResult> {
    const platform = params.platform.toUpperCase() as ProviderId;
    const counts = emptyCounts();
    const skippedReasons: string[] = [];

    const adapter = this.resolveProvider(platform);
    if (!adapter) {
      return {
        platform,
        ok: false,
        errorKind: 'UNSUPPORTED',
        message: `No adapter registered for ${platform}.`,
        counts,
        skippedReasons,
      };
    }

    const capabilities = adapter.getProviderCapabilities();
    const method = mapVerificationMethod(capabilities.apiKind);
    const windowDays = params.windowDays ?? 90;
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const evidenceReference = platformRegistry.getAdapter(platform)?.getCanonicalUrl(params.username) ?? '';

    const profile = await adapter.validateProfile(params.username);
    if (!profile.ok) {
      return {
        platform,
        ok: false,
        errorKind: profile.errorKind,
        message: profile.error,
        counts,
        skippedReasons,
      };
    }
    const accountId = profile.data.externalAccountId;

    // 1. Profile snapshot (current-only aggregate; separate activity type).
    if (capabilities.profileLookup) {
      const snapshotAt = new Date(profile.data.retrievedAt);
      if (isPlausibleOccurrence(snapshotAt)) {
        await this.record(params.studentId, platform, accountId, {
          activityType: 'PROFILE_SNAPSHOT',
          externalActivityId: `${platform.toLowerCase()}-profile-${accountId}`,
          occurredAt: snapshotAt,
          method,
          evidenceReference,
          rawMetadata: { apiKind: capabilities.apiKind, freshness: capabilities.dataFreshness, profile: profile.data },
        });
        counts.profileSnapshot++;
      }
    }

    // 2. Rating history
    if (capabilities.ratingHistory) {
      const rating = await adapter.fetchRatingHistory(accountId, { since });
      if (rating.ok) {
        for (const point of rating.data) {
          if (!isPlausibleOccurrence(point.occurredAt)) {
            counts.skipped++;
            skippedReasons.push(`rating point ${point.externalActivityId}: implausible timestamp`);
            continue;
          }
          await this.record(params.studentId, platform, accountId, {
            activityType: 'RATING_CHANGE',
            externalActivityId: point.externalActivityId,
            occurredAt: new Date(point.occurredAt),
            method,
            evidenceReference,
            rawMetadata: {
              apiKind: capabilities.apiKind,
              contestName: point.contestName,
              rating: point.rating,
              rank: point.rank,
            },
          });
          counts.rating++;
        }
      } else {
        skippedReasons.push(`ratingHistory: ${rating.errorKind} — ${rating.error}`);
      }
    }

    // 3. Contest history (derived from the same rating feed for CF/LC/AtCoder)
    if (capabilities.contestHistory) {
      const contests = await adapter.fetchContestHistory(accountId, { since });
      if (contests.ok) {
        for (const contest of contests.data) {
          if (!isPlausibleOccurrence(contest.participatedAt)) {
            counts.skipped++;
            skippedReasons.push(`contest ${contest.externalActivityId}: implausible timestamp`);
            continue;
          }
          await this.record(params.studentId, platform, accountId, {
            activityType: 'CONTEST_PARTICIPATION',
            externalActivityId: contest.externalActivityId,
            occurredAt: new Date(contest.participatedAt),
            method,
            evidenceReference,
            rawMetadata: {
              apiKind: capabilities.apiKind,
              contestName: contest.contestName,
              rank: contest.rank,
              newRating: contest.newRating,
            },
          });
          counts.contests++;
        }
      } else {
        skippedReasons.push(`contestHistory: ${contests.errorKind} — ${contests.error}`);
      }
    }

    // 4. Accepted submissions (only providers with a real submission feed)
    if (capabilities.acceptedSubmissions && capabilities.submissionTimestamps) {
      const submissions = await adapter.fetchAcceptedSubmissions(accountId, { since, limit: 200 });
      if (submissions.ok) {
        for (const submission of submissions.data) {
          if (!isPlausibleOccurrence(submission.submittedAt)) {
            counts.skipped++;
            skippedReasons.push(`submission ${submission.externalActivityId}: implausible timestamp`);
            continue;
          }
          await this.record(params.studentId, platform, accountId, {
            activityType: 'ACCEPTED_SUBMISSION',
            externalActivityId: submission.externalActivityId,
            occurredAt: new Date(submission.submittedAt),
            method,
            evidenceReference,
            rawMetadata: {
              apiKind: capabilities.apiKind,
              problemId: submission.problemId,
              problemName: submission.problemName,
              verdict: submission.verdict,
              language: submission.language,
            },
          });
          counts.submissions++;
        }
      } else {
        skippedReasons.push(`acceptedSubmissions: ${submissions.errorKind} — ${submissions.error}`);
      }
    } else if (capabilities.acceptedSubmissions) {
      skippedReasons.push('acceptedSubmissions: provider does not expose reliable timestamps.');
    }

    // 5. Daily activity rollup (only when the provider exposes history)
    if (capabilities.dailyActivity && capabilities.dataFreshness === 'HISTORICAL') {
      const daily = await adapter.fetchDailyActivity(accountId, { since });
      if (daily.ok) {
        for (const day of daily.data) {
          await this.record(params.studentId, platform, accountId, {
            activityType: 'DAILY_ACTIVITY',
            externalActivityId: `${platform.toLowerCase()}-day-${day.date}`,
            occurredAt: new Date(`${day.date}T00:00:00.000Z`),
            method,
            evidenceReference,
            rawMetadata: {
              apiKind: capabilities.apiKind,
              date: day.date,
              acceptedCount: day.acceptedCount,
              submissionCount: day.submissionCount,
            },
          });
          counts.daily++;
        }
      } else {
        skippedReasons.push(`dailyActivity: ${daily.errorKind} — ${daily.error}`);
      }
    }

    return { platform, ok: true, counts, skippedReasons };
  }

  /** Idempotent single-row write through the existing ledger. */
  private async record(
    studentId: string,
    platform: ProviderId,
    accountId: string,
    input: {
      activityType: string;
      externalActivityId: string;
      occurredAt: Date;
      method: string;
      evidenceReference: string;
      rawMetadata: Record<string, unknown>;
    },
  ) {
    return verificationLedger.recordActivity({
      studentId,
      sourceType: SOURCE_TYPE_CONTEST,
      sourcePlatform: platform,
      sourceAccountId: accountId,
      activityType: input.activityType,
      externalActivityId: input.externalActivityId,
      verificationStatus: 'VERIFIED',
      verificationMethod: input.method,
      evidenceReference: input.evidenceReference,
      occurredAt: input.occurredAt,
      rawMetadata: input.rawMetadata,
    });
  }

  /**
   * Syncs every connected external platform for a student and records one honest
   * `sync_history` row per platform (a previous version wrote a single cumulative
   * `recordsProcessed` for every platform and never pruned old rows).
   */
  async syncStudent(studentId: string, windowDays = 90): Promise<StudentSyncResult> {
    const startedAt = new Date().toISOString();
    const totals = emptyCounts();
    const results: PlatformImportResult[] = [];
    const connectedPlatforms: string[] = [];

    const [profile, verifiedProfiles] = await Promise.all([
      prisma.profile.findUnique({ where: { userId: studentId } }),
      prisma.verifiedProfile.findMany({ where: { studentId } }),
    ]);

    for (const platform of EXTERNAL_VERIFIED_PLATFORMS) {
      const adapter = platformRegistry.getAdapter(platform);
      if (!adapter) continue;

      const verifiedRow = verifiedProfiles.find((v) => v.platform === platform);
      const urlField = `${platform.toLowerCase()}Url`;
      const storedUrl = (profile as any)?.[urlField] as string | undefined;
      const username =
        verifiedRow?.username || (storedUrl ? adapter.parseUsernameFromUrl(storedUrl) : null) || null;

      if (!username) continue;
      connectedPlatforms.push(platform);

      const result = await this.importPlatform({ studentId, platform, username, windowDays });
      results.push(result);

      totals.rating += result.counts.rating;
      totals.contests += result.counts.contests;
      totals.submissions += result.counts.submissions;
      totals.daily += result.counts.daily;
      totals.profileSnapshot += result.counts.profileSnapshot;
      totals.skipped += result.counts.skipped;

      await this.recordSyncHistory(studentId, platform, result);
    }

    return {
      studentId,
      startedAt,
      finishedAt: new Date().toISOString(),
      results,
      totals,
      connectedPlatforms,
    };
  }

  /**
   * Writes one `sync_history` row per platform per run and prunes older rows so
   * the table stays bounded (the previous writer appended a row per platform on
   * every sync forever, with a cumulative count).
   */
  private async recordSyncHistory(studentId: string, platform: string, result: PlatformImportResult) {
    const recordsProcessed =
      result.counts.rating +
      result.counts.contests +
      result.counts.submissions +
      result.counts.daily +
      result.counts.profileSnapshot;

    await prisma.syncHistory.create({
      data: {
        studentId,
        sourcePlatform: platform,
        status: result.ok ? 'SUCCESS' : 'FAILED',
        lastAttemptAt: new Date(),
        lastSuccessfulSyncAt: result.ok ? new Date() : null,
        recordsProcessed,
        errorCode: result.ok ? null : result.errorKind ?? null,
        errorMessage: result.ok ? null : result.message ?? null,
      },
    });

    const keep = await prisma.syncHistory.findMany({
      where: { studentId, sourcePlatform: platform },
      orderBy: { createdAt: 'desc' },
      skip: 20,
      select: { id: true },
    });
    if (keep.length > 0) {
      await prisma.syncHistory.deleteMany({ where: { id: { in: keep.map((k) => k.id) } } });
    }
  }
}

export const externalActivityImporter = new ExternalActivityImporter();
