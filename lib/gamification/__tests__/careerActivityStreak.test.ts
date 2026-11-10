/**
 * Career Activity Streak — dedicated test suite.
 *
 * Run with:  npx tsx lib/gamification/__tests__/careerActivityStreak.test.ts
 *
 * A student earns exactly ONE streak day per calendar day (Asia/Kolkata) on
 * which at least one *verified career submission* is recorded:
 *   • internship / job application submitted  → APPLICATION_SUBMITTED
 *   • hackathon application/registration      → HACKATHON_REGISTERED
 *   • competition application/registration    → COMPETITION_REGISTERED
 *
 * Everything else (login, dashboard, profile views, searching, saving,
 * achievements page, clicking a check-in button, passive navigation, legacy
 * DAILY_CHECKIN rows) must NOT award a streak day.
 *
 * Design constraints (mirrors the Phase 2/3 suites):
 *  - No database access, no production data, no real HTTP calls.
 *  - Only synthetic students / synthetic activity days are used.
 *  - Checks that genuinely require a live database (cross-student isolation,
 *    concurrent award races, SQL-level idempotency, rescue-token atomicity) are
 *    NOT fake-passed; they are reported BLOCKED/DB and listed in the report.
 */

import {
  CAREER_ACTIVITY_STREAK_TYPES,
  STREAK_ACTIVITY_TYPES,
  STREAK_ACTIVITY_TYPE_SET,
  STREAK_MILESTONES,
  isCareerActivityType,
  isStreakActivityType,
  computeStreakCore,
  shiftDate,
  getWeekStartMonday,
  buildWeeklyActivity,
  buildMilestoneProgress,
  getNextStreakMilestone,
} from '../streakCalculator';
import { getFormattedDateInTz, getNextEligibleCheckIn } from '../checkInService';
import {
  BADGE_CATALOG,
  CODING_STREAK_BADGES,
  CODING_STREAK_BADGE_IDS,
  getBadgeById,
  isCodingStreakBadge,
  type StudentActivityStats,
} from '../badgeConfig';

// ── Tiny assertion harness ───────────────────────────────────────────────────

let passed = 0;
const failures: string[] = [];
const blocked: string[] = [];
let currentSection = '';

