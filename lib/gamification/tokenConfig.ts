import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { REWARD_CONFIG } from './rewardConfig';

/**
 * Token Rules Configuration
 * -------------------------
 * Configurable, DB-backed rules for the Token Usage Engine (Streak Rescue and
 * Leaderboard Boost). Stored as a single JSON row in `reward_configurations`
 * (key = "tokenRules"), so it is the same persisted-configuration mechanism the
 * reward engine already uses — no duplicate configuration store is introduced.
 *
 * Defaults come from REWARD_CONFIG and are used whenever no row exists, which
 * keeps the system fully backward compatible.
 */

export interface StreakRescueRules {
  /** Master switch for the Streak Rescue token. */
  enabled: boolean;
  /**
   * How far back (in days, inclusive) a missed date may be for it to be
   * eligible for rescue. Must be a positive integer.
   */
  windowDays: number;
  /** Lifetime cap on how many tokens a single student may consume. */
  maxRescuesPerStudent: number;
  /** Rolling-window cap (over `windowDays`) on rescues per student. */
  maxRescuesPerStudentPerWindow: number;
  /** Minimum length of the connected streak a rescue must re-join. */
  minStreakLength: number;
  /**
   * When true, the missed date must sit inside an existing streak (it must be
   * adjacent to at least one recorded activity day). This prevents "rescuing"
   * arbitrary empty days that were never part of a streak.
   */
  requireAdjacentToStreak: boolean;
}

export interface LeaderboardBoostRules {
  /**
   * The boost only ever unlocks a NON-RANKING benefit. It must never change the
   * Career Growth Score, finalized WeeklyPerformanceSnapshot rows, the official
   * Top-3 Champion ranking, champion gift eligibility, or any historical
   * leaderboard result. When no safe non-ranking benefit exists it stays
   * disabled and the token is reported as unavailable.
   */
  enabled: boolean;
  /** Human-readable explanation surfaced to students when the token is unavailable. */
  unavailableReason: string;
  /** Rolling-window cap (days) for the non-ranking cosmetic highlight. */
  activeDays: number;
}

export interface TokenRulesConfig {
  streakRescue: StreakRescueRules;
  leaderboardBoost: LeaderboardBoostRules;
}

export class TokenRulesValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenRulesValidationError';
  }
}

export const DEFAULT_TOKEN_RULES: TokenRulesConfig = {
  streakRescue: {
    enabled: true,
    windowDays: 7,
    maxRescuesPerStudent: REWARD_CONFIG.STREAK_RESCUE_MAX_TOKENS_PER_STUDENT,
    maxRescuesPerStudentPerWindow: 3,
    minStreakLength: REWARD_CONFIG.STREAK_RESCUE_MIN_STREAK_LENGTH,
    requireAdjacentToStreak: true,
  },
  leaderboardBoost: {
    // Disabled by default: there is no safe, meaningful non-ranking benefit for
    // a "leaderboard boost" on a platform whose official ranking is career-growth
    // driven. Enabling it must never touch ranking — see LeaderboardBoostRules.
    enabled: false,
    unavailableReason:
      'Leaderboard Boost is intentionally unavailable: the official leaderboard and Top-3 Champion ranking are determined solely by the Career Growth Score and must never be altered by a purchasable or gifted boost. No ranking-safe benefit is currently offered.',
    activeDays: 0,
  },
};

export const TOKEN_RULES_KEY = 'tokenRules';

const CACHE_TTL_MS = 30_000;
let cache: { config: TokenRulesConfig; expiresAt: number } | null = null;

export function invalidateTokenRulesCache(): void {
  cache = null;
}

function clampPositiveInt(value: unknown, fallback: number, min = 1, max = 3650): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  if (i < min) return min;
  if (i > max) return max;
  return i;
}

