import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID is required.' }, { status: 400 });
    }

    const session = await prisma.autofillSession.findUnique({
      where: { sessionToken: sessionId },
      include: {
        opportunity: true,
        student: {
          include: {
            profile: {
              include: {
                education: { orderBy: { startYear: 'desc' } }
              }
            },
            verifiedProfiles: true,
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
      return NextResponse.json({ success: false, error: 'Autofill session not found or invalid.' }, { status: 404 });
    }

    if (new Date() > new Date(session.expiresAt)) {
      await prisma.autofillSession.update({
        where: { id: session.id },
        data: { status: 'EXPIRED' }
      });
      return NextResponse.json({ success: false, error: 'Autofill session has expired. Please restart registration.' }, { status: 410 });
    }

    const student = session.student;
    const profile = student.profile;
    const activeResume = student.resumes[0] || null;
    const verifiedMap = new Map(student.verifiedProfiles.map((vp) => [vp.platform, vp]));

    const yearString = profile?.year ? `${profile.year}${profile.year === 1 ? 'st' : profile.year === 2 ? 'nd' : profile.year === 3 ? 'rd' : 'th'} Year` : '';
    const cgpaVal = profile?.education?.[0]?.grade || '';

    // Update status to OPENED
    await prisma.autofillSession.update({
      where: { id: session.id },
      data: { status: 'OPENED' }
    });

    return NextResponse.json({
      success: true,
      sessionId: session.sessionToken,
      expiresAt: session.expiresAt,
      student: {
        fullName: student.name,
        email: student.email,
        phone: profile?.phone || '',
        college: profile?.college || '',
        department: profile?.department || '',
        year: yearString,
        rawYear: profile?.year || null,
        cgpa: cgpaVal,
        location: profile?.location || '',
        github: profile?.githubUrl || verifiedMap.get('GITHUB')?.profileUrl || '',
        linkedin: profile?.linkedinUrl || verifiedMap.get('LINKEDIN')?.profileUrl || '',
        codolio: profile?.codolioUrl || verifiedMap.get('CODOLIO')?.profileUrl || ''
      },
      resume: activeResume ? {
        id: activeResume.id,
        fileName: activeResume.fileName,
        originalName: activeResume.originalName,
        downloadUrl: `/api/agent/resume-download?sessionId=${session.sessionToken}`
      } : null,
      opportunity: {
        id: session.opportunity.id,
        title: session.opportunity.title,
        organization: session.opportunity.organization || session.opportunity.companyName || 'Host Organization',
        type: session.opportunity.type,
        applicationUrl: session.opportunity.registrationUrl || session.opportunity.opportunityUrl || ''
      }
    });

  } catch (error: unknown) {
    console.error('Error fetching agent payload:', error);
    const message = (error as Error)?.message || 'Failed to fetch autofill payload.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
