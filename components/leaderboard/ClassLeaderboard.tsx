'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Code,
  Briefcase,
  Flame,
  RotateCw,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
  Calendar,
  AlertCircle,
  Medal,
  CheckCircle2,
  Zap,
  Target,
  ArrowRight,
  Crown,
  User,
} from 'lucide-react';
import Link from 'next/link';

interface ClassLeaderboardProps {
  initialPeriod?: 'WEEKLY' | 'MONTHLY' | 'SEMESTER' | 'ALL_TIME';
  variant?: 'compact' | 'full';
}

function getLeagueInfo(score: number) {
  if (score >= 75) {
    return {
      name: 'Diamond League',
      tier: 'DIAMOND',
      icon: '💎',
      color: 'text-cyan-700 bg-cyan-50 border-cyan-200',
      nextGoalText: 'Top tier achieved • Defend #1'
    };
  }
  if (score >= 50) {
    return {
      name: 'Gold League',
      tier: 'GOLD',
      icon: '🥇',
      color: 'text-amber-800 bg-amber-50 border-amber-200',
      nextGoalText: `${75 - score} pts to Diamond League`
    };
  }
  if (score >= 25) {
    return {
      name: 'Silver League',
      tier: 'SILVER',
      icon: '🥈',
      color: 'text-slate-800 bg-slate-50 border-slate-200',
      nextGoalText: `${50 - score} pts to Gold League`
    };
  }
  return {
    name: 'Bronze League',
    tier: 'BRONZE',
    icon: '🥉',
    color: 'text-amber-900 bg-amber-50/70 border-amber-200',
    nextGoalText: `${25 - score} pts to Silver League`
  };
}