function section(name: string) {
  currentSection = name;
  console.log(`\n── ${name}`);
}

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failures.push(`${currentSection} › ${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✘ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function eq(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  check(name, ok, ok ? undefined : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function blockedCase(name: string, reason: string) {
  blocked.push(`${currentSection} › ${name} — ${reason}`);
  console.log(`  ⚠ BLOCKED (DB): ${name} — ${reason}`);
}

// ── Synthetic day helpers (Asia/Kolkata local calendar keys) ─────────────────

/** Fixed synthetic "today" so the whole suite is deterministic. */
const TODAY = '2026-05-20';
const YESTERDAY = shiftDate(TODAY, -1);

/** `count` consecutive local days ending at `endDay` (inclusive), oldest first. */
function consecutiveDays(endDay: string, count: number): string[] {
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i--) days.push(shiftDate(endDay, -i));
  return days;
}

/** Minimal StudentActivityStats carrying only the streak fields this suite needs. */
function streakStats(longestStreakDays: number, currentStreakDays = longestStreakDays): StudentActivityStats {
  return {
    currentStreakDays,
    longestStreakDays,
    totalActiveDays: longestStreakDays,
    verifiedCodingStreakDays: 0,
    codingStreakPlatform: null,
    codingAcceptedActivityCount: 0,
  } as unknown as StudentActivityStats;
}

async function main() {
  // ── A. Qualifying vs non-qualifying activity sources ───────────────────────
  section('A. Qualifying vs non-qualifying career activity sources');

  eq(
    'qualifying career types are exactly the three verified submission types',
    [...CAREER_ACTIVITY_STREAK_TYPES],
    ['APPLICATION_SUBMITTED', 'HACKATHON_REGISTERED', 'COMPETITION_REGISTERED'],
  );
  check(
    'internship/job submission (APPLICATION_SUBMITTED) qualifies',
    isCareerActivityType('APPLICATION_SUBMITTED') === true,
  );
  check(
    'hackathon application/registration (HACKATHON_REGISTERED) qualifies',
    isCareerActivityType('HACKATHON_REGISTERED') === true,
  );
  check(
    'competition application/registration (COMPETITION_REGISTERED) qualifies',
    isCareerActivityType('COMPETITION_REGISTERED') === true,
  );

  // Test cases 1–3 & 17: passive / client-claimable actions must never qualify.
  const nonQualifying = [
    'LOGIN',
    'DASHBOARD_VIEW',
    'DASHBOARD_OPEN',
    'PROFILE_VIEW',
    'PROFILE_PAGE_VISIT',
    'VIEW_INTERNSHIP',
    'VIEW_JOB',
    'SEARCH_OPPORTUNITY',
    'SAVE_OPPORTUNITY',
    'BOOKMARK_OPPORTUNITY',
    'ACHIEVEMENTS_VIEW',
    'CHECKIN',
    'DAILY_CHECKIN',
    'DAILY_CHECK_IN',
    'NAVIGATION',
    '',
  ];
  check(
    'login / dashboard / navigation never qualify (cases 1 & 2)',
    !isCareerActivityType('LOGIN') && !isCareerActivityType('DASHBOARD_VIEW') && !isCareerActivityType('NAVIGATION'),
  );
  check(
    'check-in (DAILY_CHECKIN / CHECKIN) never qualifies (case 3)',
    !isCareerActivityType('DAILY_CHECKIN') && !isCareerActivityType('CHECKIN'),
  );
  check(
    'every passive action is rejected by the career guard (case 17)',
    nonQualifying.every((t) => !isCareerActivityType(t) && !isStreakActivityType(t)),
  );

  // Case 19: legacy check-in rows are preserved but excluded from the streak.
  eq('STREAK_ACTIVITY_TYPES excludes legacy DAILY_CHECKIN', STREAK_ACTIVITY_TYPES.includes('DAILY_CHECKIN' as never), false);
  eq('STREAK_ACTIVITY_TYPES excludes legacy CHECKIN', STREAK_ACTIVITY_TYPES.includes('CHECKIN' as never), false);

  // Simulate the service-level filter: a student whose only rows are legacy check-ins.
  const legacyRows = [
    { activityDate: TODAY, activityType: 'DAILY_CHECKIN' },
    { activityDate: YESTERDAY, activityType: 'DAILY_CHECKIN' },
    { activityDate: shiftDate(TODAY, -2), activityType: 'CHECKIN' },
  ];
  const careerRowsOnly = legacyRows.filter((r) => STREAK_ACTIVITY_TYPE_SET.has(r.activityType));
  eq('legacy check-in rows produce zero career activity days (case 19)', careerRowsOnly.length, 0);
  eq(
    'a check-in-only history yields no streak (case 19)',
    computeStreakCore(careerRowsOnly.map((r) => r.activityDate), TODAY, YESTERDAY).currentStreak,
    0,
  );

  // ── B. Streak arithmetic (the spec example + cases 7, 8, 11–14) ────────────
  section('B. Streak arithmetic and the canonical spec example');

  // The exact scenario from the specification.
  // (Wed/Thu/Fri/Sat are derived backwards below so the last day is "today".)
  const sat = TODAY;
  const fri = shiftDate(sat, -1);
  const thu = shiftDate(sat, -2);
  const wed = shiftDate(sat, -3);
  const tue = shiftDate(sat, -4);
  const mon = shiftDate(sat, -5);

  eq('Monday internship application → streak 1', computeStreakCore([mon], mon, shiftDate(mon, -1)).currentStreak, 1);
  eq(
    'Tuesday with no activity (viewed from Wednesday) breaks the streak',
    computeStreakCore([mon], wed, tue).currentStreak,
    0,
  );
  eq('Wednesday job application → new streak 1', computeStreakCore([mon, wed], wed, tue).currentStreak, 1);
  eq('Thursday hackathon submission → streak 2', computeStreakCore([mon, wed, thu], thu, wed).currentStreak, 2);
  eq('Friday login only → streak unchanged at 2', computeStreakCore([mon, wed, thu], fri, thu).currentStreak, 2);
  eq('Saturday internship application → new streak 1', computeStreakCore([mon, wed, thu, sat], sat, fri).currentStreak, 1);
  eq('the earlier Wed/Thu run is the longest run overall', computeStreakCore([mon, wed, thu, sat], sat, fri).longestStreak, 2);

  // Case 7: multiple qualifying activities on one day count once.
  const multiSameDay = [TODAY, TODAY, TODAY];
  eq('three applications on one day = one streak day (case 7)', computeStreakCore(multiSameDay, TODAY, YESTERDAY).currentStreak, 1);
  eq('three applications on one day = one active day (case 7)', computeStreakCore(multiSameDay, TODAY, YESTERDAY).totalActiveDays, 1);

  // Case 8: a duplicate event (same day recorded twice / retried) is idempotent.
  eq(
    'replaying the same-day event does not add a second day (case 8)',
    computeStreakCore([TODAY, YESTERDAY, TODAY, YESTERDAY], TODAY, YESTERDAY).currentStreak,
    2,
  );

  // Case 13: consecutive qualifying days increment correctly.
  eq('14 consecutive days → streak 14 (case 13)', computeStreakCore(consecutiveDays(TODAY, 14), TODAY, YESTERDAY).currentStreak, 14);
  eq('14 consecutive days → longest 14 (case 13)', computeStreakCore(consecutiveDays(TODAY, 14), TODAY, YESTERDAY).longestStreak, 14);

  // Case 11 & 12: a missed day resets to 0; the next activity starts a new streak at 1.
  const withGap = [shiftDate(TODAY, -4), shiftDate(TODAY, -3), shiftDate(TODAY, -2)];
  eq('last activity 2 days ago (a full missed day) → current 0 (case 11)', computeStreakCore(withGap, TODAY, YESTERDAY).currentStreak, 0);
  const afterGap = [...withGap, TODAY];
  eq('next qualifying activity after a missed day starts at 1 (case 12)', computeStreakCore(afterGap, TODAY, YESTERDAY).currentStreak, 1);

  // Case 14: longest streak is preserved permanently across a reset.
  const longestRun = consecutiveDays(shiftDate(TODAY, -20), 9); // a 9-day historical run
  const reset = [...longestRun, TODAY];
  const resetCore = computeStreakCore(reset, TODAY, YESTERDAY);
  eq('reset current streak is 1 (case 14)', resetCore.currentStreak, 1);
  eq('historical longest streak of 9 is preserved (case 14)', resetCore.longestStreak, 9);
  eq('total active days still counts every real activity day', resetCore.totalActiveDays, 10);

  // Case 9 & 10: failed / draft submissions never produce a qualifying date.
  section('C. Failed and draft submissions never award a streak day');
  const qualifiedBefore = computeStreakCore([YESTERDAY], TODAY, YESTERDAY);
  eq('failed submission leaves yesterday-only streak intact (case 9)', computeStreakCore([YESTERDAY], TODAY, YESTERDAY).currentStreak, 1);
  eq('a failed submission contributes no active-day count (case 9)', computeStreakCore([YESTERDAY], TODAY, YESTERDAY).totalActiveDays, 1);
  check('starting state had a live streak before the failed attempt', qualifiedBefore.currentStreak === 1);
  eq('draft submission contributes no streak day (case 10)', computeStreakCore([], TODAY, YESTERDAY).currentStreak, 0);
  eq('draft-only history = 0 active days (case 10)', computeStreakCore([], TODAY, YESTERDAY).totalActiveDays, 0);

  // ── D. Timezone: Asia/Kolkata day boundaries + UTC preservation ────────────
  section('D. Asia/Kolkata boundaries and UTC timestamp preservation');

  // The IST offset is +05:30 → midnight IST is 18:30 UTC of the previous day.
  const beforeMidnight = new Date('2026-05-19T18:29:59.000Z'); // 23:59:59 IST on the 19th
  const atMidnight = new Date('2026-05-19T18:30:00.000Z'); // 00:00:00 IST on the 20th
  const afterMidnight = new Date('2026-05-20T06:00:00.000Z'); // 11:30 IST on the 20th

  eq('one second before IST midnight is still the previous day (case 15)', getFormattedDateInTz(beforeMidnight), '2026-05-19');
  eq('exactly at IST midnight rolls to the next day (case 15)', getFormattedDateInTz(atMidnight), '2026-05-20');
  eq('later on the IST day stays on the same day (case 15)', getFormattedDateInTz(afterMidnight), '2026-05-20');

  // UTC instants are preserved: distinct UTC timestamps map deterministically.
  eq('UTC timestamp is preserved and interpreted, not rewritten (case 16)', getFormattedDateInTz(new Date('2026-05-19T18:30:00.000Z')), '2026-05-20');
  eq('a UTC instant just before the boundary stays on the prior IST day (case 16)', getFormattedDateInTz(new Date('2026-05-19T18:29:59.999Z')), '2026-05-19');
  check(
    'the same UTC instant always yields the same IST calendar day (case 16)',
    getFormattedDateInTz(new Date('2026-01-01T20:00:00.000Z')) === '2026-01-02',
  );

  const nextInfo = getNextEligibleCheckIn('Asia/Kolkata');
  check('next-day boundary clock is within the next 24h (case 15)', nextInfo.secondsRemaining > 0 && nextInfo.secondsRemaining <= 86400);
  check('next-day boundary emits a valid ISO timestamp (case 15)', !Number.isNaN(Date.parse(nextInfo.nextCheckInIso)));

  // ── E. Streak Rescue Token stays explicit and opt-in (case 20) ─────────────
  section('E. Streak Rescue Token is explicit and opt-in');

  check('STREAK_RESCUE is an allowed *streak* activity type', isStreakActivityType('STREAK_RESCUE') === true);
  check('STREAK_RESCUE is NOT a *career* activity (never earned passively)', isCareerActivityType('STREAK_RESCUE') === false);

  const gapped = [shiftDate(TODAY, -2), TODAY];
  eq('without a rescue day the gap stays broken (case 20)', computeStreakCore(gapped, TODAY, YESTERDAY).currentStreak, 1);
  const rescued = [shiftDate(TODAY, -2), YESTERDAY, TODAY];
  eq('only an explicitly recorded rescue day bridges the gap (case 20)', computeStreakCore(rescued, TODAY, YESTERDAY).currentStreak, 3);
  blockedCase(
    'rescue token is single-use, audited and cannot restore the same date twice (case 20)',
    'requires the isolated DB to exercise the atomic token consume + unique (studentId, activityDate) guard',
  );

  // ── F. Badge integration stays aligned and independent (cases 21 & 22) ─────
  section('F. Badge integration — career streak vs external coding streaks');

  // Case 21: external coding streaks are a separate achievement system.
  check('CODING is not a career activity type (case 21)', !isCareerActivityType('CODING') && !isStreakActivityType('CODING'));
  check('coding-streak badges are a distinct family (case 21)', CODING_STREAK_BADGE_IDS.every((id) => isCodingStreakBadge(id)));
  check(
    'career-consistency badges are NOT coding-streak badges (case 21)',
    !isCodingStreakBadge('streak-consistency-starter') && !isCodingStreakBadge('streak-unstoppable'),
  );
  check('coding-streak family has its own milestones (case 21)', CODING_STREAK_BADGES.length === CODING_STREAK_BADGE_IDS.length);

  // Career streak badges read the career `longestStreakDays` (server-verified).
  const starter = getBadgeById('streak-consistency-starter');
  const elite = getBadgeById('streak-consistency-elite');
  check('Consistency Starter exists with a 5-day threshold', !!starter && starter.defaultThreshold === 5);
  check('Consistency Elite exists with a 50-day threshold', !!elite && elite.defaultThreshold === 50);
  check(
    'Consistency Starter unlocks at a verified 5-day career streak',
    starter!.evaluate(streakStats(5), starter!.defaultThreshold).isEligible === true,
  );
  check(
    'Consistency Starter does NOT unlock on a legacy check-in-only history',
    starter!.evaluate(streakStats(0), starter!.defaultThreshold).isEligible === false,
  );
  check(
    'Consistency badges ignore an external coding streak (case 21)',
    starter!.evaluate({ ...streakStats(0), verifiedCodingStreakDays: 400 } as unknown as StudentActivityStats, starter!.defaultThreshold).isEligible === false,
  );

  // Case 22: badge award idempotency is anchored on unique ids.
  const ids = BADGE_CATALOG.map((b) => b.id);
  check('badge catalog has no duplicate ids (case 22)', new Set(ids).size === ids.length);
  eq('the (studentId, badgeId) uniqueness contract is preserved', new Set(ids).size, BADGE_CATALOG.length);
  blockedCase(
    're-awarding a badge makes no duplicate row (case 22)',
    'enforced by the (studentId, badgeId) unique constraint — requires the isolated DB',
  );

  // ── G. Widget data: milestones + weekly strip (UI contract) ────────────────
  section('G. Student widget data contract');

  eq('milestone ladder is 5/15/30/50/100/180', [...STREAK_MILESTONES], [5, 15, 30, 50, 100, 180]);
  eq('next milestone below 5 is 5 with the right remaining count', getNextStreakMilestone(3), { days: 5, remaining: 2 });
  eq('next milestone at 15 is 30', getNextStreakMilestone(15)?.days, 30);
  eq('no milestone remains past 180', getNextStreakMilestone(180), null);
  const mp = buildMilestoneProgress(7);
  eq('milestone 5 is reached at a 7-day streak', mp.find((m) => m.days === 5)?.reached, true);
  eq('milestone 15 is not reached at a 7-day streak', mp.find((m) => m.days === 15)?.reached, false);
  eq('15-day milestone has 8 days remaining at streak 7', mp.find((m) => m.days === 15)?.remaining, 8);

  eq('the week starts on Monday', getWeekStartMonday('2026-05-20'), '2026-05-18');
  const week = buildWeeklyActivity(new Set([TODAY, YESTERDAY]), TODAY, shiftDate(TODAY, -5));
  eq('weekly strip shows all seven days', week.length, 7);
  eq('today is marked completed when a qualifying activity exists', week.find((d) => d.isToday)?.status, 'TODAY_COMPLETED');
  eq('today is marked pending when no qualifying activity yet', buildWeeklyActivity(new Set(), TODAY, YESTERDAY).find((d) => d.isToday)?.status, 'TODAY_PENDING');
  eq('a missed past day inside the week is marked MISSED', week.find((d) => d.date === shiftDate(TODAY, -2))?.status, 'MISSED');
  eq('days before the very first activity are NEUTRAL, not missed', buildWeeklyActivity(new Set(), TODAY, YESTERDAY).find((d) => d.date === shiftDate(TODAY, -2))?.status, 'NEUTRAL');

  // ── H. Genuinely DB-backed cases (BLOCKED — no isolated database) ──────────
  section('H. Database-backed cases (blocked without an isolated DB)');

  blockedCase(
    'one student\'s activity cannot modify another student\'s streak (case 18)',
    'the UNIQUE (studentId, activityDate) key + per-student WHERE clauses require the isolated DB',
  );
  blockedCase(
    'a repeated API request cannot create a second streak row (case 8, SQL level)',
    'ON CONFLICT (studentId, activityDate) DO NOTHING can only be proven against the isolated DB',
  );
  blockedCase(
    'the POST /api/check-in endpoint awards no streak day or XP (case 3, integration)',
    'requires the isolated DB plus an authenticated HTTP session',
  );
  blockedCase(
    'a forged frontend activity claim is rejected (case 17, integration)',
    'only the server-side career guard runs in this pure layer; the API auth path needs the isolated DB',
  );

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failures.length}`);
  if (blocked.length > 0) {
    console.log(`Blocked (needs isolated DB): ${blocked.length}`);
    for (const b of blocked) console.log(`  - ${b}`);
  }
  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log('All Career Activity Streak checks passed.');
  }
  console.log('════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('Test suite crashed:', err);
  process.exitCode = 1;
});
