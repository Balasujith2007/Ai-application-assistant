import { describe, expect, it } from 'vitest';
import { scoreFromSignals } from '../content/application-detector';
import { resolvePolicy } from '../storage/storage-manager';
import { valuesMatch } from '../content/autofill-engine';
import { hashAuthCode, generateAuthCode, isCodeExpired, isCodeConsumed } from '../../../lib/applyAgent/authCode';
import { sanitizeAuditEvent } from '../../../lib/applyAgent/auditSanitize';

describe('application confidence', () => {
  it('auto-starts the test application', () => {
    const r = scoreFromSignals({ isTestApp: true });
    expect(r.score).toBe(100);
    expect(r.autoStart).toBe(true);
  });

  it('scores session + career URL + fields highly', () => {
    const r = scoreFromSignals({
      hasSessionId: true,
      href: 'https://jobs.example.com/careers/apply',
      fieldCount: 6,
      labelBlob: 'email first name college resume expected salary',
    });
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.autoStart).toBe(true);
  });

  it('does not auto-start a random contact form', () => {
    const r = scoreFromSignals({
      href: 'https://blog.example.com/contact',
      fieldCount: 2,
      labelBlob: 'message subject',
    });
    expect(r.autoStart).toBe(false);
    expect(r.score).toBeLessThan(40);
  });
});

describe('per-field policies', () => {
  const policies = {
    'personal.email': 'AUTOMATIC' as const,
    'preferences.workAuthorization': 'ASK' as const,
    LEGAL: 'NEVER' as const,
  };

  it('never fills legal fields', () => {
    expect(resolvePolicy('anything', 'LEGAL_FIELD', policies)).toBe('NEVER');
  });

  it('asks for sensitive fields by default', () => {
    expect(resolvePolicy('preferences.workAuthorization', 'SENSITIVE_FIELD', policies)).toBe('ASK');
  });

  it('asks for application-specific essays', () => {
    expect(resolvePolicy('application.whyCompany', 'APPLICATION_SPECIFIC_FIELD', policies)).toBe('ASK');
  });

  it('fills email automatically when configured', () => {
    expect(resolvePolicy('personal.email', 'REUSABLE_PROFILE_FIELD', policies)).toBe('AUTOMATIC');
  });
});

describe('autofill verification', () => {
  it('matches filled values case-insensitively', () => {
    expect(valuesMatch('6 LPA', '6 lpa')).toBe(true);
    expect(valuesMatch('', 'x')).toBe(false);
  });
});

describe('authorization codes', () => {
  it('hashes codes with sha256 and marks expiry/consumption', () => {
    const a = generateAuthCode(1000);
    expect(a.code).toHaveLength(64);
    expect(a.state).toHaveLength(32);
    expect(hashAuthCode(a.code)).toBe(a.hash);
    expect(hashAuthCode(a.code)).not.toBe(a.code);
    expect(isCodeConsumed(null)).toBe(false);
    expect(isCodeConsumed(new Date())).toBe(true);
    expect(isCodeExpired(a.expiresAt, new Date(a.expiresAt.getTime() + 1))).toBe(true);
    expect(isCodeExpired(a.expiresAt, new Date(a.expiresAt.getTime() - 1))).toBe(false);
  });
});

describe('audit sanitization', () => {
  it('keeps status and drops value-like details', () => {
    const ok = sanitizeAuditEvent({ status: 'FILLED', fieldKey: 'personal.email', fieldLabel: 'Email', detail: 'ok' });
    expect(ok?.status).toBe('FILLED');
    expect(ok?.fieldLabel).toBe('Email');

    const bad = sanitizeAuditEvent({
      status: 'FILLED',
      fieldLabel: 'Email',
      detail: 'Email = gowtham@gmail.com',
    });
    expect(bad?.detail).toBe('redacted');

    expect(sanitizeAuditEvent({ status: 'NOT_A_STATUS' })).toBeNull();
  });
});
