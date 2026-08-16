import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import type { Prisma } from '@prisma/client';

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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department');
    const year = searchParams.get('year');
    const section = searchParams.get('section');
    const mentorId = searchParams.get('mentorId');

    const whereClause: Prisma.UserWhereInput = {
      role: 'STUDENT',
      ...(mentorId ? { mentorId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { profile: { registerNo: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(department || year || section
        ? {
            profile: {
              ...(department ? { department: { equals: department, mode: 'insensitive' } } : {}),
              ...(year ? { year: parseInt(year) } : {}),
              ...(section ? { section: { equals: section, mode: 'insensitive' } } : {}),
            },
          }
        : {}),
    };

    const students = await prisma.user.findMany({
      where: whereClause,
      include: {
        profile: true,
        mentor: { select: { id: true, name: true, email: true } },
        resumes: { where: { isActive: true }, take: 1 },
        applications: { take: 1, orderBy: { updatedAt: 'desc' } },
        interviews: { take: 1, orderBy: { date: 'desc' } },
      },
      orderBy: { name: 'asc' },
    });

    const data = students.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      registerNo: s.profile?.registerNo ?? '—',
      department: s.profile?.department ?? '—',
      year: s.profile?.year ?? null,
      section: s.profile?.section ?? null,
      assignedMentor: s.mentor ? { id: s.mentor.id, name: s.mentor.name } : null,
      hasResume: s.resumes.length > 0,
      resumeStatus: s.resumes[0]?.reviewStatus ?? 'PENDING',
      applicationsCount: s.applications.length,
      latestApplicationStatus: s.applications[0]?.status ?? null,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('HOD students list error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
