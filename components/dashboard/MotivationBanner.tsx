'use client';

import React, { useMemo } from 'react';
import {
  Sparkles,
  Trophy,
  Flame,
  Briefcase,
  TrendingUp,
  Star,
  Compass,
  Zap,
  CheckCircle2,
  Rocket,
} from 'lucide-react';

// ─────────────────────────────────────────────
// 8 Structured Motivation Categories
// ─────────────────────────────────────────────
export type MotivationCategory =
  | 'CONSISTENCY'
  | 'IMPROVEMENT'
  | 'CAREER_READINESS'
  | 'LEARNING_MOTIVATION'
  | 'LOW_ACTIVITY'
  | 'ACHIEVEMENT'
  | 'HIGH_PERFORMER'
  | 'PLACEMENT_PREPARATION';

interface MotivationMessage {
  category: MotivationCategory;
  label: string;
  quote: string;
  subtitle: string;
  labelBg: string;
}

const MESSAGE_BANK: Record<MotivationCategory, MotivationMessage[]> = {
  CONSISTENCY: [
    {
      category: 'CONSISTENCY',
      label: 'DAILY CONSISTENCY',
      quote: 'Your daily efforts are quietly building the future you dream about.',
      subtitle: 'Showing up every day is your greatest competitive moat.',
      labelBg: 'bg-orange-500/25 border-orange-400/50 text-orange-200',
    },
    {
      category: 'CONSISTENCY',
      label: 'STREAK DISCIPLINE',
      quote: "Consistency isn't about perfection; it is about refusing to let momentum slip.",
      subtitle: 'Small daily disciplines compound into massive career breakthroughs.',
      labelBg: 'bg-orange-500/25 border-orange-400/50 text-orange-200',
    },
    {
      category: 'CONSISTENCY',
      label: 'HABIT FORMATION',
      quote: 'The secret of your future is hidden in your daily routine.',
      subtitle: 'Every logged session solidifies your technical edge.',
      labelBg: 'bg-orange-500/25 border-orange-400/50 text-orange-200',
    },
  ],

  IMPROVEMENT: [
    {
      category: 'IMPROVEMENT',
      label: 'KEEP GROWING',
      quote: "You are not competing with yesterday's results. You are becoming better than yesterday's version of yourself.",
      subtitle: 'Progress is quiet before it becomes undeniable.',
      labelBg: 'bg-sky-500/25 border-sky-400/50 text-sky-200',
    },
    {
      category: 'IMPROVEMENT',
      label: 'SKILL ACCELERATION',
      quote: 'Every challenge you encounter is an upgrade to your problem-solving toolkit.',
      subtitle: 'You are tackling concepts that used to feel intimidating.',
      labelBg: 'bg-sky-500/25 border-sky-400/50 text-sky-200',
    },
    {
      category: 'IMPROVEMENT',
      label: 'RISING TRAJECTORY',
      quote: "Every improvement you make is a step forward. Stay focused on the direction, not the speed.",
      subtitle: 'Your curve is bending upward with every resolved problem.',
      labelBg: 'bg-sky-500/25 border-sky-400/50 text-sky-200',
    },
  ],

  CAREER_READINESS: [
    {
      category: 'CAREER_READINESS',
      label: 'CAREER READY',
      quote: 'Your preparation today is creating opportunities for your tomorrow.',
      subtitle: 'Recruitment teams look for students who take initiative early.',
      labelBg: 'bg-emerald-500/25 border-emerald-400/50 text-emerald-200',
    },
    {
      category: 'CAREER_READINESS',
      label: 'OPPORTUNITY FOCUS',
      quote: 'When preparation meets opportunity, high-value offers become inevitable.',
      subtitle: 'Your portfolio is beginning to speak for itself.',
      labelBg: 'bg-emerald-500/25 border-emerald-400/50 text-emerald-200',
    },
    {
      category: 'CAREER_READINESS',
      label: 'INDUSTRY ALIGNED',
      quote: 'You are bridging the gap between student projects and industry-grade engineering.',
      subtitle: 'Every verified skill adds undeniable credibility to your name.',
      labelBg: 'bg-emerald-500/25 border-emerald-400/50 text-emerald-200',
    },
  ],

  LEARNING_MOTIVATION: [
    {
      category: 'LEARNING_MOTIVATION',
      label: 'ACTIVE LEARNING',
      quote: 'Every concept you master brings you one step closer to your career goals.',
      subtitle: 'Curiosity is the engine of technical mastery. Never stop exploring.',
      labelBg: 'bg-indigo-500/25 border-indigo-400/50 text-indigo-200',
    },
    {
      category: 'LEARNING_MOTIVATION',
      label: 'KNOWLEDGE COMPOUNDING',
      quote: 'Knowledge compounds like interest. Every focused hour builds lifetime leverage.',
      subtitle: 'You are investing in the most valuable asset in tech: yourself.',
      labelBg: 'bg-indigo-500/25 border-indigo-400/50 text-indigo-200',
    },
  ],

  LOW_ACTIVITY: [
    {
      category: 'LOW_ACTIVITY',
      label: 'FRESH BEGINNING',
      quote: 'Your journey does not require a perfect start. It only needs you to begin again.',
      subtitle: 'One short check-in or quick assessment today resets your momentum.',
      labelBg: 'bg-amber-500/25 border-amber-400/50 text-amber-200',
    },
    {
      category: 'LOW_ACTIVITY',
      label: 'RE-ENGAGE TODAY',
      quote: "Your potential hasn't gone anywhere. Pick up right where you left off.",
      subtitle: 'The hardest step is always the first one back. Take it now.',
      labelBg: 'bg-amber-500/25 border-amber-400/50 text-amber-200',
    },
  ],

  ACHIEVEMENT: [
    {
      category: 'ACHIEVEMENT',
      label: 'MILESTONE UNLOCKED',
      quote: 'Every milestone is proof that your dedication is turning into real, measurable progress.',
      subtitle: 'You set the standard high and reached it. Celebrate and keep climbing.',
      labelBg: 'bg-purple-500/25 border-purple-400/50 text-purple-200',
    },
    {
      category: 'ACHIEVEMENT',
      label: 'PROVEN ABILITY',
      quote: "Badges are more than tokens; they represent hurdles you refused to let stop you.",
      subtitle: 'Your track record proves you have what it takes to finish strong.',
      labelBg: 'bg-purple-500/25 border-purple-400/50 text-purple-200',
    },
  ],

  HIGH_PERFORMER: [
    {
      category: 'HIGH_PERFORMER',
      label: 'TOP TIER COHORT',
      quote: 'Your consistency is becoming your competitive advantage. Keep raising the standard.',
      subtitle: 'You are setting the pace for your peers. Stay humble, stay relentless.',
      labelBg: 'bg-amber-400/25 border-amber-300/50 text-amber-200',
    },
    {
      category: 'HIGH_PERFORMER',
      label: 'ELITE STANDARD',
      quote: 'Excellence is never an accident. It is always the result of high intention and focused execution.',
      subtitle: 'Your cohort ranking reflects relentless dedication to the craft.',
      labelBg: 'bg-amber-400/25 border-amber-300/50 text-amber-200',
    },
  ],

  PLACEMENT_PREPARATION: [
    {
      category: 'PLACEMENT_PREPARATION',
      label: 'INTERVIEW READY',
      quote: 'Skills create confidence. Preparation creates opportunities. Keep moving forward.',
      subtitle: 'Your resume, profile, and applications are aligned for top recruiters.',
      labelBg: 'bg-teal-500/25 border-teal-400/50 text-teal-200',
    },
    {
      category: 'PLACEMENT_PREPARATION',
      label: 'FINAL SPRINT',
      quote: 'The best placement offers go to students who prepare before the door opens.',
      subtitle: 'Your foundation is set. Trust your preparation and execute.',
      labelBg: 'bg-teal-500/25 border-teal-400/50 text-teal-200',
    },
  ],
};

