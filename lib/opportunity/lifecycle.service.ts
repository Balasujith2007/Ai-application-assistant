import prisma from '../prisma';
import {
  sendRegistrationStatusWhatsApp,
  sendDeadlineReminderWhatsApp,
  sendNextProcessWhatsApp,
  sendDisqualificationWhatsApp
} from '../whatsapp/whatsapp.service';

export type OpportunityStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'REGISTRATION_OPEN'
  | 'REGISTRATION_CLOSED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CLOSED';

export type OpportunityRegistrationStatus =
  | 'STARTED'
  | 'INITIATED'
  | 'IN_PROGRESS'
  | 'STUDENT_CONFIRMED'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'REGISTERED'
  | 'ONGOING'
  | 'UNDER_REVIEW'
  | 'SHORTLISTED'
  | 'INTERVIEW'
  | 'SELECTED'
  | 'REJECTED'
  | 'DISQUALIFIED'
  | 'WITHDRAWN'
  | 'FAILED'
  | 'CANCELLED'
  | 'COMPLETED';

export type ApplicationStatus =
  | 'SAVED'
  | 'INITIATED'
  | 'APPLIED'
  | 'UNDER_REVIEW'
  | 'SHORTLISTED'
  | 'INTERVIEW'
  | 'SELECTED'
  | 'REJECTED'
  | 'DISQUALIFIED'
  | 'WITHDRAWN';

export const ApplicationStatus = {
  SAVED: 'SAVED',
  INITIATED: 'INITIATED',
  APPLIED: 'APPLIED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  SHORTLISTED: 'SHORTLISTED',
  INTERVIEW: 'INTERVIEW',
  SELECTED: 'SELECTED',
  REJECTED: 'REJECTED',
  DISQUALIFIED: 'DISQUALIFIED',
  WITHDRAWN: 'WITHDRAWN',
} as const;

export type WorkflowStepType =
  | 'INTERVIEW'
  | 'TECHNICAL_ASSESSMENT'
  | 'DOCUMENT_SUBMISSION'
  | 'EXTERNAL_VERIFICATION'
  | 'JOINING'
  | 'OTHER';

export type WorkflowStepStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'OVERDUE'
  | 'WAIVED';

export type OpportunityReminderType =
  | 'THREE_DAY'
  | 'ONE_DAY'
  | 'DEADLINE_CLOSED'
  | 'CUSTOM';

export const OpportunityReminderType = {
  THREE_DAY: 'THREE_DAY',
  ONE_DAY: 'ONE_DAY',
  DEADLINE_CLOSED: 'DEADLINE_CLOSED',
  CUSTOM: 'CUSTOM',
} as const;

/**
 * Validates whether a student meets all eligibility criteria for an opportunity.
 */
