import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log('--- Starting Achievement & Badge Gamification Migration ---');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create student_badges table
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_badges (
        id TEXT PRIMARY KEY,
        "studentId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "badgeId" TEXT NOT NULL,
        category TEXT NOT NULL,
        tier TEXT NOT NULL DEFAULT 'BRONZE',
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        "awardedAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        "evidenceData" JSONB,
        "unlockedToastSeen" BOOLEAN NOT NULL DEFAULT FALSE,
        "createdAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        CONSTRAINT uq_student_badge_dedup UNIQUE ("studentId", "badgeId")
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_student_badges_student_cat ON student_badges("studentId", category);
    `);
    console.log('Created or verified student_badges table.');

    // 2. Create student_daily_streaks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_daily_streaks (
        id TEXT PRIMARY KEY,
        "studentId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "activityDate" TEXT NOT NULL,
        "activityType" TEXT NOT NULL,
        "sourceReference" TEXT,
        "qualifyingScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
        "createdAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        CONSTRAINT uq_student_daily_streak_date UNIQUE ("studentId", "activityDate")
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_student_daily_streaks_lookup ON student_daily_streaks("studentId", "activityDate");
    `);
    console.log('Created or verified student_daily_streaks table.');

    // 3. Create achievement_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS achievement_history (
        id TEXT PRIMARY KEY,
        "studentId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "badgeId" TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        "xpEarned" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "eventDetails" TEXT NOT NULL,
        "achievedAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_achievement_history_student ON achievement_history("studentId", "achievedAt");
    `);
    console.log('Created or verified achievement_history table.');

    await client.query('COMMIT');
    console.log('--- Gamification Migration Completed Successfully! ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
