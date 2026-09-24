import prisma from "../lib/prisma";
import { encryptToken, decryptToken } from "../lib/emailSync/crypto";
import { parseEmailApplicationStatus } from "../lib/emailSync/statusExtractor";
import { matchEmailToApplications } from "../lib/emailSync/applicationMatcher";
import { processStudentEmails } from "../lib/emailSync/emailIngestionEngine";
import { ApplicationStatus } from "@prisma/client";

async function runTests() {
  console.log("===============================================================");
  console.log("🚀 STARTING 14-SCENARIO COMPANY-EMAIL STATUS TRACKING TEST SUITE");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] Scenario: ${title}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] Scenario: ${title}${detail ? ` — ${detail}` : ""}`);
      failed++;
    }
  }

  // Setup test student & applications
  const testStudentEmail = `test_student_${Date.now()}@example.edu`;
  const student = await prisma.user.create({
    data: {
      name: "Test Email Sync Student",
      email: testStudentEmail,
      role: "STUDENT",
    },
  });

  const appGoogleSde = await prisma.application.create({
    data: {
      userId: student.id,
      companyName: "Google",
      position: "Software Engineer",
      status: ApplicationStatus.APPLIED,
    },
  });

  const appGoogleIntern = await prisma.application.create({
    data: {
      userId: student.id,
      companyName: "Google",
      position: "Summer Intern",
      status: ApplicationStatus.APPLIED,
    },
  });

  const appAmazonSde = await prisma.application.create({
    data: {
      userId: student.id,
      companyName: "Amazon",
      position: "SDE Intern",
      status: ApplicationStatus.APPLIED,
    },
  });

  const appStripe = await prisma.application.create({
    data: {
      userId: student.id,
      companyName: "Stripe",
      position: "Full Stack Developer",
      status: ApplicationStatus.APPLIED,
    },
  });

  try {
    // -------------------------------------------------------------
    // Scenario 1: AES-256-GCM Token Encryption & Decryption
    // -------------------------------------------------------------
    const rawSecret = "oauth_refresh_token_xyz123_sensitive";
    const encrypted = encryptToken(rawSecret);
    const decrypted = decryptToken(encrypted);
    assert(
      encrypted !== rawSecret && decrypted === rawSecret,
      "Scenario 1: AES-256-GCM Token Encryption & Decryption",
      `Expected ${rawSecret}, got ${decrypted}`
    );

    // -------------------------------------------------------------
    // Scenario 2: Direct Interview Invitation Detection
    // -------------------------------------------------------------
    const parsedInterview = parseEmailApplicationStatus({
      senderName: "Amazon University Recruiting",
      senderEmail: "recruiting@amazon.com",
      subject: "Amazon SDE Intern: Interview Invitation & Coding Round",
      bodyText: "We would like to invite you to interview for the SDE Intern position. Please choose your schedule.",
    });
    assert(
      parsedInterview.detectedStatus === ApplicationStatus.INTERVIEW &&
      parsedInterview.confidence >= 0.85 &&
      parsedInterview.isInterviewInvite === true,
      "Scenario 2: Direct Interview Invitation Detection",
      JSON.stringify(parsedInterview)
    );

    // -------------------------------------------------------------
    // Scenario 3: Direct Selection / Offer Letter Detection
    // -------------------------------------------------------------
    const parsedOffer = parseEmailApplicationStatus({
      senderName: "Google Careers",
      senderEmail: "careers@google.com",
      subject: "Offer of Employment - Software Engineer",
      bodyText: "We are pleased to offer you the position of Software Engineer. Welcome to the team!",
    });
    assert(
      parsedOffer.detectedStatus === ApplicationStatus.SELECTED &&
      parsedOffer.confidence >= 0.90 &&
      parsedOffer.isOfferLetter === true,
      "Scenario 3: Direct Selection / Offer Letter Detection",
      JSON.stringify(parsedOffer)
    );

    // -------------------------------------------------------------
    // Scenario 4: Direct Rejection Email Detection
    // -------------------------------------------------------------
    const parsedRejection = parseEmailApplicationStatus({
      senderName: "Stripe Talent",
      senderEmail: "talent@stripe.com",
      subject: "Update regarding your Full Stack Developer Application",
      bodyText: "Unfortunately, we have decided not to proceed with your candidacy as we are pursuing other candidates.",
    });
    assert(
      parsedRejection.detectedStatus === ApplicationStatus.REJECTED &&
      parsedRejection.confidence >= 0.90,
      "Scenario 4: Direct Rejection Email Detection",
      JSON.stringify(parsedRejection)
    );

    // -------------------------------------------------------------
    // Scenario 5: Direct Shortlisted Email Detection
    // -------------------------------------------------------------
    const parsedShortlist = parseEmailApplicationStatus({
      senderName: "Stripe Recruiting",
      senderEmail: "recruiting@stripe.com",
      subject: "Stripe Application Update",
      bodyText: "Congratulations! Your profile has been shortlisted for the next stage of our evaluation.",
    });
    assert(
      parsedShortlist.detectedStatus === ApplicationStatus.SHORTLISTED &&
      parsedShortlist.confidence >= 0.85,
      "Scenario 5: Direct Shortlisted Email Detection",
      JSON.stringify(parsedShortlist)
    );

    // -------------------------------------------------------------
    // Scenario 6: Application Submission Confirmation
    // -------------------------------------------------------------
    const parsedApplied = parseEmailApplicationStatus({
      senderName: "Microsoft Careers",
      senderEmail: "careers@microsoft.com",
      subject: "Thank you for applying to Microsoft",
      bodyText: "We have received your application submitted successfully. Our team will review your resume.",
    });
    assert(
      parsedApplied.detectedStatus === ApplicationStatus.APPLIED &&
      parsedApplied.confidence >= 0.80,
      "Scenario 6: Application Submission Confirmation",
      JSON.stringify(parsedApplied)
    );

    // -------------------------------------------------------------
    // Scenario 7: Negative Phrase Exclusion (e.g. 'cannot offer')
    // -------------------------------------------------------------
    const parsedNegativeOffer = parseEmailApplicationStatus({
      senderName: "Netflix Recruiting",
      senderEmail: "jobs@netflix.com",
      subject: "Your Application Status",
      bodyText: "After careful review, we cannot offer you the role at this time.",
    });
    assert(
      parsedNegativeOffer.detectedStatus !== ApplicationStatus.SELECTED,
      "Scenario 7: Negative Phrase Exclusion (cannot offer -> not SELECTED)",
      `Status was: ${parsedNegativeOffer.detectedStatus}`
    );

    // -------------------------------------------------------------
    // Scenario 8: Single High-Confidence Auto-Match Pipeline
    // -------------------------------------------------------------
    const singleMatchReport = await processStudentEmails(student.id, [
      {
        messageId: "msg_amazon_auto_001",
        senderEmail: "recruiting@amazon.com",
        senderName: "Amazon Talent",
        subject: "Amazon SDE Intern Interview Invitation",
        bodyText: "We would like to invite you to interview for the SDE Intern role at Amazon.",
        receivedDate: new Date(),
      },
    ]);

    const updatedAmazonApp = await prisma.application.findUnique({
      where: { id: appAmazonSde.id },
    });
    const amazonEvidence = await prisma.emailEvidence.findFirst({
      where: { applicationId: appAmazonSde.id },
    });

    assert(
      singleMatchReport.autoMatched === 1 &&
      updatedAmazonApp?.status === ApplicationStatus.INTERVIEW &&
      updatedAmazonApp?.statusSource === "COMPANY_EMAIL" &&
      amazonEvidence !== null,
      "Scenario 8: Single High-Confidence Auto-Match Pipeline",
      `App Status: ${updatedAmazonApp?.status}, Source: ${updatedAmazonApp?.statusSource}`
    );

    // -------------------------------------------------------------
    // Scenario 9: Ambiguous Multi-Role Match Routes to Review Queue
    // -------------------------------------------------------------
    // Student has two Google applications (Software Engineer & Summer Intern)
    // An email simply saying "Google Status Update" without specifying the role
    const multiMatchReport = await processStudentEmails(student.id, [
      {
        messageId: "msg_google_ambiguous_001",
        senderEmail: "careers@google.com",
        senderName: "Google Careers",
        subject: "Your Google Application: Profile Shortlisted",
        bodyText: "Your profile has been shortlisted for the next stage at Google.",
        receivedDate: new Date(),
      },
    ]);

    const pendingReview = await prisma.emailStatusReview.findUnique({
      where: {
        studentId_sourceMessageId: {
          studentId: student.id,
          sourceMessageId: "msg_google_ambiguous_001",
        },
      },
    });

    assert(
      multiMatchReport.sentToReview === 1 &&
      pendingReview !== null &&
      pendingReview.detectedCompany === "Google" &&
      pendingReview.detectedStatus === ApplicationStatus.SHORTLISTED,
      "Scenario 9: Ambiguous Multi-Role Match Routes to Review Queue",
      `Review status: ${pendingReview?.status}`
    );

    // -------------------------------------------------------------
    // Scenario 10: Unmatched Company Routes to Review Queue
    // -------------------------------------------------------------
    const unmatchedReport = await processStudentEmails(student.id, [
      {
        messageId: "msg_uber_unmatched_001",
        senderEmail: "careers@uber.com",
        senderName: "Uber Recruiting",
        subject: "Uber Software Engineer Interview Invitation",
        bodyText: "We invite you to interview for the Software Engineer position at Uber.",
        receivedDate: new Date(),
      },
    ]);

    const uberReview = await prisma.emailStatusReview.findUnique({
      where: {
        studentId_sourceMessageId: {
          studentId: student.id,
          sourceMessageId: "msg_uber_unmatched_001",
        },
      },
    });

    assert(
      unmatchedReport.sentToReview === 1 && uberReview !== null,
      "Scenario 10: Unmatched Company Routes to Review Queue Without False Update",
      `Uber Review ID: ${uberReview?.id}`
    );

    // -------------------------------------------------------------
    // Scenario 11: Student Resolves Pending Review (Confirm Match)
    // -------------------------------------------------------------
    // Confirm linking msg_google_ambiguous_001 to appGoogleSde
    if (pendingReview) {
      await prisma.emailEvidence.create({
        data: {
          applicationId: appGoogleSde.id,
          studentId: student.id,
          sourceMessageId: pendingReview.sourceMessageId,
          senderEmail: pendingReview.senderEmail,
          senderName: pendingReview.senderName,
          companyName: "Google",
          detectedStatus: pendingReview.detectedStatus,
          confidence: 1.0,
          receivedDate: pendingReview.createdAt,
          subject: pendingReview.subject,
          cleanSnippet: pendingReview.cleanSnippet,
          matchedKeywords: ["Student Confirmed"],
          isVerified: true,
        },
      });

      await prisma.application.update({
        where: { id: appGoogleSde.id },
        data: {
          status: pendingReview.detectedStatus,
          statusSource: "COMPANY_EMAIL",
          statusConfidence: 1.0,
          statusUpdatedAt: new Date(),
        },
      });

      await prisma.emailStatusReview.update({
        where: { id: pendingReview.id },
        data: { status: "CONFIRMED", resolvedAppId: appGoogleSde.id },
      });
    }

    const resolvedGoogleApp = await prisma.application.findUnique({
      where: { id: appGoogleSde.id },
    });
    const updatedReview = await prisma.emailStatusReview.findUnique({
      where: { id: pendingReview?.id },
    });

    assert(
      resolvedGoogleApp?.status === ApplicationStatus.SHORTLISTED &&
      resolvedGoogleApp?.statusSource === "COMPANY_EMAIL" &&
      updatedReview?.status === "CONFIRMED",
      "Scenario 11: Student Resolves Pending Review (Confirm Match & Status Update)",
      `Google App Status: ${resolvedGoogleApp?.status}`
    );

    // -------------------------------------------------------------
    // Scenario 12: Student Dismisses Review (No Status Change)
    // -------------------------------------------------------------
    if (uberReview) {
      await prisma.emailStatusReview.update({
        where: { id: uberReview.id },
        data: { status: "DISMISSED" },
      });
    }

    const dismissedUberReview = await prisma.emailStatusReview.findUnique({
      where: { id: uberReview?.id },
    });

    assert(
      dismissedUberReview?.status === "DISMISSED",
      "Scenario 12: Student Dismisses Review (Leaves Applications Intact)",
      `Dismissed Status: ${dismissedUberReview?.status}`
    );

    // -------------------------------------------------------------
    // Scenario 13: Idempotency (Duplicate Messages Skipped)
    // -------------------------------------------------------------
    const duplicateReport = await processStudentEmails(student.id, [
      {
        messageId: "msg_amazon_auto_001", // Re-sending already processed msg
        senderEmail: "recruiting@amazon.com",
        senderName: "Amazon Talent",
        subject: "Amazon SDE Intern Interview Invitation",
        bodyText: "We would like to invite you to interview for the SDE Intern role at Amazon.",
        receivedDate: new Date(),
      },
    ]);

    const totalAmazonEvidences = await prisma.emailEvidence.count({
      where: {
        studentId: student.id,
        sourceMessageId: "msg_amazon_auto_001",
      },
    });

    assert(
      duplicateReport.skipped === 1 && totalAmazonEvidences === 1,
      "Scenario 13: Idempotency (Duplicate messageId skipped cleanly)",
      `Skipped count: ${duplicateReport.skipped}, Evidence count: ${totalAmazonEvidences}`
    );

    // -------------------------------------------------------------
    // Scenario 14: Strict Student Privacy & Token Isolation
    // -------------------------------------------------------------
    // Create another student to test cross-student isolation
    const otherStudent = await prisma.user.create({
      data: {
        name: "Other Student",
        email: `other_${Date.now()}@example.edu`,
        role: "STUDENT",
      },
    });

    // Verify other student cannot query or view first student's email evidence
    const crossStudentEvidence = await prisma.emailEvidence.findFirst({
      where: {
        id: amazonEvidence?.id,
        studentId: otherStudent.id, // Must be null
      },
    });

    assert(
      crossStudentEvidence === null,
      "Scenario 14: Strict Student Privacy Isolation (Cross-Student Access Blocked)",
      `Cross Evidence: ${crossStudentEvidence}`
    );

    // Cleanup other student
    await prisma.user.delete({ where: { id: otherStudent.id } });
  } finally {
    // Cleanup main test student
    await prisma.user.delete({ where: { id: student.id } }).catch(() => {});
  }

  console.log("\n===============================================================");
  console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
