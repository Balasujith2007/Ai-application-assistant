import prisma from "@/lib/prisma";
import { parseEmailApplicationStatus, StatusExtractionResult } from "./statusExtractor";
import { matchEmailToApplications } from "./applicationMatcher";
import { ApplicationStatus } from "@prisma/client";

export interface IngestableEmail {
  messageId: string;
  senderEmail: string;
  senderName?: string | null;
  subject: string;
  bodyText: string;
  receivedDate: Date;
}

export interface IngestionReport {
  totalProcessed: number;
  autoMatched: number;
  sentToReview: number;
  skipped: number;
  results: Array<{
    messageId: string;
    subject: string;
    detectedStatus: string | null;
    action: "UPDATED_APPLICATION" | "QUEUED_FOR_REVIEW" | "SKIPPED_EXISTING" | "SKIPPED_IRRELEVANT";
    applicationId?: string;
    companyName?: string;
  }>;
}

/**
 * Process raw emails for a student and update applications / reviews accordingly
 */
export async function processStudentEmails(
  studentId: string,
  emails: IngestableEmail[]
): Promise<IngestionReport> {
  const report: IngestionReport = {
    totalProcessed: emails.length,
    autoMatched: 0,
    sentToReview: 0,
    skipped: 0,
    results: [],
  };

  // 1. Fetch student's existing applications
  const applications = await prisma.application.findMany({
    where: { userId: studentId },
    select: {
      id: true,
      companyName: true,
      position: true,
      createdAt: true,
      appliedDate: true,
      status: true,
    },
  });

  for (const email of emails) {
    // 2. Check if already processed
    const existingEvidence = await prisma.emailEvidence.findUnique({
      where: {
        studentId_sourceMessageId: {
          studentId,
          sourceMessageId: email.messageId,
        },
      },
    });

    if (existingEvidence) {
      report.skipped++;
      report.results.push({
        messageId: email.messageId,
        subject: email.subject,
        detectedStatus: existingEvidence.detectedStatus,
        action: "SKIPPED_EXISTING",
        applicationId: existingEvidence.applicationId || undefined,
        companyName: existingEvidence.companyName,
      });
      continue;
    }

    const existingReview = await prisma.emailStatusReview.findUnique({
      where: {
        studentId_sourceMessageId: {
          studentId,
          sourceMessageId: email.messageId,
        },
      },
    });

    if (existingReview) {
      report.skipped++;
      report.results.push({
        messageId: email.messageId,
        subject: email.subject,
        detectedStatus: existingReview.detectedStatus,
        action: "SKIPPED_EXISTING",
        companyName: existingReview.detectedCompany || undefined,
      });
      continue;
    }

    // 3. Extract status & metadata
    const parsed: StatusExtractionResult = parseEmailApplicationStatus({
      subject: email.subject,
      bodyText: email.bodyText,
      senderName: email.senderName,
      senderEmail: email.senderEmail,
    });

    if (!parsed.detectedStatus || parsed.confidence < 0.5) {
      report.skipped++;
      report.results.push({
        messageId: email.messageId,
        subject: email.subject,
        detectedStatus: null,
        action: "SKIPPED_IRRELEVANT",
      });
      continue;
    }

    // 4. Match against applications
    const match = matchEmailToApplications({
      detectedCompany: parsed.detectedCompany,
      detectedRole: parsed.detectedRole,
      referenceToken: parsed.referenceToken,
      subject: email.subject,
      bodySnippet: parsed.cleanSnippet,
      applications,
    });

    const targetCompany = parsed.detectedCompany || match.matchedApplication?.companyName || "Unknown Company";

    // 5. Handle matching decisions
    if (match.decision === "AUTO_MATCH" && match.matchedApplicationId && parsed.detectedStatus !== "NEEDS_REVIEW") {
      const targetStatus = parsed.detectedStatus as ApplicationStatus;

      // Create Email Evidence
      await prisma.emailEvidence.create({
        data: {
          applicationId: match.matchedApplicationId,
          studentId,
          sourceMessageId: email.messageId,
          senderEmail: email.senderEmail,
          senderName: email.senderName,
          companyName: targetCompany,
          detectedStatus: targetStatus,
          confidence: parsed.confidence,
          receivedDate: email.receivedDate,
          subject: email.subject,
          cleanSnippet: parsed.cleanSnippet,
          matchedKeywords: parsed.matchedKeywords,
          isVerified: true,
        },
      });

      // Update Application status
      await prisma.application.update({
        where: { id: match.matchedApplicationId },
        data: {
          status: targetStatus,
          statusSource: "COMPANY_EMAIL",
          statusConfidence: parsed.confidence,
          statusUpdatedAt: new Date(),
        },
      });

      // Create notification for student
      await prisma.notification.create({
        data: {
          userId: studentId,
          title: `Status Update: ${targetCompany}`,
          message: `Your application status for ${targetCompany} (${match.matchedApplication?.position}) was automatically updated to ${targetStatus} from company email evidence.`,
          type: "APPLICATION_STATUS_UPDATED",
          relatedEntityId: match.matchedApplicationId,
          relatedEntityType: "APPLICATION",
          link: `/applications`,
        },
      });

      report.autoMatched++;
      report.results.push({
        messageId: email.messageId,
        subject: email.subject,
        detectedStatus: targetStatus,
        action: "UPDATED_APPLICATION",
        applicationId: match.matchedApplicationId,
        companyName: targetCompany,
      });
    } else {
      // Route to EmailStatusReview queue
      const reviewStatus = (parsed.detectedStatus === "NEEDS_REVIEW" ? ApplicationStatus.UNDER_REVIEW : parsed.detectedStatus) as ApplicationStatus;

      const candidatesPayload = match.candidates.map((c) => ({
        id: c.application.id,
        companyName: c.application.companyName,
        position: c.application.position,
        score: c.score,
        reasons: c.reasons,
      }));

      await prisma.emailStatusReview.create({
        data: {
          studentId,
          sourceMessageId: email.messageId,
          senderEmail: email.senderEmail,
          senderName: email.senderName,
          detectedCompany: parsed.detectedCompany,
          detectedRole: parsed.detectedRole,
          detectedStatus: reviewStatus,
          confidence: parsed.confidence,
          subject: email.subject,
          cleanSnippet: parsed.cleanSnippet,
          candidateAppIds: candidatesPayload,
          status: "PENDING",
        },
      });

      // Notify student to review
      await prisma.notification.create({
        data: {
          userId: studentId,
          title: `Review Required: ${targetCompany} Email`,
          message: `CareerAI detected an email update for ${targetCompany} (${reviewStatus}) requiring your confirmation.`,
          type: "EMAIL_STATUS_REVIEW_NEEDED",
          link: `/applications?tab=reviews`,
        },
      });

      report.sentToReview++;
      report.results.push({
        messageId: email.messageId,
        subject: email.subject,
        detectedStatus: reviewStatus,
        action: "QUEUED_FOR_REVIEW",
        companyName: targetCompany,
      });
    }
  }

  return report;
}
