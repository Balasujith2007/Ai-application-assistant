import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/gamification/adminGuard';
import { getTokenRules } from '@/lib/gamification/tokenConfig';

/**
 * GET /api/admin/gamification/shop/analytics
 * Super Admin only. Token consumption and shop purchase analytics computed
 * exclusively from real persisted records (no fabricated values).
 */
export async function GET(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return auth.response;

  const now = new Date();

  const [
    srAwarded,
    srUsed,
    srExpired,
    lbAwarded,
    lbUsed,
    lbExpired,
    totalPurchases,
    activePurchases,
    refundedPurchases,
    coinsSpent,
    coinsRefunded,
    purchasesByType,
    purchasesByItem,
    recentPurchases,
    profileStats,
  ] = await Promise.all([
    prisma.streakRescueToken.count(),
    prisma.streakRescueToken.count({ where: { isUsed: true } }),
    prisma.streakRescueToken.count({ where: { isUsed: false, expiresAt: { lte: now } } }),
    prisma.leaderboardBoostToken.count(),
    prisma.leaderboardBoostToken.count({ where: { isUsed: true } }),
    prisma.leaderboardBoostToken.count({ where: { isUsed: false, expiresAt: { lte: now } } }),
    prisma.shopPurchase.count(),
    prisma.shopPurchase.count({ where: { status: 'ACTIVE' } }),
    prisma.shopPurchase.count({ where: { status: 'REFUNDED' } }),
    prisma.shopPurchase.aggregate({ where: { status: 'ACTIVE' }, _sum: { coinPrice: true } }),
    prisma.coinTransaction.aggregate({ where: { transactionType: 'REFUND' }, _sum: { amount: true } }),
    prisma.shopPurchase.groupBy({
      by: ['itemType'],
      where: { status: 'ACTIVE' },
      _count: { _all: true },
      _sum: { coinPrice: true },
    }),
    prisma.shopPurchase.groupBy({
      by: ['rewardDefId', 'itemName'],
      where: { status: 'ACTIVE' },
      _count: { _all: true },
      _sum: { coinPrice: true },
      orderBy: { _count: { rewardDefId: 'desc' } },
      take: 10,
    }),
    prisma.shopPurchase.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: { student: { select: { id: true, name: true, email: true } } },
    }),
    prisma.profile.count({
      where: {
        OR: [
          { equippedFrameRewardId: { not: null } },
          { equippedTitleRewardId: { not: null } },
          { equippedBadgeId: { not: null } },
        ],
      },
    }),
  ]);

  const tokenRules = await getTokenRules(true);

  const srAvailable = srAwarded - srUsed - srExpired;
  const lbAvailable = lbAwarded - lbUsed - lbExpired;

  return NextResponse.json({
    success: true,
    generatedAt: now.toISOString(),
    tokens: {
      streakRescue: {
        awarded: srAwarded,
        used: srUsed,
        expired: srExpired,
        available: Math.max(0, srAvailable),
        usageRate: srAwarded > 0 ? Math.round((srUsed / srAwarded) * 10000) / 100 : 0,
        rulesEnabled: tokenRules.streakRescue.enabled,
        windowDays: tokenRules.streakRescue.windowDays,
      },
      leaderboardBoost: {
        awarded: lbAwarded,
        used: lbUsed,
        expired: lbExpired,
        available: Math.max(0, lbAvailable),
        usageRate: lbAwarded > 0 ? Math.round((lbUsed / lbAwarded) * 10000) / 100 : 0,
        enabled: tokenRules.leaderboardBoost.enabled,
        note: 'Leaderboard Boost is intentionally non-consumable: it can never affect ranking.',
      },
    },
    shop: {
      totalPurchases,
      activePurchases,
      refundedPurchases,
      coinsSpent: coinsSpent._sum.coinPrice || 0,
      coinsRefunded: coinsRefunded._sum.amount || 0,
      distinctStudentsWithCosmetics: profileStats,
      purchasesByType: purchasesByType.map((p) => ({
        itemType: p.itemType,
        count: p._count._all,
        coinsSpent: p._sum.coinPrice || 0,
      })),
      topItems: purchasesByItem.map((p) => ({
        rewardDefId: p.rewardDefId,
        itemName: p.itemName,
        count: p._count._all,
        coinsSpent: p._sum.coinPrice || 0,
      })),
      recentPurchases,
    },
  });
}
