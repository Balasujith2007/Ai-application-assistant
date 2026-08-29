/**
 * Flexible registration success detection layer.
 * Inspects the external page DOM and URL within permitted browser context.
 */

export interface VerificationDetectionResult {
  isSuccess: boolean;
  registrationId: string | null;
  confidence: number;
  reason: string;
}

const SUCCESS_URL_PATTERNS: RegExp[] = [
  /\/done\b/i,
  /\/submitted\b/i,
  /\/success\b/i,
  /\/thank-you\b/i,
  /\/thankyou\b/i,
  /\/confirmation\b/i,
  /\/registered\b/i,
  /\/app\/completed\b/i,
  /\/application-received\b/i,
  /formResponse/i,
  /[?&]status=success/i,
  /[?&]submitted=true/i,
  /[?&]submission_id=/i
];

const SUCCESS_TEXT_PATTERNS: RegExp[] = [
  /application\s+(?:has\s+been\s+)?submitted/i,
  /registration\s+(?:has\s+been\s+)?successful/i,
  /successfully\s+(?:registered|submitted|applied)/i,
  /thank\s+you\s+for\s+(?:registering|applying|your\s+submission|your\s+application)/i,
  /your\s+(?:response|application|submission)\s+has\s+been\s+recorded/i,
  /we\s+have\s+received\s+your\s+application/i,
  /application\s+received/i,
  /registration\s+confirmed/i,
  /submission\s+confirmed/i
];

const ID_EXTRACT_PATTERNS: RegExp[] = [
  /(?:application|registration|reference|candidate|submission|ticket|order)\s*(?:id|number|no|#)?[:\s-]*([A-Za-z0-9_-]{4,32})/i,
  /id[:\s-]*([A-Za-z0-9_-]{6,32})/i
];

/**
 * Flexible detection function to evaluate if the current external page
 * exhibits definitive evidence of a completed registration/application.
 */
export function detectRegistrationSuccess(doc: Document = document): VerificationDetectionResult {
  const href = typeof location !== 'undefined' ? location.href : '';
  const pathname = typeof location !== 'undefined' ? location.pathname : '';
  const title = doc.title || '';

  let score = 0;
  const reasons: string[] = [];
  let extractedId: string | null = null;

  // 1. URL Pattern Evaluation
  for (const pattern of SUCCESS_URL_PATTERNS) {
    if (pattern.test(href) || pattern.test(pathname)) {
      score += 45;
      reasons.push(`URL matched ${pattern.source}`);
      break;
    }
  }

  // 2. Page Title Evaluation
  for (const pattern of SUCCESS_TEXT_PATTERNS) {
    if (pattern.test(title)) {
      score += 35;
      reasons.push(`Title matched: "${title}"`);
      break;
    }
  }

  // 3. Headings & Success Alert Elements
  const candidateElements = Array.from(
    doc.querySelectorAll('h1, h2, h3, h4, [role="alert"], .alert, .success, .confirmation, .submitted, [data-careerai-success]')
  );

  for (const el of candidateElements) {
    const text = (el.textContent || '').trim();
    if (!text || text.length > 300) continue;

    for (const pattern of SUCCESS_TEXT_PATTERNS) {
      if (pattern.test(text)) {
        score += 40;
        reasons.push(`Heading/Alert text: "${text.slice(0, 60)}"`);
        break;
      }
    }
  }

  // 4. Registration / Application ID Extraction
  const idElements = Array.from(
    doc.querySelectorAll(
      '[data-application-id], [data-registration-id], #application-id, #registration-id, .application-id, .registration-id, .reference-number'
    )
  );

  for (const el of idElements) {
    const val =
      el.getAttribute('data-application-id') ||
      el.getAttribute('data-registration-id') ||
      (el.textContent || '').trim();
    if (val && val.length >= 4 && val.length <= 40) {
      extractedId = val.replace(/^[^A-Za-z0-9]+/, '');
      score += 25;
      reasons.push(`Found ID element: ${extractedId}`);
      break;
    }
  }

  // If ID not found in attributes, search text
  if (!extractedId) {
    const bodyText = (doc.body?.innerText || doc.body?.textContent || '').slice(0, 4000);
    for (const pattern of ID_EXTRACT_PATTERNS) {
      const match = bodyText.match(pattern);
      if (match && match[1]) {
        extractedId = match[1].trim();
        score += 20;
        reasons.push(`Extracted ID from text: ${extractedId}`);
        break;
      }
    }
  }

  const confidence = Math.min(100, score);
  const isSuccess = confidence >= 40;

  return {
    isSuccess,
    registrationId: isSuccess ? extractedId : null,
    confidence,
    reason: reasons.join('; ') || 'No success indicators detected'
  };
}
