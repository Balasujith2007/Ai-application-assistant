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

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const mentor = await getMentor(req);
    if (!mentor) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const whereClause: Prisma.UserWhereInput = { id, mentorId: mentor.id };
    const student = await prisma.user.findFirst({ where: whereClause });
    if (!student) {
      return NextResponse.json({ message: 'Student not found or not assigned to you' }, { status: 404 });
    }

    const body = await req.json();
    const message = body.message ||
      `Your mentor ${mentor.name} has sent you a reminder. Please check your profile and keep your progress updated.`;

    const notification = await prisma.notification.create({
      data: {
        userId: student.id,
        title: `Reminder from ${mentor.name}`,
        message,
        link: '/dashboard/student',
      },
    });

    return NextResponse.json({ data: notification, message: 'Reminder sent successfully' });
  } catch (error) {
    console.error('Mentor remind student error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
