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
    if (el instanceof HTMLInputElement && el.type === "file") {
      return true;
    }
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }
  function labelFor(el) {
    const type = (el.getAttribute("type") || "").toLowerCase();
    const fieldset = el.closest('fieldset, [role="group"], [role="radiogroup"]');
    const legend = fieldset?.querySelector(':scope > legend, :scope > .legend, :scope > [role="heading"]')?.textContent?.trim() || "";
    if ((type === "radio" || type === "checkbox") && legend) return legend;
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      const text = labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent?.trim()).filter(Boolean).join(" ");
      if (text) return text;
    }
    const aria = el.getAttribute("aria-label") || el.getAttribute("title") || "";
    if (aria && aria.length > 1) return aria.trim();
    if (el.id) {
      try {
        const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (lab?.textContent?.trim()) return lab.textContent.trim();
      } catch {
      }
    }
    const wrapping = el.closest("label");
    if (wrapping?.textContent?.trim()) {
      const wrapText = wrapping.textContent.trim();
      if (!(type === "radio" || type === "checkbox") || !legend) return wrapText;
    }
    const prev = el.previousElementSibling;
    if (prev && (prev.tagName === "LABEL" || prev.classList.contains("label"))) return (prev.textContent || "").trim();
    const container = el.closest(
      '.form-group, .field, .input-group, [role="listitem"], .form-field, .application-question, .postings-group, .freebirdFormviewerViewItemsItemItem, .js-field, .form-row, .question-wrapper, .field-wrapper'
    );
    if (container) {
      const heading = container.querySelector(
        'label, .label, [role="heading"], h3, h4, .title, .M7eMe, .freebirdFormviewerViewItemsItemItemTitle, [data-qa="label"]'
      );
      if (heading?.textContent?.trim()) {
        return heading.textContent.trim();
      }
    }
    const parentLabel = el.parentElement?.querySelector("label, .label");
    if (parentLabel?.textContent?.trim()) return parentLabel.textContent.trim();
    const dataLabel = el.getAttribute("data-label") || el.getAttribute("data-placeholder") || el.getAttribute("placeholder") || "";
    return legend || aria || dataLabel.trim();
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
    const contentEditables = Array.from(root.querySelectorAll('[contenteditable="true"],[contenteditable=""]')).filter((el) => {
      if (!visible(el)) return false;
      const role = el.getAttribute("role") || "";
      if (["button", "menuitem", "option", "tab", "listitem"].includes(role)) return false;
      return true;
    });
    for (const el of contentEditables) {
      out.push({
        element: el,
        id: el.id || "",
        name: el.getAttribute("name") || el.getAttribute("data-field") || "",
        type: "contenteditable",
        placeholder: el.getAttribute("placeholder") || el.getAttribute("data-placeholder") || "",
        autocomplete: "",
        label: labelFor(el),
        required: el.getAttribute("aria-required") === "true",
        isContentEditable: true
      });
    }
    return out;
  }

  // src/mappings/aliases.ts
  var FIELD_ALIASES = {
    "personal.firstName": ["first name", "given name", "forename", "candidate first name", "firstname", "fname", "first_name", "first"],
    "personal.lastName": ["last name", "surname", "family name", "candidate last name", "lastname", "lname", "last_name", "last"],
    "personal.fullName": ["full name", "candidate name", "applicant name", "student name", "participant name", "your name", "name of applicant", "legal name", "legal full name", "complete name", "name"],
    "personal.email": ["email", "email address", "e mail", "e-mail", "candidate email", "student email", "work email", "contact email", "email_address", "mail"],
    "personal.phone": ["phone", "phone number", "mobile", "mobile number", "contact number", "whatsapp", "phone no", "cell", "telephone", "phone_number", "mobile_number", "primary phone"],
    "personal.dateOfBirth": ["date of birth", "dob", "birth date", "birthday"],
    "personal.gender": ["gender", "sex"],
    "education.college": ["college", "college name", "institution", "institution name", "university", "university name", "institute", "school name", "school", "undergraduate school", "school or university"],
    "education.degree": ["degree", "qualification", "highest qualification", "program", "degree level", "highest degree", "education level"],
    "education.department": ["department", "branch", "stream", "specialization", "course", "field of study", "major", "branch of study"],
    "education.cgpa": ["cgpa", "gpa", "grade point average", "grade", "percentage", "marks", "academic score", "current cgpa", "cumulative gpa", "gpa score"],
    "education.graduationYear": ["graduation year", "year of graduation", "passing year", "expected graduation", "completion year"],
    "education.year": ["academic year", "current year", "year of study", "year"],
    "links.github": ["github", "github url", "github profile", "github link", "github profile url", "github account"],
    "links.linkedin": ["linkedin", "linkedin url", "linkedin profile", "linkedin link", "linkedin profile url", "linkedin account"],
    "links.portfolio": ["portfolio", "portfolio url", "personal website", "website", "personal site", "portfolio website", "personal portfolio", "blog url"],
    "links.codolio": ["codolio", "codolio url", "codolio profile", "codolio link"],
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
      "current compensation",
      "compensation expectation",
      "salary expectations"
    ],
    "preferences.preferredLocation": [
      "preferred location",
      "preferred city",
      "location preference",
      "job location",
      "preferred work location",
      "where would you like to work",
      "where would you like to work at",
      "desired location",
      "work location preference"
    ],
    "preferences.noticePeriod": [
      "notice period",
      "expected notice period",
      "availability notice period",
      "availability / notice period",
      "how soon can you join",
      "joining time",
      "notice duration",
      "joining notice",
      "availability",
      "earliest start date"
    ],
    "preferences.workMode": ["work mode", "work type", "preferred work mode", "preferred workplace"],
    "preferences.workAuthorization": [
      "work authorization",
      "work authorisation",
      "authorized to work",
      "eligible to work",
      "legally authorized",
      "work permit",
      "authorization to work",
      "are you legally authorized"
    ],
    "documents.resume": ["resume", "cv", "upload resume", "attach resume", "upload cv", "resume file", "cv file", "resume / cv", "upload resume / cv", "resume document"],
    "documents.coverLetter": ["cover letter", "covering letter", "upload cover letter", "cover letter file"],
    "skills.list": ["skills", "technical skills", "key skills", "skill set", "top skills"]
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
    return (input || "").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().replace(/[*?!:\-_/\\(),.\[\]]+/g, " ").replace(/\s+/g, " ").trim();
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
  var AUTO_START_THRESHOLD = 70;
  var PROMPT_THRESHOLD = 50;
  var LABEL_WEIGHTS = [
    { re: /email|e-mail/, w: 14, reason: "email field" },
    { re: /first name|last name|full name|given name|fname|lname|surname/, w: 14, reason: "name field" },
    { re: /phone|mobile|contact number|telephone/, w: 10, reason: "phone field" },
    { re: /college|university|institution|school name/, w: 12, reason: "education field" },
    { re: /resume|cv|upload resume|attach resume/, w: 14, reason: "resume upload" },
    { re: /cgpa|gpa|grade|percentage|marks/, w: 8, reason: "academic score" },
    { re: /salary|ctc|compensation|notice period|joining time/, w: 10, reason: "compensation field" },
    { re: /experience|employer|company|current role/, w: 8, reason: "experience field" },
    { re: /apply|candidate|applicant|registration|student/, w: 8, reason: "application wording" }
  ];
  function pathnameOf(href) {
    try {
      if (href && href.includes("://")) return new URL(href).pathname.replace(/\/$/, "") || "/";
      if (href?.startsWith("/")) return href.split("?")[0].replace(/\/$/, "") || "/";
    } catch {
    }
    if (typeof location !== "undefined") return location.pathname.replace(/\/$/, "") || "/";
    return "/";
  }
  function scoreFromSignals(input) {
    const reasons = [];
    let score = 0;
    const path = pathnameOf(input.href);
    const fieldCount = input.fieldCount || 0;
    if (input.isTestApp) {
      score += 25;
      reasons.push("trusted test application");
    }
    if (path === "/test-apply") {
      return {
        score: Math.min(100, score + 15),
        reasons: [...reasons, "landing \u2014 no form"],
        autoStart: false,
        kind: "LANDING"
      };
    }
    if (input.hasSessionId) {
      score += 45;
      reasons.push("CareerAI apply session");
    }
    const href = (input.href || "").toLowerCase();
    if (/careers|jobs|apply|internship|hackathon|scholarship|greenhouse|lever\.co|workday|myworkday|unstop|hiretoday|dare2compete|smartrecruiters|icims|taleo|successfactors|jobvite|breezy\.hr|recruitee|ashby|ashbyhq|rippling|bamboohr|younoodle|ats\.|recruit\.|forms\.gle|docs\.google\.com\/forms|typeform/.test(href)) {
      score += 18;
      reasons.push("career URL pattern");
    }
    if (input.captchaBlocking) {
      score += 40;
      reasons.push("human verification");
    }
    if (fieldCount >= 3) {
      score += 10;
      reasons.push(`${fieldCount} visible inputs`);
    } else if (fieldCount >= 1) {
      score += 6;
      reasons.push("form field present");
    }
    const blob = input.labelBlob || "";
    for (const { re, w, reason } of LABEL_WEIGHTS) {
      if (re.test(blob)) {
        score += w;
        reasons.push(reason);
      }
    }
    let kind = "NONE";
    if (path.includes("/review") || input.hasSubmitButton) kind = "REVIEW";
    else if (input.captchaBlocking && fieldCount < 3) kind = "CAPTCHA";
    else if (fieldCount >= 1) kind = "FORM";
    score = Math.min(100, score);
    const autoStart = Boolean(
      kind !== "NONE" && (score >= AUTO_START_THRESHOLD || input.captchaBlocking || input.isTestApp && (kind === "FORM" || kind === "REVIEW" || kind === "CAPTCHA"))
    );
    return { score, reasons, autoStart, kind: kind || "NONE" };
  }
  function scoreApplicationPage(doc = document) {
    const fields = extractFields(doc);
    const captchaEl = doc.querySelector("[data-careerai-captcha], #careerai-test-captcha, .g-recaptcha, .h-captcha, #cf-turnstile");
    let captchaBlocking = false;
    if (captchaEl) {
      const input = captchaEl instanceof HTMLInputElement ? captchaEl : captchaEl.querySelector('input[type="checkbox"]');
      if (input instanceof HTMLInputElement) captchaBlocking = !input.checked;
      else captchaBlocking = true;
    }
    const submit = Array.from(doc.querySelectorAll('button, input[type="submit"]')).some(
      (el) => /submit|send application|finish/i.test(el.textContent || el.value || "")
    );
    return scoreFromSignals({
      isTestApp: !!doc.querySelector("[data-careerai-test-app]"),
      hasSessionId: typeof location !== "undefined" && !!new URLSearchParams(location.search).get("careerai_session_id"),
      href: typeof location !== "undefined" ? location.href : "",
      fieldCount: fields.length,
      labelBlob: fields.map((f) => normalizeLabel(`${f.label} ${f.name} ${f.placeholder}`)).join(" "),
      captchaBlocking,
      hasSubmitButton: submit
    });
  }

  // src/content/registration-verifier.ts
  var SUCCESS_URL_PATTERNS = [
    /\/done\b/i,
    /\/submitted\b/i,
    /\/success\b/i,
    /\/thank-you\b/i,
    /\/thankyou\b/i,
    /\/confirmation\b/i,
    /\/registered\b/i,
    /\/app\/completed\b/i,
    /\/application-received\b/i,
    /formResponse/i,
    /[?&]status=success/i,
    /[?&]submitted=true/i,
    /[?&]submission_id=/i
  ];
  var SUCCESS_TEXT_PATTERNS = [
    /application\s+(?:has\s+been\s+)?submitted/i,
    /registration\s+(?:has\s+been\s+)?successful/i,
    /successfully\s+(?:registered|submitted|applied)/i,
    /thank\s+you\s+for\s+(?:registering|applying|your\s+submission|your\s+application)/i,
    /your\s+(?:response|application|submission)\s+has\s+been\s+recorded/i,
    /we\s+have\s+received\s+your\s+application/i,
    /application\s+received/i,
    /registration\s+confirmed/i,
    /submission\s+confirmed/i
  ];
  var ID_EXTRACT_PATTERNS = [
    /(?:application|registration|reference|candidate|submission|ticket|order)\s*(?:id|number|no|#)?[:\s-]*([A-Za-z0-9_-]{4,32})/i,
    /id[:\s-]*([A-Za-z0-9_-]{6,32})/i
  ];
  function detectRegistrationSuccess(doc = document) {
    const href = typeof location !== "undefined" ? location.href : "";
    const pathname = typeof location !== "undefined" ? location.pathname : "";
    const title = doc.title || "";
    let score = 0;
    const reasons = [];
    let extractedId = null;
    for (const pattern of SUCCESS_URL_PATTERNS) {
      if (pattern.test(href) || pattern.test(pathname)) {
        score += 45;
        reasons.push(`URL matched ${pattern.source}`);
        break;
      }
    }
    for (const pattern of SUCCESS_TEXT_PATTERNS) {
      if (pattern.test(title)) {
        score += 35;
        reasons.push(`Title matched: "${title}"`);
        break;
      }
    }
    const candidateElements = Array.from(
      doc.querySelectorAll('h1, h2, h3, h4, [role="alert"], .alert, .success, .confirmation, .submitted, [data-careerai-success]')
    );
    for (const el of candidateElements) {
      const text = (el.textContent || "").trim();
      if (!text || text.length > 300) continue;
      for (const pattern of SUCCESS_TEXT_PATTERNS) {
        if (pattern.test(text)) {
          score += 40;
          reasons.push(`Heading/Alert text: "${text.slice(0, 60)}"`);
          break;
        }
      }
    }
    const idElements = Array.from(
      doc.querySelectorAll(
        "[data-application-id], [data-registration-id], #application-id, #registration-id, .application-id, .registration-id, .reference-number"
      )
    );
    for (const el of idElements) {
      const val = el.getAttribute("data-application-id") || el.getAttribute("data-registration-id") || (el.textContent || "").trim();
      if (val && val.length >= 4 && val.length <= 40) {
        extractedId = val.replace(/^[^A-Za-z0-9]+/, "");
        score += 25;
        reasons.push(`Found ID element: ${extractedId}`);
        break;
      }
    }
    if (!extractedId) {
      const bodyText = (doc.body?.innerText || doc.body?.textContent || "").slice(0, 4e3);
      for (const pattern of ID_EXTRACT_PATTERNS) {
        const match = bodyText.match(pattern);
        if (match && match[1]) {
          extractedId = match[1].trim();
          score += 20;
          reasons.push(`Extracted ID from text: ${extractedId}`);
          break;
        }
      }
    }
    const confidence = Math.min(100, score);
    const isSuccess = confidence >= 40;
    return {
      isSuccess,
      registrationId: isSuccess ? extractedId : null,
      confidence,
      reason: reasons.join("; ") || "No success indicators detected"
    };
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
  var completedInstances = /* @__PURE__ */ new Set();
  function instanceKey(pathname, kind) {
    return `${pathname || "/"}::${kind}`;
  }
  function markCaptchaInstanceCompleted(pathname, kind = "widget") {
    completedInstances.add(instanceKey(pathname, kind));
  }
  function classifyCaptchaSignals(s) {
    const path = s.pathname || "/";
    if (s.hasTestMarker) {
      if (s.testCheckboxChecked === true || s.userMarkedComplete) {
        markCaptchaInstanceCompleted(path, "test");
        return "CAPTCHA_COMPLETED";
      }
      if (completedInstances.has(instanceKey(path, "test"))) return "CAPTCHA_COMPLETED";
      return "CAPTCHA_DETECTED";
    }
    if (s.hasWidget) {
      if (s.userMarkedComplete || s.recaptchaResponseFilled || s.recaptchaCheckboxChecked) {
        markCaptchaInstanceCompleted(path, "widget");
        return "CAPTCHA_COMPLETED";
      }
      if (completedInstances.has(instanceKey(path, "widget"))) return "CAPTCHA_COMPLETED";
      return "CAPTCHA_DETECTED";
    }
    return "CAPTCHA_NOT_PRESENT";
  }
  function isCaptchaBlocking(state) {
    return state === "CAPTCHA_DETECTED" || state === "CAPTCHA_WAITING_FOR_USER" || state === "CAPTCHA_UNKNOWN";
  }
  function testCheckbox(root) {
    const host = root.querySelector("[data-careerai-captcha], #careerai-test-captcha");
    if (!host) return null;
    if (host instanceof HTMLInputElement) return host;
    const inner = host.querySelector('input[type="checkbox"]');
    return inner instanceof HTMLInputElement ? inner : null;
  }
  function widgetPresent(root) {
    const iframes = Array.from(root.querySelectorAll("iframe"));
    if (iframes.some((f) => {
      const src = (f.src || "").toLowerCase();
      return src.includes("recaptcha") || src.includes("hcaptcha") || src.includes("challenges.cloudflare") || src.includes("turnstile");
    })) return true;
    return !!root.querySelector(".g-recaptcha, [data-hcaptcha-widget-id], .h-captcha, #cf-turnstile");
  }
  function recaptchaLooksComplete(root) {
    const ta = root.querySelector('textarea[name="g-recaptcha-response"], textarea[name="h-captcha-response"]');
    if (ta && ta.value && ta.value.trim().length > 8) return true;
    if (root.querySelector('.recaptcha-checkbox-checked, [aria-checked="true"][role="checkbox"]')) return true;
    return false;
  }
  function readCaptchaSignals(root = document, pathname) {
    const path = pathname || (typeof location !== "undefined" ? location.pathname : "/");
    const box = testCheckbox(root);
    const hasTest = !!root.querySelector("[data-careerai-captcha], #careerai-test-captcha");
    return {
      pathname: path,
      hasTestMarker: hasTest,
      testCheckboxChecked: box ? box.checked || box.getAttribute("aria-checked") === "true" : null,
      hasWidget: widgetPresent(root),
      recaptchaResponseFilled: recaptchaLooksComplete(root),
      recaptchaCheckboxChecked: recaptchaLooksComplete(root),
      userMarkedComplete: completedInstances.has(instanceKey(path, hasTest ? "test" : "widget"))
    };
  }
  function evaluateCaptcha(root = document, pathname) {
    return classifyCaptchaSignals(readCaptchaSignals(root, pathname));
  }
  function markCurrentCaptchaCompleted(pathname) {
    const path = pathname || (typeof location !== "undefined" ? location.pathname : "/");
    markCaptchaInstanceCompleted(path, "test");
    markCaptchaInstanceCompleted(path, "widget");
  }
  function waitForCaptchaClear(timeoutMs = 8 * 60 * 1e3, userConfirmed, opts) {
    return new Promise((resolve, reject) => {
      const done = () => {
        try {
          obs.disconnect();
        } catch {
        }
        clearInterval(poll);
        resolve();
      };
      const fail = (err) => {
        try {
          obs.disconnect();
        } catch {
        }
        clearInterval(poll);
        reject(err);
      };
      const tick = () => evaluateCaptcha();
      if (!isCaptchaBlocking(tick())) {
        resolve();
        return;
      }
      const started = Date.now();
      let asked = false;
      const unknownAfter = opts?.unknownAfterMs ?? 12e3;
      const obs = new MutationObserver(() => {
        if (opts?.isAborted?.()) {
          done();
          return;
        }
        if (!isCaptchaBlocking(tick())) done();
      });
      obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
      const poll = setInterval(() => {
        if (opts?.isAborted?.()) {
          done();
          return;
        }
        const state = tick();
        if (!isCaptchaBlocking(state)) {
          done();
          return;
        }
        const elapsed = Date.now() - started;
        if (!asked && elapsed > unknownAfter && userConfirmed) {
          asked = true;
          void userConfirmed().then((ok) => {
            if (ok) {
              markCurrentCaptchaCompleted();
              done();
            } else {
              asked = false;
            }
          });
        }
        if (elapsed > timeoutMs) fail(new Error("Timed out waiting for human verification."));
      }, 300);
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
  function fillContentEditable(el, value) {
    try {
      el.focus();
      el.textContent = value;
      el.dispatchEvent(new InputEvent("input", { bubbles: true, data: value }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("blur", { bubbles: true }));
      return (el.textContent || "").trim().toLowerCase().includes(value.trim().toLowerCase());
    } catch {
      return false;
    }
  }
  function readFieldValue(element) {
    if (element.isContentEditable || element.getAttribute?.("contenteditable")) {
      return element.textContent?.trim() || "";
    }
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
    if (element.isContentEditable || element.getAttribute?.("contenteditable") === "true" || element.getAttribute?.("contenteditable") === "") {
      return fillContentEditable(element, value);
    }
    if (!nativeSetValue(element, value)) return false;
    if (element instanceof HTMLInputElement && element.type === "radio" && element.name) {
      const group = document.querySelectorAll(`input[type="radio"][name="${CSS.escape(element.name)}"]`);
      const selected = Array.from(group).find((r) => r.checked);
      if (!selected) return false;
      const wrapping = selected.closest("label")?.textContent || "";
      const lab = document.querySelector(`label[for="${CSS.escape(selected.id)}"]`)?.textContent || wrapping || "";
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
          const checkIt = ["yes", "true", "checked", "agree", "y", "1"].some((w) => needle.includes(w)) || needle === "true" || needle === "yes" || needle === "1";
          setNativeChecked(element, checkIt);
        } else {
          const group = document.querySelectorAll(`input[type="radio"][name="${CSS.escape(element.name)}"]`);
          let matched = null;
          group.forEach((r) => {
            const wrapping = r.closest("label")?.textContent || "";
            const lab = document.querySelector(`label[for="${CSS.escape(r.id)}"]`)?.textContent || wrapping || r.value;
            if (lab.toLowerCase().includes(needle) || r.value.toLowerCase().includes(needle)) matched = r;
            if (yes && /^(yes|y|true|authorized)/i.test(lab.trim() || r.value)) matched = r;
            if (no && /^(no|n|false)/i.test(lab.trim() || r.value)) matched = r;
          });
          if (!matched) return false;
          setNativeChecked(matched, true);
          element = matched;
        }
      } else {
        const proto = Object.getPrototypeOf(element);
        const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
        if (setter) setter.call(element, value);
        else element.value = value;
        const tracker = element._valueTracker;
        if (tracker) tracker.setValue(value);
      }
      element.dispatchEvent(new Event("click", { bubbles: true, composed: true }));
      element.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
      element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, composed: true }));
      element.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, composed: true }));
      element.dispatchEvent(new Event("blur", { bubbles: true, composed: true }));
      return true;
    } catch {
      return false;
    }
  }
  function setNativeChecked(el, checked) {
    const proto = Object.getPrototypeOf(el);
    const setter = Object.getOwnPropertyDescriptor(proto, "checked")?.set || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked")?.set;
    if (setter) setter.call(el, checked);
    else el.checked = checked;
    const tracker = el._valueTracker;
    if (tracker) tracker.setValue(!checked);
    el.dispatchEvent(new Event("click", { bubbles: true, composed: true }));
    el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
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
  function assignFileToInput(input, file) {
    if (!input || input.type !== "file") return false;
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      try {
        input.files = dt.files;
      } catch {
        Object.defineProperty(input, "files", { value: dt.files, configurable: true });
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      const ok = !!(input.files && input.files.length > 0 && input.files[0].name === file.name);
      return ok;
    } catch {
      return false;
    }
  }
  function fileFromResumeBytes(data) {
    return new File([data.bytes], data.fileName || "resume.pdf", {
      type: data.mimeType || "application/pdf"
    });
  }
  async function tryAttachResume(input, resume, apiBase, fetchResume) {
    if (!resume?.downloadUrl) return false;
    try {
      let data = null;
      if (fetchResume) {
        data = await fetchResume(resume, apiBase);
      } else {
        const url = resume.downloadUrl.startsWith("http") ? resume.downloadUrl : `${apiBase || ""}${resume.downloadUrl}`;
        const res = await fetch(url);
        if (!res.ok) return false;
        const buf = await res.arrayBuffer();
        if (!buf.byteLength) return false;
        const cd = res.headers.get("Content-Disposition") || "";
        const nameMatch = /filename\*?=(?:UTF-8''|")?([^";]+)"?/i.exec(cd);
        const headerName = nameMatch?.[1] ? decodeURIComponent(nameMatch[1].replace(/"/g, "")) : "";
        data = {
          bytes: buf,
          fileName: resume.fileName || headerName || "resume.pdf",
          mimeType: resume.mimeType || res.headers.get("Content-Type") || "application/pdf"
        };
      }
      if (!data || !data.bytes.byteLength) return false;
      return assignFileToInput(input, fileFromResumeBytes(data));
    } catch {
      return false;
    }
  }

  // src/content/multi-page-manager.ts
  var NEXT_WORDS = ["next", "continue", "save and continue", "proceed", "go to next", "save & continue"];
  function buttonText(el) {
    return (el.innerText || el.getAttribute("value") || el.getAttribute("aria-label") || "").toLowerCase().trim();
  }
  function isProtectedSubmitText(t) {
    const n = (t || "").toLowerCase().trim();
    if (!n) return false;
    if (["submit", "apply", "send", "finish"].includes(n)) return true;
    return /submit application|apply now|send application|finish application|complete application/.test(n) || /^submit\b/.test(n) || /^apply\b/.test(n);
  }
  function findNextButton() {
    const els = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"]'));
    for (const el of els) {
      const t = buttonText(el);
      if (isProtectedSubmitText(t)) continue;
      if (NEXT_WORDS.some((w) => t === w || t.startsWith(w))) return el;
    }
    return null;
  }
  function findSubmitButton() {
    const els = Array.from(document.querySelectorAll('button, a, input[type="submit"], [role="button"]'));
    for (const el of els) {
      const t = buttonText(el);
      if (isProtectedSubmitText(t)) return el;
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
  function hasRuntimeSendMessage(api2) {
    try {
      if (!api2 || typeof api2 !== "object") return false;
      const runtime = api2.runtime;
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
  function isExtensionRuntimeAvailable(root = globalThis) {
    try {
      const api2 = pickExtensionApi(root);
      if (!api2?.runtime || typeof api2.runtime.sendMessage !== "function") return false;
      if (typeof api2.runtime.id === "string") return api2.runtime.id.length > 0;
      return true;
    } catch {
      return false;
    }
  }
  function mapRuntimeError(err) {
    const msg = String(err?.message || err || "");
    if (!msg || /sendMessage/i.test(msg) || /cannot read propert/i.test(msg) || /undefined/i.test(msg) && /runtime/i.test(msg) || /context invalidated/i.test(msg) || /receiving end does not exist/i.test(msg) || /message port closed/i.test(msg) || /EXTENSION_RUNTIME/i.test(msg)) {
      return "Could not reach the CareerAI extension. Reload the extension, refresh this page, then click Connect again.";
    }
    return msg;
  }
  function getApi() {
    const api2 = pickExtensionApi(globalThis);
    if (!api2?.runtime) {
      throw new Error("EXTENSION_RUNTIME_UNAVAILABLE");
    }
    return api2;
  }
  var ext = {
    runtime: {
      sendMessage(message) {
        const api2 = getApi();
        const runtime = api2.runtime;
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
          const api2 = getApi();
          return new Promise((resolve, reject) => {
            try {
              api2.storage.local.get(keys ?? null, (items) => resolve(items));
            } catch (e) {
              reject(e);
            }
          });
        },
        async set(items) {
          const api2 = getApi();
          return new Promise((resolve, reject) => {
            try {
              api2.storage.local.set(items, () => resolve());
            } catch (e) {
              reject(e);
            }
          });
        },
        async remove(keys) {
          const api2 = getApi();
          return new Promise((resolve, reject) => {
            try {
              api2.storage.local.remove(keys, () => resolve());
            } catch (e) {
              reject(e);
            }
          });
        }
      }
    },
    tabs: {
      async query(info) {
        const api2 = getApi();
        return new Promise((resolve, reject) => {
          try {
            api2.tabs.query(info, (tabs) => resolve(tabs));
          } catch (e) {
            reject(e);
          }
        });
      },
      async sendMessage(tabId, message) {
        const api2 = getApi();
        return new Promise((resolve, reject) => {
          try {
            const tabsApi = api2.tabs;
            if (tabsApi && typeof tabsApi.sendMessage === "function") {
              tabsApi.sendMessage(tabId, message, (response) => {
                const last = api2.runtime?.lastError;
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
  function dismissOverlayModals() {
    if (!api) return;
    api.dismissTransient();
  }
  function mountOverlay() {
    const existing = document.getElementById("careerai-apply-overlay") || document.getElementById("careerai-apply-agent-root");
    if (existing) existing.remove();
    const host = document.createElement("div");
    host.id = "careerai-apply-overlay";
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
        position: fixed; inset: 0; z-index: 2147483647; background: rgba(15,23,42,.65);
        display: flex; align-items: center; justify-content: center; padding: 16px;
        backdrop-filter: blur(4px);
      }
      .modal {
        width: min(540px, 94vw);
        max-height: min(86vh, 720px);
        background: #ffffff;
        color: #0f172a;
        border-radius: 20px;
        box-shadow: 0 25px 50px -12px rgba(0,0,0,.45), 0 0 0 1px rgba(0,0,0,.08);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .modal-header {
        padding: 18px 24px 14px;
        border-bottom: 1px solid #e2e8f0;
        background: #ffffff;
        flex-shrink: 0;
      }
      .modal-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        color: #0f172a;
      }
      .modal-header p {
        margin: 4px 0 0;
        font-size: 13px;
        color: #64748b;
        line-height: 1.4;
      }
      .modal-body {
        padding: 16px 24px;
        overflow-y: auto;
        flex: 1;
        overscroll-behavior: contain;
      }
      .modal-body::-webkit-scrollbar {
        width: 6px;
      }
      .modal-body::-webkit-scrollbar-track {
        background: #f8fafc;
        border-radius: 999px;
      }
      .modal-body::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 999px;
      }
      .modal-body::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
      .modal-footer {
        padding: 14px 24px;
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
        display: flex;
        gap: 10px;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }
      .q {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 14px 16px;
        margin-bottom: 14px;
      }
      .q:last-child {
        margin-bottom: 0;
      }
      .q label {
        font-weight: 600;
        font-size: 13px;
        color: #1e293b;
        display: block;
      }
      .q small {
        font-weight: 400;
        font-size: 12px;
        color: #64748b;
      }
      input[type=text], textarea {
        width: 100%;
        margin-top: 8px;
        border: 1.5px solid #cbd5e1;
        border-radius: 8px;
        padding: 9px 12px;
        font-size: 13.5px;
        background: #ffffff;
        color: #0f172a;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      input[type=text]:focus, textarea:focus {
        outline: none;
        border-color: #4f46e5;
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
      }
      textarea { min-height: 80px; resize: vertical; }
      .actions { display: flex; gap: 8px; justify-content: flex-end; }
      button { border: 0; border-radius: 8px; padding: 9px 15px; font-weight: 600; cursor: pointer; font-size: 13px; transition: background-color 0.15s, transform 0.05s; }
      button:active { transform: scale(0.98); }
      .primary { background: #4f46e5; color: #fff; }
      .primary:hover { background: #4338ca; }
      .ghost { background: #e2e8f0; color: #0f172a; }
      .ghost:hover { background: #cbd5e1; }
      .warn { background: #f59e0b; color: #111; }
      .check { display: flex; gap: 8px; align-items: flex-start; margin-top: 12px; font-size: 13px; }
      .banner {
        position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 2147483646;
        background: #7c2d12; color: #fff7ed; border-radius: 12px; padding: 12px 16px; max-width: 520px;
        border: 1px solid #fb923c; font-size: 13px; font-weight: 600;
      }
      .save-row { display: flex; gap: 16px; margin-top: 8px; font-size: 12px; color: #475569; }
      .save-row label { display: flex; gap: 5px; align-items: center; font-size: 12px; cursor: pointer; font-weight: 500; }
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
            <div class="modal-header">
              <h3>CareerAI Apply Agent</h3>
              <p><strong>We need a few details (${questions.length} question${questions.length === 1 ? "" : "s"})</strong></p>
              <p>These fields were not found in your profile. Fill them once to save for future applications.</p>
            </div>
            <form id="mf" style="display:flex;flex-direction:column;flex:1;overflow:hidden;margin:0">
              <div class="modal-body">
                ${questions.map((q) => {
          const lockedOnce = q.classification === "LEGAL_FIELD";
          const isAppSpecific = q.classification === "APPLICATION_SPECIFIC_FIELD";
          const isLong = isAppSpecific || (q.label + (q.hint || "")).length > 80;
          const defaultOnce = isAppSpecific || q.classification === "SENSITIVE_FIELD";
          return `
                  <div class="q">
                    <label>
                      ${escapeHtml(q.label)}${q.required ? " *" : ""}
                      ${q.hint ? `<br><small>${escapeHtml(q.hint)}</small>` : ""}
                      ${q.classification === "SENSITIVE_FIELD" ? "<br><small>Sensitive \u2014 you must answer this yourself. Saving is optional.</small>" : ""}
                      ${isAppSpecific ? "<br><small>Choose whether to reuse this answer on future applications.</small>" : ""}
                      ${isLong ? `<textarea name="${escapeHtml(q.id)}" placeholder="${escapeHtml(q.placeholder || "")}" ${q.required ? "required" : ""}>${escapeHtml(q.currentValue || "")}</textarea>` : `<input type="text" name="${escapeHtml(q.id)}" placeholder="${escapeHtml(q.placeholder || "")}" value="${escapeHtml(q.currentValue || "")}" ${q.required ? "required" : ""} />`}
                    </label>
                    ${lockedOnce ? '<p class="hint" style="margin:6px 0 0;font-size:12px;color:#64748b">Legal confirmation \u2014 not saved to your profile.</p>' : `<div class="save-row">
                          <label><input type="radio" name="save-${escapeHtml(q.id)}" value="SAVE" ${defaultOnce ? "" : "checked"} /> Use for next time</label>
                          <label><input type="radio" name="save-${escapeHtml(q.id)}" value="USE_ONCE" ${defaultOnce ? "checked" : ""} /> Use once</label>
                        </div>`}
                  </div>`;
        }).join("")}
              </div>
              <div class="modal-footer">
                <div style="display:flex;gap:8px">
                  <button type="button" class="ghost" id="save-all" style="font-size:12px;padding:7px 12px">Save all for future</button>
                  <button type="button" class="ghost" id="once-all" style="font-size:12px;padding:7px 12px">Use all once</button>
                </div>
                <button type="submit" class="primary" style="padding:8px 20px">Continue</button>
              </div>
            </form>
          </div>
        </div>`;
        extra.querySelector("#once-all")?.addEventListener("click", () => {
          extra.querySelectorAll('input[type="radio"][value="USE_ONCE"]').forEach((r) => {
            r.checked = true;
          });
        });
        extra.querySelector("#save-all")?.addEventListener("click", () => {
          extra.querySelectorAll('input[type="radio"][value="SAVE"]').forEach((r) => {
            r.checked = true;
          });
        });
        extra.querySelector("#mf")?.addEventListener("submit", (e) => {
          e.preventDefault();
          const form = e.target;
          const fd = new FormData(form);
          const answers2 = questions.map((q) => {
            const lockedOnce = q.classification === "LEGAL_FIELD";
            const defaultOnce = q.classification === "APPLICATION_SPECIFIC_FIELD" || q.classification === "SENSITIVE_FIELD";
            const saveMode = lockedOnce ? "USE_ONCE" : String(fd.get(`save-${q.id}`) || (defaultOnce ? "USE_ONCE" : "SAVE")) === "USE_ONCE" ? "USE_ONCE" : "SAVE";
            return {
              id: q.id,
              key: q.key,
              label: q.label,
              classification: q.classification,
              value: String(fd.get(q.id) || "").trim(),
              saveMode
            };
          }).filter((a) => a.value);
          extra.innerHTML = "";
          resolve({ answers: answers2, saveForFuture: answers2.some((a) => a.saveMode === "SAVE") });
        });
      });
    }
    function askConflict(label, current, incoming) {
      return new Promise((resolve) => {
        extra.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal" style="max-height:none">
            <div class="modal-header">
              <h3>Update your profile?</h3>
              <p>You already have <strong>${escapeHtml(label)}</strong>: <strong>${escapeHtml(current)}</strong></p>
              <p>You entered: <strong>${escapeHtml(incoming)}</strong></p>
            </div>
            <div class="modal-footer" style="justify-content:flex-end">
              <button class="ghost" id="c">Cancel</button>
              <button class="warn" id="o">Use once</button>
              <button class="primary" id="u">Update profile</button>
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
    function dismissTransient() {
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
            <h3>CareerAI detected an application form. Start the assistant?</h3>
            <p>Application confidence: <strong>${score}%</strong></p>
            <ul>${reasons.slice(0, 8).map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>
            <div class="actions">
              <button class="primary" id="go">Start Assistant</button>
              <button class="ghost" id="no">Not Now</button>
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
    function askResumeFile(input, opts) {
      return new Promise((resolve) => {
        const title = opts?.title || (opts?.mode === "RETRY_OR_REPLACE" ? "Could not attach your saved resume" : "Resume required");
        const detail = opts?.detail || (opts?.mode === "RETRY_OR_REPLACE" ? "Your CareerAI profile has a resume, but it could not be attached. Choose the file again to replace it, or cancel." : "Select your resume PDF once. We save it to your CareerAI profile and reuse it on future applications.");
        const allowSkip = opts?.allowSkip === true;
        extra.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal">
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(detail)}</p>
            <p id="careerai-resume-name" style="font-size:13px;opacity:.85">No file selected yet.</p>
            <div class="actions">
              <button class="primary" id="pick">Choose file</button>
              <button class="primary" id="save" disabled>Save to profile &amp; continue</button>
              ${allowSkip ? '<button class="ghost" id="skip">Skip for now</button>' : ""}
              <button class="ghost" id="cancel">Cancel</button>
            </div>
          </div>
        </div>`;
        const nameEl = extra.querySelector("#careerai-resume-name");
        const saveBtn = extra.querySelector("#save");
        let chosen = null;
        let pollTimer = null;
        const syncFromInput = () => {
          const f = input.files && input.files.length > 0 ? input.files[0] : null;
          chosen = f;
          if (nameEl) {
            nameEl.textContent = f ? `Selected: ${f.name} (${Math.max(1, Math.round(f.size / 1024))} KB)` : "No file selected yet.";
          }
          if (saveBtn) saveBtn.disabled = !f;
        };
        const onChange = () => syncFromInput();
        input.addEventListener("change", onChange);
        pollTimer = setInterval(syncFromInput, 400);
        syncFromInput();
        const cleanup = () => {
          input.removeEventListener("change", onChange);
          if (pollTimer) clearInterval(pollTimer);
          pollTimer = null;
          extra.innerHTML = "";
        };
        extra.querySelector("#pick")?.addEventListener("click", () => {
          try {
            input.click();
          } catch {
          }
        });
        extra.querySelector("#save")?.addEventListener("click", () => {
          syncFromInput();
          if (!chosen) return;
          const file = chosen;
          cleanup();
          resolve({ file, skipped: false });
        });
        extra.querySelector("#skip")?.addEventListener("click", () => {
          cleanup();
          resolve({ file: null, skipped: true });
        });
        extra.querySelector("#cancel")?.addEventListener("click", () => {
          cleanup();
          resolve({ file: null, skipped: false });
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
            <h3>CareerAI Apply Agent</h3>
            <p><strong>Application Review</strong></p>
            <p>Known fields completed: ${summary.filled}<br>
               User-provided fields: ${summary.providedByUser}<br>
               Manual fields remaining: ${summary.missingRequired}<br>
               Saved to profile: ${summary.savedToProfile}</p>
            <ul>${summary.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
            <p><strong>${summary.missingRequired ? "Resolve the remaining manual fields before submitting." : "Ready for final submission."}</strong></p>
            <p>The agent will not click Submit. Review the page, then submit yourself.</p>
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
      askResumeFile,
      setUndoHandler,
      toast,
      dismissTransient
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

  // src/automation/nav-state.ts
  var epoch = 0;
  function currentEpoch() {
    return epoch;
  }
  function bumpNavigation() {
    epoch += 1;
    return epoch;
  }
  function isStale(snapshot) {
    return snapshot !== epoch;
  }

  // src/debug.ts
  function applyLog(scope, message) {
    try {
      const host = typeof location !== "undefined" ? location.hostname : "";
      if (host !== "localhost" && host !== "127.0.0.1") return;
      console.info(`[ApplyAI][${scope}] ${message}`);
    } catch {
    }
  }

  // src/automation/session-answers.ts
  var answers = /* @__PURE__ */ new Map();
  function rememberSessionAnswer(key, value) {
    if (!key || !value) return;
    answers.set(key, value);
    const short = key.split(".").pop();
    if (short) answers.set(short, value);
  }
  function getSessionAnswer(key) {
    if (answers.get(key)) return answers.get(key);
    const short = key.split(".").pop() || "";
    return answers.get(short) || "";
  }
  function clearSessionAnswers() {
    answers.clear();
  }

  // src/automation/fill-decision.ts
  function decideFieldAction(input) {
    if (input.classification === "LEGAL_FIELD" || input.policy === "NEVER") return "SKIP";
    if (input.classification === "DOCUMENT_FIELD") return "FILE";
    if (input.classification === "SENSITIVE_FIELD") return "ASK";
    if (input.classification === "APPLICATION_SPECIFIC_FIELD") {
      return input.hasValue ? "FILL" : "ASK";
    }
    if (input.policy === "ASK") return "ASK";
    if (input.hasValue && input.confidence >= 0.8) return "FILL";
    if (!input.hasValue) return "ASK";
    return "FILL";
  }

  // src/automation/resume-flow.ts
  function decideResumeAction(input) {
    if (input.hasStoredResume) {
      if (input.attachSucceeded) return "ATTACH_STORED";
      if (input.attachAttempts < 2) return "REPORT_ATTACH_FAILURE";
      return "ASK_USER_TO_SELECT";
    }
    return "ASK_USER_TO_SELECT";
  }
  var RESUME_AUDIT = {
    NOT_FOUND: "NO_STORED_FILE",
    SELECTION_RECEIVED: "FILE_SELECTED",
    UPLOAD_STARTED: "UPLOAD_STARTED",
    UPLOAD_SUCCESS: "PROFILE_FILE_SAVED",
    UPLOAD_FAILED: "UPLOAD_FAILED",
    DB_PERSISTED: "DB_PERSISTED",
    PROFILE_RETURNED: "PROFILE_HAS_FILE",
    DOWNLOAD_STARTED: "DOWNLOAD_STARTED",
    DOWNLOAD_SUCCESS: "DOWNLOAD_OK",
    DOWNLOAD_FAILED: "DOWNLOAD_FAILED",
    ATTACH_SUCCESS: "PROFILE_FILE_ATTACHED",
    ATTACH_FAILED: "ATTACH_FAILED",
    FILE_NOT_SELECTED: "FILE_NOT_SELECTED"
  };

  // src/automation/application-runner.ts
  function asFormEl(el) {
    return el;
  }
  async function runApplicationAgent(options) {
    const epoch2 = currentEpoch();
    const machine = new AgentStateMachine();
    const ui = getOverlay();
    machine.subscribe((snap) => ui.renderState(snap));
    const detection = scoreApplicationPage();
    applyLog("Detector", `kind=${detection.kind} score=${detection.score}`);
    audit("DETECTED", { detail: `confidence ${detection.score}` });
    if (!options?.force) {
      const hasSession = !!getSessionIdFromPage();
      const isEligibleSession = hasSession && detection.score >= 40 && detection.kind !== "NONE";
      const isEligiblePrompt = detection.score >= PROMPT_THRESHOLD && detection.kind !== "NONE";
      if (detection.kind === "LANDING" || !detection.autoStart && !isEligibleSession && !isEligiblePrompt) {
        machine.transition("IDLE", { detail: "No application form detected on this page." });
        return;
      }
      if (!detection.autoStart) {
        const go = await ui.askStartAssistant(detection.score, detection.reasons);
        if (!go) {
          try {
            sessionStorage.setItem(`careerai_prompt_dismissed_${location.pathname}${location.search}`, "true");
          } catch {
          }
          machine.transition("IDLE", { detail: `Application confidence ${detection.score}% \u2014 waiting for Start Assistant.` });
          return;
        }
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
      if (isStale(epoch2)) return;
      await handleCaptcha(machine, ui, sessionId, epoch2);
      if (isStale(epoch2)) return;
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
      applyLog("Profile", profileRes?.success ? "Profile loaded" : `Profile failed (${profileRes?.error ? "error" : "no-auth"})`);
      if (!profileRes?.success) {
        if (profileRes?.authExpired) {
          machine.pause("AUTH_EXPIRED", "CareerAI connection expired.");
          audit("AUTH_EXPIRED");
          await ui.showReconnect("Unable to load CareerAI profile. Retry or reconnect your CareerAI account.");
          await flushAudit(sessionId);
          return;
        }
        if (profileRes?.network) {
          machine.pause("NETWORK_ERROR", "CareerAI connection unavailable.");
          audit("NETWORK_ERROR");
          const action = await ui.showReconnect("Unable to load CareerAI profile. Retry or reconnect.");
          if (action === "retry") {
            await flushAudit(sessionId);
            return runApplicationAgent();
          }
          await flushAudit(sessionId);
          return;
        }
        machine.pause("AUTH_EXPIRED", profileRes?.error || "Unable to load CareerAI profile.");
        await ui.showReconnect(profileRes?.error || "Unable to load CareerAI profile. Retry or reconnect.");
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
        if (isStale(epoch2)) return;
        await handleCaptcha(machine, ui, sessionId, epoch2);
        if (isStale(epoch2)) return;
        machine.transition("FIELD_MAPPING");
        const fields = getExtractedFields();
        detected = Math.max(detected, fields.length);
        const missing = [];
        const pendingFiles = [];
        const legalLabels = [];
        const hasCustomDropdown = !!document.querySelector("[data-careerai-custom-dropdown]");
        const dryRows = [];
        const seenKeys = /* @__PURE__ */ new Set();
        machine.transition(dryRun ? "FIELD_MAPPING" : "AUTOFILLING");
        for (const field of fields) {
          const label = field.label || field.placeholder || field.name || field.id;
          if (field.element.closest("[data-careerai-captcha]") || field.id === "careerai-test-captcha" || /captcha|recaptcha|hcaptcha|turnstile/i.test(`${field.name} ${field.id} ${label}`)) {
            continue;
          }
          const signalBlob = [label, field.name, field.id, field.placeholder].filter(Boolean).join(" ");
          const hit = matchField(field, memory, siteHost);
          const classification = hit?.classification || classifyField(signalBlob);
          const key = hit?.key || (isReusable(classification) || classification === "APPLICATION_SPECIFIC_FIELD" ? `custom.${customKeyFromLabel(label)}` : `application.${customKeyFromLabel(label)}`);
          const policy = resolvePolicy(key, classification, settings.fillPolicies);
          const confidence = hit?.confidence ?? (classification === "REUSABLE_PROFILE_FIELD" ? 0.85 : 0.4);
          const value = lookup(flat, key);
          const action = decideFieldAction({
            classification,
            policy,
            hasValue: !!value,
            confidence: value ? confidence : 0
          });
          audit(hit ? "MAPPED" : "DETECTED", { fieldKey: key, fieldLabel: label, detail: hit?.method || classification });
          if (field.type === "file" || classification === "DOCUMENT_FIELD") {
            if (dryRun) {
              dryRows.push({ label, key, confidence: 0.7, action: "WOULD ASK (file)" });
              continue;
            }
            const fileInput = field.element;
            const hasStored = !!profileRes.resume?.downloadUrl;
            applyLog("Resume", hasStored ? "RESUME_PROFILE_RETURNED" : "RESUME_NOT_FOUND");
            let attached = false;
            let attachAttempts = 0;
            if (hasStored && profileRes.resume) {
              const fetchResume = makeResumeFetcher();
              for (let attempt = 1; attempt <= 2 && !attached; attempt++) {
                attachAttempts = attempt;
                applyLog("Resume", `RESUME_DOWNLOAD_STARTED attempt=${attempt}`);
                attached = await tryAttachResume(
                  fileInput,
                  profileRes.resume,
                  settings.apiBase,
                  fetchResume
                );
                applyLog("Resume", attached ? "RESUME_ATTACH_SUCCESS" : "RESUME_ATTACH_FAILED");
                if (!attached && attempt < 2) await wait(350);
              }
            }
            const decision = decideResumeAction({
              hasStoredResume: hasStored,
              attachSucceeded: attached,
              attachAttempts
            });
            if (attached || decision === "ATTACH_STORED") {
              filled += 1;
              reviewItems.push(`${label} (attached from your profile)`);
              highlight(fileInput, "file");
              audit("FILLED", { fieldKey: key, fieldLabel: label, detail: RESUME_AUDIT.ATTACH_SUCCESS });
            } else {
              pendingFiles.push(fileInput);
              highlight(fileInput, "file");
              audit("MISSING", {
                fieldKey: key,
                fieldLabel: label,
                detail: hasStored ? RESUME_AUDIT.ATTACH_FAILED : RESUME_AUDIT.NOT_FOUND
              });
              if (hasStored && !attached) {
                ui.toast("Could not attach your saved resume. You may need to select it again.");
              }
            }
            continue;
          }
          if (action === "SKIP" || classification === "LEGAL_FIELD" || policy === "NEVER") {
            highlight(field.element, "skip");
            if (classification === "LEGAL_FIELD") {
              legalLabels.push(label);
              reviewItems.push(`${label} \u2014 Manual action required`);
            }
            audit("SKIPPED", { fieldKey: key, fieldLabel: label, detail: "legal or NEVER policy" });
            dryRows.push({ label, key, confidence, action: "WOULD SKIP" });
            continue;
          }
          if (dryRun) {
            dryRows.push({
              label,
              key,
              confidence,
              action: action === "FILL" ? "WOULD FILL" : "WOULD ASK"
            });
            continue;
          }
          if (action === "FILL" && value) {
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
              pushMissing(missing, seenKeys, {
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
          pushMissing(missing, seenKeys, {
            id: `${key}-${fields.indexOf(field)}`,
            label,
            key,
            classification,
            required: field.required || classification === "SENSITIVE_FIELD",
            placeholder: classification === "APPLICATION_SPECIFIC_FIELD" ? "Write your answer \u2014 choose Use for next time if you want to reuse it" : classification === "SENSITIVE_FIELD" ? key.includes("workAuthorization") || /authorization|visa|citizen/i.test(label) ? "Please select your work authorization (Yes or No)" : "Please answer this yourself. We will not guess." : "Enter value",
            currentValue: value || "",
            hint: classification === "SENSITIVE_FIELD" && value ? "Saved value is on file \u2014 confirm or replace. We will not guess." : void 0
          });
          highlight(field.element, "ask");
          audit("MISSING", { fieldKey: key, fieldLabel: label });
        }
        applyLog("Mapper", `${fields.length} fields inspected`);
        applyLog("Autofill", `${filled} filled, ${missing.length} missing`);
        if (dryRun) {
          audit("DRY_RUN", { detail: `${dryRows.length} predictions` });
          await ui.showDryRun(dryRows);
          await flushAudit(sessionId);
          machine.transition("IDLE", { detail: "Dry run complete \u2014 no fields were modified." });
          return;
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
            let saveMode = ans.saveMode;
            if (ans.classification === "LEGAL_FIELD") {
              saveMode = "USE_ONCE";
            }
            const persistKey = ans.key.startsWith("application.") ? `custom.${ans.key.slice("application.".length)}` : ans.key;
            rememberSessionAnswer(ans.key, ans.value);
            rememberSessionAnswer(persistKey, ans.value);
            flat[ans.key] = ans.value;
            flat[persistKey] = ans.value;
            const short = ans.key.split(".").pop();
            if (short) flat[short] = ans.value;
            if (saveMode === "SAVE" && ans.classification === "LEGAL_FIELD") {
              audit("USER_PROVIDED", { fieldKey: ans.key, fieldLabel: ans.label, detail: "legal-never-saved" });
              continue;
            }
            const confirm = await bg({
              type: "CONFIRM_FIELD",
              payload: {
                key: persistKey.startsWith("application.") ? void 0 : persistKey,
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
            if (confirm?.network || !confirm?.ok && !confirm?.conflict && saveMode === "SAVE") {
              ui.toast("Could not save this information. It will be used once.");
              audit("USER_PROVIDED", { fieldKey: ans.key, fieldLabel: ans.label, detail: "USE_ONCE_FALLBACK" });
              continue;
            }
            if (confirm?.conflict && confirm.current && confirm.incoming) {
              audit("USER_PROVIDED", { fieldKey: ans.key, fieldLabel: ans.label, detail: "FIELD_CONFLICT" });
              const choice = await ui.askConflict(ans.label, confirm.current, confirm.incoming);
              if (choice === "UPDATE") {
                const saved = await bg({
                  type: "CONFIRM_FIELD",
                  payload: {
                    key: persistKey,
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
                if (saved?.saved) {
                  savedToProfile += 1;
                  ui.toast("Saved for next time.");
                } else ui.toast("Could not save this information. It will be used once.");
              } else if (choice === "CANCEL") {
                if (target) await fillWithRetry(target.element, confirm.current);
                rememberSessionAnswer(ans.key, confirm.current);
                rememberSessionAnswer(persistKey, confirm.current);
                flat[ans.key] = confirm.current;
                flat[persistKey] = confirm.current;
              }
            } else if (confirm?.saved) {
              savedToProfile += 1;
              if (ans.classification === "APPLICATION_SPECIFIC_FIELD") {
                ui.toast("Saved for next applications.");
              }
            }
            audit("USER_PROVIDED", { fieldKey: persistKey, fieldLabel: ans.label, detail: saveMode });
          }
          machine.resume();
        }
        if (pendingFiles.length) {
          const hadStoredButFailed = !!profileRes.resume?.downloadUrl;
          machine.pause(
            "FILE_SELECTION",
            hadStoredButFailed ? "Saved resume could not be attached \u2014 please select your resume file." : "Please select your CareerAI resume for this account (saved once for future applications)."
          );
          for (const input of pendingFiles) {
            highlight(input, "file");
            const pick = await ui.askResumeFile(input, {
              mode: hadStoredButFailed ? "RETRY_OR_REPLACE" : "SELECT_NEW",
              allowSkip: false,
              detail: hadStoredButFailed ? "Your profile already has a resume, but attachment failed. Choose the file again so we can replace/re-save it for this account." : "Select your resume PDF once. We will save it to your CareerAI profile and reuse it automatically next time."
            });
            const selected = pick.file;
            if (!selected) {
              reviewItems.push("Resume \u2014 please select your file");
              failed += 1;
              audit("MISSING", { fieldLabel: "Resume", detail: RESUME_AUDIT.FILE_NOT_SELECTED });
              applyLog("Resume", "RESUME_NOT_FOUND (user cancelled picker)");
              continue;
            }
            applyLog("Resume", "RESUME_SELECTION_RECEIVED");
            audit("USER_PROVIDED", { fieldLabel: "Resume", detail: RESUME_AUDIT.SELECTION_RECEIVED });
            filled += 1;
            applyLog("Resume", "RESUME_UPLOAD_STARTED");
            audit("USER_PROVIDED", { fieldLabel: "Resume", detail: RESUME_AUDIT.UPLOAD_STARTED });
            const saved = await persistSelectedResumeToProfile(selected);
            applyLog(
              "Resume",
              saved?.ok ? "RESUME_UPLOAD_SUCCESS" : `RESUME_UPLOAD_FAILED (${saved?.error || "unknown"})`
            );
            if (saved?.ok && saved.resume?.downloadUrl) {
              profileRes.resume = {
                fileName: saved.resume.fileName,
                downloadUrl: saved.resume.downloadUrl,
                mimeType: saved.resume.mimeType
              };
              const verified = await verifyProfileHasResume();
              if (verified) {
                applyLog("Resume", "RESUME_DB_PERSISTED");
                audit("USER_PROVIDED", { fieldLabel: "Resume", detail: RESUME_AUDIT.UPLOAD_SUCCESS });
                reviewItems.push(`Resume saved to your profile (${saved.resume.fileName})`);
                ui.toast("Resume saved to your CareerAI profile for future applications.");
              } else {
                applyLog("Resume", "RESUME_UPLOAD_SUCCESS but profile verify missed resume");
                reviewItems.push(`Resume uploaded (${saved.resume.fileName}) \u2014 profile verify pending`);
                ui.toast("Resume uploaded. If the next application asks again, reconnect and retry.");
                audit("USER_PROVIDED", { fieldLabel: "Resume", detail: RESUME_AUDIT.UPLOAD_SUCCESS });
              }
            } else {
              reviewItems.push(`Resume (selected for this form: ${selected.name})`);
              ui.toast(saved?.error ? `Could not save to profile (${saved.error}). File is attached to this form only.` : "Could not save resume to profile. It was still attached to this form.");
              audit("USER_PROVIDED", { fieldLabel: "Resume", detail: RESUME_AUDIT.UPLOAD_FAILED });
            }
            try {
              sessionStorage.setItem("careerai_test_resume", selected.name);
            } catch {
            }
          }
          machine.resume();
          audit("USER_PROVIDED", { detail: "FILE_FLOW_DONE" });
        }
        if (hasCustomDropdown || legalLabels.length) {
          const parts = [
            legalLabels.length ? "Legal checkbox: Manual action required. The agent will not check it." : "",
            hasCustomDropdown ? "Please complete the custom dropdown yourself." : ""
          ].filter(Boolean);
          machine.pause(hasCustomDropdown ? "UNSUPPORTED_WIDGET" : "LEGAL_CONFIRMATION", parts.join(" "));
          if (hasCustomDropdown) audit("SKIPPED", { detail: "unsupported custom dropdown" });
          await ui.waitForHuman("Manual action required", parts.join(" "));
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
          const validationErrors = detectValidationErrors();
          if (validationErrors.length) {
            audit("ERROR", { detail: `validation: ${validationErrors.map((e) => e.label || e.fieldId).join(", ")}` });
            ui.toast(`Validation failed: ${validationErrors.map((e) => e.error).join(" | ")}`);
            machine.transition("IDLE", { detail: "Validation errors found \u2014 please review and correct." });
            return;
          }
          await fillCurrentPage();
          return;
        }
        if (submitBtn) {
          highlight(submitBtn, "skip");
          machine.transition("FINAL_REVIEW");
          audit("REVIEW_READY", { detail: `${filled} filled` });
          const manualRemaining = failed + (legalLabels.length ? 1 : 0) + (pendingFiles.some((f) => !f.files?.length) ? 0 : 0);
          await ui.showReview({
            filled,
            detected,
            providedByUser,
            savedToProfile,
            missingRequired: manualRemaining || failed,
            items: Array.from(new Set(reviewItems)).slice(0, 30)
          });
          machine.transition("USER_CONFIRMATION", { detail: "Submit the form yourself when you are ready." });
          clearSessionAnswers();
          if (sessionId) {
            await bg({
              type: "REPORT_SESSION",
              payload: { sessionToken: sessionId, status: "REVIEW", fieldsDetected: detected, fieldsFilled: filled, newFieldsSaved: savedToProfile }
            });
          }
          await flushAudit(sessionId);
        } else if (!settings.autoAdvancePages && findNextButton()) {
          machine.transition("IDLE", { detail: "Page filled. Click Continue on the site when ready." });
          ui.toast("Filled this page. Click Continue on the site when you are ready.");
          const stopWatcher = watchDynamicFields((newEls) => {
            const count = newEls.filter((el) => {
              const type = (el.getAttribute("type") || el.tagName).toLowerCase();
              return !["submit", "button", "image", "reset", "hidden"].includes(type);
            }).length;
            if (count > 0) {
              stopWatcher();
              ui.toast(`${count} new field(s) appeared. Re-analyzing\u2026`);
              void fillCurrentPage();
            }
          });
          window.addEventListener("popstate", stopWatcher, { once: true });
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
  async function handleCaptcha(machine, ui, sessionId, epoch2) {
    const state = evaluateCaptcha();
    applyLog("CAPTCHA", state);
    if (state === "CAPTCHA_NOT_PRESENT" || state === "CAPTCHA_COMPLETED") return;
    machine.pause("CAPTCHA", "Human verification required. Complete the CAPTCHA.");
    ui.showCaptcha();
    audit("CAPTCHA_PAUSED");
    applyLog("CAPTCHA", "Waiting for user");
    await waitForCaptchaClear(8 * 60 * 1e3, () => ui.confirmCaptchaDone(), {
      isAborted: () => isStale(epoch2)
    });
    if (isStale(epoch2)) return;
    markCurrentCaptchaCompleted();
    ui.hideCaptcha();
    machine.resume("Verification complete");
    audit("RESUMED", { detail: "captcha" });
    applyLog("CAPTCHA", "Verification completed");
    await flushAudit(sessionId);
  }
  async function fillWithRetry(element, value) {
    captureOriginal(asFormEl(element));
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
      if (/salary|ctc|compensation|notice|authorization|location|preference/.test(blob)) cats.add("preferences");
      if (/resume|cv|upload|transcript|file/.test(blob)) cats.add("documents");
      if (/github|linkedin|portfolio/.test(blob)) cats.add("links");
    }
    if (cats.size === 1) return "personal,education,preferences,documents,custom";
    return [...cats].join(",");
  }
  function pushMissing(missing, seenKeys, q) {
    if (seenKeys.has(q.key)) return;
    seenKeys.add(q.key);
    missing.push(q);
  }
  function lookup(flat, key) {
    const sessionHit = getSessionAnswer(key);
    if (sessionHit) return sessionHit;
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
  function makeResumeFetcher() {
    return async (resumeMeta) => {
      if (!resumeMeta.downloadUrl) return null;
      applyLog("Resume", "RESUME_DOWNLOAD_STARTED");
      const res = await bg({
        type: "DOWNLOAD_RESUME",
        downloadUrl: resumeMeta.downloadUrl
      });
      if (!res?.ok || !res.base64) {
        applyLog(
          "Resume",
          `RESUME_DOWNLOAD_FAILED (${res?.missing ? "missing" : res?.error || "error"})`
        );
        return null;
      }
      applyLog("Resume", `RESUME_DOWNLOAD_SUCCESS bytes=${res.byteLength || 0}`);
      const binary = atob(res.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return {
        bytes: bytes.buffer,
        fileName: res.fileName || resumeMeta.fileName || "document.pdf",
        mimeType: res.mimeType || resumeMeta.mimeType || "application/pdf"
      };
    };
  }
  async function verifyProfileHasResume() {
    try {
      const res = await bg({ type: "GET_PROFILE" });
      const has = !!(res?.success && res.resume?.downloadUrl);
      applyLog("Resume", has ? "RESUME_PROFILE_RETURNED" : "RESUME_NOT_FOUND after upload");
      return has;
    } catch {
      return false;
    }
  }
  async function persistSelectedResumeToProfile(file) {
    try {
      const buf = await file.arrayBuffer();
      if (!buf.byteLength) return { ok: false, error: "empty file" };
      const bytes = new Uint8Array(buf);
      let binary = "";
      const chunk = 32768;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      return await bg({
        type: "UPLOAD_RESUME",
        fileName: file.name || "document.pdf",
        mimeType: file.type || "application/pdf",
        base64: btoa(binary)
      });
    } catch (err) {
      return { ok: false, error: err?.message || "upload failed" };
    }
  }
  function detectValidationErrors() {
    const errors = [];
    const errorEls = Array.from(document.querySelectorAll(
      '[aria-invalid="true"], .error, .field-error, [class*="error"], [role="alert"], .invalid-feedback, [data-error]'
    ));
    for (const el of errorEls) {
      const text = el.textContent?.trim();
      if (!text) continue;
      const fieldId = el.getAttribute("data-field-id") || el.closest("[id]")?.id || "";
      const label = el.closest("[data-label]")?.getAttribute("data-label") || document.querySelector(`label[for="${fieldId}"]`)?.textContent?.trim() || "";
      errors.push({ fieldId, label, error: text });
    }
    return errors;
  }
  function watchDynamicFields(onNewFields) {
    const seen = /* @__PURE__ */ new WeakSet();
    let timer = null;
    const pending = [];
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of Array.from(m.addedNodes)) {
          if (!(node instanceof HTMLElement)) continue;
          const inputs = node.matches("input, select, textarea, [contenteditable]") ? [node] : Array.from(node.querySelectorAll("input, select, textarea, [contenteditable]"));
          for (const inp of inputs) {
            if (!seen.has(inp)) {
              seen.add(inp);
              pending.push(inp);
            }
          }
        }
      }
      if (pending.length > 0) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          const batch = pending.splice(0);
          if (batch.length) onNewFields(batch);
          timer = null;
        }, 400);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
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
  function reply(type, extra = {}) {
    window.postMessage({ source: "careerai-extension", type, ...extra }, allowedOrigin());
  }
  function setupCareerAiBridge() {
    window.addEventListener("message", async (event) => {
      if (event.source !== window) return;
      if (event.origin !== allowedOrigin()) return;
      const data = event.data;
      if (!data || data.source !== "careerai-web") return;
      if (data.type === "CAREERAI_PING") {
        if (!isExtensionRuntimeAvailable()) {
          reply("CAREERAI_UNAVAILABLE", {
            error: "The CareerAI extension was reloaded. Refresh this page, then click Connect again."
          });
          return;
        }
        reply("CAREERAI_PONG");
        return;
      }
      if (data.type === "CAREERAI_CHECK_VERIFICATION") {
        if (!isExtensionRuntimeAvailable()) {
          reply("CAREERAI_VERIFICATION_RESULT", {
            ok: false,
            verified: false,
            error: "Extension runtime unavailable."
          });
          return;
        }
        try {
          const res = await bg({
            type: "CHECK_REGISTRATION_VERIFIED",
            opportunityId: data.opportunityId,
            sessionId: data.sessionId
          });
          reply("CAREERAI_VERIFICATION_RESULT", {
            ok: !!res?.success,
            verified: !!res?.verified,
            registrationId: res?.data?.registrationId || null,
            data: res?.data
          });
        } catch (e) {
          reply("CAREERAI_VERIFICATION_RESULT", {
            ok: false,
            verified: false,
            error: mapRuntimeError(e)
          });
        }
        return;
      }
      if (data.type === "CAREERAI_CONNECT") {
        if (data.token && !data.code) {
          reply("CAREERAI_CONNECTED", {
            ok: false,
            error: "Refusing long-lived token. Use one-time authorization code."
          });
          return;
        }
        if (!data.code || !data.state) {
          reply("CAREERAI_CONNECTED", { ok: false, error: "Missing authorization code" });
          return;
        }
        if (!isExtensionRuntimeAvailable()) {
          reply("CAREERAI_CONNECTED", {
            ok: false,
            error: "The CareerAI extension was reloaded. Refresh this page, then click Connect again."
          });
          return;
        }
        try {
          const res = await bg({
            type: "EXCHANGE_CODE",
            code: String(data.code),
            state: String(data.state)
          });
          reply("CAREERAI_CONNECTED", {
            ok: !!res?.success,
            error: res?.error ? mapRuntimeError(res.error) : void 0
          });
        } catch (e) {
          reply("CAREERAI_CONNECTED", {
            ok: false,
            error: mapRuntimeError(e)
          });
        }
      }
    });
  }
  var activeRoute = "";
  var finishedRoute = "";
  var runnerBusy = false;
  function routeKey() {
    return `${location.pathname}${location.search}`;
  }
  function shouldStart(detection, sessionId) {
    if (detection.kind === "LANDING") return false;
    if (detection.autoStart) return true;
    if (sessionId && detection.score >= 40 && detection.kind !== "NONE") return true;
    if (detection.score >= PROMPT_THRESHOLD && detection.kind !== "NONE") return true;
    return false;
  }
  async function checkAndReportVerification() {
    try {
      const successResult = detectRegistrationSuccess();
      if (successResult.isSuccess) {
        const sessionId = getSessionIdFromPage();
        const oppIdMatch = location.search.match(/opportunity_?id=([A-Za-z0-9_-]+)/i);
        const opportunityId = oppIdMatch ? oppIdMatch[1] : null;
        applyLog("Verifier", `Success detected! ID: ${successResult.registrationId}, confidence=${successResult.confidence}`);
        await bg({
          type: "REPORT_REGISTRATION_VERIFIED",
          payload: {
            sessionId,
            opportunityId,
            registrationId: successResult.registrationId,
            url: location.href,
            reason: successResult.reason
          }
        });
      }
    } catch (e) {
      applyLog("Verifier", `Verification check error: ${e}`);
    }
  }
  async function maybeRun(force = false) {
    if (isCareerAiAppShell()) return;
    void checkAndReportVerification();
    const detection = scoreApplicationPage();
    const sessionId = getSessionIdFromPage();
    const route = routeKey();
    applyLog("Detector", `${detection.kind} score=${detection.score} autoStart=${detection.autoStart} route=${route}`);
    if (detection.kind === "LANDING") {
      clearSessionAnswers();
    }
    const isDismissed = sessionStorage.getItem(`careerai_prompt_dismissed_${route}`);
    if (!force) {
      if (isDismissed) {
        applyLog("Runner", "Prompt was previously dismissed on this page");
        return;
      }
      if (!shouldStart(detection, sessionId)) {
        applyLog("Runner", "No automation start on this page");
        return;
      }
    }
    if (runnerBusy && activeRoute === route) {
      applyLog("Runner", "Already analyzing this page");
      return;
    }
    if (!force && !runnerBusy && finishedRoute === route) {
      return;
    }
    if (runnerBusy && activeRoute !== route) {
      bumpNavigation();
      dismissOverlayModals();
      applyLog("Navigation", `Leaving ${activeRoute} \u2192 ${route}`);
    }
    activeRoute = route;
    runnerBusy = true;
    try {
      applyLog("Runner", `Starting automation (${detection.kind})`);
      await runApplicationAgent({ force });
      if (routeKey() === route) finishedRoute = route;
    } finally {
      if (activeRoute === route) runnerBusy = false;
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
    const onChange = debounce(() => {
      const next = routeKey();
      if (next !== activeRoute) {
        bumpNavigation();
        dismissOverlayModals();
        applyLog("Navigation", `Page changed ${next}`);
      }
      void maybeRun();
    }, 350);
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
    if (window.__careeraiApplyAgentBooted) return;
    window.__careeraiApplyAgentBooted = true;
    setupCareerAiBridge();
    if (isCareerAiAppShell()) {
      applyLog("Runner", "CareerAI app shell \u2014 bridge only");
      return;
    }
    ext.runtime.onMessage.addListener((message) => {
      if (message && message.type === "START_ASSISTANT_MANUAL") {
        applyLog("Runner", "Manual start requested");
        void maybeRun(true);
      }
    });
    installSpaWatch();
    await maybeRun();
  }
  if (document.readyState === "complete" || document.readyState === "interactive") {
    void boot();
  } else {
    window.addEventListener("DOMContentLoaded", () => void boot());
  }
})();
//# sourceMappingURL=content.js.map
