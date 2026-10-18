import { ConfirmationWordingType, ExtractedEvidenceData, ExtractedField } from './types';

/**
 * Universal layout-agnostic email confirmation extractor.
 * Parses unstructured text from arbitrary external platform emails.
 */
export function extractEvidenceFromOcrText(
  rawText: string,
  ocrConfidence = 0.8
): ExtractedEvidenceData {
  if (!rawText || !rawText.trim()) {
    return createEmptyExtractedData(ocrConfidence);
  }

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const fullText = rawText;

  // 1. Extract Student Email
  const studentEmail = extractStudentEmail(fullText, lines, ocrConfidence);

  // 2. Extract Student Name
  const studentName = extractStudentName(fullText, lines, ocrConfidence);

  // 3. Extract Sender Email and Domain
  const { senderEmail, senderDomain } = extractSenderDetails(fullText, lines, ocrConfidence);

  // 4. Extract Email Subject
  const emailSubject = extractEmailSubject(fullText, lines, ocrConfidence);

  // 5. Extract Email Date & Time
  const emailDate = extractEmailDate(fullText, lines, ocrConfidence);

  // 6. Extract Reference / Application / Registration ID
  const referenceId = extractReferenceId(fullText, lines, ocrConfidence);

  // 7. Extract Opportunity / Event / Role Name
  const opportunityName = extractOpportunityName(fullText, lines, emailSubject.value, ocrConfidence);

  // 8. Classify Confirmation Wording
  const confirmationWording = classifyConfirmationWording(fullText, lines, ocrConfidence);

  // 9. Identify Platform Name
  const platformName = identifyPlatformName(fullText, senderDomain.value, ocrConfidence);

  // Clean snippet for review display (first 300 chars, safe representation)
  const detectedTextSnippet = fullText.slice(0, 300).replace(/\s+/g, ' ');

  return {
    studentName,
    studentEmail,
    opportunityName,
    senderEmail,
    senderDomain,
    emailSubject,
    emailDate,
    referenceId,
    confirmationWording,
    platformName,
    detectedTextSnippet
  };
}

function createEmptyExtractedData(confidence: number): ExtractedEvidenceData {
  return {
    studentName: { value: null, found: false, confidence },
    studentEmail: { value: null, found: false, confidence },
    opportunityName: { value: null, found: false, confidence },
    senderEmail: { value: null, found: false, confidence },
    senderDomain: { value: null, found: false, confidence },
    emailSubject: { value: null, found: false, confidence },
    emailDate: { value: null, found: false, confidence },
    referenceId: { value: null, found: false, confidence },
    confirmationWording: { value: 'AMBIGUOUS_OR_UNREADABLE', found: false, confidence },
    platformName: { value: null, found: false, confidence },
    detectedTextSnippet: ''
  };
}

/**
 * 1. Extract Student Email from recipient headers, body labels, or general text.
 */
