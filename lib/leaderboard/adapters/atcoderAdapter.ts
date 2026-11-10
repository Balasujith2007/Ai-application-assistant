import { ContestPlatformAdapter } from './adapterInterface';
import { ContestStatsResult } from '../types';
import { ExternalProviderAdapter, FetchWindow } from './providerInterface';
import {
  NormalizedContestResult,
  NormalizedDailyActivity,
  NormalizedProfile,
  NormalizedRatingPoint,
  NormalizedSubmission,
  ProviderCapabilities,
  ProviderResult,
  ProviderId,
  providerFailure,
  providerSuccess,
} from './providerTypes';
import {
  ProviderRequestError,
  cacheKey,
  parseJson,
  requestWithTimeout,
  withCache,
} from './baseProvider';

const ATCODER_ORIGIN = 'https://atcoder.jp';
const KENKOOOO_API = 'https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions';
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;
const SUBMISSION_CACHE_TTL_MS = 60 * 1000;
/** Kenkoooo caps a single submissions call at 500 records. */
const KENKOOOO_MAX_RECORDS = 500;

interface KenkooooSubmission {
  id: number;
  epoch_second: number;
  problem_id: string;
  contest_id: string;
  user_id: string;
  language: string;
  point: number;
  length: number;
  result: string;
}

interface AtCoderHistoryEntry {
  IsRated: boolean;
  Place: number;
  OldRating: number;
  NewRating: number;
  Performance: number;
  ContestName: string;
  ContestScreenName: string;
  EndTime: string;
}

/**
 * AtCoder integration.
 *
 * Sourcing (verified during the Phase 1 audit):
 *  - Rating / contest history: `atcoder.jp/users/{handle}/history/json`
 *    (semi-public AtCoder JSON, undocumented but stable and widely relied upon).
 *  - Submissions: Kenkoooo AtCoder Problems API `atcoder-api/v3/user/submissions`
 *    (community-maintained mirror; NOT an official AtCoder API).
 *  - Existence: `atcoder.jp/users/{handle}` returns 404 for unknown handles.
 *
 * AtCoder publishes no official public API. `apiKind` is therefore reported as
 * COMMUNITY (submissions) with DOCUMENTED_UNOFFICIAL history endpoints, never
 * as OFFICIAL.
 */
export class AtCoderAdapter implements ContestPlatformAdapter, ExternalProviderAdapter {
  readonly platform = 'ATCODER' as const;
  readonly provider: ProviderId = 'ATCODER';

  getProviderCapabilities(): ProviderCapabilities {
    return {
      profileLookup: true,
      dailyActivity: true,
      acceptedSubmissions: true,
      submissionTimestamps: true,
      contestHistory: true,
      ratingHistory: true,
      ownership: 'NONE',
      apiKind: 'COMMUNITY',
      dataFreshness: 'HISTORICAL',
      notes: [
        'No official AtCoder API exists. Rating history uses atcoder.jp/users/{handle}/history/json.',
        'Submissions use the community-maintained Kenkoooo AtCoder Problems API.',
        'A single submissions call returns at most 500 records, so long histories require windowed syncs.',
        'AtCoder profiles expose no editable free-text field, so account ownership cannot be proven.',
      ],
    };
  }

