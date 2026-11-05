/**
 * AI Career Platform — Professional 30-Badge Achievement Framework
 * -----------------------------------------------------------------
 * Badges are grouped into five categories (six badges each) and are awarded
 * ONLY from verified career events collected by the badge engine:
 *
 *   A. Career Excellence          — internship / job application milestones
 *   B. Innovation & Competition   — hackathons, competitions and projects
 *   C. Consistency & Streak       — daily career-activity streaks
 *   D. Professional Development   — profile, resume, skills, projects, experience
 *   E. Monthly Excellence         — monthly recognition (awarded by the monthly engine)
 *
 * Design notes
 *  - This platform is a Student Career Growth & Opportunity Platform, so LMS
 *    metrics (lessons, courses, learning streaks, coding-contest ratings) are
 *    deliberately NOT part of the framework.
 *  - Every threshold here is a DEFAULT. Super Admin can override the threshold,
 *    title, description, criteria text, icon, category, tier and active flag per
 *    badge through the persisted `BadgeCatalog` table (see `badgeCatalogService`).
 *  - `evaluate` stays in code (deterministic, testable) and receives the
 *    effective threshold so overrides immediately affect eligibility.
 */

export type BadgeCategory =
  | 'CAREER_EXCELLENCE'
  | 'INNOVATION'
  | 'CONSISTENCY'
  | 'PROFESSIONAL_DEVELOPMENT'
  | 'MONTHLY_EXCELLENCE';

export type BadgeTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
export type BadgeStatus = 'EARNED' | 'IN_PROGRESS' | 'LOCKED';

/** How a badge is awarded. MONTHLY badges are awarded by the monthly engine. */
export type BadgeAwardSource = 'ENGINE' | 'MONTHLY';

/**
 * Authoritative, verified student statistics. Every field is derived from real
 * platform records by `badgeEngine.gatherStudentStats` — never from unverified
 * student claims.
 */
export interface StudentActivityStats {
  // ── A. Career Excellence ──
  applicationsSubmitted: number;
  shortlistCount: number;
  interviewStageCount: number;
  interviewsAttendedCount: number;
  selectionCount: number;
  internshipCompletedCount: number;

  // ── B. Innovation & Competition ──
  competitionRegistrations: number;
  projectSubmissionsCount: number;
  finalistCount: number;
  podiumCount: number;
  winnerCount: number;

  // ── C. Consistency & Streak ──
  currentStreakDays: number;
  longestStreakDays: number;
  totalActiveDays: number;
  activeWeeksInMonth: number;

  // ── D. Professional Development ──
  profileCompleteness: number;
  resumeUploaded: boolean;
  resumeReviewed: boolean;
  resumeStrengthScore: number;
  resumeStrengthImproved: boolean;
  skillsCount: number;
  projectsCount: number;
  experiencesCount: number;

  // ── E. Monthly Excellence (populated by the monthly engine only) ──
  monthlyRank?: number | null;
  monthlyScore?: number | null;
  monthlyImprovement?: number | null;
  monthlyActiveWeeks?: number | null;
}

export interface BadgeEvaluation {
  isEligible: boolean;
  currentValue: number;
  targetValue: number;
  progressPercentage: number;
  /** False when progress genuinely cannot be measured (e.g. monthly awards). */
  progressAvailable: boolean;
}

export interface BadgeDefinition {
  id: string;
  title: string;
  category: BadgeCategory;
  tier: BadgeTier;
  description: string;
  criteria: string;
  icon: string; // Lucide icon name
  /** Default threshold; overridable by Super Admin in the BadgeCatalog table. */
  defaultThreshold: number;
  unit: string;
  xpReward: number;
  awardSource: BadgeAwardSource;
  evaluate: (stats: StudentActivityStats, threshold: number) => BadgeEvaluation;
}

export const BADGE_CATEGORIES: Array<{ key: BadgeCategory; label: string; icon: string }> = [
  { key: 'CAREER_EXCELLENCE', label: 'Career Excellence', icon: 'Briefcase' },
  { key: 'INNOVATION', label: 'Innovation & Competition', icon: 'Rocket' },
  { key: 'CONSISTENCY', label: 'Consistency & Streak', icon: 'Flame' },
  { key: 'PROFESSIONAL_DEVELOPMENT', label: 'Professional Development', icon: 'GraduationCap' },
  { key: 'MONTHLY_EXCELLENCE', label: 'Monthly Excellence', icon: 'Trophy' },
];

