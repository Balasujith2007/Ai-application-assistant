import { bg } from '../api/api-client';

export type AuditStatus =
  | 'DETECTED' | 'MAPPED' | 'FILLED' | 'SKIPPED' | 'MISSING' | 'FAILED'
  | 'USER_PROVIDED' | 'CAPTCHA_PAUSED' | 'RESUMED' | 'REVIEW_READY'
  | 'SUBMITTED' | 'ERROR' | 'DRY_RUN' | 'UNDO' | 'AUTH_EXPIRED' | 'NETWORK_ERROR';

type Event = {
  status: AuditStatus;
  fieldKey?: string;
  fieldLabel?: string;
  detail?: string;
};

const buffer: Event[] = [];

export function audit(status: AuditStatus, extra: Omit<Event, 'status'> = {}) {
  buffer.push({ status, ...extra });
}

export async function flushAudit(sessionToken?: string | null) {
  if (!buffer.length) return;
  const events = buffer.splice(0, buffer.length);
  try {
    await bg({
      type: 'REPORT_AUDIT',
      payload: {
        domain: location.host,
        sessionToken: sessionToken || undefined,
        events,
      },
    });
  } catch {
    buffer.unshift(...events);
  }
}
