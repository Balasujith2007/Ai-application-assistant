# Security

## Threat model

The Apply Agent runs **inside the user’s browser**, on pages the user chose to visit after clicking Apply on CareerAI. It is not a remote scraper and not a CAPTCHA solver.

## Hard rules (implemented)

| Rule | Implementation |
|---|---|
| Never bypass CAPTCHA | `captcha-detector.ts` pauses automation until the user completes verification |
| Never auto-submit | Submit buttons are highlighted only; `multi-page-manager.ts` never treats Submit as Next |
| Never invent answers | Missing / unknown / essay fields open the overlay. No LLM value generation |
| AI cannot invent user data | `/api/extension/map-fields` may suggest a **key** only |
| Learn only with consent | Save vs Use once. Default checkbox is visible; user can uncheck |
| No silent profile overwrite | Conflict modal: Update / Use once / Cancel |
| Sensitive fields | Classified `SENSITIVE_FIELD` → ask before fill / ask before save |
| Legal checkboxes | `LEGAL_FIELD` → never auto-tick |
| Session auth | Short-lived **extension JWT** (2h, `aud=careerai-extension`) after one-time code exchange; `careerai_session_id` is verified server-side |
| Origin-safe messaging | `postMessage` only to `window.location.origin`; code+state only — never a website JWT |
| Least data on the wire | Category-filtered profile; audit log stores status/label/key/domain — **never field values** |
| Logout | Clears extension token + cached session |

## Authentication flow

```
Logged-in CareerAI website
  → POST /api/extension/auth/code  (website JWT, 2 min one-time code+state, hashed at rest)
  → postMessage { code, state } to exact origin
  → extension background POST /api/extension/auth/exchange
  → 2h extension access token in chrome.storage.local
```

Popup login uses the same mint+exchange path and **discards** the website JWT immediately.

## Permissions (why they exist)

- `storage` — short-lived extension token + settings on the device
- `host_permissions: <all_urls>` — application websites are arbitrary third-party domains. Content scripts only activate Apply logic when application confidence is high (or the user clicks Start Assistant). The extension does not record browsing history.
- CareerAI API origins (`localhost` / production URL) — background `fetch` for profile, mappings, audit

`activeTab`, `scripting`, and `tabs` are **not** requested. They were unused.

## What we do not do

- No remote code execution from random websites
- No password fields, OTP, payment, CVV
- No selling profile data
- No solving anti-bot challenges

## Reporting

If you find a vulnerability in the agent, treat it like any CareerAI backend issue: rotate JWT_SECRET, invalidate sessions, and patch the extension build.
