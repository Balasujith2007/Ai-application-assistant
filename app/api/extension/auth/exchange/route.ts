import { jsonWithCors, optionsOk } from '@/lib/applyAgent/cors';
import { hashAuthCode, isCodeConsumed, isCodeExpired } from '@/lib/applyAgent/authCode';
import { signExtensionToken } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';

export function OPTIONS(req: Request) {
  return optionsOk(req);
}

/** Exchanges a one-time code for a 2h extension access token. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = String(body.code || '');
  const state = String(body.state || '');
  if (!code || !state) {
    return jsonWithCors(req, { success: false, message: 'code and state are required' }, 400);
  }

  const row = await prisma.extensionAuthCode.findUnique({
    where: { codeHash: hashAuthCode(code) },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });

  if (!row || row.state !== state) {
    return jsonWithCors(req, { success: false, message: 'Invalid authorization code' }, 401);
  }
  if (isCodeConsumed(row.usedAt) || isCodeExpired(row.expiresAt)) {
    return jsonWithCors(req, { success: false, message: 'Authorization code expired or already used' }, 401);
  }

  await prisma.extensionAuthCode.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });

  const token = signExtensionToken({
    sub: row.user.id,
    email: row.user.email,
    role: row.user.role,
  });

  return jsonWithCors(req, {
    success: true,
    token,
    expiresIn: 7200,
    user: {
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
      role: row.user.role,
    },
  });
}
