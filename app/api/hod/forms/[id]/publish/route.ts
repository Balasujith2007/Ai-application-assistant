import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';

async function getHODUser(req: Request) {
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

  if (user.role !== 'HOD' && user.role !== 'ADMIN') {
    return { error: 'Forbidden: HOD access required.', status: 403, user: null };
  }

  return { error: null, status: 200, user };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user: hod, error, status } = await getHODUser(req);
    if (error || !hod) {
      return NextResponse.json({ message: error }, { status: status || 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = (body.action || 'publish').toLowerCase();
    const formModel = (prisma as any).form;

    const form = await formModel.findUnique({
      where: { id },
      include: {
        fields: { orderBy: { order: 'asc' } },
      },
    });

    if (!form) {
      return NextResponse.json({ message: 'Form not found' }, { status: 404 });
    }

    if (action === 'publish') {
      if (!form.title || !form.title.trim()) {
        return NextResponse.json({ message: 'Form cannot be published without a title.' }, { status: 400 });
      }

      if (!form.fields || form.fields.length === 0) {
        return NextResponse.json({ message: 'Please add at least one question/field to the form before publishing.' }, { status: 400 });
      }

      const invalidFields: string[] = [];
      form.fields.forEach((f: any, idx: number) => {
        if (!f.label || !f.label.trim()) {
          invalidFields.push(`Question #${idx + 1} is missing a label.`);
        }
        if (['dropdown', 'radio', 'checkbox'].includes(f.type)) {
          const cfg = (f.config as any) || {};
          const options = Array.isArray(cfg.options) ? cfg.options : [];
          if (options.length === 0) {
            invalidFields.push(`Field "${f.label}" requires at least one option.`);
          }
        }
      });

      if (invalidFields.length > 0) {
        return NextResponse.json({
          message: 'Cannot publish form due to validation errors.',
          errors: invalidFields,
        }, { status: 400 });
      }

      const updated = await formModel.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, data: updated });
    } else if (action === 'close') {
      const updated = await formModel.update({
        where: { id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, data: updated });
    } else if (action === 'duplicate') {
      const duplicatedForm = await prisma.$transaction(async (tx: any) => {
        const newForm = await tx.form.create({
          data: {
            title: `${form.title} (Copy)`,
            description: form.description,
            instructions: form.instructions,
            status: 'DRAFT',
            createdBy: hod.id,
            allowMultipleSubmissions: form.allowMultipleSubmissions,
            allowEditing: form.allowEditing,
            confirmationMessage: form.confirmationMessage,
            redirectUrl: form.redirectUrl,
          },
        });

        if (form.fields.length > 0) {
          await tx.formField.createMany({
            data: form.fields.map((f: any, idx: number) => ({
              formId: newForm.id,
              fieldId: `field_${Math.random().toString(36).substr(2, 9)}`,
              type: f.type,
              label: f.label,
              description: f.description,
              placeholder: f.placeholder,
              required: f.required,
              order: idx,
              config: f.config || {},
            })),
          });
        }

        return newForm;
      });

      return NextResponse.json({ success: true, data: duplicatedForm }, { status: 201 });
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/hod/forms/[id]/publish error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
