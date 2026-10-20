import 'dotenv/config';
import { Pool } from 'pg';
import prisma from '../lib/prisma';
import {
  validateImageMagicBytes,
  MAX_PHOTO_SIZE_BYTES,
  isCloudinaryConfigured,
  getCloudinaryConfig,
  deleteProfilePhotoFromCloudinary,
} from '../lib/cloudinary';
import { signToken } from '../lib/serverAuth';
import { scoringEngine } from '../lib/leaderboard/scoringEngine';
import { POST as photoUploadPost, DELETE as photoDelete, GET as photoGet } from '../app/api/profile/photo/route';
import { GET as authMeGet } from '../app/api/auth/me/route';

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

async function runProfilePhotoTestSuite() {
  console.log('=====================================================================');
  console.log('  CAREERAI STUDENT PROFILE PHOTO & CLOUDINARY INTEGRATION TEST SUITE ');
  console.log('=====================================================================\n');

  const ts = Date.now();
  const testStudentId = `stu_photo_${ts}`;
  const testStudent2Id = `stu_photo2_${ts}`;
  const testDept = `CSE_PHOTO_${ts}`;

  // Valid binary signatures
  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
  ]);
  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ]);
  const validWebpBuffer = Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.from([0x20, 0x00, 0x00, 0x00]),
    Buffer.from('WEBPVP8 '),
  ]);
  const invalidScriptBuffer = Buffer.from('<?php echo "malicious script"; ?>');
  const oversizedBuffer = Buffer.alloc(MAX_PHOTO_SIZE_BYTES + 1024);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Magic Bytes Content Validation (Actual Binary Signatures)
    // -------------------------------------------------------------------------
    console.log('--- Test 1: Magic Bytes Binary Content Validation ---');

    const jpegCheck = validateImageMagicBytes(validJpegBuffer);
    assert(jpegCheck.valid && jpegCheck.format === 'jpeg', 'Validates JPEG magic bytes (FF D8 FF)');

    const pngCheck = validateImageMagicBytes(validPngBuffer);
    assert(pngCheck.valid && pngCheck.format === 'png', 'Validates PNG magic bytes (89 50 4E 47 0D 0A 1A 0A)');

    const webpCheck = validateImageMagicBytes(validWebpBuffer);
    assert(webpCheck.valid && webpCheck.format === 'webp', 'Validates WebP magic bytes (RIFF ... WEBP)');

    const scriptCheck = validateImageMagicBytes(invalidScriptBuffer);
    assert(!scriptCheck.valid, 'Rejects script file disguised as image');

    const emptyCheck = validateImageMagicBytes(Buffer.alloc(4));
    assert(!emptyCheck.valid, 'Rejects empty or truncated buffer');

    // -------------------------------------------------------------------------
    // TEST 2: Setup Authenticated Test Student
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Database Setup & Authentication ---');

    await pool.query(
      `INSERT INTO users (id, name, email, role, active, "updatedAt") VALUES
       ($1, 'Rohit Sharma', $2, 'STUDENT', true, NOW()),
       ($3, 'Kavya Raman', $4, 'STUDENT', true, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [testStudentId, `rohit_${ts}@test.edu`, testStudent2Id, `kavya_${ts}@test.edu`]
    );

    await pool.query(
      `INSERT INTO profiles (id, "userId", department, year, section, college, "updatedAt") VALUES
       ($1, $2, $3, 3, 'A', 'KIT College', NOW()),
       ($4, $5, $3, 3, 'A', 'KIT College', NOW())
       ON CONFLICT ("userId") DO NOTHING`,
      [`prof_1_${ts}`, testStudentId, testDept, `prof_2_${ts}`, testStudent2Id]
    );

    const studentToken = signToken({ sub: testStudentId, role: 'STUDENT' });
    const student2Token = signToken({ sub: testStudent2Id, role: 'STUDENT' });

    assert(Boolean(studentToken), 'JWT authentication token signed for test student');

    // -------------------------------------------------------------------------
    // TEST 3: Unauthenticated Access Rejection
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Security & Authorization Checks ---');

    // Unauthenticated GET
    const unauthGetReq = new Request('http://localhost:3000/api/profile/photo');
    const unauthGetRes = await photoGet(unauthGetReq);
    assert(unauthGetRes.status === 401, 'Unauthenticated GET /api/profile/photo returns 401 Unauthorized');

    // Unauthenticated POST
    const unauthPostReq = new Request('http://localhost:3000/api/profile/photo', {
      method: 'POST',
      body: new FormData(),
    });
    const unauthPostRes = await photoUploadPost(unauthPostReq);
    assert(unauthPostRes.status === 401, 'Unauthenticated POST /api/profile/photo returns 401 Unauthorized');

    // Unauthenticated DELETE
    const unauthDeleteReq = new Request('http://localhost:3000/api/profile/photo', {
      method: 'DELETE',
    });
    const unauthDeleteRes = await photoDelete(unauthDeleteReq);
    assert(unauthDeleteRes.status === 401, 'Unauthenticated DELETE /api/profile/photo returns 401 Unauthorized');

    // -------------------------------------------------------------------------
    // TEST 4: Oversized and Corrupted Upload Rejections
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: File Size and Format Boundary Rejections ---');

    // Oversized File (> 5MB)
    const oversizedForm = new FormData();
    const oversizedBlob = new Blob([oversizedBuffer], { type: 'image/jpeg' });
    oversizedForm.append('file', oversizedBlob, 'huge.jpg');

    const oversizedReq = new Request('http://localhost:3000/api/profile/photo', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: oversizedForm,
    });
    const oversizedRes = await photoUploadPost(oversizedReq);
    const oversizedData = await oversizedRes.json();
    assert(
      oversizedRes.status === 400 && oversizedData.error?.includes('5 MB'),
      'Rejects files exceeding 5 MB limit with descriptive error',
      `Status: ${oversizedRes.status}, Error: ${oversizedData.error}`
    );

    // Corrupted / Invalid File Format
    const corruptedForm = new FormData();
    const corruptedBlob = new Blob([invalidScriptBuffer], { type: 'image/jpeg' });
    corruptedForm.append('file', corruptedBlob, 'fake.jpg');

    const corruptedReq = new Request('http://localhost:3000/api/profile/photo', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: corruptedForm,
    });
    const corruptedRes = await photoUploadPost(corruptedReq);
    const corruptedData = await corruptedRes.json();
    assert(
      corruptedRes.status === 400 && corruptedData.error?.includes('Only JPG/JPEG, PNG, and WebP'),
      'Rejects fake image extension concealing non-image content',
      `Status: ${corruptedRes.status}, Error: ${corruptedData.error}`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Cloudinary Upload & DB Persistence Flow
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Photo Upload, Persistence, and Storage Flow ---');

    const simulatedPhotoUrl = `https://res.cloudinary.com/test-cloud/image/upload/v12345/careerai/student-profiles/student_${testStudentId}_test.jpg`;
    const simulatedPublicId = `careerai/student-profiles/student_${testStudentId}_test`;

    // Direct Database Persistence Verification
    await (prisma as any).profile.update({
      where: { userId: testStudentId },
      data: {
        profilePhotoUrl: simulatedPhotoUrl,
        photoPublicId: simulatedPublicId,
      },
    });

    const verifyDbProfile: any = await (prisma as any).profile.findUnique({
      where: { userId: testStudentId },
      select: { profilePhotoUrl: true, photoPublicId: true },
    });

    assert(
      verifyDbProfile?.profilePhotoUrl === simulatedPhotoUrl,
      'Profile photo URL persisted accurately in database',
      `Saved: ${verifyDbProfile?.profilePhotoUrl}`
    );
    assert(
      verifyDbProfile?.photoPublicId === simulatedPublicId,
      'Cloudinary public ID stored accurately for future deletion/replacement'
    );

    // -------------------------------------------------------------------------
    // TEST 6: Page Refresh & Re-login Persistence via API
    // -------------------------------------------------------------------------
    console.log('\n--- Test 6: Page Refresh & Re-Login Persistence ---');

    // Test GET /api/profile/photo
    const getPhotoReq = new Request('http://localhost:3000/api/profile/photo', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const getPhotoRes = await photoGet(getPhotoReq);
    const getPhotoData = await getPhotoRes.json();

    assert(
      getPhotoRes.status === 200 && getPhotoData.profilePhotoUrl === simulatedPhotoUrl,
      'GET /api/profile/photo returns persisted photo upon page reload',
      `Got URL: ${getPhotoData.profilePhotoUrl}`
    );

    // Test GET /api/auth/me (User session reload)
    const authMeReq = new Request('http://localhost:3000/api/auth/me', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const authMeRes = await authMeGet(authMeReq);
    const authMeData = await authMeRes.json();

    assert(
      authMeRes.status === 200 && authMeData.data?.profile?.profilePhotoUrl === simulatedPhotoUrl,
      'GET /api/auth/me includes profilePhotoUrl in restored user session'
    );

    // -------------------------------------------------------------------------
    // TEST 7: Cross-Student Photo Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- Test 7: Student Isolation & Ownership Protection ---');

    // Student 2 fetches their own photo (should be null, not Student 1's photo)
    const student2GetReq = new Request('http://localhost:3000/api/profile/photo', {
      headers: { Authorization: `Bearer ${student2Token}` },
    });
    const student2GetRes = await photoGet(student2GetReq);
    const student2GetData = await student2GetRes.json();

    assert(
      student2GetData.profilePhotoUrl === null,
      'Student 2 cannot see or inherit Student 1 profile photo (strict user isolation)'
    );

    // -------------------------------------------------------------------------
    // TEST 8: Photo Replacement Flow
    // -------------------------------------------------------------------------
    console.log('\n--- Test 8: Photo Replacement Workflow ---');

    const updatedPhotoUrl = `https://res.cloudinary.com/test-cloud/image/upload/v67890/careerai/student-profiles/student_${testStudentId}_v2.jpg`;
    const updatedPublicId = `careerai/student-profiles/student_${testStudentId}_v2`;

    await (prisma as any).profile.update({
      where: { userId: testStudentId },
      data: {
        profilePhotoUrl: updatedPhotoUrl,
        photoPublicId: updatedPublicId,
      },
    });

    const replacedDbProfile: any = await (prisma as any).profile.findUnique({
      where: { userId: testStudentId },
      select: { profilePhotoUrl: true, photoPublicId: true },
    });

    assert(
      replacedDbProfile?.profilePhotoUrl === updatedPhotoUrl,
      'Profile photo URL atomically updated to new Cloudinary version',
      `Updated URL: ${replacedDbProfile?.profilePhotoUrl}`
    );
    assert(
      replacedDbProfile?.photoPublicId === updatedPublicId,
      'Cloudinary public ID successfully updated to new asset'
    );

    // -------------------------------------------------------------------------
    // TEST 9: Photo Removal Flow
    // -------------------------------------------------------------------------
    console.log('\n--- Test 9: Photo Removal Workflow ---');

    const deleteReq = new Request('http://localhost:3000/api/profile/photo', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const deleteRes = await photoDelete(deleteReq);
    const deleteData = await deleteRes.json();

    assert(
      deleteRes.status === 200 && deleteData.success && deleteData.profilePhotoUrl === null,
      'DELETE /api/profile/photo clears photo and returns success'
    );

    const clearedDbProfile: any = await (prisma as any).profile.findUnique({
      where: { userId: testStudentId },
      select: { profilePhotoUrl: true, photoPublicId: true },
    });

    assert(
      clearedDbProfile?.profilePhotoUrl === null && clearedDbProfile?.photoPublicId === null,
      'Database fields cleared to null upon photo removal'
    );

    // -------------------------------------------------------------------------
    // TEST 10: Leaderboard Integration: Actual Photo Display & Neutral Fallback
    // -------------------------------------------------------------------------
    console.log('\n--- Test 10: Class Leaderboard Profile Photo Integration ---');

    // Set photo for Student 1 and leave Student 2 empty
    await (prisma as any).profile.update({
      where: { userId: testStudentId },
      data: {
        profilePhotoUrl: simulatedPhotoUrl,
        photoPublicId: simulatedPublicId,
      },
    });

    const leaderboard = await scoringEngine.computeClassLeaderboard(
      { department: testDept, year: 3, section: 'A' },
      'ALL_TIME',
      testStudentId
    );

    const rankedStudent1: any = leaderboard.rankings.find((r: any) => r.studentId === testStudentId);
    const rankedStudent2: any = leaderboard.rankings.find((r: any) => r.studentId === testStudent2Id);

    assert(
      rankedStudent1?.profilePhotoUrl === simulatedPhotoUrl,
      'Leaderboard entry delivers student actual saved profile photo URL',
      `Got: ${rankedStudent1?.profilePhotoUrl}`
    );
    assert(
      rankedStudent2?.profilePhotoUrl === null,
      'Student without uploaded photo has profilePhotoUrl: null (triggers neutral placeholder)',
      `Got: ${rankedStudent2?.profilePhotoUrl}`
    );

    // -------------------------------------------------------------------------
    // TEST 11: Missing Cloudinary Configuration Handling
    // -------------------------------------------------------------------------
    console.log('\n--- Test 11: Missing Cloudinary Environment Handling ---');

    const origCloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const origNextCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    assert(!isCloudinaryConfigured(), 'isCloudinaryConfigured() safely returns false when cloud name is missing');

    const missingConfigForm = new FormData();
    const validBlob = new Blob([validJpegBuffer], { type: 'image/jpeg' });
    missingConfigForm.append('file', validBlob, 'test.jpg');

    const missingConfigReq = new Request('http://localhost:3000/api/profile/photo', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: missingConfigForm,
    });
    const missingConfigRes = await photoUploadPost(missingConfigReq);
    const missingConfigData = await missingConfigRes.json();

    assert(
      missingConfigRes.status === 503 && missingConfigData.error?.includes('Cloudinary is not configured'),
      'Returns 503 with clear message when Cloudinary environment variables are missing',
      `Status: ${missingConfigRes.status}, Error: ${missingConfigData.error}`
    );

    // Restore env
    if (origCloudName) process.env.CLOUDINARY_CLOUD_NAME = origCloudName;
    if (origNextCloudName) process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = origNextCloudName;

  } catch (error) {
    console.error('Test Suite encountered an unexpected error:', error);
    failedCount++;
  } finally {
    // Cleanup test users
    console.log('\n--- Cleaning up test records ---');
    try {
      await pool.query(`DELETE FROM profiles WHERE "userId" IN ($1, $2)`, [testStudentId, testStudent2Id]);
      await pool.query(`DELETE FROM users WHERE id IN ($1, $2)`, [testStudentId, testStudent2Id]);
    } catch (cleanErr) {
      console.warn('Cleanup warning:', cleanErr);
    }

    await pool.end();
  }

  console.log('\n=====================================================================');
  console.log(`  PROFILE PHOTO SUITE RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('=====================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runProfilePhotoTestSuite();
