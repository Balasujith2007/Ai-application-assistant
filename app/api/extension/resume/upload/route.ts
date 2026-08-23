import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { corsHeaders, jsonWithCors, optionsOk } from '@/lib/applyAgent/cors';
import { extensionResumePayload, saveResumeForUser } from '@/lib/applyAgent/resumeFile';

export function OPTIONS(req: Request) {
  return optionsOk(req);
}

function parseBase64Payload(body: Record<string, unknown>): { originalName: string; mimeType: string; buffer: Buffer } | null {
  const base64 = typeof body.base64 === 'string' ? body.base64 : '';
  if (!base64) return null;
  const originalName = String(body.fileName || body.originalName || 'resume.pdf').replace(/[\\/]/g, '_');
  const mimeType = String(body.mimeType || 'application/pdf');
  try {
    const buffer = Buffer.from(base64, 'base64');
    if (!buffer.length) return null;
    return { originalName, mimeType, buffer };
  } catch {
    return null;
  }
}

/**
 * Upload/replace the authenticated user's active resume (extension JWT).
 * Accepts multipart FormData OR JSON { fileName, mimeType, base64 }.
 * Always scoped to getUserIdFromRequest(req) — never another user.
 */
export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return jsonWithCors(req, { success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let payload: { originalName: string; mimeType: string; buffer: Buffer } | null = null;

    if (contentType.includes('application/json')) {
      const body = (await req.json()) as Record<string, unknown>;
      payload = parseBase64Payload(body);
    } else {
      const formData = await req.formData();
      const file = formData.get('file');
      const base64Field = formData.get('base64');
      if (typeof base64Field === 'string' && base64Field) {
        payload = parseBase64Payload({
          base64: base64Field,
          fileName: formData.get('fileName') || formData.get('originalName') || 'resume.pdf',
          mimeType: formData.get('mimeType') || 'application/pdf',
        });
      } else if (file && typeof (file as Blob).arrayBuffer === 'function') {
        const upload = file as File;
        const buffer = Buffer.from(await upload.arrayBuffer());
        if (buffer.length) {
          payload = {
            originalName: upload.name || 'resume.pdf',
            mimeType: upload.type || 'application/pdf',
            buffer,
          };
        }
      }
    }

    if (!payload) {
      return jsonWithCors(req, { success: false, error: 'File is required' }, 400);
    }

    const resume = await saveResumeForUser(userId, payload);
    if (resume.userId !== userId) {
      return jsonWithCors(req, { success: false, error: 'Ownership mismatch' }, 500);
    }

    return jsonWithCors(req, {
      success: true,
      userId,
      resume: extensionResumePayload(resume),
      data: { id: resume.id, originalName: resume.originalName, isActive: resume.isActive },
    });
  } catch (error: unknown) {
    console.error('Error uploading extension resume:', error);
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || 'Failed to upload file.' },
      { status: 500, headers: corsHeaders(req) },
    );
  }
}
