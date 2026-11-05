import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getFormattedDateInTz, checkInService } from './checkInService';
import { getTokenRules, type TokenRulesConfig } from './tokenConfig';

/**
 * Token Usage Engine
 * ------------------
 * Consumes student tokens for their intended, career-relevant purpose.
 *
 * Streak Rescue
 *  - Operates on the platform's real career-activity streak
 *    (`student_daily_streaks`, written by daily check-ins and verified career
 *    events). It does NOT introduce any LMS-style study streak.
 *  - The eligible "missed date" is derived from the student's actual streak
 *    gaps (never hardcoded to "yesterday"), bounded by a configurable window.
 *  - Consumption of the token AND restoration of the day happen in ONE atomic
 *    database transaction; a `P2002` on `student_daily_streaks` (or the CAS on
 *    the token row) rolls the whole thing back, so a missed date can never be
 *    restored twice and a token can never be double-spent.
 *  - Expired and already-used tokens are rejected.
 *
 * IMPORTANT: restoring a streak day never touches the Career Growth Score,
 * finalized WeeklyPerformanceSnapshot rows, the Top-3 Champion ranking, the
 * champion gift eligibility, or any historical leaderboard result. The career
 * leaderboard ranks purely on score (see `lib/leaderboard/scoringEngine.ts`);
 * a rescue only restores the streak the student actually had.
 */

export type TokenErrorCode =
  | 'DISABLED'
  | 'NOT_FOUND'
  | 'NOT_OWNER'
  | 'ALREADY_USED'
  | 'EXPIRED'
  | 'LIMIT_REACHED'
  | 'WINDOW_LIMIT_REACHED'
  | 'NO_ELIGIBLE_DATE'
  | 'NOT_ELIGIBLE'
  | 'ALREADY_RESTORED'
  | 'UNAVAILABLE';

export class TokenUsageError extends Error {
  code: TokenErrorCode;
  constructor(code: TokenErrorCode, message: string) {
    super(message);
    this.name = 'TokenUsageError';
    this.code = code;
  }
}

type TxClient = Prisma.TransactionClient;

// ── date helpers (UTC-safe on YYYY-MM-DD strings) ───────────────────────────

function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + delta * 86_400_000;
  const nd = new Date(t);
  return `${nd.getUTCFullYear()}-${String(nd.getUTCMonth() + 1).padStart(2, '0')}-${String(
    nd.getUTCDate()
  ).padStart(2, '0')}`;
}

/** Length of the consecutive run that would exist if `gap` were filled. */
function runLengthThrough(dateSet: Set<string>, gap: string): number {
  let run = 1; // the gap itself
  let cur = addDays(gap, -1);
  while (dateSet.has(cur)) {
    run++;
    cur = addDays(cur, -1);
  }
  cur = addDays(gap, 1);
  while (dateSet.has(cur)) {
    run++;
    cur = addDays(cur, 1);
  }
  return run;
}

async function fetchActivityDates(studentId: string, tx?: TxClient): Promise<Set<string>> {
  const client = tx ?? prisma;
  const rows = await client.$queryRawUnsafe<Array<{ activityDate: string }>>(
    `SELECT DISTINCT "activityDate" FROM student_daily_streaks WHERE "studentId" = $1 ORDER BY "activityDate" DESC`,
    studentId
  );
  return new Set(rows.map((r) => r.activityDate));
}

/**
 * Determines which missed dates are currently eligible for a Streak Rescue,
 * derived from the student's real streak data and the configurable rules.
 */
export async function getEligibleStreakRescueDates(
  studentId: string,
  rulesInput?: TokenRulesConfig,
  tx?: TxClient
): Promise<Array<{ date: string; runLength: number }>> {
  const rules = rulesInput ?? (await getTokenRules());
  const sr = rules.streakRescue;
  if (!sr.enabled) return [];

  const dateSet = await fetchActivityDates(studentId, tx);
  const todayStr = getFormattedDateInTz();

  const eligible: Array<{ date: string; runLength: number }> = [];
  for (let i = 1; i <= sr.windowDays; i++) {
    const candidate = addDays(todayStr, -i);
    if (dateSet.has(candidate)) continue; // already an active day

    const hasPrev = dateSet.has(addDays(candidate, -1));
    const hasNext = dateSet.has(addDays(candidate, 1));
    if (sr.requireAdjacentToStreak && !hasPrev && !hasNext) continue;

    const runLength = runLengthThrough(dateSet, candidate);
    if (runLength < sr.minStreakLength) continue;

    eligible.push({ date: candidate, runLength });
  }

  // Most recent eligible date first.
  return eligible.sort((a, b) => b.date.localeCompare(a.date));
}

export interface StreakRescueResult {
  success: true;
  tokenId: string;
  restoredDate: string;
  newStreak: {
    currentStreak: number;
    longestStreak: number;
    totalActiveDays: number;
    lastQualifyingDate: string | null;
  };
}

