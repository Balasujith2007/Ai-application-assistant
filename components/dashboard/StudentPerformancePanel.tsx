'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trophy,
  Flame,
  Zap,
  Check,
  Clock,
  AlertCircle,
  CheckCircle2,
  Users,
  ChevronRight,
  BarChart2,
  Award,
  ListOrdered,
  CalendarDays,
  Target,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getCleanProfilePhotoUrl } from '@/lib/avatar';
import { RankMedalBadge } from '@/components/leaderboard/StudentClassLeaderboard';
import { MysteryGiftCard } from './MysteryGiftCard';
import { Crown } from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface CheckInState {
  checkedInToday: boolean;
  todayXpEarned: number;
  totalEarnedXp: number;
  secondsUntilNextCheckIn: number;
  streak: {
    currentStreak: number;
    longestStreak: number;
    totalActiveDays: number;
    progressInCycle: number;
    targetInCycle: number;
  };
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

type TabId = 'tracker' | 'leaderboard' | 'badges';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatSecondsToHM(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

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
// Tab 1: Monthly Tracker (Fits inside fixed viewport)
// ─────────────────────────────────────────────
function MonthlyTrackerTab({
  checkIn,
  checkInLoading,
  checkInMsg,
  onCheckIn,
  achieveSummary,
}: {
  checkIn: CheckInState | null;
  checkInLoading: boolean;
  checkInMsg: { text: string; type: 'success' | 'error' } | null;
  onCheckIn: () => void;
  achieveSummary: AchievementSummary | null;
}) {
  const currentStreak = checkIn?.streak?.currentStreak ?? achieveSummary?.currentStreak ?? 0;
  const totalXp = checkIn?.totalEarnedXp ?? achieveSummary?.totalXp ?? 0;
  const progressInCycle = checkIn?.streak?.progressInCycle ?? (currentStreak % 7);
  const weekDots = Array.from({ length: 7 }, (_, i) => i < progressInCycle);
  const totalActiveDays = checkIn?.streak?.totalActiveDays ?? 0;

  return (
    <div className="h-full w-full min-w-0 flex flex-col justify-between space-y-2 overflow-hidden">
      {/* Daily Check-In Box */}
      <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-[#fffdf7] via-amber-50/25 to-amber-50/50 p-2.5 shadow-2xs">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center text-sm shadow-2xs"
              style={{ background: 'linear-gradient(135deg, #FBBF24, #D97706)' }}
            >
              🪙
            </div>
            <div>
              <h4 className="text-[11px] font-bold text-gray-900 leading-tight">Daily Check-In</h4>
              <span className="text-[9px] font-bold text-amber-700 bg-amber-100/80 border border-amber-200/70 px-1.5 py-0.2 rounded">
                +5 XP Daily
              </span>
            </div>
          </div>
          {checkIn?.checkedInToday ? (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-emerald-200">
              <Check className="h-3 w-3" /> Done
            </span>
          ) : (
            <button
              type="button"
              onClick={onCheckIn}
              disabled={checkInLoading}
              className="rounded-lg px-2.5 py-1 text-[10px] font-bold text-white disabled:opacity-60 active:scale-95 transition-all shadow-2xs cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}
            >
              {checkInLoading ? (
                <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Claim XP 🪙'
              )}
            </button>
          )}
        </div>

        {/* Weekly Dots */}
        <div className="flex items-center gap-1 mb-1 pt-1">
          {weekDots.map((filled, i) => (
            <div
              key={i}
              className="flex-1 h-1.5 rounded-full transition-all"
              style={{
                background: filled
                  ? 'linear-gradient(90deg, #F59E0B, #D97706)'
                  : 'rgba(217, 119, 6, 0.15)',
              }}
            />
          ))}
        </div>
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-amber-800 font-medium">
            🔥 {currentStreak}d streak · {progressInCycle}/7 days
          </span>
          {checkIn?.checkedInToday && checkIn.secondsUntilNextCheckIn > 0 ? (
            <span className="text-gray-400 flex items-center gap-0.5 text-[9px]">
              <Clock className="h-2.5 w-2.5" /> {formatSecondsToHM(checkIn.secondsUntilNextCheckIn)}
            </span>
          ) : !checkIn?.checkedInToday ? (
            <span className="text-amber-700 font-bold text-[10px]">Ready!</span>
          ) : null}
        </div>

        {checkInMsg && (
          <div
            className={`mt-1.5 rounded-lg px-2 py-0.5 text-[9px] font-semibold flex items-center gap-1.5 ${
              checkInMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {checkInMsg.type === 'success' ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-3 w-3 text-rose-600 shrink-0" />
            )}
            <span className="truncate">{checkInMsg.text}</span>
          </div>
        )}
      </div>

      {/* Monthly Activity Box */}
      <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-2 space-y-1.5">
        <h4 className="text-[10px] font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wider">
          <CalendarDays className="h-3.5 w-3.5 text-[#990024]" />
          Monthly Engagement
        </h4>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="text-center rounded-lg bg-white border border-gray-100 py-1.5 px-1 shadow-2xs">
            <span className="text-xs font-black text-gray-900 block tabular-nums">{totalActiveDays}</span>
            <span className="text-[8px] font-semibold text-gray-400 uppercase tracking-wide">Days</span>
          </div>
          <div className="text-center rounded-lg bg-amber-50/60 border border-amber-100/80 py-1.5 px-1 shadow-2xs">
            <span className="text-xs font-black text-amber-800 block tabular-nums">{currentStreak}</span>
            <span className="text-[8px] font-semibold text-amber-600 uppercase tracking-wide">Streak</span>
          </div>
          <div className="text-center rounded-lg bg-rose-50/60 border border-rose-100/80 py-1.5 px-1 shadow-2xs">
            <span className="text-xs font-black text-[#990024] block tabular-nums truncate">
              {Number(totalXp).toLocaleString()}
            </span>
            <span className="text-[8px] font-semibold text-[#990024] uppercase tracking-wide">XP</span>
          </div>
        </div>
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
// Tab 3: Badges (Fits inside fixed viewport)
// ─────────────────────────────────────────────
function BadgesTab({
  achieveSummary,
  recentBadges,
  router,
}: {
  achieveSummary: AchievementSummary | null;
  recentBadges: any[];
  router: any;
}) {
  if (!achieveSummary) {
    return (
      <div className="space-y-2 animate-pulse py-2">
        <div className="h-2.5 bg-gray-100 rounded w-3/4" />
        <div className="h-1.5 bg-gray-100 rounded-full w-full" />
        <div className="grid grid-cols-4 gap-1 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-11 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full min-w-0 flex flex-col justify-between overflow-hidden">
      <div className="space-y-2 w-full min-w-0">
        {/* Progress Summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-black text-gray-900">{achieveSummary.totalEarned}</span>
            <span className="text-[10px] font-semibold text-gray-400">
              / {achieveSummary.totalAvailable} unlocked
            </span>
          </div>
          <span
            className="text-[10px] font-extrabold px-1.5 py-0.2 rounded text-white"
            style={{ background: 'linear-gradient(135deg, #990024, #c71f47)' }}
          >
            {achieveSummary.completionPercentage}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${achieveSummary.completionPercentage}%`,
              background: 'linear-gradient(90deg, #990024, #c71f47)',
            }}
          />
        </div>

        {/* Badge Grid */}
        {recentBadges.length > 0 ? (
          <div className="grid grid-cols-4 gap-1 pt-0.5 w-full min-w-0">
            {recentBadges.map((b) => (
              <button
                key={b.id}
                title={b.title}
                className="flex flex-col items-center gap-0.5 rounded-xl border border-amber-100 bg-gradient-to-b from-amber-50/80 to-amber-50/20 p-1.5 cursor-pointer hover:border-amber-300 hover:shadow-2xs transition-all min-w-0 w-full"
                onClick={() => router.push('/dashboard/student/achievements')}
              >
                <span className="text-base leading-none">{b.icon || '🎖️'}</span>
                <span className="text-[8px] font-bold text-gray-700 text-center truncate w-full block leading-tight">
                  {b.title}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-2.5 text-center w-full min-w-0">
            <span className="text-lg block mb-0.5">🎖️</span>
            <p className="text-[10px] text-gray-400">Complete activities to earn badges!</p>
          </div>
        )}

        {/* Milestone Goal Box */}
        <div className="rounded-xl border border-purple-100/80 bg-purple-50/40 p-2 flex items-center gap-2 w-full min-w-0">
          <div className="h-6 w-6 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
            <Target className="h-3 w-3 text-purple-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold text-purple-950 truncate">Next Goal: +50 XP</p>
            <p className="text-[8px] text-purple-800/80 truncate">Complete next profile milestone</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => router.push('/dashboard/student/achievements')}
        className="w-full mt-1 flex items-center justify-center gap-1 text-[10px] font-bold text-[#990024] hover:text-[#7a001c] py-1 rounded-lg hover:bg-rose-50/70 transition-colors border border-transparent hover:border-rose-100 shrink-0"
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

  const [checkIn, setCheckIn] = useState<CheckInState | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInMsg, setCheckInMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [lbData, setLbData] = useState<{
    rankings: LeaderboardEntry[];
    currentRank: number | null;
    totalStudents: number;
  } | null>(null);
  const [lbLoading, setLbLoading] = useState(true);

  const [achieveSummary, setAchieveSummary] = useState<AchievementSummary | null>(null);
  const [recentBadges, setRecentBadges] = useState<any[]>([]);
  const [coinBalance, setCoinBalance] = useState<number>(0);

  const fetchCheckIn = useCallback(async () => {
    try {
      const res = await fetch('/api/check-in', { headers: getAuthHeader() });
      const json = await res.json();
      if (json.success) setCheckIn(json);
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
        setRecentBadges((json.badges || []).filter((b: any) => b.status === 'EARNED').slice(0, 4));
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
    fetchCheckIn();
    fetchLeaderboard();
    fetchAchievements();
    fetchCoinBalance();
  }, [fetchCheckIn, fetchLeaderboard, fetchAchievements, fetchCoinBalance]);

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

  const handleCheckIn = async () => {
    if (checkInLoading || checkIn?.checkedInToday) return;
    setCheckInLoading(true);
    setCheckInMsg(null);
    try {
      const res = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      });
      const json = await res.json();
      if (json.success) {
        setCheckIn(json.status ?? null);
        setCheckInMsg({ text: json.message || `+${json.xpAwarded} XP earned!`, type: 'success' });
        await fetchLeaderboard();
        setTimeout(() => setCheckInMsg(null), 4000);
      } else {
        setCheckInMsg({ text: json.message || 'Check-in failed.', type: 'error' });
        setTimeout(() => setCheckInMsg(null), 3500);
      }
    } catch {
      setCheckInMsg({ text: 'Network error.', type: 'error' });
      setTimeout(() => setCheckInMsg(null), 3500);
    } finally {
      setCheckInLoading(false);
    }
  };

  const currentStreak = checkIn?.streak?.currentStreak ?? achieveSummary?.currentStreak ?? 0;
  const totalXp = checkIn?.totalEarnedXp ?? achieveSummary?.totalXp ?? 0;
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
      <div className="rounded-2xl bg-white border border-gray-100 shadow-2xs overflow-hidden h-[330px] flex flex-col shrink-0 w-full min-w-0 box-border p-3.5">
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
          {activeTab === 'tracker' && (
            <MonthlyTrackerTab
              checkIn={checkIn}
              checkInLoading={checkInLoading}
              checkInMsg={checkInMsg}
              onCheckIn={handleCheckIn}
              achieveSummary={achieveSummary}
            />
          )}
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
              recentBadges={recentBadges}
              router={router}
            />
          )}
        </div>
      </div>
    </aside>
  );
}
