import { ContestPlatformAdapter } from './adapterInterface';
import { codeforcesAdapter } from './codeforcesAdapter';
import { leetCodeAdapter } from './leetcodeAdapter';
import { codeChefAdapter } from './codechefAdapter';
import { codolioAdapter } from './codolioAdapter';
import { ContestPlatform } from '../types';

export class PlatformAdapterRegistry {
  private adapters = new Map<string, ContestPlatformAdapter>();

  constructor() {
    this.register(codeforcesAdapter);
    this.register(leetCodeAdapter);
    this.register(codeChefAdapter);
    this.register(codolioAdapter);
  }

  register(adapter: ContestPlatformAdapter) {
    this.adapters.set(adapter.platform.toUpperCase(), adapter);
  }

  getAdapter(platform: string): ContestPlatformAdapter | null {
    if (!platform) return null;
    return this.adapters.get(platform.toUpperCase()) || null;
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
