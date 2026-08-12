import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true }
    });

    const opportunities = await prisma.opportunity.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        registrations: user?.role === 'STUDENT' ? {
          where: { studentId: userId },
          select: { id: true, status: true, initiatedAt: true, registeredAt: true }
        } : false
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const formatted = opportunities.map((opp) => {
      const userReg = opp.registrations && opp.registrations.length > 0 ? opp.registrations[0] : null;
      return {
        ...opp,
        isRegistered: !!userReg && userReg.status === 'REGISTERED',
        userRegistrationStatus: userReg ? userReg.status : null,
        studentRegistration: userReg ? {
          status: userReg.status,
          initiatedAt: userReg.initiatedAt,
          registeredAt: userReg.registeredAt
        } : null
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching recommended opportunities:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
