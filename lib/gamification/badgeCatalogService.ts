/**
 * Badge Catalog Service
 * ---------------------
 * Bridges the code-defined 30-badge framework (`badgeConfig.ts`) with the
 * Super-Admin-editable persisted catalog (`badge_catalog` table).
 *
 * Design:
 *  - `evaluate()` logic stays in code (deterministic + testable), keyed by badge id.
 *  - Threshold + presentation overrides live in the database so Super Admin can
 *    tune eligibility without a redeploy.
 *  - Reads are cached for 30s like `rewardConfigService`.
 *  - Every DB access is wrapped defensively: if the `badge_catalog` table has not
 *    been created yet (migration pending), the service transparently falls back
 *    to the code defaults so the platform keeps working.
 */

import prisma from '@/lib/prisma';
import { BADGE_CATALOG, BadgeCategory, BadgeDefinition, BadgeTier } from './badgeConfig';

export type BadgeRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';

/** A fully resolved badge: code definition merged with any DB overrides. */
export interface EffectiveBadge {
  id: string;
  title: string;
  category: BadgeCategory;
  tier: BadgeTier;
  description: string;
  criteria: string;
  icon: string;
  unit: string;
  threshold: number;
  defaultThreshold: number;
  xpReward: number;
  rarity: BadgeRarity;
  awardSource: 'ENGINE' | 'MONTHLY';
  active: boolean;
  sortOrder: number;
  artworkKey: string | null;
  monthlyRule: Record<string, unknown> | null;
}

export const RARITY_BY_TIER: Record<BadgeTier, BadgeRarity> = {
  BRONZE: 'COMMON',
  SILVER: 'RARE',
  GOLD: 'EPIC',
  PLATINUM: 'LEGENDARY',
  DIAMOND: 'MYTHIC',
};

const CACHE_TTL_MS = 30_000;
let cache: { at: number; badges: EffectiveBadge[] } | null = null;

function fromCode(def: BadgeDefinition, index: number): EffectiveBadge {
  return {
    id: def.id,
    title: def.title,
    category: def.category,
    tier: def.tier,
    description: def.description,
    criteria: def.criteria,
    icon: def.icon,
    unit: def.unit,
    threshold: def.defaultThreshold,
    defaultThreshold: def.defaultThreshold,
    xpReward: def.xpReward,
    rarity: RARITY_BY_TIER[def.tier],
    awardSource: def.awardSource,
    active: true,
    sortOrder: index,
    artworkKey: def.id,
    monthlyRule: null,
  };
}

function toFiniteNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Returns the effective catalog (code defaults merged with DB overrides).
 * Never throws: falls back to code defaults when the table is unavailable.
 */
export async function getEffectiveBadgeCatalog(forceRefresh = false): Promise<EffectiveBadge[]> {
  if (!forceRefresh && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.badges;
  }

  const base = BADGE_CATALOG.map(fromCode);
  let badges = base;

  try {
    const rows = await prisma.badgeCatalog.findMany();
    if (rows.length > 0) {
      const byId = new Map(rows.map((r) => [r.badgeId, r]));
      badges = base.map((b) => {
        const row = byId.get(b.id);
        if (!row) return b;
        return {
          ...b,
          title: row.title || b.title,
          category: (row.category as BadgeCategory) || b.category,
          tier: (row.tier as BadgeTier) || b.tier,
          description: row.description || b.description,
          criteria: row.criteria || b.criteria,
          icon: row.icon || b.icon,
          unit: row.unit || b.unit,
          threshold: toFiniteNumber(row.threshold, b.threshold),
          xpReward: typeof row.xpReward === 'number' ? row.xpReward : b.xpReward,
          rarity: (row.rarity as BadgeRarity) || b.rarity,
          awardSource: (row.awardSource as 'ENGINE' | 'MONTHLY') || b.awardSource,
          active: row.active,
          sortOrder: typeof row.sortOrder === 'number' ? row.sortOrder : b.sortOrder,
          artworkKey: row.artworkKey ?? b.artworkKey,
          monthlyRule: (row.monthlyRule as Record<string, unknown> | null) ?? b.monthlyRule,
        };
      });
    }
  } catch {
    // `badge_catalog` not created yet → code defaults (graceful degradation).
  }

  cache = { at: Date.now(), badges };
  return badges;
}

export function invalidateBadgeCatalogCache(): void {
  cache = null;
}

export async function getEffectiveBadgeMap(forceRefresh = false): Promise<Map<string, EffectiveBadge>> {
  const list = await getEffectiveBadgeCatalog(forceRefresh);
  return new Map(list.map((b) => [b.id, b]));
}

export async function getEffectiveBadge(
  badgeId: string,
  forceRefresh = false
): Promise<EffectiveBadge | undefined> {
  const list = await getEffectiveBadgeCatalog(forceRefresh);
  return list.find((b) => b.id === badgeId);
}

/** Code definition lookup (holds the `evaluate` function). */
export function getBadgeEvaluator(badgeId: string): BadgeDefinition | undefined {
  return BADGE_CATALOG.find((b) => b.id === badgeId);
}

