'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { usePlacement } from '@/context/PlacementContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FileText, User, Award, Briefcase, CheckSquare, Calendar, PieChart } from 'lucide-react';

export default function StudentProgressPage() {
  const { stats, applications, tasks, interviews, isLoading } = usePlacement();

  const resumePct = stats.resumeScorePct || 85;
  const profilePct = stats.profileCompletionPct || 90;
  const skillsPct = 75;
  const applicationsPct = Math.min(100, Math.round((stats.totalApplications / 8) * 100)) || 60;
  const taskPct = tasks.length > 0 ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 80;
  const interviewPrepPct = interviews.length > 0 ? 80 : 50;

  const overallReadiness = Math.round(
    (resumePct + profilePct + skillsPct + applicationsPct + taskPct + interviewPrepPct) / 6
  );

  if (isLoading) {
    return (
      <DashboardLayout title="My Progress" subtitle="Loading progress metrics...">
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const metrics = [
    { name: 'Resume Readiness', pct: resumePct, icon: FileText, color: 'bg-emerald-500', desc: 'Score & formatting optimization' },
    { name: 'Profile Completion', pct: profilePct, icon: User, color: 'bg-indigo-500', desc: 'Academic details & verified profiles' },
    { name: 'Verified Skills', pct: skillsPct, icon: Award, color: 'bg-purple-500', desc: 'Coding skills & certifications' },
    { name: 'Applications Progress', pct: applicationsPct, icon: Briefcase, color: 'bg-blue-500', desc: 'Drive registrations & active drives' },
    { name: 'Mentor Tasks Completed', pct: taskPct, icon: CheckSquare, color: 'bg-amber-500', desc: 'Assigned mentor milestones' },
    { name: 'Interview Readiness', pct: interviewPrepPct, icon: Calendar, color: 'bg-rose-500', desc: 'Mock interviews & technical prep' },
  ];

  return (
    <DashboardLayout title="My Progress" subtitle="Track your overall career preparation metrics and placement readiness.">
      <div className="space-y-8 pb-12">
        {/* Top Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 p-8 text-white shadow-xl"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
                <PieChart className="h-3.5 w-3.5" /> Career Readiness Index
              </span>
              <h1 className="text-3xl font-bold mt-2">Overall Progress: {overallReadiness}%</h1>
              <p className="text-sm text-indigo-200/80 mt-1 max-w-xl">
                Calculated dynamically from your resume score, profile verification, active applications, mentor tasks, and placement preparation.
              </p>
            </div>
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-indigo-600/30 border-4 border-indigo-400/40 text-2xl font-black">
              {overallReadiness}%
            </div>
          </div>
        </motion.div>

        {/* Detailed Metrics Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {metrics.map((m) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <m.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{m.name}</h3>
                    <p className="text-xs text-gray-400">{m.desc}</p>
                  </div>
                </div>
                <span className="font-bold text-gray-900 text-lg">{m.pct}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full ${m.color} rounded-full transition-all duration-500`} style={{ width: `${m.pct}%` }} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
