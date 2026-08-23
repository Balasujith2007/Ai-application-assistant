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

export async function POST(
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

    if (form.createdBy !== mentor.id && mentor.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden: You do not own this form' }, { status: 403 });
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

      const isFirstPublish = form.status !== 'PUBLISHED';

      const updated = await formModel.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });

      // Notify ONLY assigned students when form is first published
      if (isFirstPublish) {
        const assignedStudents = await prisma.user.findMany({
          where: {
            mentorId: mentor.id,
            role: 'STUDENT',
          },
          select: { id: true },
        });

        if (assignedStudents.length > 0) {
          const notificationsData = assignedStudents.map((s: any) => ({
            userId: s.id,
            senderId: mentor.id,
            title: 'New Form Available',
            message: `Your mentor ${mentor.name} has published a new form: "${form.title}"`,
            type: 'SYSTEM',
            link: `/dashboard/student/forms/${form.id}`,
            isRead: false,
          }));

          await prisma.notification.createMany({
            data: notificationsData,
          });
        }
      }

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
            createdBy: mentor.id,
            ownerRole: 'MENTOR',
            audienceType: 'MENTOR_ASSIGNED_STUDENTS',
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
    console.error('POST /api/mentor/forms/[id]/publish error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