export interface SeedResult {
  ok: boolean;
  seeded: number;
  error?: string;
}

/**
 * Seeds/refreshes the `badge_catalog` table from the code framework.
 * Code-owned fields are refreshed; admin-owned fields (threshold, active,
 * artworkKey, monthlyRule, rarity) are preserved on existing rows.
 */
export async function seedBadgeCatalog(actorId?: string): Promise<SeedResult> {
  let seeded = 0;
  try {
    for (let i = 0; i < BADGE_CATALOG.length; i++) {
      const def = BADGE_CATALOG[i];
      await prisma.badgeCatalog.upsert({
        where: { badgeId: def.id },
        create: {
          badgeId: def.id,
          title: def.title,
          category: def.category,
          tier: def.tier,
          description: def.description,
          criteria: def.criteria,
          icon: def.icon,
          unit: def.unit,
          threshold: def.defaultThreshold,
          xpReward: def.xpReward,
          rarity: RARITY_BY_TIER[def.tier],
          awardSource: def.awardSource,
          active: true,
          sortOrder: i,
          artworkKey: def.id,
          updatedById: actorId ?? null,
        },
        update: {
          // Code-owned metadata only — never clobber admin-owned fields.
          title: def.title,
          category: def.category,
          tier: def.tier,
          description: def.description,
          criteria: def.criteria,
          icon: def.icon,
          unit: def.unit,
          xpReward: def.xpReward,
          awardSource: def.awardSource,
          sortOrder: i,
          updatedById: actorId ?? null,
        },
      });
      seeded++;
    }
    invalidateBadgeCatalogCache();
    return { ok: true, seeded };
  } catch (error: any) {
    return { ok: false, seeded, error: error?.message ?? String(error) };
  }
}

export interface BadgeCatalogPatch {
  title?: string;
  description?: string;
  criteria?: string;
  category?: BadgeCategory;
  tier?: BadgeTier;
  icon?: string;
  unit?: string;
  threshold?: number;
  xpReward?: number;
  rarity?: BadgeRarity;
  active?: boolean;
  artworkKey?: string | null;
  monthlyRule?: Record<string, unknown> | null;
}

export interface UpdateCatalogResult {
  ok: boolean;
  badge?: EffectiveBadge;
  error?: string;
}

/**
 * Applies a Super Admin edit to a single badge. Only known fields are written
 * and the threshold is validated. Invalidates the cache on success.
 */
export async function updateBadgeCatalogEntry(
  badgeId: string,
  patch: BadgeCatalogPatch,
  actorId?: string
): Promise<UpdateCatalogResult> {
  const def = BADGE_CATALOG.find((b) => b.id === badgeId);
  if (!def) return { ok: false, error: `Unknown badge id: ${badgeId}` };

  if (patch.threshold !== undefined) {
    const t = Number(patch.threshold);
    if (!Number.isFinite(t) || t <= 0) {
      return { ok: false, error: 'Threshold must be a positive number.' };
    }
  }

  const data: Record<string, unknown> = { updatedById: actorId ?? null };
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.criteria !== undefined) data.criteria = patch.criteria;
  if (patch.category !== undefined) data.category = patch.category;
  if (patch.tier !== undefined) data.tier = patch.tier;
  if (patch.icon !== undefined) data.icon = patch.icon;
  if (patch.unit !== undefined) data.unit = patch.unit;
  if (patch.threshold !== undefined) data.threshold = Number(patch.threshold);
  if (patch.xpReward !== undefined) data.xpReward = Number(patch.xpReward);
  if (patch.rarity !== undefined) data.rarity = patch.rarity;
  if (patch.active !== undefined) data.active = Boolean(patch.active);
  if (patch.artworkKey !== undefined) data.artworkKey = patch.artworkKey;
  if (patch.monthlyRule !== undefined) data.monthlyRule = patch.monthlyRule;

  try {
    await prisma.badgeCatalog.upsert({
      where: { badgeId },
      create: {
        badgeId,
        title: patch.title ?? def.title,
        category: patch.category ?? def.category,
        tier: patch.tier ?? def.tier,
        description: patch.description ?? def.description,
        criteria: patch.criteria ?? def.criteria,
        icon: patch.icon ?? def.icon,
        unit: patch.unit ?? def.unit,
        threshold: patch.threshold ?? def.defaultThreshold,
        xpReward: patch.xpReward ?? def.xpReward,
        rarity: patch.rarity ?? RARITY_BY_TIER[def.tier],
        awardSource: def.awardSource,
        active: patch.active ?? true,
        sortOrder: BADGE_CATALOG.findIndex((b) => b.id === badgeId),
        artworkKey: patch.artworkKey ?? def.id,
        monthlyRule: (patch.monthlyRule as never) ?? undefined,
        updatedById: actorId ?? null,
      },
      update: data as never,
    });

    invalidateBadgeCatalogCache();
    const badge = await getEffectiveBadge(badgeId, true);
    return { ok: true, badge };
  } catch (error: any) {
    return { ok: false, error: error?.message ?? String(error) };
  }
}
