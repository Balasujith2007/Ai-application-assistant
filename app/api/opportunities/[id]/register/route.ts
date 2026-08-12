import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: opportunityId } = await params;
    const student = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!student) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId }
    });

    if (!opportunity) {
      return NextResponse.json({ message: 'Opportunity not found.' }, { status: 404 });
    }

    // Check duplicate registration constraint
    const existingRegistration = await prisma.opportunityRegistration.findUnique({
      where: {
        opportunityId_studentId: {
          opportunityId,
          studentId: userId
        }
      }
    });

    if (existingRegistration) {
      return NextResponse.json({
        message: 'You have already registered for this opportunity.'
      }, { status: 400 });
    }

    // Create Registration
    const registration = await prisma.opportunityRegistration.create({
      data: {
        opportunityId,
        studentId: userId,
        status: 'REGISTERED'
      }
    });

    // Also link Application record if not present
    let appType: any = 'JOB';
    if (['HACKATHON', 'INTERNSHIP', 'JOB', 'COMPETITION', 'WORKSHOP', 'SCHOLARSHIP'].includes(opportunity.type)) {
      appType = opportunity.type;
    }

    await prisma.application.create({
      data: {
        userId,
        opportunityId,
        companyName: opportunity.organization,
        position: opportunity.title,
        applicationType: appType,
        applicationUrl: opportunity.registrationUrl || opportunity.opportunityUrl || '',
        location: opportunity.location || 'Online',
        description: opportunity.description,
        status: 'APPLIED',
        appliedDate: new Date(),
        deadline: opportunity.applicationDeadline,
        githubUrl: student.profile?.githubUrl,
        codolioUrl: student.profile?.codolioUrl
      }
    });

    // Notify Opportunity Poster (Mentor/HOD)
    if (opportunity.postedById && opportunity.postedById !== userId) {
      await prisma.notification.create({
        data: {
          userId: opportunity.postedById,
          senderId: userId,
          type: 'OPPORTUNITY_REGISTERED',
          title: `🔔 New Registration`,
          message: `${student.name} registered for: ${opportunity.title}`,
          relatedEntityId: opportunity.id,
          relatedEntityType: 'OPPORTUNITY',
          link: `/dashboard/mentor/opportunities`
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully registered for ${opportunity.title}!`,
      data: registration
    }, { status: 201 });

  } catch (error) {
    console.error('Error registering for opportunity:', error);
    return NextResponse.json({ success: false, message: 'Failed to register for opportunity.' }, { status: 500 });
  }
}
