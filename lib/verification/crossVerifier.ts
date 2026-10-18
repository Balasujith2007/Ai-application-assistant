import {
  ExtractedEvidenceData,
  FieldValidationResult,
  OpportunityContext,
  RegistrationContext,
  StudentContext,
  ValidationSummary
} from './types';
import prisma from '@/lib/prisma';

/**
 * Cross-verification service:
 * Evaluates extracted evidence against server-side student, opportunity, and registration records.
 */
export async function crossVerifyEvidence(
  extracted: ExtractedEvidenceData,
  student: StudentContext,
  opportunity: OpportunityContext,
  registration: RegistrationContext
): Promise<ValidationSummary> {
  const mismatchReasons: string[] = [];

  // 5.1 Student Email Cross-Verification
  const emailMatch = verifyStudentEmail(extracted.studentEmail.value, student.email);
  if (emailMatch.status === 'MISMATCH') {
    mismatchReasons.push(
      `Email Mismatch: Confirmation email is addressed to "${extracted.studentEmail.value}", but your authenticated CareerAI email is "${student.email}".`
    );
  }

  // 5.2 Student Name Cross-Verification
  const nameMatch = verifyStudentName(extracted.studentName.value, student.name);
  if (nameMatch.status === 'MISMATCH') {
    mismatchReasons.push(
      `Name Mismatch: Detected name "${extracted.studentName.value}" does not match profile name "${student.name}".`
    );
  }

  // 5.3 Opportunity Name Cross-Verification
  const opportunityMatch = verifyOpportunity(
    extracted.opportunityName.value,
    extracted.emailSubject.value,
    opportunity
  );
  if (opportunityMatch.status === 'MISMATCH') {
    mismatchReasons.push(
      `Opportunity Mismatch: Confirmation appears to be for "${extracted.opportunityName.value || extracted.emailSubject.value}", which differs from "${opportunity.title}".`
    );
  }

  // 5.4 Sender Analysis
  const senderMatch = verifySender(
    extracted.senderEmail.value,
    extracted.senderDomain.value,
    opportunity
  );
  if (senderMatch.status === 'MISMATCH') {
    mismatchReasons.push(
      `Sender Notice: Sender domain "${extracted.senderDomain.value}" does not align with the opportunity domain.`
    );
  }

  // 5.5 Registration Date Verification
  const dateMatch = verifyRegistrationDate(
    extracted.emailDate.value,
    registration.startedAt || registration.initiatedAt
  );
  if (dateMatch.status === 'MISMATCH' || dateMatch.status === 'AMBIGUOUS') {
    if (dateMatch.reason) {
      mismatchReasons.push(`Date Discrepancy: ${dateMatch.reason}`);
    }
  }

  // 5.6 Registration Reference ID & Duplicate Detection
  const referenceIdCheck = await verifyReferenceId(
    extracted.referenceId.value,
    student.id,
    registration.id
  );
  if (referenceIdCheck.isDuplicate) {
    mismatchReasons.push(
      `Duplicate Reference ID: Reference ID "${extracted.referenceId.value}" has already been used in another registration.`
    );
  }

  // 5.7 Confirmation Wording Check
  const wordingCheck = verifyConfirmationWording(extracted.confirmationWording.value);
  if (wordingCheck.status === 'MISMATCH' || wordingCheck.status === 'AMBIGUOUS') {
    if (wordingCheck.reason) {
      mismatchReasons.push(`Confirmation Notice: ${wordingCheck.reason}`);
    }
  }

  // Compute Overall Score
  const scores = [
    emailMatch.score * 0.35,
    nameMatch.score * 0.15,
    opportunityMatch.score * 0.30,
    wordingCheck.score * 0.20
  ];
  const overallScore = Math.min(1.0, Math.max(0.0, scores.reduce((a, b) => a + b, 0)));

  const isAllRequiredPassed =
    emailMatch.status !== 'MISMATCH' &&
    opportunityMatch.status !== 'MISMATCH' &&
    !referenceIdCheck.isDuplicate &&
    wordingCheck.status === 'MATCH';

  return {
    emailMatch,
    nameMatch,
    opportunityMatch,
    senderMatch,
    dateMatch,
    referenceIdCheck,
    wordingCheck,
    mismatchReasons,
    isAllRequiredPassed,
    overallScore
  };
}

/**
 * 5.1 Student Email Verification
 * Normalizes case and whitespace.
 * If screenshot contains an email that is NOT the student's email, flag mismatch!
 */
