import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized. Please log in first.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, mentorId: true },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const formModel = (prisma as any).form;

    // For students: fetch published forms targeted to them
    // 1) HOD forms (HOD_DEPARTMENT)
    // 2) Mentor forms (MENTOR_ASSIGNED_STUDENTS) where createdBy === student.mentorId
    let whereClause: any = {};

    if (user.role === 'STUDENT') {
      whereClause = {
        status: 'PUBLISHED',
        OR: [
          { audienceType: 'HOD_DEPARTMENT' },
          { ownerRole: 'HOD' },
          {
            AND: [
              {
                OR: [
                  { audienceType: 'MENTOR_ASSIGNED_STUDENTS' },
                  { ownerRole: 'MENTOR' },
                ],
              },
              { createdBy: user.mentorId || 'none' },
            ],
          },
        ],
      };
    } else {
      // For Mentors/HODs/Admins: fetch their created forms
      whereClause = {
        createdBy: user.id,
      };
    }

    const forms = await formModel.findMany({
      where: whereClause,
      include: {
        creator: {
          select: { id: true, name: true, role: true },
        },
        _count: {
          select: { fields: true, responses: true },
        },
        responses: user.role === 'STUDENT' ? {
          where: { studentId: user.id },
          select: { id: true, submittedAt: true },
        } : false,
      },
      orderBy: { publishedAt: 'desc' },
    });

    const formatted = (forms || []).map((f: any) => ({
      id: f.id,
      title: f.title,
      description: f.description || '',
      instructions: f.instructions || '',
      status: f.status,
      ownerRole: f.ownerRole || 'HOD',
      audienceType: f.audienceType || 'HOD_DEPARTMENT',
      creatorName: f.creator?.name || 'Department',
      creatorRole: f.creator?.role || f.ownerRole || 'HOD',
      fieldsCount: f._count?.fields || 0,
      responsesCount: f._count?.responses || 0,
      hasSubmitted: Boolean(f.responses && f.responses.length > 0),
      publishedAt: f.publishedAt,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error('GET /api/forms error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
