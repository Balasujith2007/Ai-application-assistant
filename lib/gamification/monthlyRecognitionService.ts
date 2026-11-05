import prisma from '@/lib/prisma';
import { getRewardConfig } from './rewardConfigService';
import { careerGrowthEngine } from './careerGrowthEngine';
import { badgeEngine, getFormattedDateInTz } from './badgeEngine';
import { getEffectiveBadge, type EffectiveBadge } from './badgeCatalogService';

/**
 * Monthly Performance Recognition Engine
 * --------------------------------------
 * Runs once at the end of each month (Asia/Kolkata boundaries) and:
 *   1. freezes an immutable monthly career-performance snapshot per student,
 *   2. ranks students using verified career performance only,
 *   3. determines the Top 3 with deterministic tie-breaks,
 *   4. awards Gold / Silver / Bronze Champion badges (idempotently),
 *   5. awards the remaining Monthly Excellence badges (career excellence,
 *      consistent performer, rising star),
 *   6. delivers the awards through the existing Rewards & Inventory experience
 *      (`StudentReward`) and raises in-app notifications,
 *   7. records the run on `MonthlyRecognitionRun` for idempotency + audit.
 *
 * Ranking uses ONLY the three career-growth categories (Internship & Job
 * Applications, Hackathons & Competitions, Resume Strength) with the
 * Super-Admin-configurable 35/35/30 weights. No LMS metrics are ever used.
 *
 * Monthly awards are independent of, and never replace, the weekly Mystery
 * Gifts or the weekly Champion Gifts.
 */

export interface MonthlyRecognitionError {
  studentId?: string;
  type?: string;
  error: string;
}

export interface MonthlyChampionSummary {
  position: number;
  studentId: string;
  score: number;
  badgeId: string;
}

export interface MonthlyRecognitionStats {
  totalStudents: number;
  snapshotsFrozen: number;
  ranked: number;
  champions: MonthlyChampionSummary[];
  badgesAwarded: number;
  rewardsAllocated: number;
  notificationsSent: number;
  failed: number;
}

export interface MonthlyRecognitionResult {
  success: boolean;
  monthKey: string;
  skipped?: boolean;
  alreadyCompleted?: boolean;
  reason?: string;
  durationMs: number;
  stats: MonthlyRecognitionStats;
  errors: MonthlyRecognitionError[];
}

/** Candidate row collected while freezing monthly snapshots. */
export interface MonthlyCandidate {
  studentId: string;
  score: number;
  internship: number;
  hackathon: number;
  resume: number;
  weeksActive: number;
  finalScore: number; // weighted score (same as score; kept explicit for clarity)
}

/** Which monthly badge each podium position receives. */
const PODIUM_BADGE_BY_POSITION: Record<number, string> = {
  1: 'monthly-gold-champion',
  2: 'monthly-silver-champion',
  3: 'monthly-bronze-champion',
};

/**
 * Monthly badge id → `RewardTriggerType`. Each award kind has its own trigger so
 * a student may receive more than one distinct monthly award per month without
 * ever colliding on the `(studentId, evaluationWeekKey, triggerType)` key.
 */
const MONTHLY_TRIGGER_BY_BADGE: Record<string, string> = {
  'monthly-gold-champion': 'MONTHLY_GOLD_CHAMPION',
  'monthly-silver-champion': 'MONTHLY_SILVER_CHAMPION',
  'monthly-bronze-champion': 'MONTHLY_BRONZE_CHAMPION',
  'monthly-career-excellence': 'MONTHLY_CAREER_EXCELLENCE',
  'monthly-consistent-performer': 'MONTHLY_CONSISTENT_PERFORMER',
  'monthly-rising-star': 'MONTHLY_RISING_STAR',
};

/** Coin gift delivered with each monthly award (XP comes from the badge itself). */
const MONTHLY_COIN_GIFT: Record<string, number> = {
  'monthly-gold-champion': 500,
  'monthly-silver-champion': 350,
  'monthly-bronze-champion': 250,
  'monthly-career-excellence': 300,
  'monthly-consistent-performer': 200,
  'monthly-rising-star': 150,
};

/** Badge tier → the reward rarity vocabulary used by the inventory. */
const TIER_TO_RARITY: Record<string, string> = {
  DIAMOND: 'LEGENDARY',
  PLATINUM: 'EPIC',
  GOLD: 'RARE',
  SILVER: 'COMMON',
  BRONZE: 'COMMON',
};