  parseUsernameFromUrl(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    try {
      const parsed = new URL(url.trim());
      const host = parsed.hostname.toLowerCase();
      if (!host.includes('atcoder.jp')) return null;

      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments[0] === 'users' && segments[1]) {
        return this.isValidUsername(segments[1]) ? segments[1] : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  isValidUsername(username: string): boolean {
    if (!username) return false;
    return /^[a-zA-Z0-9_]{3,24}$/.test(username);
  }

  getCanonicalUrl(username: string): string {
    return `${ATCODER_ORIGIN}/users/${username}`;
  }

  async validateProfile(username: string): Promise<ProviderResult<NormalizedProfile>> {
    const clean = (username || '').trim();
    if (!this.isValidUsername(clean)) {
      return providerFailure('ATCODER', 'INVALID_USERNAME', 'Invalid AtCoder handle format.');
    }

    try {
      const res = await requestWithTimeout(this.getCanonicalUrl(clean), {
        timeoutMs: 8000,
        headers: { Accept: 'text/html', 'User-Agent': 'CareerAI-Verified-Platform/1.0' },
      });
      // requestWithTimeout only throws for 429/5xx, so a 404 must be handled here.
      if (res.status === 404) {
        return providerFailure('ATCODER', 'NOT_FOUND', 'AtCoder user not found.');
      }
      if (!res.ok) {
        return providerFailure('ATCODER', 'PROVIDER_ERROR', `AtCoder returned HTTP ${res.status}.`);
      }
      // A reachable (non-404) profile page is existence only — not ownership.
      return providerSuccess('ATCODER', {
        provider: 'ATCODER',
        externalAccountId: clean,
        profileUrl: this.getCanonicalUrl(clean),
        retrievedAt: new Date().toISOString(),
      });
    } catch (err) {
      return this.toFailure(err, clean);
    }
  }

  async fetchProfile(username: string): Promise<ProviderResult<NormalizedProfile>> {
    const clean = (username || '').trim();
    if (!this.isValidUsername(clean)) {
      return providerFailure('ATCODER', 'INVALID_USERNAME', 'Invalid AtCoder handle format.');
    }

    try {
      const { value, fromCache } = await withCache(
        cacheKey('ATCODER', 'profile', clean),
        PROFILE_CACHE_TTL_MS,
        async () => {
          // Existence check. Throws NOT_FOUND on 404 via the shared classifier.
          await requestWithTimeout(this.getCanonicalUrl(clean), {
            timeoutMs: 8000,
            headers: { Accept: 'text/html', 'User-Agent': 'CareerAI-Verified-Platform/1.0' },
          });
          const history = await this.loadHistory(clean);
          return this.buildProfile(clean, history);
        },
      );
      return providerSuccess('ATCODER', value, fromCache);
    } catch (err) {
      return this.toFailure(err, clean);
    }
  }

  async fetchDailyActivity(
    username: string,
    window?: FetchWindow,
  ): Promise<ProviderResult<NormalizedDailyActivity[]>> {
    const subs = await this.fetchAcceptedSubmissions(username, window);
    if (!subs.ok) return subs;

    const byDate = new Map<string, NormalizedDailyActivity>();
    for (const s of subs.data) {
      const date = s.submittedAt.slice(0, 10); // UTC calendar day
      const entry = byDate.get(date) ?? { date, acceptedCount: 0, submissionCount: 0 };
      entry.acceptedCount += 1;
      entry.submissionCount += 1;
      byDate.set(date, entry);
    }
    const data = Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
    return providerSuccess('ATCODER', data, subs.fromCache);
  }

  async fetchAcceptedSubmissions(
    username: string,
    window?: FetchWindow,
  ): Promise<ProviderResult<NormalizedSubmission[]>> {
    const clean = (username || '').trim();
    if (!this.isValidUsername(clean)) {
      return providerFailure('ATCODER', 'INVALID_USERNAME', 'Invalid AtCoder handle format.');
    }

    const fromSecond = window?.since
      ? Math.floor(window.since.getTime() / 1000)
      : Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60; // default: last 90 days

    try {
      const { value, fromCache } = await withCache(
        cacheKey('ATCODER', 'submissions', clean, fromSecond),
        SUBMISSION_CACHE_TTL_MS,
        async () => {
          const res = await requestWithTimeout(
            `${KENKOOOO_API}?user=${encodeURIComponent(clean)}&from_second=${fromSecond}`,
            { timeoutMs: 10000, headers: { Accept: 'application/json' } },
          );
          if (res.status === 404 || res.status === 400) {
            throw new ProviderRequestError('NOT_FOUND', 'AtCoder/kenkoooo user not found.', res.status);
          }
          const parsed = parseJson<KenkooooSubmission[]>(res.body, 'AtCoder submissions');
          if (!Array.isArray(parsed)) {
            throw new ProviderRequestError('PROVIDER_ERROR', 'AtCoder submissions: unexpected payload.');
          }
          return parsed.slice(0, KENKOOOO_MAX_RECORDS).map<NormalizedSubmission>((s) => ({
            externalActivityId: String(s.id),
            problemId: s.problem_id,
            problemName: s.problem_id,
            verdict: s.result,
            accepted: s.result === 'AC',
            language: s.language,
            submittedAt: new Date(s.epoch_second * 1000).toISOString(),
          }));
        },
      );

      const acceptedOnly = value.filter((s) => s.accepted);
      const limited = window?.limit ? acceptedOnly.slice(0, window.limit) : acceptedOnly;
      return providerSuccess('ATCODER', limited, fromCache);
    } catch (err) {
      return this.toFailure(err, clean);
    }
  }

  async fetchContestHistory(
    username: string,
    window?: FetchWindow,
  ): Promise<ProviderResult<NormalizedContestResult[]>> {
    const clean = (username || '').trim();
    if (!this.isValidUsername(clean)) {
      return providerFailure('ATCODER', 'INVALID_USERNAME', 'Invalid AtCoder handle format.');
    }
    try {
      const history = await this.loadHistory(clean);
      const mapped = history.map<NormalizedContestResult>((h) => ({
        externalActivityId: h.ContestScreenName, // stable provider contest id
        contestName: h.ContestName,
        rank: h.Place,
        oldRating: h.OldRating,
        newRating: h.NewRating,
        // Phase 3 — the community history feed publishes both endpoints, so the
        // delta is verifiable. It still does not publish a participant total.
        ratingChange:
          typeof h.OldRating === 'number' && typeof h.NewRating === 'number'
            ? h.NewRating - h.OldRating
            : undefined,
        participatedAt: new Date(h.EndTime).toISOString(),
      }));
      const filtered = window?.since
        ? mapped.filter((c) => new Date(c.participatedAt) >= window.since!)
        : mapped;
      const limited = window?.limit ? filtered.slice(-window.limit) : filtered;
      return providerSuccess('ATCODER', limited);
    } catch (err) {
      return this.toFailure(err, clean);
    }
  }

  async fetchRatingHistory(
    username: string,
    window?: FetchWindow,
  ): Promise<ProviderResult<NormalizedRatingPoint[]>> {
    const clean = (username || '').trim();
    if (!this.isValidUsername(clean)) {
      return providerFailure('ATCODER', 'INVALID_USERNAME', 'Invalid AtCoder handle format.');
    }
    try {
      const history = await this.loadHistory(clean);
      const mapped = history
        .filter((h) => h.IsRated)
        .map<NormalizedRatingPoint>((h) => ({
          externalActivityId: h.ContestScreenName,
          contestName: h.ContestName,
          rating: h.NewRating,
          rank: h.Place,
          occurredAt: new Date(h.EndTime).toISOString(),
        }));
      const filtered = window?.since
        ? mapped.filter((p) => new Date(p.occurredAt) >= window.since!)
        : mapped;
      const limited = window?.limit ? filtered.slice(-window.limit) : filtered;
      return providerSuccess('ATCODER', limited);
    } catch (err) {
      return this.toFailure(err, clean);
    }
  }

  // ── Shared helpers ────────────────────────────────────────────────────────

  private async loadHistory(clean: string): Promise<AtCoderHistoryEntry[]> {
    const res = await requestWithTimeout(`${ATCODER_ORIGIN}/users/${clean}/history/json`, {
      timeoutMs: 10000,
      headers: { Accept: 'application/json', 'User-Agent': 'CareerAI-Verified-Platform/1.0' },
    });
    if (res.status === 404) {
      throw new ProviderRequestError('NOT_FOUND', 'AtCoder user not found.', 404);
    }
    const parsed = parseJson<AtCoderHistoryEntry[]>(res.body, 'AtCoder history');
    return Array.isArray(parsed) ? parsed : [];
  }

  private buildProfile(clean: string, history: AtCoderHistoryEntry[]): NormalizedProfile {
    const rated = history.filter((h) => h.IsRated);
    const latest = rated.length > 0 ? rated[rated.length - 1] : undefined;
    const currentRating = latest?.NewRating;
    const maxRating = rated.length > 0 ? Math.max(...rated.map((h) => h.NewRating)) : undefined;
    return {
      provider: 'ATCODER',
      externalAccountId: clean,
      profileUrl: this.getCanonicalUrl(clean),
      currentRating,
      maxRating,
      rankTier: this.ratingToTier(currentRating),
      contestsCount: history.length,
      retrievedAt: new Date().toISOString(),
    };
  }

  private ratingToTier(rating?: number): string {
    if (rating === undefined) return 'Unrated';
    if (rating >= 2800) return 'Red';
    if (rating >= 2400) return 'Orange';
    if (rating >= 2000) return 'Yellow';
    if (rating >= 1600) return 'Blue';
    if (rating >= 1200) return 'Cyan';
    if (rating >= 800) return 'Green';
    if (rating >= 400) return 'Brown';
    return 'Gray';
  }

  private toFailure(err: unknown, handle: string): ProviderResult<never> {
    if (err instanceof ProviderRequestError) {
      return providerFailure('ATCODER', err.kind, err.message, err.retryAfterMs);
    }
    return providerFailure('ATCODER', 'NETWORK_ERROR', (err as Error)?.message || 'AtCoder error.');
  }

  /**
   * Legacy `ContestPlatformAdapter` contract used by the existing leaderboard
   * scoring pipeline. Composed from the normalized methods above so there is a
   * single source of truth for AtCoder data.
   */
  async fetchUserStats(username: string): Promise<ContestStatsResult> {
    const retrievedAt = new Date();
    const canonicalUrl = this.getCanonicalUrl((username || '').trim());

    const profile = await this.fetchProfile(username);
    if (!profile.ok) {
      return {
        platform: this.platform,
        username: (username || '').trim(),
        profileUrl: canonicalUrl,
        verified: false,
        retrievedAt,
        error: profile.error,
      };
    }

    const contests = await this.fetchContestHistory(username, { limit: 30 });
    return {
      platform: this.platform,
      username: profile.data.externalAccountId,
      profileUrl: profile.data.profileUrl,
      verified: true,
      rating: profile.data.currentRating,
      maxRating: profile.data.maxRating,
      rankTier: profile.data.rankTier,
      contestsCount: profile.data.contestsCount,
      problemsSolved: undefined,
      contestHistory: contests.ok
        ? contests.data.map((c) => ({
            contestId: c.externalActivityId,
            contestName: c.contestName,
            rank: c.rank ?? 0,
            oldRating: c.oldRating ?? 0,
            newRating: c.newRating ?? 0,
            date: new Date(c.participatedAt),
          }))
        : [],
      retrievedAt,
    };
  }
}

export const atCoderAdapter = new AtCoderAdapter();
