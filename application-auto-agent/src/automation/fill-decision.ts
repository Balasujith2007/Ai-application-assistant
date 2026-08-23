export type FillDecision = 'FILL' | 'ASK' | 'SKIP' | 'FILE';

export function decideFieldAction(input: {
  classification: string;
  policy: string;
  hasValue: boolean;
  confidence: number;
}): FillDecision {
  if (input.classification === 'LEGAL_FIELD' || input.policy === 'NEVER') return 'SKIP';
  if (input.classification === 'DOCUMENT_FIELD') return 'FILE';
  // Sensitive answers always require the user to confirm.
  if (input.classification === 'SENSITIVE_FIELD') return 'ASK';
  // Application essays: reuse when the user previously chose "Save for future".
  if (input.classification === 'APPLICATION_SPECIFIC_FIELD') {
    return input.hasValue ? 'FILL' : 'ASK';
  }
  if (input.policy === 'ASK') return 'ASK';
  if (input.hasValue && input.confidence >= 0.8) return 'FILL';
  if (!input.hasValue) return 'ASK';
  return 'FILL';
}

export function defaultSaveMode(classification: string): 'SAVE' | 'USE_ONCE' {
  if (
    classification === 'APPLICATION_SPECIFIC_FIELD'
    || classification === 'LEGAL_FIELD'
    || classification === 'SENSITIVE_FIELD'
  ) {
    return 'USE_ONCE';
  }
  return 'SAVE';
}