export const TIER_COLORS: Record<BadgeTier, { border: string; bg: string; text: string; ring: string }> = {
  BRONZE: {
    border: 'border-amber-300',
    bg: 'bg-gradient-to-br from-amber-100/90 to-amber-200/50',
    text: 'text-amber-800',
    ring: 'ring-amber-300/40',
  },
  SILVER: {
    border: 'border-slate-300',
    bg: 'bg-gradient-to-br from-slate-100 to-slate-200/60',
    text: 'text-slate-800',
    ring: 'ring-slate-300/40',
  },
  GOLD: {
    border: 'border-yellow-400',
    bg: 'bg-gradient-to-br from-yellow-100 to-amber-200/70',
    text: 'text-yellow-900',
    ring: 'ring-yellow-400/50',
  },
  PLATINUM: {
    border: 'border-cyan-400',
    bg: 'bg-gradient-to-br from-cyan-50 to-blue-200/60',
    text: 'text-cyan-900',
    ring: 'ring-cyan-400/50',
  },
  DIAMOND: {
    border: 'border-purple-400',
    bg: 'bg-gradient-to-br from-purple-100 to-indigo-200/70',
    text: 'text-purple-900',
    ring: 'ring-purple-400/50',
  },
};

/** Clamped percentage helper for measurable thresholds. */
function pct(current: number, target: number): number {
  if (target <= 0) return current > 0 ? 100 : 0;
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
}

/** Builds an evaluation for a measurable (countable) threshold. */
function measurable(current: number, threshold: number): BadgeEvaluation {
  return {
    isEligible: current >= threshold,
    currentValue: current,
    targetValue: threshold,
    progressPercentage: pct(current, threshold),
    progressAvailable: true,
  };
}

/** Builds an evaluation for a binary (achieved / not achieved) threshold. */
function binary(done: boolean): BadgeEvaluation {
  return {
    isEligible: done,
    currentValue: done ? 1 : 0,
    targetValue: 1,
    progressPercentage: done ? 100 : 0,
    progressAvailable: true,
  };
}

/** Monthly awards: eligibility is decided by the monthly engine (rank based). */
function monthly(eligible: boolean): BadgeEvaluation {
  return {
    isEligible: eligible,
    currentValue: eligible ? 1 : 0,
    targetValue: 1,
    progressPercentage: 0,
    progressAvailable: false,
  };
}

