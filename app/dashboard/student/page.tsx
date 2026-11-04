'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { usePlacement } from '@/context/PlacementContext';
import { useNotifications } from '@/context/NotificationContext';
import {
  Briefcase,
  Calendar,
  Clock,
  PieChart,
  Bell,
  Flag,
  Sun,
  Sunset,
  Moon,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { StatCard } from '@/components/placement/StatCard';
import {
  ApplicationAssistantModal,
  ApplicationAssistantOpportunity,
} from '@/components/opportunities/ApplicationAssistantModal';
import { MotivationBanner } from '@/components/dashboard/MotivationBanner';
import { StudentPerformancePanel } from '@/components/dashboard/StudentPerformancePanel';
import Link from 'next/link';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getGreeting(): 'Good Morning' | 'Good Afternoon' | 'Good Evening' {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

// ─────────────────────────────────────────────
// Student Overview Page
// ─────────────────────────────────────────────
export default function StudentDashboard() {
  const { user } = useAuth();
  const { interviews, opportunities, stats, isLoading } = usePlacement();
  const { notifications } = useNotifications();

  const [selectedAssistantOpp, setSelectedAssistantOpp] =
    useState<ApplicationAssistantOpportunity | null>(null);

  const greeting = getGreeting();
  const GreetingIcon =
    greeting === 'Good Morning' ? Sun : greeting === 'Good Afternoon' ? Sunset : Moon;
  const firstName = user?.name ? user.name.split(' ')[0] : 'Student';
  const todayLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // ── Motivation / performance metrics ──────────────────────────
  const [motivMetrics, setMotivMetrics] = useState({
    streak: 0,
    totalXp: 0,
    profileCompletion: stats.profileCompletionPct || 85,
    resumeScore: stats.resumeScorePct || 78,
    totalApplications: stats.totalApplications || 0,
    badgesEarned: 0,
    totalBadges: 24,
    rank: null as number | null,
    totalStudents: 0,
  });

  const fetchMotivationMetrics = useCallback(async () => {
    try {
      const [checkInRes, lbRes, achRes] = await Promise.allSettled([
        fetch('/api/check-in', { headers: getAuthHeader() }),
        fetch('/api/leaderboard?period=all_time', { headers: getAuthHeader() }),
        fetch('/api/achievements', { headers: getAuthHeader() }),
      ]);

      let streak = 0;
      let totalXp = 0;
      if (checkInRes.status === 'fulfilled') {
        const ci = await checkInRes.value.json().catch(() => ({}));
        streak = ci?.streak?.currentStreak ?? 0;
        totalXp = ci?.totalEarnedXp ?? 0;
      }

      let rank: number | null = null;
      let totalStudents = 0;
      if (lbRes.status === 'fulfilled') {
        const lb = await lbRes.value.json().catch(() => ({}));
        rank = lb?.stats?.currentUserRank ?? null;
        totalStudents = lb?.stats?.totalStudents ?? 0;
      }

      let badgesEarned = 0;
      let totalBadges = 24;
      if (achRes.status === 'fulfilled') {
        const ach = await achRes.value.json().catch(() => ({}));
        badgesEarned = ach?.summary?.totalEarned ?? 0;
        totalBadges = ach?.summary?.totalAvailable ?? 24;
      }

      setMotivMetrics({
        streak,
        totalXp,
        profileCompletion: stats.profileCompletionPct || 85,
        resumeScore: stats.resumeScorePct || 78,
        totalApplications: stats.totalApplications || 0,
        badgesEarned,
        totalBadges,
        rank,
        totalStudents,
      });
    } catch {
      /* silent */
    }
  }, [stats.profileCompletionPct, stats.resumeScorePct, stats.totalApplications]);

  useEffect(() => {
    fetchMotivationMetrics();
  }, [fetchMotivationMetrics]);

  // ── Upcoming Deadlines ────────────────────────────────────────
  const upcomingDeadlines = useMemo(() => {
    const items: Array<{ id: string; title: string; date: string; daysLeft: number }> = [];
    const now = new Date();

    opportunities.forEach((opp: any) => {
      const deadline = opp.applicationDeadline || opp.deadline;
      if (deadline) {
        const d = new Date(deadline);
        const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 3600 * 24));
        if (diffDays >= 0) {
          items.push({
            id: opp.id,
            title: `${opp.organization || opp.companyName || 'Company'} — ${opp.title || opp.role || 'Opportunity'}`,
            date: deadline,
            daysLeft: diffDays,
          });
        }
      }
    });

    interviews.forEach((inv) => {
      if (inv.date) {
        const d = new Date(inv.date);
        const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 3600 * 24));
        if (diffDays >= 0) {
          items.push({
            id: inv.id,
            title: `Interview: ${inv.companyName}`,
            date: inv.date,
            daysLeft: diffDays,
          });
        }
      }
    });

    return items.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 3);
  }, [opportunities, interviews]);

  const fallbackDeadlines = [
    { id: '1', title: 'Unstop — Summer Internship 2026', date: '2026-11-28', badge: '25 Days Left' },
    { id: '2', title: 'Infosys — Freshers Drive', date: '2026-11-30', badge: '27 Days Left' },
    { id: '3', title: 'Google STEP Internship', date: '2026-12-05', badge: '32 Days Left' },
  ];

  const displayDeadlines =
    upcomingDeadlines.length >= 2
      ? upcomingDeadlines.map((d) => ({
          id: d.id,
          title: d.title,
          date: d.date,
          badge: `${d.daysLeft} Days Left`,
        }))
      : fallbackDeadlines;

  // ── Loading state ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-kit-200 border-t-kit-600" />
          <p className="text-xs font-medium text-gray-500">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-page-root">

      {/*
        ══════════════════════════════════════════════════════════════
        TWO-COLUMN STABLE DASHBOARD GRID
        Desktop (≥1024px): minmax(0,1fr) | 300px fixed right sidebar
        Tablet/Mobile: single column stacked
        ══════════════════════════════════════════════════════════════
      */}
      <div className="dash-grid">

        {/* ═══════════════════════════════════════
            LEFT — Main Dashboard Content
        ═══════════════════════════════════════ */}
        <div className="dash-main">

          {/* 1. Motivational Banner */}
          <MotivationBanner studentName={user?.name} metrics={motivMetrics} />

          {/* 2. Welcome Card */}
          <div className="dash-welcome-card">
            <div className="dash-welcome-left">
              <div className="dash-greeting-icon">
                <GreetingIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="dash-welcome-heading">
                  {greeting}, {firstName}! 👋
                </h1>
                <p className="dash-welcome-sub">{todayLabel}</p>
              </div>
            </div>

            <div className="dash-welcome-right">
              <div className="dash-readiness-badge">
                <PieChart className="h-3.5 w-3.5 shrink-0" />
                <span>Career Readiness: {stats.profileCompletionPct || 85}%</span>
              </div>
              {motivMetrics.rank && (
                <div className="dash-rank-badge">
                  🏆 Rank #{motivMetrics.rank}
                </div>
              )}
              <Link
                href="/dashboard/student/opportunities"
                className="dash-explore-btn"
              >
                Explore Opportunities
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* 3. Four Summary Cards — strict horizontal row */}
          <div className="dash-summary-grid">
            <StatCard
              label="Career Readiness"
              value={`${stats.profileCompletionPct || 85}%`}
              icon={PieChart}
              color="text-rose-500"
              bg="bg-rose-50"
              index={0}
            />
            <StatCard
              label="My Applications"
              value={stats.totalApplications || 0}
              icon={Briefcase}
              color="text-blue-500"
              bg="bg-blue-50"
              subtitle={`${stats.activeApplications || 0} active`}
              index={1}
            />
            <StatCard
              label="Upcoming Interviews"
              value={stats.upcomingInterviewsCount ?? 0}
              icon={Calendar}
              color="text-violet-500"
              bg="bg-violet-50"
              subtitle="Scheduled rounds"
              index={2}
            />
            <StatCard
              label="Deadlines"
              value={upcomingDeadlines.length || displayDeadlines.length}
              icon={Clock}
              color="text-amber-500"
              bg="bg-amber-50"
              subtitle="Nearest due first"
              index={3}
            />
          </div>

          {/* 4. Career Readiness Score Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="dash-section-card"
          >
            <div className="dash-section-header">
              <div>
                <h2 className="dash-section-title">Career Readiness Score</h2>
                <p className="dash-section-sub">Profile · skills · placement activity</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-[#990024]">
                  {stats.profileCompletionPct || 85}%
                </span>
                <div className="h-10 w-10 rounded-full border-4 border-[#990024]/20 flex items-center justify-center bg-rose-50">
                  <PieChart className="h-4 w-4 text-[#990024]" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  label: 'Resume Optimization',
                  value: stats.resumeScorePct || 78,
                  color: 'bg-emerald-500',
                  textColor: 'text-emerald-600',
                },
                {
                  label: 'Profile & Verification',
                  value: stats.profileCompletionPct || 85,
                  color: 'bg-[#990024]',
                  textColor: 'text-[#990024]',
                },
                {
                  label: 'Skill Verifications',
                  value: 75,
                  color: 'bg-violet-500',
                  textColor: 'text-violet-600',
                },
                {
                  label: 'Placement Applications',
                  value:
                    Math.min(100, Math.round(((stats.totalApplications || 0) / 6) * 100)) || 60,
                  color: 'bg-blue-500',
                  textColor: 'text-blue-600',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="space-y-1.5 p-3 rounded-xl bg-gray-50/70 border border-gray-100"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-gray-700">{item.label}</span>
                    <span className={`text-[11px] font-bold ${item.textColor}`}>
                      {item.value}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-200/80 overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-700`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 5. Upcoming Deadlines + Notifications — side by side on md+ */}
          <div className="dash-bottom-grid">

            {/* Upcoming Deadlines */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="dash-section-card"
            >
              <div className="dash-section-header">
                <h2 className="dash-section-title flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-rose-500" />
                  Upcoming Deadlines
                </h2>
                <Link
                  href="/dashboard/student/opportunities"
                  className="text-[11px] font-semibold text-[#990024] hover:underline"
                >
                  View All →
                </Link>
              </div>

              <div className="space-y-2">
                {displayDeadlines.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2.5 hover:bg-gray-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500 border border-rose-100">
                        <Flag className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-gray-900 truncate">{item.title}</p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                          Due: {typeof item.date === 'string' ? item.date.slice(0, 10) : item.date}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-rose-50 border border-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600 ml-2">
                      {item.badge}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Notifications & Reminders */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="dash-section-card"
            >
              <div className="dash-section-header">
                <h2 className="dash-section-title flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5 text-rose-500" />
                  Notifications & Reminders
                </h2>
                <Link
                  href="/dashboard/notifications"
                  className="text-[11px] font-semibold text-[#990024] hover:underline"
                >
                  View All →
                </Link>
              </div>

              <div className="space-y-2.5">
                {notifications.slice(0, 3).length > 0 ? (
                  notifications.slice(0, 3).map((item, idx) => (
                    <div
                      key={item.id}
                      className={`rounded-xl p-3 border space-y-1 ${
                        idx === 0
                          ? 'bg-rose-50/70 border-rose-100'
                          : 'bg-amber-50/70 border-amber-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[11px] font-bold truncate ${
                            idx === 0 ? 'text-rose-950' : 'text-amber-950'
                          }`}
                        >
                          {item.title}
                        </span>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold border shrink-0 ${
                            item.isRead
                              ? 'bg-gray-100 text-gray-600 border-gray-200'
                              : 'bg-rose-100 text-rose-700 border-rose-200'
                          }`}
                        >
                          {item.isRead ? 'Read' : 'New'}
                        </span>
                      </div>
                      <p
                        className={`text-[11px] leading-relaxed ${
                          idx === 0 ? 'text-rose-900/90' : 'text-amber-900/90'
                        }`}
                      >
                        {item.message}
                      </p>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="rounded-xl bg-rose-50/70 p-3 border border-rose-100 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-rose-950 truncate">
                          Campus Placement Drive
                        </span>
                        <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200 shrink-0">
                          HOD Notice
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-900/90 leading-relaxed">
                        Registration is open for Software Engineering roles. Ensure your resume
                        score is above 80%.
                      </p>
                    </div>
                    <div className="rounded-xl bg-amber-50/70 p-3 border border-amber-100 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-950 truncate">
                          Mentor Reminder
                        </span>
                        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200 shrink-0">
                          Mentor
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-900/90 leading-relaxed">
                        Verify your GitHub and LinkedIn links before the upcoming review session.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>

          </div>
          {/* ═══ END LEFT COLUMN ═══ */}
        </div>

        {/* ═══════════════════════════════════════
            RIGHT SIDEBAR — Performance Panel
            Fixed 300px on desktop
        ═══════════════════════════════════════ */}
        <div className="dash-right-sidebar">
          <div className="dash-right-sticky">

            {/* A. XP / Streak / Rank + Tracker/Leaderboard/Badges tabs */}
            <StudentPerformancePanel />

            {/* B. IRP Card */}
            <div className="dash-widget-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M18.178 8c5.096 0 5.096 8 0 8-3.036 0-4.643-4-6.178-8-1.536-4-3.143-8-6.179-8-5.096 0-5.096 8 0 8 3.036 0 4.643 4 6.179 8 1.535 4 3.142 8 6.178 8z"
                        stroke="#2563EB"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 leading-tight">IRP</h4>
                    <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
                      Build industry-ready skills, build projects, and get internship-ready!
                    </p>
                  </div>
                </div>
                <Link
                  href="/resume"
                  className="text-gray-400 hover:text-blue-600 transition-colors shrink-0 p-0.5"
                  aria-label="Open IRP"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* C. Refer & Earn Card */}
            <div className="dash-widget-card dash-refer-card">
              <div className="flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <Link
                    href="/dashboard/student/opportunities"
                    className="inline-flex items-center gap-1 text-xs font-bold text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    Refer &amp; Earn
                    <span className="text-[11px]">↗</span>
                  </Link>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-sm sm:text-base font-extrabold text-blue-900 tracking-tight">
                      ₹8,000 – ₹25,000
                    </span>
                    <span className="text-[10px] font-medium text-gray-500">/ Referral</span>
                  </div>
                </div>
                {/* 3D Gift Box SVG */}
                <div className="shrink-0">
                  <svg
                    width="56"
                    height="56"
                    viewBox="0 0 64 64"
                    fill="none"
                    className="drop-shadow-sm"
                  >
                    <rect x="14" y="26" width="36" height="28" rx="4" fill="url(#gbG)" />
                    <rect x="11" y="20" width="42" height="9" rx="3" fill="url(#glG)" />
                    <rect x="29" y="20" width="6" height="34" fill="#93C5FD" />
                    <rect x="14" y="38" width="36" height="5" fill="#93C5FD" />
                    <ellipse cx="26" cy="16" rx="6" ry="4" transform="rotate(-20 26 16)" fill="#BFDBFE" stroke="#60A5FA" strokeWidth="1.5" />
                    <ellipse cx="38" cy="16" rx="6" ry="4" transform="rotate(20 38 16)" fill="#BFDBFE" stroke="#60A5FA" strokeWidth="1.5" />
                    <circle cx="32" cy="18" r="3.5" fill="#3B82F6" />
                    <circle cx="50" cy="12" r="1.5" fill="#60A5FA" opacity="0.8" />
                    <circle cx="12" cy="16" r="1.2" fill="#60A5FA" opacity="0.8" />
                    <defs>
                      <linearGradient id="gbG" x1="14" y1="26" x2="50" y2="54" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#60A5FA" />
                        <stop offset="1" stopColor="#3B82F6" />
                      </linearGradient>
                      <linearGradient id="glG" x1="11" y1="20" x2="53" y2="29" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#93C5FD" />
                        <stop offset="1" stopColor="#60A5FA" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>

          </div>
        </div>
        {/* ═══ END RIGHT SIDEBAR ═══ */}

      </div>

      {/* ── Floating AI Chat Assistant ── */}
      <button
        type="button"
        onClick={() => {
          setSelectedAssistantOpp({
            id: 'career-ai-assistant',
            title: 'Career & Placement Assistant',
            role: 'Placement Preparation & Interview Coach',
            organization: 'CareerAI',
            companyName: 'CareerAI Platform',
            type: 'FULL_TIME',
            status: 'OPEN',
          });
        }}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer text-white border-2 border-white/20 select-none"
        aria-label="Open AI Assistant"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
        </svg>
      </button>

      {/* Application Assistant Modal */}
      <ApplicationAssistantModal
        isOpen={!!selectedAssistantOpp}
        onClose={() => setSelectedAssistantOpp(null)}
        opportunity={selectedAssistantOpp}
      />
    </div>
  );
}
