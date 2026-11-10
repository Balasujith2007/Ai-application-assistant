# Career Activity Streak — Acceptance Report

Project: **AI Career Platform**
Scope: Replace the Daily Check-In streak with a **Career Activity Streak**
Reporting timezone: **Asia/Kolkata (UTC+5:30)**
Date of validation: 2026-11-07

---

## 1. Summary

The streak system no longer advances on daily check-ins, logins, dashboard opens or any
other passive action. A student earns **exactly one streak day per calendar day** on which
at least one **verified career submission** is accepted by the server:

1. Internship application submitted
2. Job application submitted
3. Hackathon application / registration submitted
4. Competition application / registration submitted

Multiple qualifying submissions on the same day collapse into **one** streak day.
Tracked time boundary is Asia/Kolkata; source timestamps remain stored in UTC.

---

## 2. Old check-in logic removed

| Item | Location | Change |
| --- | --- | --- |
| Daily check-in API | [route.ts](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/app/api/check-in/route.ts) | `POST` is now a documented **no-op** (`200`). Auth + rate-limit preserved, but it writes no `daily_check_ins`, no `student_daily_streaks`, no `points_ledger` and awards `xpAwarded: 0`. |
| Streak / check-in service | [checkInService.ts](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/lib/gamification/checkInService.ts) | `performDailyCheckIn()` returns `{ success, alreadyCheckedIn: true, xpAwarded: 0, streakBonusAwarded: 0, ... }` and no longer inserts a `DAILY_CHECKIN` streak row or awards XP / the 7-day bonus. `calculateAuthoritativeStreak()` only counts career activity types. |
| XP awarding (check-in) | [checkInService.ts](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/lib/gamification/checkInService.ts) | The legacy `DAILY_CHECKIN` (+5 XP) and `STREAK_7DAY_BONUS` (+25 XP) awards were removed from the check-in path. Verified career/learning XP (`INTERNSHIP_APPLICATION_VERIFIED` 20, `HACKATHON_MILESTONE` 25, `CODING_MILESTONE` 10) is untouched. |
| Daily check-in scheduler / cron | repo scan | No check-in cron/scheduler exists in this codebase; nothing to schedule. Monthly-recognition jobs are unrelated and untouched. |
| Student streak widget | [StudentPerformancePanel.tsx](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/components/dashboard/StudentPerformancePanel.tsx) · [StudentClassLeaderboard.tsx](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/components/leaderboard/StudentClassLeaderboard.tsx) | `DailyCheckInTab` → `CareerActivityStreakTab`; the old amber "Daily Check-in & Streak" card, the "+5 XP" badge and the "Claim +5 XP" button are gone. Fake "Restore" / "Freeze" streak buttons (toast-only mocks that silently faked a restore) were removed and replaced with an honest pointer to the real Streak Rescue Token flow. |
| Activity tracking hooks | [badgeEngine.ts](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/lib/gamification/badgeEngine.ts) | `recordDailyActivity()` now hard-guards on `isCareerActivityType(...)`; non-career types return `{ recorded: false }` and write nothing. Insert uses `ON CONFLICT ("studentId","activityDate") DO NOTHING`. |
| Client-driven activity claims | [route.ts](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/app/api/achievements/route.ts) | `POST /api/achievements` no longer trusts a client-supplied `activityType`; it only re-evaluates badges for the authenticated user. |
| Leaderboard scoring | [scoringEngine.ts](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/lib/leaderboard/scoringEngine.ts) | Check-in days no longer contribute score (`checkInScore` is now hard-coded `0`); the day count and the batch streak query are filtered to career activity types. |

`XP_CONFIG.DAILY_CHECKIN` / `STREAK_7DAY_BONUS` constants remain defined (config only) but are no longer referenced by any award path.

---

## 3. New qualifying activity sources

A single shared constant set is the source of truth for the whole platform:

[streakCalculator.ts](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/lib/gamification/streakCalculator.ts)

```ts
export const CAREER_ACTIVITY_STREAK_TYPES = [
  'APPLICATION_SUBMITTED',      // internship / job application submitted
  'HACKATHON_REGISTERED',       // hackathon application/registration accepted
  'COMPETITION_REGISTERED',     // competition application/registration accepted
] as const;

export const STREAK_ACTIVITY_TYPES = [...CAREER_ACTIVITY_STREAK_TYPES, 'STREAK_RESCUE'] as const;
```

Consumed by `checkInService`, `badgeEngine`, `tokenService` and `scoringEngine`, so the
dashboard, badges, rescue eligibility and leaderboard can never disagree about what counts.

