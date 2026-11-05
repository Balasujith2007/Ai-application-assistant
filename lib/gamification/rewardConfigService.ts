import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { REWARD_CONFIG } from './rewardConfig';

/**
 * Reward Configuration Service
 * ----------------------------
 * Single source of truth for reward mechanics. Values are stored in the
 * `reward_configurations` table (one row per section) and are the values the
 * reward engine actually consumes. When no row exists the hardcoded
 * `REWARD_CONFIG` defaults are used, which keeps the system backward compatible.
 */

export type RewardTierKey = 'LEGENDARY' | 'EPIC' | 'RARE' | 'COMMON' | 'COMEBACK';

export interface WeeklyScheduleConfig {
  enabled: boolean;
  distributionDay: number; // 0=Sunday .. 6=Saturday
  distributionHour: number; // 0..23 in `timezone`
  timezone: string;
  evaluationStartDay: number; // 1=Monday
  evaluationEndDay: number; // 5=Friday
  batchSize: number;
  maxRetries: number;
  retryDelayMs: number;
}

/**
 * Career Growth scoring configuration.
 *
 * This platform is a Student Career Growth & Opportunity Platform (internship
 * and job applications, hackathons and competitions, resume strength), not an
 * LMS. Weekly evaluation therefore uses only these three categories. The legacy
 * LMS `scoringWeights` section is no longer read; the historical row (if any)
 * remains in the database and is simply ignored.
 */
export interface CareerGrowthWeightsConfig {
  internshipApplications: number;
  hackathonsCompetitions: number;
  resumeStrength: number;
}

/** Milestone scores (0-100) for internship/job applications. */
export interface InternshipMilestoneScoresConfig {
  applicationSubmitted: number;
  shortlisted: number;
  interviewAttended: number;
  selected: number;
  internshipCompleted: number;
}

/** Milestone scores (0-100) for hackathons and competitions. */
export interface HackathonMilestoneScoresConfig {
  applicationSubmitted: number;
  registrationConfirmed: number;
  participationCompleted: number;
  projectSubmitted: number;
  shortlisted: number;
  finalist: number;
  winner: number;
}

/** Resume strength criteria maxima (must total exactly 100). */
export interface ResumeCriteriaScoresConfig {
  technicalSkills: number;
  projects: number;
  internshipExperience: number;
  certifications: number;
  achievements: number;
  professionalExperience: number;
  resumeCompleteness: number;
  measurableAccomplishments: number;
  improvement: number;
}

/** Configurable verification requirements per category. */
export interface VerificationRequirementsConfig {
  requireInternshipVerification: boolean;
  requireHackathonVerification: boolean;
  requireResumeReview: boolean;
}

/** Configurable anti-gaming caps. */
export interface ScoringCapsConfig {
  maxInternshipMilestonesPerWeek: number;
  maxHackathonMilestonesPerWeek: number;
}

export interface CareerGrowthConfig {
  weights: CareerGrowthWeightsConfig;
  internshipMilestones: InternshipMilestoneScoresConfig;
  hackathonMilestones: HackathonMilestoneScoresConfig;
  resumeCriteria: ResumeCriteriaScoresConfig;
  verification: VerificationRequirementsConfig;
  caps: ScoringCapsConfig;
}

export interface TierRange {
  min: number;
  max: number;
}

export interface TierThresholdsConfig {
  legendary: TierRange;
  epic: TierRange;
  rare: TierRange;
  common: TierRange;
  comeback: TierRange;
}

export interface TierRewardValues {
  xpMin: number;
  xpMax: number;
  coinsMin: number;
  coinsMax: number;
  badgeProbability?: number;
  streakRescueProbability?: number;
  exclusiveBadgeProbability?: number;
  profileFrameProbability?: number;
  leaderboardBoostProbability?: number;
}

export interface RewardValuesConfig {
  COMMON: TierRewardValues;
  RARE: TierRewardValues;
  EPIC: TierRewardValues;
  LEGENDARY: TierRewardValues;
  COMEBACK: TierRewardValues;
}

