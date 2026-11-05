# Career Growth Platform Correction — Implementation Report

**Scope:** Replace all LMS-based weekly evaluation in the Mystery Gift / Champion
Reward system with a Career Growth model (Internship & Job Applications,
Hackathons & Competitions, Resume Strength).

**Status:** Implemented, build-verified, and scoring-verified. Ready for branch
promotion and production deployment (env vars required — see §8).

---

## 1. Architecture correction (§1) — LMS evaluation removed

LMS scoring has been removed from the reward engine, not merely hidden:

- The legacy `scoringWeights` section
  (`lessonsCompleted`, `courseProgress`, `learningConsistency`,
  `assessmentScore`, `streakMaintenance`) was removed from the effective
  configuration. The reward engine no longer reads any of these.
- The configuration shape is now exactly:
  `weeklySchedule`, `careerGrowth`, `tierThresholds`, `rewardValues`,
  `championRewards`.
- Historical reward records are preserved: existing `StudentReward`,
  `WeeklyPerformanceSnapshot` and ledger rows are untouched. Legacy columns
  that still exist on `weekly_performance_snapshots` (`lessonsCompleted`,
  `courseProgress`, …) are retained for historical data only and are never
  read or written by the new engine.

Verified by automated checks: *"no legacy LMS scoring section remains in the
config shape"*, *"config exposes only career-growth sections"*, *"no LMS metric
keys appear anywhere in the effective config"*.

## 2. Career Growth scoring (§2)

Configurable category weights, defaulting to the requested values and enforced
to total exactly 100%:

| Category | Default weight |
|---|---|
| Internship & job applications | 35% |
| Hackathons & competitions | 35% |
| Resume strength | 30% |
| **Total** | **100%** |

`validateRewardConfig` rejects any configuration whose weights do not total
100% (verified).

## 3. Internship & job application evaluation (§3)

Verified milestones (default scores, monotonic):

`application submitted 10 → shortlisted 30 → interview attended 55 → selected 80 → internship completed 100`

- Data source: real `Application` rows (`applicationType ∈ {INTERNSHIP, JOB}`)
  plus `Interview` rows and `VerifiedActivity` (`INTERNSHIP_*`).
- **One highest milestone per distinct application** via dedup key
  `app:<opportunityId | applicationUrl | company|position>`. Verified:
  *"a repeated submission of the same application does not increase the
  internship score"* and *"only one milestone is scored per distinct
  application"*.
- Submission is never treated as selection/completion: verified
  *"internship score equals the 'selected' milestone score (submission !=
  selection)"*.
- `internshipCompleted` requires both a `SELECTED` application and a matching
  `Experience` entry on the profile.
- Optional verification gate (`requireInternshipVerification`, default off)
  excludes untrusted `MANUAL` status sources when enabled (verified).

## 4. Hackathon & competition evaluation (§4)

Milestones (default, monotonic):
`application submitted 5 → registration confirmed 10 → participation completed 30 → project submitted 50 → shortlisted 65 → finalist 80 → winner 100`

- Data source: real `OpportunityRegistration` rows for `Opportunity.type ∈
  {HACKATHON, COMPETITION}`, plus `VerifiedActivity` (`HACKATHON_*`) and
  `RegistrationEvidence`.
- **One highest milestone per distinct registration** via dedup key
  `reg:<opportunityId>` / `act:<...>`. Duplicate milestone scoring is prevented.
- Merely applying can never earn confirmed/winner points. Verified:
  *"an application-only competition adds only the 'application submitted'
  points"* and *"an application-only competition scores only
  'applicationSubmitted' (never confirmed/winner)"*.
- Outcome strings (`Winner`, `Finalist`, `Selected`, …) are parsed and can only
  raise, never lower, the status-derived milestone.
- The hackathon verification gate (`requireHackathonVerification`) **defaults
  to ON**: unverified/`INITIATED` registrations are excluded until they are
  confirmed, verified, or backed by approved evidence.

