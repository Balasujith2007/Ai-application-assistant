import { ContestPlatformAdapter } from './adapterInterface';
import { ExternalProviderAdapter } from './providerInterface';
import { codeforcesAdapter } from './codeforcesAdapter';
import { leetCodeAdapter } from './leetcodeAdapter';
import { codeChefAdapter } from './codechefAdapter';
import { codolioAdapter } from './codolioAdapter';
import { atCoderAdapter } from './atcoderAdapter';
import { ContestPlatform } from '../types';

export class PlatformAdapterRegistry {
  private adapters = new Map<string, ContestPlatformAdapter>();

  constructor() {
    this.register(codeforcesAdapter);
    this.register(leetCodeAdapter);
    this.register(codeChefAdapter);
    this.register(atCoderAdapter);
    this.register(codolioAdapter);
  }

  register(adapter: ContestPlatformAdapter) {
    this.adapters.set(adapter.platform.toUpperCase(), adapter);
  }

  getAdapter(platform: string): ContestPlatformAdapter | null {
    if (!platform) return null;
    return this.adapters.get(platform.toUpperCase()) || null;
  }

  /**
   * Returns the adapter as an `ExternalProviderAdapter` when it implements the
   * Phase 1 normalized contract. All built-in adapters do; this guard keeps the
   * call site safe if a future adapter only satisfies the legacy interface.
   */
  getProvider(platform: string): ExternalProviderAdapter | null {
    const adapter = this.getAdapter(platform);
    if (!adapter) return null;
    const candidate = adapter as unknown as ExternalProviderAdapter;
    return typeof candidate.getProviderCapabilities === 'function' ? candidate : null;
  }

  detectPlatformFromUrl(url: string): { adapter: ContestPlatformAdapter; username: string } | null {
    if (!url || typeof url !== 'string') return null;
    const lower = url.toLowerCase();

    for (const adapter of this.adapters.values()) {
      const username = adapter.parseUsernameFromUrl(url);
      if (username) {
        return { adapter, username };
      }
    }
    return null;
  }

  getSupportedPlatforms(): string[] {
    return Array.from(this.adapters.keys());
  }
}

export const platformRegistry = new PlatformAdapterRegistry();
