import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { getStudentOpportunityStatus } from '@/lib/opportunityUtils';

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userPromise = prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    // Aggregate stats efficiently using groupBy to minimize round trips to DB
    const [
      user,
      appGroups,
      taskGroups,
      activities,
      registrations
    ] = await Promise.all([
      userPromise,
      prisma.application.groupBy({
        by: ['status'],
        where: { userId },
        _count: { _all: true },
      }),
      prisma.task.groupBy({
        by: ['isCompleted'],
        where: { userId },
        _count: { _all: true },
      }),
      prisma.activity.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      prisma.opportunityRegistration.findMany({
        where: { studentId: userId },
        include: { opportunity: true }
      })
    ]);

    let totalApplications = 0;
    let activeApplications = 0;
    let interviewsCount = 0;
    let selectedCount = 0;

    for (const group of appGroups) {
      const count = group._count._all;
      totalApplications += count;
      if (group.status === 'APPLIED' || group.status === 'SHORTLISTED' || group.status === 'INTERVIEW') {
        activeApplications += count;
      }
      if (group.status === 'INTERVIEW') {
        interviewsCount += count;
      }
      if (group.status === 'SELECTED') {
        selectedCount += count;
      }
    }

    let totalTasks = 0;
    let completedTasks = 0;
    for (const group of taskGroups) {
      const count = group._count._all;
      totalTasks += count;
      if (group.isCompleted) {
        completedTasks += count;
      }
    }

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