function normalize(raw: unknown): TokenRulesConfig {
  const stored = (raw && typeof raw === 'object' ? raw : {}) as Partial<TokenRulesConfig>;
  const sr = (stored.streakRescue ?? {}) as Partial<StreakRescueRules>;
  const lb = (stored.leaderboardBoost ?? {}) as Partial<LeaderboardBoostRules>;
  const d = DEFAULT_TOKEN_RULES;

  return {
    streakRescue: {
      enabled: typeof sr.enabled === 'boolean' ? sr.enabled : d.streakRescue.enabled,
      windowDays: clampPositiveInt(sr.windowDays, d.streakRescue.windowDays, 1, 90),
      maxRescuesPerStudent: clampPositiveInt(
        sr.maxRescuesPerStudent,
        d.streakRescue.maxRescuesPerStudent,
        1,
        100
      ),
      maxRescuesPerStudentPerWindow: clampPositiveInt(
        sr.maxRescuesPerStudentPerWindow,
        d.streakRescue.maxRescuesPerStudentPerWindow,
        1,
        100
      ),
      minStreakLength: clampPositiveInt(sr.minStreakLength, d.streakRescue.minStreakLength, 1, 365),
      requireAdjacentToStreak:
        typeof sr.requireAdjacentToStreak === 'boolean'
          ? sr.requireAdjacentToStreak
          : d.streakRescue.requireAdjacentToStreak,
    },
    leaderboardBoost: {
      enabled: typeof lb.enabled === 'boolean' ? lb.enabled : d.leaderboardBoost.enabled,
      unavailableReason:
        typeof lb.unavailableReason === 'string' && lb.unavailableReason.trim().length > 0
          ? lb.unavailableReason
          : d.leaderboardBoost.unavailableReason,
      activeDays: clampPositiveInt(lb.activeDays, d.leaderboardBoost.activeDays, 0, 90),
    },
  };
}

/** Validates a normalized token rules config, throwing on invalid values. */
export function validateTokenRules(config: TokenRulesConfig): void {
  const errors: string[] = [];
  const sr = config.streakRescue;
  if (sr.windowDays < 1 || sr.windowDays > 90) errors.push('Streak rescue window must be between 1 and 90 days.');
  if (sr.maxRescuesPerStudent < 1) errors.push('Max rescues per student must be at least 1.');
  if (sr.maxRescuesPerStudentPerWindow < 1) errors.push('Max rescues per window must be at least 1.');
  if (sr.maxRescuesPerStudentPerWindow > sr.maxRescuesPerStudent) {
    errors.push('Max rescues per window cannot exceed the lifetime maximum.');
  }
  if (sr.minStreakLength < 1) errors.push('Minimum streak length must be at least 1.');
  if (config.leaderboardBoost.enabled && config.leaderboardBoost.activeDays < 1) {
    errors.push('When the leaderboard boost is enabled, activeDays must be at least 1.');
  }
  if (errors.length > 0) throw new TokenRulesValidationError(errors.join(' '));
}

/** Loads the effective token rules (persisted values merged over defaults). */
export async function getTokenRules(forceRefresh = false): Promise<TokenRulesConfig> {
  const now = Date.now();
  if (!forceRefresh && cache && cache.expiresAt > now) return cache.config;

  let row: { value: unknown } | null = null;
  try {
    row = await prisma.rewardConfiguration.findUnique({
      where: { key: TOKEN_RULES_KEY },
      select: { value: true },
    });
  } catch (error) {
    console.error('Failed to load token rules, using defaults:', error);
    return structuredClone(DEFAULT_TOKEN_RULES);
  }

  const config = normalize(row?.value);
  cache = { config, expiresAt: now + CACHE_TTL_MS };
  return config;
}

/**
 * Persists token rules. Validates first and records an audit trail entry so
 * every rule change is traceable.
 */
export async function saveTokenRules(
  incoming: Partial<TokenRulesConfig>,
  changedById?: string
): Promise<TokenRulesConfig> {
  const current = await getTokenRules(true);
  const merged = normalize({
    streakRescue: { ...current.streakRescue, ...(incoming.streakRescue ?? {}) },
    leaderboardBoost: { ...current.leaderboardBoost, ...(incoming.leaderboardBoost ?? {}) },
  });
  validateTokenRules(merged);

  await prisma.rewardConfiguration.upsert({
    where: { key: TOKEN_RULES_KEY },
    update: { value: merged as unknown as Prisma.InputJsonValue },
    create: {
      key: TOKEN_RULES_KEY,
      value: merged as unknown as Prisma.InputJsonValue,
      description: 'Token usage engine rules (streak rescue window/limits, boost availability)',
    },
  });

  await prisma.rewardConfigurationAudit.create({
    data: {
      key: TOKEN_RULES_KEY,
      previousValue: current as unknown as Prisma.InputJsonValue,
      newValue: merged as unknown as Prisma.InputJsonValue,
      changedById: changedById ?? null,
    },
  });

  invalidateTokenRulesCache();
  return getTokenRules(true);
}
