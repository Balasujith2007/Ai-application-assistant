import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';

export type ActiveResumeFile = {
  id: string;
  userId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number | null;
  fileUrl: string;
  buffer: Buffer;
};

export type ResumeUploadInput = {
  originalName: string;
  mimeType?: string | null;
  buffer: Buffer;
};

/**
 * Load the authenticated user's active resume bytes.
 * Always filtered by userId — never returns another user's file.
 */
export async function loadActiveResumeFile(userId: string): Promise<ActiveResumeFile | null> {
  if (!userId) return null;

  const activeResume = await prisma.resume.findFirst({
    where: { userId, isActive: true },
    orderBy: { uploadedAt: 'desc' },
  });

  // Defense in depth: reject any row that somehow does not match the caller.
  if (!activeResume?.fileUrl || activeResume.userId !== userId) return null;

  const relative = activeResume.fileUrl.startsWith('/')
    ? activeResume.fileUrl.slice(1)
    : activeResume.fileUrl;
  const fullPath = path.join(process.cwd(), 'public', relative);

  if (!fs.existsSync(fullPath)) return null;

  const buffer = fs.readFileSync(fullPath);
  if (!buffer.length) return null;

  return {
    id: activeResume.id,
    userId: activeResume.userId,
    fileName: activeResume.fileName,
    originalName: activeResume.originalName || activeResume.fileName || 'resume.pdf',
    mimeType: activeResume.mimeType || 'application/pdf',
    fileSize: activeResume.fileSize,
    fileUrl: activeResume.fileUrl,
    buffer,
  };
}

/**
 * Persist a resume file for exactly one user.
 * Deactivates that user's previous active resumes only (never touches other users).
 */
export async function saveResumeForUser(userId: string, input: ResumeUploadInput) {
  if (!userId) throw new Error('userId is required');
  if (!input.buffer?.length) throw new Error('Resume file is empty');

  const originalName = String(input.originalName || 'resume.pdf').replace(/[\\/]/g, '_');
  const ext = path.extname(originalName) || '.pdf';
  const storedName = `${crypto.randomUUID()}${ext}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'resumes');

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, storedName);
  fs.writeFileSync(filePath, input.buffer);

  await prisma.resume.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  });

  const fileUrl = `/uploads/resumes/${storedName}`;
  const resume = await prisma.resume.create({
    data: {
      userId,
      fileName: storedName,
      fileUrl,
      originalName,
      mimeType: input.mimeType || 'application/pdf',
      fileSize: input.buffer.length,
      isActive: true,
    },
  });

  if (resume.userId !== userId) {
    throw new Error('Resume ownership mismatch after save');
  }

  return resume;
}

export function resumeDownloadHeaders(file: Pick<ActiveResumeFile, 'originalName' | 'mimeType' | 'buffer' | 'userId'>) {
  const safeName = String(file.originalName || 'resume.pdf').replace(/"/g, '');
  return {
    'Content-Type': file.mimeType || 'application/pdf',
    'Content-Length': String(file.buffer.length),
    'Content-Disposition': `attachment; filename="${safeName}"`,
    'Cache-Control': 'no-store',
    'X-CareerAI-Resume-Owner': file.userId,
  };
}

export function extensionResumePayload(resume: {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string | null;
}) {
  return {
    id: resume.id,
    fileName: resume.originalName || resume.fileName,
    mimeType: resume.mimeType || 'application/pdf',
    downloadUrl: '/api/extension/resume/download',
  };
}
