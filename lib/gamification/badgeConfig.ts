/**
 * CareerAI Configurable Badge & Achievement Definitions
 * 
 * Configurable, criteria-based gamification structure supporting:
 * - Coding Performance (Problem Solver, Code Challenger, Algorithm Specialist)
 * - Consistency (3-Day Starter, 7-Day Streak, 30-Day Consistency, Monthly Momentum, Comeback Champion)
 * - Skill Progress (Python, SQL, DSA, Web Development)
 * - Career Activities (Application Starter, Application Pro, Hackathon Rookie, Innovation Builder, Interview Ready, Placement Progressor, Offer Achiever)
 * - XP Milestones (XP Explorer, XP Challenger, XP Achiever, XP Master, XP Elite)
 */

export type BadgeCategory = 'CODING' | 'CONSISTENCY' | 'SKILL' | 'CAREER' | 'XP';
export type BadgeTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
export type BadgeStatus = 'EARNED' | 'IN_PROGRESS' | 'LOCKED';

export interface StudentActivityStats {
  problemsSolved: number;
  contestsCount: number;
  highestRating: number;
  currentStreakDays: number;
  longestStreakDays: number;
  totalActiveDays: number;
  activeWeeksInMonth: number;
  comebackDays: number;
  hasPythonSkill: boolean;
  hasSqlSkill: boolean;
  hasDsaSkill: boolean;
  hasWebDevSkill: boolean;
  applicationsCount: number;
  hackathonsCount: number;
  hackathonProjectSubmitted: boolean;
  interviewsCount: number;
  offersCount: number;
  totalXp: number;
}

export interface BadgeDefinition {
  id: string;
  title: string;
  category: BadgeCategory;
  tier: BadgeTier;
  description: string;
  criteria: string;
  icon: string; // Lucide icon name
  targetValue: number;
  unit: string;
  xpReward: number;
  evaluate: (stats: StudentActivityStats) => {
    isEligible: boolean;
    currentValue: number;
    targetValue: number;
    progressPercentage: number;
  };
}

