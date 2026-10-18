import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log('--- Starting Verified Class Leaderboard Migration ---');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 0. Ensure codeforcesUrl column in profiles table
    await client.query(`
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS "codeforcesUrl" TEXT;
    `);
    console.log('Ensured codeforcesUrl column in profiles table.');

    // 1. Create verified_activities table
    await client.query(`
      CREATE TABLE IF NOT EXISTS verified_activities (
        id TEXT PRIMARY KEY,
        "studentId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "sourceType" TEXT NOT NULL, -- CONTEST, HACKATHON, INTERNSHIP, CONSISTENCY
        "sourcePlatform" TEXT NOT NULL, -- CODEFORCES, LEETCODE, CODECHEF, CODOLIO, GITHUB, CAREERAI
        "sourceAccountId" TEXT, -- External handle or username or registrationId
        "activityType" TEXT NOT NULL, -- CONTEST_PARTICIPATION, RATING_ACHIEVEMENT, PROBLEMS_SOLVED, HACKATHON_REGISTRATION, HACKATHON_PARTICIPATION, HACKATHON_WINNER, INTERNSHIP_APPLICATION, INTERNSHIP_INTERVIEW, INTERNSHIP_OFFER, CONSISTENCY_STREAK
        "externalActivityId" TEXT NOT NULL, -- Stable external ID for deduplication
        "opportunityId" TEXT REFERENCES opportunities(id) ON DELETE SET NULL,
        "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING', -- VERIFIED, PENDING_REVIEW, REJECTED, UNAVAILABLE
        "verificationMethod" TEXT, -- OFFICIAL_API, REVIEWER_APPROVAL, SYSTEM_CROSS_CHECK
        "evidenceReference" TEXT,
        "verifiedAt" TIMESTAMP WITHOUT TIME ZONE,
        "occurredAt" TIMESTAMP WITHOUT TIME ZONE,
        "lastSyncedAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        "reviewerId" TEXT REFERENCES users(id) ON DELETE SET NULL,
        "rejectionReason" TEXT,
        "rawMetadata" JSONB,
        "createdAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        CONSTRAINT uq_verified_activity_dedup UNIQUE ("studentId", "sourceType", "sourcePlatform", "externalActivityId", "activityType")
      );
    `);
    console.log('Created or verified verified_activities table.');

    // 2. Create points_ledger table
    await client.query(`
      CREATE TABLE IF NOT EXISTS points_ledger (
        id TEXT PRIMARY KEY,
        "studentId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "verifiedActivityId" TEXT NOT NULL REFERENCES verified_activities(id) ON DELETE CASCADE,
        category TEXT NOT NULL, -- CODING, HACKATHON, INTERNSHIP, CONSISTENCY
        "pointsAwarded" DOUBLE PRECISION NOT NULL,
        "scoringRuleVersion" TEXT NOT NULL DEFAULT '1.0.0',
        reason TEXT NOT NULL,
        "periodKey" TEXT NOT NULL, -- e.g. 2026-W42, 2026-M10, 2026-S2, ALL_TIME
        "createdAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        CONSTRAINT uq_points_ledger_dedup UNIQUE ("studentId", "verifiedActivityId", "periodKey")
      );
    `);
    console.log('Created or verified points_ledger table.');

    // 3. Create sync_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_history (
        id TEXT PRIMARY KEY,
        "studentId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "sourcePlatform" TEXT NOT NULL,
        status TEXT NOT NULL, -- SUCCESS, FAILED, RATE_LIMITED, NO_PROFILE
        "lastAttemptAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        "lastSuccessfulSyncAt" TIMESTAMP WITHOUT TIME ZONE,
        "recordsProcessed" INTEGER DEFAULT 0,
        "errorCode" TEXT,
        "errorMessage" TEXT,
        "createdAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('Created or verified sync_history table.');

    // 4. Create leaderboard_snapshots table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
        id TEXT PRIMARY KEY,
        "studentId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        department TEXT,
        year INTEGER,
        section TEXT,
        college TEXT,
        "periodType" TEXT NOT NULL, -- WEEKLY, MONTHLY, SEMESTER, ALL_TIME
        "periodKey" TEXT NOT NULL, -- e.g. 2026-W42, 2026-M10, 2026-S2, ALL_TIME
        "codingScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "hackathonScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "internshipScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "consistencyScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        rank INTEGER NOT NULL DEFAULT 0,
        "previousRank" INTEGER,
        badges JSONB DEFAULT '[]'::jsonb,
        "isProvisional" BOOLEAN DEFAULT FALSE,
        "calculatedAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        CONSTRAINT uq_leaderboard_snapshot UNIQUE ("studentId", "periodType", "periodKey")
      );
    `);
    console.log('Created or verified leaderboard_snapshots table.');

    // 5. Create indexes for fast class-scoped queries and period lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vact_student_status ON verified_activities("studentId", "verificationStatus");
      CREATE INDEX IF NOT EXISTS idx_vact_opp ON verified_activities("opportunityId");
      CREATE INDEX IF NOT EXISTS idx_pledger_student_cat ON points_ledger("studentId", category, "periodKey");
      CREATE INDEX IF NOT EXISTS idx_synchist_student_platform ON sync_history("studentId", "sourcePlatform");
      CREATE INDEX IF NOT EXISTS idx_lbsnap_class_period ON leaderboard_snapshots(department, year, section, "periodType", "periodKey");
      CREATE INDEX IF NOT EXISTS idx_lbsnap_student_period ON leaderboard_snapshots("studentId", "periodType", "periodKey");
    `);
    console.log('Created or verified leaderboard indexes.');

    await client.query('COMMIT');
    console.log('--- Verified Class Leaderboard Migration Completed Successfully ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
