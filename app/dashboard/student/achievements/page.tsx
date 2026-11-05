'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Award,
  BadgeCheck,
  CheckCircle2,
  CalendarDays,
  Copy,
  Crown,
  ExternalLink,
  Flame,
  Hash,
  Lock,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { StudentPageHeader } from '@/components/dashboard/StudentPageHeader';
import { BadgeEmblem } from '@/components/badges/BadgeEmblem';
import { BADGE_CATEGORIES, type BadgeCategory, type BadgeTier } from '@/lib/gamification/badgeConfig';
import { buildLinkedInShareUrl } from '@/lib/gamification/badgeShare';

const RARITY_STYLES: Record<string, string> = {
  COMMON: 'bg-slate-100 text-slate-600',
  RARE: 'bg-sky-50 text-sky-700',
  EPIC: 'bg-indigo-50 text-indigo-700',
  LEGENDARY: 'bg-amber-50 text-amber-700',
  MYTHIC: 'bg-fuchsia-50 text-fuchsia-700',
};

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All status' },
  { value: 'EARNED', label: 'Earned' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'LOCKED', label: 'Locked' },
];

function categoryLabel(key: string): string {
  return BADGE_CATEGORIES.find((c) => c.key === key)?.label || key.replace(/_/g, ' ');
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function AchievementsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBadge, setSelectedBadge] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<any>(null);

  const fetchAchievements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/achievements', { headers: getAuthHeader() });
      const json = await res.json();
      if (json.success) {
        setData(json);
        const unacked = json.badgesByStatus?.all?.find(
          (b: any) => b.status === 'EARNED' && b.unlockedToastSeen === false
        );
        if (unacked) {
          setToast(unacked);
          fetch('/api/achievements/ack-toast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify({ badgeId: unacked.id }),
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Failed to load achievements:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const summary = data?.summary || {
    totalEarned: 0,
    totalAvailable: 30,
    completionPercentage: 0,
    totalXp: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalActiveDays: 0,
    activeWeeksInMonth: 0,
  };
  const nextMilestone = data?.nextMilestone;
  const allBadges: any[] = data?.badgesByStatus?.all || [];
  const monthlyAwards: any[] = data?.monthlyAwards || [];
  const history: any[] = data?.history || [];
  const categories: Array<{ category: string; total: number; earned: number }> = data?.categories || [];

  const filteredBadges = useMemo(
    () =>
      allBadges.filter((b) => {
        if (selectedCategory !== 'ALL' && b.category !== selectedCategory) return false;
        if (selectedStatus !== 'ALL' && b.status !== selectedStatus) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return b.title.toLowerCase().includes(q) || b.description.toLowerCase().includes(q);
        }
        return true;
      }),
    [allBadges, selectedCategory, selectedStatus, searchQuery]
  );

  const copyVerification = (badge: any) => {
    if (!badge.verificationUrl) return;
    const url = `${window.location.origin}${badge.verificationUrl}`;
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {}
    );
  };

  const linkedInHref = (badge: any): string | null => {
    if (!badge.credentialId || !badge.awardedAt) return null;
    const verificationUrl = `${window.location.origin}${badge.verificationUrl}`;
    return buildLinkedInShareUrl({
      badgeTitle: badge.title,
      credentialId: badge.credentialId,
      verificationUrl,
      issueDate: new Date(badge.awardedAt),
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <StudentPageHeader
        title="Achievements & Badges"
        subtitle="Verified, career-based recognition you can share professionally — earned from real internships, hackathons and resume growth."
        badge={
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-sm font-semibold text-gray-500">
            {summary.totalEarned} / {summary.totalAvailable}
          </span>
        }
      >
        <Link
          href="/dashboard/student/progress"
          className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-600 transition hover:bg-blue-100"
        >
          <Trophy className="h-3.5 w-3.5" />
          <span>Career Progress</span>
        </Link>
      </StudentPageHeader>

      {/* Metric strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Earned badges</span>
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-gray-900 sm:text-3xl">
              {summary.totalEarned}
              <span className="ml-1 text-xs font-semibold text-gray-400">/ {summary.totalAvailable}</span>
            </span>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[#990024] transition-all duration-500"
                style={{ width: `${summary.completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Verified XP</span>
            <Zap className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-gray-900 sm:text-3xl">
              {Number(summary.totalXp).toLocaleString()}
            </span>
            <p className="mt-1 text-[11px] text-gray-400">From your points ledger audit trail</p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Career activity streak</span>
            <Flame className="h-4 w-4 text-orange-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-gray-900 sm:text-3xl">
              {summary.currentStreak} <span className="text-xs font-semibold text-gray-400">days</span>
            </span>
            <span className="text-xs font-semibold text-gray-500">
              Best <strong className="text-gray-900">{summary.longestStreak}d</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-rose-100 bg-rose-50/50 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#990024]">Closest milestone</span>
            <Target className="h-4 w-4 text-[#990024]" />
          </div>
          <div className="mt-2">
            {nextMilestone && nextMilestone.progressAvailable ? (
              <>
                <span className="block truncate text-sm font-bold text-gray-900">{nextMilestone.title}</span>
                <p className="mt-0.5 truncate text-[11px] text-gray-600">
                  {nextMilestone.remainingToUnlock} {nextMilestone.unit} to go
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-rose-200/60">
                  <div
                    className="h-full rounded-full bg-[#990024] transition-all duration-500"
                    style={{ width: `${nextMilestone.progressPercentage}%` }}
                  />
                </div>
              </>
            ) : (
              <span className="text-xs font-medium text-gray-600">
                No measurable milestone in progress — keep applying and building.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Monthly recognition */}
      {monthlyAwards.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-600" />
            <h2 className="text-base font-bold text-gray-900">Monthly recognition</h2>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Awarded from verified monthly career performance — independent of weekly Mystery Gifts.
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            {monthlyAwards.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBadge(b)}
                className="flex items-center gap-3 rounded-xl border border-amber-200 bg-white px-4 py-3 text-left transition hover:shadow-md"
              >
                <BadgeEmblem icon={b.icon} tier={b.tier as BadgeTier} category={b.category as BadgeCategory} size={44} />
                <div>
                  <p className="text-sm font-bold text-gray-900">{b.title}</p>
                  <p className="text-[11px] text-gray-500">{formatDate(b.awardedAt)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col justify-between gap-3 pt-2 md:flex-row md:items-center">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              selectedCategory === 'ALL'
                ? 'bg-[#990024] text-white shadow-2xs'
                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            All badges ({allBadges.length})
          </button>
          {BADGE_CATEGORIES.map((c) => {
            const stat = categories.find((x) => x.category === c.key);
            return (
              <button
                key={c.key}
                onClick={() => setSelectedCategory(c.key)}
                className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  selectedCategory === c.key
                    ? 'bg-[#990024] text-white shadow-2xs'
                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {c.label} ({stat?.earned ?? 0}/{stat?.total ?? 0})
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search badges..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-40 rounded-xl border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs font-medium text-gray-800 placeholder-gray-400 focus:border-[#990024] focus:outline-none sm:w-48"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="cursor-pointer rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 focus:border-[#990024] focus:outline-none"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
              <div className="h-14 w-14 rounded-2xl bg-gray-200" />
              <div className="h-4 w-28 rounded bg-gray-200" />
              <div className="h-3 w-full rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : filteredBadges.length === 0 ? (
        <div className="space-y-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
          <Trophy className="mx-auto h-8 w-8 text-gray-300" />
          <h3 className="text-sm font-bold text-gray-700">No badges match this filter</h3>
          <p className="text-xs text-gray-400">Adjust the category or status filters to view more badges.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredBadges.map((badge) => {
            const isEarned = badge.status === 'EARNED';
            const isInProgress = badge.status === 'IN_PROGRESS';
            return (
              <motion.button
                key={badge.id}
                whileHover={{ y: -2 }}
                onClick={() => setSelectedBadge(badge)}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4 text-left transition-all ${
                  isEarned
                    ? 'border-amber-200 bg-white shadow-2xs hover:border-amber-300 hover:shadow-md'
                    : isInProgress
                      ? 'border-gray-200 bg-white shadow-2xs hover:border-blue-300'
                      : 'border-gray-200/80 bg-gray-50/60 hover:opacity-100'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="relative">
                      <BadgeEmblem
                        icon={badge.icon}
                        tier={badge.tier as BadgeTier}
                        category={badge.category as BadgeCategory}
                        size={56}
                        locked={!isEarned}
                        title={badge.title}
                      />
                      {isEarned ? (
                        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-emerald-500 text-white shadow-xs">
                          <CheckCircle2 className="h-3 w-3 stroke-[3]" />
                        </span>
                      ) : !isInProgress ? (
                        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-gray-300 text-gray-600 shadow-xs">
                          <Lock className="h-2.5 w-2.5" />
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${RARITY_STYLES[badge.rarity] || RARITY_STYLES.COMMON}`}>
                        {badge.rarity}
                      </span>
                      <span className="rounded-md border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                        +{badge.xpReward} XP
                      </span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <h3 className="text-sm font-bold leading-snug text-gray-900 transition-colors group-hover:text-[#990024]">
                      {badge.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">{badge.description}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-3">
                  {isEarned ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                      <BadgeCheck className="h-3.5 w-3.5" /> Earned {formatDate(badge.awardedAt)}
                    </div>
                  ) : badge.progressAvailable ? (
                    <>
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-gray-500">
                          {badge.currentValue} / {badge.targetValue} {badge.unit}
                        </span>
                        <span className="font-semibold text-gray-400">{badge.progressPercentage}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isInProgress ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                          style={{ width: `${badge.progressPercentage}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="line-clamp-2 text-[11px] font-medium text-gray-400">
                      Criteria: {badge.criteria}
                    </p>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Recent history */}
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#990024]" />
            <h2 className="text-base font-bold text-gray-900">Recent achievements</h2>
          </div>
          <span className="text-xs font-semibold text-gray-400">Auditable log</span>
        </div>

        {history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center text-xs font-medium text-gray-400">
            No achievements recorded yet. Apply to internships, join hackathons and improve your resume to earn badges.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {history.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Award className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block truncate font-bold text-gray-900">{item.title}</span>
                    <span className="block truncate text-[11px] text-gray-500">{item.eventDetails}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-600">
                    +{item.xpEarned} XP
                  </span>
                  <span className="text-[10px] text-gray-400">{formatDate(item.achievedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Badge detail modal */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <BadgeEmblem
                    icon={selectedBadge.icon}
                    tier={selectedBadge.tier as BadgeTier}
                    category={selectedBadge.category as BadgeCategory}
                    size={72}
                    locked={selectedBadge.status !== 'EARNED'}
                    title={selectedBadge.title}
                  />
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{selectedBadge.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${RARITY_STYLES[selectedBadge.rarity] || RARITY_STYLES.COMMON}`}>
                        {selectedBadge.rarity}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                        {selectedBadge.tier}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                        {categoryLabel(selectedBadge.category)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-3">
                <div className="space-y-1 rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">Description</span>
                  <p className="text-xs font-semibold leading-relaxed text-gray-800">{selectedBadge.description}</p>
                </div>

                <div className="space-y-1 rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    How it is earned
                  </span>
                  <p className="text-xs font-medium leading-relaxed text-gray-700">{selectedBadge.criteria}</p>
                </div>

                {selectedBadge.status === 'EARNED' ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="rounded-xl border border-gray-100 bg-white p-2.5">
                        <span className="block text-[10px] font-bold uppercase text-gray-400">Awarded</span>
                        <span className="mt-0.5 block font-extrabold text-gray-900">
                          {formatDate(selectedBadge.awardedAt)}
                        </span>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-white p-2.5">
                        <span className="block text-[10px] font-bold uppercase text-gray-400">Evidence</span>
                        <span className="mt-0.5 block font-extrabold text-gray-900">
                          {selectedBadge.awardedSource === 'MONTHLY'
                            ? 'Monthly performance snapshot'
                            : selectedBadge.awardedSource === 'MANUAL'
                              ? 'Platform-verified review'
                              : 'Verified career activity'}
                        </span>
                      </div>
                    </div>

                    {selectedBadge.credentialId && (
                      <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                          <ShieldCheck className="h-4 w-4" />
                          Platform-issued achievement credential
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-emerald-900">
                          <Hash className="h-3 w-3" />
                          <span className="font-mono">{selectedBadge.credentialId}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-800">
                          {selectedBadge.credentialStatus === 'REVOKED' ? (
                            <span className="text-red-700">Status: revoked</span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <BadgeCheck className="h-3.5 w-3.5" /> Status: valid
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] leading-relaxed text-emerald-700">
                          Platform-issued achievement credential from AI Career Platform — not an external
                          accreditation or certification.
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {selectedBadge.verificationUrl && (
                            <Link
                              href={selectedBadge.verificationUrl}
                              target="_blank"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-50"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Public verification page
                            </Link>
                          )}
                          <button
                            onClick={() => copyVerification(selectedBadge)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-50"
                          >
                            <Copy className="h-3.5 w-3.5" /> {copied ? 'Copied!' : 'Copy link'}
                          </button>
                          {selectedBadge.credentialStatus !== 'REVOKED' && (
                            <a
                              href={linkedInHref(selectedBadge) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A66C2] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#0958a5]"
                            >
                              <Share2 className="h-3.5 w-3.5" /> Add to LinkedIn profile
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    {selectedBadge.progressAvailable ? (
                      <div className="rounded-xl border border-gray-100 bg-white p-3.5">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-gray-500">
                            Progress: {selectedBadge.currentValue} / {selectedBadge.targetValue} {selectedBadge.unit}
                          </span>
                          <span className="text-gray-400">{selectedBadge.progressPercentage}%</span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-[#990024] transition-all duration-300"
                            style={{ width: `${selectedBadge.progressPercentage}%` }}
                          />
                        </div>
                        <p className="mt-2 text-[11px] text-gray-500">
                          {selectedBadge.remainingToUnlock} {selectedBadge.unit} to unlock.
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3.5 text-[11px] text-gray-600">
                        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                        <span>
                          This badge unlocks from verified platform activity, so an exact percentage is not shown. See
                          the criteria above for what counts.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {selectedBadge.status === 'EARNED' && selectedBadge.awardedAt && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                    <CalendarDays className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>Unlocked on {formatDate(selectedBadge.awardedAt)}</span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unlock celebration */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-3 rounded-2xl border border-amber-400/40 bg-gray-900 p-4 text-white shadow-2xl"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center">
              <BadgeEmblem
                icon={toast.icon}
                tier={toast.tier as BadgeTier}
                category={toast.category as BadgeCategory}
                size={40}
                title={toast.title}
              />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-wider text-amber-400">
                Badge unlocked
              </span>
              <p className="truncate text-xs font-bold text-white">{toast.title}</p>
              <p className="text-[11px] text-gray-300">+{toast.xpReward} XP added to your ledger</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="ml-2 p-1 text-gray-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
