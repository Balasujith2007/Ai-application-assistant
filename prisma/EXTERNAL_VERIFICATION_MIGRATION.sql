-- ============================================================================
-- AI Career Platform — External Platform Verification
--   Phase 1: Foundation · Phase 2: Platform Streak Engine · Phase 3: Contests
-- ADDITIVE SCHEMA ONLY (platform-specific streaks + contest evidence + indexes)
-- ============================================================================
--
-- WHY THIS FILE EXISTS
--   The repository has no Prisma migration baseline and deploys with `db push`.
--   Phase 1 therefore reuses the EXISTING schema wherever possible:
--     * `verified_profiles`      -> ownership state (verificationStatus + publicMetadata)
--     * `verified_activities`    -> normalized activity (existing composite unique key)
--     * `sync_history`           -> per-platform sync results
--   The ONLY genuinely new requirement is a platform-specific streak store.
--
--   `student_daily_streaks` CANNOT be reused for this: its unique constraint is
--   ("studentId", "activityDate"), so two platforms active on the same day would
--   collide, and a per-platform streak cannot be represented.
--
--   Phase 3 adds THREE further tables that follow the same reviewed-only,
--   raw-SQL pattern (no Prisma model, because no Prisma Client query is used):
--     * `verified_contests`         -> one normalized contest-evidence row per
--                                      (student, platform, external contest id)
--     * `contest_review_requests`   -> manual-review queue for the Super Admin
--     * `platform_contest_sync`     -> per-platform contest coverage / last sync
--   They are additive and fully independent of `student_platform_streaks`, so a
--   missing contest feed on one provider can never overwrite another provider's
--   valid records, nor any Phase 1/2 data.
--
-- ⚠️  SAFETY
--   DO NOT run this against production.
--   Apply and validate it on an ISOLATED database first, then decide whether to
--   fold the equivalent into `prisma/schema.prisma` and ship via the normal
--   workflow. Every statement is idempotent (IF NOT EXISTS / guarded DO blocks)
--   and additive: no column is dropped, renamed, or narrowed, and no row is
--   updated or deleted.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Platform-specific streak store
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "student_platform_streaks" (
    "id"               TEXT NOT NULL,
    "studentId"        TEXT NOT NULL,
    "platform"         TEXT NOT NULL,
    "currentStreak"    INTEGER NOT NULL DEFAULT 0,
    "longestStreak"    INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate" TEXT,
    "observedDays"     INTEGER NOT NULL DEFAULT 0,
    "timeZone"         TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    -- Phase 2: coverage metadata + accepted-submission counters.
    "coverage"             TEXT NOT NULL DEFAULT 'UNAVAILABLE', -- FULL | PARTIAL | UNAVAILABLE
    "acceptedActivityCount" INTEGER NOT NULL DEFAULT 0,
    "firstActivityDate"    TEXT,
    "streakSupported"      BOOLEAN NOT NULL DEFAULT FALSE,
    "calculatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_platform_streaks_pkey" PRIMARY KEY ("id")
);

-- Idempotent upgrades for a table created by the Phase 1 revision of this
-- script (which lacked the Phase 2 coverage columns).
ALTER TABLE "student_platform_streaks"
    ADD COLUMN IF NOT EXISTS "coverage"              TEXT    NOT NULL DEFAULT 'UNAVAILABLE',
    ADD COLUMN IF NOT EXISTS "acceptedActivityCount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "firstActivityDate"     TEXT,
    ADD COLUMN IF NOT EXISTS "streakSupported"       BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS "student_platform_streaks_studentId_platform_key"
    ON "student_platform_streaks" ("studentId", "platform");

CREATE INDEX IF NOT EXISTS "student_platform_streaks_studentId_idx"
    ON "student_platform_streaks" ("studentId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'student_platform_streaks_studentId_fkey'
    ) THEN
        ALTER TABLE "student_platform_streaks"
            ADD CONSTRAINT "student_platform_streaks_studentId_fkey"
            FOREIGN KEY ("studentId") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Supporting indexes for the normalized-activity queries
--    (both are pure performance aids; no data change)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "verified_activities_studentId_sourcePlatform_activityType_idx"
    ON "verified_activities" ("studentId", "sourcePlatform", "activityType");

CREATE INDEX IF NOT EXISTS "verified_activities_studentId_occurredAt_idx"
    ON "verified_activities" ("studentId", "occurredAt");

