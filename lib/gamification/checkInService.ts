import prisma from '@/lib/prisma';
import { XP_CONFIG } from './xpConfig';
import { verificationLedger } from '../leaderboard/verificationLedger';
import { badgeEngine } from './badgeEngine';
import { invalidateLeaderboardCache } from '../leaderboard/scoringEngine';
import {
  buildMilestoneProgress,
  buildWeeklyActivity,
  computeStreakCore,
  getNextStreakMilestone,
  STREAK_ACTIVITY_TYPES,
} from './streakCalculator';

/** Activity types that may contribute to the Career Activity Streak. */
const STREAK_ACTIVITY_TYPES_SQL = [...STREAK_ACTIVITY_TYPES];

/**
 * Returns the current date in YYYY-MM-DD formatted according to the configured timezone.
 */
export function getFormattedDateInTz(date: Date = new Date(), timeZone: string = XP_CONFIG.TIMEZONE): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date); // YYYY-MM-DD
  } catch {
    return date.toISOString().split('T')[0];
  }
}

/**
 * Calculates the next eligible check-in timestamp (midnight of the next calendar day in the configured timezone).
 */
export function getNextEligibleCheckIn(timeZone: string = XP_CONFIG.TIMEZONE): {
  nextCheckInIso: string;
  secondsRemaining: number;
} {
  const now = new Date();
  const todayStr = getFormattedDateInTz(now, timeZone);
  const [year, month, day] = todayStr.split('-').map(Number);

  // Compute midnight of the next day in UTC-relative time
  // Using Intl to find the exact midnight transition for the timezone
  const targetDate = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));
  // In IST (UTC+5:30), midnight is 18:30 UTC of previous day
  // Let's accurately determine the offset:
  const tzOffsetMatch = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
  }).formatToParts(now).find(p => p.type === 'timeZoneName');

  let offsetMinutes = 330; // default to +05:30 (330 mins)
  if (tzOffsetMatch && tzOffsetMatch.value) {
    const match = tzOffsetMatch.value.match(/GMT([+-])(\d+)(?::(\d+))?/);
    if (match) {
      const sign = match[1] === '-' ? -1 : 1;
      const hours = parseInt(match[2], 10);
      const mins = match[3] ? parseInt(match[3], 10) : 0;
      offsetMinutes = sign * (hours * 60 + mins);
    }
  }

  // Next midnight in UTC = Date.UTC(year, month - 1, day + 1) - offsetMinutes * 60000
  const nextMidnightUtc = Date.UTC(year, month - 1, day + 1, 0, 0, 0) - offsetMinutes * 60 * 1000;
  const nextDate = new Date(nextMidnightUtc);

  const diffMs = Math.max(0, nextDate.getTime() - now.getTime());
  const secondsRemaining = Math.floor(diffMs / 1000);

  return {
    nextCheckInIso: nextDate.toISOString(),
    secondsRemaining,
  };
}

const studentStatusCache = new Map<string, { status: any; expiresAt: number }>();

