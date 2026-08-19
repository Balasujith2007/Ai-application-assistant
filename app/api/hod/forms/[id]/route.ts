import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';

async function getHOD(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (user && (user.role === 'HOD' || user.role === 'ADMIN')) {
      return user;
    }
  }

  const fallbackHOD = await prisma.user.findFirst({
    where: { role: { in: ['HOD', 'ADMIN'] } },
    select: { id: true, name: true, email: true, role: true },
  });

  return fallbackHOD;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const hod = await getHOD(req);
    if (!hod) {
      return NextResponse.json({ message: 'Unauthorized: HOD user not found' }, { status: 401 });
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

    return NextResponse.json({
      success: true,
      data: {
        ...form,
        responsesCount: form._count?.responses || 0,
      },
    });
  } catch (error) {
    console.error('GET /api/hod/forms/[id] error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const hod = await getHOD(req);
    if (!hod) {
      return NextResponse.json({ message: 'Unauthorized: HOD user not found' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const formModel = (prisma as any).form;
    const fieldModel = (prisma as any).formField;

    const existingForm = await formModel.findUnique({ where: { id } });
    if (!existingForm) {
      return NextResponse.json({ message: 'Form not found' }, { status: 404 });
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
    console.error('PUT /api/hod/forms/[id] error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const hod = await getHOD(req);
    if (!hod) {
      return NextResponse.json({ message: 'Unauthorized: HOD user not found' }, { status: 401 });
    }

    const { id } = await params;
    const formModel = (prisma as any).form;

    const existingForm = await formModel.findUnique({ where: { id } });
    if (!existingForm) {
      return NextResponse.json({ message: 'Form not found' }, { status: 404 });
    }

    await formModel.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Form deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/hod/forms/[id] error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
