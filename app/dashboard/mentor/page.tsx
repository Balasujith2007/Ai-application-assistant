'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import axios from 'axios';
import {
  Users, FileText, Calendar, Clock, AlertCircle, CheckCircle2,
  BellRing, Send, Eye, Loader2, RefreshCw, Briefcase, Trophy
} from 'lucide-react';

interface RegistrationDetails {
  id: string;
  studentName: string;
  opportunityTitle: string;
  opportunityType: string;
  status: string;
  registeredAt: string;
}

interface DashboardData {
  stats: {
    assignedStudents: number;
    ourStudents?: number;
    pendingResumes: number;
    todayInterviews: number;
    upcomingDeadlines: number;
    hackathonRegistrations?: number;
    internshipRegistrations?: number;
    totalRegisteredStudents?: number;
  };
  recentRegistrations?: RegistrationDetails[];
  attentionStudents: { id: string; name: string; email: string; issue: string; priority: string }[];
  upcomingInterviews: { id: string; student: string; company: string; role: string; date: string; time?: string; type: string }[];
  notifications: { id: string; title: string; message: string; isRead: boolean; createdAt: string }[];
  recentActivities: { id: string; title: string; student: string; type: string; createdAt: string }[];
}

export default function MentorDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [reminderSuccess, setReminderSuccess] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/mentor/dashboard', { headers: { Authorization: `Bearer ${token}` } });
      setData(res.data.data);
    } catch {
      setError('Failed to load dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleRemind = async (studentId: string, studentName: string) => {
    setRemindingId(studentId);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/mentor/students/${studentId}/remind`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setReminderSuccess(`Reminder sent to ${studentName}!`);
      setTimeout(() => setReminderSuccess(''), 3000);
    } catch {
      setReminderSuccess('Failed to send reminder.');
    } finally {
      setRemindingId(null);
    }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const stats = data ? [
    { label: 'Assigned Students', value: data.stats.assignedStudents, icon: Users, color: 'text-kit-600', bg: 'bg-kit-50', href: '/dashboard/mentor/students' },
    { label: 'Our Students', value: data.stats.ourStudents ?? 0, icon: Users, color: 'text-sky-600', bg: 'bg-sky-50', href: '/dashboard/mentor/our-students' },
    { label: 'Pending Reviews', value: data.stats.pendingResumes, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50', href: '/dashboard/mentor/resumes' },
    { label: "Today's Interviews", value: data.stats.todayInterviews, icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Upcoming Deadlines', value: data.stats.upcomingDeadlines, icon: Clock, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Hackathon Registrations', value: data.stats.hackathonRegistrations || 0, icon: Trophy, color: 'text-kit-600', bg: 'bg-kit-50' },
    { label: 'Internship Registrations', value: data.stats.internshipRegistrations || 0, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Registered Students', value: data.stats.totalRegisteredStudents || 0, icon: CheckCircle2, color: 'text-teal-600', bg: 'bg-teal-50' },
  ] : [];

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {reminderSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {reminderSuccess}
        </div>
      )}

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {greeting()}, {user?.name?.split(' ')[0] || 'Mentor'} 👋
          </h1>
          <p className="mt-1 text-gray-500">Manage students, review resumes, and guide them efficiently.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/mentor/opportunities">
            <button className="flex items-center gap-2 rounded-xl bg-kit-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-kit-700 transition-colors">
              <Briefcase className="h-4 w-4" /> My Opportunities
            </button>
          </Link>
          <button onClick={fetchDashboard} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </motion.div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => {
          const CardContent = (
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          );
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              {stat.href ? <Link href={stat.href}>{CardContent}</Link> : CardContent}
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-8 lg:col-span-2">
          {/* Students Needing Attention */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-900">
              <AlertCircle className="h-5 w-5 text-rose-500" /> Students Needing Attention
            </h2>
            {data?.attentionStudents?.length === 0 ? (
              <p className="text-sm text-gray-500">All students are on track. No immediate attention needed.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500">
                      <th className="pb-3 font-medium">Student</th>
                      <th className="pb-3 font-medium">Issue</th>
                      <th className="pb-3 font-medium">Priority</th>
                      <th className="pb-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data?.attentionStudents?.map((s) => (
                      <tr key={s.id} className="group transition-colors hover:bg-gray-50/50">
                        <td className="py-4 font-semibold text-gray-900">{s.name}</td>
                        <td className="py-4 text-gray-600">{s.issue}</td>
                        <td className="py-4">
                          <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${s.priority === 'High' ? 'bg-rose-50 text-rose-700' : 'bg-orange-50 text-orange-700'}`}>
                            {s.priority}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <Link href={`/dashboard/mentor/students`}
                              className="flex items-center gap-1 rounded bg-kit-50 px-2 py-1 text-xs font-bold text-kit-700 hover:bg-kit-100">
                              <Eye className="h-3 w-3" /> View
                            </Link>
                            <button
                              onClick={() => handleRemind(s.id, s.name)}
                              disabled={remindingId === s.id}
                              className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-200 disabled:opacity-60">
                              {remindingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Remind
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* Registered Student Activity / Details */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Registered Student Activity
            </h2>
            {!data?.recentRegistrations || data.recentRegistrations.length === 0 ? (
              <p className="text-sm text-gray-500">No registered student activity yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500">
                      <th className="pb-3 font-medium">Student Name</th>
                      <th className="pb-3 font-medium">Opportunity Name</th>
                      <th className="pb-3 font-medium">Opportunity Type</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Registration Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.recentRegistrations.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/50">
                        <td className="py-4 font-semibold text-gray-900">{r.studentName}</td>
                        <td className="py-4 text-gray-700">{r.opportunityTitle}</td>
                        <td className="py-4 text-gray-600 font-medium">{r.opportunityType}</td>
                        <td className="py-4">
                          <span className="inline-flex rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
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

          {/* Upcoming Interviews */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Upcoming Interviews</h2>
              <Link href="/dashboard/mentor/interviews" className="text-sm font-medium text-kit-600 hover:text-kit-700">View All →</Link>
            </div>
            {data?.upcomingInterviews?.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming interviews scheduled.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500">
                      <th className="pb-3 font-medium">Student</th>
                      <th className="pb-3 font-medium">Company</th>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Time</th>
                      <th className="pb-3 font-medium">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data?.upcomingInterviews?.map((i) => (
                      <tr key={i.id} className="hover:bg-gray-50/50">
                        <td className="py-4 font-semibold text-gray-900">{i.student}</td>
                        <td className="py-4 text-gray-600">{i.company}</td>
                        <td className="py-4 font-medium text-kit-600">{new Date(i.date).toLocaleDateString()}</td>
                        <td className="py-4 text-gray-600">{i.time || '—'}</td>
                        <td className="py-4">
                          <span className="inline-flex rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                            {i.type.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Recent Notifications */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-900">
              <BellRing className="h-5 w-5 text-kit-500" /> Recent Notifications
            </h2>
            {data?.notifications?.length === 0 ? (
              <p className="text-sm text-gray-500">No new notifications.</p>
            ) : (
              <div className="space-y-3">
                {data?.notifications?.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50">
                    <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-gray-300' : 'bg-kit-500'}`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                      <p className="text-xs text-gray-500">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Recent Activity */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-lg font-bold text-gray-900">Recent Activities</h2>
            {data?.recentActivities?.length === 0 ? (
              <p className="text-sm text-gray-500">No recent student activity.</p>
            ) : (
              <div className="relative pl-2">
                <div className="absolute bottom-4 left-[11px] top-4 w-px bg-gray-100" />
                <div className="space-y-5">
                  {data?.recentActivities?.map((a) => (
                    <div key={a.id} className="relative flex gap-4">
                      <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 ring-4 ring-white">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col pt-0.5">
                        <span className="text-sm font-bold text-gray-900">{a.title}</span>
                        <span className="text-xs text-gray-500">by {a.student}</span>
                        <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          {new Date(a.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
