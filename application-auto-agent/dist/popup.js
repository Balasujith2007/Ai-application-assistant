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
