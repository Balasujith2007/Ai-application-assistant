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

    const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
    const totalMentors = await prisma.user.count({ where: { role: 'MENTOR' } });

    const activeApplications = await prisma.application.count({
      where: { status: { in: ['APPLIED', 'SHORTLISTED', 'INTERVIEW'] } },
    });

    const upcomingInterviews = await prisma.interview.count({
      where: { date: { gte: new Date() } },
    });

    const unassignedStudents = await prisma.user.count({
      where: { role: 'STUDENT', mentorId: null } as Prisma.UserWhereInput,
    });

    const studentsWithResumes = await prisma.resume.groupBy({
      by: ['userId'],
      where: { isActive: true },
    });

    // Year-wise student counts
    const secondYear = await prisma.profile.count({ where: { year: 2 } });
    const thirdYear = await prisma.profile.count({ where: { year: 3 } });
    const fourthYear = await prisma.profile.count({ where: { year: 4 } });

    // Section-wise counts
    const sectionA = await prisma.profile.count({ where: { section: 'A' } });
    const sectionB = await prisma.profile.count({ where: { section: 'B' } });

    return NextResponse.json({
      data: {
        totalStudents,
        totalMentors,
        activeApplications,
        upcomingInterviews,
        unassignedStudents,
        studentsWithResumesCount: studentsWithResumes.length,
        yearDistribution: [
          { year: '2nd Year', total: secondYear },
          { year: '3rd Year', total: thirdYear },
          { year: '4th Year', total: fourthYear },
        ],
        sectionDistribution: [
          { section: 'Section A', total: sectionA },
          { section: 'Section B', total: sectionB },
        ],
      },
    });
  } catch (error) {
    console.error('HOD dashboard error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
