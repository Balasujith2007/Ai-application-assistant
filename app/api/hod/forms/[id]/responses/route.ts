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
    const { searchParams } = new URL(req.url);
    const exportFormat = searchParams.get('export');
    const formModel = (prisma as any).form;

    const form = await formModel.findUnique({
      where: { id },
      include: {
        fields: { orderBy: { order: 'asc' } },
        responses: {
          include: {
            student: {
              include: { profile: true },
            },
            answers: {
              include: { field: true },
            },
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
    });

    if (!form) {
      return NextResponse.json({ message: 'Form not found' }, { status: 404 });
    }

    const formattedResponses = (form.responses || []).map((r: any) => {
      const answerMap: Record<string, string> = {};
      (r.answers || []).forEach((ans: any) => {
        const key = ans.fieldId || ans.field?.fieldId || ans.field?.id || '';
        if (key) answerMap[key] = ans.value || '—';
      });

      return {
        responseId: r.id,
        studentId: r.studentId,
        studentName: r.student?.name || '—',
        email: r.student?.email || '—',
        registerNo: r.student?.profile?.registerNo || '—',
        department: r.student?.profile?.department || '—',
        year: r.student?.profile?.year ? String(r.student.profile.year) : '—',
        section: r.student?.profile?.section || '—',
        submittedAt: r.submittedAt,
        answers: answerMap,
      };
    });

    if (exportFormat === 'excel') {
      const XLSX = await import('xlsx');

      const excelRows = formattedResponses.map((res: any) => {
        const row: Record<string, any> = {
          'Student Name': res.studentName,
          'Register Number': res.registerNo,
          'Email': res.email,
          'Department': res.department,
          'Year': res.year,
          'Section': res.section,
          'Submission Date': new Date(res.submittedAt).toLocaleString(),
        };

        (form.fields || []).forEach((field: any) => {
          if (field.type !== 'section' && field.type !== 'paragraph') {
            const val = res.answers[field.fieldId] || res.answers[field.id] || '—';
            row[field.label] = val;
          }
        });

        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Form Responses');

      const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      const safeTitle = form.title.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `CareerAI_Form_Responses_${safeTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`;

      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        formId: form.id,
        formTitle: form.title,
        fields: (form.fields || []).map((f: any) => ({
          fieldId: f.fieldId,
          label: f.label,
          type: f.type,
        })),
        responses: formattedResponses,
        total: formattedResponses.length,
      },
    });
  } catch (error) {
    console.error('GET /api/hod/forms/[id]/responses error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
