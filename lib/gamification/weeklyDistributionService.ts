import prisma from '@/lib/prisma';
import { rewardEngine, getWeekKey, getEvaluationPeriod } from './rewardEngine';
import { championRewardEngine } from './championRewardEngine';
import { getRewardConfig, type RewardEngineConfig } from './rewardConfigService';

/**
 * Weekly Mystery Gift Distribution Service
 * ----------------------------------------
 * Single, shared implementation used by both the cron endpoint and the
 * authorized admin recovery endpoint. It owns:
 *  - batching of students,
 *  - per-student retry with exponential backoff,
 *  - idempotent allocation (duplicate runs never allocate twice),
 *  - champion (top 3) allocation,
 *  - execution logging on `WeeklyRewardAllocation`.
 */

export interface DistributionError {
  studentId?: string;
  type?: string;
  error: string;
}

export interface DistributionStats {
  totalStudents: number;
  allocatedRewards: number;
  alreadyAllocated: number;
  failedAllocations: number;
  championAllocated: number;
  tierDistribution: {
    legendary: number;
    epic: number;
    rare: number;
    common: number;
    comeback: number;
  };
}

export interface WeeklyDistributionResult {
  success: boolean;
  weekKey: string;
  skipped?: boolean;
  alreadyCompleted?: boolean;
  reason?: string;
  durationMs: number;
  stats: DistributionStats;
  errors: DistributionError[];
}

const DAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function emptyStats(): DistributionStats {
  return {
    totalStudents: 0,
    allocatedRewards: 0,
    alreadyAllocated: 0,
    failedAllocations: 0,
    championAllocated: 0,
    tierDistribution: { legendary: 0, epic: 0, rare: 0, common: 0, comeback: 0 },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Returns the day-of-week index, hour and YYYY-MM-DD date for a timezone. */
export function getZonedDayHour(
  date: Date,
  timeZone: string
): { day: number; hour: number; dateStr: string } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      hour: '2-digit',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    const day = DAY_INDEX[get('weekday')] ?? date.getDay();
    let hour = parseInt(get('hour'), 10);
    if (!Number.isFinite(hour)) hour = date.getHours();
    if (hour === 24) hour = 0;
    return { day, hour, dateStr: `${get('year')}-${get('month')}-${get('day')}` };
  } catch {
    return { day: date.getDay(), hour: date.getHours(), dateStr: date.toISOString().slice(0, 10) };
  }
}

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

/**
 * Validates whether the current time falls inside the distribution window.
 * Allows the configured day at or after the distribution hour, plus a full
 * next-day grace window so a delayed/missed Saturday run can still recover
 * automatically. Never fails a legitimate scheduler request.
 */
export function isWithinDistributionWindow(
  config: RewardEngineConfig,
  now: Date = new Date()
): { ok: boolean; day: number; hour: number; dayName: string; reason?: string } {
  const { distributionDay, distributionHour, timezone } = config.weeklySchedule;
  const { day, hour } = getZonedDayHour(now, timezone);
  const dayName = DAY_NAMES[day];

  if (day === distributionDay && hour >= distributionHour) {
    return { ok: true, day, hour, dayName };
  }
  // Grace window: the calendar day immediately after the configured day.
  if (day === (distributionDay + 1) % 7) {
    return { ok: true, day, hour, dayName, reason: 'grace-window' };
  }
  return {
    ok: false,
    day,
    hour,
    dayName,
    reason: `Distribution runs on ${DAY_NAMES[distributionDay]} at ${String(distributionHour).padStart(2, '0')}:00 (${timezone}). Current time: ${dayName} ${String(hour).padStart(2, '0')}:00.`,
  };
}

/** Next scheduled execution instant in the configured timezone. */
export function getNextScheduledExecution(config: RewardEngineConfig, from: Date = new Date()): Date {
  const { distributionDay, distributionHour, timezone } = config.weeklySchedule;
  const offsetMinutes = getTzOffsetMinutes(timezone, from);

  for (let i = 0; i < 8; i++) {
    const probe = new Date(from.getTime() + i * 86400000);
    const z = getZonedDayHour(probe, timezone);
    if (z.day === distributionDay) {
      const [y, m, d] = z.dateStr.split('-').map(Number);
      const scheduled = new Date(Date.UTC(y, m - 1, d, distributionHour, 0, 0) - offsetMinutes * 60000);
      if (scheduled.getTime() > from.getTime()) return scheduled;
    }
  }
  return new Date(from.getTime() + 7 * 86400000);
}

/** Per-student allocation with bounded retries and exponential backoff. */
async function allocateWithRetry(
  studentId: string,
  weekKey: string,
  maxRetries: number,
  baseDelayMs: number
) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await rewardEngine.evaluateAndAllocateWeeklyReward(studentId, weekKey);
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await sleep(baseDelayMs * Math.pow(2, attempt));
      }
    }
  }
  throw lastError;
}

/**
 * Runs the weekly distribution for a given week (defaults to the current one).
 *
 * Idempotent: `evaluateAndAllocateWeeklyReward` skips students who already have
 * a reward for the week, and champion allocation uses a composite unique key.
 * Re-running after a partial failure therefore only fills the gaps.
 */
