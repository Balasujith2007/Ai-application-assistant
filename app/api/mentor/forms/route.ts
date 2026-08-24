import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';

async function getMentorUser(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return { error: 'Unauthorized: Missing or invalid authentication token.', status: 401, user: null };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    return { error: 'Unauthorized: User not found.', status: 401, user: null };
  }

  if (user.role !== 'MENTOR' && user.role !== 'ADMIN') {
    return { error: 'Forbidden: Mentor access required.', status: 403, user: null };
  }

  return { error: null, status: 200, user };
}

export async function GET(req: Request) {
  try {
    const { user: mentor, error, status } = await getMentorUser(req);
    if (error || !mentor) {
      return NextResponse.json({ message: error }, { status: status || 401 });
    }

    const formModel = (prisma as any).form;
    const forms = await formModel.findMany({
      where: {
        createdBy: mentor.id,
      },
      include: {
        _count: {
          select: {
            fields: true,
            responses: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formatted = (forms || []).map((f: any) => ({
      id: f.id,
      title: f.title,
      description: f.description || '',
      instructions: f.instructions || '',
      status: f.status,
      ownerRole: f.ownerRole || 'MENTOR',
      audienceType: f.audienceType || 'MENTOR_ASSIGNED_STUDENTS',
      fieldsCount: f._count?.fields || 0,
      responsesCount: f._count?.responses || 0,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      publishedAt: f.publishedAt,
      closedAt: f.closedAt,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('GET /api/mentor/forms error:', error);
    return NextResponse.json(
      { message: error?.message || 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { user: mentor, error, status } = await getMentorUser(req);
    if (error || !mentor) {
      return NextResponse.json({ message: error }, { status: status || 401 });
    }

    const body = await req.json().catch(() => ({}));
    const title = body.title?.trim() || 'Untitled Form';

    const formModel = (prisma as any).form;
    const newForm = await formModel.create({
      data: {
        title,
        description: body.description || '',
        instructions: body.instructions || '',
        status: 'DRAFT',
        createdBy: mentor.id,
        ownerRole: 'MENTOR',
        audienceType: 'MENTOR_ASSIGNED_STUDENTS',
        allowMultipleSubmissions: Boolean(body.allowMultipleSubmissions),
        allowEditing: Boolean(body.allowEditing),
        confirmationMessage: body.confirmationMessage || 'Your response has been submitted successfully.',
      },
    });

    return NextResponse.json({ success: true, data: newForm }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/mentor/forms error:', error);
    return NextResponse.json(
      { message: error?.message || 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}
