'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  Users, UserCheck, Briefcase, Calendar, PieChart,
  UserX, FileText, RefreshCw, Loader2, Award,
} from 'lucide-react';

interface DashboardData {
  totalStudents: number;
  totalMentors: number;
  activeApplications: number;
  upcomingInterviews: number;
  unassignedStudents: number;
  studentsWithResumesCount: number;
  yearDistribution: { year: string; total: number }[];
  sectionDistribution: { section: string; total: number }[];
}

export default function HODDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/hod/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data.data);
    } catch {
      setError('Failed to load HOD dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const stats = data ? [
    { label: 'Total Dept. Students', value: data.totalStudents, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Active Mentors', value: data.totalMentors, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Active Applications', value: data.activeApplications, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Upcoming Interviews', value: data.upcomingInterviews, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Unassigned Students', value: data.unassignedStudents, icon: UserX, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Resumes Uploaded', value: data.studentsWithResumesCount, icon: FileText, color: 'text-rose-600', bg: 'bg-rose-50' },
  ] : [];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            HOD Department Dashboard
          </h1>
          <p className="mt-1 text-gray-500">
            Department of Artificial Intelligence & Data Science overview
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </motion.div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Analytics Distributions */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Year Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-900">
            <PieChart className="h-5 w-5 text-indigo-600" /> Year-wise Student Distribution
          </h2>
          <div className="space-y-4">
            {data?.yearDistribution.map((y) => {
              const pct = data.totalStudents > 0 ? Math.round((y.total / data.totalStudents) * 100) : 0;
              return (
                <div key={y.year}>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span className="text-gray-700">{y.year}</span>
                    <span className="text-gray-900 font-bold">{y.total} students ({pct}%)</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-indigo-600 transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Section Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-900">
            <Award className="h-5 w-5 text-emerald-600" /> Section Distribution & Readiness
          </h2>
          <div className="space-y-4">
            {data?.sectionDistribution.map((s) => {
              const pct = data.totalStudents > 0 ? Math.round((s.total / data.totalStudents) * 100) : 0;
              return (
                <div key={s.section}>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span className="text-gray-700">{s.section}</span>
                    <span className="text-gray-900 font-bold">{s.total} students ({pct}%)</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