/**
 * Consumes a Streak Rescue token to restore one eligible missed career-activity
 * day. Fully atomic and idempotent-safe.
 */
export async function rescueStreak(
  studentId: string,
  tokenId: string,
  requestedDate?: string
): Promise<StreakRescueResult> {
  const rules = await getTokenRules();
  const sr = rules.streakRescue;
  if (!sr.enabled) {
    throw new TokenUsageError('DISABLED', 'Streak Rescue is currently disabled.');
  }

  const now = new Date();
  let restoredDate: string | null = null;

  await prisma.$transaction(async (tx) => {
    const token = await tx.streakRescueToken.findUnique({ where: { id: tokenId } });
    if (!token) throw new TokenUsageError('NOT_FOUND', 'Streak Rescue token not found.');
    if (token.studentId !== studentId) {
      throw new TokenUsageError('NOT_OWNER', 'This token does not belong to you.');
    }
    if (token.isUsed) {
      throw new TokenUsageError('ALREADY_USED', 'This Streak Rescue token has already been used.');
    }
    if (token.expiresAt && token.expiresAt.getTime() <= now.getTime()) {
      throw new TokenUsageError('EXPIRED', 'This Streak Rescue token has expired.');
    }

    // If a specific date was requested and it has already been restored, reject
    // with a precise code before any limit or eligibility evaluation. (Without
    // this, an already-restored date would surface as NOT_ELIGIBLE, because a
    // restored day is by definition no longer a "missed" day.)
    if (requestedDate) {
      const alreadyRestored = await tx.studentDailyStreak.findUnique({
        where: { studentId_activityDate: { studentId, activityDate: requestedDate } },
      });
      const restoredByToken = await tx.streakRescueToken.findFirst({
        where: { studentId, usedForDate: requestedDate },
      });
      if (alreadyRestored || restoredByToken) {
        throw new TokenUsageError('ALREADY_RESTORED', `${requestedDate} has already been restored.`);
      }
    }

    // Usage limits (lifetime + rolling window) — configurable.
    const usedCount = await tx.streakRescueToken.count({
      where: { studentId, isUsed: true },
    });
    if (usedCount >= sr.maxRescuesPerStudent) {
      throw new TokenUsageError(
        'LIMIT_REACHED',
        `You have reached the maximum of ${sr.maxRescuesPerStudent} streak rescues.`
      );
    }
    const windowStart = new Date(now.getTime() - sr.windowDays * 86_400_000);
    const usedInWindow = await tx.streakRescueToken.count({
      where: { studentId, isUsed: true, usedAt: { gte: windowStart } },
    });
    if (usedInWindow >= sr.maxRescuesPerStudentPerWindow) {
      throw new TokenUsageError(
        'WINDOW_LIMIT_REACHED',
        `You have used the maximum of ${sr.maxRescuesPerStudentPerWindow} rescues for this window.`
      );
    }

    // Eligible missed dates derived from the real streak.
    const eligible = await getEligibleStreakRescueDates(studentId, rules, tx);
    if (eligible.length === 0) {
      throw new TokenUsageError(
        'NO_ELIGIBLE_DATE',
        'No missed day is currently eligible for a streak rescue.'
      );
    }

    let targetDate: string;
    if (requestedDate) {
      if (!eligible.some((e) => e.date === requestedDate)) {
        throw new TokenUsageError('NOT_ELIGIBLE', `${requestedDate} is not an eligible missed day.`);
      }
      targetDate = requestedDate;
    } else {
      targetDate = eligible[0].date;
    }

    // Duplicate-restoration guards: a date may be restored at most once, ever.
    const existingStreak = await tx.studentDailyStreak.findUnique({
      where: { studentId_activityDate: { studentId, activityDate: targetDate } },
    });
    if (existingStreak) {
      throw new TokenUsageError('ALREADY_RESTORED', `${targetDate} has already been restored.`);
    }
    const otherToken = await tx.streakRescueToken.findFirst({
      where: { studentId, usedForDate: targetDate },
    });
    if (otherToken) {
      throw new TokenUsageError('ALREADY_RESTORED', `${targetDate} has already been restored.`);
    }

    // Atomic compare-and-set: the first request to flip isUsed wins.
    const guard = await tx.streakRescueToken.updateMany({
      where: { id: tokenId, studentId, isUsed: false },
      data: { isUsed: true, usedAt: now, usedForDate: targetDate },
    });
    if (guard.count === 0) {
      throw new TokenUsageError('ALREADY_USED', 'This Streak Rescue token has already been used.');
    }

    // Restore the day. The (studentId, activityDate) unique constraint is the
    // final guarantee against a duplicate restoration — a violation rolls back
    // the whole transaction, including the token consumption above.
    await tx.studentDailyStreak.create({
      data: {
        studentId,
        activityDate: targetDate,
        activityType: 'STREAK_RESCUE',
        sourceReference: tokenId,
        qualifyingScore: 1.0,
      },
    });

    restoredDate = targetDate;
  });

  const newStreak = await checkInService.calculateAuthoritativeStreak(studentId);

  // Deliberately NOT re-running badge evaluation here: restoring a day must not
  // be a path to farm badges/XP. It only restores the streak.
  return {
    success: true,
    tokenId,
    restoredDate: restoredDate!,
    newStreak,
  };
}

