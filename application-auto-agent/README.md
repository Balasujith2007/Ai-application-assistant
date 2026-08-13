# CareerAI Apply Agent

A **Manifest V3** browser extension that helps you fill internship, job, hackathon, scholarship, and other application forms using your CareerAI profile.

It is a **smart assistant**, not a blind bot:

- If it **knows** a field → it fills it
- If it **does not know** → it asks you
- If the question is **sensitive / legal** → it pauses
- If there is a **CAPTCHA** → it pauses (it never solves it)
- It **never submits** the application for you
- It **only remembers** new answers when you explicitly choose Save

---

## What is a browser extension? (beginner)

A website cannot read another website’s form (Google Forms, Unstop, a company career page, etc.).

A **browser extension** can, because you installed it and granted permission.

This extension has three parts:

| Part | File | What it is |
|---|---|---|
| **Popup** | `popup.html` + `popup.js` | The small window when you click the puzzle-piece icon. Sign in, view learned fields, settings. |
| **Content script** | `content.js` | Code injected into the application webpage. It reads the form (DOM) and types values. |
| **Service worker (background)** | `background.js` | A tiny background helper. It talks to CareerAI APIs. Content scripts **cannot** call your API directly (CORS). They ask the background script instead. |

**Manifest V3** is the current Chrome/Edge/Brave/Firefox extension format. The background page is a short-lived **service worker**, not a forever-running page.

---

## How the full product fits together

```
CareerAI website (Apply Now)
        ↓  opens external URL (+ optional careerai_session_id)
External application website
        ↓  content script sees the page
Apply Agent
        ↓  background fetch
CareerAI REST API  /api/extension/*  and  /api/agent/*
        ↓
Your profile + custom learned fields in Postgres
```

The external website never knows CareerAI exists. CareerAI never needs to know how that website’s HTML is built.

---

## 1. Start CareerAI

From `Ai-application-assistant`:

```bash
npm run dev
```

Open http://localhost:3000 and log in (or register).

Push the new database tables (custom fields, mapping memory, history):

```bash
npx prisma db push
```

---

## 2. Build the extension

```bash
cd application-auto-agent
npm install
npm run build
npm test
```

This creates `application-auto-agent/dist/`. **That folder is what you load into the browser.**

Watch mode while developing:

```bash
npm run watch
```

Then click Reload on `chrome://extensions`.

---

## 3. Install in Chrome / Edge / Brave

1. Open `chrome://extensions` (Edge: `edge://extensions`, Brave: `brave://extensions`)
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the folder: `Ai-application-assistant/application-auto-agent/dist`
5. Pin the extension to the toolbar

---

## 4. Install in Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `dist/manifest.json`

Firefox MV3 uses the same files. If the background worker fails to start, edit `dist/manifest.json` and change:

```json
"background": { "scripts": ["background.js"] }
```

Temporary add-ons are removed when Firefox closes — reload after restart.

### Safari (not claimed as supported)

The code is written against a small `browser-api.ts` wrapper so Chrome/Edge/Brave/Firefox MV3 can share one build. Safari is **not packaged or tested** here. To adapt later:

- Wrap the extension with Xcode (`safari-web-extension`)
- Confirm `browser.storage.local` + `browser.runtime.sendMessage` (WebExtension API)
- Manifest `background.service_worker` vs Safari’s background page differences
- Host permissions and App Store review for `<all_urls>`

Do not claim Safari support until that packaging is done.

---

## 5. Connect your CareerAI account

**Option A — popup login**

Click the extension icon → sign in with the same email/password as the website.

**Option B — one-click from the website (preferred)**

1. Log into CareerAI
2. Open http://localhost:3000/connect-extension
3. Click **Connect extension**

The website creates a **one-time authorization code** (2 minutes, single use). The extension exchanges it in the background for a **2-hour** Apply Agent token. The page never posts your website JWT.

---

## 6. Run the built-in test application

Open: http://localhost:3000/test-apply

This is a fake multi-page internship form designed for the acceptance test:

1. Landing → Start
2. Fake CAPTCHA (agent **must pause**; you tick “I’m not a robot”)
3. Page 1: First Name, Email, College, CGPA, Expected Salary, Notice Period, Work Authorization, Resume
4. Page 2: Preferred Location, “Why this company?”, leadership essay
5. Review → **you** click Submit

**First run (empty extra fields):** agent fills name/email/college/CGPA from your profile, then asks for salary, notice period, work authorization. Choose **Save for future**.

**Second run:** “Expected Annual Compensation”-style labels map to `preferences.expectedSalary` and fill automatically. No question.

