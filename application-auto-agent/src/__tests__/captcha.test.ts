import { beforeEach, describe, expect, it } from 'vitest';
import {
  classifyCaptchaSignals,
  isCaptchaBlocking,
  markCaptchaInstanceCompleted,
  resetCaptchaCompletions,
} from '../content/captcha-detector';

describe('CAPTCHA state', () => {
  beforeEach(() => {
    resetCaptchaCompletions();
  });

  it('treats a marker + unchecked box as detected, not complete', () => {
    const state = classifyCaptchaSignals({
      pathname: '/test-apply/verify',
      hasTestMarker: true,
      testCheckboxChecked: false,
    });
    expect(state).toBe('CAPTCHA_DETECTED');
    expect(isCaptchaBlocking(state)).toBe(true);
  });

  it('treats a checked test CAPTCHA as completed even if the marker remains', () => {
    const state = classifyCaptchaSignals({
      pathname: '/test-apply/verify',
      hasTestMarker: true,
      testCheckboxChecked: true,
    });
    expect(state).toBe('CAPTCHA_COMPLETED');
    expect(isCaptchaBlocking(state)).toBe(false);
  });

  it('does not re-trigger after the user confirms the same instance', () => {
    markCaptchaInstanceCompleted('/jobs/apply', 'widget');
    const state = classifyCaptchaSignals({
      pathname: '/jobs/apply',
      hasWidget: true,
    });
    expect(state).toBe('CAPTCHA_COMPLETED');
  });

  it('detects a new CAPTCHA on a later page', () => {
    markCaptchaInstanceCompleted('/test-apply/verify', 'test');
    const next = classifyCaptchaSignals({
      pathname: '/test-apply/page-2',
      hasWidget: true,
      testCheckboxChecked: false,
    });
    expect(next).toBe('CAPTCHA_DETECTED');
  });

  it('is not present when there is no widget and no test marker', () => {
    expect(classifyCaptchaSignals({ pathname: '/test-apply/page-1' })).toBe('CAPTCHA_NOT_PRESENT');
  });
});
