import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';

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

    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      include: {
        profile: true,
        mentor: { select: { name: true } },
        resumes: { where: { isActive: true }, take: 1 },
        applications: true,
        interviews: true,
        tasks: true,
      },
      orderBy: { name: 'asc' },
    });

    const studentMetrics = students.map((s) => {
      const hasResume = s.resumes.length > 0;
      const appsCount = s.applications.length;
      const interviewsCount = s.interviews.length;
      const completedTasks = s.tasks.filter((t) => t.isCompleted).length;
      const totalTasks = s.tasks.length;

      // Calculate readiness score (0 - 100%)
      let readiness = 0;
      if (hasResume) readiness += 40;
      if (appsCount > 0) readiness += 30;
      if (interviewsCount > 0) readiness += 15;
      if (completedTasks > 0) readiness += 15;

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        registerNo: s.profile?.registerNo ?? '—',
        department: s.profile?.department ?? '—',
        year: s.profile?.year ?? null,
        section: s.profile?.section ?? null,
        mentorName: s.mentor?.name ?? 'Unassigned',
        hasResume,
        applicationsCount: appsCount,
        interviewsCount,
        completedTasks,
        totalTasks,
        readinessScore: readiness,
        needsAttention: !hasResume || (appsCount === 0 && readiness < 50),
      };
    });

    const highReadiness = studentMetrics.filter((m) => m.readinessScore >= 70);
    const needingAttention = studentMetrics.filter((m) => m.needsAttention);
    const noResume = studentMetrics.filter((m) => !m.hasResume);

    return NextResponse.json({
      data: {
        students: studentMetrics,
        summary: {
          totalStudents: students.length,
          highReadinessCount: highReadiness.length,
          needingAttentionCount: needingAttention.length,
          noResumeCount: noResume.length,
        },
      },
    });
  } catch (error) {
    console.error('HOD progress error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