## 5. Resume strength evaluation (§5)

Backed by real models — **no keyword-count scoring**. Targets and criteria
(defaults, summing to 100):

| Criterion | Default | Source |
|---|---|---|
| Technical skills | 20 | `ProfileSkill` count (target 10) |
| Projects | 20 | `Project` count (target 4) |
| Internship experience | 15 | `Experience` matching "intern" (target 2) |
| Certifications | 0 | **No data model — unavailable** |
| Achievements | 10 | `StudentBadge` + verified outcomes (target 5) |
| Professional experience | 10 | `Experience` count (target 3) |
| Resume completeness | 15 | profile field completeness ratio |
| Measurable accomplishments | 5 | descriptions containing numeric metrics (target 3) |
| Improvement | 5 | skill/project deltas vs previous snapshot + new upload/review |

- **Improvement** is computed against the previous week's persisted snapshot
  (`WeeklyPerformanceSnapshot.careerBreakdown`), so it is a platform-tracked
  delta, not a re-scan. Verified: *"resume improvement signal is captured"*.
- No AI/LLM is used for scoring. Final scoring and reward allocation are
  controlled entirely by backend rules (advisory-only AI is not wired in).

## 6. Fairness (§6)

- Category scores are normalized (ratio-to-target), so a student with fewer
  opportunities is compared against a target, not against raw volume.
- Configurable verification requirements and milestone caps
  (`maxInternshipMilestonesPerWeek`, `maxHackathonMilestonesPerWeek`, validated
  1–50) prevent farming.
- Duplicate applications/registrations/uploads are deduped; fake or unverified
  records can be excluded via the verification gates.
- **Every active student receives a weekly gift**, including low-activity
  students. Verified: *"a low-activity student still gets a numeric score and a
  valid tier"* (tier floor `COMEBACK`).

## 7. Top-3 Champion system (§7)

- Weekly ranking uses the finalized Career Growth Score (`weightedScore`).
- Deterministic tie-breaking and immutable weekly snapshots
  (`WeeklyPerformanceSnapshot`, unique on `studentId + weekKey`, upserted with
  `update: {}` so a finalized snapshot is never overwritten).
- Top 3 receive their **regular weekly gift plus** a position-specific Champion
  Gift. The champion block in `weeklyDistributionService` is purely additive —
  **there is no delete/replace path for regular weekly gifts**.

## 8. Admin configuration (§8)

The existing Super-Admin → Gamification → Reward Configuration screen now
manages:

- Three career-growth category weights (with live `Total: N%`).
- Internship milestone scores, hackathon milestone scores.
- Resume scoring criteria (with `Total: N%` and a certifications "unavailable"
  note).
- Verification requirements (three toggles) and scoring caps.

Values are **persisted in the database** (`reward_configurations`, one JSON row
per section) and the reward engine **consumes the persisted configuration**
(`getRewardConfig()`), so admin changes take effect for the next evaluation
window. Every change is recorded in `RewardConfigurationAudit`.

## 9. Student dashboard (§9)

A new `CareerGrowthSummaryCard` (reusing existing dashboard styling and the
existing gift animation/`MysteryGiftCard`) is wired into the student dashboard
and shows:

- Final Career Growth Score (`X / 100`) and assigned gift tier.
- Category-wise progress bars with "contributes N pts".
- Internship application achievements and hackathon achievements (the scored
  milestones, with detail).
- Resume strength and resume improvement.
- An amber note listing unavailable criteria (certifications).

It is fed by a new student-authenticated API `GET /api/career-growth`
(returns the live week score plus the latest finalized snapshot and gift).

## 10. Implementation safety (§10)

- Existing modules inspected; **no duplicate modules** were created. The
  existing `Application`, `Interview`, `OpportunityRegistration`,
  `RegistrationEvidence`, `VerifiedActivity`, `Profile`/`Project`/`Experience`/
  `Education`/`Resume` models and admin configuration screen were reused.
