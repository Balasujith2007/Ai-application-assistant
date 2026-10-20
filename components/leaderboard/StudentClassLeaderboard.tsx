'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Trophy,
  Flame,
  RotateCw,
  ChevronDown,
  Info,
  AlertCircle,
  CheckCircle2,
  Target,
  ArrowRight,
  ArrowLeft,
  Share2,
  Sparkles,
  ChevronRight,
  Award,
  X,
  Search,
  Check,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface ClassLeaderboardProps {
  initialPeriod?: 'WEEKLY' | 'MONTHLY' | 'SEMESTER' | 'ALL_TIME';
  variant?: 'compact' | 'full';
}

/**
 * Produces an optimized CDN thumbnail URL for fast leaderboard rendering.
 * Automatically requests appropriately sized, auto-quality, auto-format image from Cloudinary CDN edge.
 */
function getOptimizedAvatarUrl(url: string | null | undefined, size: number = 64): string | null {
  if (!url) return null;
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/c_fill,w_${size},h_${size},g_face,q_auto,f_auto/`);
  }
  return url;
}

/**
 * 3D Shiny Metallic Coin Badge based strictly on Image 1
 * - Rank 1: Radiant gold coin with dark-brown numeral '1' and top-left specular star sparkle
 * - Rank 2: Polished silver coin with dark-slate numeral '2' and soft specular sheen
 * - Rank 3: Warm copper-bronze coin with deep-bronze numeral '3' and soft specular sheen
 */
export function RankMedalBadge({
  rank,
  size = 'md',
}: {
  rank: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses =
    size === 'sm'
      ? 'h-5 w-5 text-[10px]'
      : size === 'lg'
      ? 'h-7 w-7 text-xs'
      : 'h-6 w-6 text-[11px]';

  if (rank === 1) {
    return (
      <div
        className={`relative flex ${sizeClasses} shrink-0 items-center justify-center rounded-full font-black select-none transition-transform hover:scale-105`}
        style={{
          background: 'radial-gradient(circle at 38% 30%, #FFF5BE 0%, #FDC536 35%, #F59E0B 72%, #D97706 100%)',
          color: '#542E02',
          boxShadow: '0 2px 4px -0.5px rgba(180, 83, 9, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.9), inset 0 -1.5px 1px rgba(180, 83, 9, 0.45)',
        }}
      >
        {/* Specular sparkle at top-left matching Image 1 */}
        <span
          className="absolute -top-0.5 left-0.5 text-white pointer-events-none drop-shadow-[0_0_1.5px_rgba(255,255,255,0.95)]"
          style={{ fontSize: size === 'sm' ? '8px' : '9px', lineHeight: 1 }}
        >
          ✦
        </span>
        <span className="relative z-10 leading-none font-black drop-shadow-[0_0.5px_0_rgba(255,255,255,0.35)]">
          1
        </span>
      </div>
    );
  }

  if (rank === 2) {
    return (
      <div
        className={`relative flex ${sizeClasses} shrink-0 items-center justify-center rounded-full font-black select-none transition-transform hover:scale-105`}
        style={{
          background: 'radial-gradient(circle at 38% 30%, #FFFFFF 0%, #E2E8F0 38%, #CBD5E1 70%, #94A3B8 100%)',
          color: '#1E293B',
          boxShadow: '0 2px 4px -0.5px rgba(71, 85, 105, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.95), inset 0 -1.5px 1px rgba(71, 85, 105, 0.45)',
        }}
      >
        {/* Specular sheen at top-left */}
        <span
          className="absolute top-0.5 left-1 w-1.5 h-1 rounded-full bg-white/70 blur-[0.4px] pointer-events-none"
        />
        <span className="relative z-10 leading-none font-black drop-shadow-[0_0.5px_0_rgba(255,255,255,0.45)]">
          2
        </span>
      </div>
    );
  }

  if (rank === 3) {
    return (
      <div
        className={`relative flex ${sizeClasses} shrink-0 items-center justify-center rounded-full font-black select-none transition-transform hover:scale-105`}
        style={{
          background: 'radial-gradient(circle at 38% 30%, #FFCCA8 0%, #FB923C 38%, #EA580C 72%, #C2410C 100%)',
          color: '#431407',
          boxShadow: '0 2px 4px -0.5px rgba(154, 52, 18, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.85), inset 0 -1.5px 1px rgba(154, 52, 18, 0.45)',
        }}
      >
        {/* Specular sheen at top-left */}
        <span
          className="absolute top-0.5 left-1 w-1.5 h-1 rounded-full bg-white/60 blur-[0.4px] pointer-events-none"
        />
        <span className="relative z-10 leading-none font-black drop-shadow-[0_0.5px_0_rgba(255,255,255,0.35)]">
          3
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex ${sizeClasses} shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] select-none border border-slate-200/80 shadow-2xs`}
    >
      {rank}
    </div>
  );
}

