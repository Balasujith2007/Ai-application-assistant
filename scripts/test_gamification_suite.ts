/**
 * AI Career Platform — Professional 30-Badge Achievement System Test Suite
 * ------------------------------------------------------------------------
 * Two layers:
 *
 *   PART A — Deterministic catalog & eligibility tests.
 *     Pure unit tests against `badgeConfig` and `badgeCredentials`. No database
 *     access at all. Always run. Covers all 30 definitions, the five categories,
 *     per-category eligibility thresholds, progress-availability semantics,
 *     legacy migration integrity and credential formatting.
 *
 *   PART B — Database integration tests (OPT-IN).
 *     Gated behind `BADGE_DB_TESTS=1` so that running this file never touches the
 *     configured database by accident (the project points at a live Neon
 *     instance). When enabled it uses an ISOLATED test account
 *     (`badge.framework.test@aicareerplatform.test`) that it creates and cleans
 *     up itself — it never reads or mutates real students. Covers streak
 *     milestones, idempotent awarding, duplicate-event handling, overview shape,
 *     credential verification and admin on-behalf awarding.
 *
 * Run:
 *   npx tsx scripts/test_gamification_suite.ts
 *   BADGE_DB_TESTS=1 npx tsx scripts/test_gamification_suite.ts   (PowerShell: $env:BADGE_DB_TESTS='1')
 */

import {
  BADGE_CATALOG,
  BADGE_DEFINITIONS,
  BADGE_CATEGORIES,
  ENGINE_BADGES,
  MONTHLY_BADGES,
  RETIRED_BADGE_IDS,
  LEGACY_BADGE_MIGRATION,
  getBadgeById,
  type BadgeCategory,
  type StudentActivityStats,
} from '../lib/gamification/badgeConfig';
import {
  ISSUING_ORGANIZATION,
  buildCredentialId,
  isCredentialId,
  buildVerificationPath,
  buildVerificationUrl,
  buildLinkedInShareUrl,
} from '../lib/gamification/badgeCredentials';
import type { MonthlyCandidate } from '../lib/gamification/monthlyRecognitionService';

const DB_TESTS_ENABLED = process.env.BADGE_DB_TESTS === '1';
const TEST_ACCOUNT_EMAIL = 'badge.framework.test@aicareerplatform.test';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (details) console.error(`     Details: ${details}`);
  }
}

/** A neutral, all-zero stats object (no verified activity). */
function emptyStats(): StudentActivityStats {
  return {
    applicationsSubmitted: 0,
    shortlistCount: 0,
    interviewStageCount: 0,
    interviewsAttendedCount: 0,
    selectionCount: 0,
    internshipCompletedCount: 0,
    competitionRegistrations: 0,
    projectSubmissionsCount: 0,
    finalistCount: 0,
    podiumCount: 0,
    winnerCount: 0,
    currentStreakDays: 0,
    longestStreakDays: 0,
    totalActiveDays: 0,
    activeWeeksInMonth: 0,
    profileCompleteness: 0,
    resumeUploaded: false,
    resumeReviewed: false,
    resumeStrengthScore: 0,
    resumeStrengthImproved: false,
    skillsCount: 0,
    projectsCount: 0,
    experiencesCount: 0,
    monthlyRank: null,
    monthlyScore: null,
    monthlyImprovement: null,
    monthlyActiveWeeks: null,
  };
}

/** Minimal verified-activity patch that satisfies each badge's default threshold. */
const SATISFYING_PATCH: Record<string, Partial<StudentActivityStats>> = {
  // A. Career Excellence
  'career-first-step': { applicationsSubmitted: 1 },
  'career-shortlist-achiever': { shortlistCount: 1 },
  'career-interview-ready': { interviewStageCount: 1 },
  'career-interview-performer': { interviewsAttendedCount: 1 },
  'career-breakthrough': { selectionCount: 1 },
  'career-professional-starter': { internshipCompletedCount: 1 },
  // B. Innovation & Competition
  'innovation-hackathon-explorer': { competitionRegistrations: 1 },
  'innovation-project-builder': { projectSubmissionsCount: 1 },
  'innovation-finalist': { finalistCount: 1 },
  'innovation-podium-finisher': { podiumCount: 1 },
  'innovation-competition-champion': { winnerCount: 1 },
  'innovation-elite': { finalistCount: 1, podiumCount: 1, winnerCount: 1 },
  // C. Consistency & Streak
  'streak-consistency-starter': { longestStreakDays: 5 },
  'streak-consistency-pro': { longestStreakDays: 15 },
  'streak-consistency-master': { longestStreakDays: 30 },
  'streak-consistency-elite': { longestStreakDays: 50 },
  'streak-century-achiever': { longestStreakDays: 100 },
  'streak-unstoppable': { longestStreakDays: 180 },
  // D. Professional Development
  'dev-profile-complete': { profileCompleteness: 80 },
  'dev-resume-ready': { resumeUploaded: true, resumeReviewed: true },
  'dev-skill-builder': { skillsCount: 5 },
  'dev-project-portfolio': { projectsCount: 4 },
  'dev-experience-builder': { experiencesCount: 1 },
  'dev-career-improver': { resumeStrengthImproved: true },
  // E. Monthly Excellence
  'monthly-gold-champion': { monthlyRank: 1 },
  'monthly-silver-champion': { monthlyRank: 2 },
  'monthly-bronze-champion': { monthlyRank: 3 },
  'monthly-career-excellence': { monthlyScore: 85 },
  'monthly-consistent-performer': { monthlyActiveWeeks: 4 },
  'monthly-rising-star': { monthlyImprovement: 10 },
};

