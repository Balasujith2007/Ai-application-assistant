import prisma from '../prisma';
import { WhatsAppProvider, SendWhatsAppOptions, SendWhatsAppResult, WhatsAppDeliveryStatus, WhatsAppProviderType } from './types';
import { mockWhatsAppProvider } from './mock.provider';
import { twilioWhatsAppProvider, normalizePhoneNumber } from './twilio.provider';
import { checkWhatsAppRateLimits } from './rateLimiter';
import crypto from 'crypto';

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Returns active WhatsApp provider instance based on environment variables.
 */
export function getActiveWhatsAppProvider(): WhatsAppProvider {
  const providerEnv = (process.env.WHATSAPP_PROVIDER || 'mock').toLowerCase().trim();
  if (providerEnv === 'twilio') {
    return twilioWhatsAppProvider;
  }
  return mockWhatsAppProvider;
}

/**
 * Determines whether real sending is allowed based on explicit environment config.
 */
export function isRealSendEnabled(): boolean {
  const providerEnv = (process.env.WHATSAPP_PROVIDER || 'mock').toLowerCase().trim();
  const allowReal = process.env.WHATSAPP_ALLOW_REAL_SEND === 'true';
  return providerEnv === 'twilio' && allowReal;
}

/**
 * Generates a deterministic idempotency key for notification events.
 */
export function generateIdempotencyKey(parts: (string | number | undefined | null)[]): string {
  const raw = parts.filter(Boolean).join(':');
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
}

/**
 * Core provider-agnostic dispatch function with consent check, rate limiting, and delivery logging.
 */
export async function sendWhatsAppNotification(options: SendWhatsAppOptions): Promise<SendWhatsAppResult> {
  const { to, message, userId, notificationType, metadata, idempotencyKey } = options;

  // 1. Resolve recipient phone
  let targetPhone = to;
  let userPreferences: any = null;

  if (userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });

      if (user) {
        userPreferences = user.notificationPreferences as any;

        // Consent Check: if whatsapp notifications are explicitly turned off by user
        if (userPreferences && userPreferences.whatsapp === false) {
          console.log(`[WhatsAppService] Delivery SKIPPED for user ${userId}: User has opted out of WhatsApp notifications.`);
          await recordDelivery({
            userId,
            recipientPhone: targetPhone || 'OPTED_OUT',
            notificationType: notificationType || 'GENERAL',
            provider: 'mock',
            status: 'SKIPPED',
            failureReason: 'User opted out of WhatsApp notifications',
            idempotencyKey,
            metadata,
          });
          return {
            success: false,
            status: 'SKIPPED',
            provider: 'mock',
            skippedReason: 'User opted out of WhatsApp notifications.',
          };
        }

        // If 'to' is not explicitly provided, fetch from profile or preferences
        if (!targetPhone) {
          targetPhone = userPreferences?.whatsappPhone || user.profile?.phone || '';
        }
      }
    } catch (err: any) {
      console.warn(`[WhatsAppService] Warning fetching user preferences: ${err?.message || err}`);
    }
  }

  // 2. Validate phone number presence
  if (!targetPhone || !targetPhone.trim()) {
    console.warn(`[WhatsAppService] Delivery SKIPPED for user ${userId || 'unknown'}: No phone number found.`);
    await recordDelivery({
      userId,
      recipientPhone: 'MISSING',
      notificationType: notificationType || 'GENERAL',
      provider: 'mock',
      status: 'SKIPPED',
      failureReason: 'No phone number provided or found in user profile',
      idempotencyKey,
      metadata,
    });
    return {
      success: false,
      status: 'SKIPPED',
      provider: 'mock',
      skippedReason: 'No valid recipient phone number provided or registered in user profile.',
    };
  }

  // 3. Normalize phone number
  const phoneValidation = normalizePhoneNumber(targetPhone);
  if (!phoneValidation.valid || !phoneValidation.e164) {
    console.warn(`[WhatsAppService] Delivery FAILED: Invalid phone number (${targetPhone}). ${phoneValidation.error}`);
    await recordDelivery({
      userId,
      recipientPhone: targetPhone,
      notificationType: notificationType || 'GENERAL',
      provider: 'mock',
      status: 'FAILED',
      failureReason: phoneValidation.error || 'Invalid phone number format',
      idempotencyKey,
      metadata,
    });
    return {
      success: false,
      status: 'FAILED',
      provider: 'mock',
      error: phoneValidation.error,
    };
  }

  const cleanPhone = phoneValidation.e164;

  // 4. Idempotency Check (Prevent duplicates)
  if (idempotencyKey) {
    try {
      const existing = await prisma.notificationDelivery.findUnique({
        where: { idempotencyKey },
      });
      if (existing && (existing.status === 'SENT' || existing.status === 'DELIVERED' || existing.status === 'MOCKED')) {
        console.log(`[WhatsAppService] Duplicate notification suppressed for idempotency key ${idempotencyKey}`);
        return {
          success: true,
          status: existing.status as WhatsAppDeliveryStatus,
          provider: existing.provider as WhatsAppProviderType,
          messageId: existing.providerMessageId || undefined,
          recipientPhone: cleanPhone,
        };
      }
    } catch {
      // Table may be initialising
    }
  }

  // 5. Select Provider & Safety Gating
  const realSend = isRealSendEnabled();
  const provider = realSend ? twilioWhatsAppProvider : mockWhatsAppProvider;

  // 6. Rate Limit Verification for Real Twilio sending
  if (realSend) {
    const rateLimit = await checkWhatsAppRateLimits();
    if (!rateLimit.allowed) {
      console.warn(`[WhatsAppService] Real send blocked by rate limiter: ${rateLimit.reason}`);
      await recordDelivery({
        userId,
        recipientPhone: cleanPhone,
        notificationType: notificationType || 'GENERAL',
        provider: 'twilio',
        status: 'FAILED',
        failureReason: rateLimit.reason,
        idempotencyKey,
        metadata,
      });
      return {
        success: false,
        status: 'FAILED',
        provider: 'twilio',
        error: rateLimit.reason,
      };
    }
  }

  // 7. Execute Message Send
  const sendResult = await provider.sendMessage({
    to: cleanPhone,
    message,
    userId,
    notificationType,
    idempotencyKey,
    metadata,
  });

  // 8. Track Delivery in Database
  await recordDelivery({
    userId,
    recipientPhone: cleanPhone,
    notificationType: notificationType || 'GENERAL',
    provider: sendResult.provider,
    providerMessageId: sendResult.messageId,
    status: sendResult.status,
    failureReason: sendResult.error,
    idempotencyKey,
    sentAt: sendResult.success ? new Date() : undefined,
    metadata,
  });

  return sendResult;
}

