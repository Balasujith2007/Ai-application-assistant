import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { getStudentOpportunityStatus } from '@/lib/opportunityUtils';

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Aggregate stats similar to NestJS DashboardService
    const [
      totalApplications,
      activeApplications,
      interviewsCount,
      selectedCount,
      totalTasks,
      completedTasks,
      activities,
      registrations
    ] = await Promise.all([
      prisma.application.count({ where: { userId } }),
      prisma.application.count({ where: { userId, status: { in: ['APPLIED', 'SHORTLISTED', 'INTERVIEW'] } } }),
      prisma.application.count({ where: { userId, status: 'INTERVIEW' } }),
      prisma.application.count({ where: { userId, status: 'SELECTED' } }),
      prisma.task.count({ where: { userId } }),
      prisma.task.count({ where: { userId, isCompleted: true } }),
      prisma.activity.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.opportunityRegistration.findMany({
        where: { studentId: userId },
        include: { opportunity: true }
      })
    ]);

    // Calculate Career Activity metrics
    let hackathons = 0;
    let internships = 0;
    let competitions = 0;
    let workshops = 0;
    let completed = 0;
    let ongoing = 0;

    registrations.forEach((reg) => {
      const type = reg.opportunity?.type;
      if (type === 'HACKATHON') hackathons++;
      else if (type === 'INTERNSHIP') internships++;
      else if (type === 'COMPETITION') competitions++;
      else if (type === 'WORKSHOP') workshops++;

      const computedStatus = getStudentOpportunityStatus(reg.opportunity, reg);
      if (computedStatus === 'COMPLETED') completed++;
      else if (computedStatus === 'ONGOING') ongoing++;
    });

    const stats = {
      total: totalApplications,
      active: activeApplications,
      interviews: interviewsCount,
      selected: selectedCount,
      tasks: { total: totalTasks, completed: completedTasks }
    };

    const careerActivity = {
      hackathons,
      internships,
      competitions,
      workshops,
      completed,
      ongoing,
      total: registrations.length
    };

    return NextResponse.json({
      user: {
        name: user?.name || 'Student',
        email: user?.email || '',
        cgpa: 0,
        department: '',
      },
      stats,
      careerActivity,
      profileCompletion: 85,
      resumeScore: 78,
      activities,
    });
  } catch (error) {
    console.error('Dashboard Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
