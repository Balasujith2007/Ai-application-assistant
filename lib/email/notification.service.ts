import prisma from '@/lib/prisma';
import { sendEmail } from './email.service';
import {
  getOpportunityEmailTemplate,
  getMentorMessageEmailTemplate,
  getMentorReminderEmailTemplate,
  getLoginAlertEmailTemplate,
  getPasswordResetEmailTemplate,
} from './templates';

type AppUrl = string;

function getBaseUrl(): AppUrl {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
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
    select: { id: true, email: true, name: true }
  });

  // Create in-app notifications in bulk
  const notificationsData = users.map((u) => ({
    userId: u.id,
    senderId,
    type: 'OPPORTUNITY_POSTED',
    title: `New ${opportunity.type} Opportunity: ${opportunity.title}`,
    message: `${opportunity.organization} has posted a new opportunity. Deadline: ${new Date(opportunity.applicationDeadline).toLocaleDateString()}`,
    relatedEntityId: opportunity.id,
    relatedEntityType: 'OPPORTUNITY',
    link: '/dashboard/student/opportunities'
  }));

  try {
    await prisma.notification.createMany({ data: notificationsData });
  } catch (err) {
    console.error('Error creating in-app opportunity notifications:', err);
  }

  // Send emails asynchronously
  const baseUrl = getBaseUrl();
  const link = `${baseUrl}/dashboard/student/opportunities`;

  for (const user of users) {
    if (!user.email) continue;
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

    sendEmail({
      to: user.email,
      subject: `New ${opportunity.type} Opportunity: ${opportunity.title}`,
      html,
    });
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
    console.error('Error creating in-app mentor message notification:', err);
  }

  // Send email asynchronously
  if (student.email) {
    const baseUrl = getBaseUrl();
    const html = getMentorMessageEmailTemplate({
      title,
      message,
      mentorName,
      recipientName: student.name,
      link: `${baseUrl}/dashboard/student`,
    });

    sendEmail({
      to: student.email,
      subject: title,
      html,
    });
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
    console.error('Error creating in-app mentor reminder notifications:', err);
  }

  // Send emails asynchronously
  const baseUrl = getBaseUrl();
  const link = `${baseUrl}/dashboard/student`;

  for (const student of students) {
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

    sendEmail({
      to: student.email,
      subject: `Reminder: ${title}`,
      html,
    });
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

  sendEmail({
    to: user.email,
    subject: 'New Login to Your CareerAI Account',
    html,
  });
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

