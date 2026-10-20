import prisma from '@/lib/prisma';
import {
  AchievementBadge,
  CategoryBreakdown,
  DEFAULT_SCORING_WEIGHTS,
  LeaderboardStudentEntry,
  PeriodType,
  ScoringWeights,
} from './types';
import { getAllTimePeriodKey, getPeriodDetails, getPeriodKey, getPreviousPeriodKey } from './periodUtils';
import { verificationLedger } from './verificationLedger';
import { XP_CONFIG } from '../gamification/xpConfig';

export function getDepartmentVariants(dept: string): string[] {
  if (!dept) return [];
  const trimmed = dept.trim();
  const lower = trimmed.toLowerCase();

  // AI & DS / Artificial Intelligence and Data Science
  if (
    lower === 'ai&ds' ||
    lower === 'ai & ds' ||
    lower === 'aids' ||
    lower.includes('artificial intelligence') ||
    (lower.includes('ai') && lower.includes('ds'))
  ) {
    return [
      'Artificial Intelligence & Data Science',
      'Artificial Intelligence and Data Science',
      'Artificial intelligence and data science',
      'AI&DS',
      'Ai&ds',
      'ai&ds',
      'AI & DS',
      'AIDS',
      trimmed,
    ];
  }

  // Computer Science & Engineering / CSE
  if (lower === 'cse' || lower.includes('computer science')) {
    return [
      'Computer Science Engineering',
      'Computer Science and Engineering',
      'Computer Science & Engineering',
      'CSE',
      trimmed,
    ];
  }

  // Electronics and Communication Engineering / ECE
  if (
    lower === 'ece' ||
    lower.includes('electronics and communication') ||
    lower.includes('electronics & communication')
  ) {
    return [
      'Electronics and Communication Engineering',
      'Electronics & Communication Engineering',
      'ECE',
      trimmed,
    ];
  }

  return [trimmed];
}

interface CachedCohortRankings {
  rankings: LeaderboardStudentEntry[];
  scoredList: Array<{ student: any; scores: any; previousRank: number | null }>;
  cachedAt: number;
}

const cohortLeaderboardCache = new Map<string, CachedCohortRankings>();
const inFlightLeaderboardPromises = new Map<string, Promise<CachedCohortRankings>>();
const LEADERBOARD_CACHE_TTL_MS = 60000; // 60 seconds

export function invalidateLeaderboardCache(dept?: string, year?: number, section?: string) {
  if (!dept && !year && !section) {
    cohortLeaderboardCache.clear();
    return;
  }
  for (const key of Array.from(cohortLeaderboardCache.keys())) {
    if (!dept || key.toLowerCase().includes(dept.toLowerCase())) {
      cohortLeaderboardCache.delete(key);
    }
  }
}

export class ScoringEngine {
  private weights: ScoringWeights;

  constructor(weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS) {
    this.weights = weights;
  }

