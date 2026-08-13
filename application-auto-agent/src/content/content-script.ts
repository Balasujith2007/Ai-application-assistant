import { isCareerAiAppShell, getSessionIdFromPage } from './dom-utils';
import { scoreApplicationPage, fieldFingerprint } from './application-detector';
import { runApplicationAgent } from '../automation/application-runner';
import { bg } from '../api/api-client';

/**
 * Content script = JavaScript injected into web pages.
 * It can read/write the page DOM. It cannot call CareerAI APIs directly
 * (CORS). All API calls go through the background service worker.
 */

function allowedOrigin(): string {
  return window.location.origin;
}

function setupCareerAiBridge() {
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;
    if (event.origin !== allowedOrigin()) return;
    const data = event.data;
    if (!data || data.source !== 'careerai-web') return;

    if (data.type === 'CAREERAI_PING') {
      window.postMessage({ source: 'careerai-extension', type: 'CAREERAI_PONG' }, allowedOrigin());
      return;
    }

    if (data.type === 'CAREERAI_CONNECT') {
      if (data.token && !data.code) {
        window.postMessage({
          source: 'careerai-extension',
          type: 'CAREERAI_CONNECTED',
          ok: false,
          error: 'Refusing long-lived token. Use one-time authorization code.',
        }, allowedOrigin());
        return;
      }
      if (!data.code || !data.state) {
        window.postMessage({
          source: 'careerai-extension',
          type: 'CAREERAI_CONNECTED',
          ok: false,
          error: 'Missing authorization code',
        }, allowedOrigin());
        return;
      }
      try {
        const res = await bg<{ success: boolean; error?: string }>({
          type: 'EXCHANGE_CODE',
          code: String(data.code),
          state: String(data.state),
        });
        window.postMessage({
          source: 'careerai-extension',
          type: 'CAREERAI_CONNECTED',
          ok: !!res?.success,
          error: res?.error,
        }, allowedOrigin());
      } catch (e) {
        window.postMessage({
          source: 'careerai-extension',
          type: 'CAREERAI_CONNECTED',
          ok: false,
          error: String(e),
        }, allowedOrigin());
      }
    }
  });
}

let running = false;
let lastFp = '';

async function maybeRun(force = false) {
  if (running) return;
  if (isCareerAiAppShell()) return;

  const sessionId = getSessionIdFromPage();
  const detection = scoreApplicationPage();
  if (!force && !sessionId && detection.score < 40) return;

  const fp = `${location.href}::${fieldFingerprint()}`;
  if (!force && fp === lastFp) return;
  lastFp = fp;

  running = true;
  try {
    await runApplicationAgent();
  } finally {
    running = false;
  }
}

function debounce<T extends () => void>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout> | undefined;
  return ((() => {
    if (t) clearTimeout(t);
    t = setTimeout(fn, ms);
  }) as T);
}

function installSpaWatch() {
  const onChange = debounce(() => void maybeRun(), 450);
  window.addEventListener('popstate', onChange);
  const wrap = (method: 'pushState' | 'replaceState') => {
    const orig = history[method].bind(history);
    history[method] = ((...args: Parameters<History['pushState']>) => {
      orig(...args);
      onChange();
    }) as History['pushState'];
  };
  wrap('pushState');
  wrap('replaceState');
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { childList: true, subtree: true });
}

async function boot() {
  setupCareerAiBridge();
  if (isCareerAiAppShell()) return;
  await maybeRun(true);
  installSpaWatch();
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  void boot();
} else {
  window.addEventListener('DOMContentLoaded', () => void boot());
}
