import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import type { Prisma } from '@prisma/client';

async function getMentor(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || (user.role !== 'MENTOR' && user.role !== 'HOD' && user.role !== 'ADMIN')) return null;
  return user;
}

export async function GET(req: Request) {
  try {
    const mentor = await getMentor(req);
    if (!mentor) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    // Find student IDs assigned to mentor OR unassigned students
    const assignedStudents = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        OR: [
          { mentorId: mentor.id },
          { mentorId: null },
        ],
      },
      select: { id: true },
    });
    const studentIds = assignedStudents.map((s) => s.id);

    // Build status filter
    let statusFilter: Prisma.ResumeWhereInput = {};
    if (status === 'PENDING_REVIEW') {
      statusFilter = {
        OR: [
          { reviewStatus: 'PENDING_REVIEW' },
          { reviewStatus: null },
        ],
      };
    } else if (status === 'REVIEWED') {
      statusFilter = { reviewStatus: 'REVIEWED' };
    } else if (status === 'CHANGES_REQUESTED') {
      statusFilter = { reviewStatus: 'CHANGES_REQUESTED' };
    }

    // Build search filter
    let searchFilter: Prisma.ResumeWhereInput = {};
    if (search) {
      searchFilter = {
        OR: [
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { profile: { registerNo: { contains: search, mode: 'insensitive' } } } },
          { originalName: { contains: search, mode: 'insensitive' } },
          { fileName: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const resumeWhere: Prisma.ResumeWhereInput = {
      userId: { in: studentIds },
      isActive: true,
      ...statusFilter,
      ...searchFilter,
    };

    const resumes = await prisma.resume.findMany({
      where: resumeWhere,
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    // Also fetch ALL active resumes for these students to calculate stats accurately
    const allAssignedResumes = await prisma.resume.findMany({
      where: {
        userId: { in: studentIds },
        isActive: true,
      },
      select: { reviewStatus: true },
    });

    const pendingCount = allAssignedResumes.filter(
      (r) => !r.reviewStatus || r.reviewStatus === 'PENDING_REVIEW'
    ).length;
    const reviewedCount = allAssignedResumes.filter(
      (r) => r.reviewStatus === 'REVIEWED'
    ).length;
    const changesRequestedCount = allAssignedResumes.filter(
      (r) => r.reviewStatus === 'CHANGES_REQUESTED'
    ).length;

    const formattedData = resumes.map((r) => ({
      id: r.id,
      fileName: r.fileName,
      originalName: r.originalName || r.fileName,
      fileUrl: r.fileUrl,
      uploadedAt: r.uploadedAt,
      reviewStatus: r.reviewStatus || 'PENDING_REVIEW',
      reviewFeedback: r.reviewFeedback,
      reviewedAt: r.reviewedAt,
      user: {
        id: r.user.id,
        name: r.user.name,
        email: r.user.email,
        registerNo: r.user.profile?.registerNo ?? '—',
        department: r.user.profile?.department ?? 'Artificial Intelligence & Data Science',
        year: r.user.profile?.year ?? 2,
        section: r.user.profile?.section ?? 'A',
      },
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      stats: {
        pendingCount,
        reviewedCount,
        changesRequestedCount,
        total: allAssignedResumes.length,
      },
    });
  } catch (error) {
    console.error('Mentor resumes GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
