/**
 * Universal External Registration Email Verification Engine - Types
 */

export type ConfirmationWordingType =
  | 'SUCCESSFUL_REGISTRATION'
  | 'APPLICATION_RECEIVED'
  | 'INVITATION_TO_REGISTER'
  | 'MARKETING_EMAIL'
  | 'OTP_OR_VERIFICATION'
  | 'INCOMPLETE_REGISTRATION'
  | 'AMBIGUOUS_OR_UNREADABLE';

export interface ExtractedField<T = string> {
  value: T | null;
  found: boolean;
  confidence: number; // 0.0 - 1.0 (Text recognition confidence)
  rawSnippet?: string;
}

export interface ExtractedEvidenceData {
  studentName: ExtractedField<string>;
  studentEmail: ExtractedField<string>;
  opportunityName: ExtractedField<string>;
  senderEmail: ExtractedField<string>;
  senderDomain: ExtractedField<string>;
  emailSubject: ExtractedField<string>;
  emailDate: ExtractedField<string>;
  referenceId: ExtractedField<string>;
  confirmationWording: ExtractedField<ConfirmationWordingType>;
  platformName: ExtractedField<string>;
  detectedTextSnippet?: string;
}

export interface FieldValidationResult {
  field: string;
  matched: boolean | null; // null when field is not present in evidence
  score: number; // 0.0 - 1.0
  extractedValue: any;
  expectedValue: any;
  status: 'MATCH' | 'MISMATCH' | 'MISSING' | 'AMBIGUOUS';
  reason?: string;
}

export interface ValidationSummary {
  emailMatch: FieldValidationResult;
  nameMatch: FieldValidationResult;
  opportunityMatch: FieldValidationResult;
  senderMatch: FieldValidationResult;
  dateMatch: FieldValidationResult;
  referenceIdCheck: FieldValidationResult & { isDuplicate?: boolean };
  wordingCheck: FieldValidationResult;
  mismatchReasons: string[];
  isAllRequiredPassed: boolean;
  overallScore: number;
}

export type RegistrationVerificationStatus =
  | 'STARTED'
  | 'PROOF_SUBMITTED'
  | 'VERIFYING'
  | 'PENDING_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'FAILED';

export interface VerificationDecision {
  status: RegistrationVerificationStatus;
  decisionReason: string;
  mismatchReasons: string[];
  isAuthentic: boolean;
  confidenceScore: number;
  requiresManualReview: boolean;
  suggestedAction: string;
}

export interface VerificationServiceResult {
  success: boolean;
  status: RegistrationVerificationStatus;
  decision: VerificationDecision;
  extractedData: ExtractedEvidenceData;
  validationResults: ValidationSummary;
  ocrConfidence: number;
  ocrSnippet: string;
  evidenceId?: string;
  errorMessage?: string;
}

export interface StudentContext {
  id: string;
  name: string;
  email: string;
  profile?: {
    college?: string | null;
    department?: string | null;
    year?: number | null;
    phone?: string | null;
  } | null;
}

export interface OpportunityContext {
  id: string;
  title: string;
  role?: string | null;
  organization: string;
  companyName?: string | null;
  registrationUrl?: string | null;
  opportunityUrl?: string | null;
  applyUrl?: string | null;
  applicationDeadline?: Date | string | null;
  deadline?: Date | string | null;
  type?: string | null;
}

export interface RegistrationContext {
  id: string;
  opportunityId: string;
  studentId: string;
  status: string;
  startedAt?: Date | null;
  initiatedAt?: Date | null;
  externalRegistrationId?: string | null;
}
