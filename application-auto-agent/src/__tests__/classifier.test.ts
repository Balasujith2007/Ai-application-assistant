import { describe, expect, it } from 'vitest';
import { classifyField } from '../ai/question-classifier';
import { matchField } from '../ai/semantic-mapper';

describe('question classifier', () => {
  it('classifies reusable salary fields', () => {
    expect(classifyField('Expected Salary')).toBe('REUSABLE_PROFILE_FIELD');
    expect(classifyField('Expected Annual Compensation')).toBe('REUSABLE_PROFILE_FIELD');
  });

  it('classifies application-specific essays', () => {
    expect(classifyField('Why do you want to join Google?')).toBe('APPLICATION_SPECIFIC_FIELD');
    expect(classifyField('Tell us about a time you demonstrated leadership')).toBe('APPLICATION_SPECIFIC_FIELD');
  });

  it('classifies sensitive and legal fields', () => {
    expect(classifyField('Work Authorization')).toBe('SENSITIVE_FIELD');
    expect(classifyField('I agree to the terms and conditions')).toBe('LEGAL_FIELD');
  });
});

describe('field mapping', () => {
  it('maps salary aliases to preferences.expectedSalary', () => {
    const hit = matchField({ label: 'Expected Annual Compensation' });
    expect(hit?.key).toBe('preferences.expectedSalary');
    expect(hit?.confidence).toBeGreaterThan(0.8);
  });

  it('maps notice period variations', () => {
    const hit = matchField({ label: 'Availability / Notice Period' });
    expect(hit?.key).toBe('preferences.noticePeriod');
  });

  it('uses verified memory over weak labels', () => {
    const hit = matchField(
      { label: 'Current Compensation' },
      [{ fieldPattern: 'current compensation', mappedField: 'preferences.expectedSalary', confidence: 0.94, verified: true, siteHost: 'jobs.example.com' }],
      'jobs.example.com',
    );
    expect(hit?.key).toBe('preferences.expectedSalary');
    expect(hit?.method).toBe('memory');
  });

  it('maps email autocomplete', () => {
    const hit = matchField({ autocomplete: 'email', label: 'Contact' });
    expect(hit?.key).toBe('personal.email');
    expect(hit?.method).toBe('autocomplete');
  });
});