export function validateStudentEligibility(
  student: {
    id: string;
    mentorId?: string | null;
    profile?: {
      department?: string | null;
      year?: number | null;
      section?: string | null;
      cgpa?: number | string | null;
      major?: string | null;
      degree?: string | null;
      skills?: any;
    } | null;
  },
  opportunity: {
    id: string;
    postedById?: string | null;
    targetAudience?: string | null;
    targetDepartment?: string | null;
    targetYear?: number | null;
    targetSection?: string | null;
    minCgpa?: number | null;
    allowedDegrees?: string[] | null;
    allowedYears?: number[] | null;
    requiredSkills?: string[] | null;
  }
): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const profile = student.profile;

  // 1. Target Audience & Scoping validation
  const audience = opportunity.targetAudience || 'ALL_STUDENTS';
  if (audience === 'MY_STUDENTS' && opportunity.postedById) {
    if (student.mentorId !== opportunity.postedById) {
      reasons.push('Opportunity is restricted to students assigned to this mentor.');
    }
  }

  if (opportunity.targetDepartment && profile?.department) {
    if (opportunity.targetDepartment.trim().toLowerCase() !== profile.department.trim().toLowerCase()) {
      reasons.push(`Restricted to ${opportunity.targetDepartment} department.`);
    }
  }

  if (opportunity.targetYear && profile?.year) {
    if (opportunity.targetYear !== profile.year) {
      reasons.push(`Restricted to Year ${opportunity.targetYear} students.`);
    }
  }

  if (opportunity.targetSection && profile?.section) {
    if (opportunity.targetSection.trim().toLowerCase() !== profile.section.trim().toLowerCase()) {
      reasons.push(`Restricted to Section ${opportunity.targetSection}.`);
    }
  }

  // 2. Minimum CGPA Check
  if (opportunity.minCgpa && opportunity.minCgpa > 0) {
    const rawCgpa = profile?.cgpa;
    const studentCgpa = rawCgpa !== null && rawCgpa !== undefined && String(rawCgpa).trim() !== '' ? parseFloat(String(rawCgpa)) : null;
    if (studentCgpa === null || isNaN(studentCgpa)) {
      reasons.push(`Minimum CGPA requirement is ${opportunity.minCgpa}. Student CGPA is not recorded.`);
    } else if (studentCgpa < opportunity.minCgpa) {
      reasons.push(`CGPA ${studentCgpa} does not meet the minimum requirement of ${opportunity.minCgpa}.`);
    }
  }

  // 3. Allowed Degrees Check
  if (opportunity.allowedDegrees && opportunity.allowedDegrees.length > 0) {
    const studentDegree = (profile?.major || (profile as any)?.education?.[0]?.degree || (profile as any)?.degree || '').trim().toLowerCase();
    const match = opportunity.allowedDegrees.some(
      (deg) => deg.trim().toLowerCase() === studentDegree || (studentDegree && studentDegree.includes(deg.trim().toLowerCase()))
    );
    if (!match && studentDegree) {
      reasons.push(`Degree/Major "${studentDegree}" is not in the allowed list (${opportunity.allowedDegrees.join(', ')}).`);
    }
  }

  // 4. Allowed Years Check
  if (opportunity.allowedYears && opportunity.allowedYears.length > 0 && profile?.year) {
    if (!opportunity.allowedYears.includes(profile.year)) {
      reasons.push(`Year ${profile.year} is not in allowed years (${opportunity.allowedYears.join(', ')}).`);
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons
  };
}

/**
 * Initializes scheduled reminders when an opportunity is created or published.
 */
export async function initializeOpportunityReminders(opportunityId: string, deadline: Date) {
  const now = new Date();
  const deadlineTime = new Date(deadline).getTime();
  const nowTime = now.getTime();

  const msPerDay = 24 * 60 * 60 * 1000;
  const threeDaysBefore = new Date(deadlineTime - 3 * msPerDay);
  const oneDayBefore = new Date(deadlineTime - 1 * msPerDay);

  const remindersToCreate: { type: OpportunityReminderType; scheduledFor: Date }[] = [];

  if (threeDaysBefore.getTime() > nowTime) {
    remindersToCreate.push({
      type: OpportunityReminderType.THREE_DAY,
      scheduledFor: threeDaysBefore
    });
  }

  if (oneDayBefore.getTime() > nowTime) {
    remindersToCreate.push({
      type: OpportunityReminderType.ONE_DAY,
      scheduledFor: oneDayBefore
    });
  }

  for (const rem of remindersToCreate) {
    try {
      await prisma.opportunityReminder.upsert({
        where: {
          opportunityId_reminderType: {
            opportunityId,
            reminderType: rem.type
          }
        },
        update: {
          scheduledFor: rem.scheduledFor,
          status: 'SCHEDULED'
        },
        create: {
          opportunityId,
          reminderType: rem.type,
          scheduledFor: rem.scheduledFor,
          status: 'SCHEDULED'
        }
      });
    } catch (err: any) {
      console.warn(`[LifecycleService] Notice initializing reminder for ${opportunityId}:`, err?.message || err);
    }
  }
}

/**
 * Executes automated lifecycle maintenance:
 * 1. Closes opportunities whose registration deadline has expired.
 * 2. Idempotently dispatches 3-day and 1-day deadline reminders.
 * 3. Identifies and updates overdue workflow steps.
 */
