import { ContestPlatformAdapter } from './adapterInterface';
import { ContestStatsResult } from '../types';
import { ExternalProviderAdapter, FetchWindow, PublicOwnershipField } from './providerInterface';
import {
  NormalizedContestResult,
  NormalizedDailyActivity,
  NormalizedProfile,
  NormalizedRatingPoint,
  NormalizedSubmission,
  ProviderCapabilities,
  ProviderId,
  ProviderResult,
  providerFailure,
  providerSuccess,
} from './providerTypes';
import { cacheKey, parseJson, requestWithTimeout, withCache } from './baseProvider';

const CF_API = 'https://codeforces.com/api';
const CF_CACHE_TTL_MS = 5 * 60 * 1000;

export class CodeforcesAdapter implements ContestPlatformAdapter, ExternalProviderAdapter {
  readonly platform = 'CODEFORCES' as const;
  readonly provider: ProviderId = 'CODEFORCES';

  getProviderCapabilities(): ProviderCapabilities {
    return {
      profileLookup: true,
      dailyActivity: true,
      acceptedSubmissions: true,
      submissionTimestamps: true,
      contestHistory: true,
      ratingHistory: true,
      ownership: 'PROFILE_CHALLENGE',
      apiKind: 'OFFICIAL',
      dataFreshness: 'HISTORICAL',
      notes: [
        'Codeforces publishes the only officially documented API among the supported providers.',
        'Submission history is windowed (from/count) and subject to Codeforces rate limits; responses are cached.',
      ],
    };
  }

