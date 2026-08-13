import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { sendMentorReminderNotification } from '@/lib/email/notification.service';

async function getMentor(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || (user.role !== 'MENTOR' && user.role !== 'HOD' && user.role !== 'ADMIN')) return null;
  return user;
}

export async function POST(req: Request) {
  try {
    const mentor = await getMentor(req);
    if (!mentor) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { studentIds, title, category, message, dueDate } = body;

    if (!title || !message) {
      return NextResponse.json({ message: 'Title and message are required.' }, { status: 400 });
    }

    let targetStudentIds: string[] = [];

    if (Array.isArray(studentIds) && studentIds.length > 0) {
      const students = await prisma.user.findMany({
        where: { id: { in: studentIds }, role: 'STUDENT' },
        select: { id: true, mentorId: true }
      });

      if (students.length !== studentIds.length) {
        return NextResponse.json({ message: 'One or more invalid student IDs provided.' }, { status: 404 });
      }

      if (mentor.role === 'MENTOR') {
        const unauthorized = students.some((s) => s.mentorId !== mentor.id);
        if (unauthorized) {
          return NextResponse.json(
            { message: 'Forbidden: You can only send reminders to your assigned students.' },
            { status: 403 }
          );
        }
      }

      targetStudentIds = students.map((s) => s.id);
    } else {
      const assigned = await prisma.user.findMany({
        where: { role: 'STUDENT', ...(mentor.role === 'MENTOR' ? { mentorId: mentor.id } : {}) },
        select: { id: true }
      });

      if (assigned.length === 0) {
        return NextResponse.json({ message: 'No assigned students found to send reminder.' }, { status: 400 });
      }

      targetStudentIds = assigned.map((s) => s.id);
    }

    sendMentorReminderNotification({
      studentIds: targetStudentIds,
      senderId: mentor.id,
      mentorName: mentor.name,
      title,
      category: category || 'General Reminder',
      message,
      dueDate,
    });

    return NextResponse.json({
      success: true,
      message: `Reminder sent to ${targetStudentIds.length} student(s).`,
      recipientCount: targetStudentIds.length,
    });
  } catch (error) {
    console.error('Error sending mentor reminder:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
