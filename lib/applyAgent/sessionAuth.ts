import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';

export async function getUserIdFromJwtOrSession(req: Request, body?: { sessionToken?: string }): Promise<string | null> {
  const jwtId = getUserIdFromRequest(req);
  if (jwtId) return jwtId;

  const urlToken = (() => {
    try {
      return new URL(req.url).searchParams.get('sessionId') || new URL(req.url).searchParams.get('sessionToken');
    } catch {
      return null;
    }
  })();

  const sessionToken = body?.sessionToken || urlToken;
  if (!sessionToken) return null;

  const session = await prisma.autofillSession.findUnique({ where: { sessionToken } });
  if (!session) return null;
  if (new Date() > session.expiresAt) return null;
  return session.studentId;
}
