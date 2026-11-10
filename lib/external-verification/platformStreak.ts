/**
 * Platform-specific streak calculation (Phase 1, Step 5).
 *
 * Streaks are DERIVED from normalized verified activity rather than stored in
 * `student_daily_streaks`. That table's unique constraint is
 * (studentId, activityDate) — it cannot represent a per-platform streak without
 * a schema change, and reusing it would silently collide days across platforms.
 *
 * This module is pure (no database access) so it can be unit-tested with
 * synthetic activity and reused by any caller.
 */

export interface PlatformActivityDay {
  sourcePlatform: string;
  occurredAt: Date | string;
}

export interface PlatformStreakSummary {
  platform: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  observedDays: number;
  timeZone: string;
}

export const DEFAULT_STREAK_TIME_ZONE = 'Asia/Kolkata';

function toLocalDate(value: Date | string, timeZone: string): string | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  // en-CA renders as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Platform-independent calendar key (YYYY-MM-DD) for an instant, in the
 * normalized streak timezone. Exported so DB-backed callers normalize activity
 * dates exactly the same way the pure engine does.
 */
export function toPlatformLocalDate(
  value: Date | string,
  timeZone: string = DEFAULT_STREAK_TIME_ZONE,
): string | null {
  return toLocalDate(value, timeZone);
}

function addDays(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const base = Date.UTC(y, m - 1, d);
  const shifted = new Date(base + delta * 24 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / (24 * 60 * 60 * 1000));
}

/**
 * Computes per-platform current/longest streaks honouring the provider-agnostic
 * calendar in `timeZone`. The current streak only counts when the last observed
 * day is today or yesterday; otherwise the chain has lapsed and it is zero.
 */
export function computePlatformStreaks(
  rows: PlatformActivityDay[],
  options: { timeZone?: string; asOf?: Date } = {},
): PlatformStreakSummary[] {
  const timeZone = options.timeZone ?? DEFAULT_STREAK_TIME_ZONE;
  const asOfDate = options.asOf ?? new Date();
  const today = toLocalDate(asOfDate, timeZone);
  const yesterday = today ? addDays(today, -1) : null;

  const byPlatform = new Map<string, Set<string>>();
  for (const row of rows) {
    const day = toLocalDate(row.occurredAt, timeZone);
    if (!day) continue;
    const platform = (row.sourcePlatform || '').toUpperCase();
    if (!platform) continue;
    if (!byPlatform.has(platform)) byPlatform.set(platform, new Set());
    byPlatform.get(platform)!.add(day);
  }

  const summaries: PlatformStreakSummary[] = [];

  for (const [platform, daySet] of byPlatform.entries()) {
    // Deduplicate to one entry per calendar day, then rank descending.
    const days = Array.from(daySet).sort((a, b) => (a < b ? 1 : -1));
    const observedDays = days.length;

    let longest = 0;
    let run = 0;
    for (let i = 0; i < days.length; i++) {
      if (i === 0) {
        run = 1;
      } else {
        run = daysBetween(days[i], days[i - 1]) === 1 ? run + 1 : 1;
      }
      if (run > longest) longest = run;
    }

    const last = days[0] ?? null;
    let current = 0;
    if (last && today && yesterday && (last === today || last === yesterday)) {
      current = 1;
      for (let i = 1; i < days.length; i++) {
        if (daysBetween(days[i], days[i - 1]) === 1) current++;
        else break;
      }
    }

    summaries.push({ platform, currentStreak: current, longestStreak: longest, lastActivityDate: last, observedDays, timeZone });
  }

  return summaries.sort((a, b) => a.platform.localeCompare(b.platform));
}

// ============================================================================
// Phase 2 — platform-specific CODING streak engine
// ============================================================================
//
// A qualifying day for a *coding* streak requires at least one VERIFIED,
// ACCEPTED submission on that platform. Nothing else counts:
//   ✗ logins, profile views, contest-page visits
//   ✗ unaccepted / non-AC submissions
//   ✗ activity whose verification status is not VERIFIED
//
// Whether a provider can even expose accepted submissions with timestamps is a
// per-platform capability (LeetCode and CodeChef cannot), so the engine also
// models HOW COMPLETE the underlying history is. A missing day inside a window
// that was fully synced is a real gap and breaks the streak; a missing day
// inside a provider outage or before the covered window is UNKNOWN and must
// never be treated as a missed day.

/** The ONLY activity type that can qualify a day for a platform coding streak. */
export const STREAK_QUALIFYING_ACTIVITY_TYPE = 'ACCEPTED_SUBMISSION';

/** How trustworthy the provider history behind a streak is. */
export type PlatformHistoryCoverage =
  /** Full, contiguous history is available for the reported window. */
  | 'FULL'
  /** Some history exists but gaps of unknown activity remain → PARTIAL HISTORY. */
  | 'PARTIAL'
  /** The provider cannot supply accepted-submission history at all. */
  | 'UNAVAILABLE';

/** Milestone ladder for platform-specific coding streaks (Phase 2, Step 3). */
export const CODING_STREAK_MILESTONES = [50, 100, 150, 200, 250, 365] as const;
export type CodingStreakMilestone = (typeof CODING_STREAK_MILESTONES)[number];

export interface CodingStreakUnknownRange {
  /** Inclusive local (YYYY-MM-DD) start of an unverifiable window. */
  from: string;
  /** Inclusive local (YYYY-MM-DD) end of an unverifiable window. */
  to: string;
}