/**
 * Safely writes delivery record to database without breaking caller flows.
 */
async function recordDelivery(data: {
  userId?: string | null;
  recipientPhone: string;
  notificationType: string;
  provider: string;
  providerMessageId?: string | null;
  status: string;
  failureReason?: string | null;
  idempotencyKey?: string | null;
  sentAt?: Date | null;
  metadata?: any;
}) {
  try {
    let validUserId: string | null = null;
    if (data.userId) {
      try {
        const userExists = await prisma.user.findUnique({
          where: { id: data.userId },
          select: { id: true },
        });
        if (userExists) {
          validUserId = userExists.id;
        }
      } catch {
        // Continue with null userId
      }
    }

    if (data.idempotencyKey) {
      await prisma.notificationDelivery.upsert({
        where: { idempotencyKey: data.idempotencyKey },
        update: {
          status: data.status,
          failureReason: data.failureReason || null,
          providerMessageId: data.providerMessageId || null,
          sentAt: data.sentAt || null,
          updatedAt: new Date(),
        },
        create: {
          userId: validUserId,
          recipientPhone: data.recipientPhone,
          notificationType: data.notificationType,
          provider: data.provider,
          providerMessageId: data.providerMessageId || null,
          status: data.status,
          failureReason: data.failureReason || null,
          idempotencyKey: data.idempotencyKey,
          sentAt: data.sentAt || null,
          metadata: data.metadata ?? undefined,
        },
      });
    } else {
      await prisma.notificationDelivery.create({
        data: {
          userId: validUserId,
          recipientPhone: data.recipientPhone,
          notificationType: data.notificationType,
          provider: data.provider,
          providerMessageId: data.providerMessageId || null,
          status: data.status,
          failureReason: data.failureReason || null,
          sentAt: data.sentAt || null,
          metadata: data.metadata ?? undefined,
        },
      });
    }
  } catch (err: any) {
    console.warn(`[WhatsAppService] Notice: Could not persist delivery record to database: ${err?.message || err}`);
  }
}

