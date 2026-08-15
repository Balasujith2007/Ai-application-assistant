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
  Trophy,
  User,
  CheckSquare,
  AlertTriangle,
  ArrowRight,
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
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="text-sm font-medium text-gray-500">Loading your career dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Good Morning, {user?.name?.split(' ')[0] || 'Alex'} 👋
          </h1>
          <p className="text-base text-gray-500 mt-1">
            Your personal AI-powered placement & career management hub.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/student/opportunities"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
          >
            <Briefcase className="h-4 w-4" />
            Explore Opportunities
          </Link>
        </div>
      </motion.div>

      {/* Top Stats Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Career Readiness"
          value={`${careerReadiness}%`}
          icon={PieChart}
          color="text-indigo-600"
          bg="bg-indigo-50"
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
          color="text-purple-600"
          bg="bg-purple-50"
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Career Readiness, Upcoming Deadlines, My Tasks, Opportunities */}
        <div className="space-y-8 lg:col-span-2">

          {/* Career Readiness Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Career Readiness Score</h2>
                <p className="text-xs text-gray-500 mt-0.5">Calculated from profile completion, skills, applications & tasks</p>
              </div>
              <span className="text-2xl font-black text-indigo-600">{careerReadiness}%</span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-gray-700">Resume Optimization</span>
                  <span className="text-indigo-600">{stats.resumeScorePct || 85}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.resumeScorePct || 85}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-gray-700">Profile & Verification</span>
                  <span className="text-indigo-600">{stats.profileCompletionPct || 90}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${stats.profileCompletionPct || 90}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-gray-700">Skill Verifications (Java, Python, SQL, React)</span>
                  <span className="text-indigo-600">75%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: '75%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-gray-700">Placement Drive Applications</span>
                  <span className="text-indigo-600">{Math.min(100, Math.round((stats.totalApplications / 6) * 100))}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, Math.round((stats.totalApplications / 6) * 100))}%` }} />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Upcoming Deadlines Widget */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-rose-500" /> Upcoming Deadlines
              </h2>
              <span className="text-xs font-semibold text-gray-400">Nearest Due First</span>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">No upcoming deadlines.</p>
            ) : (
              <div className="space-y-3">
                {upcomingDeadlines.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-3.5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                        item.type === 'Opportunity' ? 'bg-indigo-50 text-indigo-600' :
                        item.type === 'Task' ? 'bg-amber-50 text-amber-600' : 'bg-purple-50 text-purple-600'
                      }`}>
                        {item.type === 'Opportunity' ? 'OP' : item.type === 'Task' ? 'TSK' : 'INT'}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-400">Due: {item.date}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-rose-50 border border-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
                      {item.daysLeft === 0 ? 'Due Today' : `${item.daysLeft} day${item.daysLeft > 1 ? 's' : ''} left`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Recommended Opportunities */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Recent Campus Opportunities</h2>
                <p className="text-xs text-gray-500 mt-0.5">Broadcasted by HOD & Placement Coordinators</p>
              </div>
              <Link href="/dashboard/student/opportunities" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                View All →
              </Link>
            </div>

            <div className="space-y-4">
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

        {/* Right Column: Mentor Tasks, Recent Announcements, Activity Feed */}
        <div className="space-y-8">
          
          {/* My Tasks (Mentor Assigned) Widget */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">My Tasks</h2>
              <Link href="/dashboard/student/tasks" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                View All ({tasks.length}) →
              </Link>
            </div>

            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <label
                  key={task.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold block text-gray-800">
                      {task.title}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">Assigned by Mentor • Due: {task.dueDate}</span>
                  </div>
                </label>
              ))}
            </div>
          </motion.div>

          {/* Department Announcements & Mentor Reminders */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-indigo-600" /> Announcements & Reminders
              </h2>
              <Link href="/dashboard/student/announcements" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                View All →
              </Link>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl bg-indigo-50/70 p-4 border border-indigo-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900">TCS Campus Placement Drive</span>
                  <span className="text-[10px] font-semibold text-indigo-600">HOD Notice</span>
                </div>
                <p className="text-xs text-indigo-800">Registration is open for Software Engineering Intern roles. Ensure resume score is above 80%.</p>
              </div>

              <div className="rounded-xl bg-amber-50/70 p-4 border border-amber-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">Mentor Reminder</span>
                  <span className="text-[10px] font-semibold text-amber-600">Sujith – Mentor</span>
                </div>
                <p className="text-xs text-amber-800">Please review your resume formatting and verify your GitHub/LinkedIn links before Friday.</p>
              </div>
            </div>
          </motion.div>

          {/* Recent Career Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
          >
            <h2 className="text-lg font-bold text-gray-900">Recent Career Activity</h2>
            <div className="relative pl-2">
              <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gray-100" />
              <div className="space-y-5">
                {activities.slice(0, 4).map((act) => (
                  <div key={act.id} className="relative flex gap-4">
                    <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 ring-4 ring-white">
                      <Sparkles className="h-3 w-3" />
                    </div>
                    <div className="flex flex-col pt-0.5">
                      <span className="text-sm font-bold text-gray-900">{act.title}</span>
                      <span className="text-xs text-gray-500">{act.desc}</span>
                      <span className="mt-1 text-xs font-medium text-gray-400">{act.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