CREATE INDEX IF NOT EXISTS "sync_history_studentId_sourcePlatform_createdAt_idx"
    ON "sync_history" ("studentId", "sourcePlatform", "createdAt");

-- ----------------------------------------------------------------------------
-- 3. Badge catalog — Phase 2 streak-badge policy (additive)
--    Super-Admin-owned configuration that gates high-value streak badges.
--    All columns are additive with safe defaults; existing rows are untouched
--    (requireOwnershipVerification defaults FALSE, evidenceRequirement 'NONE').
--    The application treats platform coding-streak badges as requiring
--    ownership + a verified accepted submission unless Super Admin changes it.
-- ----------------------------------------------------------------------------
ALTER TABLE "badge_catalog"
    ADD COLUMN IF NOT EXISTS "requireOwnershipVerification" BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS "eligibleProviders"            JSONB,
    ADD COLUMN IF NOT EXISTS "evidenceRequirement"          TEXT    NOT NULL DEFAULT 'NONE';

-- ----------------------------------------------------------------------------
-- 4. Verified data-migration guards (NOT executed here)
--    Existing rows keep their legacy values ("VERIFIED", "FORMAT_VERIFIED",
--    "PENDING", ...). The application normalizes those to PROFILE_EXISTS at read
--    time via lib/external-verification/ownershipStatus.ts, so no backfill is
--    required — and therefore none is performed. If a future phase wants to
--    align stored values, run it as a separately reviewed, reversible script.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 5. Phase 3 — verified contest evidence
--    One row per (student, platform, external contest id). The external contest
--    id is the provider's OWN stable contest identifier (e.g. Codeforces
--    contestId, AtCoder contest id) — never an array position or display name.
--    `participatedAt` preserves the provider's original instant.
--
--    Idempotency: the composite unique key below lets an import be retried
--    safely via `ON CONFLICT DO UPDATE`. The service's upsert only ever
--    strengthens evidence (COALESCE for nullable fields; VERIFIED/REJECTED are
--    never downgraded), so a later sync that lacks rank/rating can never erase
--    an already-known value.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "verified_contests" (
    "id"                TEXT NOT NULL,
    "studentId"         TEXT NOT NULL,
    "platform"          TEXT NOT NULL,               -- LEETCODE | CODECHEF | ATCODER | CODEFORCES
    "externalContestId" TEXT NOT NULL,               -- provider's stable contest id
    "contestName"       TEXT,
    "participatedAt"    TIMESTAMP(3),                -- original provider instant (UTC)
    "rank"              INTEGER,                     -- NULL when the provider exposes no rank
    "totalParticipants" INTEGER,                     -- NULL when the provider exposes no total
    "oldRating"         INTEGER,                     -- NULL when the provider exposes no pre-rating
    "newRating"         INTEGER,                     -- NULL when the provider exposes no post-rating
    "ratingChange"      INTEGER,                     -- NULL when neither rating is published
    "status"            TEXT NOT NULL DEFAULT 'VERIFIED', -- VERIFIED | PARTIAL | UNAVAILABLE | PENDING_REVIEW | REJECTED
    "evidenceSource"    TEXT NOT NULL,               -- OFFICIAL_API | PUBLIC_PROFILE | COMMUNITY_API | SCRAPED_PUBLIC_DATA | MANUAL_REVIEW
    "evidenceReference" TEXT,                        -- canonical public URL / reference, never a credential
    "rawMetadata"       JSONB,                       -- reserved for provider payload fragments
    "reviewedById"      TEXT,                        -- set only when a Super Admin decision created the row
    "reviewedAt"        TIMESTAMP(3),
    "reviewReason"      TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verified_contests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "verified_contests_studentId_platform_externalContestId_key"
    ON "verified_contests" ("studentId", "platform", "externalContestId");

CREATE INDEX IF NOT EXISTS "verified_contests_studentId_platform_idx"
    ON "verified_contests" ("studentId", "platform");

CREATE INDEX IF NOT EXISTS "verified_contests_studentId_participatedAt_idx"
    ON "verified_contests" ("studentId", "participatedAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'verified_contests_studentId_fkey'
    ) THEN
        ALTER TABLE "verified_contests"
            ADD CONSTRAINT "verified_contests_studentId_fkey"
            FOREIGN KEY ("studentId") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. Phase 3 — manual-review queue
--    Students may submit contest evidence the providers cannot verify. A Super
--    Admin approves or rejects with a MANDATORY reason. Approving writes to
--    `verified_contests` with evidenceSource = 'MANUAL_REVIEW'; it NEVER edits
--    `verified_profiles`, so manual participation approval cannot silently
--    upgrade an account to ownership-verified.
--
--    Idempotency: the composite unique key lets a repeated request no-op
--    (`ON CONFLICT DO NOTHING`); the queue never accumulates duplicates.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "contest_review_requests" (
    "id"                         TEXT NOT NULL,
    "studentId"                  TEXT NOT NULL,
    "platform"                   TEXT NOT NULL,
    "externalContestId"          TEXT NOT NULL,
    "contestName"                TEXT,
    "status"                     TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | APPROVED | REJECTED
    "requestedRank"              INTEGER,
    "requestedTotalParticipants" INTEGER,
    "requestedOldRating"         INTEGER,
    "requestedNewRating"         INTEGER,
    "evidenceUrl"                TEXT,
    "evidenceNote"               TEXT,
    "reviewedById"               TEXT,               -- Super Admin user id
    "reviewedAt"                 TIMESTAMP(3),
    "reviewReason"               TEXT,
    "createdAt"                  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contest_review_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "contest_review_requests_studentId_platform_externalContestId_key"
    ON "contest_review_requests" ("studentId", "platform", "externalContestId");

CREATE INDEX IF NOT EXISTS "contest_review_requests_status_createdAt_idx"
    ON "contest_review_requests" ("status", "createdAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'contest_review_requests_studentId_fkey'
    ) THEN
        ALTER TABLE "contest_review_requests"
            ADD CONSTRAINT "contest_review_requests_studentId_fkey"
            FOREIGN KEY ("studentId") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7. Phase 3 — per-platform contest sync coverage
--    One row per (student, platform). Records whether the last contest read was
--    SUCCESS / FAILED / UNSUPPORTED and the resulting coverage, so the student
--    and admin UIs can show PARTIAL / UNAVAILABLE honestly instead of implying
--    non-participation. A provider outage updates only its own row.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "platform_contest_sync" (
    "id"                   TEXT NOT NULL,
    "studentId"            TEXT NOT NULL,
    "platform"             TEXT NOT NULL,
    "status"               TEXT NOT NULL DEFAULT 'PENDING',  -- SUCCESS | FAILED | UNSUPPORTED | PENDING
    "coverage"             TEXT NOT NULL DEFAULT 'UNAVAILABLE', -- FULL | PARTIAL | UNAVAILABLE
    "evidenceSource"       TEXT NOT NULL DEFAULT 'PUBLIC_PROFILE',
    "contestsFound"        INTEGER NOT NULL DEFAULT 0,
    "contestsPersisted"    INTEGER NOT NULL DEFAULT 0,
    "recordsRejected"      INTEGER NOT NULL DEFAULT 0,
    "errorCode"            TEXT,
    "errorMessage"         TEXT,
    "lastAttemptAt"        TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_contest_sync_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_contest_sync_studentId_platform_key"
    ON "platform_contest_sync" ("studentId", "platform");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'platform_contest_sync_studentId_fkey'
    ) THEN
        ALTER TABLE "platform_contest_sync"
            ADD CONSTRAINT "platform_contest_sync_studentId_fkey"
            FOREIGN KEY ("studentId") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK (reviewed, manual)
-- ============================================================================
-- DROP TABLE IF EXISTS "platform_contest_sync";
-- DROP TABLE IF EXISTS "contest_review_requests";
-- DROP TABLE IF EXISTS "verified_contests";
-- ALTER TABLE "badge_catalog"
--     DROP COLUMN IF EXISTS "evidenceRequirement",
--     DROP COLUMN IF EXISTS "eligibleProviders",
--     DROP COLUMN IF EXISTS "requireOwnershipVerification";
-- DROP INDEX IF EXISTS "sync_history_studentId_sourcePlatform_createdAt_idx";
-- DROP INDEX IF EXISTS "verified_activities_studentId_occurredAt_idx";
-- DROP INDEX IF EXISTS "verified_activities_studentId_sourcePlatform_activityType_idx";
-- DROP TABLE IF EXISTS "student_platform_streaks";
