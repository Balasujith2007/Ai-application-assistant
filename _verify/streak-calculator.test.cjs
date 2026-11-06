/**
 * Pure-logic verification for the strict consecutive-day streak calculator.
 *
 * This suite exercises lib/gamification/streakCalculator.ts directly (no
 * database, no network, no production data) and proves the STRICT reset rules
 * required by the Daily Check-In redesign:
 *   Day1→1, Day2→2, Day3→3, Day4→4, miss a full day → 0, next activity → 1.
 *
 * Run:  npx tsc lib/gamification/streakCalculator.ts --outDir _verify/.tmp \
 *         --module commonjs --target es2020 --skipLibCheck --esModuleInterop
 *       node _verify/streak-calculator.test.cjs
 */
const path = require('node:path');
const {
  computeStreakCore,
  shiftDate,
  getWeekStartMonday,
  weekdayIndex,
  buildMilestoneProgress,
  getNextStreakMilestone,
  buildWeeklyActivity,
  STREAK_MILESTONES,
} = require(path.join(__dirname, '.tmp', 'streakCalculator.js'));

const TODAY = '2026-11-06';
const YESTERDAY = shiftDate(TODAY, -1); // 2026-11-05

let passed = 0;
let failed = 0;

function eq(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`}`);
  ok ? passed++ : failed++;
}
function ok(name, cond, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  — ${detail}`}`);
  cond ? passed++ : failed++;
}

console.log('── Consecutive-day streak (strict reset) ──');

// 1. First ever check-in today
eq('1. first check-in → streak 1', computeStreakCore([TODAY], TODAY, YESTERDAY), {
  currentStreak: 1, longestStreak: 1, totalActiveDays: 1, lastQualifyingDate: TODAY,
});

// 2. Second consecutive day
eq('2. second consecutive day → streak 2', computeStreakCore([TODAY, YESTERDAY], TODAY, YESTERDAY).currentStreak, 2);
eq('2. longest tracks current', computeStreakCore([TODAY, YESTERDAY], TODAY, YESTERDAY).longestStreak, 2);

// 3. Fourth consecutive day
const fourDays = [TODAY, shiftDate(TODAY, -1), shiftDate(TODAY, -2), shiftDate(TODAY, -3)];
eq('3. fourth consecutive day → streak 4', computeStreakCore(fourDays, TODAY, YESTERDAY).currentStreak, 4);

// 4. Miss one full calendar day (last activity was 2 days ago) → 0
const threeRunThenGap = [shiftDate(TODAY, -2), shiftDate(TODAY, -3), shiftDate(TODAY, -4)];
const missed = computeStreakCore(threeRunThenGap, TODAY, YESTERDAY);
eq('4. miss a full calendar day → current streak 0', missed.currentStreak, 0);
eq('4. longest run preserved after reset → 3', missed.longestStreak, 3);

// 5. Next qualifying day after the miss → new streak 1
const afterReturn = computeStreakCore([...threeRunThenGap, TODAY], TODAY, YESTERDAY);
eq('5. next qualifying day → new streak 1', afterReturn.currentStreak, 1);
eq('5. longest still preserved → 3', afterReturn.longestStreak, 3);

// 9. Longest streak preserved across a much older best run
const oldWeek = ['2026-10-01','2026-10-02','2026-10-03','2026-10-04','2026-10-05','2026-10-06','2026-10-07'];
const withOldBest = computeStreakCore([...oldWeek, TODAY], TODAY, YESTERDAY);
eq('9. oldest best run (7) preserved after big gap', withOldBest.longestStreak, 7);
eq('9. current streak is only the new run', withOldBest.currentStreak, 1);

// Duplicate dates collapse to one active day (idempotency of the day set)
eq('dedupe: duplicate dates count once', computeStreakCore([TODAY, TODAY, TODAY], TODAY, YESTERDAY).totalActiveDays, 1);

console.log('\n── IST / calendar boundary safety ──');

