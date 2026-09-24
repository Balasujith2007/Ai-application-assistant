import { ApplicationStatus } from "@prisma/client";

export interface StatusExtractionResult {
  detectedStatus: ApplicationStatus | "NEEDS_REVIEW" | null;
  confidence: number;
  matchedKeywords: string[];
  detectedCompany: string | null;
  detectedRole: string | null;
  referenceToken: string | null;
  cleanSnippet: string;
  isOfferLetter: boolean;
  isInterviewInvite: boolean;
}

interface KeywordRule {
  status: ApplicationStatus;
  patterns: RegExp[];
  negativePatterns?: RegExp[];
  weight: number;
}

const RULES: KeywordRule[] = [
  // 1. OFFER / SELECTED (Highest priority to avoid missing offers)
  {
    status: ApplicationStatus.SELECTED,
    patterns: [
      /\bpleased to offer\b/i,
      /\boffer of employment\b/i,
      /\bcongratulations.*offer\b/i,
      /\bdelighted to extend an offer\b/i,
      /\bwe would like to offer you the position\b/i,
      /\bjob offer letter\b/i,
      /\binternship offer\b/i,
      /\byou have been selected\b/i,
      /\bwelcome to the team\b/i,
      /\bformal offer\b/i,
      /\bextend an offer to you\b/i,
    ],
    negativePatterns: [
      /\bcannot offer\b/i,
      /\bunable to offer\b/i,
      /\bwill not be offering\b/i,
      /\bnot able to offer\b/i,
    ],
    weight: 0.95,
  },

  // 2. REJECTION
  {
    status: ApplicationStatus.REJECTED,
    patterns: [
      /\bnot moving forward\b/i,
      /\bdecided not to proceed\b/i,
      /\bpursuing other candidates\b/i,
      /\bunfortunately, we have chosen\b/i,
      /\bunfortunately, we are not able\b/i,
      /\bunfortunately.*not selected\b/i,
      /\bregret to inform you\b/i,
      /\bnot be moving forward with your application\b/i,
      /\bdecided to move forward with other\b/i,
      /\bother candidates who more closely\b/i,
      /\bwe will not be progressing\b/i,
      /\bposition has been filled\b/i,
      /\bunsuccessful on this occasion\b/i,
    ],
    weight: 0.92,
  },

  // 3. INTERVIEW
  {
    status: ApplicationStatus.INTERVIEW,
    patterns: [
      /\binvite you to interview\b/i,
      /\bschedule an interview\b/i,
      /\binterview invitation\b/i,
      /\btechnical round\b/i,
      /\bcoding assessment\b/i,
      /\bhackerRank test\b/i,
      /\bleetCode assessment\b/i,
      /\bfirst round of interview\b/i,
      /\bnext round of interview\b/i,
      /\bphone screen\b/i,
      /\bvirtual interview\b/i,
      /\bcalendly\.com\b/i,
      /\bselect a time for our chat\b/i,
      /\bonline assessment invitation\b/i,
      /\btake-home assignment\b/i,
    ],
    weight: 0.9,
  },

  // 4. SHORTLISTED / UNDER_REVIEW
  {
    status: ApplicationStatus.SHORTLISTED,
    patterns: [
      /\byou have been shortlisted\b/i,
      /\bprofile has been shortlisted\b/i,
      /\bshortlisted for the next stage\b/i,
      /\badvance to the next round\b/i,
      /\bmoving to the next stage\b/i,
    ],
    weight: 0.88,
  },
  {
    status: ApplicationStatus.UNDER_REVIEW,
    patterns: [
      /\bapplication is under review\b/i,
      /\breviewing your application\b/i,
      /\bour hiring team is reviewing\b/i,
      /\bcurrently reviewing your resume\b/i,
    ],
    weight: 0.82,
  },

  // 5. APPLIED / CONFIRMATION
  {
    status: ApplicationStatus.APPLIED,
    patterns: [
      /\bthank you for applying\b/i,
      /\bapplication received\b/i,
      /\bwe have received your application\b/i,
      /\bapplication submitted successfully\b/i,
      /\bthanks for your interest in joining\b/i,
      /\bwe received your submission\b/i,
      /\byour application to .* has been received\b/i,
    ],
    weight: 0.85,
  },
];

/**
 * Extract clean, sanitized text snippet from subject & body
 */
export function sanitizeSnippet(rawText: string, maxLength = 350): string {
  if (!rawText) return "";
  const cleaned = rawText
    .replace(/<[^>]*>?/gm, " ") // Remove HTML tags
    .replace(/https?:\/\/[^\s]+/g, "[LINK]") // Redact full URLs for safety
    .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, "[EMAIL]") // Redact emails
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > maxLength ? cleaned.substring(0, maxLength) + "..." : cleaned;
}

/**
 * Extract Company Name heuristics from sender name, sender email, or subject
 */
