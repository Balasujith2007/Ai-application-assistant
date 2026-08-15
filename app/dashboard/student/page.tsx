'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { usePlacement } from '@/context/PlacementContext';
import {
  CheckCircle2,
  FileText,
  Briefcase,
  Calendar,
  Building2,
  Trophy,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  Upload,
  PlusCircle,
  Code2,
  User,
  CheckSquare,
  AlertTriangle,
} from 'lucide-react';
import { StatCard } from '@/components/placement/StatCard';
import { MatchBadge } from '@/components/placement/MatchBadge';
import { DeadlineAlert } from '@/components/placement/DeadlineAlert';
import { ApplicationTimeline } from '@/components/placement/ApplicationTimeline';
import { AddApplicationModal } from '@/components/placement/AddApplicationModal';
import { AddTaskModal } from '@/components/placement/AddTaskModal';
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
    applyToOpportunity,
    addApplication,
    addTask,
    isLoading,
  } = usePlacement();

  const [isAddAppOpen, setIsAddAppOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedAssistantOpp, setSelectedAssistantOpp] = useState<ApplicationAssistantOpportunity | null>(null);

  // Active highlighted application for pipeline widget
  const activeApp =
    applications.find((a) => a.status === 'INTERVIEW' || a.status === 'SHORTLISTED') ||
    applications[0];

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="text-sm font-medium text-gray-500">Loading your dashboard...</p>
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
            Welcome Back, {user?.name?.split(' ')[0] || 'Alex'} 👋
          </h1>
          <p className="text-base text-gray-500 mt-1">
            Continue building your placement journey.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddAppOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Add Application
          </button>
        </div>
      </motion.div>

      {/* Deadline Intelligence Alert Bar */}
      <DeadlineAlert
        type="application_deadline"
        message="⚠ Application deadline tomorrow for Infosys Software Engineering Intern"
        subtext="Deadline: Aug 12, 2026 • 2 days remaining to complete assessment."
      />

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Profile Completion"
          value={`${stats.profileCompletionPct}%`}
          icon={User}
          color="text-indigo-600"
          bg="bg-indigo-50"
          index={0}
        />
        <StatCard
          label="Resume Score"
          value={`${stats.resumeScorePct}%`}
          icon={FileText}
          color="text-emerald-600"
          bg="bg-emerald-50"
          index={1}
        />
        <StatCard
          label="Applications"
          value={stats.totalApplications}
          icon={Briefcase}
          color="text-blue-600"
          bg="bg-blue-50"
          subtitle={`${stats.activeApplications} active drives`}
          index={2}
        />
        <StatCard
          label="Upcoming Deadlines"
          value={stats.upcomingInterviewsCount + stats.upcomingTasksCount}
          icon={Clock}
          color="text-rose-600"
          bg="bg-rose-50"
          subtitle="Interviews & Drive tasks"
          index={3}
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Status Pipeline, Opportunities, Quick Actions */}
        <div className="space-y-8 lg:col-span-2">
          
          {/* Application Status Pipeline Widget */}
          {activeApp && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm"
            >
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Application Progress</h2>
                  <p className="text-xs text-gray-500">Live placement drive pipeline</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-700">
                  {activeApp.companyName} — {activeApp.position}
                </span>
              </div>

              <ApplicationTimeline timeline={activeApp.timeline} status={activeApp.status} />

              <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-xs font-medium text-gray-500">
                  Next Step: <strong className="text-gray-900">{activeApp.nextAction || 'Awaiting update'}</strong>
                </span>
                <Link
                  href="/applications"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  Manage All Applications →
                </Link>
              </div>
            </motion.div>
          )}

          {/* Recommended Opportunities with Proactive Match Engine */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Recommended Opportunities</h2>
                <p className="text-xs text-gray-500 mt-0.5">Matched against your CGPA (8.2) & Skills (Java, Python, SQL, React)</p>
              </div>
              <Link href="/applications" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                View All →
              </Link>
            </div>

            <div className="space-y-4">
              {opportunities.map((opp) => (
                <MatchBadge
                  key={opp.id}
                  opportunity={opp}
                  onApply={() => setSelectedAssistantOpp(opp as any)}
                  onView={() => setSelectedAssistantOpp(opp as any)}
                />
              ))}
            </div>
          </motion.div>

          {/* Quick Actions Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm"
          >
            <h2 className="mb-6 text-lg font-bold text-gray-900">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Link
                href="/dashboard/student/opportunities"
                className="flex flex-col items-center justify-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-6 text-center transition-all hover:border-indigo-300 hover:bg-indigo-100"
              >
                <Briefcase className="h-6 w-6 text-indigo-600" />
                <span className="text-sm font-bold text-indigo-900">Opportunities Hub</span>
              </Link>

              <button
                onClick={() => setIsAddAppOpen(true)}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-6 text-center transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
              >
                <PlusCircle className="h-6 w-6 text-gray-500 transition-colors group-hover:text-indigo-600" />
                <span className="text-sm font-semibold text-gray-700">Add Application</span>
              </button>

              <button
                onClick={() => setIsAddTaskOpen(true)}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-6 text-center transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
              >
                <CheckSquare className="h-6 w-6 text-gray-500 transition-colors group-hover:text-indigo-600" />
                <span className="text-sm font-semibold text-gray-700">Add Task</span>
              </button>

              <Link
                href="/dashboard/student/opportunity-history"
                className="flex flex-col items-center justify-center gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-6 text-center transition-all hover:border-amber-300 hover:bg-amber-100"
              >
                <Trophy className="h-6 w-6 text-amber-600" />
                <span className="text-sm font-bold text-amber-900">Opportunity History</span>
              </Link>

              <Link
                href="/resume"
                className="flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-6 text-center transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
              >
                <Upload className="h-6 w-6 text-gray-500 transition-colors group-hover:text-indigo-600" />
                <span className="text-sm font-semibold text-gray-700">Upload Resume</span>
              </Link>

              <Link
                href="/profile"
                className="flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-6 text-center transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
              >
                <User className="h-6 w-6 text-gray-500 transition-colors group-hover:text-indigo-600" />
                <span className="text-sm font-semibold text-gray-700">Edit Profile</span>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Today's Tasks, Recent Activity, Upcoming Events */}
        <div className="space-y-8">
          
          {/* Today's Tasks Widget */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Today's Tasks</h2>
              <Link href="/tasks" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                View All ({tasks.length}) →
              </Link>
            </div>
            <div className="space-y-3">
              {tasks.slice(0, 4).map((task) => (
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
                    <span
                      className={`text-sm font-semibold block ${
                        task.completed ? 'text-gray-400 line-through' : 'text-gray-800'
                      }`}
                    >
                      {task.title}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">{task.category} • Due: {task.dueDate}</span>
                  </div>
                </label>
              ))}
            </div>
          </motion.div>

          {/* Live Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
            </div>
            <div className="relative pl-2">
              <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gray-100" />
              <div className="space-y-6">
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

          {/* Upcoming Placement Events */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <h2 className="mb-6 text-lg font-bold text-gray-900">Upcoming Events</h2>
            <div className="space-y-4">
              {interviews.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-start gap-4 rounded-xl border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{evt.companyName} {evt.round}</h3>
                    <p className="text-xs font-medium text-indigo-600 mt-1">{evt.date} at {evt.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      <AddApplicationModal
        isOpen={isAddAppOpen}
        onClose={() => setIsAddAppOpen(false)}
        onSave={addApplication}
      />

      <AddTaskModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        onSave={addTask}
      />

      <ApplicationAssistantModal
        isOpen={!!selectedAssistantOpp}
        onClose={() => setSelectedAssistantOpp(null)}
        opportunity={selectedAssistantOpp}
      />
    </div>
  );
}