// ============================================================
// CONVENIENCE EVENT DISPATCHERS
// ============================================================

/**
 * Dispatches WhatsApp notification for a newly posted Opportunity (Internship/Hackathon/Job).
 */
export async function sendOpportunityWhatsApp(params: {
  student: { id: string; name?: string | null; phone?: string | null };
  opportunity: {
    id: string;
    title: string;
    type: string;
    organization: string;
    applicationDeadline: Date | string;
  };
}): Promise<SendWhatsAppResult> {
  const { student, opportunity } = params;
  const baseUrl = getAppUrl();
  const deadlineStr = new Date(opportunity.applicationDeadline).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const emoji = opportunity.type === 'HACKATHON' ? '⚡' : opportunity.type === 'INTERNSHIP' ? '💼' : '🎯';
  const typeLabel = opportunity.type.charAt(0) + opportunity.type.slice(1).toLowerCase();

  const message = [
    `*CareerAI Opportunity Alert* ${emoji}`,
    ``,
    `Hi ${student.name || 'Student'}, a new ${typeLabel} opportunity is live:`,
    `📌 *${opportunity.title}*`,
    `🏢 *Company:* ${opportunity.organization}`,
    `📅 *Deadline:* ${deadlineStr}`,
    ``,
    `View details & apply on CareerAI:`,
    `${baseUrl}/dashboard/student/opportunities`,
  ].join('\n');

  const idempotencyKey = generateIdempotencyKey(['OPPORTUNITY', opportunity.id, student.id]);

  const templateSid = (process.env.TWILIO_OPPORTUNITY_TEMPLATE_SID || '').trim();
  const contentSid = templateSid ? templateSid : undefined;
  const contentVariables = contentSid
    ? {
        '1': student.name || 'Student',
        '2': typeLabel,
        '3': opportunity.title,
        '4': opportunity.organization,
        '5': deadlineStr,
        '6': `${baseUrl}/dashboard/student/opportunities`,
      }
    : undefined;

  return sendWhatsAppNotification({
    to: student.phone || '',
    userId: student.id,
    notificationType: `OPPORTUNITY_${opportunity.type}`,
    message,
    idempotencyKey,
    contentSid,
    contentVariables,
    metadata: {
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      type: opportunity.type,
      templateSid: contentSid || null,
    },
  });
}

export interface BroadcastDeliverySummary {
  opportunityId: string;
  opportunityTitle: string;
  opportunityType: string;
  totalStudents: number;
  validPhoneCount: number;
  optedInCount: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  details: {
    studentId: string;
    studentName: string;
    status: WhatsAppDeliveryStatus;
    reason?: string;
  }[];
}

/**
 * Broadcasts WhatsApp notification for a newly posted internship/hackathon opportunity to ALL registered students.
 * Respects student consent (opt-in/opt-out), rate limits, phone normalization, and duplicate suppression.
 */
