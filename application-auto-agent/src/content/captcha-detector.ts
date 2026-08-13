/**
 * CAPTCHA detector — pause only. Never solve or bypass.
 */
export function isCaptchaPresent(root: Document | HTMLElement = document): boolean {
  const iframes = Array.from(root.querySelectorAll('iframe')) as HTMLIFrameElement[];
  const iframeHit = iframes.some((f) => {
    const src = (f.src || '').toLowerCase();
    return src.includes('recaptcha') || src.includes('hcaptcha') || src.includes('challenges.cloudflare') || src.includes('turnstile');
  });
  if (iframeHit) return true;

  if (root.querySelector('.g-recaptcha, [data-hcaptcha-widget-id], .h-captcha, #cf-turnstile, [data-careerai-captcha]')) {
    return true;
  }

  const text = (root.textContent || '').toLowerCase();
  if (text.includes("i'm not a robot") || text.includes('verify you are human') || text.includes('human verification required')) {
    const box = root.querySelector('[data-careerai-captcha], #careerai-test-captcha, input[type="checkbox"][name*="captcha" i]');
    if (box) {
      const input = box instanceof HTMLInputElement ? box : box.querySelector('input[type="checkbox"]');
      if (input instanceof HTMLInputElement) return !input.checked;
    }
    // Recaptcha-style widget present
    if (root.querySelector('[data-careerai-captcha]')) return true;
  }
  return false;
}

/** Wait until captcha appears gone, or until `userConfirmed` resolves true. */
export function waitForCaptchaClear(
  timeoutMs = 8 * 60 * 1000,
  userConfirmed?: () => Promise<boolean>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isCaptchaPresent()) {
      resolve();
      return;
    }
    const started = Date.now();
    let asked = false;
    const finish = () => {
      obs.disconnect();
      clearInterval(poll);
      resolve();
    };
    const fail = (err: Error) => {
      obs.disconnect();
      clearInterval(poll);
      reject(err);
    };
    const obs = new MutationObserver(() => {
      if (!isCaptchaPresent()) finish();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    const poll = setInterval(() => {
      if (!isCaptchaPresent()) {
        finish();
        return;
      }
      const elapsed = Date.now() - started;
      if (!asked && elapsed > 20_000 && userConfirmed) {
        asked = true;
        void userConfirmed().then((ok) => {
          if (ok) finish();
        });
      }
      if (elapsed > timeoutMs) fail(new Error('Timed out waiting for human verification.'));
    }, 400);
  });
}
