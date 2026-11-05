/**
 * ATLYX Phase 4 — Tokens, Shop, Customization & Ownership Test Suite
 * -------------------------------------------------------------------
 * Runs against an ISOLATED, disposable test student and test shop items, all of
 * which are created with a unique run suffix and fully deleted at the end.
 *
 * It does NOT touch real students, does NOT trigger production cron, and does
 * NOT distribute rewards to real accounts.
 *
 * Run: npx tsx scripts/test_phase4_rewards_suite.ts
 */
import prisma from '../lib/prisma';
import { applyCoinMutation } from '../lib/gamification/coinLedger';
import {
  listShopItems,
  purchaseItem,
  refundPurchase,
  getPurchaseHistory,
  ShopError,
} from '../lib/gamification/shopService';
import {
  getOwnedCosmetics,
  equipCosmetic,
  CustomizationError,
} from '../lib/gamification/customizationService';
import {
  rescueStreak,
  useLeaderboardBoost,
  getEligibleStreakRescueDates,
  getTokenInventory,
  TokenUsageError,
} from '../lib/gamification/tokenService';
import { getFormattedDateInTz } from '../lib/gamification/checkInService';

let passed = 0;
let total = 0;

function assert(condition: boolean, name: string, details?: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  PASS: ${name}`);
  } else {
    console.error(`  FAIL: ${name}${details ? ` — ${details}` : ''}`);
  }
}

async function expectError(fn: () => Promise<unknown>, code: string, name: string) {
  try {
    await fn();
    assert(false, name, `expected error code ${code} but call succeeded`);
  } catch (error: any) {
    assert(error?.code === code, name, `got code ${error?.code ?? error?.message}`);
  }
}

function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + delta * 86_400_000;
  const nd = new Date(t);
  return `${nd.getUTCFullYear()}-${String(nd.getUTCMonth() + 1).padStart(2, '0')}-${String(
    nd.getUTCDate()
  ).padStart(2, '0')}`;
}

async function run() {
  console.log('=====================================================');
  console.log('ATLYX Phase 4 — Tokens / Shop / Customization Suite');
  console.log('=====================================================\n');

  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let studentId = '';
  const rewardDefIds: string[] = [];
  let purchaseId: string | null = null;

  try {
    // ── Isolated test fixtures ───────────────────────────────────────────────
    const student = await prisma.user.create({
      data: {
        name: `Phase4 Test Student ${suffix}`,
        email: `phase4.test.${suffix}@atlyx.test`,
        role: 'STUDENT',
        active: true,
      },
    });
    studentId = student.id;

    const frame = await prisma.rewardDefinition.create({
      data: {
        rewardType: 'PROFILE_FRAME',
        rewardRarity: 'RARE',
        name: `Test Frame ${suffix}`,
        description: 'Phase4 test frame',
        profileFrameUrl: `https://cdn.atlyx.test/frames/${suffix}.png`,
        isShopItem: true,
        shopCategory: 'FRAME',
        coinPrice: 100,
        purchaseLimit: 1,
        enabled: true,
      },
    });
    const expensive = await prisma.rewardDefinition.create({
      data: {
        rewardType: 'PROFILE_TITLE',
        rewardRarity: 'LEGENDARY',
        name: `Test Title ${suffix}`,
        description: 'Phase4 expensive title',
        isShopItem: true,
        shopCategory: 'TITLE',
        coinPrice: 100000,
        purchaseLimit: 1,
        enabled: true,
      },
    });
    const notOwnedFrame = await prisma.rewardDefinition.create({
      data: {
        rewardType: 'PROFILE_FRAME',
        rewardRarity: 'COMMON',
        name: `Unowned Frame ${suffix}`,
        description: 'Phase4 unowned frame',
        profileFrameUrl: `https://cdn.atlyx.test/frames/unowned-${suffix}.png`,
        isShopItem: false,
        coinPrice: 50,
        enabled: true,
      },
    });
    rewardDefIds.push(frame.id, expensive.id, notOwnedFrame.id);

    // Seed coins through the ledger (immutable BONUS row).
    await applyCoinMutation({
      studentId,
      amount: 500,
      transactionType: 'BONUS',
      reason: 'Phase4 test seed',
      idempotencyKey: `phase4_seed_${suffix}`,
    });

    // ── Group 1: Shop listing ────────────────────────────────────────────────
    console.log('--- Group 1: Shop catalogue ---');
    const items = await listShopItems(studentId);
    const listed = items.find((i) => i.id === frame.id);
    assert(!!listed, 'Own shop item appears in catalogue');
    assert(listed?.coinPrice === 100, 'Catalogue exposes server-side price', `got ${listed?.coinPrice}`);
    assert(listed?.owned === false, 'Item reported as not owned before purchase');

    // ── Group 2: Purchase atomicity + idempotency ────────────────────────────
    console.log('\n--- Group 2: Purchase (atomic debit + idempotency) ---');
    const key1 = `phase4_buy_${suffix}_a`;
    const purchase = await purchaseItem(studentId, frame.id, key1);
    purchaseId = purchase.purchaseId;
    assert(purchase.alreadyApplied === false, 'First purchase applied');
    assert(purchase.coinPrice === 100, 'Charged the server-side price');
    assert(purchase.newBalance === 400, 'Balance debited by exactly the price', `got ${purchase.newBalance}`);

    const ledgerRows = await prisma.coinTransaction.count({
      where: { studentId, idempotencyKey: `shop_purchase_coins_${key1}` },
    });
    assert(ledgerRows === 1, 'Single immutable debit ledger row for the purchase');

    const retry = await purchaseItem(studentId, frame.id, key1);
    assert(retry.alreadyApplied === true, 'Idempotent retry did not re-apply');
    const balanceAfterRetry = await prisma.studentCoinBalance.findUnique({ where: { studentId } });
    assert(balanceAfterRetry?.balance === 400, 'Balance unchanged after idempotent retry', `got ${balanceAfterRetry?.balance}`);

    await expectError(
      () => purchaseItem(studentId, frame.id, `phase4_buy_${suffix}_b`),
      'ALREADY_OWNED',
      'Duplicate ownership blocked (unique constraint honoured)'
    );

    // ── Group 3: Insufficient coins ──────────────────────────────────────────
    console.log('\n--- Group 3: Insufficient coins ---');
    await expectError(
      () => purchaseItem(studentId, expensive.id, `phase4_buy_${suffix}_c`),
      'INSUFFICIENT_COINS',
      'Purchase rejected when balance is too low'
    );
    const balanceAfterFail = await prisma.studentCoinBalance.findUnique({ where: { studentId } });
    assert(balanceAfterFail?.balance === 400, 'Balance unchanged after failed purchase (rollback)', `got ${balanceAfterFail?.balance}`);
    const failedPurchase = await prisma.shopPurchase.count({ where: { studentId, rewardDefId: expensive.id } });
    assert(failedPurchase === 0, 'No purchase row created for the failed transaction');

    // ── Group 4: Customization ownership ─────────────────────────────────────
    console.log('\n--- Group 4: Customization (ownership-verified equipping) ---');
    const cosmetics = await getOwnedCosmetics(studentId);
    assert(cosmetics.frames.some((f) => f.rewardDefId === frame.id), 'Owned frame appears in customization catalogue');
    assert(
      cosmetics.frames.find((f) => f.rewardDefId === frame.id)?.source === 'SHOP',
      'Ownership source recorded as SHOP'
    );

    const equipped = await equipCosmetic(studentId, 'FRAME', frame.id);
    assert(
      equipped.frames.find((f) => f.rewardDefId === frame.id)?.equipped === true,
      'Owned frame equipped and persisted'
    );

    await expectError(
      () => equipCosmetic(studentId, 'FRAME', notOwnedFrame.id),
      'NOT_OWNED',
      'Equipping an unowned frame is rejected'
    );
    await expectError(
      () => equipCosmetic(studentId, 'BADGE', 'not-a-real-badge'),
      'NOT_OWNED',
      'Equipping an unowned badge is rejected'
    );

    // ── Group 5: Streak rescue (career-activity streak) ──────────────────────
    console.log('\n--- Group 5: Streak Rescue token ---');
    const today = getFormattedDateInTz();
    const gapDate = addDays(today, -1);
    // Real career-activity days: D-2..D-6 plus today, leaving D-1 as the gap.
    for (const offset of [0, 2, 3, 4, 5, 6]) {
      const d = addDays(today, -offset);
      await prisma.studentDailyStreak.create({
        data: { studentId, activityDate: d, activityType: 'CODING_PRACTICE', sourceReference: 'PHASE4_TEST' },
      });
    }

    const eligible = await getEligibleStreakRescueDates(studentId);
    assert(
      eligible.some((e) => e.date === gapDate),
      'Missed date derived from real streak gaps is eligible (not hardcoded to yesterday only)',
      `eligible=${eligible.map((e) => e.date).join(',')}`
    );

    const token = await prisma.streakRescueToken.create({
      data: {
        studentId,
        missedDate: gapDate,
        eligibleDate: gapDate,
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
      },
    });

    const rescue = await rescueStreak(studentId, token.id, gapDate);
    assert(rescue.restoredDate === gapDate, 'Streak rescue restored the eligible missed date');
    const restoredRow = await prisma.studentDailyStreak.findUnique({
      where: { studentId_activityDate: { studentId, activityDate: gapDate } },
    });
    assert(restoredRow?.activityType === 'STREAK_RESCUE', 'Restored day persisted as STREAK_RESCUE');
    const tokenAfter = await prisma.streakRescueToken.findUnique({ where: { id: token.id } });
    assert(tokenAfter?.isUsed === true && tokenAfter?.usedForDate === gapDate, 'Token marked used for the restored date');

    await expectError(
      () => rescueStreak(studentId, token.id, gapDate),
      'ALREADY_USED',
      'Re-using the same token is rejected'
    );

    const token2 = await prisma.streakRescueToken.create({
      data: {
        studentId,
        missedDate: gapDate,
        eligibleDate: gapDate,
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
      },
    });
    await expectError(
      () => rescueStreak(studentId, token2.id, gapDate),
      'ALREADY_RESTORED',
      'Duplicate restoration of the same date is blocked'
    );

    const expiredToken = await prisma.streakRescueToken.create({
      data: {
        studentId,
        missedDate: addDays(today, -2),
        eligibleDate: addDays(today, -2),
        expiresAt: new Date(Date.now() - 86_400_000),
      },
    });
    await expectError(
      () => rescueStreak(studentId, expiredToken.id),
      'EXPIRED',
      'Expired token is rejected'
    );

    // ── Group 6: Leaderboard boost (ranking protection) ──────────────────────
    console.log('\n--- Group 6: Leaderboard Boost ranking protection ---');
    const boostToken = await prisma.leaderboardBoostToken.create({
      data: { studentId, boostPercentage: 0.1, expiresAt: new Date(Date.now() + 7 * 86_400_000) },
    });
    await expectError(
      () => useLeaderboardBoost(studentId, boostToken.id),
      'UNAVAILABLE',
      'Leaderboard Boost has no ranking-safe benefit and is refused'
    );
    const boostAfter = await prisma.leaderboardBoostToken.findUnique({ where: { id: boostToken.id } });
    assert(boostAfter?.isUsed === false, 'Refused boost consumed nothing (token still unused)');

    // Inventory aggregation sanity.
    const inventory = await getTokenInventory(studentId);
    assert(inventory.streakRescue.usedCount === 1, 'Token inventory reports used count from real records');
    assert(inventory.leaderboardBoost.status.available === false, 'Inventory reports boost as unavailable');
    assert(inventory.leaderboardBoost.status.rankingNeutral === true, 'Inventory marks boost as ranking-neutral');

    // ── Group 7: Audited refund ──────────────────────────────────────────────
    console.log('\n--- Group 7: Audited refund ---');
    assert(!!purchaseId, 'Purchase id available for refund');
    const refund = await refundPurchase('phase4-test-admin', purchaseId!, 'Phase4 test refund');
    assert(refund.coinsRefunded === 100, 'Refund credited the exact purchase price');
    assert(refund.newBalance === 500, 'Balance restored after refund', `got ${refund.newBalance}`);

    const refundedRow = await prisma.shopPurchase.findUnique({ where: { id: purchaseId! } });
    assert(refundedRow?.status === 'REFUNDED', 'Purchase marked REFUNDED (history preserved)');
    const profileAfterRefund = await prisma.profile.findUnique({ where: { userId: studentId } });
    assert(
      profileAfterRefund?.equippedFrameRewardId === null,
      'Refunded cosmetic was unequipped'
    );

    const history = await getPurchaseHistory(studentId);
    assert(history.length === 1 && history[0].status === 'REFUNDED', 'Purchase history preserved with refund status');

    await expectError(
      () => refundPurchase('phase4-test-admin', purchaseId!, 'Second refund'),
      'ALREADY_REFUNDED',
      'Double refund is rejected'
    );

    console.log('\n=====================================================');
    console.log(`RESULT: ${passed}/${total} assertions passed`);
    console.log('=====================================================\n');
  } catch (error) {
    console.error('\nFatal error during Phase 4 test suite:', error);
  } finally {
    // ── Cleanup: remove every fixture created by this run ─────────────────────
    if (studentId) {
      await prisma.shopPurchase.deleteMany({ where: { studentId } }).catch(() => {});
      await prisma.coinTransaction.deleteMany({ where: { studentId } }).catch(() => {});
      await prisma.studentCoinBalance.deleteMany({ where: { studentId } }).catch(() => {});
      await prisma.streakRescueToken.deleteMany({ where: { studentId } }).catch(() => {});
      await prisma.leaderboardBoostToken.deleteMany({ where: { studentId } }).catch(() => {});
      await prisma.studentDailyStreak.deleteMany({ where: { studentId } }).catch(() => {});
      await prisma.profile.deleteMany({ where: { userId: studentId } }).catch(() => {});
    }
    if (rewardDefIds.length > 0) {
      await prisma.rewardDefinition.deleteMany({ where: { id: { in: rewardDefIds } } }).catch(() => {});
    }
    if (studentId) {
      await prisma.user.delete({ where: { id: studentId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

run();
