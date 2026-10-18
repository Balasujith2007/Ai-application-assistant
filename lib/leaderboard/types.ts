/**
 * CareerAI Verified Class Leaderboard - Core Types & Contracts
 */

export type PeriodType = 'WEEKLY' | 'MONTHLY' | 'SEMESTER' | 'ALL_TIME';

export type ActivitySourceType = 'CONTEST' | 'HACKATHON' | 'INTERNSHIP' | 'CONSISTENCY';

export type ContestPlatform = 'CODEFORCES' | 'LEETCODE' | 'CODECHEF' | 'CODOLIO';

export type VerificationStatus = 'VERIFIED' | 'PENDING' | 'PENDING_REVIEW' | 'REJECTED' | 'UNAVAILABLE';

export interface StudentClassIdentity {
  department: string;
  year: number;
  section: string;
  college?: string;
  isComplete: boolean;
}

export interface CategoryBreakdown {
  coding: {
    score: number;
    maxScore: number;
    percentage: number;
    verifiedContestsCount: number;
    problemsSolved: number;
    highestRating: number;
    platforms: string[];
  };
  hackathon: {
    score: number;
    maxScore: number;
    percentage: number;
    registrationsCount: number;
    participationsCount: number;
    finalistCount: number;
    winnerCount: number;
  };
  internship: {
    score: number;
    maxScore: number;
    percentage: number;
    applicationsCount: number;
    interviewsCount: number;
    offersCount: number;
  };
  consistency: {
    score: number;
    maxScore: number;
    percentage: number;
    activeWeeksCount: number;
    ratingDelta: number;
  };
}

export interface AchievementBadge {
  id: string;
  title: string;
  category: 'CODING' | 'HACKATHON' | 'INTERNSHIP' | 'CONSISTENCY';
  description: string;
  icon: string; // Lucide icon identifier
  earnedAt: string;
  rarity?: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
}

export interface LeaderboardStudentEntry {
  rank: number;
  previousRank: number | null;
  rankMovement: number; // positive = moved up, negative = moved down, 0 = no change
  studentId: string;
  name: string;
  isCurrentUser: boolean;
  department: string;
  year: number;
  section: string;
  totalScore: number;
  categoryScores: {
    coding: number;
    hackathon: number;
    internship: number;
    consistency: number;
  };
  badges: AchievementBadge[];
  isProvisional: boolean;
  provisionalReason?: string;
  lastSyncedAt: string | null;
}

export interface ClassLeaderboardSummary {
  classInfo: {
    department: string;
    year: number;
    section: string;
    college?: string;
    displayName: string;
  };
  period: {
    type: PeriodType;
    key: string;
    displayName: string;
    startDate: string;
    endDate: string;
  };
  stats: {
    totalStudents: number;
    activeStudents: number;
    averageScore: number;
    highestScore: number;
    currentUserRank: number | null;
    currentUserScore: number | null;
    currentUserPreviousRank: number | null;
    rankMovement: number;
  };
  currentStudent: {
    entry: LeaderboardStudentEntry | null;
    categoryBreakdown: CategoryBreakdown;
    recommendations: string[];
    syncStatus: {
      lastSyncedAt: string | null;
      connectedPlatforms: string[];
      isSyncing?: boolean;
    };
  };
  rankings: LeaderboardStudentEntry[];
}

export interface ScoringWeights {
  codingWeight: number; // 50
  hackathonWeight: number; // 25
  internshipWeight: number; // 15
  consistencyWeight: number; // 10
  ruleVersion: string; // "1.0.0"
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  codingWeight: 50.0,
  hackathonWeight: 25.0,
  internshipWeight: 15.0,
  consistencyWeight: 10.0,
  ruleVersion: '1.0.0',
};

export interface ContestStatsResult {
  platform: ContestPlatform;
  username: string;
  profileUrl: string;
  verified: boolean;
  rating?: number;
  maxRating?: number;
  rankTier?: string;
  contestsCount?: number;
  problemsSolved?: number;
  contestHistory?: Array<{
    contestId: string | number;
    contestName: string;
    rank: number;
    oldRating: number;
    newRating: number;
    date: Date;
  }>;
  retrievedAt: Date;
  isStale?: boolean;
  error?: string;
}
