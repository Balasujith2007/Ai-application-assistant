'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  FileText,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  BellRing,
  Send,
  Eye,
  Video,
  ClipboardList,
  Megaphone,
  FileSpreadsheet,
} from 'lucide-react';

export default function MentorDashboard() {
  const { user } = useAuth();

  const stats = [
    { label: 'Assigned Students', value: '120', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Pending Reviews', value: '14', icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Today\'s Interviews', value: '6', icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Upcoming Deadlines', value: '9', icon: Clock, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  const attentionStudents = [
    { name: 'Arjun', issue: 'Resume Missing', priority: 'High' },
    { name: 'Rahul', issue: 'Internship Deadline Tomorrow', priority: 'Medium' },
    { name: 'Priya', issue: 'Interview Scheduled Today', priority: 'High' },
  ];

  const upcomingInterviews = [
    { student: 'Sneha', company: 'Zoho', time: '10:00 AM', status: 'Scheduled' },
    { student: 'Karthik', company: 'TCS', time: '11:30 AM', status: 'Pending Review' },
    { student: 'Priya', company: 'Freshworks', time: '02:00 PM', status: 'Scheduled' },
  ];

  const recentActivity = [
    { title: 'Resume Uploaded', desc: 'Arjun updated his resume', time: '1 hr ago' },
    { title: 'Internship Applied', desc: 'Rahul applied for Zoho', time: '3 hrs ago' },
    { title: 'Interview Scheduled', desc: 'Sneha confirmed slot', time: '5 hrs ago' },
    { title: 'Hackathon Registered', desc: 'Team Alpha registered', time: 'Yesterday' },
    { title: 'Profile Updated', desc: 'Karthik added skills', time: 'Yesterday' },
  ];

  const notifications = [
    'New resume submitted by Arjun',
    'Interview feedback pending for Karthik',
    'Sneha requested guidance',
    'TCS drive announced for next week',
  ];

  const quickActions = [
    { title: 'Review Resume', icon: FileText },
    { title: 'Schedule Interview', icon: Video },
    { title: 'Assign Task', icon: ClipboardList },
    { title: 'Send Announcement', icon: Megaphone },
    { title: 'Generate Report', icon: FileSpreadsheet },
    { title: 'View Student List', icon: Users },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Good Morning, {user?.name?.split(' ')[0] || 'Prof. Kumar'} 👋
        </h1>
        <p className="text-lg text-gray-500">
          Manage students, review resumes, conduct interviews and guide students efficiently.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column (Wider) */}
        <div className="space-y-8 lg:col-span-2">
          
          {/* Students Needing Attention */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm overflow-hidden"
          >
            <h2 className="mb-6 text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-500" /> Students Needing Attention
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500">
                    <th className="pb-3 font-medium">Student Name</th>
                    <th className="pb-3 font-medium">Issue</th>
                    <th className="pb-3 font-medium">Priority</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {attentionStudents.map((student, idx) => (
                    <tr key={idx} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 font-semibold text-gray-900">{student.name}</td>
                      <td className="py-4 text-gray-600">{student.issue}</td>
                      <td className="py-4">
                        <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
                          student.priority === 'High' ? 'bg-rose-50 text-rose-700' : 'bg-orange-50 text-orange-700'
                        }`}>
                          {student.priority}
                        </span>
                      </td>
                      <td className="py-4 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100">
                          <Eye className="h-3 w-3" /> View Profile
                        </button>
                        <button className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-200">
                          <Send className="h-3 w-3" /> Remind
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Upcoming Interviews Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm overflow-hidden"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Upcoming Interviews</h2>
              <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View Calendar →</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500">
                    <th className="pb-3 font-medium">Student</th>
                    <th className="pb-3 font-medium">Company</th>
                    <th className="pb-3 font-medium">Time</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {upcomingInterviews.map((interview, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 font-semibold text-gray-900">{interview.student}</td>
                      <td className="py-4 text-gray-600">{interview.company}</td>
                      <td className="py-4 font-medium text-indigo-600">{interview.time}</td>
                      <td className="py-4">
                        <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
                          interview.status === 'Scheduled' ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-700'
                        }`}>
                          {interview.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <button className="rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50 hover:text-indigo-600">
                          Join
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
          >
            <h2 className="mb-6 text-lg font-bold text-gray-900">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  className="flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-6 text-center transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 group"
                >
                  <action.icon className="h-6 w-6 text-gray-500 transition-colors group-hover:text-indigo-600" />
                  <span className="text-sm font-semibold text-gray-700">{action.title}</span>
                </button>
              ))}
            </div>
          </motion.div>

        </div>

        {/* Right Column (Narrower) */}
        <div className="space-y-8">
          
          {/* Recent Notifications */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <h2 className="mb-6 text-lg font-bold text-gray-900 flex items-center gap-2">
              <BellRing className="h-5 w-5 text-indigo-500" /> Recent Notifications
            </h2>
            <div className="space-y-4">
              {notifications.map((note, idx) => (
                <div key={idx} className="flex items-start gap-3 rounded-lg border border-transparent p-2 transition-colors hover:bg-gray-50">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                  <span className="text-sm font-medium text-gray-700 leading-snug">
                    {note}
                  </span>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full text-center text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              View All Notifications
            </button>
          </motion.div>

          {/* Recent Activity Timeline */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Recent Activities</h2>
            </div>
            <div className="relative pl-2">
              <div className="absolute left-[11px] top-4 bottom-4 w-px bg-gray-100" />
              <div className="space-y-6">
                {recentActivity.map((activity, idx) => (
                  <div key={idx} className="relative flex gap-4">
                    <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 ring-4 ring-white">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col pt-0.5">
                      <span className="text-sm font-bold text-gray-900">{activity.title}</span>
                      <span className="text-xs text-gray-500">{activity.desc}</span>
                      <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">{activity.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
