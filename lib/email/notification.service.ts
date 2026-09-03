import prisma from '@/lib/prisma';
import { sendEmail, isValidEmail, isDeliverableEmail, validateRecipientEmail } from './email.service';
import {
  getOpportunityEmailTemplate,
  getHODAnnouncementEmailTemplate,
  getMentorMessageEmailTemplate,
  getMentorReminderEmailTemplate,
  getLoginAlertEmailTemplate,
  getPasswordResetEmailTemplate,
} from './templates';

type AppUrl = string;

function getBaseUrl(): AppUrl {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

function deduplicateDeliverableUsers<T extends { email: string | null; name?: string | null; id?: string }>(users: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const user of users) {
    if (user.email && isDeliverableEmail(user.email)) {
      const cleanEmail = user.email.trim().toLowerCase();
      if (!seen.has(cleanEmail)) {
        seen.add(cleanEmail);
        result.push(user);
      }
    } else {
      const validation = validateRecipientEmail(user.email);
      console.warn(`[NotificationService] No valid deliverable recipient email for ${user.name || user.id || 'user'} (${user.email || 'empty'}: ${validation.message || 'skipped'}). In-app notification created; real email skipped.`);
    }
  }
  return result;
}

export async function sendOpportunityNotification(params: {
  userIds: string[];
  senderId: string;
  opportunity: {
    id: string;
    title: string;
    type: string;
    organization: string;
    location: string | null;
    applicationDeadline: Date;
    description: string;
  };
}) {
  const { userIds, senderId, opportunity } = params;
  if (!userIds.length) return;

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true, role: true },
  });

  // 1. Create in-app notifications in bulk for all target users (both real and demo students)
  const notificationsData = users.map((u) => ({
    userId: u.id,
    senderId,
    type: 'OPPORTUNITY_POSTED',
    title: `New ${opportunity.type} Opportunity: ${opportunity.title}`,
    message: `${opportunity.organization} has posted a new opportunity. Deadline: ${new Date(opportunity.applicationDeadline).toLocaleDateString()}`,
    relatedEntityId: opportunity.id,
    relatedEntityType: 'OPPORTUNITY',
    link: u.role === 'MENTOR' ? '/dashboard/mentor/opportunities' : '/dashboard/student/opportunities',
  }));

  try {
    await prisma.notification.createMany({ data: notificationsData });
  } catch (err: any) {
    console.error('[NotificationService] Error creating in-app opportunity notifications:', err?.message || err);
  }

  // 2. Filter and deduplicate deliverable recipients for email delivery
  const deliverableUsers = deduplicateDeliverableUsers(users);
  const baseUrl = getBaseUrl();

  // 3. Send emails asynchronously only to real, deliverable recipients
  for (const user of deliverableUsers) {
    if (!user.email) continue;
    const link = `${baseUrl}${user.role === 'MENTOR' ? '/dashboard/mentor/opportunities' : '/dashboard/student/opportunities'}`;
    const html = getOpportunityEmailTemplate({
      title: opportunity.title,
      organization: opportunity.organization,
      type: opportunity.type,
      location: opportunity.location || 'Online',
      deadline: new Date(opportunity.applicationDeadline).toLocaleDateString(),
      description: opportunity.description,
      link,
      recipientName: user.name || 'Student',
    });

    try {
      sendEmail({
        to: user.email.trim(),
        subject: `New Opportunity: ${opportunity.title}`,
        html,
      }).catch((err) => {
        console.error(`[NotificationService] Email delivery failed for ${user.email}:`, err?.message || err);
      });
    } catch (err: any) {
      console.error(`[NotificationService] Email delivery failed for ${user.email}:`, err?.message || err);
    }
  }
}

export async function sendHODAnnouncementNotification(params: {
  userIds: string[];
  senderId: string;
  senderName: string;
  title: string;
  message: string;
}) {
  const { userIds, senderId, senderName, title, message } = params;
  if (!userIds.length) return;

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true, role: true },
  });

  // 1. Create in-app notifications
  const notificationsData = users.map((u) => ({
    userId: u.id,
    senderId,
    type: 'HOD_ANNOUNCEMENT',
    title: `📢 ${title}`,
    message,
    link: u.role === 'STUDENT' ? '/dashboard/student' : '/dashboard/mentor',
  }));

  try {
    await prisma.notification.createMany({ data: notificationsData });
  } catch (err: any) {
    console.error('[NotificationService] Error creating in-app HOD announcement notifications:', err?.message || err);
  }

  // 2. Send email notifications to deliverable recipients
  const deliverableUsers = deduplicateDeliverableUsers(users);
  const baseUrl = getBaseUrl();

  for (const user of deliverableUsers) {
    if (!user.email) continue;
    const html = getHODAnnouncementEmailTemplate({
      title,
      message,
      senderName,
      recipientName: user.name || 'Student',
      link: `${baseUrl}${user.role === 'STUDENT' ? '/dashboard/student' : '/dashboard/mentor'}`,
    });

    try {
      sendEmail({
        to: user.email.trim(),
        subject: `📢 ${title}`,
        html,
      }).catch((err) => {
        console.error(`[NotificationService] Email delivery failed for ${user.email}:`, err?.message || err);
      });
    } catch (err: any) {
      console.error(`[NotificationService] Email delivery failed for ${user.email}:`, err?.message || err);
    }
  }
}

