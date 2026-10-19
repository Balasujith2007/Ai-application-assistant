/**
 * CareerAI Gamification & Verified XP Configuration
 * Centralized, auditable configuration for all XP awards and milestones.
 */

export const XP_CONFIG = {
  // Suggested Initial Configurable Values
  DAILY_CHECKIN: 5,
  CODING_MILESTONE: 10,
  INTERNSHIP_APPLICATION_VERIFIED: 20,
  HACKATHON_MILESTONE: 25,
  STREAK_7DAY_BONUS: 25,

  // Institution Default Timezone
  TIMEZONE: process.env.APP_TIMEZONE || 'Asia/Kolkata',

  // Rate Limiting Config
  CHECKIN_RATE_LIMIT_MAX: 10, // Max 10 requests per minute per IP/User to prevent spamming
  CHECKIN_WINDOW_MS: 60 * 1000,
} as const;

export type XPEventType =
  | 'DAILY_CHECKIN'
  | 'CODING_MILESTONE'
  | 'INTERNSHIP_APPLICATION'
  | 'HACKATHON_MILESTONE'
  | 'STREAK_BONUS'
  | 'BADGE_BONUS'
  | 'REVERSAL';
