import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { getStudentOpportunityStatus } from '@/lib/opportunityUtils';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: opportunityId } = await params;

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

    const registration = await prisma.opportunityRegistration.findFirst({
      where: {
        opportunityId,
        studentId: userId
      }
    });

    const calculatedStatus = getStudentOpportunityStatus(opportunity, registration);

    return NextResponse.json({
      success: true,
      opportunityId,
      isRegistered: !!registration && (registration.status === 'REGISTERED' || registration.status === 'SHORTLISTED' || registration.status === 'SELECTED' || registration.status === 'COMPLETED'),
      status: calculatedStatus,
      rawStatus: registration?.status || 'NOT_REGISTERED',
      registration: registration || null
    });
  } catch (error) {
    console.error('Error fetching registration status:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch registration status.' }, { status: 500 });
  }
}
