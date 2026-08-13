/**
 * Background service worker (Manifest V3)
 * All CareerAI HTTP happens here. Content scripts never see JWT in page JS
 * after connect-code exchange.
 */

import { storage } from '../storage/storage-manager';
import type { BgRequest } from '../api/api-client';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[CareerAI Apply Agent] installed');
});

chrome.runtime.onMessage.addListener((message: BgRequest, _sender, sendResponse) => {
  void handle(message)
    .then((result) => sendResponse(result))
    .catch((err) => sendResponse({ success: false, error: String(err?.message || err) }));
  return true;
});

async function handle(message: BgRequest): Promise<unknown> {
  const settings = await storage.getSettings();
  const apiBase = settings.apiBase.replace(/\/$/, '');

  switch (message.type) {
    case 'GET_AUTH':
      return { auth: await storage.getAuth() };
    case 'LOGOUT':
      await storage.clearAuth();
      return { success: true };
    case 'GET_SETTINGS':
      return { settings: await storage.getSettings() };
    case 'SET_SETTINGS':
      return { settings: await storage.setSettings(message.patch as never) };
    case 'EXCHANGE_CODE':
      return exchangeCode(apiBase, message.code, message.state);
    case 'LOGIN':
      return loginThenMintExtensionToken(apiBase, message.email, message.password);
    case 'GET_PROFILE': {
      if (message.sessionId) {
        const res = await timedFetch(`${apiBase}/api/agent/autofill-payload?sessionId=${encodeURIComponent(message.sessionId)}`);
        const json = await safeJson(res);
        if (json.success) return json;
        if (!res.ok && res.status !== 401) return { success: false, error: json.error || 'CareerAI connection unavailable.', network: true };
      }
      return authFetch(apiBase, `/api/extension/profile${message.categories ? `?categories=${encodeURIComponent(message.categories)}` : ''}`);
    }
    case 'GET_CUSTOM_FIELDS':
      return authFetch(apiBase, '/api/extension/profile/custom-fields');
    case 'CONFIRM_FIELD':
      return authFetch(apiBase, '/api/extension/profile/confirm-field', {
        method: 'POST',
        body: JSON.stringify(message.payload),
      }, true);
    case 'PATCH_CUSTOM_FIELD':
      return authFetch(apiBase, `/api/extension/profile/custom-fields/${message.id}`, {
        method: 'PATCH',
        body: JSON.stringify(message.payload),
      });
    case 'DELETE_CUSTOM_FIELD':
      return authFetch(apiBase, `/api/extension/profile/custom-fields/${message.id}`, { method: 'DELETE' });
    case 'GET_MAPPINGS':
      return authFetch(apiBase, '/api/extension/mappings');
    case 'SAVE_MAPPING':
      return authFetch(apiBase, '/api/extension/mappings', {
        method: 'POST',
        body: JSON.stringify(message.payload),
      });
    case 'MAP_FIELDS':
      return authFetch(apiBase, '/api/extension/map-fields', {
        method: 'POST',
        body: JSON.stringify({ fields: message.fields, siteHost: message.siteHost }),
      });
    case 'REPORT_SESSION':
      return authFetch(apiBase, '/api/extension/session/report', {
        method: 'POST',
        body: JSON.stringify(message.payload),
      }, true);
    case 'REPORT_AUDIT':
      return authFetch(apiBase, '/api/extension/session/audit', {
        method: 'POST',
        body: JSON.stringify(message.payload),
      }, true);
    default:
      return { success: false, error: 'Unknown message' };
  }
}

async function exchangeCode(apiBase: string, code: string, state: string) {
  const res = await timedFetch(`${apiBase}/api/extension/auth/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state }),
  });
  const json = await safeJson(res);
  if (!res.ok || !json.token || !json.user) {
    return { success: false, error: json.message || 'Code exchange failed' };
  }
  await storage.setAuth({
    token: json.token,
    expiresAt: Date.now() + (json.expiresIn || 7200) * 1000,
    user: json.user,
  });
  return { success: true, auth: await storage.getAuth() };
}

async function loginThenMintExtensionToken(apiBase: string, email: string, password: string) {
  const res = await timedFetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await safeJson(res);
  const websiteToken = json?.data?.token;
  if (!res.ok || !websiteToken) {
    return { success: false, error: json?.message || 'Login failed' };
  }

  const codeRes = await timedFetch(`${apiBase}/api/extension/auth/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${websiteToken}` },
  });
  const codeJson = await safeJson(codeRes);
  if (!codeRes.ok || !codeJson.code || !codeJson.state) {
    return { success: false, error: codeJson.message || 'Could not mint extension code' };
  }
  return exchangeCode(apiBase, codeJson.code, codeJson.state);
}

async function authFetch(apiBase: string, path: string, init: RequestInit = {}, allowAnonymous = false) {
  const auth = await storage.getAuth();
  if (!auth?.token && !allowAnonymous) return { success: false, error: 'Not signed in', authExpired: true };
  try {
    const res = await timedFetch(`${apiBase}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        ...(init.headers || {}),
      },
    });
    if (res.status === 401) {
      await storage.clearAuth();
      return { success: false, error: 'CareerAI connection expired.', authExpired: true };
    }
    return await safeJson(res);
  } catch {
    return { success: false, error: 'CareerAI connection unavailable.', network: true };
  }
}

async function timedFetch(url: string, init: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function safeJson(res: Response): Promise<Record<string, never> & Record<string, unknown>> {
  try {
    return await res.json();
  } catch {
    return { success: res.ok };
  }
}
