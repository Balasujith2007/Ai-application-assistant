import prisma from '../lib/prisma';

async function main() {
  console.log('Applying performance indexes safely...');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_profiles_dept_year_sec ON profiles(department, year, section)');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_profiles_dept ON profiles(department)');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_points_ledger_student_created ON points_ledger("studentId", "createdAt")');
  console.log('✅ Database indexes created and active in PostgreSQL!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Index creation error:', err);
  process.exit(1);
});
