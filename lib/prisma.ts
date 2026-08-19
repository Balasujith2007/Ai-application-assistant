import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const createClient = () => {
  try {
    const nativeRequire = typeof eval !== 'undefined' ? eval('require') : require;

    if (nativeRequire && nativeRequire.cache) {
      Object.keys(nativeRequire.cache).forEach((key) => {
        if (key.includes('@prisma') || key.includes('.prisma')) {
          delete nativeRequire.cache[key];
        }
      });
    }

    const { PrismaClient: NativePrismaClient } = nativeRequire('@prisma/client');
    const { PrismaPg: NativePrismaPg } = nativeRequire('@prisma/adapter-pg');
    const adapter = new NativePrismaPg(process.env.DATABASE_URL!);
    return new NativePrismaClient({ adapter });
  } catch {
    const adapter = new PrismaPg(process.env.DATABASE_URL!);
    return new PrismaClient({ adapter });
  }
};

type PrismaClientType = ReturnType<typeof createClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined;
};

export function getDb(): PrismaClientType {
  let client = globalForPrisma.prisma;
  if (!client || typeof (client as any).form === 'undefined') {
    client = createClient();
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = client;
    }
  }
  return client;
}

const prisma = new Proxy({} as PrismaClientType, {
  get(_target, prop) {
    const db = getDb();
    const value = (db as any)[prop];
    if (typeof value === 'function') {
      return value.bind(db);
    }
    return value;
  },
});

export default prisma;
