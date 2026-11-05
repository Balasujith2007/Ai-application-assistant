import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/gamification/adminGuard';
import { refundPurchase, ShopError } from '@/lib/gamification/shopService';

/**
 * POST /api/admin/gamification/shop/refund
 * Super Admin only, audited refund. Credits the exact price back through the
 * coin ledger (new immutable REFUND row) and marks the purchase REFUNDED.
 * Body: { purchaseId: string, reason: string }.
 */
export async function POST(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const purchaseId = typeof body?.purchaseId === 'string' ? body.purchaseId : '';
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

  if (!purchaseId || !reason) {
    return NextResponse.json({ success: false, message: 'purchaseId and reason are required.' }, { status: 400 });
  }

  try {
    const result = await refundPurchase(auth.userId, purchaseId, reason);

    await prisma.auditLog.create({
      data: {
        userId: auth.userId,
        action: 'SHOP_PURCHASE_REFUND',
        target: purchaseId,
        details: `Refunded purchase ${purchaseId} (${result.coinsRefunded} coins). Reason: ${reason}`,
      },
    });

    return NextResponse.json({ ...result, success: true });
  } catch (error: any) {
    if (error instanceof ShopError) {
      const statusMap: Record<string, number> = {
        INVALID_INPUT: 400,
        PURCHASE_NOT_FOUND: 404,
        ALREADY_REFUNDED: 409,
      };
      return NextResponse.json(
        { success: false, code: error.code, message: error.message },
        { status: statusMap[error.code] ?? 400 }
      );
    }
    console.error('Error refunding purchase:', error);
    return NextResponse.json({ success: false, message: 'Failed to refund purchase' }, { status: 500 });
  }
}