  parseUsernameFromUrl(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    try {
      const parsed = new URL(url.trim());
      const host = parsed.hostname.toLowerCase();
      if (!host.includes('codeforces.com')) return null;

      const segments = parsed.pathname.split('/').filter(Boolean);
      // Format 1: codeforces.com/profile/username
      if (segments[0] === 'profile' && segments[1]) {
        return this.isValidUsername(segments[1]) ? segments[1] : null;
      }
      // Format 2: codeforces.com/username
      if (segments.length === 1 && !['contests', 'gym', 'problemset', 'groups', 'ratings', 'api', 'help'].includes(segments[0].toLowerCase())) {
        return this.isValidUsername(segments[0]) ? segments[0] : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  isValidUsername(username: string): boolean {
    if (!username) return false;
    // Codeforces handles: 3-24 characters, letters, digits, underscores, dashes, dots
    return /^[a-zA-Z0-9_.-]{3,24}$/.test(username);
  }

  getCanonicalUrl(username: string): string {
    return `https://codeforces.com/profile/${username}`;
  }

  async fetchUserStats(username: string): Promise<ContestStatsResult> {
    const cleanUsername = username.trim();
    const retrievedAt = new Date();
    const canonicalUrl = this.getCanonicalUrl(cleanUsername);

    if (!this.isValidUsername(cleanUsername)) {
      return {
        platform: this.platform,
        username: cleanUsername,
        profileUrl: canonicalUrl,
        verified: false,
        retrievedAt,
        error: 'Invalid Codeforces handle format.',
      };
    }

    try {
      // 1. Fetch user.info
      const infoController = new AbortController();
      const infoTimeout = setTimeout(() => infoController.abort(), 8000);

      const infoRes = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(cleanUsername)}`, {
        headers: {
          'User-Agent': 'CareerAI-Verified-Platform/1.0',
          'Accept': 'application/json',
        },
        signal: infoController.signal,
      });
      clearTimeout(infoTimeout);

      if (!infoRes.ok) {
        return {
          platform: this.platform,
          username: cleanUsername,
          profileUrl: canonicalUrl,
          verified: false,
          retrievedAt,
          error: `Codeforces API returned status ${infoRes.status}`,
        };
      }

      const infoData = await infoRes.json();
      if (infoData.status !== 'OK' || !Array.isArray(infoData.result) || infoData.result.length === 0) {
        return {
          platform: this.platform,
          username: cleanUsername,
          profileUrl: canonicalUrl,
          verified: false,
          retrievedAt,
          error: infoData.comment || 'Codeforces user handle not found.',
        };
      }

      const userInfo = infoData.result[0];

      // 2. Fetch rating history (participated contests)
      let contestHistory: any[] = [];
      let contestsCount = 0;
      try {
        const ratingController = new AbortController();
        const ratingTimeout = setTimeout(() => ratingController.abort(), 8000);

        const ratingRes = await fetch(`https://codeforces.com/api/user.rating?handle=${encodeURIComponent(cleanUsername)}`, {
          headers: {
            'User-Agent': 'CareerAI-Verified-Platform/1.0',
            'Accept': 'application/json',
          },
          signal: ratingController.signal,
        });
        clearTimeout(ratingTimeout);

        if (ratingRes.ok) {
          const ratingData = await ratingRes.json();
          if (ratingData.status === 'OK' && Array.isArray(ratingData.result)) {
            contestsCount = ratingData.result.length;
            contestHistory = ratingData.result.map((c: any) => ({
              contestId: c.contestId,
              contestName: c.contestName,
              rank: c.rank,
              oldRating: c.oldRating,
              newRating: c.newRating,
              date: new Date(c.ratingUpdateTimeSeconds * 1000),
            }));
          }
        }
      } catch (ratingErr) {
        // If rating history query fails (e.g. rate limit), use user.info rating gracefully
        console.warn(`Could not fetch Codeforces rating history for ${cleanUsername}:`, ratingErr);
      }

      return {
        platform: this.platform,
        username: userInfo.handle,
        profileUrl: canonicalUrl,
        verified: true,
        rating: userInfo.rating || 0,
        maxRating: userInfo.maxRating || 0,
        rankTier: userInfo.rank || 'unrated',
        contestsCount,
        contestHistory,
        retrievedAt,
      };
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError';
      return {
        platform: this.platform,
        username: cleanUsername,
        profileUrl: canonicalUrl,
        verified: false,
        retrievedAt,
        error: isTimeout ? 'Codeforces API timeout' : (err?.message || 'Codeforces API network error'),
      };
    }
  }

  // ── ExternalProviderAdapter implementation (Phase 1) ──────────────────────

  private async callApi<T>(path: string): Promise<T> {
    const res = await requestWithTimeout(`${CF_API}${path}`, {
      timeoutMs: 8000,
      headers: { Accept: 'application/json', 'User-Agent': 'CareerAI-Verified-Platform/1.0' },
    });
    const data = parseJson<any>(res.body, 'Codeforces');
    if (data?.status !== 'OK') {
      throw Object.assign(new Error(data?.comment || 'Codeforces API error.'), { cfStatus: data?.status });
    }
    return data.result as T;
  }

  async validateProfile(username: string): Promise<ProviderResult<NormalizedProfile>> {
    return this.fetchProfile(username);
  }

  async fetchProfile(username: string): Promise<ProviderResult<NormalizedProfile>> {
    const clean = (username || '').trim();
    if (!this.isValidUsername(clean)) {
      return providerFailure('CODEFORCES', 'INVALID_USERNAME', 'Invalid Codeforces handle format.');
    }
    try {
      const info: any = await this.callApi(`/user.info?handles=${encodeURIComponent(clean)}`);
      const u = Array.isArray(info) ? info[0] : null;
      if (!u) return providerFailure('CODEFORCES', 'NOT_FOUND', 'Codeforces handle not found.');
      return providerSuccess('CODEFORCES', {
        provider: 'CODEFORCES',
        externalAccountId: u.handle,
        displayName: u.handle,
        avatarUrl: u.avatar || undefined,
        profileUrl: this.getCanonicalUrl(u.handle),
        currentRating: u.rating ?? undefined,
        maxRating: u.maxRating ?? undefined,
        rankTier: u.rank || 'unrated',
        retrievedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      return this.toFailure(err, clean);
    }
  }

  async fetchAcceptedSubmissions(
    username: string,
    window?: FetchWindow,
  ): Promise<ProviderResult<NormalizedSubmission[]>> {
    const clean = (username || '').trim();
    if (!this.isValidUsername(clean)) {
      return providerFailure('CODEFORCES', 'INVALID_USERNAME', 'Invalid Codeforces handle format.');
    }
    const count = Math.min(window?.limit ?? 100, 200);
    try {
      const { value, fromCache } = await withCache(
        cacheKey('CODEFORCES', 'status', clean, count),
        CF_CACHE_TTL_MS,
        () => this.callApi<any[]>(`/user.status?handle=${encodeURIComponent(clean)}&from=1&count=${count}`),
      );
      const mapped = (value || [])
        .filter((s: any) => s.creationTimeSeconds)
        .map<NormalizedSubmission>((s: any) => ({
          externalActivityId: `${s.contestId ?? 'p'}-${s.id}`,
          problemId: s.problem ? `${s.problem.contestId ?? ''}${s.problem.index ?? ''}` : undefined,
          problemName: s.problem?.name,
          verdict: s.verdict || 'UNKNOWN',
          accepted: s.verdict === 'OK',
          language: s.programmingLanguage,
          submittedAt: new Date(s.creationTimeSeconds * 1000).toISOString(),
        }))
        .filter((s) => !window?.since || new Date(s.submittedAt) >= window.since);
      return providerSuccess('CODEFORCES', mapped.filter((s) => s.accepted), fromCache);
    } catch (err: any) {
      return this.toFailure(err, clean);
    }
  }

  async fetchDailyActivity(
    username: string,
    window?: FetchWindow,
  ): Promise<ProviderResult<NormalizedDailyActivity[]>> {
    const subs = await this.fetchAcceptedSubmissions(username, window);
    if (!subs.ok) return subs as ProviderResult<never>;
    const byDate = new Map<string, NormalizedDailyActivity>();
    for (const s of subs.data) {
      const date = s.submittedAt.slice(0, 10);
      const entry = byDate.get(date) ?? { date, acceptedCount: 0, submissionCount: 0 };
      entry.acceptedCount += 1;
      entry.submissionCount += 1;
      byDate.set(date, entry);
    }
    return providerSuccess('CODEFORCES', Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? 1 : -1)), subs.fromCache);
  }

  async fetchContestHistory(
    username: string,
    window?: FetchWindow,
  ): Promise<ProviderResult<NormalizedContestResult[]>> {
    const rating = await this.fetchRatingHistory(username, window);
    if (!rating.ok) return rating as ProviderResult<never>;
    return providerSuccess(
      'CODEFORCES',
      rating.data.map<NormalizedContestResult>((p) => ({
        externalActivityId: p.externalActivityId,
        contestName: p.contestName,
        rank: p.rank,
        oldRating: p.oldRating,
        newRating: p.rating,
        // Verifiable arithmetic only — the delta is emitted when (and only when)
        // the provider gave both endpoints. Codeforces does not publish a
        // participant total here, so totalParticipants stays undefined.
        ratingChange:
          typeof p.oldRating === 'number' && typeof p.rating === 'number'
            ? p.rating - p.oldRating
            : undefined,
        participatedAt: p.occurredAt,
      })),
      rating.fromCache,
    );
  }

  async fetchRatingHistory(
    username: string,
    window?: FetchWindow,
  ): Promise<ProviderResult<NormalizedRatingPoint[]>> {
    const clean = (username || '').trim();
    if (!this.isValidUsername(clean)) {
      return providerFailure('CODEFORCES', 'INVALID_USERNAME', 'Invalid Codeforces handle format.');
    }
    try {
      const { value, fromCache } = await withCache(
        cacheKey('CODEFORCES', 'rating', clean),
        CF_CACHE_TTL_MS,
        () => this.callApi<any[]>(`/user.rating?handle=${encodeURIComponent(clean)}`),
      );
      const mapped = (value || []).map<NormalizedRatingPoint>((c: any) => ({
        externalActivityId: `cf-contest-${c.contestId ?? c.ratingUpdateTimeSeconds}`,
        contestName: c.contestName,
        rating: c.newRating,
        // Phase 3 — the official /user.rating feed publishes oldRating; carry it
        // through so a contest's rating delta is verifiable rather than inferred.
        oldRating: typeof c.oldRating === 'number' ? c.oldRating : undefined,
        rank: c.rank,
        occurredAt: new Date(c.ratingUpdateTimeSeconds * 1000).toISOString(),
      }));
      const filtered = window?.since
        ? mapped.filter((p) => new Date(p.occurredAt) >= window.since!)
        : mapped;
      return providerSuccess('CODEFORCES', filtered, fromCache);
    } catch (err: any) {
      return this.toFailure(err, clean);
    }
  }

  /**
   * Reads the `organization` field of `user.info` — a public, user-editable
   * profile field. Proving ownership therefore only requires the student to set
   * this field on their own Codeforces profile; no credentials are ever used.
   */
  async fetchPublicOwnershipField(username: string): Promise<ProviderResult<PublicOwnershipField>> {
    const clean = (username || '').trim();
    if (!this.isValidUsername(clean)) {
      return providerFailure('CODEFORCES', 'INVALID_USERNAME', 'Invalid Codeforces handle format.');
    }
    try {
      const info: any = await this.callApi(`/user.info?handles=${encodeURIComponent(clean)}`);
      const u = Array.isArray(info) ? info[0] : null;
      if (!u) return providerFailure('CODEFORCES', 'NOT_FOUND', 'Codeforces handle not found.');
      const organization = u.organization;
      return providerSuccess('CODEFORCES', {
        field: 'organization',
        label: 'Codeforces profile "Organization"',
        value: typeof organization === 'string' && organization.trim().length > 0 ? organization : null,
      });
    } catch (err: any) {
      return this.toFailure(err, clean);
    }
  }

  private toFailure(err: any, handle: string): ProviderResult<never> {
    if (err?.cfStatus === 'FAILED') {
      return providerFailure('CODEFORCES', 'NOT_FOUND', err?.message || 'Codeforces handle not found.');
    }
    return providerFailure('CODEFORCES', err?.kind ?? 'NETWORK_ERROR', err?.message || `Codeforces error for ${handle}`);
  }
}

export const codeforcesAdapter = new CodeforcesAdapter();
