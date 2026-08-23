import { getUserIdFromRequest } from '@/lib/serverAuth';
import { jsonWithCors, optionsOk } from '@/lib/applyAgent/cors';
import { buildExtensionProfile } from '@/lib/applyAgent/profileSnapshot';
import prisma from '@/lib/prisma';
import { extensionResumePayload } from '@/lib/applyAgent/resumeFile';

export function OPTIONS(req: Request) {
  return optionsOk(req);
}

async function resumePayload(userId: string) {
  const activeResume = await prisma.resume.findFirst({
    where: { userId, isActive: true },
    orderBy: { uploadedAt: 'desc' },
  });
  if (!activeResume || activeResume.userId !== userId) return null;
  return extensionResumePayload(activeResume);
}

export async function GET(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return jsonWithCors(req, { success: false, message: 'Unauthorized' }, 401);

  const url = new URL(req.url);
  const categories = (url.searchParams.get('categories') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const profile = await buildExtensionProfile(userId);
  if (!profile) return jsonWithCors(req, { success: false, message: 'User not found' }, 404);

  // Resume is always for THIS authenticated user only.
  const resume = await resumePayload(userId);

  if (!categories.length) return jsonWithCors(req, { success: true, userId, profile, resume });

  const allowed = new Set(categories);
  const filtered = {
    ...profile,
    personal: allowed.has('personal') ? profile.personal : {},
    education: allowed.has('education') ? profile.education : {},
    links: allowed.has('links') ? profile.links : {},
    preferences: allowed.has('preferences') ? profile.preferences : {},
    documents: allowed.has('documents') ? profile.documents : {},
    skills: allowed.has('skills') ? profile.skills : [],
    experience: allowed.has('experience') ? profile.experience : [],
    projects: allowed.has('projects') ? profile.projects : [],
    custom: allowed.has('custom') || allowed.has('preferences') ? profile.custom : {},
  };
  return jsonWithCors(req, { success: true, userId, profile: filtered, resume });
}
