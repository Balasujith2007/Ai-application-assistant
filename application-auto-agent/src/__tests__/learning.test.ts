import { describe, expect, it, beforeEach } from 'vitest';
import { decideFieldAction, defaultSaveMode } from '../automation/fill-decision';
import { classifyField } from '../ai/question-classifier';
import { matchField } from '../ai/semantic-mapper';
import { rememberSessionAnswer, getSessionAnswer, clearSessionAnswers } from '../automation/session-answers';
import { isProtectedSubmitText } from '../content/multi-page-manager';
import { sanitizeAuditEvent } from '../../../lib/applyAgent/auditSanitize';

describe('fill decision', () => {
  it('autofills known reusable fields', () => {
    expect(decideFieldAction({
      classification: 'REUSABLE_PROFILE_FIELD',
      policy: 'AUTOMATIC',
      hasValue: true,
      confidence: 0.99,
    })).toBe('FILL');
  });

  it('asks when a reusable field has no value', () => {
    expect(decideFieldAction({
      classification: 'REUSABLE_PROFILE_FIELD',
      policy: 'AUTOMATIC',
      hasValue: false,
      confidence: 0.9,
    })).toBe('ASK');
  });

  it('asks for sensitive fields even when a value exists', () => {
    expect(decideFieldAction({
      classification: 'SENSITIVE_FIELD',
      policy: 'ASK',
      hasValue: true,
      confidence: 0.99,
    })).toBe('ASK');
  });

  it('never fills legal fields', () => {
    expect(decideFieldAction({
      classification: 'LEGAL_FIELD',
      policy: 'AUTOMATIC',
      hasValue: true,
      confidence: 1,
    })).toBe('SKIP');
  });

  it('pauses document fields for human file selection', () => {
    expect(decideFieldAction({
      classification: 'DOCUMENT_FIELD',
      policy: 'AUTOMATIC',
      hasValue: true,
      confidence: 1,
    })).toBe('FILE');
  });

  it('treats application-specific questions as ask when empty, fill when saved', () => {
    expect(decideFieldAction({
      classification: 'APPLICATION_SPECIFIC_FIELD',
      policy: 'ASK',
      hasValue: false,
      confidence: 0.5,
    })).toBe('ASK');
    expect(decideFieldAction({
      classification: 'APPLICATION_SPECIFIC_FIELD',
      policy: 'ASK',
      hasValue: true,
      confidence: 0.9,
    })).toBe('FILL');
    expect(defaultSaveMode('APPLICATION_SPECIFIC_FIELD')).toBe('USE_ONCE');
    expect(defaultSaveMode('SENSITIVE_FIELD')).toBe('USE_ONCE');
    expect(defaultSaveMode('REUSABLE_PROFILE_FIELD')).toBe('SAVE');
  });
});

describe('alias learning targets', () => {
  it('maps institution and university name to college', () => {
    expect(matchField({ label: 'Institution' })?.key).toBe('education.college');
    expect(matchField({ label: 'University Name' })?.key).toBe('education.college');
    expect(classifyField('College')).toBe('REUSABLE_PROFILE_FIELD');
  });

  it('maps GPA labels to cgpa', () => {
    expect(matchField({ label: 'GPA' })?.key).toBe('education.cgpa');
    expect(matchField({ label: 'Grade Point Average' })?.key).toBe('education.cgpa');
  });

  it('maps notice duration / joining notice to noticePeriod', () => {
    expect(matchField({ label: 'Notice Duration' })?.key).toBe('preferences.noticePeriod');
    expect(matchField({ label: 'Joining Notice' })?.key).toBe('preferences.noticePeriod');
  });

  it('maps preferred location variations to preferredLocation', () => {
    expect(matchField({ label: 'Preferred Location' })?.key).toBe('preferences.preferredLocation');
    expect(matchField({ label: 'Preferred Work Location' })?.key).toBe('preferences.preferredLocation');
    expect(matchField({ label: 'Location Preference' })?.key).toBe('preferences.preferredLocation');
    expect(matchField({ label: 'Where would you like to work?' })?.key).toBe('preferences.preferredLocation');
  });

  it('maps compensation expectation to expectedSalary', () => {
    expect(matchField({ label: 'Compensation Expectation' })?.key).toBe('preferences.expectedSalary');
    expect(matchField({ label: 'Expected Annual Compensation' })?.key).toBe('preferences.expectedSalary');
  });

  it('resolves Expected Annual Compensation via saved mapping memory', () => {
    const hit = matchField(
      { label: 'Expected Annual Compensation' },
      [{ fieldPattern: 'expected annual compensation', mappedField: 'preferences.expectedSalary', confidence: 0.95, verified: true }],
    );
    expect(hit?.key).toBe('preferences.expectedSalary');
    expect(hit?.method === 'memory' || hit?.method === 'exact').toBe(true);
  });
});

