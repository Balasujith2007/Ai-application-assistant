import { runOcrOnImage } from './ocrEngine';
import { extractEvidenceFromOcrText } from './extractionEngine';
import { crossVerifyEvidence } from './crossVerifier';
import { evaluateVerificationDecision } from './decisionEngine';
import { storeEvidenceScreenshot, calculateFileHash } from './evidenceStorage';
import { adapterRegistry } from './adapters/adapterRegistry';
import {
  OpportunityContext,
  RegistrationContext,
  StudentContext,
  VerificationServiceResult
} from './types';
import prisma from '@/lib/prisma';
import { createNotification } from '@/lib/notifications/notificationService';

export interface ProcessEvidenceOptions {
  imageBuffer: Buffer;
  originalFilename: string;
  student: StudentContext;
  opportunity: OpportunityContext;
  registration: RegistrationContext;
}

/**
 * Universal Verification Service
 * Coordinates upload storage, OCR extraction, cross-verification, and decision making.
 */
export async function processRegistrationEvidence(
  options: ProcessEvidenceOptions
): Promise<VerificationServiceResult> {
  const { imageBuffer, originalFilename, student, opportunity, registration } = options;

  try {
    // 1. Calculate file hash to detect duplicate screenshot reuse
    const fileHash = calculateFileHash(imageBuffer);

    const duplicateEvidence = await prisma.registrationEvidence.findFirst({
      where: {
        fileHash,
        registrationId: { not: registration.id }
      },
      include: {
        student: { select: { id: true, name: true } },
        opportunity: { select: { id: true, title: true } }
      }
    });

    // 2. Store screenshot securely in private storage
    const storedFile = await storeEvidenceScreenshot(
      imageBuffer,
      originalFilename,
      student.id,
      opportunity.id
    );

    // 3. Execute OCR on the image
    const ocrResult = await runOcrOnImage(imageBuffer);

    // If OCR completely crashed / errored out
    if (ocrResult.error && !ocrResult.text) {
      const decision = evaluateVerificationDecision(
        {
          studentName: { value: null, found: false, confidence: 0 },
          studentEmail: { value: null, found: false, confidence: 0 },
          opportunityName: { value: null, found: false, confidence: 0 },
          senderEmail: { value: null, found: false, confidence: 0 },
          senderDomain: { value: null, found: false, confidence: 0 },
          emailSubject: { value: null, found: false, confidence: 0 },
          emailDate: { value: null, found: false, confidence: 0 },
          referenceId: { value: null, found: false, confidence: 0 },
          confirmationWording: { value: 'AMBIGUOUS_OR_UNREADABLE', found: false, confidence: 0 },
          platformName: { value: null, found: false, confidence: 0 }
        },
        {
          emailMatch: { field: 'email', matched: null, score: 0, extractedValue: null, expectedValue: student.email, status: 'MISSING' },
          nameMatch: { field: 'name', matched: null, score: 0, extractedValue: null, expectedValue: student.name, status: 'MISSING' },
          opportunityMatch: { field: 'opportunity', matched: null, score: 0, extractedValue: null, expectedValue: opportunity.title, status: 'MISSING' },
          senderMatch: { field: 'sender', matched: null, score: 0, extractedValue: null, expectedValue: null, status: 'MISSING' },
          dateMatch: { field: 'date', matched: null, score: 0, extractedValue: null, expectedValue: null, status: 'MISSING' },
          referenceIdCheck: { field: 'referenceId', matched: null, score: 0, extractedValue: null, expectedValue: null, status: 'MISSING' },
          wordingCheck: { field: 'wording', matched: null, score: 0, extractedValue: null, expectedValue: null, status: 'AMBIGUOUS' },
          mismatchReasons: ['Technical error during OCR processing.'],
          isAllRequiredPassed: false,
          overallScore: 0
        },
        { isTechnicalError: true, technicalErrorMessage: ocrResult.error }
      );

      return {
        success: false,
        status: 'FAILED',
        decision,
        extractedData: {
          studentName: { value: null, found: false, confidence: 0 },
          studentEmail: { value: null, found: false, confidence: 0 },
          opportunityName: { value: null, found: false, confidence: 0 },
          senderEmail: { value: null, found: false, confidence: 0 },
          senderDomain: { value: null, found: false, confidence: 0 },
          emailSubject: { value: null, found: false, confidence: 0 },
          emailDate: { value: null, found: false, confidence: 0 },
          referenceId: { value: null, found: false, confidence: 0 },
          confirmationWording: { value: 'AMBIGUOUS_OR_UNREADABLE', found: false, confidence: 0 },
          platformName: { value: null, found: false, confidence: 0 }
        },
        validationResults: {
          emailMatch: { field: 'email', matched: null, score: 0, extractedValue: null, expectedValue: student.email, status: 'MISSING' },
          nameMatch: { field: 'name', matched: null, score: 0, extractedValue: null, expectedValue: student.name, status: 'MISSING' },
          opportunityMatch: { field: 'opportunity', matched: null, score: 0, extractedValue: null, expectedValue: opportunity.title, status: 'MISSING' },
          senderMatch: { field: 'sender', matched: null, score: 0, extractedValue: null, expectedValue: null, status: 'MISSING' },
          dateMatch: { field: 'date', matched: null, score: 0, extractedValue: null, expectedValue: null, status: 'MISSING' },
          referenceIdCheck: { field: 'referenceId', matched: null, score: 0, extractedValue: null, expectedValue: null, status: 'MISSING' },
          wordingCheck: { field: 'wording', matched: null, score: 0, extractedValue: null, expectedValue: null, status: 'AMBIGUOUS' },
          mismatchReasons: [ocrResult.error],
          isAllRequiredPassed: false,
          overallScore: 0
        },
        ocrConfidence: 0,
        ocrSnippet: '',
        errorMessage: ocrResult.error
      };
    }

    // 4. Extract fields from OCR text
    let extracted = extractEvidenceFromOcrText(ocrResult.text, ocrResult.confidence);

    // Apply platform adapter enhancements (Unstop, Google Forms, HireToday, etc.)
    const lines = ocrResult.text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    extracted = adapterRegistry.applyAdapterEnhancements(
      extracted,
      ocrResult.text,
      lines,
      opportunity.registrationUrl
    );

    // 5. Cross-verify with database records
    const validation = await crossVerifyEvidence(extracted, student, opportunity, registration);

    // Check duplicate screenshot reuse
    if (duplicateEvidence) {
      validation.mismatchReasons.push(
        `Duplicate Evidence Alert: Exactly identical screenshot was previously submitted by ${duplicateEvidence.student.name} for "${duplicateEvidence.opportunity.title}".`
      );
      validation.isAllRequiredPassed = false;
    }

    // 6. Make decision (Critical: Never set VERIFIED from screenshot alone -> sets PENDING_REVIEW)
    const decision = evaluateVerificationDecision(extracted, validation);

    // 7. Persist RegistrationEvidence in DB
    const evidenceUrl = `/api/evidence/`; // Prefix, will append id after creation
    const evidence = await prisma.registrationEvidence.create({
      data: {
        registrationId: registration.id,
        opportunityId: opportunity.id,
        studentId: student.id,
        evidenceFileUrl: '', // Updated below with ID
        filePath: storedFile.filePath,
        fileName: storedFile.fileName,
        fileSize: storedFile.fileSize,
        mimeType: storedFile.mimeType,
        fileHash,
        status: decision.status,
        verificationMethod: 'OCR_SCREENSHOT',
        ocrTextSnippet: ocrResult.text.slice(0, 400),
        ocrConfidence: ocrResult.confidence,
        extractedData: extracted as any,
        validationResults: validation as any,
        mismatchReasons: decision.mismatchReasons,
        isAuthentic: decision.isAuthentic
      }
    });

    const finalEvidenceUrl = `/api/evidence/${evidence.id}`;
    await prisma.registrationEvidence.update({
      where: { id: evidence.id },
      data: { evidenceFileUrl: finalEvidenceUrl }
    });

    // 8. Update OpportunityRegistration status to PENDING_REVIEW
    await prisma.opportunityRegistration.update({
      where: { id: registration.id },
      data: {
        status: 'PENDING_REVIEW' as any,
        verificationMethod: 'OCR_SCREENSHOT',
        confirmationEvidenceUrl: finalEvidenceUrl,
        externalRegistrationId: extracted.referenceId.value || registration.externalRegistrationId || null,
        appliedAt: new Date()
      }
    });

    // 9. Update Application status to UNDER_REVIEW
    await prisma.application.updateMany({
      where: { userId: student.id, opportunityId: opportunity.id },
      data: {
        status: 'UNDER_REVIEW',
        statusSource: 'SCREENSHOT_OCR',
        statusConfidence: ocrResult.confidence,
        statusUpdatedAt: new Date()
      }
    });

    // 10. Audit logs and status history
    await prisma.opportunityStatusHistory.create({
      data: {
        registrationId: registration.id,
        fromStatus: registration.status,
        toStatus: 'PENDING_REVIEW',
        changedById: student.id,
        reason: 'Confirmation screenshot uploaded for verification',
        notes: `Extracted Ref ID: ${extracted.referenceId.value || 'None'}, Platform: ${extracted.platformName.value || 'Generic'}`
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: student.id,
        action: 'SUBMIT_REGISTRATION_EVIDENCE',
        target: `OpportunityRegistration:${registration.id}`,
        details: JSON.stringify({
          evidenceId: evidence.id,
          status: decision.status,
          mismatchCount: decision.mismatchReasons.length,
          ocrConfidence: ocrResult.confidence
        })
      }
    });

    // 11. Notifications
    // Student Notification
    await createNotification({
      userId: student.id,
      type: 'REGISTRATION_EVIDENCE_SUBMITTED',
      title: 'Evidence Submitted for Review',
      message: `Your confirmation evidence for "${opportunity.title}" has been submitted and is awaiting mentor review.`,
      relatedEntityId: opportunity.id,
      relatedEntityType: 'OPPORTUNITY',
      link: '/dashboard/student/opportunity-history'
    });

    // Mentor Notification if mentor exists
    const userWithMentor = await prisma.user.findUnique({
      where: { id: student.id },
      select: { mentorId: true }
    });

    if (userWithMentor?.mentorId) {
      await createNotification({
        userId: userWithMentor.mentorId,
        senderId: student.id,
        type: 'REGISTRATION_REVIEW_REQUESTED',
        title: 'Review Registration Evidence',
        message: `${student.name} uploaded registration confirmation evidence for "${opportunity.title}". Review required.`,
        relatedEntityId: opportunity.id,
        relatedEntityType: 'OPPORTUNITY',
        link: '/dashboard/mentor/opportunities'
      });
    }

    return {
      success: true,
      status: decision.status,
      decision,
      extractedData: extracted,
      validationResults: validation,
      ocrConfidence: ocrResult.confidence,
      ocrSnippet: ocrResult.text.slice(0, 300),
      evidenceId: evidence.id
    };
  } catch (error: any) {
    console.error('[Verification Service] Process evidence failure:', error);
    return {
      success: false,
      status: 'FAILED',
      decision: {
        status: 'FAILED',
        decisionReason: error?.message || 'Technical error during verification.',
        mismatchReasons: [error?.message || 'Processing error'],
        isAuthentic: false,
        confidenceScore: 0,
        requiresManualReview: false,
        suggestedAction: 'Please retry uploading the screenshot.'
      },
      extractedData: {
        studentName: { value: null, found: false, confidence: 0 },
        studentEmail: { value: null, found: false, confidence: 0 },
        opportunityName: { value: null, found: false, confidence: 0 },
        senderEmail: { value: null, found: false, confidence: 0 },
        senderDomain: { value: null, found: false, confidence: 0 },
        emailSubject: { value: null, found: false, confidence: 0 },
        emailDate: { value: null, found: false, confidence: 0 },
        referenceId: { value: null, found: false, confidence: 0 },
        confirmationWording: { value: 'AMBIGUOUS_OR_UNREADABLE', found: false, confidence: 0 },
        platformName: { value: null, found: false, confidence: 0 }
      },
      validationResults: {
        emailMatch: { field: 'email', matched: null, score: 0, extractedValue: null, expectedValue: student.email, status: 'MISSING' },
        nameMatch: { field: 'name', matched: null, score: 0, extractedValue: null, expectedValue: student.name, status: 'MISSING' },
        opportunityMatch: { field: 'opportunity', matched: null, score: 0, extractedValue: null, expectedValue: opportunity.title, status: 'MISSING' },
        senderMatch: { field: 'sender', matched: null, score: 0, extractedValue: null, expectedValue: null, status: 'MISSING' },
        dateMatch: { field: 'date', matched: null, score: 0, extractedValue: null, expectedValue: null, status: 'MISSING' },
        referenceIdCheck: { field: 'referenceId', matched: null, score: 0, extractedValue: null, expectedValue: null, status: 'MISSING' },
        wordingCheck: { field: 'wording', matched: null, score: 0, extractedValue: null, expectedValue: null, status: 'AMBIGUOUS' },
        mismatchReasons: [error?.message || 'Processing error'],
        isAllRequiredPassed: false,
        overallScore: 0
      },
      ocrConfidence: 0,
      ocrSnippet: '',
      errorMessage: error?.message || 'Internal processing error'
    };
  }
}