export async function runWeeklyDistribution(
  options: { weekKey?: string; force?: boolean; triggeredBy?: string } = {}
): Promise<WeeklyDistributionResult> {
  const startTime = Date.now();
  const config = await getRewardConfig();
  const weekKey = options.weekKey || getWeekKey();

  if (!config.weeklySchedule.enabled) {
    return {
      success: true,
      skipped: true,
      reason: 'Weekly gift distribution is disabled in reward configuration.',
      weekKey,
      durationMs: Date.now() - startTime,
      stats: emptyStats(),
      errors: [],
    };
  }

  const { startDate, endDate } = getEvaluationPeriod(weekKey);

  const existing = await prisma.weeklyRewardAllocation.findUnique({ where: { weekKey } });
  if (existing && existing.status === 'COMPLETED' && !options.force) {
    return {
      success: true,
      alreadyCompleted: true,
      weekKey,
      durationMs: Date.now() - startTime,
      stats: {
        totalStudents: existing.totalStudents,
        allocatedRewards: existing.allocatedRewards,
        alreadyAllocated: 0,
        failedAllocations: existing.failedAllocations,
        championAllocated: 0,
        tierDistribution: {
          legendary: existing.legendaryCount,
          epic: existing.epicCount,
          rare: existing.rareCount,
          common: existing.commonCount,
          comeback: existing.comebackCount,
        },
      },
      errors: [],
    };
  }

  await prisma.weeklyRewardAllocation.upsert({
    where: { weekKey },
    create: {
      weekKey,
      evaluationStart: startDate,
      evaluationEnd: endDate,
      distributionDate: new Date(),
      status: 'RUNNING',
      startedAt: new Date(),
    },
    update: {
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });

  const stats = emptyStats();
  const errors: DistributionError[] = [];
  const { batchSize, maxRetries, retryDelayMs } = config.weeklySchedule;

  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT', active: true },
      select: { id: true },
    });
    stats.totalStudents = students.length;

    for (let i = 0; i < students.length; i += batchSize) {
      const batch = students.slice(i, i + batchSize);
      const outcomes = await Promise.allSettled(
        batch.map((student) => allocateWithRetry(student.id, weekKey, maxRetries, retryDelayMs))
      );

      outcomes.forEach((outcome, index) => {
        const studentId = batch[index].id;
        if (outcome.status === 'fulfilled') {
          const result = outcome.value;
          if (result.success) {
            if (result.alreadyAllocated) {
              stats.alreadyAllocated++;
            } else {
              stats.allocatedRewards++;
              if (result.tier === 'LEGENDARY') stats.tierDistribution.legendary++;
              else if (result.tier === 'EPIC') stats.tierDistribution.epic++;
              else if (result.tier === 'RARE') stats.tierDistribution.rare++;
              else if (result.tier === 'COMMON') stats.tierDistribution.common++;
              else if (result.tier === 'COMEBACK') stats.tierDistribution.comeback++;
            }
          } else {
            stats.failedAllocations++;
            errors.push({ studentId, error: 'Allocation returned unsuccessful' });
          }
        } else {
          stats.failedAllocations++;
          const reason = outcome.reason;
          errors.push({
            studentId,
            error: reason instanceof Error ? reason.message : String(reason ?? 'Unknown error'),
          });
        }
      });
    }

    // ── Champion (top 3) rewards ──
    // Champion gifts are always ADDITIONAL: the top 3 keep their regular weekly
    // Mystery Gift and also receive a position-specific Champion Gift. Regular
    // weekly gifts are never deleted or replaced.
    try {
      const championResult = await championRewardEngine.allocateChampionRewards(weekKey);
      stats.championAllocated = championResult.championsAllocated;
    } catch (error) {
      errors.push({
        type: 'CHAMPION_ALLOCATION',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    await prisma.weeklyRewardAllocation.update({
      where: { weekKey },
      data: {
        totalStudents: stats.totalStudents,
        allocatedRewards: stats.allocatedRewards,
        failedAllocations: stats.failedAllocations,
        legendaryCount: stats.tierDistribution.legendary,
        epicCount: stats.tierDistribution.epic,
        rareCount: stats.tierDistribution.rare,
        commonCount: stats.tierDistribution.common,
        comebackCount: stats.tierDistribution.comeback,
        status: 'COMPLETED',
        completedAt: new Date(),
        errorLog: errors.length > 0 ? (errors as unknown as object) : undefined,
      },
    });

    return {
      success: true,
      weekKey,
      durationMs: Date.now() - startTime,
      stats,
      errors,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await prisma.weeklyRewardAllocation.update({
      where: { weekKey },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorLog: { message, errors } as unknown as object,
      },
    });

    return {
      success: false,
      weekKey,
      reason: message,
      durationMs: Date.now() - startTime,
      stats,
      errors: [...errors, { error: message }],
    };
  }
}

/** Real execution records for the admin distribution monitoring panel. */
export async function getDistributionStatus() {
  const config = await getRewardConfig();
  const weekKey = getWeekKey();

  const [current, recent, lastCompleted] = await Promise.all([
    prisma.weeklyRewardAllocation.findUnique({ where: { weekKey } }),
    prisma.weeklyRewardAllocation.findMany({
      orderBy: { distributionDate: 'desc' },
      take: 8,
    }),
    prisma.weeklyRewardAllocation.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { distributionDate: 'desc' },
    }),
  ]);

  return {
    weekKey,
    schedule: {
      enabled: config.weeklySchedule.enabled,
      day: config.weeklySchedule.distributionDay,
      dayName: DAY_NAMES[config.weeklySchedule.distributionDay],
      hour: config.weeklySchedule.distributionHour,
      timezone: config.weeklySchedule.timezone,
      nextScheduledAt: getNextScheduledExecution(config).toISOString(),
    },
    current,
    lastCompleted,
    recent,
  };
}
