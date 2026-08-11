import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';

async function getMentor(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || (user.role !== 'MENTOR' && user.role !== 'HOD' && user.role !== 'ADMIN')) return null;
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

    const resume = await prisma.resume.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!resume) {
      return NextResponse.json({ message: 'Resume not found' }, { status: 404 });
    }

    // Verify security: prevent reviewing student assigned to another mentor
    if (resume.user.mentorId && resume.user.mentorId !== mentor.id && mentor.role !== 'HOD' && mentor.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Access denied: student is assigned to another mentor' }, { status: 403 });
    }

    // If student has no mentor assigned, assign to current mentor
    if (!resume.user.mentorId && mentor.role === 'MENTOR') {
      await prisma.user.update({
        where: { id: resume.userId },
        data: { mentorId: mentor.id },
      });
    }

    const body = await req.json();
    const { reviewStatus, reviewFeedback } = body;

    const updated = await prisma.resume.update({
      where: { id },
      data: {
        reviewStatus,
        reviewFeedback,
        reviewedAt: new Date(),
      },
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
        message: `Your resume "${resume.originalName || resume.fileName}" has been ${statusLabel} by ${mentor.name}.${reviewFeedback ? ` Feedback: "${reviewFeedback}"` : ''}`,
        link: '/resume',
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Mentor resume review error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
