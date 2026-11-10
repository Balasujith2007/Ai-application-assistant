/**
 * AI Career Platform — Professional Badge Achievement Framework
 * ---------------------------------------------------------------
 * Badges are grouped into five categories plus two extension groups:
 *
 *   A. Career Excellence          — internship / job application milestones
 *   B. Innovation & Competition   — hackathons, competitions and projects
 *   B2. Contest Verification      — provider-verified competitive-programming contests
 *   C. Consistency & Streak       — daily career-activity streaks
 *   C2. Coding Streak Milestones  — platform-specific daily accepted submissions
 *   D. Professional Development   — profile, resume, skills, projects, experience
 *   E. Monthly Excellence         — monthly recognition (awarded by the monthly engine)
 *
 * The original framework defined 30 badges (6 per category). Phase 2 adds six
 * platform-specific coding-streak milestones (C2) and Phase 3 adds eight
 * contest-verification milestones (B2), bringing the catalog to 44 while
 * leaving all 36 pre-existing badges byte-for-byte unchanged.
 *
 * Phase 4 adds four evidence-based career/competition achievements. They are
 * declared in `PHASE4_BADGE_DEFINITIONS` and merged into
 * `ALL_BADGE_DEFINITIONS` (44 + 4 = 48) so the original `BADGE_CATALOG` — and
 * therefore every prior-phase eligibility rule and test — stays byte-for-byte
 * identical. Phase 4 only adds concepts that were genuinely uncovered; the
 * duplicate-concept audit is documented next to the definitions.
 *
 * Design notes
 *  - This platform is a Student Career Growth & Opportunity Platform, so LMS
 *    metrics (lessons, courses, learning streaks) are deliberately NOT part of
 *    the framework. The one deliberate exception is externally *verified*
 *    competitive-programming evidence: Phase 2 accepted-submission streaks and
 *    Phase 3 contest participation, both of which are provider-verified and
 *    ownership-gated rather than self-reported.
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
  /** Confirmed registrations (registration state) — NOT proof of participation. */
  competitionRegistrations: number;
  /**
   * Phase 4 — distinct hackathons/competitions where participation was
   * *verified* by an organizer, judge or admin (registration status VERIFIED
   * or a recorded verifiedAt timestamp). Registration alone never contributes.
   */
  verifiedCompetitionParticipations: number;
  projectSubmissionsCount: number;
  finalistCount: number;
  podiumCount: number;
  winnerCount: number;

  // ── C. Consistency & Streak ──
  currentStreakDays: number;
  longestStreakDays: number;
  totalActiveDays: number;
  activeWeeksInMonth: number;

  // ── C2. Platform-specific coding streaks (Phase 2) ──
  // Derived ONLY from verified accepted submissions on a platform whose account
  // ownership is proven. Platforms are never combined for badge eligibility.
  verifiedCodingStreakDays: number;
  codingStreakPlatform: string | null;
  codingAcceptedActivityCount: number;

  // ── B2. Verified contest participation (Phase 3) ──
  // Derived ONLY from provider-verified contest records on a platform that is
  // supported, ownership-verified AND has non-UNAVAILABLE contest coverage.
  // Every value below is echoed from a provider record or computed from one —
  // a missing rank, participant total or rating delta stays missing (0/null),
  // it is never estimated.
  /** Verified contest participations across all eligible platforms. */
  contestParticipationCount: number;
  /** Platforms that contributed at least one verified participation. */
  contestPlatforms: string[];
  /** Platform whose contest evidence produced the highest participation count. */
  contestPlatform: string | null;
  /** Contests that exposed a verifiable rating delta. */
  contestRatedContestsCount: number;
  /** Highest rating any eligible provider reported, or null when unknown. */
  contestPersonalBestRating: number | null;
  contestPersonalBestPlatform: string | null;
  /** Best per-platform sum of positive rating gains across >= 2 rated contests. */
  contestCumulativeRatingImprovement: number;
  /** Verified top-10% finishes (requires a real rank AND a real participant total). */
  contestTop10PercentFinishes: number;
  /** Verified top-5% finishes (requires a real rank AND a real participant total). */
  contestTop5PercentFinishes: number;

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
  /**
   * OPTIONAL. Extra, verifiable evidence persisted with the award so the
   * credential can reference the exact records that justified it. Must only
   * echo already-verified statistics — never invent or estimate a value.
   */
  evidence?: (stats: StudentActivityStats) => Record<string, unknown> | null;
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

