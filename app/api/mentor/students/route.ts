import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import type { Prisma } from '@prisma/client';

async function getMentor(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return { user: null, status: 401 };
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { user: null, status: 401 };
  if (user.role !== 'MENTOR' && user.role !== 'HOD' && user.role !== 'ADMIN') {
    return { user: null, status: 403 };
  }
  return { user, status: 200 };
}

export async function GET(req: Request) {
  try {
    const { user: mentor, status } = await getMentor(req);
    if (!mentor) {
      return NextResponse.json(
        { message: status === 403 ? 'Forbidden: Mentor access required' : 'Unauthorized' },
        { status }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    const whereClause: Prisma.UserWhereInput = {
      role: 'STUDENT',
      ...(mentor.role === 'MENTOR' ? { mentorId: mentor.id } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { profile: { registerNo: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
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

    const data = students.map((s: any) => ({
      id: s.id,
      userId: s.id,
      name: s.name,
      email: s.email,
      registerNo: s.profile?.registerNo ?? '—',
      department: s.profile?.department ?? 'Artificial Intelligence & Data Science',
      year: s.profile?.year ?? 2,
      section: s.profile?.section ?? 'A',
      college: s.profile?.college ?? null,
      phone: s.profile?.phone ?? null,
      hasResume: s.resumes.length > 0,
      resumeStatus: s.resumes[0]?.reviewStatus ?? null,
      latestApplication: s.applications[0]?.status ?? null,
      lastActivity: s.activities[0]?.createdAt ?? null,
    }));

    return NextResponse.json({ data, total: data.length });
  } catch (error) {
    console.error('Mentor students list error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