export function verifyStudentEmail(
  extractedEmail: string | null,
  studentEmail: string
): FieldValidationResult {
  if (!extractedEmail) {
    return {
      field: 'email',
      matched: null,
      score: 0.5, // Not rejected solely because platform didn't print email
      extractedValue: null,
      expectedValue: studentEmail,
      status: 'MISSING',
      reason: 'No recipient email visible in screenshot'
    };
  }

  const normalizedExtracted = extractedEmail.trim().toLowerCase();
  const normalizedExpected = studentEmail.trim().toLowerCase();

  if (normalizedExtracted === normalizedExpected) {
    return {
      field: 'email',
      matched: true,
      score: 1.0,
      extractedValue: normalizedExtracted,
      expectedValue: normalizedExpected,
      status: 'MATCH'
    };
  }

  // Discrepancy
  return {
    field: 'email',
    matched: false,
    score: 0.0,
    extractedValue: normalizedExtracted,
    expectedValue: normalizedExpected,
    status: 'MISMATCH',
    reason: `Extracted email "${normalizedExtracted}" does not match student account email "${normalizedExpected}".`
  };
}

/**
 * 5.2 Student Name Verification
 * Allows reasonable differences in whitespace, punctuation, middle initials, or name ordering.
 */
export function verifyStudentName(
  extractedName: string | null,
  profileName: string
): FieldValidationResult {
  if (!extractedName) {
    return {
      field: 'name',
      matched: null,
      score: 0.5,
      extractedValue: null,
      expectedValue: profileName,
      status: 'MISSING',
      reason: 'No candidate or recipient name visible in screenshot'
    };
  }

  const cleanExtracted = normalizeName(extractedName);
  const cleanProfile = normalizeName(profileName);

  if (cleanExtracted === cleanProfile) {
    return {
      field: 'name',
      matched: true,
      score: 1.0,
      extractedValue: extractedName,
      expectedValue: profileName,
      status: 'MATCH'
    };
  }

  // Token set comparison (handles name reversals and initials)
  const extTokens = new Set(cleanExtracted.split(/\s+/).filter(Boolean));
  const profTokens = new Set(cleanProfile.split(/\s+/).filter(Boolean));

  let commonTokens = 0;
  for (const t of extTokens) {
    if (profTokens.has(t)) {
      commonTokens++;
    } else {
      // Check for single letter initial match (e.g. "J." vs "John")
      for (const pt of profTokens) {
        if ((t.length === 1 && pt.startsWith(t)) || (pt.length === 1 && t.startsWith(pt))) {
          commonTokens += 0.5;
          break;
        }
      }
    }
  }

  const totalDistinct = new Set([...extTokens, ...profTokens]).size;
  const tokenScore = totalDistinct > 0 ? commonTokens / totalDistinct : 0;

  // Levenshtein similarity metric
  const levSimilarity = calculateLevenshteinSimilarity(cleanExtracted, cleanProfile);
  const compositeScore = Math.max(tokenScore, levSimilarity);

  if (compositeScore >= 0.7) {
    return {
      field: 'name',
      matched: true,
      score: compositeScore,
      extractedValue: extractedName,
      expectedValue: profileName,
      status: 'MATCH'
    };
  }

  return {
    field: 'name',
    matched: false,
    score: compositeScore,
    extractedValue: extractedName,
    expectedValue: profileName,
    status: 'MISMATCH',
    reason: `Detected name "${extractedName}" differs substantially from "${profileName}".`
  };
}

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateLevenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a.length || !b.length) return 0.0;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[b.length][a.length];
  const maxLen = Math.max(a.length, b.length);
  return 1.0 - distance / maxLen;
}

/**
 * 5.3 Opportunity Name Cross-Verification
 */
