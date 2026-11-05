import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { applyCoinMutationInTx } from './coinLedger';

/**
 * Coin Redemption Shop Service
 * ----------------------------
 * Sells cosmetic items (profile frames, titles, cosmetic badges) for coins.
 *
 * Guarantees:
 *  - The price is ALWAYS read from the server-side `RewardDefinition`
 *    (`coinPrice`). A client-supplied price is never trusted.
 *  - Coin deduction and `ShopPurchase` creation happen in ONE database
 *    transaction via the existing `applyCoinMutationInTx` service. Either both
 *    succeed or neither does.
 *  - Idempotency keys make retries safe; the unique `(studentId, rewardDefId)`
 *    constraint prevents duplicate ownership of the same cosmetic item, even
 *    under concurrent requests.
 *  - `CoinTransaction` history is immutable: refunds are recorded as new
 *    `REFUND` ledger rows through the same audited service, never by editing or
 *    deleting existing rows.
 *  - Purchase history is preserved even if a shop item is later disabled.
 */

export type ShopErrorCode =
  | 'INVALID_INPUT'
  | 'ITEM_NOT_FOUND'
  | 'ITEM_NOT_AVAILABLE'
  | 'INVALID_PRICE'
  | 'ALREADY_OWNED'
  | 'INSUFFICIENT_COINS'
  | 'PURCHASE_NOT_FOUND'
  | 'ALREADY_REFUNDED';

export class ShopError extends Error {
  code: ShopErrorCode;
  constructor(code: ShopErrorCode, message: string) {
    super(message);
    this.name = 'ShopError';
    this.code = code;
  }
}

type TxClient = Prisma.TransactionClient;

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  itemType: string; // FRAME | TITLE | BADGE | SHOWCASE
  coinPrice: number;
  itemValue: string; // canonical asset identifier (ownership-verified on equip)
  rewardType: string;
  rarity: string;
  purchaseLimit: number;
  owned: boolean;
}

function resolveItemType(rewardType: string): string | null {
  switch (rewardType) {
    case 'PROFILE_FRAME':
      return 'FRAME';
    case 'PROFILE_TITLE':
      return 'TITLE';
    case 'EXCLUSIVE_BADGE':
      return 'BADGE';
    case 'ACHIEVEMENT_REWARD':
      return 'SHOWCASE';
    default:
      return null;
  }
}

/** The canonical, server-owned value for an item (never a client-provided string). */
export function resolveCanonicalItemValue(def: {
  rewardType: string;
  profileFrameUrl: string | null;
  badgeId: string | null;
  name: string;
}): string | null {
  switch (def.rewardType) {
    case 'PROFILE_FRAME':
      return def.profileFrameUrl;
    case 'PROFILE_TITLE':
      return def.name;
    case 'EXCLUSIVE_BADGE':
      return def.badgeId;
    default:
      return null;
  }
}

/** Lists purchasable shop items with the caller's ownership status. */
export async function listShopItems(studentId?: string): Promise<ShopItem[]> {
  const defs = await prisma.rewardDefinition.findMany({
    where: { isShopItem: true, enabled: true },
    orderBy: [{ shopCategory: 'asc' }, { coinPrice: 'asc' }],
  });

  const ownedDefIds = new Set<string>();
  if (studentId && defs.length > 0) {
    const purchases = await prisma.shopPurchase.findMany({
      where: { studentId, status: 'ACTIVE', rewardDefId: { in: defs.map((d) => d.id) } },
      select: { rewardDefId: true },
    });
    purchases.forEach((p) => ownedDefIds.add(p.rewardDefId));
  }

  return defs
    .map((def): ShopItem | null => {
      const itemType = resolveItemType(def.rewardType);
      const itemValue = resolveCanonicalItemValue(def);
      if (!itemType || !itemValue || def.coinPrice === null) return null;
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        itemType,
        coinPrice: def.coinPrice,
        itemValue,
        rewardType: def.rewardType,
        rarity: def.rewardRarity,
        purchaseLimit: def.purchaseLimit ?? 1,
        owned: ownedDefIds.has(def.id),
      } satisfies ShopItem;
    })
    .filter((x): x is ShopItem => x !== null);
}

export interface PurchaseResult {
  success: true;
  alreadyApplied: boolean;
  purchaseId: string;
  rewardDefId: string;
  itemType: string;
  itemName: string;
  itemValue: string;
  coinPrice: number;
  newBalance: number;
}

/**
 * Purchases a shop item for the given student. The price is resolved
 * server-side; the client may only supply the item id and an idempotency key.
 */
