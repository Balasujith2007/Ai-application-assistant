import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { isOpportunityOpen, formatDate } from '@/lib/utils';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized', message: 'Unauthorized' }, { status: 401 });
    }

    const { id: opportunityId } = await params;

    const student = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        resumes: {
          where: { isActive: true },
          orderBy: { uploadedAt: 'desc' },
          take: 1
        }
      }
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'Student account not found.', message: 'Student account not found.' }, { status: 404 });
    }

    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId }
    });

    if (!opportunity) {
      return NextResponse.json({ success: false, error: 'Opportunity not found.', message: 'Opportunity not found.' }, { status: 404 });
    }

    if (!isOpportunityOpen(opportunity.applicationDeadline, opportunity.status)) {
      return NextResponse.json({ success: false, error: 'Application deadline has passed.', message: 'Application deadline has passed.' }, { status: 400 });
    }

    const now = new Date();
    const formattedNow = `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

    let appType: any = 'JOB';
    if (['HACKATHON', 'INTERNSHIP', 'JOB', 'COMPETITION', 'WORKSHOP', 'SCHOLARSHIP'].includes(opportunity.type)) {
      appType = opportunity.type;
    }

    const registrationUrl = opportunity.registrationUrl || opportunity.opportunityUrl || opportunity.applyUrl || '';

    // Execute in a transaction to guarantee data integrity
    const [registration, application] = await prisma.$transaction(async (tx) => {
      // 1. Check existing OpportunityRegistration and its status before updating
      const existingReg = await tx.opportunityRegistration.findUnique({
        where: {
          opportunityId_studentId: {
            opportunityId,
            studentId: userId
          }
        }
      });

      const isAlreadyRegistered = existingReg?.status === 'REGISTERED';

      let reg;
      if (!existingReg) {
        reg = await tx.opportunityRegistration.create({
          data: {
            opportunityId,
            studentId: userId,
            status: 'REGISTERED',
            initiatedAt: now,
            appliedAt: now,
            registeredAt: now
          }
        });
      } else if (!isAlreadyRegistered) {
        reg = await tx.opportunityRegistration.update({
          where: { id: existingReg.id },
          data: {
            status: 'REGISTERED',
            registeredAt: now,
            appliedAt: now
          }
        });
      } else {
        reg = existingReg;
      }

      // 2. Upsert Application record to APPLIED
      let existingApp = await tx.application.findFirst({
        where: { userId, opportunityId }
      });

      let app;
      if (!existingApp) {
        app = await tx.application.create({
          data: {
            userId,
            opportunityId,
            companyName: opportunity.organization || opportunity.companyName || 'Host Organization',
            position: opportunity.title || opportunity.role || 'Participant',
            applicationType: appType,
            applicationUrl: registrationUrl,
            location: opportunity.location || 'Online',
            description: opportunity.description,
            status: 'APPLIED',
            appliedDate: now,
            deadline: opportunity.applicationDeadline,
            githubUrl: student.profile?.githubUrl,
            codolioUrl: student.profile?.codolioUrl
          }
        });
      } else {
        app = await tx.application.update({
          where: { id: existingApp.id },
          data: {
            status: 'APPLIED',
            appliedDate: now,
            applicationUrl: registrationUrl
          }
        });
      }

      // 3. Create Notifications ONLY IF not already registered
      if (!isAlreadyRegistered) {
        // Send notification ONLY to assigned mentor if present
        if (student.mentorId) {
          await tx.notification.create({
            data: {
              userId: student.mentorId,
              senderId: userId,
              type: 'OPPORTUNITY_REGISTERED',
              title: 'New Registration',
              message: `${student.name} registered for ${opportunity.title} (${opportunity.type}).`,
              relatedEntityId: opportunity.id,
              relatedEntityType: 'OPPORTUNITY',
              link: '/dashboard/mentor/opportunities'
            }
          });
        }

        // Notification for Student
        await tx.notification.create({
          data: {
            userId: userId,
            type: 'REGISTRATION_CONFIRMED',
            title: '✓ Registration Confirmed',
            message: `You successfully registered for: ${opportunity.title} on ${formattedNow}`,
            relatedEntityId: opportunity.id,
            relatedEntityType: 'OPPORTUNITY',
            link: '/dashboard/student/opportunity-history'
          }
        });
      }

      return [reg, app];
    });

    return NextResponse.json({
      success: true,
      message: '✓ Registration Confirmed',
      registeredAt: now.toISOString(),
      formattedRegisteredAt: formattedNow,
      registration,
      application
    });

  } catch (error) {
    console.error('Error confirming opportunity registration:', error);
    return NextResponse.json({ success: false, error: 'Registration confirmation failed.', message: 'Registration confirmation failed.' }, { status: 500 });
  }
}
