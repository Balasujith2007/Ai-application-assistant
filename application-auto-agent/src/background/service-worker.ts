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
        if (json.success) {
          // Session payload may omit resume even when THIS account already stored one via JWT upload.
          // Merge authenticated extension resume so future applications auto-attach without re-asking.
          if (!json.resume) {
            const ext = await authFetch(
              apiBase,
              `/api/extension/profile${message.categories ? `?categories=${encodeURIComponent(message.categories)}` : ''}`,
            ) as { success?: boolean; resume?: unknown; userId?: string };
            if (ext?.success && ext.resume) {
              return { ...json, resume: ext.resume, userId: ext.userId || json.userId };
            }
          }
          return json;
        }
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
    case 'DOWNLOAD_RESUME':
      return downloadResume(apiBase, message.downloadUrl);
    case 'UPLOAD_RESUME':
      return uploadResume(apiBase, message.fileName, message.mimeType, message.base64);
    case 'REPORT_REGISTRATION_VERIFIED': {
      try {
        const payload = message.payload || {};
        const key = `careerai_verified_${payload.opportunityId || payload.sessionId || 'last'}`;
        await chrome.storage.local.set({ [key]: { ...payload, verifiedAt: Date.now() } });

        // If opportunityId is present and extension is authenticated, notify server
        if (payload.opportunityId) {
          await authFetch(apiBase, `/api/opportunities/${payload.opportunityId}/confirm`, {
            method: 'POST',
            body: JSON.stringify({
              action: 'VERIFY',
              verificationMethod: 'EXTENSION',
              registrationId: payload.registrationId || null
            })
          }, true).catch(() => {});
        }
        return { success: true, verified: true };
      } catch (e) {
        return { success: false, error: String(e) };
      }
    }
    case 'CHECK_REGISTRATION_VERIFIED': {
      try {
        const key = `careerai_verified_${message.opportunityId || message.sessionId || 'last'}`;
        const stored = await chrome.storage.local.get(key);
        const data = stored[key];
        if (data && (Date.now() - (data.verifiedAt || 0)) < 3600000) {
          return { success: true, verified: true, data };
        }
        return { success: true, verified: false };
      } catch (e) {
        return { success: false, error: String(e) };
      }
    }
    default:
      return { success: false, error: 'Unknown message' };
  }
}

async function downloadResume(apiBase: string, downloadUrl?: string) {
  const auth = await storage.getAuth();
  // Only allow session-scoped agent download OR authenticated extension download for THIS user.
  // Never hit a generic "latest resume" endpoint.
  const path = downloadUrl || '/api/extension/resume/download';
  const url = path.startsWith('http') ? path : `${apiBase}${path.startsWith('/') ? path : `/${path}`}`;
  const isSessionScoped = /[?&]sessionId=/.test(url);
  const isExtensionScoped = url.includes('/api/extension/resume/download');
  if (!isSessionScoped && !isExtensionScoped) {
    return { ok: false, error: 'Refusing non-user-scoped resume download URL.' };
  }
  if (!isSessionScoped && !auth?.token) {
    return { ok: false, error: 'Not signed in', authExpired: true };
  }
  try {
    const res = await timedFetch(url, {
      headers: !isSessionScoped && auth?.token ? { Authorization: `Bearer ${auth.token}` } : {},
    });
    if (res.status === 401) {
      if (!isSessionScoped) await storage.clearAuth();
      return { ok: false, error: 'CareerAI connection expired.', authExpired: !isSessionScoped };
    }
    if (res.status === 404) return { ok: false, error: 'No active resume found for this account.', missing: true };
    if (!res.ok) return { ok: false, error: `Resume download failed (${res.status})` };

    const ownerHeader = res.headers.get('X-CareerAI-Resume-Owner');
    if (ownerHeader && auth?.user?.id && ownerHeader !== auth.user.id) {
      return { ok: false, error: 'Resume ownership mismatch — refusing to attach another user\'s file.' };
    }

    const buf = await res.arrayBuffer();
    if (!buf.byteLength) return { ok: false, error: 'Resume file was empty.' };

    const bytes = new Uint8Array(buf);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const base64 = btoa(binary);
    const cd = res.headers.get('Content-Disposition') || '';
    const nameMatch = /filename\*?=(?:UTF-8''|")?([^";]+)"?/i.exec(cd);
    const headerName = nameMatch?.[1] ? decodeURIComponent(nameMatch[1].replace(/"/g, '')) : '';
    return {
      ok: true,
      base64,
      byteLength: bytes.length,
      fileName: headerName || 'resume.pdf',
      mimeType: (res.headers.get('Content-Type') || 'application/pdf').split(';')[0].trim(),
      ownerUserId: ownerHeader || auth?.user?.id || null,
    };
  } catch {
    return { ok: false, error: 'CareerAI connection unavailable.', network: true };
  }
}

async function uploadResume(apiBase: string, fileName: string, mimeType: string | undefined, base64: string) {
  const auth = await storage.getAuth();
  if (!auth?.token) return { ok: false, error: 'Not signed in', authExpired: true };
  if (!base64) return { ok: false, error: 'Empty file payload' };
  try {
    // JSON base64 is more reliable from MV3 service workers than FormData/Blob.
    const res = await timedFetch(`${apiBase}/api/extension/resume/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: fileName || 'resume.pdf',
        mimeType: mimeType || 'application/pdf',
        base64,
      }),
    });
    if (res.status === 401) {
      await storage.clearAuth();
      return { ok: false, error: 'CareerAI connection expired.', authExpired: true };
    }
    const json = await safeJson(res);
    if (!res.ok || !json.success) {
      return { ok: false, error: (json.error as string) || `Upload failed (${res.status})` };
    }
    if (json.userId && auth.user?.id && json.userId !== auth.user.id) {
      return { ok: false, error: 'Ownership mismatch after upload.' };
    }
    const resume = (json.resume || {}) as { fileName?: string; mimeType?: string; downloadUrl?: string; id?: string };
    return {
      ok: true,
      userId: json.userId || auth.user?.id,
      resume: {
        id: resume.id,
        fileName: resume.fileName || fileName,
        mimeType: resume.mimeType || mimeType || 'application/pdf',
        downloadUrl: resume.downloadUrl || '/api/extension/resume/download',
      },
    };
  } catch {
    return { ok: false, error: 'CareerAI connection unavailable.', network: true };
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

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return { success: res.ok };
  }
}
