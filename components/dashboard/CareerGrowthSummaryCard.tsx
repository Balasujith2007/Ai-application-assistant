'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Trophy, FileText, TrendingUp, Loader2, Info } from 'lucide-react';

/**
 * Weekly Career Growth Summary
 * ----------------------------
 * Transparent view of how the student's weekly Mystery Gift tier was earned.
 * Values come from GET /api/career-growth, which computes the score from this
 * platform's real career-growth records only:
 *   - internship & job applications (milestone progression)
 *   - hackathons & competitions (milestone progression)
 *   - resume strength (criteria + improvement since the previous week)
 * No LMS metrics are used.
 */

interface Milestone {
  key: string;
  label: string;
  points: number;
  reference: string;
  detail?: string;
}

interface CategoryScore {
  key: string;
  label: string;
  weight: number;
  rawScore: number;
  weightedPoints: number;
  milestones: Milestone[];
}

interface ResumeCriterion {
  key: string;
  label: string;
  earned: number;
  max: number;
  available: boolean;
}

interface CareerGrowthData {
  week: { weekKey: string; startDate: string; endDate: string };
  careerGrowth: {
    finalScore: number;
    tier: string;
    categories: {
      internshipApplications: CategoryScore;
      hackathonsCompetitions: CategoryScore;
      resumeStrength: CategoryScore;
    };
    resumeCriteria: ResumeCriterion[];
    resumeImprovement: ResumeCriterion | null;
    counts: Record<string, number | boolean>;
    unavailableCriteria: string[];
    computedAt: string;
  };
  latestFinalized: { weekKey: string; finalScore: number; tier: string | null; snapshotAt: string } | null;
  latestGift: { tier: string | null; rewardRarity: string; status: string; weekKey: string | null } | null;
}

