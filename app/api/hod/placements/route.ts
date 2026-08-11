import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';

async function verifyHOD(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return { user: null, status: 401 };
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { user: null, status: 401 };
  if (user.role !== 'HOD' && user.role !== 'ADMIN') {
    return { user: null, status: 403 };
  }
  return { user, status: 200 };
}

export async function GET(req: Request) {
  try {
    const { user: hod, status } = await verifyHOD(req);
    if (!hod) {
      return NextResponse.json(
        { success: false, message: status === 403 ? 'Forbidden: HOD role required' : 'Unauthorized' },
        { status }
      );
    }

    const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });

    const applications = await prisma.application.findMany({
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const selectedApplications = applications.filter((a) => a.status === 'SELECTED');
    const internshipApps = applications.filter((a) => a.applicationType === 'INTERNSHIP');
    const jobApps = applications.filter((a) => a.applicationType === 'JOB');

    const opportunities = await prisma.opportunity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalStudents,
          placedStudents: selectedApplications.length,
          internshipApplications: internshipApps.length,
          jobApplications: jobApps.length,
          totalOpportunities: opportunities.length,
        },
        applications: applications.map((a) => ({
          id: a.id,
          studentName: a.user?.name ?? 'Unknown Student',
          registerNo: a.user?.profile?.registerNo ?? '—',
          department: a.user?.profile?.department ?? null,
          year: a.user?.profile?.year ?? null,
          section: a.user?.profile?.section ?? null,
          companyName: a.companyName,
          position: a.position,
          type: a.applicationType,
          status: a.status,
          appliedDate: a.appliedDate,
        })),
        opportunities,
      },
    });
  } catch (error) {
    console.error('HOD placements API error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
