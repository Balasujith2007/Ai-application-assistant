import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';

/**
 * Strict Super Admin guard for gamification management endpoints.
 * Returns the authenticated Super Admin's id, or a ready-to-return error
 * response. Every shop/token management endpoint must call this first.
 */
export async function requireSuperAdmin(
  req: Request
): Promise<{ ok: true; userId: string } | { ok: false; response: NextResponse }> {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, active: true },
  });

  if (!user || !user.active || user.role !== 'SUPER_ADMIN') {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: 'Unauthorized. Super Admin access required.' },
        { status: 403 }
      ),
    };
  }

  return { ok: true, userId: user.id };
}
