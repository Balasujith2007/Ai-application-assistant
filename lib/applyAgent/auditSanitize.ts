const FORBIDDEN = /email|phone|salary|ctc|password|otp|token|resume|ssn|aadhaar|authorization/i;
const VALUE_LIKE = /=|@|\d{6,}/;

export type AuditEventInput = {
  status: string;
  fieldKey?: string;
  fieldLabel?: string;
  detail?: string;
  domain?: string;
  sessionToken?: string;
};

const ALLOWED_STATUS = new Set([
  'DETECTED', 'MAPPED', 'FILLED', 'SKIPPED', 'MISSING', 'FAILED', 'USER_PROVIDED',
  'CAPTCHA_PAUSED', 'RESUMED', 'REVIEW_READY', 'SUBMITTED', 'ERROR', 'DRY_RUN',
  'UNDO', 'AUTH_EXPIRED', 'NETWORK_ERROR',
]);

export function sanitizeAuditEvent(input: AuditEventInput): AuditEventInput | null {
  const status = String(input.status || '').toUpperCase();
  if (!ALLOWED_STATUS.has(status)) return null;

  const fieldKey = input.fieldKey ? String(input.fieldKey).slice(0, 120) : undefined;
  const fieldLabel = input.fieldLabel ? String(input.fieldLabel).slice(0, 160) : undefined;
  let detail = input.detail ? String(input.detail).slice(0, 240) : undefined;

  if (detail && (VALUE_LIKE.test(detail) || FORBIDDEN.test(detail))) {
    detail = 'redacted';
  }

  return {
    status,
    fieldKey,
    fieldLabel,
    detail,
    domain: input.domain ? String(input.domain).slice(0, 200) : undefined,
    sessionToken: input.sessionToken ? String(input.sessionToken).slice(0, 80) : undefined,
  };
}