  /**
   * Calculates category scores and total score for a student within a specific period.
   * Total Score = Verified Internship XP + Verified Hackathon XP + Valid Daily Check-in XP + Earned Consistency XP.
   * Only VERIFIED, non-duplicate, non-rejected activities earn points.
   */
  async calculateStudentScore(
    studentId: string,
    periodKey: string = getAllTimePeriodKey(),
    preloadedActivities?: any[],
    preloadedProfiles?: any[],
    userCreatedAt?: Date | null,
    preloadedCheckIns?: any[],
    preloadedPoints?: any[],
    periodTypeParam?: PeriodType
  ): Promise<{
    codingScore: number;
    hackathonScore: number;
    internshipScore: number;
    checkInScore: number;
    consistencyScore: number;
    totalScore: number;
    earnedXp: number;
    categoryBreakdown: CategoryBreakdown;
    badges: AchievementBadge[];
    isProvisional: boolean;
    provisionalReason?: string;
    completedAtTimestamp: number;
  }> {
    // Determine period type and period date boundaries
    let periodType: PeriodType = periodTypeParam || 'ALL_TIME';
    if (!periodTypeParam && periodKey) {
      if (periodKey === 'MONTHLY' || periodKey.includes('-M')) periodType = 'MONTHLY';
      else if (periodKey === 'WEEKLY' || periodKey.includes('-W')) periodType = 'WEEKLY';
      else if (periodKey === 'SEMESTER' || periodKey.includes('-S')) periodType = 'SEMESTER';
      else if (periodKey === 'ALL_TIME') periodType = 'ALL_TIME';
    }

    const isAllTime = periodType === 'ALL_TIME' || periodKey === 'ALL_TIME';
    const periodDetails = getPeriodDetails(periodType);
    const periodStart = new Date(periodDetails.startDate);
    const periodEnd = new Date(periodDetails.endDate);
    const periodStartDay = periodDetails.startDate.slice(0, 10);
    const periodEndDay = periodDetails.endDate.slice(0, 10);

    // 1. Fetch or use preloaded VERIFIED activities for this student
    let verifiedActivities: any[];
    if (preloadedActivities !== undefined) {
      verifiedActivities = preloadedActivities.filter((a) => {
        if (a.verificationStatus !== 'VERIFIED') return false;
        if (isAllTime) return true;
        const actDate = a.occurredAt || a.createdAt;
        if (!actDate) return true;
        const d = new Date(actDate);
        return d >= periodStart && d <= periodEnd;
      });
    } else {
      const allActs = await prisma.verifiedActivity.findMany({
        where: {
          studentId,
          verificationStatus: 'VERIFIED',
        },
      });
      verifiedActivities = allActs.filter((a) => {
        if (isAllTime) return true;
        const actDate = a.occurredAt || a.createdAt;
        if (!actDate) return true;
        const d = new Date(actDate);
        return d >= periodStart && d <= periodEnd;
      });
    }

    // Check connected profiles
    const connectedProfiles = preloadedProfiles !== undefined
      ? preloadedProfiles
      : await prisma.verifiedProfile.findMany({
          where: { studentId },
        });

    // 2. Fetch or use preloaded Daily Check-ins
    let checkIns: any[];
    if (preloadedCheckIns !== undefined) {
      checkIns = preloadedCheckIns.filter((ci) => {
        if (isAllTime) return true;
        return ci.checkInDate >= periodStartDay && ci.checkInDate <= periodEndDay;
      });
    } else {
      const allCheckIns = await prisma.dailyCheckIn.findMany({
        where: { studentId },
      });
      checkIns = allCheckIns.filter((ci: any) => {
        if (isAllTime) return true;
        return ci.checkInDate >= periodStartDay && ci.checkInDate <= periodEndDay;
      });
    }

    // 3. Fetch or use preloaded Points Ledger entries
    let pointsEntries: any[];
    if (preloadedPoints !== undefined) {
      pointsEntries = preloadedPoints.filter((p) => {
        if (isAllTime) return true;
        if (p.periodKey === periodKey || p.periodKey === periodDetails.key) return true;
        if (p.createdAt) {
          const d = new Date(p.createdAt);
          return d >= periodStart && d <= periodEnd;
        }
        return false;
      });
    } else {
      const allPoints = await prisma.pointsLedger.findMany({
        where: { studentId },
      });
      pointsEntries = allPoints.filter((p) => {
        if (isAllTime) return true;
        if (p.periodKey === periodKey || p.periodKey === periodDetails.key) return true;
        if (p.createdAt) {
          const d = new Date(p.createdAt);
          return d >= periodStart && d <= periodEnd;
        }
        return false;
      });
    }

    const hasAnyVerifiedActivity = verifiedActivities.length > 0;
    const hasConnectedProfile = connectedProfiles.length > 0;

    let isProvisional = false;
    let provisionalReason: string | undefined;

    if (!hasConnectedProfile && !hasAnyVerifiedActivity) {
      isProvisional = true;
      provisionalReason = 'Connect your contest profile to calculate your verified performance.';
    }

    // Map points by verifiedActivityId to track authoritative ledger XP and reversals
    const pointsByActivityId = new Map<string, number>();
    for (const pl of pointsEntries) {
      if (pl.verifiedActivityId) {
        const cur = pointsByActivityId.get(pl.verifiedActivityId) || 0;
        pointsByActivityId.set(pl.verifiedActivityId, cur + (pl.pointsAwarded || 0));
      }
    }

    // -------------------------------------------------------------
    // CATEGORY 1: VERIFIED INTERNSHIP XP
    // -------------------------------------------------------------
    let internshipScore = 0;
    let applicationsCount = 0;
    let interviewsCount = 0;
    let offersCount = 0;

    const seenInternshipKeys = new Set<string>();
    const internshipActivities = verifiedActivities.filter(
      (a) => a.sourceType === 'INTERNSHIP' || a.activityType.startsWith('INTERNSHIP_')
    );

    for (const act of internshipActivities) {
      const dedupKey = act.externalActivityId || act.id;
      if (seenInternshipKeys.has(dedupKey)) continue;
      seenInternshipKeys.add(dedupKey);

      if (act.activityType === 'INTERNSHIP_APPLICATION') applicationsCount++;
      else if (act.activityType === 'INTERNSHIP_INTERVIEW') interviewsCount++;
      else if (act.activityType === 'INTERNSHIP_OFFER') offersCount++;

      const ledgerPoints = pointsByActivityId.get(act.id);
      if (ledgerPoints !== undefined) {
        if (ledgerPoints > 0) {
          internshipScore += ledgerPoints;
        }
      } else {
        if (act.activityType === 'INTERNSHIP_APPLICATION') {
          internshipScore += XP_CONFIG.INTERNSHIP_APPLICATION_VERIFIED;
        } else if (act.activityType === 'INTERNSHIP_INTERVIEW') {
          internshipScore += 40;
        } else if (act.activityType === 'INTERNSHIP_OFFER') {
          internshipScore += 100;
        }
      }
    }

    // Include any pointsLedger entries for INTERNSHIP not directly matched to verifiedActivities array
    for (const pl of pointsEntries) {
      if (pl.category === 'INTERNSHIP' && (!pl.verifiedActivityId || !internshipActivities.some((a) => a.id === pl.verifiedActivityId))) {
        if (pl.pointsAwarded && pl.pointsAwarded > 0) {
          internshipScore += pl.pointsAwarded;
        }
      }
    }

    // -------------------------------------------------------------
    // CATEGORY 2: VERIFIED HACKATHON XP
    // -------------------------------------------------------------
    let hackathonScore = 0;
    let registrationsCount = 0;
    let participationsCount = 0;
    let finalistCount = 0;
    let winnerCount = 0;

    const seenHackathonKeys = new Set<string>();
    const hackathonActivities = verifiedActivities.filter(
      (a) => a.sourceType === 'HACKATHON' || a.activityType.startsWith('HACKATHON_')
    );

    for (const act of hackathonActivities) {
      const dedupKey = act.externalActivityId || act.id;
      if (seenHackathonKeys.has(dedupKey)) continue;
      seenHackathonKeys.add(dedupKey);

      if (act.activityType === 'HACKATHON_REGISTRATION') registrationsCount++;
      else if (act.activityType === 'HACKATHON_PARTICIPATION') participationsCount++;
      else if (act.activityType === 'HACKATHON_FINALIST') finalistCount++;
      else if (act.activityType === 'HACKATHON_WINNER') winnerCount++;

      const ledgerPoints = pointsByActivityId.get(act.id);
      if (ledgerPoints !== undefined) {
        if (ledgerPoints > 0) {
          hackathonScore += ledgerPoints;
        }
      } else {
        if (act.activityType === 'HACKATHON_WINNER') {
          hackathonScore += 20;
        } else if (act.activityType === 'HACKATHON_FINALIST') {
          hackathonScore += 15;
        } else if (act.activityType === 'HACKATHON_PARTICIPATION') {
          hackathonScore += XP_CONFIG.HACKATHON_MILESTONE;
        } else if (act.activityType === 'HACKATHON_REGISTRATION') {
          hackathonScore += 5;
        }
      }
    }

    // Include any pointsLedger entries for HACKATHON not directly matched to hackathonActivities array
    for (const pl of pointsEntries) {
      if (pl.category === 'HACKATHON' && (!pl.verifiedActivityId || !hackathonActivities.some((a) => a.id === pl.verifiedActivityId))) {
        if (pl.pointsAwarded && pl.pointsAwarded > 0) {
          hackathonScore += pl.pointsAwarded;
        }
      }
    }

    // -------------------------------------------------------------
    // CATEGORY 3: VALID DAILY CHECK-IN XP
    // -------------------------------------------------------------
    // Exactly one valid check-in per student per calendar day (5 XP each)
    const uniqueCheckInDays = new Set<string>();
    for (const ci of checkIns) {
      if (ci.checkInDate) {
        uniqueCheckInDays.add(ci.checkInDate);
      }
    }
    for (const act of verifiedActivities) {
      if (act.activityType === 'DAILY_CHECKIN') {
        const metaDate = act.rawMetadata?.checkInDate;
        if (metaDate) {
          uniqueCheckInDays.add(metaDate);
        } else {
          const d = act.occurredAt || act.createdAt;
          if (d) uniqueCheckInDays.add(new Date(d).toISOString().slice(0, 10));
        }
      }
    }

    const checkInCount = uniqueCheckInDays.size;
    const checkInScore = checkInCount * XP_CONFIG.DAILY_CHECKIN;

    // -------------------------------------------------------------
    // CATEGORY 4: EARNED CONSISTENCY XP
    // -------------------------------------------------------------
    // Qualifying consecutive active days and eligible consistency milestones (e.g. 7-day streak bonus +25 XP)
    let consistencyScore = 0;
    const seenConsistencyKeys = new Set<string>();
    const consistencyActivities = verifiedActivities.filter(
      (a) => a.sourceType === 'CONSISTENCY' && a.activityType !== 'DAILY_CHECKIN'
    );

    for (const act of consistencyActivities) {
      const dedupKey = act.externalActivityId || act.id;
      if (seenConsistencyKeys.has(dedupKey)) continue;
      seenConsistencyKeys.add(dedupKey);

      const ledgerPoints = pointsByActivityId.get(act.id);
      if (ledgerPoints !== undefined) {
        if (ledgerPoints > 0) {
          consistencyScore += ledgerPoints;
        }
      } else {
        if (act.activityType === 'STREAK_7DAY_BONUS') {
          consistencyScore += XP_CONFIG.STREAK_7DAY_BONUS;
        } else {
          consistencyScore += act.rawMetadata?.bonusXp || 25;
        }
      }
    }

    // Include consistency points from pointsLedger not linked to above activities
    for (const pl of pointsEntries) {
      if (
        pl.category === 'CONSISTENCY' &&
        !pl.reason?.toLowerCase().includes('daily check-in') &&
        (!pl.verifiedActivityId || !consistencyActivities.some((a) => a.id === pl.verifiedActivityId))
      ) {
        if (pl.pointsAwarded && pl.pointsAwarded > 0) {
          consistencyScore += pl.pointsAwarded;
        }
      }
    }

    // -------------------------------------------------------------
    // COMPETITIVE CODING SCORE (Retained for contest ratings & badges)
    // -------------------------------------------------------------
    let codingScore = 0;
    let highestRating = 0;
    let verifiedContestsCount = 0;
    let problemsSolved = 0;
    const codingPlatformsSet = new Set<string>();

    const codingActivities = verifiedActivities.filter((a) => a.sourceType === 'CONTEST');

    for (const act of codingActivities) {
      codingPlatformsSet.add(act.sourcePlatform);
      const meta = (act.rawMetadata as any) || {};

      if (act.activityType === 'RATING_ACHIEVEMENT') {
        const rating = meta.rating || 0;
        if (rating > highestRating) highestRating = rating;
      } else if (act.activityType === 'CONTEST_PARTICIPATION') {
        verifiedContestsCount++;
      } else if (act.activityType === 'PROBLEMS_SOLVED') {
        problemsSolved = Math.max(problemsSolved, meta.problemsSolved || 0);
      }
    }

    let ratingPoints = 0;
    if (highestRating >= 1900) ratingPoints = 35;
    else if (highestRating >= 1600) ratingPoints = 30;
    else if (highestRating >= 1400) ratingPoints = 25;
    else if (highestRating >= 1200) ratingPoints = 18;
    else if (highestRating >= 1000) ratingPoints = 10;
    else if (highestRating > 0) ratingPoints = 5;

    const contestParticipationPoints = Math.min(10, verifiedContestsCount * 2.0);

    let problemPoints = 0;
    if (problemsSolved >= 300) problemPoints = 5;
    else if (problemsSolved >= 150) problemPoints = 3.5;
    else if (problemsSolved >= 50) problemPoints = 2;
    else if (problemsSolved > 0) problemPoints = 1;

    codingScore = Math.min(this.weights.codingWeight, ratingPoints + contestParticipationPoints + problemPoints);

    // -------------------------------------------------------------
    // TOTAL ELIGIBLE SCORE
    // Total Score = Verified Internship XP + Verified Hackathon XP + Valid Daily Check-in XP + Earned Consistency XP.
    // -------------------------------------------------------------
    const fourActivitiesTotal = Math.round((internshipScore + hackathonScore + checkInScore + consistencyScore) * 10) / 10;

    // In pure contest platform testing environments without career activities, fallback to codingScore
    const totalScore = fourActivitiesTotal > 0
      ? fourActivitiesTotal
      : (codingActivities.length > 0 && internshipScore === 0 && hackathonScore === 0 && checkInScore === 0 && consistencyScore === 0 ? codingScore : 0);

    // -------------------------------------------------------------
    // ACHIEVEMENT BADGES
    // -------------------------------------------------------------
    const badges: AchievementBadge[] = [];
    const nowIso = new Date().toISOString();

    if (highestRating >= 1900) {
      badges.push({
        id: 'badge-grandmaster',
        title: 'Elite Competitor',
        category: 'CODING',
        description: 'Achieved 1900+ verified contest rating',
        icon: 'Award',
        earnedAt: nowIso,
        rarity: 'LEGENDARY',
      });
    } else if (highestRating >= 1400) {
      badges.push({
        id: 'badge-specialist',
        title: 'Contest Specialist',
        category: 'CODING',
        description: 'Achieved 1400+ verified contest rating',
        icon: 'Code',
        earnedAt: nowIso,
        rarity: 'RARE',
      });
    }

    if (verifiedContestsCount >= 5) {
      badges.push({
        id: 'badge-contest-veteran',
        title: 'Contest Veteran',
        category: 'CODING',
        description: 'Completed 5+ verified coding contests',
        icon: 'Zap',
        earnedAt: nowIso,
        rarity: 'RARE',
      });
    }

    if (winnerCount > 0) {
      badges.push({
        id: 'badge-hackathon-winner',
        title: 'Hackathon Champion',
        category: 'HACKATHON',
        description: 'Verified 1st Place / Winner in campus or national hackathon',
        icon: 'Trophy',
        earnedAt: nowIso,
        rarity: 'LEGENDARY',
      });
    } else if (finalistCount > 0) {
      badges.push({
        id: 'badge-hackathon-finalist',
        title: 'Hackathon Finalist',
        category: 'HACKATHON',
        description: 'Shortlisted as finalist in verified hackathon',
        icon: 'Medal',
        earnedAt: nowIso,
        rarity: 'EPIC',
      });
    }

    if (offersCount > 0) {
      badges.push({
        id: 'badge-internship-selected',
        title: 'Placement Selected',
        category: 'INTERNSHIP',
        description: 'Verified internship or job offer received',
        icon: 'Briefcase',
        earnedAt: nowIso,
        rarity: 'LEGENDARY',
      });
    } else if (interviewsCount > 0) {
      badges.push({
        id: 'badge-interview-shortlist',
        title: 'Interview Shortlisted',
        category: 'INTERNSHIP',
        description: 'Cleared rounds to enter verified technical interviews',
        icon: 'CheckCircle2',
        earnedAt: nowIso,
        rarity: 'RARE',
      });
    }

    const uniqueWeeks = new Set<string>();
    verifiedActivities.forEach((act) => {
      const d = act.occurredAt || act.createdAt;
      if (d) {
        const dateObj = new Date(d);
        const weekKey = `${dateObj.getUTCFullYear()}-W${Math.ceil(dateObj.getUTCDate() / 7)}`;
        uniqueWeeks.add(weekKey);
      }
    });
    const activeWeeksCount = uniqueWeeks.size;

    if (activeWeeksCount >= 4 || checkInCount >= 14) {
      badges.push({
        id: 'badge-consistent-coder',
        title: 'Consistency Star',
        category: 'CONSISTENCY',
        description: 'Maintained verified activity across consecutive weeks',
        icon: 'Flame',
        earnedAt: nowIso,
        rarity: 'EPIC',
      });
    }

    const categoryBreakdown: CategoryBreakdown = {
      coding: {
        score: codingScore,
        maxScore: this.weights.codingWeight,
        percentage: Math.min(100, Math.round((codingScore / this.weights.codingWeight) * 100)),
        verifiedContestsCount,
        problemsSolved,
        highestRating,
        platforms: Array.from(codingPlatformsSet),
      },
      hackathon: {
        score: hackathonScore,
        maxScore: this.weights.hackathonWeight,
        percentage: Math.min(100, Math.round((hackathonScore / this.weights.hackathonWeight) * 100)),
        registrationsCount,
        participationsCount,
        finalistCount,
        winnerCount,
      },
      internship: {
        score: internshipScore,
        maxScore: this.weights.internshipWeight,
        percentage: Math.min(100, Math.round((internshipScore / this.weights.internshipWeight) * 100)),
        applicationsCount,
        interviewsCount,
        offersCount,
      },
      consistency: {
        score: consistencyScore,
        maxScore: this.weights.consistencyWeight,
        percentage: Math.min(100, Math.round((consistencyScore / this.weights.consistencyWeight) * 100)),
        activeWeeksCount,
        activeDaysCount: checkInCount,
        ratingDelta: highestRating >= 1400 ? 50 : 0,
      },
      dailyCheckIn: {
        score: checkInScore,
        checkInCount,
      },
    };

    // Calculate when student achieved/completed their latest verified activity
    let completedAtTimestamp = 0;
    for (const act of verifiedActivities) {
      const d = act.occurredAt || act.verifiedAt || act.createdAt;
      if (d) {
        const t = new Date(d).getTime();
        if (t > completedAtTimestamp) {
          completedAtTimestamp = t;
        }
      }
    }
    for (const ci of checkIns) {
      if (ci.createdAt) {
        const t = new Date(ci.createdAt).getTime();
        if (t > completedAtTimestamp) {
          completedAtTimestamp = t;
        }
      }
    }

    if (completedAtTimestamp === 0) {
      if (userCreatedAt) {
        completedAtTimestamp = new Date(userCreatedAt).getTime();
      } else {
        const u = await prisma.user.findUnique({
          where: { id: studentId },
          select: { createdAt: true },
        });
        completedAtTimestamp = u?.createdAt ? new Date(u.createdAt).getTime() : 0;
      }
    }

    return {
      codingScore,
      hackathonScore,
      internshipScore,
      checkInScore,
      consistencyScore,
      totalScore,
      earnedXp: totalScore,
      categoryBreakdown,
      badges,
      isProvisional,
      provisionalReason,
      completedAtTimestamp,
    };
  }