/**
 * Evidence reference for a platform coding-streak badge (Phase 2). Echoes the
 * verified per-platform streak that produced eligibility — it never derives,
 * estimates or combines platforms.
 */
function codingStreakEvidence(stats: StudentActivityStats): Record<string, unknown> | null {
  if (!stats.codingStreakPlatform || stats.verifiedCodingStreakDays <= 0) return null;
  return {
    source: 'PLATFORM_CODING_STREAK',
    platform: stats.codingStreakPlatform,
    longestStreakDays: stats.verifiedCodingStreakDays,
    acceptedActivityDays: stats.codingAcceptedActivityCount,
  };
}

/**
 * Evidence reference for a verified-contest badge (Phase 3). Echoes ONLY the
 * provider-verified contest statistics that produced eligibility. Percentile
 * counts stay 0 when no participant total was published, and a personal-best
 * rating stays null when no rating was published — never estimated.
 */
function contestEvidence(stats: StudentActivityStats): Record<string, unknown> | null {
  const platform = stats.contestPlatform ?? stats.contestPersonalBestPlatform ?? null;
  if (!platform && stats.contestParticipationCount <= 0) return null;
  return {
    source: 'VERIFIED_CONTEST_PARTICIPATION',
    platform,
    platforms: stats.contestPlatforms,
    verifiedParticipations: stats.contestParticipationCount,
    ratedContests: stats.contestRatedContestsCount,
    personalBestRating: stats.contestPersonalBestRating,
    personalBestPlatform: stats.contestPersonalBestPlatform,
    cumulativeRatingImprovement: stats.contestCumulativeRatingImprovement,
    top10PercentFinishes: stats.contestTop10PercentFinishes,
    top5PercentFinishes: stats.contestTop5PercentFinishes,
  };
}

/**
 * Evidence reference for a Phase 4 career-application badge. Echoes ONLY the
 * count of real, successfully-submitted application records that produced
 * eligibility. Drafts (SAVED), withdrawn and abandoned applications are never
 * counted by the engine, so they can never appear here.
 */
function applicationEvidence(stats: StudentActivityStats): Record<string, unknown> | null {
  if (stats.applicationsSubmitted <= 0) return null;
  return {
    source: 'VERIFIED_APPLICATION_RECORDS',
    submittedApplications: stats.applicationsSubmitted,
    countedStatuses: ['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED', 'DISQUALIFIED'],
    excludedStatuses: ['SAVED', 'WITHDRAWN', 'INITIATED'],
  };
}

/**
 * Evidence reference for a Phase 4 hackathon/competition badge. Echoes ONLY the
 * count of distinct competitions whose participation was verified by an
 * organizer/judge/admin. A plain registration is never evidence of
 * participation and therefore never appears here.
 */
