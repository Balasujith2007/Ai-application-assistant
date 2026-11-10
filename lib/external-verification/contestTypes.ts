/**
 * Contest-verification domain model (Phase 3).
 *
 * Phase 1 built the provider-adapter foundation and Phase 2 built the
 * platform-specific coding-streak engine. Phase 3 adds *weekly contest*
 * verification: which contests a student actually took part in, what the
 * provider could prove about that participation, and how trustworthy each
 * provider's contest evidence is.
 *
 * Two rules dominate this whole module:
 *
 *  1. A registered-but-not-attended contest is NOT participation. Only
 *     provider-verified attendance counts.
 *  2. A provider that cannot publish a fact (a rank, a participant total, a
 *     rating delta) is reported as missing — never estimated, never defaulted
 *     to zero.
 *
 * Contest ids are always the provider's own stable identifier. Ids derived from
 * list position or a display name are rejected (`isStableExternalContestId`).
 */

import { ProviderApiKind, ProviderId } from '@/lib/leaderboard/adapters/providerTypes';

// ============================================================================
// 1. Evidence source taxonomy (Phase 3 §3)
// ============================================================================

/**
 * How a piece of contest evidence was obtained. This is deliberately wider than
 * the raw provider `apiKind`: a manual Super-Admin approval is an evidence
 * source too, and it must never be confused with a provider feed.
 *
 * Scraped and community sources are NEVER labelled as official APIs.
 */
export type ContestEvidenceSource =
  /** Published, documented, supported provider endpoint. */
  | 'OFFICIAL_API'
  /** Read from the provider's own public profile / profile-backed endpoint. */
  | 'PUBLIC_PROFILE'
  /** Third-party maintained mirror of provider data. */
  | 'COMMUNITY_API'
  /** HTML scraping of a public page. */
  | 'SCRAPED_PUBLIC_DATA'
  /** Approved by a Super Admin after manual evidence review. */
  | 'MANUAL_REVIEW';

export const CONTEST_EVIDENCE_SOURCE_LABELS: Record<ContestEvidenceSource, string> = {
  OFFICIAL_API: 'Official provider API',
  PUBLIC_PROFILE: 'Public profile data',
  COMMUNITY_API: 'Community mirror API',
  SCRAPED_PUBLIC_DATA: 'Scraped public data',
  MANUAL_REVIEW: 'Manual review (Super Admin)',
};

/** Maps a provider's declared `apiKind` onto an evidence-source label. */
export function contestEvidenceSourceFor(apiKind: ProviderApiKind): ContestEvidenceSource {
  switch (apiKind) {
    case 'OFFICIAL':
      return 'OFFICIAL_API';
    case 'DOCUMENTED_UNOFFICIAL':
      // Publicly reachable and stable, but NOT an officially supported API — so
      // it is labelled as public-profile data rather than an official API.
      return 'PUBLIC_PROFILE';
    case 'COMMUNITY':
      return 'COMMUNITY_API';
    case 'SCRAPED':
      return 'SCRAPED_PUBLIC_DATA';
    default:
      return 'PUBLIC_PROFILE';
  }
}

// ============================================================================
// 2. Coverage / status model
// ============================================================================

/** How complete the provider's contest history is. */
export type ContestCoverage =
  /** Full, contiguous contest history is available. */
  | 'FULL'
  /** Some history exists but gaps of unknown contests remain. */
  | 'PARTIAL'
  /** The provider cannot supply contest history at all. */
  | 'UNAVAILABLE';

/** Lifecycle of an individual persisted contest record. */
export type ContestRecordStatus =
  | 'VERIFIED'
  | 'PARTIAL'
  | 'UNAVAILABLE'
  | 'PENDING_REVIEW'
  | 'REJECTED';

/** Lifecycle of a manual-review request. */
export type ContestReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// ============================================================================
// 3. Capability matrix (Phase 3 §3)
// ============================================================================

export interface ProviderContestCapability {
  platform: ProviderId;
  /** Raw declared source kind, preserved verbatim. */
  apiKind: ProviderApiKind;
  /** Normalized evidence label actually shown to users/admins. */
  evidenceSource: ContestEvidenceSource;
  contestHistory: boolean;
  ratingHistory: boolean;
  ownership: 'OAUTH' | 'PROFILE_CHALLENGE' | 'NONE';
  dataFreshness: 'HISTORICAL' | 'CURRENT_ONLY' | 'NONE';
  /** Whether the provider's rating feed exposes BOTH old and new rating. */
  supportsRatingChange: boolean;
  /** Whether the provider publishes a per-contest participant total. */
  supportsTotalParticipants: boolean;
  /** Whether a personal-best rating can be derived from the rating series. */
  supportsPersonalBest: boolean;
  /** Best attainable coverage for this provider's contest evidence. */
  historicalCompleteness: ContestCoverage;
  /** Explicit, honest limitations surfaced to students and admins. */
  notes: string[];
}

/**
 * The single source of truth for what each provider can prove about contests.
 *
 * IMPORTANT: the "strongest official API support" belongs to Codeforces. The
 * other three carry real, permanent limitations that this matrix keeps visible
 * instead of hiding behind a generic "supported" flag.
 */
