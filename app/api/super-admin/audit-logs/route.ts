import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAuthAndPermission } from '@/lib/serverAuth';

export async function GET(req: Request) {
  try {
    const auth = await checkAuthAndPermission(req, 'Audit Logs', 'VIEW');
    if (!auth.allowed) {
      return NextResponse.json({ message: auth.message || 'Forbidden' }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'ALL';
    const search = searchParams.get('search') || '';

    const whereClause: any = {};

    if (action !== 'ALL') {
      whereClause.action = action;
    }

    if (search) {
      whereClause.OR = [
        { details: { contains: search, mode: 'insensitive' } },
        { target: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 200 // Limit to last 200 logs for performance
    });

    return NextResponse.json({ data: logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