function participationEvidence(stats: StudentActivityStats): Record<string, unknown> | null {
  if (stats.verifiedCompetitionParticipations <= 0) return null;
  return {
    source: 'ORGANIZER_VERIFIED_PARTICIPATION',
    verifiedParticipations: stats.verifiedCompetitionParticipations,
    confirmedRegistrations: stats.competitionRegistrations,
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
  // C2. CODING STREAK MILESTONES (Phase 2)
  // -------------------------------------------------------------------------
  // Platform-specific streaks: consecutive calendar days with at least one
  // VERIFIED, ACCEPTED submission on ONE competitive-programming platform.
  // They are independent from — and never combined with — the global career
  // streak above.
  //
  // DUPLICATE-CONCEPT CHECK (required by Phase 2 §3):
  //   The existing C. badges ('streak-consistency-elite' @50 and
  //   'streak-century-achiever' @100 and 'streak-unstoppable' @180) measure
  //   `longestStreakDays` — the GLOBAL career-activity streak built from any
  //   qualifying career event. The six badges below measure
  //   `verifiedCodingStreakDays` — accepted competitive-programming
  //   submissions on a single provably-owned platform. Different evidence
  //   source, different unit of proof, therefore NOT a duplicate concept.
  //   All six ids are new (no id collision) and each carries a unique artwork
  //   key (artworkKey defaults to the badge id in badgeCatalogService).
  // =========================================================================
  {
    id: 'coding-streak-consistency',
    title: 'Code Consistency',
    category: 'CONSISTENCY',
    tier: 'SILVER',
    description: 'Solve at least one problem every day for 50 days on a single coding platform.',
    criteria:
      '50 consecutive calendar days each containing at least one verified accepted submission on one ownership-verified platform (Asia/Kolkata).',
    icon: 'Code2',
    defaultThreshold: 50,
    unit: 'days',
    xpReward: 700,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.verifiedCodingStreakDays, t),
    evidence: codingStreakEvidence,
  },
  {
    id: 'coding-streak-discipline',
    title: 'Code Discipline',
    category: 'CONSISTENCY',
    tier: 'GOLD',
    description: 'Sustain a 100-day unbroken daily problem-solving habit on one coding platform.',
    criteria:
      '100 consecutive calendar days each containing at least one verified accepted submission on one ownership-verified platform (Asia/Kolkata).',
    icon: 'ShieldCheck',
    defaultThreshold: 100,
    unit: 'days',
    xpReward: 1200,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.verifiedCodingStreakDays, t),
    evidence: codingStreakEvidence,
  },
  {
    id: 'coding-streak-dedication',
    title: 'Coding Dedication',
    category: 'CONSISTENCY',
    tier: 'GOLD',
    description: 'Commit to daily competitive programming for 150 consecutive days.',
    criteria:
      '150 consecutive calendar days each containing at least one verified accepted submission on one ownership-verified platform (Asia/Kolkata).',
    icon: 'Target',
    defaultThreshold: 150,
    unit: 'days',
    xpReward: 1800,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.verifiedCodingStreakDays, t),
    evidence: codingStreakEvidence,
  },
  {
    id: 'coding-streak-legendary',
    title: 'Legendary Coder',
    category: 'CONSISTENCY',
    tier: 'PLATINUM',
    description: 'Reach 200 consecutive days of verified daily problem solving.',
    criteria:
      '200 consecutive calendar days each containing at least one verified accepted submission on one ownership-verified platform (Asia/Kolkata).',
    icon: 'Crown',
    defaultThreshold: 200,
    unit: 'days',
    xpReward: 2600,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.verifiedCodingStreakDays, t),
    evidence: codingStreakEvidence,
  },
  {
    id: 'coding-streak-eternal',
    title: 'Eternal Problem Solver',
    category: 'CONSISTENCY',
    tier: 'PLATINUM',
    description: 'Maintain an exceptional 250-day verified coding streak.',
    criteria:
      '250 consecutive calendar days each containing at least one verified accepted submission on one ownership-verified platform (Asia/Kolkata).',
    icon: 'Infinity',
    defaultThreshold: 250,
    unit: 'days',
    xpReward: 3400,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.verifiedCodingStreakDays, t),
    evidence: codingStreakEvidence,
  },
  {
    id: 'coding-streak-year-legend',
    title: 'One Year Coding Legend',
    category: 'CONSISTENCY',
    tier: 'DIAMOND',
    description: 'Complete a full year — 365 consecutive days — of verified daily problem solving.',
    criteria:
      '365 consecutive calendar days each containing at least one verified accepted submission on one ownership-verified platform (Asia/Kolkata).',
    icon: 'Trophy',
    defaultThreshold: 365,
    unit: 'days',
    xpReward: 5000,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.verifiedCodingStreakDays, t),
    evidence: codingStreakEvidence,
  },

  // =========================================================================
  // B2. VERIFIED CONTEST PARTICIPATION (Phase 3)
  // -------------------------------------------------------------------------
  // Awarded ONLY from provider-verified contest participation on a platform
  // that is simultaneously:
  //   • capability-supported for contest history,
  //   • ownership-verified (Phase 1 ownership challenge), and
  //   • NOT reporting UNAVAILABLE contest coverage.
  // A manual Super-Admin participation approval never satisfies the ownership
  // requirement — ownership and participation remain separate states.
  //
  // DUPLICATE-CONCEPT CHECK (required by Phase 3 §5):
  //   The B. INNOVATION badges measure hackathon/competition *registrations and
  //   outcomes* recorded inside this platform. In particular
  //   'innovation-podium-finisher' is a verified 2nd/3rd-place competition
  //   outcome. The badges below measure externally verified *competitive-
  //   programming contest* evidence sourced from provider adapters: participation
  //   counts, percentile finishes and rating movement. Different evidence
  //   source, different unit of proof, therefore NOT duplicate concepts.
  //   No id or threshold below collides with the 36 pre-existing badges.
  // =========================================================================
  {
    id: 'contest-first-participation',
    title: 'First Contest',
    category: 'INNOVATION',
    tier: 'BRONZE',
    description: 'Take part in your first provider-verified competitive-programming contest.',
    criteria:
      'One contest participation verified from a supported provider feed on an ownership-verified account. Registration alone does not count.',
    icon: 'Flag',
    defaultThreshold: 1,
    unit: 'contest',
    xpReward: 300,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.contestParticipationCount, t),
    evidence: contestEvidence,
  },
  {
    id: 'contest-regular',
    title: 'Contest Regular',
    category: 'INNOVATION',
    tier: 'SILVER',
    description: 'Become a regular competitive programmer with five verified contests.',
    criteria: 'Five provider-verified contest participations across your ownership-verified accounts.',
    icon: 'Swords',
    defaultThreshold: 5,
    unit: 'contests',
    xpReward: 700,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.contestParticipationCount, t),
    evidence: contestEvidence,
  },
  {
    id: 'contest-competitive-coder',
    title: 'Competitive Coder',
    category: 'INNOVATION',
    tier: 'GOLD',
    description: 'Compete consistently with ten verified contest participations.',
    criteria: 'Ten provider-verified contest participations across your ownership-verified accounts.',
    icon: 'Sword',
    defaultThreshold: 10,
    unit: 'contests',
    xpReward: 1200,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.contestParticipationCount, t),
    evidence: contestEvidence,
  },
  {
    id: 'contest-veteran',
    title: 'Contest Veteran',
    category: 'INNOVATION',
    tier: 'PLATINUM',
    description: 'Sustain a long competitive-programming career with twenty-five verified contests.',
    criteria: 'Twenty-five provider-verified contest participations across your ownership-verified accounts.',
    icon: 'Milestone',
    defaultThreshold: 25,
    unit: 'contests',
    xpReward: 2000,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.contestParticipationCount, t),
    evidence: contestEvidence,
  },
  {
    id: 'contest-podium-challenger',
    title: 'Podium Challenger',
    category: 'INNOVATION',
    tier: 'GOLD',
    description: 'Finish inside the top 10% of a verified contest.',
    criteria:
      'A verified top-10% contest finish. Requires BOTH a provider-published rank AND a provider-published participant total of at least 20 — a percentile is never estimated.',
    icon: 'Podium',
    defaultThreshold: 1,
    unit: 'top-10% finish',
    xpReward: 1500,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.contestTop10PercentFinishes, t),
    evidence: contestEvidence,
  },
  {
    id: 'contest-top-performer',
    title: 'Top Performer',
    category: 'INNOVATION',
    tier: 'PLATINUM',
    description: 'Finish inside the top 5% of a verified contest.',
    criteria:
      'A verified top-5% contest finish. Requires BOTH a provider-published rank AND a provider-published participant total of at least 20 — a percentile is never estimated.',
    icon: 'Gauge',
    defaultThreshold: 1,
    unit: 'top-5% finish',
    xpReward: 2400,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.contestTop5PercentFinishes, t),
    evidence: contestEvidence,
  },
  {
    id: 'contest-rating-breakthrough',
    title: 'Rating Breakthrough',
    category: 'INNOVATION',
    tier: 'GOLD',
    description: 'Reach a verified personal-best contest rating.',
    criteria:
      'A provider-published post-contest rating of 1200 or higher (default milestone — Super Admin configurable). Only real provider rating values count; a rating is never inferred.',
    icon: 'Ribbon',
    defaultThreshold: 1200,
    unit: 'rating points',
    xpReward: 1600,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.contestPersonalBestRating ?? 0, t),
    evidence: contestEvidence,
  },
  {
    id: 'contest-rating-climber',
    title: 'Rating Climber',
    category: 'INNOVATION',
    tier: 'PLATINUM',
    description: 'Show sustained rating improvement across multiple verified contests.',
    criteria:
      'Cumulative positive rating gain of 200 points or higher on one platform, measured across at least two contests that publish both an old and a new rating.',
    icon: 'TrendingUp',
    defaultThreshold: 200,
    unit: 'rating points',
    xpReward: 1800,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.contestCumulativeRatingImprovement, t),
    evidence: contestEvidence,
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

