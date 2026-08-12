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

    const hodUser = await prisma.user.findUnique({
      where: { id: hod.id },
      include: { profile: true }
    });
    const hodDept = hodUser?.profile?.department;

    const studentWhere: Prisma.UserWhereInput = {
      role: 'STUDENT',
      ...(hodDept ? { profile: { department: hodDept } } : {})
    };

    const scopedStudents = await prisma.user.findMany({
      where: studentWhere,
      select: { id: true }
    });
    const scopedStudentIds = scopedStudents.map((s) => s.id);

    const totalStudents = scopedStudents.length;
    const totalMentors = await prisma.user.count({ where: { role: 'MENTOR' } });

    const activeApplications = await prisma.application.count({
      where: {
        userId: { in: scopedStudentIds },
        status: { in: ['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'SELECTED'] }
      },
    });

    const upcomingInterviews = await prisma.interview.count({
      where: {
        userId: { in: scopedStudentIds },
        date: { gte: new Date() }
      },
    });

    const unassignedStudents = await prisma.user.count({
      where: {
        id: { in: scopedStudentIds },
        role: 'STUDENT',
        mentorId: null
      } as Prisma.UserWhereInput,
    });

    const studentsWithResumes = await prisma.resume.groupBy({
      by: ['userId'],
      where: {
        userId: { in: scopedStudentIds },
        isActive: true
      },
    });

    // HOD Registration Analytics
    const registrations = await prisma.opportunityRegistration.findMany({
      where: {
        studentId: { in: scopedStudentIds },
        status: 'REGISTERED'
      },
      include: {
        opportunity: { select: { type: true } }
      }
    });

    const hackathonStudentSet = new Set<string>();
    const internshipStudentSet = new Set<string>();
    const totalRegisteredStudentSet = new Set<string>();

    for (const reg of registrations) {
      totalRegisteredStudentSet.add(reg.studentId);
      if (reg.opportunity?.type === 'HACKATHON') {
        hackathonStudentSet.add(reg.studentId);
      } else if (reg.opportunity?.type === 'INTERNSHIP') {
        internshipStudentSet.add(reg.studentId);
      }
    }

    // Year-wise student counts
    const secondYear = await prisma.profile.count({
      where: { userId: { in: scopedStudentIds }, year: 2 }
    });
    const thirdYear = await prisma.profile.count({
      where: { userId: { in: scopedStudentIds }, year: 3 }
    });
    const fourthYear = await prisma.profile.count({
      where: { userId: { in: scopedStudentIds }, year: 4 }
    });

    // Section-wise counts
    const sectionA = await prisma.profile.count({
      where: { userId: { in: scopedStudentIds }, section: 'A' }
    });
    const sectionB = await prisma.profile.count({
      where: { userId: { in: scopedStudentIds }, section: 'B' }
    });

    return NextResponse.json({
      data: {
        totalStudents,
        totalMentors,
        activeApplications,
        upcomingInterviews,
        unassignedStudents,
        studentsWithResumesCount: studentsWithResumes.length,
        hackathonRegistrations: hackathonStudentSet.size,
        internshipRegistrations: internshipStudentSet.size,
        totalRegisteredStudents: totalRegisteredStudentSet.size,
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
