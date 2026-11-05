import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Profile Customization Service
 * -----------------------------
 * Equips cosmetic items (frames, titles, badges) onto a student profile.
 *
 * All customization is OWNERSHIP-BASED. A client may only reference an item by
 * its server identifier (a `RewardDefinition` id for frames/titles, or a
 * `badgeId` for badges). The canonical display value — e.g. the frame image
 * URL — is always resolved from the server, so an arbitrary URL or title string
 * can never be injected. Ownership is verified against `ShopPurchase`,
 * `StudentReward`, or `StudentBadge` before anything is equipped, and an
 * unavailable/expired/refunded item can never be equipped.
 *
 * Cosmetics are purely visual: they can never influence any score or ranking.
 */

export type CosmeticType = 'FRAME' | 'TITLE' | 'BADGE';

export type CosmeticSource = 'SHOP' | 'REWARD' | 'BADGE';

export type CustomizationErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_OWNED'
  | 'NOT_FOUND'
  | 'NOT_EQUIPPABLE'
  | 'LIMIT_EXCEEDED';

export class CustomizationError extends Error {
  code: CustomizationErrorCode;
  constructor(code: CustomizationErrorCode, message: string) {
    super(message);
    this.name = 'CustomizationError';
    this.code = code;
  }
}

export interface OwnedFrame {
  rewardDefId: string;
  name: string;
  url: string;
  rarity: string;
  source: CosmeticSource;
  equipped: boolean;
}

export interface OwnedTitle {
  rewardDefId: string;
  name: string;
  rarity: string;
  source: CosmeticSource;
  equipped: boolean;
}

export interface OwnedBadge {
  badgeId: string;
  title: string;
  icon: string;
  tier: string;
  source: CosmeticSource;
  equipped: boolean;
  showcased: boolean;
}

export interface OwnedCosmetics {
  frames: OwnedFrame[];
  titles: OwnedTitle[];
  badges: OwnedBadge[];
  showcaseBadgeIds: string[];
}

const MAX_SHOWCASE = 5;

async function getProfile(studentId: string) {
  return prisma.profile.findUnique({ where: { userId: studentId } });
}

/**
 * Resolves the full set of cosmetics a student owns, with equipped status.
 * Never trusts client input — the catalogue is read server-side.
 */
