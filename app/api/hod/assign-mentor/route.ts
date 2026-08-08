import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';

async function getHOD(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || (user.role !== 'HOD' && user.role !== 'ADMIN')) return null;
  return user;
}

// POST: Assign a student (or array of studentIds) to a mentor
export async function POST(req: Request) {
  try {
    const hod = await getHOD(req);
    if (!hod) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { studentId, studentIds, mentorId } = body;

    if (!mentorId) {
      return NextResponse.json({ message: 'mentorId is required' }, { status: 400 });
    }

    // Verify mentor exists
    const mentor = await prisma.user.findUnique({ where: { id: mentorId } });
    if (!mentor || mentor.role !== 'MENTOR') {
      return NextResponse.json({ message: 'Invalid mentor selected' }, { status: 404 });
    }

    const idsToUpdate: string[] = studentIds || (studentId ? [studentId] : []);
    if (idsToUpdate.length === 0) {
      return NextResponse.json({ message: 'studentId or studentIds required' }, { status: 400 });
    }

    await prisma.user.updateMany({
      where: { id: { in: idsToUpdate }, role: 'STUDENT' },
      data: { mentorId },
    });

    // Send notification to each assigned student
    for (const sId of idsToUpdate) {
      await prisma.notification.create({
        data: {
          userId: sId,
          title: 'Mentor Assigned',
          message: `You have been assigned to ${mentor.name} as your faculty mentor.`,
          link: '/dashboard/student',
        },
      });
    }

    // Send notification to mentor
    await prisma.notification.create({
      data: {
        userId: mentorId,
        title: 'New Student(s) Assigned',
        message: `${idsToUpdate.length} student(s) have been assigned to you by ${hod.name}.`,
        link: '/dashboard/mentor/students',
      },
    });

    return NextResponse.json({ message: 'Student(s) successfully assigned to mentor' });
  } catch (error) {
    console.error('HOD assign mentor error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Remove mentor assignment from a student
export async function DELETE(req: Request) {
  try {
    const hod = await getHOD(req);
    if (!hod) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ message: 'studentId is required' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: studentId },
      data: { mentorId: null },
    });

    return NextResponse.json({ message: 'Mentor assignment removed successfully' });
  } catch (error) {
    console.error('HOD remove mentor assignment error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
