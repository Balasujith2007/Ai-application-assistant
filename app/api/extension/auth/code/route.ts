import { getUserIdFromRequest } from '@/lib/serverAuth';
import { jsonWithCors, optionsOk } from '@/lib/applyAgent/cors';
import { generateAuthCode } from '@/lib/applyAgent/authCode';
import prisma from '@/lib/prisma';

export function OPTIONS(req: Request) {
  return optionsOk(req);
}

/** Creates a one-time, 2-minute authorization code. Never returns JWT to the page. */
export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return jsonWithCors(req, { success: false, message: 'Unauthorized' }, 401);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true } });
  if (!user) return jsonWithCors(req, { success: false, message: 'User not found' }, 404);

  const generated = generateAuthCode();
  await prisma.extensionAuthCode.create({
    data: {
      userId,
      codeHash: generated.hash,
      state: generated.state,
      expiresAt: generated.expiresAt,
    },
  });

  return jsonWithCors(req, {
    success: true,
    code: generated.code,
    state: generated.state,
    expiresAt: generated.expiresAt.toISOString(),
  });
}
