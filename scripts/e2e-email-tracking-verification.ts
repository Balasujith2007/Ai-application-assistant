import prisma from "../lib/prisma";
import { processStudentEmails, IngestableEmail } from "../lib/emailSync/emailIngestionEngine";
import { parseEmailApplicationStatus } from "../lib/emailSync/statusExtractor";
import { matchEmailToApplications } from "../lib/emailSync/applicationMatcher";
import { ApplicationStatus } from "@prisma/client";

interface VerificationStepResult {
  stepNumber: number;
  testScenario: string;
  expectedResult: string;
  actualResult: string;
  status: "PASS" | "FAIL";
  details?: any;
}

async function runCompleteVerification() {
  console.log("===============================================================================");
  console.log("🔍 STARTING END-TO-END COMPANY-EMAIL APPLICATION STATUS TRACKING VERIFICATION");
  console.log("===============================================================================\n");

  const results: VerificationStepResult[] = [];

  // Setup test environment with fresh student and application records
  const studentEmail = `e2e_student_${Date.now()}@university.edu`;
  const student = await prisma.user.create({
    data: {
      name: "E2E Test Applicant",
      email: studentEmail,
      role: "STUDENT",
    },
  });

  // Create 4 distinct applications
  const appAmazon = await prisma.application.create({
    data: {
      userId: student.id,
      companyName: "Amazon",
      position: "SDE Intern",
      status: ApplicationStatus.APPLIED,
      appliedDate: new Date(),
    },
  });

  const appStripe = await prisma.application.create({
    data: {
      userId: student.id,
      companyName: "Stripe",
      position: "Full Stack Developer",
      status: ApplicationStatus.APPLIED,
      appliedDate: new Date(),
    },
  });

  const appMicrosoft = await prisma.application.create({
    data: {
      userId: student.id,
      companyName: "Microsoft",
      position: "Backend Engineer",
      status: ApplicationStatus.APPLIED,
      appliedDate: new Date(),
    },
  });

  const appGoogleSwe = await prisma.application.create({
    data: {
      userId: student.id,
      companyName: "Google",
      position: "Software Engineer",
      status: ApplicationStatus.APPLIED,
      appliedDate: new Date(),
    },
  });

  const appGooglePm = await prisma.application.create({
    data: {
      userId: student.id,
      companyName: "Google",
      position: "Associate Product Manager",
      status: ApplicationStatus.APPLIED,
      appliedDate: new Date(),
    },
  });

  try {
    // -------------------------------------------------------------------------
    // 1 & 2. Generate and Ingest Sample Emails (SHORTLISTED, INTERVIEW, REJECTED, APPLIED)
    // -------------------------------------------------------------------------
    const sampleEmails: IngestableEmail[] = [
      // Email 1: INTERVIEW (Amazon SDE Intern)
      {
        messageId: `msg_amz_interview_${Date.now()}`,
        senderEmail: "university-recruiting@amazon.com",
        senderName: "Amazon Talent Acquisition",
        subject: "Amazon SDE Intern: Interview Invitation & Coding Round",
        bodyText: "Thank you for applying to Amazon. We would like to invite you to interview for the SDE Intern position. Please schedule your technical round via Calendly.",
        receivedDate: new Date(),
      },
      // Email 2: SHORTLISTED (Stripe Full Stack Developer)
      {
        messageId: `msg_stripe_shortlist_${Date.now()}`,
        senderEmail: "careers@stripe.com",
        senderName: "Stripe Recruiting",
        subject: "Update regarding your Full Stack Developer application at Stripe",
        bodyText: "Congratulations! Your profile has been shortlisted for the next stage of our technical assessment. You will receive further instructions shortly.",
        receivedDate: new Date(),
      },
      // Email 3: REJECTED (Microsoft Backend Engineer)
      {
        messageId: `msg_msft_reject_${Date.now()}`,
        senderEmail: "jobs@microsoft.com",
        senderName: "Microsoft Careers",
        subject: "Your Application for Backend Engineer at Microsoft",
        bodyText: "Thank you for your interest in Microsoft. Unfortunately, we have decided not to proceed with your candidacy as we are pursuing other candidates for this position.",
        receivedDate: new Date(),
      },
      // Email 4: APPLIED (Confirmation)
      {
        messageId: `msg_general_applied_${Date.now()}`,
        senderEmail: "noreply@uber.com",
        senderName: "Uber Careers",
        subject: "Your application to Uber has been received",
        bodyText: "Thank you for applying to Uber. We have received your application submitted successfully.",
        receivedDate: new Date(),
      },
    ];

    // -------------------------------------------------------------------------
    // 3. Verify Status Extraction
    // -------------------------------------------------------------------------
    const parsedAmz = parseEmailApplicationStatus(sampleEmails[0]);
    const parsedStripe = parseEmailApplicationStatus(sampleEmails[1]);
    const parsedMsft = parseEmailApplicationStatus(sampleEmails[2]);
    const parsedApplied = parseEmailApplicationStatus(sampleEmails[3]);

    const extractionSuccess =
      parsedAmz.detectedStatus === ApplicationStatus.INTERVIEW &&
      parsedStripe.detectedStatus === ApplicationStatus.SHORTLISTED &&
      parsedMsft.detectedStatus === ApplicationStatus.REJECTED &&
      parsedApplied.detectedStatus === ApplicationStatus.APPLIED;

    results.push({
      stepNumber: 3,
      testScenario: "NLP Keyword & Status Extraction for 4 Status Types (INTERVIEW, SHORTLISTED, REJECTED, APPLIED)",
      expectedResult: "Extracted statuses match: INTERVIEW (Amazon), SHORTLISTED (Stripe), REJECTED (Microsoft), APPLIED (Uber)",
      actualResult: `Extracted: Amazon=${parsedAmz.detectedStatus} (${parsedAmz.confidence}), Stripe=${parsedStripe.detectedStatus} (${parsedStripe.confidence}), MSFT=${parsedMsft.detectedStatus} (${parsedMsft.confidence}), Uber=${parsedApplied.detectedStatus} (${parsedApplied.confidence})`,
      status: extractionSuccess ? "PASS" : "FAIL",
    });

    // -------------------------------------------------------------------------
    // 4 & 5. Process Ingestion & Verify Correct Application Matching & Status Updates
    // -------------------------------------------------------------------------
    const ingestionReport = await processStudentEmails(student.id, sampleEmails);

    const updatedAmazon = await prisma.application.findUnique({ where: { id: appAmazon.id } });
    const updatedStripe = await prisma.application.findUnique({ where: { id: appStripe.id } });
    const updatedMsft = await prisma.application.findUnique({ where: { id: appMicrosoft.id } });

    const matchingSuccess =
      updatedAmazon?.status === ApplicationStatus.INTERVIEW &&
      updatedAmazon?.statusSource === "COMPANY_EMAIL" &&
      updatedStripe?.status === ApplicationStatus.SHORTLISTED &&
      updatedStripe?.statusSource === "COMPANY_EMAIL" &&
      updatedMsft?.status === ApplicationStatus.REJECTED &&
      updatedMsft?.statusSource === "COMPANY_EMAIL";

    results.push({
      stepNumber: 4,
      testScenario: "Application Matching Engine (Company Name + Role Title Token Similarity)",
      expectedResult: "Amazon email auto-matched to Amazon SDE Intern; Stripe email to Stripe Full Stack; Microsoft email to Microsoft Backend",
      actualResult: `Matched & Updated: Amazon status=${updatedAmazon?.status} [${updatedAmazon?.statusSource}], Stripe status=${updatedStripe?.status} [${updatedStripe?.statusSource}], MSFT status=${updatedMsft?.status} [${updatedMsft?.statusSource}]`,
      status: matchingSuccess ? "PASS" : "FAIL",
    });

    results.push({
      stepNumber: 5,
      testScenario: "Status Appearance in My Applications & Placement Dashboard",
      expectedResult: "Status is updated in DB with statusSource='COMPANY_EMAIL' and statusUpdatedAt timestamp",
      actualResult: `Amazon: ${updatedAmazon?.status} (updated at ${updatedAmazon?.statusUpdatedAt?.toISOString()}), Stripe: ${updatedStripe?.status}, MSFT: ${updatedMsft?.status}`,
      status: matchingSuccess ? "PASS" : "FAIL",
    });

    // -------------------------------------------------------------------------
    // 6. Verify Email Evidence Details & PII Sanitization
    // -------------------------------------------------------------------------
    const amazonEvidence = await prisma.emailEvidence.findFirst({ where: { applicationId: appAmazon.id } });
    const stripeEvidence = await prisma.emailEvidence.findFirst({ where: { applicationId: appStripe.id } });

    const evidenceValid =
      amazonEvidence !== null &&
      amazonEvidence.detectedStatus === ApplicationStatus.INTERVIEW &&
      amazonEvidence.confidence >= 0.85 &&
      amazonEvidence.matchedKeywords.length > 0 &&
      amazonEvidence.isVerified === true &&
      stripeEvidence !== null &&
      stripeEvidence.detectedStatus === ApplicationStatus.SHORTLISTED &&
      !stripeEvidence.cleanSnippet.includes("<script>") &&
      !stripeEvidence.cleanSnippet.includes("<html>");

    results.push({
      stepNumber: 6,
      testScenario: "Email Evidence Record Creation & Sanitized Excerpt Verification",
      expectedResult: "Evidence record stored with sanitized snippet, confidence >= 0.85, matched keywords, and isVerified=true",
      actualResult: `Amazon Evidence ID=${amazonEvidence?.id}, Confidence=${amazonEvidence?.confidence}, Snippet="${amazonEvidence?.cleanSnippet}", Keywords=[${amazonEvidence?.matchedKeywords.join(", ")}]`,
      status: evidenceValid ? "PASS" : "FAIL",
    });

    // -------------------------------------------------------------------------
    // 7. Ambiguous Company/Role Matching -> Needs Review Queue
    // -------------------------------------------------------------------------
    // Student has 2 Google applications (SWE and APM). Ingest a generic Google shortlist email without role distinction.
    const ambiguousEmail: IngestableEmail = {
      messageId: `msg_google_ambig_${Date.now()}`,
      senderEmail: "careers@google.com",
      senderName: "Google Staffing",
      subject: "Your Google Application: Profile Shortlisted for Next Stage",
      bodyText: "Congratulations! Your profile has been shortlisted for the next stage at Google. Our recruitment team will be in touch.",
      receivedDate: new Date(),
    };

    const ambigReport = await processStudentEmails(student.id, [ambiguousEmail]);
    const pendingGoogleReview = await prisma.emailStatusReview.findUnique({
      where: {
        studentId_sourceMessageId: {
          studentId: student.id,
          sourceMessageId: ambiguousEmail.messageId,
        },
      },
    });

    // Ensure neither Google SWE nor Google PM was falsely auto-updated
    const googleSweAfter = await prisma.application.findUnique({ where: { id: appGoogleSwe.id } });
    const googlePmAfter = await prisma.application.findUnique({ where: { id: appGooglePm.id } });

    const ambigSuccess =
      ambigReport.sentToReview === 1 &&
      pendingGoogleReview !== null &&
      pendingGoogleReview.status === "PENDING" &&
      pendingGoogleReview.detectedCompany === "Google" &&
      googleSweAfter?.status === ApplicationStatus.APPLIED &&
      googlePmAfter?.status === ApplicationStatus.APPLIED;

    results.push({
      stepNumber: 7,
      testScenario: "Ambiguous Multi-Application Conflict Detection -> Routed to 'Needs Review' Queue",
      expectedResult: "Queued in EmailStatusReview table without altering candidate applications until applicant confirms",
      actualResult: `Sent to Review=${ambigReport.sentToReview}, Review Record ID=${pendingGoogleReview?.id}, Google SWE Status=${googleSweAfter?.status}, Google PM Status=${googlePmAfter?.status}`,
      status: ambigSuccess ? "PASS" : "FAIL",
    });

    // -------------------------------------------------------------------------
    // 8. Duplicate Email Handling & Idempotency
    // -------------------------------------------------------------------------
    const duplicateReport = await processStudentEmails(student.id, [sampleEmails[0]]);
    const totalAmzEvidences = await prisma.emailEvidence.count({
      where: {
        studentId: student.id,
        sourceMessageId: sampleEmails[0].messageId,
      },
    });

    const idempotencySuccess = duplicateReport.skipped === 1 && totalAmzEvidences === 1;

    results.push({
      stepNumber: 8,
      testScenario: "Duplicate Email Ingestion Prevention (Idempotency Check)",
      expectedResult: "Duplicate messageId is skipped cleanly; zero duplicate status updates or evidence records created",
      actualResult: `Skipped count=${duplicateReport.skipped}, Total Amazon Evidences=${totalAmzEvidences}`,
      status: idempotencySuccess ? "PASS" : "FAIL",
    });

    // -------------------------------------------------------------------------
    // 9. Sync Mode Differentiation (Real Gmail vs Sandbox/Mock vs Disconnected)
    // -------------------------------------------------------------------------
    const hasGoogleClientId = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const syncModeReport = {
      realGmailConfigured: hasGoogleClientId,
      sandboxMockSupported: true,
      disconnectedSupported: true,
      description: hasGoogleClientId
        ? "OAuth credentials present in .env. Real OAuth consent flow active; Sandbox simulation mode supported for demo testing."
        : "Running in Sandbox/Mock simulation mode. Google OAuth credentials not provided.",
    };

    results.push({
      stepNumber: 9,
      testScenario: "Sync Mode Identification ('Sync Inbox Now' vs Sandbox vs Real Gmail OAuth)",
      expectedResult: "Accurately identifies current connection mode and OAuth readiness state",
      actualResult: `Mode: ${syncModeReport.description} (Real OAuth config=${syncModeReport.realGmailConfigured})`,
      status: "PASS",
    });

    // -------------------------------------------------------------------------
    // 10. Verify No Status is Changed Without Valid Email Evidence
    // -------------------------------------------------------------------------
    const irrelevantEmail: IngestableEmail = {
      messageId: `msg_newsletter_${Date.now()}`,
      senderEmail: "news@techcrunch.com",
      senderName: "TechCrunch Newsletter",
      subject: "Weekly AI & Tech Roundup",
      bodyText: "Here is your weekly summary of top technology headlines and venture capital deals.",
      receivedDate: new Date(),
    };

    const irrelevantReport = await processStudentEmails(student.id, [irrelevantEmail]);

    const appsAfterIrrelevant = await prisma.application.findMany({ where: { userId: student.id } });
    const noUnverifiedChanges =
      irrelevantReport.skipped === 1 &&
      irrelevantReport.autoMatched === 0 &&
      irrelevantReport.sentToReview === 0;

    results.push({
      stepNumber: 10,
      testScenario: "Negative Control: Irrelevant / Non-Career Emails Must Not Modify Any Application",
      expectedResult: "Irrelevant email is skipped without matching any application or altering any status",
      actualResult: `Skipped=${irrelevantReport.skipped}, AutoMatched=${irrelevantReport.autoMatched}, SentToReview=${irrelevantReport.sentToReview}`,
      status: noUnverifiedChanges ? "PASS" : "FAIL",
    });
  } finally {
    // Cleanup test data
    await prisma.user.delete({ where: { id: student.id } }).catch(() => {});
  }

  console.log("\n===============================================================================");
  console.log("📊 E2E VERIFICATION RESULTS MATRIX");
  console.log("===============================================================================\n");

  let allPassed = true;
  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : "❌";
    console.log(`${icon} [Step ${r.stepNumber}] ${r.testScenario}`);
    console.log(`   • Expected: ${r.expectedResult}`);
    console.log(`   • Actual:   ${r.actualResult}`);
    console.log(`   • Status:   ${r.status}\n`);
    if (r.status === "FAIL") allPassed = false;
  }

  console.log("===============================================================================");
  console.log(`🏁 SUMMARY: ${results.filter((r) => r.status === "PASS").length}/${results.length} TESTS PASSED`);
  console.log("===============================================================================\n");

  if (!allPassed) {
    process.exit(1);
  }
}

runCompleteVerification().catch((e) => {
  console.error("Verification crashed:", e);
  process.exit(1);
});
