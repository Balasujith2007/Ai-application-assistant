import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { transitionRegistrationStatus } from '@/lib/opportunity/lifecycle.service';
import { OpportunityRegistrationStatus } from '@prisma/client';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: registrationId } = await params;
    const body = await req.json();
    const { status, reason, notes, outcome, role, certificateUrl } = body;

    if (!status) {
      return NextResponse.json({ message: 'Status is required.' }, { status: 400 });
    }

    const registration = await prisma.opportunityRegistration.findUnique({
      where: { id: registrationId },
      include: {
        opportunity: true,
        student: {
          include: { profile: true }
        }
      }
    });

    if (!registration) {
      return NextResponse.json({ message: 'Registration record not found.' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'MENTOR' && user.role !== 'HOD' && user.role !== 'PLACEMENT_CELL' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // If DISQUALIFIED, require reason
    if (status === 'DISQUALIFIED' && (!reason || !reason.trim())) {
      return NextResponse.json({
        message: 'A disqualification reason is required (e.g. Eligibility mismatch, Missed deadline, Failed verification).'
      }, { status: 400 });
    }

    const updated = await transitionRegistrationStatus({
      registrationId,
      newStatus: status as OpportunityRegistrationStatus,
      actorId: userId,
      reason,
      notes,
      outcome,
      role,
      certificateUrl
    });

    return NextResponse.json({
      success: true,
      data: updated
    });

  } catch (error: any) {
    console.error('Error updating registration status:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Failed to update registration status.' }, { status: 500 });
  }
}