export async function processOpportunityLifecycles() {
  const now = new Date();
  let closedCount = 0;
  let remindersSent = 0;
  let overdueStepsUpdated = 0;

  // 1. Auto-close opportunities with expired deadlines
  const expiredOpportunities = await prisma.opportunity.findMany({
    where: {
      status: { in: ['PUBLISHED', 'REGISTRATION_OPEN'] as any },
      applicationDeadline: { lte: now }
    },
    include: {
      postedBy: { select: { id: true, name: true } }
    }
  });

  for (const opp of expiredOpportunities) {
    try {
      await prisma.opportunity.update({
        where: { id: opp.id },
        data: { status: 'CLOSED' }
      });
      closedCount++;

      // Notify opportunity creator that registration has closed
      if (opp.postedById) {
        await prisma.notification.create({
          data: {
            userId: opp.postedById,
            type: 'REGISTRATION_CLOSED',
            title: `Opportunity Closed`,
            message: `Registration for "${opp.title}" has closed automatically at the deadline.`,
            relatedEntityId: opp.id,
            relatedEntityType: 'OPPORTUNITY',
            link: '/dashboard/mentor/opportunities'
          }
        });
      }
    } catch (err: any) {
      console.error(`[LifecycleService] Error closing expired opportunity ${opp.id}:`, err?.message || err);
    }
  }

  // 2. Process Scheduled Deadline Reminders
  const dueReminders = await prisma.opportunityReminder.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledFor: { lte: now }
    },
    include: {
      opportunity: {
        include: {
          registrations: { select: { studentId: true } }
        }
      }
    }
  });

  for (const reminder of dueReminders) {
    const opp = reminder.opportunity;
    if (!opp || (opp.status !== 'PUBLISHED' && opp.status !== 'REGISTRATION_OPEN')) {
      // Opportunity is closed or cancelled -> Skip reminder
      await prisma.opportunityReminder.update({
        where: { id: reminder.id },
        data: { status: 'SKIPPED', failureReason: 'Opportunity is no longer active' }
      });
      continue;
    }

    try {
      const daysRemaining = reminder.reminderType === 'ONE_DAY' ? 1 : 3;

      // Query eligible students for this opportunity
      const studentFilter: any = { role: 'STUDENT', active: true };
      if (opp.targetAudience === 'MY_STUDENTS' && opp.postedById) {
        studentFilter.mentorId = opp.postedById;
      }
      if (opp.targetDepartment) {
        studentFilter.profile = { department: { equals: opp.targetDepartment, mode: 'insensitive' } };
      }

      const students = await prisma.user.findMany({
        where: studentFilter,
        include: { profile: true }
      });

      const eligibleStudents = students.filter((s) => {
        const check = validateStudentEligibility(s, opp);
        return check.eligible;
      });

      let sentCount = 0;
      for (const st of eligibleStudents) {
        // In-app notification
        await prisma.notification.create({
          data: {
            userId: st.id,
            type: 'DEADLINE_REMINDER',
            title: `⏰ Deadline Reminder: ${opp.title}`,
            message: `Registration for ${opp.title} closes in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}. Don't miss out!`,
            relatedEntityId: opp.id,
            relatedEntityType: 'OPPORTUNITY',
            link: '/dashboard/student/opportunities'
          }
        });

        // WhatsApp notification (async safe)
        const phone = (st.notificationPreferences as any)?.whatsappPhone || st.profile?.phone;
        sendDeadlineReminderWhatsApp({
          student: { id: st.id, name: st.name, phone },
          opportunity: {
            id: opp.id,
            title: opp.title,
            type: opp.type,
            applicationDeadline: opp.applicationDeadline
          },
          daysRemaining
        }).catch((err) => {
          console.warn(`[LifecycleService] WhatsApp reminder error for ${st.id}:`, err?.message || err);
        });

        sentCount++;
      }

      await prisma.opportunityReminder.update({
        where: { id: reminder.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          recipientCount: sentCount
        }
      });

      remindersSent += sentCount;
    } catch (err: any) {
      console.error(`[LifecycleService] Reminder dispatch failed for ${reminder.id}:`, err?.message || err);
      await prisma.opportunityReminder.update({
        where: { id: reminder.id },
        data: { status: 'FAILED', failureReason: err?.message || 'Dispatch error' }
      });
    }
  }

  // 3. Mark Overdue Workflow Steps
  const overdueSteps = await prisma.opportunityWorkflowStep.updateMany({
    where: {
      status: { in: ['PENDING', 'IN_PROGRESS'] as any },
      deadline: { lt: now }
    },
    data: {
      status: 'OVERDUE'
    }
  });
  overdueStepsUpdated = overdueSteps.count;

  return {
    closedOpportunities: closedCount,
    remindersSent,
    overdueStepsUpdated,
    timestamp: now.toISOString()
  };
}

