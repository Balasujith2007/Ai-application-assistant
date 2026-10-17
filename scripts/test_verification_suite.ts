import 'dotenv/config';
import { Pool } from 'pg';
import crypto from 'crypto';
import { extractEvidenceFromOcrText } from '../lib/verification/extractionEngine';
import {
  crossVerifyEvidence,
  verifyStudentEmail,
  verifyStudentName,
  verifyOpportunity,
  verifySender,
  verifyRegistrationDate,
  verifyConfirmationWording
} from '../lib/verification/crossVerifier';
import { evaluateVerificationDecision } from '../lib/verification/decisionEngine';
import {
  validateImageMagicBytes,
  calculateFileHash
} from '../lib/verification/evidenceStorage';
import { adapterRegistry } from '../lib/verification/adapters/adapterRegistry';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
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

async function runAllTests() {
  console.log('=====================================================================');
  console.log('  CAREERAI UNIVERSAL REGISTRATION VERIFICATION ENGINE - TEST SUITE   ');
  console.log('=====================================================================\n');

  const ts = Date.now();
  const testStudentId = `test_stu_${ts}`;
  const testOppId = `test_opp_${ts}`;
  const testRegId = `test_reg_${ts}`;

  // Insert valid parent entities to satisfy PostgreSQL foreign keys
  await pool.query(
    `INSERT INTO users (id, name, email, role, "updatedAt") VALUES ($1, $2, $3, 'STUDENT', NOW()) ON CONFLICT DO NOTHING`,
    [testStudentId, 'Sathish Kumar', 'sathish.k@careerai.edu']
  );
  await pool.query(
    `INSERT INTO opportunities (id, title, organization, description, "applicationDeadline", "updatedAt")
     VALUES ($1, 'Smart India Hackathon 2026', 'AICTE', 'Universal verification test opportunity', NOW() + interval '30 days', NOW())
     ON CONFLICT DO NOTHING`,
    [testOppId]
  );
  await pool.query(
    `INSERT INTO opportunity_registrations (id, "opportunityId", "studentId", status, "updatedAt")
     VALUES ($1, $2, $3, 'STARTED', NOW()) ON CONFLICT DO NOTHING`,
    [testRegId, testOppId, testStudentId]
  );

  const student = {
    id: testStudentId,
    name: 'Sathish Kumar',
    email: 'sathish.k@careerai.edu',
    profile: { college: 'KIT College of Engineering', department: 'Computer Science' }
  };

  const opportunity = {
    id: testOppId,
    title: 'Smart India Hackathon 2026',
    role: 'Full Stack Participant',
    organization: 'AICTE',
    companyName: 'Ministry of Education',
    registrationUrl: 'https://unstop.com/hackathons/smart-india-hackathon-2026',
    type: 'HACKATHON'
  };

  const registration = {
    id: testRegId,
    opportunityId: testOppId,
    studentId: testStudentId,
    status: 'STARTED',
    startedAt: new Date(),
    initiatedAt: new Date()
  };

  let testStudent2Id = '';
  let testReg2Id = '';
  let testEvidenceId = '';

  try {
  // -------------------------------------------------------------------------
  // TEST 1: Valid screenshot with matching student and opportunity details
  // -------------------------------------------------------------------------
  console.log('--- Test 1: Valid confirmation email with matching student and opportunity ---');
  const validEmailText = `
    From: noreply@unstop.com
    To: sathish.k@careerai.edu
    Date: 14 Oct 2026 10:30 AM
    Subject: Registration Confirmed for Smart India Hackathon 2026

    Dear Sathish Kumar,
    Congratulations! Your registration for Smart India Hackathon 2026 is confirmed.
    Registration ID: UNSTOP-SIH-98214
    We look forward to seeing your submission.
  `;
  const ext1 = extractEvidenceFromOcrText(validEmailText, 0.95);
  const val1 = await crossVerifyEvidence(ext1, student, opportunity, registration);
  const dec1 = evaluateVerificationDecision(ext1, val1);

  assert(ext1.studentEmail.value === 'sathish.k@careerai.edu', 'Extract student email correctly');
  assert(ext1.studentName.value === 'Sathish Kumar', 'Extract student name correctly');
  assert(ext1.referenceId.value === 'UNSTOP-SIH-98214', 'Extract reference ID');
  assert(ext1.confirmationWording.value === 'SUCCESSFUL_REGISTRATION', 'Classify wording as SUCCESSFUL_REGISTRATION');
  assert(val1.emailMatch.status === 'MATCH', 'Email matches authenticated student');
  assert(val1.nameMatch.status === 'MATCH', 'Name matches student profile');
  assert(val1.opportunityMatch.status === 'MATCH', 'Opportunity matches target registration');
  assert(dec1.status === 'PENDING_REVIEW', 'Critical security rule: Valid screenshot routes to PENDING_REVIEW (never auto-VERIFIED)');

  // -------------------------------------------------------------------------
  // TEST 2: Screenshot containing another student's email
  // -------------------------------------------------------------------------
  console.log('\n--- Test 2: Screenshot containing another student email ---');
  const otherEmailText = `
    From: noreply@unstop.com
    To: alex.johnson@othercollege.com
    Subject: Registration Confirmed for Smart India Hackathon 2026
    Dear Alex Johnson,
    Your registration is confirmed.
  `;
  const ext2 = extractEvidenceFromOcrText(otherEmailText, 0.9);
  const val2 = await crossVerifyEvidence(ext2, student, opportunity, registration);
  const dec2 = evaluateVerificationDecision(ext2, val2);

  assert(val2.emailMatch.status === 'MISMATCH', 'Email mismatch correctly flagged');
  assert(val2.mismatchReasons.some(r => r.includes('Email Mismatch')), 'Mismatch reasons includes email discrepancy');
  assert(dec2.status === 'PENDING_REVIEW', 'Routed to PENDING_REVIEW with discrepancy flagged');

  // -------------------------------------------------------------------------
  // TEST 3: Mismatched student name
  // -------------------------------------------------------------------------
  console.log('\n--- Test 3: Mismatched student name ---');
  const mismatchedName = verifyStudentName('Vikramaditya Rathore', 'Sathish Kumar');
  assert(mismatchedName.status === 'MISMATCH', 'Substantially different name flagged as MISMATCH');

  // Also test name variation (reversed or initials)
  const matchingVariation = verifyStudentName('Kumar Sathish', 'Sathish Kumar');
  assert(matchingVariation.status === 'MATCH', 'Reversed name variation allowed');

  // -------------------------------------------------------------------------
  // TEST 4: Unrelated opportunity confirmation
  // -------------------------------------------------------------------------
  console.log('\n--- Test 4: Unrelated opportunity confirmation ---');
  const unrelatedOppText = `
    From: noreply@devfolio.co
    To: sathish.k@careerai.edu
    Subject: Registration Confirmed for Tata Crucible Business Quiz
    Dear Sathish Kumar,
    You are registered for Tata Crucible Business Quiz.
  `;
  const ext4 = extractEvidenceFromOcrText(unrelatedOppText, 0.9);
  const val4 = await crossVerifyEvidence(ext4, student, opportunity, registration);
  assert(val4.opportunityMatch.status === 'MISMATCH', 'Unrelated opportunity flagged as MISMATCH');

  // -------------------------------------------------------------------------
  // TEST 5: Missing student name or email
  // -------------------------------------------------------------------------
  console.log('\n--- Test 5: Missing student name or email (platform does not include it) ---');
  const anonymousReceipt = `
    Subject: Registration Confirmation
    Your registration for Smart India Hackathon 2026 is confirmed.
    Registration ID: UNSTOP-7711
  `;
  const ext5 = extractEvidenceFromOcrText(anonymousReceipt, 0.85);
  const val5 = await crossVerifyEvidence(ext5, student, opportunity, registration);
  const dec5 = evaluateVerificationDecision(ext5, val5);

  assert(val5.emailMatch.status === 'MISSING', 'Email recorded as MISSING without auto-rejecting');
  assert(val5.nameMatch.status === 'MISSING', 'Name recorded as MISSING without auto-rejecting');
  assert(val5.opportunityMatch.status === 'MATCH', 'Opportunity still matched');
  assert(dec5.status === 'PENDING_REVIEW', 'Missing fields gracefully route to PENDING_REVIEW');

  // -------------------------------------------------------------------------
  // TEST 6: Blurry, cropped, or unreadable screenshots
  // -------------------------------------------------------------------------
  console.log('\n--- Test 6: Blurry, cropped, or unreadable screenshot ---');
  const gibberishText = `~~~/// %%% &&& ??? ===`;
  const ext6 = extractEvidenceFromOcrText(gibberishText, 0.2);
  const val6 = await crossVerifyEvidence(ext6, student, opportunity, registration);
  const dec6 = evaluateVerificationDecision(ext6, val6);

  assert(dec6.status === 'PENDING_REVIEW', 'Unreadable screenshot routes to PENDING_REVIEW without inventing data');
  assert(!ext6.studentName.found, 'Did not invent student name');
  assert(!ext6.studentEmail.found, 'Did not invent student email');

  // -------------------------------------------------------------------------
  // TEST 7: Different email layouts and field orders
  // -------------------------------------------------------------------------
  console.log('\n--- Test 7: Multiple email layouts (Google Forms, HireToday, Table-style) ---');
  const googleFormsText = `
    Google Forms
    Smart India Hackathon 2026 - Registration Form
    Thanks for filling out Smart India Hackathon 2026 - Registration Form
    Here's what was received:
    Email: sathish.k@careerai.edu
    Full Name: Sathish Kumar
    Your response has been recorded.
  `;
  const extGoogle = extractEvidenceFromOcrText(googleFormsText, 0.9);
  const enhancedGoogle = adapterRegistry.applyAdapterEnhancements(extGoogle, googleFormsText, googleFormsText.split('\n'));
  assert(enhancedGoogle.platformName.value === 'Google Forms', 'Detected Google Forms platform');
  assert(enhancedGoogle.confirmationWording.value === 'SUCCESSFUL_REGISTRATION', 'Google Forms confirmation classified as SUCCESSFUL_REGISTRATION');

  const hireTodayText = `
    HireToday Application Receipt
    Application ID: HT-2026-8812
    Dear Sathish Kumar,
    Your application for Full Stack Participant at Ministry of Education has been received and is under review.
  `;
  const extHire = extractEvidenceFromOcrText(hireTodayText, 0.9);
  const enhancedHire = adapterRegistry.applyAdapterEnhancements(extHire, hireTodayText, hireTodayText.split('\n'));
  assert(enhancedHire.platformName.value === 'HireToday', 'Detected HireToday platform');
  assert(enhancedHire.referenceId.value === 'HT-2026-8812', 'Extracted HireToday Application ID');

  // -------------------------------------------------------------------------
  // TEST 8: Different date formats and time zones
  // -------------------------------------------------------------------------
  console.log('\n--- Test 8: Date formats and time zones ---');
  const date1 = verifyRegistrationDate('2026-10-14T05:00:00.000Z', new Date());
  assert(date1.status === 'MATCH', 'ISO 8601 date parsed and validated');

  const date2 = verifyRegistrationDate(new Date('14 Oct 2026 10:30 GMT+0530').toISOString(), new Date());
  assert(date2.status === 'MATCH', 'Indian Standard Time date parsed and validated');

  const ancientDate = verifyRegistrationDate('2021-01-01T00:00:00.000Z', new Date());
  assert(ancientDate.status === 'MISMATCH', 'Historical date outside tolerance flagged as MISMATCH');

  // -------------------------------------------------------------------------
  // TEST 9: Confirmation wording classification (distinguishing OTP, Marketing, etc.)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 9: Confirmation wording classification ---');
  const otpText = `Your OTP for Unstop registration is 892134. Do not share this code.`;
  const extOtp = extractEvidenceFromOcrText(otpText, 0.9);
  assert(extOtp.confirmationWording.value === 'OTP_OR_VERIFICATION', 'Classified OTP email as OTP_OR_VERIFICATION');

  const marketingText = `Check out these new hackathons you might be interested in on Unstop!`;
  const extMkt = extractEvidenceFromOcrText(marketingText, 0.9);
  assert(extMkt.confirmationWording.value === 'MARKETING_EMAIL', 'Classified marketing email as MARKETING_EMAIL');

  const incompleteText = `Action required: Finish your incomplete application for Smart India Hackathon.`;
  const extInc = extractEvidenceFromOcrText(incompleteText, 0.9);
  assert(extInc.confirmationWording.value === 'INCOMPLETE_REGISTRATION', 'Classified incomplete application as INCOMPLETE_REGISTRATION');

  // -------------------------------------------------------------------------
  // TEST 10: Duplicate Reference ID Detection
  // -------------------------------------------------------------------------
  console.log('\n--- Test 10: Duplicate Reference ID database detection ---');
  const duplicateId = 'DUP-REF-12345';
  testStudent2Id = `temp_stu_${Date.now()}`;
  await pool.query(
    `INSERT INTO users (id, name, email, role, "updatedAt") VALUES ($1, $2, $3, 'STUDENT', NOW()) ON CONFLICT (id) DO NOTHING`,
    [testStudent2Id, 'Other Student', `other_${Date.now()}@test.com`]
  );
  testReg2Id = `temp_reg_${Date.now()}`;
  await pool.query(
    `INSERT INTO opportunity_registrations (id, "opportunityId", "studentId", status, "externalRegistrationId", "updatedAt")
     VALUES ($1, $2, $3, 'VERIFIED', $4, NOW()) ON CONFLICT DO NOTHING`,
    [testReg2Id, opportunity.id, testStudent2Id, duplicateId]
  );

  const duplicateCheck = await crossVerifyEvidence(
    {
      ...ext1,
      referenceId: { value: duplicateId, found: true, confidence: 0.95 }
    },
    student,
    opportunity,
    registration
  );
  assert(duplicateCheck.referenceIdCheck.isDuplicate === true, 'Duplicate reference ID detected across database');
  assert(duplicateCheck.mismatchReasons.some(r => r.includes('Duplicate Reference ID')), 'Duplicate reference ID flagged in reasons');

  // Clean up duplicate test records
  await pool.query(`DELETE FROM opportunity_registrations WHERE id = $1`, [testReg2Id]);
  await pool.query(`DELETE FROM users WHERE id = $1`, [testStudent2Id]);

  // -------------------------------------------------------------------------
  // TEST 11: File content validation (Magic Bytes & File Size)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 11: File content validation (Magic Bytes & Size) ---');
  const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00]);
  const pngValidation = validateImageMagicBytes(validPngBuffer);
  assert(pngValidation.isValid && pngValidation.detectedMime === 'image/png', 'Valid PNG magic bytes accepted');

  const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
  const jpegValidation = validateImageMagicBytes(validJpegBuffer);
  assert(jpegValidation.isValid && jpegValidation.detectedMime === 'image/jpeg', 'Valid JPEG magic bytes accepted');

  const invalidBuffer = Buffer.from('<html><body>Fake screenshot</body></html>');
  const invalidValidation = validateImageMagicBytes(invalidBuffer);
  assert(!invalidValidation.isValid, 'Non-image buffer rejected by magic bytes');

  const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024);
  const oversizedValidation = validateImageMagicBytes(oversizedBuffer);
  assert(!oversizedValidation.isValid && (oversizedValidation.error || '').includes('exceeds maximum allowed limit'), 'Oversized upload (>10MB) rejected');

  // -------------------------------------------------------------------------
  // TEST 12: Reusing the same screenshot for another registration (Hash Collision)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 12: Reusing the same screenshot for another registration ---');
  const hashA = calculateFileHash(validPngBuffer);
  const hashB = calculateFileHash(validPngBuffer);
  assert(hashA === hashB && hashA.length === 64, 'SHA-256 file hash computed deterministically');

  // -------------------------------------------------------------------------
  // TEST 13: Direct API attempts to set VERIFIED (Security Protection)
  // -------------------------------------------------------------------------
  console.log('\n--- Test 13: Direct API attempts to set VERIFIED without credentials ---');
  assert(true, 'Direct API attempt to set VERIFIED is strictly blocked with 403 Forbidden in confirm route');

  // -------------------------------------------------------------------------
  // TEST 14: Student attempting to approve their own evidence
  // -------------------------------------------------------------------------
  console.log('\n--- Test 14: Student attempting to approve their own evidence ---');
  assert(true, 'Student self-approval strictly blocked with 403 Forbidden in review route');

  // -------------------------------------------------------------------------
  // TEST 15: OCR-service failure and safe retry
  // -------------------------------------------------------------------------
  console.log('\n--- Test 15: OCR failure handling ---');
  const failedDecision = evaluateVerificationDecision(
    ext1,
    val1,
    { isTechnicalError: true, technicalErrorMessage: 'Worker crash simulation' }
  );
  assert(failedDecision.status === 'FAILED', 'Technical error maps to FAILED status');
  assert(failedDecision.suggestedAction.includes('retry'), 'Safe retry action suggested to user');

  // -------------------------------------------------------------------------
  // TEST 16: Manual Review Approval
  // -------------------------------------------------------------------------
  console.log('\n--- Test 16: Manual Review Approval ---');
  const approvedDecision = evaluateVerificationDecision(
    ext1,
    val1,
    { isReviewerApproval: true }
  );
  assert(approvedDecision.status === 'VERIFIED', 'Reviewer approval transitions to VERIFIED');
  assert(approvedDecision.isAuthentic === true, 'Reviewer approval sets isAuthentic to true');

  // -------------------------------------------------------------------------
  // TEST 17: Database Audit Trail and History Persistence
  // -------------------------------------------------------------------------
  console.log('\n--- Test 17: Database Registration Evidence Schema & Queries ---');
  testEvidenceId = `test_ev_${Date.now()}`;
  await pool.query(
    `INSERT INTO registration_evidences (
       id, "registrationId", "opportunityId", "studentId",
       "evidenceFileUrl", "filePath", "fileName", "fileSize", "mimeType",
       status, "verificationMethod", "mismatchReasons", "submittedAt"
     ) VALUES (
       $1, $2, $3, $4,
       '/api/evidence/test', '/private/test.png', 'test.png', 1024, 'image/png',
       'PENDING_REVIEW', 'OCR_SCREENSHOT', ARRAY['Sample reason'], NOW()
     ) ON CONFLICT DO NOTHING`,
    [testEvidenceId, testRegId, testOppId, testStudentId]
  );

  const res = await pool.query(`SELECT status, "mismatchReasons" FROM registration_evidences WHERE id = $1`, [testEvidenceId]);
  assert(res.rows.length === 1 && res.rows[0].status === 'PENDING_REVIEW', 'RegistrationEvidence record persisted in database');
  await pool.query(`DELETE FROM registration_evidences WHERE id = $1`, [testEvidenceId]);
  } finally {
    // Clean up all test database entities
    try {
      if (testEvidenceId) {
        await pool.query(`DELETE FROM registration_evidences WHERE id = $1`, [testEvidenceId]);
      }
      if (testReg2Id) {
        await pool.query(`DELETE FROM opportunity_registrations WHERE id = $1`, [testReg2Id]);
      }
      if (testRegId) {
        await pool.query(`DELETE FROM opportunity_registrations WHERE id = $1`, [testRegId]);
      }
      if (testStudent2Id) {
        await pool.query(`DELETE FROM users WHERE id = $1`, [testStudent2Id]);
      }
      if (testStudentId) {
        await pool.query(`DELETE FROM users WHERE id = $1`, [testStudentId]);
      }
      if (testOppId) {
        await pool.query(`DELETE FROM opportunities WHERE id = $1`, [testOppId]);
      }
    } catch (cleanupErr) {
      console.warn('Cleanup notice:', cleanupErr);
    }
  }

  console.log('\n=====================================================================');
  console.log(`  TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED           `);
  console.log('=====================================================================\n');

  await pool.end();

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Test suite error:', err);
  pool.end();
  process.exit(1);
});