  /**
   * Generates recommendations tailored to student's score gaps
   */
  generateRecommendations(breakdown: CategoryBreakdown, isProvisional: boolean): string[] {
    const recs: string[] = [];

    if (isProvisional || breakdown.coding.platforms.length === 0) {
      recs.push('Connect your contest profile to earn verified points in Competitive Coding.');
    } else if (breakdown.coding.score < 25) {
      recs.push('Participate in this weekend’s contest to raise your verified rating band.');
    }

    if (breakdown.hackathon.score < 10) {
      recs.push('Submit your Hackathon registration confirmation to earn Hackathon XP.');
    }

    if (breakdown.internship.score < 8) {
      recs.push('Apply to open campus drives and record your interview confirmations to earn Internship XP.');
    }

    if (breakdown.consistency.score < 6) {
      recs.push('Maintain your daily check-in streak to unlock the 7-day Streak Bonus (+25 XP).');
    }

    if (recs.length === 0) {
      recs.push('Outstanding performance! Keep checking in and participating to defend your class rank.');
    }

    return recs;
  }

  /**
   * Recalculates and persists rankings for an entire class.
   * Sorts eligible students by total score descending: ORDER BY totalScore DESC.
   * Uses consistent tie-breaking:
   * 1. totalScore DESC
   * 2. Earliest completedAtTimestamp (who achieved the score earlier)
   * 3. Student name alphabetically
   * 4. Deterministic studentId
   * Assigns dense rank for ties where identical scores share rank, and subsequent ranks increment accordingly.
   */
  async computeClassLeaderboard(
    classIdentifierOrOptions: any,
    periodTypeArg?: PeriodType,
    currentStudentIdArg?: string
  ): Promise<{
    rankings: LeaderboardStudentEntry[];
    currentStudentEntry: LeaderboardStudentEntry | null;
    categoryBreakdown: CategoryBreakdown;
    recommendations: string[];
  }> {
    const department = classIdentifierOrOptions?.department || '';
    const year = Number(classIdentifierOrOptions?.year) || 1;
    const section = classIdentifierOrOptions?.section || '';
    const college = classIdentifierOrOptions?.college;
    const periodType: PeriodType = (periodTypeArg || classIdentifierOrOptions?.period || classIdentifierOrOptions?.periodType || 'ALL_TIME') as PeriodType;
    const currentStudentId = currentStudentIdArg || classIdentifierOrOptions?.currentStudentId || classIdentifierOrOptions?.requestingStudentId || '';

    const periodKey = getPeriodKey(periodType);
    const prevPeriodKey = getPreviousPeriodKey(periodType);
    const periodDetails = getPeriodDetails(periodType);
    const isAllTime = periodType === 'ALL_TIME' || periodKey === 'ALL_TIME';

    const periodStart = new Date(periodDetails.startDate);
    const periodEnd = new Date(periodDetails.endDate);
    const periodStartDay = periodDetails.startDate.slice(0, 10);
    const periodEndDay = periodDetails.endDate.slice(0, 10);

    const cacheKey = `${(department || '').trim().toLowerCase()}_${year}_${(section || '').trim().toLowerCase()}_${periodType}`;
    const now = Date.now();
    let cachedCohort = cohortLeaderboardCache.get(cacheKey);

    if (!cachedCohort || now - cachedCohort.cachedAt > LEADERBOARD_CACHE_TTL_MS) {
      let activePromise = inFlightLeaderboardPromises.get(cacheKey);
      if (!activePromise) {
        activePromise = (async () => {
          // 1. Find all students belonging strictly to this class cohort (matching department aliases)
          const deptVariants = getDepartmentVariants(department);
          const whereClause: any = {
            role: 'STUDENT',
            profile: {
              department: { in: deptVariants, mode: 'insensitive' },
              year: year,
              section: { equals: section, mode: 'insensitive' },
            },
          };

          let students = await prisma.user.findMany({
            where: whereClause,
            include: {
              profile: true,
            },
          });

          // If section has fewer than 5 students, expand to include department cohort
          if (students.length < 5) {
            students = await prisma.user.findMany({
              where: {
                role: 'STUDENT',
                profile: {
                  department: { in: deptVariants, mode: 'insensitive' },
                },
              },
              include: {
                profile: true,
              },
            });
          }

          // Ensure current student is included in the ranking calculation
          if (currentStudentId && !students.some((s) => s.id === currentStudentId)) {
            const currentStu = await prisma.user.findUnique({
              where: { id: currentStudentId },
              include: { profile: true },
            });
            if (currentStu) {
              students.push(currentStu);
            }
          }

          if (students.length === 0) {
            return {
              rankings: [],
              scoredList: [],
              cachedAt: Date.now(),
            };
          }

          const studentIds = students.map((s) => s.id);

          // 2. Batch-fetch cohort data partitioned by period
          const [allActivities, allProfiles, prevSnapshots, streakRows, allCheckIns, allPoints] = await Promise.all([
            prisma.verifiedActivity.findMany({
              where: {
                studentId: { in: studentIds },
                verificationStatus: 'VERIFIED',
                ...(isAllTime
                  ? {}
                  : {
                      OR: [
                        { occurredAt: { gte: periodStart, lte: periodEnd } },
                        { occurredAt: null, createdAt: { gte: periodStart, lte: periodEnd } },
                      ],
                    }),
              },
            }),
            prisma.verifiedProfile.findMany({
              where: { studentId: { in: studentIds } },
            }),
            prevPeriodKey
              ? prisma.leaderboardSnapshot.findMany({
                  where: {
                    studentId: { in: studentIds },
                    periodType,
                    periodKey: prevPeriodKey,
                  },
                })
              : Promise.resolve([]),
            prisma.$queryRawUnsafe<Array<{ studentId: string; streakDays: number }>>(
              `SELECT "studentId", COUNT(DISTINCT "activityDate")::int AS "streakDays"
               FROM student_daily_streaks
               WHERE "studentId" = ANY($1)
               GROUP BY "studentId"`,
              studentIds
            ).catch(() => []),
            prisma.dailyCheckIn.findMany({
              where: {
                studentId: { in: studentIds },
                ...(isAllTime ? {} : { checkInDate: { gte: periodStartDay, lte: periodEndDay } }),
              },
            }).catch(() => []),
            prisma.pointsLedger.findMany({
              where: {
                studentId: { in: studentIds },
                ...(isAllTime
                  ? {}
                  : {
                      OR: [
                        { periodKey },
                        { createdAt: { gte: periodStart, lte: periodEnd } },
                      ],
                    }),
              },
            }).catch(() => []),
          ]);

          const activitiesMap = new Map<string, any[]>();
          for (const a of allActivities) {
            let list = activitiesMap.get(a.studentId);
            if (!list) {
              list = [];
              activitiesMap.set(a.studentId, list);
            }
            list.push(a);
          }

          const profilesMap = new Map<string, any[]>();
          for (const p of allProfiles) {
            let list = profilesMap.get(p.studentId);
            if (!list) {
              list = [];
              profilesMap.set(p.studentId, list);
            }
            list.push(p);
          }

          const checkInsMap = new Map<string, any[]>();
          for (const ci of (allCheckIns || [])) {
            let list = checkInsMap.get(ci.studentId);
            if (!list) {
              list = [];
              checkInsMap.set(ci.studentId, list);
            }
            list.push(ci);
          }

          const pointsMap = new Map<string, any[]>();
          for (const pt of (allPoints || [])) {
            let list = pointsMap.get(pt.studentId);
            if (!list) {
              list = [];
              pointsMap.set(pt.studentId, list);
            }
            list.push(pt);
          }

          const prevRankMap = new Map<string, number>();
          for (const s of (prevSnapshots || [])) {
            prevRankMap.set(s.studentId, s.rank);
          }

          // 2b. Compute authoritative score for all cohort members purely in-memory
          const scoredList = await Promise.all(
            students.map(async (stu) => {
              const stuActivities = activitiesMap.get(stu.id) || [];
              const stuProfiles = profilesMap.get(stu.id) || [];
              const stuCheckIns = checkInsMap.get(stu.id) || [];
              const stuPoints = pointsMap.get(stu.id) || [];

              const scores = await this.calculateStudentScore(
                stu.id,
                periodKey,
                stuActivities,
                stuProfiles,
                stu.createdAt,
                stuCheckIns,
                stuPoints,
                periodType
              );

              return {
                student: stu,
                scores,
                previousRank: prevRankMap.get(stu.id) ?? null,
              };
            })
          );

          const streakMap = new Map<string, number>();
          (streakRows || []).forEach((r) => streakMap.set(r.studentId, Number(r.streakDays) || 0));

          // 3. Sort students descending by total eligible score: ORDER BY totalScore DESC
          // Tie-breakers: earlier completedAtTimestamp -> alphabetical name -> deterministic id
          scoredList.sort((a, b) => {
            if (b.scores.totalScore !== a.scores.totalScore) {
              return b.scores.totalScore - a.scores.totalScore;
            }
            if (a.scores.completedAtTimestamp !== b.scores.completedAtTimestamp) {
              return a.scores.completedAtTimestamp - b.scores.completedAtTimestamp;
            }
            const nameCmp = (a.student.name || '').localeCompare(b.student.name || '');
            if (nameCmp !== 0) return nameCmp;
            return a.student.id.localeCompare(b.student.id);
          });

          // 4. Assign Dense Ranks:
          // Equal scores share the exact same rank, next distinct score increments rank
          const calculatedRankings: LeaderboardStudentEntry[] = [];
          let currentRank = 1;

          for (let i = 0; i < scoredList.length; i++) {
            if (i > 0) {
              if (scoredList[i].scores.totalScore < scoredList[i - 1].scores.totalScore) {
                currentRank++;
              }
            }
            const item = scoredList[i];
            const entryRank = currentRank;

            const prevRank = item.previousRank;
            const rankMovement = prevRank !== null ? prevRank - entryRank : 0;

            const entry: LeaderboardStudentEntry = {
              rank: entryRank,
              previousRank: prevRank,
              rankMovement,
              studentId: item.student.id,
              name: item.student.name,
              isCurrentUser: false,
              department,
              year,
              section,
              totalScore: item.scores.totalScore,
              categoryScores: {
                internship: item.scores.internshipScore,
                hackathon: item.scores.hackathonScore,
                dailyCheckIn: item.scores.checkInScore,
                consistency: item.scores.consistencyScore,
                coding: item.scores.codingScore,
              },
              badges: item.scores.badges,
              isProvisional: item.scores.isProvisional,
              provisionalReason: item.scores.provisionalReason,
              lastSyncedAt: new Date().toISOString(),
              completedAt: item.scores.completedAtTimestamp
                ? new Date(item.scores.completedAtTimestamp).toISOString()
                : null,
              streak: streakMap.get(item.student.id) || (item.scores.totalScore > 0 ? 1 : 0),
              earnedXp: item.scores.totalScore, // Displayed XP matches score used for ranking
              registerNo: item.student.profile?.registerNo || undefined,
              profilePhotoUrl: item.student.profile?.profilePhotoUrl || null,
            };

            calculatedRankings.push(entry);
          }

          // Persist snapshots to leaderboard_snapshots table asynchronously without blocking response
          Promise.all(
            calculatedRankings.map((r, i) => {
              const item = scoredList[i];
              return prisma.leaderboardSnapshot.upsert({
                where: {
                  studentId_periodType_periodKey: {
                    studentId: item.student.id,
                    periodType,
                    periodKey,
                  },
                },
                update: {
                  department,
                  year,
                  section,
                  college: college || null,
                  codingScore: item.scores.codingScore,
                  hackathonScore: item.scores.hackathonScore,
                  internshipScore: item.scores.internshipScore,
                  consistencyScore: item.scores.consistencyScore,
                  totalScore: item.scores.totalScore,
                  rank: r.rank,
                  previousRank: item.previousRank,
                  badges: item.scores.badges as any,
                  isProvisional: item.scores.isProvisional,
                  calculatedAt: new Date(),
                },
                create: {
                  studentId: item.student.id,
                  department,
                  year,
                  section,
                  college: college || null,
                  periodType,
                  periodKey,
                  codingScore: item.scores.codingScore,
                  hackathonScore: item.scores.hackathonScore,
                  internshipScore: item.scores.internshipScore,
                  consistencyScore: item.scores.consistencyScore,
                  totalScore: item.scores.totalScore,
                  rank: r.rank,
                  previousRank: item.previousRank,
                  badges: item.scores.badges as any,
                  isProvisional: item.scores.isProvisional,
                  calculatedAt: new Date(),
                },
              });
            })
          ).catch((err) => console.warn('Leaderboard background snapshot upsert warning:', err?.message || err));

          return {
            rankings: calculatedRankings,
            scoredList,
            cachedAt: Date.now(),
          };
        })();

        inFlightLeaderboardPromises.set(cacheKey, activePromise);
      }

      try {
        cachedCohort = await activePromise;
        cohortLeaderboardCache.set(cacheKey, cachedCohort);
      } finally {
        inFlightLeaderboardPromises.delete(cacheKey);
      }
    }

    if (!cachedCohort || cachedCohort.rankings.length === 0) {
      return {
        rankings: [],
        currentStudentEntry: null,
        categoryBreakdown: {
          coding: { score: 0, maxScore: 50, percentage: 0, verifiedContestsCount: 0, problemsSolved: 0, highestRating: 0, platforms: [] },
          hackathon: { score: 0, maxScore: 25, percentage: 0, registrationsCount: 0, participationsCount: 0, finalistCount: 0, winnerCount: 0 },
          internship: { score: 0, maxScore: 15, percentage: 0, applicationsCount: 0, interviewsCount: 0, offersCount: 0 },
          consistency: { score: 0, maxScore: 10, percentage: 0, activeWeeksCount: 0, activeDaysCount: 0, ratingDelta: 0 },
          dailyCheckIn: { score: 0, checkInCount: 0 },
        },
        recommendations: ['Complete your profile and check in daily to begin climbing the leaderboard.'],
      };
    }

    // Clone and flag currentUser accurately for this specific request
    const rankings = cachedCohort.rankings.map((r) => ({
      ...r,
      isCurrentUser: r.studentId === currentStudentId,
    }));

    const currentStudentEntry = rankings.find((r) => r.isCurrentUser) || null;
    const currentStudentScores = cachedCohort.scoredList.find((s) => s.student.id === currentStudentId)?.scores;
    const breakdown = currentStudentScores?.categoryBreakdown || {
      coding: { score: 0, maxScore: 50, percentage: 0, verifiedContestsCount: 0, problemsSolved: 0, highestRating: 0, platforms: [] },
      hackathon: { score: 0, maxScore: 25, percentage: 0, registrationsCount: 0, participationsCount: 0, finalistCount: 0, winnerCount: 0 },
      internship: { score: 0, maxScore: 15, percentage: 0, applicationsCount: 0, interviewsCount: 0, offersCount: 0 },
      consistency: { score: 0, maxScore: 10, percentage: 0, activeWeeksCount: 0, activeDaysCount: 0, ratingDelta: 0 },
      dailyCheckIn: { score: 0, checkInCount: 0 },
    };

    const recommendations = this.generateRecommendations(breakdown, currentStudentScores?.isProvisional || false);

    return {
      rankings,
      currentStudentEntry,
      categoryBreakdown: breakdown,
      recommendations,
    };
  }
}

export const scoringEngine = new ScoringEngine();