export async function broadcastOpportunityToAllStudents(opportunity: {
  id: string;
  title: string;
  type: string;
  organization: string;
  applicationDeadline: Date | string;
}): Promise<BroadcastDeliverySummary> {
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT', active: true },
    select: {
      id: true,
      name: true,
      notificationPreferences: true,
      profile: { select: { phone: true } },
    },
  });

  const summary: BroadcastDeliverySummary = {
    opportunityId: opportunity.id,
    opportunityTitle: opportunity.title,
    opportunityType: opportunity.type,
    totalStudents: students.length,
    validPhoneCount: 0,
    optedInCount: 0,
    sentCount: 0,
    skippedCount: 0,
    failedCount: 0,
    details: [],
  };

  for (const student of students) {
    const phone = (student.notificationPreferences as any)?.whatsappPhone || student.profile?.phone;
    const isOptedOut = (student.notificationPreferences as any)?.whatsapp === false;

    if (phone && phone.trim()) {
      summary.validPhoneCount++;
    }
    if (!isOptedOut) {
      summary.optedInCount++;
    }

    try {
      const result = await sendOpportunityWhatsApp({
        student: { id: student.id, name: student.name, phone },
        opportunity,
      });

      if (result.status === 'SENT' || result.status === 'MOCKED' || result.success) {
        summary.sentCount++;
      } else if (result.status === 'SKIPPED') {
        summary.skippedCount++;
      } else {
        summary.failedCount++;
      }

      summary.details.push({
        studentId: student.id,
        studentName: student.name || 'Student',
        status: result.status,
        reason: result.error || result.skippedReason,
      });
    } catch (err: any) {
      summary.failedCount++;
      summary.details.push({
        studentId: student.id,
        studentName: student.name || 'Student',
        status: 'FAILED',
        reason: err?.message || 'Dispatch error',
      });
    }
  }

  console.log(`[WhatsAppService] Broadcast Opportunity Summary for "${opportunity.title}" (${opportunity.type}): Total=${summary.totalStudents}, Sent/Mocked=${summary.sentCount}, Skipped=${summary.skippedCount}, Failed=${summary.failedCount}`);

  return summary;
}

/**
 * Dispatches WhatsApp notification for Registration Status Changes (Approved / Rejected / Shortlisted / Selected).
 */
export async function sendRegistrationStatusWhatsApp(params: {
  student: { id: string; name?: string | null; phone?: string | null };
  opportunityTitle: string;
  status: string;
  notes?: string | null;
}): Promise<SendWhatsAppResult> {
  const { student, opportunityTitle, status, notes } = params;
  const baseUrl = getAppUrl();

  let statusEmoji = '📢';
  let statusText = status;

  if (status === 'VERIFIED' || status === 'STUDENT_CONFIRMED') {
    statusEmoji = '✅';
    statusText = 'Verified & Confirmed';
  } else if (status === 'SHORTLISTED') {
    statusEmoji = '🎉';
    statusText = 'Shortlisted';
  } else if (status === 'SELECTED') {
    statusEmoji = '🏆';
    statusText = 'Selected';
  } else if (status === 'REJECTED' || status === 'FAILED') {
    statusEmoji = 'ℹ️';
    statusText = 'Not Selected';
  }

  const message = [
    `*CareerAI Application Update* ${statusEmoji}`,
    ``,
    `Hi ${student.name || 'Student'},`,
    `Your application status for *${opportunityTitle}* has been updated to: *${statusText}*.`,
    notes ? `📝 *Feedback:* ${notes}` : '',
    ``,
    `Check your full application status on CareerAI:`,
    `${baseUrl}/dashboard/student/opportunities`,
  ].filter(Boolean).join('\n');

  const idempotencyKey = generateIdempotencyKey(['REG_STATUS', student.id, opportunityTitle, status]);

  return sendWhatsAppNotification({
    to: student.phone || '',
    userId: student.id,
    notificationType: `REGISTRATION_${status}`,
    message,
    idempotencyKey,
    metadata: {
      opportunityTitle,
      status,
    },
  });
}

/**
 * Sends one restricted test message for authorized Admin verification.
 */
