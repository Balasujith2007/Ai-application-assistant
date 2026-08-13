# Privacy

## Data the extension stores locally

| Item | Class | Lifetime |
|---|---|---|
| Extension access token + `{ id, name, email }` | Sensitive | Until logout or 2h expiry |
| Settings (API base, auto-advance, dry-run, fill policies) | Non-sensitive | Persistent until changed |
| In-memory undo originals | Sensitive | Current application session only — never written to disk |
| Audit buffer | Non-sensitive statuses | Flushed to CareerAI, no values |

Clear credentials anytime: popup → Sign out, or remove the extension.

## Data sent to CareerAI

Only after you connect the account or start Apply Now:

- Profile read (`GET /api/extension/profile` or session payload)
- Optional: new field values you typed, if you chose **Save**
- Optional: label → field mappings you confirmed
- Optional: session progress report (counts + field labels, **not values**)
- Optional: sanitized audit events (status, mapping key, domain — values redacted)

## Data never sent

- Raw HTML of third-party sites
- Passwords from application pages
- CAPTCHA tokens
- Answers you marked **Use once** are not written to the permanent profile (they may be stored briefly as an application draft tied to the session)

## Your rights

In CareerAI: **Settings → Apply Agent Knowledge** (and **Data & Account**) you can disable or delete learned fields.

## Third parties

If `AI_API_KEY` is configured on the **server**, only **field labels** (not your answers) may be sent to the model provider to suggest a mapping key. Your salary, phone, essays, etc. are not sent for invention.