export class CheckInService {
  /**
   * Retrieves the comprehensive daily check-in, streak, and XP status for an authenticated student.
   */
  async getStudentCheckInStatus(studentId: string) {
    const now = Date.now();
    const cached = studentStatusCache.get(studentId);
    if (cached && cached.expiresAt > now) {
      return cached.status;
    }

    const todayStr = getFormattedDateInTz();

    // 1. Today's *verified career activity*. A qualifying day is earned ONLY by
    //    a verified submission (internship/job/hackathon/competition) — never by
    //    logging in, opening the dashboard, or clicking a check-in button.
    let todayActivityCount = 0;
    try {
      const rows = await prisma.$queryRawUnsafe<Array<{ cnt: bigint | number }>>(
        `SELECT COUNT(DISTINCT "activityType") AS cnt FROM student_daily_streaks
         WHERE "studentId" = $1 AND "activityDate" = $2 AND "activityType" = ANY($3)`,
        studentId,
        todayStr,
        STREAK_ACTIVITY_TYPES_SQL
      );
      todayActivityCount = Number(rows?.[0]?.cnt ?? 0);
    } catch {
      todayActivityCount = 0;
    }

    // 2. Fetch authoritative streak metrics from StudentDailyStreak
    const streakInfo = await this.calculateAuthoritativeStreak(studentId);

    // 3. Compute total XP earned today (from pointsLedger entries created today)
    const startOfTodayIso = new Date();
    startOfTodayIso.setHours(0, 0, 0, 0);

    const todayPointsResult = await prisma.pointsLedger.aggregate({
      where: {
        studentId,
        createdAt: { gte: startOfTodayIso },
      },
      _sum: {
        pointsAwarded: true,
      },
    });

    const totalPointsResult = await prisma.pointsLedger.aggregate({
      where: {
        studentId,
      },
      _sum: {
        pointsAwarded: true,
      },
    });

    // 4. Seconds until the next calendar day (Asia/Kolkata) — the streak rolls
    //    over at midnight; no action is required from the student.
    const { nextCheckInIso, secondsRemaining } = getNextEligibleCheckIn();

    // 5. Recent verified career-activity days (14 most recent qualifying days).
    //    Legacy DAILY_CHECKIN rows are excluded — only verified career
    //    submissions (and explicit STREAK_RESCUE restorations) count.
    let recentStreaks: any[] = [];
    try {
      recentStreaks = await prisma.$queryRawUnsafe<any[]>(
        `SELECT DISTINCT "activityDate", MIN("activityType") AS "activityType"
         FROM student_daily_streaks
         WHERE "studentId" = $1 AND "activityType" = ANY($2)
         GROUP BY "activityDate"
         ORDER BY "activityDate" DESC
         LIMIT 14`,
        studentId,
        STREAK_ACTIVITY_TYPES_SQL
      );
    } catch {
      recentStreaks = [];
    }

    // 6. Earliest verified career-activity day — used to avoid flagging days
    // that predate the student's first qualifying activity as "missed".
    let firstActivityDate: string | null = null;
    try {
      const minRows = await prisma.$queryRawUnsafe<Array<{ min: string | null }>>(
        `SELECT MIN("activityDate") AS min FROM student_daily_streaks
         WHERE "studentId" = $1 AND "activityType" = ANY($2)`,
        studentId,
        STREAK_ACTIVITY_TYPES_SQL
      );
      firstActivityDate = minRows?.[0]?.min ?? null;
    } catch {
      firstActivityDate = null;
    }

    // 7. Weekly (Monday→Sunday) strip sourced purely from real verified activity.
    const activeDateSet = new Set<string>(recentStreaks.map((s: any) => s.activityDate));
    const weeklyActivity = buildWeeklyActivity(activeDateSet, todayStr, firstActivityDate);

    // 8. Career streak milestone ladder (5 / 15 / 30 / 50 / 100 / 180 days).
    const careerMilestones = buildMilestoneProgress(streakInfo.currentStreak);
    const nextCareerMilestone = getNextStreakMilestone(streakInfo.currentStreak);

    // Every verified career submission today collapses into ONE streak day.
    const qualifiedToday = todayActivityCount > 0;

    const result = {
      success: true,
      studentId,
      qualifiedToday,
      todayActivityCount,
      lastActivityDate: streakInfo.lastQualifyingDate,
      todayXpEarned: todayPointsResult._sum.pointsAwarded || 0,
      totalEarnedXp: totalPointsResult._sum.pointsAwarded || 0,
      nextCheckIn: nextCheckInIso,
      secondsUntilNextDay: secondsRemaining,
      streak: {
        currentStreak: streakInfo.currentStreak,
        longestStreak: streakInfo.longestStreak,
        totalActiveDays: streakInfo.totalActiveDays,
        lastQualifyingDate: streakInfo.lastQualifyingDate,
        milestones: careerMilestones,
        nextCareerMilestone,
      },
      weeklyActivity,
      recentActivity: recentStreaks.map((s) => ({
        date: s.activityDate,
        type: s.activityType,
        score: s.qualifyingScore,
      })),
    };

    studentStatusCache.set(studentId, { status: result, expiresAt: Date.now() + 30000 });
    return result;
  }

  /**
   * Legacy daily check-in entry point.
   *
   * Daily check-in NO LONGER awards a streak day or any XP. A Career Activity
   * Streak day is earned ONLY by a verified career submission — a successfully
   * submitted internship, job, hackathon or competition application
   * (`CAREER_ACTIVITY_STREAK_TYPES`). This method is retained as a safe no-op so
   * existing clients keep working; it writes nothing to the database, records no
   * verified activity, awards no XP and evaluates no badges. It only returns the
   * student's current, accurate career-activity status.
   */
  async performDailyCheckIn(studentId: string): Promise<{
    success: boolean;
    alreadyCheckedIn: boolean;
    xpAwarded: number;
    streakBonusAwarded: number;
    checkInDate: string;
    message: string;
    status: any;
  }> {
    const todayStr = getFormattedDateInTz();

    // Intentionally a NO-OP for rewards: check-in is no longer a streak or XP
    // source. Nothing is written to `daily_check_ins`, `student_daily_streaks`,
    // `verified_activity` or `points_ledger`.
    studentStatusCache.delete(studentId);
    const status = await this.getStudentCheckInStatus(studentId);

    return {
      success: true,
      alreadyCheckedIn: true,
      xpAwarded: 0,
      streakBonusAwarded: 0,
      checkInDate: todayStr,
      message:
        'Daily check-in no longer affects your streak. Submit an internship, job, hackathon or competition application to earn a Career Activity Streak day.',
      status,
    };
  }

