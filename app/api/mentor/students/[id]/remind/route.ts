import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { sendMentorMessageNotification } from '@/lib/email/notification.service';

async function getMentor(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || (user.role !== 'MENTOR' && user.role !== 'HOD' && user.role !== 'ADMIN')) return null;
  return user;
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const mentor = await getMentor(req);
    if (!mentor) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const student = await prisma.user.findFirst({
      where: { id, role: 'STUDENT' },
    });

    if (!student) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    if (mentor.role === 'MENTOR' && student.mentorId !== mentor.id) {
      return NextResponse.json({ message: 'Forbidden: You can only send messages/reminders to assigned students' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const title = body.title || `Reminder from ${mentor.name}`;
    const customMessage = body.message ||
      `Your mentor ${mentor.name} has sent you a reminder. Please check your profile, resume, and keep your career progress updated.`;

    // Send async email & create in-app notification without blocking response
    sendMentorMessageNotification({
      studentId: student.id,
      mentorName: mentor.name,
      title,
      message: customMessage,
    });

    return NextResponse.json({ success: true, message: 'Reminder sent successfully' });
  } catch (error) {
    console.error('Mentor remind student error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
