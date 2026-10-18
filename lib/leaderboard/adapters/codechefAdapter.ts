import { ContestPlatformAdapter } from './adapterInterface';
import { ContestStatsResult } from '../types';

export class CodeChefAdapter implements ContestPlatformAdapter {
  readonly platform = 'CODECHEF' as const;

  parseUsernameFromUrl(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    try {
      const parsed = new URL(url.trim());
      const host = parsed.hostname.toLowerCase();
      if (!host.includes('codechef.com')) return null;

      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments[0] === 'users' && segments[1]) {
        return this.isValidUsername(segments[1]) ? segments[1] : null;
      }
      if (segments.length === 1 && !['login', 'signup', 'ratings', 'ide', 'practice', 'contests', 'discuss'].includes(segments[0].toLowerCase())) {
        return this.isValidUsername(segments[0]) ? segments[0] : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  isValidUsername(username: string): boolean {
    if (!username) return false;
    return /^[a-zA-Z0-9_]{2,50}$/.test(username);
  }

  getCanonicalUrl(username: string): string {
    return `https://www.codechef.com/users/${username}`;
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
        error: 'Invalid CodeChef username format.',
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(canonicalUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 404) {
        return {
          platform: this.platform,
          username: cleanUsername,
          profileUrl: canonicalUrl,
          verified: false,
          retrievedAt,
          error: 'CodeChef user profile not found (404).',
        };
      }

      if (!res.ok) {
        return {
          platform: this.platform,
          username: cleanUsername,
          profileUrl: canonicalUrl,
          verified: false,
          retrievedAt,
          error: `CodeChef returned HTTP status ${res.status}`,
        };
      }

      const html = await res.text();

      // Extract rating from HTML (e.g. <div class="rating-number">1850</div> or similar)
      const ratingMatch = html.match(/class=["']rating-number["'][^>]*>(\d+)</i) ||
                          html.match(/<div[^>]*rating-header[^>]*>[\s\S]*?<div[^>]*>(\d+)<\/div>/i);
      const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : 0;

      // Extract stars / tier (e.g. 1★, 2★, 3★, 4★, etc.)
      const starsMatch = html.match(/(\d+)★/i) || html.match(/rating-star[^>]*>(\d+)\s*star/i);
      const stars = starsMatch ? `${starsMatch[1]} Star` : 'Unrated';

      // Extract problems solved if present
      const solvedMatch = html.match(/Total Problems Solved:\s*(\d+)/i) ||
                          html.match(/<h3>Total Problems Solved:\s*<\/h3>[\s\S]*?<p[^>]*>(\d+)<\/p>/i);
      const problemsSolved = solvedMatch ? parseInt(solvedMatch[1], 10) : 0;

      return {
        platform: this.platform,
        username: cleanUsername,
        profileUrl: canonicalUrl,
        verified: true,
        rating,
        maxRating: rating,
        rankTier: stars,
        problemsSolved,
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
        error: isTimeout ? 'CodeChef request timeout' : (err?.message || 'CodeChef network error'),
      };
    }
  }
}

export const codeChefAdapter = new CodeChefAdapter();
