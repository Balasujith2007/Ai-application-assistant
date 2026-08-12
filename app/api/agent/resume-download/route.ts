import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID required.' }, { status: 400 });
    }

    const session = await prisma.autofillSession.findUnique({
      where: { sessionToken: sessionId },
      include: {
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

    if (!session || new Date() > new Date(session.expiresAt)) {
      return NextResponse.json({ success: false, error: 'Session expired or invalid.' }, { status: 401 });
    }

    const activeResume = session.student.resumes[0];
    if (!activeResume) {
      return NextResponse.json({ success: false, error: 'No active resume found.' }, { status: 404 });
    }

    // If activeResume.fileUrl is local upload path, read buffer from filesystem
    const relativeFilePath = activeResume.fileUrl.startsWith('/') ? activeResume.fileUrl : `/${activeResume.fileUrl}`;
    const fullPath = path.join(process.cwd(), 'public', relativeFilePath);

    if (fs.existsSync(fullPath)) {
      const fileBuffer = fs.readFileSync(fullPath);
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${activeResume.originalName || 'resume.pdf'}"`
        }
      });
    }

    // Otherwise redirect to stored URL
    return NextResponse.redirect(activeResume.fileUrl);

  } catch (error: unknown) {
    console.error('Error downloading agent resume:', error);
    const message = (error as Error)?.message || 'Failed to download resume.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
