/**
 * Provider-independent contest verification engine (Phase 3 §2/§3).
 *
 * Pure module — no database access, no network access — so it can be unit
 * tested against mocked provider payloads and reused by any caller.
 *
 * Responsibilities:
 *  - reject unstable / index-derived contest ids
 *  - reject implausible timestamps
 *  - normalize a provider contest feed into `NormalizedContestRecord`s
 *  - derive coverage (FULL / PARTIAL / UNAVAILABLE) honestly
 *  - derive rating, percentile and participation statistics WITHOUT inventing
 *    any value the provider did not publish
 */

import { ProviderId } from '@/lib/leaderboard/adapters/providerTypes';
import { isPlausibleOccurrence } from './activityImporter';
import {
  ContestCoverage,
  ContestEvidenceSource,
  ContestNormalizationResult,
  ContestRecordStatus,
  MIN_PARTICIPANTS_FOR_PERCENTILE,
  MIN_RATED_CONTESTS_FOR_CLIMBER,
  NormalizedContestRecord,
  ProviderContestCapability,
  TOP_10_PERCENT,
  TOP_5_PERCENT,
} from './contestTypes';

// ============================================================================
// 1. Stable external contest id validation
// ============================================================================

/** Values providers emit when a real identifier is missing. */
const PLACEHOLDER_IDS = new Set(['unknown', 'n/a', 'na', 'null', 'undefined', 'none', 'contest', '-']);

/**
 * A stable external contest id must be a provider-owned identifier.
 *
 * Rejected:
 *  - non-strings, empty / whitespace-only values
 *  - values containing whitespace (i.e. display names such as "Weekly Contest 300")
 *  - values equal to the record's array position (index-derived ids)
 *  - known placeholder values
 *  - absurdly long strings
 *
 * `arrayIndex` should be supplied by the caller so list-position ids can be
 * detected; when omitted the position check is simply skipped.
 */
export function isStableExternalContestId(id: unknown, arrayIndex?: number): boolean {
  if (typeof id !== 'string') return false;
  const value = id.trim();
  if (!value) return false;
  if (value.length > 200) return false;
  if (/\s/.test(value)) return false;
  if (PLACEHOLDER_IDS.has(value.toLowerCase())) return false;
  if (arrayIndex !== undefined && value === String(arrayIndex)) return false;
  return true;
}

// ============================================================================
// 2. Coverage derivation
// ============================================================================

/**
 * Coverage is derived from what the provider can actually deliver — never from
 * how many records happened to come back.
 */
export function deriveContestCoverage(
  capability: ProviderContestCapability,
  available: boolean,
): ContestCoverage {
  if (!available) return 'UNAVAILABLE';
  if (!capability.contestHistory) return 'UNAVAILABLE';
  return capability.historicalCompleteness;
}

// ============================================================================
// 3. Feed normalization
// ============================================================================

export interface NormalizeContestFeedInput {
  platform: ProviderId;
  capability: ProviderContestCapability;
  /** Raw provider results. Absent / empty still yields an honest coverage value. */
  results?: Array<{
    externalActivityId?: unknown;
    contestName?: unknown;
    rank?: unknown;
    totalParticipants?: unknown;
    oldRating?: unknown;
    newRating?: unknown;
    ratingChange?: unknown;
    participatedAt?: unknown;
  }>;
  /** False when the provider could not be read (outage / unsupported / missing user). */
  available: boolean;
  unavailableReason?: string | null;
  evidenceReference?: string;
}

