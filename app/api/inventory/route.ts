import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import { getTokenInventory } from '@/lib/gamification/tokenService';
import { getOwnedCosmetics } from '@/lib/gamification/customizationService';
import { getCoinHistory } from '@/lib/gamification/coinLedger';
import { getPurchaseHistory } from '@/lib/gamification/shopService';

/**
 * GET /api/inventory
 * Returns the centralized reward inventory for the authenticated student.
 *
 * This route is a thin aggregator: it reuses the existing coin balance, coin
 * ledger history, purchase history, token engine and customization catalogue.
 * It never duplicates the coin balance or re-implements ownership rules.
 */
export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, active: true },
    });

    if (!user || !user.active) {
      return NextResponse.json(
        { success: false, message: 'User not found or deactivated' },
        { status: 403 }
      );
    }

    // 1. Balance overview (existing sources only — no duplicate balance logic).
    const [totalXp, coinBalance, totalBadges, totalRewards] = await Promise.all([
      prisma.pointsLedger.aggregate({
        where: { studentId: userId },
        _sum: { pointsAwarded: true },
      }),
      prisma.studentCoinBalance.findUnique({ where: { studentId: userId } }),
      prisma.studentBadge.count({ where: { studentId: userId } }),
      prisma.studentReward.count({ where: { studentId: userId } }),
    ]);

    // 2. Mystery Gift rewards.
    const [availableGifts, claimedRewards] = await Promise.all([
      prisma.studentReward.findMany({
        where: { studentId: userId, status: 'ALLOCATED' },
        orderBy: { allocatedAt: 'desc' },
        take: 10,
      }),
      prisma.studentReward.findMany({
        where: { studentId: userId, status: 'CLAIMED' },
        orderBy: { claimedAt: 'desc' },
        take: 20,
      }),
    ]);

    // 3. Tokens (available + used + expiry + eligible rescue dates) via the
    //    single token engine.
    const tokens = await getTokenInventory(userId);

    // 4. Owned cosmetics (ownership-verified, with equipped state & source).
    const cosmetics = await getOwnedCosmetics(userId);

    // 5. Ledger + purchase history (real records, ownership source).
    const [coinHistory, purchaseHistory] = await Promise.all([
      getCoinHistory(userId, 25),
      getPurchaseHistory(userId, 25),
    ]);

    return NextResponse.json({
      success: true,
      balance: {
        totalXp: Math.round((totalXp._sum.pointsAwarded || 0) * 10) / 10,
        availableCoins: coinBalance?.balance || 0,
        totalBadges,
        totalRewards,
      },
      gifts: {
        available: availableGifts,
        claimed: claimedRewards,
      },
      tokens,
      cosmetics,
      coinHistory,
      purchaseHistory,
    });
  } catch (error: any) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}
