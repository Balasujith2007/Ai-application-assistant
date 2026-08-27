import { isCareerAiAppShell, getSessionIdFromPage } from './dom-utils';
import { scoreApplicationPage, PROMPT_THRESHOLD } from './application-detector';
import { runApplicationAgent } from '../automation/application-runner';
import { bg } from '../api/api-client';
import { bumpNavigation } from '../automation/nav-state';
import { dismissOverlayModals } from '../ui/assistant/overlay';
import { applyLog } from '../debug';
import { clearSessionAnswers } from '../automation/session-answers';
import { isExtensionRuntimeAvailable, mapRuntimeError, ext } from '../browser/browser-api';

/**
 * Content script = JavaScript injected into web pages.
 * It can read/write the page DOM. It cannot call CareerAI APIs directly
 * (CORS). All API calls go through the background service worker.
 */

declare global {
  interface Window {
    __careeraiApplyAgentBooted?: boolean;
  }
}

function allowedOrigin(): string {
  return window.location.origin;
}

function reply(type: string, extra: Record<string, unknown> = {}) {
  window.postMessage({ source: 'careerai-extension', type, ...extra }, allowedOrigin());
}

function setupCareerAiBridge() {
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;
    if (event.origin !== allowedOrigin()) return;
    const data = event.data;
    if (!data || data.source !== 'careerai-web') return;

    if (data.type === 'CAREERAI_PING') {
      if (!isExtensionRuntimeAvailable()) {
        reply('CAREERAI_UNAVAILABLE', {
          error: 'The CareerAI extension was reloaded. Refresh this page, then click Connect again.',
        });
        return;
      }
      reply('CAREERAI_PONG');
      return;
    }

    if (data.type === 'CAREERAI_CONNECT') {
      if (data.token && !data.code) {
        reply('CAREERAI_CONNECTED', {
          ok: false,
          error: 'Refusing long-lived token. Use one-time authorization code.',
        });
        return;
      }
      if (!data.code || !data.state) {
        reply('CAREERAI_CONNECTED', { ok: false, error: 'Missing authorization code' });
        return;
      }
      if (!isExtensionRuntimeAvailable()) {
        reply('CAREERAI_CONNECTED', {
          ok: false,
          error: 'The CareerAI extension was reloaded. Refresh this page, then click Connect again.',
        });
        return;
      }
      try {
        const res = await bg<{ success: boolean; error?: string }>({
          type: 'EXCHANGE_CODE',
          code: String(data.code),
          state: String(data.state),
        });
        reply('CAREERAI_CONNECTED', {
          ok: !!res?.success,
          error: res?.error ? mapRuntimeError(res.error) : undefined,
        });
      } catch (e) {
        reply('CAREERAI_CONNECTED', {
          ok: false,
          error: mapRuntimeError(e),
        });
      }
    }
  });
}

/** Per-page occupancy — must not block a new SPA route. */
let activeRoute = '';
let finishedRoute = '';
let runnerBusy = false;

function routeKey() {
  return `${location.pathname}${location.search}`;
}

export function shouldStart(detection: ReturnType<typeof scoreApplicationPage>, sessionId: string | null): boolean {
  if (detection.kind === 'LANDING') return false;
  if (detection.autoStart) return true;
  if (sessionId && detection.score >= 40 && detection.kind !== 'NONE') return true;
  if (detection.score >= PROMPT_THRESHOLD && detection.kind !== 'NONE') return true;
  return false;
}

async function maybeRun(force = false) {
  if (isCareerAiAppShell()) return;

  const detection = scoreApplicationPage();
  const sessionId = getSessionIdFromPage();
  const route = routeKey();

  applyLog('Detector', `${detection.kind} score=${detection.score} autoStart=${detection.autoStart} route=${route}`);

  if (detection.kind === 'LANDING') {
    clearSessionAnswers();
  }

  const isDismissed = sessionStorage.getItem(`careerai_prompt_dismissed_${route}`);
  if (!force) {
    if (isDismissed) {
      applyLog('Runner', 'Prompt was previously dismissed on this page');
      return;
    }
    if (!shouldStart(detection, sessionId)) {
      applyLog('Runner', 'No automation start on this page');
      return;
    }
  }

  if (runnerBusy && activeRoute === route) {
    applyLog('Runner', 'Already analyzing this page');
    return;
  }

  if (!force && !runnerBusy && finishedRoute === route) {
    return;
  }

  if (runnerBusy && activeRoute !== route) {
    bumpNavigation();
    dismissOverlayModals();
    applyLog('Navigation', `Leaving ${activeRoute} → ${route}`);
  }

  activeRoute = route;
  runnerBusy = true;
  try {
    applyLog('Runner', `Starting automation (${detection.kind})`);
    await runApplicationAgent({ force });
    if (routeKey() === route) finishedRoute = route;
  } finally {
    if (activeRoute === route) runnerBusy = false;
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
  const onChange = debounce(() => {
    const next = routeKey();
    if (next !== activeRoute) {
      bumpNavigation();
      dismissOverlayModals();
      applyLog('Navigation', `Page changed ${next}`);
    }
    void maybeRun();
  }, 350);

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
  if (window.__careeraiApplyAgentBooted) return;
  window.__careeraiApplyAgentBooted = true;
  setupCareerAiBridge();
  if (isCareerAiAppShell()) {
    applyLog('Runner', 'CareerAI app shell — bridge only');
    return;
  }

  ext.runtime.onMessage.addListener((message: any) => {
    if (message && message.type === 'START_ASSISTANT_MANUAL') {
      applyLog('Runner', 'Manual start requested');
      void maybeRun(true);
    }
  });

  installSpaWatch();
  await maybeRun();
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  void boot();
} else {
  window.addEventListener('DOMContentLoaded', () => void boot());
}
