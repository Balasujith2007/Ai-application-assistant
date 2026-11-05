import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { purchaseItem, ShopError, type ShopErrorCode } from '@/lib/gamification/shopService';

/**
 * POST /api/shop/purchase
 * Purchases a shop item. Body: { rewardDefId: string, idempotencyKey?: string }.
 * The price is resolved server-side from the RewardDefinition — a client price
 * is never accepted. Coin debit + ShopPurchase happen atomically.
 */
export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, active: true },
    });
    if (!user || !user.active) {
      return NextResponse.json({ success: false, message: 'User not found or deactivated' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const rewardDefId = typeof body?.rewardDefId === 'string' ? body.rewardDefId : '';
    const idempotencyKey =
      typeof body?.idempotencyKey === 'string' && body.idempotencyKey.length >= 8
        ? body.idempotencyKey
        : `shop_${userId}_${rewardDefId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    if (!rewardDefId) {
      return NextResponse.json({ success: false, message: 'rewardDefId is required' }, { status: 400 });
    }

    const result = await purchaseItem(userId, rewardDefId, idempotencyKey);
    return NextResponse.json({ ...result, success: true });
  } catch (error: any) {
    if (error instanceof ShopError) {
      const statusMap: Record<ShopErrorCode, number> = {
        INVALID_INPUT: 400,
        ITEM_NOT_FOUND: 404,
        ITEM_NOT_AVAILABLE: 409,
        INVALID_PRICE: 400,
        ALREADY_OWNED: 409,
        INSUFFICIENT_COINS: 402,
        PURCHASE_NOT_FOUND: 404,
        ALREADY_REFUNDED: 409,
      };
      return NextResponse.json(
        { success: false, code: error.code, message: error.message },
        { status: statusMap[error.code] ?? 400 }
      );
    }
    console.error('Error purchasing shop item:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to purchase item' },
      { status: 500 }
    );
  }
}