export interface ChampionPlaceConfig {
  xpAmount: number;
  coinAmount: number;
  badgeId: string;
  badgeName: string;
  badgeIcon: string;
  profileFrameUrl: string;
  title: string;
  rewardRarity: RewardTierKey;
}

export interface ChampionRewardsConfig {
  enabled: boolean;
  first: ChampionPlaceConfig;
  second: ChampionPlaceConfig;
  third: ChampionPlaceConfig;
}

export interface RewardEngineConfig {
  weeklySchedule: WeeklyScheduleConfig;
  careerGrowth: CareerGrowthConfig;
  tierThresholds: TierThresholdsConfig;
  rewardValues: RewardValuesConfig;
  championRewards: ChampionRewardsConfig;
}

export class RewardConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RewardConfigValidationError';
  }
}

export const DEFAULT_REWARD_CONFIG: RewardEngineConfig = {
  weeklySchedule: {
    enabled: true,
    distributionDay: REWARD_CONFIG.WEEKLY_DISTRIBUTION_DAY,
    distributionHour: 18, // Saturday 6:00 PM IST
    timezone: REWARD_CONFIG.TIMEZONE,
    evaluationStartDay: REWARD_CONFIG.EVALUATION_START_DAY,
    evaluationEndDay: REWARD_CONFIG.EVALUATION_END_DAY,
    batchSize: REWARD_CONFIG.WEEKLY_DISTRIBUTION_BATCH_SIZE,
    maxRetries: REWARD_CONFIG.MAX_RETRIES,
    retryDelayMs: REWARD_CONFIG.RETRY_DELAY_MS,
  },
  careerGrowth: {
    weights: {
      internshipApplications: REWARD_CONFIG.CAREER_GROWTH_WEIGHTS.INTERNSHIP_APPLICATIONS,
      hackathonsCompetitions: REWARD_CONFIG.CAREER_GROWTH_WEIGHTS.HACKATHONS_COMPETITIONS,
      resumeStrength: REWARD_CONFIG.CAREER_GROWTH_WEIGHTS.RESUME_STRENGTH,
    },
    internshipMilestones: {
      applicationSubmitted: REWARD_CONFIG.INTERNSHIP_MILESTONE_SCORES.APPLICATION_SUBMITTED,
      shortlisted: REWARD_CONFIG.INTERNSHIP_MILESTONE_SCORES.SHORTLISTED,
      interviewAttended: REWARD_CONFIG.INTERNSHIP_MILESTONE_SCORES.INTERVIEW_ATTENDED,
      selected: REWARD_CONFIG.INTERNSHIP_MILESTONE_SCORES.SELECTED,
      internshipCompleted: REWARD_CONFIG.INTERNSHIP_MILESTONE_SCORES.INTERNSHIP_COMPLETED,
    },
    hackathonMilestones: {
      applicationSubmitted: REWARD_CONFIG.HACKATHON_MILESTONE_SCORES.APPLICATION_SUBMITTED,
      registrationConfirmed: REWARD_CONFIG.HACKATHON_MILESTONE_SCORES.REGISTRATION_CONFIRMED,
      participationCompleted: REWARD_CONFIG.HACKATHON_MILESTONE_SCORES.PARTICIPATION_COMPLETED,
      projectSubmitted: REWARD_CONFIG.HACKATHON_MILESTONE_SCORES.PROJECT_SUBMITTED,
      shortlisted: REWARD_CONFIG.HACKATHON_MILESTONE_SCORES.SHORTLISTED,
      finalist: REWARD_CONFIG.HACKATHON_MILESTONE_SCORES.FINALIST,
      winner: REWARD_CONFIG.HACKATHON_MILESTONE_SCORES.WINNER,
    },
    resumeCriteria: {
      technicalSkills: REWARD_CONFIG.RESUME_CRITERIA_SCORES.TECHNICAL_SKILLS,
      projects: REWARD_CONFIG.RESUME_CRITERIA_SCORES.PROJECTS,
      internshipExperience: REWARD_CONFIG.RESUME_CRITERIA_SCORES.INTERNSHIP_EXPERIENCE,
      certifications: REWARD_CONFIG.RESUME_CRITERIA_SCORES.CERTIFICATIONS,
      achievements: REWARD_CONFIG.RESUME_CRITERIA_SCORES.ACHIEVEMENTS,
      professionalExperience: REWARD_CONFIG.RESUME_CRITERIA_SCORES.PROFESSIONAL_EXPERIENCE,
      resumeCompleteness: REWARD_CONFIG.RESUME_CRITERIA_SCORES.RESUME_COMPLETENESS,
      measurableAccomplishments: REWARD_CONFIG.RESUME_CRITERIA_SCORES.MEASURABLE_ACCOMPLISHMENTS,
      improvement: REWARD_CONFIG.RESUME_CRITERIA_SCORES.IMPROVEMENT,
    },
    verification: {
      requireInternshipVerification: REWARD_CONFIG.VERIFICATION_REQUIREMENTS.REQUIRE_INTERNSHIP_VERIFICATION,
      requireHackathonVerification: REWARD_CONFIG.VERIFICATION_REQUIREMENTS.REQUIRE_HACKATHON_VERIFICATION,
      requireResumeReview: REWARD_CONFIG.VERIFICATION_REQUIREMENTS.REQUIRE_RESUME_REVIEW,
    },
    caps: {
      maxInternshipMilestonesPerWeek: REWARD_CONFIG.SCORING_CAPS.MAX_INTERNSHIP_MILESTONES_PER_WEEK,
      maxHackathonMilestonesPerWeek: REWARD_CONFIG.SCORING_CAPS.MAX_HACKATHON_MILESTONES_PER_WEEK,
    },
  },
  tierThresholds: {
    legendary: { ...REWARD_CONFIG.TIER_THRESHOLDS.LEGENDARY },
    epic: { ...REWARD_CONFIG.TIER_THRESHOLDS.EPIC },
    rare: { ...REWARD_CONFIG.TIER_THRESHOLDS.RARE },
    common: { ...REWARD_CONFIG.TIER_THRESHOLDS.COMMON },
    comeback: { ...REWARD_CONFIG.TIER_THRESHOLDS.COMEBACK },
  },
  rewardValues: {
    COMMON: {
      xpMin: REWARD_CONFIG.REWARD_VALUES.COMMON.XP_MIN,
      xpMax: REWARD_CONFIG.REWARD_VALUES.COMMON.XP_MAX,
      coinsMin: REWARD_CONFIG.REWARD_VALUES.COMMON.COINS_MIN,
      coinsMax: REWARD_CONFIG.REWARD_VALUES.COMMON.COINS_MAX,
    },
    RARE: {
      xpMin: REWARD_CONFIG.REWARD_VALUES.RARE.XP_MIN,
      xpMax: REWARD_CONFIG.REWARD_VALUES.RARE.XP_MAX,
      coinsMin: REWARD_CONFIG.REWARD_VALUES.RARE.COINS_MIN,
      coinsMax: REWARD_CONFIG.REWARD_VALUES.RARE.COINS_MAX,
      badgeProbability: REWARD_CONFIG.REWARD_VALUES.RARE.BADGE_PROBABILITY,
    },
    EPIC: {
      xpMin: REWARD_CONFIG.REWARD_VALUES.EPIC.XP_MIN,
      xpMax: REWARD_CONFIG.REWARD_VALUES.EPIC.XP_MAX,
      coinsMin: REWARD_CONFIG.REWARD_VALUES.EPIC.COINS_MIN,
      coinsMax: REWARD_CONFIG.REWARD_VALUES.EPIC.COINS_MAX,
      streakRescueProbability: REWARD_CONFIG.REWARD_VALUES.EPIC.STREAK_RESCUE_PROBABILITY,
      badgeProbability: REWARD_CONFIG.REWARD_VALUES.EPIC.BADGE_PROBABILITY,
    },
    LEGENDARY: {
      xpMin: REWARD_CONFIG.REWARD_VALUES.LEGENDARY.XP_MIN,
      xpMax: REWARD_CONFIG.REWARD_VALUES.LEGENDARY.XP_MAX,
      coinsMin: REWARD_CONFIG.REWARD_VALUES.LEGENDARY.COINS_MIN,
      coinsMax: REWARD_CONFIG.REWARD_VALUES.LEGENDARY.COINS_MAX,
      exclusiveBadgeProbability: REWARD_CONFIG.REWARD_VALUES.LEGENDARY.EXCLUSIVE_BADGE_PROBABILITY,
      profileFrameProbability: REWARD_CONFIG.REWARD_VALUES.LEGENDARY.PROFILE_FRAME_PROBABILITY,
      leaderboardBoostProbability: REWARD_CONFIG.REWARD_VALUES.LEGENDARY.LEADERBOARD_BOOST_PROBABILITY,
    },
    COMEBACK: {
      xpMin: REWARD_CONFIG.REWARD_VALUES.COMEBACK.XP_MIN,
      xpMax: REWARD_CONFIG.REWARD_VALUES.COMEBACK.XP_MAX,
      coinsMin: REWARD_CONFIG.REWARD_VALUES.COMEBACK.COINS_MIN,
      coinsMax: REWARD_CONFIG.REWARD_VALUES.COMEBACK.COINS_MAX,
    },
  },
  championRewards: {
    enabled: REWARD_CONFIG.CHAMPION_REWARDS_ENABLED,
    first: {
      xpAmount: REWARD_CONFIG.CHAMPION_FIRST_PLACE.XP_AMOUNT,
      coinAmount: REWARD_CONFIG.CHAMPION_FIRST_PLACE.COIN_AMOUNT,
      badgeId: REWARD_CONFIG.CHAMPION_FIRST_PLACE.BADGE_ID,
      badgeName: REWARD_CONFIG.CHAMPION_FIRST_PLACE.BADGE_NAME,
      badgeIcon: REWARD_CONFIG.CHAMPION_FIRST_PLACE.BADGE_ICON,
      profileFrameUrl: REWARD_CONFIG.CHAMPION_FIRST_PLACE.PROFILE_FRAME_URL,
      title: REWARD_CONFIG.CHAMPION_FIRST_PLACE.TITLE,
      rewardRarity: REWARD_CONFIG.CHAMPION_FIRST_PLACE.REWARD_RARITY as RewardTierKey,
    },
    second: {
      xpAmount: REWARD_CONFIG.CHAMPION_SECOND_PLACE.XP_AMOUNT,
      coinAmount: REWARD_CONFIG.CHAMPION_SECOND_PLACE.COIN_AMOUNT,
      badgeId: REWARD_CONFIG.CHAMPION_SECOND_PLACE.BADGE_ID,
      badgeName: REWARD_CONFIG.CHAMPION_SECOND_PLACE.BADGE_NAME,
      badgeIcon: REWARD_CONFIG.CHAMPION_SECOND_PLACE.BADGE_ICON,
      profileFrameUrl: REWARD_CONFIG.CHAMPION_SECOND_PLACE.PROFILE_FRAME_URL,
      title: REWARD_CONFIG.CHAMPION_SECOND_PLACE.TITLE,
      rewardRarity: REWARD_CONFIG.CHAMPION_SECOND_PLACE.REWARD_RARITY as RewardTierKey,
    },
    third: {
      xpAmount: REWARD_CONFIG.CHAMPION_THIRD_PLACE.XP_AMOUNT,
      coinAmount: REWARD_CONFIG.CHAMPION_THIRD_PLACE.COIN_AMOUNT,
      badgeId: REWARD_CONFIG.CHAMPION_THIRD_PLACE.BADGE_ID,
      badgeName: REWARD_CONFIG.CHAMPION_THIRD_PLACE.BADGE_NAME,
      badgeIcon: REWARD_CONFIG.CHAMPION_THIRD_PLACE.BADGE_ICON,
      profileFrameUrl: REWARD_CONFIG.CHAMPION_THIRD_PLACE.PROFILE_FRAME_URL,
      title: REWARD_CONFIG.CHAMPION_THIRD_PLACE.TITLE,
      rewardRarity: REWARD_CONFIG.CHAMPION_THIRD_PLACE.REWARD_RARITY as RewardTierKey,
    },
  },
};