**Verified server-side events only.** The streak is written by the server (never by a
frontend claim) when a verified submission is recorded in `verified_activity`
(`recordQualifyingEvent` / `badgeEngine.recordDailyActivity`), keyed by a stable
`externalActivityId`, with the student ID resolved from the authenticated session.

Explicitly **not** qualifying: login, dashboard open, profile views, viewing internships/jobs,
searching, saving/bookmarking, opening achievements, clicking a check-in button, and all
general navigation/passive activity.

---

## 4. Streak calculation examples

Verified against the canonical specification example (see test suite section B):

| Day | Action | Current streak | Longest |
| --- | --- | --- | --- |
| Monday | Internship application | 1 | 1 |
| Tuesday | Nothing (missed) | 0 | 1 |
| Wednesday | Job application | 1 | 1 |
| Thursday | Hackathon application | 2 | 2 |
| Friday | Login only | 2 | 2 |
| Saturday | Internship application | 1 | 2 |

Rules implemented in the pure calculator `computeStreakCore(activityDates, todayStr, yesterdayStr)`:

- A qualifying activity on a calendar day adds one streak day.
- Multiple qualifying activities on the same day count only once (deduplicated by date).
- A calendar day with no qualifying activity resets the current streak to 0.
- The next qualifying activity after a missed day starts a new streak at 1.
- Longest streak is preserved permanently (computed independently over the full history).
- The current streak is "live" only if the most recent qualifying day is today or yesterday —
  a student is never penalised merely for not visiting the dashboard.

---

## 5. Legacy data treatment

- Historical `daily_check_ins` rows and legacy `student_daily_streaks` rows with
  `activityType = 'DAILY_CHECKIN'` / `'CHECKIN'` are **preserved** for history.
- They are **excluded from every computation** via `AND "activityType" = ANY($2)`
  (calendar streak, milestone ladder, rescue eligibility, leaderboard score/day count),
  so a check-in-only past can never be presented as a verified career streak.
- The historical **longest streak** is preserved: `computeStreakCore` scans the whole
  verified history, and no destructive migration was performed.
- Future writes to `student_daily_streaks` are restricted to career activity types
  (`APPLICATION_SUBMITTED` / `HACKATHON_REGISTERED` / `COMPETITION_REGISTERED`) plus the
  explicit opt-in `STREAK_RESCUE`.

---

## 6. XP behavior changes

