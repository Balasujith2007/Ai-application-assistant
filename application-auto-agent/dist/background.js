"use strict";
(() => {
  // src/browser/browser-api.ts
  function hasRuntimeSendMessage(api) {
    try {
      if (!api || typeof api !== "object") return false;
      const runtime = api.runtime;
      return typeof runtime?.sendMessage === "function";
    } catch {
      return false;
    }
  }
  function pickExtensionApi(root) {
    if (hasRuntimeSendMessage(root.chrome)) return root.chrome;
    if (hasRuntimeSendMessage(root.browser)) return root.browser;
    return null;
  }
  function mapRuntimeError(err) {
    const msg = String(err?.message || err || "");
    if (!msg || /sendMessage/i.test(msg) || /cannot read propert/i.test(msg) || /undefined/i.test(msg) && /runtime/i.test(msg) || /context invalidated/i.test(msg) || /receiving end does not exist/i.test(msg) || /message port closed/i.test(msg) || /EXTENSION_RUNTIME/i.test(msg)) {
      return "Could not reach the CareerAI extension. Reload the extension, refresh this page, then click Connect again.";
    }
    return msg;
  }
  function getApi() {
    const api = pickExtensionApi(globalThis);
    if (!api?.runtime) {
      throw new Error("EXTENSION_RUNTIME_UNAVAILABLE");
    }
    return api;
  }
  var ext = {
    runtime: {
      sendMessage(message) {
        const api = getApi();
        const runtime = api.runtime;
        return new Promise((resolve, reject) => {
          let settled = false;
          const done = (err, value) => {
            if (settled) return;
            settled = true;
            if (err) reject(new Error(mapRuntimeError(err)));
            else resolve(value);
          };
          try {
            const result = runtime.sendMessage(message, (response) => {
              const last = runtime.lastError;
              if (last?.message) done(new Error(last.message));
              else done(null, response);
            });
            if (result && typeof result.then === "function") {
              result.then(
                (value) => done(null, value),
                (err) => done(err instanceof Error ? err : new Error(String(err)))
              );
            }
          } catch (e) {
            done(e instanceof Error ? e : new Error(String(e)));
          }
        });
      },
      onMessage: {
        addListener(fn) {
          getApi().runtime?.onMessage?.addListener(fn);
        }
      },
      getURL(path) {
        return getApi().runtime?.getURL?.(path) || path;
      }
    },
    storage: {
      local: {
        async get(keys) {
          const api = getApi();
          return new Promise((resolve, reject) => {
            try {
              api.storage.local.get(keys ?? null, (items) => resolve(items));
            } catch (e) {
              reject(e);
            }
          });
        },
        async set(items) {
          const api = getApi();
          return new Promise((resolve, reject) => {
            try {
              api.storage.local.set(items, () => resolve());
            } catch (e) {
              reject(e);
            }
          });
        },
        async remove(keys) {
          const api = getApi();
          return new Promise((resolve, reject) => {
            try {
              api.storage.local.remove(keys, () => resolve());
            } catch (e) {
              reject(e);
            }
          });
        }
      }
    },
    tabs: {
      async query(info) {
        const api = getApi();
        return new Promise((resolve, reject) => {
          try {
            api.tabs.query(info, (tabs) => resolve(tabs));
          } catch (e) {
            reject(e);
          }
        });
      },
      async sendMessage(tabId, message) {
        const api = getApi();
        return new Promise((resolve, reject) => {
          try {
            const tabsApi = api.tabs;
            if (tabsApi && typeof tabsApi.sendMessage === "function") {
              tabsApi.sendMessage(tabId, message, (response) => {
                const last = api.runtime?.lastError;
                if (last?.message) reject(new Error(last.message));
                else resolve(response);
              });
            } else {
              reject(new Error("tabs.sendMessage unavailable"));
            }
          } catch (e) {
            reject(e);
          }
        });
      }
    }
  };
  function getDefaultApiBase() {
    return "http://localhost:3000";
  }

  // src/storage/storage-manager.ts
  var KEYS = {
    auth: "careerai_auth",
    settings: "careerai_settings",
    session: "careerai_last_session"
  };
  var DEFAULT_POLICIES = {
    "personal.email": "AUTOMATIC",
    "personal.phone": "AUTOMATIC",
    "personal.fullName": "AUTOMATIC",
    "personal.firstName": "AUTOMATIC",
    "personal.lastName": "AUTOMATIC",
    "education.college": "AUTOMATIC",
    "education.cgpa": "AUTOMATIC",
    "preferences.expectedSalary": "AUTOMATIC",
    "preferences.noticePeriod": "AUTOMATIC",
    "preferences.workAuthorization": "ASK",
    "personal.gender": "ASK",
    LEGAL: "NEVER"
  };
  var storage = {
    async getAuth() {
      const data = await ext.storage.local.get(KEYS.auth);
      const auth = data.careerai_auth || null;
      if (auth?.expiresAt && Date.now() > auth.expiresAt) {
        await this.clearAuth();
        return null;
      }
      return auth;
    },
    async setAuth(auth) {
      await ext.storage.local.set({ [KEYS.auth]: auth });
    },
    async clearAuth() {
      await ext.storage.local.remove([KEYS.auth, KEYS.session]);
    },
    async getSettings() {
      const data = await ext.storage.local.get(KEYS.settings);
      return {
        apiBase: data.careerai_settings?.apiBase || getDefaultApiBase(),
        autoAdvancePages: data.careerai_settings?.autoAdvancePages ?? false,
        askBeforeFillSensitive: data.careerai_settings?.askBeforeFillSensitive ?? true,
        dryRun: data.careerai_settings?.dryRun ?? false,
        developerMode: data.careerai_settings?.developerMode ?? false,
        fillPolicies: { ...DEFAULT_POLICIES, ...data.careerai_settings?.fillPolicies || {} }
      };
    },
    async setSettings(patch) {
      const current = await this.getSettings();
      const next = {
        ...current,
        ...patch,
        fillPolicies: { ...current.fillPolicies, ...patch.fillPolicies || {} }
      };
      await ext.storage.local.set({ [KEYS.settings]: next });
      return next;
    }
  };

  // src/background/service-worker.ts
  chrome.runtime.onInstalled.addListener(() => {
    console.log("[CareerAI Apply Agent] installed");
  });
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    void handle(message).then((result) => sendResponse(result)).catch((err) => sendResponse({ success: false, error: String(err?.message || err) }));
    return true;
  });
  async function handle(message) {
    const settings = await storage.getSettings();
    const apiBase = settings.apiBase.replace(/\/$/, "");
    switch (message.type) {
      case "GET_AUTH":
        return { auth: await storage.getAuth() };
      case "LOGOUT":
        await storage.clearAuth();
        return { success: true };
      case "GET_SETTINGS":
        return { settings: await storage.getSettings() };
      case "SET_SETTINGS":
        return { settings: await storage.setSettings(message.patch) };
      case "EXCHANGE_CODE":
        return exchangeCode(apiBase, message.code, message.state);
      case "LOGIN":
        return loginThenMintExtensionToken(apiBase, message.email, message.password);
      case "GET_PROFILE": {
        if (message.sessionId) {
          const res = await timedFetch(`${apiBase}/api/agent/autofill-payload?sessionId=${encodeURIComponent(message.sessionId)}`);
          const json = await safeJson(res);
          if (json.success) {
            if (!json.resume) {
              const ext2 = await authFetch(
                apiBase,
                `/api/extension/profile${message.categories ? `?categories=${encodeURIComponent(message.categories)}` : ""}`
              );
              if (ext2?.success && ext2.resume) {
                return { ...json, resume: ext2.resume, userId: ext2.userId || json.userId };
              }
            }
            return json;
          }
          if (!res.ok && res.status !== 401) return { success: false, error: json.error || "CareerAI connection unavailable.", network: true };
        }
        return authFetch(apiBase, `/api/extension/profile${message.categories ? `?categories=${encodeURIComponent(message.categories)}` : ""}`);
      }
      case "GET_CUSTOM_FIELDS":
        return authFetch(apiBase, "/api/extension/profile/custom-fields");
      case "CONFIRM_FIELD":
        return authFetch(apiBase, "/api/extension/profile/confirm-field", {
          method: "POST",
          body: JSON.stringify(message.payload)
        }, true);
      case "PATCH_CUSTOM_FIELD":
        return authFetch(apiBase, `/api/extension/profile/custom-fields/${message.id}`, {
          method: "PATCH",
          body: JSON.stringify(message.payload)
        });
      case "DELETE_CUSTOM_FIELD":
        return authFetch(apiBase, `/api/extension/profile/custom-fields/${message.id}`, { method: "DELETE" });
      case "GET_MAPPINGS":
        return authFetch(apiBase, "/api/extension/mappings");
      case "SAVE_MAPPING":
        return authFetch(apiBase, "/api/extension/mappings", {
          method: "POST",
          body: JSON.stringify(message.payload)
        });
      case "MAP_FIELDS":
        return authFetch(apiBase, "/api/extension/map-fields", {
          method: "POST",
          body: JSON.stringify({ fields: message.fields, siteHost: message.siteHost })
        });
      case "REPORT_SESSION":
        return authFetch(apiBase, "/api/extension/session/report", {
          method: "POST",
          body: JSON.stringify(message.payload)
        }, true);
      case "REPORT_AUDIT":
        return authFetch(apiBase, "/api/extension/session/audit", {
          method: "POST",
          body: JSON.stringify(message.payload)
        }, true);
      case "DOWNLOAD_RESUME":
        return downloadResume(apiBase, message.downloadUrl);
      case "UPLOAD_RESUME":
        return uploadResume(apiBase, message.fileName, message.mimeType, message.base64);
      case "REPORT_REGISTRATION_VERIFIED": {
        try {
          const payload = message.payload || {};
          const key = `careerai_verified_${payload.opportunityId || payload.sessionId || "last"}`;
          await chrome.storage.local.set({ [key]: { ...payload, verifiedAt: Date.now() } });
          if (payload.opportunityId) {
            await authFetch(apiBase, `/api/opportunities/${payload.opportunityId}/confirm`, {
              method: "POST",
              body: JSON.stringify({
                action: "VERIFY",
                verificationMethod: "EXTENSION",
                registrationId: payload.registrationId || null
              })
            }, true).catch(() => {
            });
          }
          return { success: true, verified: true };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      }
      case "CHECK_REGISTRATION_VERIFIED": {
        try {
          const key = `careerai_verified_${message.opportunityId || message.sessionId || "last"}`;
          const stored = await chrome.storage.local.get(key);
          const data = stored[key];
          if (data && Date.now() - (data.verifiedAt || 0) < 36e5) {
            return { success: true, verified: true, data };
          }
          return { success: true, verified: false };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      }
      default:
        return { success: false, error: "Unknown message" };
    }
  }
  async function downloadResume(apiBase, downloadUrl) {
    const auth = await storage.getAuth();
    const path = downloadUrl || "/api/extension/resume/download";
    const url = path.startsWith("http") ? path : `${apiBase}${path.startsWith("/") ? path : `/${path}`}`;
    const isSessionScoped = /[?&]sessionId=/.test(url);
    const isExtensionScoped = url.includes("/api/extension/resume/download");
    if (!isSessionScoped && !isExtensionScoped) {
      return { ok: false, error: "Refusing non-user-scoped resume download URL." };
    }
    if (!isSessionScoped && !auth?.token) {
      return { ok: false, error: "Not signed in", authExpired: true };
    }
    try {
      const res = await timedFetch(url, {
        headers: !isSessionScoped && auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}
      });
      if (res.status === 401) {
        if (!isSessionScoped) await storage.clearAuth();
        return { ok: false, error: "CareerAI connection expired.", authExpired: !isSessionScoped };
      }
      if (res.status === 404) return { ok: false, error: "No active resume found for this account.", missing: true };
      if (!res.ok) return { ok: false, error: `Resume download failed (${res.status})` };
      const ownerHeader = res.headers.get("X-CareerAI-Resume-Owner");
      if (ownerHeader && auth?.user?.id && ownerHeader !== auth.user.id) {
        return { ok: false, error: "Resume ownership mismatch \u2014 refusing to attach another user's file." };
      }
      const buf = await res.arrayBuffer();
      if (!buf.byteLength) return { ok: false, error: "Resume file was empty." };
      const bytes = new Uint8Array(buf);
      let binary = "";
      const chunk = 32768;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const base64 = btoa(binary);
      const cd = res.headers.get("Content-Disposition") || "";
      const nameMatch = /filename\*?=(?:UTF-8''|")?([^";]+)"?/i.exec(cd);
      const headerName = nameMatch?.[1] ? decodeURIComponent(nameMatch[1].replace(/"/g, "")) : "";
      return {
        ok: true,
        base64,
        byteLength: bytes.length,
        fileName: headerName || "resume.pdf",
        mimeType: (res.headers.get("Content-Type") || "application/pdf").split(";")[0].trim(),
        ownerUserId: ownerHeader || auth?.user?.id || null
      };
    } catch {
      return { ok: false, error: "CareerAI connection unavailable.", network: true };
    }
  }
  async function uploadResume(apiBase, fileName, mimeType, base64) {
    const auth = await storage.getAuth();
    if (!auth?.token) return { ok: false, error: "Not signed in", authExpired: true };
    if (!base64) return { ok: false, error: "Empty file payload" };
    try {
      const res = await timedFetch(`${apiBase}/api/extension/resume/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileName: fileName || "resume.pdf",
          mimeType: mimeType || "application/pdf",
          base64
        })
      });
      if (res.status === 401) {
        await storage.clearAuth();
        return { ok: false, error: "CareerAI connection expired.", authExpired: true };
      }
      const json = await safeJson(res);
      if (!res.ok || !json.success) {
        return { ok: false, error: json.error || `Upload failed (${res.status})` };
      }
      if (json.userId && auth.user?.id && json.userId !== auth.user.id) {
        return { ok: false, error: "Ownership mismatch after upload." };
      }
      const resume = json.resume || {};
      return {
        ok: true,
        userId: json.userId || auth.user?.id,
        resume: {
          id: resume.id,
          fileName: resume.fileName || fileName,
          mimeType: resume.mimeType || mimeType || "application/pdf",
          downloadUrl: resume.downloadUrl || "/api/extension/resume/download"
        }
      };
    } catch {
      return { ok: false, error: "CareerAI connection unavailable.", network: true };
    }
  }
  async function exchangeCode(apiBase, code, state) {
    const res = await timedFetch(`${apiBase}/api/extension/auth/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state })
    });
    const json = await safeJson(res);
    if (!res.ok || !json.token || !json.user) {
      return { success: false, error: json.message || "Code exchange failed" };
    }
    await storage.setAuth({
      token: json.token,
      expiresAt: Date.now() + (json.expiresIn || 7200) * 1e3,
      user: json.user
    });
    return { success: true, auth: await storage.getAuth() };
  }
  async function loginThenMintExtensionToken(apiBase, email, password) {
    const res = await timedFetch(`${apiBase}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const json = await safeJson(res);
    const websiteToken = json?.data?.token;
    if (!res.ok || !websiteToken) {
      return { success: false, error: json?.message || "Login failed" };
    }
    const codeRes = await timedFetch(`${apiBase}/api/extension/auth/code`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${websiteToken}` }
    });
    const codeJson = await safeJson(codeRes);
    if (!codeRes.ok || !codeJson.code || !codeJson.state) {
      return { success: false, error: codeJson.message || "Could not mint extension code" };
    }
    return exchangeCode(apiBase, codeJson.code, codeJson.state);
  }
  async function authFetch(apiBase, path, init = {}, allowAnonymous = false) {
    const auth = await storage.getAuth();
    if (!auth?.token && !allowAnonymous) return { success: false, error: "Not signed in", authExpired: true };
    try {
      const res = await timedFetch(`${apiBase}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...auth?.token ? { Authorization: `Bearer ${auth.token}` } : {},
          ...init.headers || {}
        }
      });
      if (res.status === 401) {
        await storage.clearAuth();
        return { success: false, error: "CareerAI connection expired.", authExpired: true };
      }
      return await safeJson(res);
    } catch {
      return { success: false, error: "CareerAI connection unavailable.", network: true };
    }
  }
  async function timedFetch(url, init = {}, timeoutMs = 15e3) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
  }
  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return { success: res.ok };
    }
  }
})();
//# sourceMappingURL=background.js.map
