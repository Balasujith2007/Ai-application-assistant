import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import path from 'path';
import fs from 'fs';

async function getUser(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return null;
  return await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
}

function resolveStudentProfileValue(user: any, key?: string): string {
  if (!user || !key) return '';
  const p = user.profile;

  switch (key) {
    case 'fullName':
      return user.name || '';
    case 'email':
      return user.email || '';
    case 'phone':
      return p?.phone || '';
    case 'college':
      return p?.college || '';
    case 'department':
      return p?.department || '';
    case 'year':
      return p?.year ? String(p.year) : '';
    case 'section':
      return p?.section || '';
    case 'registrationNumber':
      return p?.registerNo || '';
    case 'githubUrl':
      return p?.githubUrl || '';
    case 'linkedinUrl':
      return p?.linkedinUrl || '';
    case 'codolioUrl':
      return p?.codolioUrl || '';
    default:
      return '';
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUser(req);
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

    const isCreator = user && (user.role === 'ADMIN' || form.createdBy === user.id);
    if (!isCreator && form.status === 'DRAFT') {
      return NextResponse.json({ message: 'Form is not yet published.' }, { status: 403 });
    }

    // Audience targeting check for Mentor forms: ONLY assigned students can access
    if (form.audienceType === 'MENTOR_ASSIGNED_STUDENTS' || form.ownerRole === 'MENTOR') {
      if (!user) {
        return NextResponse.json({ message: 'Unauthorized. Please log in to view this form.' }, { status: 401 });
      }
      if (!isCreator) {
        if (user.role !== 'STUDENT' || user.mentorId !== form.createdBy) {
          return NextResponse.json(
            { message: 'Forbidden: This form is only accessible to students assigned to this mentor.' },
            { status: 403 }
          );
        }
      }
    }

    let existingResponse = null;
    if (user && user.role === 'STUDENT') {
      const responseModel = (prisma as any).formResponse;
      existingResponse = await responseModel.findFirst({
        where: {
          formId: form.id,
          studentId: user.id,
        },
      });
    }

    const fieldsWithPrefill = (form.fields || []).map((f: any) => {
      const cfg = (f.config as any) || {};
      let prefilledValue = '';
      if (user && cfg.profileKey) {
        prefilledValue = resolveStudentProfileValue(user, cfg.profileKey);
      }

      return {
        id: f.id,
        fieldId: f.fieldId,
        type: f.type,
        label: f.label,
        description: f.description,
        placeholder: f.placeholder,
        required: f.required,
        order: f.order,
        config: f.config,
        prefilledValue,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        id: form.id,
        title: form.title,
        description: form.description,
        instructions: form.instructions,
        status: form.status,
        allowMultipleSubmissions: form.allowMultipleSubmissions,
        allowEditing: form.allowEditing,
        confirmationMessage: form.confirmationMessage || 'Your response has been submitted successfully.',
        redirectUrl: form.redirectUrl,
        fields: fieldsWithPrefill,
        hasSubmitted: Boolean(existingResponse),
      },
    });
  } catch (error) {
    console.error('GET /api/forms/[id] error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized. Please log in first.' }, { status: 401 });
    }

    const { id } = await params;
    const formModel = (prisma as any).form;

    const form = await formModel.findUnique({
      where: { id },
      include: { fields: { orderBy: { order: 'asc' } } },
    });

    if (!form) {
      return NextResponse.json({ message: 'Form not found' }, { status: 404 });
    }

    if (form.status === 'DRAFT') {
      return NextResponse.json({ message: 'This form is in draft mode and cannot accept responses.' }, { status: 400 });
    }

    if (form.status === 'CLOSED') {
      return NextResponse.json({ message: 'This form is closed and no longer accepting responses.' }, { status: 400 });
    }

    // Audience targeting check for Mentor forms: ONLY assigned students can submit
    if (form.audienceType === 'MENTOR_ASSIGNED_STUDENTS' || form.ownerRole === 'MENTOR') {
      const isCreator = user.role === 'ADMIN' || form.createdBy === user.id;
      if (!isCreator && (user.role !== 'STUDENT' || user.mentorId !== form.createdBy)) {
        return NextResponse.json(
          { message: 'Forbidden: You are not assigned to the mentor who created this form.' },
          { status: 403 }
        );
      }
    }

    if (!form.allowMultipleSubmissions) {
      const responseModel = (prisma as any).formResponse;
      const existingResponse = await responseModel.findFirst({
        where: {
          formId: form.id,
          studentId: user.id,
        },
      });

      if (existingResponse) {
        return NextResponse.json(
          { message: 'You have already submitted a response for this form.' },
          { status: 400 }
        );
      }
    }

    const contentType = req.headers.get('content-type') || '';
    const answersMap: Record<string, string> = {};
    const uploadFiles: Array<{ fieldId: string; file: File }> = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      for (const [key, val] of Array.from(formData.entries())) {
        if (val instanceof File) {
          uploadFiles.push({ fieldId: key, file: val });
        } else {
          answersMap[key] = String(val);
        }
      }
    } else {
      const body = await req.json().catch(() => ({}));
      if (body.answers && typeof body.answers === 'object') {
        Object.assign(answersMap, body.answers);
      }
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'forms');
    if (uploadFiles.length > 0 && !fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    for (const { fieldId, file } of uploadFiles) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadsDir, safeName);
      fs.writeFileSync(filePath, buffer);
      answersMap[fieldId] = `/uploads/forms/${safeName}`;
    }

    const validationErrors: string[] = [];

    (form.fields || []).forEach((field: any) => {
      if (field.type === 'section' || field.type === 'paragraph') return;

      const fId = field.fieldId;
      const val = (answersMap[fId] || '').trim();

      if (field.required && !val) {
        validationErrors.push(`Field "${field.label}" is required.`);
      }

      if (val && field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val)) {
          validationErrors.push(`Field "${field.label}" requires a valid email address.`);
        }
      }

      if (val && field.type === 'number') {
        const num = Number(val);
        if (isNaN(num)) {
          validationErrors.push(`Field "${field.label}" must be a number.`);
        }
      }
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { message: 'Validation failed', errors: validationErrors },
        { status: 400 }
      );
    }

    const response = await prisma.$transaction(async (tx: any) => {
      const res = await tx.formResponse.create({
        data: {
          formId: form.id,
          studentId: user.id,
        },
      });

      const answerRecords = (form.fields || [])
        .filter((f: any) => f.type !== 'section' && f.type !== 'paragraph')
        .map((f: any) => ({
          responseId: res.id,
          fieldId: f.id,
          value: answersMap[f.fieldId] || answersMap[f.id] || '',
        }));

      if (answerRecords.length > 0) {
        await tx.formResponseAnswer.createMany({
          data: answerRecords,
        });
      }

      return res;
    });

    return NextResponse.json(
      {
        success: true,
        message: form.confirmationMessage || 'Your response has been submitted successfully.',
        data: { responseId: response.id },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/forms/[id]/responses error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
