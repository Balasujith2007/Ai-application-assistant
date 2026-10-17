import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log('--- Starting Registration Evidence Migration ---');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Add new enum values to OpportunityRegistrationStatus if not already present
    const newEnums = ['PROOF_SUBMITTED', 'VERIFYING', 'PENDING_REVIEW'];
    for (const val of newEnums) {
      try {
        await client.query(`ALTER TYPE "OpportunityRegistrationStatus" ADD VALUE IF NOT EXISTS '${val}'`);
        console.log(`Added enum value '${val}' to OpportunityRegistrationStatus`);
      } catch (enumErr) {
        console.warn(`Enum value '${val}' notice:`, enumErr.message);
      }
    }

    // 2. Create registration_evidences table
    await client.query(`
      CREATE TABLE IF NOT EXISTS registration_evidences (
        id TEXT PRIMARY KEY,
        "registrationId" TEXT NOT NULL REFERENCES opportunity_registrations(id) ON DELETE CASCADE,
        "opportunityId" TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
        "studentId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "evidenceFileUrl" TEXT NOT NULL,
        "filePath" TEXT NOT NULL,
        "fileName" TEXT NOT NULL,
        "fileSize" INTEGER NOT NULL,
        "mimeType" TEXT NOT NULL,
        "fileHash" TEXT,
        "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
        "verificationMethod" TEXT DEFAULT 'OCR_SCREENSHOT',
        "ocrTextSnippet" TEXT,
        "ocrConfidence" DOUBLE PRECISION DEFAULT 0.0,
        "extractedData" JSONB,
        "validationResults" JSONB,
        "mismatchReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "isAuthentic" BOOLEAN DEFAULT FALSE,
        "reviewerId" TEXT REFERENCES users(id) ON DELETE SET NULL,
        "reviewDecision" TEXT,
        "reviewerNotes" TEXT,
        "reviewedAt" TIMESTAMP WITHOUT TIME ZONE,
        "submittedAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        "createdAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('Created or verified registration_evidences table.');

    // 3. Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reg_evidences_reg_id ON registration_evidences("registrationId");
      CREATE INDEX IF NOT EXISTS idx_reg_evidences_student_id ON registration_evidences("studentId");
      CREATE INDEX IF NOT EXISTS idx_reg_evidences_opp_id ON registration_evidences("opportunityId");
      CREATE INDEX IF NOT EXISTS idx_reg_evidences_file_hash ON registration_evidences("fileHash");
      CREATE INDEX IF NOT EXISTS idx_reg_evidences_status ON registration_evidences("status");
    `);
    console.log('Created or verified indexes for registration_evidences.');

    await client.query('COMMIT');
    console.log('--- Migration Completed Successfully ---');
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
