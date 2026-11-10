import { ContestPlatformAdapter } from './adapterInterface';
import { ContestStatsResult } from '../types';
import { ExternalProviderAdapter, PublicOwnershipField } from './providerInterface';
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
import { requestWithTimeout } from './baseProvider';

const GRAPHQL_ENDPOINT = 'https://leetcode.com/graphql';

export class LeetCodeAdapter implements ContestPlatformAdapter, ExternalProviderAdapter {
  readonly platform = 'LEETCODE' as const;
  readonly provider: ProviderId = 'LEETCODE';

  getProviderCapabilities(): ProviderCapabilities {
    return {
      profileLookup: true,
      dailyActivity: false,
      acceptedSubmissions: false,
      submissionTimestamps: false,
      contestHistory: true,
      ratingHistory: true,
      ownership: 'PROFILE_CHALLENGE',
      apiKind: 'DOCUMENTED_UNOFFICIAL',
      dataFreshness: 'HISTORICAL',
      notes: [
        'leetcode.com/graphql is undocumented and unsupported by LeetCode; schema may change without notice.',
        'Accepted-submission history with timestamps is NOT exposed reliably without an authenticated session, so it is reported UNSUPPORTED.',
        'Problem-solved totals are current-only aggregates (no per-attempt history).',
        'Ownership challenge uses the public "About Me" field, read anonymously; LeetCode offers no OAuth for third parties.',
      ],
    };
  }

  parseUsernameFromUrl(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    try {
      const parsed = new URL(url.trim());
      const host = parsed.hostname.toLowerCase();
      if (!host.includes('leetcode.com')) return null;

      const segments = parsed.pathname.split('/').filter(Boolean);
      // Format 1: leetcode.com/u/username
      if (segments[0] === 'u' && segments[1]) {
        return this.isValidUsername(segments[1]) ? segments[1] : null;
      }
      // Format 2: leetcode.com/username
      const reserved = ['problems', 'problemset', 'explore', 'contest', 'discuss', 'interview', 'company', 'assessment', 'login', 'accounts'];
      if (segments.length === 1 && !reserved.includes(segments[0].toLowerCase())) {
        return this.isValidUsername(segments[0]) ? segments[0] : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  isValidUsername(username: string): boolean {
    if (!username) return false;
    return /^[a-zA-Z0-9_-]{2,50}$/.test(username);
  }

  getCanonicalUrl(username: string): string {
    return `https://leetcode.com/u/${username}`;
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
        error: 'Invalid LeetCode username format.',
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const query = `
        query getVerifiedContestStats($username: String!) {
          matchedUser(username: $username) {
            username
            profile {
              realName
              ranking
            }
            submitStats: submitStatsGlobal {
              acSubmissionNum {
                difficulty
                count
              }
            }
          }
          userContestRanking(username: $username) {
            attendedContestsCount
            rating
            globalRanking
            totalParticipants
            topPercentage
            badge {
              name
            }
          }
          userContestRankingHistory(username: $username) {
            attended
            rating
            ranking
            contest {
              title
              startTime
            }
          }
        }
      `;

      const res = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CareerAI-Verified-Platform/1.0',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ query, variables: { username: cleanUsername } }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return {
          platform: this.platform,
          username: cleanUsername,
          profileUrl: canonicalUrl,
          verified: false,
          retrievedAt,
          error: `LeetCode GraphQL returned status ${res.status}`,
        };
      }

      const data = await res.json();
      const matched = data?.data?.matchedUser;
      if (!matched) {
        return {
          platform: this.platform,
          username: cleanUsername,
          profileUrl: canonicalUrl,
          verified: false,
          retrievedAt,
          error: 'LeetCode user not found.',
        };
      }

      const totalSolved = matched.submitStats?.acSubmissionNum?.find((x: any) => x.difficulty === 'All')?.count || 0;
      const contestRanking = data?.data?.userContestRanking;
      const contestHistoryRaw = data?.data?.userContestRankingHistory || [];

      const contestHistory = Array.isArray(contestHistoryRaw)
        ? contestHistoryRaw
            .filter((h: any) => h.attended)
            .map((h: any, idx: number) => ({
              contestId: `lc-${idx}`,
              contestName: h.contest?.title || 'LeetCode Weekly/Biweekly Contest',
              rank: h.ranking || 0,
              oldRating: 0,
              newRating: Math.round(h.rating || 0),
              date: h.contest?.startTime ? new Date(h.contest.startTime * 1000) : new Date(),
            }))
        : [];

      const contestRating = contestRanking?.rating ? Math.round(contestRanking.rating) : 0;
      const contestsCount = contestRanking?.attendedContestsCount || contestHistory.length || 0;
      const badgeName = contestRanking?.badge?.name || (contestRating >= 2200 ? 'Guardian' : contestRating >= 1900 ? 'Knight' : 'Contestant');

      return {
        platform: this.platform,
        username: matched.username,
        profileUrl: canonicalUrl,
        verified: true,
        rating: contestRating,
        maxRating: contestRating,
        rankTier: badgeName,
        contestsCount,
        problemsSolved: totalSolved,
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
        error: isTimeout ? 'LeetCode API timeout' : (err?.message || 'LeetCode network error'),
      };
    }
  }

  // ── ExternalProviderAdapter implementation (Phase 1) ──────────────────────