export const BADGE_CATALOG: BadgeDefinition[] = [
  // =========================================================================
  // A. CAREER EXCELLENCE — verified internship / job application transitions
  // =========================================================================
  {
    id: 'career-first-step',
    title: 'First Step',
    category: 'CAREER_EXCELLENCE',
    tier: 'BRONZE',
    description: 'Submit your first verified internship or job application.',
    criteria: 'One verified internship/job application recorded on your profile.',
    icon: 'Send',
    defaultThreshold: 1,
    unit: 'application',
    xpReward: 100,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.applicationsSubmitted, t),
  },
  {
    id: 'career-shortlist-achiever',
    title: 'Shortlist Achiever',
    category: 'CAREER_EXCELLENCE',
    tier: 'SILVER',
    description: 'Get shortlisted for an internship or job you applied to.',
    criteria: 'An application reached the SHORTLISTED status.',
    icon: 'ListChecks',
    defaultThreshold: 1,
    unit: 'shortlist',
    xpReward: 200,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.shortlistCount, t),
  },
  {
    id: 'career-interview-ready',
    title: 'Interview Ready',
    category: 'CAREER_EXCELLENCE',
    tier: 'SILVER',
    description: 'Advance past screening into a technical or HR interview round.',
    criteria: 'An application advanced to the interview stage (verified status change).',
    icon: 'UserCheck',
    defaultThreshold: 1,
    unit: 'round',
    xpReward: 250,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.interviewStageCount, t),
  },
  {
    id: 'career-interview-performer',
    title: 'Interview Performer',
    category: 'CAREER_EXCELLENCE',
    tier: 'GOLD',
    description: 'Successfully attend and complete a verified interview.',
    criteria: 'A verified interview record exists for one of your applications.',
    icon: 'Presentation',
    defaultThreshold: 1,
    unit: 'interview',
    xpReward: 350,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.interviewsAttendedCount, t),
  },
  {
    id: 'career-breakthrough',
    title: 'Career Breakthrough',
    category: 'CAREER_EXCELLENCE',
    tier: 'PLATINUM',
    description: 'Get selected for an internship or a full-time role.',
    criteria: 'An application reached the SELECTED status.',
    icon: 'Star',
    defaultThreshold: 1,
    unit: 'selection',
    xpReward: 600,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.selectionCount, t),
  },
  {
    id: 'career-professional-starter',
    title: 'Professional Starter',
    category: 'CAREER_EXCELLENCE',
    tier: 'DIAMOND',
    description: 'Complete an internship and add it as professional experience.',
    criteria: 'A selected internship is confirmed by a matching experience entry in your profile.',
    icon: 'Rocket',
    defaultThreshold: 1,
    unit: 'completion',
    xpReward: 900,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.internshipCompletedCount, t),
  },

  // =========================================================================
  // B. INNOVATION & COMPETITION — verified hackathon / competition outcomes
  // =========================================================================
  {
    id: 'innovation-hackathon-explorer',
    title: 'Hackathon Explorer',
    category: 'INNOVATION',
    tier: 'BRONZE',
    description: 'Register and take part in your first hackathon or competition.',
    criteria: 'One verified hackathon/competition registration.',
    icon: 'Compass',
    defaultThreshold: 1,
    unit: 'registration',
    xpReward: 150,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.competitionRegistrations, t),
  },
  {
    id: 'innovation-project-builder',
    title: 'Project Builder',
    category: 'INNOVATION',
    tier: 'SILVER',
    description: 'Submit a project to a hackathon or competition.',
    criteria: 'A verified project submission in a hackathon/competition.',
    icon: 'Hammer',
    defaultThreshold: 1,
    unit: 'submission',
    xpReward: 300,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.projectSubmissionsCount, t),
  },
  {
    id: 'innovation-finalist',
    title: 'Innovation Finalist',
    category: 'INNOVATION',
    tier: 'GOLD',
    description: 'Reach the finalist round of a hackathon or competition.',
    criteria: 'A verified finalist outcome for a competition registration.',
    icon: 'Medal',
    defaultThreshold: 1,
    unit: 'finalist',
    xpReward: 450,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.finalistCount, t),
  },
  {
    id: 'innovation-podium-finisher',
    title: 'Podium Finisher',
    category: 'INNOVATION',
    tier: 'GOLD',
    description: 'Finish on the podium (2nd or 3rd place) in a competition.',
    criteria: 'A verified 2nd or 3rd place outcome for a competition registration.',
    icon: 'Award',
    defaultThreshold: 1,
    unit: 'podium',
    xpReward: 550,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.podiumCount, t),
  },
  {
    id: 'innovation-competition-champion',
    title: 'Competition Champion',
    category: 'INNOVATION',
    tier: 'PLATINUM',
    description: 'Win a hackathon or competition (1st place).',
    criteria: 'A verified winner / 1st-place outcome for a competition registration.',
    icon: 'Trophy',
    defaultThreshold: 1,
    unit: 'win',
    xpReward: 800,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.winnerCount, t),
  },
  {
    id: 'innovation-elite',
    title: 'Innovation Elite',
    category: 'INNOVATION',
    tier: 'DIAMOND',
    description: 'Sustain top-tier innovation results across multiple competitions.',
    criteria: 'Three or more verified finalist-or-better outcomes across competitions.',
    icon: 'Crown',
    defaultThreshold: 3,
    unit: 'top finishes',
    xpReward: 1000,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.finalistCount + s.podiumCount + s.winnerCount, t),
  },

  // =========================================================================
  // C. CONSISTENCY & STREAK — verified daily career-activity streaks (IST)
  // =========================================================================
  {
    id: 'streak-consistency-starter',
    title: 'Consistency Starter',
    category: 'CONSISTENCY',
    tier: 'BRONZE',
    description: 'Maintain a 5-day career activity streak.',
    criteria: '5 consecutive days of qualifying career activity (Asia/Kolkata).',
    icon: 'Flame',
    defaultThreshold: 5,
    unit: 'days',
    xpReward: 75,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.longestStreakDays, t),
  },
  {
    id: 'streak-consistency-pro',
    title: 'Consistency Pro',
    category: 'CONSISTENCY',
    tier: 'SILVER',
    description: 'Maintain a 15-day career activity streak.',
    criteria: '15 consecutive days of qualifying career activity (Asia/Kolkata).',
    icon: 'Flame',
    defaultThreshold: 15,
    unit: 'days',
    xpReward: 200,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.longestStreakDays, t),
  },
  {
    id: 'streak-consistency-master',
    title: 'Consistency Master',
    category: 'CONSISTENCY',
    tier: 'GOLD',
    description: 'Maintain a 30-day career activity streak.',
    criteria: '30 consecutive days of qualifying career activity (Asia/Kolkata).',
    icon: 'Flame',
    defaultThreshold: 30,
    unit: 'days',
    xpReward: 500,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.longestStreakDays, t),
  },
  {
    id: 'streak-consistency-elite',
    title: 'Consistency Elite',
    category: 'CONSISTENCY',
    tier: 'PLATINUM',
    description: 'Maintain a 50-day career activity streak.',
    criteria: '50 consecutive days of qualifying career activity (Asia/Kolkata).',
    icon: 'Zap',
    defaultThreshold: 50,
    unit: 'days',
    xpReward: 800,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.longestStreakDays, t),
  },
  {
    id: 'streak-century-achiever',
    title: 'Century Achiever',
    category: 'CONSISTENCY',
    tier: 'DIAMOND',
    description: 'Maintain a 100-day career activity streak.',
    criteria: '100 consecutive days of qualifying career activity (Asia/Kolkata).',
    icon: 'CalendarCheck',
    defaultThreshold: 100,
    unit: 'days',
    xpReward: 1500,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.longestStreakDays, t),
  },
  {
    id: 'streak-unstoppable',
    title: 'Unstoppable',
    category: 'CONSISTENCY',
    tier: 'DIAMOND',
    description: 'Maintain a 180-day career activity streak.',
    criteria: '180 consecutive days of qualifying career activity (Asia/Kolkata).',
    icon: 'Infinity',
    defaultThreshold: 180,
    unit: 'days',
    xpReward: 2500,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.longestStreakDays, t),
  },

  // =========================================================================
  // D. PROFESSIONAL DEVELOPMENT — real profile / resume / portfolio records
  // =========================================================================
  {
    id: 'dev-profile-complete',
    title: 'Profile Complete',
    category: 'PROFESSIONAL_DEVELOPMENT',
    tier: 'BRONZE',
    description: 'Complete your professional profile to a recruiter-ready level.',
    criteria: 'Profile completeness of 80% or higher across key fields.',
    icon: 'UserCheck',
    defaultThreshold: 80,
    unit: '% complete',
    xpReward: 150,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.profileCompleteness, t),
  },
  {
    id: 'dev-resume-ready',
    title: 'Resume Ready',
    category: 'PROFESSIONAL_DEVELOPMENT',
    tier: 'SILVER',
    description: 'Upload a resume and have it reviewed for professional use.',
    criteria: 'An active resume uploaded and marked as reviewed.',
    icon: 'FileText',
    defaultThreshold: 1,
    unit: 'resume',
    xpReward: 250,
    awardSource: 'ENGINE',
    evaluate: (s) => binary(s.resumeUploaded && s.resumeReviewed),
  },
  {
    id: 'dev-skill-builder',
    title: 'Skill Builder',
    category: 'PROFESSIONAL_DEVELOPMENT',
    tier: 'BRONZE',
    description: 'Add technical skills to your professional profile.',
    criteria: 'Five or more technical skills listed on your profile.',
    icon: 'Wrench',
    defaultThreshold: 5,
    unit: 'skills',
    xpReward: 150,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.skillsCount, t),
  },
  {
    id: 'dev-project-portfolio',
    title: 'Project Portfolio',
    category: 'PROFESSIONAL_DEVELOPMENT',
    tier: 'SILVER',
    description: 'Build a portfolio of professional projects.',
    criteria: 'Four or more projects added to your profile.',
    icon: 'FolderOpen',
    defaultThreshold: 4,
    unit: 'projects',
    xpReward: 300,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.projectsCount, t),
  },
  {
    id: 'dev-experience-builder',
    title: 'Experience Builder',
    category: 'PROFESSIONAL_DEVELOPMENT',
    tier: 'GOLD',
    description: 'Add professional experience to your profile.',
    criteria: 'One or more professional experience entries (internship, job, etc.).',
    icon: 'Briefcase',
    defaultThreshold: 1,
    unit: 'experience',
    xpReward: 400,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.experiencesCount, t),
  },
  {
    id: 'dev-career-improver',
    title: 'Career Improver',
    category: 'PROFESSIONAL_DEVELOPMENT',
    tier: 'GOLD',
    description: 'Meaningfully improve your resume strength over time.',
    criteria: 'Resume strength improved by 10+ points between evaluations.',
    icon: 'TrendingUp',
    defaultThreshold: 10,
    unit: 'points',
    xpReward: 350,
    awardSource: 'ENGINE',
    evaluate: (s) => binary(s.resumeStrengthImproved),
  },

  // =========================================================================
  // E. MONTHLY EXCELLENCE — awarded by the monthly recognition engine
  // =========================================================================
  {
    id: 'monthly-gold-champion',
    title: 'Gold Champion',
    category: 'MONTHLY_EXCELLENCE',
    tier: 'DIAMOND',
    description: 'Finish the month as the #1 student on the career leaderboard.',
    criteria: 'Monthly career performance rank #1 (verified career performance only).',
    icon: 'Crown',
    defaultThreshold: 1,
    unit: 'rank',
    xpReward: 1500,
    awardSource: 'MONTHLY',
    evaluate: (s) => monthly(s.monthlyRank === 1),
  },
  {
    id: 'monthly-silver-champion',
    title: 'Silver Champion',
    category: 'MONTHLY_EXCELLENCE',
    tier: 'PLATINUM',
    description: 'Finish the month as the #2 student on the career leaderboard.',
    criteria: 'Monthly career performance rank #2 (verified career performance only).',
    icon: 'Medal',
    defaultThreshold: 2,
    unit: 'rank',
    xpReward: 1000,
    awardSource: 'MONTHLY',
    evaluate: (s) => monthly(s.monthlyRank === 2),
  },
  {
    id: 'monthly-bronze-champion',
    title: 'Bronze Champion',
    category: 'MONTHLY_EXCELLENCE',
    tier: 'GOLD',
    description: 'Finish the month as the #3 student on the career leaderboard.',
    criteria: 'Monthly career performance rank #3 (verified career performance only).',
    icon: 'Award',
    defaultThreshold: 3,
    unit: 'rank',
    xpReward: 700,
    awardSource: 'MONTHLY',
    evaluate: (s) => monthly(s.monthlyRank === 3),
  },
  {
    id: 'monthly-career-excellence',
    title: 'Career Excellence',
    category: 'MONTHLY_EXCELLENCE',
    tier: 'PLATINUM',
    description: 'Reach an exceptional monthly career performance score.',
    criteria: 'Monthly career performance score of 85 or higher.',
    icon: 'Sparkles',
    defaultThreshold: 85,
    unit: 'score',
    xpReward: 900,
    awardSource: 'MONTHLY',
    evaluate: (s) => monthly(typeof s.monthlyScore === 'number' && s.monthlyScore >= 85),
  },
  {
    id: 'monthly-consistent-performer',
    title: 'Consistent Performer',
    category: 'MONTHLY_EXCELLENCE',
    tier: 'GOLD',
    description: 'Stay active across every week of the month.',
    criteria: 'Qualifying career activity recorded in 4 or more distinct weeks of the month.',
    icon: 'CalendarRange',
    defaultThreshold: 4,
    unit: 'weeks',
    xpReward: 600,
    awardSource: 'MONTHLY',
    evaluate: (s) => monthly(typeof s.monthlyActiveWeeks === 'number' && s.monthlyActiveWeeks >= 4),
  },
  {
    id: 'monthly-rising-star',
    title: 'Rising Star',
    category: 'MONTHLY_EXCELLENCE',
    tier: 'SILVER',
    description: 'Show the strongest month-over-month career growth.',
    criteria: 'Monthly career performance improved by 10 or more points versus the previous month.',
    icon: 'TrendingUp',
    defaultThreshold: 10,
    unit: 'points',
    xpReward: 500,
    awardSource: 'MONTHLY',
    evaluate: (s) => monthly(typeof s.monthlyImprovement === 'number' && s.monthlyImprovement >= 10),
  },
];

