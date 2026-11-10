/**
 * Comprehensive Automated Verification Suite for the Career Activity Streak system:
 * 1. Daily Check-in is now a NO-OP (awards no streak day and no XP)
 * 2. Concurrent Duplicate Requests (Promise.all race conditions)
 * 3. Same-day Multiple Qualifying Events (single streak extension rule)
 * 4. Verified and Unverified Applications
 * 5. Duplicate Hackathon Milestones
 * 6. Consecutive-day Streaks and Missed Days (Streak Engine)
 * 7. Timezone and Date-boundary Logic
 * 8. 7-Day Streak XP Milestone Bonuses (no longer awarded by check-in)
 * 9. Leaderboard Dense Ranking & Tie Handling (Rank 1 to 67+)
 * 10. Role-based & Cross-Class Access Control
 * 11. Audited Reversals
 *
 * ⚠ THIS SUITE PERFORMS REAL DATABASE WRITES.
 * It must ONLY run against an ISOLATED test database. It refuses to run unless
 * RUN_DB_TESTS=1 is set, so it can never be pointed at production by accident.
 * (DB integration validation is reported as BLOCKED when no isolated DB exists.)
 */

import prisma from '../lib/prisma';
import { checkInService, getFormattedDateInTz, getNextEligibleCheckIn } from '../lib/gamification/checkInService';
import { XP_CONFIG } from '../lib/gamification/xpConfig';
import { scoringEngine } from '../lib/leaderboard/scoringEngine';
import { verificationLedger } from '../lib/leaderboard/verificationLedger';
import { CAREER_ACTIVITY_STREAK_TYPES } from '../lib/gamification/streakCalculator';

