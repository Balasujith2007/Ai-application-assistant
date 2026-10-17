import {
  ExtractedEvidenceData,
  RegistrationVerificationStatus,
  ValidationSummary,
  VerificationDecision
} from './types';

/**
 * Universal Verification Decision Engine
 *
 * CRITICAL SECURITY RULE (Section 6):
 * Uploading a screenshot, matching OCR text, opening a website, filling a form,
 * or clicking "Verify My Registration" must NEVER directly set VERIFIED.
 * A screenshot-only workflow cannot guarantee that the screenshot or email is genuine.
 * When reliable automated evidence is submitted, route to PENDING_REVIEW for mentor/admin review.
 */
export function evaluateVerificationDecision(
  extracted: ExtractedEvidenceData,
  validation: ValidationSummary,
  options?: {
    isOfficialIntegrationVerified?: boolean;
    isReviewerApproval?: boolean;
    isTechnicalError?: boolean;
    technicalErrorMessage?: string;
  }
): VerificationDecision {
  const {
    isOfficialIntegrationVerified = false,
    isReviewerApproval = false,
    isTechnicalError = false,
    technicalErrorMessage = ''
  } = options || {};

  // Case 1: Technical Processing Error -> FAILED with safe retry
  if (isTechnicalError) {
    return {
      status: 'FAILED',
      decisionReason: technicalErrorMessage || 'Technical error during OCR processing or evidence storage. You can safely try again.',
      mismatchReasons: [technicalErrorMessage || 'Technical processing failure'],
      isAuthentic: false,
      confidenceScore: 0,
      requiresManualReview: false,
      suggestedAction: 'Please retry uploading the screenshot or ensure the image file is clear and readable.'
    };
  }

  // Case 2: Authorized Reviewer Approval (Mentor, HOD, Admin) -> VERIFIED
  if (isReviewerApproval) {
    return {
      status: 'VERIFIED',
      decisionReason: 'Registration evidence has been reviewed and approved by an authorized mentor or department head.',
      mismatchReasons: [],
      isAuthentic: true,
      confidenceScore: 1.0,
      requiresManualReview: false,
      suggestedAction: 'Registration is officially verified.'
    };
  }

  // Case 3: Trusted Official API / Webhook integration verified -> VERIFIED
  if (isOfficialIntegrationVerified) {
    return {
      status: 'VERIFIED',
      decisionReason: 'Verified via trusted official external platform integration.',
      mismatchReasons: [],
      isAuthentic: true,
      confidenceScore: 1.0,
      requiresManualReview: false,
      suggestedAction: 'Registration is officially verified.'
    };
  }

  // Case 4: Severe Discrepancies (Mismatched Email, Duplicate Reference ID, Unrelated Opportunity)
  const hasSevereDiscrepancy =
    validation.emailMatch.status === 'MISMATCH' ||
    validation.opportunityMatch.status === 'MISMATCH' ||
    validation.referenceIdCheck.isDuplicate ||
    validation.wordingCheck.status === 'MISMATCH';

  if (hasSevereDiscrepancy) {
    return {
      status: 'PENDING_REVIEW',
      decisionReason: 'Evidence submitted contains detected discrepancies or conflicting details. It has been routed to your mentor for review.',
      mismatchReasons: validation.mismatchReasons,
      isAuthentic: false,
      confidenceScore: validation.overallScore,
      requiresManualReview: true,
      suggestedAction: 'Your submission requires manual verification. Your mentor will inspect the screenshot.'
    };
  }

  // Case 5: Unreadable or Insufficient Evidence
  const isUnreadable =
    !extracted.studentName.found &&
    !extracted.studentEmail.found &&
    !extracted.opportunityName.found &&
    !extracted.referenceId.found;

  if (isUnreadable || validation.overallScore < 0.3) {
    return {
      status: 'PENDING_REVIEW',
      decisionReason: 'The uploaded screenshot could not be parsed with high confidence. It has been routed to your mentor for review.',
      mismatchReasons: ['Screenshot text could not be extracted with sufficient confidence.'],
      isAuthentic: false,
      confidenceScore: validation.overallScore,
      requiresManualReview: true,
      suggestedAction: 'Your evidence will be reviewed manually by your mentor. If you have a clearer screenshot, you can also re-upload.'
    };
  }

  // Case 6: Standard Successful Evidence Submission (Automated Pre-Checks Passed)
  // CRITICAL: MUST NEVER SET VERIFIED AUTOMATICALLY FROM A SCREENSHOT. Sets PENDING_REVIEW.
  return {
    status: 'PENDING_REVIEW',
    decisionReason: 'Evidence uploaded successfully and initial automated checks passed. Your submission is now awaiting mentor verification.',
    mismatchReasons: validation.mismatchReasons,
    isAuthentic: false, // Authenticity cannot be cryptographically proven from a screenshot alone
    confidenceScore: validation.overallScore,
    requiresManualReview: true,
    suggestedAction: 'Your confirmation screenshot has been safely submitted. Your mentor can now review and approve it.'
  };
}