export const BADGE_CATEGORIES: Array<{ key: BadgeCategory; label: string; icon: string }> = [
  { key: 'CODING', label: 'Coding Performance', icon: 'Code' },
  { key: 'CONSISTENCY', label: 'Consistency', icon: 'Flame' },
  { key: 'SKILL', label: 'Skill Progress', icon: 'Cpu' },
  { key: 'CAREER', label: 'Career Activities', icon: 'Briefcase' },
  { key: 'XP', label: 'XP Milestones', icon: 'Trophy' },
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

export const BADGE_CATALOG: BadgeDefinition[] = [
  // =========================================================================
  // A. CODING PERFORMANCE
  // =========================================================================
  {
    id: 'problem-solver',
    title: 'Problem Solver',
    category: 'CODING',
    tier: 'BRONZE',
    description: 'Solve 25+ verified competitive programming or practice problems.',
    criteria: '25+ problems verified from connected LeetCode, Codeforces, or CodeChef profiles.',
    icon: 'Code',
    targetValue: 25,
    unit: 'problems',
    xpReward: 100,
    evaluate: (s) => {
      const cur = s.problemsSolved || 0;
      const target = 25;
      return {
        isEligible: cur >= target,
        currentValue: cur,
        targetValue: target,
        progressPercentage: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },
  {
    id: 'code-challenger',
    title: 'Code Challenger',
    category: 'CODING',
    tier: 'SILVER',
    description: 'Participate in 3+ verified official contests or solve 100+ problems.',
    criteria: 'Participated in at least 3 rated contests on supported platforms.',
    icon: 'Zap',
    targetValue: 3,
    unit: 'contests',
    xpReward: 250,
    evaluate: (s) => {
      const cur = s.contestsCount || 0;
      const target = 3;
      const altEligible = (s.problemsSolved || 0) >= 100;
      return {
        isEligible: cur >= target || altEligible,
        currentValue: altEligible ? Math.max(cur, target) : cur,
        targetValue: target,
        progressPercentage: Math.min(100, altEligible ? 100 : Math.round((cur / target) * 100)),
      };
    },
  },
  {
    id: 'algorithm-specialist',
    title: 'Algorithm Specialist',
    category: 'CODING',
    tier: 'GOLD',
    description: 'Achieve a verified competitive contest rating of 1400+.',
    criteria: 'Verified 1400+ rating on Codeforces (Specialist), LeetCode (1600+), or CodeChef (3-Star).',
    icon: 'Terminal',
    targetValue: 1400,
    unit: 'rating',
    xpReward: 500,
    evaluate: (s) => {
      const cur = s.highestRating || 0;
      const target = 1400;
      return {
        isEligible: cur >= target,
        currentValue: cur,
        targetValue: target,
        progressPercentage: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },

  // =========================================================================
  // B. CONSISTENCY
  // =========================================================================
  {
    id: '3-day-starter',
    title: '3-Day Starter',
    category: 'CONSISTENCY',
    tier: 'BRONZE',
    description: 'Complete qualifying learning or coding activity for 3 consecutive days.',
    criteria: 'Active on 3 consecutive days in Asia/Kolkata timezone.',
    icon: 'Flame',
    targetValue: 3,
    unit: 'days',
    xpReward: 50,
    evaluate: (s) => {
      const cur = Math.max(s.currentStreakDays || 0, s.longestStreakDays || 0);
      const target = 3;
      return {
        isEligible: cur >= target,
        currentValue: cur,
        targetValue: target,
        progressPercentage: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },
  {
    id: '7-day-streak',
    title: '7-Day Streak',
    category: 'CONSISTENCY',
    tier: 'SILVER',
    description: 'Maintain an unbroken 7-day consistency streak.',
    criteria: '7 consecutive days of verified learning; badge is retained permanently even if streak later resets.',
    icon: 'Flame',
    targetValue: 7,
    unit: 'days',
    xpReward: 150,
    evaluate: (s) => {
      const cur = Math.max(s.currentStreakDays || 0, s.longestStreakDays || 0);
      const target = 7;
      return {
        isEligible: cur >= target,
        currentValue: cur,
        targetValue: target,
        progressPercentage: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },
  {
    id: '30-day-consistency',
    title: '30-Day Consistency',
    category: 'CONSISTENCY',
    tier: 'GOLD',
    description: 'Log 30 active days of verified learning or maintain a 30-day streak.',
    criteria: 'Accumulate 30 unique active days of learning in your consistency ledger.',
    icon: 'CalendarCheck',
    targetValue: 30,
    unit: 'days',
    xpReward: 500,
    evaluate: (s) => {
      const cur = Math.max(s.totalActiveDays || 0, s.longestStreakDays || 0);
      const target = 30;
      return {
        isEligible: cur >= target,
        currentValue: cur,
        targetValue: target,
        progressPercentage: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },
  {
    id: 'monthly-momentum',
    title: 'Monthly Momentum',
    category: 'CONSISTENCY',
    tier: 'GOLD',
    description: 'Maintain verified activity across 4 distinct weeks in the current month.',
    criteria: 'Recorded qualifying activity in at least 4 calendar weeks this month.',
    icon: 'TrendingUp',
    targetValue: 4,
    unit: 'weeks',
    xpReward: 300,
    evaluate: (s) => {
      const cur = s.activeWeeksInMonth || 0;
      const target = 4;
      return {
        isEligible: cur >= target,
        currentValue: cur,
        targetValue: target,
        progressPercentage: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },
  {
    id: 'comeback-champion',
    title: 'Comeback Champion',
    category: 'CONSISTENCY',
    tier: 'SILVER',
    description: 'Resume activity after inactivity or streak freeze and complete 3 new active days.',
    criteria: 'Logged 3+ active days after a pause or streak reset.',
    icon: 'RotateCw',
    targetValue: 3,
    unit: 'days',
    xpReward: 200,
    evaluate: (s) => {
      const cur = s.comebackDays || (s.currentStreakDays >= 3 ? 3 : s.currentStreakDays);
      const target = 3;
      return {
        isEligible: cur >= target,
        currentValue: cur,
        targetValue: target,
        progressPercentage: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },

  // =========================================================================
  // C. SKILL PROGRESS
  // =========================================================================
  {
    id: 'skill-python',
    title: 'Python Specialist',
    category: 'SKILL',
    tier: 'BRONZE',
    description: 'Demonstrate verified Python proficiency in profile or verified problems.',
    criteria: 'Python skill verified in profile and backed by code solutions or verified repositories.',
    icon: 'Terminal',
    targetValue: 1,
    unit: 'verified',
    xpReward: 150,
    evaluate: (s) => {
      const cur = s.hasPythonSkill ? 1 : 0;
      return {
        isEligible: cur === 1,
        currentValue: cur,
        targetValue: 1,
        progressPercentage: cur === 1 ? 100 : 0,
      };
    },
  },
  {
    id: 'skill-sql',
    title: 'SQL Maestro',
    category: 'SKILL',
    tier: 'BRONZE',
    description: 'Demonstrate relational database and SQL query proficiency.',
    criteria: 'SQL or Database skills verified in profile through assessments or projects.',
    icon: 'Database',
    targetValue: 1,
    unit: 'verified',
    xpReward: 150,
    evaluate: (s) => {
      const cur = s.hasSqlSkill ? 1 : 0;
      return {
        isEligible: cur === 1,
        currentValue: cur,
        targetValue: 1,
        progressPercentage: cur === 1 ? 100 : 0,
      };
    },
  },
  {
    id: 'skill-dsa',
    title: 'DSA Master',
    category: 'SKILL',
    tier: 'GOLD',
    description: 'Master Data Structures & Algorithms with verified problem solving and profile validation.',
    criteria: 'DSA verified in profile skills and backed by 25+ verified solved problems.',
    icon: 'Cpu',
    targetValue: 1,
    unit: 'verified',
    xpReward: 300,
    evaluate: (s) => {
      const cur = s.hasDsaSkill || s.problemsSolved >= 25 ? 1 : 0;
      return {
        isEligible: cur === 1,
        currentValue: cur,
        targetValue: 1,
        progressPercentage: cur === 1 ? 100 : 0,
      };
    },
  },
  {
    id: 'skill-web-dev',
    title: 'Web Development Pro',
    category: 'SKILL',
    tier: 'SILVER',
    description: 'Demonstrate verified full-stack or frontend web development capabilities.',
    criteria: 'Web Development / React / Node.js skills verified in profile.',
    icon: 'Globe',
    targetValue: 1,
    unit: 'verified',
    xpReward: 200,
    evaluate: (s) => {
      const cur = s.hasWebDevSkill ? 1 : 0;
      return {
        isEligible: cur === 1,
        currentValue: cur,
        targetValue: 1,
        progressPercentage: cur === 1 ? 100 : 0,
      };
    },
  },

  // =========================================================================
  // D. CAREER ACTIVITIES
  // =========================================================================
  {
    id: 'application-starter',
    title: 'Application Starter',
    category: 'CAREER',
    tier: 'BRONZE',
    description: 'Submit your first verified internship or placement drive application.',
    criteria: 'Completed 1 verified job, internship, or campus drive application.',
    icon: 'Send',
    targetValue: 1,
    unit: 'application',
    xpReward: 100,
    evaluate: (s) => {
      const cur = s.applicationsCount || 0;
      const target = 1;
      return {
        isEligible: cur >= target,
        currentValue: cur,
        targetValue: target,
        progressPercentage: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },
  {
    id: 'application-pro',
    title: 'Application Pro',
    category: 'CAREER',
    tier: 'SILVER',
    description: 'Actively pursue career opportunities with 10+ submitted applications.',
    criteria: 'Complete and submit 10 verified placement drive or internship applications.',
    icon: 'Briefcase',
    targetValue: 10,
    unit: 'applications',
    xpReward: 300,
    evaluate: (s) => {
      const cur = s.applicationsCount || 0;
      const target = 10;
      return {
        isEligible: cur >= target,
        currentValue: cur,
        targetValue: target,
        progressPercentage: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },
  {
    id: 'hackathon-rookie',
    title: 'Hackathon Rookie',
    category: 'CAREER',
    tier: 'BRONZE',
    description: 'Participate in your first campus or national hackathon competition.',
    criteria: 'Verified registration and participation in a collegiate or national hackathon.',
    icon: 'Sparkles',
    targetValue: 1,
    unit: 'hackathon',
    xpReward: 150,
    evaluate: (s) => {
      const cur = s.hackathonsCount || 0;
      const target = 1;
      return {
        isEligible: cur >= target,
        currentValue: cur,
        targetValue: target,
        progressPercentage: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },
  {
    id: 'innovation-builder',
    title: 'Innovation Builder',
    category: 'CAREER',
    tier: 'GOLD',
    description: 'Submit a verified project or qualify as a finalist in a hackathon.',
    criteria: 'Hackathon project submission confirmed or shortlisted in competitive review.',
    icon: 'Layers',
    targetValue: 1,
    unit: 'project',
    xpReward: 400,
    evaluate: (s) => {
      const cur = s.hackathonProjectSubmitted ? 1 : 0;
      return {
        isEligible: cur === 1,
        currentValue: cur,
        targetValue: 1,
        progressPercentage: cur === 1 ? 100 : 0,
      };
    },
  },
  {
    id: 'interview-ready',
    title: 'Interview Ready',
    category: 'CAREER',
    tier: 'SILVER',
    description: 'Advance through initial screenings and enter technical interview rounds.',
    criteria: 'At least 1 technical interview round officially scheduled or confirmed.',
    icon: 'Users',
    targetValue: 1,
    unit: 'interview',
    xpReward: 250,
    evaluate: (s) => {
      const cur = s.interviewsCount || 0;
      const target = 1;
      return {
        isEligible: cur >= target,
        currentValue: cur,
        targetValue: target,
        progressPercentage: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },
  {
    id: 'placement-progressor',
    title: 'Placement Progressor',
    category: 'CAREER',
    tier: 'PLATINUM',
    description: 'Demonstrate high placement readiness with 2+ shortlists or interview rounds.',
    criteria: 'Shortlisted or completed multiple technical/HR interview stages.',
    icon: 'ShieldCheck',
    targetValue: 2,
    unit: 'interviews',
    xpReward: 500,
    evaluate: (s) => {
      const cur = s.interviewsCount || 0;
      const target = 2;
      return {
        isEligible: cur >= target,
        currentValue: cur,
        targetValue: target,
        progressPercentage: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },
  {
    id: 'offer-achiever',
    title: 'Offer Achiever',
    category: 'CAREER',
    tier: 'DIAMOND',
    description: 'Secure a verified internship or full-time placement offer.',
    criteria: 'Official job offer letter verified by Placement Cell / HOD.',
    icon: 'Trophy',
    targetValue: 1,
    unit: 'offer',
    xpReward: 1000,
    evaluate: (s) => {
      const cur = s.offersCount || 0;
      const target = 1;
      return {
        isEligible: cur >= target,
        currentValue: cur,
        targetValue: target,
        progressPercentage: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },

  // =========================================================================
  // E. XP MILESTONES
  // =========================================================================
  {
    id: 'xp-explorer',
    title: 'XP Explorer',
    category: 'XP',
    tier: 'BRONZE',
    description: 'Accumulate 500+ verified CareerAI XP points.',
    criteria: 'Earn 500 total points in PointsLedger from verified performance.',
    icon: 'Target',
    targetValue: 500,
    unit: 'XP',
    xpReward: 50,
    evaluate: (s) => {
      const cur = s.totalXp || 0;
      const target = 500;
      return {
        isEligible: cur >= target,
        currentValue: cur,
        targetValue: target,
        progressPercentage: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },
  {
    id: 'xp-challenger',
    title: 'XP Challenger',
    category: 'XP',
    tier: 'SILVER',
    description: 'Accumulate 1,500+ verified CareerAI XP points.',
    criteria: 'Earn 1,500 total points in PointsLedger from verified performance.',
    icon: 'Zap',
    targetValue: 1500,
    unit: 'XP',
    xpReward: 150,
    evaluate: (s) => {
      const cur = s.totalXp || 0;
      const target = 1500;
      return {
        isEligible: cur >= target,
        currentValue: cur,
        targetValue: target,
        progressPercentage: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },
  {
    id: 'xp-achiever',
    title: 'XP Achiever',
    category: 'XP',
    tier: 'GOLD',
    description: 'Accumulate 3,000+ verified CareerAI XP points.',
    criteria: 'Earn 3,000 total points in PointsLedger from verified performance.',
    icon: 'Medal',
    targetValue: 3000,
    unit: 'XP',
    xpReward: 300,
    evaluate: (s) => {
      const cur = s.totalXp || 0;
      const target = 3000;
      return {
        isEligible: cur >= target,
        currentValue: cur,
        targetValue: target,
        progressPercentage: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },
  {
    id: 'xp-master',
    title: 'XP Master',
    category: 'XP',
    tier: 'PLATINUM',
    description: 'Accumulate 5,000+ verified CareerAI XP points.',
    criteria: 'Earn 5,000 total points in PointsLedger from verified performance.',
    icon: 'Crown',
    targetValue: 5000,
    unit: 'XP',
    xpReward: 500,
    evaluate: (s) => {
      const cur = s.totalXp || 0;
      const target = 5000;
      return {
        isEligible: cur >= target,
        currentValue: cur,
        targetValue: target,
        progressPercentage: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },
  {
    id: 'xp-elite',
    title: 'XP Elite',
    category: 'XP',
    tier: 'DIAMOND',
    description: 'Ascend to elite status with 10,000+ verified CareerAI XP points.',
    criteria: 'Earn 10,000 total points in PointsLedger from verified performance.',
    icon: 'Sparkles',
    targetValue: 10000,
    unit: 'XP',
    xpReward: 1000,
    evaluate: (s) => {
      const cur = s.totalXp || 0;
      const target = 10000;
      return {
        isEligible: cur >= target,
        currentValue: cur,
        targetValue: target,
        progressPercentage: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },
];

export const BADGE_DEFINITIONS = BADGE_CATALOG;

export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGE_CATALOG.find((b) => b.id === id);
}
