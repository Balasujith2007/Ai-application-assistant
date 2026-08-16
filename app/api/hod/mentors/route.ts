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

    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department');
    const year = searchParams.get('year');
    const section = searchParams.get('section');

    const studentWhereClause =
      department || year || section
        ? {
            role: 'STUDENT' as const,
            profile: {
              ...(department ? { department: { equals: department, mode: 'insensitive' as const } } : {}),
              ...(year ? { year: parseInt(year) } : {}),
              ...(section ? { section: { equals: section, mode: 'insensitive' as const } } : {}),
            },
          }
        : { role: 'STUDENT' as const };

    const mentors = await prisma.user.findMany({
      where: { role: 'MENTOR' },
      include: {
        profile: true,
        students: {
          where: studentWhereClause,
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    let data = mentors.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      employeeId: m.profile?.employeeId ?? '—',
      department: m.profile?.department ?? '—',
      assignedStudentsCount: m.students.length,
      assignedStudents: m.students,
    }));

    if (department || year || section) {
      data = data.filter(
        (m) =>
          m.assignedStudentsCount > 0 ||
          (department && m.department.toLowerCase() === department.toLowerCase())
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('HOD mentors list error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