export async function sendTestWhatsAppMessage(params: {
  recipientPhone: string;
  adminUserId: string;
  customText?: string;
}): Promise<SendWhatsAppResult> {
  const { recipientPhone, adminUserId, customText } = params;

  const messageText = customText || 'CareerAI WhatsApp Integration Test 🚀';
  const idempotencyKey = generateIdempotencyKey(['ADMIN_TEST', adminUserId, recipientPhone, Date.now()]);

  return sendWhatsAppNotification({
    to: recipientPhone,
    userId: adminUserId,
    notificationType: 'ADMIN_TEST',
    message: messageText,
    idempotencyKey,
    metadata: {
      testTriggeredBy: adminUserId,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Dispatches WhatsApp deadline reminder (3-day or 1-day).
 */
export async function sendDeadlineReminderWhatsApp(params: {
  student: { id: string; name?: string | null; phone?: string | null };
  opportunity: { id: string; title: string; type: string; applicationDeadline: Date | string };
  daysRemaining: number;
}): Promise<SendWhatsAppResult> {
  const { student, opportunity, daysRemaining } = params;
  const baseUrl = getAppUrl();
  const deadlineStr = new Date(opportunity.applicationDeadline).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const urgencyEmoji = daysRemaining <= 1 ? '🚨' : '⏳';
  const timeframe = daysRemaining <= 1 ? 'tomorrow' : `in ${daysRemaining} days`;

  const message = [
    `*CareerAI Deadline Reminder* ${urgencyEmoji}`,
    ``,
    `Hi ${student.name || 'Student'},`,
    `The application deadline for *${opportunity.title}* closes ${timeframe} on *${deadlineStr}*.`,
    ``,
    `Don't miss out! Submit your registration here:`,
    `${baseUrl}/dashboard/student/opportunities`,
  ].join('\n');

  const reminderTag = daysRemaining <= 1 ? '1DAY' : '3DAY';
  const idempotencyKey = generateIdempotencyKey(['DEADLINE_REMINDER', reminderTag, opportunity.id, student.id]);

  return sendWhatsAppNotification({
    to: student.phone || '',
    userId: student.id,
    notificationType: `DEADLINE_REMINDER_${reminderTag}`,
    message,
    idempotencyKey,
    metadata: {
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      daysRemaining,
    },
  });
}

/**
 * Dispatches WhatsApp notification for next process step (e.g. Interview or Assessment).
 */
export async function sendNextProcessWhatsApp(params: {
  student: { id: string; name?: string | null; phone?: string | null };
  opportunityTitle: string;
  stepType: string;
  title: string;
  deadline?: Date | string | null;
  meetingLink?: string | null;
}): Promise<SendWhatsAppResult> {
  const { student, opportunityTitle, stepType, title, deadline, meetingLink } = params;
  const baseUrl = getAppUrl();
  const stepLabel = stepType === 'INTERVIEW' ? 'Interview Scheduled 🗓️' : 'Next Action Required 📋';

  const message = [
    `*CareerAI: ${stepLabel}*`,
    ``,
    `Hi ${student.name || 'Student'},`,
    `A new step has been scheduled for your application to *${opportunityTitle}*:`,
    `📌 *${title}*`,
    deadline ? `⏰ *Deadline / Date:* ${new Date(deadline).toLocaleString()}` : '',
    meetingLink ? `🔗 *Meeting / Portal Link:* ${meetingLink}` : '',
    ``,
    `View instructions and status:`,
    `${baseUrl}/dashboard/student/opportunities`,
  ].filter(Boolean).join('\n');

  const idempotencyKey = generateIdempotencyKey(['WORKFLOW_STEP', student.id, opportunityTitle, title]);

  return sendWhatsAppNotification({
    to: student.phone || '',
    userId: student.id,
    notificationType: `WORKFLOW_STEP_${stepType}`,
    message,
    idempotencyKey,
    metadata: {
      opportunityTitle,
      stepType,
      title,
    },
  });
}

/**
 * Dispatches WhatsApp notification when student is disqualified with clear reason.
 */
export async function sendDisqualificationWhatsApp(params: {
  student: { id: string; name?: string | null; phone?: string | null };
  opportunityTitle: string;
  reason?: string | null;
}): Promise<SendWhatsAppResult> {
  const { student, opportunityTitle, reason } = params;
  const baseUrl = getAppUrl();

  const message = [
    `*CareerAI Application Status Update* ℹ️`,
    ``,
    `Hi ${student.name || 'Student'},`,
    `Your application for *${opportunityTitle}* has been updated to *Disqualified*.`,
    reason ? `⚠️ *Reason:* ${reason}` : '',
    ``,
    `If you have questions, please reach out to your mentor.`,
    `Explore more opportunities on CareerAI:`,
    `${baseUrl}/dashboard/student/opportunities`,
  ].filter(Boolean).join('\n');

  const idempotencyKey = generateIdempotencyKey(['DISQUALIFIED', student.id, opportunityTitle, reason || 'none']);

  return sendWhatsAppNotification({
    to: student.phone || '',
    userId: student.id,
    notificationType: 'DISQUALIFIED',
    message,
    idempotencyKey,
    metadata: {
      opportunityTitle,
      reason,
    },
  });
}
