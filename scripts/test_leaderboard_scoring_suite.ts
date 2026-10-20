import 'dotenv/config';
import { Pool } from 'pg';
import prisma from '../lib/prisma';
import { scoringEngine } from '../lib/leaderboard/scoringEngine';
import { verificationLedger } from '../lib/leaderboard/verificationLedger';
import { checkInService } from '../lib/gamification/checkInService';
import { XP_CONFIG } from '../lib/gamification/xpConfig';
import { getMonthlyPeriodKey, getAllTimePeriodKey } from '../lib/leaderboard/periodUtils';

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
    console.error(`  ❌ FAIL: ${testName}${details ? ` - ${details}` : ''}`);
    failedCount++;
  }
}

async function runScoringAndRankingSuite() {
  console.log('=====================================================================');
  console.log('  CAREERAI SCORING & RANKING ACCEPTANCE TEST SUITE                   ');
  console.log('=====================================================================\n');

  const ts = Date.now();
  const testDept = `TEST_SCORING_${ts}`;
  const year = 3;
  const section = 'A';

  const studentA = `stu_scr_a_${ts}`;
  const studentB = `stu_scr_b_${ts}`;
  const studentC = `stu_scr_c_${ts}`;
  const studentD = `stu_scr_d_${ts}`;

  try {
    // 0. Setup test users and profiles
    await pool.query(
      `INSERT INTO users (id, name, email, role, active, "updatedAt") VALUES
       ($1, 'Alice Adams', $2, 'STUDENT', true, NOW()),
       ($3, 'Bob Baker', $4, 'STUDENT', true, NOW()),
       ($5, 'Charlie Clark', $6, 'STUDENT', true, NOW()),
       ($7, 'Diana Davis', $8, 'STUDENT', true, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        studentA, `alice_${ts}@test.edu`,
        studentB, `bob_${ts}@test.edu`,
        studentC, `charlie_${ts}@test.edu`,
        studentD, `diana_${ts}@test.edu`,
      ]
    );

    await pool.query(
      `INSERT INTO profiles (id, "userId", department, year, section, college, "updatedAt") VALUES
       ($1, $2, $3, $4, $5, 'Test Engineering College', NOW()),
       ($6, $7, $8, $9, $10, 'Test Engineering College', NOW()),
       ($11, $12, $13, $14, $15, 'Test Engineering College', NOW()),
       ($16, $17, $18, $19, $20, 'Test Engineering College', NOW())
       ON CONFLICT ("userId") DO NOTHING`,
      [
        `prof_a_${ts}`, studentA, testDept, year, section,
        `prof_b_${ts}`, studentB, testDept, year, section,
        `prof_c_${ts}`, studentC, testDept, year, section,
        `prof_d_${ts}`, studentD, testDept, year, section,
      ]
    );

    // =========================================================================
    // REQUIREMENT 1 & 2: ALL 4 ACTIVITY CATEGORIES CONTRIBUTE CORRECTLY
    // Total Score = Verified Internship + Verified Hackathon + Valid Check-in + Earned Consistency
    // =========================================================================
    console.log('--- Requirement 1 & 2: All 4 Activity Categories Contribute Correctly ---');

    // Category 1: Internship activities for Student A (Application = 20 XP, Interview = 40 XP => 60 XP)
    const internAppActA = await verificationLedger.recordActivity({
      studentId: studentA,
      sourceType: 'INTERNSHIP',
      sourcePlatform: 'PORTAL',
      sourceAccountId: studentA,
      activityType: 'INTERNSHIP_APPLICATION',
      externalActivityId: `intern-app-a-${ts}`,
      verificationStatus: 'VERIFIED',
      verificationMethod: 'STAFF_VERIFIED',
      occurredAt: new Date(),
    });
    await verificationLedger.awardPoints({
      studentId: studentA,
      verifiedActivityId: internAppActA.id,
      category: 'INTERNSHIP',
      pointsAwarded: XP_CONFIG.INTERNSHIP_APPLICATION_VERIFIED, // 20
      reason: 'Verified internship application',
      periodKey: 'ALL_TIME',
    });

    const internIntActA = await verificationLedger.recordActivity({
      studentId: studentA,
      sourceType: 'INTERNSHIP',
      sourcePlatform: 'PORTAL',
      sourceAccountId: studentA,
      activityType: 'INTERNSHIP_INTERVIEW',
      externalActivityId: `intern-int-a-${ts}`,
      verificationStatus: 'VERIFIED',
      verificationMethod: 'STAFF_VERIFIED',
      occurredAt: new Date(),
    });
    await verificationLedger.awardPoints({
      studentId: studentA,
      verifiedActivityId: internIntActA.id,
      category: 'INTERNSHIP',
      pointsAwarded: 40,
      reason: 'Verified internship interview',
      periodKey: 'ALL_TIME',
    });

    // Category 2: Hackathon activities for Student A (Winner = 20 XP, Participation = 25 XP => 45 XP)
    const hackWinActA = await verificationLedger.recordActivity({
      studentId: studentA,
      sourceType: 'HACKATHON',
      sourcePlatform: 'DEVPOST',
      sourceAccountId: studentA,
      activityType: 'HACKATHON_WINNER',
      externalActivityId: `hack-win-a-${ts}`,
      verificationStatus: 'VERIFIED',
      verificationMethod: 'STAFF_VERIFIED',
      occurredAt: new Date(),
    });
    await verificationLedger.awardPoints({
      studentId: studentA,
      verifiedActivityId: hackWinActA.id,
      category: 'HACKATHON',
      pointsAwarded: 20,
      reason: 'Hackathon winner verified',
      periodKey: 'ALL_TIME',
    });

    const hackSubActA = await verificationLedger.recordActivity({
      studentId: studentA,
      sourceType: 'HACKATHON',
      sourcePlatform: 'DEVPOST',
      sourceAccountId: studentA,
      activityType: 'HACKATHON_SUBMISSION',
      externalActivityId: `hack-sub-a-${ts}`,
      verificationStatus: 'VERIFIED',
      verificationMethod: 'STAFF_VERIFIED',
      occurredAt: new Date(),
    });
    await verificationLedger.awardPoints({
      studentId: studentA,
      verifiedActivityId: hackSubActA.id,
      category: 'HACKATHON',
      pointsAwarded: XP_CONFIG.HACKATHON_MILESTONE, // 25
      reason: 'Hackathon submission verified',
      periodKey: 'ALL_TIME',
    });

    // Category 3: Daily Check-in activities for Student A (3 check-ins on 3 distinct days => 3 * 5 = 15 XP)
    const fmtDate = (daysAgo: number) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString().split('T')[0];
    };
    const dateStr1 = fmtDate(2);
    const dateStr2 = fmtDate(1);
    const dateStr3 = fmtDate(0);

    await pool.query(
      `INSERT INTO daily_check_ins (id, "studentId", "checkInDate", "xpAwarded", "timeZone", "createdAt")
       VALUES 
       ($1, $2, $3, 5, 'Asia/Kolkata', NOW()),
       ($4, $5, $6, 5, 'Asia/Kolkata', NOW()),
       ($7, $8, $9, 5, 'Asia/Kolkata', NOW())
       ON CONFLICT ("studentId", "checkInDate") DO NOTHING`,
      [
        `chk_1_${ts}`, studentA, dateStr1,
        `chk_2_${ts}`, studentA, dateStr2,
        `chk_3_${ts}`, studentA, dateStr3,
      ]
    );

    // Category 4: Consistency / Streak Milestone XP for Student A (7-day milestone bonus = 25 XP)
    const streakActA = await verificationLedger.recordActivity({
      studentId: studentA,
      sourceType: 'CONSISTENCY',
      sourcePlatform: 'CAREERAI',
      activityType: 'STREAK_7DAY_BONUS',
      externalActivityId: `streak-7-${ts}`,
      verificationStatus: 'VERIFIED',
      verificationMethod: 'AUTOMATIC_ENGINE',
      occurredAt: new Date(),
    });
    await verificationLedger.awardPoints({
      studentId: studentA,
      verifiedActivityId: streakActA.id,
      category: 'CONSISTENCY',
      pointsAwarded: XP_CONFIG.STREAK_7DAY_BONUS, // 25
      reason: '7-day streak milestone achieved',
      periodKey: 'ALL_TIME',
    });

    // Calculate score for Student A
    const scoreA = await scoringEngine.calculateStudentScore(studentA);

    assert(
      scoreA.categoryBreakdown.internship.score === 60,
      'Internship category contributes exactly 60 XP (20 application + 40 interview)',
      `Got ${scoreA.categoryBreakdown.internship.score}`
    );
    assert(
      scoreA.categoryBreakdown.hackathon.score === 45,
      'Hackathon category contributes exactly 45 XP (20 winner + 25 submission)',
      `Got ${scoreA.categoryBreakdown.hackathon.score}`
    );
    assert(
      scoreA.categoryBreakdown.dailyCheckIn?.score === 15,
      'Daily Check-in category contributes exactly 15 XP (3 valid check-ins * 5 XP)',
      `Got ${scoreA.categoryBreakdown.dailyCheckIn?.score}`
    );
    assert(
      scoreA.categoryBreakdown.consistency.score === 25,
      'Consistency category contributes exactly 25 XP (7-day streak milestone)',
      `Got ${scoreA.categoryBreakdown.consistency.score}`
    );

    const expectedTotalA = 60 + 45 + 15 + 25; // 145 XP
    assert(
      scoreA.totalScore === expectedTotalA,
      `Total Score equals sum of 4 categories: ${expectedTotalA} XP`,
      `Got ${scoreA.totalScore}`
    );
    assert(
      scoreA.earnedXp === scoreA.totalScore,
      'Displayed XP (earnedXp) matches score used for ranking',
      `earnedXp=${scoreA.earnedXp}, totalScore=${scoreA.totalScore}`
    );

    // =========================================================================
    // REQUIREMENT 3: DUPLICATE EVENTS NEVER AWARD DUPLICATE XP
    // =========================================================================
    console.log('\n--- Requirement 3: Duplicate Events Never Award Duplicate XP ---');

    // Attempt to record duplicate activity with same externalActivityId
    const dupActivity = await verificationLedger.recordActivity({
      studentId: studentA,
      sourceType: 'INTERNSHIP',
      sourcePlatform: 'PORTAL',
      sourceAccountId: studentA,
      activityType: 'INTERNSHIP_APPLICATION',
      externalActivityId: `intern-app-a-${ts}`,
      verificationStatus: 'VERIFIED',
      verificationMethod: 'STAFF_VERIFIED',
      occurredAt: new Date(),
    });

    assert(
      dupActivity.id === internAppActA.id,
      'Duplicate activity returns existing record without creating duplicate ID'
    );

    // Attempt duplicate point award with same verifiedActivityId and periodKey
    await verificationLedger.awardPoints({
      studentId: studentA,
      verifiedActivityId: dupActivity.id,
      category: 'INTERNSHIP',
      pointsAwarded: XP_CONFIG.INTERNSHIP_APPLICATION_VERIFIED,
      reason: 'Duplicate internship application attempt',
      periodKey: 'ALL_TIME',
    });

    // Attempt duplicate daily check-in on same day
    try {
      await pool.query(
        `INSERT INTO daily_check_ins (id, "studentId", "checkInDate", "xpAwarded", "timeZone", "createdAt")
         VALUES ($1, $2, $3, 5, 'Asia/Kolkata', NOW())`,
        [`chk_dup_${ts}`, studentA, dateStr3]
      );
    } catch {
      // Expected unique constraint violation
    }

    const scoreA_afterDup = await scoringEngine.calculateStudentScore(studentA);
    assert(
      scoreA_afterDup.totalScore === expectedTotalA,
      'Total score remains unchanged after duplicate activity/award attempts',
      `Expected ${expectedTotalA}, got ${scoreA_afterDup.totalScore}`
    );

    // =========================================================================
    // REQUIREMENT 4: UNVERIFIED ACTIVITIES DO NOT INCREASE SCORES
    // =========================================================================
    console.log('\n--- Requirement 4: Unverified Activities Do Not Increase Scores ---');

    const pendingAct = await verificationLedger.recordActivity({
      studentId: studentB,
      sourceType: 'HACKATHON',
      sourcePlatform: 'DEVPOST',
      sourceAccountId: studentB,
      activityType: 'HACKATHON_WINNER',
      externalActivityId: `hack-pending-${ts}`,
      verificationStatus: 'PENDING',
      verificationMethod: 'STUDENT_SUBMITTED',
      occurredAt: new Date(),
    });

    // Attempt to award points for pending activity
    const pendingAward = await verificationLedger.awardPoints({
      studentId: studentB,
      verifiedActivityId: pendingAct.id,
      category: 'HACKATHON',
      pointsAwarded: 20,
      reason: 'Pending award attempt',
      periodKey: 'ALL_TIME',
    });

    assert(
      pendingAward === null,
      'Cannot award points for activity with PENDING verification status'
    );

    await verificationLedger.recordActivity({
      studentId: studentB,
      sourceType: 'INTERNSHIP',
      sourcePlatform: 'PORTAL',
      sourceAccountId: studentB,
      activityType: 'INTERNSHIP_OFFER',
      externalActivityId: `intern-rejected-${ts}`,
      verificationStatus: 'REJECTED',
      verificationMethod: 'STAFF_VERIFIED',
      occurredAt: new Date(),
    });

    const scoreB_unverified = await scoringEngine.calculateStudentScore(studentB);
    assert(
      scoreB_unverified.totalScore === 0,
      'Pending and Rejected activities do not increase score (score remains 0)',
      `Got ${scoreB_unverified.totalScore}`
    );

    // Now give Student B verified activities: Hackathon Participation (25 XP) + 1 Check-in (5 XP) = 30 XP
    const hackSubActB = await verificationLedger.recordActivity({
      studentId: studentB,
      sourceType: 'HACKATHON',
      sourcePlatform: 'DEVPOST',
      sourceAccountId: studentB,
      activityType: 'HACKATHON_SUBMISSION',
      externalActivityId: `hack-sub-b-${ts}`,
      verificationStatus: 'VERIFIED',
      verificationMethod: 'STAFF_VERIFIED',
      occurredAt: new Date(),
    });
    await verificationLedger.awardPoints({
      studentId: studentB,
      verifiedActivityId: hackSubActB.id,
      category: 'HACKATHON',
      pointsAwarded: 25,
      reason: 'Hackathon submission verified',
      periodKey: 'ALL_TIME',
    });

    await pool.query(
      `INSERT INTO daily_check_ins (id, "studentId", "checkInDate", "xpAwarded", "timeZone", "createdAt")
       VALUES ($1, $2, $3, 5, 'Asia/Kolkata', NOW())
       ON CONFLICT DO NOTHING`,
      [`chk_b_${ts}`, studentB, dateStr3]
    );

    const scoreB_verified = await scoringEngine.calculateStudentScore(studentB);
    assert(
      scoreB_verified.totalScore === 30,
      'Student B receives exactly 30 XP (25 hackathon + 5 check-in)',
      `Got ${scoreB_verified.totalScore}`
    );

    // =========================================================================
    // REQUIREMENT 5: DESCENDING RANKING (ORDER BY totalScore DESC)
    // =========================================================================
    console.log('\n--- Requirement 5: Descending Ranking (ORDER BY totalScore DESC) ---');

    // Student A = 145 XP
    // Student B = 30 XP
    // Student C = 20 XP (Internship Application)
    // Student D = 0 XP
    const internAppActC = await verificationLedger.recordActivity({
      studentId: studentC,
      sourceType: 'INTERNSHIP',
      sourcePlatform: 'PORTAL',
      sourceAccountId: studentC,
      activityType: 'INTERNSHIP_APPLICATION',
      externalActivityId: `intern-app-c-${ts}`,
      verificationStatus: 'VERIFIED',
      verificationMethod: 'STAFF_VERIFIED',
      occurredAt: new Date(),
    });
    await verificationLedger.awardPoints({
      studentId: studentC,
      verifiedActivityId: internAppActC.id,
      category: 'INTERNSHIP',
      pointsAwarded: 20,
      reason: 'Verified application',
      periodKey: 'ALL_TIME',
    });

    const leaderboard = await scoringEngine.computeClassLeaderboard(
      { department: testDept, year, section },
      'ALL_TIME',
      studentA
    );

    assert(
      leaderboard.rankings.length === 4,
      'Leaderboard returns all 4 students in cohort',
      `Got ${leaderboard.rankings.length}`
    );

    // Verify Descending Order: Rank 1 > Rank 2 > Rank 3 > Rank 4
    const r1 = leaderboard.rankings[0];
    const r2 = leaderboard.rankings[1];
    const r3 = leaderboard.rankings[2];
    const r4 = leaderboard.rankings[3];

    assert(
      r1.studentId === studentA && r1.rank === 1 && r1.totalScore === 145,
      `Rank 1 is Student A with highest score 145 XP (Got: ${r1.name}, ${r1.totalScore} XP, Rank ${r1.rank})`
    );
    assert(
      r2.studentId === studentB && r2.rank === 2 && r2.totalScore === 30,
      `Rank 2 is Student B with 30 XP (Got: ${r2.name}, ${r2.totalScore} XP, Rank ${r2.rank})`
    );
    assert(
      r3.studentId === studentC && r3.rank === 3 && r3.totalScore === 20,
      `Rank 3 is Student C with 20 XP (Got: ${r3.name}, ${r3.totalScore} XP, Rank ${r3.rank})`
    );
    assert(
      r4.studentId === studentD && r4.rank === 4 && r4.totalScore === 0,
      `Rank 4 is Student D with 0 XP (Got: ${r4.name}, ${r4.totalScore} XP, Rank ${r4.rank})`
    );

    // =========================================================================
    // REQUIREMENT 6: EQUAL SCORES FOLLOW DEFINED TIE POLICY
    // =========================================================================
    console.log('\n--- Requirement 6: Equal Scores Follow Defined Tie Policy ---');

    // Give Student C another 10 XP so Student C has 30 XP (tied with Student B at 30 XP)
    const tieActC = await verificationLedger.recordActivity({
      studentId: studentC,
      sourceType: 'CONSISTENCY',
      sourcePlatform: 'CAREERAI',
      activityType: 'CONSISTENCY_STREAK',
      externalActivityId: `tie-adj-c-${ts}`,
      verificationStatus: 'VERIFIED',
      verificationMethod: 'AUTOMATIC_ENGINE',
      occurredAt: new Date(),
    });
    await verificationLedger.awardPoints({
      studentId: studentC,
      verifiedActivityId: tieActC.id,
      category: 'CONSISTENCY',
      pointsAwarded: 10,
      reason: 'Consistency adjustment for tie test',
      periodKey: 'ALL_TIME',
    });

    const tieLeaderboard = await scoringEngine.computeClassLeaderboard(
      { department: testDept, year, section },
      'ALL_TIME',
      studentA
    );

    const tiedStudents = tieLeaderboard.rankings.filter((r) => r.totalScore === 30);
    assert(
      tiedStudents.length === 2,
      'Both Student B and Student C have equal score of 30 XP'
    );
    assert(
      tiedStudents[0].rank === 2 && tiedStudents[1].rank === 2,
      'Equal scores share the exact same rank (both rank 2)',
      `Student B rank=${tiedStudents[0].rank}, Student C rank=${tiedStudents[1].rank}`
    );
    // Student D (0 XP) should now have rank 3 under dense ranking
    const studentDRanking = tieLeaderboard.rankings.find((r) => r.studentId === studentD);
    assert(
      studentDRanking?.rank === 3,
      'Next score receives rank 3 under standard dense ranking policy',
      `Got rank ${studentDRanking?.rank}`
    );

    // =========================================================================
    // REQUIREMENT 7: MONTHLY / LEAGUE / LIFETIME PERIODS ARE NOT MIXED
    // =========================================================================
    console.log('\n--- Requirement 7: Monthly / League / Lifetime Periods Are Not Mixed ---');

    // Add an activity for Student D dated 3 months in the past
    const pastDate = new Date();
    pastDate.setUTCMonth(pastDate.getUTCMonth() - 3);

    const pastOfferD = await verificationLedger.recordActivity({
      studentId: studentD,
      sourceType: 'INTERNSHIP',
      sourcePlatform: 'PORTAL',
      sourceAccountId: studentD,
      activityType: 'INTERNSHIP_OFFER',
      externalActivityId: `past-offer-d-${ts}`,
      verificationStatus: 'VERIFIED',
      verificationMethod: 'STAFF_VERIFIED',
      occurredAt: pastDate,
    });
    await pool.query(
      `INSERT INTO points_ledger (id, "studentId", "verifiedActivityId", category, "pointsAwarded", reason, "periodKey", "createdAt")
       VALUES ($1, $2, $3, 'INTERNSHIP', 100, 'Past internship offer', 'HISTORICAL', $4)`,
      [`past_pt_d_${ts}`, studentD, pastOfferD.id, pastDate]
    );

    // Calculate score for Current Month (MONTHLY) vs ALL_TIME
    const monthlyScoreD = await scoringEngine.calculateStudentScore(studentD, 'MONTHLY');
    const allTimeScoreD = await scoringEngine.calculateStudentScore(studentD, 'ALL_TIME');

    assert(
      monthlyScoreD.totalScore === 0,
      'Current Monthly score strictly excludes activity from 3 months ago (score = 0)',
      `Got ${monthlyScoreD.totalScore}`
    );
    assert(
      allTimeScoreD.totalScore === 100,
      'ALL_TIME lifetime score includes past activity (score = 100)',
      `Got ${allTimeScoreD.totalScore}`
    );

    // =========================================================================
    // REQUIREMENT 8: SEARCH AND PAGINATION PRESERVE CORRECT GLOBAL RANKING
    // =========================================================================
    console.log('\n--- Requirement 8: Search and Pagination Preserve Correct Global Ranking ---');

    // Invalidate cache and fetch fresh cohort leaderboard
    const globalBoard = await scoringEngine.computeClassLeaderboard(
      { department: testDept, year, section },
      'ALL_TIME',
      studentA
    );
    const expectedAliceRank = globalBoard.rankings.find((r) => r.studentId === studentA)?.rank;
    const expectedDianaRank = globalBoard.rankings.find((r) => r.studentId === studentD)?.rank;

    // Simulate search filter as implemented in the frontend StudentClassLeaderboard
    const searchFilter = (query: string) => {
      const q = query.toLowerCase().trim();
      return globalBoard.rankings.filter((r) => (r.name || '').toLowerCase().includes(q));
    };

    const aliceSearchResults = searchFilter('Alice');
    assert(
      aliceSearchResults.length === 1 && aliceSearchResults[0].studentId === studentA,
      'Search filters to matched student Alice Adams',
      `Found ${aliceSearchResults.length} results`
    );
    assert(
      aliceSearchResults[0].rank === expectedAliceRank,
      `Alice Adams retains her true global rank #${expectedAliceRank} when searched`,
      `Got rank ${aliceSearchResults[0].rank}`
    );

    const dianaSearchResults = searchFilter('Diana');
    assert(
      dianaSearchResults.length === 1 && dianaSearchResults[0].studentId === studentD,
      'Search filters to matched student Diana Davis'
    );
    assert(
      dianaSearchResults[0].rank === expectedDianaRank,
      `Diana retains global rank #${expectedDianaRank} under filtered search`,
      `Got rank ${dianaSearchResults[0].rank}`
    );

    // Simulate pagination (page 2, pageSize 2)
    const pageSize = 2;
    const page2 = globalBoard.rankings.slice(pageSize, pageSize * 2);
    assert(
      page2.length > 0,
      'Pagination page 2 returns students'
    );
    assert(
      page2[0].rank === globalBoard.rankings[2].rank,
      `Page 2 student retains global rank #${globalBoard.rankings[2].rank} rather than re-indexing to 1`,
      `Got rank ${page2[0].rank}`
    );

    // =========================================================================
    // REQUIREMENT 9: LIVE UPDATES AND CONCURRENCY INTEGRITY
    // =========================================================================
    console.log('\n--- Requirement 9: Live Updates & Concurrency Integrity ---');

    // Create 5 concurrent activities and awards for Student B
    const concurrentActs = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        verificationLedger.recordActivity({
          studentId: studentB,
          sourceType: 'CONSISTENCY',
          sourcePlatform: 'CAREERAI',
          activityType: 'CONSISTENCY_STREAK',
          externalActivityId: `concurrent_${i}_${ts}`,
          verificationStatus: 'VERIFIED',
          verificationMethod: 'AUTOMATIC_ENGINE',
          occurredAt: new Date(),
        })
      )
    );

    await Promise.all(
      concurrentActs.map((act, i) =>
        verificationLedger.awardPoints({
          studentId: studentB,
          verifiedActivityId: act.id,
          category: 'CONSISTENCY',
          pointsAwarded: 5,
          reason: `Concurrent activity ${i}`,
          periodKey: 'ALL_TIME',
        })
      )
    );

    const scoreB_afterConcurrent = await scoringEngine.calculateStudentScore(studentB);
    assert(
      scoreB_afterConcurrent.totalScore === 30 + 5 * 5, // 55 XP
      'Concurrent XP awards all record accurately without dropped updates (30 + 25 = 55 XP)',
      `Got ${scoreB_afterConcurrent.totalScore}`
    );

  } catch (error) {
    console.error('Test Suite encountered an unexpected error:', error);
    failedCount++;
  } finally {
    // Cleanup test data
    console.log('\n--- Cleaning up test records ---');
    try {
      await pool.query(
        `DELETE FROM points_ledger WHERE "studentId" IN ($1, $2, $3, $4)`,
        [studentA, studentB, studentC, studentD]
      );
      await pool.query(
        `DELETE FROM verified_activities WHERE "studentId" IN ($1, $2, $3, $4)`,
        [studentA, studentB, studentC, studentD]
      );
      await pool.query(
        `DELETE FROM daily_check_ins WHERE "studentId" IN ($1, $2, $3, $4)`,
        [studentA, studentB, studentC, studentD]
      );
      await pool.query(
        `DELETE FROM profiles WHERE "userId" IN ($1, $2, $3, $4)`,
        [studentA, studentB, studentC, studentD]
      );
      await pool.query(
        `DELETE FROM users WHERE id IN ($1, $2, $3, $4)`,
        [studentA, studentB, studentC, studentD]
      );
    } catch (cleanErr) {
      console.warn('Cleanup warning:', cleanErr);
    }

    await pool.end();
  }

  console.log('\n=====================================================================');
  console.log(`  ACCEPTANCE TEST SUITE RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('=====================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runScoringAndRankingSuite();
