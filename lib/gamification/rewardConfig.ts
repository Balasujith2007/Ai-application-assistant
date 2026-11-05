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

  // Career Growth Scoring Weights (must sum to 100).
  // This platform is a Student Career Growth & Opportunity Platform, not an LMS,
  // so weekly evaluation measures internship/job applications, hackathon and
  // competition activity, and resume strength only.
  CAREER_GROWTH_WEIGHTS: {
    INTERNSHIP_APPLICATIONS: 35,
    HACKATHONS_COMPETITIONS: 35,
    RESUME_STRENGTH: 30,
  },

  // Internship / Job application milestone scores (0-100 scale).
  // Only the highest milestone reached per distinct application is counted.
  INTERNSHIP_MILESTONE_SCORES: {
    APPLICATION_SUBMITTED: 10,
    SHORTLISTED: 30,
    INTERVIEW_ATTENDED: 55,
    SELECTED: 80,
    INTERNSHIP_COMPLETED: 100,
  },

  // Hackathon / Competition milestone scores (0-100 scale).
  // Applying alone never earns winner-level points.
  HACKATHON_MILESTONE_SCORES: {
    APPLICATION_SUBMITTED: 5,
    REGISTRATION_CONFIRMED: 10,
    PARTICIPATION_COMPLETED: 30,
    PROJECT_SUBMITTED: 50,
    SHORTLISTED: 65,
    FINALIST: 80,
    WINNER: 100,
  },

  // Resume strength criteria (must sum to 100). Certifications has no backing
  // data model on this platform, so it is scored 0 and reported as unavailable.
  RESUME_CRITERIA_SCORES: {
    TECHNICAL_SKILLS: 20,
    PROJECTS: 20,
    INTERNSHIP_EXPERIENCE: 15,
    CERTIFICATIONS: 0,
    ACHIEVEMENTS: 10,
    PROFESSIONAL_EXPERIENCE: 10,
    RESUME_COMPLETENESS: 15,
    MEASURABLE_ACCOMPLISHMENTS: 5,
    IMPROVEMENT: 5,
  },

  // Configurable verification requirements.
  VERIFICATION_REQUIREMENTS: {
    REQUIRE_INTERNSHIP_VERIFICATION: false, // Application records carry status (MANUAL/COMPANY_EMAIL/EXTENSION/SYSTEM)
    REQUIRE_HACKATHON_VERIFICATION: true, // Registration must be verified/registered or backed by approved evidence
    REQUIRE_RESUME_REVIEW: false, // Mentor review adds resume completeness credit but is not mandatory
  },

  // Configurable milestone scoring caps (anti-gaming).
  SCORING_CAPS: {
    MAX_INTERNSHIP_MILESTONES_PER_WEEK: 3,
    MAX_HACKATHON_MILESTONES_PER_WEEK: 3,
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
  // Champion gifts are ALWAYS additional: the top 3 keep their regular weekly
  // Mystery Gift and also receive a position-specific Champion Gift. Regular
  // weekly gifts are never deleted or replaced.
  CHAMPION_REWARDS_ENABLED: true,

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
