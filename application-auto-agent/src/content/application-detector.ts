import { extractFields } from './field-extractor';
import { normalizeLabel } from '../ai/question-classifier';

export interface DetectionResult {
  score: number;
  reasons: string[];
  autoStart: boolean;
}

const LABEL_WEIGHTS: Array<{ re: RegExp; w: number; reason: string }> = [
  { re: /email/, w: 14, reason: 'email field' },
  { re: /first name|last name|full name|given name/, w: 14, reason: 'name field' },
  { re: /phone|mobile/, w: 10, reason: 'phone field' },
  { re: /college|university|institution/, w: 12, reason: 'education field' },
  { re: /resume|cv|upload/, w: 14, reason: 'resume upload' },
  { re: /cgpa|gpa|grade/, w: 8, reason: 'academic score' },
  { re: /salary|ctc|compensation|notice period/, w: 10, reason: 'compensation field' },
  { re: /experience|employer|company/, w: 8, reason: 'experience field' },
  { re: /apply|candidate|applicant|registration/, w: 8, reason: 'application wording' },
];

export function scoreFromSignals(input: {
  isTestApp?: boolean;
  hasSessionId?: boolean;
  href?: string;
  fieldCount?: number;
  labelBlob?: string;
}): DetectionResult {
  const reasons: string[] = [];
  let score = 0;

  if (input.isTestApp) {
    return { score: 100, reasons: ['CareerAI test application'], autoStart: true };
  }
  if (input.hasSessionId) {
    score += 45;
    reasons.push('CareerAI apply session');
  }

  const href = (input.href || '').toLowerCase();
  if (/careers|jobs|apply|internship|hackathon|scholarship|greenhouse|lever\.co|workday|myworkday|unstop|dare2compete/.test(href)) {
    score += 18;
    reasons.push('career URL pattern');
  }

  const fieldCount = input.fieldCount || 0;
  if (fieldCount >= 3) {
    score += 10;
    reasons.push(`${fieldCount} visible inputs`);
  }

  const blob = input.labelBlob || '';
  for (const { re, w, reason } of LABEL_WEIGHTS) {
    if (re.test(blob)) {
      score += w;
      reasons.push(reason);
    }
  }

  score = Math.min(100, score);
  return { score, reasons, autoStart: score >= 70 };
}

export function scoreApplicationPage(doc: Document = document): DetectionResult {
  const fields = extractFields(doc);
  return scoreFromSignals({
    isTestApp: !!doc.querySelector('[data-careerai-test-app]'),
    hasSessionId: !!new URLSearchParams(location.search).get('careerai_session_id'),
    href: location.href,
    fieldCount: fields.length,
    labelBlob: fields.map((f) => normalizeLabel(`${f.label} ${f.name} ${f.placeholder}`)).join(' '),
  });
}

export function detectApplicationPage(): boolean {
  return scoreApplicationPage().score >= 40;
}

export function fieldFingerprint(doc: Document = document): string {
  return extractFields(doc)
    .map((f) => `${f.id}|${f.name}|${f.type}|${f.label}`)
    .join('~');
}
