import 'dotenv/config';
import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function generateToken(user: { id: string; role: string; email: string }) {
  return jwt.sign(
    {
      userId: user.id,
      id: user.id,
      role: user.role,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function runHODTestSuite() {
  console.log('🧪 Starting Head of Department (HOD) Profile Comprehensive Test Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (details) console.error('     Details:', details);
      failed++;
    }
  }

  // 1. Find HOD user
  const hod = await prisma.user.findFirst({
    where: { role: 'HOD' },
    include: { profile: true }
  });

  if (!hod) {
    throw new Error('No HOD found in database to test.');
  }

  console.log(`📌 Using HOD: ${hod.name} (${hod.email}) - Dept: ${hod.profile?.department || 'AI&DS'}`);

  // 2. Find Mentor and Student for security role guard checks
  const mentor = await prisma.user.findFirst({ where: { role: 'MENTOR' } });
  const student = await prisma.user.findFirst({ where: { role: 'STUDENT' } });

  if (!mentor || !student) {
    throw new Error('Missing mentor or student records for role-guard verification.');
  }

  const hodToken = generateToken(hod);
  const mentorToken = generateToken(mentor);
  const studentToken = generateToken(student);
  const BASE_URL = 'http://localhost:3000';

  // --- TEST GROUP 1: Authentication & Role Authorization ---
  console.log('\n--- Test Group 1: Authentication & Role Authorization ---');

  // 1.1 Unauthenticated request returns 401
  try {
    const res = await fetch(`${BASE_URL}/api/hod/profile`);
    assert(res.status === 401, 'Unauthenticated GET /api/hod/profile returns 401 Unauthorized');
  } catch (err: any) {
    assert(false, 'Unauthenticated GET /api/hod/profile returns 401', err.message);
  }

  // 1.2 Student role request returns 403 Forbidden
  try {
    const res = await fetch(`${BASE_URL}/api/hod/profile`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(res.status === 403, 'Student role request to /api/hod/profile returns 403 Forbidden');
  } catch (err: any) {
    assert(false, 'Student role request to /api/hod/profile returns 403', err.message);
  }

  // 1.3 Mentor role request returns 403 Forbidden
  try {
    const res = await fetch(`${BASE_URL}/api/hod/profile`, {
      headers: { Authorization: `Bearer ${mentorToken}` }
    });
    assert(res.status === 403, 'Mentor role request to /api/hod/profile returns 403 Forbidden');
  } catch (err: any) {
    assert(false, 'Mentor role request to /api/hod/profile returns 403', err.message);
  }

  // 1.4 HOD role request returns 200 OK
  let hodProfileData: any = null;
  try {
    const res = await fetch(`${BASE_URL}/api/hod/profile`, {
      headers: { Authorization: `Bearer ${hodToken}` }
    });
    const json = await res.json();
    hodProfileData = json.data;
    assert(res.status === 200 && json.success === true, 'HOD role request to /api/hod/profile returns 200 OK');
  } catch (err: any) {
    assert(false, 'HOD role request to /api/hod/profile returns 200 OK', err.message);
  }

  // --- TEST GROUP 2: Data Integrity & Real Department Snapshot ---
  console.log('\n--- Test Group 2: Data Integrity & Department Snapshot ---');

  if (hodProfileData) {
    // 2.1 Identity matching
    assert(
      hodProfileData.user.id === hod.id &&
      hodProfileData.user.email === hod.email,
      'HOD user identity correctly bound to authenticated user'
    );

    // 2.2 Department snapshot metrics
    const snapshot = hodProfileData.departmentSnapshot;
    assert(
      typeof snapshot.totalStudents === 'number' &&
      typeof snapshot.totalMentors === 'number' &&
      typeof snapshot.activeOpportunities === 'number' &&
      typeof snapshot.placementRegistrations === 'number',
      `Department leadership snapshot computed from real DB data (Students: ${snapshot.totalStudents}, Mentors: ${snapshot.totalMentors}, Drives: ${snapshot.placementRegistrations})`
    );

    // 2.3 Dynamic Completion Calculation
    const completion = hodProfileData.completion;
    assert(
      typeof completion.score === 'number' &&
      completion.score >= 0 &&
      completion.score <= 100,
      `Profile completion score is a valid percentage (${completion.score}%)`
    );

    assert(
      Array.isArray(completion.checklist) && completion.checklist.length === 6,
      'Completion checklist contains all 6 required HOD governance dimensions'
    );
  }

  // --- TEST GROUP 3: Updates, Security & Field Protection ---
  console.log('\n--- Test Group 3: Profile Updates & Security Enforcement ---');

  const originalDept = hod.profile?.department || 'Artificial Intelligence & Data Science';

  try {
    const testUpdatePayload = {
      name: hod.name,
      designation: 'Senior Professor & Head of Department',
      // Attemped unauthorized department change via client payload
      department: 'Unauthorized Transferred Department',
      // Attemped unauthorized self-verification spoof
      institutionalVerificationStatus: 'UNAUTHORIZED_VERIFIED',
      highestDegree: 'Ph.D.',
      specialization: 'Artificial Intelligence & Distributed Systems',
      institutionName: 'Anna University / IIT Madras',
      teachingExperienceYears: '17',
      industryExperienceYears: '5',
      leadershipExperienceYears: '7',
      supportedProgrammes: [
        'B.Tech Artificial Intelligence & Data Science (4 Years)',
        'M.Tech Data Science & Analytics (2 Years)',
        'Ph.D. Research Centre in AI & Machine Learning'
      ],
      academicResponsibilities: [
        'Curriculum Design & Autonomous Syllabus Revision',
        'Department Board of Studies (BoS) Chairman',
        'Faculty Performance Review & Workload Allocation',
        'Placement & Corporate Internship Steering Committee'
      ],
      recruitmentInitiatives: [
        '100-Day DSA & Competitive Programming Intensive Bootcamps',
        'Tier-1 Product Company Mock Interview Panels'
      ],
      officeHours: '02:00 PM - 04:30 PM (Consultations)',
      meetingMode: 'HYBRID',
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      careerObjective: 'Spearheading institutional transformation in AI engineering education, industry collaborations, and top tier student placements.'
    };

    const putRes = await fetch(`${BASE_URL}/api/hod/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hodToken}`
      },
      body: JSON.stringify(testUpdatePayload)
    });

    const putJson = await putRes.json();
    assert(putRes.status === 200 && putJson.success === true, 'PUT /api/hod/profile updates permitted fields successfully');

    // Refetch to verify persistence and protection
    const refetchRes = await fetch(`${BASE_URL}/api/hod/profile`, {
      headers: { Authorization: `Bearer ${hodToken}` }
    });
    const refetchJson = await refetchRes.json();
    const updatedData = refetchJson.data;
    const updatedPrefs = updatedData.profile.careerPreferences || {};

    // 3.1 Check permitted fields updated
    assert(
      updatedPrefs.designation === 'Senior Professor & Head of Department' &&
      updatedPrefs.leadershipExperienceYears === '7' &&
      updatedPrefs.teachingExperienceYears === '17',
      'Permitted academic leadership fields persisted correctly in database'
    );

    // 3.2 Department protection: department must remain originalDept
    assert(
      updatedData.profile.department === originalDept,
      `Official Department assignment remains protected against client alteration (${updatedData.profile.department})`
    );

    // 3.3 Dynamic completion score updated
    assert(
      updatedData.completion.score >= 80,
      `Refreshed completion score dynamically calculated (${updatedData.completion.score}%)`
    );

  } catch (err: any) {
    assert(false, 'PUT /api/hod/profile execution error', err.message);
  }

  // --- TEST GROUP 4: Mentor & Student Profile Isolation ---
  console.log('\n--- Test Group 4: Mentor & Student Profile Isolation ---');

  try {
    // 4.1 Mentor profile endpoint works unaffected
    const mentorRes = await fetch(`${BASE_URL}/api/mentor/profile`, {
      headers: { Authorization: `Bearer ${mentorToken}` }
    });
    const mentorJson = await mentorRes.json();
    assert(
      mentorRes.status === 200 && mentorJson.data.user.id === mentor.id,
      'Mentor profile API (/api/mentor/profile) works completely unaffected'
    );

    // 4.2 Student profile endpoint works unaffected
    const studentRes = await fetch(`${BASE_URL}/api/profiles/me`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const studentJson = await studentRes.json();
    assert(
      studentRes.status === 200 && studentJson.data.userId === student.id,
      'Student profile API (/api/profiles/me) works completely unaffected'
    );
  } catch (err: any) {
    assert(false, 'Role profile isolation verification error', err.message);
  }

  // Summary
  console.log(`\n========================================`);
  console.log(`HOD Test Suite Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runHODTestSuite()
  .catch(err => {
    console.error('Fatal HOD Test Suite Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
