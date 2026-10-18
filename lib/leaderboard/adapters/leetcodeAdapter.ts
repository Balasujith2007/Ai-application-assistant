import { ContestPlatformAdapter } from './adapterInterface';
import { ContestStatsResult } from '../types';

export class LeetCodeAdapter implements ContestPlatformAdapter {
  readonly platform = 'LEETCODE' as const;

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
      const reserved = ['problems', 'explore', 'contest', 'discuss', 'interview', 'company', 'assessment', 'login', 'accounts'];
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
}

export const leetCodeAdapter = new LeetCodeAdapter();
