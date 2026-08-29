import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';

export async function POST(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await context.params;
    const registrationOrOppId = resolvedParams?.id;

    if (!registrationOrOppId) {
      return NextResponse.json({ message: 'Opportunity or Registration ID is required.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { outcome, role, certificateUrl, notes, completedAt } = body;

    // Find registration by ID or (opportunityId + studentId)
    const registration = await prisma.opportunityRegistration.findFirst({
      where: {
        studentId: userId,
        OR: [
          { id: registrationOrOppId },
          { opportunityId: registrationOrOppId }
        ]
      }
    });

    if (!registration) {
      return NextResponse.json({ message: 'Registration record not found.' }, { status: 404 });
    }

    const updated = await prisma.opportunityRegistration.update({
      where: { id: registration.id },
      data: {
        status: 'COMPLETED',
        completedAt: completedAt ? new Date(completedAt) : new Date(),
        outcome: outcome || 'Completed',
        role: role || undefined,
        certificateUrl: certificateUrl || undefined,
        notes: notes || undefined
      },
      include: { opportunity: true }
    });

    return NextResponse.json({
      success: true,
      message: '✓ Saved to history',
      registration: updated
    });

  } catch (error) {
    console.error('Error completing opportunity history record:', error);
    return NextResponse.json({ success: false, message: 'Failed to update history.' }, { status: 500 });
  }
}