const CONFIG_KEYS = [
  'weeklySchedule',
  'careerGrowth',
  'tierThresholds',
  'rewardValues',
  'championRewards',
] as const;

type ConfigKey = (typeof CONFIG_KEYS)[number];

// ── helpers ────────────────────────────────────────────────────────────────

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Merges a persisted (possibly partial/legacy) section over its defaults. */
function mergeSection<K extends ConfigKey>(key: K, stored: unknown): RewardEngineConfig[K] {
  const defaults = DEFAULT_REWARD_CONFIG[key];
  if (!isPlainObject(stored)) return structuredClone(defaults);
  const merged = structuredClone(defaults) as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(stored)) {
    const existing = merged[k];
    if (isPlainObject(v) && isPlainObject(existing)) {
      merged[k] = { ...existing, ...v };
    } else if (v !== undefined && v !== null) {
      merged[k] = v;
    }
  }
  return merged as unknown as RewardEngineConfig[K];
}

/** Type-safe assignment of a config section (keeps the generic key/value link). */
function assignSection<K extends ConfigKey>(
  target: RewardEngineConfig,
  key: K,
  value: RewardEngineConfig[K]
): void {
  target[key] = value;
}

// ── validation ─────────────────────────────────────────────────────────────

export function validateRewardConfig(config: RewardEngineConfig): void {
  const errors: string[] = [];

  // A. Weekly schedule
  const ws = config.weeklySchedule;
  if (ws.distributionDay < 0 || ws.distributionDay > 6) errors.push('Distribution day must be between 0 (Sunday) and 6 (Saturday).');
  if (ws.distributionHour < 0 || ws.distributionHour > 23) errors.push('Distribution hour must be between 0 and 23.');
  if (ws.evaluationStartDay < 0 || ws.evaluationStartDay > 6) errors.push('Evaluation start day must be between 0 and 6.');
  if (ws.evaluationEndDay < 0 || ws.evaluationEndDay > 6) errors.push('Evaluation end day must be between 0 and 6.');
  if (!ws.timezone || typeof ws.timezone !== 'string') errors.push('Timezone is required.');
  if (ws.batchSize < 1 || ws.batchSize > 500) errors.push('Batch size must be between 1 and 500.');
  if (ws.maxRetries < 0 || ws.maxRetries > 10) errors.push('Max retries must be between 0 and 10.');
  if (ws.retryDelayMs < 0) errors.push('Retry delay must not be negative.');

  // B. Career growth scoring (weights, milestones, resume criteria, caps)
  const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const cg = config.careerGrowth;

  const asFieldBag = (obj: unknown): Record<string, number | undefined> =>
    (obj ?? {}) as Record<string, number | undefined>;

  const ensureNumericFields = (obj: unknown, label: string, max = Number.POSITIVE_INFINITY) => {
    for (const [k, v] of Object.entries(asFieldBag(obj))) {
      if (!isNum(v) || v < 0) {
        errors.push(`${label} "${k}" must be a non-negative number.`);
      } else if (v > max) {
        errors.push(`${label} "${k}" must not exceed ${max}.`);
      }
    }
  };

  const ensureMonotonic = (obj: unknown, order: string[], label: string) => {
    if (!obj) return;
    const bag = asFieldBag(obj);
    for (let i = 0; i < order.length - 1; i++) {
      const a = bag[order[i]];
      const b = bag[order[i + 1]];
      if (isNum(a) && isNum(b) && b < a) {
        errors.push(`${label} must be non-decreasing: "${order[i + 1]}" (${b}) cannot be lower than "${order[i]}" (${a}).`);
      }
    }
  };

  const weightSum = Object.values(cg?.weights ?? {}).reduce((acc, v) => acc + (isNum(v) ? v : 0), 0);
  ensureNumericFields(cg?.weights, 'Career growth weight', 100);
  if (Math.abs(weightSum - 100) > 0.001) {
    errors.push(`Career growth weights must total exactly 100% (currently ${weightSum}%).`);
  }

  ensureNumericFields(cg?.internshipMilestones, 'Internship milestone score', 100);
  ensureNumericFields(cg?.hackathonMilestones, 'Hackathon milestone score', 100);
  ensureNumericFields(cg?.resumeCriteria, 'Resume criterion', 100);

  ensureMonotonic(
    cg?.internshipMilestones,
    ['applicationSubmitted', 'shortlisted', 'interviewAttended', 'selected', 'internshipCompleted'],
    'Internship milestones'
  );
  ensureMonotonic(
    cg?.hackathonMilestones,
    ['applicationSubmitted', 'registrationConfirmed', 'participationCompleted', 'projectSubmitted', 'shortlisted', 'finalist', 'winner'],
    'Hackathon milestones'
  );

  const resumeSum = Object.values(cg?.resumeCriteria ?? {}).reduce((acc, v) => acc + (isNum(v) ? v : 0), 0);
  if (Math.abs(resumeSum - 100) > 0.001) {
    errors.push(`Resume criteria must total exactly 100% (currently ${resumeSum}%).`);
  }

  const caps = cg?.caps;
  if (!isNum(caps?.maxInternshipMilestonesPerWeek) || caps.maxInternshipMilestonesPerWeek < 1 || caps.maxInternshipMilestonesPerWeek > 50) {
    errors.push('Max internship milestones per week must be between 1 and 50.');
  }
  if (!isNum(caps?.maxHackathonMilestonesPerWeek) || caps.maxHackathonMilestonesPerWeek < 1 || caps.maxHackathonMilestonesPerWeek > 50) {
    errors.push('Max hackathon milestones per week must be between 1 and 50.');
  }

  // C. Tier thresholds
  const t = config.tierThresholds;
  const orderedTiers: RewardTierKey[] = ['LEGENDARY', 'EPIC', 'RARE', 'COMMON', 'COMEBACK'];
  const keys: (keyof TierThresholdsConfig)[] = ['legendary', 'epic', 'rare', 'common', 'comeback'];
  keys.forEach((key, index) => {
    const range = t[key];
    if (typeof range?.min !== 'number' || typeof range?.max !== 'number') {
      errors.push(`Tier "${orderedTiers[index]}" requires a numeric min and max.`);
      return;
    }
    if (range.min > range.max) {
      errors.push(`Tier "${orderedTiers[index]}" min (${range.min}) cannot exceed max (${range.max}).`);
    }
  });
  // Non-overlapping + strictly descending bands
  for (let i = 0; i < keys.length - 1; i++) {
    const upper = t[keys[i]];
    const lower = t[keys[i + 1]];
    if (upper && lower && Number.isFinite(upper.min) && Number.isFinite(lower.max) && lower.max >= upper.min) {
      errors.push(
        `Tier ranges overlap: "${orderedTiers[i + 1]}" max (${lower.max}) must be lower than "${orderedTiers[i]}" min (${upper.min}).`
      );
    }
  }

  // D. Reward values
  (Object.keys(config.rewardValues) as (keyof RewardValuesConfig)[]).forEach((tier) => {
    const v = config.rewardValues[tier];
    if (v.xpMin > v.xpMax) errors.push(`${tier}: XP min cannot exceed XP max.`);
    if (v.coinsMin > v.coinsMax) errors.push(`${tier}: coins min cannot exceed coins max.`);
    const probs: [string, number | undefined][] = [
      ['badgeProbability', v.badgeProbability],
      ['streakRescueProbability', v.streakRescueProbability],
      ['exclusiveBadgeProbability', v.exclusiveBadgeProbability],
      ['profileFrameProbability', v.profileFrameProbability],
      ['leaderboardBoostProbability', v.leaderboardBoostProbability],
    ];
    probs.forEach(([name, p]) => {
      if (p !== undefined && (typeof p !== 'number' || p < 0 || p > 1)) {
        errors.push(`${tier}: ${name} must be between 0 and 1.`);
      }
    });
  });

  // E. Champion rewards
  const c = config.championRewards;
  ([c.first, c.second, c.third] as ChampionPlaceConfig[]).forEach((place, idx) => {
    if (place.xpAmount < 0) errors.push(`Champion place ${idx + 1}: XP cannot be negative.`);
    if (place.coinAmount < 0) errors.push(`Champion place ${idx + 1}: coins cannot be negative.`);
  });

  if (errors.length > 0) {
    throw new RewardConfigValidationError(errors.join(' '));
  }
}