/** Timezone offset (in minutes) for the given timezone at the given instant. */
function getTzOffsetMinutes(timeZone: string, at: Date = new Date()): number {
  try {
    const match = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName');
    if (match?.value) {
      const m = match.value.match(/GMT([+-])(\d+)(?::(\d+))?/);
      if (m) {
        const sign = m[1] === '-' ? -1 : 1;
        return sign * (parseInt(m[2], 10) * 60 + (m[3] ? parseInt(m[3], 10) : 0));
      }
    }
  } catch {
    /* fall through */
  }
  return 330; // default IST +05:30
}

/** `YYYY-MM` month key in the given timezone (default Asia/Kolkata). */
export function getMonthKey(date: Date = new Date(), timeZone = 'Asia/Kolkata'): string {
  return getFormattedDateInTz(date, timeZone).slice(0, 7);
}

/** `YYYY-MM` of the month immediately before the given month key. */
export function getPreviousMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  const prev = new Date(Date.UTC(y, m - 2, 1));
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** The month immediately before the current one (the month being recognized). */
export function getClosingMonthKey(date: Date = new Date(), timeZone = 'Asia/Kolkata'): string {
  return getPreviousMonthKey(getMonthKey(date, timeZone));
}

/** Start/end instants (inclusive) of a month, respecting the timezone offset. */
export function getMonthPeriod(
  monthKey: string,
  timeZone = 'Asia/Kolkata'
): { startDate: Date; endDate: Date; startStr: string; endStr: string } {
  const [y, m] = monthKey.split('-').map(Number);
  const offset = getTzOffsetMinutes(timeZone, new Date(Date.UTC(y, m - 1, 15)));
  const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0) - offset * 60000);
  const endDate = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0) - offset * 60000 - 1);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return {
    startDate,
    endDate,
    startStr: `${monthKey}-01`,
    endStr: `${monthKey}-${String(lastDay).padStart(2, '0')}`,
  };
}

/** Number of distinct ISO weeks (1..5) in which the student was active. */
async function countActiveWeeks(studentId: string, startStr: string, endStr: string): Promise<number> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ activityDate: string }>>(
      `SELECT DISTINCT "activityDate" FROM student_daily_streaks
       WHERE "studentId" = $1 AND "activityDate" >= $2 AND "activityDate" <= $3`,
      studentId,
      startStr,
      endStr
    );
    const weeks = new Set<number>();
    rows.forEach((r) => weeks.add(Math.ceil(parseInt(String(r.activityDate).slice(8, 10), 10) / 7)));
    return weeks.size;
  } catch {
    return 0;
  }
}

/**
 * Deterministic ranking. Ties are broken by category contribution in weight
 * order (internship → hackathon → resume) and finally by student id, so the
 * same data always produces the same champions.
 */
export function rankMonthlyCandidates<T extends MonthlyCandidate>(candidates: T[]): T[] {
  return [...candidates].sort(
    (a, b) =>
      b.score - a.score ||
      b.internship - a.internship ||
      b.hackathon - a.hackathon ||
      b.resume - a.resume ||
      a.studentId.localeCompare(b.studentId)
  );
}

function emptyStats(): MonthlyRecognitionStats {
  return {
    totalStudents: 0,
    snapshotsFrozen: 0,
    ranked: 0,
    champions: [],
    badgesAwarded: 0,
    rewardsAllocated: 0,
    notificationsSent: 0,
    failed: 0,
  };
}

/**
 * Awards one monthly badge (idempotently), delivers it into Rewards & Inventory
 * and sends an in-app notification the first time it is granted. Never throws —
 * a delivery failure is reported but never rolls back an already-granted badge.
 */