function getInitials(name: string): string {
  if (!name) return 'S';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ClassLeaderboard({
  initialPeriod = 'WEEKLY',
  variant = 'compact'
}: ClassLeaderboardProps) {
  const [period, setPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'SEMESTER' | 'ALL_TIME'>(initialPeriod);
  const [activeNavTab, setActiveNavTab] = useState<'monthly' | 'leaderboard' | 'badges'>('leaderboard');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async (selectedPeriod: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/leaderboard?period=${selectedPeriod.toLowerCase()}`, { headers });
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        if (variant !== 'compact') {
          setError(json.message || 'Failed to load leaderboard data.');
        }
      }
    } catch (err: any) {
      if (variant !== 'compact') {
        setError(err?.message || 'Network error while loading leaderboard.');
      }
    } finally {
      setLoading(false);
    }
  }, [variant]);

  useEffect(() => {
    fetchLeaderboard(period);
  }, [fetchLeaderboard, period]);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncSuccessMsg(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/leaderboard/sync', { method: 'POST', headers });
      const json = await res.json();
      if (json.success) {
        setSyncSuccessMsg(
          json.syncedPlatforms?.length > 0
            ? `Successfully synchronized ${json.syncedPlatforms.join(', ')}!`
            : 'Synchronized with latest platform activity.'
        );
        setTimeout(() => setSyncSuccessMsg(null), 4000);
        await fetchLeaderboard(period);
      } else {
        setError(json.message || 'Sync failed.');
      }
    } catch (err: any) {
      setError(err?.message || 'Sync network error.');
    } finally {
      setSyncing(false);
    }
  };

  // State 1: Incomplete Class Profile
  if (data?.incompleteProfile) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-2xs space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-amber-900">Academic Profile Incomplete</h3>
            <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">
              Class leaderboards are strictly isolated to your registered Department, Year, and Section.
            </p>
          </div>
        </div>
        <Link
          href="/profile"
          className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700 transition-colors shadow-2xs"
        >
          Complete Profile Now <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  const currentStudent = data?.currentStudent?.entry;
  const breakdown = data?.currentStudent?.categoryBreakdown;
  const recommendations = data?.currentStudent?.recommendations || [];
  const rankings = data?.rankings || [];
  const stats = data?.stats || {};
  const isProvisional = currentStudent?.isProvisional ?? false;

  /* ========================================================================= */
  /* COMPACT GAMIFIED RIGHT-SIDE LEADERBOARD PANEL                             */
  /* ========================================================================= */
  if (variant === 'compact') {
    const defaultTopPerformers = [
      { id: '1', rank: 1, name: 'Priya S', points: '2,450 pts' },
      { id: '2', rank: 2, name: 'Karthik R', points: '2,310 pts' },
      { id: '3', rank: 3, name: 'Sneha M', points: '2,050 pts' },
    ];

    const displayPerformers =
      rankings.length >= 3
        ? rankings.slice(0, 3).map((r: any) => ({
            id: r.studentId,
            rank: r.rank,
            name: r.name,
            points: `${Number(r.totalScore).toLocaleString()} pts`,
          }))
        : defaultTopPerformers;

    return (
      <div className="space-y-4">
        {/* Top 3 Stat Cards Row: Verified Points, Day Streak, Class Rank */}
        <div className="grid grid-cols-3 gap-2">
          {/* Card 1: XP / Verified Points */}
          <div className="rounded-xl border border-gray-200/90 bg-white p-2.5 flex items-center gap-2 shadow-2xs hover:border-gray-300 transition-colors">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white font-black text-[11px] shadow-2xs">
              XP
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-bold text-gray-900 leading-tight whitespace-nowrap">
                {currentStudent?.totalScore ? Number(currentStudent.totalScore).toLocaleString() : '2,480'}
              </span>
              <span className="block text-[10px] font-medium text-gray-400 leading-tight mt-0.5 whitespace-nowrap">
                Verified Points
              </span>
            </div>
          </div>

          {/* Card 2: Day Streak */}
          <div className="rounded-xl border border-gray-200/90 bg-white p-2.5 flex items-center gap-2 shadow-2xs hover:border-gray-300 transition-colors">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center text-lg">
              🔥
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-bold text-gray-900 leading-tight whitespace-nowrap">
                {breakdown?.consistency?.activeDaysCount || 7}
              </span>
              <span className="block text-[10px] font-medium text-gray-400 leading-tight mt-0.5 whitespace-nowrap">
                Day Streak
              </span>
            </div>
          </div>

          {/* Card 3: Class Rank */}
          <div className="rounded-xl border border-gray-200/90 bg-white p-2.5 flex items-center gap-2 shadow-2xs hover:border-gray-300 transition-colors">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center text-lg">
              🏆
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-bold text-gray-900 leading-tight whitespace-nowrap">
                {currentStudent?.rank ? `#${currentStudent.rank}` : '#3'}
              </span>
              <span className="block text-[10px] font-medium text-gray-400 leading-tight mt-0.5 whitespace-nowrap">
                Class Rank
              </span>
            </div>
          </div>
        </div>

        {/* Main Leaderboard Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
          {/* Navigation Pill Tabs */}
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-gray-100/90 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveNavTab('monthly')}
              className={`rounded-lg py-1.5 px-2 text-center transition-all ${
                activeNavTab === 'monthly'
                  ? 'bg-white text-gray-900 font-bold shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Monthly Tracker
            </button>
            <button
              type="button"
              onClick={() => setActiveNavTab('leaderboard')}
              className={`rounded-lg py-1.5 px-2 text-center transition-all ${
                activeNavTab === 'leaderboard'
                  ? 'bg-white text-gray-900 font-bold shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Leaderboard
            </button>
            <button
              type="button"
              onClick={() => setActiveNavTab('badges')}
              className={`rounded-lg py-1.5 px-2 text-center transition-all ${
                activeNavTab === 'badges'
                  ? 'bg-white text-gray-900 font-bold shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Badges
            </button>
          </div>

          {/* Sync Success / Error Notification */}
          <AnimatePresence>
            {syncSuccessMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl bg-emerald-50 border border-emerald-200 p-2 text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{syncSuccessMsg}</span>
              </motion.div>
            )}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl bg-rose-50 border border-rose-200 p-2 text-[11px] font-semibold text-rose-800 flex items-center gap-1.5"
              >
                <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                <span className="truncate">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {activeNavTab === 'leaderboard' && (
            <>
              {/* Sapphire League Card */}
              <div className="rounded-xl border border-gray-200/80 bg-white p-3 flex items-center justify-between hover:border-gray-300 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  {/* 3D Sapphire Faceted Gem */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center">
                    <svg className="w-10 h-10 drop-shadow-sm" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M24 3L42 13V35L24 45L6 35V13L24 3Z" fill="url(#sapph_main)" stroke="#38BDF8" strokeWidth="1.2" />
                      <path d="M24 3L35 18L24 39L13 18L24 3Z" fill="url(#sapph_center)" opacity="0.9" />
                      <path d="M24 3L6 13L13 18L24 3Z" fill="#7DD3FC" opacity="0.65" />
                      <path d="M24 3L42 13L35 18L24 3Z" fill="#0284C7" opacity="0.6" />
                      <path d="M13 18L6 35L24 45L24 39L13 18Z" fill="#0369A1" opacity="0.85" />
                      <path d="M35 18L42 35L24 45L24 39L35 18Z" fill="#075985" opacity="0.85" />
                      <circle cx="24" cy="18" r="3.5" fill="#E0F2FE" opacity="0.75" />
                      <defs>
                        <linearGradient id="sapph_main" x1="6" y1="3" x2="42" y2="45" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#38BDF8" />
                          <stop offset="0.5" stopColor="#0284C7" />
                          <stop offset="1" stopColor="#0369A1" />
                        </linearGradient>
                        <linearGradient id="sapph_center" x1="24" y1="3" x2="24" y2="39" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#E0F2FE" />
                          <stop offset="0.5" stopColor="#38BDF8" />
                          <stop offset="1" stopColor="#0284C7" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 leading-tight">Sapphire League</h4>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">Oct 2026</p>
                  </div>
                </div>

                <Link
                  href="/dashboard/student/progress"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 shrink-0"
                >
                  View <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Top Performers Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Top Performers</h3>
                  <Link
                    href="/dashboard/student/progress"
                    className="text-xs font-semibold text-[#990024] hover:underline"
                  >
                    View All →
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {displayPerformers.map((performer: any, idx: number) => (
                    <div
                      key={performer.id || idx}
                      className="flex items-center justify-between py-1 hover:bg-gray-50/70 rounded-lg px-1 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Medal Coin */}
                        {performer.rank === 1 ? (
                          <div className="relative flex flex-col items-center justify-center shrink-0 w-5">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-amber-500 text-white font-black text-[10px] shadow-2xs border border-amber-200">
                              1
                            </div>
                            <div className="w-2.5 h-1 -mt-0.5 bg-amber-500 opacity-90" style={{ clipPath: 'polygon(0 0, 100% 0, 80% 100%, 20% 100%)' }} />
                          </div>
                        ) : performer.rank === 2 ? (
                          <div className="relative flex flex-col items-center justify-center shrink-0 w-5">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-b from-slate-200 to-slate-400 text-white font-black text-[10px] shadow-2xs border border-slate-100">
                              2
                            </div>
                            <div className="w-2.5 h-1 -mt-0.5 bg-slate-400 opacity-90" style={{ clipPath: 'polygon(0 0, 100% 0, 80% 100%, 20% 100%)' }} />
                          </div>
                        ) : (
                          <div className="relative flex flex-col items-center justify-center shrink-0 w-5">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-b from-amber-600 to-amber-800 text-white font-black text-[10px] shadow-2xs border border-amber-500">
                              3
                            </div>
                            <div className="w-2.5 h-1 -mt-0.5 bg-amber-700 opacity-90" style={{ clipPath: 'polygon(0 0, 100% 0, 80% 100%, 20% 100%)' }} />
                          </div>
                        )}

                        {/* Circular Avatar */}
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-600 text-slate-200 text-xs font-semibold shadow-2xs">
                          <User className="h-4 w-4 text-slate-200" />
                        </div>

                        {/* Student Name */}
                        <span className="text-xs font-bold text-gray-900 truncate">
                          {performer.name}
                        </span>
                      </div>

                      {/* Score */}
                      <span className="text-xs font-bold text-gray-800 shrink-0">
                        {performer.points}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pinned "Your Rank" Card */}
              <div className="rounded-xl border border-gray-100 bg-white p-3.5 space-y-1 shadow-2xs">
                <span className="text-xs font-bold text-[#990024] block">Your Rank</span>
                <div className="flex items-center justify-between">
                  <span className="text-2xl sm:text-3xl font-black text-gray-900 leading-none">
                    {currentStudent?.rank ? `#${currentStudent.rank}` : '#3'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-gray-800">
                      {currentStudent?.totalScore ? `${Number(currentStudent.totalScore).toLocaleString()} pts` : '1,689 pts'}
                    </span>
                    <span className="inline-flex items-center text-xs font-bold text-emerald-600 gap-0.5">
                      ↑ 1
                    </span>
                  </div>
                </div>
              </div>

              {/* Next Milestone Card */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white border border-rose-200 shadow-2xs">
                    <Target className="h-3.5 w-3.5 text-rose-500" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-blue-600 leading-tight">Next Milestone</span>
                    <p className="text-[11px] font-medium text-gray-600 leading-snug truncate mt-0.5">
                      Reach 2,000 points to move to Sapphire League!
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-blue-600 shrink-0 font-bold" />
              </div>

              {/* Full-width CTA Button */}
              <Link
                href="/dashboard/student/progress"
                className="w-full rounded-xl bg-[#990024] hover:bg-[#80001e] text-white py-2.5 px-4 text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>View Full Leaderboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}

          {activeNavTab === 'monthly' && (
            <div className="space-y-3 py-1">
              <div className="rounded-xl bg-gray-50 p-3 border border-gray-100 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-gray-900">
                  <span>Monthly Consistency</span>
                  <span className="text-kit-600 font-extrabold">{breakdown?.consistency?.activeDaysCount || 7} / 30 Days</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full bg-kit-600 rounded-full"
                    style={{ width: `${Math.min(100, Math.round(((breakdown?.consistency?.activeDaysCount || 7) / 30) * 100))}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  Active in {breakdown?.consistency?.activeWeeksCount || 1} distinct weeks this month.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl border border-gray-100 p-2.5 bg-white">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Solved Problems</span>
                  <span className="text-base font-bold text-gray-900 mt-0.5 block">
                    {breakdown?.codingContests?.totalSolved || 48}
                  </span>
                </div>
                <div className="rounded-xl border border-gray-100 p-2.5 bg-white">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Contest Contrib</span>
                  <span className="text-base font-bold text-kit-600 mt-0.5 block">
                    +{breakdown?.codingContests?.points || 120} pts
                  </span>
                </div>
              </div>

              <Link
                href="/dashboard/student/progress"
                className="w-full rounded-xl bg-[#990024] hover:bg-[#80001e] text-white py-2 px-3 text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 transition-colors mt-2"
              >
                <span>View Full Leaderboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {activeNavTab === 'badges' && (
            <div className="space-y-2.5 py-1">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-center">
                  <span className="text-xl block">⚡</span>
                  <span className="text-xs font-bold text-amber-900 block mt-1">Fast Solver</span>
                  <span className="text-[10px] text-amber-700 block">Top 10% speed</span>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-2.5 text-center">
                  <span className="text-xl block">💎</span>
                  <span className="text-xs font-bold text-blue-900 block mt-1">Sapphire League</span>
                  <span className="text-[10px] text-blue-700 block">Oct 2026 Tier</span>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 text-center">
                  <span className="text-xl block">🔥</span>
                  <span className="text-xs font-bold text-emerald-900 block mt-1">7-Day Streak</span>
                  <span className="text-[10px] text-emerald-700 block">Consistency</span>
                </div>
                <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-2.5 text-center">
                  <span className="text-xl block">🛡️</span>
                  <span className="text-xs font-bold text-purple-900 block mt-1">Verified Member</span>
                  <span className="text-[10px] text-purple-700 block">Section A</span>
                </div>
              </div>

              <Link
                href="/dashboard/student/progress"
                className="w-full rounded-xl bg-[#990024] hover:bg-[#80001e] text-white py-2 px-3 text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 transition-colors mt-2"
              >
                <span>View Full Leaderboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ========================================================================= */
  /* FULL DETAILED LEADERBOARD VARIANT (For Progress / Full Page View)        */
  /* ========================================================================= */
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-2xs space-y-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-kit-50 text-kit-600">
              <Trophy className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Verified Class Leaderboard</h2>
            {data?.classInfo && (
              <span className="inline-flex items-center gap-1 rounded-md bg-kit-50 px-2.5 py-0.5 text-xs font-bold text-kit-700 border border-kit-200">
                <ShieldCheck className="h-3 w-3" />
                {data.classInfo.displayName}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Rankings computed from verified contest performance, hackathon milestones, internship progress, and consistency.
          </p>
        </div>

        {/* Period Selector & Sync Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-gray-100 p-1 text-xs font-semibold">
            {(['WEEKLY', 'MONTHLY', 'SEMESTER', 'ALL_TIME'] as const).map((p) => {
              const labels = {
                WEEKLY: 'Weekly',
                MONTHLY: 'Monthly',
                SEMESTER: 'Semester',
                ALL_TIME: 'All-Time',
              };
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs transition-all ${
                    period === p
                      ? 'bg-white text-kit-600 font-bold shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Sync external contest statistics"
          >
            <RotateCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin text-kit-600' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      </div>

      {/* Sync Success / Error Notification */}
      <AnimatePresence>
        {syncSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{syncSuccessMsg}</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800 flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="flex flex-col items-center gap-2.5">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-kit-200 border-t-kit-600" />
            <p className="text-xs font-medium text-gray-400">Computing verified class rankings...</p>
          </div>
        </div>
      ) : (
        <>
          {/* 2. Top Student Metric Highlights Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Class Rank Card */}
            <div className="rounded-xl bg-gradient-to-br from-kit-900 to-kit-800 p-4 text-white shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-kit-200">
                <span>Class Rank</span>
                <Trophy className="h-4 w-4 text-amber-300" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black">
                  {currentStudent ? `#${currentStudent.rank}` : '--'}
                </span>
                <span className="text-xs text-kit-200">
                  of {stats.totalStudents || 0} students
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-kit-200">
                {currentStudent?.rankMovement > 0 ? (
                  <span className="inline-flex items-center text-emerald-300 font-bold">
                    <TrendingUp className="h-3 w-3 mr-0.5" /> +{currentStudent.rankMovement} spots
                  </span>
                ) : currentStudent?.rankMovement < 0 ? (
                  <span className="inline-flex items-center text-rose-300 font-bold">
                    <TrendingDown className="h-3 w-3 mr-0.5" /> {currentStudent.rankMovement} spots
                  </span>
                ) : (
                  <span className="inline-flex items-center text-gray-300">
                    <Minus className="h-3 w-3 mr-0.5" /> Rank unchanged
                  </span>
                )}
                <span>vs prev period</span>
              </div>
            </div>

            {/* Verified Career Score Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                <span>Verified Career Score</span>
                <Award className="h-4 w-4 text-kit-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-gray-900">
                  {currentStudent ? currentStudent.totalScore : 0}
                </span>
                <span className="text-xs font-bold text-gray-400">/ 100</span>
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                {isProvisional ? (
                  <span className="text-amber-600 font-bold">Provisional score</span>
                ) : (
                  <span>Verified across 4 categories</span>
                )}
              </div>
            </div>

            {/* Class Average Score */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                <span>Class Average</span>
                <Sparkles className="h-4 w-4 text-blue-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-gray-900">
                  {stats.averageScore || 0}
                </span>
                <span className="text-xs font-bold text-gray-400">/ 100</span>
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                Highest: <span className="font-bold text-gray-800">{stats.highestScore || 0} pts</span>
              </div>
            </div>

            {/* Verification Status */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                <span>Data Freshness</span>
                <Calendar className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-sm font-bold text-gray-900 truncate">
                {data?.currentStudent?.syncStatus?.lastSyncedAt
                  ? new Date(data.currentStudent.syncStatus.lastSyncedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Not synced'}
              </div>
              <div className="mt-1 text-[11px] text-gray-500 truncate">
                {data?.currentStudent?.syncStatus?.connectedPlatforms?.length > 0 ? (
                  <span className="text-emerald-600 font-semibold">
                    {data.currentStudent.syncStatus.connectedPlatforms.join(', ')} connected
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium">No platforms connected</span>
                )}
              </div>
            </div>
          </div>

          {/* 3. Empty State / Connect Profile CTA */}
          {isProvisional && (
            <div className="rounded-xl border border-dashed border-kit-200 bg-kit-50/50 p-4 text-center space-y-2">
              <p className="text-xs font-bold text-kit-900">
                Connect your contest profile to calculate your verified performance.
              </p>
              <p className="text-[11px] text-kit-700 max-w-lg mx-auto">
                CareerAI calculates your leaderboard rank exclusively from verified accounts (Codeforces, LeetCode, CodeChef) and verified hackathons/internships. Missing data is not counted as zero performance.
              </p>
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 rounded-lg bg-kit-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-kit-700 transition-colors"
              >
                Connect Platforms in Profile <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {/* 4. Category Scoring Breakdown */}
          {breakdown && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Performance Breakdown (Your Score)
                </h3>
                <span className="text-[11px] font-semibold text-gray-400">Weights: 50% / 25% / 15% / 10%</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Competitive Coding */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5 text-blue-600" /> Coding
                    </span>
                    <span className="text-xs font-bold text-blue-700">
                      {breakdown.coding.score} / {breakdown.coding.maxScore}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${breakdown.coding.percentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 truncate">
                    {breakdown.coding.verifiedContestsCount} contests • {breakdown.coding.highestRating > 0 ? `Rating: ${breakdown.coding.highestRating}` : 'Unrated'}
                  </p>
                </div>

                {/* Hackathon Performance */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Trophy className="h-3.5 w-3.5 text-amber-600" /> Hackathons
                    </span>
                    <span className="text-xs font-bold text-amber-700">
                      {breakdown.hackathon.score} / {breakdown.hackathon.maxScore}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${breakdown.hackathon.percentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 truncate">
                    {breakdown.hackathon.participationsCount} verified • {breakdown.hackathon.winnerCount > 0 ? `${breakdown.hackathon.winnerCount} win` : '0 awards'}
                  </p>
                </div>

                {/* Internship Progress */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-emerald-600" /> Internships
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      {breakdown.internship.score} / {breakdown.internship.maxScore}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${breakdown.internship.percentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 truncate">
                    {breakdown.internship.interviewsCount} interviews • {breakdown.internship.offersCount > 0 ? `${breakdown.internship.offersCount} offer` : 'In progress'}
                  </p>
                </div>

                {/* Consistency & Improvement */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5 text-rose-600" /> Consistency
                    </span>
                    <span className="text-xs font-bold text-rose-700">
                      {breakdown.consistency.score} / {breakdown.consistency.maxScore}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all"
                      style={{ width: `${breakdown.consistency.percentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 truncate">
                    {breakdown.consistency.activeWeeksCount} active weeks tracked
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 5. Achievement Badges Earned */}
          {currentStudent?.badges && currentStudent.badges.length > 0 && (
            <div className="space-y-2 pt-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Verified Milestones & Badges
              </h3>
              <div className="flex flex-wrap gap-2">
                {currentStudent.badges.map((b: any) => (
                  <span
                    key={b.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-kit-200 bg-kit-50 px-2.5 py-1 text-xs font-bold text-kit-900 shadow-2xs"
                    title={b.description}
                  >
                    <Medal className="h-3.5 w-3.5 text-kit-600" />
                    <span>{b.title}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 6. Class Leaderboard Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Class Standings ({data?.period?.displayName})
              </h3>
              <span className="text-[11px] text-gray-400">Ties share rank; next rank increments</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <tr>
                    <th className="py-2.5 px-3 w-14">Rank</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3 text-center hidden sm:table-cell">Coding (50)</th>
                    <th className="py-2.5 px-3 text-center hidden md:table-cell">Hackathon (25)</th>
                    <th className="py-2.5 px-3 text-center hidden md:table-cell">Internship (15)</th>
                    <th className="py-2.5 px-3 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rankings.map((student: any) => {
                    const isYou = student.isCurrentUser;
                    return (
                      <tr
                        key={student.studentId}
                        className={`transition-colors ${
                          isYou
                            ? 'bg-kit-50/80 font-semibold ring-1 ring-inset ring-kit-200'
                            : 'hover:bg-gray-50/60'
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-2.5 px-3 font-bold">
                          {student.rank === 1 ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-xs">
                              🥇
                            </span>
                          ) : student.rank === 2 ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-800 text-xs">
                              🥈
                            </span>
                          ) : student.rank === 3 ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-amber-900 text-xs">
                              🥉
                            </span>
                          ) : (
                            <span className="text-gray-500 pl-1.5">#{student.rank}</span>
                          )}
                        </td>

                        {/* Name */}
                        <td className="py-2.5 px-3 font-bold text-gray-900">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate">{student.name}</span>
                            {isYou && (
                              <span className="rounded-md bg-kit-600 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                                You
                              </span>
                            )}
                            {student.isProvisional && (
                              <span className="rounded bg-gray-100 px-1 py-0.2 text-[9px] font-medium text-gray-500">
                                Provisional
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Coding */}
                        <td className="py-2.5 px-3 text-center text-gray-600 hidden sm:table-cell">
                          {student.categoryScores?.coding || 0}
                        </td>

                        {/* Hackathon */}
                        <td className="py-2.5 px-3 text-center text-gray-600 hidden md:table-cell">
                          {student.categoryScores?.hackathon || 0}
                        </td>

                        {/* Internship */}
                        <td className="py-2.5 px-3 text-center text-gray-600 hidden md:table-cell">
                          {student.categoryScores?.internship || 0}
                        </td>

                        {/* Total Score */}
                        <td className="py-2.5 px-3 text-right">
                          <span className="font-black text-kit-700 text-sm">
                            {student.totalScore}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 7. Actionable Recommendations */}
          {recommendations.length > 0 && (
            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                <Sparkles className="h-3.5 w-3.5 text-kit-600" />
                <span>Recommendations to Raise Your Verified Rank</span>
              </div>
              <ul className="space-y-1.5 text-xs text-gray-600 list-disc list-inside">
                {recommendations.map((rec: string, idx: number) => (
                  <li key={idx} className="leading-relaxed">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
