'use client';

import React, { useId } from 'react';
import {
  Award,
  Briefcase,
  CalendarCheck,
  CalendarRange,
  Code2,
  Compass,
  Crown,
  FileText,
  Flag,
  Flame,
  FolderOpen,
  Gauge,
  GraduationCap,
  Hammer,
  Infinity as InfinityIcon,
  ListChecks,
  Medal,
  Milestone,
  Podium,
  Presentation,
  Ribbon,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Sword,
  Swords,
  Target,
  TrendingUp,
  Trophy,
  UserCheck,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { BadgeCategory, BadgeTier } from '@/lib/gamification/badgeConfig';

/**
 * Professional Badge Artwork System
 * ---------------------------------
 * A single, consistent emblem renderer used by the student gallery and the
 * Super Admin catalog. Emblems are premium metallic/enamel-style: a tinted
 * rim, a beveled face, a category-specific silhouette and a centred glyph.
 *
 *  - Tier drives the metal: bronze / silver / gold / platinum / diamond.
 *  - Category drives the silhouette: shield, hexagon, seal, plaque, medal.
 *  - Artwork is deterministic and accessible (AA contrast, no emoji).
 */

export const BADGE_ICON_MAP: Record<string, LucideIcon> = {
  Award,
  Briefcase,
  CalendarCheck,
  CalendarRange,
  Code2,
  Compass,
  Crown,
  FileText,
  Flag,
  Flame,
  FolderOpen,
  Gauge,
  GraduationCap,
  Hammer,
  Infinity: InfinityIcon,
  ListChecks,
  Medal,
  Milestone,
  Podium,
  Presentation,
  Ribbon,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Sword,
  Swords,
  Target,
  TrendingUp,
  Trophy,
  UserCheck,
  Wrench,
  Zap,
};

export function resolveBadgeIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Award;
  return BADGE_ICON_MAP[name] || Award;
}

interface TierPalette {
  rimDark: string;
  rimLight: string;
  faceTop: string;
  faceBottom: string;
  glyph: string;
  ring: string;
}

/** Metallic palettes keep the same relative luminance so text/icon contrast holds. */
export const TIER_PALETTE: Record<BadgeTier, TierPalette> = {
  BRONZE: {
    rimDark: '#7c3f13',
    rimLight: '#d99a5b',
    faceTop: '#b4682c',
    faceBottom: '#7a3d12',
    glyph: '#fff7ed',
    ring: '#f2c99b',
  },
  SILVER: {
    rimDark: '#5b6572',
    rimLight: '#e6ecf3',
    faceTop: '#aab4c0',
    faceBottom: '#6d7887',
    glyph: '#ffffff',
    ring: '#eef2f7',
  },
  GOLD: {
    rimDark: '#8a6403',
    rimLight: '#fbe08a',
    faceTop: '#e0ae1f',
    faceBottom: '#9a7103',
    glyph: '#fffbeb',
    ring: '#fdf0bd',
  },
  PLATINUM: {
    rimDark: '#0c5f76',
    rimLight: '#bdf0fb',
    faceTop: '#2e9db8',
    faceBottom: '#0c5f76',
    glyph: '#ecfeff',
    ring: '#cdf3fb',
  },
  DIAMOND: {
    rimDark: '#4c1d95',
    rimLight: '#e9d5ff',
    faceTop: '#8b5cf6',
    faceBottom: '#4c1d95',
    glyph: '#faf5ff',
    ring: '#efe1ff',
  },
};

/** Category silhouette, drawn in a 100×100 viewBox. */
type ShapeKind = 'shield' | 'hexagon' | 'seal' | 'plaque' | 'medal';

export const CATEGORY_SHAPE: Record<BadgeCategory, ShapeKind> = {
  CAREER_EXCELLENCE: 'shield',
  INNOVATION: 'hexagon',
  CONSISTENCY: 'seal',
  PROFESSIONAL_DEVELOPMENT: 'plaque',
  MONTHLY_EXCELLENCE: 'medal',
};

const SHAPE_PATH: Record<ShapeKind, string> = {
  shield: 'M50 3 L92 19 V55 C92 76 73 90 50 97 C27 90 8 76 8 55 V19 Z',
  hexagon: 'M50 2 L93 26 V74 L50 98 L7 74 V26 Z',
  seal: 'M50 3 A47 47 0 1 1 49.99 3 Z',
  plaque: 'M22 4 H78 A18 18 0 0 1 96 22 V78 A18 18 0 0 1 78 96 H22 A18 18 0 0 1 4 78 V22 A18 18 0 0 1 22 4 Z',
  medal: 'M50 2 L61 34 L95 34 L68 54 L78 88 L50 68 L22 88 L32 54 L5 34 L39 34 Z',
};

export interface BadgeEmblemProps {
  icon?: string | null;
  tier: BadgeTier;
  category: BadgeCategory;
  size?: number;
  locked?: boolean;
  className?: string;
  title?: string;
}

export function BadgeEmblem({
  icon,
  tier,
  category,
  size = 64,
  locked = false,
  className = '',
  title,
}: BadgeEmblemProps) {
  const uid = useId().replace(/[:]/g, '');
  const palette = TIER_PALETTE[tier] || TIER_PALETTE.BRONZE;
  const shapePath = SHAPE_PATH[CATEGORY_SHAPE[category] || 'shield'];
  const Icon = resolveBadgeIcon(icon);

  const rimId = `rim-${uid}`;
  const faceId = `face-${uid}`;
  const bevelId = `bevel-${uid}`;

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size, filter: locked ? 'grayscale(1)' : undefined, opacity: locked ? 0.55 : 1 }}
      title={title}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} className="drop-shadow-sm">
        <defs>
          <linearGradient id={rimId} x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%" stopColor={palette.rimLight} />
            <stop offset="45%" stopColor={palette.rimDark} />
            <stop offset="100%" stopColor={palette.rimDark} />
          </linearGradient>
          <linearGradient id={faceId} x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0%" stopColor={palette.faceTop} />
            <stop offset="100%" stopColor={palette.faceBottom} />
          </linearGradient>
          <linearGradient id={bevelId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
          </linearGradient>
        </defs>

        {/* Metal rim */}
        <path d={shapePath} fill={`url(#${rimId})`} />

        {/* Enamel face (inset) */}
        <g transform="translate(50 50) scale(0.855) translate(-50 -50)">
          <path d={shapePath} fill={`url(#${faceId})`} />
          <path d={shapePath} fill={`url(#${bevelId})`} />
          <path d={shapePath} fill="none" stroke={palette.ring} strokeWidth={4} strokeOpacity={0.55} />
        </g>
      </svg>

      {/* Embossed glyph */}
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <Icon
          style={{ width: size * 0.4, height: size * 0.4, color: palette.glyph }}
          strokeWidth={2.1}
          className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]"
        />
      </span>
    </div>
  );
}

export default BadgeEmblem;