function num(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

function str(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return v ? v : null;
}

/**
 * Normalizes one provider's contest feed.
 *
 * A record is only created when the provider actually evidences participation
 * (the feed only lists contests the student took part in) AND the id is stable
 * AND the timestamp is plausible. Registration alone never produces a record —
 * no provider feed here lists merely-registered contests.
 */
export function normalizeContestFeed(input: NormalizeContestFeedInput): ContestNormalizationResult {
  const { platform, capability } = input;
  const coverage = deriveContestCoverage(capability, input.available);
  const evidenceSource: ContestEvidenceSource = capability.evidenceSource;

  if (!input.available || coverage === 'UNAVAILABLE') {
    return {
      platform,
      records: [],
      rejected: [],
      coverage: 'UNAVAILABLE',
      evidenceSource,
      available: input.available,
      unavailableReason:
        input.unavailableReason ??
        (capability.contestHistory
          ? null
          : `${platform} does not publish a contest-history feed, so contest participation cannot be verified.`),
    };
  }

  const rawResults = Array.isArray(input.results) ? input.results : [];
  const records: NormalizedContestRecord[] = [];
  const rejected: Array<{ externalActivityId: string; reason: string }> = [];

  rawResults.forEach((raw, index) => {
    const rawId = str(raw.externalActivityId) ?? String(raw.externalActivityId ?? '');
    if (!isStableExternalContestId(rawId, index)) {
      rejected.push({
        externalActivityId: rawId,
        reason: 'Unstable or missing external contest id (index-derived, display-name or placeholder).',
      });
      return;
    }

    const participatedAt = str(raw.participatedAt);
    if (!participatedAt || !isPlausibleOccurrence(participatedAt)) {
      rejected.push({
        externalActivityId: rawId,
        reason: 'Implausible or missing contest timestamp.',
      });
      return;
    }

    const oldRating = num(raw.oldRating);
    const newRating = num(raw.newRating);
    const explicitChange = num(raw.ratingChange);
    // Only derive a delta when the provider published both endpoints. Never
    // infer it from a neighbouring record.
    const ratingChange =
      explicitChange !== undefined
        ? explicitChange
        : oldRating !== undefined && newRating !== undefined
          ? newRating - oldRating
          : undefined;

    const rank = num(raw.rank);
    const totalParticipants = num(raw.totalParticipants);

    // Evidence strength: a feed entry proves participation, but a record with
    // no rank and no rating is weaker evidence and is marked PARTIAL rather
    // than presented as fully verified detail.
    const status: ContestRecordStatus =
      rank !== undefined || newRating !== undefined ? 'VERIFIED' : 'PARTIAL';

    records.push({
      platform,
      externalContestId: rawId,
      contestName: str(raw.contestName) ?? `${platform} Contest`,
      participatedAt,
      participated: true,
      rank,
      totalParticipants,
      oldRating,
      newRating,
      ratingChange,
      evidenceReference: input.evidenceReference,
      evidenceSource,
      status,
    });
  });

  // Deterministic ordering (oldest first) so persistence and display are stable.
  records.sort((a, b) => (a.participatedAt < b.participatedAt ? -1 : a.participatedAt > b.participatedAt ? 1 : 0));

  return {
    platform,
    records,
    rejected,
    coverage,
    evidenceSource,
    available: true,
    unavailableReason: input.available ? null : input.unavailableReason ?? null,
  };
}

// ============================================================================
// 4. Statistics (never fabricated)
// ============================================================================

export interface PlatformContestStats {
  platform: string;
  participationCount: number;
  ratedContestsCount: number;
  personalBestRating: number | null;
  cumulativeRatingImprovement: number;
  top10PercentFinishes: number;
  top5PercentFinishes: number;
  hasRankData: boolean;
  hasParticipantCountData: boolean;
}

export interface ContestStats {
  totalVerifiedParticipations: number;
  platformsWithParticipation: number;
  ratedContestsCount: number;
  personalBestRating: number | null;
  personalBestPlatform: string | null;
  bestCumulativeRatingImprovement: number;
  cumulativeRatingImprovementPlatform: string | null;
  top10PercentFinishes: number;
  top5PercentFinishes: number;
  byPlatform: PlatformContestStats[];
}

/** Participation counts include both VERIFIED and PARTIAL evidence records. */
function countsAsParticipation(record: NormalizedContestRecord): boolean {
  return (
    record.participated &&
    (record.status === 'VERIFIED' || record.status === 'PARTIAL')
  );
}

/**
 * Percentile of a finish, or null when it cannot be computed. Requires a real
 * rank AND a real participant total of at least `MIN_PARTICIPANTS_FOR_PERCENTILE`.
 */
export function computeFinishPercentile(
  rank: number | undefined,
  totalParticipants: number | undefined,
): number | null {
  if (typeof rank !== 'number' || typeof totalParticipants !== 'number') return null;
  if (rank <= 0 || totalParticipants < MIN_PARTICIPANTS_FOR_PERCENTILE) return null;
  if (rank > totalParticipants) return null;
  return (rank / totalParticipants) * 100;
}

/** Highest rating the provider ever reported for the platform, or null. */
export function computePersonalBestRating(records: NormalizedContestRecord[]): number | null {
  const ratings = records.map((r) => r.newRating).filter((v): v is number => typeof v === 'number');
  if (ratings.length === 0) return null;
  return Math.max(...ratings);
}

/**
 * Cumulative rating improvement = sum of POSITIVE per-contest rating gains.
 * Requires at least `MIN_RATED_CONTESTS_FOR_CLIMBER` contests that expose a
 * rating delta; otherwise it reports 0 (nothing verifiable), never a guess.
 */
export function computeCumulativeRatingImprovement(records: NormalizedContestRecord[]): number {
  const deltas = records
    .map((r) => r.ratingChange)
    .filter((v): v is number => typeof v === 'number');
  if (deltas.length < MIN_RATED_CONTESTS_FOR_CLIMBER) return 0;
  return deltas.reduce((sum, d) => (d > 0 ? sum + d : sum), 0);
}

export function computePlatformContestStats(
  platform: string,
  records: NormalizedContestRecord[],
): PlatformContestStats {
  const relevant = records.filter(
    (r) => r.platform === platform && countsAsParticipation(r),
  );
  const ratedContestsCount = relevant.filter((r) => typeof r.ratingChange === 'number').length;

  const percentiles = relevant
    .map((r) => computeFinishPercentile(r.rank, r.totalParticipants))
    .filter((p): p is number => p !== null);

  return {
    platform,
    participationCount: relevant.length,
    ratedContestsCount,
    personalBestRating: computePersonalBestRating(relevant),
    cumulativeRatingImprovement: computeCumulativeRatingImprovement(relevant),
    top10PercentFinishes: percentiles.filter((p) => p <= TOP_10_PERCENT).length,
    top5PercentFinishes: percentiles.filter((p) => p <= TOP_5_PERCENT).length,
    hasRankData: relevant.some((r) => typeof r.rank === 'number'),
    hasParticipantCountData: relevant.some((r) => typeof r.totalParticipants === 'number'),
  };
}

/** Aggregates all contest statistics consumed by the badge engine and UI. */
export function computeContestStats(records: NormalizedContestRecord[]): ContestStats {
  const participations = records.filter(countsAsParticipation);
  const platforms = Array.from(new Set(participations.map((r) => r.platform))).sort();
  const byPlatform = platforms.map((p) => computePlatformContestStats(p, participations));

  const withBest = byPlatform.filter((p) => p.personalBestRating !== null);
  const bestPlatform = withBest.sort(
    (a, b) => (b.personalBestRating ?? 0) - (a.personalBestRating ?? 0),
  )[0];

  const withImprovement = [...byPlatform].sort(
    (a, b) => b.cumulativeRatingImprovement - a.cumulativeRatingImprovement,
  )[0];

  return {
    totalVerifiedParticipations: participations.length,
    platformsWithParticipation: platforms.length,
    ratedContestsCount: participations.filter((r) => typeof r.ratingChange === 'number').length,
    personalBestRating: bestPlatform?.personalBestRating ?? null,
    personalBestPlatform: bestPlatform?.platform ?? null,
    bestCumulativeRatingImprovement: withImprovement?.cumulativeRatingImprovement ?? 0,
    cumulativeRatingImprovementPlatform:
      withImprovement && withImprovement.cumulativeRatingImprovement > 0
        ? withImprovement.platform
        : null,
    top10PercentFinishes: byPlatform.reduce((sum, p) => sum + p.top10PercentFinishes, 0),
    top5PercentFinishes: byPlatform.reduce((sum, p) => sum + p.top5PercentFinishes, 0),
    byPlatform,
  };
}