// ===========================================================================
// PHASE 4 — CAREER ACHIEVEMENT & COMPETITION EXPANSION
// ---------------------------------------------------------------------------
// These four badges are declared separately from `BADGE_CATALOG` so the
// original 44-badge array (and every Phase 1/2/3 eligibility rule + test that
// pins its length) stays byte-for-byte unchanged. They are merged into
// `ALL_BADGE_DEFINITIONS` for runtime evaluation.
//
// DUPLICATE-CONCEPT AUDIT (required by Phase 4 §4) — every Phase 4 §2/§3
// proposal was compared against the existing 44 badges:
//   • First Application    → ALREADY COVERED by `career-first-step`. REUSED.
//   • Shortlist Achiever   → ALREADY COVERED by `career-shortlist-achiever`. REUSED.
//   • Interview Ready      → ALREADY COVERED by `career-interview-ready`. REUSED.
//   • Interview Performer  → ALREADY COVERED by `career-interview-performer`. REUSED.
//   • Offer Achiever       → ALREADY COVERED by `career-breakthrough` (SELECTED). REUSED.
//   • Career Breakthrough  → ALREADY COVERED by `career-breakthrough`. REUSED.
//   • Project Presenter    → ALREADY COVERED by `innovation-project-builder`. REUSED.
//   • Finalist             → ALREADY COVERED by `innovation-finalist`. REUSED.
//   • Podium Finisher      → ALREADY COVERED by `innovation-podium-finisher`. REUSED.
//   • Competition Champion → ALREADY COVERED by `innovation-competition-champion`. REUSED.
//   • Innovation Elite     → ALREADY COVERED by `innovation-elite`. REUSED.
//   • Application Explorer (5)  → NOT covered — NEW (volume milestone).
//   • Career Explorer (10)      → NOT covered — NEW (volume milestone).
//   • First Hackathon           → NOT covered — NEW (verified participation,
//                                 distinct from `innovation-hackathon-explorer`
//                                 which counts mere *registration*).
//   • Hackathon Explorer (3)    → NOT covered — NEW. The title "Hackathon
//                                 Explorer" is already taken, so the verified-
//                                 participation milestone is titled
//                                 "Hackathon Veteran" to avoid a name clash.
// Each new badge therefore has a distinct concept, id, threshold, unit,
// evidence source and category relationship — none duplicates an existing
// badge or merely inflates the count.
// ===========================================================================
export const PHASE4_BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'career-application-explorer',
    title: 'Application Explorer',
    category: 'CAREER_EXCELLENCE',
    tier: 'BRONZE',
    description: 'Submit five verified internship or job applications.',
    criteria:
      'Five successfully-submitted internship/job applications. Drafts (SAVED), withdrawn and abandoned applications do not count, and each application counts once.',
    icon: 'Send',
    defaultThreshold: 5,
    unit: 'applications',
    xpReward: 250,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.applicationsSubmitted, t),
    evidence: applicationEvidence,
  },
  {
    id: 'career-application-veteran',
    title: 'Career Explorer',
    category: 'CAREER_EXCELLENCE',
    tier: 'SILVER',
    description: 'Submit ten verified internship or job applications.',
    criteria:
      'Ten successfully-submitted internship/job applications. Counts real submissions only — drafts and abandoned applications are excluded and no application is double-counted.',
    icon: 'Briefcase',
    defaultThreshold: 10,
    unit: 'applications',
    xpReward: 500,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.applicationsSubmitted, t),
    evidence: applicationEvidence,
  },
  {
    id: 'innovation-first-hackathon',
    title: 'First Hackathon',
    category: 'INNOVATION',
    tier: 'BRONZE',
    description: 'Take part in your first organizer-verified hackathon or competition.',
    criteria:
      'One hackathon/competition participation confirmed by an organizer, judge or admin. Registration alone does not count.',
    icon: 'Flag',
    defaultThreshold: 1,
    unit: 'verified participation',
    xpReward: 250,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.verifiedCompetitionParticipations, t),
    evidence: participationEvidence,
  },
  {
    id: 'innovation-hackathon-veteran',
    title: 'Hackathon Veteran',
    category: 'INNOVATION',
    tier: 'SILVER',
    description: 'Take part in three organizer-verified hackathons or competitions.',
    criteria:
      'Three organizer/admin-verified hackathon/competition participations. Each distinct competition counts once and registration is never treated as participation.',
    icon: 'Rocket',
    defaultThreshold: 3,
    unit: 'verified participations',
    xpReward: 600,
    awardSource: 'ENGINE',
    evaluate: (s, t) => measurable(s.verifiedCompetitionParticipations, t),
    evidence: participationEvidence,
  },
];

