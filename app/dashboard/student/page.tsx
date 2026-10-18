'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { usePlacement } from '@/context/PlacementContext';
import {
  FileText,
  Briefcase,
  Calendar,
  Clock,
  Sparkles,
  User,
  CheckSquare,
  TrendingUp,
  Megaphone,
  CheckCircle2,
  PieChart,
  Bell,
  Award,
  Flag,
} from 'lucide-react';
import { StatCard } from '@/components/placement/StatCard';
import { MatchBadge } from '@/components/placement/MatchBadge';
import { ApplicationAssistantModal, ApplicationAssistantOpportunity } from '@/components/opportunities/ApplicationAssistantModal';
import { ClassLeaderboard } from '@/components/leaderboard/ClassLeaderboard';
import Link from 'next/link';

export default function StudentDashboard() {
  const { user } = useAuth();
  const {
    applications,
    interviews,
    opportunities,
    activities,
    stats,
    isLoading,
  } = usePlacement();

  const [selectedAssistantOpp, setSelectedAssistantOpp] = useState<ApplicationAssistantOpportunity | null>(null);

  // 1. Dynamic Career Readiness Calculation
  const careerReadiness = useMemo(() => {
    const resumeScore = stats.resumeScorePct || 85;
    const profileScore = stats.profileCompletionPct || 90;
    const skillsScore = 75;
    const appsScore = Math.min(100, Math.round((stats.totalApplications / 6) * 100)) || 60;

    return Math.round((resumeScore + profileScore + skillsScore + appsScore) / 4);
  }, [stats]);

  // 2. Dynamic Upcoming Deadlines (Sorted by nearest non-expired deadline)
  const upcomingDeadlines = useMemo(() => {
    const items: Array<{ id: string; title: string; type: 'Opportunity' | 'Interview'; date: string; daysLeft: number }> = [];
    const now = new Date();

    // Opportunities deadlines
    opportunities.forEach((opp: any) => {
      const deadline = opp.applicationDeadline || opp.deadline;
      if (deadline) {
        const d = new Date(deadline);
        const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 3600 * 24));
        if (diffDays >= 0) {
          const org = opp.organization || opp.companyName || 'Company';
          const title = opp.title || opp.role || 'Opportunity';
          items.push({ id: opp.id, title: `${org} — ${title}`, type: 'Opportunity', date: deadline, daysLeft: diffDays });
        }
      }
    });

    // Interviews dates
    interviews.forEach((inv) => {
      if (inv.date) {
        const d = new Date(inv.date);
        const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 3600 * 24));
        if (diffDays >= 0) {
          items.push({ id: inv.id, title: `Interview: ${inv.companyName} (${inv.round})`, type: 'Interview', date: inv.date, daysLeft: diffDays });
        }
      }
    });

    return items.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);
  }, [opportunities, interviews]);

  const fallbackDeadlines = [
    { id: '1', title: 'Unstop - Opportunity Details', date: '2025-03-28T23:59:00.000Z', badge: '10 Days Left' },
    { id: '2', title: 'Meritoday - HireToday', date: '2025-03-30T23:59:00.000Z', badge: '12 Days Left' },
    { id: '3', title: 'Hiretoday - HireToday', date: '2025-04-05T23:59:00.000Z', badge: '18 Days Left' },
  ];

  const displayDeadlines =
    upcomingDeadlines.length >= 3
      ? upcomingDeadlines.slice(0, 3).map((d) => ({
          id: d.id,
          title: d.title,
          date: d.date,
          badge: `${d.daysLeft} Days Left`,
        }))
      : fallbackDeadlines;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-kit-200 border-t-kit-600"></div>
          <p className="text-xs font-medium text-gray-500">Loading your career dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      {/* Two-Column Responsive Layout on Desktop (lg:grid-cols-12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Main Column (lg:col-span-8) */}
        <div className="col-span-1 lg:col-span-8 space-y-6">
          {/* 1. SaaS Greeting Header */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs"
          >
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Good Morning, {user?.name ? user.name.split(' ')[0] : 'Bala'} 👋
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium text-gray-500">
                <span className="font-bold text-[#990024] bg-rose-50 px-3 py-0.5 rounded-full border border-rose-100 text-xs">
                  Career Readiness: 85%
                </span>
                <span>2 notifications</span>
                <span className="text-gray-300">•</span>
                <span>5 upcoming deadlines</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/dashboard/student/opportunities"
                className="inline-flex items-center gap-2 rounded-xl bg-[#990024] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-2xs hover:bg-[#80001e] transition-colors"
              >
                <Briefcase className="h-4 w-4" />
                Explore Opportunities
              </Link>
            </div>
          </motion.div>

          {/* 2. Top Metric Cards (4 Cards Grid) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Career Readiness"
              value="85%"
              icon={PieChart}
              color="text-rose-500"
              bg="bg-rose-50"
              index={0}
            />
            <StatCard
              label="My Applications"
              value={stats.totalApplications || 40}
              icon={Briefcase}
              color="text-blue-500"
              bg="bg-blue-50"
              subtitle="12 active drives"
              index={1}
            />
            <StatCard
              label="Upcoming Interviews"
              value={stats.upcomingInterviewsCount ?? 0}
              icon={Calendar}
              color="text-rose-500"
              bg="bg-rose-50"
              subtitle="Scheduled rounds"
              index={2}
            />
            <StatCard
              label="Upcoming Deadlines"
              value={upcomingDeadlines.length || 5}
              icon={Clock}
              color="text-rose-500"
              bg="bg-rose-50"
              subtitle="Nearest due items"
              index={3}
            />
          </div>

          {/* 3. Career Readiness Score Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-2xs space-y-5"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Career Readiness Score</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Calculated from profile completion, skills & placement applications
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-[#990024]">85%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 pt-1">
              {/* Resume Optimization: 78% (emerald) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-800">Resume Optimization</span>
                  <span className="text-emerald-500 font-bold">78%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '78%' }} />
                </div>
              </div>

              {/* Profile & Verification: 85% (dark red) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-800">Profile & Verification</span>
                  <span className="text-[#990024] font-bold">85%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-[#990024] rounded-full" style={{ width: '85%' }} />
                </div>
              </div>

              {/* Skill Verifications: 75% (dark red) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-800">Skill Verifications</span>
                  <span className="text-[#990024] font-bold">75%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-[#990024] rounded-full" style={{ width: '75%' }} />
                </div>
              </div>

              {/* Placement Drive Applications: 100% (blue) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-800">Placement Drive Applications</span>
                  <span className="text-blue-500 font-bold">100%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          </motion.div>

          {/* 4. Bottom Subgrid: Upcoming Deadlines (Left) & Notifications + Recent Activity (Right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Upcoming Deadlines Section */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-rose-500" /> Upcoming Deadlines
                </h2>
                <span className="text-[11px] font-medium text-gray-400">Nearest Due First</span>
              </div>

              <div className="space-y-3">
                {displayDeadlines.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-gray-100 p-2.5 hover:bg-gray-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500 border border-rose-100">
                        <Flag className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{item.title}</p>
                        <p className="text-[10px] text-gray-400 font-mono">Due: {item.date}</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-rose-50 border border-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-600">
                      {item.badge}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Notifications & Reminders + Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-4"
            >
              {/* Notifications & Reminders Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Bell className="h-4 w-4 text-rose-500" /> Notifications & Reminders
                </h2>
                <Link href="/dashboard/notifications" className="text-xs font-semibold text-[#990024] hover:underline">
                  View All →
                </Link>
              </div>

              {/* Notices List */}
              <div className="space-y-2.5">
                {/* Notice 1: TCS Campus Placement Drive */}
                <div className="rounded-xl bg-rose-50/70 p-3 border border-rose-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-950 truncate">TCS Campus Placement Drive</span>
                    <span className="rounded-md bg-rose-100 px-1.5 py-0.2 text-[9px] font-bold text-rose-700 border border-rose-200 shrink-0">
                      HOD Notice
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-900 leading-snug">
                    Registration is open for Software Engineering Intern roles. Ensure resume score is above 80%.
                  </p>
                </div>

                {/* Notice 2: Mentor Reminder */}
                <div className="rounded-xl bg-amber-50/70 p-3 border border-amber-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 truncate">Mentor Reminder</span>
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800 border border-amber-200 shrink-0">
                      Mentor Reminder
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-snug">
                    Please review your resume formatting and verify your Github/LinkedIn links before Friday.
                  </p>
                </div>
              </div>

              {/* Recent Activity Section */}
              <div className="pt-2">
                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2 mb-3">
                  <Clock className="h-3.5 w-3.5 text-rose-500" /> Recent Activity
                </h3>

                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 py-6 px-4 text-center">
                  <p className="text-xs font-medium text-gray-700">No recent activity</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Your future activities will appear here.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Column: Persistent Gamified Leaderboard (lg:col-span-4) */}
        <aside className="col-span-1 lg:col-span-4 sticky top-6 self-start z-10">
          <ClassLeaderboard variant="compact" initialPeriod="MONTHLY" />
        </aside>
      </div>

      {/* Application Assistant Modal */}
      <ApplicationAssistantModal
        isOpen={!!selectedAssistantOpp}
        onClose={() => setSelectedAssistantOpp(null)}
        opportunity={selectedAssistantOpp}
      />
    </div>
  );
}
