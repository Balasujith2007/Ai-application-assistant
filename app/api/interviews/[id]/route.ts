import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { recordCareerActivity } from '@/lib/gamification/badgeTriggers';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const interview = await prisma.interview.update({
      where: { id: (await props.params).id, userId },
      data: body
    });

    // Feedback/attendance updates count as attended; otherwise it is a scheduling change.
    const activityType = interview.feedback && interview.feedback.trim()
      ? 'INTERVIEW_ATTENDED'
      : 'INTERVIEW_SCHEDULED';
    await recordCareerActivity(userId, activityType, interview.id);

    return NextResponse.json(interview);
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await prisma.interview.delete({
      where: { id: (await props.params).id, userId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