/**
 * The complete runtime catalog: the frozen original framework plus the Phase 4
 * additions. `BADGE_CATALOG` itself is left untouched for backwards
 * compatibility; the engine, catalog service and admin console all resolve
 * badges against this merged list.
 */
export const ALL_BADGE_DEFINITIONS: BadgeDefinition[] = [
  ...BADGE_CATALOG,
  ...PHASE4_BADGE_DEFINITIONS,
];

/** Phase 4 badge ids — used by the engine, admin console and test suite. */
export const PHASE4_BADGE_IDS = [
  'career-application-explorer',
  'career-application-veteran',
  'innovation-first-hackathon',
  'innovation-hackathon-veteran',
] as const;

export type Phase4BadgeId = (typeof PHASE4_BADGE_IDS)[number];

export function isPhase4Badge(badgeId: string): boolean {
  return (PHASE4_BADGE_IDS as readonly string[]).includes(badgeId);
}

export const PHASE4_BADGES = ALL_BADGE_DEFINITIONS.filter((b) => isPhase4Badge(b.id));

export const BADGE_DEFINITIONS = ALL_BADGE_DEFINITIONS;

/** Resolves a badge from the full runtime catalog (original + Phase 4). */
export function getBadgeById(id: string): BadgeDefinition | undefined {
  return ALL_BADGE_DEFINITIONS.find((b) => b.id === id);
}

