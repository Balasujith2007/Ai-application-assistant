import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { validateStudentEligibility } from '@/lib/opportunity/lifecycle.service';
import { isOpportunityOpen } from '@/lib/utils';
import { OpportunityRegistrationStatus } from '@prisma/client';

export async function POST(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
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

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { externalRegistrationId, confirmationEvidenceUrl, verificationMethod, notes } = body;

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

    // 1. Validate Opportunity Availability & Deadline
    const isOpen = isOpportunityOpen(opportunity.applicationDeadline || opportunity.deadline, opportunity.status);
    if (!isOpen || opportunity.status === 'CLOSED' || opportunity.status === 'CANCELLED' || opportunity.status === 'REGISTRATION_CLOSED') {
      return NextResponse.json({
        message: 'Registration for this opportunity is closed or expired.'
      }, { status: 400 });
    }

    // 2. Validate Student Eligibility
    const eligibilityCheck = validateStudentEligibility(student, opportunity);
    if (!eligibilityCheck.eligible) {
      return NextResponse.json({
        message: `You are not eligible for this opportunity: ${eligibilityCheck.reasons.join('; ')}`,
        reasons: eligibilityCheck.reasons
      }, { status: 400 });
    }

    // 3. Check duplicate registration constraint
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

    // Determine initial status based on registration type / verification mechanism
    let initialStatus: OpportunityRegistrationStatus = 'REGISTERED';
    if (verificationMethod === 'EXTENSION' && externalRegistrationId) {
      initialStatus = 'VERIFIED';
    } else if (confirmationEvidenceUrl) {
      initialStatus = 'PENDING_VERIFICATION';
    }

    const now = new Date();

    // 4. Create Registration in Transaction
    const registration = await prisma.$transaction(async (tx) => {
      const reg = await tx.opportunityRegistration.create({
        data: {
          opportunityId,
          studentId: userId,
          status: initialStatus,
          verificationMethod: verificationMethod || (confirmationEvidenceUrl ? 'STUDENT_CONFIRMATION' : 'MANUAL'),
          externalRegistrationId: externalRegistrationId ? String(externalRegistrationId).trim() : null,
          confirmationEvidenceUrl: confirmationEvidenceUrl ? String(confirmationEvidenceUrl).trim() : null,
          notes: notes ? String(notes).trim() : null,
          startedAt: now,
          appliedAt: now,
          registeredAt: initialStatus === 'REGISTERED' || initialStatus === 'VERIFIED' ? now : null,
          verifiedAt: initialStatus === 'VERIFIED' ? now : null
        }
      });

      // Record status history audit trail
      await tx.opportunityStatusHistory.create({
        data: {
          registrationId: reg.id,
          fromStatus: 'STARTED',
          toStatus: initialStatus,
          changedById: userId,
          reason: 'Initial Registration',
          notes: notes ? String(notes).trim() : null
        }
      });

      // Also create or link Application record
      let appType: any = 'JOB';
      if (['HACKATHON', 'INTERNSHIP', 'JOB', 'COMPETITION', 'WORKSHOP', 'SCHOLARSHIP'].includes(opportunity.type)) {
        appType = opportunity.type;
      }

      await tx.application.create({
        data: {
          userId,
          opportunityId,
          companyName: opportunity.organization,
          position: opportunity.title,
          applicationType: appType,
          applicationUrl: opportunity.registrationUrl || opportunity.opportunityUrl || '',
          location: opportunity.location || 'Online',
          description: opportunity.description,
          status: initialStatus === 'VERIFIED' ? 'APPLIED' : (initialStatus === 'PENDING_VERIFICATION' ? 'INITIATED' : 'APPLIED'),
          appliedDate: now,
          deadline: opportunity.applicationDeadline,
          githubUrl: student.profile?.githubUrl,
          codolioUrl: student.profile?.codolioUrl
        }
      });

      return reg;
    });

    // 5. Notifications (safe execution)
    // A. Notify Student Confirmation
    await prisma.notification.create({
      data: {
        userId,
        senderId: opportunity.postedById,
        type: 'REGISTRATION_CONFIRMATION',
        title: `Registration Confirmed 🎉`,
        message: `You have successfully registered for "${opportunity.title}".`,
        relatedEntityId: opportunity.id,
        relatedEntityType: 'OPPORTUNITY',
        link: `/dashboard/student/opportunities`
      }
    }).catch((err) => console.warn('Student confirmation notification failed:', err));

    // B. Notify Opportunity Poster (Mentor/HOD)
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
      }).catch((err) => console.warn('Poster notification failed:', err));
    }

    return NextResponse.json({
      success: true,
      message: `Successfully registered for ${opportunity.title}!`,
      data: registration
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error registering for opportunity:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Failed to register for opportunity.' }, { status: 500 });
  }
}

