import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { readEvidenceFile } from '@/lib/verification/evidenceStorage';
import path from 'path';

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const requester = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!requester) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: evidenceId } = await props.params;

    if (!evidenceId) {
      return NextResponse.json({ message: 'Evidence ID is required.' }, { status: 400 });
    }

    const evidence = await prisma.registrationEvidence.findUnique({
      where: { id: evidenceId },
      include: {
        student: {
          include: { profile: true }
        }
      }
    });

    if (!evidence) {
      return NextResponse.json({ message: 'Evidence not found.' }, { status: 404 });
    }

    // Authorization checks:
    // 1. Owner Student can view their own evidence
    const isOwner = requester.id === evidence.studentId;

    // 2. Mentors can view evidence of their assigned students (or mentor role)
    const isAuthorizedMentor = requester.role === 'MENTOR';

    // 3. HOD can view evidence within their department
    const isAuthorizedHod = requester.role === 'HOD';

    // 4. Admin and Super Admin can view all evidence
    const isAdmin = requester.role === 'ADMIN' || requester.role === 'SUPER_ADMIN';

    if (!isOwner && !isAuthorizedMentor && !isAuthorizedHod && !isAdmin) {
      return NextResponse.json(
        { message: 'Forbidden: You are not authorized to access this evidence.' },
        { status: 403 }
      );
    }

    const fileBuffer = await readEvidenceFile(evidence.filePath);
    if (!fileBuffer) {
      return NextResponse.json({ message: 'Evidence file not found on disk.' }, { status: 404 });
    }

    const contentType = evidence.mimeType || 'image/png';
    const filename = encodeURIComponent(path.basename(evidence.fileName));

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=1800, no-transform'
      }
    });

  } catch (error: any) {
    console.error('Error serving evidence image:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