function extractStudentEmail(text: string, lines: string[], confidence: number): ExtractedField<string> {
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;

  // Check labeled recipient lines first: "To:", "Recipient:", "Email:", "Student Email:", etc.
  for (const line of lines) {
    const toMatch = line.match(/(?:to|recipient|registered\s+email|participant\s+email|candidate\s+email|email|sent\s+to)[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (toMatch && toMatch[1]) {
      const email = toMatch[1].trim().toLowerCase();
      // Ignore system or generic senders in recipient field
      if (!isGenericSenderEmail(email)) {
        return { value: email, found: true, confidence, rawSnippet: line };
      }
    }
  }

  // Look for all emails in the text
  const allEmails = Array.from(text.matchAll(emailRegex)).map((m) => m[1].toLowerCase());
  // Filter out known sender/noreply keywords
  const candidateEmails = allEmails.filter((e) => !isGenericSenderEmail(e));

  if (candidateEmails.length > 0) {
    return {
      value: candidateEmails[0],
      found: true,
      confidence: confidence * 0.9,
      rawSnippet: candidateEmails[0]
    };
  }

  return { value: null, found: false, confidence };
}

function isGenericSenderEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return (
    lower.includes('noreply') ||
    lower.includes('no-reply') ||
    lower.includes('support@') ||
    lower.includes('info@') ||
    lower.includes('notifications@') ||
    lower.includes('mailer@') ||
    lower.includes('updates@') ||
    lower.includes('news@') ||
    lower.includes('team@')
  );
}

/**
 * 2. Extract Student Name from greeting or candidate labels.
 */
function extractStudentName(text: string, lines: string[], confidence: number): ExtractedField<string> {
  // Pattern 1: Greeting lines: "Dear [Name]", "Hi [Name]", "Hello [Name]", "Hey [Name]"
  for (const line of lines) {
    const greetingMatch = line.match(/^(?:dear|hi|hello|hey|greetings|welcome)\s+([A-Za-z][A-Za-z\s.'-]{1,35})(?:[,!:]|$)/i);
    if (greetingMatch && greetingMatch[1]) {
      const candidate = cleanExtractedName(greetingMatch[1]);
      if (isValidPersonName(candidate)) {
        return { value: candidate, found: true, confidence, rawSnippet: line };
      }
    }
  }

  // Pattern 2: Explicit name labels: "Name: John Doe", "Candidate Name: Jane Doe", "Student: Alex"
  for (const line of lines) {
    const labelMatch = line.match(/(?:candidate(?:\s+name)?|participant(?:\s+name)?|student(?:\s+name)?|name|registrant)[:\s]+([A-Za-z][A-Za-z\s.'-]{1,35})/i);
    if (labelMatch && labelMatch[1]) {
      const candidate = cleanExtractedName(labelMatch[1]);
      if (isValidPersonName(candidate)) {
        return { value: candidate, found: true, confidence, rawSnippet: line };
      }
    }
  }

  // Pattern 3: Congratulatory / Thanks phrases: "Thank you, [Name], for registering", "Congratulations [Name]!"
  const thanksMatch = text.match(/(?:thank\s+you|congratulations|kudos|welcome),?\s+([A-Za-z][A-Za-z\s.'-]{1,30})[,\s!]+(?:for|you|on)/i);
  if (thanksMatch && thanksMatch[1]) {
    const candidate = cleanExtractedName(thanksMatch[1]);
    if (isValidPersonName(candidate)) {
      return { value: candidate, found: true, confidence: confidence * 0.85, rawSnippet: thanksMatch[0] };
    }
  }

  return { value: null, found: false, confidence };
}

function cleanExtractedName(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/^(mr\.|ms\.|mrs\.|dr\.|prof\.)\s+/i, '')
    .replace(/[,!:]+$/, '')
    .trim();
}

function isValidPersonName(name: string): boolean {
  if (!name || name.length < 2 || name.length > 40) return false;
  // Ignore common false positives from headers
  const forbidden = [
    'team', 'user', 'member', 'applicant', 'candidate', 'participant', 'all',
    'there', 'everyone', 'student', 'fellow', 'subscriber', 'registered',
    'confirmation', 'registration', 'unstop', 'notification', 'support',
    'noreply', 'careers', 'admin', 'google', 'hiretoday'
  ];
  return !forbidden.includes(name.toLowerCase());
}

/**
 * 3. Extract Sender Email and Domain.
 */
function extractSenderDetails(
  text: string,
  lines: string[],
  confidence: number
): { senderEmail: ExtractedField<string>; senderDomain: ExtractedField<string> } {
  // Look for "From:" lines
  for (const line of lines) {
    const fromMatch = line.match(/(?:from|sender)[:\s]+.*?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (fromMatch && fromMatch[1]) {
      const email = fromMatch[1].toLowerCase().trim();
      const domain = email.split('@')[1] || '';
      return {
        senderEmail: { value: email, found: true, confidence, rawSnippet: line },
        senderDomain: { value: domain, found: true, confidence, rawSnippet: domain }
      };
    }
  }

  // Look for angle bracket sender: "<noreply@unstop.com>"
  const bracketMatch = text.match(/<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/i);
  if (bracketMatch && bracketMatch[1]) {
    const email = bracketMatch[1].toLowerCase().trim();
    const domain = email.split('@')[1] || '';
    return {
      senderEmail: { value: email, found: true, confidence: confidence * 0.9, rawSnippet: bracketMatch[0] },
      senderDomain: { value: domain, found: true, confidence: confidence * 0.9, rawSnippet: domain }
    };
  }

  // Look for standalone domain mentioned in sender block or footer
  const domainMatch = text.match(/(?:via|from|at)\s+([a-zA-Z0-9-]+\.(?:com|org|io|in|co|net|dev|edu|ai))\b/i);
  if (domainMatch && domainMatch[1]) {
    return {
      senderEmail: { value: null, found: false, confidence },
      senderDomain: { value: domainMatch[1].toLowerCase().trim(), found: true, confidence: confidence * 0.8, rawSnippet: domainMatch[0] }
    };
  }

  return {
    senderEmail: { value: null, found: false, confidence },
    senderDomain: { value: null, found: false, confidence }
  };
}

/**
 * 4. Extract Email Subject.
 */
function extractEmailSubject(text: string, lines: string[], confidence: number): ExtractedField<string> {
  for (const line of lines) {
    const subjectMatch = line.match(/(?:subject|sub)[:\s]+(.{5,120})/i);
    if (subjectMatch && subjectMatch[1]) {
      const sub = subjectMatch[1].trim();
      return { value: sub, found: true, confidence, rawSnippet: line };
    }
  }

  // Look for bold header or first headline that looks like an email subject
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    if (
      /registration\s+confirmed|application\s+(?:received|submitted)|registered\s+for|welcome\s+to|response\s+has\s+been\s+recorded/i.test(line)
    ) {
      return { value: line.trim(), found: true, confidence: confidence * 0.85, rawSnippet: line };
    }
  }

  return { value: null, found: false, confidence };
}

/**
 * 5. Extract Email Date & Time.
 */
function extractEmailDate(text: string, lines: string[], confidence: number): ExtractedField<string> {
  // Labeled date lines: "Date: 12 Oct 2026", "Sent: Monday, October 12, 2026 10:30 AM"
  for (const line of lines) {
    const dateLineMatch = line.match(/(?:date|sent|received|submitted\s+on|registered\s+on)[:\s]+([A-Za-z0-9,:\s\/-]{6,40})/i);
    if (dateLineMatch && dateLineMatch[1]) {
      const parsed = parseDateString(dateLineMatch[1]);
      if (parsed) {
        return { value: parsed.toISOString(), found: true, confidence, rawSnippet: line };
      }
    }
  }

  // Date formats: DD Month YYYY, Month DD, YYYY, YYYY-MM-DD, DD/MM/YYYY
  const dateRegex = /\b(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}|\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/i;
  const match = text.match(dateRegex);
  if (match && match[1]) {
    const parsed = parseDateString(match[1]);
    if (parsed) {
      return { value: parsed.toISOString(), found: true, confidence: confidence * 0.8, rawSnippet: match[0] };
    }
  }

  return { value: null, found: false, confidence };
}

function parseDateString(raw: string): Date | null {
  try {
    const cleaned = raw.trim().replace(/(?:at|,)\s*/g, ' ');
    const d = new Date(cleaned);
    if (!isNaN(d.getTime()) && d.getFullYear() >= 2020 && d.getFullYear() <= 2035) {
      return d;
    }
  } catch {
    // Ignore invalid date strings
  }
  return null;
}

/**
 * 6. Extract Reference / Application / Registration ID.
 */
function extractReferenceId(text: string, lines: string[], confidence: number): ExtractedField<string> {
  // Common patterns:
  // "Registration ID: APP-12345"
  // "Application ID: #98213"
  // "Reference No: REF-2026-X"
  // "Order ID: ..."
  // "Ticket ID: ..."
  for (const line of lines) {
    const idMatch = line.match(/(?:registration\s*id|application\s*id|reference\s*(?:id|no|number|#)?|reg(?:\.|\s)*id|ticket\s*id|confirmation\s*(?:id|code|no|#))[:\s#]+([A-Za-z0-9-_]{4,32})/i);
    if (idMatch && idMatch[1]) {
      const idVal = idMatch[1].trim();
      // Ensure it's not a generic word like "confirmed" or "success"
      if (!/^(confirmed|successful|success|verified|registered|completed|true|yes)$/i.test(idVal)) {
        return { value: idVal, found: true, confidence, rawSnippet: line };
      }
    }
  }

  // Look for prefixed ID tokens like "APP-2026-12345" or "UNSTOP-998877"
  const tokenMatch = text.match(/\b([A-Z]{2,10}-[0-9]{3,12}|REG-[0-9A-Z]{4,12}|APP-[0-9A-Z]{4,12})\b/);
  if (tokenMatch && tokenMatch[1]) {
    return { value: tokenMatch[1].trim(), found: true, confidence: confidence * 0.85, rawSnippet: tokenMatch[0] };
  }

  return { value: null, found: false, confidence };
}

/**
 * 7. Extract Opportunity / Event / Role Name.
 */
function extractOpportunityName(
  text: string,
  lines: string[],
  subject: string | null,
  confidence: number
): ExtractedField<string> {
  // Labeled lines: "Event: Smart India Hackathon", "Job Title: Frontend Intern", "Opportunity: DevRel Fellowship"
  for (const line of lines) {
    const oppMatch = line.match(/(?:(?:^|\b)(?:opportunity|event(?:\s+name)?|hackathon(?:\s+name)?|competition|job(?:\s+title|\s+role)?|role|position)\s*[:=-]\s*([^,\n]{3,80}))/i);
    if (oppMatch && oppMatch[1]) {
      const opp = oppMatch[1].trim();
      return { value: opp, found: true, confidence, rawSnippet: line };
    }
  }

  // Phrased lines: "registered for [Opportunity Name]", "applied for [Role Name]", "registration for [Opportunity Name]"
  for (const line of lines) {
    const phraseMatch = line.match(
      /(?:registration\s+(?:for|to)|registered\s+(?:for|to)|applied\s+(?:for|to)|application\s+(?:for|to)|participation\s+in|confirmed\s+for|welcome\s+to)\s+["']?([^"'\n\r.]{3,70})["']?/i
    );
    if (phraseMatch && phraseMatch[1]) {
      const opp = phraseMatch[1].trim();
      // Avoid capturing trailing words like "is confirmed", "successfully", "submitted", etc.
      const cleanOpp = opp
        .replace(/\s+(?:(?:has\s+been\s+)?(?:successfully\s+)?submitted|is\s+confirmed|confirmed|successfully).*$/i, '')
        .replace(/\s+(?:on|at|with)\s*$/i, '')
        .trim();
      if (cleanOpp.length >= 3) {
        return { value: cleanOpp, found: true, confidence: confidence * 0.85, rawSnippet: line };
      }
    }
  }

  // Fallback to subject line if subject contains opportunity wording
  if (subject) {
    const subMatch = subject.match(/(?:for|in|to)\s+["']?([^"'.]{3,60})["']?$/i);
    if (subMatch && subMatch[1]) {
      return { value: subMatch[1].trim(), found: true, confidence: confidence * 0.75, rawSnippet: subject };
    }
  }

  return { value: null, found: false, confidence };
}

/**
 * 8. Confirmation Wording Classification (Section 5.7).
 * Distinguishes:
 * - SUCCESSFUL_REGISTRATION
 * - APPLICATION_RECEIVED
 * - INVITATION_TO_REGISTER
 * - MARKETING_EMAIL
 * - OTP_OR_VERIFICATION
 * - INCOMPLETE_REGISTRATION
 * - AMBIGUOUS_OR_UNREADABLE
 */
export function classifyConfirmationWording(
  text: string,
  lines: string[],
  confidence: number
): ExtractedField<ConfirmationWordingType> {
  const lower = text.toLowerCase();

  // 1. Check OTP or Email Verification emails (HIGH PRIORITY CHECK: Must NOT be confused with registration)
  if (
    lower.includes('verification code') ||
    lower.includes('one-time password') ||
    lower.includes('verify your email') ||
    lower.includes('security code') ||
    /\b(?:your\s+)?otp\b/i.test(lower) ||
    /click\s+the\s+link\s+below\s+to\s+verify/i.test(lower)
  ) {
    return {
      value: 'OTP_OR_VERIFICATION',
      found: true,
      confidence,
      rawSnippet: 'Detected OTP or email address verification email'
    };
  }

  // 2. Check Incomplete Registration notices
  if (
    lower.includes('incomplete application') ||
    lower.includes('complete your registration') ||
    lower.includes('action required to complete') ||
    lower.includes('finish your application') ||
    lower.includes('draft saved') ||
    lower.includes('payment pending')
  ) {
    return {
      value: 'INCOMPLETE_REGISTRATION',
      found: true,
      confidence,
      rawSnippet: 'Detected incomplete application notice'
    };
  }

  // 3. Check Marketing emails
  if (
    lower.includes('check out these') ||
    lower.includes('upcoming events you may like') ||
    lower.includes('recommended for you') ||
    lower.includes('you might be interested in') ||
    lower.includes('sponsored') ||
    /explore\s+(?:more|new)|discover\s+new/i.test(lower) ||
    (lower.includes('unsubscribe') && !lower.includes('registration confirmed') && !lower.includes('registered'))
  ) {
    return {
      value: 'MARKETING_EMAIL',
      found: true,
      confidence,
      rawSnippet: 'Detected promotional or marketing newsletter'
    };
  }

  // 4. Check Invitation to Register emails
  if (
    lower.includes('you are invited to register') ||
    lower.includes('invited you to apply') ||
    lower.includes('invitation to participate') ||
    lower.includes('click here to register now')
  ) {
    return {
      value: 'INVITATION_TO_REGISTER',
      found: true,
      confidence,
      rawSnippet: 'Detected invitation to register'
    };
  }

  // 5. Check Successful Registration Confirmation (STRONG CONFIRMATION)
  const strongSuccessPatterns = [
    /registration\s+(?:is\s+)?confirmed/i,
    /successfully\s+registered/i,
    /registration\s+successful/i,
    /you\s+are\s+(?:now\s+)?registered/i,
    /your\s+registration\s+has\s+been\s+received/i,
    /response\s+has\s+been\s+recorded/i, // Google Forms standard
    /ticket\s+confirmed/i,
    /seat\s+reserved/i,
    /you're\s+in!/i,
    /you\s+have\s+successfully\s+applied/i,
    /application\s+(?:successfully\s+)?submitted/i,
    /application[\s\S]{0,120}?(?:has\s+been\s+)?submitted(?:\s+successfully)?/i,
    /application[\s\S]{0,120}?successfully\s+submitted/i,
    /submitted\s+successfully/i,
    /successfully\s+submitted/i,
    /has\s+been\s+submitted/i,
    /application\s+submitted/i,
    /thank\s+you\s+for\s+registering/i
  ];

  for (const pat of strongSuccessPatterns) {
    if (pat.test(lower)) {
      return {
        value: 'SUCCESSFUL_REGISTRATION',
        found: true,
        confidence,
        rawSnippet: 'Detected explicit registration confirmation wording'
      };
    }
  }

  // 6. Check Application Received Confirmation
  const appReceivedPatterns = [
    /we\s+have\s+received\s+your\s+application/i,
    /application\s+(?:is\s+)?under\s+review/i,
    /thank\s+you\s+for\s+applying/i,
    /application\s+received/i
  ];

  for (const pat of appReceivedPatterns) {
    if (pat.test(lower)) {
      return {
        value: 'APPLICATION_RECEIVED',
        found: true,
        confidence,
        rawSnippet: 'Detected application received wording'
      };
    }
  }

  // 7. Ambiguous or Unreadable
  return {
    value: 'AMBIGUOUS_OR_UNREADABLE',
    found: false,
    confidence: confidence * 0.4,
    rawSnippet: 'No clear confirmation or status wording identified'
  };
}

/**
 * 9. Platform Identification.
 */
function identifyPlatformName(
  text: string,
  senderDomain: string | null,
  confidence: number
): ExtractedField<string> {
  const lower = text.toLowerCase();
  const domainLower = (senderDomain || '').toLowerCase();

  if (domainLower.includes('unstop.com') || lower.includes('unstop')) {
    return { value: 'Unstop', found: true, confidence, rawSnippet: 'Unstop' };
  }
  if (domainLower.includes('google.com') || lower.includes('google forms') || lower.includes('forms.gle')) {
    return { value: 'Google Forms', found: true, confidence, rawSnippet: 'Google Forms' };
  }
  if (domainLower.includes('hiretoday') || lower.includes('hiretoday')) {
    return { value: 'HireToday', found: true, confidence, rawSnippet: 'HireToday' };
  }
  if (domainLower.includes('devfolio.co') || lower.includes('devfolio')) {
    return { value: 'Devfolio', found: true, confidence, rawSnippet: 'Devfolio' };
  }
  if (domainLower.includes('hackerearth.com') || lower.includes('hackerearth')) {
    return { value: 'HackerEarth', found: true, confidence, rawSnippet: 'HackerEarth' };
  }
  if (domainLower.includes('hackerrank.com') || lower.includes('hackerrank')) {
    return { value: 'HackerRank', found: true, confidence, rawSnippet: 'HackerRank' };
  }
  if (domainLower.includes('linkedin.com') || lower.includes('linkedin')) {
    return { value: 'LinkedIn', found: true, confidence, rawSnippet: 'LinkedIn' };
  }
  if (domainLower.includes('internshala.com') || lower.includes('internshala')) {
    return { value: 'Internshala', found: true, confidence, rawSnippet: 'Internshala' };
  }

  return { value: null, found: false, confidence };
}
