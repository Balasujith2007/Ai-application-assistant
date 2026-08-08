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

    const whereClause: Prisma.UserWhereInput = {
      mentorId: mentor.id,
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const students = await prisma.user.findMany({
      where: whereClause,
      include: {
        profile: true,
        resumes: { where: { isActive: true }, orderBy: { uploadedAt: 'desc' }, take: 1 },
        applications: { orderBy: { updatedAt: 'desc' }, take: 1 },
        activities: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { name: 'asc' },
    });

    const data = students.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      department: s.profile?.department ?? null,
      year: s.profile?.year ?? null,
      college: s.profile?.college ?? null,
      phone: s.profile?.phone ?? null,
      hasResume: s.resumes.length > 0,
      resumeStatus: s.resumes[0]?.reviewStatus ?? null,
      latestApplication: s.applications[0]?.status ?? null,
      lastActivity: s.activities[0]?.createdAt ?? null,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Mentor students list error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