/** Badges awarded by the standard per-student evaluation engine. */
export const ENGINE_BADGES = ALL_BADGE_DEFINITIONS.filter((b) => b.awardSource === 'ENGINE');

/** Badges awarded exclusively by the monthly recognition engine. */
export const MONTHLY_BADGES = ALL_BADGE_DEFINITIONS.filter((b) => b.awardSource === 'MONTHLY');

/**
 * Phase 2 platform coding-streak milestone badges. These are the ONLY badges
 * that require a verified ACCEPTED-submission streak on an ownership-proven
 * platform, so both the engine and the Super Admin console key off this list.
 */
export const CODING_STREAK_BADGE_IDS = [
  'coding-streak-consistency',
  'coding-streak-discipline',
  'coding-streak-dedication',
  'coding-streak-legendary',
  'coding-streak-eternal',
  'coding-streak-year-legend',
] as const;

export type CodingStreakBadgeId = (typeof CODING_STREAK_BADGE_IDS)[number];

export function isCodingStreakBadge(badgeId: string): boolean {
  return (CODING_STREAK_BADGE_IDS as readonly string[]).includes(badgeId);
}

export const CODING_STREAK_BADGES = BADGE_CATALOG.filter((b) => isCodingStreakBadge(b.id));

/**
 * Phase 3 verified-contest milestone badges. These are the ONLY badges that
 * require provider-verified contest participation on an ownership-verified
 * platform with non-UNAVAILABLE contest coverage, so both the badge engine and
 * the Super Admin console key off this list.
 */
export const CONTEST_BADGE_IDS = [
  'contest-first-participation',
  'contest-regular',
  'contest-competitive-coder',
  'contest-veteran',
  'contest-podium-challenger',
  'contest-top-performer',
  'contest-rating-breakthrough',
  'contest-rating-climber',
] as const;

export type ContestBadgeId = (typeof CONTEST_BADGE_IDS)[number];

export function isContestBadge(badgeId: string): boolean {
  return (CONTEST_BADGE_IDS as readonly string[]).includes(badgeId);
}

export const CONTEST_BADGES = BADGE_CATALOG.filter((b) => isContestBadge(b.id));

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
