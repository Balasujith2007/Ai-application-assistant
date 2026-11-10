import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/gamification/adminGuard';
import { updateBadgeCatalogEntry, type BadgeCatalogPatch } from '@/lib/gamification/badgeCatalogService';
import { ALL_BADGE_DEFINITIONS } from '@/lib/gamification/badgeConfig';

/**
 * PUT /api/admin/gamification/badges/[badgeId]
 * Super Admin-only edit of a single badge definition: description, category,
 * tier, eligibility threshold, artwork/icon, rarity, active status and the
 * monthly-award rule. Every change is audited. Historical award evidence is
 * never touched.
 */
export async function PUT(req: Request, ctx: { params: Promise<{ badgeId: string }> }) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return auth.response;

  const { badgeId } = await ctx.params;
  const def = ALL_BADGE_DEFINITIONS.find((b) => b.id === badgeId);
  if (!def) {
    return NextResponse.json({ success: false, message: `Unknown badge id: ${badgeId}` }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON payload.' }, { status: 400 });
  }

  const patch: BadgeCatalogPatch = {};
  if (body.title !== undefined) patch.title = String(body.title);
  if (body.description !== undefined) patch.description = String(body.description);
  if (body.criteria !== undefined) patch.criteria = String(body.criteria);
  if (body.category !== undefined) patch.category = body.category;
  if (body.tier !== undefined) patch.tier = body.tier;
  if (body.icon !== undefined) patch.icon = String(body.icon);
  if (body.unit !== undefined) patch.unit = String(body.unit);
  if (body.threshold !== undefined) patch.threshold = Number(body.threshold);
  if (body.xpReward !== undefined) patch.xpReward = Number(body.xpReward);
  if (body.rarity !== undefined) patch.rarity = body.rarity;
  if (body.active !== undefined) patch.active = Boolean(body.active);
  if (body.artworkKey !== undefined) patch.artworkKey = body.artworkKey === null ? null : String(body.artworkKey);
  if (body.monthlyRule !== undefined) {
    patch.monthlyRule =
      body.monthlyRule && typeof body.monthlyRule === 'object' ? (body.monthlyRule as Record<string, unknown>) : null;
  }
  // Phase 2 §7 — Super-Admin-owned streak-badge policy.
  if (body.requireOwnershipVerification !== undefined) {
    patch.requireOwnershipVerification = Boolean(body.requireOwnershipVerification);
  }
  if (body.eligibleProviders !== undefined) {
    patch.eligibleProviders = Array.isArray(body.eligibleProviders)
      ? body.eligibleProviders.map((p: unknown) => String(p))
      : null;
  }
  if (body.evidenceRequirement !== undefined) {
    patch.evidenceRequirement = body.evidenceRequirement;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ success: false, message: 'No editable fields provided.' }, { status: 400 });
  }

  const result = await updateBadgeCatalogEntry(badgeId, patch, auth.userId);
  if (!result.ok) {
    return NextResponse.json({ success: false, message: result.error || 'Update failed.' }, { status: 400 });
  }

  await prisma.auditLog.create({
    data: {
      userId: auth.userId,
      action: 'BADGE_CATALOG_UPDATE',
      target: badgeId,
      details: `Updated badge fields: ${Object.keys(patch).join(', ')}`,
    },
  });

  return NextResponse.json({ success: true, badge: result.badge });
}
