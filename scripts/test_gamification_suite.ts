import prisma from '../lib/prisma';
import { BADGE_DEFINITIONS, getBadgeById } from '../lib/gamification/badgeConfig';
import {
  recordDailyActivity,
  calculateStreak,
  evaluateAndAwardBadges,
  getStudentBadgesOverview,
  acknowledgeBadgeToast,
} from '../lib/gamification/badgeEngine';

async function runTestSuite() {
  console.log('=====================================================');
  console.log('🚀 CareerAI Gamification & Badge System Test Suite');
  console.log('=====================================================\n');

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

  try {
    // 1. Verify Badge Configuration Catalog
    console.log('--- Test Group 1: Badge Catalog Integrity ---');
    assert(BADGE_DEFINITIONS.length === 24, '24 badges defined in catalog', `Found ${BADGE_DEFINITIONS.length}`);

    const categories = Array.from(new Set(BADGE_DEFINITIONS.map((b) => b.category)));
    assert(
      categories.includes('CODING') &&
        categories.includes('CONSISTENCY') &&
        categories.includes('SKILL') &&
        categories.includes('CAREER') &&
        categories.includes('XP'),
      'All 5 badge categories are represented'
    );

    const problemSolver = getBadgeById('problem-solver');
    assert(!!problemSolver && problemSolver.tier === 'BRONZE' && problemSolver.xpReward === 100, 'Problem Solver badge config valid');

    const streak7 = getBadgeById('7-day-streak');
    assert(!!streak7 && streak7.tier === 'SILVER' && streak7.xpReward === 150, '7-Day Streak badge config valid');

    const xpElite = getBadgeById('xp-elite');
    assert(!!xpElite && xpElite.tier === 'DIAMOND' && xpElite.xpReward === 1000, 'XP Elite badge config valid');

    // 2. Find or Create a Test Student
    console.log('\n--- Test Group 2: Student Setup & Database Tables ---');
    let testStudent = await prisma.user.findFirst({
      where: { role: 'STUDENT', email: { contains: 'test.badge' } },
    });

    if (!testStudent) {
      testStudent = await prisma.user.findFirst({
        where: { role: 'STUDENT' },
      });
    }

    if (!testStudent) {
      throw new Error('No student found in DB for gamification testing');
    }
    console.log(`  ℹ️ Using test student: ${testStudent.name} (${testStudent.id})`);

    // Clean any prior test badges/streaks for fresh test run
    await prisma.studentBadge.deleteMany({ where: { studentId: testStudent.id } });
    await prisma.studentDailyStreak.deleteMany({ where: { studentId: testStudent.id } });
    await prisma.achievementHistory.deleteMany({ where: { studentId: testStudent.id } });

    // 3. Test Daily Streak Recording & Duplicate Protection
    console.log('\n--- Test Group 3: Streak Engine & Timezone Invariant ---');
    const rec1 = await recordDailyActivity(testStudent.id, 'PRACTICE_SUBMISSION', 'P101');
    assert(!!rec1 && rec1.currentStreak >= 1, 'Daily activity recorded for today with active streak');

    // Idempotent duplicate protection for same date
    const recDuplicate = await recordDailyActivity(testStudent.id, 'PRACTICE_SUBMISSION', 'P102');
    assert(!!recDuplicate, 'Second submission on same day handled safely without duplicate key violation');

    const totalDaysRecorded = await prisma.studentDailyStreak.count({ where: { studentId: testStudent.id } });
    assert(totalDaysRecorded === 1, 'Duplicate protection prevents multiple streak entries for same day', `Count is ${totalDaysRecorded}`);

    // Populate a 7-day streak for the student to test calculation
    for (let i = 1; i <= 6; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      await prisma.studentDailyStreak.upsert({
        where: { studentId_activityDate: { studentId: testStudent.id, activityDate: ds } },
        update: {},
        create: {
          id: `streak_${testStudent.id}_${ds}`,
          studentId: testStudent.id,
          activityDate: ds,
          activityType: 'CODING_PRACTICE',
          sourceReference: 'HISTORICAL_TEST',
        },
      });
    }

    const calculatedStreak = await calculateStreak(testStudent.id);
    assert(calculatedStreak.currentStreak === 7, 'Streak calculated exactly 7 contiguous days', `Current streak: ${calculatedStreak.currentStreak}`);
    assert(calculatedStreak.longestStreak >= 7, 'Longest streak tracks maximum historical run');

    // 4. Test Badge Evaluation & Awarding
    console.log('\n--- Test Group 4: Automated Badge Criteria Evaluation ---');
    const awardResult1 = await evaluateAndAwardBadges(testStudent.id);
    assert(awardResult1.newlyAwarded.length > 0, 'Badges successfully evaluated and awarded for 7-day streak', `Awarded: ${awardResult1.newlyAwarded.map((b) => b.id).join(', ')}`);

    const hasStreak7 = awardResult1.newlyAwarded.some((b: any) => b.id === '7-day-streak');
    const hasStarter3 = awardResult1.newlyAwarded.some((b: any) => b.id === '3-day-starter');
    assert(hasStreak7 && hasStarter3, 'Both 3-Day Starter and 7-Day Streak badges awarded for 7-day streak');

    // Check Achievement History
    const historyEntries = await prisma.achievementHistory.findMany({
      where: { studentId: testStudent.id },
    });
    assert(historyEntries.length >= 2, 'Achievement history logs created with audit timestamps');

    // 5. Test Idempotency & Duplicate Prevention (Double-Evaluation)
    console.log('\n--- Test Group 5: Idempotency & Duplicate Badge Prevention ---');
    const awardResult2 = await evaluateAndAwardBadges(testStudent.id);
    assert(awardResult2.newlyAwarded.length === 0, 'Second evaluation awards 0 duplicate badges (idempotent)', `Awarded count: ${awardResult2.newlyAwarded.length}`);

    const badgeRecords = await prisma.studentBadge.findMany({
      where: { studentId: testStudent.id, badgeId: '7-day-streak' },
    });
    assert(badgeRecords.length === 1, 'Strict database-level uniqueness prevents duplicate badges for same student');

    // 6. Test Overview Service
    console.log('\n--- Test Group 6: Student Badges Overview Query ---');
    const overview = await getStudentBadgesOverview(testStudent.id);
    assert(overview.summary.totalAvailable === 24, 'Overview returns all 24 catalog badges');
    assert(overview.summary.totalEarned >= 2, 'Overview reflects earned badges accurately', `Earned: ${overview.summary.totalEarned}`);
    assert(overview.summary.currentStreak === 7, 'Overview reflects verified current streak (7)');
    assert(overview.badges.all.every((b) => typeof b.progressPercentage === 'number'), 'All badges contain computed progress percentages');

    // 7. Test Toast Acknowledgment
    console.log('\n--- Test Group 7: Celebration Toast Lifecycle ---');
    const uncelebratedBefore = overview.badges.earned.filter((b) => !b.unlockedToastSeen);
    assert(uncelebratedBefore.length > 0, 'Newly earned badges are flagged for celebration toast');

    const ackResult = await acknowledgeBadgeToast(testStudent.id, '7-day-streak');
    assert(ackResult.success, 'Toast acknowledgment succeeded');

    const badgeAfter = await prisma.studentBadge.findUnique({
      where: { studentId_badgeId: { studentId: testStudent.id, badgeId: '7-day-streak' } },
    });
    assert(badgeAfter?.unlockedToastSeen === true, 'Badge unlockedToastSeen flag flipped to true after acknowledgment');

    console.log('\n=====================================================');
    console.log(`🎉 TEST RESULTS: ${passedTests}/${totalTests} Tests Passed successfully!`);
    console.log('=====================================================\n');
  } catch (error) {
    console.error('Fatal error during test suite:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTestSuite();
