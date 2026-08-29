import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { isOpportunityOpen } from '@/lib/utils';

export async function POST(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized', message: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await context.params;
    const opportunityId = resolvedParams?.id;

    if (!opportunityId) {
      return NextResponse.json({ success: false, error: 'Opportunity ID is required.', message: 'Opportunity ID is required.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

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

    const now = new Date();
    const formattedNow = `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

    let appType: any = 'JOB';
    if (['HACKATHON', 'INTERNSHIP', 'JOB', 'COMPETITION', 'WORKSHOP', 'SCHOLARSHIP'].includes(opportunity.type)) {
      appType = opportunity.type;
    }

    const registrationUrl = opportunity.registrationUrl || opportunity.opportunityUrl || opportunity.applyUrl || '';

    // Extract requested action / verification method
    const requestedAction = body.action || (body.verificationMethod === 'EXTENSION' ? 'VERIFY' : 'CONFIRM');
    const registrationId = body.registrationId || body.externalRegistrationId || null;
    const notes = body.notes || null;
    const evidenceUrl = body.evidenceUrl || body.confirmationEvidenceUrl || null;

    // Handle "Not yet" -> Set status to IN_PROGRESS
    if (requestedAction === 'IN_PROGRESS') {
      const updatedReg = await prisma.opportunityRegistration.upsert({
        where: {
          opportunityId_studentId: {
            opportunityId,
            studentId: userId
          }
        },
        update: {
          status: 'IN_PROGRESS' as any,
          updatedAt: now
        },
        create: {
          opportunityId,
          studentId: userId,
          status: 'IN_PROGRESS' as any,
          startedAt: now,
          initiatedAt: now
        }
      });

      return NextResponse.json({
        success: true,
        status: 'IN_PROGRESS',
        message: 'Registration marked as In Progress.',
        registration: updatedReg
      });
    }

    // Determine target status and verification method
    const isExtensionVerified = requestedAction === 'VERIFY' || body.verificationMethod === 'EXTENSION';
    const targetStatus: any = isExtensionVerified ? 'VERIFIED' : 'STUDENT_CONFIRMED';
    const verificationMethod = isExtensionVerified ? 'EXTENSION' : 'STUDENT_CONFIRMATION';

    // Execute in a transaction to guarantee data integrity
    const [registration, application] = await prisma.$transaction(async (tx: any) => {
      // 1. Upsert OpportunityRegistration
      const existingReg: any = await tx.opportunityRegistration.findUnique({
        where: {
          opportunityId_studentId: {
            opportunityId,
            studentId: userId
          }
        }
      });

      const wasAlreadyCompleted = existingReg && ['VERIFIED', 'STUDENT_CONFIRMED', 'REGISTERED'].includes(existingReg.status);

      let reg;
      if (!existingReg) {
        reg = await tx.opportunityRegistration.create({
          data: {
            opportunityId,
            studentId: userId,
            status: targetStatus as any,
            verificationMethod,
            verifiedAt: isExtensionVerified ? now : null,
            confirmedAt: !isExtensionVerified ? now : null,
            externalRegistrationId: registrationId,
            confirmationEvidenceUrl: evidenceUrl,
            notes,
            startedAt: now,
            initiatedAt: now,
            appliedAt: now,
            registeredAt: now
          }
        });
      } else {
        reg = await tx.opportunityRegistration.update({
          where: { id: existingReg.id },
          data: {
            status: targetStatus as any,
            verificationMethod,
            verifiedAt: isExtensionVerified ? now : existingReg.verifiedAt,
            confirmedAt: !isExtensionVerified ? now : existingReg.confirmedAt,
            externalRegistrationId: registrationId || existingReg.externalRegistrationId,
            confirmationEvidenceUrl: evidenceUrl || existingReg.confirmationEvidenceUrl,
            notes: notes || existingReg.notes,
            appliedAt: existingReg.appliedAt || now,
            registeredAt: existingReg.registeredAt || now
          }
        });
      }

      // 2. Upsert Application record to APPLIED
      const existingApp: any = await tx.application.findFirst({
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
            appliedDate: existingApp.appliedDate || now,
            applicationUrl: registrationUrl
          }
        });
      }

      // 3. Create Notifications if newly completed
      if (!wasAlreadyCompleted) {
        const titlePrefix = isExtensionVerified ? '✓ Registration Verified' : 'Registration Confirmed (Student)';
        const mentorMsg = isExtensionVerified
          ? `${student.name} registration for ${opportunity.title} was automatically verified by CareerAI Apply Agent.`
          : `${student.name} marked registration as Student Confirmed for ${opportunity.title}${registrationId ? ` (ID: ${registrationId})` : ''}.`;

        if (student.mentorId) {
          await tx.notification.create({
            data: {
              userId: student.mentorId,
              senderId: userId,
              type: 'OPPORTUNITY_REGISTERED',
              title: titlePrefix,
              message: mentorMsg,
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
            title: isExtensionVerified ? '✓ Registration Verified' : 'Registration Marked as Student Confirmed',
            message: isExtensionVerified
              ? `CareerAI detected your successful registration for: ${opportunity.title} on ${formattedNow}`
              : `Your registration for ${opportunity.title} was marked as Student Confirmed on ${formattedNow}.`,
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
      status: targetStatus,
      verificationMethod,
      message: isExtensionVerified
        ? '✓ Registration Verified'
        : 'Registration marked as Student Confirmed.',
      registeredAt: now.toISOString(),
      formattedRegisteredAt: formattedNow,
      externalRegistrationId: registrationId,
      registration,
      application
    });

  } catch (error) {
    console.error('Error verifying/confirming opportunity registration:', error);
    return NextResponse.json({ success: false, error: 'Registration confirmation failed.', message: 'Registration confirmation failed.' }, { status: 500 });
  }
}
