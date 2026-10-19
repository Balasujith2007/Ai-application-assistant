'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Trophy,
  Flame,
  Zap,
  Target,
  Medal,
  Award,
  Crown,
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowLeft,
  CalendarCheck,
  TrendingUp,
  RotateCw,
  Terminal,
  Database,
  Cpu,
  Globe,
  Send,
  Briefcase,
  Layers,
  Users,
  ShieldCheck,
  X,
  Search,
} from 'lucide-react';
import Link from 'next/link';

// Icon Map for Badge Render
const ICON_MAP: Record<string, any> = {
  Code: Terminal,
  Zap,
  Terminal,
  BrainCircuit: Cpu,
  Flame,
  CalendarCheck,
  TrendingUp,
  RotateCw,
  Database,
  Cpu,
  Globe,
  Send,
  Briefcase,
  Sparkles,
  Layers,
  Users,
  ShieldCheck,
  Trophy,
  Target,
  Medal,
  Crown,
  Award,
};

const TIER_STYLES: Record<string, { badgeBg: string; badgeBorder: string; badgeText: string; medalGradient: string; glow: string }> = {
  BRONZE: {
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    badgeText: 'text-amber-800',
    medalGradient: 'from-amber-200 via-amber-400 to-amber-600',
    glow: 'rgba(217, 119, 6, 0.25)',
  },
  SILVER: {
    badgeBg: 'bg-slate-50',
    badgeBorder: 'border-slate-200',
    badgeText: 'text-slate-800',
    medalGradient: 'from-slate-100 via-slate-300 to-slate-500',
    glow: 'rgba(100, 116, 139, 0.25)',
  },
  GOLD: {
    badgeBg: 'bg-yellow-50',
    badgeBorder: 'border-yellow-200',
    badgeText: 'text-yellow-900',
    medalGradient: 'from-yellow-200 via-amber-400 to-yellow-600',
    glow: 'rgba(234, 179, 8, 0.35)',
  },
  PLATINUM: {
    badgeBg: 'bg-cyan-50',
    badgeBorder: 'border-cyan-200',
    badgeText: 'text-cyan-900',
    medalGradient: 'from-cyan-100 via-sky-300 to-blue-500',
    glow: 'rgba(6, 182, 212, 0.3)',
  },
  DIAMOND: {
    badgeBg: 'bg-purple-50',
    badgeBorder: 'border-purple-200',
    badgeText: 'text-purple-900',
    medalGradient: 'from-purple-200 via-fuchsia-400 to-indigo-600',
    glow: 'rgba(168, 85, 247, 0.35)',
  },
};

