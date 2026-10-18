import prisma from '@/lib/prisma';
import {
  AchievementBadge,
  CategoryBreakdown,
  DEFAULT_SCORING_WEIGHTS,
  LeaderboardStudentEntry,
  PeriodType,
  ScoringWeights,
} from './types';
import { getAllTimePeriodKey, getPeriodKey, getPreviousPeriodKey } from './periodUtils';
import { verificationLedger } from './verificationLedger';

export class ScoringEngine {
  private weights: ScoringWeights;

  constructor(weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS) {
    this.weights = weights;
  }

  /**
   * Calculates category scores and total score out of 100 for a student within a specific period.
   * Only VERIFIED activities in verified_activities earn points.
   */
  async calculateStudentScore(studentId: string, periodKey: string = getAllTimePeriodKey()): Promise<{
    codingScore: number;
    hackathonScore: number;
    internshipScore: number;
    consistencyScore: number;
    totalScore: number;
    categoryBreakdown: CategoryBreakdown;
    badges: AchievementBadge[];
    isProvisional: boolean;
    provisionalReason?: string;
  }> {
    // 1. Fetch all VERIFIED activities for this student
    const verifiedActivities = await prisma.verifiedActivity.findMany({
      where: {
        studentId,
        verificationStatus: 'VERIFIED',
      },
    });

    // Check if student has connected profiles or any verified activity
    const connectedProfiles = await prisma.verifiedProfile.findMany({
      where: { studentId },
    });

    const hasAnyVerifiedActivity = verifiedActivities.length > 0;
    const hasConnectedProfile = connectedProfiles.length > 0;

    let isProvisional = false;
    let provisionalReason: string | undefined;

    if (!hasConnectedProfile && !hasAnyVerifiedActivity) {
      isProvisional = true;
      provisionalReason = 'Connect your contest profile to calculate your verified performance.';
    }

    // -------------------------------------------------------------
    // CATEGORY 1: COMPETITIVE CODING (MAX 50.0 PTS)
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

    // Normalized Rating Score (up to 35 pts):
    // Standard competitive bands:
    // < 1000: 0 pts
    // 1000 - 1199: 10 pts
    // 1200 - 1399 (Codeforces Pupil / LeetCode ~1500): 18 pts
    // 1400 - 1599 (Codeforces Specialist / LeetCode ~1650): 25 pts
    // 1600 - 1899 (Codeforces Expert / LeetCode ~1850): 30 pts
    // 1900+ (Candidate Master / LeetCode Knight 2000+ / Guardian): 35 pts
    let ratingPoints = 0;
    if (highestRating >= 1900) ratingPoints = 35;
    else if (highestRating >= 1600) ratingPoints = 30;
    else if (highestRating >= 1400) ratingPoints = 25;
    else if (highestRating >= 1200) ratingPoints = 18;
    else if (highestRating >= 1000) ratingPoints = 10;
    else if (highestRating > 0) ratingPoints = 5;

    // Contest Participation Points (up to 10 pts): 2 pts per verified contest attended
    const contestParticipationPoints = Math.min(10, verifiedContestsCount * 2.0);

    // Problem Solving Volume Points (up to 5 pts):
    let problemPoints = 0;
    if (problemsSolved >= 300) problemPoints = 5;
    else if (problemsSolved >= 150) problemPoints = 3.5;
    else if (problemsSolved >= 50) problemPoints = 2;
    else if (problemsSolved > 0) problemPoints = 1;

    codingScore = Math.min(this.weights.codingWeight, ratingPoints + contestParticipationPoints + problemPoints);

    // -------------------------------------------------------------
    // CATEGORY 2: HACKATHON PERFORMANCE (MAX 25.0 PTS)
    // -------------------------------------------------------------
    let hackathonScore = 0;
    let registrationsCount = 0;
    let participationsCount = 0;
    let finalistCount = 0;
    let winnerCount = 0;

    const hackathonActivities = verifiedActivities.filter((a) => a.sourceType === 'HACKATHON');

    for (const act of hackathonActivities) {
      if (act.activityType === 'HACKATHON_REGISTRATION') {
        registrationsCount++;
      } else if (act.activityType === 'HACKATHON_PARTICIPATION') {
        participationsCount++;
      } else if (act.activityType === 'HACKATHON_FINALIST') {
        finalistCount++;
      } else if (act.activityType === 'HACKATHON_WINNER') {
        winnerCount++;
      }
    }

    // Milestone scoring:
    // Confirmed/Verified Registration: 2.5 pts each (max 5 pts)
    // Confirmed Participation: 5 pts each (max 10 pts)
    // Finalist: 15 pts
    // Winner: 20 pts
    const regPoints = Math.min(5.0, registrationsCount * 2.5);
    const partPoints = Math.min(10.0, participationsCount * 5.0);
    const awardPoints = winnerCount > 0 ? 20.0 : finalistCount > 0 ? 15.0 : 0.0;

    hackathonScore = Math.min(this.weights.hackathonWeight, regPoints + partPoints + awardPoints);

    // -------------------------------------------------------------
    // CATEGORY 3: INTERNSHIP PROGRESS (MAX 15.0 PTS)
    // -------------------------------------------------------------
    let internshipScore = 0;
    let applicationsCount = 0;
    let interviewsCount = 0;
    let offersCount = 0;

    const internshipActivities = verifiedActivities.filter((a) => a.sourceType === 'INTERNSHIP');

    for (const act of internshipActivities) {
      if (act.activityType === 'INTERNSHIP_APPLICATION') {
        applicationsCount++;
      } else if (act.activityType === 'INTERNSHIP_INTERVIEW') {
        interviewsCount++;
      } else if (act.activityType === 'INTERNSHIP_OFFER') {
        offersCount++;
      }
    }

    // Milestone scoring:
    // Confirmed Application: 1 pt each (max 3 pts)
    // Confirmed Interview Stage: 4 pts each (max 8 pts)
    // Confirmed Offer / Selection: 15 pts (direct category cap)
    if (offersCount > 0) {
      internshipScore = this.weights.internshipWeight; // 15 pts
    } else {
      const appPoints = Math.min(3.0, applicationsCount * 1.0);
      const intPoints = Math.min(8.0, interviewsCount * 4.0);
      internshipScore = Math.min(this.weights.internshipWeight, appPoints + intPoints);
    }

    // -------------------------------------------------------------
    // CATEGORY 4: CONSISTENCY & IMPROVEMENT (MAX 10.0 PTS)
    // -------------------------------------------------------------
    let consistencyScore = 0;
    // Calculate active weeks across past 8 weeks
    const uniqueWeeks = new Set<string>();
    verifiedActivities.forEach((act) => {
      const d = act.occurredAt || act.createdAt;
      const weekKey = `${d.getUTCFullYear()}-W${Math.ceil(d.getUTCDate() / 7)}`;
      uniqueWeeks.add(weekKey);
    });

    const activeWeeksCount = uniqueWeeks.size;
    // 4+ active weeks: 6 pts, 2-3 weeks: 3 pts, 1 week: 1 pt
    let streakPoints = 0;
    if (activeWeeksCount >= 4) streakPoints = 6.0;
    else if (activeWeeksCount >= 2) streakPoints = 3.0;
    else if (activeWeeksCount >= 1) streakPoints = 1.0;

    // Rating improvement or multi-platform bonus (up to 4 pts)
    let improvementPoints = 0;
    if (codingPlatformsSet.size >= 2) improvementPoints += 2.0;
    if (highestRating >= 1400) improvementPoints += 2.0;

    consistencyScore = Math.min(this.weights.consistencyWeight, streakPoints + improvementPoints);

    // -------------------------------------------------------------
    // TOTAL VERIFIED CAREER SCORE (OUT OF 100)
    // -------------------------------------------------------------
    const totalScore = Math.min(
      100.0,
      Math.round((codingScore + hackathonScore + internshipScore + consistencyScore) * 10) / 10
    );

    // -------------------------------------------------------------
    // RECORD TO POINTS LEDGER (Idempotent Audit Trail)
    // -------------------------------------------------------------
    for (const act of verifiedActivities) {
      let cat: 'CODING' | 'HACKATHON' | 'INTERNSHIP' | 'CONSISTENCY' = 'CODING';
      let pts = 0;

      if (act.sourceType === 'CONTEST') {
        cat = 'CODING';
        pts = act.activityType === 'RATING_ACHIEVEMENT' ? ratingPoints : 2.0;
      } else if (act.sourceType === 'HACKATHON') {
        cat = 'HACKATHON';
        pts = act.activityType === 'HACKATHON_WINNER' ? 20.0 : act.activityType === 'HACKATHON_FINALIST' ? 15.0 : 5.0;
      } else if (act.sourceType === 'INTERNSHIP') {
        cat = 'INTERNSHIP';
        pts = act.activityType === 'INTERNSHIP_OFFER' ? 15.0 : act.activityType === 'INTERNSHIP_INTERVIEW' ? 4.0 : 1.0;
      } else {
        cat = 'CONSISTENCY';
        pts = 2.0;
      }

      await verificationLedger.awardPoints({
        studentId,
        verifiedActivityId: act.id,
        category: cat,
        pointsAwarded: pts,
        reason: `Verified milestone: ${act.activityType} on ${act.sourcePlatform}`,
        periodKey,
      });
    }

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

    if (activeWeeksCount >= 4) {
      badges.push({
        id: 'badge-consistent-coder',
        title: 'Consistency Star',
        category: 'CONSISTENCY',
        description: 'Maintained verified activity across 4+ consecutive weeks',
        icon: 'Flame',
        earnedAt: nowIso,
        rarity: 'EPIC',
      });
    }

    const categoryBreakdown: CategoryBreakdown = {
      coding: {
        score: codingScore,
        maxScore: this.weights.codingWeight,
        percentage: Math.round((codingScore / this.weights.codingWeight) * 100),
        verifiedContestsCount,
        problemsSolved,
        highestRating,
        platforms: Array.from(codingPlatformsSet),
      },
      hackathon: {
        score: hackathonScore,
        maxScore: this.weights.hackathonWeight,
        percentage: Math.round((hackathonScore / this.weights.hackathonWeight) * 100),
        registrationsCount,
        participationsCount,
        finalistCount,
        winnerCount,
      },
      internship: {
        score: internshipScore,
        maxScore: this.weights.internshipWeight,
        percentage: Math.round((internshipScore / this.weights.internshipWeight) * 100),
        applicationsCount,
        interviewsCount,
        offersCount,
      },
      consistency: {
        score: consistencyScore,
        maxScore: this.weights.consistencyWeight,
        percentage: Math.round((consistencyScore / this.weights.consistencyWeight) * 100),
        activeWeeksCount,
        ratingDelta: highestRating >= 1400 ? 50 : 0,
      },
    };

    return {
      codingScore,
      hackathonScore,
      internshipScore,
      consistencyScore,
      totalScore,
      categoryBreakdown,
      badges,
      isProvisional,
      provisionalReason,
    };
  }