async function deliverMonthlyAward(params: {
  studentId: string;
  badge: EffectiveBadge;
  monthKey: string;
  reason: string;
  evidence: Record<string, unknown>;
}): Promise<{ awarded: boolean; rewarded: boolean; notified: boolean }> {
  const { studentId, badge, monthKey, reason, evidence } = params;

  const award = await badgeEngine.awardBadgeOnBehalf({
    studentId,
    badgeId: badge.id,
    source: 'MONTHLY',
    reason,
    evidence: { monthKey, ...evidence },
  });

  if (!award.ok) {
    return { awarded: false, rewarded: false, notified: false };
  }

  // Deliver through the existing Gifts / Rewards & Inventory experience.
  let rewarded = false;
  const triggerType = MONTHLY_TRIGGER_BY_BADGE[badge.id];
  if (triggerType) {
    try {
      await prisma.studentReward.upsert({
        where: {
          StudentReward_studentId_weekKey_trigger_unique: {
            studentId,
            evaluationWeekKey: monthKey,
            triggerType: triggerType as never,
          },
        },
        update: {},
        create: {
          studentId,
          rewardType: 'ACHIEVEMENT_REWARD',
          rewardRarity: (TIER_TO_RARITY[badge.tier] ?? 'RARE') as never,
          triggerType: triggerType as never,
          status: 'ALLOCATED',
          xpAmount: 0, // XP is credited by the badge engine; avoid double counting.
          coinAmount: MONTHLY_COIN_GIFT[badge.id] ?? 0,
          badgeId: badge.id,
          badgeName: badge.title,
          badgeIcon: badge.icon,
          weeklyScore: typeof evidence.score === 'number' ? (evidence.score as number) : null,
          weeklyRank: typeof evidence.rank === 'number' ? `#${evidence.rank}` : (evidence.rank as string) ?? null,
          performanceMetrics: { monthKey, ...evidence } as never,
          personalizedMessage: reason,
          reasonEarned: reason,
          evaluationWeekKey: monthKey,
          idempotencyKey: `${studentId}_${monthKey}_${triggerType}`,
        },
      });
      rewarded = true;
    } catch {
      // Pre-migration safety: the monthly trigger values / reward row may not be
      // available yet. The badge is still granted and visible in the gallery.
      rewarded = false;
    }
  }

  // Notify only on the first (newly awarded) grant so re-runs never duplicate.
  let notified = false;
  if (award.awarded) {
    try {
      await prisma.notification.create({
        data: {
          userId: studentId,
          title: `🏆 Monthly Award: ${badge.title}`,
          message: `${reason} (${monthKey}). View it in your Rewards & Inventory and share the credential from your Badges gallery.`,
          link: '/dashboard/student/rewards',
          type: 'MONTHLY_RECOGNITION',
        },
      });
      notified = true;
    } catch {
      notified = false;
    }
  }

  return { awarded: award.awarded, rewarded, notified };
}

/**
 * Runs the monthly recognition flow for a month (defaults to the month being
 * closed). Fully idempotent: reprocessing an already-completed month is a
 * no-op unless `force` is set, and even then no duplicate badges, rewards or
 * notifications are produced.
 */
