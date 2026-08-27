import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAuthAndPermission } from '@/lib/serverAuth';

export async function GET(req: Request) {
  try {
    const auth = await checkAuthAndPermission(req, 'Dashboard', 'VIEW');
    if (!auth.allowed) {
      return NextResponse.json({ message: auth.message || 'Forbidden' }, { status: auth.status || 403 });
    }

    const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
    const totalMentors = await prisma.user.count({ where: { role: 'MENTOR' } });
    const totalHODs = await prisma.user.count({ where: { role: 'HOD' } });
    
    // Active users: users with active === true
    const activeUsers = await prisma.user.count({ where: { active: true } });

    const totalOpportunities = await prisma.opportunity.count();
    
    const totalApplications = await prisma.application.count();

    const registrations = await prisma.opportunityRegistration.count({
      where: { status: 'REGISTERED' }
    });

    const pendingRegistrations = await prisma.opportunityRegistration.count({
      where: { status: 'INITIATED' }
    });

    // Recent registrations to display on the dashboard (limit 5)
    const recentRegistrationsDb = await prisma.opportunityRegistration.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        student: { select: { name: true, email: true } },
        opportunity: { select: { title: true, type: true } }
      }
    });

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
