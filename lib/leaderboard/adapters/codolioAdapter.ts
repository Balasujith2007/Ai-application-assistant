import { ContestPlatformAdapter } from './adapterInterface';
import { ContestStatsResult } from '../types';
import { ExternalProviderAdapter } from './providerInterface';
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

export class CodolioAdapter implements ContestPlatformAdapter, ExternalProviderAdapter {
  readonly platform = 'CODOLIO' as const;
  readonly provider: ProviderId = 'CODOLIO';

  getProviderCapabilities(): ProviderCapabilities {
    return {
      profileLookup: true,
      dailyActivity: false,
      acceptedSubmissions: false,
      submissionTimestamps: false,
      contestHistory: false,
      ratingHistory: false,
      ownership: 'NONE',
      apiKind: 'SCRAPED',
      dataFreshness: 'NONE',
      notes: [
        'Codolio is a third-party aggregator with no public API; only page existence is verifiable.',
        'No structured profile, submission, or contest data can be extracted reliably.',
        'Ownership cannot be proven.',
      ],
    };
  }

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

  // ── ExternalProviderAdapter implementation (Phase 1) ──────────────────────

  async validateProfile(username: string): Promise<ProviderResult<NormalizedProfile>> {
    return this.fetchProfile(username);
  }

  async fetchProfile(username: string): Promise<ProviderResult<NormalizedProfile>> {
    const clean = (username || '').trim();
    if (!this.isValidUsername(clean)) {
      return providerFailure('CODOLIO', 'INVALID_USERNAME', 'Invalid Codolio username format.');
    }
    try {
      const res = await fetch(this.getCanonicalUrl(clean), {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(6000),
      });
      if (res.status === 404) {
        return providerFailure('CODOLIO', 'NOT_FOUND', 'Codolio profile not found (404).');
      }
      if (!res.ok) {
        return providerFailure('CODOLIO', 'PROVIDER_ERROR', `Codolio returned HTTP ${res.status}.`);
      }
      return providerSuccess('CODOLIO', {
        provider: 'CODOLIO',
        externalAccountId: clean,
        profileUrl: this.getCanonicalUrl(clean),
        retrievedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
      return providerFailure('CODOLIO', isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR', err?.message || 'Codolio error.');
    }
  }

  async fetchDailyActivity(): Promise<ProviderResult<NormalizedDailyActivity[]>> {
    return providerFailure('CODOLIO', 'UNSUPPORTED', 'Codolio exposes no public activity feed.');
  }

  async fetchAcceptedSubmissions(): Promise<ProviderResult<NormalizedSubmission[]>> {
    return providerFailure('CODOLIO', 'UNSUPPORTED', 'Codolio exposes no public submission feed.');
  }

  async fetchContestHistory(): Promise<ProviderResult<NormalizedContestResult[]>> {
    return providerFailure('CODOLIO', 'UNSUPPORTED', 'Codolio exposes no public contest history.');
  }

  async fetchRatingHistory(): Promise<ProviderResult<NormalizedRatingPoint[]>> {
    return providerFailure('CODOLIO', 'UNSUPPORTED', 'Codolio exposes no public rating history.');
  }
}

export const codolioAdapter = new CodolioAdapter();
