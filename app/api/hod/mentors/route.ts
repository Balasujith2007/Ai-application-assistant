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

export async function GET(req: Request) {
  try {
    const hod = await getHOD(req);
    if (!hod) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const mentors = await prisma.user.findMany({
      where: { role: 'MENTOR' },
      include: {
        profile: true,
        students: { select: { id: true, name: true, email: true } },
      },
      orderBy: { name: 'asc' },
    });

    const data = mentors.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      employeeId: m.profile?.employeeId ?? '—',
      department: m.profile?.department ?? '—',
      assignedStudentsCount: m.students.length,
      assignedStudents: m.students,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('HOD mentors list error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
