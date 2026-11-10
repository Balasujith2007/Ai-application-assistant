'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trophy,
  Flame,
  Zap,
  Check,
  CheckCircle2,
  Users,
  ChevronRight,
  BarChart2,
  Award,
  Lock,
  ListOrdered,
  Target,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getCleanProfilePhotoUrl } from '@/lib/avatar';
import { RankMedalBadge } from '@/components/leaderboard/StudentClassLeaderboard';
import { MysteryGiftCard } from './MysteryGiftCard';
import { Crown } from 'lucide-react';
import { BadgeEmblem, resolveBadgeIcon } from '@/components/badges/BadgeEmblem';
import { BADGE_CATEGORIES } from '@/lib/gamification/badgeConfig';
import type { BadgeCategory, BadgeTier } from '@/lib/gamification/badgeConfig';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface CareerMilestoneProgress {
  days: number;
  reached: boolean;
  remaining: number;
}

type WeeklyDayStatus =
  | 'COMPLETED'
  | 'MISSED'
  | 'TODAY_COMPLETED'
  | 'TODAY_PENDING'
  | 'FUTURE'
  | 'NEUTRAL';

interface WeeklyActivityDay {
  date: string;
  dayLabel: string;
  dayNumber: number;
  isToday: boolean;
  status: WeeklyDayStatus;
}

interface CheckInState {
  qualifiedToday: boolean;
  todayActivityCount: number;
  lastActivityDate: string | null;
  todayXpEarned: number;
  totalEarnedXp: number;
  secondsUntilNextDay?: number;
  streak: {
    currentStreak: number;
    longestStreak: number;
    totalActiveDays: number;
    lastQualifyingDate: string | null;
    milestones?: CareerMilestoneProgress[];
    nextCareerMilestone?: { days: number; remaining: number } | null;
  };
  weeklyActivity?: WeeklyActivityDay[];
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  earnedXp: number;
  totalScore: number;
  isCurrentUser: boolean;
  streak?: number;
  profilePhotoUrl?: string | null;
}

interface AchievementSummary {
  totalEarned: number;
  totalAvailable: number;
  completionPercentage: number;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
}

/** Shape of a single badge as returned by /api/achievements (badgeEngine overview). */
interface BadgeItem {
  id: string;
  title: string;
  category: string;
  tier: string;
  rarity?: string;
  description?: string;
  criteria?: string;
  icon?: string;
  unit?: string;
  status: 'EARNED' | 'IN_PROGRESS' | 'LOCKED';
  xpReward?: number;
  awardedAt?: string | null;
  currentValue?: number;
  targetValue?: number;
  threshold?: number;
  progressAvailable?: boolean;
  progressPercentage?: number;
  remainingToUnlock?: number | null;
}

interface BadgeCategorySummary {
  category: string;
  total: number;
  earned: number;
}

interface BadgeCollection {
  all: BadgeItem[];
  earned: BadgeItem[];
  inProgress: BadgeItem[];
  locked: BadgeItem[];
}

