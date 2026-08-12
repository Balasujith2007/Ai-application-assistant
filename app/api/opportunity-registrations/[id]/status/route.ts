import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: registrationId } = await params;
    const body = await req.json();
    const { status, notes } = body;

    if (!status) {
      return NextResponse.json({ message: 'Status is required.' }, { status: 400 });
    }

    const registration = await prisma.opportunityRegistration.findUnique({
      where: { id: registrationId },
      include: { opportunity: true, student: true }
    });

    if (!registration) {
      return NextResponse.json({ message: 'Registration record not found.' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'MENTOR' && user.role !== 'HOD' && user.role !== 'PLACEMENT_CELL' && user.role !== 'ADMIN')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.opportunityRegistration.update({
      where: { id: registrationId },
      data: {
        status: status as any,
        notes: notes ?? registration.notes
      }
    });

    // Notify student about status change
    let statusText = status.toLowerCase();
    if (status === 'SHORTLISTED') statusText = 'shortlisted 🎉';
    else if (status === 'SELECTED') statusText = 'selected! 🏆';
    else if (status === 'REJECTED') statusText = 'updated (Not Selected)';

    await prisma.notification.create({
      data: {
        userId: registration.studentId,
        senderId: userId,
        type: 'REGISTRATION_STATUS_CHANGED',
        title: `Registration Status Update`,
        message: `Your registration for ${registration.opportunity.title} has been ${statusText}.`,
        relatedEntityId: registration.opportunityId,
        relatedEntityType: 'OPPORTUNITY',
        link: '/dashboard/student/opportunities'
      }
    });

    return NextResponse.json({
      success: true,
      data: updated
    });

  } catch (error) {
    console.error('Error updating registration status:', error);
    return NextResponse.json({ success: false, message: 'Failed to update registration status.' }, { status: 500 });
  }
}
