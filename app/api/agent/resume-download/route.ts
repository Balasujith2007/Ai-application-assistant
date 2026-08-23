import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { loadActiveResumeFile, resumeDownloadHeaders } from '@/lib/applyAgent/resumeFile';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID required.' }, { status: 400 });
    }

    const session = await prisma.autofillSession.findUnique({
      where: { sessionToken: sessionId },
    });

    if (!session || new Date() > new Date(session.expiresAt)) {
      return NextResponse.json({ success: false, error: 'Session expired or invalid.' }, { status: 401 });
    }

    const file = await loadActiveResumeFile(session.studentId);
    if (!file) {
      return NextResponse.json({ success: false, error: 'No active resume found.' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: resumeDownloadHeaders(file),
    });
  } catch (error: unknown) {
    console.error('Error downloading agent resume:', error);
    const message = (error as Error)?.message || 'Failed to download resume.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
