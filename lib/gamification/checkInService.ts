import prisma from '@/lib/prisma';
import { XP_CONFIG } from './xpConfig';
import { verificationLedger } from '../leaderboard/verificationLedger';
import { badgeEngine } from './badgeEngine';
import { invalidateLeaderboardCache } from '../leaderboard/scoringEngine';

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

    // 1. Check if student has already checked in today via the dedicated DailyCheckIn table
    let todayCheckIn: any = null;
    try {
      if ((prisma as any).dailyCheckIn?.findUnique) {
        todayCheckIn = await (prisma as any).dailyCheckIn.findUnique({
          where: {
            studentId_checkInDate: {
              studentId,
              checkInDate: todayStr,
            },
          },
        });
      } else {
        const rows = await prisma.$queryRawUnsafe<any[]>(
          `SELECT * FROM daily_check_ins WHERE "studentId" = $1 AND "checkInDate" = $2 LIMIT 1`,
          studentId,
          todayStr
        );
        todayCheckIn = rows[0] || null;
      }
    } catch {
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM daily_check_ins WHERE "studentId" = $1 AND "checkInDate" = $2 LIMIT 1`,
        studentId,
        todayStr
      ).catch(() => []);
      todayCheckIn = rows[0] || null;
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

    // 4. Calculate next eligible check-in time
    const { nextCheckInIso, secondsRemaining } = getNextEligibleCheckIn();

    // 5. Recent 14-day activity history
    let recentStreaks: any[] = [];
    try {
      if ((prisma as any).studentDailyStreak?.findMany) {
        recentStreaks = await (prisma as any).studentDailyStreak.findMany({
          where: { studentId },
          orderBy: { activityDate: 'desc' },
          take: 14,
        });
      } else {
        recentStreaks = await prisma.$queryRawUnsafe<any[]>(
          `SELECT "activityDate", "activityType" FROM student_daily_streaks WHERE "studentId" = $1 ORDER BY "activityDate" DESC LIMIT 14`,
          studentId
        );
      }
    } catch {
      recentStreaks = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "activityDate", "activityType" FROM student_daily_streaks WHERE "studentId" = $1 ORDER BY "activityDate" DESC LIMIT 14`,
        studentId
      ).catch(() => []);
    }

    // 6. Check eligibility for 7-day streak milestone bonus
    // Bonus is eligible if currentStreak >= 7 and no bonus has been awarded for this streak cycle
    const nextMilestone = Math.ceil((streakInfo.currentStreak + 1) / 7) * 7;
    const progressToNextMilestone = streakInfo.currentStreak % 7;

    const result = {
      success: true,
      studentId,
      checkedInToday: Boolean(todayCheckIn),
      checkInDate: todayCheckIn?.checkInDate || todayStr,
      todayXpEarned: todayPointsResult._sum.pointsAwarded || 0,
      totalEarnedXp: totalPointsResult._sum.pointsAwarded || 0,
      nextEligibleCheckIn: nextCheckInIso,
      secondsUntilNextCheckIn: secondsRemaining,
      streak: {
        currentStreak: streakInfo.currentStreak,
        longestStreak: streakInfo.longestStreak,
        totalActiveDays: streakInfo.totalActiveDays,
        lastQualifyingDate: streakInfo.lastQualifyingDate,
        nextMilestone: nextMilestone === streakInfo.currentStreak ? nextMilestone + 7 : nextMilestone,
        progressInCycle: progressToNextMilestone,
        targetInCycle: 7,
      },
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
   * Executes a daily check-in for the authenticated student.
   * Completely idempotent: database uniqueness constraint prevents duplicate check-ins on the same day.
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

    // 1. Check if already checked in today
    let existingCheckIn: any = null;
    try {
      if ((prisma as any).dailyCheckIn?.findUnique) {
        existingCheckIn = await (prisma as any).dailyCheckIn.findUnique({
          where: {
            studentId_checkInDate: {
              studentId,
              checkInDate: todayStr,
            },
          },
        });
      } else {
        const rows = await prisma.$queryRawUnsafe<any[]>(
          `SELECT * FROM daily_check_ins WHERE "studentId" = $1 AND "checkInDate" = $2 LIMIT 1`,
          studentId,
          todayStr
        );
        existingCheckIn = rows[0] || null;
      }
    } catch {
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM daily_check_ins WHERE "studentId" = $1 AND "checkInDate" = $2 LIMIT 1`,
        studentId,
        todayStr
      ).catch(() => []);
      existingCheckIn = rows[0] || null;
    }

    if (existingCheckIn) {
      const status = await this.getStudentCheckInStatus(studentId);
      return {
        success: true,
        alreadyCheckedIn: true,
        xpAwarded: 0,
        streakBonusAwarded: 0,
        checkInDate: todayStr,
        message: 'You have already completed your daily check-in today!',
        status,
      };
    }

    // 2. Insert check-in into database. We catch unique constraint violations to handle concurrent duplicate requests safely.
    let checkInRecord: any;
    try {
      if ((prisma as any).dailyCheckIn?.create) {
        checkInRecord = await (prisma as any).dailyCheckIn.create({
          data: {
            studentId,
            checkInDate: todayStr,
            xpAwarded: XP_CONFIG.DAILY_CHECKIN,
            timeZone: XP_CONFIG.TIMEZONE,
          },
        });
      } else {
        const dciId = `dci_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const rows = await prisma.$queryRawUnsafe<any[]>(
          `INSERT INTO daily_check_ins ("id", "studentId", "checkInDate", "xpAwarded", "timeZone", "createdAt")
           VALUES ($1, $2, $3, $4, $5, NOW())
           RETURNING *`,
          dciId,
          studentId,
          todayStr,
          XP_CONFIG.DAILY_CHECKIN,
          XP_CONFIG.TIMEZONE
        );
        checkInRecord = rows[0];
      }
    } catch (err: any) {
      // Prisma unique constraint violation code is P2002 or postgres unique violation
      if (err.code === 'P2002' || err.message?.includes('unique constraint') || err.message?.includes('duplicate key')) {
        const status = await this.getStudentCheckInStatus(studentId);
        return {
          success: true,
          alreadyCheckedIn: true,
          xpAwarded: 0,
          streakBonusAwarded: 0,
          checkInDate: todayStr,
          message: 'Daily check-in already recorded for today.',
          status,
        };
      }
      throw err;
    }

    // 3. Record in student_daily_streaks (idempotent upsert)
    await prisma.$executeRawUnsafe(
      `INSERT INTO student_daily_streaks (id, "studentId", "activityDate", "activityType", "sourceReference", "qualifyingScore", "createdAt")
       VALUES ($1, $2, $3, 'DAILY_CHECKIN', $4, 1.0, NOW())
       ON CONFLICT ("studentId", "activityDate") DO UPDATE SET "activityType" = 'DAILY_CHECKIN'`,
      `streak_${studentId}_${todayStr}`,
      studentId,
      todayStr,
      checkInRecord.id
    );

    // 4. Record auditable VerifiedActivity for daily check-in
    const activity = await verificationLedger.recordActivity({
      studentId,
      sourceType: 'CONSISTENCY',
      sourcePlatform: 'CAREERAI',
      sourceAccountId: checkInRecord.id,
      activityType: 'DAILY_CHECKIN',
      externalActivityId: `checkin_${studentId}_${todayStr}`,
      verificationStatus: 'VERIFIED',
      verificationMethod: 'SERVER_CHECKIN',
      evidenceReference: `checkin_${checkInRecord.id}`,
      occurredAt: new Date(),
      rawMetadata: { checkInDate: todayStr, timeZone: XP_CONFIG.TIMEZONE, xp: XP_CONFIG.DAILY_CHECKIN },
    });

    // 5. Award 5 XP to points ledger with auditable link
    await verificationLedger.awardPoints({
      studentId,
      verifiedActivityId: activity.id,
      category: 'CONSISTENCY',
      pointsAwarded: XP_CONFIG.DAILY_CHECKIN,
      reason: `Daily Check-in for ${todayStr} (+${XP_CONFIG.DAILY_CHECKIN} XP)`,
      periodKey: 'ALL_TIME',
    });

    // 6. Recalculate streak
    const streakInfo = await this.calculateAuthoritativeStreak(studentId);

    // 7. Check if 7-day streak milestone bonus applies
    let streakBonusAwarded = 0;
    if (streakInfo.currentStreak > 0 && streakInfo.currentStreak % 7 === 0) {
      const milestoneKey = `streak_bonus_7_${studentId}_${todayStr}_${streakInfo.currentStreak}`;
      
      const milestoneActivity = await verificationLedger.recordActivity({
        studentId,
        sourceType: 'CONSISTENCY',
        sourcePlatform: 'CAREERAI',
        activityType: 'STREAK_7DAY_BONUS',
        externalActivityId: milestoneKey,
        verificationStatus: 'VERIFIED',
        verificationMethod: 'AUTOMATIC_ENGINE',
        occurredAt: new Date(),
        rawMetadata: { milestoneDays: streakInfo.currentStreak, bonusXp: XP_CONFIG.STREAK_7DAY_BONUS },
      });

      const bonusEntry = await verificationLedger.awardPoints({
        studentId,
        verifiedActivityId: milestoneActivity.id,
        category: 'CONSISTENCY',
        pointsAwarded: XP_CONFIG.STREAK_7DAY_BONUS,
        reason: `${streakInfo.currentStreak}-Day Streak Bonus Milestone (+${XP_CONFIG.STREAK_7DAY_BONUS} XP)`,
        periodKey: 'ALL_TIME',
      });

      if (bonusEntry) {
        streakBonusAwarded = XP_CONFIG.STREAK_7DAY_BONUS;
      }
    }

    // 8. Trigger badge evaluation (e.g. 3-day starter, 7-day streak, etc.)
    await badgeEngine.evaluateAndAwardBadges(studentId);
    invalidateLeaderboardCache();

    // 9. Fetch updated status
    const status = await this.getStudentCheckInStatus(studentId);

    return {
      success: true,
      alreadyCheckedIn: false,
      xpAwarded: XP_CONFIG.DAILY_CHECKIN,
      streakBonusAwarded,
      checkInDate: todayStr,
      message: streakBonusAwarded > 0
        ? `Checked in! Earned +${XP_CONFIG.DAILY_CHECKIN} XP and unlocked a +${streakBonusAwarded} XP 7-Day Streak Bonus! 🔥`
        : `Checked in successfully! You earned +${XP_CONFIG.DAILY_CHECKIN} XP. Keep up the streak! 🔥`,
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

    // 3. Record in student_daily_streaks (Idempotent: ON CONFLICT DO NOTHING)
    const streakResult = await prisma.$executeRawUnsafe(
      `INSERT INTO student_daily_streaks (id, "studentId", "activityDate", "activityType", "sourceReference", "qualifyingScore", "createdAt")
       VALUES ($1, $2, $3, $4, $5, 1.0, NOW())
       ON CONFLICT ("studentId", "activityDate") DO NOTHING`,
      `streak_${studentId}_${todayStr}`,
      studentId,
      todayStr,
      eventType,
      externalActivityId
    );

    // If a new row was inserted, streak was extended for today
    const streakExtended = streakResult > 0;

    // Recalculate badges
    await badgeEngine.evaluateAndAwardBadges(studentId);
    invalidateLeaderboardCache();

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
    const rawStreaks = await prisma.$queryRawUnsafe<Array<{ activityDate: string }>>(
      `SELECT DISTINCT "activityDate" FROM student_daily_streaks
       WHERE "studentId" = $1
       ORDER BY "activityDate" DESC`,
      studentId
    );

    if (!rawStreaks || rawStreaks.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalActiveDays: 0,
        lastQualifyingDate: null,
      };
    }

    const uniqueDates = rawStreaks.map((r) => r.activityDate);
    const lastQualifyingDate = uniqueDates[0] || null;
    const totalActiveDays = uniqueDates.length;

    const todayStr = getFormattedDateInTz();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getFormattedDateInTz(yesterday);

    let currentStreak = 0;

    // Check if the student was active either today or yesterday (streak active)
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

    // Calculate historical longest streak
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

    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      totalActiveDays,
      lastQualifyingDate,
    };
  }
}

export const checkInService = new CheckInService();