export const PROVIDER_CONTEST_CAPABILITY_MATRIX: ProviderContestCapability[] = [
  {
    platform: 'CODEFORCES',
    apiKind: 'OFFICIAL',
    evidenceSource: 'OFFICIAL_API',
    contestHistory: true,
    ratingHistory: true,
    ownership: 'PROFILE_CHALLENGE',
    dataFreshness: 'HISTORICAL',
    supportsRatingChange: true,
    supportsTotalParticipants: false,
    supportsPersonalBest: true,
    historicalCompleteness: 'FULL',
    notes: [
      'Official, documented API with full rated-contest history.',
      'Publishes old and new rating per contest, so the rating delta is verifiable.',
      'Does not publish a per-contest participant total, so percentile badges are not auto-computed.',
    ],
  },
  {
    platform: 'ATCODER',
    apiKind: 'COMMUNITY',
    evidenceSource: 'COMMUNITY_API',
    contestHistory: true,
    ratingHistory: true,
    ownership: 'NONE',
    dataFreshness: 'HISTORICAL',
    supportsRatingChange: true,
    supportsTotalParticipants: false,
    supportsPersonalBest: true,
    // Community mirror, capped at the most recent 500 submissions / bounded history.
    historicalCompleteness: 'PARTIAL',
    notes: [
      'Contest history comes from a third-party community mirror, not an official API.',
      'The mirror is capped (500-record window), so older history may be missing.',
      'AtCoder exposes no public editable profile field, so account ownership cannot be proven here.',
    ],
  },
  {
    platform: 'LEETCODE',
    apiKind: 'DOCUMENTED_UNOFFICIAL',
    evidenceSource: 'PUBLIC_PROFILE',
    contestHistory: true,
    ratingHistory: true,
    ownership: 'PROFILE_CHALLENGE',
    dataFreshness: 'HISTORICAL',
    // LeetCode's ranking history returns the post-contest rating only.
    supportsRatingChange: false,
    supportsTotalParticipants: false,
    supportsPersonalBest: true,
    historicalCompleteness: 'PARTIAL',
    notes: [
      'Contest history comes from a publicly reachable, documented-unofficial endpoint — not an official API.',
      'Accepted-submission history is incomplete, so submission-based evidence is unavailable.',
      'Returns the post-contest rating only; rating deltas and percentiles are not computable.',
    ],
  },
  {
    platform: 'CODECHEF',
    apiKind: 'SCRAPED',
    evidenceSource: 'SCRAPED_PUBLIC_DATA',
    contestHistory: false,
    ratingHistory: false,
    ownership: 'NONE',
    dataFreshness: 'CURRENT_ONLY',
    supportsRatingChange: false,
    supportsTotalParticipants: false,
    supportsPersonalBest: false,
    historicalCompleteness: 'UNAVAILABLE',
    notes: [
      'Relies on scraping the public profile page; there is no contest-history feed.',
      'Only current rating / stars / solved totals are available, so historical contest evidence is unavailable.',
      'No public editable field exists, so account ownership cannot be proven.',
    ],
  },
];

export function getContestCapability(platform: string): ProviderContestCapability | null {
  const key = (platform || '').toUpperCase();
  return PROVIDER_CONTEST_CAPABILITY_MATRIX.find((c) => c.platform === key) ?? null;
}

// ============================================================================
// 4. Persisted / normalized contest record
// ============================================================================

/**
 * A normalized, provider-independent contest participation record. This is the
 * shape persisted in `verified_contests` and rendered in the student/admin UI.
 */
export interface NormalizedContestRecord {
  platform: ProviderId;
  /** Stable provider contest id. Never index- or display-name-derived. */
  externalContestId: string;
  contestName: string;
  /** ISO timestamp of the contest end / rating update. */
  participatedAt: string;
  /** Provider-verified attendance. Always true for a persisted record. */
  participated: boolean;
  rank?: number;
  totalParticipants?: number;
  oldRating?: number;
  newRating?: number;
  ratingChange?: number;
  evidenceReference?: string;
  evidenceSource: ContestEvidenceSource;
  status: ContestRecordStatus;
}

/** Result of normalizing one provider's contest feed. */
export interface ContestNormalizationResult {
  platform: ProviderId;
  /** Accepted, participation-verified records (stable ids only). */
  records: NormalizedContestRecord[];
  /** Records dropped because their external id was unstable / invalid. */
  rejected: Array<{ externalActivityId: string; reason: string }>;
  coverage: ContestCoverage;
  evidenceSource: ContestEvidenceSource;
  /** Provider could not be read at all (timeout / outage / unsupported). */
  available: boolean;
  unavailableReason: string | null;
}

// ============================================================================
// 5. Thresholds shared by the engine and the badge framework
// ============================================================================

/** A percentile badge needs at least this many participants to be meaningful. */
export const MIN_PARTICIPANTS_FOR_PERCENTILE = 20;

/** Rating Climber needs at least two rated contests before it can be evaluated. */
export const MIN_RATED_CONTESTS_FOR_CLIMBER = 2;

/** Podium Challenger / Top Performer percentile cut-offs. */
export const TOP_10_PERCENT = 10;
export const TOP_5_PERCENT = 5;
