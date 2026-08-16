import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';

async function verifyHOD(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || (user.role !== 'HOD' && user.role !== 'ADMIN')) return null;
  return user;
}

export async function GET(req: Request) {
  try {
    const hod = await verifyHOD(req);
    if (!hod) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department');
    const year = searchParams.get('year');
    const section = searchParams.get('section');

    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        ...(department || year || section
          ? {
              profile: {
                ...(department ? { department: { equals: department, mode: 'insensitive' } } : {}),
                ...(year ? { year: parseInt(year) } : {}),
                ...(section ? { section: { equals: section, mode: 'insensitive' } } : {}),
              },
            }
          : {}),
      },
      include: {
        profile: true,
        mentor: { select: { name: true } },
        resumes: { orderBy: { uploadedAt: 'desc' } },
      },
      orderBy: { name: 'asc' },
    });

    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';

    const data = students.map((s) => {
      const activeResume = s.resumes.find((r) => r.isActive) || s.resumes[0];
      let status = 'Missing';
      if (activeResume) {
        status = activeResume.reviewStatus === 'REVIEWED' ? 'Completed' : 'Needs Review';
      }

      return {
        id: s.id,
        studentName: s.name,
        registerNo: s.profile?.registerNo ?? '—',
        department: s.profile?.department ?? 'AI & DS',
        year: s.profile?.year ?? 2,
        section: s.profile?.section ?? 'A',
        mentorName: s.mentor?.name ?? 'Unassigned',
        resumeStatus: status,
        fileName: activeResume?.originalName ?? null,
        fileUrl: activeResume ? `/api/resumes/${activeResume.id}${tokenQuery}` : null,
        uploadedAt: activeResume?.uploadedAt ?? null,
        reviewFeedback: activeResume?.reviewFeedback ?? null,
      };
    });

    const total = data.length;
    const completed = data.filter((d) => d.resumeStatus === 'Completed').length;
    const needsReview = data.filter((d) => d.resumeStatus === 'Needs Review').length;
    const missing = data.filter((d) => d.resumeStatus === 'Missing').length;

    return NextResponse.json({
      data,
      stats: { total, completed, needsReview, missing },
    });
  } catch (error) {
    console.error('HOD resumes API error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
