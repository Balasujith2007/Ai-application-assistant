import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import type { Prisma } from '@prisma/client';

async function getMentor(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'MENTOR') return null;
  return user;
}

// GET: List tasks assigned by mentor to their students
export async function GET(req: Request) {
  try {
    const mentor = await getMentor(req);
    if (!mentor) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const mentorStudentsWhere: Prisma.UserWhereInput = { mentorId: mentor.id };
    const students = await prisma.user.findMany({
      where: mentorStudentsWhere,
      select: { id: true },
    });
    const studentIds = students.map((s) => s.id);

    const tasks = await prisma.task.findMany({
      where: { userId: { in: studentIds } },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: tasks });
  } catch (error) {
    console.error('Mentor tasks GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a task for an assigned student
export async function POST(req: Request) {
  try {
    const mentor = await getMentor(req);
    if (!mentor) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { studentId, title, category, priority, deadline } = body;

    if (!studentId || !title) {
      return NextResponse.json({ message: 'studentId and title are required' }, { status: 400 });
    }

    // Verify student is assigned to mentor
    const student = await prisma.user.findFirst({
      where: { id: studentId, mentorId: mentor.id } as Prisma.UserWhereInput,
    });

    if (!student) {
      return NextResponse.json({ message: 'Student not assigned to you' }, { status: 404 });
    }

    const task = await prisma.task.create({
      data: {
        userId: studentId,
        title,
        category: category || 'PREPARATION',
        priority: priority || 'MEDIUM',
        deadline: deadline ? new Date(deadline) : null,
      },
    });

    // Notify student
    await prisma.notification.create({
      data: {
        userId: studentId,
        title: 'New Task Assigned',
        message: `${mentor.name} assigned you a new task: "${title}"`,
        link: '/tasks',
      },
    });

    return NextResponse.json({ data: task, message: 'Task assigned successfully' });
  } catch (error) {
    console.error('Mentor tasks POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
