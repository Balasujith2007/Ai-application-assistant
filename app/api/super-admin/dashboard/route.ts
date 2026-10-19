import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAuthAndPermission } from '@/lib/serverAuth';

export async function GET(req: Request) {
  try {
    const auth = await checkAuthAndPermission(req, 'Dashboard', 'VIEW');
    if (!auth.allowed) {
      return NextResponse.json({ message: auth.message || 'Forbidden' }, { status: auth.status || 403 });
    }

    const [
      roleGroups,
      activeUsers,
      totalOpportunities,
      totalApplications,
      registrationGroups,
      recentRegistrationsDb,
    ] = await Promise.all([
      prisma.user.groupBy({
        by: ['role'],
        _count: { _all: true },
      }),
      prisma.user.count({ where: { active: true } }),
      prisma.opportunity.count(),
      prisma.application.count(),
      prisma.opportunityRegistration.groupBy({
        by: ['status'],
        where: { status: { in: ['REGISTERED', 'INITIATED'] } },
        _count: { _all: true },
      }),
      prisma.opportunityRegistration.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: {
          student: { select: { name: true, email: true } },
          opportunity: { select: { title: true, type: true } },
        },
      }),
    ]);

    let totalStudents = 0;
    let totalMentors = 0;
    let totalHODs = 0;
    for (const group of roleGroups) {
      if (group.role === 'STUDENT') totalStudents = group._count._all;
      else if (group.role === 'MENTOR') totalMentors = group._count._all;
      else if (group.role === 'HOD') totalHODs = group._count._all;
    }

    let registrations = 0;
    let pendingRegistrations = 0;
    for (const group of registrationGroups) {
      if (group.status === 'REGISTERED') registrations = group._count._all;
      else if (group.status === 'INITIATED') pendingRegistrations = group._count._all;
    }

    const recentRegistrations = recentRegistrationsDb.map(r => ({
      id: r.id,
      studentName: r.student.name,
      studentEmail: r.student.email,
      opportunityTitle: r.opportunity.title,
      opportunityType: r.opportunity.type,
      status: r.status,
      registeredAt: r.registeredAt || r.updatedAt
    }));

    return NextResponse.json({
      data: {
        totalStudents,
        totalMentors,
        totalHODs,
        activeUsers,
        totalOpportunities,
        totalApplications,
        registrations,
        pendingRegistrations,
        recentRegistrations
      }
    });
  } catch (error) {
    console.error('Super Admin Dashboard API Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