// ── cache ──────────────────────────────────────────────────────────────────

let cache: { config: RewardEngineConfig; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

export function invalidateRewardConfigCache(): void {
  cache = null;
}

/** Loads the effective configuration (persisted values merged over defaults). */
export async function getRewardConfig(forceRefresh = false): Promise<RewardEngineConfig> {
  const now = Date.now();
  if (!forceRefresh && cache && cache.expiresAt > now) {
    return cache.config;
  }

  let rows: { key: string; value: unknown }[] = [];
  try {
    rows = await prisma.rewardConfiguration.findMany({ select: { key: true, value: true } });
  } catch (error) {
    // Never break reward allocation because configuration could not be read.
    console.error('Failed to load reward configuration, using defaults:', error);
    return structuredClone(DEFAULT_REWARD_CONFIG);
  }

  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const config = {} as RewardEngineConfig;
  for (const key of CONFIG_KEYS) {
    assignSection(config, key, mergeSection(key, stored.get(key)));
  }

  cache = { config, expiresAt: now + CACHE_TTL_MS };
  return config;
}

/**
 * Persists a full configuration. Validates first, writes one row per section
 * (upsert) and records an audit trail entry per changed section.
 */
export async function saveRewardConfig(
  incoming: RewardEngineConfig,
  changedById?: string
): Promise<RewardEngineConfig> {
  const current = await getRewardConfig(true);

  const normalized = {} as RewardEngineConfig;
  for (const key of CONFIG_KEYS) {
    assignSection(normalized, key, mergeSection(key, incoming[key] ?? current[key]));
  }

  validateRewardConfig(normalized);

  for (const key of CONFIG_KEYS) {
    const previousValue = current[key];
    const newValue = normalized[key];
    if (JSON.stringify(previousValue) === JSON.stringify(newValue)) continue;

    await prisma.rewardConfiguration.upsert({
      where: { key },
      update: { value: newValue as unknown as Prisma.InputJsonValue },
      create: {
        key,
        value: newValue as unknown as Prisma.InputJsonValue,
        description: `Reward configuration section: ${key}`,
      },
    });

    await prisma.rewardConfigurationAudit.create({
      data: {
        key,
        previousValue: previousValue as unknown as Prisma.InputJsonValue,
        newValue: newValue as unknown as Prisma.InputJsonValue,
        changedById: changedById ?? null,
      },
    });
  }

  invalidateRewardConfigCache();
  return getRewardConfig(true);
}

/** Recent configuration change history for the admin audit panel. */
export async function getRewardConfigHistory(take = 25) {
  return prisma.rewardConfigurationAudit.findMany({
    orderBy: { createdAt: 'desc' },
    take,
  });
}
