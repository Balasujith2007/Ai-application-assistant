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

    const userSelect: Prisma.UserSelect = { id: true, name: true, mentorId: true };
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: { user: { select: userSelect } },
    });

    if (!interview || interview.user.mentorId !== mentor.id) {
      return NextResponse.json({ message: 'Interview not found or access denied' }, { status: 404 });
    }

    const body = await req.json();
    const { feedback } = body;

    const interviewUpdateData: Prisma.InterviewUpdateInput = { feedback };
    const updated = await prisma.interview.update({
      where: { id },
      data: interviewUpdateData,
    });

    await prisma.notification.create({
      data: {
        userId: interview.userId,
        title: 'Interview Feedback Added',
        message: `${mentor.name} has added feedback for your ${interview.companyName} interview. Check your interview history.`,
        link: '/interviews',
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Mentor interview feedback error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