export default function AchievementsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBadge, setSelectedBadge] = useState<any>(null);
  const [newlyUnlockedToast, setNewlyUnlockedToast] = useState<any>(null);

  const fetchAchievements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/achievements');
      const json = await res.json();
      if (json.success) {
        setData(json);

        // Check if there is any unacknowledged badge for celebration toast
        const unacked = json.badges?.find((b: any) => b.status === 'EARNED' && b.unlockedToastSeen === false);
        if (unacked) {
          setNewlyUnlockedToast(unacked);
          fetch('/api/achievements/ack-toast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
    totalAvailable: 24,
    completionPercentage: 0,
    totalXp: 0,
    currentStreak: 0,
    longestStreak: 0,
  };

  const nextMilestone = data?.nextMilestone;
  const allBadges: any[] = data?.badges || [];
  const history: any[] = data?.history || [];

  // Filter badges
  const filteredBadges = allBadges.filter((b) => {
    if (selectedCategory !== 'ALL' && b.category !== selectedCategory) return false;
    if (selectedStatus !== 'ALL' && b.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return b.title.toLowerCase().includes(q) || b.description.toLowerCase().includes(q);
    }
    return true;
  });

  const categories = [
    { key: 'ALL', label: 'All Badges', count: allBadges.length },
    { key: 'CODING', label: 'Coding', count: allBadges.filter((b) => b.category === 'CODING').length },
    { key: 'CONSISTENCY', label: 'Consistency', count: allBadges.filter((b) => b.category === 'CONSISTENCY').length },
    { key: 'SKILL', label: 'Skill Progress', count: allBadges.filter((b) => b.category === 'SKILL').length },
    { key: 'CAREER', label: 'Career Activities', count: allBadges.filter((b) => b.category === 'CAREER').length },
    { key: 'XP', label: 'XP Milestones', count: allBadges.filter((b) => b.category === 'XP').length },
  ];

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/student')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-2xs hover:bg-gray-50 transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Dashboard</span>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>Achievements & Badges</span>
              <span className="text-sm font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {summary.totalEarned} / {summary.totalAvailable}
              </span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Verified gamified recognition for coding performance, consistency, and career milestones.
            </p>
          </div>
        </div>

        {/* Quick Link to Progress / Leaderboard */}
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/student/progress"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-1.5 rounded-xl transition"
          >
            <Trophy className="h-3.5 w-3.5" />
            <span>View Class Leaderboard</span>
          </Link>
        </div>
      </div>

      {/* 1. Hero Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Badges */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Earned Badges</span>
            <div className="h-8 w-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
              🏆
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-gray-900">
              {summary.totalEarned}
              <span className="text-xs font-semibold text-gray-400 ml-1">/ {summary.totalAvailable}</span>
            </span>
            <div className="h-1.5 w-full bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-[#990024] rounded-full transition-all duration-500"
                style={{ width: `${summary.completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 2: Total Verified XP */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Verified XP</span>
            <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
              ⚡
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-gray-900">
              {Number(summary.totalXp).toLocaleString()}
            </span>
            <p className="text-[11px] text-gray-400 mt-1">From points ledger audit trail</p>
          </div>
        </div>

        {/* Metric 3: Consistency Streak */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Current Streak</span>
            <div className="h-8 w-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center font-bold text-sm">
              🔥
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-gray-900">
              {summary.currentStreak} <span className="text-xs font-semibold text-gray-400">Days</span>
            </span>
            <span className="text-xs font-semibold text-gray-500">
              Best: <strong className="text-gray-900">{summary.longestStreak}d</strong>
            </span>
          </div>
        </div>

        {/* Metric 4: Next Closest Milestone */}
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#990024] uppercase tracking-wider">Next Milestone</span>
            <Target className="h-4 w-4 text-[#990024]" />
          </div>
          <div className="mt-2">
            {nextMilestone ? (
              <>
                <span className="text-sm font-bold text-gray-900 block truncate">
                  {nextMilestone.title}
                </span>
                <p className="text-[11px] text-gray-600 truncate mt-0.5">
                  {nextMilestone.remainingToUnlock} {nextMilestone.unit} remaining ({nextMilestone.progressPercentage}%)
                </p>
                <div className="h-1.5 w-full bg-rose-200/60 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-[#990024] rounded-full transition-all duration-500"
                    style={{ width: `${nextMilestone.progressPercentage}%` }}
                  />
                </div>
              </>
            ) : (
              <span className="text-xs text-gray-600 font-medium">All milestones unlocked! 🌟</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat.key
                  ? 'bg-[#990024] text-white shadow-2xs'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>

        {/* Search & Status Controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search badges..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#990024] w-40 sm:w-48"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 focus:outline-none focus:border-[#990024] cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="EARNED">Earned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="LOCKED">Locked</option>
          </select>
        </div>
      </div>

      {/* 3. Badge Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gray-200" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-28 bg-gray-200 rounded" />
                  <div className="h-3 w-16 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="h-3 w-full bg-gray-200 rounded" />
              <div className="h-2 w-full bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      ) : filteredBadges.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center space-y-2">
          <Trophy className="h-8 w-8 text-gray-300 mx-auto" />
          <h3 className="text-sm font-bold text-gray-700">No badges matching filter</h3>
          <p className="text-xs text-gray-400">Try adjusting your category or status filters to view badges.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBadges.map((badge) => {
            const IconComponent = ICON_MAP[badge.icon] || Trophy;
            const tierStyle = TIER_STYLES[badge.tier] || TIER_STYLES.BRONZE;
            const isEarned = badge.status === 'EARNED';
            const isInProgress = badge.status === 'IN_PROGRESS';

            return (
              <motion.div
                key={badge.id}
                whileHover={{ y: -2 }}
                onClick={() => setSelectedBadge(badge)}
                className={`rounded-2xl border transition-all p-4 flex flex-col justify-between cursor-pointer relative overflow-hidden group ${
                  isEarned
                    ? 'bg-white border-amber-200 shadow-2xs hover:shadow-md hover:border-amber-300'
                    : isInProgress
                    ? 'bg-white border-gray-200 shadow-2xs hover:border-blue-300'
                    : 'bg-gray-50/60 border-gray-200/80 opacity-80 hover:opacity-100'
                }`}
              >
                <div>
                  {/* Top Row: Icon + Tier Pill + XP */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="relative">
                      {/* Medallion Icon */}
                      <div
                        className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm border transition-transform group-hover:scale-105 ${
                          isEarned
                            ? `bg-gradient-to-br ${tierStyle.medalGradient} text-white border-white/60`
                            : isInProgress
                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                            : 'bg-gray-100 text-gray-400 border-gray-200'
                        }`}
                        style={{
                          boxShadow: isEarned ? `0 4px 12px ${tierStyle.glow}` : undefined,
                        }}
                      >
                        <IconComponent className="h-6 w-6" />
                      </div>

                      {/* Earned Checkmark / Lock Indicator */}
                      {isEarned ? (
                        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs border border-white">
                          <CheckCircle2 className="h-3 w-3 stroke-[3]" />
                        </div>
                      ) : !isInProgress ? (
                        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center shadow-xs border border-white">
                          <Lock className="h-2.5 w-2.5" />
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${tierStyle.badgeBg} ${tierStyle.badgeBorder} ${tierStyle.badgeText}`}>
                        {badge.tier}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                        +{badge.xpReward} XP
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="mt-3">
                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#990024] transition-colors leading-snug">
                      {badge.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                      {badge.description}
                    </p>
                  </div>
                </div>

                {/* Bottom: Progress Bar & Status */}
                <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className={isEarned ? 'text-emerald-600' : 'text-gray-500'}>
                      {isEarned
                        ? 'Unlocked'
                        : `${badge.currentValue} / ${badge.targetValue} ${badge.unit}`}
                    </span>
                    <span className="text-gray-400 font-semibold">{badge.progressPercentage}%</span>
                  </div>

                  {/* Progress Line */}
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isEarned
                          ? 'bg-emerald-500'
                          : isInProgress
                          ? 'bg-blue-600'
                          : 'bg-gray-300'
                      }`}
                      style={{ width: `${badge.progressPercentage}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 4. Achievement History Section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#990024]" />
            <h2 className="text-base font-bold text-gray-900">Recent Achievement History</h2>
          </div>
          <span className="text-xs font-semibold text-gray-400">Auditable Log</span>
        </div>

        {history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center text-xs text-gray-400 font-medium">
            No achievement unlocks recorded yet. Complete coding practice or submit applications to earn badges!
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {history.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 font-bold">
                    🏆
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-gray-900 block truncate">{item.title}</span>
                    <span className="text-[11px] text-gray-500 block truncate">{item.eventDetails}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    +{item.xpEarned} XP
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(item.achievedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Badge Details Modal */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white font-bold shadow-md ${
                      selectedBadge.status === 'EARNED'
                        ? `bg-gradient-to-br ${TIER_STYLES[selectedBadge.tier]?.medalGradient || 'from-amber-400 to-amber-600'}`
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {React.createElement(ICON_MAP[selectedBadge.icon] || Trophy, { className: 'h-7 w-7' })}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{selectedBadge.title}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${TIER_STYLES[selectedBadge.tier]?.badgeBg} ${TIER_STYLES[selectedBadge.tier]?.badgeBorder} ${TIER_STYLES[selectedBadge.tier]?.badgeText}`}>
                        {selectedBadge.tier}
                      </span>
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {selectedBadge.category}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedBadge(null)}
                  className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl bg-gray-50 p-3.5 border border-gray-100 space-y-1">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Description</span>
                  <p className="text-xs font-semibold text-gray-800 leading-relaxed">{selectedBadge.description}</p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3.5 border border-gray-100 space-y-1">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Unlock Criteria</span>
                  <p className="text-xs font-medium text-gray-700 leading-relaxed">{selectedBadge.criteria}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="rounded-xl border border-gray-100 p-2.5 bg-white">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Bonus Reward</span>
                    <span className="font-extrabold text-emerald-600 block mt-0.5">+{selectedBadge.xpReward} XP</span>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-2.5 bg-white">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Current Progress</span>
                    <span className="font-extrabold text-gray-900 block mt-0.5">
                      {selectedBadge.currentValue} / {selectedBadge.targetValue} ({selectedBadge.progressPercentage}%)
                    </span>
                  </div>
                </div>

                {selectedBadge.status === 'EARNED' && selectedBadge.awardedAt && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Unlocked on {new Date(selectedBadge.awardedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Newly Unlocked Celebration Toast */}
      <AnimatePresence>
        {newlyUnlockedToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 rounded-2xl bg-gray-900 text-white p-4 shadow-2xl flex items-center gap-3 border border-amber-400/40 max-w-sm"
          >
            <div className="h-10 w-10 rounded-xl bg-amber-400 text-gray-900 flex items-center justify-center text-xl shrink-0">
              🎉
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">Badge Unlocked!</span>
              <p className="text-xs font-bold text-white truncate">{newlyUnlockedToast.title}</p>
              <p className="text-[11px] text-gray-300">+{newlyUnlockedToast.xpReward} XP awarded to your ledger</p>
            </div>
            <button
              type="button"
              onClick={() => setNewlyUnlockedToast(null)}
              className="text-gray-400 hover:text-white ml-2 p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
