/**
 * Mystery Gift & Weekly Reward System Configuration
 * Centralized, auditable configuration for all reward mechanics
 */

export const REWARD_CONFIG = {
  // Weekly Distribution Schedule
  WEEKLY_DISTRIBUTION_DAY: 6, // 0 = Sunday, 6 = Saturday
  WEEKLY_DISTRIBUTION_HOUR: 9, // 9 AM in configured timezone
  TIMEZONE: process.env.APP_TIMEZONE || 'Asia/Kolkata',

  // Evaluation Period (Monday 00:00 to Friday 23:59:59)
  EVALUATION_START_DAY: 1, // Monday
  EVALUATION_END_DAY: 5, // Friday

  // Performance Scoring Weights (must sum to 100)
  SCORING_WEIGHTS: {
    LESSONS_COMPLETED: 25,
    LEARNING_CONSISTENCY: 20,
    ASSESSMENT_PERFORMANCE: 20,
    COURSE_PROJECT_PROGRESS: 15,
    STREAK_MAINTENANCE: 10,
    ACHIEVEMENTS_MILESTONES: 10,
  },

  // Weekly Score Tier Thresholds
  TIER_THRESHOLDS: {
    LEGENDARY: { min: 90, max: 100 },
    EPIC: { min: 75, max: 89 },
    RARE: { min: 55, max: 74 },
    COMMON: { min: 30, max: 54 },
    COMEBACK: { min: 0, max: 29 },
  },

  // Reward Value Ranges by Rarity
  REWARD_VALUES: {
    COMMON: {
      XP_MIN: 10,
      XP_MAX: 25,
      COINS_MIN: 0,
      COINS_MAX: 10,
    },
    RARE: {
      XP_MIN: 25,
      XP_MAX: 50,
      COINS_MIN: 10,
      COINS_MAX: 25,
      BADGE_PROBABILITY: 0.3,
    },
    EPIC: {
      XP_MIN: 50,
      XP_MAX: 100,
      COINS_MIN: 25,
      COINS_MAX: 50,
      STREAK_RESCUE_PROBABILITY: 0.25,
      BADGE_PROBABILITY: 0.4,
    },
    LEGENDARY: {
      XP_MIN: 100,
      XP_MAX: 200,
      COINS_MIN: 50,
      COINS_MAX: 100,
      EXCLUSIVE_BADGE_PROBABILITY: 0.6,
      PROFILE_FRAME_PROBABILITY: 0.3,
      LEADERBOARD_BOOST_PROBABILITY: 0.2,
    },
    COMEBACK: {
      XP_MIN: 5,
      XP_MAX: 15,
      COINS_MIN: 0,
      COINS_MAX: 5,
    },
  },

  // Reward Expiration (in days)
  REWARD_EXPIRY_DAYS: 30,

  // Token Expiration (in days)
  STREAK_RESCUE_TOKEN_EXPIRY_DAYS: 30,
  LEADERBOARD_BOOST_TOKEN_EXPIRY_DAYS: 14,

  // Comeback Eligibility
  COMEBACK_INACTIVE_DAYS_THRESHOLD: 7, // Consider inactive after 7 days

  // Streak Rescue Rules
  STREAK_RESCUE_MAX_TOKENS_PER_STUDENT: 3,
  STREAK_RESCUE_MIN_STREAK_LENGTH: 3, // Only rescue streaks of at least 3 days

  // Batch Processing
  WEEKLY_DISTRIBUTION_BATCH_SIZE: 100, // Process students in batches of 100
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 5000,

  // Top 3 Champion Rewards Configuration
  CHAMPION_REWARDS_ENABLED: true,
  CHAMPION_REWARDS_ADDITIONAL_TO_WEEKLY: false, // If true, champions get both weekly and champion gifts; if false, champion gift replaces weekly

  // 1st Place Champion Rewards
  CHAMPION_FIRST_PLACE: {
    XP_AMOUNT: 200,
    COIN_AMOUNT: 100,
    BADGE_ID: 'CHAMPION_FIRST_PLACE',
    BADGE_NAME: 'First Place Champion',
    BADGE_ICON: '👑',
    PROFILE_FRAME_URL: '/frames/champion-gold.png',
    TITLE: 'Champion',
    REWARD_RARITY: 'LEGENDARY',
  },

  // 2nd Place Champion Rewards
  CHAMPION_SECOND_PLACE: {
    XP_AMOUNT: 150,
    COIN_AMOUNT: 75,
    BADGE_ID: 'CHAMPION_SECOND_PLACE',
    BADGE_NAME: 'Second Place Champion',
    BADGE_ICON: '🥈',
    PROFILE_FRAME_URL: '/frames/champion-silver.png',
    TITLE: 'Runner-Up',
    REWARD_RARITY: 'EPIC',
  },

  // 3rd Place Champion Rewards
  CHAMPION_THIRD_PLACE: {
    XP_AMOUNT: 100,
    COIN_AMOUNT: 50,
    BADGE_ID: 'CHAMPION_THIRD_PLACE',
    BADGE_NAME: 'Third Place Champion',
    BADGE_ICON: '🥉',
    PROFILE_FRAME_URL: '/frames/champion-bronze.png',
    TITLE: 'Rising Champion',
    REWARD_RARITY: 'RARE',
  },
} as const;

export type RewardTier = 'LEGENDARY' | 'EPIC' | 'RARE' | 'COMMON' | 'COMEBACK';
