import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Form Builder needs a client that exposes `prisma.form` after schema changes.
 * Keep friend's cache-bust / recreate-when-missing-form behavior, but always
 * type the client as PrismaClient so Apply AI + app routes keep proper inference.
 */
function createClient(): PrismaClient {
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
    const adapter = new NativePrismaPg(process.env.DATABASE_URL!);
    return new NativePrismaClient({ adapter }) as PrismaClient;
  } catch {
    const adapter = new PrismaPg(process.env.DATABASE_URL!);
    return new PrismaClient({ adapter });
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function getDb(): PrismaClient {
  let client = globalForPrisma.prisma;
  // Recreate if missing or if client was created before the latest schema version
  if (!client || (client as any)._schemaVer !== '2026-v3' || typeof (client as PrismaClient & { form?: unknown }).form === 'undefined') {
    client = createClient();
    (client as any)._schemaVer = '2026-v3';
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = client;
    }
  }
  return client;
}

export function resetPrismaClient() {
  globalForPrisma.prisma = undefined;
}

const prisma = new Proxy({} as PrismaClient, {
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
