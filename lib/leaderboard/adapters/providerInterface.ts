import {
  NormalizedContestResult,
  NormalizedDailyActivity,
  NormalizedProfile,
  NormalizedRatingPoint,
  NormalizedSubmission,
  ProviderCapabilities,
  ProviderId,
  ProviderResult,
} from './providerTypes';

export interface FetchWindow {
  /** Only return records occurring at/after this instant. */
  since?: Date;
  /** Hard upper bound on returned records (provider-facing pagination guard). */
  limit?: number;
}

/**
 * The publicly readable, user-editable field a provider exposes for the
 * ownership challenge (Phase 1, Step 4). Reading it NEVER requires credentials:
 * it is the same text any anonymous visitor sees on the public profile page.
 */
export interface PublicOwnershipField {
  /** Machine name of the field (e.g. `aboutMe`, `organization`). */
  field: string;
  /** Human label shown to the student. */
  label: string;
  /** Current value, or null when the student has left it empty. */
  value: string | null;
}

/**
 * The reusable external-verification contract (Phase 1, Step 2).
 *
 * Every method returns a discriminated `ProviderResult` and MUST NOT throw for
 * expected provider conditions (missing user, timeout, rate limit). Adapters that
 * cannot serve a capability return `UNSUPPORTED` — never a fabricated value.
 *
 * This interface is intentionally separate from `ContestPlatformAdapter`
 * (fetchUserStats) so existing leaderboard scoring callers keep working
 * unmodified; adapters implement both.
 */
export interface ExternalProviderAdapter {
  readonly provider: ProviderId;

  /** Static, honest description of what this provider can and cannot deliver. */
  getProviderCapabilities(): ProviderCapabilities;

  /** Existence + basic profile for a handle. Cheaper than fetchProfile when possible. */
  validateProfile(username: string): Promise<ProviderResult<NormalizedProfile>>;

  /** Full normalized public profile snapshot. */
  fetchProfile(username: string): Promise<ProviderResult<NormalizedProfile>>;

  /** Per-day submission counts within the requested window (may be UNSupported). */
  fetchDailyActivity(
    username: string,
    window?: FetchWindow,
  ): Promise<ProviderResult<NormalizedDailyActivity[]>>;

  /** Accepted submissions carrying a stable submission id and real timestamp. */
  fetchAcceptedSubmissions(
    username: string,
    window?: FetchWindow,
  ): Promise<ProviderResult<NormalizedSubmission[]>>;

  /** Contest participation with stable contest ids. */
  fetchContestHistory(
    username: string,
    window?: FetchWindow,
  ): Promise<ProviderResult<NormalizedContestResult[]>>;

  /** Rating over time, one point per rated contest. */
  fetchRatingHistory(
    username: string,
    window?: FetchWindow,
  ): Promise<ProviderResult<NormalizedRatingPoint[]>>;

  /**
   * OPTIONAL. Only implemented by providers whose `getProviderCapabilities()
   * .ownership` is `PROFILE_CHALLENGE`. Returns the value of the provider's
   * public, user-editable profile field so the ownership service can look for a
   * challenge token. Implementations MUST read the anonymous public view only —
   * never an authenticated session, cookie, or token.
   */
  fetchPublicOwnershipField?(username: string): Promise<ProviderResult<PublicOwnershipField>>;
}
