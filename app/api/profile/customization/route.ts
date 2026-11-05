import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';
import {
  getOwnedCosmetics,
  equipCosmetic,
  unequipCosmetic,
  setShowcaseBadges,
  CustomizationError,
  type CosmeticType,
  type CustomizationErrorCode,
} from '@/lib/gamification/customizationService';

const STATUS_MAP: Record<CustomizationErrorCode, number> = {
  INVALID_INPUT: 400,
  NOT_OWNED: 403,
  NOT_FOUND: 404,
  NOT_EQUIPPABLE: 409,
  LIMIT_EXCEEDED: 400,
};

/**
 * GET /api/profile/customization
 * Returns the cosmetics the student owns (frames, titles, badges), which one is
 * equipped, and the badge showcase. All values are resolved server-side.
 */
export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, active: true } });
    if (!user || !user.active) {
      return NextResponse.json({ success: false, message: 'User not found or deactivated' }, { status: 403 });
    }

    const cosmetics = await getOwnedCosmetics(userId);
    return NextResponse.json({ success: true, cosmetics });
  } catch (error: any) {
    console.error('Error fetching customization:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch customization' }, { status: 500 });
  }
}

/**
 * POST /api/profile/customization
 * Equips, unequips, or showcases OWNED cosmetics. The client only sends an item
 * identifier (server id), never a URL or display title. Ownership is verified
 * server-side against ShopPurchase / StudentReward / StudentBadge.
 * Body: { action: 'equip'|'unequip', type: 'FRAME'|'TITLE'|'BADGE', id }
 *       or { action: 'showcase', badgeIds: string[] }
 */
export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, active: true } });
    if (!user || !user.active) {
      return NextResponse.json({ success: false, message: 'User not found or deactivated' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    let cosmetics;
    if (action === 'equip') {
      const type = body?.type as CosmeticType;
      const id = typeof body?.id === 'string' ? body.id : '';
      if (!id) return NextResponse.json({ success: false, message: 'id is required' }, { status: 400 });
      cosmetics = await equipCosmetic(userId, type, id);
    } else if (action === 'unequip') {
      const type = body?.type as CosmeticType;
      cosmetics = await unequipCosmetic(userId, type);
    } else if (action === 'showcase') {
      const badgeIds = Array.isArray(body?.badgeIds) ? body.badgeIds.filter((b: unknown) => typeof b === 'string') : [];
      cosmetics = await setShowcaseBadges(userId, badgeIds);
    } else {
      return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, cosmetics });
  } catch (error: any) {
    if (error instanceof CustomizationError) {
      return NextResponse.json(
        { success: false, code: error.code, message: error.message },
        { status: STATUS_MAP[error.code] ?? 400 }
      );
    }
    console.error('Error updating customization:', error);
    return NextResponse.json({ success: false, message: 'Failed to update customization' }, { status: 500 });
  }
}
