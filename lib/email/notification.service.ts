import prisma from '@/lib/prisma';
import { sendEmail } from './email.service';
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

function deduplicateByEmail<T extends { email: string | null }>(users: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const user of users) {
    if (user.email && typeof user.email === 'string') {
      const cleanEmail = user.email.trim().toLowerCase();
      if (cleanEmail.includes('@') && !seen.has(cleanEmail)) {
        seen.add(cleanEmail);
        result.push(user);
      }
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
    select: { id: true, email: true, name: true, role: true }
  });

  // Create in-app notifications in bulk for all target users
  const notificationsData = users.map((u) => ({
    userId: u.id,
    senderId,
    type: 'OPPORTUNITY_POSTED',
    title: `New ${opportunity.type} Opportunity: ${opportunity.title}`,
    message: `${opportunity.organization} has posted a new opportunity. Deadline: ${new Date(opportunity.applicationDeadline).toLocaleDateString()}`,
    relatedEntityId: opportunity.id,
    relatedEntityType: 'OPPORTUNITY',
    link: u.role === 'MENTOR' ? '/dashboard/mentor/opportunities' : '/dashboard/student/opportunities'
  }));

  try {
    await prisma.notification.createMany({ data: notificationsData });
  } catch (err) {
    console.error('Error creating in-app opportunity notifications:', (err as any)?.message || err);
  }

  // Deduplicate recipients for email delivery
  const uniqueUsers = deduplicateByEmail(users);
  const baseUrl = getBaseUrl();

  for (const user of uniqueUsers) {
    if (!user.email) continue;
    const link = `${baseUrl}${user.role === 'MENTOR' ? '/dashboard/mentor/opportunities' : '/dashboard/student/opportunities'}`;
    const html = getOpportunityEmailTemplate({
      title: opportunity.title,
      organization: opportunity.organization,
      type: opportunity.type,
      location: opportunity.location || 'Not specified',
      deadline: new Date(opportunity.applicationDeadline).toLocaleDateString(),
      description: opportunity.description,
      link,
      recipientName: user.name,
    });

    try {
      sendEmail({
        to: user.email,
        subject: `New ${opportunity.type} Opportunity: ${opportunity.title}`,
        html,
      });
    } catch (err) {
      console.error('Error sending opportunity email:', (err as any)?.message || err);
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
    select: { id: true, email: true, name: true, role: true }
  });

  // Create in-app notifications
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
  } catch (err) {
    console.error('Error creating in-app HOD announcement notifications:', (err as any)?.message || err);
  }

  // Deduplicate recipients for email delivery
  const uniqueUsers = deduplicateByEmail(users);
  const baseUrl = getBaseUrl();

  for (const user of uniqueUsers) {
    if (!user.email) continue;
    const html = getHODAnnouncementEmailTemplate({
      title,
      message,
      senderName,
      recipientName: user.name,
      link: `${baseUrl}${user.role === 'STUDENT' ? '/dashboard/student' : '/dashboard/mentor'}`,
    });

    try {
      sendEmail({
        to: user.email,
        subject: `📢 ${title}`,
        html,
      });
    } catch (err) {
      console.error('Error sending HOD announcement email:', (err as any)?.message || err);
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
    select: { id: true, email: true, name: true }
  });

  if (!student) return;

  // Create in-app notification
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
  } catch (err) {
    console.error('Error creating in-app mentor message notification:', (err as any)?.message || err);
  }

  // Send email asynchronously if student email exists
  if (student.email && student.email.includes('@')) {
    const baseUrl = getBaseUrl();
    const html = getMentorMessageEmailTemplate({
      title,
      message,
      mentorName,
      recipientName: student.name,
      link: `${baseUrl}/dashboard/student`,
    });

    try {
      sendEmail({
        to: student.email,
        subject: title,
        html,
      });
    } catch (err) {
      console.error('Error sending mentor message email:', (err as any)?.message || err);
    }
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
    select: { id: true, email: true, name: true }
  });

  // Create in-app notifications in bulk
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
  } catch (err) {
    console.error('Error creating in-app mentor reminder notifications:', (err as any)?.message || err);
  }

  // Deduplicate students for email delivery
  const uniqueStudents = deduplicateByEmail(students);
  const baseUrl = getBaseUrl();
  const link = `${baseUrl}/dashboard/student`;

  for (const student of uniqueStudents) {
    if (!student.email) continue;
    const html = getMentorReminderEmailTemplate({
      title,
      category,
      message,
      dueDate,
      mentorName,
      recipientName: student.name,
      link,
    });

    try {
      sendEmail({
        to: student.email,
        subject: `Reminder: ${title}`,
        html,
      });
    } catch (err) {
      console.error('Error sending mentor reminder email:', (err as any)?.message || err);
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
    select: { email: true, name: true }
  });

  if (!user || !user.email) return;

  const html = getLoginAlertEmailTemplate({
    recipientName: user.name,
    time: new Date().toLocaleString(),
    userAgent,
    ip,
  });

  try {
    sendEmail({
      to: user.email,
      subject: 'New Login to Your CareerAI Account',
      html,
    });
  } catch (err) {
    console.error('Error sending login alert email:', (err as any)?.message || err);
  }
}

export async function sendPasswordResetNotification(params: {
  email: string;
  recipientName: string;
  resetLink: string;
  otp?: string;
}) {
  const { email, recipientName, resetLink, otp } = params;

  const html = getPasswordResetEmailTemplate({
    recipientName,
    resetLink,
    otp,
  });

  return sendEmail({
    to: email,
    subject: 'CareerAI - Reset Your Password',
    html,
  });
}


