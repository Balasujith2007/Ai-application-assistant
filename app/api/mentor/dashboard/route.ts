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

export async function GET(req: Request) {
  try {
    const mentor = await getMentor(req);
    if (!mentor) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const whereClause: Prisma.UserWhereInput = { role: 'STUDENT' };

    const students = await prisma.user.findMany({
      where: whereClause,
      include: {
        resumes: { orderBy: { uploadedAt: 'desc' }, take: 1 },
        applications: { where: { deadline: { gte: now, lte: nextWeek } } },
        interviews: { where: { date: { gte: todayStart, lt: todayEnd } } },
        activities: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    const studentIds = students.map((s) => s.id);

    // Pending resume reviews
    const resumeWhere: Prisma.ResumeWhereInput = {
      userId: { in: studentIds },
      reviewStatus: 'PENDING_REVIEW',
      isActive: true,
    };
    const pendingResumes = await prisma.resume.count({ where: resumeWhere });

    const todayInterviews = await prisma.interview.count({
      where: { userId: { in: studentIds }, date: { gte: todayStart, lt: todayEnd } },
    });

    const upcomingDeadlines = await prisma.application.count({
      where: { userId: { in: studentIds }, deadline: { gte: now, lte: nextWeek } },
    });

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const attentionStudents = students.filter((s) => {
      const hasResume = s.resumes.length > 0;
      const hasRecentActivity =
        s.activities.length > 0 && new Date(s.activities[0].createdAt) > thirtyDaysAgo;
      return !hasResume || !hasRecentActivity;
    }).slice(0, 5).map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      issue: !s.resumes.length ? 'No Resume Uploaded' : 'No Recent Activity',
      priority: !s.resumes.length ? 'High' : 'Medium',
    }));

    const upcomingInterviewsList = await prisma.interview.findMany({
      where: { userId: { in: studentIds }, date: { gte: now } },
      orderBy: { date: 'asc' },
      take: 5,
      include: { user: { select: { name: true } } },
    });

    const notifications = await prisma.notification.findMany({
      where: { userId: mentor.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentActivities = await prisma.activity.findMany({
      where: { userId: { in: studentIds } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { user: { select: { name: true } } },
    });

    return NextResponse.json({
      data: {
        stats: {
          assignedStudents: students.length,
          pendingResumes,
          todayInterviews,
          upcomingDeadlines,
        },
        attentionStudents,
        upcomingInterviews: upcomingInterviewsList.map((i) => ({
          id: i.id,
          student: i.user.name,
          company: i.companyName,
          role: i.role,
          date: i.date,
          time: i.time,
          type: i.type,
        })),
        notifications,
        recentActivities: recentActivities.map((a) => ({
          id: a.id,
          title: a.title,
          student: a.user.name,
          type: a.type,
          createdAt: a.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Mentor dashboard error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
