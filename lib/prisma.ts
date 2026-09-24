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
    globalForPrisma.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
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
  try {
    const nativeRequire = typeof eval !== 'undefined' ? eval('require') : require;

    if (nativeRequire?.cache) {
      Object.keys(nativeRequire.cache).forEach((key) => {
        if (key.includes('@prisma') || key.includes('.prisma')) {
          delete nativeRequire.cache[key];
        }
      });
    }

    const { PrismaClient: NativePrismaClient } = nativeRequire('@prisma/client');
    const { PrismaPg: NativePrismaPg } = nativeRequire('@prisma/adapter-pg');
    const adapter = new NativePrismaPg(pool);
    return new NativePrismaClient({ adapter }) as PrismaClient;
  } catch {
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }
}

export function getDb(): PrismaClient {
  let client = globalForPrisma.prisma;
  // Recreate if missing or if client was created before the latest schema version or missing models
  if (
    !client ||
    (client as any)._schemaVer !== '2026-v5' ||
    typeof (client as any).form === 'undefined' ||
    typeof (client as any).studentEmailIntegration === 'undefined' ||
    typeof (client as any).emailEvidence === 'undefined'
  ) {
    client = createClient();
    (client as any)._schemaVer = '2026-v5';
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = client;
    }
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
  [key: string]: any;
};

const prisma = new Proxy({} as ExtendedPrismaClient, {
  get(_target, prop) {
    const db = getDb();
    const value = (db as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(db);
    }
    return value;
  },
});

export default prisma;


