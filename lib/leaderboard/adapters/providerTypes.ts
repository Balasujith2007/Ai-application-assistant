/**
 * Normalized external-provider contracts.
 *
 * These types are provider-agnostic on purpose: every competitive-programming
 * integration (LeetCode, CodeChef, AtCoder, Codeforces, Codolio) must translate
 * its own payload shape into these structures. Provider-specific parsing stays
 * inside the individual adapter; nothing provider-specific leaks past this
 * boundary.
 *
 * NOTE: Not every provider can satisfy every capability. Adapters MUST declare
 * what they cannot do via `getProviderCapabilities()` and MUST return
 * `UNSUPPORTED` rather than fabricating zero-valued data.
 */

export type ProviderId = 'LEETCODE' | 'CODECHEF' | 'ATCODER' | 'CODEFORCES' | 'CODOLIO';

/** How the data is sourced. Drives the evidence label stored on activities. */
export type ProviderApiKind =
  | 'OFFICIAL' // published, documented, supported endpoint
  | 'DOCUMENTED_UNOFFICIAL' // publicly reachable, stable, but not officially supported
  | 'COMMUNITY' // third-party maintained mirror of provider data
  | 'SCRAPED'; // HTML scraping of a public page

/** Whether the provider exposes history or only a current snapshot. */
export type ProviderDataFreshness = 'HISTORICAL' | 'CURRENT_ONLY' | 'NONE';

/** How (if at all) account ownership can actually be proven for this provider. */
export type OwnershipCapability = 'OAUTH' | 'PROFILE_CHALLENGE' | 'NONE';

export interface ProviderCapabilities {
  profileLookup: boolean;
  dailyActivity: boolean;
  acceptedSubmissions: boolean;
  submissionTimestamps: boolean;
  contestHistory: boolean;
  ratingHistory: boolean;
  ownership: OwnershipCapability;
  apiKind: ProviderApiKind;
  dataFreshness: ProviderDataFreshness;
  /** Human-readable limitations. Surfaced to admins; never used for scoring. */
  notes: string[];
}

export interface NormalizedProfile {
  provider: ProviderId;
  /** Canonical, case-normalized handle. Doubles as the external account id. */
  externalAccountId: string;
  displayName?: string;
  profileUrl: string;
  avatarUrl?: string;
  currentRating?: number;
  maxRating?: number;
  rankTier?: string;
  problemsSolved?: number;
  contestsCount?: number;
  retrievedAt: string; // ISO timestamp
}

export interface NormalizedSubmission {
  /** Stable, provider-owned submission id. Required for idempotency. */
  externalActivityId: string;
  problemId?: string;
  problemName?: string;
  verdict: string; // e.g. "AC", "WA", "TLE"
  accepted: boolean;
  language?: string;
  submittedAt: string; // ISO timestamp
}

export type NormalizedActivityType = 'SUBMISSION' | 'CONTEST_RESULT' | 'RATING_POINT' | 'PROFILE_SNAPSHOT';

export interface NormalizedContestResult {
  /** Stable, provider-owned contest id (never index-derived). */
  externalActivityId: string;
  contestName: string;
  rank?: number;
  /**
   * Phase 3 — total participants in the contest. Provider-supplied ONLY. When a
   * provider does not publish it the field stays undefined: it must never be
   * estimated, and percentile badges are not computed without it.
   */
  totalParticipants?: number;
  oldRating?: number;
  newRating?: number;
  /**
   * Phase 3 — rating delta. Only set when the provider exposes both old and new
   * ratings for the same contest; never inferred from a neighbouring record.
   */
  ratingChange?: number;
  participatedAt: string; // ISO timestamp
}

export interface NormalizedRatingPoint {
  externalActivityId: string;
  contestName: string;
  rating: number;
  /**
   * Phase 3 — rating before the contest, when the provider publishes it. Used to
   * derive a contest's rating delta; left undefined when unavailable.
   */
  oldRating?: number;
  rank?: number;
  occurredAt: string; // ISO timestamp
}

export interface NormalizedDailyActivity {
  /** Calendar day (YYYY-MM-DD) as reported by the provider timezone. */
  date: string;
  acceptedCount: number;
  submissionCount: number;
}

/**
 * Discriminated failure kinds so callers can distinguish "this provider does not
 * expose the data" from "the provider is temporarily down" (Step 6 rule: never
 * render unavailable data as zero).
 */
export type ProviderErrorKind =
  | 'INVALID_USERNAME'
  | 'NOT_FOUND'
  | 'UNSUPPORTED'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'PROVIDER_ERROR'
  | 'NETWORK_ERROR';

export interface ProviderSuccess<T> {
  ok: true;
  provider: ProviderId;
  data: T;
  retrievedAt: string;
  /** True when served from the in-process cache rather than a live call. */
  fromCache: boolean;
}

export interface ProviderFailure {
  ok: false;
  provider: ProviderId;
  errorKind: ProviderErrorKind;
  error: string;
  retrievedAt: string;
  /** Present when the caller should retry later (timeouts / rate limits). */
  retryAfterMs?: number;
}

export type ProviderResult<T> = ProviderSuccess<T> | ProviderFailure;

export function providerSuccess<T>(
  provider: ProviderId,
  data: T,
  fromCache = false,
): ProviderSuccess<T> {
  return { ok: true, provider, data, retrievedAt: new Date().toISOString(), fromCache };
}

export function providerFailure(
  provider: ProviderId,
  errorKind: ProviderErrorKind,
  error: string,
  retryAfterMs?: number,
): ProviderFailure {
  return { ok: false, provider, errorKind, error, retrievedAt: new Date().toISOString(), retryAfterMs };
}