  private async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const res = await requestWithTimeout(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'CareerAI-Verified-Platform/1.0',
      },
      body: JSON.stringify({ query, variables }),
      timeoutMs: 8000,
    });
    if (!res.ok) {
      return providerFailure('LEETCODE', 'PROVIDER_ERROR', `LeetCode GraphQL status ${res.status}`) as never;
    }
    return JSON.parse(res.body) as T;
  }

  async validateProfile(username: string): Promise<ProviderResult<NormalizedProfile>> {
    return this.fetchProfile(username);
  }

  async fetchProfile(username: string): Promise<ProviderResult<NormalizedProfile>> {
    const clean = (username || '').trim();
    if (!this.isValidUsername(clean)) {
      return providerFailure('LEETCODE', 'INVALID_USERNAME', 'Invalid LeetCode username format.');
    }
    try {
      const data: any = await this.graphql(
        `query ($username: String!) {
          matchedUser(username: $username) {
            username
            profile { realName userAvatar ranking }
            submitStatsGlobal { acSubmissionNum { difficulty count } }
          }
        }`,
        { username: clean },
      );
      const matched = data?.data?.matchedUser;
      if (!matched) {
        return providerFailure('LEETCODE', 'NOT_FOUND', 'LeetCode user not found.');
      }
      const totalSolved = matched.submitStatsGlobal?.acSubmissionNum?.find(
        (x: any) => x.difficulty === 'All',
      )?.count;
      return providerSuccess('LEETCODE', {
        provider: 'LEETCODE',
        externalAccountId: matched.username ?? clean,
        displayName: matched.profile?.realName || undefined,
        avatarUrl: matched.profile?.userAvatar || undefined,
        profileUrl: this.getCanonicalUrl(matched.username ?? clean),
        problemsSolved: typeof totalSolved === 'number' ? totalSolved : undefined,
        retrievedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      return providerFailure('LEETCODE', err?.kind ?? 'NETWORK_ERROR', err?.message || 'LeetCode error.');
    }
  }

  async fetchDailyActivity(): Promise<ProviderResult<NormalizedDailyActivity[]>> {
    return providerFailure(
      'LEETCODE',
      'UNSUPPORTED',
      'LeetCode does not expose a reliable public per-day submission feed.',
    );
  }

  async fetchAcceptedSubmissions(): Promise<ProviderResult<NormalizedSubmission[]>> {
    return providerFailure(
      'LEETCODE',
      'UNSUPPORTED',
      'Accepted submissions with timestamps require an authenticated LeetCode session; not supported.',
    );
  }

  async fetchContestHistory(username: string): Promise<ProviderResult<NormalizedContestResult[]>> {
    const rating = await this.loadContestHistory(username);
    if (!rating.ok) return rating as ProviderResult<never>;
    return providerSuccess(
      'LEETCODE',
      rating.data.map<NormalizedContestResult>((p) => ({
        externalActivityId: p.externalActivityId,
        contestName: p.contestName,
        rank: p.rank,
        newRating: p.rating,
        participatedAt: p.occurredAt,
      })),
      rating.fromCache,
    );
  }

  async fetchRatingHistory(username: string): Promise<ProviderResult<NormalizedRatingPoint[]>> {
    return this.loadContestHistory(username);
  }

  /**
   * Reads the student's public LeetCode "About Me" (`profile.aboutMe`) field via
   * the anonymous GraphQL endpoint. LeetCode has no OAuth for this purpose, so
   * this public-field challenge is the only credential-free ownership signal.
   */
  async fetchPublicOwnershipField(username: string): Promise<ProviderResult<PublicOwnershipField>> {
    const clean = (username || '').trim();
    if (!this.isValidUsername(clean)) {
      return providerFailure('LEETCODE', 'INVALID_USERNAME', 'Invalid LeetCode username format.');
    }
    try {
      const data: any = await this.graphql(
        `query ($username: String!) { matchedUser(username: $username) { username profile { aboutMe } } }`,
        { username: clean },
      );
      const matched = data?.data?.matchedUser;
      if (!matched) {
        return providerFailure('LEETCODE', 'NOT_FOUND', 'LeetCode user not found.');
      }
      const aboutMe = matched.profile?.aboutMe;
      return providerSuccess('LEETCODE', {
        field: 'aboutMe',
        label: 'LeetCode profile "About Me"',
        value: typeof aboutMe === 'string' && aboutMe.trim().length > 0 ? aboutMe : null,
      });
    } catch (err: any) {
      return providerFailure('LEETCODE', err?.kind ?? 'NETWORK_ERROR', err?.message || 'LeetCode error.');
    }
  }

  private async loadContestHistory(username: string): Promise<ProviderResult<NormalizedRatingPoint[]>> {
    const clean = (username || '').trim();
    if (!this.isValidUsername(clean)) {
      return providerFailure('LEETCODE', 'INVALID_USERNAME', 'Invalid LeetCode username format.');
    }
    try {
      const data: any = await this.graphql(
        `query ($username: String!) {
          userContestRankingHistory(username: $username) {
            attended rating ranking contest { title startTime }
          }
        }`,
        { username: clean },
      );
      const raw = data?.data?.userContestRankingHistory;
      if (!Array.isArray(raw)) {
        return providerFailure('LEETCODE', 'NOT_FOUND', 'LeetCode contest history unavailable.');
      }
      const points = raw
        .filter((h: any) => h.attended && h.contest?.startTime)
        .map<NormalizedRatingPoint>((h: any) => ({
          // startTime is a stable, unique contest identifier (unlike list position).
          externalActivityId: `lc-contest-${h.contest.startTime}`,
          contestName: h.contest?.title || 'LeetCode Contest',
          rating: Math.round(h.rating || 0),
          rank: h.ranking || undefined,
          occurredAt: new Date(h.contest.startTime * 1000).toISOString(),
        }));
      return providerSuccess('LEETCODE', points);
    } catch (err: any) {
      return providerFailure('LEETCODE', err?.kind ?? 'NETWORK_ERROR', err?.message || 'LeetCode error.');
    }
  }
}

export const leetCodeAdapter = new LeetCodeAdapter();
