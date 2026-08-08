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

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const mentor = await getMentor(req);
    if (!mentor) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userSelect: Prisma.UserSelect = { id: true, mentorId: true };
    const resume = await prisma.resume.findUnique({
      where: { id },
      include: { user: { select: userSelect } },
    });

    if (!resume || resume.user.mentorId !== mentor.id) {
      return NextResponse.json({ message: 'Resume not found or access denied' }, { status: 404 });
    }

    const body = await req.json();
    const { reviewStatus, reviewFeedback } = body;

    const resumeUpdateData: Prisma.ResumeUpdateInput = {
      reviewStatus,
      reviewFeedback,
      reviewedAt: new Date(),
    };

    const updated = await prisma.resume.update({
      where: { id },
      data: resumeUpdateData,
    });

    const statusLabel =
      reviewStatus === 'REVIEWED'
        ? 'reviewed and approved'
        : reviewStatus === 'CHANGES_REQUESTED'
        ? 'reviewed — changes requested'
        : 'pending review';

    await prisma.notification.create({
      data: {
        userId: resume.userId,
        title: 'Resume Review Update',
        message: `Your resume has been ${statusLabel} by ${mentor.name}. ${reviewFeedback ? `Feedback: "${reviewFeedback.substring(0, 80)}..."` : ''}`,
        link: '/dashboard/student',
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Mentor resume review error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
