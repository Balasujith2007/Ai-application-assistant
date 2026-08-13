import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { buildExtensionProfile } from '@/lib/applyAgent/profileSnapshot';
import { corsHeaders } from '@/lib/applyAgent/cors';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID is required.' }, { status: 400, headers: corsHeaders(req) });
    }

    const session = await prisma.autofillSession.findUnique({
      where: { sessionToken: sessionId },
      include: {
        opportunity: true,
        student: {
          include: {
            resumes: {
              where: { isActive: true },
              orderBy: { uploadedAt: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    if (!session) {
      return NextResponse.json({ success: false, error: 'Autofill session not found or invalid.' }, { status: 404, headers: corsHeaders(req) });
    }

    if (new Date() > new Date(session.expiresAt)) {
      await prisma.autofillSession.update({
        where: { id: session.id },
        data: { status: 'EXPIRED' }
      });
      return NextResponse.json({ success: false, error: 'Autofill session has expired. Please restart registration.' }, { status: 410, headers: corsHeaders(req) });
    }

    const snapshot = await buildExtensionProfile(session.studentId);
    const activeResume = session.student.resumes[0] || null;

    await prisma.autofillSession.update({
      where: { id: session.id },
      data: { status: 'OPENED' }
    });

    return NextResponse.json({
      success: true,
      sessionId: session.sessionToken,
      expiresAt: session.expiresAt,
      student: snapshot?.flat || {},
      profile: snapshot,
      resume: activeResume ? {
        id: activeResume.id,
        fileName: activeResume.fileName,
        originalName: activeResume.originalName,
        downloadUrl: `/api/agent/resume-download?sessionId=${session.sessionToken}`
      } : null,
      opportunity: session.opportunity ? {
        id: session.opportunity.id,
        title: session.opportunity.title,
        organization: session.opportunity.organization || session.opportunity.companyName || 'Host Organization',
        type: session.opportunity.type,
        applicationUrl: session.opportunity.registrationUrl || session.opportunity.opportunityUrl || ''
      } : null
    }, { headers: corsHeaders(req) });

  } catch (error: unknown) {
    console.error('Error fetching agent payload:', error);
    const message = (error as Error)?.message || 'Failed to fetch autofill payload.';
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: corsHeaders(req) });
  }
}