export function ClassLeaderboard({
  initialPeriod = 'MONTHLY',
  variant = 'compact'
}: ClassLeaderboardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [period, setPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'SEMESTER' | 'ALL_TIME'>(initialPeriod);
  const [activeNavTab, setActiveNavTab] = useState<'monthly' | 'leaderboard' | 'badges'>('leaderboard');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // States for Image 3 & Image 4 features
  const [mounted, setMounted] = useState(false);
  const [showRankPopover, setShowRankPopover] = useState(false);
  const [streakFrozen, setStreakFrozen] = useState(false);
  const [streakToast, setStreakToast] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState('Oct 2026');
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [achievementsData, setAchievementsData] = useState<any>(null);
  const [achievementsLoading, setAchievementsLoading] = useState(false);

  // Daily Check-in & Search States
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInState, setCheckInState] = useState<{
    checkedInToday: boolean;
    todayXpEarned: number;
    totalEarnedXp?: number;
    nextEligibleCheckIn: string | null;
    secondsUntilNextCheckIn: number;
    streak: {
      currentStreak: number;
      longestStreak: number;
      totalActiveDays: number;
      progressInCycle: number;
      targetInCycle: number;
    };
  } | null>(null);
  const [checkInMsg, setCheckInMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const popoverRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  // Click outside and escape listeners
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.closest('#top-rank-button') || target.closest('#top-stats-pill'))) {
        return;
      }
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowRankPopover(false);
      }
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistoryDropdown(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowRankPopover(false);
        setShowHistoryDropdown(false);
        setShowMonthlyModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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

  const fetchCheckInStatus = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/check-in', { headers });
      const json = await res.json();
      if (json.success) {
        setCheckInState(json);
      }
    } catch (err) {
      console.error('Failed to load check-in status:', err);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard(period);
    fetchCheckInStatus();
  }, [fetchLeaderboard, fetchCheckInStatus, period]);

  const fetchAchievements = useCallback(async () => {
    if (achievementsData) return;
    setAchievementsLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/achievements', { headers });
      const json = await res.json();
      if (json.success) {
        setAchievementsData(json.data);
      }
    } catch (e) {
      console.error('Failed to load achievements in leaderboard widget', e);
    } finally {
      setAchievementsLoading(false);
    }
  }, [achievementsData]);

  const handleCheckIn = async () => {
    if (checkInLoading || checkInState?.checkedInToday) return;
    setCheckInLoading(true);
    setCheckInMsg(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/check-in', { method: 'POST', headers });
      const json = await res.json();
      if (json.success) {
        setCheckInState(json.status || null);
        setCheckInMsg({
          text: json.message || `Checked in! +${json.xpAwarded} XP`,
          type: 'success',
        });
        await fetchLeaderboard(period);
        setTimeout(() => setCheckInMsg(null), 5000);
      } else {
        setCheckInMsg({ text: json.message || 'Check-in failed.', type: 'error' });
        setTimeout(() => setCheckInMsg(null), 4000);
      }
    } catch (err: any) {
      setCheckInMsg({ text: err?.message || 'Check-in network error.', type: 'error' });
      setTimeout(() => setCheckInMsg(null), 4000);
    } finally {
      setCheckInLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckInStatus();
  }, [fetchCheckInStatus]);

  useEffect(() => {
    if (activeNavTab === 'badges') {
      fetchAchievements();
    }
  }, [activeNavTab, fetchAchievements]);

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

  const handleRestoreStreak = () => {
    setStreakToast('Streak restored successfully! Consistency streak is active.');
    setTimeout(() => setStreakToast(null), 3500);
  };

  const handleFreezeStreak = () => {
    setStreakFrozen((prev) => {
      const next = !prev;
      setStreakToast(next ? 'Streak freeze activated! Protected for 48 hours.' : 'Streak freeze deactivated.');
      setTimeout(() => setStreakToast(null), 3500);
      return next;
    });
  };

  const handleShare = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareToast('Leaderboard link copied to clipboard!');
      setTimeout(() => setShareToast(null), 3500);
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

  // Deduplicate students by normalized name, keeping highest active entry
  const seenNames = new Set<string>();
  const uniqueRankings: any[] = [];
  for (const r of rankings) {
    const normalized = (r.name || '').trim().toLowerCase();
    if (!seenNames.has(normalized)) {
      seenNames.add(normalized);
      uniqueRankings.push({ ...r });
    }
  }

  // Guarantee strict adherence to:
  // 1. Total score / Earned XP descending
  // 2. Tie-breaker: who completed first (earlier completedAt timestamp ordered first in lineup)
  // 3. Alphabetical tie-breaker
  // 4. Distinct sequential ranks 1 to 67 across all classmates
  uniqueRankings.sort((a, b) => {
    const scoreA = Number(a.totalScore ?? 0);
    const scoreB = Number(b.totalScore ?? 0);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    const xpA = Number(a.earnedXp ?? 0);
    const xpB = Number(b.earnedXp ?? 0);
    if (xpB !== xpA) {
      return xpB - xpA;
    }
    const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    if (timeA !== timeB) {
      if (timeA === 0) return 1;
      if (timeB === 0) return -1;
      return timeA - timeB;
    }
    return (a.name || '').localeCompare(b.name || '');
  });

  // Preserve authoritative server ranks (fallback to sequential if missing)
  for (let i = 0; i < uniqueRankings.length; i++) {
    if (!uniqueRankings[i].rank || uniqueRankings[i].rank <= 0) {
      uniqueRankings[i].rank = i + 1;
    }
  }

  const currentLearnerEntry = uniqueRankings.find((r: any) => r.isCurrentUser);
  const realCurrentRank = currentLearnerEntry?.rank || currentStudent?.rank;

  const realTotalXp = checkInState?.totalEarnedXp != null
    ? checkInState.totalEarnedXp
    : (currentLearnerEntry?.earnedXp != null && currentLearnerEntry.earnedXp > 0
        ? currentLearnerEntry.earnedXp
        : (currentStudent?.earnedXp != null && currentStudent.earnedXp > 0
            ? currentStudent.earnedXp
            : (currentStudent?.totalScore != null ? Number(currentStudent.totalScore) : 0)));

  const realCurrentStreak = checkInState?.streak?.currentStreak != null
    ? checkInState.streak.currentStreak
    : (currentLearnerEntry?.streak != null
        ? currentLearnerEntry.streak
        : (currentStudent?.streak != null ? currentStudent.streak : 0));

  const realLongestStreak = checkInState?.streak?.longestStreak != null
    ? checkInState.streak.longestStreak
    : realCurrentStreak;

  const realRankDisplay = realCurrentRank
    ? `#${realCurrentRank}`
    : (loading ? '...' : (rankings.find((r: any) => r.isCurrentUser)?.rank ? `#${rankings.find((r: any) => r.isCurrentUser)?.rank}` : '-'));

  const currentLeague = realTotalXp >= 1000 ? 'Diamond' : realTotalXp >= 500 ? 'Sapphire' : realTotalXp >= 200 ? 'Gold' : realTotalXp >= 50 ? 'Silver' : 'Bronze';

  // Filter by search query across all cohort students
  const filteredRankings = uniqueRankings.filter((r: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.registerNo && r.registerNo.toLowerCase().includes(q))
    );
  });

  const displayLearners = filteredRankings.map((r: any) => {
    const isYou = r.isCurrentUser;
    const scoreNum = r.earnedXp != null && r.earnedXp > 0
      ? Number(r.earnedXp)
      : (r.totalScore != null ? Number(r.totalScore) : 0);

    const resolvedPhoto = isYou && !r.profilePhotoUrl
      ? ((user as any)?.profile?.profilePhotoUrl || null)
      : (r.profilePhotoUrl || null);

    return {
      id: r.studentId,
      rank: r.rank,
      name: r.name,
      xpScore: scoreNum.toLocaleString(),
      isCurrentUser: isYou,
      completedAt: r.completedAt,
      streak: r.streak || 0,
      registerNo: r.registerNo,
      profilePhotoUrl: resolvedPhoto,
    };
  });

  const displayPerformers = filteredRankings.slice(0, 5).map((r: any) => {
    const isYou = r.isCurrentUser;
    const scoreNum = r.earnedXp != null && r.earnedXp > 0
      ? Number(r.earnedXp)
      : (r.totalScore != null ? Number(r.totalScore) : 0);

    const resolvedPhoto = isYou && !r.profilePhotoUrl
      ? ((user as any)?.profile?.profilePhotoUrl || null)
      : (r.profilePhotoUrl || null);

    return {
      id: r.studentId,
      rank: r.rank,
      name: r.name,
      points: `${scoreNum.toLocaleString()} pts`,
      isCurrentUser: isYou,
      streak: r.streak || 0,
      profilePhotoUrl: resolvedPhoto,
    };
  });

  /* ========================================================================= */
  /* MONTHLY LEADERBOARD VIEW COMPONENT (Based strictly on Image 4)           */
  /* ========================================================================= */
  const renderMonthlyLeaderboardView = ({ onBack }: { onBack?: () => void }) => {
    return (
      <div className="space-y-6 max-w-4xl mx-auto w-full pb-12">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200/80">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-monthly-back"
              onClick={() => {
                if (onBack) onBack();
                else router.push('/dashboard/student');
              }}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-700 hover:text-gray-900 transition-colors py-1.5 px-3 rounded-xl bg-white border border-gray-200 shadow-2xs hover:bg-gray-50 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-1.5 ml-2">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight">
                Monthly Leaderboard
              </h1>
              <div className="relative group cursor-pointer text-gray-400 hover:text-gray-600">
                <Info className="h-4 w-4" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block w-56 p-2 bg-gray-900 text-white text-[11px] rounded-lg shadow-lg z-50">
                  Monthly cohort rankings reset on the 1st of every month. Top 25% of learners advance to the next league.
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5 text-gray-500" />
              <span>Share</span>
            </button>

            <div className="relative" ref={historyRef}>
              <button
                type="button"
                onClick={() => setShowHistoryDropdown((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors cursor-pointer"
              >
                <span>History</span>
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              </button>
              {showHistoryDropdown && (
                <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl z-50">
                  {['October 2026 (Active)', 'September 2026', 'August 2026', 'July 2026'].map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setSelectedHistoryMonth(m.replace(' (Active)', ''));
                        setShowHistoryDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="h-8 w-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors shadow-2xs ml-1 cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* 4 League Shields Row */}
        <div className="flex flex-col items-center justify-center pt-4 pb-4 text-center space-y-4">
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            {/* 1. Silver Shield */}
            <div className="flex flex-col items-center opacity-70 hover:opacity-100 transition-opacity">
              <svg className="w-12 h-14 sm:w-14 sm:h-16 drop-shadow-sm" viewBox="0 0 54 64" fill="none">
                <path d="M27 2L50 12V34C50 48 27 62 27 62C27 62 4 48 4 34V12L27 2Z" fill="url(#silver_grad)" stroke="#94A3B8" strokeWidth="1.5" />
                <path d="M14 40L23 32L31 36L40 22" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="40" cy="22" r="2.5" fill="#64748B" />
                <defs>
                  <linearGradient id="silver_grad" x1="4" y1="2" x2="50" y2="62" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#F1F5F9" />
                    <stop offset="0.5" stopColor="#CBD5E1" />
                    <stop offset="1" stopColor="#94A3B8" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* 2. Gold/Bronze Shield */}
            <div className="flex flex-col items-center opacity-70 hover:opacity-100 transition-opacity">
              <svg className="w-12 h-14 sm:w-14 sm:h-16 drop-shadow-sm" viewBox="0 0 54 64" fill="none">
                <path d="M27 2L50 12V34C50 48 27 62 27 62C27 62 4 48 4 34V12L27 2Z" fill="url(#bronze_grad)" stroke="#D97706" strokeWidth="1.5" />
                <path d="M14 40L23 32L31 36L40 22" stroke="#B45309" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="40" cy="22" r="2.5" fill="#B45309" />
                <defs>
                  <linearGradient id="bronze_grad" x1="4" y1="2" x2="50" y2="62" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FEF3C7" />
                    <stop offset="0.5" stopColor="#FBBF24" />
                    <stop offset="1" stopColor="#D97706" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* 3. Cyan/Emerald Shield */}
            <div className="flex flex-col items-center opacity-70 hover:opacity-100 transition-opacity">
              <svg className="w-12 h-14 sm:w-14 sm:h-16 drop-shadow-sm" viewBox="0 0 54 64" fill="none">
                <path d="M27 2L50 12V34C50 48 27 62 27 62C27 62 4 48 4 34V12L27 2Z" fill="url(#cyan_grad)" stroke="#0D9488" strokeWidth="1.5" />
                <path d="M14 40L23 32L31 36L40 22" stroke="#0F766E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="40" cy="22" r="2.5" fill="#0F766E" />
                <defs>
                  <linearGradient id="cyan_grad" x1="4" y1="2" x2="50" y2="62" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#CCFBF1" />
                    <stop offset="0.5" stopColor="#2DD4BF" />
                    <stop offset="1" stopColor="#0D9488" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* 4. Sapphire League Shield (Hero / Glowing Faceted Diamond) */}
            <div className="relative flex flex-col items-center scale-110">
              <div className="absolute inset-0 rounded-full bg-sky-400/25 blur-lg transform scale-125" />
              <svg className="relative w-14 h-16 sm:w-16 sm:h-20 drop-shadow-md" viewBox="0 0 48 48" fill="none">
                <path d="M24 2L44 12V36L24 46L4 36V12L24 2Z" fill="url(#sapph_hero_main)" stroke="#38BDF8" strokeWidth="1.5" />
                <path d="M24 2L36 17L24 40L12 17L24 2Z" fill="url(#sapph_hero_center)" opacity="0.95" />
                <path d="M24 2L4 12L12 17L24 2Z" fill="#7DD3FC" opacity="0.75" />
                <path d="M24 2L44 12L36 17L24 2Z" fill="#0284C7" opacity="0.7" />
                <path d="M12 17L4 36L24 46L24 40L12 17Z" fill="#0369A1" opacity="0.9" />
                <path d="M36 17L44 36L24 46L24 40L36 17Z" fill="#075985" opacity="0.9" />
                <circle cx="24" cy="17" r="4" fill="#E0F2FE" opacity="0.8" />
                <path d="M14 30L20 24L26 27L34 16" stroke="#BAE6FD" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="34" cy="16" r="2" fill="#FFFFFF" />
                <defs>
                  <linearGradient id="sapph_hero_main" x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#38BDF8" />
                    <stop offset="0.5" stopColor="#0284C7" />
                    <stop offset="1" stopColor="#0369A1" />
                  </linearGradient>
                  <linearGradient id="sapph_hero_center" x1="24" y1="2" x2="24" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#F0F9FF" />
                    <stop offset="0.4" stopColor="#7DD3FC" />
                    <stop offset="1" stopColor="#0284C7" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Sapphire League</h2>
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 font-medium mt-0.5">
              <span>{selectedHistoryMonth}</span>
              <span>|</span>
              <span className="font-semibold text-blue-600">12 days left</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">Top 25% advance to the next league</p>
          </div>
        </div>

        {/* Cohort Search & Standings Overview */}
        <div className="w-full max-w-2xl sm:max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs font-semibold text-gray-600">
            <span>Showing </span>
            <span className="font-bold text-gray-900">{displayLearners.length}</span>
            <span> of </span>
            <span className="font-bold text-gray-900">{uniqueRankings.length}</span>
            <span> enrolled classmates</span>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or roll no..."
              className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#990024] focus:ring-1 focus:ring-[#990024] shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Leaderboard Table Container */}
        <div className="w-full max-w-2xl sm:max-w-3xl mx-auto rounded-2xl overflow-hidden border border-gray-200/90 bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            {/* Dark Navy Table Header */}
            <thead className="bg-[#0B132B] text-gray-300 text-xs font-bold">
              <tr>
                <th className="py-3 px-4 w-16 text-center">Rank</th>
                <th className="py-3 px-4 text-left">
                  <div className="flex items-center gap-1">
                    <span>Learners</span>
                    <Info className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Streak</th>
                <th className="py-3 px-6 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>XP</span>
                    <Info className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                      <span>Loading class standings...</span>
                    </div>
                  </td>
                </tr>
              ) : displayLearners.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400 font-medium">
                    No classmates recorded in this cohort yet.
                  </td>
                </tr>
              ) : (
                displayLearners.map((learner, idx) => {
                  const showPromotionLine = idx === 6 && displayLearners.length > 7;

                  return (
                    <React.Fragment key={learner.id || idx}>
                      <tr
                        className={`transition-colors ${
                          learner.isCurrentUser
                            ? 'bg-[#EAF5FF] border-y border-sky-300 font-bold'
                            : 'hover:bg-gray-50/70 bg-white'
                        }`}
                      >
                        {/* Rank Column */}
                        <td className="py-3 px-4 text-center">
                          {learner.rank <= 3 ? (
                            <div className="flex items-center justify-center">
                              <RankMedalBadge rank={learner.rank} size="md" />
                            </div>
                          ) : (
                            <span className="text-gray-500 font-bold text-xs">{learner.rank}</span>
                          )}
                        </td>

                        {/* Learners Column */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full overflow-hidden bg-slate-100 border border-slate-200/90 shadow-2xs">
                              {learner.profilePhotoUrl ? (
                                <img
                                  src={getOptimizedAvatarUrl(learner.profilePhotoUrl, 64) || learner.profilePhotoUrl}
                                  alt={learner.name}
                                  loading="lazy"
                                  decoding="async"
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <span className="text-gray-900 font-bold text-xs truncate block">
                                {learner.name}
                              </span>
                              {learner.isCurrentUser && (
                                <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wide">
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Streak Column */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-gray-700 text-xs">
                            <span>🔥</span>
                            <span>{learner.streak || 0}d</span>
                          </span>
                        </td>

                        {/* XP Column */}
                        <td className="py-3 px-6 text-right">
                          <span className="inline-flex items-center gap-1 font-extrabold text-gray-900 text-xs">
                            <span>🪙</span>
                            <span>{learner.xpScore}</span>
                          </span>
                        </td>
                      </tr>

                      {/* Promotion Zone Divider after Rank 7 */}
                      {showPromotionLine && (
                        <tr>
                          <td colSpan={4} className="py-2.5 px-4 bg-white">
                            <div className="relative flex items-center justify-center">
                              <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-dashed border-emerald-400" />
                              </div>
                              <span className="relative z-10 bg-white px-3 text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                <span>↑</span>
                                <span>Promotion Zone</span>
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Actionable Recommendations & Milestones */}
        {recommendations.length > 0 && (
          <div className="w-full max-w-2xl sm:max-w-3xl mx-auto rounded-xl border border-gray-100 bg-gray-50/70 p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
              <Sparkles className="h-3.5 w-3.5 text-[#990024]" />
              <span>Recommendations to Raise Your Verified Rank</span>
            </div>
            <ul className="space-y-1 text-xs text-gray-600 list-disc list-inside">
              {recommendations.map((rec: string, idx: number) => (
                <li key={idx} className="leading-relaxed">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  /* ========================================================================= */
  /* COMPACT GAMIFIED RIGHT-SIDE LEADERBOARD PANEL                             */
  /* ========================================================================= */
  if (variant === 'compact') {
    return (
      <div className="space-y-4">
        {/* Top Stat Bar Row strictly based on Image 1 */}
        <div className="relative">
          <button
            type="button"
            id="top-stats-pill"
            onClick={() => setShowRankPopover((prev) => !prev)}
            className="w-full rounded-2xl border border-gray-200/90 bg-white px-5 py-2.5 flex items-center justify-between shadow-2xs hover:border-amber-300 hover:shadow-xs active:scale-[0.99] transition-all cursor-pointer"
            title="Click to view rank and streak details"
          >
            {/* Segment 1: XP Coin + Points */}
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white font-black text-[10px] shadow-2xs"
                style={{
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                }}
              >
                XP
              </div>
              <span className="text-sm font-bold text-gray-900">
                {loading && !realTotalXp ? '...' : Number(realTotalXp).toLocaleString()}
              </span>
            </div>

            {/* Segment 2: Flame + Streak */}
            <div className="flex items-center gap-1.5">
              <span className="text-base">🔥</span>
              <span className="text-sm font-bold text-gray-900">
                {realCurrentStreak}
              </span>
            </div>

            {/* Segment 3: Trophy + Rank */}
            <div className="flex items-center gap-1.5">
              <span className="text-base">🏆</span>
              <span className="text-sm font-bold text-gray-900">
                {realRankDisplay}
              </span>
            </div>
          </button>

          {/* Floating Popover based strictly on Image 1 */}
          <AnimatePresence>
            {showRankPopover && (
              <motion.div
                ref={popoverRef}
                id="image1-rank-popover"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 top-full mt-2.5 rounded-3xl bg-white p-4 sm:p-5 shadow-2xl z-50 border border-gray-100"
                style={{
                  width: '560px',
                  maxWidth: 'calc(100vw - 2rem)',
                  zIndex: 9999,
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Popover Card 1: Total XP */}
                  <div
                    className="rounded-2xl p-4 flex flex-col justify-between"
                    style={{
                      backgroundColor: '#FFF9F2',
                    }}
                  >
                    <div>
                      <div className="flex items-start gap-2.5">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: '#FFE8D1',
                          }}
                        >
                          <div
                            className="flex h-6 w-6 items-center justify-center rounded-full text-white font-black text-[9px] shadow-2xs"
                            style={{
                              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                            }}
                          >
                            XP
                          </div>
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-gray-600">Total XP</span>
                          <span className="block text-xl font-bold text-gray-900 leading-tight mt-0.5">
                            {Number(realTotalXp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 space-y-1.5 text-xs text-gray-700">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="text-gray-600 font-medium">Earned Today:</span>
                        <span>🪙</span>
                        <span className="font-bold text-gray-900">+{checkInState?.todayXpEarned || 0} XP</span>
                      </div>
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="text-gray-600 font-medium">Available Balance:</span>
                        <span>🪙</span>
                        <span className="font-bold text-gray-900">{Number(realTotalXp).toLocaleString()} XP</span>
                      </div>
                    </div>
                  </div>

                  {/* Popover Card 2: Current Streak */}
                  <div
                    className="rounded-2xl p-4 flex flex-col justify-between"
                    style={{
                      backgroundColor: '#FFF9F2',
                    }}
                  >
                    <div>
                      <div className="flex items-start gap-2.5">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                          style={{
                            backgroundColor: '#FFE8D1',
                          }}
                        >
                          🔥
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-gray-600">Current Streak</span>
                          <span className="block text-xl font-bold text-gray-900 leading-tight mt-0.5">
                            {realCurrentStreak}d
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2.5">
                      <div className="text-xs text-gray-600">
                        <span>Longest: </span>
                        <span className="font-bold text-gray-900">{realLongestStreak}d</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          id="btn-restore-streak"
                          onClick={handleRestoreStreak}
                          className="rounded-lg bg-white border border-gray-200 py-1.5 px-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition shadow-2xs text-center cursor-pointer whitespace-nowrap"
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          id="btn-freeze-streak"
                          onClick={handleFreezeStreak}
                          className={`rounded-lg py-1.5 px-2 text-xs font-semibold transition shadow-2xs text-center active:scale-95 cursor-pointer whitespace-nowrap ${
                            streakFrozen
                              ? 'bg-blue-600 text-white border border-blue-600'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {streakFrozen ? 'Frozen ❄️' : 'Freeze'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Popover Card 3: Leaderboard Rank */}
                  <div
                    className="rounded-2xl p-4 flex flex-col justify-between"
                    style={{
                      backgroundColor: '#FFF9F2',
                    }}
                  >
                    <div>
                      <div className="flex items-start gap-2.5">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                          style={{
                            backgroundColor: '#FFE8D1',
                          }}
                        >
                          🏆
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-gray-600 whitespace-nowrap">
                            Leaderboard Rank
                          </span>
                          <span className="block text-xl font-bold text-gray-900 leading-tight mt-0.5">
                            {realRankDisplay}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2.5">
                      <div className="text-xs text-gray-600">
                        <span>League: </span>
                        <span className="font-bold text-gray-900">{currentLeague}</span>
                      </div>
                      <button
                        type="button"
                        id="btn-popover-view"
                        onClick={() => {
                          setShowRankPopover(false);
                          router.push('/dashboard/student/progress');
                        }}
                        className="w-full rounded-lg bg-white border border-gray-200 py-1.5 px-4 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center gap-1.5 transition shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap"
                      >
                        <span>View</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
              {/* Daily Check-in & Streak Widget */}
              <div className="rounded-xl border border-amber-200/90 bg-gradient-to-br from-[#FFFDF9] via-white to-amber-50/40 p-3.5 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white font-black text-xs shadow-2xs">
                      🪙
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-gray-900 leading-tight">Daily Check-In</h4>
                        <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100/80 px-1.5 py-0.2 rounded-md">
                          +5 XP
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                        {checkInState?.checkedInToday
                          ? 'Today\'s XP earned • Next check-in resets at midnight'
                          : 'Check in now to build your consecutive streak!'}
                      </p>
                    </div>
                  </div>

                  {checkInState?.checkedInToday ? (
                    <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-emerald-200">
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span>Done</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      id="btn-claim-daily-checkin"
                      onClick={handleCheckIn}
                      disabled={checkInLoading}
                      style={{
                        background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                        color: '#FFFFFF',
                        boxShadow: '0 2px 8px rgba(217, 119, 6, 0.35)',
                      }}
                      className="rounded-lg px-3.5 py-1.5 text-xs font-bold hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      {checkInLoading ? (
                        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <span>Claim +5 XP 🪙</span>
                      )}
                    </button>
                  )}
                </div>

                {/* Streak Progress & Countdown */}
                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-amber-100/70">
                  <div className="flex items-center gap-1 font-semibold text-gray-700">
                    <span>🔥</span>
                    <span className="font-bold text-gray-900">
                      {checkInState?.streak?.currentStreak || breakdown?.consistency?.activeDaysCount || 15}d Streak
                    </span>
                    <span className="text-gray-400 font-normal">
                      ({(checkInState?.streak?.progressInCycle ?? (15 % 7))}/7d to +25 XP bonus)
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 font-medium">
                    {checkInState?.checkedInToday ? (
                      <span className="flex items-center gap-0.5 text-gray-600">
                        <Clock className="h-2.5 w-2.5 text-gray-400" />
                        Next: {checkInState.secondsUntilNextCheckIn ? `${Math.floor(checkInState.secondsUntilNextCheckIn / 3600)}h ${Math.floor((checkInState.secondsUntilNextCheckIn % 3600) / 60)}m` : 'Tomorrow'}
                      </span>
                    ) : (
                      <span className="text-amber-700 font-bold">Ready to claim!</span>
                    )}
                  </div>
                </div>

                {checkInMsg && (
                  <div className={`p-2 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 ${
                    checkInMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {checkInMsg.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />}
                    <span>{checkInMsg.text}</span>
                  </div>
                )}
              </div>

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

                <button
                  type="button"
                  id="btn-sapphire-view"
                  onClick={() => router.push('/dashboard/student/progress')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 shrink-0 cursor-pointer"
                >
                  View <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Top Performers Section with Search */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">
                    Top Performers
                    <span className="ml-1.5 text-xs text-gray-400 font-normal">
                      ({uniqueRankings.length} classmates)
                    </span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/student/progress')}
                    className="text-xs font-semibold text-[#990024] hover:underline cursor-pointer"
                  >
                    View All →
                  </button>
                </div>

                {/* Cohort Search Input */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search classmates by name..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 bg-gray-50/60 focus:bg-white focus:outline-none focus:border-[#990024] focus:ring-1 focus:ring-[#990024] transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {loading ? (
                    <div className="space-y-2 py-1">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between py-1 px-1 animate-pulse">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-5 w-5 rounded-full bg-gray-200 shrink-0" />
                            <div className="h-7 w-7 rounded-full bg-gray-200 shrink-0" />
                            <div className="h-3 w-28 bg-gray-200 rounded" />
                          </div>
                          <div className="h-3 w-12 bg-gray-200 rounded shrink-0" />
                        </div>
                      ))}
                    </div>
                  ) : displayPerformers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-4 px-3 text-center">
                      <p className="text-xs font-medium text-gray-500">No student rankings found for this class.</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Real classmates in your cohort will appear here.</p>
                    </div>
                  ) : (
                    displayPerformers.map((performer: any, idx: number) => (
                      <div
                        key={performer.id || idx}
                        className={`flex items-center justify-between py-1 rounded-lg px-2 transition-colors ${
                          performer.isCurrentUser ? 'bg-amber-50/70 border border-amber-200/70' : 'hover:bg-gray-50/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* 3D Coin Medal Badge matching Image 1 */}
                          <RankMedalBadge rank={performer.rank} size="md" />

                          {/* Circular Avatar */}
                          <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full overflow-hidden bg-slate-100 border border-slate-200/90 shadow-2xs">
                            {performer.profilePhotoUrl ? (
                              <img
                                src={getOptimizedAvatarUrl(performer.profilePhotoUrl, 56) || performer.profilePhotoUrl}
                                alt={performer.name}
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : null}
                          </div>

                          {/* Student Name */}
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-gray-900 truncate block">
                              {performer.name}
                            </span>
                            {performer.isCurrentUser && (
                              <span className="text-[9px] font-extrabold text-[#990024] uppercase tracking-wide">
                                You
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Score */}
                        <span className="text-xs font-bold text-gray-800 shrink-0 ml-2">
                          {performer.points}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Pinned "Your Rank" Card */}
              <div className="rounded-xl border border-gray-100 bg-white p-3.5 space-y-1 shadow-2xs">
                <span className="text-xs font-bold text-[#990024] block">Your Rank</span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full overflow-hidden bg-slate-100 border border-slate-200/90 shadow-2xs">
                      {(currentLearnerEntry?.profilePhotoUrl || (user as any)?.profile?.profilePhotoUrl) ? (
                        <img
                          src={
                            getOptimizedAvatarUrl(
                              currentLearnerEntry?.profilePhotoUrl || (user as any)?.profile?.profilePhotoUrl,
                              64
                            ) || (currentLearnerEntry?.profilePhotoUrl || (user as any)?.profile?.profilePhotoUrl)
                          }
                          alt="Your profile photo"
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : null}
                    </div>
                    <span className="text-2xl sm:text-3xl font-black text-gray-900 leading-none">
                      {currentStudent?.rank ? `#${currentStudent.rank}` : loading ? '...' : '#3'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-gray-800">
                      {currentStudent?.totalScore != null
                        ? `${Number(currentStudent.totalScore).toLocaleString()} pts`
                        : '1,879 pts'}
                    </span>
                    {Number(currentStudent?.rankMovement) > 0 && (
                      <span className="inline-flex items-center text-xs font-bold text-emerald-600 gap-0.5">
                        ↑ {currentStudent.rankMovement}
                      </span>
                    )}
                    {Number(currentStudent?.rankMovement) < 0 && (
                      <span className="inline-flex items-center text-xs font-bold text-rose-600 gap-0.5">
                        ↓ {Math.abs(currentStudent.rankMovement)}
                      </span>
                    )}
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
              <button
                type="button"
                id="btn-view-full-leaderboard"
                onClick={() => router.push('/dashboard/student/progress')}
                className="w-full rounded-xl bg-[#990024] hover:bg-[#80001e] text-white py-2.5 px-4 text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>View Full Leaderboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          {activeNavTab === 'monthly' && (
            <div className="space-y-3 py-1">
              <div className="rounded-xl bg-gray-50 p-3 border border-gray-100 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-gray-900">
                  <span>Monthly Consistency</span>
                  <span className="text-[#990024] font-extrabold">{breakdown?.consistency?.activeDaysCount ?? 15} / 30 Days</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full bg-[#990024] rounded-full"
                    style={{ width: `${Math.min(100, Math.round(((breakdown?.consistency?.activeDaysCount || 15) / 30) * 100))}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  Active in {breakdown?.consistency?.activeWeeksCount ?? 4} distinct weeks this month.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl border border-gray-100 p-2.5 bg-white">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Solved Problems</span>
                  <span className="text-base font-bold text-gray-900 mt-0.5 block">
                    {breakdown?.coding?.problemsSolved ?? 142}
                  </span>
                </div>
                <div className="rounded-xl border border-gray-100 p-2.5 bg-white">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Contest Contrib</span>
                  <span className="text-base font-bold text-[#990024] mt-0.5 block">
                    +{breakdown?.coding?.score ?? 35} pts
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push('/dashboard/student/progress')}
                className="w-full rounded-xl bg-[#990024] hover:bg-[#80001e] text-white py-2 px-3 text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 transition-colors mt-2 cursor-pointer"
              >
                <span>View Full Leaderboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {activeNavTab === 'badges' && (
            <div className="space-y-2.5 py-1">
              {achievementsLoading && !achievementsData ? (
                <div className="flex items-center justify-center py-6">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#990024]/20 border-t-[#990024]" />
                </div>
              ) : achievementsData?.badges?.length > 0 ? (
                <>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-gray-700">
                      {achievementsData.summary.earnedBadges} of {achievementsData.summary.totalBadges} Badges Unlocked
                    </span>
                    <span className="text-[11px] font-bold text-[#990024]">
                      {achievementsData.summary.totalXp} XP
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {achievementsData.badges.slice(0, 4).map((b: any) => {
                      const isEarned = b.status === 'EARNED';
                      return (
                        <div
                          key={b.id}
                          onClick={() => router.push('/dashboard/student/achievements')}
                          className={`rounded-xl border p-2.5 text-center cursor-pointer transition-all hover:scale-[1.02] ${
                            isEarned
                              ? 'border-amber-200 bg-amber-50/60 shadow-2xs'
                              : 'border-gray-200 bg-gray-50/70 opacity-80'
                          }`}
                        >
                          <span className="text-xl block">{b.icon || '🎖️'}</span>
                          <span className="text-xs font-bold text-gray-900 block mt-1 truncate">
                            {b.name}
                          </span>
                          <span className="text-[10px] text-gray-600 block truncate">
                            {isEarned ? `${b.tier} • Earned` : `${b.progress.current}/${b.progress.target} ${b.criteria.unit}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-center">
                    <span className="text-xl block">⚡</span>
                    <span className="text-xs font-bold text-amber-900 block mt-1">Problem Solver</span>
                    <span className="text-[10px] text-amber-700 block">Coding badge</span>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-2.5 text-center">
                    <span className="text-xl block">💎</span>
                    <span className="text-xs font-bold text-blue-900 block mt-1">XP Explorer</span>
                    <span className="text-[10px] text-blue-700 block">500 XP Milestone</span>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 text-center">
                    <span className="text-xl block">🔥</span>
                    <span className="text-xs font-bold text-emerald-900 block mt-1">7-Day Streak</span>
                    <span className="text-[10px] text-emerald-700 block">Consistency</span>
                  </div>
                  <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-2.5 text-center">
                    <span className="text-xl block">🛡️</span>
                    <span className="text-xs font-bold text-purple-900 block mt-1">Python Specialist</span>
                    <span className="text-[10px] text-purple-700 block">Skill Verified</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => router.push('/dashboard/student/achievements')}
                className="w-full rounded-xl bg-[#990024] hover:bg-[#80001e] text-white py-2 px-3 text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 transition-colors mt-2 cursor-pointer"
              >
                <Trophy className="h-3.5 w-3.5" />
                <span>View All Badges & Milestones</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Full View Modal based on Image 4 */}
        {mounted &&
          showMonthlyModal &&
          createPortal(
            <div
              id="image4-monthly-modal"
              className="fixed inset-0 min-h-screen w-screen overflow-y-auto p-4 sm:p-6 lg:p-8"
              style={{
                backgroundColor: '#F4F9FD',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 999999,
                opacity: 1,
              }}
            >
              {renderMonthlyLeaderboardView({
                onBack: () => setShowMonthlyModal(false),
              })}
            </div>,
            document.body
          )}

        {/* Floating Toasts */}
        <AnimatePresence>
          {streakToast && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="fixed bottom-6 right-6 z-50 rounded-xl bg-gray-900 text-white px-4 py-3 text-xs font-semibold shadow-2xl flex items-center gap-2 border border-gray-700"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{streakToast}</span>
            </motion.div>
          )}
          {shareToast && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="fixed bottom-6 right-6 z-50 rounded-xl bg-gray-900 text-white px-4 py-3 text-xs font-semibold shadow-2xl flex items-center gap-2 border border-gray-700"
            >
              <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
              <span>{shareToast}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  /* ========================================================================= */
  /* FULL DETAILED LEADERBOARD VARIANT (For Progress / Full Page View)        */
  /* ========================================================================= */
  return (
    <>
      {renderMonthlyLeaderboardView({
        onBack: () => router.push('/dashboard/student'),
      })}

      {/* Floating Toasts for Full View */}
      <AnimatePresence>
        {streakToast && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="fixed bottom-6 right-6 z-50 rounded-xl bg-gray-900 text-white px-4 py-3 text-xs font-semibold shadow-2xl flex items-center gap-2 border border-gray-700"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{streakToast}</span>
          </motion.div>
        )}
        {shareToast && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="fixed bottom-6 right-6 z-50 rounded-xl bg-gray-900 text-white px-4 py-3 text-xs font-semibold shadow-2xl flex items-center gap-2 border border-gray-700"
          >
            <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
            <span>{shareToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
