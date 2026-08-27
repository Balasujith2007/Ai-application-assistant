'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  Users, UserCheck, Briefcase, Calendar, PieChart,
  UserX, FileText, RefreshCw, Loader2, Award, Trophy, CheckCircle2, ShieldCheck, Activity
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface RegistrationDetails {
  id: string;
  studentName: string;
  studentEmail: string;
  opportunityTitle: string;
  opportunityType: string;
  status: string;
  registeredAt: string;
}

interface DashboardStats {
  totalStudents: number;
  totalMentors: number;
  totalHODs: number;
  activeUsers: number;
  totalOpportunities: number;
  totalApplications: number;
  registrations: number;
  pendingRegistrations: number;
  recentRegistrations: RegistrationDetails[];
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/super-admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch Super Admin dashboard statistics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
      </div>
    );
  }

  const statCards = stats ? [
    { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-kit-600', bg: 'bg-kit-50' },
    { label: 'Active Mentors', value: stats.totalMentors, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Active HODs', value: stats.totalHODs, icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active System Users', value: stats.activeUsers, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total Opportunities', value: stats.totalOpportunities, icon: Briefcase, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Job Applications', value: stats.totalApplications, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Student Registrations', value: stats.registrations, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending Registrations', value: stats.pendingRegistrations, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
  ] : [];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Super Admin Control Center
          </h1>
          <p className="mt-1 text-gray-500">
            CareerAI platform management & live analytics overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </motion.div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, idx) => (
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

      {/* Recent Registrations Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-900">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Recent Campus Opportunity Registrations
        </h2>
        {!stats?.recentRegistrations || stats.recentRegistrations.length === 0 ? (
          <p className="text-sm text-gray-500">No opportunity registrations recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="pb-3 font-medium">Student Name</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Opportunity Title</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Registered At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.recentRegistrations.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="py-4 font-semibold text-gray-900">{r.studentName}</td>
                    <td className="py-4 text-gray-600">{r.studentEmail}</td>
                    <td className="py-4 text-gray-700">{r.opportunityTitle}</td>
                    <td className="py-4 text-gray-600 font-medium">{r.opportunityType}</td>
                    <td className="py-4">
                      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
                        r.status === 'REGISTERED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-4 text-gray-600 font-medium">
                      {new Date(r.registeredAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
