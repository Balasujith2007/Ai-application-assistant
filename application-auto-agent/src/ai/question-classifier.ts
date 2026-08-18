import {
  APPLICATION_SPECIFIC_PATTERNS,
  DOCUMENT_PATTERNS,
  FIELD_ALIASES,
  LEGAL_PATTERNS,
  SENSITIVE_PATTERNS,
} from '../mappings/aliases';

export type FieldClassification =
  | 'REUSABLE_PROFILE_FIELD'
  | 'APPLICATION_SPECIFIC_FIELD'
  | 'SENSITIVE_FIELD'
  | 'LEGAL_FIELD'
  | 'DOCUMENT_FIELD'
  | 'UNKNOWN_FIELD';

export function normalizeLabel(input: string): string {
  return (input || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[*?!:\-_/\\(),.\[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

export function classifyField(rawLabel: string): FieldClassification {
  const label = normalizeLabel(rawLabel);
  if (!label) return 'UNKNOWN_FIELD';
  if (includesAny(label, LEGAL_PATTERNS)) return 'LEGAL_FIELD';
  if (includesAny(label, SENSITIVE_PATTERNS)) return 'SENSITIVE_FIELD';
  if (includesAny(label, DOCUMENT_PATTERNS) && /(upload|attach|file|resume|cv|certificate|transcript)/.test(label)) {
    return 'DOCUMENT_FIELD';
  }
  if (includesAny(label, APPLICATION_SPECIFIC_PATTERNS)) return 'APPLICATION_SPECIFIC_FIELD';
  for (const aliases of Object.values(FIELD_ALIASES)) {
    if (includesAny(label, aliases)) return 'REUSABLE_PROFILE_FIELD';
  }
  return 'UNKNOWN_FIELD';
}

export function defaultFillPolicy(c: FieldClassification): 'AUTOMATIC' | 'ASK_BEFORE_FILLING' | 'NEVER_FILL' {
  if (c === 'LEGAL_FIELD') return 'NEVER_FILL';
  if (c === 'SENSITIVE_FIELD' || c === 'APPLICATION_SPECIFIC_FIELD' || c === 'DOCUMENT_FIELD' || c === 'UNKNOWN_FIELD') {
    return 'ASK_BEFORE_FILLING';
  }
  return 'AUTOMATIC';
}

export function isReusable(c: FieldClassification): boolean {
  return c === 'REUSABLE_PROFILE_FIELD' || c === 'SENSITIVE_FIELD' || c === 'DOCUMENT_FIELD' || c === 'UNKNOWN_FIELD';
}
