import { ContestPlatform, ContestStatsResult } from '../types';

export interface ContestPlatformAdapter {
  readonly platform: ContestPlatform;
  
  /** Validates and parses profile URL to return clean username or null if invalid */
  parseUsernameFromUrl(url: string): string | null;

  /** Validates syntax of handle/username */
  isValidUsername(username: string): boolean;

  /** Normalizes URL to canonical profile URL */
  getCanonicalUrl(username: string): string;

  /** 
   * Fetches official public stats from platform.
   * Never fabricates numbers. If platform is unreachable, returns error without faking stats.
   */
  fetchUserStats(username: string): Promise<ContestStatsResult>;
}