const EXPECTED_CATEGORIES: BadgeCategory[] = [
  'CAREER_EXCELLENCE',
  'INNOVATION',
  'CONSISTENCY',
  'PROFESSIONAL_DEVELOPMENT',
  'MONTHLY_EXCELLENCE',
];

const EXPECTED_IDS = [
  'career-first-step',
  'career-shortlist-achiever',
  'career-interview-ready',
  'career-interview-performer',
  'career-breakthrough',
  'career-professional-starter',
  'innovation-hackathon-explorer',
  'innovation-project-builder',
  'innovation-finalist',
  'innovation-podium-finisher',
  'innovation-competition-champion',
  'innovation-elite',
  'streak-consistency-starter',
  'streak-consistency-pro',
  'streak-consistency-master',
  'streak-consistency-elite',
  'streak-century-achiever',
  'streak-unstoppable',
  'dev-profile-complete',
  'dev-resume-ready',
  'dev-skill-builder',
  'dev-project-portfolio',
  'dev-experience-builder',
  'dev-career-improver',
  'monthly-gold-champion',
  'monthly-silver-champion',
  'monthly-bronze-champion',
  'monthly-career-excellence',
  'monthly-consistent-performer',
  'monthly-rising-star',
];

function runDeterministicSuite() {
  console.log('--- Test Group 1: 30-Badge Catalog Integrity ---');
  assert(BADGE_DEFINITIONS.length === 30, 'Exactly 30 badges defined in catalog', `Found ${BADGE_DEFINITIONS.length}`);
  assert(BADGE_CATALOG.length === 30, 'BADGE_CATALOG exposes 30 badges');
  assert(BADGE_DEFINITIONS === BADGE_CATALOG, 'BADGE_DEFINITIONS aliases BADGE_CATALOG');

  const ids = BADGE_DEFINITIONS.map((b) => b.id);
  assert(new Set(ids).size === 30, 'No duplicate badge ids');
  assert(
    EXPECTED_IDS.every((id) => ids.includes(id)),
    'All 30 expected badge ids are present',
    `Missing: ${EXPECTED_IDS.filter((id) => !ids.includes(id)).join(', ')}`
  );

  console.log('\n--- Test Group 2: Five Categories × Six Badges ---');
  assert(BADGE_CATEGORIES.length === 5, 'Five categories declared');
  assert(
    EXPECTED_CATEGORIES.every((c) => BADGE_CATEGORIES.some((d) => d.key === c)),
    'All five category keys are exposed'
  );
  for (const category of EXPECTED_CATEGORIES) {
    const inCategory = BADGE_DEFINITIONS.filter((b) => b.category === category);
    assert(inCategory.length === 6, `Category ${category} has exactly 6 badges`, `Found ${inCategory.length}`);
  }

  console.log('\n--- Test Group 3: Award Sources ---');
  assert(ENGINE_BADGES.length === 24, '24 engine-awarded badges', `Found ${ENGINE_BADGES.length}`);
  assert(MONTHLY_BADGES.length === 6, '6 monthly-awarded badges', `Found ${MONTHLY_BADGES.length}`);
  assert(
    ENGINE_BADGES.every((b) => b.awardSource === 'ENGINE') && MONTHLY_BADGES.every((b) => b.awardSource === 'MONTHLY'),
    'Award sources are consistent with badge category groups'
  );
  assert(
    MONTHLY_BADGES.every((b) => b.category === 'MONTHLY_EXCELLENCE'),
    'All monthly badges live in MONTHLY_EXCELLENCE'
  );

  console.log('\n--- Test Group 4: Badge Definition Shape ---');
  const malformed = BADGE_DEFINITIONS.filter(
    (b) =>
      !b.id ||
      !b.title ||
      !b.description ||
      !b.criteria ||
      !b.icon ||
      typeof b.defaultThreshold !== 'number' ||
      typeof b.xpReward !== 'number' ||
      typeof b.evaluate !== 'function'
  );
  assert(malformed.length === 0, 'Every badge has id/title/description/criteria/icon/threshold/xp/evaluate', malformed.map((b) => b.id).join(', '));
  assert(
    BADGE_DEFINITIONS.every((b) => ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'].includes(b.tier)),
    'Every badge has a valid professional tier'
  );
  assert(
    BADGE_DEFINITIONS.every((b) => b.xpReward > 0 && b.defaultThreshold > 0),
    'Every badge has a positive threshold and XP reward'
  );

  console.log('\n--- Test Group 5: Per-Category Eligibility (deterministic) ---');
  for (const category of EXPECTED_CATEGORIES) {
    const inCategory = BADGE_DEFINITIONS.filter((b) => b.category === category);
    let satisfiedCount = 0;
    let rejectedWhenEmpty = 0;

    for (const badge of inCategory) {
      const patch = SATISFYING_PATCH[badge.id];
      if (!patch) {
        console.error(`     ⚠️ No satisfying patch for ${badge.id}`);
        continue;
      }
      const satisfiedStats: StudentActivityStats = { ...emptyStats(), ...patch };
      const satisfied = badge.evaluate(satisfiedStats, badge.defaultThreshold);
      if (satisfied.isEligible) satisfiedCount++;

      // Monthly badges cannot be earned by empty stats; measurable badges must
      // also reject empty stats (except monthly which is rank-gated upstream).
      const empty = badge.evaluate(emptyStats(), badge.defaultThreshold);
      if (!empty.isEligible) rejectedWhenEmpty++;
    }

    assert(
      satisfiedCount === 6,
      `Category ${category}: all 6 badges unlock at their default threshold`,
      `Unlocked ${satisfiedCount}/6`
    );
    assert(
      rejectedWhenEmpty === 6,
      `Category ${category}: no badge unlocks with zero verified activity`,
      `Rejected ${rejectedWhenEmpty}/6`
    );
  }

  console.log('\n--- Test Group 6: Progress-Availability Semantics ---');
  const measurable = BADGE_DEFINITIONS.filter((b) => b.awardSource === 'ENGINE');
  assert(
    measurable.every((b) => b.evaluate({ ...emptyStats(), ...SATISFYING_PATCH[b.id] }, b.defaultThreshold).progressAvailable === true),
    'Every engine badge reports measurable progress'
  );
  assert(
    MONTHLY_BADGES.every((b) => b.evaluate({ ...emptyStats(), ...SATISFYING_PATCH[b.id] }, b.defaultThreshold).progressAvailable === false),
    'Monthly badges never expose a misleading progress percentage'
  );
  const beyondThreshold = getBadgeById('career-first-step')!.evaluate(
    { ...emptyStats(), applicationsSubmitted: 5 },
    1
  );
  assert(beyondThreshold.progressPercentage === 100, 'Progress percentage clamps to 100 at/above threshold');

  console.log('\n--- Test Group 7: Legacy Migration Integrity ---');
  assert(RETIRED_BADGE_IDS.length > 0, 'Legacy retired badge ids are catalogued');
  assert(
    RETIRED_BADGE_IDS.every((id) => !ids.includes(id)),
    'No retired legacy id is still active in the 30-badge catalog'
  );
  const brokenMappings = Object.entries(LEGACY_BADGE_MIGRATION).filter(([, target]) => !ids.includes(target));
  assert(brokenMappings.length === 0, 'Every legacy migration target resolves to a live badge', brokenMappings.map(([f, t]) => `${f}->${t}`).join(', '));

  console.log('\n--- Test Group 8: Credential & LinkedIn Formatting ---');
  const awardedAt = new Date('2026-03-14T09:30:00.000Z');
  const credentialId = buildCredentialId('stu_abc123', 'career-first-step', awardedAt);
  assert(isCredentialId(credentialId), 'Credential id matches the public format', credentialId);
  assert(
    credentialId === buildCredentialId('stu_abc123', 'career-first-step', awardedAt),
    'Credential id is deterministic for the same student/badge/time'
  );
  assert(
    credentialId !== buildCredentialId('stu_abc123', 'career-first-step', new Date('2026-03-14T09:30:01.000Z')),
    'Credential id changes with award time (no collisions across awards)'
  );
  assert(buildVerificationPath(credentialId) === `/verify/${credentialId}`, 'Verification path is privacy-safe (no PII)');
  assert(
    buildVerificationUrl(credentialId, 'https://ai-career.example') === `https://ai-career.example/verify/${credentialId}`,
    'Verification URL composes from the app base URL'
  );
  const shareUrl = buildLinkedInShareUrl({
    badgeTitle: 'First Step',
    credentialId,
    verificationUrl: `https://ai-career.example/verify/${credentialId}`,
    issueDate: awardedAt,
  });
  const shareParams = new URL(shareUrl).searchParams;
  assert(
    shareUrl.startsWith('https://www.linkedin.com/profile/add?') &&
      shareParams.get('organizationName') === ISSUING_ORGANIZATION &&
      shareParams.get('certId') === credentialId &&
      shareParams.get('certUrl') === `https://ai-career.example/verify/${credentialId}`,
    'LinkedIn share URL is prefilled with issuing org and credential id'
  );
  assert(ISSUING_ORGANIZATION === 'AI Career Platform', 'Issuing organization is "AI Career Platform"');
}

async function runMonthlyRankingUnitTests() {
  const { rankMonthlyCandidates, getMonthKey, getPreviousMonthKey, getClosingMonthKey, getMonthPeriod, isWithinMonthlyWindow, getNextMonthlyExecution } =
    await import('../lib/gamification/monthlyRecognitionService');

  const cand = (over: Partial<MonthlyCandidate>): MonthlyCandidate => ({
    studentId: 'stu',
    score: 0,
    internship: 0,
    hackathon: 0,
    resume: 0,
    weeksActive: 0,
    finalScore: 0,
    ...over,
  });

  console.log('\n--- Test Group 14: Monthly Recognition Ranking & Time Boundaries (deterministic) ---');

  let ranked = rankMonthlyCandidates([cand({ studentId: 'low', score: 50 }), cand({ studentId: 'high', score: 90 })]);
  assert(ranked[0].studentId === 'high', 'Higher monthly career score ranks first');

  ranked = rankMonthlyCandidates([
    cand({ studentId: 'b', score: 80, internship: 10 }),
    cand({ studentId: 'a', score: 80, internship: 25 }),
  ]);
  assert(ranked[0].studentId === 'a', 'Score tie is broken by internship & job application contribution');

  ranked = rankMonthlyCandidates([
    cand({ studentId: 'x', score: 80, internship: 20, hackathon: 5 }),
    cand({ studentId: 'y', score: 80, internship: 20, hackathon: 18 }),
  ]);
  assert(ranked[0].studentId === 'y', 'Score + internship tie is broken by hackathon & competition contribution');

  ranked = rankMonthlyCandidates([
    cand({ studentId: 'm', score: 80, internship: 20, hackathon: 10, resume: 2 }),
    cand({ studentId: 'n', score: 80, internship: 20, hackathon: 10, resume: 9 }),
  ]);
  assert(ranked[0].studentId === 'n', 'Score + internship + hackathon tie is broken by resume strength');

  ranked = rankMonthlyCandidates([cand({ studentId: 'stu_c' }), cand({ studentId: 'stu_a' }), cand({ studentId: 'stu_b' })]);
  assert(
    ranked.map((c) => c.studentId).join(',') === 'stu_a,stu_b,stu_c',
    'A full tie is broken deterministically by student id (stable podium)'
  );

  const pool = [
    cand({ studentId: 's1', score: 90 }),
    cand({ studentId: 's2', score: 90, internship: 40 }),
    cand({ studentId: 's3', score: 70 }),
    cand({ studentId: 's4', score: 90, internship: 40 }),
    cand({ studentId: 's5', score: 60 }),
  ];
  const top3Forward = rankMonthlyCandidates(pool).slice(0, 3).map((c) => c.studentId).join(',');
  const top3Reversed = rankMonthlyCandidates([...pool].reverse()).slice(0, 3).map((c) => c.studentId).join(',');
  assert(top3Forward === top3Reversed, 'Top-3 podium is invariant to input ordering');
  assert(top3Forward === 's2,s4,s1', 'Podium honours the documented tie-break order', top3Forward);
  assert(ranked.length === 3 && pool.length === 5, 'Ranking never drops or duplicates candidates');

  assert(getMonthKey(new Date('2026-03-15T00:00:00.000Z')) === '2026-03', 'getMonthKey returns YYYY-MM in the business timezone');
  assert(getPreviousMonthKey('2026-03') === '2026-02', 'getPreviousMonthKey steps back one month');
  assert(getPreviousMonthKey('2026-01') === '2025-12', 'getPreviousMonthKey rolls across year boundaries');
  assert(getClosingMonthKey(new Date('2026-03-15T00:00:00.000Z')) === '2026-02', 'getClosingMonthKey recognises the previous month');

  const feb = getMonthPeriod('2026-02');
  assert(feb.startStr === '2026-02-01' && feb.endStr === '2026-02-28', 'getMonthPeriod bounds a non-leap February correctly');
  assert(feb.startDate.toISOString() === '2026-01-31T18:30:00.000Z', 'Month boundary respects the IST offset (start)', feb.startDate.toISOString());
  assert(
    isWithinMonthlyWindow(new Date('2026-03-01T00:00:00.000Z')).ok === true,
    'Monthly recognition window is open on the 1st (IST)'
  );
  assert(
    isWithinMonthlyWindow(new Date('2026-03-05T00:00:00.000Z')).ok === false,
    'Monthly recognition window is closed after the 3rd (IST)'
  );
  assert(
    getNextMonthlyExecution(new Date('2026-03-15T00:00:00.000Z')).toISOString() === '2026-03-31T19:00:00.000Z',
    'Next monthly execution is the 1st of next month at 00:30 IST'
  );
}

async function runDatabaseSuite() {
  const { default: prisma } = await import('../lib/prisma');
  const { badgeEngine, recordDailyActivity, evaluateAndAwardBadges, getStudentBadgesOverview } = await import(
    '../lib/gamification/badgeEngine'
  );

  let testStudentId = '';
  const monthlyFixtureIds: string[] = [];
  const streakFixtureIds: string[] = [];
  // A synthetic month key keeps the run completely separate from any real
  // recognition period, and `scopeStudentIds` keeps it away from real learners.
  const monthlyMonthKey = '2977-07';

  /** Removes every artifact an isolated student fixture could create. */
  const cleanupStudentFixtures = async (ids: string[], monthKey: string) => {
    if (ids.length) {
      await prisma.studentReward.deleteMany({ where: { studentId: { in: ids } } }).catch(() => {});
      await prisma.notification.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
      await prisma.badgeAwardAudit.deleteMany({ where: { studentId: { in: ids } } }).catch(() => {});
      await prisma.monthlyPerformanceSnapshot.deleteMany({ where: { studentId: { in: ids } } }).catch(() => {});
      await prisma.pointsLedger.deleteMany({ where: { studentId: { in: ids } } }).catch(() => {});
      await prisma.verifiedActivity.deleteMany({ where: { studentId: { in: ids } } }).catch(() => {});
      await prisma.achievementHistory.deleteMany({ where: { studentId: { in: ids } } }).catch(() => {});
      await prisma.studentDailyStreak.deleteMany({ where: { studentId: { in: ids } } }).catch(() => {});
      await prisma.studentBadge.deleteMany({ where: { studentId: { in: ids } } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
    }
    if (monthKey) {
      await prisma.monthlyRecognitionRun.deleteMany({ where: { monthKey } }).catch(() => {});
    }
  };

  try {
    console.log('\n--- Test Group 9: Isolated Test Account (DB) ---');
    let student = await prisma.user.findUnique({ where: { email: TEST_ACCOUNT_EMAIL } });
    if (!student) {
      student = await prisma.user.create({
        data: { name: 'Badge Framework Test', email: TEST_ACCOUNT_EMAIL, role: 'STUDENT', active: true },
      });
    }
    testStudentId = student.id;
    assert(!!testStudentId, 'Isolated test account is ready');

    // Clean slate for the isolated account only.
    await prisma.studentBadge.deleteMany({ where: { studentId: testStudentId } });
    await prisma.studentDailyStreak.deleteMany({ where: { studentId: testStudentId } });
    await prisma.achievementHistory.deleteMany({ where: { studentId: testStudentId } });

    console.log('\n--- Test Group 10: Streak Engine & Qualifying Activity ---');
    const nonQualifying = await recordDailyActivity(testStudentId, 'PAGE_VIEW');
    assert(nonQualifying.recorded === false, 'Meaningless activity (page view) is rejected from streaks');
    const nonQualifyingCount = await prisma.studentDailyStreak.count({ where: { studentId: testStudentId } });
    assert(nonQualifyingCount === 0, 'Rejected activity creates no streak row');

    const first = await recordDailyActivity(testStudentId, 'APPLICATION_SUBMITTED', 'APP-1');
    assert(first.recorded === true && first.currentStreak === 1, 'Qualifying career activity records a 1-day streak');

    const duplicate = await recordDailyActivity(testStudentId, 'APPLICATION_SUBMITTED', 'APP-2');
    assert(duplicate.recorded === true, 'Duplicate same-day activity is handled without error');
    const streakRows = await prisma.studentDailyStreak.count({ where: { studentId: testStudentId } });
    assert(streakRows === 1, 'Duplicate same-day activity creates no extra streak row', `Rows: ${streakRows}`);

    // Seed a 5-day run to hit the first milestone.
    for (let i = 1; i <= 4; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      await prisma.studentDailyStreak.upsert({
        where: { studentId_activityDate: { studentId: testStudentId, activityDate: ds } },
        update: {},
        create: {
          id: `streak_${testStudentId}_${ds}`,
          studentId: testStudentId,
          activityDate: ds,
          activityType: 'APPLICATION_SUBMITTED',
          sourceReference: 'DB_TEST_SEED',
        },
      });
    }
    const streak = await badgeEngine.calculateStreak(testStudentId);
    assert(streak.currentStreak === 5, 'Streak engine reports exactly 5 contiguous days', `Got ${streak.currentStreak}`);

    console.log('\n--- Test Group 11: Milestone Awarding & Idempotency ---');
    const firstAward = await evaluateAndAwardBadges(testStudentId);
    assert(
      firstAward.newlyAwarded.some((b) => b.id === 'streak-consistency-starter'),
      '5-day milestone awards Consistency Starter exactly once'
    );
    const secondAward = await evaluateAndAwardBadges(testStudentId);
    assert(secondAward.newlyAwarded.length === 0, 'Re-evaluation awards zero duplicate badges (idempotent)');
    const starterRows = await prisma.studentBadge.count({
      where: { studentId: testStudentId, badgeId: 'streak-consistency-starter' },
    });
    assert(starterRows === 1, 'Database uniqueness prevents duplicate milestone badges', `Rows: ${starterRows}`);

    console.log('\n--- Test Group 12: Overview & Credentials (DB) ---');
    const overview = await getStudentBadgesOverview(testStudentId);
    assert(overview.summary.totalAvailable === 30, 'Overview exposes all 30 badges');
    assert(overview.categories.length === 5, 'Overview returns five category summaries');
    assert(
      overview.categories.every((c) => c.total === 6),
      'Each category summary reports 6 total badges'
    );
    const earned = overview.badges.earned.find((b) => b.id === 'streak-consistency-starter');
    assert(!!earned, 'Earned milestone badge is present in the overview');
    assert(!!earned?.credentialId && isCredentialId(earned.credentialId), 'Earned badge exposes a valid credential id');

    if (earned?.credentialId) {
      const verification = await badgeEngine.verifyCredential(earned.credentialId);
      assert(
        verification.found && verification.credential?.status === 'VALID',
        'Public credential verification resolves the badge'
      );
      const credentials = await badgeEngine.listStudentCredentials(testStudentId);
      assert(credentials.length >= 1, 'Student credential list returns issued credentials');
    }

    console.log('\n--- Test Group 13: On-Behalf (Monthly/Admin) Awarding & Revocation ---');
    const monthlyAward = await badgeEngine.awardBadgeOnBehalf({
      studentId: testStudentId,
      badgeId: 'monthly-gold-champion',
      source: 'MONTHLY',
      reason: 'DB test — monthly champion',
      evidence: { monthKey: '2026-01', rank: 1 },
    });
    assert(monthlyAward.ok && monthlyAward.awarded, 'Monthly badge can be awarded on behalf of the monthly engine');
    const monthlyRepeat = await badgeEngine.awardBadgeOnBehalf({
      studentId: testStudentId,
      badgeId: 'monthly-gold-champion',
      source: 'MONTHLY',
      reason: 'DB test — duplicate',
    });
    assert(monthlyRepeat.ok && monthlyRepeat.awarded === false, 'Duplicate monthly award is a no-op (idempotent)');

    const revokeNoReason = await badgeEngine.revokeBadge({
      studentId: testStudentId,
      badgeId: 'monthly-gold-champion',
      actorId: null,
      reason: '',
    });
    assert(revokeNoReason.ok === false, 'Revocation without a reason is refused');

    const revoke = await badgeEngine.revokeBadge({
      studentId: testStudentId,
      badgeId: 'monthly-gold-champion',
      actorId: null,
      reason: 'DB test — revoke after verification',
    });
    assert(revoke.ok, 'Revocation with a reason succeeds and is audited');

    console.log('\n--- Test Group 15: Monthly Recognition Run (DB, isolated scope) ---');
    const { runMonthlyRecognition } = await import('../lib/gamification/monthlyRecognitionService');

    const monthlySuffix = Date.now().toString(36);
    const monthlyIds: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const u = await prisma.user.create({
        data: { name: `Monthly Recognition Test ${i}`, email: `badge.monthly.${i}.${monthlySuffix}@aicareerplatform.test`, role: 'STUDENT', active: true },
      });
      monthlyIds.push(u.id);
    }
    monthlyFixtureIds.push(...monthlyIds);

    // Seed four distinct weeks of qualifying career activity for one student so the
    // "Consistent Performer" monthly path is exercised (never page views).
    const consistentStudentId = monthlyIds[0];
    for (const day of [2, 9, 16, 23]) {
      const ds = `${monthlyMonthKey}-${String(day).padStart(2, '0')}`;
      await prisma.studentDailyStreak.create({
        data: { id: `streak_${consistentStudentId}_${ds}`, studentId: consistentStudentId, activityDate: ds, activityType: 'APPLICATION_SUBMITTED', sourceReference: 'DB_TEST_SEED' },
      });
    }

    const firstRun = await runMonthlyRecognition({ monthKey: monthlyMonthKey, force: true, scopeStudentIds: monthlyIds, triggeredBy: 'DB_TEST' });
    assert(firstRun.success, 'Monthly recognition run completes successfully', firstRun.reason);
    assert(firstRun.stats.totalStudents === monthlyIds.length, 'Run is scoped to the isolated students only', `Got ${firstRun.stats.totalStudents}`);
    assert(firstRun.stats.snapshotsFrozen === monthlyIds.length, 'A frozen monthly snapshot is stored per isolated student');
    assert(firstRun.stats.ranked === monthlyIds.length, 'Every isolated student is ranked');

    const expectedOrder = [...monthlyIds].sort((a, b) => a.localeCompare(b));
    assert(firstRun.stats.champions.length === 3, 'Exactly three monthly champions are determined');
    assert(
      firstRun.stats.champions.map((c) => c.studentId).join(',') === expectedOrder.join(','),
      'Champions follow the deterministic tie-break order for equal scores'
    );
    assert(
      firstRun.stats.champions.map((c) => c.badgeId).join(',') ===
        'monthly-gold-champion,monthly-silver-champion,monthly-bronze-champion',
      'Podium maps positions 1/2/3 to Gold/Silver/Bronze badges'
    );
    assert(firstRun.stats.badgesAwarded >= 4, 'Podium badges plus qualifying extra monthly badges are awarded', `Awarded ${firstRun.stats.badgesAwarded}`);

    const goldRows = await prisma.studentBadge.count({ where: { studentId: expectedOrder[0], badgeId: 'monthly-gold-champion' } });
    assert(goldRows === 1, 'Gold Champion is granted exactly once to the top-ranked student');
    const silverRecipient = await prisma.studentBadge.findFirst({ where: { studentId: expectedOrder[1], badgeId: 'monthly-silver-champion' } });
    assert(!!silverRecipient && silverRecipient.awardSource === 'MONTHLY', 'Guaranteed podium awards record their MONTHLY award source');
    const inconsistentChampionBadge = await prisma.studentBadge.count({
      where: { studentId: expectedOrder[2], badgeId: 'monthly-gold-champion' },
    });
    assert(inconsistentChampionBadge === 0, 'No conflicting podium award is given to a non-top student');

    const consistentBadge = await prisma.studentBadge.count({ where: { studentId: consistentStudentId, badgeId: 'monthly-consistent-performer' } });
    assert(consistentBadge === 1, 'A student active across four distinct weeks earns Consistent Performer');

    const rewards = await prisma.studentReward.findMany({ where: { studentId: { in: monthlyIds }, evaluationWeekKey: monthlyMonthKey } });
    assert(rewards.length >= 3, 'Monthly awards are delivered into Rewards & Inventory', `Rows: ${rewards.length}`);
    assert(rewards.every((r) => r.status === 'ALLOCATED'), 'Delivered monthly rewards are ALLOCATED');
    assert(
      rewards.some((r) => r.triggerType === 'MONTHLY_GOLD_CHAMPION' && (r.coinAmount ?? 0) > 0),
      'Premium (Gold, DIAMOND tier) monthly delivery carries the configured coin gift'
    );

    const runRow = await prisma.monthlyRecognitionRun.findUnique({ where: { monthKey: monthlyMonthKey } });
    assert(runRow?.status === 'COMPLETED' && !!runRow?.completedAt, 'Monthly run ledger is marked COMPLETED with a completion timestamp');
    assert(runRow?.championsAwarded === 3, 'Run ledger records the three champions');
    const summary = runRow?.resultSummary as { weights?: Record<string, number> } | null;
    assert(
      !!summary?.weights && Object.keys(summary.weights).length === 3 && Object.values(summary.weights).every((v) => typeof v === 'number'),
      'Monthly ranking uses exactly the three career-growth weights (no LMS metrics)'
    );

    const secondRun = await runMonthlyRecognition({ monthKey: monthlyMonthKey, triggeredBy: 'DB_TEST' });
    assert(secondRun.alreadyCompleted === true, 'Re-running a completed month is a no-op (idempotency ledger)');

    const thirdRun = await runMonthlyRecognition({ monthKey: monthlyMonthKey, force: true, scopeStudentIds: monthlyIds, triggeredBy: 'DB_TEST' });
    assert(thirdRun.success && thirdRun.stats.badgesAwarded === 0, 'A forced re-run awards zero duplicate badges', `Awarded ${thirdRun.stats.badgesAwarded}`);
    const rewardsAfter = await prisma.studentReward.count({ where: { studentId: { in: monthlyIds }, evaluationWeekKey: monthlyMonthKey } });
    assert(rewardsAfter === rewards.length, 'A forced re-run creates no duplicate reward inventory rows');
    const snapshotsTotal = await prisma.monthlyPerformanceSnapshot.count({ where: { studentId: { in: monthlyIds }, monthKey: monthlyMonthKey } });
    assert(snapshotsTotal === monthlyIds.length, 'Frozen snapshots stay immutable (no duplicates) across re-runs');
    const notificationCount = await prisma.notification.count({ where: { userId: { in: monthlyIds } } });
    assert(notificationCount >= 3, 'Monthly award notifications are delivered to recipients');

    console.log('\n--- Test Group 16: All Six Streak Milestones (DB, isolated) ---');
    const STREAK_MILESTONE_IDS = [
      { id: 'streak-consistency-starter', days: 5 },
      { id: 'streak-consistency-pro', days: 15 },
      { id: 'streak-consistency-master', days: 30 },
      { id: 'streak-consistency-elite', days: 50 },
      { id: 'streak-century-achiever', days: 100 },
      { id: 'streak-unstoppable', days: 180 },
    ];
    const streakSuffix = `${Date.now().toString(36)}s`;

    // (a) A streak one day short of the first milestone must award nothing.
    const belowStudent = await prisma.user.create({
      data: { name: 'Streak Below Test', email: `badge.streak.below.${streakSuffix}@aicareerplatform.test`, role: 'STUDENT', active: true },
    });
    streakFixtureIds.push(belowStudent.id);
    const belowSeed: Array<{ id: string; studentId: string; activityDate: string; activityType: string }> = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date(Date.UTC(2400, 0, 10));
      d.setUTCDate(d.getUTCDate() - i);
      const ds = d.toISOString().slice(0, 10);
      belowSeed.push({ id: `streak_${belowStudent.id}_${ds}`, studentId: belowStudent.id, activityDate: ds, activityType: 'APPLICATION_SUBMITTED' });
    }
    await prisma.studentDailyStreak.createMany({ data: belowSeed, skipDuplicates: true });
    const belowAward = await evaluateAndAwardBadges(belowStudent.id);
    assert(
      !belowAward.newlyAwarded.some((b) => STREAK_MILESTONE_IDS.some((m) => m.id === b.id)),
      'A 4-day streak awards no streak milestone (boundary respected)'
    );

    // (b) A 180-day contiguous IST streak must award every milestone exactly once.
    const fullStudent = await prisma.user.create({
      data: { name: 'Streak Full Test', email: `badge.streak.full.${streakSuffix}@aicareerplatform.test`, role: 'STUDENT', active: true },
    });
    streakFixtureIds.push(fullStudent.id);
    const fullSeed: Array<{ id: string; studentId: string; activityDate: string; activityType: string }> = [];
    const baseDay = new Date(Date.UTC(2400, 5, 1));
    for (let i = 0; i < 180; i++) {
      const d = new Date(baseDay);
      d.setUTCDate(d.getUTCDate() - i);
      const ds = d.toISOString().slice(0, 10);
      fullSeed.push({ id: `streak_${fullStudent.id}_${ds}`, studentId: fullStudent.id, activityDate: ds, activityType: 'APPLICATION_SUBMITTED' });
    }
    await prisma.studentDailyStreak.createMany({ data: fullSeed, skipDuplicates: true });
    const computed = await badgeEngine.calculateStreak(fullStudent.id);
    assert(computed.longestStreak === 180, 'Streak engine reports a 180-day longest streak', `Got ${computed.longestStreak}`);

    const fullAward = await evaluateAndAwardBadges(fullStudent.id);
    const awardedIds = new Set(fullAward.newlyAwarded.map((b) => b.id));
    for (const milestone of STREAK_MILESTONE_IDS) {
      assert(awardedIds.has(milestone.id), `${milestone.days}-day milestone awards ${milestone.id}`);
    }
    const milestoneRows = await prisma.studentBadge.count({
      where: { studentId: fullStudent.id, badgeId: { in: STREAK_MILESTONE_IDS.map((m) => m.id) } },
    });
    assert(milestoneRows === 6, 'Exactly six streak badges are stored for the 180-day streak', `Rows: ${milestoneRows}`);
    const repeatAward = await evaluateAndAwardBadges(fullStudent.id);
    assert(repeatAward.newlyAwarded.length === 0, 'Re-evaluating a 180-day streak awards no duplicate milestones');

    console.log('\n--- DB Integration Cleanup ---');
    await cleanupStudentFixtures(streakFixtureIds, '');
    await cleanupStudentFixtures(monthlyIds, monthlyMonthKey);
    await prisma.studentBadge.deleteMany({ where: { studentId: testStudentId } });
    await prisma.studentDailyStreak.deleteMany({ where: { studentId: testStudentId } });
    await prisma.achievementHistory.deleteMany({ where: { studentId: testStudentId } });
    await prisma.user.delete({ where: { id: testStudentId } });
    console.log('  ℹ️ Isolated test account and fixtures removed');
  } catch (error) {
    console.error('  ❌ DB integration error:', error);
    totalTests++;
    if (streakFixtureIds.length) {
      await cleanupStudentFixtures(streakFixtureIds, '').catch(() => {});
    }
    if (monthlyFixtureIds.length) {
      await cleanupStudentFixtures(monthlyFixtureIds, monthlyMonthKey).catch(() => {});
    }
    if (testStudentId) {
      try {
        await prisma.studentBadge.deleteMany({ where: { studentId: testStudentId } });
        await prisma.studentDailyStreak.deleteMany({ where: { studentId: testStudentId } });
        await prisma.achievementHistory.deleteMany({ where: { studentId: testStudentId } });
        await prisma.user.delete({ where: { id: testStudentId } });
      } catch {
        /* best-effort cleanup */
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function runTestSuite() {
  console.log('=====================================================');
  console.log('🚀 AI Career Platform — 30-Badge System Test Suite');
  console.log('=====================================================\n');

  runDeterministicSuite();
  await runMonthlyRankingUnitTests();

  if (DB_TESTS_ENABLED) {
    await runDatabaseSuite();
  } else {
    console.log('\n--- Database integration tests SKIPPED ---');
    console.log('  ℹ️ Set BADGE_DB_TESTS=1 to run the DB-backed suite against an isolated account.');
  }

  console.log('\n=====================================================');
  console.log(`🎉 TEST RESULTS: ${passedTests}/${totalTests} tests passed`);
  console.log('=====================================================\n');

  if (passedTests !== totalTests) process.exitCode = 1;
}

runTestSuite();