export const BADGE_DEFINITIONS = BADGE_CATALOG;

export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGE_CATALOG.find((b) => b.id === id);
}

/** Badges awarded by the standard per-student evaluation engine. */
export const ENGINE_BADGES = BADGE_CATALOG.filter((b) => b.awardSource === 'ENGINE');

/** Badges awarded exclusively by the monthly recognition engine. */
export const MONTHLY_BADGES = BADGE_CATALOG.filter((b) => b.awardSource === 'MONTHLY');

/**
 * Legacy badge IDs retired by the 30-badge professional framework. These stop
 * being awarded but their historical `StudentBadge` / `AchievementHistory`
 * records are preserved. Overlapping legacy badges are migrated to the new IDs
 * by the migration artifact.
 */
export const RETIRED_BADGE_IDS = [
  // LMS / coding-platform metrics
  'problem-solver',
  'code-challenger',
  'algorithm-specialist',
  'skill-python',
  'skill-sql',
  'skill-dsa',
  'skill-web-dev',
  'xp-explorer',
  'xp-challenger',
  'xp-achiever',
  'xp-master',
  'xp-elite',
  // Superseded career/consistency definitions (migrated to new IDs)
  '3-day-starter',
  '7-day-streak',
  '30-day-consistency',
  'monthly-momentum',
  'comeback-champion',
  'application-starter',
  'application-pro',
  'hackathon-rookie',
  'innovation-builder',
  'interview-ready',
  'placement-progressor',
  'offer-achiever',
  'first-shortlist',
  'first-interview-attended',
  'first-internship-selection',
  'first-job-selection',
  'hackathon-project-submitted',
  'hackathon-finalist',
  'hackathon-winner',
  'multiple-hackathon-participation',
  'profile-completed',
  'first-project-added',
  'technical-skills-milestone',
  'resume-strength-improved',
  'professional-experience-added',
] as const;