export async function runMonthlyRecognition(
  options: {
    monthKey?: string;
    force?: boolean;
    triggeredBy?: string;
    /**
     * Restricts the run to a specific set of student ids. Undefined (the default,
     * and what the cron uses) evaluates every active student. Supplying a list
     * keeps automated verification fully isolated from real learners.
     */
    scopeStudentIds?: string[];
  } = {}
): Promise<MonthlyRecognitionResult> {
  const startTime = Date.now();
  const config = await getRewardConfig();
  const timezone = config.weeklySchedule.timezone || 'Asia/Kolkata';
  const monthKey = options.monthKey || getClosingMonthKey(new Date(), timezone);
  const { startDate, endDate, startStr, endStr } = getMonthPeriod(monthKey, timezone);
  const stats = emptyStats();
  const errors: MonthlyRecognitionError[] = [];

  try {
    const existing = await prisma.monthlyRecognitionRun.findUnique({ where: { monthKey } });
    if (existing && existing.status === 'COMPLETED' && !options.force) {
      return {
        success: true,
        alreadyCompleted: true,
        monthKey,
        durationMs: Date.now() - startTime,
        stats: {
          ...emptyStats(),
          totalStudents: existing.totalStudents,
          champions: ((existing.resultSummary as { champions?: MonthlyChampionSummary[] })?.champions) ?? [],
          badgesAwarded: existing.badgesAwarded,
        },
        errors: [],
      };
    }

    await prisma.monthlyRecognitionRun.upsert({
      where: { monthKey },
      create: {
        monthKey,
        evaluationStart: startDate,
        evaluationEnd: endDate,
        status: 'RUNNING',
        startedAt: new Date(),
      },
      update: { status: 'RUNNING', startedAt: new Date(), errorLog: undefined },
    });

    // ── 1. Freeze monthly performance snapshots (verified career data only) ──
    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        active: true,
        ...(options.scopeStudentIds ? { id: { in: options.scopeStudentIds } } : {}),
      },
      select: { id: true },
    });
    stats.totalStudents = students.length;

    const candidates: MonthlyCandidate[] = [];

    for (const student of students) {
      try {
        const result = await careerGrowthEngine.computeCareerGrowthScore(
          student.id,
          monthKey,
          startDate,
          endDate,
          config
        );
        const weeksActive = await countActiveWeeks(student.id, startStr, endStr);
        const snapshot = careerGrowthEngine.toSnapshot(result);

        // `update: {}` keeps an already-frozen snapshot immutable on re-runs.
        await prisma.monthlyPerformanceSnapshot.upsert({
          where: {
            MonthlyPerformanceSnapshot_studentId_monthKey_unique: {
              studentId: student.id,
              monthKey,
            },
          },
          update: {},
          create: {
            studentId: student.id,
            monthKey,
            startDate,
            endDate,
            weightedScore: result.finalScore,
            careerBreakdown: snapshot as never,
            weeksActive,
          },
        });

        candidates.push({
          studentId: student.id,
          score: result.finalScore,
          finalScore: result.finalScore,
          internship: result.categories.internshipApplications.weightedPoints,
          hackathon: result.categories.hackathonsCompetitions.weightedPoints,
          resume: result.categories.resumeStrength.weightedPoints,
          weeksActive,
        });
        stats.snapshotsFrozen++;
      } catch (error) {
        stats.failed++;
        errors.push({
          studentId: student.id,
          type: 'SNAPSHOT',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // ── 2. Rank deterministically and persist ranks ──
    const ranked = rankMonthlyCandidates(candidates);
    stats.ranked = ranked.length;

    for (let i = 0; i < ranked.length; i++) {
      const position = i + 1;
      try {
        await prisma.monthlyPerformanceSnapshot.update({
          where: {
            MonthlyPerformanceSnapshot_studentId_monthKey_unique: {
              studentId: ranked[i].studentId,
              monthKey,
            },
          },
          data: { rank: position },
        });
      } catch {
        /* rank is best-effort metadata; never fail the run for it */
      }
    }

    // ── 3. Determine Top 3 champions ──
    const topThree = ranked.slice(0, 3);

    // ── 4. Award podium (Gold / Silver / Bronze) badges ──
    for (let i = 0; i < topThree.length; i++) {
      const entry = topThree[i];
      const position = i + 1;
      const badgeId = PODIUM_BADGE_BY_POSITION[position];
      const badge = await getEffectiveBadge(badgeId);
      if (!badge) continue;

      const reason = `Ranked #${position} in ${monthKey} monthly career performance (score ${entry.score}).`;
      const outcome = await deliverMonthlyAward({
        studentId: entry.studentId,
        badge,
        monthKey,
        reason,
        evidence: { rank: position, score: entry.score, category: 'MONTHLY_CHAMPION' },
      });
      if (outcome.awarded) stats.badgesAwarded++;
      if (outcome.rewarded) stats.rewardsAllocated++;
      if (outcome.notified) stats.notificationsSent++;

      stats.champions.push({
        position,
        studentId: entry.studentId,
        score: entry.score,
        badgeId,
      });
    }

    // ── 5. Award the remaining Monthly Excellence badges ──
    for (const entry of ranked) {
      // Rising star needs the previous month's frozen score.
      let improvement: number | null = null;
      try {
        const prev = await prisma.monthlyPerformanceSnapshot.findUnique({
          where: {
            MonthlyPerformanceSnapshot_studentId_monthKey_unique: {
              studentId: entry.studentId,
              monthKey: getPreviousMonthKey(monthKey),
            },
          },
          select: { weightedScore: true },
        });
        if (prev) improvement = entry.score - prev.weightedScore;
      } catch {
        improvement = null;
      }

      const extraAwards: Array<{ badgeId: string; reason: string; evidence: Record<string, unknown> }> = [];

      const careerExcellence = await getEffectiveBadge('monthly-career-excellence');
      if (careerExcellence && entry.score >= careerExcellence.threshold) {
        extraAwards.push({
          badgeId: 'monthly-career-excellence',
          reason: `Monthly career performance score of ${entry.score} in ${monthKey}.`,
          evidence: { score: entry.score },
        });
      }

      const consistent = await getEffectiveBadge('monthly-consistent-performer');
      if (consistent && entry.weeksActive >= consistent.threshold) {
        extraAwards.push({
          badgeId: 'monthly-consistent-performer',
          reason: `Active in ${entry.weeksActive} distinct weeks of ${monthKey}.`,
          evidence: { weeksActive: entry.weeksActive },
        });
      }

      const risingStar = await getEffectiveBadge('monthly-rising-star');
      if (risingStar && improvement !== null && improvement >= risingStar.threshold) {
        extraAwards.push({
          badgeId: 'monthly-rising-star',
          reason: `Career performance improved by ${improvement} points in ${monthKey}.`,
          evidence: { improvement, score: entry.score },
        });
      }

      for (const extra of extraAwards) {
        const badge = await getEffectiveBadge(extra.badgeId);
        if (!badge) continue;
        try {
          const outcome = await deliverMonthlyAward({
            studentId: entry.studentId,
            badge,
            monthKey,
            reason: extra.reason,
            evidence: extra.evidence,
          });
          if (outcome.awarded) stats.badgesAwarded++;
          if (outcome.rewarded) stats.rewardsAllocated++;
          if (outcome.notified) stats.notificationsSent++;
        } catch (error) {
          stats.failed++;
          errors.push({
            studentId: entry.studentId,
            type: 'MONTHLY_AWARD',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // ── 6. Finalize the run (idempotency ledger) ──
    await prisma.monthlyRecognitionRun.update({
      where: { monthKey },
      data: {
        totalStudents: stats.totalStudents,
        championsAwarded: stats.champions.length,
        badgesAwarded: stats.badgesAwarded,
        failedCount: stats.failed,
        status: 'COMPLETED',
        completedAt: new Date(),
        resultSummary: {
          monthKey,
          champions: stats.champions,
          snapshotsFrozen: stats.snapshotsFrozen,
          rewardsAllocated: stats.rewardsAllocated,
          notificationsSent: stats.notificationsSent,
          weights: config.careerGrowth.weights,
          triggeredBy: options.triggeredBy ?? 'MANUAL',
        } as never,
        errorLog: errors.length > 0 ? (errors as unknown as object) : undefined,
      },
    });

    return {
      success: true,
      monthKey,
      durationMs: Date.now() - startTime,
      stats,
      errors,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    try {
      await prisma.monthlyRecognitionRun.update({
        where: { monthKey },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          failedCount: stats.failed,
          errorLog: { message, errors } as unknown as object,
        },
      });
    } catch {
      /* pre-migration safety: the run table may not exist yet */
    }
    return {
      success: false,
      monthKey,
      reason: message,
      durationMs: Date.now() - startTime,
      stats,
      errors: [...errors, { error: message }],
    };
  }
}

/**
 * Whether the current instant falls inside the monthly recognition window:
 * the first three days of a new month (Asia/Kolkata), so a delayed 1st-of-month
 * cron still recovers. Never fails a legitimate scheduler request.
 */
export function isWithinMonthlyWindow(
  now: Date = new Date(),
  timeZone = 'Asia/Kolkata'
): { ok: boolean; day: number; monthKey: string; reason?: string } {
  const dateStr = getFormattedDateInTz(now, timeZone);
  const day = parseInt(dateStr.slice(8, 10), 10);
  const monthKey = dateStr.slice(0, 7);
  if (day <= 3) return { ok: true, day, monthKey };
  return {
    ok: false,
    day,
    monthKey,
    reason: `Monthly recognition runs on the 1st of each month (${timeZone}), with a grace window through the 3rd. Current day: ${day}.`,
  };
}

/** Next scheduled monthly recognition instant (1st of next month, 00:30 IST). */
export function getNextMonthlyExecution(now: Date = new Date(), timeZone = 'Asia/Kolkata'): Date {
  const monthKey = getMonthKey(now, timeZone);
  const [y, m] = monthKey.split('-').map(Number);
  const offset = getTzOffsetMinutes(timeZone, now);
  // 1st of next month at 00:30 local time.
  const next = new Date(Date.UTC(y, m, 1, 0, 30, 0) - offset * 60000);
  return next;
}

/** Monthly recognition run history for the Super Admin monitoring panel. */
export async function getMonthlyRecognitionStatus() {
  const timezone = (await getRewardConfig()).weeklySchedule.timezone || 'Asia/Kolkata';
  const closingMonthKey = getClosingMonthKey(new Date(), timezone);

  const [current, recent] = await Promise.all([
    prisma.monthlyRecognitionRun.findUnique({ where: { monthKey: closingMonthKey } }),
    prisma.monthlyRecognitionRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
  ]);

  return {
    closingMonthKey,
    timezone,
    nextScheduledAt: getNextMonthlyExecution(new Date(), timezone).toISOString(),
    current,
    recent,
  };
}
