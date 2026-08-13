"use strict";
(() => {
  // src/browser/browser-api.ts
  function getApi() {
    const root = globalThis;
    const api = root.browser || root.chrome;
    if (!api) {
      throw new Error("This script must run inside a browser extension.");
    }
    return api;
  }
  var ext = {
    runtime: {
      sendMessage(message) {
        const api = getApi();
        return new Promise((resolve, reject) => {
          try {
            api.runtime.sendMessage(message, (response) => {
              const err = api.runtime.lastError;
              if (err) reject(new Error(err.message));
              else resolve(response);
            });
          } catch (e) {
            reject(e);
          }
        });
      },
      onMessage: {
        addListener(fn) {
          getApi().runtime.onMessage.addListener(fn);
        }
      },
      getURL(path) {
        return getApi().runtime.getURL(path);
      }
    },
    storage: {
      local: {
        async get(keys) {
          const api = getApi();
          return new Promise((resolve) => {
            api.storage.local.get(keys ?? null, (items) => resolve(items));
          });
        },
        async set(items) {
          const api = getApi();
          return new Promise((resolve) => {
            api.storage.local.set(items, () => resolve());
          });
        },
        async remove(keys) {
          const api = getApi();
          return new Promise((resolve) => {
            api.storage.local.remove(keys, () => resolve());
          });
        }
      }
    },
    tabs: {
      async query(info) {
        const api = getApi();
        return new Promise((resolve) => {
          api.tabs.query(info, (tabs) => resolve(tabs));
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
          if (json.success) return json;
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
      default:
        return { success: false, error: "Unknown message" };
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
