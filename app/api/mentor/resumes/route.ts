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
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const mentorStudentsWhere: Prisma.UserWhereInput = { mentorId: mentor.id };
    const students = await prisma.user.findMany({
      where: mentorStudentsWhere,
      select: { id: true, name: true },
    });
    const studentIds = students.map((s) => s.id);

    const resumeWhere: Prisma.ResumeWhereInput = {
      userId: { in: studentIds },
      isActive: true,
      ...(status ? { reviewStatus: status } : {}),
      ...(search ? { user: { name: { contains: search, mode: 'insensitive' } } } : {}),
    };

    const resumes = await prisma.resume.findMany({
      where: resumeWhere,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: { select: { department: true } },
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    return NextResponse.json({ data: resumes });
  } catch (error) {
    console.error('Mentor resumes error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