export async function purchaseItem(
  studentId: string,
  rewardDefId: string,
  idempotencyKey: string
): Promise<PurchaseResult> {
  if (!rewardDefId || typeof rewardDefId !== 'string') {
    throw new ShopError('INVALID_INPUT', 'A valid shop item id is required.');
  }
  if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.length < 8) {
    throw new ShopError('INVALID_INPUT', 'A valid idempotency key is required.');
  }

  return prisma.$transaction(async (tx) => {
    // 0. Idempotency: a retried request returns the original purchase.
    const existingByIdem = await tx.shopPurchase.findUnique({ where: { idempotencyKey } });
    if (existingByIdem) {
      const balanceRow = await tx.studentCoinBalance.findUnique({ where: { studentId } });
      return {
        success: true,
        alreadyApplied: true,
        purchaseId: existingByIdem.id,
        rewardDefId: existingByIdem.rewardDefId,
        itemType: existingByIdem.itemType,
        itemName: existingByIdem.itemName,
        itemValue: existingByIdem.itemValue,
        coinPrice: existingByIdem.coinPrice,
        newBalance: balanceRow?.balance ?? 0,
      } satisfies PurchaseResult;
    }

    // 1. Resolve the item and its authoritative server-side price.
    const def = await tx.rewardDefinition.findUnique({ where: { id: rewardDefId } });
    if (!def) throw new ShopError('ITEM_NOT_FOUND', 'Shop item not found.');
    if (!def.isShopItem || !def.enabled) {
      throw new ShopError('ITEM_NOT_AVAILABLE', 'This item is not available for purchase.');
    }
    if (def.coinPrice === null || def.coinPrice < 0) {
      throw new ShopError('INVALID_PRICE', 'This item does not have a valid price.');
    }
    const itemType = resolveItemType(def.rewardType);
    const itemValue = resolveCanonicalItemValue(def);
    if (!itemType || !itemValue) {
      throw new ShopError('ITEM_NOT_AVAILABLE', 'This item type cannot be sold in the shop.');
    }

    // 2. Duplicate-ownership guard (DB unique constraint is the hard guarantee).
    const existingOwned = await tx.shopPurchase.findUnique({
      where: { shop_purchases_studentId_rewardDefId_unique: { studentId, rewardDefId } },
    });
    if (existingOwned) {
      throw new ShopError('ALREADY_OWNED', 'You already own this item.');
    }

    // 3. Deduct coins — server-resolved price, atomic, idempotent.
    let newBalance: number;
    try {
      const coinResult = await applyCoinMutationInTx(tx, {
        studentId,
        amount: -def.coinPrice,
        transactionType: 'REWARD_DEBIT',
        reason: `Shop purchase: ${def.name}`,
        referenceId: rewardDefId,
        idempotencyKey: `shop_purchase_coins_${idempotencyKey}`,
      });
      newBalance = coinResult.newBalance;
    } catch (error) {
      if (error instanceof Error && error.message === 'INSUFFICIENT_COIN_BALANCE') {
        throw new ShopError('INSUFFICIENT_COINS', 'You do not have enough coins for this item.');
      }
      throw error;
    }

    // 4. Create the immutable purchase record.
    let purchase;
    try {
      purchase = await tx.shopPurchase.create({
        data: {
          studentId,
          rewardDefId,
          itemType,
          itemName: def.name,
          itemValue,
          coinPrice: def.coinPrice,
          status: 'ACTIVE',
          idempotencyKey,
        },
      });
    } catch (error) {
      // Concurrent duplicate ownership -> unique violation rolls everything back.
      if (typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002') {
        throw new ShopError('ALREADY_OWNED', 'You already own this item.');
      }
      throw error;
    }

    return {
      success: true,
      alreadyApplied: false,
      purchaseId: purchase.id,
      rewardDefId,
      itemType,
      itemName: purchase.itemName,
      itemValue: purchase.itemValue,
      coinPrice: purchase.coinPrice,
      newBalance,
    } satisfies PurchaseResult;
  });
}

export interface RefundResult {
  success: true;
  alreadyApplied: boolean;
  purchaseId: string;
  coinsRefunded: number;
  newBalance: number;
}

/**
 * Admin-only, audited refund. Credits the exact price back through the coin
 * ledger (a new immutable REFUND row) and marks the purchase REFUNDED — the
 * purchase history is preserved. If the item was equipped it is unequipped.
 */
export async function refundPurchase(
  adminId: string,
  purchaseId: string,
  reason: string
): Promise<RefundResult> {
  if (!purchaseId) throw new ShopError('INVALID_INPUT', 'A purchase id is required.');
  if (!reason || reason.trim().length < 3) {
    throw new ShopError('INVALID_INPUT', 'A refund reason is required.');
  }

  return prisma.$transaction(async (tx) => {
    const purchase = await tx.shopPurchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) throw new ShopError('PURCHASE_NOT_FOUND', 'Purchase not found.');
    if (purchase.status === 'REFUNDED') {
      throw new ShopError('ALREADY_REFUNDED', 'This purchase has already been refunded.');
    }

    const coinResult = await applyCoinMutationInTx(tx, {
      studentId: purchase.studentId,
      amount: purchase.coinPrice,
      transactionType: 'REFUND',
      reason: `Shop refund (by admin ${adminId}): ${reason}`,
      referenceId: purchaseId,
      idempotencyKey: `shop_refund_${purchaseId}`,
    });

    const txRow = await tx.coinTransaction.findUnique({
      where: { idempotencyKey: `shop_refund_${purchaseId}` },
      select: { id: true },
    });

    await tx.shopPurchase.update({
      where: { id: purchaseId },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
        refundedById: adminId,
        refundTransactionId: txRow?.id ?? null,
      },
    });

    // Unequip the refunded cosmetic if it is currently equipped.
    const profile = await tx.profile.findUnique({ where: { userId: purchase.studentId } });
    if (profile) {
      const patch: Prisma.ProfileUpdateInput = {};
      if (profile.equippedFrameRewardId === purchase.rewardDefId) patch.equippedFrameRewardId = null;
      if (profile.equippedTitleRewardId === purchase.rewardDefId) patch.equippedTitleRewardId = null;
      if (profile.equippedBadgeId === purchase.itemValue) patch.equippedBadgeId = null;
      if (Object.keys(patch).length > 0) {
        await tx.profile.update({ where: { userId: purchase.studentId }, data: patch });
      }
    }

    return {
      success: true,
      alreadyApplied: coinResult.alreadyApplied,
      purchaseId,
      coinsRefunded: purchase.coinPrice,
      newBalance: coinResult.newBalance,
    } satisfies RefundResult;
  });
}

/** Purchase history for a student (newest first). */
export async function getPurchaseHistory(studentId: string, take = 50) {
  return prisma.shopPurchase.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
    take,
  });
}

export const shopService = {
  listShopItems,
  purchaseItem,
  refundPurchase,
  getPurchaseHistory,
  resolveCanonicalItemValue,
};