export async function sendMentorMessageNotification(params: {
  studentId: string;
  senderId?: string;
  mentorName: string;
  title: string;
  message: string;
}) {
  const { studentId, senderId, mentorName, title, message } = params;

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, email: true, name: true },
  });

  if (!student) return;

  // 1. Create in-app notification
  try {
    await prisma.notification.create({
      data: {
        userId: student.id,
        senderId,
        type: 'MENTOR_MESSAGE',
        title,
        message,
        link: '/dashboard/student',
      },
    });
  } catch (err: any) {
    console.error('[NotificationService] Error creating in-app mentor message notification:', err?.message || err);
  }

  // 2. Check if student has a real deliverable email address
  if (!isDeliverableEmail(student.email)) {
    const validation = validateRecipientEmail(student.email);
    console.warn(`[NotificationService] No valid deliverable recipient email for student ${student.name} (${student.email || 'empty'}: ${validation.message || 'demo domain'}). In-app notification created; real email skipped.`);
    return;
  }

  const baseUrl = getBaseUrl();
  const html = getMentorMessageEmailTemplate({
    title,
    message,
    mentorName,
    recipientName: student.name || 'Student',
    link: `${baseUrl}/dashboard/student`,
  });

  try {
    sendEmail({
      to: student.email!.trim(),
      subject: 'Message from Your Mentor - CareerAI',
      html,
    }).catch((err) => {
      console.error(`[NotificationService] Email delivery failed for ${student.email}:`, err?.message || err);
    });
  } catch (err: any) {
    console.error(`[NotificationService] Email delivery failed for ${student.email}:`, err?.message || err);
  }
}

export async function sendMentorReminderNotification(params: {
  studentIds: string[];
  senderId: string;
  mentorName: string;
  title: string;
  category?: string;
  message: string;
  dueDate?: string;
}) {
  const { studentIds, senderId, mentorName, title, category, message, dueDate } = params;
  if (!studentIds.length) return;

  const students = await prisma.user.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, email: true, name: true },
  });

  // 1. Create in-app notifications in bulk
  const notificationsData = students.map((s) => ({
    userId: s.id,
    senderId,
    type: 'REMINDER',
    title: `🔔 ${title}`,
    message: `${category ? `[${category}] ` : ''}${message}${dueDate ? ` (Due: ${dueDate})` : ''}`,
    link: '/dashboard/student',
  }));

  try {
    await prisma.notification.createMany({ data: notificationsData });
  } catch (err: any) {
    console.error('[NotificationService] Error creating in-app mentor reminder notifications:', err?.message || err);
  }

  // 2. Filter deliverable students for email delivery
  const deliverableStudents = deduplicateDeliverableUsers(students);
  const baseUrl = getBaseUrl();
  const link = `${baseUrl}/dashboard/student`;

  for (const student of deliverableStudents) {
    if (!student.email) continue;
    const html = getMentorReminderEmailTemplate({
      title,
      category,
      message,
      dueDate,
      mentorName,
      recipientName: student.name || 'Student',
      link,
    });

    try {
      sendEmail({
        to: student.email.trim(),
        subject: 'Message from Your Mentor - CareerAI',
        html,
      }).catch((err) => {
        console.error(`[NotificationService] Email delivery failed for ${student.email}:`, err?.message || err);
      });
    } catch (err: any) {
      console.error(`[NotificationService] Email delivery failed for ${student.email}:`, err?.message || err);
    }
  }
}

export async function sendLoginAlertNotification(params: {
  userId: string;
  userAgent?: string;
  ip?: string;
}) {
  const { userId, userAgent, ip } = params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (!user || !isDeliverableEmail(user.email)) {
    if (user) {
      const validation = validateRecipientEmail(user.email);
      console.warn(`[NotificationService] Login alert email skipped: ${user.name || user.email} (${validation.message || 'demo domain'}).`);
    }
    return;
  }

  const html = getLoginAlertEmailTemplate({
    recipientName: user.name || 'User',
    time: new Date().toLocaleString(),
    userAgent,
    ip,
  });

  try {
    sendEmail({
      to: user.email!.trim(),
      subject: 'New Login to Your CareerAI Account',
      html,
    }).catch((err) => {
      console.error(`[NotificationService] Email delivery failed for ${user.email}:`, err?.message || err);
    });
  } catch (err: any) {
    console.error(`[NotificationService] Error sending login alert email:`, err?.message || err);
  }
}

export async function sendPasswordResetNotification(params: {
  email: string;
  recipientName: string;
  resetLink: string;
  otp?: string;
}) {
  const { email, recipientName, resetLink, otp } = params;

  const validation = validateRecipientEmail(email);
  if (!validation.deliverable) {
    console.warn(`[NotificationService] Cannot send password reset email: ${validation.message || 'No valid recipient email'} (${email}).`);
    return {
      success: false,
      error: validation.reason === 'DEMO_DOMAIN'
        ? 'Cannot send password reset to demo/fake email domain.'
        : 'No valid recipient email address provided.'
    };
  }

  const html = getPasswordResetEmailTemplate({
    recipientName,
    resetLink,
    otp,
  });

  return sendEmail({
    to: email.trim(),
    subject: 'CareerAI - Reset Your Password',
    html,
  });
}
