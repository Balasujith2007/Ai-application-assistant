import { extractFields } from './field-extractor';
import { normalizeLabel } from '../ai/question-classifier';

export const AUTO_START_THRESHOLD = 70;
export const PROMPT_THRESHOLD = 50;

export type PageKind = 'NONE' | 'LANDING' | 'CAPTCHA' | 'FORM' | 'REVIEW';

export interface DetectionResult {
  score: number;
  reasons: string[];
  autoStart: boolean;
  kind: PageKind;
}

const LABEL_WEIGHTS: Array<{ re: RegExp; w: number; reason: string }> = [
  { re: /email|e-mail/, w: 14, reason: 'email field' },
  { re: /first name|last name|full name|given name|fname|lname|surname/, w: 14, reason: 'name field' },
  { re: /phone|mobile|contact number|telephone/, w: 10, reason: 'phone field' },
  { re: /college|university|institution|school name/, w: 12, reason: 'education field' },
  { re: /resume|cv|upload resume|attach resume/, w: 14, reason: 'resume upload' },
  { re: /cgpa|gpa|grade|percentage|marks/, w: 8, reason: 'academic score' },
  { re: /salary|ctc|compensation|notice period|joining time/, w: 10, reason: 'compensation field' },
  { re: /experience|employer|company|current role/, w: 8, reason: 'experience field' },
  { re: /apply|candidate|applicant|registration|student/, w: 8, reason: 'application wording' },
];

function pathnameOf(href?: string): string {
  try {
    if (href && href.includes('://')) return new URL(href).pathname.replace(/\/$/, '') || '/';
    if (href?.startsWith('/')) return href.split('?')[0].replace(/\/$/, '') || '/';
  } catch { /* ignore */ }
  if (typeof location !== 'undefined') return location.pathname.replace(/\/$/, '') || '/';
  return '/';
}

export function scoreFromSignals(input: {
  isTestApp?: boolean;
  hasSessionId?: boolean;
  href?: string;
  fieldCount?: number;
  labelBlob?: string;
  captchaBlocking?: boolean;
  hasSubmitButton?: boolean;
}): DetectionResult {
  const reasons: string[] = [];
  let score = 0;
  const path = pathnameOf(input.href);
  const fieldCount = input.fieldCount || 0;

  if (input.isTestApp) {
    score += 25;
    reasons.push('trusted test application');
  }

  if (path === '/test-apply') {
    return {
      score: Math.min(100, score + 15),
      reasons: [...reasons, 'landing — no form'],
      autoStart: false,
      kind: 'LANDING',
    };
  }

  if (input.hasSessionId) {
    score += 45;
    reasons.push('CareerAI apply session');
  }

  const href = (input.href || '').toLowerCase();
  if (/careers|jobs|apply|internship|hackathon|scholarship|greenhouse|lever\.co|workday|myworkday|unstop|hiretoday|dare2compete|smartrecruiters|icims|taleo|successfactors|jobvite|breezy\.hr|recruitee|ashby|ashbyhq|rippling|bamboohr|younoodle|ats\.|recruit\.|forms\.gle|docs\.google\.com\/forms|typeform/.test(href)) {
    score += 18;
    reasons.push('career URL pattern');
  }

  if (input.captchaBlocking) {
    score += 40;
    reasons.push('human verification');
  }

  if (fieldCount >= 3) {
    score += 10;
    reasons.push(`${fieldCount} visible inputs`);
  } else if (fieldCount >= 1) {
    score += 6;
    reasons.push('form field present');
  }

  const blob = input.labelBlob || '';
  for (const { re, w, reason } of LABEL_WEIGHTS) {
    if (re.test(blob)) {
      score += w;
      reasons.push(reason);
    }
  }

  let kind: PageKind = 'NONE';
  if (path.includes('/review') || input.hasSubmitButton) kind = 'REVIEW';
  else if (input.captchaBlocking && fieldCount < 3) kind = 'CAPTCHA';
  else if (fieldCount >= 1) kind = 'FORM';

  score = Math.min(100, score);
  const autoStart = Boolean(
    kind !== 'NONE' && (score >= AUTO_START_THRESHOLD || input.captchaBlocking || (input.isTestApp && (kind === 'FORM' || kind === 'REVIEW' || kind === 'CAPTCHA'))),
  );
  return { score, reasons, autoStart, kind: kind || 'NONE' };
}

export function scoreApplicationPage(doc: Document = document): DetectionResult {
  const fields = extractFields(doc);
  const captchaEl = doc.querySelector('[data-careerai-captcha], #careerai-test-captcha, .g-recaptcha, .h-captcha, #cf-turnstile');
  let captchaBlocking = false;
  if (captchaEl) {
    const input = captchaEl instanceof HTMLInputElement ? captchaEl : captchaEl.querySelector('input[type="checkbox"]');
    if (input instanceof HTMLInputElement) captchaBlocking = !input.checked;
    else captchaBlocking = true;
  }
  const submit = Array.from(doc.querySelectorAll('button, input[type="submit"]')).some((el) =>
    /submit|send application|finish/i.test(el.textContent || (el as HTMLInputElement).value || ''),
  );
  return scoreFromSignals({
    isTestApp: !!doc.querySelector('[data-careerai-test-app]'),
    hasSessionId: typeof location !== 'undefined' && !!new URLSearchParams(location.search).get('careerai_session_id'),
    href: typeof location !== 'undefined' ? location.href : '',
    fieldCount: fields.length,
    labelBlob: fields.map((f) => normalizeLabel(`${f.label} ${f.name} ${f.placeholder}`)).join(' '),
    captchaBlocking,
    hasSubmitButton: submit,
  });
}

export function detectApplicationPage(): boolean {
  const r = scoreApplicationPage();
  return r.autoStart || r.kind === 'FORM' || r.kind === 'CAPTCHA' || r.kind === 'REVIEW';
}

export function pageIdentity(doc: Document = document): string {
  const path = typeof location !== 'undefined' ? `${location.pathname}${location.search}` : '';
  return `${path}::${fieldFingerprint(doc)}`;
}

export function fieldFingerprint(doc: Document = document): string {
  return extractFields(doc)
    .map((f) => `${f.id}|${f.name}|${f.type}|${f.label}`)
    .join('~');
}
