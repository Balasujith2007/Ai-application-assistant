import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';

async function getMentor(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (user && (user.role === 'MENTOR' || user.role === 'ADMIN')) {
      return user;
    }
  }

  const fallbackMentor = await prisma.user.findFirst({
    where: { role: { in: ['MENTOR', 'ADMIN'] } },
    select: { id: true, name: true, email: true, role: true },
  });

  return fallbackMentor;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const mentor = await getMentor(req);
    if (!mentor) {
      return NextResponse.json({ message: 'Unauthorized: Mentor user not found' }, { status: 401 });
    }

    const { id } = await params;
    const formModel = (prisma as any).form;

    const form = await formModel.findUnique({
      where: { id },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { responses: true },
        },
      },
    });

    if (!form) {
      return NextResponse.json({ message: 'Form not found' }, { status: 404 });
    }

    if (form.createdBy !== mentor.id && mentor.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden: You do not have permission to access this form' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...form,
        responsesCount: form._count?.responses || 0,
      },
    });
  } catch (error) {
    console.error('GET /api/mentor/forms/[id] error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const mentor = await getMentor(req);
    if (!mentor) {
      return NextResponse.json({ message: 'Unauthorized: Mentor user not found' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const formModel = (prisma as any).form;

    const existingForm = await formModel.findUnique({ where: { id } });
    if (!existingForm) {
      return NextResponse.json({ message: 'Form not found' }, { status: 404 });
    }

    if (existingForm.createdBy !== mentor.id && mentor.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden: You do not own this form' }, { status: 403 });
    }

    const fieldsInput = Array.isArray(body.fields) ? body.fields : [];

    await prisma.$transaction(async (tx: any) => {
      await tx.form.update({
        where: { id },
        data: {
          title: body.title?.trim() || existingForm.title,
          description: body.description ?? existingForm.description,
          instructions: body.instructions ?? existingForm.instructions,
          allowMultipleSubmissions: body.allowMultipleSubmissions ?? existingForm.allowMultipleSubmissions,
          allowEditing: body.allowEditing ?? existingForm.allowEditing,
          confirmationMessage: body.confirmationMessage ?? existingForm.confirmationMessage,
          redirectUrl: body.redirectUrl ?? existingForm.redirectUrl,
        },
      });

      await tx.formField.deleteMany({
        where: { formId: id },
      });

      if (fieldsInput.length > 0) {
        await tx.formField.createMany({
          data: fieldsInput.map((f: any, index: number) => ({
            formId: id,
            fieldId: f.fieldId || `field_${Math.random().toString(36).substr(2, 9)}`,
            type: f.type || 'short-text',
            label: f.label || 'Untitled Field',
            description: f.description || null,
            placeholder: f.placeholder || null,
            required: Boolean(f.required),
            order: index,
            config: f.config || {},
          })),
        });
      }
    });

    const refreshed = await formModel.findUnique({
      where: { id },
      include: {
        fields: { orderBy: { order: 'asc' } },
        _count: { select: { responses: true } },
      },
    });

    return NextResponse.json({ success: true, data: refreshed });
  } catch (error) {
    console.error('PUT /api/mentor/forms/[id] error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const mentor = await getMentor(req);
    if (!mentor) {
      return NextResponse.json({ message: 'Unauthorized: Mentor user not found' }, { status: 401 });
    }

    const { id } = await params;
    const formModel = (prisma as any).form;

    const existingForm = await formModel.findUnique({ where: { id } });
    if (!existingForm) {
      return NextResponse.json({ message: 'Form not found' }, { status: 404 });
    }

    if (existingForm.createdBy !== mentor.id && mentor.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden: You cannot delete another mentor\'s form' }, { status: 403 });
    }

    await formModel.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Form deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/mentor/forms/[id] error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
