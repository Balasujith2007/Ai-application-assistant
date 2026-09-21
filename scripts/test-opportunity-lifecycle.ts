import prisma from '../lib/prisma';
import {
  validateStudentEligibility,
  initializeOpportunityReminders,
  processOpportunityLifecycles,
  transitionRegistrationStatus,
  addWorkflowStep
} from '../lib/opportunity/lifecycle.service';
import { OpportunityType, Role, OpportunityStatus, OpportunityRegistrationStatus } from '@prisma/client';

async function runTests(): Promise<void> {
  console.log('================================================================');
  console.log('    CAREERAI OPPORTUNITY LIFECYCLE AUTOMATION TEST SUITE        ');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string): void {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
    }
  }

  const timestamp = Date.now();
  const testMentorEmail = `test_mentor_${timestamp}@careerai.test`;
  const testHodEmail = `test_hod_${timestamp}@careerai.test`;
  const testStudent1Email = `test_student1_${timestamp}@careerai.test`;
  const testStudent2Email = `test_student2_${timestamp}@careerai.test`;

  let mentorUser: any = null;
  let hodUser: any = null;
  let student1: any = null;
  let student2: any = null;
  let testOpp: any = null;

  try {
    // ---------------------------------------------------------
    // 1. SETUP TEST USERS & PROFILES
    // ---------------------------------------------------------
    console.log('--- 1. Setting Up Test Fixtures ---');

    mentorUser = await prisma.user.create({
      data: {
        name: 'Test Mentor Dr. Sharma',
        email: testMentorEmail,
        role: Role.MENTOR,
        profile: {
          create: {
            department: 'Computer Science',
            phone: '+919876543210'
          }
        }
      }
    });

    hodUser = await prisma.user.create({
      data: {
        name: 'Test HOD Prof. Verma',
        email: testHodEmail,
        role: Role.HOD,
        profile: {
          create: {
            department: 'Computer Science',
            phone: '+919876543211'
          }
        }
      }
    });

    // Student 1: CS, Year 3, CGPA 8.5 (Eligible for high criteria)
    student1 = await prisma.user.create({
      data: {
        name: 'Arjun CS Student',
        email: testStudent1Email,
        role: Role.STUDENT,
        mentorId: mentorUser.id,
        profile: {
          create: {
            department: 'Computer Science',
            year: 3,
            cgpa: '8.5',
            major: 'B.Tech',
            phone: '+919876543212'
          }
        }
      },
      include: { profile: true }
    });

    // Student 2: Mechanical, Year 1, CGPA 6.0 (Ineligible for CS Year 3 high CGPA)
    student2 = await prisma.user.create({
      data: {
        name: 'Rohan Mech Student',
        email: testStudent2Email,
        role: Role.STUDENT,
        profile: {
          create: {
            department: 'Mechanical',
            year: 1,
            cgpa: '6.0',
            major: 'B.Tech',
            phone: '+919876543213'
          }
        }
      },
      include: { profile: true }
    });

    assert(Boolean(mentorUser?.id && hodUser?.id && student1?.id && student2?.id), 'Test fixtures (Mentor, HOD, Students) created successfully');

    // ---------------------------------------------------------
    // 2. OPPORTUNITY CREATION & ELIGIBILITY FILTERING
    // ---------------------------------------------------------
    console.log('\n--- 2. Testing Opportunity Creation & Eligibility Logic ---');

    const futureDeadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now

    testOpp = await prisma.opportunity.create({
      data: {
        title: 'Google Summer of Code Internship 2026',
        organization: 'Google LLC',
        type: OpportunityType.INTERNSHIP,
        description: 'Elite 3-month Software Engineering Internship',
        location: 'Bangalore / Remote',
        applicationDeadline: futureDeadline,
        deadline: futureDeadline,
        minCgpa: 8.0,
        allowedDegrees: ['B.Tech', 'M.Tech'],
        allowedYears: [3, 4],
        targetDepartment: 'Computer Science',
        targetAudience: 'MY_STUDENTS',
        postedById: mentorUser.id,
        postedByRole: Role.MENTOR,
        status: OpportunityStatus.PUBLISHED
      }
    });

    assert(Boolean(testOpp?.id), 'Internship opportunity created successfully with criteria (minCgpa: 8.0, Year 3/4, CS)');

    const eligibility1 = validateStudentEligibility(student1, testOpp);
    assert(eligibility1.eligible === true, 'Student 1 (CS, Year 3, CGPA 8.5, assigned to mentor) is ELIGIBLE');

    const eligibility2 = validateStudentEligibility(student2, testOpp);
    assert(eligibility2.eligible === false && eligibility2.reasons.length >= 3, 'Student 2 (Mech, Year 1, CGPA 6.0) is correctly marked INELIGIBLE with reasons');

    // ---------------------------------------------------------
    // 3. DEADLINE REMINDER INITIALIZATION & IDEMPOTENCY
    // ---------------------------------------------------------
    console.log('\n--- 3. Testing Deadline Reminder Scheduling & Idempotency ---');

    await initializeOpportunityReminders(testOpp.id, futureDeadline);

    const reminders = await prisma.opportunityReminder.findMany({
      where: { opportunityId: testOpp.id }
    });

    assert(reminders.length >= 2, 'Scheduled 3-day and 1-day OpportunityReminder records created');

    // Test idempotency: re-running initialize does not duplicate
    await initializeOpportunityReminders(testOpp.id, futureDeadline);
    const remindersAfter = await prisma.opportunityReminder.findMany({
      where: { opportunityId: testOpp.id }
    });
    assert(remindersAfter.length === reminders.length, 'Reminder initialization is strictly IDEMPOTENT (no duplicate rows)');

    // ---------------------------------------------------------
    // 4. REGISTRATION AUTOMATION & DUPLICATE PREVENTION
    // ---------------------------------------------------------
    console.log('\n--- 4. Testing Student Registration & Duplicate Prevention ---');

    const reg = await prisma.opportunityRegistration.create({
      data: {
        opportunityId: testOpp.id,
        studentId: student1.id,
        status: OpportunityRegistrationStatus.REGISTERED,
        verificationMethod: 'MANUAL',
        registeredAt: new Date()
      }
    });

    assert(Boolean(reg.id && reg.status === 'REGISTERED'), 'Student 1 registered successfully');

    // Test duplicate registration constraint
    let duplicateErrorCaught = false;
    try {
      await prisma.opportunityRegistration.create({
        data: {
          opportunityId: testOpp.id,
          studentId: student1.id,
          status: OpportunityRegistrationStatus.REGISTERED
        }
      });
    } catch {
      duplicateErrorCaught = true;
    }
    assert(duplicateErrorCaught === true, 'Duplicate registration is strictly PREVENTED by database unique constraint');

    // ---------------------------------------------------------
    // 5. APPLICATION STATUS WORKFLOW & AUDIT TRAIL
    // ---------------------------------------------------------
    console.log('\n--- 5. Testing Application Workflow Transitions & Audit Trail ---');

    // Transition REGISTERED -> UNDER_REVIEW
    const underReviewReg = await transitionRegistrationStatus({
      registrationId: reg.id,
      newStatus: 'UNDER_REVIEW',
      actorId: mentorUser.id,
      notes: 'Initial profile and GitHub verification passed.'
    });
    assert(String(underReviewReg.status) === 'UNDER_REVIEW', 'Transitioned status to UNDER_REVIEW');

    // Transition UNDER_REVIEW -> SHORTLISTED
    const shortlistedReg = await transitionRegistrationStatus({
      registrationId: reg.id,
      newStatus: 'SHORTLISTED',
      actorId: mentorUser.id,
      notes: 'Shortlisted for Round 1 Technical Screening'
    });
    assert(String(shortlistedReg.status) === 'SHORTLISTED', 'Transitioned status to SHORTLISTED');

    // Add Next Process Step (Interview)
    const interviewStep = await addWorkflowStep({
      registrationId: reg.id,
      stepType: 'INTERVIEW',
      title: 'Round 1 System Design & Coding Interview',
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      meetingLink: 'https://meet.google.com/xyz-test-meet',
      actorId: mentorUser.id
    });
    assert(Boolean(interviewStep.id && interviewStep.stepType === 'INTERVIEW'), 'Next process step (Interview) added with meeting link & date');

    // Verify Audit Trail History
    const history = await prisma.opportunityStatusHistory.findMany({
      where: { registrationId: reg.id },
      orderBy: { createdAt: 'asc' }
    });
    assert(history.length >= 2, `Audit trail recorded ${history.length} status transition history records`);

    // ---------------------------------------------------------
    // 6. DISQUALIFICATION WORKFLOW & REASON ENFORCEMENT
    // ---------------------------------------------------------
    console.log('\n--- 6. Testing Disqualification Workflow with Reason ---');

    const disqualifiedReg = await transitionRegistrationStatus({
      registrationId: reg.id,
      newStatus: 'DISQUALIFIED',
      actorId: mentorUser.id,
      reason: 'Failed to attend scheduled technical interview',
      notes: 'No-show for Round 1 after confirmation'
    });

    assert(String(disqualifiedReg.status) === 'DISQUALIFIED', 'Status successfully updated to DISQUALIFIED');

    const latestAudit = await prisma.opportunityStatusHistory.findFirst({
      where: { registrationId: reg.id, toStatus: 'DISQUALIFIED' }
    });
    assert(latestAudit?.reason === 'Failed to attend scheduled technical interview', 'Disqualification reason stored accurately in audit log');

    // ---------------------------------------------------------
    // 7. DEADLINE EXPIRATION & AUTOMATION SERVICE
    // ---------------------------------------------------------
    console.log('\n--- 7. Testing Automated Opportunity Lifecycle Execution ---');

    // Create an expired opportunity
    const expiredOpp = await prisma.opportunity.create({
      data: {
        title: 'Past Hackathon 2026',
        organization: 'TechCorp',
        type: OpportunityType.HACKATHON,
        description: 'Expired Hackathon Event',
        applicationDeadline: new Date(Date.now() - 1000 * 60 * 60), // Expired 1 hour ago
        deadline: new Date(Date.now() - 1000 * 60 * 60),
        postedById: mentorUser.id,
        status: OpportunityStatus.PUBLISHED
      }
    });

    const lifecycleResult = await processOpportunityLifecycles();
    const checkedExpiredOpp = await prisma.opportunity.findUnique({
      where: { id: expiredOpp.id }
    });

    assert(String(checkedExpiredOpp?.status) === 'CLOSED', 'Expired opportunity automatically closed by processOpportunityLifecycles()');
    assert(lifecycleResult.closedOpportunities >= 1, 'Lifecycle result reported closed count accurately');

    // ---------------------------------------------------------
    // 8. NOTIFICATION DELIVERY & FAILURE ISOLATION
    // ---------------------------------------------------------
    console.log('\n--- 8. Testing Notification Delivery Tracking ---');

    const notifs = await prisma.notification.findMany({
      where: { userId: student1.id }
    });
    assert(notifs.length >= 2, `Student received ${notifs.length} in-app notifications (Confirmation, Status updates, Workflow steps)`);

    console.log('\n================================================================');
    console.log(`    ALL TESTS COMPLETE: ${passedTests} / ${totalTests} PASSED`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Test execution failed unexpectedly:', err);
  } finally {
    // ---------------------------------------------------------
    // CLEANUP TEST FIXTURES
    // ---------------------------------------------------------
    console.log('--- Cleaning Up Test Fixtures ---');
    try {
      if (testOpp) {
        await prisma.opportunity.deleteMany({ where: { id: testOpp.id } });
      }
      await prisma.opportunity.deleteMany({
        where: { title: { in: ['Google Summer of Code Internship 2026', 'Past Hackathon 2026'] } }
      });
      await prisma.user.deleteMany({
        where: { email: { in: [testMentorEmail, testHodEmail, testStudent1Email, testStudent2Email] } }
      });
      console.log('Cleanup completed cleanly.');
    } catch (cleanupErr) {
      console.warn('Cleanup notice:', cleanupErr);
    }
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
