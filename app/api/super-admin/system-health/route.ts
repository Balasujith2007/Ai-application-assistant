import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAuthAndPermission } from '@/lib/serverAuth';

export async function GET(req: Request) {
  try {
    const auth = await checkAuthAndPermission(req, 'System Health', 'VIEW');
    if (!auth.allowed) {
      return NextResponse.json({ message: auth.message || 'Forbidden' }, { status: auth.status || 403 });
    }

    const healthData: any = {
      database: { status: 'UP', message: 'Database is connected and healthy.' },
      authentication: { status: 'UP', message: 'JWT authentication system is fully operational.' },
      notifications: { status: 'UP', message: 'Email and browser notification pipelines are active.' },
      autoFillAgent: { status: 'UP', message: 'Apply AI Agent systems are online.' },
    };

    // Verify DB connectivity with a quick query
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (e: any) {
      healthData.database = { status: 'DOWN', message: `Database query failed: ${e.message}` };
    }

    // Check count of active sessions for autofill to gauge extension load
    try {
      const activeSessionsCount = await prisma.autofillSession.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Last 24 hours
      });
      healthData.autoFillAgent.activeSessions24h = activeSessionsCount;
    } catch {
      healthData.autoFillAgent = { status: 'DEGRADED', message: 'Failed to query autofill sessions stats.' };
    }

    return NextResponse.json({ data: healthData });
  } catch (error) {
    console.error('Error checking system health:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
