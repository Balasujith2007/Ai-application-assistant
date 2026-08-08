import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import type { Prisma } from '@prisma/client';

async function getMentor(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'MENTOR') return null;
  return user;
}

export async function GET(req: Request) {
  try {
    const mentor = await getMentor(req);
    if (!mentor) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all';

    const mentorStudentsWhere: Prisma.UserWhereInput = { mentorId: mentor.id };
    const students = await prisma.user.findMany({
      where: mentorStudentsWhere,
      select: { id: true },
    });
    const studentIds = students.map((s) => s.id);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const dateFilter: Prisma.InterviewWhereInput =
      filter === 'today'
        ? { date: { gte: todayStart, lt: todayEnd } }
        : filter === 'upcoming'
        ? { date: { gte: now } }
        : filter === 'completed'
        ? { date: { lt: now } }
        : {};

    const interviewWhere: Prisma.InterviewWhereInput = {
      userId: { in: studentIds },
      ...dateFilter,
    };

    const interviews = await prisma.interview.findMany({
      where: interviewWhere,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { date: filter === 'completed' ? 'desc' : 'asc' },
    });

    return NextResponse.json({ data: interviews });
  } catch (error) {
    console.error('Mentor interviews error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