/**
 * Valid transitions table for application/registration statuses.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  STARTED: ['INITIATED', 'REGISTERED', 'STUDENT_CONFIRMED', 'CANCELLED', 'WITHDRAWN'],
  INITIATED: ['IN_PROGRESS', 'REGISTERED', 'STUDENT_CONFIRMED', 'CANCELLED', 'WITHDRAWN'],
  IN_PROGRESS: ['STUDENT_CONFIRMED', 'PENDING_VERIFICATION', 'REGISTERED', 'CANCELLED', 'WITHDRAWN'],
  STUDENT_CONFIRMED: ['PENDING_VERIFICATION', 'VERIFIED', 'REGISTERED', 'REJECTED', 'DISQUALIFIED'],
  PENDING_VERIFICATION: ['VERIFIED', 'REGISTERED', 'REJECTED', 'DISQUALIFIED'],
  REGISTERED: ['UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED', 'DISQUALIFIED', 'WITHDRAWN', 'COMPLETED'],
  UNDER_REVIEW: ['SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED', 'DISQUALIFIED', 'WITHDRAWN'],
  SHORTLISTED: ['INTERVIEW', 'SELECTED', 'REJECTED', 'DISQUALIFIED', 'WITHDRAWN'],
  INTERVIEW: ['SELECTED', 'REJECTED', 'DISQUALIFIED', 'WITHDRAWN'],
  VERIFIED: ['UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'REJECTED', 'DISQUALIFIED', 'COMPLETED'],
  SELECTED: ['COMPLETED', 'WITHDRAWN'],
  REJECTED: ['UNDER_REVIEW'],
  DISQUALIFIED: ['UNDER_REVIEW'],
  WITHDRAWN: [],
  COMPLETED: []
};

/**
 * Executes a controlled, audited transition of a student's registration and application status.
 */
export async function transitionRegistrationStatus(params: {
  registrationId: string;
  newStatus: OpportunityRegistrationStatus | string;
  actorId: string;
  reason?: string | null;
  notes?: string | null;
  outcome?: string | null;
  role?: string | null;
  certificateUrl?: string | null;
}) {
  const { registrationId, newStatus, actorId, reason, notes, outcome, role, certificateUrl } = params;

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
    throw new Error('Opportunity registration record not found.');
  }

  const currentStatus = registration.status;

  // Validate status transition rule
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (allowed && !allowed.includes(newStatus) && currentStatus !== newStatus) {
    console.warn(`[LifecycleService] Status transition from ${currentStatus} to ${newStatus} is unconventional.`);
  }

  const now = new Date();
  const updatePayload: any = {
    status: newStatus,
    notes: notes ?? registration.notes,
    outcome: outcome ?? registration.outcome,
    role: role ?? registration.role,
    certificateUrl: certificateUrl ?? registration.certificateUrl,
    updatedAt: now
  };

  if (newStatus === 'VERIFIED') {
    updatePayload.verifiedAt = now;
  }
  if (newStatus === 'REGISTERED' && !registration.registeredAt) {
    updatePayload.registeredAt = now;
  }
  if (newStatus === 'COMPLETED') {
    updatePayload.completedAt = now;
  }

  // Execute database updates in transaction
  const updated = await prisma.$transaction(async (tx: any) => {
    const reg = await tx.opportunityRegistration.update({
      where: { id: registrationId },
      data: updatePayload
    });

    // Record Status History Audit Trail
    await tx.opportunityStatusHistory.create({
      data: {
        registrationId,
        fromStatus: currentStatus,
        toStatus: newStatus,
        changedById: actorId,
        reason: reason || null,
        notes: notes || null
      }
    });

    // Synchronize corresponding Application record if it exists
    let appStatusMap: ApplicationStatus = ApplicationStatus.APPLIED;
    if (newStatus === 'SHORTLISTED') appStatusMap = ApplicationStatus.SHORTLISTED;
    else if (newStatus === 'INTERVIEW') appStatusMap = ApplicationStatus.INTERVIEW;
    else if (newStatus === 'SELECTED') appStatusMap = ApplicationStatus.SELECTED;
    else if (newStatus === 'REJECTED') appStatusMap = ApplicationStatus.REJECTED;
    else if (newStatus === 'DISQUALIFIED') appStatusMap = ApplicationStatus.DISQUALIFIED;
    else if (newStatus === 'UNDER_REVIEW') appStatusMap = ApplicationStatus.UNDER_REVIEW;
    else if (newStatus === 'WITHDRAWN') appStatusMap = ApplicationStatus.WITHDRAWN;

    const existingApp = await tx.application.findFirst({
      where: {
        userId: registration.studentId,
        opportunityId: registration.opportunityId
      }
    });

    if (existingApp) {
      await tx.application.update({
        where: { id: existingApp.id },
        data: {
          status: appStatusMap,
          notes: notes ?? existingApp.notes
        }
      });
    }

    return reg;
  });

  // Multichannel notification to student
  const student = registration.student;
  const oppTitle = registration.opportunity.title;
  const studentPhone = (student.notificationPreferences as any)?.whatsappPhone || student.profile?.phone;

  if (newStatus === 'DISQUALIFIED') {
    await prisma.notification.create({
      data: {
        userId: student.id,
        senderId: actorId,
        type: 'DISQUALIFIED',
        title: `Application Disqualified`,
        message: `Your application for ${oppTitle} has been disqualified.${reason ? ` Reason: ${reason}` : ''}`,
        relatedEntityId: registration.opportunityId,
        relatedEntityType: 'OPPORTUNITY',
        link: '/dashboard/student/opportunities'
      }
    });

    sendDisqualificationWhatsApp({
      student: { id: student.id, name: student.name, phone: studentPhone },
      opportunityTitle: oppTitle,
      reason
    }).catch((err) => console.warn(`[LifecycleService] Disqualification WhatsApp failed:`, err?.message || err));
  } else {
    let statusText = newStatus.toLowerCase();
    if (newStatus === 'SHORTLISTED') statusText = 'shortlisted 🎉';
    else if (newStatus === 'INTERVIEW') statusText = 'invited to interview 🗓️';
    else if (newStatus === 'SELECTED') statusText = 'selected! 🏆';
    else if (newStatus === 'REJECTED') statusText = 'updated (Not Selected)';
    else if (newStatus === 'VERIFIED') statusText = 'verified ✅';

    await prisma.notification.create({
      data: {
        userId: student.id,
        senderId: actorId,
        type: 'REGISTRATION_STATUS_CHANGED',
        title: `Application Status Update`,
        message: `Your application for ${oppTitle} has been ${statusText}.`,
        relatedEntityId: registration.opportunityId,
        relatedEntityType: 'OPPORTUNITY',
        link: '/dashboard/student/opportunities'
      }
    });

    sendRegistrationStatusWhatsApp({
      student: { id: student.id, name: student.name, phone: studentPhone },
      opportunityTitle: oppTitle,
      status: newStatus,
      notes: notes || reason
    }).catch((err) => console.warn(`[LifecycleService] Status WhatsApp failed:`, err?.message || err));
  }

  return updated;
}

