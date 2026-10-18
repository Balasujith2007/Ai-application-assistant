import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { sendRegistrationStatusWhatsApp } from '@/lib/whatsapp/whatsapp.service';
import { verificationLedger } from '@/lib/leaderboard/verificationLedger';
import { createNotification } from '@/lib/notifications/notificationService';

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized', message: 'Unauthorized' }, { status: 401 });
    }

    const { id: opportunityId } = await props.params;

    if (!opportunityId) {
      return NextResponse.json({ success: false, error: 'Opportunity ID is required.' }, { status: 400 });
    }

    const reviewer = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!reviewer) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    // Role check: Only MENTOR, HOD, PLACEMENT_CELL, ADMIN, SUPER_ADMIN can perform reviews
    const allowedRoles = ['MENTOR', 'HOD', 'PLACEMENT_CELL', 'ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(reviewer.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to review student registrations.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { evidenceId, registrationId, action, reviewerNotes, rejectionReason } = body;

    if (!action || (action !== 'APPROVE' && action !== 'REJECT')) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Expected APPROVE or REJECT.' },
        { status: 400 }
      );
    }

    // Locate evidence record
    let evidence = null;
    if (evidenceId) {
      evidence = await prisma.registrationEvidence.findUnique({
        where: { id: evidenceId },
        include: {
          student: { include: { profile: true } },
          opportunity: true,
          registration: true
        }
      });
    } else if (registrationId) {
      evidence = await prisma.registrationEvidence.findFirst({
        where: { registrationId },
        orderBy: { submittedAt: 'desc' },
        include: {
          student: { include: { profile: true } },
          opportunity: true,
          registration: true
        }
      });
    }

    // If no evidence record exists but registrationId is provided
    let registration: any = evidence?.registration || null;
    if (!registration && registrationId) {
      registration = await prisma.opportunityRegistration.findUnique({
        where: { id: registrationId }
      });
    }

    if (!registration) {
      return NextResponse.json(
        { success: false, error: 'Registration record not found.' },
        { status: 404 }
      );
    }

    // CRITICAL SECURITY RULE: Prevent students from reviewing or approving their own evidence!
    if (reviewer.id === registration.studentId) {
      return NextResponse.json(
        { success: false, error: 'Security Violation: You cannot review or approve your own registration evidence.' },
        { status: 403 }
      );
    }

    const opportunity = evidence?.opportunity || await prisma.opportunity.findUnique({
      where: { id: opportunityId }
    });

    const student = evidence?.student || await prisma.user.findUnique({
      where: { id: registration.studentId },
      include: { profile: true }
    });

    const now = new Date();
    const formattedNow = `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

    if (action === 'APPROVE') {
      // 1. Update RegistrationEvidence
      if (evidence) {
        await prisma.registrationEvidence.update({
          where: { id: evidence.id },
          data: {
            status: 'VERIFIED',
            reviewDecision: 'APPROVED',
            reviewerId: reviewer.id,
            reviewerNotes: reviewerNotes || 'Verified by authorized reviewer',
            reviewedAt: now,
            isAuthentic: true
          }
        });
      }

      // 2. Update OpportunityRegistration
      const updatedRegistration = await prisma.opportunityRegistration.update({
        where: { id: registration.id },
        data: {
          status: 'VERIFIED' as any,
          verificationMethod: 'MANUAL_REVIEW',
          verifiedAt: now,
          confirmedAt: registration.confirmedAt || now,
          appliedAt: registration.appliedAt || now,
          notes: reviewerNotes ? `Reviewer Notes: ${reviewerNotes}` : registration.notes
        }
      });

      // 3. Update Application status to APPLIED
      await prisma.application.updateMany({
        where: { userId: registration.studentId, opportunityId },
        data: {
          status: 'APPLIED',
          statusSource: 'MENTOR_VERIFIED',
          statusConfidence: 1.0,
          statusUpdatedAt: now
        }
      });

      // 4. Record Audit History
      await prisma.opportunityStatusHistory.create({
        data: {
          registrationId: registration.id,
          fromStatus: registration.status,
          toStatus: 'VERIFIED',
          changedById: reviewer.id,
          reason: 'Manual verification approved',
          notes: reviewerNotes || `Approved by ${reviewer.name} (${reviewer.role})`
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: reviewer.id,
          action: 'APPROVE_REGISTRATION_VERIFICATION',
          target: `OpportunityRegistration:${registration.id}`,
          details: JSON.stringify({
            studentId: registration.studentId,
            opportunityId,
            evidenceId: evidence?.id,
            reviewerNotes
          })
        }
      });

      // 4b. Record to Verified Activity Ledger for Class Leaderboard
      const oppType = opportunity?.type || 'OTHER';
      const isHack = oppType === 'HACKATHON' || oppType === 'COMPETITION';
      const isIntern = oppType === 'INTERNSHIP' || oppType === 'JOB' || oppType === 'FULL_TIME';

      if (isHack || isIntern) {
        await verificationLedger.recordActivity({
          studentId: registration.studentId,
          sourceType: isHack ? 'HACKATHON' : 'INTERNSHIP',
          sourcePlatform: 'CAREERAI',
          sourceAccountId: registration.id,
          activityType: isHack ? 'HACKATHON_REGISTRATION' : 'INTERNSHIP_APPLICATION',
          externalActivityId: `${isHack ? 'hackathon-reg' : 'intern-app'}-${registration.id}`,
          opportunityId,
          verificationStatus: 'VERIFIED',
          verificationMethod: 'REVIEWER_APPROVAL',
          evidenceReference: evidence?.evidenceFileUrl || undefined,
          occurredAt: now,
          reviewerId: reviewer.id,
          rawMetadata: { title: opportunity?.title, reviewedBy: reviewer.name },
        });
      }

      // 5. Notify Student
      await createNotification({
        userId: registration.studentId,
        senderId: reviewer.id,
        type: 'REGISTRATION_VERIFIED',
        title: '✓ Registration Verified',
        message: `Your registration for "${opportunity?.title || 'the opportunity'}" has been verified by ${reviewer.name}.`,
        relatedEntityId: opportunityId,
        relatedEntityType: 'OPPORTUNITY',
        link: '/dashboard/student/opportunity-history'
      });

      // WhatsApp dispatch if enabled
      if (student) {
        const studentPhone = (student.notificationPreferences as any)?.whatsappPhone || student.profile?.phone;
        sendRegistrationStatusWhatsApp({
          student: { id: student.id, name: student.name, phone: studentPhone },
          opportunityTitle: opportunity?.title || 'Opportunity',
          status: 'VERIFIED',
          notes: reviewerNotes,
        }).catch((err) => {
          console.error('[ReviewRoute] WhatsApp dispatch error:', err?.message || err);
        });
      }

      return NextResponse.json({
        success: true,
        status: 'VERIFIED',
        message: `Registration successfully verified for ${student?.name || 'student'}.`,
        registration: updatedRegistration
      });

    } else {
      // REJECT action
      if (!rejectionReason || !rejectionReason.trim()) {
        return NextResponse.json(
          { success: false, error: 'A rejection reason is required when rejecting evidence.' },
          { status: 400 }
        );
      }

      // 1. Update RegistrationEvidence
      if (evidence) {
        await prisma.registrationEvidence.update({
          where: { id: evidence.id },
          data: {
            status: 'REJECTED',
            reviewDecision: 'REJECTED',
            reviewerId: reviewer.id,
            reviewerNotes: rejectionReason.trim(),
            reviewedAt: now,
            isAuthentic: false
          }
        });
      }

      // 2. Update OpportunityRegistration
      const updatedRegistration = await prisma.opportunityRegistration.update({
        where: { id: registration.id },
        data: {
          status: 'REJECTED' as any,
          notes: `Rejection Reason: ${rejectionReason.trim()}`
        }
      });

      // 3. Record Audit History
      await prisma.opportunityStatusHistory.create({
        data: {
          registrationId: registration.id,
          fromStatus: registration.status,
          toStatus: 'REJECTED',
          changedById: reviewer.id,
          reason: 'Manual verification rejected',
          notes: rejectionReason.trim()
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: reviewer.id,
          action: 'REJECT_REGISTRATION_VERIFICATION',
          target: `OpportunityRegistration:${registration.id}`,
          details: JSON.stringify({
            studentId: registration.studentId,
            opportunityId,
            evidenceId: evidence?.id,
            reason: rejectionReason.trim()
          })
        }
      });

      // 4. Notify Student
      await createNotification({
        userId: registration.studentId,
        senderId: reviewer.id,
        type: 'REGISTRATION_REJECTED',
        title: 'Registration Evidence Rejected',
        message: `Your confirmation evidence for "${opportunity?.title || 'the opportunity'}" was reviewed and rejected. Reason: ${rejectionReason.trim()}`,
        relatedEntityId: opportunityId,
        relatedEntityType: 'OPPORTUNITY',
        link: '/dashboard/student/opportunity-history'
      });

      return NextResponse.json({
        success: true,
        status: 'REJECTED',
        message: 'Registration evidence has been rejected.',
        registration: updatedRegistration
      });
    }

  } catch (error: any) {
    console.error('Error handling manual review:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error processing review.' },
      { status: 500 }
    );
  }
}