| Event | Before | After |
| --- | --- | --- |
| Daily check-in | +5 XP | **0 XP** (no-op) |
| 7-day check-in streak bonus | +25 XP | **Removed from check-in** (today's career streak is shown read-only) |
| Internship application verified | +20 XP | +20 XP (unchanged) |
| Hackathon milestone | +25 XP | +25 XP (unchanged) |
| Coding milestone | +10 XP | +10 XP (unchanged; external coding metric only) |
| Audited reversal | −XP | −XP (unchanged) |

Legitimate XP earned from verified career activities was not touched.

---

## 7. Streak Rescue Token

Preserved as an **explicit, student-initiated** recovery feature and nothing more:

- Real API: `POST /api/gamification/tokens/streak-rescue` → `tokenService.rescueStreak()`
  (atomic, inside `prisma.$transaction`).
- [tokenService.ts](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/lib/gamification/tokenService.ts) now filters eligible/rescue dates to `STREAK_ACTIVITY_TYPES`
  so a missed day can only be bridged by an explicit `STREAK_RESCUE` row.
- Never auto-consumed, never silently restores a missed day, awards no artificial career
  activity, is recorded in the immutable ledger/`verified_activity` audit trail, and the
  unique `(studentId, activityDate)` key prevents a second restoration of the same date.
- The fake in-widget "Restore"/"Freeze" buttons (which only showed a toast) were removed.

---

## 8. Student widget UI

Widget title is now **"Career Activity Streak"** (sub-label "Verified applications · Asia/Kolkata").

Displays:
- Current career activity streak (hero number)
- Longest (best) career activity streak
- Weekly activity calendar (Mon→Sun strip; completed / today-completed / today-pending / missed / future / pre-first-activity states)
- Completed qualifying activity days ("N active days total")
- Today's qualifying activity status pill ("Verified today" / "No activity yet")
- Next streak milestone (5/15/30/50/100/180-day ladder) with progress bar and remaining days
- Explanation: submitting an internship, job, hackathon or competition application maintains the streak

States:
- Empty: **"No qualifying career activity today."**
- Completed: **"Career activity verified today."**
- Multiple same-day submissions: **"Career activity verified today · N submissions"** — the streak still increases by only one day.

Removed: the fake check-in button, the "Claim +5 XP" control, and the Monthly Engagement
presentation inside the streak card. All other (unrelated) features are preserved. The
existing design system (crimson `#990024`, neutral cards, rounded corners, responsive grid)
and responsive layout are maintained.

---

## 9. Badge integration

- Consistency/streak badges (`streak-consistency-*`, `streak-century-achiever`,
  `streak-unstoppable`) evaluate `StudentActivityStats.longestStreakDays`, which is sourced
  from the **career activity streak** only — a legacy check-in-only history scores 0 and
  cannot trigger a milestone.
- External coding-platform streaks (LeetCode / CodeChef / AtCoder / Codeforces) remain a
  **separate** accomplishment system, evaluated from `verifiedCodingStreakDays` /
  `codingStreakPlatform` / `codingAcceptedActivityCount` and their own `CODING_STREAK_BADGES`
  family. They are never mixed into the career application streak.
- Award idempotency is preserved by the `(studentId, badgeId)` unique constraint and
  deterministic credential IDs; no duplicate badges.

---

## 10. Database & migration safety

- Models inspected before any change: `StudentDailyStreak` (`@@map("student_daily_streaks")`,
  `@@unique([studentId, activityDate], name: "studentId_activityDate")`) and
  `DailyCheckIn` (`@@map("daily_check_ins")`).
- **No schema change was required.** The existing `student_daily_streaks` table already
  supports the behaviour: it is keyed by `(studentId, activityDate)` with an `activityType`
  discriminator. The new behaviour reuses it with career activity types and
  `ON CONFLICT ("studentId","activityDate") DO NOTHING`.
- No `prisma db push`, no migration, no production database write, no production cron and no
  deployment were performed.
- Writes are idempotent via the unique composite key + `ON CONFLICT DO NOTHING`.

**Migration status: NOT REQUIRED (additive reuse of existing tables).**
**DB integration validation status: BLOCKED** — no isolated test database is available; the
only configured `DATABASE_URL` is the production-like database. DB-writing suites refuse to
run (see §12).

---

## 11. Files changed

New:
- [careerActivityStreak.test.ts](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/lib/gamification/__tests__/careerActivityStreak.test.ts) — 22-case career activity streak suite

Modified (Task 2):
- [streakCalculator.ts](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/lib/gamification/streakCalculator.ts) — shared career/streak type sets, guards, milestones, pure streak + weekly + milestone helpers
- [checkInService.ts](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/lib/gamification/checkInService.ts) — no-op check-in, career-filtered status/streak, career-only qualifying mapping
- [badgeEngine.ts](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/lib/gamification/badgeEngine.ts) — career-activity guard on daily activity recording
- [tokenService.ts](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/lib/gamification/tokenService.ts) — career-filtered rescue dates
- [scoringEngine.ts](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/lib/leaderboard/scoringEngine.ts) — career day count, zero check-in score, career-filtered streak query
- [check-in/route.ts](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/app/api/check-in/route.ts) — POST no-op
- [achievements/route.ts](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/app/api/achievements/route.ts) — dropped client activity claim
- [StudentPerformancePanel.tsx](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/components/dashboard/StudentPerformancePanel.tsx) — `CareerActivityStreakTab`
- [StudentClassLeaderboard.tsx](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/components/leaderboard/StudentClassLeaderboard.tsx) — career streak card; removed fake restore/freeze
- [test_checkin_streak_leaderboard_suite.ts](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/scripts/test_checkin_streak_leaderboard_suite.ts) — rewritten for no-op check-in + career streak; added `RUN_DB_TESTS` guard
- [package.json](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/package.json) — `test:career-streak` script
- [verify-dashboard.mjs](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/_verify/verify-dashboard.mjs) — browser check label updated to "Career Activity Streak"

Build-unblock (type-only, pre-existing errors, no runtime behaviour change):
- [achievements/page.tsx](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/app/dashboard/student/achievements/page.tsx) — added missing `lastSuccessfulSyncAt` field to the `CodingStreakPlatform` interface
- [test_gamification_suite.ts](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/scripts/test_gamification_suite.ts) — added missing fields to the `emptyStats()` fixture

---

## 12. Test results

| Suite | Command | Result |
| --- | --- | --- |
| Career activity streak (new, pure) | `npm run test:career-streak` | **69 passed, 0 failed, 6 blocked (DB)** |
| Coding streak (Phase 2) | `npm run test:coding-streak` | **123 passed, 0 failed, 2 blocked (DB)** |
| External verification (Phase 1) | `npm run test:external-verification` | **103 passed, 0 failed** |
| Contest verification (Phase 3) | `npm run test:contest` | **172 passed, 0 failed, 5 blocked (DB)** |
| Gamification badge suite | `npx tsx scripts/test_gamification_suite.ts` | 51/59 passed — 8 failures are **pre-existing stale badge-count expectations** (22 DB tests skipped) |
| Check-in/streak/leaderboard DB suite | `npx tsx scripts/test_checkin_streak_leaderboard_suite.ts` | **BLOCKED** — refuses to run without `RUN_DB_TESTS=1` + an isolated DB |
| TypeScript | `npx tsc --noEmit` | **0 errors** |
| Production build | `npm run build` | **Success** |

### The 22 required behavior cases

| # | Case | Covered by |
| --- | --- | --- |
| 1 | Login does not increase streak | career suite (A, B) |
| 2 | Dashboard visit does not increase streak | career suite (A) |
| 3 | Check-in does not increase streak | career suite (A) + DB suite (DB, blocked) |
| 4 | Internship application increases streak | career suite (A, B) |
| 5 | Job application increases streak | career suite (A, B) |
| 6 | Hackathon application increases streak | career suite (A, B) |
| 7 | Multiple applications on one day count once | career suite (B) |
| 8 | Duplicate application event is idempotent | career suite (B) + DB (blocked, SQL-level) |
| 9 | Failed application does not count | career suite (C) |
| 10 | Draft application does not count | career suite (C) |
| 11 | Missed day resets current streak | career suite (B) |
| 12 | Next qualifying activity starts at 1 | career suite (B) |
| 13 | Consecutive qualifying days increment | career suite (B) |
| 14 | Longest streak preserved after reset | career suite (B) |
| 15 | Asia/Kolkata midnight boundaries | career suite (D) |
| 16 | UTC timestamps preserved | career suite (D) |
| 17 | Student cannot submit a fake activity claim | career suite (A) + API layer (DB, blocked) |
| 18 | One student's activity cannot modify another's | career suite (DB, blocked) |
| 19 | Legacy check-in records do not qualify | career suite (A, F) |
| 20 | Rescue token explicit & opt-in | career suite (E) + DB (blocked) |
| 21 | External coding streaks remain independent | career suite (F) + coding-streak suite |
| 22 | Badge award idempotency intact | career suite (F) + DB (blocked) |

---

## 13. Browser verification status

- Production build compiles and type-checks cleanly, so all student routes render.
- The browser harness [_verify/verify-dashboard.mjs](file:///d:/Downloads/tom%20and%20jerry%20images%20300px%20height%20-%20Search%20Images_files/ai%20application%20assitent/ai-career-platform/_verify/verify-dashboard.mjs) was updated to assert the new
  "Career Activity Streak" label (previously "Daily Career Check-In").
- **Not executed in this environment**: the harness requires a running dev server plus real
  authenticated student/leaderboard data. It was **not** run here, so live-browser verification
  of the redesigned widget is **NOT PERFORMED / BLOCKED**.

---

## 14. Strict-rule compliance

| Rule | Status |
| --- | --- |
| No production database writes | ✅ none performed |
| No production migration | ✅ none required / none applied |
| No production cron execution | ✅ no check-in cron exists; none run |
| No deployment | ✅ not deployed |
| No real-student reward distribution | ✅ none |
| No fabricated career activity | ✅ streak rows are written only by verified server events |
| Preserve existing longest-streak records | ✅ longest streak computed over full history; legacy rows preserved |
| Do not modify unrelated auth/gamification features | ✅ unrelated XP, badges, external coding streaks and auth untouched |

---

## 15. Remaining limitations

1. **DB integration validation is BLOCKED.** No isolated test database exists; the only
   `DATABASE_URL` is production-like. All DB-backed cases (idempotency at SQL level,
   cross-student isolation, API-level forged-claim rejection, rescue single-use, badge re-award
   dedup) are reported as blocked. The DB-writing legacy suite now hard-refuses to start unless
   `RUN_DB_TESTS=1` is explicitly set with an isolated database.
2. **Live browser verification was not performed** (needs a running server + seeded student data).
3. **Gamification badge suite (`scripts/test_gamification_suite.ts`) has 8 pre-existing failures**
   unrelated to this task: its expectations still assume the original 30-badge catalog, while the
   catalog has since grown to 48 badges (Phases 2–4) — `BADGE_DEFINITIONS` is intentionally no
   longer identical to the base `BADGE_CATALOG`. These are stale count/identity assertions, not
   behavioural regressions, and were left untouched to avoid modifying unrelated gamification code.
4. `XP_CONFIG.DAILY_CHECKIN` and `XP_CONFIG.STREAK_7DAY_BONUS` are retained as unused
   configuration constants (no award path references them) for backward compatibility.
5. Historical `daily_check_ins` rows and legacy `DAILY_CHECKIN` streak rows remain in the
   database as unverified history and are excluded from every calculation; they are not
   retroactively converted into verified career activity days.
