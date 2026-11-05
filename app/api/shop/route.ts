import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { listShopItems } from '@/lib/gamification/shopService';
import { getCoinBalance } from '@/lib/gamification/coinLedger';

/**
 * GET /api/shop
 * Lists purchasable cosmetics with the authoritative server-side prices and the
 * caller's ownership status. No price is ever accepted from the client.
 */
export async function GET(req: Request) {
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

    const [items, balance] = await Promise.all([listShopItems(userId), getCoinBalance(userId)]);
    return NextResponse.json({ success: true, items, balance });
  } catch (error: any) {
    console.error('Error fetching shop items:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch shop items' },
      { status: 500 }
    );
  }
}
