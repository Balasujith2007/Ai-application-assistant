import prisma from '@/lib/prisma';
import {
  BADGE_CATALOG,
  BadgeDefinition,
  BadgeStatus,
  StudentActivityStats,
} from './badgeConfig';
import { verificationLedger } from '../leaderboard/verificationLedger';

/**
 * Timezone-aware date helper for consistent daily streak tracking
 * Configured default: 'Asia/Kolkata' (IST)
 */
export function getFormattedDateInTz(date: Date = new Date(), timeZone: string = 'Asia/Kolkata'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date); // Outputs YYYY-MM-DD
  } catch {
    return date.toISOString().split('T')[0];
  }
}

export class BadgeEngine {
  /**
   * Records a verified qualifying daily activity and updates streaks idempotently.
   */
  async recordDailyActivity(
    studentId: string,
    activityType: string,
    sourceReference?: string,
    activityDateOverride?: string
  ): Promise<{
    currentStreak: number;
    longestStreak: number;
    totalActiveDays: number;
  }> {
    const activityDate = activityDateOverride || getFormattedDateInTz();

    // Idempotent upsert via raw SQL or prisma to prevent duplicate daily credit
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO student_daily_streaks (id, "studentId", "activityDate", "activityType", "sourceReference", "qualifyingScore", "createdAt")
         VALUES ($1, $2, $3, $4, $5, 1.0, NOW())
         ON CONFLICT ("studentId", "activityDate") DO NOTHING`,
        `streak_${studentId}_${activityDate}`,
        studentId,
        activityDate,
        activityType,
        sourceReference || null
      );
    } catch {
      // Ignore conflict
    }

    // Recalculate streak
    return await this.calculateStreak(studentId);
  }

  /**
   * Computes consecutive streak, longest streak, and active days without fabricating records.
   */
  async calculateStreak(studentId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    totalActiveDays: number;
    activeWeeksInMonth: number;
    comebackDays: number;
  }> {
    const rawStreaks = await prisma.$queryRawUnsafe<Array<{ activityDate: string }>>(
      `SELECT "activityDate" FROM student_daily_streaks
       WHERE "studentId" = $1
       ORDER BY "activityDate" DESC`,
      studentId
    );

    if (!rawStreaks || rawStreaks.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalActiveDays: 0,
        activeWeeksInMonth: 0,
        comebackDays: 0,
      };
    }

    const uniqueDates = Array.from(new Set(rawStreaks.map((r) => r.activityDate))).sort().reverse();
    const totalActiveDays = uniqueDates.length;

    const todayStr = getFormattedDateInTz();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getFormattedDateInTz(yesterday);

    let currentStreak = 0;
    // Check if streak is active (active today or yesterday)
    let pointerDate = uniqueDates[0] === todayStr ? todayStr : uniqueDates[0] === yesterdayStr ? yesterdayStr : null;

    if (pointerDate) {
      currentStreak = 1;
      let cur = new Date(pointerDate);

      for (let i = 1; i < uniqueDates.length; i++) {
        const expectedPrev = new Date(cur);
        expectedPrev.setDate(expectedPrev.getDate() - 1);
        const expectedPrevStr = getFormattedDateInTz(expectedPrev);

        if (uniqueDates[i] === expectedPrevStr) {
          currentStreak++;
          cur = expectedPrev;
        } else {
          break;
        }
      }
    }

    // Calculate longest historical streak
    let longestStreak = currentStreak;
    let tempStreak = 1;

    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const cur = new Date(uniqueDates[i]);
      const prev = new Date(uniqueDates[i + 1]);
      const diffDays = Math.round((cur.getTime() - prev.getTime()) / (1000 * 3600 * 24));

      if (diffDays === 1) {
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 1;
      }
    }

    // Active weeks in the current month
    const curYearMonth = todayStr.slice(0, 7); // YYYY-MM
    const currentMonthDates = uniqueDates.filter((d) => d.startsWith(curYearMonth));
    const weeksSet = new Set<number>();
    currentMonthDates.forEach((d) => {
      const dayNum = parseInt(d.slice(8, 10), 10);
      weeksSet.add(Math.ceil(dayNum / 7));
    });
    const activeWeeksInMonth = weeksSet.size;

    // Comeback days: if there was a gap >= 2 days and student logged >= 3 days since
    let comebackDays = 0;
    if (currentStreak >= 3 && uniqueDates.length > currentStreak) {
      const breakIdx = currentStreak;
      const lastActiveBeforeStreak = new Date(uniqueDates[breakIdx]);
      const firstActiveOfStreak = new Date(uniqueDates[currentStreak - 1]);
      const gap = Math.round((firstActiveOfStreak.getTime() - lastActiveBeforeStreak.getTime()) / (1000 * 3600 * 24));
      if (gap >= 2) {
        comebackDays = currentStreak;
      }
    }

    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      totalActiveDays,
      activeWeeksInMonth,
      comebackDays,
    };
  }

  /**
   * Aggregates authoritative student stats across verified models.
   */
  async gatherStudentStats(studentId: string): Promise<StudentActivityStats> {
    // 1. Fetch verified activities
    const verifiedActivities = await prisma.verifiedActivity.findMany({
      where: {
        studentId,
        verificationStatus: 'VERIFIED',
      },
    });

    let problemsSolved = 0;
    let contestsCount = 0;
    let highestRating = 0;
    let hackathonsCount = 0;
    let hackathonProjectSubmitted = false;
    let interviewsCount = 0;
    let offersCount = 0;

    for (const act of verifiedActivities) {
      if (act.sourceType === 'CONTEST') {
        contestsCount++;
        if (act.activityType === 'RATING_ACHIEVEMENT' && act.rawMetadata) {
          const meta = act.rawMetadata as any;
          const rating = meta.rating || meta.newRating || meta.currentRating || 0;
          if (rating > highestRating) highestRating = rating;
        }
      } else if (act.activityType === 'PROBLEMS_SOLVED' && act.rawMetadata) {
        const meta = act.rawMetadata as any;
        problemsSolved += meta.solvedCount || meta.problemsSolved || 1;
      } else if (act.sourceType === 'HACKATHON') {
        hackathonsCount++;
        if (act.activityType === 'HACKATHON_WINNER' || act.activityType === 'HACKATHON_FINALIST' || act.activityType === 'HACKATHON_PARTICIPATION') {
          hackathonProjectSubmitted = true;
        }
      } else if (act.sourceType === 'INTERNSHIP') {
        if (act.activityType === 'INTERNSHIP_INTERVIEW') interviewsCount++;
        if (act.activityType === 'INTERNSHIP_OFFER') offersCount++;
      }
    }

    // Also count applications from Application model
    const totalAppsFromDb = await prisma.application.count({
      where: { userId: studentId },
    });
    const appsFromRegistrations = await prisma.opportunityRegistration.count({
      where: { studentId },
    });
    const applicationsCount = Math.max(totalAppsFromDb, appsFromRegistrations);

    // Also check Hackathon registrations
    const hackathonRegistrations = await prisma.opportunityRegistration.count({
      where: {
        studentId,
        opportunity: { type: 'HACKATHON' },
      },
    });
    if (hackathonRegistrations > hackathonsCount) {
      hackathonsCount = hackathonRegistrations;
    }

    // Also check Interviews from Interview model
    const interviewsFromDb = await prisma.interview.count({
      where: { userId: studentId },
    });
    if (interviewsFromDb > interviewsCount) {
      interviewsCount = interviewsFromDb;
    }

    // Check Skills in Profile
    const profile = await prisma.profile.findUnique({
      where: { userId: studentId },
      include: {
        skills: {
          include: { skill: true },
        },
      },
    });

    const skillNames = (profile?.skills || []).map((ps) => ps.skill.name.toLowerCase());
    const hasPythonSkill = skillNames.some((s) => s.includes('python'));
    const hasSqlSkill = skillNames.some((s) => s.includes('sql') || s.includes('database') || s.includes('postgres') || s.includes('mysql'));
    const hasDsaSkill = skillNames.some((s) => s.includes('dsa') || s.includes('data structure') || s.includes('algorithm'));
    const hasWebDevSkill = skillNames.some((s) => s.includes('web') || s.includes('react') || s.includes('node') || s.includes('javascript') || s.includes('typescript') || s.includes('next'));

    // Check streaks
    const streakStats = await this.calculateStreak(studentId);

    // Total XP from points ledger
    const ledgerAgg = await prisma.pointsLedger.aggregate({
      where: { studentId },
      _sum: { pointsAwarded: true },
    });
    const totalXp = Math.round((ledgerAgg._sum.pointsAwarded || 0) * 10) / 10;

    return {
      problemsSolved,
      contestsCount,
      highestRating,
      currentStreakDays: streakStats.currentStreak,
      longestStreakDays: streakStats.longestStreak,
      totalActiveDays: streakStats.totalActiveDays,
      activeWeeksInMonth: streakStats.activeWeeksInMonth,
      comebackDays: streakStats.comebackDays,
      hasPythonSkill,
      hasSqlSkill,
      hasDsaSkill,
      hasWebDevSkill,
      applicationsCount,
      hackathonsCount,
      hackathonProjectSubmitted,
      interviewsCount,
      offersCount,
      totalXp,
    };
  }

  /**
   * Evaluates all badge criteria, awards newly eligible badges idempotently,
   * logs to PointsLedger and AchievementHistory, and returns newly unlocked badges.
   */
  async evaluateAndAwardBadges(studentId: string): Promise<{
    newlyUnlocked: BadgeDefinition[];
    newlyAwarded: BadgeDefinition[];
    totalEarned: number;
    totalAvailable: number;
  }> {
    const stats = await this.gatherStudentStats(studentId);

    // Fetch existing awarded badges for deduplication
    const existingBadges = await prisma.$queryRawUnsafe<Array<{ badgeId: string }>>(
      `SELECT "badgeId" FROM student_badges WHERE "studentId" = $1`,
      studentId
    );
    const existingBadgeIds = new Set(existingBadges.map((b) => b.badgeId));

    const newlyUnlocked: BadgeDefinition[] = [];

    for (const badge of BADGE_CATALOG) {
      if (existingBadgeIds.has(badge.id)) continue;

      const evalResult = badge.evaluate(stats);

      if (evalResult.isEligible) {
        try {
          // Idempotent insertion
          await prisma.$executeRawUnsafe(
            `INSERT INTO student_badges (
               id, "studentId", "badgeId", category, tier, title, description, icon, "awardedAt", "evidenceData", "unlockedToastSeen", "createdAt", "updatedAt"
             ) VALUES (
               $1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, FALSE, NOW(), NOW()
             ) ON CONFLICT ("studentId", "badgeId") DO NOTHING`,
            `badge_${studentId}_${badge.id}`,
            studentId,
            badge.id,
            badge.category,
            badge.tier,
            badge.title,
            badge.description,
            badge.icon,
            JSON.stringify(evalResult)
          );

          // Log Achievement History
          await prisma.$executeRawUnsafe(
            `INSERT INTO achievement_history (
               id, "studentId", "badgeId", title, category, "xpEarned", "eventDetails", "achievedAt"
             ) VALUES (
               $1, $2, $3, $4, $5, $6, $7, NOW()
             )`,
            `hist_${studentId}_${badge.id}_${Date.now()}`,
            studentId,
            badge.id,
            badge.title,
            badge.category,
            badge.xpReward,
            `Earned ${badge.title} (${badge.tier}): ${badge.criteria}`
          );

          // Award bonus XP into PointsLedger if verifiedActivity exists or through ledger
          if (badge.xpReward > 0) {
            // Find or create dummy consistency activity for badge bonus
            const actId = `act_badge_${studentId}_${badge.id}`;
            await prisma.$executeRawUnsafe(
              `INSERT INTO verified_activities (
                 id, "studentId", "sourceType", "sourcePlatform", "activityType", "externalActivityId", "verificationStatus", "verifiedAt", "createdAt", "updatedAt"
               ) VALUES (
                 $1, $2, 'CONSISTENCY', 'CAREERAI', 'BADGE_BONUS', $3, 'VERIFIED', NOW(), NOW(), NOW()
               ) ON CONFLICT ("studentId", "sourceType", "sourcePlatform", "externalActivityId", "activityType") DO NOTHING`,
              actId,
              studentId,
              badge.id
            );

            await verificationLedger.awardPoints({
              studentId,
              verifiedActivityId: actId,
              category: 'CONSISTENCY',
              pointsAwarded: badge.xpReward,
              reason: `Achievement Reward: Unlocked ${badge.title} badge (+${badge.xpReward} XP)`,
              periodKey: 'ALL_TIME',
            });
          }

          newlyUnlocked.push(badge);
          existingBadgeIds.add(badge.id);
        } catch (err) {
          console.error(`Error awarding badge ${badge.id} to student ${studentId}:`, err);
        }
      }
    }

    return {
      newlyUnlocked,
      newlyAwarded: newlyUnlocked,
      totalEarned: existingBadgeIds.size,
      totalAvailable: BADGE_CATALOG.length,
    };
  }

  /**
   * Returns comprehensive gamification overview including all badges (earned, in-progress, locked),
   * progress bars, exact criteria requirements, next milestone, and achievement history.
   */
  async getStudentBadgesOverview(studentId: string) {
    // 1. Evaluate to make sure all newly earned badges are recognized
    await this.evaluateAndAwardBadges(studentId);

    // 2. Fetch fresh stats
    const stats = await this.gatherStudentStats(studentId);

    // 3. Fetch all awarded badges
    const awardedRows = await prisma.$queryRawUnsafe<Array<{
      badgeId: string;
      tier: string;
      awardedAt: Date;
      unlockedToastSeen: boolean;
    }>>(
      `SELECT "badgeId", tier, "awardedAt", "unlockedToastSeen"
       FROM student_badges
       WHERE "studentId" = $1
       ORDER BY "awardedAt" DESC`,
      studentId
    );

    const awardedMap = new Map<string, { tier: string; awardedAt: string; unlockedToastSeen: boolean }>();
    awardedRows.forEach((r) => {
      awardedMap.set(r.badgeId, {
        tier: r.tier,
        awardedAt: r.awardedAt ? new Date(r.awardedAt).toISOString() : new Date().toISOString(),
        unlockedToastSeen: r.unlockedToastSeen,
      });
    });

    // 4. Map catalog with current status
    const allBadges = BADGE_CATALOG.map((def) => {
      const isAwarded = awardedMap.has(def.id);
      const evalResult = def.evaluate(stats);
      const awardedInfo = awardedMap.get(def.id);

      let status: BadgeStatus = 'LOCKED';
      if (isAwarded) {
        status = 'EARNED';
      } else if (evalResult.progressPercentage > 0) {
        status = 'IN_PROGRESS';
      }

      return {
        id: def.id,
        title: def.title,
        category: def.category,
        tier: def.tier,
        description: def.description,
        criteria: def.criteria,
        icon: def.icon,
        targetValue: def.targetValue,
        unit: def.unit,
        xpReward: def.xpReward,
        status,
        currentValue: evalResult.currentValue,
        progressPercentage: isAwarded ? 100 : evalResult.progressPercentage,
        remainingToUnlock: Math.max(0, def.targetValue - evalResult.currentValue),
        awardedAt: awardedInfo?.awardedAt || null,
        unlockedToastSeen: awardedInfo?.unlockedToastSeen ?? true,
      };
    });

    const earnedBadges = allBadges.filter((b) => b.status === 'EARNED');
    const inProgressBadges = allBadges.filter((b) => b.status === 'IN_PROGRESS');
    const lockedBadges = allBadges.filter((b) => b.status === 'LOCKED');

    // 5. Determine next closest milestone badge
    const unearned = allBadges.filter((b) => b.status !== 'EARNED');
    unearned.sort((a, b) => b.progressPercentage - a.progressPercentage);
    const nextMilestone = unearned[0] || null;

    // 6. Fetch recent achievement history
    const historyRows = await prisma.$queryRawUnsafe<Array<{
      id: string;
      badgeId: string;
      title: string;
      category: string;
      xpEarned: number;
      eventDetails: string;
      achievedAt: Date;
    }>>(
      `SELECT id, "badgeId", title, category, "xpEarned", "eventDetails", "achievedAt"
       FROM achievement_history
       WHERE "studentId" = $1
       ORDER BY "achievedAt" DESC
       LIMIT 10`,
      studentId
    );

    const history = historyRows.map((h) => ({
      id: h.id,
      badgeId: h.badgeId,
      title: h.title,
      category: h.category,
      xpEarned: Number(h.xpEarned),
      eventDetails: h.eventDetails,
      achievedAt: h.achievedAt ? new Date(h.achievedAt).toISOString() : new Date().toISOString(),
    }));

    return {
      summary: {
        totalEarned: earnedBadges.length,
        totalAvailable: allBadges.length,
        completionPercentage: Math.round((earnedBadges.length / allBadges.length) * 100),
        totalXp: stats.totalXp,
        currentStreak: stats.currentStreakDays,
        longestStreak: stats.longestStreakDays,
        totalActiveDays: stats.totalActiveDays,
        activeWeeksInMonth: stats.activeWeeksInMonth,
      },
      nextMilestone,
      stats,
      badges: {
        all: allBadges,
        earned: earnedBadges,
        inProgress: inProgressBadges,
        locked: lockedBadges,
      },
      history,
    };
  }

  /**
   * Marks unlock celebratory toasts as acknowledged so they do not repeat.
   */
  async acknowledgeBadgeToast(studentId: string, badgeId: string) {
    await prisma.$executeRawUnsafe(
      `UPDATE student_badges SET "unlockedToastSeen" = TRUE WHERE "studentId" = $1 AND "badgeId" = $2`,
      studentId,
      badgeId
    );
    return { success: true };
  }
}

export const badgeEngine = new BadgeEngine();

export const recordDailyActivity = badgeEngine.recordDailyActivity.bind(badgeEngine);
export const calculateStreak = badgeEngine.calculateStreak.bind(badgeEngine);
export const evaluateAndAwardBadges = badgeEngine.evaluateAndAwardBadges.bind(badgeEngine);
export const getStudentBadgesOverview = badgeEngine.getStudentBadgesOverview.bind(badgeEngine);
export const acknowledgeBadgeToast = badgeEngine.acknowledgeBadgeToast.bind(badgeEngine);
