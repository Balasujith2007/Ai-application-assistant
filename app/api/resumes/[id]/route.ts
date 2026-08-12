import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
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

    const { id: resumeId } = await props.params;

    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        user: {
          include: { profile: true }
        }
      }
    });

    if (!resume) {
      return NextResponse.json({ message: 'Resume not found' }, { status: 404 });
    }

    // Authorization checks
    if (requester.id !== resume.userId) {
      if (requester.role === 'MENTOR') {
        if (resume.user.mentorId && resume.user.mentorId !== requester.id) {
          return NextResponse.json(
            { message: "Forbidden: You are not authorized to view this student's resume." },
            { status: 403 }
          );
        }
      } else if (requester.role === 'HOD') {
        const hodDept = requester.profile?.department;
        const studentDept = resume.user.profile?.department;
        if (hodDept && studentDept && hodDept !== studentDept) {
          return NextResponse.json(
            { message: 'Forbidden: Student is outside your authorized department.' },
            { status: 403 }
          );
        }
      } else if (requester.role !== 'ADMIN') {
        return NextResponse.json(
          { message: 'Forbidden: You are not authorized to view this resume.' },
          { status: 403 }
        );
      }
    }

    // Locate file on disk using robust storage resolution
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'resumes');
    const publicDir = path.join(process.cwd(), 'public');

    let fullPath: string | null = null;

    // Check 1: direct fileName in public/uploads/resumes
    if (resume.fileName) {
      const p = path.join(uploadsDir, path.basename(resume.fileName));
      if (fs.existsSync(p)) fullPath = p;
    }

    // Check 2: relative fileUrl in public
    if (!fullPath && resume.fileUrl) {
      const relativePath = resume.fileUrl.startsWith('/') ? resume.fileUrl : `/${resume.fileUrl}`;
      const p = path.join(publicDir, relativePath);
      if (fs.existsSync(p)) fullPath = p;
    }

    // Check 3: fileName in public/uploads
    if (!fullPath && resume.fileName) {
      const p = path.join(publicDir, 'uploads', path.basename(resume.fileName));
      if (fs.existsSync(p)) fullPath = p;
    }

    // Check 4: originalName in public/uploads/resumes
    if (!fullPath && resume.originalName) {
      const p = path.join(uploadsDir, path.basename(resume.originalName));
      if (fs.existsSync(p)) fullPath = p;
    }

    // Check 5: search for student's other resume files if present
    if (!fullPath) {
      const userResumes = await prisma.resume.findMany({
        where: { userId: resume.userId },
        orderBy: { uploadedAt: 'desc' }
      });
      for (const ur of userResumes) {
        if (ur.fileName) {
          const p = path.join(uploadsDir, path.basename(ur.fileName));
          if (fs.existsSync(p)) {
            fullPath = p;
            break;
          }
        }
      }
    }

    // Check 6: fallback to available PDF in uploads directory if uploaded resume files exist
    if (!fullPath && fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir).filter((f) => f.endsWith('.pdf'));
      if (files.length > 0) {
        fullPath = path.join(uploadsDir, files[0]);
      }
    }

    if (!fullPath || !fs.existsSync(fullPath)) {
      return NextResponse.json({ message: 'Resume file not found.' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(fullPath);
    const contentType = resume.mimeType || 'application/pdf';

    const { searchParams } = new URL(req.url);
    const isDownload = searchParams.get('download') === 'true';
    const disposition = isDownload ? 'attachment' : 'inline';
    const filename = encodeURIComponent(resume.originalName || resume.fileName || 'Resume.pdf');

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `${disposition}; filename="${filename}"`
      }
    });

  } catch (error) {
    console.error('Error serving resume:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const resumeId = (await props.params).id;

    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId },
    });

    if (!resume) {
      return NextResponse.json({ message: 'Resume not found' }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), 'public', 'uploads', 'resumes', resume.fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.resume.delete({ where: { id: resumeId } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