export async function getOwnedCosmetics(studentId: string): Promise<OwnedCosmetics> {
  const profile = await getProfile(studentId);
  const [purchases, claimedRewards, badges] = await Promise.all([
    prisma.shopPurchase.findMany({
      where: { studentId, status: 'ACTIVE' },
      include: { rewardDef: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.studentReward.findMany({
      where: { studentId, status: 'CLAIMED', rewardType: { in: ['PROFILE_FRAME', 'EXCLUSIVE_BADGE'] } },
      orderBy: { claimedAt: 'desc' },
    }),
    prisma.studentBadge.findMany({ where: { studentId }, orderBy: { awardedAt: 'desc' } }),
  ]);

  const showcase = profile?.showcaseBadgeIds ?? [];
  const equippedFrame = profile?.equippedFrameRewardId ?? null;
  const equippedTitle = profile?.equippedTitleRewardId ?? null;
  const equippedBadge = profile?.equippedBadgeId ?? null;

  // ── Frames ──
  const frames = new Map<string, OwnedFrame>();
  for (const s of purchases) {
    if (s.rewardDef.rewardType === 'PROFILE_FRAME' && s.rewardDef.profileFrameUrl) {
      frames.set(s.rewardDefId, {
        rewardDefId: s.rewardDefId,
        name: s.rewardDef.name,
        url: s.rewardDef.profileFrameUrl,
        rarity: s.rewardDef.rewardRarity,
        source: 'SHOP',
        equipped: equippedFrame === s.rewardDefId,
      });
    }
  }
  // Reward-granted frames, bridged to a RewardDefinition by matching frame URL.
  const rewardFrames = claimedRewards.filter((r) => r.rewardType === 'PROFILE_FRAME' && r.profileFrameUrl);
  if (rewardFrames.length > 0) {
    const defs = await prisma.rewardDefinition.findMany({
      where: { rewardType: 'PROFILE_FRAME', profileFrameUrl: { in: rewardFrames.map((r) => r.profileFrameUrl!) } },
    });
    for (const def of defs) {
      if (!def.profileFrameUrl || frames.has(def.id)) continue;
      frames.set(def.id, {
        rewardDefId: def.id,
        name: def.name,
        url: def.profileFrameUrl,
        rarity: def.rewardRarity,
        source: 'REWARD',
        equipped: equippedFrame === def.id,
      });
    }
  }

  // ── Titles ──
  const titles = new Map<string, OwnedTitle>();
  for (const s of purchases) {
    if (s.rewardDef.rewardType === 'PROFILE_TITLE') {
      titles.set(s.rewardDefId, {
        rewardDefId: s.rewardDefId,
        name: s.rewardDef.name,
        rarity: s.rewardDef.rewardRarity,
        source: 'SHOP',
        equipped: equippedTitle === s.rewardDefId,
      });
    }
  }

  // ── Badges ──
  const badgeMap = new Map<string, OwnedBadge>();
  for (const b of badges) {
    badgeMap.set(b.badgeId, {
      badgeId: b.badgeId,
      title: b.title,
      icon: b.icon,
      tier: b.tier,
      source: 'BADGE',
      equipped: equippedBadge === b.badgeId,
      showcased: showcase.includes(b.badgeId),
    });
  }
  for (const s of purchases) {
    if (s.rewardDef.rewardType === 'EXCLUSIVE_BADGE' && s.rewardDef.badgeId) {
      if (!badgeMap.has(s.rewardDef.badgeId)) {
        badgeMap.set(s.rewardDef.badgeId, {
          badgeId: s.rewardDef.badgeId,
          title: s.rewardDef.name,
          icon: '🎖️',
          tier: s.rewardDef.rewardRarity,
          source: 'SHOP',
          equipped: equippedBadge === s.rewardDef.badgeId,
          showcased: showcase.includes(s.rewardDef.badgeId),
        });
      }
    }
  }
  for (const r of claimedRewards) {
    if (r.rewardType === 'EXCLUSIVE_BADGE' && r.badgeId && !badgeMap.has(r.badgeId)) {
      badgeMap.set(r.badgeId, {
        badgeId: r.badgeId,
        title: r.badgeName ?? 'Reward Badge',
        icon: r.badgeIcon ?? '🎁',
        tier: r.rewardRarity,
        source: 'REWARD',
        equipped: equippedBadge === r.badgeId,
        showcased: showcase.includes(r.badgeId),
      });
    }
  }

  return {
    frames: Array.from(frames.values()),
    titles: Array.from(titles.values()),
    badges: Array.from(badgeMap.values()),
    showcaseBadgeIds: showcase,
  };
}

async function assertFrameOwned(studentId: string, rewardDefId: string): Promise<void> {
  const def = await prisma.rewardDefinition.findUnique({ where: { id: rewardDefId } });
  if (!def || def.rewardType !== 'PROFILE_FRAME' || !def.profileFrameUrl) {
    throw new CustomizationError('NOT_FOUND', 'Profile frame not found.');
  }
  const purchase = await prisma.shopPurchase.findFirst({
    where: { studentId, rewardDefId, status: 'ACTIVE' },
  });
  if (purchase) return;
  const reward = await prisma.studentReward.findFirst({
    where: { studentId, status: 'CLAIMED', rewardType: 'PROFILE_FRAME', profileFrameUrl: def.profileFrameUrl },
  });
  if (reward) return;
  throw new CustomizationError('NOT_OWNED', 'You do not own this profile frame.');
}

async function assertTitleOwned(studentId: string, rewardDefId: string): Promise<void> {
  const def = await prisma.rewardDefinition.findUnique({ where: { id: rewardDefId } });
  if (!def || def.rewardType !== 'PROFILE_TITLE') {
    throw new CustomizationError('NOT_FOUND', 'Profile title not found.');
  }
  const purchase = await prisma.shopPurchase.findFirst({
    where: { studentId, rewardDefId, status: 'ACTIVE' },
  });
  if (purchase) return;
  throw new CustomizationError('NOT_OWNED', 'You do not own this profile title.');
}

async function assertBadgeOwned(studentId: string, badgeId: string): Promise<void> {
  if (!badgeId || badgeId.length > 120) {
    throw new CustomizationError('INVALID_INPUT', 'A valid badge id is required.');
  }
  const badge = await prisma.studentBadge.findFirst({ where: { studentId, badgeId } });
  if (badge) return;
  const shopBadge = await prisma.shopPurchase.findFirst({
    where: { studentId, status: 'ACTIVE', itemType: 'BADGE', itemValue: badgeId },
  });
  if (shopBadge) return;
  throw new CustomizationError('NOT_OWNED', 'You do not own this badge.');
}

async function upsertProfile(studentId: string) {
  return prisma.profile.upsert({
    where: { userId: studentId },
    update: {},
    create: { userId: studentId },
  });
}

export async function equipCosmetic(
  studentId: string,
  type: CosmeticType,
  id: string
): Promise<OwnedCosmetics> {
  if (!['FRAME', 'TITLE', 'BADGE'].includes(type)) {
    throw new CustomizationError('INVALID_INPUT', 'Unknown cosmetic type.');
  }
  await upsertProfile(studentId);

  if (type === 'FRAME') {
    await assertFrameOwned(studentId, id);
    await prisma.profile.update({ where: { userId: studentId }, data: { equippedFrameRewardId: id } });
  } else if (type === 'TITLE') {
    await assertTitleOwned(studentId, id);
    await prisma.profile.update({ where: { userId: studentId }, data: { equippedTitleRewardId: id } });
  } else {
    await assertBadgeOwned(studentId, id);
    await prisma.profile.update({ where: { userId: studentId }, data: { equippedBadgeId: id } });
  }

  return getOwnedCosmetics(studentId);
}

export async function unequipCosmetic(studentId: string, type: CosmeticType): Promise<OwnedCosmetics> {
  await upsertProfile(studentId);
  const data: Prisma.ProfileUpdateInput =
    type === 'FRAME'
      ? { equippedFrameRewardId: null }
      : type === 'TITLE'
        ? { equippedTitleRewardId: null }
        : type === 'BADGE'
          ? { equippedBadgeId: null }
          : ({} as Prisma.ProfileUpdateInput);
  if (Object.keys(data).length === 0) {
    throw new CustomizationError('INVALID_INPUT', 'Unknown cosmetic type.');
  }
  await prisma.profile.update({ where: { userId: studentId }, data });
  return getOwnedCosmetics(studentId);
}

/** Sets the badge showcase. Every badge must already be owned. */
export async function setShowcaseBadges(
  studentId: string,
  badgeIds: string[]
): Promise<OwnedCosmetics> {
  if (!Array.isArray(badgeIds)) {
    throw new CustomizationError('INVALID_INPUT', 'badgeIds must be an array.');
  }
  const unique = Array.from(new Set(badgeIds));
  if (unique.length > MAX_SHOWCASE) {
    throw new CustomizationError('LIMIT_EXCEEDED', `You can showcase at most ${MAX_SHOWCASE} badges.`);
  }
  await upsertProfile(studentId);
  for (const badgeId of unique) {
    await assertBadgeOwned(studentId, badgeId);
  }
  await prisma.profile.update({
    where: { userId: studentId },
    data: { showcaseBadgeIds: unique },
  });
  return getOwnedCosmetics(studentId);
}

export const customizationService = {
  getOwnedCosmetics,
  equipCosmetic,
  unequipCosmetic,
  setShowcaseBadges,
};
