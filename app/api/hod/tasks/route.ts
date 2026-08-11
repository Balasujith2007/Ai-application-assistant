import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';

async function verifyHOD(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'HOD') return null;
  return user;
}

export async function GET(req: Request) {
  try {
    const hod = await verifyHOD(req);
    if (!hod) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const tasks = await prisma.task.findMany({
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const total = tasks.length;
    const completed = tasks.filter((t) => t.isCompleted).length;
    const pending = total - completed;

    return NextResponse.json({
      data: tasks,
      stats: { total, completed, pending },
    });
  } catch (error) {
    console.error('HOD tasks API GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const hod = await verifyHOD(req);
    if (!hod) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { title, targetRole, studentId, priority, deadline } = body;

    if (!title) {
      return NextResponse.json({ message: 'Title is required' }, { status: 400 });
    }

    let targetUserIds: string[] = [];

    if (studentId) {
      targetUserIds = [studentId];
    } else if (targetRole === 'MENTORS') {
      const mentors = await prisma.user.findMany({ where: { role: 'MENTOR' }, select: { id: true } });
      targetUserIds = mentors.map((m) => m.id);
    } else {
      // Default: all students
      const students = await prisma.user.findMany({ where: { role: 'STUDENT' }, select: { id: true } });
      targetUserIds = students.map((s) => s.id);
    }

    const createdTasks = await Promise.all(
      targetUserIds.map((uid) =>
        prisma.task.create({
          data: {
            userId: uid,
            title,
            priority: priority || 'MEDIUM',
            deadline: deadline ? new Date(deadline) : null,
          },
        })
      )
    );

    return NextResponse.json({ message: `Task assigned to ${createdTasks.length} user(s)` }, { status: 201 });
  } catch (error) {
    console.error('HOD tasks API POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
