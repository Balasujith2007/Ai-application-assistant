import { describe, it, expect } from 'vitest';
import {
  decideResumeAction,
  isUserScopedResume,
  shouldCreateDuplicateActiveResume,
  RESUME_AUDIT,
} from '../automation/resume-flow';

describe('resume flow decisions', () => {
  it('asks the user when no stored resume exists', () => {
    expect(
      decideResumeAction({ hasStoredResume: false, attachSucceeded: false, attachAttempts: 0 }),
    ).toBe('ASK_USER_TO_SELECT');
  });

  it('auto-attaches when stored resume attaches successfully', () => {
    expect(
      decideResumeAction({ hasStoredResume: true, attachSucceeded: true, attachAttempts: 1 }),
    ).toBe('ATTACH_STORED');
  });

  it('reports attach failure before forcing another pick (first failed attempt)', () => {
    expect(
      decideResumeAction({ hasStoredResume: true, attachSucceeded: false, attachAttempts: 1 }),
    ).toBe('REPORT_ATTACH_FAILURE');
  });

  it('only asks user to replace after retries are exhausted', () => {
    expect(
      decideResumeAction({ hasStoredResume: true, attachSucceeded: false, attachAttempts: 2 }),
    ).toBe('ASK_USER_TO_SELECT');
  });

  it('second and third applications reuse stored resume (same decision)', () => {
    const second = decideResumeAction({
      hasStoredResume: true,
      attachSucceeded: true,
      attachAttempts: 1,
    });
    const third = decideResumeAction({
      hasStoredResume: true,
      attachSucceeded: true,
      attachAttempts: 1,
    });
    expect(second).toBe('ATTACH_STORED');
    expect(third).toBe('ATTACH_STORED');
  });

  it('never treats another user id as in-scope', () => {
    const gowtham = 'cmsxhzna20000akzzjy6yuwbq';
    const balasujith = 'other-user-id';
    expect(isUserScopedResume(balasujith, gowtham)).toBe(false);
    expect(isUserScopedResume(gowtham, gowtham)).toBe(true);
    expect(isUserScopedResume(null, gowtham)).toBe(false);
  });

  it('does not create a duplicate active resume when one already exists', () => {
    expect(shouldCreateDuplicateActiveResume(0)).toBe(true);
    expect(shouldCreateDuplicateActiveResume(1)).toBe(false);
    expect(shouldCreateDuplicateActiveResume(3)).toBe(false);
  });

  it('exposes stable non-PII audit codes', () => {
    expect(RESUME_AUDIT.NOT_FOUND).toBe('NO_STORED_FILE');
    expect(RESUME_AUDIT.UPLOAD_SUCCESS).toBe('PROFILE_FILE_SAVED');
    expect(RESUME_AUDIT.ATTACH_SUCCESS).toBe('PROFILE_FILE_ATTACHED');
    expect(RESUME_AUDIT.FILE_NOT_SELECTED).toBe('FILE_NOT_SELECTED');
  });
});
