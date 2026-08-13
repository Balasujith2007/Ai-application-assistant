"use strict";
(() => {
  // src/content/dom-utils.ts
  function isCareerAiAppShell() {
    const path = location.pathname;
    if (path.startsWith("/test-apply")) return false;
    if (location.port === "3000" || location.hostname === "localhost" || location.hostname === "127.0.0.1") {
      return !path.startsWith("/test-apply");
    }
    return !!document.querySelector('meta[name="careerai-app"]');
  }
  function getSessionIdFromPage() {
    const q = new URLSearchParams(location.search).get("careerai_session_id");
    if (q) {
      sessionStorage.setItem("careerai_agent_session_id", q);
      return q;
    }
    return sessionStorage.getItem("careerai_agent_session_id");
  }
  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // src/content/field-extractor.ts
  function visible(el) {
    if (el.getAttribute("type") === "hidden") return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }
  function labelFor(el) {
    const aria = el.getAttribute("aria-label") || "";
    if (el.id) {
      const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lab?.textContent) return lab.textContent.trim();
    }
    const wrapping = el.closest("label");
    if (wrapping?.textContent) return wrapping.textContent.trim();
    const prev = el.previousElementSibling;
    if (prev && prev.tagName === "LABEL") return (prev.textContent || "").trim();
    const parentLabel = el.parentElement?.querySelector("label");
    if (parentLabel?.textContent) return parentLabel.textContent.trim();
    return aria;
  }
  function extractFields(root = document) {
    const nodes = Array.from(root.querySelectorAll(
      "input, select, textarea"
    ));
    const out = [];
    for (const el of nodes) {
      const type = (el.getAttribute("type") || el.tagName.toLowerCase()).toLowerCase();
      if (["submit", "button", "image", "reset", "hidden"].includes(type)) continue;
      if (!visible(el)) continue;
      const options = el instanceof HTMLSelectElement ? Array.from(el.options).map((o) => o.text.trim()) : void 0;
      out.push({
        element: el,
        id: el.id || "",
        name: el.getAttribute("name") || "",
        type,
        placeholder: el.getAttribute("placeholder") || "",
        autocomplete: el.getAttribute("autocomplete") || "",
        label: labelFor(el),
        required: el.hasAttribute("required") || el.getAttribute("aria-required") === "true",
        options
      });
    }
    return out;
  }

  // src/mappings/aliases.ts
  var FIELD_ALIASES = {
    "personal.firstName": ["first name", "given name", "forename", "candidate first name", "firstname", "fname"],
    "personal.lastName": ["last name", "surname", "family name", "candidate last name", "lastname", "lname"],
    "personal.fullName": ["full name", "candidate name", "applicant name", "student name", "participant name", "your name", "name of applicant"],
    "personal.email": ["email", "email address", "e mail", "e-mail", "candidate email", "student email", "work email", "contact email"],
    "personal.phone": ["phone", "phone number", "mobile", "mobile number", "contact number", "whatsapp", "phone no", "cell", "telephone"],
    "personal.dateOfBirth": ["date of birth", "dob", "birth date", "birthday"],
    "personal.gender": ["gender", "sex"],
    "education.college": ["college", "college name", "institution", "institution name", "university", "university name", "institute", "school name"],
    "education.degree": ["degree", "qualification", "highest qualification", "program"],
    "education.department": ["department", "branch", "stream", "specialization", "course", "field of study", "major"],
    "education.cgpa": ["cgpa", "gpa", "grade", "percentage", "marks", "academic score", "current cgpa"],
    "education.graduationYear": ["graduation year", "year of graduation", "passing year", "expected graduation"],
    "education.year": ["academic year", "current year", "year of study", "year"],
    "links.github": ["github", "github url", "github profile", "github link"],
    "links.linkedin": ["linkedin", "linkedin url", "linkedin profile", "linkedin link"],
    "links.portfolio": ["portfolio", "portfolio url", "personal website", "website"],
    "links.codolio": ["codolio", "codolio url", "codolio profile"],
    "preferences.expectedSalary": [
      "expected salary",
      "expected compensation",
      "desired salary",
      "salary expectation",
      "expected annual compensation",
      "expected annual ctc",
      "expected annual salary",
      "current annual ctc",
      "ctc",
      "expected ctc",
      "desired compensation",
      "current compensation"
    ],
    "preferences.preferredLocation": ["preferred location", "preferred city", "location preference", "job location", "preferred work location"],
    "preferences.noticePeriod": [
      "notice period",
      "expected notice period",
      "availability notice period",
      "availability / notice period",
      "how soon can you join",
      "joining time"
    ],
    "preferences.workMode": ["work mode", "work type", "preferred work mode"],
    "preferences.workAuthorization": [
      "work authorization",
      "work authorisation",
      "authorized to work",
      "eligible to work",
      "legally authorized",
      "work permit"
    ],
    "documents.resume": ["resume", "cv", "upload resume", "attach resume", "upload cv", "resume file"],
    "documents.coverLetter": ["cover letter", "covering letter", "upload cover letter"],
    "skills.list": ["skills", "technical skills", "key skills", "skill set"]
  };
  var SENSITIVE_PATTERNS = [
    "citizenship",
    "citizen",
    "nationality",
    "gender",
    "sex",
    "disability",
    "disabled",
    "veteran",
    "visa",
    "work authorization",
    "work authorisation",
    "race",
    "ethnicity",
    "criminal",
    "conviction",
    "hispanic",
    "religion",
    "caste"
  ];
  var LEGAL_PATTERNS = [
    "terms",
    "conditions",
    "privacy policy",
    "i agree",
    "declaration",
    "certify",
    "signature",
    "acknowledge",
    "consent to"
  ];
  var APPLICATION_SPECIFIC_PATTERNS = [
    "why do you want",
    "why this company",
    "why should we hire",
    "what motivates",
    "why are you interested",
    "tell us about a time",
    "describe a time",
    "leadership experience",
    "greatest weakness",
    "why join",
    "motivation to join"
  ];
  var DOCUMENT_PATTERNS = ["resume", "cv", "cover letter", "certificate", "transcript", "portfolio file"];

  // src/ai/question-classifier.ts
  function normalizeLabel(input) {
    return (input || "").toLowerCase().replace(/[*?!:\-_/\\(),.\[\]]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function includesAny(haystack, needles) {
    return needles.some((n) => haystack.includes(n));
  }
  function classifyField(rawLabel) {
    const label = normalizeLabel(rawLabel);
    if (!label) return "UNKNOWN_FIELD";
    if (includesAny(label, LEGAL_PATTERNS)) return "LEGAL_FIELD";
    if (includesAny(label, SENSITIVE_PATTERNS)) return "SENSITIVE_FIELD";
    if (includesAny(label, DOCUMENT_PATTERNS) && /(upload|attach|file|resume|cv|certificate|transcript)/.test(label)) {
      return "DOCUMENT_FIELD";
    }
    if (includesAny(label, APPLICATION_SPECIFIC_PATTERNS)) return "APPLICATION_SPECIFIC_FIELD";
    for (const aliases of Object.values(FIELD_ALIASES)) {
      if (includesAny(label, aliases)) return "REUSABLE_PROFILE_FIELD";
    }
    return "UNKNOWN_FIELD";
  }
  function isReusable(c) {
    return c === "REUSABLE_PROFILE_FIELD" || c === "SENSITIVE_FIELD" || c === "DOCUMENT_FIELD" || c === "UNKNOWN_FIELD";
  }

  // src/content/application-detector.ts
  var LABEL_WEIGHTS = [
    { re: /email/, w: 14, reason: "email field" },
    { re: /first name|last name|full name|given name/, w: 14, reason: "name field" },
    { re: /phone|mobile/, w: 10, reason: "phone field" },
    { re: /college|university|institution/, w: 12, reason: "education field" },
    { re: /resume|cv|upload/, w: 14, reason: "resume upload" },
    { re: /cgpa|gpa|grade/, w: 8, reason: "academic score" },
    { re: /salary|ctc|compensation|notice period/, w: 10, reason: "compensation field" },
    { re: /experience|employer|company/, w: 8, reason: "experience field" },
    { re: /apply|candidate|applicant|registration/, w: 8, reason: "application wording" }
  ];
  function scoreFromSignals(input) {
    const reasons = [];
    let score = 0;
    if (input.isTestApp) {
      return { score: 100, reasons: ["CareerAI test application"], autoStart: true };
    }
    if (input.hasSessionId) {
      score += 45;
      reasons.push("CareerAI apply session");
    }
    const href = (input.href || "").toLowerCase();
    if (/careers|jobs|apply|internship|hackathon|scholarship|greenhouse|lever\.co|workday|myworkday|unstop|dare2compete/.test(href)) {
      score += 18;
      reasons.push("career URL pattern");
    }
    const fieldCount = input.fieldCount || 0;
    if (fieldCount >= 3) {
      score += 10;
      reasons.push(`${fieldCount} visible inputs`);
    }
    const blob = input.labelBlob || "";
    for (const { re, w, reason } of LABEL_WEIGHTS) {
      if (re.test(blob)) {
        score += w;
        reasons.push(reason);
      }
    }
    score = Math.min(100, score);
    return { score, reasons, autoStart: score >= 70 };
  }
  function scoreApplicationPage(doc = document) {
    const fields = extractFields(doc);
    return scoreFromSignals({
      isTestApp: !!doc.querySelector("[data-careerai-test-app]"),
      hasSessionId: !!new URLSearchParams(location.search).get("careerai_session_id"),
      href: location.href,
      fieldCount: fields.length,
      labelBlob: fields.map((f) => normalizeLabel(`${f.label} ${f.name} ${f.placeholder}`)).join(" ")
    });
  }
  function fieldFingerprint(doc = document) {
    return extractFields(doc).map((f) => `${f.id}|${f.name}|${f.type}|${f.label}`).join("~");
  }

  // src/automation/state-machine.ts
  var AgentStateMachine = class {
    state = "IDLE";
    reason;
    detail;
    history = [];
    listeners = /* @__PURE__ */ new Set();
    getSnapshot() {
      return { state: this.state, reason: this.reason, detail: this.detail, history: [...this.history] };
    }
    subscribe(fn) {
      this.listeners.add(fn);
      fn(this.getSnapshot());
      return () => this.listeners.delete(fn);
    }
    transition(next, opts) {
      this.state = next;
      this.reason = opts?.reason;
      this.detail = opts?.detail;
      this.history.push({ state: next, at: Date.now(), detail: opts?.detail });
      const snap = this.getSnapshot();
      this.listeners.forEach((l) => l(snap));
    }
    pause(reason, detail) {
      this.transition("HUMAN_INTERVENTION_REQUIRED", { reason, detail });
    }
    resume(detail) {
      this.transition("RESUME", { detail });
    }
    error(detail) {
      this.transition("ERROR", { detail });
    }
  };

  // src/content/captcha-detector.ts
  function isCaptchaPresent(root = document) {
    const iframes = Array.from(root.querySelectorAll("iframe"));
    const iframeHit = iframes.some((f) => {
      const src = (f.src || "").toLowerCase();
      return src.includes("recaptcha") || src.includes("hcaptcha") || src.includes("challenges.cloudflare") || src.includes("turnstile");
    });
    if (iframeHit) return true;
    if (root.querySelector(".g-recaptcha, [data-hcaptcha-widget-id], .h-captcha, #cf-turnstile, [data-careerai-captcha]")) {
      return true;
    }
    const text = (root.textContent || "").toLowerCase();
    if (text.includes("i'm not a robot") || text.includes("verify you are human") || text.includes("human verification required")) {
      const box = root.querySelector('[data-careerai-captcha], #careerai-test-captcha, input[type="checkbox"][name*="captcha" i]');
      if (box) {
        const input = box instanceof HTMLInputElement ? box : box.querySelector('input[type="checkbox"]');
        if (input instanceof HTMLInputElement) return !input.checked;
      }
      if (root.querySelector("[data-careerai-captcha]")) return true;
    }
    return false;
  }
  function waitForCaptchaClear(timeoutMs = 8 * 60 * 1e3, userConfirmed) {
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
      const fail = (err) => {
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
        if (!asked && elapsed > 2e4 && userConfirmed) {
          asked = true;
          void userConfirmed().then((ok) => {
            if (ok) finish();
          });
        }
        if (elapsed > timeoutMs) fail(new Error("Timed out waiting for human verification."));
      }, 400);
    });
  }

  // src/content/adapters/generic.ts
  var GenericApplicationAdapter = {
    name: "generic",
    match() {
      return true;
    },
    inspect() {
      return extractFields();
    }
  };
  function getAdapter(url) {
    void url;
    return GenericApplicationAdapter;
  }

  // src/content/form-detector.ts
  function getExtractedFields() {
    return getAdapter(location.href).inspect();
  }

  // src/content/autofill-engine.ts
  function readFieldValue(element) {
    if (element instanceof HTMLSelectElement) {
      return element.options[element.selectedIndex]?.text || element.value || "";
    }
    if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
      return element.checked ? element.value || "true" : "";
    }
    return element.value || "";
  }
  function valuesMatch(actual, expected) {
    const a = actual.trim().toLowerCase();
    const e = expected.trim().toLowerCase();
    if (!a || !e) return false;
    return a === e || a.includes(e) || e.includes(a);
  }
  function fillAndVerify(element, value) {
    if (!nativeSetValue(element, value)) return false;
    if (element instanceof HTMLInputElement && element.type === "radio" && element.name) {
      const group = document.querySelectorAll(`input[type="radio"][name="${CSS.escape(element.name)}"]`);
      const selected = Array.from(group).find((r) => r.checked);
      if (!selected) return false;
      const lab = document.querySelector(`label[for="${CSS.escape(selected.id)}"]`)?.textContent || "";
      return valuesMatch(`${selected.value} ${lab}`, value) || valuesMatch(selected.value, value) || valuesMatch(lab, value);
    }
    return valuesMatch(readFieldValue(element), value);
  }
  function nativeSetValue(element, value) {
    if (!element || value == null || value === "") return false;
    try {
      element.focus();
      if (element instanceof HTMLSelectElement) {
        const needle = value.toLowerCase();
        let idx = -1;
        for (let i = 0; i < element.options.length; i++) {
          const t = element.options[i].text.toLowerCase();
          const v = element.options[i].value.toLowerCase();
          if (t === needle || v === needle || t.includes(needle) || v.includes(needle) || needle.includes(t)) {
            idx = i;
            break;
          }
        }
        if (idx < 0) return false;
        element.selectedIndex = idx;
      } else if (element instanceof HTMLInputElement && (element.type === "radio" || element.type === "checkbox")) {
        const needle = value.toLowerCase();
        const yes = ["yes", "true", "y", "authorized", "eligible"].some((w) => needle.includes(w));
        const no = ["no", "false", "n"].includes(needle);
        if (element.type === "checkbox") {
          return false;
        } else {
          const group = document.querySelectorAll(`input[type="radio"][name="${CSS.escape(element.name)}"]`);
          let matched = null;
          group.forEach((r) => {
            const lab = document.querySelector(`label[for="${CSS.escape(r.id)}"]`)?.textContent || r.value;
            if (lab.toLowerCase().includes(needle) || r.value.toLowerCase().includes(needle)) matched = r;
            if (yes && /^(yes|y|true|authorized)/i.test(lab.trim() || r.value)) matched = r;
          });
          if (!matched) return false;
          matched.checked = true;
          element = matched;
        }
      } else {
        const proto = Object.getPrototypeOf(element);
        const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
        if (setter) setter.call(element, value);
        else element.value = value;
      }
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
      element.dispatchEvent(new Event("blur", { bubbles: true }));
      return true;
    } catch {
      return false;
    }
  }
  function highlight(el, kind) {
    const colors = {
      filled: "#10b981",
      ask: "#f59e0b",
      skip: "#ef4444",
      file: "#6366f1"
    };
    el.style.outline = `2px solid ${colors[kind]}`;
    el.style.outlineOffset = "2px";
  }
  async function tryAttachResume(input, resume, apiBase) {
    if (!resume?.downloadUrl) return false;
    try {
      const url = resume.downloadUrl.startsWith("http") ? resume.downloadUrl : `${apiBase || ""}${resume.downloadUrl}`;
      const res = await fetch(url);
      if (!res.ok) return false;
      const blob = await res.blob();
      const file = new File([blob], resume.fileName || "resume.pdf", { type: blob.type || "application/pdf" });
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    } catch {
      return false;
    }
  }

  // src/content/multi-page-manager.ts
  var NEXT_WORDS = ["next", "continue", "save and continue", "proceed", "go to next"];
  var SUBMIT_WORDS = ["submit", "submit application", "finish", "complete application", "send application"];
  function buttonText(el) {
    return (el.innerText || el.getAttribute("value") || el.getAttribute("aria-label") || "").toLowerCase().trim();
  }
  function findNextButton() {
    const els = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"]'));
    for (const el of els) {
      const t = buttonText(el);
      if (SUBMIT_WORDS.some((w) => t === w || t.includes(w))) continue;
      if (NEXT_WORDS.some((w) => t === w || t.startsWith(w))) return el;
    }
    return null;
  }
  function findSubmitButton() {
    const els = Array.from(document.querySelectorAll('button, a, input[type="submit"], [role="button"]'));
    for (const el of els) {
      const t = buttonText(el);
      if (SUBMIT_WORDS.some((w) => t === w || t.includes(w))) return el;
    }
    return null;
  }
  function clickNext() {
    const btn = findNextButton();
    if (!btn) return false;
    btn.scrollIntoView({ behavior: "smooth", block: "center" });
    btn.click();
    return true;
  }

  // src/ai/semantic-mapper.ts
  var AUTOCOMPLETE_MAP = {
    "given-name": "personal.firstName",
    "family-name": "personal.lastName",
    name: "personal.fullName",
    email: "personal.email",
    tel: "personal.phone",
    bday: "personal.dateOfBirth",
    sex: "personal.gender",
    organization: "education.college"
  };
  function matchField(signals, memory = [], siteHost = "") {
    const classification = classifyField([signals.label, signals.placeholder, signals.name, signals.id].filter(Boolean).join(" "));
    const autocomplete = (signals.autocomplete || "").toLowerCase().split(" ").pop() || "";
    if (autocomplete && AUTOCOMPLETE_MAP[autocomplete]) {
      return { key: AUTOCOMPLETE_MAP[autocomplete], confidence: 0.97, method: "autocomplete", classification };
    }
    const combined = normalizeLabel([signals.label, signals.placeholder, signals.name, signals.id].filter(Boolean).join(" "));
    if (!combined) return null;
    const siteMemory = memory.filter((m) => m.verified && m.siteHost && m.siteHost === siteHost);
    const globalMemory = memory.filter((m) => m.verified && (!m.siteHost || m.siteHost === ""));
    for (const pool of [siteMemory, globalMemory]) {
      for (const m of pool) {
        if (combined === m.fieldPattern || combined.includes(m.fieldPattern) || m.fieldPattern.includes(combined)) {
          return { key: m.mappedField, confidence: Math.min(0.99, m.confidence), method: "memory", classification };
        }
      }
    }
    let best = null;
    for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
      for (const alias of aliases) {
        if (combined === alias) return { key, confidence: 0.99, method: "exact", classification };
        if (combined.includes(alias) || alias.includes(combined)) {
          const confidence = alias.length / Math.max(combined.length, alias.length) > 0.55 ? 0.9 : 0.8;
          if (!best || confidence > best.confidence) best = { key, confidence, method: "alias", classification };
        }
      }
    }
    return best;
  }
  function customKeyFromLabel(label) {
    const norm = normalizeLabel(label).replace(/[^a-z0-9\s]/g, "").split(" ").filter(Boolean).slice(0, 6).map((w, i) => i === 0 ? w : w[0].toUpperCase() + w.slice(1)).join("");
    return norm || `field${Date.now()}`;
  }

  // src/browser/browser-api.ts
  function getApi() {
    const root = globalThis;
    const api2 = root.browser || root.chrome;
    if (!api2) {
      throw new Error("This script must run inside a browser extension.");
    }
    return api2;
  }
  var ext = {
    runtime: {
      sendMessage(message) {
        const api2 = getApi();
        return new Promise((resolve, reject) => {
          try {
            api2.runtime.sendMessage(message, (response) => {
              const err = api2.runtime.lastError;
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
          const api2 = getApi();
          return new Promise((resolve) => {
            api2.storage.local.get(keys ?? null, (items) => resolve(items));
          });
        },
        async set(items) {
          const api2 = getApi();
          return new Promise((resolve) => {
            api2.storage.local.set(items, () => resolve());
          });
        },
        async remove(keys) {
          const api2 = getApi();
          return new Promise((resolve) => {
            api2.storage.local.remove(keys, () => resolve());
          });
        }
      }
    },
    tabs: {
      async query(info) {
        const api2 = getApi();
        return new Promise((resolve) => {
          api2.tabs.query(info, (tabs) => resolve(tabs));
        });
      }
    }
  };

  // src/api/api-client.ts
  async function bg(message) {
    return ext.runtime.sendMessage(message);
  }

  // src/ui/assistant/overlay.ts
  var api = null;
  function getOverlay() {
    if (api) return api;
    api = mountOverlay();
    return api;
  }
  function mountOverlay() {
    const host = document.createElement("div");
    host.id = "careerai-apply-agent-root";
    host.style.all = "initial";
    document.documentElement.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; font-family: ui-sans-serif, system-ui, Segoe UI, sans-serif; }
      .panel {
        position: fixed; right: 16px; bottom: 16px; z-index: 2147483646;
        width: 340px; background: #0f172a; color: #f8fafc; border: 1px solid #334155;
        border-radius: 14px; padding: 14px 16px; box-shadow: 0 18px 40px rgba(0,0,0,.45);
      }
      .row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .title { font-weight: 700; font-size: 13px; color: #38bdf8; }
      .state { font-size: 12px; color: #cbd5e1; margin-top: 8px; line-height: 1.45; }
      .pill { font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
        background: #1e293b; color: #93c5fd; border-radius: 999px; padding: 3px 8px; }
      .modal-backdrop {
        position: fixed; inset: 0; z-index: 2147483647; background: rgba(15,23,42,.55);
        display: flex; align-items: center; justify-content: center; padding: 16px;
      }
      .modal { width: min(480px, 100%); background: #fff; color: #0f172a; border-radius: 16px; padding: 20px; }
      h3 { margin: 0 0 8px; font-size: 16px; }
      p, label { font-size: 13px; color: #334155; }
      .q { margin: 12px 0; }
      input[type=text], textarea {
        width: 100%; margin-top: 4px; border: 1px solid #cbd5e1; border-radius: 10px;
        padding: 10px 12px; font-size: 14px;
      }
      textarea { min-height: 88px; resize: vertical; }
      .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
      button { border: 0; border-radius: 10px; padding: 9px 14px; font-weight: 600; cursor: pointer; font-size: 13px; }
      .primary { background: #4f46e5; color: #fff; }
      .ghost { background: #e2e8f0; color: #0f172a; }
      .warn { background: #f59e0b; color: #111; }
      .check { display: flex; gap: 8px; align-items: flex-start; margin-top: 12px; font-size: 13px; }
      .banner {
        position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 2147483646;
        background: #7c2d12; color: #fff7ed; border-radius: 12px; padding: 12px 16px; max-width: 520px;
        border: 1px solid #fb923c; font-size: 13px; font-weight: 600;
      }
      ul { margin: 8px 0 0; padding-left: 18px; font-size: 12px; color: #334155; max-height: 160px; overflow: auto; }
    </style>
    <div class="panel" id="panel">
      <div class="row">
        <div class="title">CareerAI Apply Agent</div>
        <span class="pill" id="pill">IDLE</span>
      </div>
      <div class="state" id="stateText">Waiting for an application page\u2026</div>
      <div class="actions" style="margin-top:10px;justify-content:flex-start">
        <button class="ghost" id="undoBtn" style="display:none">Undo autofill</button>
      </div>
    </div>
    <div id="extra"></div>
  `;
    const pill = shadow.getElementById("pill");
    const stateText = shadow.getElementById("stateText");
    const extra = shadow.getElementById("extra");
    const undoBtn = shadow.getElementById("undoBtn");
    let undoHandler = null;
    undoBtn.addEventListener("click", () => undoHandler?.());
    function renderState(snap) {
      pill.textContent = snap.state;
      const reason = snap.reason ? ` \xB7 ${snap.reason}` : "";
      stateText.textContent = (snap.detail || humanState(snap.state)) + reason;
    }
    function askMissing(questions) {
      return new Promise((resolve) => {
        extra.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal">
            <h3>Additional information required</h3>
            <p>${questions.length} detail${questions.length === 1 ? "" : "s"} needed before we can continue. We will not invent answers.</p>
            <form id="mf">
              ${questions.map((q) => `
                <div class="q">
                  <label>
                    ${escapeHtml(q.label)}${q.required ? " *" : ""}
                    ${q.hint ? `<br><small>${escapeHtml(q.hint)}</small>` : ""}
                    ${q.classification === "SENSITIVE_FIELD" ? "<br><small>Sensitive \u2014 you must answer this yourself.</small>" : ""}
                    ${q.classification === "APPLICATION_SPECIFIC_FIELD" ? "<br><small>Application-specific \u2014 not saved to your permanent profile by default.</small>" : ""}
                    ${q.classification === "APPLICATION_SPECIFIC_FIELD" || (q.label + q.hint || "").length > 80 ? `<textarea name="${escapeHtml(q.id)}" placeholder="${escapeHtml(q.placeholder || "")}" ${q.required ? "required" : ""}></textarea>` : `<input type="text" name="${escapeHtml(q.id)}" placeholder="${escapeHtml(q.placeholder || "")}" ${q.required ? "required" : ""} />`}
                  </label>
                </div>
              `).join("")}
              <label class="check">
                <input type="checkbox" name="saveFuture" checked />
                <span>Save reusable answers to my CareerAI profile for future applications</span>
              </label>
              <div class="actions">
                <button type="submit" class="primary">Continue</button>
              </div>
            </form>
          </div>
        </div>`;
        extra.querySelector("#mf")?.addEventListener("submit", (e) => {
          e.preventDefault();
          const form = e.target;
          const fd = new FormData(form);
          const saveForFuture = fd.get("saveFuture") === "on";
          const answers = questions.map((q) => ({
            id: q.id,
            key: q.key,
            label: q.label,
            classification: q.classification,
            value: String(fd.get(q.id) || "").trim()
          })).filter((a) => a.value);
          extra.innerHTML = "";
          resolve({ answers, saveForFuture });
        });
      });
    }
    function askConflict(label, current, incoming) {
      return new Promise((resolve) => {
        extra.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal">
            <h3>Update your profile?</h3>
            <p>You already have <strong>${escapeHtml(label)}</strong>: <strong>${escapeHtml(current)}</strong></p>
            <p>You entered: <strong>${escapeHtml(incoming)}</strong></p>
            <div class="actions">
              <button class="primary" id="u">Update profile</button>
              <button class="warn" id="o">Use once</button>
              <button class="ghost" id="c">Cancel</button>
            </div>
          </div>
        </div>`;
        extra.querySelector("#u")?.addEventListener("click", () => {
          extra.innerHTML = "";
          resolve("UPDATE");
        });
        extra.querySelector("#o")?.addEventListener("click", () => {
          extra.innerHTML = "";
          resolve("ONCE");
        });
        extra.querySelector("#c")?.addEventListener("click", () => {
          extra.innerHTML = "";
          resolve("CANCEL");
        });
      });
    }
    function showCaptcha() {
      extra.innerHTML = `<div class="banner">Human verification required. Complete the CAPTCHA on the page. The agent will never solve it for you.</div>`;
    }
    function hideCaptcha() {
      extra.innerHTML = "";
    }
    function confirmCaptchaDone() {
      return new Promise((resolve) => {
        extra.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal">
            <h3>Have you completed the verification?</h3>
            <p>We cannot always detect CAPTCHA completion. If you finished the human check, continue. The agent will not bypass it.</p>
            <div class="actions">
              <button class="primary" id="yes">Yes, continue</button>
              <button class="ghost" id="no">Not yet</button>
            </div>
          </div>
        </div>`;
        extra.querySelector("#yes")?.addEventListener("click", () => {
          extra.innerHTML = "";
          resolve(true);
        });
        extra.querySelector("#no")?.addEventListener("click", () => {
          extra.innerHTML = "";
          resolve(false);
        });
      });
    }
    function showDryRun(rows) {
      return new Promise((resolve) => {
        extra.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal">
            <h3>Dry run \u2014 no fields were modified</h3>
            <ul>${rows.map((r) => `<li>${escapeHtml(r.label)} \u2192 ${escapeHtml(r.key)} \xB7 confidence ${r.confidence.toFixed(2)} \xB7 ${escapeHtml(r.action)}</li>`).join("")}</ul>
            <div class="actions"><button class="primary" id="ok">Close</button></div>
          </div>
        </div>`;
        extra.querySelector("#ok")?.addEventListener("click", () => {
          extra.innerHTML = "";
          resolve();
        });
      });
    }
    function askStartAssistant(score, reasons) {
      return new Promise((resolve) => {
        extra.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal">
            <h3>Start Apply Assistant?</h3>
            <p>Application confidence: <strong>${score}%</strong></p>
            <ul>${reasons.slice(0, 8).map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>
            <div class="actions">
              <button class="primary" id="go">Start Assistant</button>
              <button class="ghost" id="no">Not now</button>
            </div>
          </div>
        </div>`;
        extra.querySelector("#go")?.addEventListener("click", () => {
          extra.innerHTML = "";
          resolve(true);
        });
        extra.querySelector("#no")?.addEventListener("click", () => {
          extra.innerHTML = "";
          resolve(false);
        });
      });
    }
    function showReconnect(message) {
      return new Promise((resolve) => {
        extra.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal">
            <h3>CareerAI connection</h3>
            <p>${escapeHtml(message)}</p>
            <div class="actions">
              <button class="primary" id="r">Retry / Reconnect</button>
              <button class="ghost" id="c">Close</button>
            </div>
          </div>
        </div>`;
        extra.querySelector("#r")?.addEventListener("click", () => {
          extra.innerHTML = "";
          resolve("retry");
        });
        extra.querySelector("#c")?.addEventListener("click", () => {
          extra.innerHTML = "";
          resolve("close");
        });
      });
    }
    function waitForHuman(reason, detail) {
      return new Promise((resolve) => {
        extra.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal">
            <h3>Automation paused</h3>
            <p><strong>Reason:</strong> ${escapeHtml(reason)}</p>
            <p>${escapeHtml(detail)}</p>
            <div class="actions">
              <button class="primary" id="done">Complete</button>
              <button class="ghost" id="resume">Resume automation</button>
            </div>
          </div>
        </div>`;
        extra.querySelector("#done")?.addEventListener("click", () => {
          extra.innerHTML = "";
          resolve();
        });
        extra.querySelector("#resume")?.addEventListener("click", () => {
          extra.innerHTML = "";
          resolve();
        });
      });
    }
    function setUndoHandler(fn) {
      undoHandler = fn;
      undoBtn.style.display = fn ? "inline-block" : "none";
    }
    function showReview(summary) {
      return new Promise((resolve) => {
        extra.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal">
            <h3>Application ready</h3>
            <p>\u2713 ${summary.filled} / ${summary.detected} fields filled<br>
               \u2713 ${summary.providedByUser} fields provided by you<br>
               \u2713 ${summary.savedToProfile} new profile fields saved<br>
               ${summary.missingRequired ? `\u26A0 ${summary.missingRequired} required fields still empty` : "\u2713 0 required fields missing"}</p>
            <ul>${summary.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
            <p><strong>The agent will not click Submit.</strong> Review the page, then submit yourself.</p>
            <div class="actions">
              <button class="primary" id="ok">I understand \u2014 I will submit</button>
            </div>
          </div>
        </div>`;
        extra.querySelector("#ok")?.addEventListener("click", () => {
          extra.innerHTML = "";
          resolve(true);
        });
      });
    }
    function toast(msg) {
      stateText.textContent = msg;
    }
    return {
      renderState,
      askMissing,
      askConflict,
      showCaptcha,
      hideCaptcha,
      confirmCaptchaDone,
      showReview,
      showDryRun,
      askStartAssistant,
      showReconnect,
      waitForHuman,
      setUndoHandler,
      toast
    };
  }
  function humanState(s) {
    const map = {
      IDLE: "Waiting\u2026",
      APPLICATION_DETECTED: "Application page detected",
      ANALYZING: "Analyzing the page",
      CAPTCHA_CHECK: "Checking for human verification",
      FORM_DETECTED: "Form detected",
      PROFILE_LOADING: "Loading your CareerAI profile",
      FIELD_MAPPING: "Matching fields to your profile",
      AUTOFILLING: "Filling known information",
      MISSING_INFORMATION: "Waiting for information from you",
      HUMAN_INTERVENTION_REQUIRED: "Paused \u2014 your action is needed",
      VALIDATION: "Checking filled values",
      RESUME: "Resuming automation",
      NEXT_PAGE: "Moving to the next page",
      FINAL_REVIEW: "Ready for your review",
      USER_CONFIRMATION: "Waiting for you to submit",
      SUBMITTED: "Submitted by you",
      ERROR: "Something went wrong"
    };
    return map[s] || s;
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  // src/storage/storage-manager.ts
  function resolvePolicy(key, classification, policies) {
    if (classification === "LEGAL_FIELD") return "NEVER";
    if (policies[key]) return policies[key];
    if (classification === "SENSITIVE_FIELD") return policies["preferences.workAuthorization"] || "ASK";
    if (classification === "APPLICATION_SPECIFIC_FIELD") return "ASK";
    return "AUTOMATIC";
  }

  // src/content/undo-stack.ts
  var stack = [];
  function captureOriginal(el) {
    if (stack.some((s) => s.el === el)) return;
    if (el instanceof HTMLSelectElement) {
      stack.push({ kind: "select", el, original: el.selectedIndex });
      return;
    }
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
      stack.push({ kind: "check", el, original: el.checked });
      return;
    }
    stack.push({ kind: "value", el, original: el.value });
  }
  function undoAll() {
    let n = 0;
    for (const item of stack) {
      try {
        if (item.kind === "select") item.el.selectedIndex = item.original;
        else if (item.kind === "check") item.el.checked = item.original;
        else item.el.value = item.original;
        item.el.dispatchEvent(new Event("input", { bubbles: true }));
        item.el.dispatchEvent(new Event("change", { bubbles: true }));
        n += 1;
      } catch {
      }
    }
    return n;
  }
  function clearUndo() {
    stack.length = 0;
  }
  function undoCount() {
    return stack.length;
  }

  // src/automation/audit-log.ts
  var buffer = [];
  function audit(status, extra = {}) {
    buffer.push({ status, ...extra });
  }
  async function flushAudit(sessionToken) {
    if (!buffer.length) return;
    const events = buffer.splice(0, buffer.length);
    try {
      await bg({
        type: "REPORT_AUDIT",
        payload: {
          domain: location.host,
          sessionToken: sessionToken || void 0,
          events
        }
      });
    } catch {
      buffer.unshift(...events);
    }
  }

  // src/automation/application-runner.ts
  async function runApplicationAgent() {
    const machine = new AgentStateMachine();
    const ui = getOverlay();
    machine.subscribe((snap) => ui.renderState(snap));
    const detection = scoreApplicationPage();
    audit("DETECTED", { detail: `confidence ${detection.score}` });
    if (detection.score < 40 && !getSessionIdFromPage()) {
      machine.transition("IDLE", { detail: "No application form detected on this page." });
      return;
    }
    if (!detection.autoStart) {
      const go = await ui.askStartAssistant(detection.score, detection.reasons);
      if (!go) {
        machine.transition("IDLE", { detail: `Application confidence ${detection.score}% \u2014 waiting for Start Assistant.` });
        return;
      }
    }
    const sessionId = getSessionIdFromPage();
    let filled = 0;
    let detected = 0;
    let providedByUser = 0;
    let savedToProfile = 0;
    let failed = 0;
    const reviewItems = [];
    try {
      machine.transition("APPLICATION_DETECTED", { detail: `Application confidence ${detection.score}%` });
      machine.transition("ANALYZING");
      machine.transition("CAPTCHA_CHECK");
      await handleCaptcha(machine, ui, sessionId);
      machine.transition("FORM_DETECTED");
      machine.transition("PROFILE_LOADING");
      const settingsRes = await bg({ type: "GET_SETTINGS" });
      const settings = settingsRes.settings;
      const dryRun = !!(settings.developerMode && settings.dryRun);
      const fieldsPreview = getExtractedFields();
      const categories = categoriesFromFields(fieldsPreview);
      const profileRes = await bg({
        type: "GET_PROFILE",
        sessionId: sessionId || void 0,
        categories
      });
      if (!profileRes?.success) {
        if (profileRes?.authExpired) {
          machine.pause("AUTH_EXPIRED", "CareerAI connection expired.");
          audit("AUTH_EXPIRED");
          await ui.showReconnect("CareerAI connection expired. Open the popup or /connect-extension to reconnect.");
          await flushAudit(sessionId);
          return;
        }
        if (profileRes?.network) {
          machine.pause("NETWORK_ERROR", "CareerAI connection unavailable.");
          audit("NETWORK_ERROR");
          const action = await ui.showReconnect("CareerAI connection unavailable.");
          if (action === "retry") {
            await flushAudit(sessionId);
            return runApplicationAgent();
          }
          await flushAudit(sessionId);
          return;
        }
        machine.pause("AUTH_EXPIRED", profileRes?.error || "Connect your CareerAI account in the extension popup.");
        await ui.showReconnect(profileRes?.error || "Open the extension popup and sign in to CareerAI.");
        await flushAudit(sessionId);
        return;
      }
      const flat = {
        ...profileRes.student || {},
        ...profileRes.profile?.flat || {}
      };
      const mappingsRes = await bg({ type: "GET_MAPPINGS" }).catch(() => ({ success: false, mappings: [] }));
      const memory = mappingsRes.mappings || [];
      const siteHost = location.host;
      ui.setUndoHandler(() => {
        const n = undoAll();
        audit("UNDO", { detail: `${n} fields restored` });
        void flushAudit(sessionId);
        ui.toast(`Undo autofill restored ${n} field(s).`);
      });
      await fillCurrentPage();
      async function fillCurrentPage() {
        await handleCaptcha(machine, ui, sessionId);
        if (document.querySelector("[data-careerai-custom-dropdown]")) {
          machine.pause("UNSUPPORTED_WIDGET", "Custom dropdown cannot be filled safely.");
          audit("SKIPPED", { detail: "unsupported custom dropdown" });
          await ui.waitForHuman("Unsupported widget", "Please complete the custom dropdown yourself, then resume.");
          machine.resume();
        }
        machine.transition("FIELD_MAPPING");
        const fields = getExtractedFields();
        detected = Math.max(detected, fields.length);
        const missing = [];
        const sensitiveConfirm = [];
        const dryRows = [];
        machine.transition(dryRun ? "FIELD_MAPPING" : "AUTOFILLING");
        for (const field of fields) {
          const label = field.label || field.placeholder || field.name || field.id;
          const classification = classifyField(label);
          const hit = matchField(field, memory, siteHost);
          const key = hit?.key || (isReusable(classification) ? `custom.${customKeyFromLabel(label)}` : `application.${customKeyFromLabel(label)}`);
          const policy = resolvePolicy(key, classification, settings.fillPolicies);
          const confidence = hit?.confidence ?? (classification === "REUSABLE_PROFILE_FIELD" ? 0.85 : 0.4);
          audit(hit ? "MAPPED" : "DETECTED", { fieldKey: key, fieldLabel: label, detail: hit?.method || classification });
          if (classification === "LEGAL_FIELD" || policy === "NEVER") {
            highlight(field.element, "skip");
            audit("SKIPPED", { fieldKey: key, fieldLabel: label, detail: "legal or NEVER policy" });
            dryRows.push({ label, key, confidence, action: "WOULD SKIP" });
            continue;
          }
          if (field.type === "file" || classification === "DOCUMENT_FIELD") {
            if (dryRun) {
              dryRows.push({ label, key, confidence: 0.7, action: "WOULD ASK (file)" });
              continue;
            }
            const attached = await tryAttachResume(field.element, profileRes.resume, settings.apiBase);
            if (attached) {
              filled += 1;
              reviewItems.push(`${label} (resume attached)`);
              highlight(field.element, "file");
              audit("FILLED", { fieldKey: key, fieldLabel: label, detail: "resume" });
            } else {
              machine.pause("FILE_SELECTION", "Please attach your resume file. Browsers block silent file uploads.");
              highlight(field.element, "file");
              ui.toast("Please select your resume file, then continue.");
              await waitForFile(field.element);
              machine.resume();
              audit("USER_PROVIDED", { fieldKey: key, fieldLabel: label, detail: "file" });
            }
            continue;
          }
          const value = lookup(flat, key);
          if (dryRun) {
            let action = "WOULD ASK";
            if (value && policy === "AUTOMATIC" && (classification === "REUSABLE_PROFILE_FIELD" || hit && hit.confidence >= 0.8)) {
              action = "WOULD FILL";
            } else if (!value) {
              action = "WOULD ASK";
            } else if (policy === "ASK") {
              action = "WOULD ASK";
            }
            dryRows.push({ label, key, confidence, action });
            continue;
          }
          if ((classification === "SENSITIVE_FIELD" || policy === "ASK") && value) {
            sensitiveConfirm.push({ field, key, value });
            continue;
          }
          if (value && policy === "AUTOMATIC" && (classification === "REUSABLE_PROFILE_FIELD" || hit && hit.confidence >= 0.8)) {
            const ok = await fillWithRetry(field.element, value);
            if (ok) {
              filled += 1;
              reviewItems.push(label);
              highlight(field.element, "filled");
              audit("FILLED", { fieldKey: key, fieldLabel: label });
              watchUserEdit(field.element, label, key, value);
            } else {
              failed += 1;
              highlight(field.element, "ask");
              audit("FAILED", { fieldKey: key, fieldLabel: label });
              missing.push({
                id: `${key}-fail-${fields.indexOf(field)}`,
                label,
                key,
                classification,
                required: field.required,
                placeholder: "Enter value",
                hint: `Could not automatically fill: ${label}. Please enter it manually.`
              });
            }
            continue;
          }
          if (!value || policy === "ASK") {
            missing.push({
              id: `${key}-${fields.indexOf(field)}`,
              label,
              key,
              classification,
              required: field.required || classification === "SENSITIVE_FIELD",
              placeholder: classification === "APPLICATION_SPECIFIC_FIELD" ? "Write your answer for this application only" : "Enter value"
            });
            highlight(field.element, "ask");
            audit("MISSING", { fieldKey: key, fieldLabel: label });
          }
        }
        if (dryRun) {
          audit("DRY_RUN", { detail: `${dryRows.length} predictions` });
          await ui.showDryRun(dryRows);
          await flushAudit(sessionId);
          machine.transition("IDLE", { detail: "Dry run complete \u2014 no fields were modified." });
          return;
        }
        if (sensitiveConfirm.length) {
          machine.pause("SENSITIVE_QUESTION", "Confirm sensitive values before filling.");
          const qs = sensitiveConfirm.map((s, i) => ({
            id: `sens-${i}`,
            label: `${s.field.label || s.key} (saved value on file \u2014 confirm or replace)`,
            key: s.key,
            classification: "SENSITIVE_FIELD",
            required: true,
            placeholder: "Type the value to use"
          }));
          const result = await ui.askMissing(qs);
          providedByUser += result.answers.length;
          for (let i = 0; i < result.answers.length; i++) {
            const ans = result.answers[i];
            const target = sensitiveConfirm[i];
            const v = ans.value || target.value;
            const ok = await fillWithRetry(target.field.element, v);
            if (ok) {
              filled += 1;
              reviewItems.push(target.field.label || target.key);
              highlight(target.field.element, "filled");
              audit("USER_PROVIDED", { fieldKey: target.key, fieldLabel: target.field.label || target.key });
            } else {
              failed += 1;
              audit("FAILED", { fieldKey: target.key, fieldLabel: target.field.label || target.key });
            }
          }
          machine.resume();
        }
        if (missing.length) {
          machine.transition("MISSING_INFORMATION");
          machine.pause("MISSING_INFORMATION", `${missing.length} field(s) need your answer.`);
          const result = await ui.askMissing(missing);
          providedByUser += result.answers.length;
          for (const ans of result.answers) {
            const target = fields.find((f) => (f.label || f.placeholder || f.name) === ans.label) || fields.find((f) => matchField(f, memory, siteHost)?.key === ans.key);
            if (target) {
              const ok = await fillWithRetry(target.element, ans.value);
              if (ok) {
                filled += 1;
                reviewItems.push(ans.label);
                highlight(target.element, "filled");
              } else {
                failed += 1;
                audit("FAILED", { fieldKey: ans.key, fieldLabel: ans.label });
              }
            }
            const saveMode = ans.classification === "APPLICATION_SPECIFIC_FIELD" ? "USE_ONCE" : result.saveForFuture ? "SAVE" : "USE_ONCE";
            if (saveMode === "SAVE" && !isReusable(ans.classification) && ans.classification !== "UNKNOWN_FIELD") {
              audit("USER_PROVIDED", { fieldKey: ans.key, fieldLabel: ans.label, detail: "application-specific" });
              continue;
            }
            const confirm = await bg({
              type: "CONFIRM_FIELD",
              payload: {
                key: ans.key.startsWith("application.") ? void 0 : ans.key,
                label: ans.label,
                value: ans.value,
                saveMode,
                classification: ans.classification,
                fieldPattern: normalizeLabel(ans.label),
                siteHost,
                sessionToken: sessionId
              }
            });
            if (confirm?.authExpired) {
              machine.pause("AUTH_EXPIRED", "CareerAI connection expired.");
              await ui.showReconnect("CareerAI connection expired.");
              break;
            }
            if (confirm?.conflict && confirm.current && confirm.incoming) {
              const choice = await ui.askConflict(ans.label, confirm.current, confirm.incoming);
              if (choice === "UPDATE") {
                await bg({
                  type: "CONFIRM_FIELD",
                  payload: {
                    key: ans.key,
                    label: ans.label,
                    value: ans.value,
                    saveMode: "SAVE",
                    forceUpdate: true,
                    classification: ans.classification,
                    fieldPattern: normalizeLabel(ans.label),
                    siteHost,
                    sessionToken: sessionId
                  }
                });
                savedToProfile += 1;
              }
            } else if (confirm?.saved) {
              savedToProfile += 1;
              flat[ans.key] = ans.value;
              const short = ans.key.split(".").pop();
              if (short) flat[short] = ans.value;
            }
            audit("USER_PROVIDED", { fieldKey: ans.key, fieldLabel: ans.label, detail: saveMode });
          }
          machine.resume();
        }
        machine.transition("VALIDATION", { detail: failed ? `${failed} field(s) could not be verified` : "Values verified" });
        if (sessionId) {
          await bg({
            type: "REPORT_SESSION",
            payload: {
              sessionToken: sessionId,
              status: "FILLING",
              fieldsDetected: detected,
              fieldsFilled: filled,
              newFieldsSaved: savedToProfile,
              report: { labels: reviewItems.slice(0, 40), failed }
            }
          });
        }
        await flushAudit(sessionId);
        const submitBtn = findSubmitButton();
        const canAdvance = settings.autoAdvancePages && !submitBtn;
        if (canAdvance && clickNext()) {
          machine.transition("NEXT_PAGE", { detail: "Opening the next page\u2026" });
          await wait(900);
          await fillCurrentPage();
          return;
        }
        if (submitBtn) {
          highlight(submitBtn, "skip");
          machine.transition("FINAL_REVIEW");
          audit("REVIEW_READY", { detail: `${filled} filled` });
          await ui.showReview({
            filled,
            detected,
            providedByUser,
            savedToProfile,
            missingRequired: failed,
            items: reviewItems.slice(0, 30)
          });
          machine.transition("USER_CONFIRMATION", { detail: "Submit the form yourself when you are ready." });
          if (sessionId) {
            await bg({
              type: "REPORT_SESSION",
              payload: { sessionToken: sessionId, status: "REVIEW", fieldsDetected: detected, fieldsFilled: filled, newFieldsSaved: savedToProfile }
            });
          }
          await flushAudit(sessionId);
        } else if (!settings.autoAdvancePages && clickNext()) {
          machine.pause("MISSING_INFORMATION", "Auto-advance is off. Click Continue on the page when ready.");
          await ui.waitForHuman("Next page", "Click Continue on the site when you are ready, then resume.");
          machine.resume();
          machine.transition("NEXT_PAGE");
          await wait(600);
          await fillCurrentPage();
        } else {
          ui.toast(`Filled ${filled}/${detected} fields. Continue on the site if there is another step.`);
        }
      }
    } catch (err) {
      machine.error(err.message || "Agent failed");
      audit("ERROR", { detail: "runner error" });
      await flushAudit(sessionId);
    } finally {
      if (undoCount() === 0) clearUndo();
    }
  }
  async function handleCaptcha(machine, ui, sessionId) {
    if (!isCaptchaPresent()) return;
    machine.pause("CAPTCHA", "Human verification required. Complete the CAPTCHA.");
    ui.showCaptcha();
    audit("CAPTCHA_PAUSED");
    await waitForCaptchaClear(8 * 60 * 1e3, () => ui.confirmCaptchaDone());
    ui.hideCaptcha();
    machine.resume("Verification complete");
    audit("RESUMED", { detail: "captcha" });
    await flushAudit(sessionId);
  }
  async function fillWithRetry(element, value) {
    captureOriginal(element);
    if (fillAndVerify(element, value)) return true;
    await wait(80);
    return fillAndVerify(element, value);
  }
  function categoriesFromFields(fields) {
    const cats = /* @__PURE__ */ new Set(["custom"]);
    for (const f of fields) {
      const blob = normalizeLabel(`${f.label} ${f.name} ${f.placeholder} ${f.autocomplete}`);
      if (/email|name|phone|mobile|gender|dob|birth/.test(blob)) cats.add("personal");
      if (/college|university|cgpa|gpa|degree|department|education/.test(blob)) cats.add("education");
      if (/salary|ctc|notice|authorization|location|preference/.test(blob)) cats.add("preferences");
      if (/resume|cv|upload|transcript|file/.test(blob)) cats.add("documents");
      if (/github|linkedin|portfolio/.test(blob)) cats.add("links");
    }
    if (cats.size === 1) return "personal,education,preferences,documents,custom";
    return [...cats].join(",");
  }
  function lookup(flat, key) {
    if (flat[key]) return flat[key];
    const short = key.split(".").pop() || "";
    if (flat[short]) return flat[short];
    const aliases = {
      "personal.fullName": ["fullName", "name"],
      "personal.firstName": ["firstName"],
      "personal.lastName": ["lastName"],
      "personal.email": ["email"],
      "personal.phone": ["phone"],
      "education.college": ["college"],
      "education.cgpa": ["cgpa"],
      "education.department": ["department"],
      "education.year": ["year"],
      "links.github": ["github"],
      "links.linkedin": ["linkedin"],
      "preferences.expectedSalary": ["expectedSalary"],
      "preferences.noticePeriod": ["noticePeriod"],
      "preferences.workAuthorization": ["workAuthorization"],
      "preferences.preferredLocation": ["preferredLocation", "location"]
    };
    for (const a of aliases[key] || []) {
      if (flat[a]) return flat[a];
    }
    return "";
  }
  function waitForFile(input) {
    return new Promise((resolve) => {
      const onChange = () => {
        if (input.files && input.files.length > 0) {
          input.removeEventListener("change", onChange);
          resolve();
        }
      };
      input.addEventListener("change", onChange);
    });
  }
  function watchUserEdit(el, label, key, original) {
    const handler = async () => {
      const next = "value" in el ? String(el.value || "") : "";
      if (!next || next === original) return;
      el.removeEventListener("change", handler);
      const ui = getOverlay();
      const choice = await ui.askConflict(label, original, next);
      if (choice === "UPDATE") {
        await bg({
          type: "CONFIRM_FIELD",
          payload: { key, label, value: next, saveMode: "SAVE", forceUpdate: true, classification: "REUSABLE_PROFILE_FIELD" }
        });
      }
    };
    el.addEventListener("change", handler);
  }

  // src/content/content-script.ts
  function allowedOrigin() {
    return window.location.origin;
  }
  function setupCareerAiBridge() {
    window.addEventListener("message", async (event) => {
      if (event.source !== window) return;
      if (event.origin !== allowedOrigin()) return;
      const data = event.data;
      if (!data || data.source !== "careerai-web") return;
      if (data.type === "CAREERAI_PING") {
        window.postMessage({ source: "careerai-extension", type: "CAREERAI_PONG" }, allowedOrigin());
        return;
      }
      if (data.type === "CAREERAI_CONNECT") {
        if (data.token && !data.code) {
          window.postMessage({
            source: "careerai-extension",
            type: "CAREERAI_CONNECTED",
            ok: false,
            error: "Refusing long-lived token. Use one-time authorization code."
          }, allowedOrigin());
          return;
        }
        if (!data.code || !data.state) {
          window.postMessage({
            source: "careerai-extension",
            type: "CAREERAI_CONNECTED",
            ok: false,
            error: "Missing authorization code"
          }, allowedOrigin());
          return;
        }
        try {
          const res = await bg({
            type: "EXCHANGE_CODE",
            code: String(data.code),
            state: String(data.state)
          });
          window.postMessage({
            source: "careerai-extension",
            type: "CAREERAI_CONNECTED",
            ok: !!res?.success,
            error: res?.error
          }, allowedOrigin());
        } catch (e) {
          window.postMessage({
            source: "careerai-extension",
            type: "CAREERAI_CONNECTED",
            ok: false,
            error: String(e)
          }, allowedOrigin());
        }
      }
    });
  }
  var running = false;
  var lastFp = "";
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
  function debounce(fn, ms) {
    let t;
    return (() => {
      if (t) clearTimeout(t);
      t = setTimeout(fn, ms);
    });
  }
  function installSpaWatch() {
    const onChange = debounce(() => void maybeRun(), 450);
    window.addEventListener("popstate", onChange);
    const wrap = (method) => {
      const orig = history[method].bind(history);
      history[method] = ((...args) => {
        orig(...args);
        onChange();
      });
    };
    wrap("pushState");
    wrap("replaceState");
    const obs = new MutationObserver(onChange);
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
  async function boot() {
    setupCareerAiBridge();
    if (isCareerAiAppShell()) return;
    await maybeRun(true);
    installSpaWatch();
  }
  if (document.readyState === "complete" || document.readyState === "interactive") {
    void boot();
  } else {
    window.addEventListener("DOMContentLoaded", () => void boot());
  }
})();
//# sourceMappingURL=content.js.map
