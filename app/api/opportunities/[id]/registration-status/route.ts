import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { getStudentOpportunityStatus } from '@/lib/opportunityUtils';

export async function GET(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await context.params;
    const opportunityId = resolvedParams?.id;

    if (!opportunityId) {
      return NextResponse.json({ message: 'Opportunity ID is required.' }, { status: 400 });
    }

    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      select: {
        id: true,
        title: true,
        role: true,
        companyName: true,
        organization: true,
        status: true,
        applicationDeadline: true,
        deadline: true,
        startDate: true,
        endDate: true
      }
    });

    if (!opportunity) {
      return NextResponse.json({ message: 'Opportunity not found.' }, { status: 404 });
    }

    const registration: any = await prisma.opportunityRegistration.findFirst({
      where: {
        opportunityId,
        studentId: userId
      }
    });

    const isVerified = registration?.status === 'VERIFIED';
    const isStudentConfirmed = registration?.status === 'STUDENT_CONFIRMED';
    const isInProgress = registration?.status === 'IN_PROGRESS';
    const isStarted = registration?.status === 'STARTED' || registration?.status === 'INITIATED';
    const isRegistered = Boolean(
      registration && ['VERIFIED', 'STUDENT_CONFIRMED', 'REGISTERED', 'SHORTLISTED', 'SELECTED', 'COMPLETED'].includes(registration.status)
    );

    const calculatedStatus = getStudentOpportunityStatus(opportunity, registration);

    return NextResponse.json({
      success: true,
      opportunityId,
      isRegistered,
      isVerified,
      isStudentConfirmed,
      isInProgress,
      isStarted,
      status: calculatedStatus,
      rawStatus: registration?.status || 'NOT_REGISTERED',
      registration: registration || null
    });
  } catch (error) {
    console.error('Error fetching registration status:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch registration status.' }, { status: 500 });
  }
}
