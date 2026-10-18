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

async function runTestSuite() {
  console.log('🧪 Starting Faculty Mentor Profile Comprehensive Test Suite...\n');

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

  // 1. Find a real mentor
  const mentor = await prisma.user.findFirst({
    where: { role: 'MENTOR' },
    include: { profile: true, students: { include: { profile: true } } }
  });

  if (!mentor) {
    throw new Error('No mentor found in database to test.');
  }

  console.log(`📌 Using Mentor: ${mentor.name} (${mentor.email}) with ${mentor.students.length} assigned students.`);

  // 2. Find a student
  const student = await prisma.user.findFirst({
    where: { role: 'STUDENT' },
    include: { profile: true }
  });

  if (!student) {
    throw new Error('No student found in database to test.');
  }

  console.log(`📌 Using Student: ${student.name} (${student.email}) for role-guard verification.\n`);

  const mentorToken = generateToken(mentor);
  const studentToken = generateToken(student);
  const BASE_URL = 'http://localhost:3000';

  // --- TEST GROUP 1: API Authentication & Role Authorization ---
  console.log('--- Test Group 1: Authentication & Role Authorization ---');

  // 1.1 Unauthenticated request returns 401
  try {
    const res = await fetch(`${BASE_URL}/api/mentor/profile`);
    assert(res.status === 401, 'Unauthenticated GET /api/mentor/profile returns 401 Unauthorized');
  } catch (err: any) {
    assert(false, 'Unauthenticated GET /api/mentor/profile returns 401', err.message);
  }

  // 1.2 Student role request returns 403 Forbidden
  try {
    const res = await fetch(`${BASE_URL}/api/mentor/profile`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(res.status === 403, 'Student role request to /api/mentor/profile returns 403 Forbidden');
  } catch (err: any) {
    assert(false, 'Student role request to /api/mentor/profile returns 403', err.message);
  }

  // 1.3 Mentor role request returns 200 OK
  let mentorProfileData: any = null;
  try {
    const res = await fetch(`${BASE_URL}/api/mentor/profile`, {
      headers: { Authorization: `Bearer ${mentorToken}` }
    });
    const json = await res.json();
    mentorProfileData = json.data;
    assert(res.status === 200 && json.success === true, 'Mentor role request to /api/mentor/profile returns 200 OK');
  } catch (err: any) {
    assert(false, 'Mentor role request to /api/mentor/profile returns 200 OK', err.message);
  }

  // --- TEST GROUP 2: Data Integrity & Faculty Fields ---
  console.log('\n--- Test Group 2: Data Integrity & Faculty Sections ---');

  if (mentorProfileData) {
    // 2.1 Personal & Institutional info
    assert(
      mentorProfileData.user.id === mentor.id &&
      mentorProfileData.user.email === mentor.email,
      'Mentor User identity correctly bound to authenticated user'
    );

    // 2.2 Assigned students summary
    const assignedSummary = mentorProfileData.assignedStudentsSummary;
    assert(
      typeof assignedSummary.totalAssigned === 'number' &&
      assignedSummary.totalAssigned === mentor.students.length,
      `Assigned students count matches database records (${assignedSummary.totalAssigned})`
    );

    assert(
      Array.isArray(assignedSummary.departments) &&
      Array.isArray(assignedSummary.years) &&
      Array.isArray(assignedSummary.sections),
      'Assigned student cohorts summary contains departments, years, and sections'
    );

    // 2.3 Dynamic Completion Calculation
    const completion = mentorProfileData.completion;
    assert(
      typeof completion.score === 'number' &&
      completion.score >= 0 &&
      completion.score <= 100,
      `Profile completion score is a valid percentage (${completion.score}%)`
    );

    assert(
      Array.isArray(completion.checklist) && completion.checklist.length === 6,
      'Completion checklist contains all 6 required faculty dimensions'
    );
  }

  // --- TEST GROUP 3: Mentor Profile Update (PUT) & Persistence ---
  console.log('\n--- Test Group 3: Profile Updates & Persistence ---');

  try {
    const testUpdatePayload = {
      name: mentor.name,
      designation: 'Associate Professor & Senior Faculty Mentor',
      department: mentor.profile?.department || 'Artificial Intelligence & Data Science',
      college: 'KIT - Kalaignarkarunanidhi Institute of Technology',
      location: 'Block III, Cabin 304',
      phone: '+91 98765 43210',
      careerObjective: 'Passionate educator committed to guiding students in full-stack engineering, algorithms, and premier placements.',
      highestDegree: 'Ph.D.',
      specialization: 'Artificial Intelligence & Deep Learning',
      institutionName: 'Anna University',
      teachingExperienceYears: '9',
      industryExperienceYears: '4',
      primaryExpertise: 'Machine Learning, Algorithms & System Architecture',
      guidanceAreas: [
        'Resume Preparation & ATS Reviews',
        'Technical Mock Interviews',
        'Placement & Internship Strategy'
      ],
      skills: [
        { name: 'Python', level: 'Expert', isVerified: true },
        { name: 'Data Structures & Algorithms', level: 'Expert', isVerified: true },
        { name: 'AI/ML', level: 'Expert', isVerified: false },
        { name: 'Cloud Architecture', level: 'Advanced', isVerified: false }
      ],
      mentoringMode: 'BOTH',
      availableDays: ['Monday', 'Wednesday', 'Friday'],
      availableTimeSlots: '03:30 PM - 05:00 PM',
      communicationChannel: 'In-Person Office Hours & Microsoft Teams',
      isAvailableForMentoring: true
    };

    const putRes = await fetch(`${BASE_URL}/api/mentor/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mentorToken}`
      },
      body: JSON.stringify(testUpdatePayload)
    });

    const putJson = await putRes.json();
    assert(putRes.status === 200 && putJson.success === true, 'PUT /api/mentor/profile updates successfully');

    // Refetch to verify persistence
    const refetchRes = await fetch(`${BASE_URL}/api/mentor/profile`, {
      headers: { Authorization: `Bearer ${mentorToken}` }
    });
    const refetchJson = await refetchRes.json();
    const updatedData = refetchJson.data;
    const updatedPrefs = updatedData.profile.careerPreferences || {};

    assert(
      updatedPrefs.designation === 'Associate Professor & Senior Faculty Mentor' &&
      updatedPrefs.highestDegree === 'Ph.D.' &&
      updatedPrefs.teachingExperienceYears === '9' &&
      updatedPrefs.primaryExpertise === 'Machine Learning, Algorithms & System Architecture',
      'Updated faculty credentials persisted correctly in database'
    );

    assert(
      updatedData.completion.score >= 80,
      `Refreshed completion score dynamically increased (${updatedData.completion.score}%)`
    );

    // Verify student assignments were NOT changed by mentor profile update
    assert(
      updatedData.assignedStudentsSummary.totalAssigned === mentor.students.length,
      'Protected official student assignments remained intact and unchanged'
    );

  } catch (err: any) {
    assert(false, 'PUT /api/mentor/profile execution error', err.message);
  }

  // --- TEST GROUP 4: Student Profile Isolation ---
  console.log('\n--- Test Group 4: Student Profile Isolation & Compatibility ---');

  try {
    const studentRes = await fetch(`${BASE_URL}/api/profiles/me`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const studentJson = await studentRes.json();
    assert(
      studentRes.status === 200 && studentJson.data && studentJson.data.userId === student.id,
      'Existing student profile API (/api/profiles/me) works completely unaffected'
    );
  } catch (err: any) {
    assert(false, 'Student profile API isolation check', err.message);
  }

  // Summary
  console.log(`\n========================================`);
  console.log(`Test Suite Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTestSuite()
  .catch(err => {
    console.error('Fatal Test Suite Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
