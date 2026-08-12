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
      // 1. Upsert OpportunityRegistration to REGISTERED
      const reg = await tx.opportunityRegistration.upsert({
        where: {
          opportunityId_studentId: {
            opportunityId,
            studentId: userId
          }
        },
        update: {
          status: 'REGISTERED',
          registeredAt: now,
          appliedAt: now
        },
        create: {
          opportunityId,
          studentId: userId,
          status: 'REGISTERED',
          initiatedAt: now,
          appliedAt: now,
          registeredAt: now
        }
      });

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

      // 3. Create Notification for Poster (Mentor / HOD)
      if (opportunity.postedById && opportunity.postedById !== userId) {
        await tx.notification.create({
          data: {
            userId: opportunity.postedById,
            senderId: userId,
            type: 'OPPORTUNITY_REGISTERED',
            title: `🔔 New Registration`,
            message: `New Registration: ${student.name} registered for ${opportunity.title}`,
            relatedEntityId: opportunity.id,
            relatedEntityType: 'OPPORTUNITY',
            link: `/dashboard/mentor/opportunities`
          }
        });
      }

      // 4. Create Notification for Student
      await tx.notification.create({
        data: {
          userId: userId,
          type: 'REGISTRATION_CONFIRMED',
          title: `✓ Registration Confirmed`,
          message: `You successfully registered for: ${opportunity.title} on ${formattedNow}`,
          relatedEntityId: opportunity.id,
          relatedEntityType: 'OPPORTUNITY',
          link: `/dashboard/student/opportunity-history`
        }
      });

      // 5. Create Notification for HOD if student has a mentor or poster is a mentor
      if (student.mentorId) {
        const mentorUser = await tx.user.findUnique({
          where: { id: student.mentorId },
          select: { id: true, name: true }
        });
        if (mentorUser && mentorUser.id !== opportunity.postedById) {
          await tx.notification.create({
            data: {
              userId: mentorUser.id,
              senderId: userId,
              type: 'OPPORTUNITY_REGISTERED',
              title: `🔔 Student Registration`,
              message: `${student.name} registered for ${opportunity.title}`,
              relatedEntityId: opportunity.id,
              relatedEntityType: 'OPPORTUNITY',
              link: `/dashboard/mentor/opportunities`
            }
          });
        }
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