const CATEGORY_ICONS: Record<MotivationCategory, React.ElementType> = {
  CONSISTENCY: Flame,
  IMPROVEMENT: TrendingUp,
  CAREER_READINESS: Briefcase,
  LEARNING_MOTIVATION: Compass,
  LOW_ACTIVITY: Zap,
  ACHIEVEMENT: Star,
  HIGH_PERFORMER: Trophy,
  PLACEMENT_PREPARATION: Rocket,
};

export interface StudentMetrics {
  streak: number;
  totalXp: number;
  profileCompletion: number;
  resumeScore: number;
  totalApplications: number;
  badgesEarned: number;
  totalBadges: number;
  rank?: number | null;
  totalStudents?: number;
}

// ─────────────────────────────────────────────
// Dynamic Personalization Logic (Rule Engine)
// ─────────────────────────────────────────────
function selectCategory(m: StudentMetrics): MotivationCategory {
  // 1. Low Activity Encouragement
  if (m.streak === 0 && m.totalApplications === 0 && m.totalXp < 15) {
    return 'LOW_ACTIVITY';
  }

  // 2. High Performer: Top 20% of cohort with solid streak
  if (
    m.streak >= 7 &&
    m.rank &&
    m.totalStudents &&
    m.rank <= Math.max(3, Math.ceil(m.totalStudents * 0.2))
  ) {
    return 'HIGH_PERFORMER';
  }

  // 3. Placement Preparation: High readiness + active applications
  if (m.profileCompletion >= 85 && m.resumeScore >= 75 && m.totalApplications >= 3) {
    return 'PLACEMENT_PREPARATION';
  }

  // 4. Milestone / Achievement: Earned multiple badges
  if (m.badgesEarned >= 3) {
    return 'ACHIEVEMENT';
  }

  // 5. Consistency: Solid active streak
  if (m.streak >= 4) {
    return 'CONSISTENCY';
  }

  // 6. Career Readiness: Good profile completion
  if (m.profileCompletion >= 70 || m.totalApplications >= 2) {
    return 'CAREER_READINESS';
  }

  // 7. Improvement: Active progress
  if (m.totalXp > 50 || m.totalApplications >= 1) {
    return 'IMPROVEMENT';
  }

  // 8. Default: General Learning Motivation
  return 'LEARNING_MOTIVATION';
}

