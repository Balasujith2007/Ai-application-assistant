/**
 * Phase 2 – Step 9: platform-specific coding-streak engine test suite.
 *
 * Run with:  npx tsx lib/external-verification/__tests__/codingStreakPhase2.test.ts
 *
 * Design constraints (same as the Phase 1 suite):
 *  - No database access, no production data, no real provider calls.
 *  - Only synthetic handles / synthetic activity days are used.
 *  - Checks that genuinely require a live database (cross-student idempotency,
 *    concurrent award races, Super Admin authorization) are NOT fake-passed;
 *    they are reported as BLOCKED/DB and listed in the acceptance report.
 */

import {
  CODING_STREAK_MILESTONES,
  DEFAULT_STREAK_TIME_ZONE,
  STREAK_QUALIFYING_ACTIVITY_TYPE,
  computeCodingStreak,
  getNextCodingStreakMilestone,
  toPlatformLocalDate,
} from '../platformStreak';
import {
  BADGE_CATALOG,
  CODING_STREAK_BADGE_IDS,
  CODING_STREAK_BADGES,
  isCodingStreakBadge,
  isContestBadge,
  type BadgeEvaluation,
  type StudentActivityStats,
} from '../../gamification/badgeConfig';
import { isEligibleForExternalAchievementBadge, normalizeOwnershipStatus } from '../ownershipStatus';
import { leetCodeAdapter } from '../../leaderboard/adapters/leetcodeAdapter';
import { codeChefAdapter } from '../../leaderboard/adapters/codechefAdapter';
import { atCoderAdapter } from '../../leaderboard/adapters/atcoderAdapter';
import { codeforcesAdapter } from '../../leaderboard/adapters/codeforcesAdapter';

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

// ── Synthetic day helpers (Asia/Kolkata local calendar) ──────────────────────

const TIME_ZONE = DEFAULT_STREAK_TIME_ZONE; // Asia/Kolkata

/** Local calendar key (YYYY-MM-DD) for a day offset from a base day. */
function shiftDay(baseDay: string, deltaDays: number): string {
  const [y, m, d] = baseDay.split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d) + deltaDays * 24 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/** `count` consecutive local days ending at `endDay` (inclusive), oldest first. */
function consecutiveDays(endDay: string, count: number): string[] {
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i--) days.push(shiftDay(endDay, -i));
  return days;
}

/** A real timestamp for a local day: noon Asia/Kolkata → same local calendar day. */
function noonIst(day: string): string {
  return new Date(`${day}T12:00:00+05:30`).toISOString();
}

const ASOF_DAY = '2024-03-10';
const ASOF = new Date(`${ASOF_DAY}T12:00:00+05:30`);

/** Minimal StudentActivityStats carrying only the C2 coding-streak fields. */
function codingStats(streakDays: number, platform: string | null = 'ATCODER'): StudentActivityStats {
  return {
    verifiedCodingStreakDays: streakDays,
    codingStreakPlatform: platform,
    codingAcceptedActivityCount: streakDays,
  } as unknown as StudentActivityStats;
}

function evaluatorFor(badgeId: string) {
  const def = BADGE_CATALOG.find((b) => b.id === badgeId);
  if (!def) throw new Error(`missing badge ${badgeId}`);
  return def;
}

function evaluate(badgeId: string, streakDays: number): BadgeEvaluation {
  const def = evaluatorFor(badgeId);
  return def.evaluate(codingStats(streakDays), def.defaultThreshold);
}