export function extractCompanyName(senderName?: string | null, senderEmail?: string | null, subject?: string | null): string | null {
  // 1. From Sender Name: e.g. "Google Careers", "Microsoft Recruiting", "Stripe Jobs"
  if (senderName) {
    const cleanedSender = senderName
      .replace(/\b(Careers|Recruiting|Talent|HR|Jobs|Team|Notifications|No-Reply|Hiring|Staffing|People|Acquisition)\b/gi, "")
      .replace(/[<>'"()]/g, "")
      .trim();
    if (cleanedSender && cleanedSender.length > 1 && !/^(noreply|notification|mailer|system)$/i.test(cleanedSender)) {
      return cleanedSender;
    }
  }

  // 2. From Subject: e.g. "Your application to Amazon", "Google Interview Invitation"
  if (subject) {
    const atMatch = subject.match(/(?:application to|applied at|role at|interview with|joining)\s+([A-Z0-9][A-Za-z0-9\s&.-]{1,30})/i);
    if (atMatch && atMatch[1]) {
      const comp = atMatch[1].trim().split(/\s*[-–|:]/)[0].trim();
      if (comp.length > 1 && !/^(the|a|an|our|this)\b/i.test(comp)) {
        return comp;
      }
    }
  }

  // 3. From Domain: e.g. "recruiting@stripe.com" -> "Stripe"
  if (senderEmail && senderEmail.includes("@")) {
    const domain = senderEmail.split("@")[1]?.toLowerCase() || "";
    const excludeDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "mail.com", "greenhouse.io", "lever.co", "workday.com", "smartrecruiters.com", "ashbyhq.com", "myworkday.com"];
    
    // Check if domain is a direct company domain
    if (!excludeDomains.includes(domain)) {
      const parts = domain.split(".");
      if (parts.length >= 2) {
        const root = parts[0];
        if (root.length > 2) {
          return root.charAt(0).toUpperCase() + root.slice(1);
        }
      }
    }
  }

  return null;
}

/**
 * Extract Job Role Title from subject or snippet
 */
export function extractRoleTitle(subject?: string | null, textSnippet?: string | null): string | null {
  const combined = `${subject || ""} ${textSnippet || ""}`;
  
  // Common role patterns
  const rolePattern = /\b((?:Senior\s+|Junior\s+|Lead\s+|Associate\s+|Graduate\s+)?(?:Software Engineer|Frontend Developer|Backend Developer|Full Stack Developer|Data Scientist|Product Manager|AI Engineer|ML Engineer|DevOps Engineer|QA Engineer|Systems Engineer|SDE\s*(?:I|II|III)?|Intern|Summer Intern|Engineering Intern))\b/i;
  
  const match = combined.match(rolePattern);
  return match ? match[1].trim() : null;
}

/**
 * Extract Application Reference or Job ID
 */
export function extractReferenceToken(subject?: string | null, textSnippet?: string | null): string | null {
  const combined = `${subject || ""} ${textSnippet || ""}`;
  const refMatch = combined.match(/(?:Req(?:uisition)?\s*(?:ID|#)?|App(?:lication)?\s*(?:ID|#)?|Ref(?:erence)?\s*(?:ID|#)?|Job\s*ID:?)\s*[:#-]?\s*([A-Za-z0-9-_]{4,20})/i);
  return refMatch ? refMatch[1] : null;
}

/**
 * Analyze an email (subject + body) to determine company, role, reference, and application status
 */
export function parseEmailApplicationStatus(params: {
  subject: string;
  bodyText: string;
  senderName?: string | null;
  senderEmail?: string | null;
}): StatusExtractionResult {
  const { subject, bodyText, senderName, senderEmail } = params;
  const fullText = `${subject}\n${bodyText}`.toLowerCase();
  const cleanSnippet = sanitizeSnippet(bodyText || subject);

  let bestStatus: ApplicationStatus | null = null;
  let highestConfidence = 0.0;
  const matchedKeywords: string[] = [];

  for (const rule of RULES) {
    // Check negative patterns first
    if (rule.negativePatterns && rule.negativePatterns.some((np) => np.test(fullText))) {
      continue;
    }

    for (const pattern of rule.patterns) {
      const match = fullText.match(pattern);
      if (match) {
        matchedKeywords.push(match[0]);
        if (rule.weight > highestConfidence) {
          highestConfidence = rule.weight;
          bestStatus = rule.status;
        }
      }
    }
  }

  const detectedCompany = extractCompanyName(senderName, senderEmail, subject);
  const detectedRole = extractRoleTitle(subject, bodyText);
  const referenceToken = extractReferenceToken(subject, bodyText);

  // If no strong confidence or conflicting signals, flag as NEEDS_REVIEW
  let finalStatus: ApplicationStatus | "NEEDS_REVIEW" | null = bestStatus;
  if (!bestStatus || highestConfidence < 0.6) {
    finalStatus = null;
  } else if (highestConfidence < 0.85) {
    // Ambiguous confidence score -> student review recommended
    finalStatus = "NEEDS_REVIEW";
  }

  return {
    detectedStatus: finalStatus,
    confidence: Number(highestConfidence.toFixed(2)),
    matchedKeywords: Array.from(new Set(matchedKeywords)),
    detectedCompany,
    detectedRole,
    referenceToken,
    cleanSnippet,
    isOfferLetter: bestStatus === ApplicationStatus.SELECTED,
    isInterviewInvite: bestStatus === ApplicationStatus.INTERVIEW,
  };
}
