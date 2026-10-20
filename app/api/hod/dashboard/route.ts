import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import type { Prisma } from '@prisma/client';

async function getHOD(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || (user.role !== 'HOD' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) return null;
  return user;
}

const hodCache = new Map<string, { data: any; expiresAt: number }>();
const HOD_CACHE_TTL_MS = 30000; // 30s TTL

export function invalidateHODCache() {
  hodCache.clear();
}

export async function GET(req: Request) {
  try {
    const hod = await getHOD(req);
    if (!hod) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const cacheKey = hod.id;
    const now = Date.now();
    const cached = hodCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.data);
    }

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
    const [
      totalMentors,
      activeApplications,
      upcomingInterviews,
      unassignedStudents,
      studentsWithResumes,
      registrations,
      yearGroups,
      sectionGroups,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'MENTOR' } }),
      prisma.application.count({
        where: {
          userId: { in: scopedStudentIds },
          status: { in: ['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'SELECTED'] },
        },
      }),
      prisma.interview.count({
        where: {
          userId: { in: scopedStudentIds },
          date: { gte: new Date() },
        },
      }),
      prisma.user.count({
        where: {
          id: { in: scopedStudentIds },
          role: 'STUDENT',
          mentorId: null,
        } as Prisma.UserWhereInput,
      }),
      prisma.resume.groupBy({
        by: ['userId'],
        where: {
          userId: { in: scopedStudentIds },
          isActive: true,
        },
      }),
      prisma.opportunityRegistration.findMany({
        where: {
          studentId: { in: scopedStudentIds },
          status: 'REGISTERED',
        },
        include: {
          student: { select: { name: true } },
          opportunity: { select: { title: true, type: true } },
        },
        orderBy: { registeredAt: 'desc' },
      }),
      prisma.profile.groupBy({
        by: ['year'],
        where: { userId: { in: scopedStudentIds }, year: { in: [2, 3, 4] } },
        _count: { _all: true },
      }),
      prisma.profile.groupBy({
        by: ['section'],
        where: { userId: { in: scopedStudentIds }, section: { in: ['A', 'B'] } },
        _count: { _all: true },
      }),
    ]);

    const hackathonStudentSet = new Set<string>();
    const internshipStudentSet = new Set<string>();
    const totalRegisteredStudentSet = new Set<string>();

    for (const reg of registrations) {
      totalRegisteredStudentSet.add(reg.studentId);
      const type = reg.opportunity?.type;
      if (type === 'HACKATHON') {
        hackathonStudentSet.add(reg.studentId);
      } else if (type === 'INTERNSHIP') {
        internshipStudentSet.add(reg.studentId);
      }
    }

    const recentRegistrations = registrations.map((r) => ({
      id: r.id,
      studentName: r.student.name,
      opportunityTitle: r.opportunity.title,
      opportunityType: r.opportunity.type,
      status: 'Registered',
      registeredAt: r.registeredAt || r.updatedAt,
    }));

    let secondYear = 0;
    let thirdYear = 0;
    let fourthYear = 0;
    for (const yg of yearGroups) {
      if (yg.year === 2) secondYear = yg._count._all;
      else if (yg.year === 3) thirdYear = yg._count._all;
      else if (yg.year === 4) fourthYear = yg._count._all;
    }

    let sectionA = 0;
    let sectionB = 0;
    for (const sg of sectionGroups) {
      if (sg.section === 'A') sectionA = sg._count._all;
      else if (sg.section === 'B') sectionB = sg._count._all;
    }

    const payload = {
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
        recentRegistrations,
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
    };

    hodCache.set(cacheKey, { data: payload, expiresAt: Date.now() + HOD_CACHE_TTL_MS });
    return NextResponse.json(payload);
  } catch (error) {
    console.error('HOD dashboard error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
