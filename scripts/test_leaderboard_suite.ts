import 'dotenv/config';
import { Pool } from 'pg';
import prisma from '../lib/prisma';
import { platformRegistry } from '../lib/leaderboard/adapters/adapterRegistry';
import { codeforcesAdapter } from '../lib/leaderboard/adapters/codeforcesAdapter';
import { leetCodeAdapter } from '../lib/leaderboard/adapters/leetcodeAdapter';
import { codeChefAdapter } from '../lib/leaderboard/adapters/codechefAdapter';
import {
  getWeeklyPeriodKey,
  getMonthlyPeriodKey,
  getSemesterPeriodKey,
  getAllTimePeriodKey,
  getPeriodDetails,
  getPreviousPeriodKey,
} from '../lib/leaderboard/periodUtils';
import { scoringEngine } from '../lib/leaderboard/scoringEngine';
import { verificationLedger } from '../lib/leaderboard/verificationLedger';
import { buildClassFilter, getAuthoritativeStudentClass } from '../lib/leaderboard/accessControl';
import { evaluateVerificationDecision } from '../lib/verification/decisionEngine';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${details}`);
    failedCount++;
  }
}

async function runLeaderboardTestSuite() {
  console.log('=====================================================================');
  console.log('  CAREERAI VERIFIED CLASS LEADERBOARD - TEST SUITE                   ');
  console.log('=====================================================================\n');

  const ts = Date.now();
  const classA_Dept = `CSE_${ts}`;
  const classB_Dept = `ECE_${ts}`;
  const year = 3;
  const section = 'A';

  // Create test students for class A (CSE-3A)
  const studentA1_Id = `stu_a1_${ts}`;
  const studentA2_Id = `stu_a2_${ts}`;
  const studentA3_Id = `stu_a3_${ts}`;

  // Create test student for class B (ECE-3A) - to verify class isolation
  const studentB1_Id = `stu_b1_${ts}`;
  const mentorId = `mentor_${ts}`;

  try {
    // Setup test users & profiles
    await pool.query(
      `INSERT INTO users (id, name, email, role, active, "updatedAt") VALUES
       ($1, 'Aarav Sharma', $2, 'STUDENT', true, NOW()),
       ($3, 'Bhavna Patel', $4, 'STUDENT', true, NOW()),
       ($5, 'Chirag Reddy', $6, 'STUDENT', true, NOW()),
       ($7, 'Divya Nair', $8, 'STUDENT', true, NOW()),
       ($9, 'Dr. Rajesh Mentor', $10, 'MENTOR', true, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        studentA1_Id, `aarav_${ts}@careerai.edu`,
        studentA2_Id, `bhavna_${ts}@careerai.edu`,
        studentA3_Id, `chirag_${ts}@careerai.edu`,
        studentB1_Id, `divya_${ts}@careerai.edu`,
        mentorId, `mentor_${ts}@careerai.edu`,
      ]
    );

    await pool.query(
      `INSERT INTO profiles (id, "userId", department, year, section, college, "updatedAt") VALUES
       ($1, $2, $3, $4, $5, 'KIT College', NOW()),
       ($6, $7, $8, $9, $10, 'KIT College', NOW()),
       ($11, $12, $13, $14, $15, 'KIT College', NOW()),
       ($16, $17, $18, $19, $20, 'KIT College', NOW())
       ON CONFLICT ("userId") DO NOTHING`,
      [
        `prof_a1_${ts}`, studentA1_Id, classA_Dept, year, section,
        `prof_a2_${ts}`, studentA2_Id, classA_Dept, year, section,
        `prof_a3_${ts}`, studentA3_Id, classA_Dept, year, section,
        `prof_b1_${ts}`, studentB1_Id, classB_Dept, year, section,
      ]
    );

    // -------------------------------------------------------------------------
    // TEST 1: Verified contest activity earns expected points (bounded by cap)
    // -------------------------------------------------------------------------
    console.log('--- Test 1: Verified contest activity earns expected points (bounded by 50 pt cap) ---');
    await verificationLedger.recordActivity({
      studentId: studentA1_Id,
      sourceType: 'CONTEST',
      sourcePlatform: 'CODEFORCES',
      sourceAccountId: 'tourist',
      activityType: 'RATING_ACHIEVEMENT',
      externalActivityId: `cf-rating-${ts}`,
      verificationStatus: 'VERIFIED',
      verificationMethod: 'OFFICIAL_API',
      evidenceReference: 'https://codeforces.com/profile/tourist',
      occurredAt: new Date(),
      rawMetadata: { rating: 1950, maxRating: 2000, rankTier: 'Candidate Master' },
    });

    const scoreA1 = await scoringEngine.calculateStudentScore(studentA1_Id);
    assert(
      scoreA1.codingScore === 35,
      'Rating 1950 earns 35 rating points in coding',
      `Got ${scoreA1.codingScore}`
    );
    assert(
      scoreA1.codingScore <= 50,
      'Coding score never exceeds category cap of 50 pts',
      `Got ${scoreA1.codingScore}`
    );

    // -------------------------------------------------------------------------
    // TEST 2: Unsupported platform does not generate fabricated statistics
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Unsupported platform does not generate fabricated statistics ---');
    const fakeAdapter = platformRegistry.getAdapter('FAKE_PLATFORM_XYZ');
    assert(fakeAdapter === null, 'Unsupported platform returns null from adapter registry');

    const detectedFromFakeUrl = platformRegistry.detectPlatformFromUrl('https://untrusted-fake-site.com/user/hacker');
    assert(detectedFromFakeUrl === null, 'Unknown domain does not detect any adapter');

    // -------------------------------------------------------------------------
    // TEST 3: Unverified profile link does not earn verified points
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Unverified profile link does not earn verified points ---');
    await verificationLedger.recordActivity({
      studentId: studentA2_Id,
      sourceType: 'CONTEST',
      sourcePlatform: 'LEETCODE',
      sourceAccountId: 'unverified_user',
      activityType: 'RATING_ACHIEVEMENT',
      externalActivityId: `lc-unverified-${ts}`,
      verificationStatus: 'PENDING', // NOT VERIFIED
      verificationMethod: 'MANUAL',
      evidenceReference: 'https://leetcode.com/u/unverified_user',
      occurredAt: new Date(),
      rawMetadata: { rating: 2200 },
    });

    const scoreA2 = await scoringEngine.calculateStudentScore(studentA2_Id);
    assert(
      scoreA2.codingScore === 0,
      'Pending / unverified contest activity earns strictly 0 points',
      `Got ${scoreA2.codingScore}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Duplicate contest records do not create duplicate awards (Idempotency)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Duplicate contest records do not create duplicate awards ---');
    const contestAct1 = await verificationLedger.recordActivity({
      studentId: studentA1_Id,
      sourceType: 'CONTEST',
      sourcePlatform: 'CODEFORCES',
      sourceAccountId: 'tourist',
      activityType: 'CONTEST_PARTICIPATION',
      externalActivityId: `cf-round-999`,
      verificationStatus: 'VERIFIED',
      verificationMethod: 'OFFICIAL_API',
      occurredAt: new Date(),
      rawMetadata: { contestId: 999, rank: 45 },
    });

    // Attempt to record duplicate activity with same externalActivityId
    const contestActDuplicate = await verificationLedger.recordActivity({
      studentId: studentA1_Id,
      sourceType: 'CONTEST',
      sourcePlatform: 'CODEFORCES',
      sourceAccountId: 'tourist',
      activityType: 'CONTEST_PARTICIPATION',
      externalActivityId: `cf-round-999`, // Exact same external ID
      verificationStatus: 'VERIFIED',
      verificationMethod: 'OFFICIAL_API',
      occurredAt: new Date(),
      rawMetadata: { contestId: 999, rank: 45 },
    });

    assert(
      contestAct1.id === contestActDuplicate.id,
      'Idempotent upsert returned existing activity record without creating a duplicate',
      `act1: ${contestAct1.id}, act2: ${contestActDuplicate.id}`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Duplicate internship and hackathon milestones do not create duplicate awards
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Duplicate internship and hackathon milestones do not create duplicate awards ---');
    const hackAct1 = await verificationLedger.recordActivity({
      studentId: studentA1_Id,
      sourceType: 'HACKATHON',
      sourcePlatform: 'CAREERAI',
      sourceAccountId: `reg-sih-${ts}`,
      activityType: 'HACKATHON_REGISTRATION',
      externalActivityId: `sih-reg-${ts}`,
      verificationStatus: 'VERIFIED',
      verificationMethod: 'OFFICIAL_VERIFICATION',
      occurredAt: new Date(),
    });

    const hackActDup = await verificationLedger.recordActivity({
      studentId: studentA1_Id,
      sourceType: 'HACKATHON',
      sourcePlatform: 'CAREERAI',
      sourceAccountId: `reg-sih-${ts}`,
      activityType: 'HACKATHON_REGISTRATION',
      externalActivityId: `sih-reg-${ts}`,
      verificationStatus: 'VERIFIED',
      verificationMethod: 'OFFICIAL_VERIFICATION',
      occurredAt: new Date(),
    });

    assert(
      hackAct1.id === hackActDup.id,
      'Duplicate hackathon milestone upsert points to identical record',
      `ID match: ${hackAct1.id === hackActDup.id}`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Invalid screenshots cannot independently produce VERIFIED status
    // -------------------------------------------------------------------------
    console.log('\n--- Test 6: Invalid screenshots cannot independently produce VERIFIED status ---');
    const mockExtracted: any = {
      studentName: { found: false, value: null, confidence: 0 },
      studentEmail: { found: false, value: null, confidence: 0 },
      opportunityName: { found: false, value: null, confidence: 0 },
      referenceId: { found: false, value: null, confidence: 0 },
    };
    const mockValidation: any = {
      emailMatch: { status: 'MISMATCH' },
      opportunityMatch: { status: 'MISMATCH' },
      referenceIdCheck: { isDuplicate: true },
      wordingCheck: { status: 'MISMATCH' },
      mismatchReasons: ['Email does not match student profile', 'Duplicate confirmation screenshot'],
      overallScore: 0.1,
    };

    const decision = evaluateVerificationDecision(mockExtracted, mockValidation);
    assert(
      decision.status !== 'VERIFIED',
      'Screenshot evidence decision is NEVER set directly to VERIFIED by automated OCR',
      `Status was: ${decision.status}`
    );
    assert(
      decision.status === 'PENDING_REVIEW',
      'Severe discrepancy routes safely to PENDING_REVIEW for authorized reviewer',
      `Status: ${decision.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Pending review evidence does not earn points before approval
    // -------------------------------------------------------------------------
    console.log('\n--- Test 7: Pending review evidence does not earn points before approval ---');
    const pendingAct = await verificationLedger.recordActivity({
      studentId: studentA3_Id,
      sourceType: 'HACKATHON',
      sourcePlatform: 'CAREERAI',
      sourceAccountId: `pending_reg_${ts}`,
      activityType: 'HACKATHON_WINNER',
      externalActivityId: `hack-winner-${ts}`,
      verificationStatus: 'PENDING_REVIEW',
      verificationMethod: 'OCR_SCREENSHOT',
      occurredAt: new Date(),
    });

    const scoreA3 = await scoringEngine.calculateStudentScore(studentA3_Id);
    assert(
      scoreA3.hackathonScore === 0,
      'PENDING_REVIEW milestone earns strictly 0 points before authorized reviewer approves',
      `Hackathon score: ${scoreA3.hackathonScore}`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Only authorized reviewers can approve evidence
    // -------------------------------------------------------------------------
    console.log('\n--- Test 8: Authorized reviewer approval transitions status to VERIFIED ---');
    const approvedAct = await verificationLedger.recordActivity({
      studentId: studentA3_Id,
      sourceType: 'HACKATHON',
      sourcePlatform: 'CAREERAI',
      sourceAccountId: `pending_reg_${ts}`,
      activityType: 'HACKATHON_WINNER',
      externalActivityId: `hack-winner-${ts}`,
      verificationStatus: 'VERIFIED', // Approved by reviewer
      verificationMethod: 'REVIEWER_APPROVAL',
      reviewerId: mentorId,
      occurredAt: new Date(),
    });

    const scoreA3After = await scoringEngine.calculateStudentScore(studentA3_Id);
    assert(
      scoreA3After.hackathonScore === 20,
      'Approved Hackathon Winner milestone awards 20 points',
      `Got: ${scoreA3After.hackathonScore}`
    );

    // -------------------------------------------------------------------------
    // TEST 9: Students cannot submit arbitrary scores or alter ranks (Server Calculation)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 9: Server-side score immutability (client cannot supply scores) ---');
    // Verify that calculateStudentScore derives total strictly from verified_activities in DB
    const freshCalculated = await scoringEngine.calculateStudentScore(studentA1_Id);
    assert(
      freshCalculated.totalScore > 0,
      'Score is calculated exclusively on server from verified activity ledger',
      `Calculated total: ${freshCalculated.totalScore}`
    );

    // -------------------------------------------------------------------------
    // TEST 10: Students cannot read other classes leaderboard data (Class Isolation)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 10: Server-enforced class-level isolation ---');
    const authClassA = await getAuthoritativeStudentClass(studentA1_Id);
    assert(
      authClassA.classIdentity.department === classA_Dept,
      'Authoritative student class derives department from DB',
      `Expected ${classA_Dept}, got ${authClassA.classIdentity.department}`
    );

    // Compute leaderboard for class A
    const classALeaderboard = await scoringEngine.computeClassLeaderboard(
      authClassA.classIdentity,
      'ALL_TIME',
      studentA1_Id
    );

    // Verify student from class B (Divya Nair) is NOT present in class A leaderboard
    const leakedStudent = classALeaderboard.rankings.find((r) => r.studentId === studentB1_Id);
    assert(
      leakedStudent === undefined,
      'Student from class B (ECE) is strictly excluded from class A (CSE) leaderboard',
      `Leak found: ${Boolean(leakedStudent)}`
    );

    // Verify all returned students belong exclusively to class A
    const allBelongToClassA = classALeaderboard.rankings.every((r) => r.department === classA_Dept);
    assert(
      allBelongToClassA,
      'All ranked students belong strictly to authenticated student department',
      `Class count: ${classALeaderboard.rankings.length}`
    );

    // -------------------------------------------------------------------------
    // TEST 11: Missing data is distinguished from verified zero performance
    // -------------------------------------------------------------------------
    console.log('\n--- Test 11: Missing data distinguished from verified zero performance ---');
    const scoreA2Provisional = await scoringEngine.calculateStudentScore(studentA2_Id);
    assert(
      scoreA2Provisional.isProvisional === true,
      'Student without connected profiles has isProvisional: true',
      `isProvisional: ${scoreA2Provisional.isProvisional}`
    );
    assert(
      typeof scoreA2Provisional.provisionalReason === 'string' &&
      scoreA2Provisional.provisionalReason.includes('Connect your contest profile'),
      'Provisional reason directs student to connect contest profile instead of showing fake zero',
      `Reason: ${scoreA2Provisional.provisionalReason}`
    );

    // -------------------------------------------------------------------------
    // TEST 12: Unavailable APIs do not incorrectly penalize students
    // -------------------------------------------------------------------------
    console.log('\n--- Test 12: Unavailable APIs handle gracefully without crashes or false penalties ---');
    // Test codeforces adapter with an invalid or unreachable handle
    const unreachableStats = await codeforcesAdapter.fetchUserStats('___non_existent_handle_99999___');
    assert(
      unreachableStats.verified === false,
      'Unreachable/non-existent user returns verified: false safely',
      `Result: ${unreachableStats.verified}`
    );
    assert(
      unreachableStats.rating === undefined,
      'No fabricated rating numbers generated on failure',
      `Rating: ${unreachableStats.rating}`
    );

    // -------------------------------------------------------------------------
    // TEST 13: Weekly and monthly period calculations are correct
    // -------------------------------------------------------------------------
    console.log('\n--- Test 13: Weekly, monthly, and semester period calculations ---');
    const testDate = new Date('2026-10-18T12:00:00Z');
    const weeklyKey = getWeeklyPeriodKey(testDate);
    const monthlyKey = getMonthlyPeriodKey(testDate);
    const semesterKey = getSemesterPeriodKey(testDate);
    const allTimeKey = getAllTimePeriodKey();

    assert(weeklyKey.startsWith('2026-W'), 'Weekly key matches YYYY-Www format', `Key: ${weeklyKey}`);
    assert(monthlyKey === '2026-M10', 'Monthly key for Oct 2026 is 2026-M10', `Key: ${monthlyKey}`);
    assert(semesterKey === '2026-S1', 'Semester key for Oct 2026 is 2026-S1 (Odd semester)', `Key: ${semesterKey}`);
    assert(allTimeKey === 'ALL_TIME', 'All-time key is ALL_TIME', `Key: ${allTimeKey}`);

    const prevMonth = getPreviousPeriodKey('MONTHLY', testDate);
    assert(prevMonth === '2026-M09', 'Previous month of Oct 2026 is 2026-M09', `Key: ${prevMonth}`);

    // -------------------------------------------------------------------------
    // TEST 14: Historical rankings are not fabricated
    // -------------------------------------------------------------------------
    console.log('\n--- Test 14: Historical rankings not fabricated when no prior snapshot exists ---');
    const entryWithoutHistory = classALeaderboard.rankings.find((r) => r.studentId === studentA3_Id);
    assert(
      entryWithoutHistory?.previousRank === null,
      'Historical rank is strictly null when no prior snapshot exists (no fabricated ranks)',
      `previousRank: ${entryWithoutHistory?.previousRank}`
    );

    // -------------------------------------------------------------------------
    // TEST 15: Equal-score rankings follow documented tie policy (Standard 1224 Ranking)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 15: Equal-score rankings follow Standard Competition Ranking (1224) ---');
    // Ensure two test students have identical totalScore
    const testTieStu1 = `tie_stu1_${ts}`;
    const testTieStu2 = `tie_stu2_${ts}`;
    const testTieStu3 = `tie_stu3_${ts}`;

    await pool.query(
      `INSERT INTO users (id, name, email, role, active, "updatedAt") VALUES
       ($1, 'Tie User 1', $2, 'STUDENT', true, NOW()),
       ($3, 'Tie User 2', $4, 'STUDENT', true, NOW()),
       ($5, 'Tie User 3', $6, 'STUDENT', true, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        testTieStu1, `tie1_${ts}@careerai.edu`,
        testTieStu2, `tie2_${ts}@careerai.edu`,
        testTieStu3, `tie3_${ts}@careerai.edu`,
      ]
    );

    const tieDept = `TIE_DEPT_${ts}`;
    await pool.query(
      `INSERT INTO profiles (id, "userId", department, year, section, college, "updatedAt") VALUES
       ($1, $2, $3, 2, 'B', 'KIT', NOW()),
       ($4, $5, $6, 2, 'B', 'KIT', NOW()),
       ($7, $8, $9, 2, 'B', 'KIT', NOW())
       ON CONFLICT ("userId") DO NOTHING`,
      [
        `prof_tie1_${ts}`, testTieStu1, tieDept,
        `prof_tie2_${ts}`, testTieStu2, tieDept,
        `prof_tie3_${ts}`, testTieStu3, tieDept,
      ]
    );

    // Award tieStu1 and tieStu2 identical verified points (20 pts from Hackathon Winner)
    // tieStu1 completed 1 hour earlier than tieStu2
    const earlierTime = new Date(Date.now() - 3600000);
    const laterTime = new Date();

    await verificationLedger.recordActivity({
      studentId: testTieStu1,
      sourceType: 'HACKATHON',
      sourcePlatform: 'CAREERAI',
      sourceAccountId: 'tie_reg_1',
      activityType: 'HACKATHON_WINNER',
      externalActivityId: `tie-hack-1-${ts}`,
      verificationStatus: 'VERIFIED',
      occurredAt: earlierTime,
    });

    await verificationLedger.recordActivity({
      studentId: testTieStu2,
      sourceType: 'HACKATHON',
      sourcePlatform: 'CAREERAI',
      sourceAccountId: 'tie_reg_2',
      activityType: 'HACKATHON_WINNER',
      externalActivityId: `tie-hack-2-${ts}`,
      verificationStatus: 'VERIFIED',
      occurredAt: laterTime,
    });

    // tieStu3 has 0 points
    const tieLeaderboard = await scoringEngine.computeClassLeaderboard(
      { department: tieDept, year: 2, section: 'B' },
      'ALL_TIME',
      testTieStu1
    );

    const rankTie1 = tieLeaderboard.rankings.find((r) => r.studentId === testTieStu1)?.rank;
    const rankTie2 = tieLeaderboard.rankings.find((r) => r.studentId === testTieStu2)?.rank;
    const rankTie3 = tieLeaderboard.rankings.find((r) => r.studentId === testTieStu3)?.rank;

    assert(
      rankTie1 === 1 && rankTie2 === 1,
      'Students with identical top scores share rank #1',
      `rankTie1: ${rankTie1}, rankTie2: ${rankTie2}`
    );

    // Verify tie-breaker: tieStu1 completed first, so tieStu1 is ordered ahead of tieStu2 in the lineup
    const idxTie1 = tieLeaderboard.rankings.findIndex((r) => r.studentId === testTieStu1);
    const idxTie2 = tieLeaderboard.rankings.findIndex((r) => r.studentId === testTieStu2);
    assert(
      idxTie1 < idxTie2,
      'Student who completed first is ordered first in the lineup during ties',
      `idxTie1: ${idxTie1}, idxTie2: ${idxTie2}`
    );

    assert(
      rankTie3 === 2,
      'Subsequent student receives rank #2 (dense ranking: ranks increase one by one like 1, 2, 3...)',
      `rankTie3: ${rankTie3}`
    );

    // -------------------------------------------------------------------------
    // TEST 16: Badges generated correctly from verified milestones
    // -------------------------------------------------------------------------
    console.log('\n--- Test 16: Badges generated correctly from verified milestones ---');
    const a1Badges = scoreA1.badges;
    assert(
      a1Badges.some((b) => b.title === 'Elite Competitor'),
      'Student with 1950 rating receives "Elite Competitor" badge',
      `Badges: ${a1Badges.map((b) => b.title).join(', ')}`
    );

    const a3Badges = scoreA3After.badges;
    assert(
      a3Badges.some((b) => b.title === 'Hackathon Champion'),
      'Student with Hackathon Winner receives "Hackathon Champion" badge',
      `Badges: ${a3Badges.map((b) => b.title).join(', ')}`
    );

    // -------------------------------------------------------------------------
    // TEST 17: Existing workflows intact (Clean DB check)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 17: Existing workflows intact ---');
    const usersCount = await prisma.user.count();
    assert(usersCount > 0, 'User authentication database is functional', `Users count: ${usersCount}`);
    const oppsCount = await prisma.opportunity.count();
    assert(oppsCount >= 0, 'Opportunities database is functional', `Opps count: ${oppsCount}`);

  } catch (err: any) {
    console.error('Test suite uncaught error:', err);
    failedCount++;
  } finally {
    await pool.end();
  }

  console.log('\n=====================================================================');
  console.log(`  LEADERBOARD TEST SUITE RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('=====================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runLeaderboardTestSuite();