export interface LeaderboardBoostStatus {
  available: boolean;
  reason: string;
  activeDays: number;
  /** Always true: the token is architecturally barred from affecting ranking. */
  rankingNeutral: true;
}

/** Reports whether the Leaderboard Boost has a safe, ranking-neutral use. */
export async function getLeaderboardBoostStatus(): Promise<LeaderboardBoostStatus> {
  const rules = await getTokenRules();
  return {
    available: rules.leaderboardBoost.enabled,
    reason: rules.leaderboardBoost.unavailableReason,
    activeDays: rules.leaderboardBoost.activeDays,
    rankingNeutral: true,
  };
}

export interface TokenInventory {
  streakRescue: {
    available: Array<{ id: string; expiresAt: string | null; awardedAt: string; eligibleDates: string[] }>;
    usedCount: number;
    expiredCount: number;
    eligibleDates: string[];
    rulesEnabled: boolean;
  };
  leaderboardBoost: {
    available: Array<{ id: string; expiresAt: string | null; awardedAt: string }>;
    usedCount: number;
    expiredCount: number;
    status: LeaderboardBoostStatus;
  };
}

/** Centralized token inventory (available + used + expiry) for a student. */
export async function getTokenInventory(studentId: string): Promise<TokenInventory> {
  const now = new Date();
  const rules = await getTokenRules();

  const [srTokens, lbTokens, srUsed, srExpired, lbUsed, lbExpired, eligibleDates] = await Promise.all([
    prisma.streakRescueToken.findMany({
      where: { studentId, isUsed: false, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      orderBy: { awardedAt: 'desc' },
    }),
    prisma.leaderboardBoostToken.findMany({
      where: { studentId, isUsed: false, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      orderBy: { awardedAt: 'desc' },
    }),
    prisma.streakRescueToken.count({ where: { studentId, isUsed: true } }),
    prisma.streakRescueToken.count({ where: { studentId, isUsed: false, expiresAt: { lte: now } } }),
    prisma.leaderboardBoostToken.count({ where: { studentId, isUsed: true } }),
    prisma.leaderboardBoostToken.count({ where: { studentId, isUsed: false, expiresAt: { lte: now } } }),
    getEligibleStreakRescueDates(studentId, rules),
  ]);

  const eligible = eligibleDates.map((d) => d.date);

  return {
    streakRescue: {
      available: srTokens.map((t) => ({
        id: t.id,
        expiresAt: t.expiresAt ? t.expiresAt.toISOString() : null,
        awardedAt: t.awardedAt.toISOString(),
        eligibleDates: eligible,
      })),
      usedCount: srUsed,
      expiredCount: srExpired,
      eligibleDates: eligible,
      rulesEnabled: rules.streakRescue.enabled,
    },
    leaderboardBoost: {
      available: lbTokens.map((t) => ({
        id: t.id,
        expiresAt: t.expiresAt ? t.expiresAt.toISOString() : null,
        awardedAt: t.awardedAt.toISOString(),
      })),
      usedCount: lbUsed,
      expiredCount: lbExpired,
      status: await getLeaderboardBoostStatus(),
    },
  };
}

/**
 * Leaderboard Boost consumption.
 *
 * There is no safe, ranking-neutral benefit for a "leaderboard boost" on this
 * platform: the official leaderboard and Top-3 Champion ranking are derived
 * exclusively from the Career Growth Score, and must never be altered by a
 * token. Until a genuinely non-ranking benefit is defined and configured, this
 * throws UNAVAILABLE and consumes nothing.
 */
export async function useLeaderboardBoost(studentId: string, tokenId: string): Promise<never> {
  const status = await getLeaderboardBoostStatus();
  if (!status.available) {
    throw new TokenUsageError('UNAVAILABLE', status.reason);
  }
  // Defensive: even when enabled, this build offers no ranking-safe benefit, so
  // we refuse rather than risk any ranking manipulation.
  throw new TokenUsageError(
    'UNAVAILABLE',
    'Leaderboard Boost has no ranking-safe benefit configured. No effect was applied.'
  );
}

export const tokenService = {
  getTokenInventory,
  getEligibleStreakRescueDates,
  rescueStreak,
  getLeaderboardBoostStatus,
  useLeaderboardBoost,
};
