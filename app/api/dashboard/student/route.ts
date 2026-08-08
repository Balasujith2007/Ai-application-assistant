import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';

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
      activities
    ] = await Promise.all([
      prisma.application.count({ where: { userId } }),
      prisma.application.count({ where: { userId, status: { in: ['APPLIED', 'SHORTLISTED', 'INTERVIEW'] } } }),
      prisma.application.count({ where: { userId, status: 'INTERVIEW' } }),
      prisma.application.count({ where: { userId, status: 'SELECTED' } }),
      prisma.task.count({ where: { userId } }),
      prisma.task.count({ where: { userId, isCompleted: true } }),
      prisma.activity.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 })
    ]);

    const stats = {
      total: totalApplications,
      active: activeApplications,
      interviews: interviewsCount,
      selected: selectedCount,
      tasks: { total: totalTasks, completed: completedTasks }
    };

    return NextResponse.json({
      user: {
        name: user?.name || 'Student',
        email: user?.email || '',
        cgpa: 0,
        department: '',
      },
      stats,
      profileCompletion: 85, // Mocked for now
      resumeScore: 78,       // Mocked for now
      activities,
    });
  } catch (error) {
    console.error('Dashboard Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