describe('sensitive, legal, documents, application-specific', () => {
  it('classifies work authorization from camelCase names without guessing a value', () => {
    expect(classifyField('workAuthorization')).toBe('SENSITIVE_FIELD');
    expect(classifyField('Work Authorization')).toBe('SENSITIVE_FIELD');
    expect(decideFieldAction({
      classification: 'SENSITIVE_FIELD',
      policy: 'ASK',
      hasValue: false,
      confidence: 0.9,
    })).toBe('ASK');
  });

  it('classifies legal declarations and never auto-checks them', () => {
    expect(classifyField('I certify that the information provided is accurate')).toBe('LEGAL_FIELD');
    expect(decideFieldAction({
      classification: 'LEGAL_FIELD',
      policy: 'NEVER',
      hasValue: false,
      confidence: 1,
    })).toBe('SKIP');
  });

  it('asks for application-specific essays by default, but allows reuse when a value was saved', () => {
    expect(classifyField('Why do you want to join this company?')).toBe('APPLICATION_SPECIFIC_FIELD');
    expect(classifyField('Tell us about a time you demonstrated leadership.')).toBe('APPLICATION_SPECIFIC_FIELD');
    expect(defaultSaveMode('APPLICATION_SPECIFIC_FIELD')).toBe('USE_ONCE');
    expect(decideFieldAction({
      classification: 'APPLICATION_SPECIFIC_FIELD',
      policy: 'ASK',
      hasValue: true,
      confidence: 1,
    })).toBe('FILL');
  });

  it('treats resume uploads as documents', () => {
    expect(classifyField('Resume')).toBe('DOCUMENT_FIELD');
  });
});

describe('session answers (use once across SPA pages)', () => {
  beforeEach(() => clearSessionAnswers());

  it('reuses an answer in the current application session', () => {
    rememberSessionAnswer('preferences.expectedSalary', '6 LPA');
    expect(getSessionAnswer('preferences.expectedSalary')).toBe('6 LPA');
    expect(getSessionAnswer('expectedSalary')).toBe('6 LPA');
  });

  it('clears after session end so the next application does not inherit use-once values', () => {
    rememberSessionAnswer('education.college', 'KIT');
    clearSessionAnswers();
    expect(getSessionAnswer('education.college')).toBe('');
  });
});

describe('saved profile values are reusable on the second run', () => {
  it('keeps preferred location under the canonical reusable key', () => {
    const flat = {
      'preferences.preferredLocation': 'Bangalore',
      preferredLocation: 'Bangalore',
    };
    expect(flat['preferences.preferredLocation']).toBe('Bangalore');
    expect(matchField({ label: 'Preferred Location' })?.key).toBe('preferences.preferredLocation');
    expect(matchField({ label: 'Preferred Work Location' })?.key).toBe('preferences.preferredLocation');
  });

  it('keeps college, cgpa, salary, and notice period under reusable keys', () => {
    const flat = {
      'education.college': 'KIT',
      'education.cgpa': '10',
      'preferences.expectedSalary': '100000',
      'preferences.noticePeriod': '2 months',
    };
    expect(flat['education.college']).toBe('KIT');
    expect(flat['education.cgpa']).toBe('10');
    expect(flat['preferences.expectedSalary']).toBe('100000');
    expect(flat['preferences.noticePeriod']).toBe('2 months');
  });
});

describe('no auto-submit', () => {
  it('protects Submit / Apply / Send / Finish Application', () => {
    expect(isProtectedSubmitText('Submit application')).toBe(true);
    expect(isProtectedSubmitText('Apply')).toBe(true);
    expect(isProtectedSubmitText('Send')).toBe(true);
    expect(isProtectedSubmitText('Finish Application')).toBe(true);
    expect(isProtectedSubmitText('Continue')).toBe(false);
    expect(isProtectedSubmitText('Next')).toBe(false);
  });
});

describe('audit aliases', () => {
  it('accepts the learning workflow statuses without storing values', () => {
    expect(sanitizeAuditEvent({ status: 'FIELD_SAVED', fieldKey: 'preferences.expectedSalary' })?.status).toBe('USER_PROVIDED');
    expect(sanitizeAuditEvent({ status: 'FINAL_REVIEW' })?.status).toBe('REVIEW_READY');
    expect(sanitizeAuditEvent({ status: 'FIELD_SAVED', detail: 'expected salary = 6 LPA' })?.detail).toBe('redacted');
  });
});
