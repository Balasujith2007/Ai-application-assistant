import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/gamification/adminGuard';

/**
 * Admin Shop Management — Super Admin only.
 *
 * GET    /api/admin/gamification/shop          — list ALL shop items (incl. disabled)
 * POST   /api/admin/gamification/shop          — create a shop item
 * PUT    /api/admin/gamification/shop          — update price / availability / metadata
 * DELETE /api/admin/gamification/shop?id=...   — DISABLE an item (never deletes history)
 *
 * Prices, purchase limits and categories are validated. Negative prices are
 * rejected. Every price/availability change is written to the audit log. Purchase
 * history is preserved because items are only ever disabled, never deleted.
 */

const SHOP_CATEGORIES = ['FRAME', 'TITLE', 'BADGE'] as const;
type ShopCategory = (typeof SHOP_CATEGORIES)[number];

const REWARD_TYPE_BY_CATEGORY: Record<ShopCategory, 'PROFILE_FRAME' | 'PROFILE_TITLE' | 'EXCLUSIVE_BADGE'> = {
  FRAME: 'PROFILE_FRAME',
  TITLE: 'PROFILE_TITLE',
  BADGE: 'EXCLUSIVE_BADGE',
};

const RARITIES = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'COMEBACK'] as const;

function isValidAssetUrl(url: string): boolean {
  // Frames must be an internal asset path or an https URL — never an arbitrary scheme.
  return url.startsWith('/') || /^https:\/\//i.test(url);
}

function parsePrice(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
  return n;
}

export async function GET(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return auth.response;

  const items = await prisma.rewardDefinition.findMany({
    where: { isShopItem: true },
    orderBy: [{ shopCategory: 'asc' }, { coinPrice: 'asc' }],
  });

  const purchaseCounts = await prisma.shopPurchase.groupBy({
    by: ['rewardDefId'],
    _count: { _all: true },
  });
  const countMap = new Map(purchaseCounts.map((p) => [p.rewardDefId, p._count._all]));

  return NextResponse.json({
    success: true,
    items: items.map((i) => ({ ...i, purchaseCount: countMap.get(i.id) ?? 0 })),
  });
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const category = body?.category as ShopCategory;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  const rarity = typeof body?.rarity === 'string' ? body.rarity : 'COMMON';
  const coinPrice = parsePrice(body?.coinPrice);
  const purchaseLimitRaw = body?.purchaseLimit;
  const purchaseLimit =
    purchaseLimitRaw === undefined || purchaseLimitRaw === null
      ? 1
      : Number.isInteger(purchaseLimitRaw) && purchaseLimitRaw >= 1
        ? purchaseLimitRaw
        : NaN;

  if (!SHOP_CATEGORIES.includes(category)) {
    return NextResponse.json({ success: false, message: 'Invalid shop category.' }, { status: 400 });
  }
  if (!name || name.length > 120) {
    return NextResponse.json({ success: false, message: 'A name (1-120 chars) is required.' }, { status: 400 });
  }
  if (coinPrice === null) {
    return NextResponse.json(
      { success: false, message: 'Price must be a non-negative integer.' },
      { status: 400 }
    );
  }
  if (Number.isNaN(purchaseLimit) || purchaseLimit < 1) {
    return NextResponse.json({ success: false, message: 'Purchase limit must be at least 1.' }, { status: 400 });
  }
  if (!RARITIES.includes(rarity as (typeof RARITIES)[number])) {
    return NextResponse.json({ success: false, message: 'Invalid rarity.' }, { status: 400 });
  }

  let profileFrameUrl: string | null = null;
  let badgeId: string | null = null;
  if (category === 'FRAME') {
    const url = typeof body?.previewUrl === 'string' ? body.previewUrl.trim() : '';
    if (!url || !isValidAssetUrl(url)) {
      return NextResponse.json(
        { success: false, message: 'Frames require a valid asset path (/...) or https URL.' },
        { status: 400 }
      );
    }
    profileFrameUrl = url;
  }
  if (category === 'BADGE') {
    const id = typeof body?.badgeId === 'string' ? body.badgeId.trim() : '';
    if (!id || id.length > 120) {
      return NextResponse.json({ success: false, message: 'Badges require a badgeId (1-120 chars).' }, { status: 400 });
    }
    badgeId = id;
  }

  const created = await prisma.rewardDefinition.create({
    data: {
      rewardType: REWARD_TYPE_BY_CATEGORY[category],
      rewardRarity: rarity as (typeof RARITIES)[number],
      name,
      description: description || `${name} cosmetic item`,
      probabilityWeight: 0,
      enabled: true,
      isShopItem: true,
      coinPrice,
      shopCategory: category,
      purchaseLimit,
      profileFrameUrl,
      badgeId,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: auth.userId,
      action: 'SHOP_ITEM_CREATE',
      target: created.id,
      details: `Created ${category} item "${name}" priced at ${coinPrice} coins (limit ${purchaseLimit}).`,
    },
  });

  return NextResponse.json({ success: true, item: created });
}

