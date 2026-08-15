import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import type { Prisma } from '@prisma/client';

async function getMentor(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || (user.role !== 'MENTOR' && user.role !== 'HOD' && user.role !== 'ADMIN')) return null;
  return user;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const mentor = await getMentor(req);
    if (!mentor) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    // First check if student exists
    const existingStudent = await prisma.user.findFirst({
      where: { id, role: 'STUDENT' },
      select: { id: true, mentorId: true },
    });

    if (!existingStudent) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    // Enforce mentor assignment authorization for full profile view
    if (mentor.role === 'MENTOR' && existingStudent.mentorId !== mentor.id) {
      return NextResponse.json(
        { message: "Forbidden: You are not authorized to view this student's full profile." },
        { status: 403 }
      );
    }

    const student = await prisma.user.findFirst({
      where: { id, role: 'STUDENT' },
      include: {
        profile: {
          include: {
            education: true,
            experiences: true,
            projects: true,
            skills: { include: { skill: true } },
          },
        },
        resumes: { where: { isActive: true }, orderBy: { uploadedAt: 'desc' } },
        applications: { orderBy: { createdAt: 'desc' } },
        interviews: { orderBy: { date: 'desc' } },
        activities: { orderBy: { createdAt: 'desc' }, take: 10 },
        notifications: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    return NextResponse.json({ data: student });
  } catch (error) {
    console.error('Mentor student detail error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