  /**
   * Generates recommendations tailored to student's score gaps
   */
  generateRecommendations(breakdown: CategoryBreakdown, isProvisional: boolean): string[] {
    const recs: string[] = [];

    if (isProvisional || breakdown.coding.platforms.length === 0) {
      recs.push('Connect your Codeforces or LeetCode profile to earn up to 50 verified points in Competitive Coding.');
    } else if (breakdown.coding.score < 25) {
      recs.push('Participate in this weekend’s Codeforces/LeetCode contest to raise your verified rating band.');
    }

    if (breakdown.hackathon.score < 10) {
      recs.push('Submit your Smart India Hackathon or Unstop registration confirmation to earn up to 25 Hackathon points.');
    }

    if (breakdown.internship.score < 8) {
      recs.push('Apply to open campus drives and record your interview confirmations to earn Internship Progress points.');
    }

    if (breakdown.consistency.score < 6) {
      recs.push('Maintain at least 1 verified activity each week to unlock the Consistency Star bonus (+10 pts).');
    }

    if (recs.length === 0) {
      recs.push('Outstanding performance! Keep participating in competitive contests to defend your class rank.');
    }

    return recs;
  }

  /**
   * Recalculates and persists rankings for an entire class.
   * Uses Standard Competition Ranking (1224 Ranking) for tie policy:
   * Equal scores get the exact same rank, and subsequent ranks increment accordingly.
   */
  async computeClassLeaderboard(
    classIdentifier: { department: string; year: number; section: string; college?: string },
    periodType: PeriodType,
    currentStudentId: string
  ): Promise<{
    rankings: LeaderboardStudentEntry[];
    currentStudentEntry: LeaderboardStudentEntry | null;
    categoryBreakdown: CategoryBreakdown;
    recommendations: string[];
  }> {
    const { department, year, section, college } = classIdentifier;
    const periodKey = getPeriodKey(periodType);
    const prevPeriodKey = getPreviousPeriodKey(periodType);

    // 1. Find all students belonging strictly to this class
    const whereClause: any = {
      role: 'STUDENT',
      profile: {
        department: { equals: department, mode: 'insensitive' },
        year: year,
        section: { equals: section, mode: 'insensitive' },
      },
    };

    if (college) {
      whereClause.profile.college = { equals: college, mode: 'insensitive' };
    }

    const students = await prisma.user.findMany({
      where: whereClause,
      include: {
        profile: true,
      },
    });

    if (students.length === 0) {
      return {
        rankings: [],
        currentStudentEntry: null,
        categoryBreakdown: {
          coding: { score: 0, maxScore: 50, percentage: 0, verifiedContestsCount: 0, problemsSolved: 0, highestRating: 0, platforms: [] },
          hackathon: { score: 0, maxScore: 25, percentage: 0, registrationsCount: 0, participationsCount: 0, finalistCount: 0, winnerCount: 0 },
          internship: { score: 0, maxScore: 15, percentage: 0, applicationsCount: 0, interviewsCount: 0, offersCount: 0 },
          consistency: { score: 0, maxScore: 10, percentage: 0, activeWeeksCount: 0, ratingDelta: 0 },
        },
        recommendations: ['Complete your academic profile and connect contest accounts to begin tracking.'],
      };
    }

    // 2. Compute scores for all class members
    const scoredList: Array<{
      student: any;
      scores: Awaited<ReturnType<ScoringEngine['calculateStudentScore']>>;
      previousRank: number | null;
    }> = [];

    for (const stu of students) {
      const scores = await this.calculateStudentScore(stu.id, periodKey);

      // Check previous snapshot if available
      let previousRank: number | null = null;
      if (prevPeriodKey) {
        const prevSnap = await prisma.leaderboardSnapshot.findUnique({
          where: {
            studentId_periodType_periodKey: {
              studentId: stu.id,
              periodType,
              periodKey: prevPeriodKey,
            },
          },
        });
        if (prevSnap) {
          previousRank = prevSnap.rank;
        }
      }

      scoredList.push({
        student: stu,
        scores,
        previousRank,
      });
    }

    // 3. Sort students descending by totalScore (ties broken by highest codingScore, then hackathonScore)
    scoredList.sort((a, b) => {
      if (b.scores.totalScore !== a.scores.totalScore) {
        return b.scores.totalScore - a.scores.totalScore;
      }
      if (b.scores.codingScore !== a.scores.codingScore) {
        return b.scores.codingScore - a.scores.codingScore;
      }
      return b.scores.hackathonScore - a.scores.hackathonScore;
    });

    // 4. Assign Standard Competition Ranks (Ties get same rank)
    const rankings: LeaderboardStudentEntry[] = [];
    let currentRank = 1;

    for (let i = 0; i < scoredList.length; i++) {
      const item = scoredList[i];

      // If score equals previous student's score, assign same rank; otherwise rank is (i + 1)
      if (i > 0 && item.scores.totalScore === scoredList[i - 1].scores.totalScore) {
        // Keep currentRank same
      } else {
        currentRank = i + 1;
      }

      const prevRank = item.previousRank;
      const rankMovement = prevRank !== null ? prevRank - currentRank : 0;

      const entry: LeaderboardStudentEntry = {
        rank: currentRank,
        previousRank: prevRank,
        rankMovement,
        studentId: item.student.id,
        name: item.student.name,
        isCurrentUser: item.student.id === currentStudentId,
        department,
        year,
        section,
        totalScore: item.scores.totalScore,
        categoryScores: {
          coding: item.scores.codingScore,
          hackathon: item.scores.hackathonScore,
          internship: item.scores.internshipScore,
          consistency: item.scores.consistencyScore,
        },
        badges: item.scores.badges,
        isProvisional: item.scores.isProvisional,
        provisionalReason: item.scores.provisionalReason,
        lastSyncedAt: new Date().toISOString(),
      };

      rankings.push(entry);

      // Persist snapshot to leaderboard_snapshots table
      await prisma.leaderboardSnapshot.upsert({
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
          rank: currentRank,
          previousRank: prevRank,
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
          rank: currentRank,
          previousRank: prevRank,
          badges: item.scores.badges as any,
          isProvisional: item.scores.isProvisional,
          calculatedAt: new Date(),
        },
      });
    }

    const currentStudentEntry = rankings.find((r) => r.isCurrentUser) || null;
    const currentStudentScores = scoredList.find((s) => s.student.id === currentStudentId)?.scores;
    const breakdown = currentStudentScores?.categoryBreakdown || {
      coding: { score: 0, maxScore: 50, percentage: 0, verifiedContestsCount: 0, problemsSolved: 0, highestRating: 0, platforms: [] },
      hackathon: { score: 0, maxScore: 25, percentage: 0, registrationsCount: 0, participationsCount: 0, finalistCount: 0, winnerCount: 0 },
      internship: { score: 0, maxScore: 15, percentage: 0, applicationsCount: 0, interviewsCount: 0, offersCount: 0 },
      consistency: { score: 0, maxScore: 10, percentage: 0, activeWeeksCount: 0, ratingDelta: 0 },
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
