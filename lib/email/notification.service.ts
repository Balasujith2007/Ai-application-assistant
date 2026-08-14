import prisma from '@/lib/prisma';
import { sendEmail, isValidEmail } from './email.service';
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
    if (user.email && isValidEmail(user.email)) {
      const cleanEmail = user.email.trim().toLowerCase();
      if (!seen.has(cleanEmail)) {
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
    select: { id: true, email: true, name: true, role: true },
  });

  // 1. Create in-app notifications in bulk for all target users
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
    console.error('Error creating in-app opportunity notifications:', err?.message || err);
  }

  // 2. Filter and deduplicate recipients for email delivery
  const uniqueUsers = deduplicateByEmail(users);
  const baseUrl = getBaseUrl();

  // Log users that do not have valid emails
  for (const user of users) {
    if (!isValidEmail(user.email)) {
      console.warn(`Cannot send email: User does not have a valid email address (${user.name || user.id}: ${user.email || 'empty'}).`);
    }
  }

  // 3. Send emails asynchronously
  for (const user of uniqueUsers) {
    if (!user.email || !isValidEmail(user.email)) continue;
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
        console.error(`Email delivery failed for ${user.email}:`, err?.message || err);
      });
    } catch (err: any) {
      console.error(`Email delivery failed for ${user.email}:`, err?.message || err);
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
    console.error('Error creating in-app HOD announcement notifications:', err?.message || err);
  }

  // 2. Send email notifications
  const uniqueUsers = deduplicateByEmail(users);
  const baseUrl = getBaseUrl();

  for (const user of users) {
    if (!isValidEmail(user.email)) {
      console.warn(`Cannot send email: User does not have a valid email address (${user.name || user.id}: ${user.email || 'empty'}).`);
    }
  }

  for (const user of uniqueUsers) {
    if (!user.email || !isValidEmail(user.email)) continue;
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
        console.error(`Email delivery failed for ${user.email}:`, err?.message || err);
      });
    } catch (err: any) {
      console.error(`Email delivery failed for ${user.email}:`, err?.message || err);
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
    console.error('Error creating in-app mentor message notification:', err?.message || err);
  }

  // 2. Send email asynchronously if student email is valid
  if (!isValidEmail(student.email)) {
    console.warn(`Cannot send email: User does not have a valid email address (${student.name || student.id}: ${student.email || 'empty'}).`);
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
      console.error(`Email delivery failed for ${student.email}:`, err?.message || err);
    });
  } catch (err: any) {
    console.error(`Email delivery failed for ${student.email}:`, err?.message || err);
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
    console.error('Error creating in-app mentor reminder notifications:', err?.message || err);
  }

  // 2. Deduplicate and filter students for email delivery
  const uniqueStudents = deduplicateByEmail(students);
  const baseUrl = getBaseUrl();
  const link = `${baseUrl}/dashboard/student`;

  for (const student of students) {
    if (!isValidEmail(student.email)) {
      console.warn(`Cannot send email: User does not have a valid email address (${student.name || student.id}: ${student.email || 'empty'}).`);
    }
  }

  for (const student of uniqueStudents) {
    if (!student.email || !isValidEmail(student.email)) continue;
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
        console.error(`Email delivery failed for ${student.email}:`, err?.message || err);
      });
    } catch (err: any) {
      console.error(`Email delivery failed for ${student.email}:`, err?.message || err);
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

  if (!user || !isValidEmail(user.email)) {
    if (user) {
      console.warn(`Cannot send email: User does not have a valid email address (${user.name || user.email || 'empty'}).`);
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
      console.error(`Email delivery failed for ${user.email}:`, err?.message || err);
    });
  } catch (err: any) {
    console.error(`Error sending login alert email:`, err?.message || err);
  }
}

export async function sendPasswordResetNotification(params: {
  email: string;
  recipientName: string;
  resetLink: string;
  otp?: string;
}) {
  const { email, recipientName, resetLink, otp } = params;

  if (!isValidEmail(email)) {
    console.warn(`Cannot send email: User does not have a valid email address (${email}).`);
    return { success: false, error: 'Invalid recipient email' };
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