const TIER_STYLES: Record<string, string> = {
  LEGENDARY: 'bg-amber-100 text-amber-800 border-amber-200',
  EPIC: 'bg-purple-100 text-purple-800 border-purple-200',
  RARE: 'bg-blue-100 text-blue-800 border-blue-200',
  COMMON: 'bg-slate-100 text-slate-700 border-slate-200',
  COMEBACK: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const TIER_BARS: Record<string, string> = {
  LEGENDARY: 'bg-gradient-to-r from-amber-400 to-amber-500',
  EPIC: 'bg-gradient-to-r from-purple-400 to-purple-500',
  RARE: 'bg-gradient-to-r from-blue-400 to-blue-500',
  COMMON: 'bg-gradient-to-r from-slate-400 to-slate-500',
  COMEBACK: 'bg-gradient-to-r from-emerald-400 to-emerald-500',
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  internshipApplications: Briefcase,
  hackathonsCompetitions: Trophy,
  resumeStrength: FileText,
};

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function CareerGrowthSummaryCard() {
  const [data, setData] = useState<CareerGrowthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/career-growth', { headers: getAuthHeader() });
        const json = await res.json();
        if (cancelled) return;
        if (json.success) {
          setData(json);
        } else {
          setError(json.message || 'Unable to load career growth summary.');
        }
      } catch {
        if (!cancelled) setError('Unable to load career growth summary.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-gray-100 shadow-2xs p-4 space-y-3 animate-pulse">
        <div className="h-4 w-32 bg-gray-100 rounded" />
        <div className="h-8 w-20 bg-gray-100 rounded" />
        <div className="h-2 w-full bg-gray-100 rounded-full" />
        <div className="h-2 w-full bg-gray-100 rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl bg-white border border-gray-100 shadow-2xs p-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#990024]" /> Weekly Career Growth
        </h3>
        <p className="mt-1 text-[11px] text-gray-500">{error || 'No data available.'}</p>
      </div>
    );
  }

  const { careerGrowth, week, latestFinalized, latestGift } = data;
  const assignedTier = latestGift?.tier ?? latestFinalized?.tier ?? null;
  const tierStyle = TIER_STYLES[careerGrowth.tier] || TIER_STYLES.COMMON;
  const categories = [
    careerGrowth.categories.internshipApplications,
    careerGrowth.categories.hackathonsCompetitions,
    careerGrowth.categories.resumeStrength,
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl bg-white border border-gray-100 shadow-2xs p-4 space-y-4 min-w-0"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-[#990024]" /> Weekly Career Growth
          </h3>
          <p className="mt-0.5 text-[10px] text-gray-400 font-medium">
            {week.weekKey} · {week.startDate.slice(0, 10)} → {week.endDate.slice(0, 10)}
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${tierStyle}`}>
          {careerGrowth.tier}
        </span>
      </div>

      {/* Final score */}
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-gray-900 tabular-nums">
            {Math.round(careerGrowth.finalScore)}
          </span>
          <span className="text-xs font-semibold text-gray-400">/ 100</span>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">
            Assigned gift tier
          </p>
          <p className="text-xs font-bold text-gray-800">{assignedTier || 'Pending'}</p>
        </div>
      </div>

      {/* Category-wise scores */}
      <div className="space-y-2.5">
        {categories.map((c) => {
          const Icon = CATEGORY_ICONS[c.key] || TrendingUp;
          const barClass = TIER_BARS[careerGrowth.tier] || TIER_BARS.COMMON;
          return (
            <div key={c.key} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 min-w-0">
                  <Icon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">{c.label}</span>
                  <span className="text-[9px] font-bold text-gray-400 shrink-0">{c.weight}%</span>
                </span>
                <span className="text-[11px] font-bold text-gray-800 tabular-nums shrink-0">
                  {Math.round(c.rawScore)}
                  <span className="text-gray-400 font-medium">/100</span>
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${barClass} transition-all duration-700`}
                  style={{ width: `${Math.min(100, Math.max(0, c.rawScore))}%` }}
                />
              </div>
              <p className="text-[9px] text-gray-400 font-medium">
                contributes {c.weightedPoints} pts to final score
              </p>
            </div>
          );
        })}
      </div>

      {/* Achievements */}
      <div className="space-y-2">
        <AchievementList
          title="Internship & job achievements"
          milestones={careerGrowth.categories.internshipApplications.milestones}
          emptyText="No verified internship/job milestones this week."
        />
        <AchievementList
          title="Hackathon & competition achievements"
          milestones={careerGrowth.categories.hackathonsCompetitions.milestones}
          emptyText="No verified hackathon/competition milestones this week."
        />
      </div>

      {/* Resume strength + improvement */}
      <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-2.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-gray-400" /> Resume strength
          </span>
          <span className="text-[11px] font-bold text-gray-800 tabular-nums">
            {Math.round(careerGrowth.categories.resumeStrength.rawScore)}
            <span className="text-gray-400 font-medium">/100</span>
          </span>
        </div>
        {careerGrowth.resumeImprovement && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-gray-500">Improvement since last week</span>
            <span className="text-[10px] font-bold text-emerald-600 tabular-nums">
              +{careerGrowth.resumeImprovement.earned} / {careerGrowth.resumeImprovement.max}
            </span>
          </div>
        )}
      </div>

      {careerGrowth.unavailableCriteria.length > 0 && (
        <p className="flex items-start gap-1.5 text-[9px] text-amber-600">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          Not yet scored (no data source): {careerGrowth.unavailableCriteria.join(', ')}.
        </p>
      )}
    </motion.div>
  );
}

function AchievementList({
  title,
  milestones,
  emptyText,
}: {
  title: string;
  milestones: Milestone[];
  emptyText: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">{title}</p>
      {milestones.length === 0 ? (
        <p className="text-[10px] text-gray-400">{emptyText}</p>
      ) : (
        <ul className="space-y-1">
          {milestones.map((m, idx) => (
            <li key={`${m.key}-${idx}`} className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-gray-700 truncate">{m.detail || m.label}</span>
              <span className="text-[10px] font-bold text-[#990024] tabular-nums shrink-0">
                +{m.points}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