- No fake data invented. Unavailable capabilities are reported explicitly
  rather than faked.
- Phase 1 functionality (weekly scheduler, coin ledger, admin config engine,
  gift card/animation) is preserved.
- Testing used **isolated, self-cleaning `@example.invalid` accounts**; no real
  student balances were read or modified. Verified post-run:
  `test_users = 0`, `test_opps = 0`, `test_skills = 0`.

---

## Actual tests run (this implementation)

| Command | Result |
|---|---|
| `npx prisma validate` | PASS — schema valid |
| `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` | Only one additive change: `ALTER TABLE "weekly_performance_snapshots" ADD COLUMN "careerBreakdown" JSONB;` |
| `npx prisma db push` | PASS — database in sync |
| `npx tsc --noEmit` | PASS — 0 errors |
| `npm run build` (Next 16 / Turbopack) | PASS — compiled successfully, all static pages generated, `/api/career-growth` present |
| `npx tsx scripts/verify-career-growth.ts` | **26 passed, 0 failed** |

Verification harness covers: config validation (weights = 35/35/30 = 100%,
resume criteria = 100%, no LMS keys, rejection of bad weights / non-monotonic
milestones / bad resume sum / bad caps) and DB-backed scoring (submission ≠
selection, registration-confirmed mapping, application-only never reaches
winner level, duplicate submissions don't stack, verification gate, resume
improvement, weighted-sum invariant, certifications unavailable, low-activity
student still receives a tier).

---

## Remaining limitations

1. **Certifications** — no `Certification` model exists on the platform. The
   criterion is scored `0` and surfaced as "unavailable" in both the API and the
   student dashboard. Adding a certification data source would activate it.
2. **AI advisory evaluation** — not wired. Scoring is fully deterministic and
   backend-controlled, which satisfies the directive's "AI must be advisory
   only" requirement conservatively (no AI is used at all).
3. **Legacy snapshot columns** — `lessonsCompleted`, `courseProgress`,
   `assessmentScore`, `streakMaintenance`, `achievementsCount`, `activeDays`,
   `projectCompleted` remain on `weekly_performance_snapshots` for historical
   data. They are unused by the engine. Dropping them would be a destructive
   migration and was intentionally avoided to preserve history.
4. **Resume improvement baseline** — improvement compares against the previous
   *snapshot*, so the very first evaluated week has no delta baseline (improvement
   reads 0 that week).
5. **Deployment prerequisites** — the `careerBreakdown` column has been pushed
   to the current database. The production environment still requires
   `CRON_SECRET` and `APP_TIMEZONE` to be set, and the branch must be promoted
   for the cron config to take effect.

## Files changed

- `lib/gamification/rewardConfig.ts` — career-growth config shape (LMS weights removed).
- `lib/gamification/rewardConfigService.ts` — DB-backed config + validation.
- `lib/gamification/careerGrowthEngine.ts` — new scoring engine (3 categories, dedup, gates, caps).
- `lib/gamification/rewardEngine.ts` — consumes the Career Growth score for weekly allocation.
- `lib/gamification/championRewardEngine.ts` — ranking from snapshots with deterministic tie-break.
- `lib/gamification/weeklyDistributionService.ts` — additive champion block (no delete path).
- `app/api/career-growth/route.ts` — new student API.
- `components/dashboard/CareerGrowthSummaryCard.tsx` — new dashboard card.
- `app/dashboard/student/page.tsx` — card wired into the student dashboard.
- `app/dashboard/super-admin/gamification/reward-configuration/page.tsx` — admin UI for career-growth config.
- `prisma/schema.prisma` — `WeeklyPerformanceSnapshot.careerBreakdown Json?` (applied to DB).
- `scripts/verify-career-growth.ts` — isolated verification harness.
