import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

function getPool(): Pool {
  if (!globalForPrisma.pgPool) {
    const maxConnections = parseInt(process.env.DB_POOL_MAX || '75', 10);
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: maxConnections,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });
    pool.on('error', (err) => {
      console.warn('PostgreSQL pool idle connection error (auto-reconnecting):', err?.message || err);
    });
    globalForPrisma.pgPool = pool;
  }
  return globalForPrisma.pgPool;
}

/**
 * Form Builder needs a client that exposes `prisma.form` after schema changes.
 * Keep cache-bust / recreate-when-missing-form behavior, but always
 * type the client as PrismaClient so Apply AI + app routes keep proper inference.
 */
function createClient(): PrismaClient {
  const pool = getPool();
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export function getDb(): PrismaClient {
  let client = globalForPrisma.prisma;
  if (!client || (client as any)._schemaVer !== '2026-v10' || !(client as any).dailyCheckIn || !(client as any).studentDailyStreak) {
    client = createClient();
    (client as any)._schemaVer = '2026-v10';
    globalForPrisma.prisma = client;
  }
  return client;
}

export function resetPrismaClient() {
  globalForPrisma.prisma = undefined;
}

export type ExtendedPrismaClient = PrismaClient & {
  opportunityReminder?: any;
  opportunityWorkflowStep?: any;
  opportunityStatusHistory?: any;
  notificationDelivery?: any;
  dailyCheckIn?: any;
  studentDailyStreak?: any;
  achievementHistory?: any;
  [key: string]: any;
};

const prisma = new Proxy({} as ExtendedPrismaClient, {
  get(_target, prop) {
    let db = getDb();
    let value = (db as unknown as Record<string | symbol, unknown>)[prop];
    if (value === undefined && typeof prop === 'string' && !['then', 'catch', 'finally', 'toJSON'].includes(prop)) {
      globalForPrisma.prisma = undefined;
      db = getDb();
      value = (db as unknown as Record<string | symbol, unknown>)[prop];
    }
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(db);
    }
    return value;
  },
});

export default prisma;