  /**
   * Records a verified career or learning event as a qualifying streak activity.
   * Enforces that multiple qualifying events on the same calendar day count as ONE active streak day.
   */
  async recordQualifyingEvent(
    studentId: string,
    eventType: 'CODING' | 'INTERNSHIP' | 'HACKATHON',
    externalActivityId: string,
    rawMetadata?: any
  ): Promise<{
    success: boolean;
    xpAwarded: number;
    streakExtended: boolean;
    message: string;
  }> {
    const todayStr = getFormattedDateInTz();

    // Determine XP based on event type
    let xpAmount = 0;
    let activityType = '';
    let sourceType: 'CONTEST' | 'INTERNSHIP' | 'HACKATHON' = 'CONTEST';

    if (eventType === 'CODING') {
      xpAmount = XP_CONFIG.CODING_MILESTONE;
      activityType = 'PROBLEMS_SOLVED';
      sourceType = 'CONTEST';
    } else if (eventType === 'INTERNSHIP') {
      xpAmount = XP_CONFIG.INTERNSHIP_APPLICATION_VERIFIED;
      activityType = 'INTERNSHIP_APPLICATION';
      sourceType = 'INTERNSHIP';
    } else if (eventType === 'HACKATHON') {
      xpAmount = XP_CONFIG.HACKATHON_MILESTONE;
      activityType = 'HACKATHON_PARTICIPATION';
      sourceType = 'HACKATHON';
    }

    // 1. Record in VerifiedActivity (Idempotent by unique composite key)
    const activity = await verificationLedger.recordActivity({
      studentId,
      sourceType,
      sourcePlatform: 'CAREERAI',
      activityType,
      externalActivityId,
      verificationStatus: 'VERIFIED',
      verificationMethod: 'SERVER_VERIFICATION',
      occurredAt: new Date(),
      rawMetadata,
    });

    // 2. Award XP in PointsLedger
    await verificationLedger.awardPoints({
      studentId,
      verifiedActivityId: activity.id,
      category: eventType === 'CODING' ? 'CODING' : eventType === 'INTERNSHIP' ? 'INTERNSHIP' : 'HACKATHON',
      pointsAwarded: xpAmount,
      reason: `Verified ${eventType} Milestone (+${xpAmount} XP)`,
      periodKey: 'ALL_TIME',
    });

    // 3. Record a Career Activity Streak day ONLY for a verified career
    //    *submission*. Coding progress is an external-coding metric and must
    //    never contribute to the career application streak. Idempotent: at most
    //    one active streak row per calendar day (`ON CONFLICT DO NOTHING`).
    const careerStreakType: string | null =
      eventType === 'INTERNSHIP'
        ? 'APPLICATION_SUBMITTED'
        : eventType === 'HACKATHON'
        ? 'HACKATHON_REGISTERED'
        : null; // CODING → external coding streak, never the career streak

    let streakExtended = false;
    if (careerStreakType) {
      const streakResult = await prisma.$executeRawUnsafe(
        `INSERT INTO student_daily_streaks (id, "studentId", "activityDate", "activityType", "sourceReference", "qualifyingScore", "createdAt")
         VALUES ($1, $2, $3, $4, $5, 1.0, NOW())
         ON CONFLICT ("studentId", "activityDate") DO NOTHING`,
        `streak_${studentId}_${todayStr}`,
        studentId,
        todayStr,
        careerStreakType,
        externalActivityId
      );
      // If a new row was inserted, the streak was extended for today.
      streakExtended = streakResult > 0;
    }

    // Recalculate badges
    await badgeEngine.evaluateAndAwardBadges(studentId);
    invalidateLeaderboardCache();
    // A qualifying event may have extended today's streak — drop cached status.
    if (streakExtended) studentStatusCache.delete(studentId);

    return {
      success: true,
      xpAwarded: xpAmount,
      streakExtended,
      message: `Verified ${eventType} recorded successfully (+${xpAmount} XP).`,
    };
  }