---

## 7. Real Apply Now flow

On CareerAI, open an opportunity → Application Assistant → Continue.

The site already opens the external URL. If an agent session is created, the URL includes `careerai_session_id=...`. The extension detects that query param and loads your profile for that session.

---

## Persistent learning (the core feature)

```
Unknown field “Expected Salary”
        → ask you
        → you type “6 LPA”
        → Save?  Yes → stored as customProfileFields.preferences.expectedSalary
        → also synced into careerPreferences.expectedSalary

Next form: “Expected Annual Compensation”
        → alias / memory map → preferences.expectedSalary
        → auto-fill “6 LPA”
```

- **Save** = write to database (with history)
- **Use once** = fill this application only
- **Conflict** (6 LPA vs 8 LPA) = ask Update / Use once / Cancel — never silent overwrite
- **Application-specific** (“Why Google?”) = never saved as a permanent profile field
- **Sensitive** (work authorization, gender, visa…) = you must answer; if saved, marked sensitive and ask-before-fill
- **Legal / T&C** = never auto-checked
- **AI** may suggest a *field mapping* only. It must never invent your answer.

Edit/delete/disable learned fields:

- Extension popup → Profile knowledge
- CareerAI → Settings → Apply Agent Knowledge

---

## Project structure

```
application-auto-agent/
  manifest.json              ← MV3 permissions + what scripts to load
  src/background/            ← API + auth (service worker)
  src/content/               ← DOM: detect, extract, fill, captcha, multi-page
  src/automation/            ← state machine + runner
  src/ai/                    ← classifier + deterministic mapper
  src/mappings/              ← aliases (expected salary, notice period, …)
  src/ui/assistant/          ← overlay on the application page
  src/ui/popup/              ← extension popup
  src/browser/browser-api.ts ← Chrome/Firefox wrapper
  src/__tests__/             ← vitest
```

CareerAI backend (same repo):

```
app/api/extension/auth/code          one-time connect code (website JWT)
app/api/extension/auth/exchange      code → 2h extension token
app/api/extension/profile/           GET snapshot (?categories=)
app/api/extension/profile/confirm-field  POST save / use-once / conflict
app/api/extension/profile/custom-fields  CRUD
app/api/extension/mappings           learned label → key
app/api/extension/map-fields         deterministic + optional AI mapping
app/api/extension/session/report     session counts (no field values)
app/api/extension/session/audit      sanitized audit events (no PII values)
app/api/agent/session                Apply Now session
app/api/agent/autofill-payload       session profile payload
```

---

## Configuration

Popup → Settings:

- **API base** — default `http://localhost:3000` (change when you deploy)
- **Auto-advance pages** — click Continue/Next automatically. **Submit is never automatic.**
- **Developer mode + Dry run** — detect, map, and predict fills without modifying the form
- **Per-field policy** — AUTOMATIC / ASK / NEVER for email, phone, salary, work authorization, gender. Legal fields are always NEVER.

On the application page overlay:

- **Undo autofill** restores original values for the current session only
- **Start Assistant** appears when application confidence is below 70%
- **Have you completed verification?** appears if CAPTCHA completion cannot be detected

Optional `.env` on CareerAI for AI mapping fallback only:

```
AI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini
```

Without this key, mapping is 100% deterministic (aliases + memory).

---

## Production packaging

1. Set popup API base to your production URL (`https://your-domain.com`)
2. Update `host_permissions` in `manifest.json` to include that origin (you can keep `<all_urls>` for application sites)
3. `npm run build`
4. Zip the `dist/` folder
5. Chrome Web Store / Edge Add-ons: upload the zip (review will scrutinize `<all_urls>` — explain it is required to fill third-party application forms the user navigates to)
6. Rotate JWT secret; never ship `.env` in the extension (the extension stores only the user’s token in `chrome.storage.local`)

---

## Known limitations

- Some sites use closed shadow DOM or canvas-only widgets — those fields cannot be read
- Browsers **block silent file uploads**. Resume attach is best-effort; you may still need to pick the file
- Highly custom dropdowns (div + ARIA, not `<select>`) may need a site adapter
- Firefox temporary add-ons reset on restart
- Session tokens expire (15 minutes) — reopen Apply Now if expired
- The agent will not bypass Cloudflare/recaptcha/hCaptcha. That is intentional and required

---

## Tests

```bash
npm test
```

Covers classifier (reusable / sensitive / legal / application-specific), alias mapping, memory mapping, and state-machine transitions.

Manual acceptance checklist: see **SECURITY.md** and the test app at `/test-apply`.
