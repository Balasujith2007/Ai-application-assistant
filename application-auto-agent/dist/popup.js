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
      }
    }
  };

  // src/api/api-client.ts
  async function bg(message) {
    return ext.runtime.sendMessage(message);
  }

  // src/ui/popup/popup.ts
  var loginView = document.getElementById("view-login");
  var homeView = document.getElementById("view-home");
  var profileView = document.getElementById("view-profile");
  var settingsView = document.getElementById("view-settings");
  var hello = document.getElementById("hello");
  var loginError = document.getElementById("login-error");
  var fieldsEl = document.getElementById("fields");
  function show(view) {
    for (const el of [loginView, homeView, profileView, settingsView]) el.classList.add("hidden");
    ({ login: loginView, home: homeView, profile: profileView, settings: settingsView })[view].classList.remove("hidden");
  }
  async function refresh() {
    const { auth } = await bg({ type: "GET_AUTH" });
    if (!auth) {
      show("login");
      return;
    }
    hello.textContent = `Signed in as ${auth.user.name} (${auth.user.email})`;
    show("home");
  }
  document.getElementById("login-btn").addEventListener("click", async () => {
    loginError.textContent = "";
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const res = await bg({ type: "LOGIN", email, password });
    if (!res.success) {
      loginError.textContent = res.error || "Login failed";
      return;
    }
    await refresh();
  });
  document.getElementById("logout").addEventListener("click", async () => {
    await bg({ type: "LOGOUT" });
    await refresh();
  });
  document.getElementById("open-profile").addEventListener("click", async () => {
    show("profile");
    fieldsEl.innerHTML = '<p class="muted">Loading\u2026</p>';
    const res = await bg({ type: "GET_CUSTOM_FIELDS" });
    if (!res.success || !res.fields?.length) {
      fieldsEl.innerHTML = '<p class="muted">No learned fields yet. Apply once and choose Save for future.</p>';
      return;
    }
    fieldsEl.innerHTML = res.fields.map((f) => `
    <div class="field" data-id="${f.id}">
      <div>
        <strong>${escapeHtml(f.label)}</strong>
        <span class="muted">${escapeHtml(f.key)} \xB7 ${escapeHtml(f.value)}</span>
      </div>
      <div>
        <button class="ghost toggle">${f.enabled ? "Disable auto-use" : "Enable"}</button>
        <button class="danger del">Delete</button>
      </div>
    </div>
  `).join("");
    fieldsEl.querySelectorAll(".toggle").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const row = e.currentTarget.closest(".field");
        const id = row.getAttribute("data-id");
        const currentlyEnabled = e.currentTarget.textContent?.includes("Disable");
        await bg({ type: "PATCH_CUSTOM_FIELD", id, payload: { enabled: !currentlyEnabled } });
        document.getElementById("open-profile").click();
      });
    });
    fieldsEl.querySelectorAll(".del").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const row = e.currentTarget.closest(".field");
        const id = row.getAttribute("data-id");
        await bg({ type: "DELETE_CUSTOM_FIELD", id });
        document.getElementById("open-profile").click();
      });
    });
  });
  document.getElementById("back-from-profile").addEventListener("click", () => show("home"));
  document.getElementById("back-from-settings").addEventListener("click", () => show("home"));
  function setSelect(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  }
  document.getElementById("open-settings").addEventListener("click", async () => {
    show("settings");
    const { settings } = await bg({ type: "GET_SETTINGS" });
    document.getElementById("api-base").value = settings.apiBase;
    document.getElementById("auto-advance").checked = settings.autoAdvancePages;
    document.getElementById("developer-mode").checked = settings.developerMode;
    document.getElementById("dry-run").checked = settings.dryRun;
    setSelect("policy-email", settings.fillPolicies["personal.email"] || "AUTOMATIC");
    setSelect("policy-phone", settings.fillPolicies["personal.phone"] || "AUTOMATIC");
    setSelect("policy-salary", settings.fillPolicies["preferences.expectedSalary"] || "AUTOMATIC");
    setSelect("policy-workauth", settings.fillPolicies["preferences.workAuthorization"] || "ASK");
    setSelect("policy-gender", settings.fillPolicies["personal.gender"] || "ASK");
  });
  document.getElementById("save-settings").addEventListener("click", async () => {
    const policy = (id) => document.getElementById(id).value;
    await bg({
      type: "SET_SETTINGS",
      patch: {
        apiBase: document.getElementById("api-base").value.trim(),
        autoAdvancePages: document.getElementById("auto-advance").checked,
        developerMode: document.getElementById("developer-mode").checked,
        dryRun: document.getElementById("dry-run").checked,
        fillPolicies: {
          "personal.email": policy("policy-email"),
          "personal.phone": policy("policy-phone"),
          "preferences.expectedSalary": policy("policy-salary"),
          "preferences.workAuthorization": policy("policy-workauth"),
          "personal.gender": policy("policy-gender"),
          LEGAL: "NEVER"
        }
      }
    });
    show("home");
  });
  document.getElementById("open-test").addEventListener("click", async () => {
    const { settings } = await bg({ type: "GET_SETTINGS" });
    window.open(`${settings.apiBase.replace(/\/$/, "")}/test-apply`, "_blank");
  });
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  void refresh();
})();
//# sourceMappingURL=popup.js.map