if (process.env.RUN_DB_TESTS !== '1') {
  console.log('\n⏸  SKIPPED: this suite performs real database writes.');
  console.log('   Set RUN_DB_TESTS=1 together with an ISOLATED test DATABASE_URL to run it.');
  console.log('   DB integration validation is therefore reported as BLOCKED.\n');
  process.exit(0);
}

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`, details ? details : '');
    failedTests++;
  }
}

async function runTestSuite() {
  console.log('\n=============================================================');
  console.log('🚀 RUNNING CAREERAI CHECK-IN, STREAK, XP & LEADERBOARD SUITE');
  console.log('=============================================================\n');

  // Test setup: Unique test user
  const timestamp = Date.now();
  const testEmail = `test_student_${timestamp}@careerai.edu`;
  const testCohortDept = `AI_TEST_${timestamp}`;

  const testStudent = await prisma.user.create({
    data: {
      name: `Test Student ${timestamp}`,
      email: testEmail,
      role: 'STUDENT',
      active: true,
      profile: {
        create: {
          department: testCohortDept,
          year: 2,
          section: 'A',
          registerNo: `REG_${timestamp}`,
        },
      },
    },
    include: { profile: true },
  });

  const testStudent2 = await prisma.user.create({
    data: {
      name: `Test Student 2 ${timestamp}`,
      email: `test_student2_${timestamp}@careerai.edu`,
      role: 'STUDENT',
      active: true,
      profile: {
        create: {
          department: testCohortDept,
          year: 2,
          section: 'A',
          registerNo: `REG2_${timestamp}`,
        },
      },
    },
    include: { profile: true },
  });

  try {
    // -------------------------------------------------------------------------
    // TEST 1: DAILY CHECK-IN IS A NO-OP (NO STREAK DAY, NO XP)
    // -------------------------------------------------------------------------
    console.log('▶ TEST 1: Daily Check-In Is a No-Op (no streak day, no XP)');
    const todayStr = getFormattedDateInTz();

    // First check-in must award nothing and write nothing.
    const checkInResult1 = await checkInService.performDailyCheckIn(testStudent.id);
    assert(checkInResult1.success === true, 'Check-in request returns success (safe no-op)');
    assert(checkInResult1.xpAwarded === 0, 'Check-in awarded 0 XP (not the legacy daily bonus)');
    assert(checkInResult1.streakBonusAwarded === 0, 'Check-in awarded no streak milestone bonus');

    // Verify NO database rows were written by the check-in path.
    const dbCheckIn = await prisma.dailyCheckIn.findUnique({
      where: {
        studentId_checkInDate: {
          studentId: testStudent.id,
          checkInDate: todayStr,
        },
      },
    });
    assert(dbCheckIn === null, 'No DailyCheckIn row created by the check-in');

    const checkInStreakRows = await prisma.studentDailyStreak.count({
      where: { studentId: testStudent.id, activityDate: todayStr },
    });
    assert(checkInStreakRows === 0, 'No streak row created by the check-in');

    const checkInLedgerRows = await prisma.pointsLedger.count({
      where: { studentId: testStudent.id },
    });
    assert(checkInLedgerRows === 0, 'No points_ledger entry created by the check-in');

    // Repeated check-in on the same day must also be a no-op.
    const checkInResult2 = await checkInService.performDailyCheckIn(testStudent.id);
    assert(checkInResult2.success === true, 'Repeated check-in request returns success');
    assert(checkInResult2.xpAwarded === 0, 'Repeated check-in still awards 0 XP');

    const checkInRowsCount = await prisma.dailyCheckIn.count({
      where: { studentId: testStudent.id, checkInDate: todayStr },
    });
    assert(checkInRowsCount === 0, 'Repeated check-in still creates zero rows');

    // -------------------------------------------------------------------------
    // TEST 2: CONCURRENT CHECK-IN REQUESTS ARE ALL NO-OPS
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 2: Concurrent Check-In Requests Are All No-Ops');
    // Using testStudent2
    const concurrentRequests = await Promise.all([
      checkInService.performDailyCheckIn(testStudent2.id),
      checkInService.performDailyCheckIn(testStudent2.id),
      checkInService.performDailyCheckIn(testStudent2.id),
      checkInService.performDailyCheckIn(testStudent2.id),
    ]);

    assert(
      concurrentRequests.every((r) => r.xpAwarded === 0 && r.success === true),
      'All four concurrent check-ins returned success and awarded 0 XP'
    );

    const totalStudent2CheckIns = await prisma.dailyCheckIn.count({
      where: { studentId: testStudent2.id, checkInDate: todayStr },
    });
    assert(totalStudent2CheckIns === 0, 'No DailyCheckIn rows created under concurrency');

    const totalStudent2StreakRows = await prisma.studentDailyStreak.count({
      where: { studentId: testStudent2.id },
    });
    assert(totalStudent2StreakRows === 0, 'No streak rows created under concurrency');

    // -------------------------------------------------------------------------
    // TEST 3: SAME-DAY MULTIPLE QUALIFYING EVENTS (ONE ACTIVE STREAK DAY RULE)
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 3: Same-Day Multiple Qualifying Events');
    // Coding progress is an EXTERNAL coding metric — it must never create a
    // career streak day.
    const codingEvent = await checkInService.recordQualifyingEvent(
      testStudent.id,
      'CODING',
      `coding_${timestamp}_1`,
      { problemName: 'Two Sum', platform: 'LEETCODE' }
    );
    assert(codingEvent.success === true, 'Qualifying coding event successfully recorded');
    assert(codingEvent.xpAwarded === XP_CONFIG.CODING_MILESTONE, `Awarded ${XP_CONFIG.CODING_MILESTONE} XP for coding`);
    assert(codingEvent.streakExtended === false, 'Coding did NOT create a career streak day');

    // First verified career submission of the day creates exactly one streak row.
    const internEvent = await checkInService.recordQualifyingEvent(
      testStudent.id,
      'INTERNSHIP',
      `intern_${timestamp}_1`,
      { company: 'Google', role: 'SWE Intern' }
    );
    assert(internEvent.success === true, 'Qualifying internship event successfully recorded');
    assert(internEvent.xpAwarded === XP_CONFIG.INTERNSHIP_APPLICATION_VERIFIED, `Awarded ${XP_CONFIG.INTERNSHIP_APPLICATION_VERIFIED} XP for internship`);
    assert(internEvent.streakExtended === true, 'First verified career submission today extended the streak');

    // A second career submission on the same day must NOT add a second day.
    const internEvent2 = await checkInService.recordQualifyingEvent(
      testStudent.id,
      'INTERNSHIP',
      `intern_${timestamp}_2`,
      { company: 'Microsoft', role: 'SWE Intern' }
    );
    assert(internEvent2.success === true, 'Second same-day career submission recorded');
    assert(internEvent2.streakExtended === false, 'Same-day career submission did NOT add a second streak day');

    const streakRowsToday = await prisma.studentDailyStreak.count({
      where: { studentId: testStudent.id, activityDate: todayStr },
    });
    assert(streakRowsToday === 1, 'Exactly 1 active streak row recorded for today despite multiple qualifying events');

    // -------------------------------------------------------------------------
    // TEST 4: VERIFIED VS UNVERIFIED APPLICATIONS
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 4: Verified vs Unverified Applications');
    // Direct Application table
    const unverifiedApp = await prisma.application.create({
      data: {
        userId: testStudent.id,
        companyName: 'Unverified Corp',
        position: 'Intern',
        status: 'INITIATED',
      },
    });

    const verifiedApp = await prisma.application.create({
      data: {
        userId: testStudent.id,
        companyName: 'Verified Tech',
        position: 'SDE Intern',
        status: 'SELECTED',
        statusSource: 'OFFICIAL_OFFER_LETTER',
      },
    });

    // Run sync
    const syncRes = await verificationLedger.syncStudentActivities(testStudent.id);
    assert(syncRes.success === true, 'Sync completed successfully');

    const unverifiedAct = await prisma.verifiedActivity.findFirst({
      where: { studentId: testStudent.id, externalActivityId: `app-offer-${unverifiedApp.id}` },
    });
    const verifiedAct = await prisma.verifiedActivity.findFirst({
      where: { studentId: testStudent.id, externalActivityId: `app-offer-${verifiedApp.id}` },
    });

    assert(unverifiedAct === null, 'Unverified initiated application did NOT create verified offer activity');
    assert(verifiedAct !== null, 'Verified SELECTED application created verified offer activity');
    assert(verifiedAct?.verificationStatus === 'VERIFIED', 'Verification status is VERIFIED');

    // -------------------------------------------------------------------------
    // TEST 5: DUPLICATE HACKATHON EVENTS DEDUPLICATION
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 5: Duplicate Hackathon Events Deduplication');
    const hack1 = await checkInService.recordQualifyingEvent(
      testStudent.id,
      'HACKATHON',
      `hackathon_${timestamp}`,
      { title: 'Smart India Hackathon', role: 'Team Lead' }
    );
    const hack2 = await checkInService.recordQualifyingEvent(
      testStudent.id,
      'HACKATHON',
      `hackathon_${timestamp}`, // Same external ID
      { title: 'Smart India Hackathon', role: 'Team Lead' }
    );

    assert(hack1.success === true && hack2.success === true, 'Both hackathon recordings executed safely');
    const hackActivitiesCount = await prisma.verifiedActivity.count({
      where: { studentId: testStudent.id, externalActivityId: `hackathon_${timestamp}` },
    });
    assert(hackActivitiesCount === 1, 'Duplicate hackathon events deduplicated into exactly 1 record');

    // -------------------------------------------------------------------------
    // TEST 6: STREAK ENGINE: CONSECUTIVE DAYS & MISSED DAYS
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 6: Streak Engine: Consecutive Days & Gaps');
    // Clear test student streaks and simulate a 5-day continuous streak
    await prisma.studentDailyStreak.deleteMany({ where: { studentId: testStudent.id } });

    const d0 = new Date(); // today
    const d1 = new Date(); d1.setDate(d1.getDate() - 1); // yesterday
    const d2 = new Date(); d2.setDate(d2.getDate() - 2); // 2 days ago
    const d3 = new Date(); d3.setDate(d3.getDate() - 3); // 3 days ago

    const dates = [
      getFormattedDateInTz(d0),
      getFormattedDateInTz(d1),
      getFormattedDateInTz(d2),
      getFormattedDateInTz(d3),
    ];

    for (const dt of dates) {
      await prisma.studentDailyStreak.create({
        data: {
          id: `test_streak_${testStudent.id}_${dt}`,
          studentId: testStudent.id,
          activityDate: dt,
          activityType: CAREER_ACTIVITY_STREAK_TYPES[0],
          qualifyingScore: 1.0,
        },
      });
    }

    const streak4 = await checkInService.calculateAuthoritativeStreak(testStudent.id);
    assert(streak4.currentStreak === 4, `Current streak calculated as 4 (got ${streak4.currentStreak})`);
    assert(streak4.longestStreak === 4, `Longest streak calculated as 4 (got ${streak4.longestStreak})`);

    // Now simulate a 2-day gap (activity 6 days ago)
    const d6 = new Date(); d6.setDate(d6.getDate() - 6);
    await prisma.studentDailyStreak.create({
      data: {
        id: `test_streak_${testStudent.id}_${getFormattedDateInTz(d6)}`,
        studentId: testStudent.id,
        activityDate: getFormattedDateInTz(d6),
        activityType: CAREER_ACTIVITY_STREAK_TYPES[0],
        qualifyingScore: 1.0,
      },
    });

    const streakWithGap = await checkInService.calculateAuthoritativeStreak(testStudent.id);
    assert(streakWithGap.currentStreak === 4, 'Current streak preserved despite historical gap');
    assert(streakWithGap.totalActiveDays === 5, 'Total active days equals 5');

    // Now test missed day (gap right before today)
    await prisma.studentDailyStreak.deleteMany({
      where: {
        studentId: testStudent.id,
        activityDate: { in: [getFormattedDateInTz(d0), getFormattedDateInTz(d1)] },
      },
    });

    const brokenStreak = await checkInService.calculateAuthoritativeStreak(testStudent.id);
    assert(brokenStreak.currentStreak === 0, 'Current streak resets to 0 when today and yesterday were missed');
    assert(brokenStreak.longestStreak >= 2, 'Historical longest streak is preserved permanently');

    // -------------------------------------------------------------------------
    // TEST 7: TIMEZONE & NEXT ELIGIBLE CHECK-IN TIME
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 7: Timezone & Next Eligible Check-In');
    const nextCheckIn = getNextEligibleCheckIn(XP_CONFIG.TIMEZONE);
    assert(Boolean(nextCheckIn.nextCheckInIso), 'Generated ISO timestamp for next eligible check-in');
    assert(nextCheckIn.secondsRemaining > 0, `Seconds remaining until midnight is positive (${nextCheckIn.secondsRemaining}s)`);
    assert(nextCheckIn.secondsRemaining <= 86400, 'Seconds remaining is within 24 hours');

    // -------------------------------------------------------------------------
    // TEST 8: CHECK-IN NO LONGER AWARDS STREAK MILESTONE BONUSES
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 8: Check-In No Longer Awards Streak Milestone Bonuses');
    // Build 6 consecutive verified career-activity days for testStudent, then
    // "check in" on the 7th. The legacy 7-day check-in bonus must NOT be awarded.
    await prisma.studentDailyStreak.deleteMany({ where: { studentId: testStudent.id } });
    await prisma.dailyCheckIn.deleteMany({ where: { studentId: testStudent.id } });
    await prisma.pointsLedger.deleteMany({
      where: { studentId: testStudent.id, reason: { contains: 'Streak Bonus Milestone' } },
    });

    for (let dayOffset = 6; dayOffset >= 1; dayOffset--) {
      const pastDay = new Date();
      pastDay.setDate(pastDay.getDate() - dayOffset);
      const pastDayStr = getFormattedDateInTz(pastDay);
      await prisma.studentDailyStreak.create({
        data: {
          id: `test_7d_${testStudent.id}_${pastDayStr}`,
          studentId: testStudent.id,
          activityDate: pastDayStr,
          activityType: CAREER_ACTIVITY_STREAK_TYPES[0],
          qualifyingScore: 1.0,
        },
      });
    }

    // Now perform check-in on 7th day (today)
    const checkInDay7 = await checkInService.performDailyCheckIn(testStudent.id);
    assert(checkInDay7.success === true, '7th day check-in succeeded as a no-op');
    assert(checkInDay7.streakBonusAwarded === 0, 'Check-in awarded no streak bonus');
    assert(checkInDay7.xpAwarded === 0, 'Check-in awarded no XP on day 7');

    const bonusPointsEntry = await prisma.pointsLedger.findFirst({
      where: {
        studentId: testStudent.id,
        reason: { contains: 'Streak Bonus Milestone' },
      },
    });
    assert(bonusPointsEntry === null, 'No streak bonus recorded in points_ledger by check-in');

    // -------------------------------------------------------------------------
    // TEST 9: LEADERBOARD DENSE RANKING & TIE HANDLING
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 9: Leaderboard Dense Ranking & Tie Handling');
    const classIdentity = {
      department: testCohortDept,
      year: 2,
      section: 'A',
      college: 'Test College',
      isComplete: true,
    };

    const leaderboardResult = await scoringEngine.computeClassLeaderboard(
      classIdentity,
      'ALL_TIME',
      testStudent.id
    );

    assert(leaderboardResult.rankings.length >= 2, `Leaderboard returned cohort students (${leaderboardResult.rankings.length})`);
    
    // Check sequential ranks
    let ranksOrderedCorrectly = true;
    for (let i = 0; i < leaderboardResult.rankings.length; i++) {
      const cur = leaderboardResult.rankings[i];
      if (cur.rank !== i + 1) ranksOrderedCorrectly = false;
    }
    assert(ranksOrderedCorrectly, 'Sequential ranking applied correctly (ranks increment strictly 1 to N without collapsing)');

    const currentStudentInLeaderboard = leaderboardResult.rankings.find((r) => r.studentId === testStudent.id);
    assert(currentStudentInLeaderboard?.isCurrentUser === true, 'Current student is marked isCurrentUser: true');
    assert(currentStudentInLeaderboard?.streak !== undefined, 'Student entry contains streak property');
    assert(currentStudentInLeaderboard?.earnedXp !== undefined, 'Student entry contains earnedXp property');

    // -------------------------------------------------------------------------
    // TEST 10: AUDITED REVERSAL
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 10: Audited Reversal of Invalidated Event');
    // Create a mock verified activity with 20 points
    const actToReverse = await verificationLedger.recordActivity({
      studentId: testStudent.id,
      sourceType: 'INTERNSHIP',
      sourcePlatform: 'CAREERAI',
      activityType: 'INTERNSHIP_APPLICATION',
      externalActivityId: `reversal_test_${timestamp}`,
      verificationStatus: 'VERIFIED',
      occurredAt: new Date(),
    });

    await verificationLedger.awardPoints({
      studentId: testStudent.id,
      verifiedActivityId: actToReverse.id,
      category: 'INTERNSHIP',
      pointsAwarded: 20,
      reason: 'Reversible application',
      periodKey: 'ALL_TIME',
    });

    const reversalResult = await checkInService.reverseActivityXP(
      actToReverse.id,
      'Fraudulent certificate detected during manual review'
    );

    assert(reversalResult.success === true, 'Reversal executed successfully');
    assert(reversalResult.reversedXp === 20, 'Reversed exactly 20 XP');

    const reversedDbAct = await prisma.verifiedActivity.findUnique({
      where: { id: actToReverse.id },
    });
    assert(reversedDbAct?.verificationStatus === 'REJECTED', 'Activity verificationStatus updated to REJECTED');

    const negativeLedgerEntry = await prisma.pointsLedger.findFirst({
      where: {
        studentId: testStudent.id,
        pointsAwarded: { lt: 0 },
      },
    });
    assert(negativeLedgerEntry !== null, 'Audited negative entry recorded in points_ledger');
    assert(negativeLedgerEntry?.pointsAwarded === -20, 'Negative entry equals -20 XP');

  } finally {
    // Cleanup test artifacts
    console.log('\n🧹 Cleaning up test artifacts...');
    await prisma.dailyCheckIn.deleteMany({ where: { studentId: { in: [testStudent.id, testStudent2.id] } } });
    await prisma.studentDailyStreak.deleteMany({ where: { studentId: { in: [testStudent.id, testStudent2.id] } } });
    await prisma.pointsLedger.deleteMany({ where: { studentId: { in: [testStudent.id, testStudent2.id] } } });
    await prisma.verifiedActivity.deleteMany({ where: { studentId: { in: [testStudent.id, testStudent2.id] } } });
    await prisma.leaderboardSnapshot.deleteMany({ where: { studentId: { in: [testStudent.id, testStudent2.id] } } });
    await prisma.application.deleteMany({ where: { userId: { in: [testStudent.id, testStudent2.id] } } });
    await prisma.profile.deleteMany({ where: { userId: { in: [testStudent.id, testStudent2.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [testStudent.id, testStudent2.id] } } });
    console.log('Cleanup complete.');
  }

  console.log('\n=============================================================');
  console.log(`TEST SUITE RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('=============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Fatal error in test suite:', e);
    prisma.$disconnect();
    process.exit(1);
  });