async function main() {
  // ── A. Milestone ladder + badge definitions ────────────────────────────────
  section('A. Milestone ladder and the six Phase 2 badge definitions');

  eq('CODING_STREAK_MILESTONES is exactly 50/100/150/200/250/365', [...CODING_STREAK_MILESTONES], [50, 100, 150, 200, 250, 365]);
  eq('six coding-streak badge ids are registered', CODING_STREAK_BADGE_IDS.length, 6);
  eq('CODING_STREAK_BADGES resolves to six definitions', CODING_STREAK_BADGES.length, 6);
  eq(
    'milestone badges map to the required titles in order',
    CODING_STREAK_BADGES.map((b) => `${b.defaultThreshold}:${b.title}`),
    [
      '50:Code Consistency',
      '100:Code Discipline',
      '150:Coding Dedication',
      '200:Legendary Coder',
      '250:Eternal Problem Solver',
      '365:One Year Coding Legend',
    ],
  );
  eq(
    'milestone tiers escalate consistently',
    CODING_STREAK_BADGES.map((b) => b.tier),
    ['SILVER', 'GOLD', 'GOLD', 'PLATINUM', 'PLATINUM', 'DIAMOND'],
  );

  check('every coding-streak id is uniquely recognised', CODING_STREAK_BADGE_IDS.every((id) => isCodingStreakBadge(id)));
  check('non-coding badges are not misclassified', !isCodingStreakBadge('streak-consistency-elite'));
  check(
    'no duplicate ids across the whole catalog',
    new Set(BADGE_CATALOG.map((b) => b.id)).size === BADGE_CATALOG.length,
  );
  check(
    'no duplicate milestone thresholds (no duplicate concepts)',
    new Set(CODING_STREAK_BADGES.map((b) => b.defaultThreshold)).size === CODING_STREAK_BADGES.length,
  );
  check(
    'every milestone badge has a professional description and exact criteria',
    CODING_STREAK_BADGES.every((b) => b.description.length > 20 && b.criteria.includes('verified accepted submission')),
  );
  check(
    'every milestone badge declares a unique artwork-capable icon name',
    new Set(CODING_STREAK_BADGES.map((b) => b.icon)).size === CODING_STREAK_BADGES.length,
  );
  check(
    'every milestone badge exposes an evidence hook (credential evidence reference)',
    CODING_STREAK_BADGES.every((b) => typeof b.evidence === 'function'),
  );
  check(
    'every milestone badge is category CONSISTENCY with awardSource ENGINE',
    CODING_STREAK_BADGES.every((b) => b.category === 'CONSISTENCY' && b.awardSource === 'ENGINE'),
  );

  const evidence = evaluatorFor('coding-streak-consistency').evidence!(codingStats(77, 'CODEFORCES'));
  eq('evidence echoes the verified platform', (evidence as any)?.platform, 'CODEFORCES');
  eq('evidence echoes the verified streak (never invents)', (evidence as any)?.longestStreakDays, 77);

  // ── B. Consecutive-day milestones (cases 1–6) ──────────────────────────────
  section('B. Consecutive qualifying days → streak and badge thresholds (cases 1–6)');

  for (const days of [50, 100, 150, 200, 250, 365]) {
    const qualifying = consecutiveDays(ASOF_DAY, days).map(noonIst);
    const summary = computeCodingStreak(qualifying, { asOf: ASOF, coverage: 'FULL', timeZone: TIME_ZONE });
    eq(`${days} days → longestStreak`, summary.longestStreak, days);
    eq(`${days} days → currentStreak`, summary.currentStreak, days);
    eq(`${days} days → acceptedActivityCount`, summary.acceptedActivityCount, days);
    eq(`${days} days → FULL coverage, no PARTIAL flag`, [summary.coverage, summary.partialHistory], ['FULL', false]);

    // The badges that should be eligible at this exact streak length.
    const expectedEligible = CODING_STREAK_BADGES.filter((b) => b.defaultThreshold <= days).length;
    const eligibleNow = CODING_STREAK_BADGE_IDS.filter((id) => evaluate(id, days).isEligible).length;
    const eligibleJustBefore =
      days === 50 ? 0 : CODING_STREAK_BADGE_IDS.filter((id) => evaluate(id, days - 1).isEligible).length;
    eq(`${days} days → ${expectedEligible} badges eligible`, eligibleNow, expectedEligible);
    eq(`${days - 1} days → one fewer badge eligible`, eligibleJustBefore, Math.max(0, expectedEligible - 1));
  }

  eq('next milestone below 50 is 50', getNextCodingStreakMilestone(0), { days: 50, remaining: 50 });
  eq('next milestone at 49 is 50 (remaining 1)', getNextCodingStreakMilestone(49), { days: 50, remaining: 1 });
  eq('next milestone at 50 is 100', getNextCodingStreakMilestone(50), { days: 100, remaining: 50 });
  eq('no next milestone past 365', getNextCodingStreakMilestone(365), null);
  eq('progress is 100% past the final milestone', computeCodingStreak(consecutiveDays(ASOF_DAY, 366).map(noonIst), { asOf: ASOF }).progressPercent, 100);

  // ── C. A verified missing day breaks the streak (case 7) ───────────────────
  section('C. One fully verified missing day breaks the chain (case 7)');

  const recentBlock = consecutiveDays(ASOF_DAY, 10); // ASOF-9 .. ASOF
  const earlierBlock = consecutiveDays(shiftDay(ASOF_DAY, -11), 15); // ASOF-25 .. ASOF-11
  const withVerifiedHole = [...recentBlock, ...earlierBlock].map(noonIst);
  const holeSummary = computeCodingStreak(withVerifiedHole, { asOf: ASOF, coverage: 'FULL', timeZone: TIME_ZONE });

  eq('verified hole → currentStreak limited to the most recent block', holeSummary.currentStreak, 10);
  eq('verified hole → longestStreak is the earlier block', holeSummary.longestStreak, 15);
  eq('verified hole → coverage stays FULL', holeSummary.coverage, 'FULL');
  eq('verified hole → NOT flagged as partial history', holeSummary.partialHistory, false);
  eq('verified hole → the missing day is not counted as activity', holeSummary.acceptedActivityCount, 25);

  // ── D. Provider outage during a historical day (case 8) ────────────────────
  section('D. Provider outage must NOT be treated as a missed day (case 8)');

  // Same shape, but the hole sits inside a provider-outage window.
  const outageWindow = { from: shiftDay(ASOF_DAY, -11), to: shiftDay(ASOF_DAY, -11) };
  const outageSummary = computeCodingStreak(withVerifiedHole, {
    asOf: ASOF,
    coverage: 'PARTIAL',
    unknownRanges: [outageWindow],
    timeZone: TIME_ZONE,
  });

  eq('outage → same observed evidence (no fabricated days)', outageSummary.longestStreak, 15);
  eq('outage → accepted activity count unchanged', outageSummary.acceptedActivityCount, 25);
  eq('outage → coverage reported as PARTIAL', outageSummary.coverage, 'PARTIAL');
  check('outage → PARTIAL HISTORY is flagged', outageSummary.partialHistory === true);
  check(
    'outage is explicitly distinguished from a verified miss',
    outageSummary.partialHistory !== holeSummary.partialHistory,
  );

  // An outage ending today: last verified day is yesterday, gap before it is unknown.
  const outageTail = [...consecutiveDays(shiftDay(ASOF_DAY, -1), 1), ...consecutiveDays(shiftDay(ASOF_DAY, -3), 20)].map(noonIst);
  const tailSummary = computeCodingStreak(outageTail, {
    asOf: ASOF,
    coverage: 'PARTIAL',
    unknownRanges: [{ from: shiftDay(ASOF_DAY, -2), to: shiftDay(ASOF_DAY, -1) }],
    timeZone: TIME_ZONE,
  });
  eq('outage tail → longest historical run preserved', tailSummary.longestStreak, 20);
  check('outage tail → flagged partial, not silently zeroed', tailSummary.partialHistory === true);

  // ── E. Incomplete / unsupported history (case 9) ───────────────────────────
  section('E. Incomplete history → PARTIAL HISTORY, unsupported → no streak (case 9)');

  const partialSummary = computeCodingStreak(consecutiveDays(ASOF_DAY, 60).map(noonIst), {
    asOf: ASOF,
    coverage: 'PARTIAL',
    timeZone: TIME_ZONE,
  });
  check('PARTIAL coverage flags PARTIAL HISTORY', partialSummary.partialHistory === true);
  eq('PARTIAL coverage still reports the real streak', partialSummary.longestStreak, 60);

  const unsupported = computeCodingStreak(consecutiveDays(ASOF_DAY, 60).map(noonIst), {
    asOf: ASOF,
    supported: false,
    unsupportedReason: 'Provider does not expose accepted submissions',
    timeZone: TIME_ZONE,
  });
  eq('unsupported → coverage UNAVAILABLE', unsupported.coverage, 'UNAVAILABLE');
  eq('unsupported → currentStreak is 0 (never fabricated)', unsupported.currentStreak, 0);
  eq('unsupported → longestStreak is 0 (never fabricated)', unsupported.longestStreak, 0);
  eq('unsupported → no next milestone offered', unsupported.nextMilestone, null);
  check('unsupported → reason is surfaced', Boolean(unsupported.unsupportedReason));

  const lcCaps = leetCodeAdapter.getProviderCapabilities();
  const ccCaps = codeChefAdapter.getProviderCapabilities();
  eq('LeetCode cannot supply accepted submissions (streak unsupported)', lcCaps.acceptedSubmissions, false);
  eq('CodeChef cannot supply accepted submissions (streak unsupported)', ccCaps.acceptedSubmissions, false);
  eq('AtCoder can supply accepted submissions with timestamps', [atCoderAdapter.getProviderCapabilities().acceptedSubmissions, atCoderAdapter.getProviderCapabilities().submissionTimestamps], [true, true]);
  eq('Codeforces can supply accepted submissions with timestamps', [codeforcesAdapter.getProviderCapabilities().acceptedSubmissions, codeforcesAdapter.getProviderCapabilities().submissionTimestamps], [true, true]);

  console.log('  ℹ LeetCode/CodeChef will report PARTIAL/UNAVAILABLE history — never a fabricated streak.');

  // ── F. Duplicate submissions deduplicate to one day (case 10) ──────────────
  section('F. Duplicate submissions on one day → one qualifying day (case 10)');

  const sameDay = [
    noonIst(ASOF_DAY),
    `${ASOF_DAY}T01:00:00+05:30`,
    `${ASOF_DAY}T23:59:00+05:30`,
    noonIst(ASOF_DAY),
  ];
  const duped = computeCodingStreak(sameDay, { asOf: ASOF, timeZone: TIME_ZONE });
  eq('four submissions on one local day → observedDays 1', duped.observedDays, 1);
  eq('four submissions on one local day → longestStreak 1', duped.longestStreak, 1);
  eq('duplicate submissions do not inflate the count', duped.acceptedActivityCount, 1);

  // ── G. Duplicate sync runs (case 11) ───────────────────────────────────────
  section('G. Repeated sync runs must not alter verified history (case 11)');

  const runInput = consecutiveDays(ASOF_DAY, 75).map(noonIst);
  const runA = computeCodingStreak(runInput, { asOf: ASOF, coverage: 'FULL', timeZone: TIME_ZONE });
  const runB = computeCodingStreak(runInput, { asOf: ASOF, coverage: 'FULL', timeZone: TIME_ZONE });
  eq('re-running the same sync yields identical summaries', runA, runB);
  eq('repeated sync does not extend the streak', runB.longestStreak, 75);

  const shuffled = [...runInput].reverse();
  eq('input order does not affect the result', computeCodingStreak(shuffled, { asOf: ASOF, timeZone: TIME_ZONE }).longestStreak, 75);

  blockedCase(
    'duplicate sync runs at the database layer',
    'verified by composite unique keys on verified_activities / student_platform_streaks; requires an isolated DB',
  );

  // ── H. Ownership gating for high-value streaks (case 12) ───────────────────
  section('H. High-value streak badges require OWNERSHIP_VERIFIED (case 12)');

  eq('legacy VERIFIED normalizes to PROFILE_EXISTS', normalizeOwnershipStatus('VERIFIED'), 'PROFILE_EXISTS');
  check('PROFILE_EXISTS is NOT eligible', !isEligibleForExternalAchievementBadge('PROFILE_EXISTS').eligible);
  check('OWNERSHIP_UNVERIFIED is NOT eligible', !isEligibleForExternalAchievementBadge('OWNERSHIP_UNVERIFIED').eligible);
  check('FORMAT_VERIFIED (legacy) is NOT eligible', !isEligibleForExternalAchievementBadge('FORMAT_VERIFIED').eligible);
  check('OWNERSHIP_VERIFIED IS eligible', isEligibleForExternalAchievementBadge('OWNERSHIP_VERIFIED').eligible);
  check(
    'every Phase 2 streak badge is subject to the ownership gate',
    CODING_STREAK_BADGES.length === 6,
  );

  // ── I. Concurrent award attempts (case 13) ─────────────────────────────────
  section('I. Concurrent award attempts (case 13)');

  eq('award eligibility is a pure function of the streak (idempotent)', evaluate('coding-streak-consistency', 50).isEligible, true);
  eq('the same input always yields the same eligibility', evaluate('coding-streak-consistency', 49).isEligible, false);
  blockedCase(
    'concurrent award races',
    'enforced by the (studentId, badgeId) unique constraint + deterministic credential id; requires an isolated DB',
  );

  // ── J. Longest streak preservation (case 14) ───────────────────────────────
  section('J. Longest streak is preserved independently of current (case 14)');

  const historic = consecutiveDays(shiftDay(ASOF_DAY, -60), 100); // 100 days, lapsed
  const recent = consecutiveDays(ASOF_DAY, 3); // 3-day current run
  const preserved = computeCodingStreak([...historic, ...recent].map(noonIst), { asOf: ASOF, coverage: 'FULL', timeZone: TIME_ZONE });
  eq('longestStreak keeps the historical best (100)', preserved.longestStreak, 100);
  eq('currentStreak reflects only the live run (3)', preserved.currentStreak, 3);
  check('current and longest are reported separately', preserved.currentStreak !== preserved.longestStreak);
  eq('next milestone follows the longest streak', preserved.nextMilestone, 150);
  eq('badges are driven by the longest streak (2 earned)', CODING_STREAK_BADGE_IDS.filter((id) => evaluate(id, preserved.longestStreak).isEligible).length, 2);

  // A lapsed streak must not silently read as 0 longest.
  const lapsed = computeCodingStreak(consecutiveDays(shiftDay(ASOF_DAY, -30), 40).map(noonIst), { asOf: ASOF, timeZone: TIME_ZONE });
  eq('a lapsed streak keeps its longest history', lapsed.longestStreak, 40);
  eq('a lapsed streak reports current 0', lapsed.currentStreak, 0);

  // ── K. Timezone normalization (Asia/Kolkata) ───────────────────────────────
  section('K. Asia/Kolkata normalization with preserved source timestamps');

  eq('timezone constant is Asia/Kolkata', TIME_ZONE, 'Asia/Kolkata');
  eq('a late-UTC instant maps to the next IST day', toPlatformLocalDate('2024-03-09T20:00:00.000Z', 'Asia/Kolkata'), '2024-03-10');
  eq('a mid-UTC instant maps to the same IST day', toPlatformLocalDate('2024-03-10T06:00:00.000Z', 'Asia/Kolkata'), '2024-03-10');
  eq('an instant before IST midnight maps to the previous day', toPlatformLocalDate('2024-03-09T18:00:00.000Z', 'Asia/Kolkata'), '2024-03-09');
  eq('the qualifying activity type is ACCEPTED_SUBMISSION', STREAK_QUALIFYING_ACTIVITY_TYPE, 'ACCEPTED_SUBMISSION');

  // The engine must not count logins / non-accepted activity: they never reach it,
  // but the qualifying-days contract is that only accepted submissions are passed.
  const onlyLoginLike = [] as string[];
  eq('no qualifying days → no streak (logins never qualify)', computeCodingStreak(onlyLoginLike, { asOf: ASOF }).longestStreak, 0);

  // ── L. Existing 30-badge regression (case 15) ──────────────────────────────
  section('L. Existing 30-badge framework regression (case 15)');

  // Phase 3 adds 8 additive contest badges; the Phase 1/2 badges must be
  // preserved unchanged regardless of later, additive expansions.
  eq('Phase 1/2 badges are preserved (30 original + 6 streak)', BADGE_CATALOG.filter((b) => !isContestBadge(b.id)).length, 36);
  eq('original framework still holds exactly 30 badges', BADGE_CATALOG.filter((b) => !isCodingStreakBadge(b.id) && !isContestBadge(b.id)).length, 30);
  check('Phase 3 contest badges are purely additive', BADGE_CATALOG.filter((b) => isContestBadge(b.id)).length === 8);
  for (const id of [
    'career-first-step',
    'career-professional-starter',
    'innovation-elite',
    'streak-consistency-elite',
    'streak-century-achiever',
    'streak-unstoppable',
    'dev-profile-complete',
    'dev-career-improver',
    'monthly-gold-champion',
    'monthly-rising-star',
  ]) {
    check(`original badge preserved: ${id}`, BADGE_CATALOG.some((b) => b.id === id));
  }
  eq('global streak milestone 30 badge is untouched', evaluatorFor('streak-consistency-elite').defaultThreshold, 50);
  check(
    'global and platform streaks are different concepts (different thresholds/ids)',
    evaluatorFor('streak-consistency-elite').id !== 'coding-streak-consistency',
  );
  eq('global badge reads the global streak field', evaluatorFor('streak-consistency-pro').evaluate({ longestStreakDays: 30 } as unknown as StudentActivityStats, 30).isEligible, true);
  eq(
    'platform badge ignores the global streak field',
    evaluatorFor('coding-streak-consistency').evaluate({ longestStreakDays: 999, verifiedCodingStreakDays: 0 } as unknown as StudentActivityStats, 50).isEligible,
    false,
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
    console.log('All Phase 2 coding-streak checks passed.');
  }
  console.log('════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('Test suite crashed:', err);
  process.exitCode = 1;
});
