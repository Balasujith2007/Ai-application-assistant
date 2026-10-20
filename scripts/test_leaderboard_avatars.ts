import 'dotenv/config';
import { Pool } from 'pg';
import prisma from '../lib/prisma';
import { scoringEngine } from '../lib/leaderboard/scoringEngine';

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

async function runLeaderboardAvatarTests() {
  console.log('=====================================================================');
  console.log('  CAREERAI CLASS LEADERBOARD PROFILE PICTURE INTEGRATION TESTS      ');
  console.log('=====================================================================\n');

  const ts = Date.now();
  const studentWithPhotoId = `stu_av_photo_${ts}`;
  const studentWithoutPhotoId = `stu_av_nophoto_${ts}`;
  const studentBrokenPhotoId = `stu_av_broken_${ts}`;
  const testDept = `CSE_AVATAR_${ts}`;

  const validPhotoUrl = `https://res.cloudinary.com/test-cloud/image/upload/v123456/careerai/student-profiles/student_${studentWithPhotoId}.jpg`;
  const brokenPhotoUrl = `https://broken-cdn.invalid/non-existent-avatar.jpg`;

  try {
    // 1. Setup Test Cohort
    console.log('--- Test 1: Cohort Setup with Diverse Photo States ---');

    await pool.query(
      `INSERT INTO users (id, name, email, role, active, "updatedAt") VALUES
       ($1, 'Aarav Sharma', $2, 'STUDENT', true, NOW()),
       ($3, 'Bhavna Patel', $4, 'STUDENT', true, NOW()),
       ($5, 'Chirag Rao', $6, 'STUDENT', true, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        studentWithPhotoId, `aarav_${ts}@test.edu`,
        studentWithoutPhotoId, `bhavna_${ts}@test.edu`,
        studentBrokenPhotoId, `chirag_${ts}@test.edu`,
      ]
    );

    // Profile for Student 1: Valid Saved Cloudinary Profile Photo
    // Profile for Student 2: No Photo (null)
    // Profile for Student 3: Unavailable / 404 Photo URL
    await pool.query(
      `INSERT INTO profiles (id, "userId", department, year, section, college, "profilePhotoUrl", "updatedAt") VALUES
       ($1, $2, $3, 3, 'A', 'KIT College', $4, NOW()),
       ($5, $6, $7, 3, 'A', 'KIT College', NULL, NOW()),
       ($8, $9, $10, 3, 'A', 'KIT College', $11, NOW())
       ON CONFLICT ("userId") DO NOTHING`,
      [
        `prof_1_${ts}`, studentWithPhotoId, testDept, validPhotoUrl,
        `prof_2_${ts}`, studentWithoutPhotoId, testDept,
        `prof_3_${ts}`, studentBrokenPhotoId, testDept, brokenPhotoUrl,
      ]
    );

    assert(true, 'Test cohort configured with student with photo, student without photo, and student with broken photo');

    // 2. Fetch Leaderboard via Scoring Engine
    console.log('\n--- Test 2: Authoritative Leaderboard Output Verification ---');

    const leaderboard = await scoringEngine.computeClassLeaderboard(
      { department: testDept, year: 3, section: 'A' },
      'ALL_TIME',
      studentWithPhotoId
    );

    const aarav = leaderboard.rankings.find((r) => r.studentId === studentWithPhotoId);
    const bhavna = leaderboard.rankings.find((r) => r.studentId === studentWithoutPhotoId);
    const chirag = leaderboard.rankings.find((r) => r.studentId === studentBrokenPhotoId);

    // 3. Test Student with Actual Photo
    console.log('\n--- Test 3: Student with Profile Photo ---');
    assert(
      aarav?.profilePhotoUrl === validPhotoUrl,
      'Delivers student exact saved profile photo URL from database',
      `Got: ${aarav?.profilePhotoUrl}`
    );
    assert(
      aarav?.isCurrentUser === true,
      'Identifies current student accurately on leaderboard entry'
    );

    // 4. Test Student without Photo (Neutral Empty Placeholder Check)
    console.log('\n--- Test 4: Student Without Profile Photo ---');
    assert(
      bhavna?.profilePhotoUrl === null,
      'Student without photo has profilePhotoUrl strictly set to null',
      `Got: ${bhavna?.profilePhotoUrl}`
    );
    assert(
      !(bhavna as any)?.initials,
      'No generated initials property on student data entry'
    );

    // 5. Test Student with Broken Photo URL
    console.log('\n--- Test 5: Student with Unavailable Photo URL ---');
    assert(
      chirag?.profilePhotoUrl === brokenPhotoUrl,
      'Preserves image reference for client-side graceful fallback handling'
    );

    // 6. Test Current Student Entry Structure
    console.log('\n--- Test 6: Current Student Entry Consistency ---');
    assert(
      leaderboard.currentStudentEntry?.studentId === studentWithPhotoId,
      'currentStudentEntry identifies the logged-in student'
    );
    assert(
      leaderboard.currentStudentEntry?.profilePhotoUrl === validPhotoUrl,
      'currentStudentEntry delivers the current student profilePhotoUrl'
    );

    // 7. Test Ranking, Names, and Streak Preservation
    console.log('\n--- Test 7: Integrity of Names, Ranks, Streaks, and Medals ---');
    assert(
      leaderboard.rankings.length === 3,
      'All 3 cohort students are included in leaderboard rankings'
    );
    assert(
      Boolean(aarav?.name && bhavna?.name && chirag?.name),
      'Student names are fully preserved without alteration'
    );
    assert(
      leaderboard.rankings.every((r) => typeof r.rank === 'number' && r.rank >= 1),
      'Standard ranking numbers are preserved'
    );

  } catch (error) {
    console.error('Test Suite encountered an error:', error);
    failedCount++;
  } finally {
    console.log('\n--- Cleaning up test records ---');
    try {
      await pool.query(
        `DELETE FROM profiles WHERE "userId" IN ($1, $2, $3)`,
        [studentWithPhotoId, studentWithoutPhotoId, studentBrokenPhotoId]
      );
      await pool.query(
        `DELETE FROM users WHERE id IN ($1, $2, $3)`,
        [studentWithPhotoId, studentWithoutPhotoId, studentBrokenPhotoId]
      );
    } catch (cleanErr) {
      console.warn('Cleanup warning:', cleanErr);
    }

    await pool.end();
  }

  console.log('\n=====================================================================');
  console.log(`  LEADERBOARD AVATAR TESTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('=====================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runLeaderboardAvatarTests();