eq('boundary: last activity yesterday is still live', computeStreakCore([YESTERDAY], TODAY, YESTERDAY).currentStreak, 1);
eq('boundary: last activity 2 days ago resets to 0', computeStreakCore([shiftDate(TODAY, -2)], TODAY, YESTERDAY).currentStreak, 0);
eq('date math: month rollover back', shiftDate('2026-03-01', -1), '2026-02-28');
eq('date math: year rollover forward', shiftDate('2026-12-31', 1), '2027-01-01');
eq('date math: year rollover back', shiftDate('2027-01-01', -1), '2026-12-31');
eq('date math: leap year', shiftDate('2028-02-28', 1), '2028-02-29');
eq('week starts on Monday', weekdayIndex(getWeekStartMonday(TODAY)), 1);
eq('week start is stable for a Sunday', getWeekStartMonday('2026-11-08'), '2026-11-02');

console.log('\n── Milestone ladder (5/15/30/50/100/180) ──');

eq('milestones constant', STREAK_MILESTONES, [5, 15, 30, 50, 100, 180]);
eq('next from 0 → 5 (5 to go)', getNextStreakMilestone(0), { days: 5, remaining: 5 });
eq('next from 4 → 5 (1 to go)', getNextStreakMilestone(4), { days: 5, remaining: 1 });
eq('next from 5 → 15 (10 to go)', getNextStreakMilestone(5), { days: 15, remaining: 10 });
eq('next from 29 → 30 (1 to go)', getNextStreakMilestone(29), { days: 30, remaining: 1 });
eq('next from 179 → 180 (1 to go)', getNextStreakMilestone(179), { days: 180, remaining: 1 });
eq('next from 180 → null (ladder complete)', getNextStreakMilestone(180), null);

const prog = buildMilestoneProgress(6);
eq('progress: 5-day reached at streak 6', prog.find((m) => m.days === 5).reached, true);
eq('progress: 15-day not reached at streak 6', prog.find((m) => m.days === 15).reached, false);
eq('progress: remaining to 15 is 9', prog.find((m) => m.days === 15).remaining, 9);

console.log('\n── Weekly activity strip ──');

const weekStart = getWeekStartMonday(TODAY);
const active = new Set([weekStart, shiftDate(weekStart, 1), TODAY]);
const week = buildWeeklyActivity(active, TODAY, weekStart);
eq('weekly: seven days', week.length, 7);
eq('weekly: first day is Monday', week[0].dayLabel, 'Mon');
eq('weekly: completed day', week[0].status, 'COMPLETED');
ok('weekly: today flagged', week.find((d) => d.isToday).date === TODAY, 'today not found');
eq('weekly: today completed', week.find((d) => d.isToday).status, 'TODAY_COMPLETED');
ok('weekly: a future day exists', week.some((d) => d.status === 'FUTURE'));
ok('weekly: a missed day exists (started earlier)', week.some((d) => d.status === 'MISSED'));
ok('weekly: every day comes from the real active set or is derived',
  week.every((d) => ['COMPLETED', 'MISSED', 'TODAY_COMPLETED', 'TODAY_PENDING', 'FUTURE', 'NEUTRAL'].includes(d.status)));

// Today pending (not yet checked in)
const pendingWeek = buildWeeklyActivity(new Set([weekStart]), TODAY, weekStart);
eq('weekly: today pending when absent', pendingWeek.find((d) => d.isToday).status, 'TODAY_PENDING');

// Brand-new student (first activity today): earlier days in the week are NEUTRAL, not MISSED
const newbieWeek = buildWeeklyActivity(new Set([TODAY]), TODAY, TODAY);
ok('weekly: pre-account days are NEUTRAL', newbieWeek.filter((d) => d.date < TODAY).every((d) => d.status === 'NEUTRAL'));

console.log(`\n${passed} passed, ${failed} failed.`);
process.exit(failed ? 1 : 0);
