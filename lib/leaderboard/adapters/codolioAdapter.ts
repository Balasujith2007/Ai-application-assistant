import { ContestPlatformAdapter } from './adapterInterface';
import { ContestStatsResult } from '../types';

export class CodolioAdapter implements ContestPlatformAdapter {
  readonly platform = 'CODOLIO' as const;

  parseUsernameFromUrl(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    try {
      const parsed = new URL(url.trim());
      const host = parsed.hostname.toLowerCase();
      if (!host.includes('codolio.com')) return null;

      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments[0] === 'profile' && segments[1]) {
        return this.isValidUsername(segments[1]) ? segments[1] : null;
      }
      if (segments.length === 1 && !['login', 'signup', 'about', 'terms'].includes(segments[0].toLowerCase())) {
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
    return `https://codolio.com/profile/${username}`;
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
        error: 'Invalid Codolio username format.',
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(canonicalUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'CareerAI-Verified-Platform/1.0',
          'Accept': 'text/html,application/xhtml+xml',
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
          error: 'Codolio profile not found (404).',
        };
      }

      return {
        platform: this.platform,
        username: cleanUsername,
        profileUrl: canonicalUrl,
        verified: res.ok,
        rankTier: 'Verified Developer',
        retrievedAt,
      };
    } catch (err: any) {
      return {
        platform: this.platform,
        username: cleanUsername,
        profileUrl: canonicalUrl,
        verified: false,
        retrievedAt,
        error: err?.message || 'Codolio network error',
      };
    }
  }
}

export const codolioAdapter = new CodolioAdapter();