/** Maps retired legacy badge IDs to their replacement in the 30-badge framework. */
export const LEGACY_BADGE_MIGRATION: Record<string, string> = {
  'application-starter': 'career-first-step',
  'first-shortlist': 'career-shortlist-achiever',
  'interview-ready': 'career-interview-ready',
  'first-interview-attended': 'career-interview-performer',
  'first-internship-selection': 'career-breakthrough',
  'first-job-selection': 'career-breakthrough',
  'offer-achiever': 'career-breakthrough',
  'placement-progressor': 'career-interview-performer',
  'application-pro': 'career-first-step',
  'hackathon-rookie': 'innovation-hackathon-explorer',
  'multiple-hackathon-participation': 'innovation-hackathon-explorer',
  'hackathon-project-submitted': 'innovation-project-builder',
  'innovation-builder': 'innovation-project-builder',
  'hackathon-finalist': 'innovation-finalist',
  'hackathon-winner': 'innovation-competition-champion',
  '3-day-starter': 'streak-consistency-starter',
  '7-day-streak': 'streak-consistency-starter',
  '30-day-consistency': 'streak-consistency-master',
  'monthly-momentum': 'monthly-consistent-performer',
  'comeback-champion': 'streak-consistency-starter',
  'profile-completed': 'dev-profile-complete',
  'resume-strength-improved': 'dev-career-improver',
  'technical-skills-milestone': 'dev-skill-builder',
  'first-project-added': 'dev-project-portfolio',
  'professional-experience-added': 'dev-experience-builder',
};