export interface CodingStreakSummary {
  platform: string;
  /** False when the provider cannot supply accepted submissions at all. */
  supported: boolean;
  unsupportedReason: string | null;
  coverage: PlatformHistoryCoverage;
  /** True when the data is incomplete → the UI must show PARTIAL HISTORY. */
  partialHistory: boolean;
  currentStreak: number;
  longestStreak: number;
  acceptedActivityCount: number;
  observedDays: number;
  firstActivityDate: string | null;
  lastActivityDate: string | null;
  nextMilestone: CodingStreakMilestone | null;
  nextMilestoneRemaining: number | null;
  progressPercent: number;
  timeZone: string;
}

/** Next unreached coding-streak milestone, or null past the final one. */
export function getNextCodingStreakMilestone(
  streakDays: number,
): { days: CodingStreakMilestone; remaining: number } | null {
  const next = CODING_STREAK_MILESTONES.find((m) => streakDays < m);
  if (!next) return null;
  return { days: next, remaining: next - streakDays };
}

/** Progress toward the next milestone, measured from the previous milestone. */
function milestoneProgress(streakDays: number): number {
  if (streakDays <= 0) return 0;
  const next = getNextCodingStreakMilestone(streakDays);
  if (!next) return 100;
  const previous = [...CODING_STREAK_MILESTONES].reverse().find((m) => streakDays >= m) ?? 0;
  const span = next.days - previous;
  if (span <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round(((streakDays - previous) / span) * 100)));
}

function isUnknownDay(day: string, ranges: CodingStreakUnknownRange[]): boolean {
  return ranges.some((r) => day >= r.from && day <= r.to);
}

export interface ComputeCodingStreakOptions {
  timeZone?: string;
  asOf?: Date;
  /** Full when the synced window is contiguous and successful. */
  coverage?: PlatformHistoryCoverage;
  /** Windows during which the provider was unreachable / history missing. */
  unknownRanges?: CodingStreakUnknownRange[];
  /** False when the provider cannot expose accepted submissions. */
  supported?: boolean;
  unsupportedReason?: string | null;
}

/**
 * Computes a platform coding streak from already-filtered qualifying days.
 *
 * Callers MUST pass only verified, accepted submissions; this function performs
 * no filtering of its own so it stays pure and unit-testable.
 *
 *  - `currentStreak` counts consecutive days back from the most recent verified
 *    day and is live only when that day is today or yesterday (Asia/Kolkata).
 *  - A KNOWN missing day inside the covered window breaks the chain.
 *  - A day inside an `unknownRanges` window (provider outage / missing history)
 *    stops the count WITHOUT breaking it, and flags PARTIAL HISTORY.
 *  - `longestStreak` is the best observed run and is never reduced by a reset.
 */
export function computeCodingStreak(
  qualifyingDays: Array<Date | string>,
  options: ComputeCodingStreakOptions = {},
): CodingStreakSummary {
  const timeZone = options.timeZone ?? DEFAULT_STREAK_TIME_ZONE;
  const asOfDate = options.asOf ?? new Date();
  const supported = options.supported ?? true;
  const coverage = options.coverage ?? 'FULL';
  const unknownRanges = options.unknownRanges ?? [];

  const today = toLocalDate(asOfDate, timeZone);
  const yesterday = today ? addDays(today, -1) : null;

  const daySet = new Set<string>();
  for (const value of qualifyingDays) {
    const day = toLocalDate(value, timeZone);
    if (day) daySet.add(day);
  }
  const days = Array.from(daySet).sort((a, b) => (a < b ? 1 : -1));
  const observedDays = days.length;
  const firstActivityDate = days.length ? days[days.length - 1] : null;
  const lastActivityDate = days[0] ?? null;

  // Longest observed run (real evidence only — never fabricated, never reduced).
  let longest = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i === 0 ? 1 : daysBetween(days[i], days[i - 1]) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  // Current run: strict, but tolerant of verifiably-unknown days.
  let current = 0;
  let laneInterruptedByUnknown = false;
  if (lastActivityDate && today && yesterday && (lastActivityDate === today || lastActivityDate === yesterday)) {
    current = 1;
    let cursor = lastActivityDate;
    for (let i = 1; i < days.length; i++) {
      cursor = addDays(cursor, -1);
      if (days[i] === cursor) {
        current++;
        continue;
      }
      // The next expected day is missing: is it a verified miss or unknown?
      if (isUnknownDay(cursor, unknownRanges)) {
        laneInterruptedByUnknown = true;
      }
      break;
    }
  }

  const partialHistory = coverage !== 'FULL' || laneInterruptedByUnknown || !supported;
  const next = getNextCodingStreakMilestone(longest);

  return {
    platform: '',
    supported,
    unsupportedReason: options.unsupportedReason ?? null,
    coverage: supported ? coverage : 'UNAVAILABLE',
    partialHistory,
    currentStreak: supported ? current : 0,
    longestStreak: supported ? longest : 0,
    acceptedActivityCount: supported ? observedDays : 0,
    observedDays: supported ? observedDays : 0,
    firstActivityDate,
    lastActivityDate,
    nextMilestone: supported && next ? next.days : null,
    nextMilestoneRemaining: supported && next ? next.remaining : null,
    progressPercent: supported ? milestoneProgress(longest) : 0,
    timeZone,
  };
}
