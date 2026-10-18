import { ContestPlatformAdapter } from './adapterInterface';
import { ContestStatsResult } from '../types';

export class CodeforcesAdapter implements ContestPlatformAdapter {
  readonly platform = 'CODEFORCES' as const;

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
}

export const codeforcesAdapter = new CodeforcesAdapter();