/**
 * Adds a Next Process workflow step (e.g. Interview, Technical Assessment, Document Submission).
 */
export async function addWorkflowStep(params: {
  registrationId: string;
  stepType: WorkflowStepType;
  title: string;
  description?: string | null;
  deadline?: Date | null;
  scheduledAt?: Date | null;
  meetingLink?: string | null;
  notes?: string | null;
  actorId: string;
}) {
  const { registrationId, stepType, title, description, deadline, scheduledAt, meetingLink, notes, actorId } = params;

  const registration = await prisma.opportunityRegistration.findUnique({
    where: { id: registrationId },
    include: {
      opportunity: true,
      student: { include: { profile: true } }
    }
  });

  if (!registration) {
    throw new Error('Registration record not found.');
  }

  const step = await prisma.opportunityWorkflowStep.create({
    data: {
      registrationId,
      stepType,
      title: title.trim(),
      description: description ? description.trim() : null,
      deadline: deadline ? new Date(deadline) : null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      meetingLink: meetingLink ? meetingLink.trim() : null,
      notes: notes ? notes.trim() : null,
      status: 'PENDING'
    }
  });

  // Notify student about new workflow step
  const student = registration.student;
  const oppTitle = registration.opportunity.title;
  const phone = (student.notificationPreferences as any)?.whatsappPhone || student.profile?.phone;

  await prisma.notification.create({
    data: {
      userId: student.id,
      senderId: actorId,
      type: 'WORKFLOW_STEP_SCHEDULED',
      title: `Next Step: ${title}`,
      message: `A new step "${title}" (${stepType}) has been scheduled for your application to ${oppTitle}.`,
      relatedEntityId: registration.opportunityId,
      relatedEntityType: 'OPPORTUNITY',
      link: '/dashboard/student/opportunities'
    }
  });

  sendNextProcessWhatsApp({
    student: { id: student.id, name: student.name, phone },
    opportunityTitle: oppTitle,
    stepType,
    title,
    deadline,
    meetingLink
  }).catch((err) => console.warn(`[LifecycleService] Workflow WhatsApp failed:`, err?.message || err));

  return step;
}
