import prisma from '../lib/prisma';

async function main() {
  console.log('Ensuring notification_deliveries table exists...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS notification_deliveries (
      id TEXT PRIMARY KEY DEFAULT concat('c', substr(md5(random()::text), 1, 24)),
      "userId" TEXT REFERENCES users(id) ON DELETE SET NULL,
      "recipientPhone" TEXT NOT NULL,
      "notificationType" TEXT NOT NULL,
      provider TEXT NOT NULL,
      "providerMessageId" TEXT,
      status TEXT NOT NULL,
      "failureReason" TEXT,
      "idempotencyKey" TEXT UNIQUE,
      metadata JSONB,
      "sentAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "notification_deliveries_userId_idx" ON notification_deliveries("userId");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "notification_deliveries_status_idx" ON notification_deliveries(status);
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "notification_deliveries_createdAt_idx" ON notification_deliveries("createdAt");
  `);

  console.log('✅ notification_deliveries table and indexes created/verified successfully.');
}

main()
  .catch((err) => {
    console.error('Error creating table:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
