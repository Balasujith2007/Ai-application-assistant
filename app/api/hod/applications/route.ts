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

    const applications = await prisma.application.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: { select: { registerNo: true, department: true, year: true, section: true } },
            mentor: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const statusCounts = {
      SAVED: applications.filter((a) => a.status === 'SAVED').length,
      APPLIED: applications.filter((a) => a.status === 'APPLIED').length,
      SHORTLISTED: applications.filter((a) => a.status === 'SHORTLISTED').length,
      INTERVIEW: applications.filter((a) => a.status === 'INTERVIEW').length,
      SELECTED: applications.filter((a) => a.status === 'SELECTED').length,
      REJECTED: applications.filter((a) => a.status === 'REJECTED').length,
    };

    return NextResponse.json({ data: applications, statusCounts });
  } catch (error) {
    console.error('HOD applications error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
