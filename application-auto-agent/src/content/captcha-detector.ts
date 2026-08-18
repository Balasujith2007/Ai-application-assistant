/**
 * CAPTCHA detector — pause only. Never solve or bypass.
 * Distinguishes PRESENT vs COMPLETED. Marker existence is not enough.
 */

export type CaptchaState =
  | 'CAPTCHA_NOT_PRESENT'
  | 'CAPTCHA_DETECTED'
  | 'CAPTCHA_WAITING_FOR_USER'
  | 'CAPTCHA_COMPLETED'
  | 'CAPTCHA_UNKNOWN';

export type CaptchaSignals = {
  pathname?: string;
  hasTestMarker?: boolean;
  testCheckboxChecked?: boolean | null;
  hasWidget?: boolean;
  recaptchaResponseFilled?: boolean;
  recaptchaCheckboxChecked?: boolean;
  userMarkedComplete?: boolean;
};

/** Per page + widget instance. Completion does not disable later CAPTCHAs. */
const completedInstances = new Set<string>();

function instanceKey(pathname: string, kind: string): string {
  return `${pathname || '/'}::${kind}`;
}

export function resetCaptchaCompletions() {
  completedInstances.clear();
}

export function markCaptchaInstanceCompleted(pathname: string, kind = 'widget') {
  completedInstances.add(instanceKey(pathname, kind));
}

export function classifyCaptchaSignals(s: CaptchaSignals): CaptchaState {
  const path = s.pathname || '/';

  if (s.hasTestMarker) {
    if (s.testCheckboxChecked === true || s.userMarkedComplete) {
      markCaptchaInstanceCompleted(path, 'test');
      return 'CAPTCHA_COMPLETED';
    }
    if (completedInstances.has(instanceKey(path, 'test'))) return 'CAPTCHA_COMPLETED';
    return 'CAPTCHA_DETECTED';
  }

  if (s.hasWidget) {
    if (s.userMarkedComplete || s.recaptchaResponseFilled || s.recaptchaCheckboxChecked) {
      markCaptchaInstanceCompleted(path, 'widget');
      return 'CAPTCHA_COMPLETED';
    }
    if (completedInstances.has(instanceKey(path, 'widget'))) return 'CAPTCHA_COMPLETED';
    return 'CAPTCHA_DETECTED';
  }

  return 'CAPTCHA_NOT_PRESENT';
}

export function isCaptchaBlocking(state: CaptchaState): boolean {
  return state === 'CAPTCHA_DETECTED' || state === 'CAPTCHA_WAITING_FOR_USER' || state === 'CAPTCHA_UNKNOWN';
}

function testCheckbox(root: Document | HTMLElement): HTMLInputElement | null {
  const host = root.querySelector('[data-careerai-captcha], #careerai-test-captcha');
  if (!host) return null;
  if (host instanceof HTMLInputElement) return host;
  const inner = host.querySelector('input[type="checkbox"]');
  return inner instanceof HTMLInputElement ? inner : null;
}

function widgetPresent(root: Document | HTMLElement): boolean {
  const iframes = Array.from(root.querySelectorAll('iframe')) as HTMLIFrameElement[];
  if (iframes.some((f) => {
    const src = (f.src || '').toLowerCase();
    return src.includes('recaptcha') || src.includes('hcaptcha') || src.includes('challenges.cloudflare') || src.includes('turnstile');
  })) return true;
  return !!root.querySelector('.g-recaptcha, [data-hcaptcha-widget-id], .h-captcha, #cf-turnstile');
}

function recaptchaLooksComplete(root: Document | HTMLElement): boolean {
  const ta = root.querySelector('textarea[name="g-recaptcha-response"], textarea[name="h-captcha-response"]') as HTMLTextAreaElement | null;
  if (ta && ta.value && ta.value.trim().length > 8) return true;
  if (root.querySelector('.recaptcha-checkbox-checked, [aria-checked="true"][role="checkbox"]')) return true;
  return false;
}

export function readCaptchaSignals(root: Document | HTMLElement = document, pathname?: string): CaptchaSignals {
  const path = pathname || (typeof location !== 'undefined' ? location.pathname : '/');
  const box = testCheckbox(root);
  const hasTest = !!root.querySelector('[data-careerai-captcha], #careerai-test-captcha');
  return {
    pathname: path,
    hasTestMarker: hasTest,
    testCheckboxChecked: box ? box.checked || box.getAttribute('aria-checked') === 'true' : null,
    hasWidget: widgetPresent(root),
    recaptchaResponseFilled: recaptchaLooksComplete(root),
    recaptchaCheckboxChecked: recaptchaLooksComplete(root),
    userMarkedComplete: completedInstances.has(instanceKey(path, hasTest ? 'test' : 'widget')),
  };
}

export function evaluateCaptcha(root: Document | HTMLElement = document, pathname?: string): CaptchaState {
  return classifyCaptchaSignals(readCaptchaSignals(root, pathname));
}

/** True only while a human still needs to complete verification. */
export function isCaptchaPresent(root: Document | HTMLElement = document): boolean {
  return isCaptchaBlocking(evaluateCaptcha(root));
}

export function markCurrentCaptchaCompleted(pathname?: string) {
  const path = pathname || (typeof location !== 'undefined' ? location.pathname : '/');
  markCaptchaInstanceCompleted(path, 'test');
  markCaptchaInstanceCompleted(path, 'widget');
}

/** Wait until captcha is completed, or until the user confirms. Never solves it. */
export function waitForCaptchaClear(
  timeoutMs = 8 * 60 * 1000,
  userConfirmed?: () => Promise<boolean>,
  opts?: { isAborted?: () => boolean; unknownAfterMs?: number },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => {
      try { obs.disconnect(); } catch { /* ignore */ }
      clearInterval(poll);
      resolve();
    };
    const fail = (err: Error) => {
      try { obs.disconnect(); } catch { /* ignore */ }
      clearInterval(poll);
      reject(err);
    };

    const tick = (): CaptchaState => evaluateCaptcha();
    if (!isCaptchaBlocking(tick())) {
      resolve();
      return;
    }

    const started = Date.now();
    let asked = false;
    const unknownAfter = opts?.unknownAfterMs ?? 12000;

    const obs = new MutationObserver(() => {
      if (opts?.isAborted?.()) {
        done();
        return;
      }
      if (!isCaptchaBlocking(tick())) done();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true });

    const poll = setInterval(() => {
      if (opts?.isAborted?.()) {
        done();
        return;
      }
      const state = tick();
      if (!isCaptchaBlocking(state)) {
        done();
        return;
      }
      const elapsed = Date.now() - started;
      if (!asked && elapsed > unknownAfter && userConfirmed) {
        asked = true;
        void userConfirmed().then((ok) => {
          if (ok) {
            markCurrentCaptchaCompleted();
            done();
          } else {
            asked = false;
          }
        });
      }
      if (elapsed > timeoutMs) fail(new Error('Timed out waiting for human verification.'));
    }, 300);
  });
}