  /**
   * Reverses a previously awarded activity's XP when an event is invalidated.
   * Produces an audited reversal entry with negative points and updates verification status to REJECTED.
   */
  async reverseActivityXP(
    activityId: string,
    reason: string
  ): Promise<{ success: boolean; reversedXp: number; message: string }> {
    const activity = await prisma.verifiedActivity.findUnique({
      where: { id: activityId },
      include: { pointsEntries: true },
    });

    if (!activity) {
      return { success: false, reversedXp: 0, message: 'Activity record not found.' };
    }

    // Sum positive points previously awarded for this activity
    const totalAwarded = activity.pointsEntries
      .filter((p) => p.pointsAwarded > 0)
      .reduce((acc, p) => acc + p.pointsAwarded, 0);

    if (totalAwarded <= 0) {
      return { success: false, reversedXp: 0, message: 'No points were awarded for this activity.' };
    }

    // Check if reversal was already executed
    const alreadyReversed = activity.pointsEntries.some((p) => p.pointsAwarded < 0);
    if (alreadyReversed) {
      return { success: false, reversedXp: 0, message: 'This activity has already been reversed.' };
    }

    // 1. Update original activity status to REJECTED
    await prisma.verifiedActivity.update({
      where: { id: activityId },
      data: {
        verificationStatus: 'REJECTED',
        rejectionReason: reason,
        updatedAt: new Date(),
      },
    });

    // 2. Create an auditable reversal activity
    const reversalActId = `reversal_${activityId}_${Date.now()}`;
    await prisma.verifiedActivity.create({
      data: {
        id: reversalActId,
        studentId: activity.studentId,
        sourceType: activity.sourceType,
        sourcePlatform: activity.sourcePlatform,
        activityType: 'REVERSAL',
        externalActivityId: `reversal_${activity.externalActivityId}_${Date.now()}`,
        verificationStatus: 'VERIFIED',
        verificationMethod: 'ADMIN_REVERSAL',
        evidenceReference: reason,
        occurredAt: new Date(),
        rawMetadata: { originalActivityId: activityId, reason, reversedPoints: totalAwarded },
      },
    });

    // 3. Add an audited reversal record with negative points
    await prisma.pointsLedger.create({
      data: {
        studentId: activity.studentId,
        verifiedActivityId: reversalActId,
        category: activity.pointsEntries[0]?.category || 'CONSISTENCY',
        pointsAwarded: -totalAwarded,
        scoringRuleVersion: '1.0.0',
        reason: `AUDITED REVERSAL: ${reason} (-${totalAwarded} XP)`,
        periodKey: 'ALL_TIME',
      },
    });

    invalidateLeaderboardCache();

    return {
      success: true,
      reversedXp: totalAwarded,
      message: `Successfully reversed ${totalAwarded} XP for activity ${activityId}.`,
    };
  }

  /**
   * Accurately calculates current consecutive streak, longest streak, and last qualifying date.
   * Handles timezone boundaries, consecutive days, gaps, and missed days correctly.
   */
  async calculateAuthoritativeStreak(studentId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    totalActiveDays: number;
    lastQualifyingDate: string | null;
  }> {
    // Only verified career-activity days count. Legacy `DAILY_CHECKIN` /
    // `CHECKIN` rows are preserved for history but are excluded here, so a
    // check-in-only past can never be treated as a verified career streak.
    const rawStreaks = await prisma.$queryRawUnsafe<Array<{ activityDate: string }>>(
      `SELECT DISTINCT "activityDate" FROM student_daily_streaks
       WHERE "studentId" = $1 AND "activityType" = ANY($2)
       ORDER BY "activityDate" DESC`,
      studentId,
      STREAK_ACTIVITY_TYPES_SQL
    );

    const todayStr = getFormattedDateInTz();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getFormattedDateInTz(yesterday);

    // Strict consecutive-day logic lives in the shared, pure calculator so the
    // dashboard, badges, and reward ledger all report an identical streak value.
    return computeStreakCore(
      (rawStreaks || []).map((r) => r.activityDate),
      todayStr,
      yesterdayStr
    );
  }

  /**
   * Resolves the boundary date strings (today / yesterday) in Asia/Kolkata.
   * Exposed so callers can reuse the authoritative timezone without re-deriving it.
   */
  getStreakBoundaries(): { todayStr: string; yesterdayStr: string } {
    const todayStr = getFormattedDateInTz();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return { todayStr, yesterdayStr: getFormattedDateInTz(yesterday) };
  }
}

export const checkInService = new CheckInService();