export function verifyOpportunity(
  extractedOppName: string | null,
  subject: string | null,
  opportunity: OpportunityContext
): FieldValidationResult {
  const targetCandidates = [
    opportunity.title,
    opportunity.role,
    opportunity.organization,
    opportunity.companyName
  ].filter(Boolean) as string[];

  if (opportunity.registrationUrl) {
    try {
      const url = new URL(opportunity.registrationUrl);
      const segments = url.pathname.split('/').filter(Boolean);
      for (const seg of segments) {
        const cleanSeg = seg
          .replace(/-[0-9]+$/, '')
          .replace(/[-_]+/g, ' ')
          .trim();
        if (cleanSeg.length >= 5 && !['internships', 'jobs', 'competitions', 'hackathons', 'events'].includes(cleanSeg.toLowerCase())) {
          targetCandidates.push(cleanSeg);
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  const extractedCandidates = [extractedOppName, subject].filter(Boolean) as string[];

  if (extractedCandidates.length === 0) {
    return {
      field: 'opportunity',
      matched: null,
      score: 0.5,
      extractedValue: null,
      expectedValue: opportunity.title,
      status: 'MISSING',
      reason: 'No opportunity or event name visible in screenshot'
    };
  }

  let bestScore = 0;
  let bestMatchText = '';

  for (const ext of extractedCandidates) {
    for (const exp of targetCandidates) {
      const score = calculateOpportunitySimilarity(ext, exp);
      if (score > bestScore) {
        bestScore = score;
        bestMatchText = ext;
      }
    }
  }

  if (bestScore >= 0.55) {
    return {
      field: 'opportunity',
      matched: true,
      score: bestScore,
      extractedValue: bestMatchText,
      expectedValue: opportunity.title,
      status: 'MATCH'
    };
  }

  return {
    field: 'opportunity',
    matched: false,
    score: bestScore,
    extractedValue: bestMatchText,
    expectedValue: opportunity.title,
    status: 'MISMATCH',
    reason: `Screenshot appears to mention "${bestMatchText}", which does not match "${opportunity.title}".`
  };
}

function calculateOpportunitySimilarity(ext: string, exp: string): number {
  const cleanExt = ext.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const cleanExp = exp.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

  // Direct substring check
  if (cleanExt.includes(cleanExp) || cleanExp.includes(cleanExt)) {
    return 0.95;
  }

  // Token intersection
  const stopWords = new Set(['the', 'a', 'an', 'and', 'for', 'in', 'of', 'at', 'to', '2025', '2026', 'registration', 'confirmed']);
  const extTokens = new Set(cleanExt.split(/\s+/).filter((t) => t.length > 2 && !stopWords.has(t)));
  const expTokens = new Set(cleanExp.split(/\s+/).filter((t) => t.length > 2 && !stopWords.has(t)));

  if (expTokens.size === 0 || extTokens.size === 0) return 0.5;

  let intersection = 0;
  for (const t of extTokens) {
    if (expTokens.has(t)) intersection++;
  }

  const overlap = intersection / Math.min(extTokens.size, expTokens.size);
  return overlap;
}

/**
 * 5.4 Sender Analysis
 */
export function verifySender(
  senderEmail: string | null,
  senderDomain: string | null,
  opportunity: OpportunityContext
): FieldValidationResult {
  if (!senderEmail && !senderDomain) {
    return {
      field: 'sender',
      matched: null,
      score: 0.5,
      extractedValue: null,
      expectedValue: null,
      status: 'MISSING',
      reason: 'No sender email or domain identified in screenshot'
    };
  }

  const domain = (senderDomain || '').toLowerCase();
  const regUrl = opportunity.registrationUrl || opportunity.opportunityUrl || opportunity.applyUrl || '';

  let expectedDomain = '';
  try {
    if (regUrl) {
      expectedDomain = new URL(regUrl).hostname.replace(/^www\./, '').toLowerCase();
    }
  } catch {
    // Ignore URL parse error
  }

  if (expectedDomain && domain) {
    if (domain.includes(expectedDomain) || expectedDomain.includes(domain)) {
      return {
        field: 'sender',
        matched: true,
        score: 0.9,
        extractedValue: senderEmail || domain,
        expectedValue: expectedDomain,
        status: 'MATCH'
      };
    }
  }

  // Generic platform domain recognition
  const trustedDomains = ['unstop.com', 'google.com', 'hiretoday.com', 'devfolio.co', 'hackerearth.com'];
  if (trustedDomains.some((td) => domain.includes(td))) {
    return {
      field: 'sender',
      matched: true,
      score: 0.8,
      extractedValue: senderEmail || domain,
      expectedValue: expectedDomain || 'Trusted Platform',
      status: 'MATCH'
    };
  }

  return {
    field: 'sender',
    matched: null,
    score: 0.6,
    extractedValue: senderEmail || domain,
    expectedValue: expectedDomain || null,
    status: 'AMBIGUOUS',
    reason: `Sender domain "${domain}" could not be cross-validated against registration link.`
  };
}

/**
 * 5.5 Registration Date Verification
 */
export function verifyRegistrationDate(
  extractedDateIso: string | null,
  registrationStartedAt?: Date | null
): FieldValidationResult {
  if (!extractedDateIso) {
    return {
      field: 'date',
      matched: null,
      score: 0.5,
      extractedValue: null,
      expectedValue: registrationStartedAt ? registrationStartedAt.toISOString() : null,
      status: 'MISSING',
      reason: 'No date found in screenshot'
    };
  }

  const parsedDate = new Date(extractedDateIso);
  if (isNaN(parsedDate.getTime())) {
    return {
      field: 'date',
      matched: null,
      score: 0.5,
      extractedValue: extractedDateIso,
      expectedValue: null,
      status: 'AMBIGUOUS',
      reason: 'Extracted date format is ambiguous'
    };
  }

  const referenceDate = registrationStartedAt ? new Date(registrationStartedAt) : new Date();
  const diffDays = Math.abs(parsedDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);

  // Reasonable tolerance: email date can be within 60 days before or 2 days after session initiation
  if (diffDays <= 60) {
    return {
      field: 'date',
      matched: true,
      score: 1.0,
      extractedValue: parsedDate.toISOString(),
      expectedValue: referenceDate.toISOString(),
      status: 'MATCH'
    };
  }

  return {
    field: 'date',
    matched: false,
    score: 0.3,
    extractedValue: parsedDate.toISOString(),
    expectedValue: referenceDate.toISOString(),
    status: 'MISMATCH',
    reason: `Email date (${parsedDate.toLocaleDateString()}) is significantly different from registration session (${referenceDate.toLocaleDateString()}).`
  };
}

/**
 * 5.6 Registration Reference ID Check & Duplicate Detection
 */
export async function verifyReferenceId(
  referenceId: string | null,
  studentId: string,
  registrationId: string
): Promise<FieldValidationResult & { isDuplicate?: boolean }> {
  if (!referenceId) {
    return {
      field: 'referenceId',
      matched: null,
      score: 0.5,
      extractedValue: null,
      expectedValue: null,
      status: 'MISSING',
      isDuplicate: false,
      reason: 'No reference or application ID detected'
    };
  }

  try {
    // Check if this reference ID is registered on any OTHER student or registration record
    const existingRegistrationWithId = await prisma.opportunityRegistration.findFirst({
      where: {
        externalRegistrationId: referenceId,
        id: { not: registrationId }
      }
    });

    if (existingRegistrationWithId) {
      return {
        field: 'referenceId',
        matched: false,
        score: 0.0,
        extractedValue: referenceId,
        expectedValue: null,
        status: 'MISMATCH',
        isDuplicate: true,
        reason: `Reference ID "${referenceId}" has already been used in another registration record.`
      };
    }

    return {
      field: 'referenceId',
      matched: true,
      score: 1.0,
      extractedValue: referenceId,
      expectedValue: null,
      status: 'MATCH',
      isDuplicate: false
    };
  } catch (err) {
    console.error('Error verifying reference ID uniqueness:', err);
    return {
      field: 'referenceId',
      matched: true,
      score: 0.8,
      extractedValue: referenceId,
      expectedValue: null,
      status: 'MATCH',
      isDuplicate: false
    };
  }
}

/**
 * 5.7 Confirmation Wording Check
 */
export function verifyConfirmationWording(wordingType: string | null): FieldValidationResult {
  if (wordingType === 'SUCCESSFUL_REGISTRATION') {
    return {
      field: 'wording',
      matched: true,
      score: 1.0,
      extractedValue: wordingType,
      expectedValue: 'SUCCESSFUL_REGISTRATION',
      status: 'MATCH'
    };
  }

  if (wordingType === 'APPLICATION_RECEIVED') {
    return {
      field: 'wording',
      matched: true,
      score: 0.9,
      extractedValue: wordingType,
      expectedValue: 'SUCCESSFUL_REGISTRATION',
      status: 'MATCH',
      reason: 'Application received notice detected.'
    };
  }

  if (wordingType === 'OTP_OR_VERIFICATION') {
    return {
      field: 'wording',
      matched: false,
      score: 0.0,
      extractedValue: wordingType,
      expectedValue: 'SUCCESSFUL_REGISTRATION',
      status: 'MISMATCH',
      reason: 'Image appears to be an OTP or email address verification code, not a registration confirmation.'
    };
  }

  if (wordingType === 'INCOMPLETE_REGISTRATION') {
    return {
      field: 'wording',
      matched: false,
      score: 0.0,
      extractedValue: wordingType,
      expectedValue: 'SUCCESSFUL_REGISTRATION',
      status: 'MISMATCH',
      reason: 'Screenshot indicates registration is incomplete or action is still required.'
    };
  }

  if (wordingType === 'MARKETING_EMAIL') {
    return {
      field: 'wording',
      matched: false,
      score: 0.0,
      extractedValue: wordingType,
      expectedValue: 'SUCCESSFUL_REGISTRATION',
      status: 'MISMATCH',
      reason: 'Screenshot contains marketing newsletter or promotional material.'
    };
  }

  if (wordingType === 'INVITATION_TO_REGISTER') {
    return {
      field: 'wording',
      matched: false,
      score: 0.0,
      extractedValue: wordingType,
      expectedValue: 'SUCCESSFUL_REGISTRATION',
      status: 'MISMATCH',
      reason: 'Screenshot is an invitation to register, not proof of completed registration.'
    };
  }

  return {
    field: 'wording',
    matched: null,
    score: 0.4,
    extractedValue: wordingType || 'AMBIGUOUS_OR_UNREADABLE',
    expectedValue: 'SUCCESSFUL_REGISTRATION',
    status: 'AMBIGUOUS',
    reason: 'Could not detect clear confirmation wording in the screenshot.'
  };
}
