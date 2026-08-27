import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAuthAndPermission } from '@/lib/serverAuth';

export async function GET(req: Request) {
  try {
    const auth = await checkAuthAndPermission(req, 'Auto-Fill Agent', 'VIEW');
    if (!auth.allowed) {
      return NextResponse.json({ message: auth.message || 'Forbidden' }, { status: auth.status || 403 });
    }

    // Compute stats
    const totalSessions = await prisma.autofillSession.count();
    const completedSessions = await prisma.autofillSession.count({
      where: { status: 'COMPLETED' }
    });

    const sessionsData = await prisma.autofillSession.findMany({
      select: {
        fieldsDetected: true,
        fieldsFilled: true,
      }
    });

    let totalFieldsDetected = 0;
    let totalFieldsFilled = 0;

    for (const session of sessionsData) {
      totalFieldsDetected += session.fieldsDetected;
      totalFieldsFilled += session.fieldsFilled;
    }

    const fillRate = totalFieldsDetected > 0 
      ? Math.round((totalFieldsFilled / totalFieldsDetected) * 100) 
      : 0;

    // Recent Sessions
    const recentSessionsDb = await prisma.autofillSession.findMany({
      take: 15,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: {
            name: true,
            email: true,
          }
        },
        opportunity: {
          select: {
            title: true,
            type: true,
          }
        }
      }
    });

    const recentSessions = recentSessionsDb.map(s => ({
      id: s.id,
      studentName: s.student.name,
      studentEmail: s.student.email,
      opportunityTitle: s.opportunity?.title || 'Unknown External Form',
      opportunityType: s.opportunity?.type || 'OTHER',
      status: s.status,
      fieldsDetected: s.fieldsDetected,
      fieldsFilled: s.fieldsFilled,
      createdAt: s.createdAt
    }));

    // Recent Audit Events
    const recentEventsDb = await prisma.autofillAuditEvent.findMany({
      take: 30,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    });

    const recentEvents = recentEventsDb.map(e => ({
      id: e.id,
      userName: e.user.name,
      userEmail: e.user.email,
      domain: e.domain,
      status: e.status,
      fieldLabel: e.fieldLabel,
      detail: e.detail,
      createdAt: e.createdAt
    }));

    return NextResponse.json({
      data: {
        totalSessions,
        completedSessions,
        totalFieldsDetected,
        totalFieldsFilled,
        fillRate,
        recentSessions,
        recentEvents
      }
    });
  } catch (error) {
    console.error('Error fetching autofill agent metrics:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
