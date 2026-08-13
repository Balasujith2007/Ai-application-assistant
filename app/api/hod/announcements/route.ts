import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { Role } from '@prisma/client';
import { sendHODAnnouncementNotification } from '@/lib/email/notification.service';

async function verifyHOD(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || (user.role !== 'HOD' && user.role !== 'ADMIN')) return null;
  return user;
}

export async function GET(req: Request) {
  try {
    const hod = await verifyHOD(req);
    if (!hod) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { name: true, role: true } } },
    });

    const data = notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      targetUser: n.user.name,
      targetRole: n.user.role,
      createdAt: n.createdAt,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('HOD announcements GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const hod = await verifyHOD(req);
    if (!hod) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { title, message, targetAudience } = body;

    if (!title || !message) {
      return NextResponse.json({ message: 'Title and message are required' }, { status: 400 });
    }

    let targetRoles: Role[] = [Role.STUDENT];
    if (targetAudience === 'MENTORS') {
      targetRoles = [Role.MENTOR];
    } else if (targetAudience === 'ALL') {
      targetRoles = [Role.STUDENT, Role.MENTOR];
    }

    const targetUsers = await prisma.user.findMany({
      where: { role: { in: targetRoles } },
      select: { id: true, role: true },
    });

    if (targetUsers.length > 0) {
      const userIds = targetUsers.map((u) => u.id);
      sendHODAnnouncementNotification({
        userIds,
        senderId: hod.id,
        senderName: hod.name,
        title,
        message,
      });
    }

    const studentCount = targetUsers.filter((u) => u.role === 'STUDENT').length;
    const mentorCount = targetUsers.filter((u) => u.role === 'MENTOR').length;

    let responseMessage = '';
    if (targetAudience === 'STUDENTS') {
      responseMessage = `Announcement sent successfully to ${studentCount} student(s).`;
    } else if (targetAudience === 'MENTORS') {
      responseMessage = `Announcement sent successfully to ${mentorCount} mentor(s).`;
    } else {
      responseMessage = `Announcement sent successfully to ${studentCount} student(s) and ${mentorCount} mentor(s).`;
    }

    return NextResponse.json(
      { success: true, message: responseMessage, recipientCount: targetUsers.length },
      { status: 201 }
    );
  } catch (error) {
    console.error('HOD announcements POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