// Stable deterministic index per student:
// Does NOT change on every browser refresh, but updates when student's tier or metrics evolve.
function stableIndex(seed: string, len: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffff;
  }
  return Math.abs(hash) % len;
}

interface MotivationBannerProps {
  studentName?: string;
  metrics: StudentMetrics;
  className?: string;
}

export function MotivationBanner({ studentName, metrics, className = '' }: MotivationBannerProps) {
  const { category, message } = useMemo(() => {
    const cat = selectCategory(metrics);
    const pool = MESSAGE_BANK[cat];
    // Seed using student name + category tier so it's stable per tier
    const seed = `${studentName || 'student'}_${cat}`;
    const idx = stableIndex(seed, pool.length);
    return { category: cat, message: pool[idx] };
  }, [studentName, metrics]);

  const firstName = studentName ? studentName.split(' ')[0] : 'Student';
  const CategoryIcon = CATEGORY_ICONS[category] || Sparkles;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-800/80 shadow-md ${className}`}
      style={{
        background:
          'linear-gradient(135deg, #090E17 0%, #0F172A 48%, #172554 100%)',
      }}
    >
      {/* Refined ambient glow layers (high contrast, zero text blur) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute left-1/3 -bottom-10 h-32 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-slate-700/10 blur-3xl" />
      </div>

      {/* Subtle top edge accent highlight */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      {/* Main Content Area */}
      <div className="relative z-10 px-6 py-5 sm:px-7 sm:py-6">
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0 flex-1 space-y-2.5">
            {/* Top Category Badge */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider shadow-xs backdrop-blur-sm ${message.labelBg}`}
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                {message.label}
              </span>
            </div>

            {/* Primary Visual Element: Large, Highly Readable Motivational Quote (22-26px desktop, 650-750 font weight) */}
            <blockquote className="text-[19px] sm:text-[22px] lg:text-[24px] font-extrabold leading-[1.38] tracking-tight text-white drop-shadow-xs max-w-3xl">
              &ldquo;{message.quote}&rdquo;
            </blockquote>

            {/* Bottom Supporting Message + Personalization */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-slate-300/90">
              <span className="font-medium text-slate-300">{message.subtitle}</span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <div className="inline-flex items-center gap-1.5 font-semibold text-white bg-white/10 px-2.5 py-0.5 rounded-md border border-white/10 text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Personalised for {firstName}</span>
              </div>
            </div>
          </div>

          {/* Right Visual Element (subtle, non-overlapping) */}
          <div className="hidden md:flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white/12 to-white/5 border border-white/15 backdrop-blur-md shadow-inner">
            <CategoryIcon className="h-7 w-7 text-amber-300 drop-shadow-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