type TabId = 'tracker' | 'leaderboard' | 'badges';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function InitialsAvatar({ name, size = 26 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const colors = [
    ['#fef3c7', '#d97706'],
    ['#dbeafe', '#2563eb'],
    ['#d1fae5', '#059669'],
    ['#fce7f3', '#be185d'],
    ['#ede9fe', '#7c3aed'],
    ['#ffedd5', '#ea580c'],
  ];
  const idx = Math.abs(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % colors.length;
  const [bg, text] = colors[idx];
  return (
    <div
      style={{
        width: size,
        height: size,
        background: bg,
        color: text,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.36,
        fontWeight: 800,
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {initials}
    </div>
  );
}

function rankRowStyle(rank: number, isCurrentUser: boolean) {
  if (rank === 1) return { background: 'linear-gradient(90deg,#fffde7,#fff)', border: '1px solid #fde68a' };
  if (rank === 2) return { background: 'linear-gradient(90deg,#f8fafc,#fff)', border: '1px solid #e2e8f0' };
  if (rank === 3) return { background: 'linear-gradient(90deg,#fff7ed,#fff)', border: '1px solid #fed7aa' };
  if (isCurrentUser) return { background: 'linear-gradient(90deg,#fff1f2,#fff5f6)', border: '1px solid #fecdd3' };
  return { background: 'transparent', border: '1px solid transparent' };
}

// ─────────────────────────────────────────────
// Premium Gamified Performance Icons
// ─────────────────────────────────────────────
function GoldCoinIcon({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-[0_2px_4px_rgba(217,119,6,0.25)]"
    >
      <circle cx="16" cy="16" r="14.5" fill="url(#coinOuterGrad_sp)" stroke="#B45309" strokeWidth="1" />
      <circle cx="16" cy="16" r="11.5" fill="url(#coinInnerGrad_sp)" stroke="#FDE68A" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
      <text
        x="16"
        y="19.5"
        textAnchor="middle"
        fontSize="9.5"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        fill="#78350F"
        letterSpacing="0.5"
      >
        XP
      </text>
      <defs>
        <linearGradient id="coinOuterGrad_sp" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="0.35" stopColor="#F59E0B" />
          <stop offset="0.75" stopColor="#D97706" />
          <stop offset="1" stopColor="#92400E" />
        </linearGradient>
        <linearGradient id="coinInnerGrad_sp" x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FEF08A" />
          <stop offset="0.5" stopColor="#FBBF24" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function FlameStreakIcon({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-[0_2px_4px_rgba(234,88,12,0.3)]"
    >
      {/* Outer Flame */}
      <path
        d="M16 2C16 2 23 8 23 18C23 23.5228 19.866 28 16 28C12.134 28 9 23.5228 9 18C9 13 12.5 7.5 16 2Z"
        fill="url(#flameOuterGrad_sp)"
      />
      {/* Secondary Dynamic Curve */}
      <path
        d="M16 6C17.5 10 21 14 20 19C19.2 23 16 26 16 26C16 26 12 23 12 18C12 13.5 14.5 9 16 6Z"
        fill="url(#flameMidGrad_sp)"
      />
      {/* Inner White-Hot Flame Core */}
      <path
        d="M16 14C17.2 16.5 18 19 17.5 22C17 24 16 25.5 16 25.5C16 25.5 15 24 14.5 22C14 19.5 14.8 16.5 16 14Z"
        fill="url(#flameInnerGrad_sp)"
      />
      <defs>
        <linearGradient id="flameOuterGrad_sp" x1="9" y1="2" x2="23" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F97316" />
          <stop offset="0.6" stopColor="#EA580C" />
          <stop offset="1" stopColor="#C2410C" />
        </linearGradient>
        <linearGradient id="flameMidGrad_sp" x1="12" y1="6" x2="21" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24" />
          <stop offset="0.7" stopColor="#F97316" />
          <stop offset="1" stopColor="#EA580C" />
        </linearGradient>
        <linearGradient id="flameInnerGrad_sp" x1="14" y1="14" x2="18" y2="25.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FEF08A" />
          <stop offset="0.8" stopColor="#FDE047" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function TrophyRankIcon({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-[0_2px_4px_rgba(180,83,9,0.25)]"
    >
      {/* Cup Base & Pedestal */}
      <path d="M11 26H21V28H11V26Z" fill="#92400E" />
      <path d="M13 23H19V26H13V23Z" fill="url(#pedestalGrad_sp)" />
      <path d="M14.5 19H17.5V23H14.5V19Z" fill="url(#stemGrad_sp)" />
      
      {/* Handles */}
      <path
        d="M9 8H6C4.89543 8 4 8.89543 4 10V12C4 14.2091 5.79086 16 8 16H9M23 8H26C27.1046 8 28 8.89543 28 10V12C28 14.2091 26.2091 16 24 16H23"
        stroke="url(#handleGrad_sp)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Main Cup Body */}
      <path
        d="M8 6H24V12C24 16.4183 20.4183 20 16 20C11.5817 20 8 16.4183 8 12V6Z"
        fill="url(#trophyCupGrad_sp)"
      />
      {/* Rim Highlight */}
      <rect x="7" y="5" width="18" height="2.5" rx="1" fill="#FEF08A" />
      {/* Embossed Star */}
      <path
        d="M16 10L17.1 12.2L19.5 12.5L17.7 14.2L18.2 16.5L16 15.3L13.8 16.5L14.3 14.2L12.5 12.5L14.9 12.2L16 10Z"
        fill="#78350F"
        opacity="0.8"
      />

      <defs>
        <linearGradient id="trophyCupGrad_sp" x1="8" y1="5" x2="24" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="0.3" stopColor="#F59E0B" />
          <stop offset="0.8" stopColor="#D97706" />
          <stop offset="1" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="handleGrad_sp" x1="4" y1="8" x2="28" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="pedestalGrad_sp" x1="13" y1="23" x2="19" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="1" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="stemGrad_sp" x1="14.5" y1="19" x2="17.5" y2="23" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─────────────────────────────────────────────
// Tab 1: Career Activity Streak (verified applications)
// ─────────────────────────────────────────────
const WEEKLY_DAY_STYLE: Record<
  WeeklyDayStatus,
  { cell: string; chip: string; mark: string }
> = {
  COMPLETED: {
    cell: 'border-amber-200/80 bg-gradient-to-b from-amber-50 to-amber-100/60',
    chip: 'text-amber-800',
    mark: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white',
  },
  TODAY_COMPLETED: {
    cell: 'border-amber-300 bg-gradient-to-b from-amber-50 to-amber-100/70 ring-1 ring-amber-300/70',
    chip: 'text-amber-900',
    mark: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white',
  },
  TODAY_PENDING: {
    cell: 'border-[#990024]/40 bg-rose-50/70 ring-1 ring-[#990024]/20',
    chip: 'text-[#990024]',
    mark: 'bg-white text-[#990024] border border-[#990024]/40',
  },
  MISSED: {
    cell: 'border-gray-200 bg-gray-50/80',
    chip: 'text-gray-400',
    mark: 'bg-gray-200 text-gray-500',
  },
  FUTURE: {
    cell: 'border-gray-100 bg-white',
    chip: 'text-gray-300',
    mark: 'bg-gray-100 text-gray-300',
  },
  NEUTRAL: {
    cell: 'border-gray-100 bg-white',
    chip: 'text-gray-300',
    mark: 'bg-gray-100/70 text-gray-300',
  },
};

function DayCell({ day }: { day: WeeklyActivityDay }) {
  const s = WEEKLY_DAY_STYLE[day.status] || WEEKLY_DAY_STYLE.NEUTRAL;
  const isDone = day.status === 'COMPLETED' || day.status === 'TODAY_COMPLETED';
  return (
    <div className={`flex flex-col items-center gap-1 rounded-lg border py-1.5 ${s.cell}`}>
      <span className={`text-[8.5px] font-bold uppercase tracking-wide ${s.chip}`}>
        {day.dayLabel[0]}
      </span>
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-black tabular-nums ${s.mark}`}
      >
        {isDone ? <Check className="h-2.5 w-2.5" /> : day.dayNumber}
      </span>
    </div>
  );
}

function CareerActivityStreakTab({ streak }: { streak: CheckInState | null }) {
  if (!streak) {
    return (
      <div className="h-full w-full space-y-2.5 animate-pulse py-1">
        <div className="h-9 rounded-xl bg-gray-100" />
        <div className="h-16 rounded-xl bg-gray-100" />
        <div className="h-14 rounded-xl bg-gray-100" />
        <div className="h-14 rounded-xl bg-gray-100" />
      </div>
    );
  }

  const currentStreak = streak.streak?.currentStreak ?? 0;
  const longestStreak = streak.streak?.longestStreak ?? 0;
  const totalActiveDays = streak.streak?.totalActiveDays ?? 0;
  const verifiedToday = Boolean(streak.qualifiedToday);
  const todayActivityCount = streak.todayActivityCount ?? 0;
  const nextMilestone = streak.streak?.nextCareerMilestone ?? null;
  const milestones = streak.streak?.milestones ?? [];
  const weekly = streak.weeklyActivity ?? [];

  const milestonePct = nextMilestone
    ? Math.min(100, Math.round((currentStreak / nextMilestone.days) * 100))
    : 100;

  return (
    <div className="flex h-full w-full min-w-0 flex-col gap-2.5">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <FlameStreakIcon size={22} />
          <div className="min-w-0">
            <h4 className="truncate text-[12px] font-bold leading-tight text-gray-900">
              Career Activity Streak
            </h4>
            <p className="truncate text-[9px] font-medium text-gray-400">
              Verified applications · Asia/Kolkata
            </p>
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold ${
            verifiedToday
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${verifiedToday ? 'bg-emerald-500' : 'bg-amber-500'}`}
          />
          {verifiedToday ? 'Verified today' : 'No activity yet'}
        </span>
      </div>

      {/* Hero streak */}
      <div className="shrink-0 rounded-xl border border-amber-100/90 bg-gradient-to-br from-[#fffdf7] to-amber-50/40 p-3">
        <div className="flex items-center gap-3">
          <div className={currentStreak > 0 ? 'animate-flame-pulse' : ''}>
            <FlameStreakIcon size={40} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black leading-none tabular-nums text-gray-900">
                {currentStreak}
              </span>
              <span className="text-[11px] font-bold text-gray-500">
                day{currentStreak === 1 ? '' : 's'} streak
              </span>
            </div>
            <p className="mt-0.5 text-[10px] font-medium text-gray-500">
              {verifiedToday
                ? todayActivityCount > 1
                  ? `Career activity verified today · ${todayActivityCount} submissions`
                  : 'Career activity verified today.'
                : 'No qualifying career activity today.'}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <span className="block text-base font-black leading-none tabular-nums text-amber-700">
              {longestStreak}
            </span>
            <span className="text-[8px] font-bold uppercase tracking-wide text-gray-400">Best</span>
          </div>
        </div>
      </div>

      {/* Weekly progress */}
      <div className="shrink-0">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">This Week</span>
          <span className="text-[9px] font-medium text-gray-400">{totalActiveDays} active days total</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekly.length > 0 ? (
            weekly.map((day) => <DayCell key={day.date} day={day} />)
          ) : (
            <span className="col-span-7 py-2 text-center text-[9px] text-gray-400">
              No activity recorded yet
            </span>
          )}
        </div>
      </div>

      {/* Next milestone */}
      {nextMilestone ? (
        <div className="shrink-0 rounded-xl border border-gray-100 bg-gray-50/70 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-700">
              <Target className="h-3 w-3 text-[#990024]" />
              Next milestone · {nextMilestone.days}-day streak
            </span>
            <span className="shrink-0 text-[9px] font-bold tabular-nums text-gray-500">
              {currentStreak}/{nextMilestone.days}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200/70">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${milestonePct}%`, background: 'linear-gradient(90deg, #990024, #c71f47)' }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[9px]">
            <span className="font-medium text-gray-500">
              {nextMilestone.remaining} consecutive day{nextMilestone.remaining === 1 ? '' : 's'} to go
            </span>
            <span className="flex items-center gap-1">
              {milestones.map((m) => (
                <span
                  key={m.days}
                  title={`${m.days}-day streak${m.reached ? ' · reached' : ''}`}
                  className={`h-1.5 w-1.5 rounded-full ${m.reached ? 'bg-amber-500' : 'bg-gray-200'}`}
                />
              ))}
            </span>
          </div>
        </div>
      ) : (
        <div className="shrink-0 rounded-xl border border-emerald-100 bg-emerald-50/60 p-2.5 text-center text-[10px] font-bold text-emerald-700">
          All streak milestones reached — remarkable consistency.
        </div>
      )}

      {/* How this streak works */}
      <div className="mt-auto flex shrink-0 items-start gap-1.5 rounded-xl border border-gray-100 bg-white p-2.5">
        <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-[#990024]" />
        <p className="text-[9px] font-medium leading-snug text-gray-500">
          Submit an internship, job, hackathon or competition application to earn a streak day.
          Multiple applications on the same day count as one day.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Tab 2: Leaderboard (Fits inside fixed viewport)
// ─────────────────────────────────────────────
function LeaderboardTab({
  lbData,
  lbLoading,
  currentRank,
  user,
}: {
  lbData: { rankings: LeaderboardEntry[]; currentRank: number | null; totalStudents: number } | null;
  lbLoading: boolean;
  currentRank: number | null;
  user: any;
}) {
  const router = useRouter();
  const currentMonthYear = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <div className="h-full w-full min-w-0 flex flex-col justify-between overflow-hidden">
      {lbLoading ? (
        <div className="space-y-2 py-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-1.5 animate-pulse">
              <div className="h-4 w-3 bg-gray-100 rounded" />
              <div className="h-7 w-7 rounded-full bg-gray-100 shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : !lbData || lbData.rankings.length === 0 ? (
        <div className="py-6 text-center my-auto">
          <Trophy className="h-6 w-6 text-gray-300 mx-auto mb-1" />
          <p className="text-[10px] text-gray-400">Complete your profile to join the leaderboard.</p>
        </div>
      ) : (
        <>
          {/* League Header (Matching Image 3 Sapphire League style) */}
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0 shadow-2xs">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L3 7L12 12L21 7L12 2Z" fill="#38BDF8" />
                  <path d="M3 7V17L12 22V12L3 7Z" fill="#0284C7" />
                  <path d="M21 7V17L12 22V12L21 7Z" fill="#0EA5E9" />
                </svg>
              </div>
              <div>
                <h5 className="text-xs font-bold text-gray-900 leading-tight">Sapphire League</h5>
                <p className="text-[10px] text-gray-400 font-medium">{currentMonthYear}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/dashboard/student/progress')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            >
              View →
            </button>
          </div>

          {/* Top 3-5 Ranked Students (Exact Image 3 Layout) */}
          <div className="space-y-1.5 overflow-y-auto pr-0.5 max-h-[195px] scrollbar-thin">
            {lbData.rankings.slice(0, 5).map((entry) => {
              const score = Number(entry.earnedXp ?? entry.totalScore ?? 0);
              const isUser = entry.isCurrentUser;
              const isTop3 = entry.rank <= 3;

              return (
                <div
                  key={entry.rank}
                  className={`flex items-center justify-between py-1.5 px-2 rounded-xl transition-all ${
                    isUser ? 'bg-purple-50/80 border border-purple-100/90' : 'hover:bg-gray-50/80'
                  } ${isTop3 ? 'border-l-4' : ''}`}
                  style={
                    isTop3
                      ? {
                          borderLeftColor:
                            entry.rank === 1 ? '#FFD700' : entry.rank === 2 ? '#C0C0C0' : '#CD7F32',
                        }
                      : {}
                  }
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative">
                      <span className="text-xs font-bold text-gray-400 w-3 text-center shrink-0">
                        {entry.rank}
                      </span>
                      {/* Crown icon for first place */}
                      {entry.rank === 1 && (
                        <Crown className="absolute -top-2 -right-1 w-3 h-3 text-amber-500" />
                      )}
                    </div>
                    {/* Purple Circle Avatar matching Image 3 */}
                    <div className="h-7 w-7 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {entry.name[0]?.toUpperCase() || 'S'}
                    </div>
                    <span className={`text-xs truncate ${isUser ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                      {entry.name.split(' ')[0]}
                      {isUser && (
                        <span className="text-[9px] font-bold text-violet-700 ml-1.5 bg-violet-100/80 px-1.5 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 pl-2">
                    <span className="text-xs leading-none">🪙</span>
                    <span className="text-xs font-bold text-gray-700 tabular-nums">
                      {score.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Current user rank indicator if outside top 5 */}
            {currentRank && lbData && currentRank > 5 && (
              <div className="mt-1 px-2 py-1.5 rounded-xl flex items-center justify-between border border-purple-200/90 bg-purple-50/80">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-black text-purple-700 w-3 text-center">#{currentRank}</span>
                  <div className="h-6 w-6 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-xs font-bold text-purple-950 truncate">
                    {user?.name?.split(' ')[0] || 'You'} (You)
                  </span>
                </div>
                <span className="text-[10px] text-purple-700 font-bold">Your Rank</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Tab 3: Achievement Gallery (premium badge preview)
// ─────────────────────────────────────────────
const TIER_LABEL: Record<string, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Silver',
  GOLD: 'Gold',
  PLATINUM: 'Platinum',
  DIAMOND: 'Diamond',
};

const TIER_PILL: Record<string, string> = {
  BRONZE: 'bg-amber-50 text-amber-700 border-amber-200/80',
  SILVER: 'bg-slate-100 text-slate-600 border-slate-200',
  GOLD: 'bg-yellow-50 text-yellow-800 border-yellow-300/80',
  PLATINUM: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  DIAMOND: 'bg-violet-50 text-violet-700 border-violet-200',
};

function categoryLabel(key: string): string {
  return BADGE_CATEGORIES.find((c) => c.key === key)?.label || key.replace(/_/g, ' ');
}

function BadgePreviewCard({ badge, onOpen }: { badge: BadgeItem; onOpen: () => void }) {
  const isEarned = badge.status === 'EARNED';
  const tier = (badge.tier || 'BRONZE').toUpperCase();
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${badge.title} · ${categoryLabel(badge.category)}${isEarned ? ' · Earned' : ' · Locked'}`}
      className={`group relative flex w-full min-w-0 flex-col items-center gap-1 rounded-xl border p-1.5 text-center transition-all cursor-pointer ${
        isEarned
          ? 'border-amber-200/80 bg-gradient-to-b from-amber-50/70 to-white hover:border-amber-300 hover:shadow-xs'
          : 'border-gray-200/70 bg-gray-50/70 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <span className="absolute right-1 top-1 leading-none" aria-hidden>
        {isEarned ? (
          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
        ) : (
          <Lock className="h-2.5 w-2.5 text-gray-300" />
        )}
      </span>
      <BadgeEmblem
        icon={badge.icon}
        tier={tier as BadgeTier}
        category={badge.category as BadgeCategory}
        size={40}
        locked={!isEarned}
      />
      <span
        className={`block w-full text-[9px] font-bold leading-tight break-words ${
          isEarned ? 'text-gray-900' : 'text-gray-500'
        }`}
      >
        {badge.title}
      </span>
      <span className="block w-full text-[7.5px] font-medium leading-tight text-gray-400 break-words">
        {categoryLabel(badge.category)}
      </span>
      <span
        className={`inline-flex items-center rounded-full border px-1 py-px text-[7px] font-bold uppercase tracking-wide ${
          TIER_PILL[tier] || TIER_PILL.BRONZE
        }`}
      >
        {TIER_LABEL[tier] || tier}
      </span>
    </button>
  );
}

function BadgesTab({
  achieveSummary,
  badgeCollection,
  badgeCategories,
  nextMilestone,
  router,
}: {
  achieveSummary: AchievementSummary | null;
  badgeCollection: BadgeCollection | null;
  badgeCategories: BadgeCategorySummary[];
  nextMilestone: BadgeItem | null;
  router: any;
}) {
  if (!achieveSummary) {
    return (
      <div className="h-full w-full space-y-2 animate-pulse py-2">
        <div className="h-14 bg-gray-100 rounded-xl" />
        <div className="grid grid-cols-3 gap-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[76px] bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const earnPct = Math.min(100, Math.max(0, achieveSummary.completionPercentage ?? 0));

  // Recently earned first, then the closest-to-unlock "next achievable" badges.
  const earnedList = [...(badgeCollection?.earned || [])].sort(
    (a, b) => new Date(b.awardedAt || 0).getTime() - new Date(a.awardedAt || 0).getTime()
  );
  const inProgressList = [...(badgeCollection?.inProgress || [])].sort(
    (a, b) => (b.progressPercentage || 0) - (a.progressPercentage || 0)
  );
  const preview = [...earnedList, ...inProgressList].slice(0, 6);

  const lockedCount =
    badgeCollection?.locked?.length ??
    Math.max(0, achieveSummary.totalAvailable - achieveSummary.totalEarned);

  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const recentCount = earnedList.filter((b) => {
    if (!b.awardedAt) return false;
    const t = new Date(b.awardedAt).getTime();
    return !Number.isNaN(t) && Date.now() - t <= thirtyDaysMs;
  }).length;

  const openGallery = () => router.push('/dashboard/student/achievements');

  const summaryTiles: { label: string; value: number; cls: string; icon: React.ElementType }[] = [
    { label: 'Earned', value: achieveSummary.totalEarned, cls: 'border-emerald-100/80 bg-emerald-50/70 text-emerald-700', icon: Award },
    { label: 'Locked', value: lockedCount, cls: 'border-gray-100 bg-gray-50 text-gray-500', icon: Lock },
    { label: 'Recent', value: recentCount, cls: 'border-amber-100/80 bg-amber-50/70 text-amber-700', icon: Sparkles },
  ];

  return (
    <div className="h-full w-full min-w-0 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 w-full min-w-0 space-y-2 overflow-y-auto overflow-x-hidden pr-0.5 scrollbar-thin">
        {/* Header */}
        <div className="rounded-xl border border-amber-100/80 bg-gradient-to-br from-[#fffdf7] to-amber-50/40 p-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                style={{ background: 'linear-gradient(135deg, #FBBF24, #D97706)' }}
              >
                <Award className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11px] font-bold leading-tight text-gray-900">Achievements</h4>
                <p className="truncate text-[9px] font-medium leading-tight text-gray-400">
                  Professional badge gallery
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-baseline gap-0.5">
              <span className="text-sm font-black tabular-nums text-gray-900">
                {achieveSummary.totalEarned}
              </span>
              <span className="text-[10px] font-bold tabular-nums text-gray-400">
                /{achieveSummary.totalAvailable}
              </span>
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-amber-100/70">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${earnPct}%`, background: 'linear-gradient(90deg, #990024, #c71f47)' }}
              />
            </div>
            <span className="shrink-0 text-[9px] font-extrabold tabular-nums text-[#990024]">{earnPct}%</span>
          </div>
        </div>

        {/* Achievement summary */}
        <div className="grid grid-cols-3 gap-1.5">
          {summaryTiles.map((tile) => {
            const TileIcon = tile.icon;
            return (
              <div
                key={tile.label}
                className={`flex flex-col items-center rounded-xl border px-1 py-1.5 ${tile.cls}`}
              >
                <span className="flex items-center gap-0.5">
                  <TileIcon className="h-2.5 w-2.5" />
                  <span className="text-xs font-black tabular-nums">{tile.value}</span>
                </span>
                <span className="text-[8px] font-semibold uppercase tracking-wide opacity-80">
                  {tile.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Category progress (existing five categories) */}
        {badgeCategories.length > 0 && (
          <div className="grid grid-cols-5 gap-1">
            {badgeCategories.map((c) => {
              const done = c.total > 0 && c.earned >= c.total;
              const partial = c.earned > 0 && !done;
              const CatIcon = resolveBadgeIcon(
                BADGE_CATEGORIES.find((x) => x.key === c.category)?.icon || null
              );
              return (
                <div
                  key={c.category}
                  title={`${categoryLabel(c.category)} — ${c.earned}/${c.total}`}
                  className={`flex flex-col items-center gap-0.5 rounded-lg border py-1 ${
                    done
                      ? 'border-emerald-200/80 bg-emerald-50/60'
                      : partial
                        ? 'border-amber-200/80 bg-amber-50/50'
                        : 'border-gray-100 bg-gray-50/60'
                  }`}
                >
                  <CatIcon
                    className={`h-3 w-3 ${
                      done ? 'text-emerald-600' : partial ? 'text-amber-600' : 'text-gray-300'
                    }`}
                  />
                  <span className="text-[7.5px] font-bold tabular-nums text-gray-600">
                    {c.earned}/{c.total}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Badge preview grid */}
        <div className="flex items-center justify-between">
          <span className="text-[8.5px] font-bold uppercase tracking-wider text-gray-400">
            Recent &amp; Next Up
          </span>
          <span className="text-[8.5px] font-semibold tabular-nums text-gray-400">
            {preview.length} of {achieveSummary.totalAvailable}
          </span>
        </div>

        {preview.length > 0 ? (
          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-3">
            {preview.map((b) => (
              <BadgePreviewCard key={b.id} badge={b} onOpen={openGallery} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-3 text-center">
            <Award className="mx-auto mb-1 h-4 w-4 text-gray-300" />
            <p className="text-[9.5px] text-gray-400">
              Earn your first badge by completing career milestones.
            </p>
          </div>
        )}

        {/* Next achievement (real backend milestone only) */}
        {nextMilestone && (
          <div className="rounded-xl border border-purple-100/80 bg-purple-50/40 p-2">
            <div className="mb-1 flex items-center gap-1">
              <Target className="h-3 w-3 text-purple-600" />
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-purple-700">
                Next Achievement
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BadgeEmblem
                icon={nextMilestone.icon}
                tier={(nextMilestone.tier || 'BRONZE') as BadgeTier}
                category={nextMilestone.category as BadgeCategory}
                size={32}
                locked
              />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold leading-tight break-words text-gray-900">
                  {nextMilestone.title}
                </p>
                <p className="text-[8.5px] leading-tight break-words text-gray-500">
                  {nextMilestone.criteria || nextMilestone.description}
                </p>
              </div>
            </div>
            {nextMilestone.progressAvailable && (
              <div className="mt-1.5">
                <div className="h-1 w-full overflow-hidden rounded-full bg-purple-100">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, nextMilestone.progressPercentage || 0))}%`,
                    }}
                  />
                </div>
                <div className="mt-0.5 flex items-center justify-between">
                  <span className="text-[8px] font-semibold tabular-nums text-purple-700">
                    {nextMilestone.currentValue ?? 0} / {nextMilestone.targetValue ?? nextMilestone.threshold ?? 0}
                    {nextMilestone.unit ? ` ${nextMilestone.unit}` : ''}
                  </span>
                  {typeof nextMilestone.remainingToUnlock === 'number' &&
                    nextMilestone.remainingToUnlock > 0 && (
                      <span className="text-[8px] font-semibold tabular-nums text-purple-700">
                        {nextMilestone.remainingToUnlock} to go
                      </span>
                    )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* View All Badges — always visible outside the scroll area */}
      <button
        type="button"
        onClick={openGallery}
        className="mt-1 flex w-full shrink-0 items-center justify-center gap-1 rounded-lg border border-rose-100 py-1.5 text-[10px] font-bold text-[#990024] transition-colors hover:bg-rose-50/70 hover:text-[#7a001c]"
      >
        View All Badges <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Panel Component (Fixed Dimensions)
// ─────────────────────────────────────────────
export function StudentPerformancePanel() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('tracker');

  const [careerStreak, setCareerStreak] = useState<CheckInState | null>(null);

  const [lbData, setLbData] = useState<{
    rankings: LeaderboardEntry[];
    currentRank: number | null;
    totalStudents: number;
  } | null>(null);
  const [lbLoading, setLbLoading] = useState(true);

  const [achieveSummary, setAchieveSummary] = useState<AchievementSummary | null>(null);
  const [badgeCollection, setBadgeCollection] = useState<BadgeCollection | null>(null);
  const [badgeCategories, setBadgeCategories] = useState<BadgeCategorySummary[]>([]);
  const [nextMilestone, setNextMilestone] = useState<BadgeItem | null>(null);
  const [coinBalance, setCoinBalance] = useState<number>(0);

  const fetchCareerStreak = useCallback(async () => {
    try {
      const res = await fetch('/api/check-in', { headers: getAuthHeader() });
      const json = await res.json();
      if (json.success) setCareerStreak(json);
    } catch {
      /* silent */
    }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    setLbLoading(true);
    try {
      const res = await fetch('/api/leaderboard?period=all_time', { headers: getAuthHeader() });
      const json = await res.json();
      if (json.success && json.rankings) {
        setLbData({
          rankings: json.rankings.slice(0, 5),
          currentRank: json.stats?.currentUserRank ?? null,
          totalStudents: json.stats?.totalStudents ?? 0,
        });
      }
    } catch {
      /* silent */
    } finally {
      setLbLoading(false);
    }
  }, []);

  const fetchAchievements = useCallback(async () => {
    try {
      const res = await fetch('/api/achievements', { headers: getAuthHeader() });
      const json = await res.json();
      if (json.success) {
        setAchieveSummary(json.summary);
        setBadgeCollection(json.badgesByStatus || null);
        setBadgeCategories(json.categories || []);
        setNextMilestone(json.nextMilestone || null);
      }
    } catch {
      /* silent */
    }
  }, []);

  const fetchCoinBalance = useCallback(async () => {
    try {
      const res = await fetch('/api/coins', { headers: getAuthHeader() });
      const json = await res.json();
      if (json.success && typeof json.balance === 'number') {
        setCoinBalance(json.balance);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchCareerStreak();
    fetchLeaderboard();
    fetchAchievements();
    fetchCoinBalance();
  }, [fetchCareerStreak, fetchLeaderboard, fetchAchievements, fetchCoinBalance]);

  // Refresh the coin balance when the student returns to the dashboard
  // (e.g. after claiming a gift that credits coins).
  useEffect(() => {
    const handleFocus = () => fetchCoinBalance();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [fetchCoinBalance]);

  const currentStreak = careerStreak?.streak?.currentStreak ?? achieveSummary?.currentStreak ?? 0;
  const totalXp = careerStreak?.totalEarnedXp ?? achieveSummary?.totalXp ?? 0;
  const currentRank = lbData?.currentRank;

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'tracker', label: 'Tracker', icon: BarChart2 },
    { id: 'leaderboard', label: 'Leaderboard', icon: ListOrdered },
    { id: 'badges', label: 'Badges', icon: Award },
  ];

  return (
    <aside className="flex flex-col gap-3 w-full min-w-0 select-none">
      {/* ── Card A: Performance Summary (Top Bar in Image 3) ──────────── */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-2xs py-2.5 px-4 flex items-center justify-between w-full min-w-0 box-border">
        {/* 1. XP Coins */}
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-xs shrink-0">
            <span className="text-[8.5px] font-black text-amber-950">XP</span>
          </div>
          <span className="text-xs sm:text-[13px] font-extrabold text-gray-900 tabular-nums">
            {Number(totalXp).toLocaleString()}
          </span>
        </div>

        {/* 2. Streak */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none shrink-0">🔥</span>
          <span className="text-xs sm:text-[13px] font-extrabold text-gray-900 tabular-nums">
            {currentStreak}
          </span>
        </div>

        {/* 3. Rank */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none shrink-0">🏆</span>
          <span className="text-xs sm:text-[13px] font-extrabold text-gray-900 tabular-nums">
            #{currentRank || 2}
          </span>
        </div>

        {/* 4. Coins */}
        <div className="flex items-center gap-1.5" title="Coin balance">
          <span className="text-sm leading-none shrink-0">🪙</span>
          <span className="text-xs sm:text-[13px] font-extrabold text-gray-900 tabular-nums">
            {coinBalance.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ── Mystery Gift Card (NEW - Between Performance Summary and Tabs) ── */}
      <MysteryGiftCard />

      {/* ── Card B: Segmented Pill Tab Card (Exact Image 3 Layout) ── */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-2xs overflow-hidden h-[400px] flex flex-col shrink-0 w-full min-w-0 box-border p-3.5">
        {/* Segmented Pill Tabs Header */}
        <div className="p-1 bg-gray-100/80 rounded-xl flex items-center gap-1 mb-2.5 shrink-0 w-full">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-1.5 text-center text-[11px] transition-all rounded-lg cursor-pointer ${
                  isActive
                    ? 'bg-white text-gray-900 font-bold shadow-xs'
                    : 'text-gray-500 hover:text-gray-800 font-medium'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* STRICT FIXED VIEWPORT: fills remaining flex space; parent h-[330px] provides the height cap */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden min-w-0 w-full box-border pt-1">
          {activeTab === 'tracker' && <CareerActivityStreakTab streak={careerStreak} />}
          {activeTab === 'leaderboard' && (
            <LeaderboardTab
              lbData={lbData}
              lbLoading={lbLoading}
              currentRank={currentRank ?? null}
              user={user}
            />
          )}
          {activeTab === 'badges' && (
            <BadgesTab
              achieveSummary={achieveSummary}
              badgeCollection={badgeCollection}
              badgeCategories={badgeCategories}
              nextMilestone={nextMilestone}
              router={router}
            />
          )}
        </div>
      </div>
    </aside>
  );
}
