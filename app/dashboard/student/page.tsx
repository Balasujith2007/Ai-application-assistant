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
} from 'lucide-react';
import { StatCard } from '@/components/placement/StatCard';
import { MatchBadge } from '@/components/placement/MatchBadge';
import { ApplicationAssistantModal, ApplicationAssistantOpportunity } from '@/components/opportunities/ApplicationAssistantModal';
import Link from 'next/link';

export default function StudentDashboard() {
  const { user } = useAuth();
  const {
    applications,
    interviews,
    tasks,
    opportunities,
    activities,
    stats,
    toggleTask,
    isLoading,
  } = usePlacement();

  const [selectedAssistantOpp, setSelectedAssistantOpp] = useState<ApplicationAssistantOpportunity | null>(null);

  // 1. Dynamic Career Readiness Calculation
  const careerReadiness = useMemo(() => {
    const resumeScore = stats.resumeScorePct || 85;
    const profileScore = stats.profileCompletionPct || 90;
    const skillsScore = 75;
    const appsScore = Math.min(100, Math.round((stats.totalApplications / 6) * 100)) || 60;
    const tasksScore = tasks.length > 0 ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 80;

    return Math.round((resumeScore + profileScore + skillsScore + appsScore + tasksScore) / 5);
  }, [stats, tasks]);

  // 2. Dynamic Upcoming Deadlines (Sorted by nearest non-expired deadline)
  const upcomingDeadlines = useMemo(() => {
    const items: Array<{ id: string; title: string; type: 'Opportunity' | 'Task' | 'Interview'; date: string; daysLeft: number }> = [];
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

    // Tasks deadlines
    tasks.forEach((t) => {
      if (!t.completed && t.dueDate) {
        const d = new Date(t.dueDate);
        const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 3600 * 24));
        if (!isNaN(diffDays) && diffDays >= 0) {
          items.push({ id: t.id, title: `Mentor Task: ${t.title}`, type: 'Task', date: t.dueDate, daysLeft: diffDays });
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
  }, [opportunities, tasks, interviews]);

  // Active pending tasks
  const pendingTasks = useMemo(() => tasks.filter(t => !t.completed).slice(0, 4), [tasks]);

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
    <div className="space-y-6 pb-10">
      {/* Compact SaaS Greeting Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Good Morning, {user?.name?.split(' ')[0] || 'Alex'} 👋
          </h1>
          <p className="text-xs sm:text-sm font-medium text-gray-500 mt-1 flex flex-wrap items-center gap-2">
            <span className="font-bold text-kit-600 bg-kit-50 px-2.5 py-0.5 rounded-md border border-kit-100">
              Career Readiness: {careerReadiness}%
            </span>
            <span className="text-gray-300">•</span>
            <span>2 notifications</span>
            <span className="text-gray-300">•</span>
            <span>{upcomingDeadlines.length} upcoming deadlines</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/student/opportunities"
            className="inline-flex items-center gap-2 rounded-xl bg-kit-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-2xs hover:bg-kit-700 transition-colors"
          >
            <Briefcase className="h-4 w-4" />
            Explore Opportunities
          </Link>
        </div>
      </motion.div>

      {/* Top Compact Stats Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Career Readiness"
          value={`${careerReadiness}%`}
          icon={PieChart}
          color="text-kit-600"
          bg="bg-kit-50"
          index={0}
        />
        <StatCard
          label="My Applications"
          value={stats.totalApplications}
          icon={Briefcase}
          color="text-blue-600"
          bg="bg-blue-50"
          subtitle={`${stats.activeApplications} active drives`}
          index={1}
        />
        <StatCard
          label="Pending Tasks"
          value={tasks.filter(t => !t.completed).length}
          icon={CheckSquare}
          color="text-amber-600"
          bg="bg-amber-50"
          subtitle="Mentor milestones"
          index={2}
        />
        <StatCard
          label="Upcoming Interviews"
          value={stats.upcomingInterviewsCount}
          icon={Calendar}
          color="text-kit-600"
          bg="bg-kit-50"
          subtitle="Scheduled rounds"
          index={3}
        />
        <StatCard
          label="Upcoming Deadlines"
          value={upcomingDeadlines.length}
          icon={Clock}
          color="text-rose-600"
          bg="bg-rose-50"
          subtitle="Nearest due items"
          index={4}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Career Readiness, Upcoming Deadlines, Opportunities */}
        <div className="space-y-6 lg:col-span-2">

          {/* Career Readiness Score Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-2xs space-y-5"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Career Readiness Score</h2>
                <p className="text-xs text-gray-500 mt-0.5">Calculated from profile completion, skills, applications & tasks</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-kit-600">{careerReadiness}%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-700">Resume Optimization</span>
                  <span className="text-emerald-600 font-bold">{stats.resumeScorePct || 85}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.resumeScorePct || 85}%` }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-700">Profile & Verification</span>
                  <span className="text-kit-600 font-bold">{stats.profileCompletionPct || 90}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-kit-600 rounded-full" style={{ width: `${stats.profileCompletionPct || 90}%` }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-700">Skill Verifications</span>
                  <span className="text-kit-600 font-bold">75%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-kit-500 rounded-full" style={{ width: '75%' }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-700">Placement Drive Applications</span>
                  <span className="text-blue-600 font-bold">{Math.min(100, Math.round((stats.totalApplications / 6) * 100))}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, Math.round((stats.totalApplications / 6) * 100))}%` }} />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Upcoming Deadlines Section */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-rose-500" /> Upcoming Deadlines
              </h2>
              <span className="text-xs font-semibold text-gray-400">Nearest Due First</span>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-4 text-center">
                <p className="text-xs font-bold text-gray-700">No upcoming deadlines</p>
                <p className="text-[11px] text-gray-400">Your future deadlines will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingDeadlines.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-3 hover:bg-gray-50/80 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
                        item.type === 'Opportunity' ? 'bg-kit-50 text-kit-600 border border-kit-100' :
                        item.type === 'Task' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-kit-50 text-kit-600 border border-kit-100'
                      }`}>
                        {item.type === 'Opportunity' ? 'OP' : item.type === 'Task' ? 'TSK' : 'INT'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{item.title}</p>
                        <p className="text-[11px] text-gray-400">Due: {item.date}</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-rose-50 border border-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                      {item.daysLeft === 0 ? 'Due Today' : `${item.daysLeft} Day${item.daysLeft > 1 ? 's' : ''} Left`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Recommended Campus Opportunities */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">Recent Campus Opportunities</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">Broadcasted by HOD & Placement Coordinators</p>
              </div>
              <Link href="/dashboard/student/opportunities" className="text-xs font-semibold text-kit-600 hover:text-kit-700">
                View All →
              </Link>
            </div>

            <div className="space-y-3">
              {opportunities.slice(0, 3).map((opp) => (
                <MatchBadge
                  key={opp.id}
                  opportunity={opp}
                  onApply={() => setSelectedAssistantOpp(opp as any)}
                  onView={() => setSelectedAssistantOpp(opp as any)}
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Column: My Tasks, Announcements & Reminders, Activity Feed */}
        <div className="space-y-6">
          
          {/* My Tasks (Mentor Assigned) Card */}
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-3.5"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-gray-900">My Tasks</h2>
              <Link href="/dashboard/student/tasks" className="text-xs font-semibold text-kit-600 hover:text-kit-700">
                View All ({tasks.length}) →
              </Link>
            </div>

            {pendingTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-4 text-center space-y-1">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-gray-700">No pending tasks</p>
                <p className="text-[11px] text-gray-400">You are all caught up.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingTasks.map((task) => (
                  <label
                    key={task.id}
                    className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-gray-100 p-2.5 transition-colors hover:bg-gray-50/80"
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task.id)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-kit-600 focus:ring-kit-600 cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold block text-gray-800">
                        {task.title}
                      </span>
                      <span className="text-[11px] text-gray-400 font-medium">Assigned by Mentor • Due: {task.dueDate}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </motion.div>

          {/* Notifications & Reminders */}
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-3.5"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Bell className="h-4 w-4 text-kit-600" /> Notifications & Reminders
              </h2>
              <Link href="/dashboard/notifications" className="text-xs font-semibold text-kit-600 hover:text-kit-700">
                View All →
              </Link>
            </div>

            <div className="space-y-2.5">
              <div className="rounded-xl bg-kit-50/70 p-3 border border-kit-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-kit-900">TCS Campus Placement Drive</span>
                  <span className="rounded-md bg-kit-100 px-2 py-0.5 text-[10px] font-bold text-kit-700 border border-kit-200">
                    HOD Notice
                  </span>
                </div>
                <p className="text-[11px] text-kit-800 leading-snug">Registration is open for Software Engineering Intern roles. Ensure resume score is above 80%.</p>
              </div>

              <div className="rounded-xl bg-amber-50/70 p-3 border border-amber-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">Mentor Reminder</span>
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                    Mentor Reminder
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-snug">Please review your resume formatting and verify your GitHub/LinkedIn links before Friday.</p>
              </div>
            </div>
          </motion.div>

          {/* Recent Career Activity */}
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-3.5"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-gray-900">Recent Activity</h2>
            </div>

            {activities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-4 text-center">
                <p className="text-xs font-bold text-gray-700">No recent activity</p>
                <p className="text-[11px] text-gray-400">Your future activities will appear here.</p>
              </div>
            ) : (
              <div className="relative pl-2">
                <div className="absolute left-[13px] top-3 bottom-3 w-px bg-gray-100" />
                <div className="space-y-4">
                  {activities.slice(0, 4).map((act) => (
                    <div key={act.id} className="relative flex gap-3">
                      <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-kit-50 text-kit-600 ring-4 ring-white">
                        <Sparkles className="h-2.5 w-2.5" />
                      </div>
                      <div className="flex flex-col pt-0.5">
                        <span className="text-xs font-bold text-gray-900">{act.title}</span>
                        <span className="text-[11px] text-gray-500 leading-tight">{act.desc}</span>
                        <span className="mt-0.5 text-[10px] font-medium text-gray-400">{act.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
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
