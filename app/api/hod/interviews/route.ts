import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';

async function getHOD(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || (user.role !== 'HOD' && user.role !== 'ADMIN')) return null;
  return user;
}

export async function GET(req: Request) {
  try {
    const hod = await getHOD(req);
    if (!hod) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const interviews = await prisma.interview.findMany({
      include: {
        user: {
          include: {
            profile: true,
            mentor: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const now = new Date();
    const upcoming = interviews.filter((i) => i.date && new Date(i.date) >= now);
    const completed = interviews.filter((i) => i.date && new Date(i.date) < now);

    return NextResponse.json({
      data: interviews,
      upcomingCount: upcoming.length,
      completedCount: completed.length,
    });
  } catch (error) {
    console.error('HOD interviews API 500 error:', error);
    return NextResponse.json({ message: 'Internal server error', error: String(error) }, { status: 500 });
  }
}