export async function PUT(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ success: false, message: 'id is required.' }, { status: 400 });

  const existing = await prisma.rewardDefinition.findUnique({ where: { id } });
  if (!existing || !existing.isShopItem) {
    return NextResponse.json({ success: false, message: 'Shop item not found.' }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  const changes: string[] = [];

  if (body?.coinPrice !== undefined) {
    const price = parsePrice(body.coinPrice);
    if (price === null) {
      return NextResponse.json(
        { success: false, message: 'Price must be a non-negative integer.' },
        { status: 400 }
      );
    }
    if (price !== existing.coinPrice) {
      data.coinPrice = price;
      changes.push(`price ${existing.coinPrice} -> ${price}`);
    }
  }

  if (body?.purchaseLimit !== undefined) {
    const limit = Number(body.purchaseLimit);
    if (!Number.isInteger(limit) || limit < 1) {
      return NextResponse.json({ success: false, message: 'Purchase limit must be at least 1.' }, { status: 400 });
    }
    data.purchaseLimit = limit;
    changes.push(`purchaseLimit ${existing.purchaseLimit} -> ${limit}`);
  }

  if (body?.enabled !== undefined) {
    data.enabled = Boolean(body.enabled);
    changes.push(`enabled ${existing.enabled} -> ${Boolean(body.enabled)}`);
  }

  if (typeof body?.name === 'string' && body.name.trim()) {
    data.name = body.name.trim().slice(0, 120);
    changes.push('name updated');
  }
  if (typeof body?.description === 'string') {
    data.description = body.description.trim();
    changes.push('description updated');
  }
  if (typeof body?.previewUrl === 'string' && existing.rewardType === 'PROFILE_FRAME') {
    if (!isValidAssetUrl(body.previewUrl.trim())) {
      return NextResponse.json({ success: false, message: 'Invalid frame asset path.' }, { status: 400 });
    }
    data.profileFrameUrl = body.previewUrl.trim();
    changes.push('preview updated');
  }

  if (changes.length === 0) {
    return NextResponse.json({ success: true, item: existing, message: 'No changes applied.' });
  }

  const updated = await prisma.rewardDefinition.update({ where: { id }, data });

  await prisma.auditLog.create({
    data: {
      userId: auth.userId,
      action: 'SHOP_ITEM_UPDATE',
      target: id,
      details: `Updated shop item "${existing.name}": ${changes.join(', ')}.`,
    },
  });

  return NextResponse.json({ success: true, item: updated });
}

export async function DELETE(req: Request) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const id = url.searchParams.get('id') || '';
  if (!id) return NextResponse.json({ success: false, message: 'id is required.' }, { status: 400 });

  const existing = await prisma.rewardDefinition.findUnique({ where: { id } });
  if (!existing || !existing.isShopItem) {
    return NextResponse.json({ success: false, message: 'Shop item not found.' }, { status: 404 });
  }

  // Disable, never delete — purchase history remains intact.
  const updated = await prisma.rewardDefinition.update({ where: { id }, data: { enabled: false } });

  await prisma.auditLog.create({
    data: {
      userId: auth.userId,
      action: 'SHOP_ITEM_DISABLE',
      target: id,
      details: `Disabled shop item "${existing.name}" (purchase history preserved).`,
    },
  });

  return NextResponse.json({ success: true, item: updated });
}
