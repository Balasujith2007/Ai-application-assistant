'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Building2,
  Briefcase,
  TrendingUp,
  Award,
  Calendar,
  Download,
  PlusCircle,
  FileSpreadsheet,
  PieChart as PieChartIcon,
  CheckCircle2,
  Banknote,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Dummy Data for Recharts
const monthlyApplications = [
  { name: 'Aug', apps: 120 },
  { name: 'Sep', apps: 400 },
  { name: 'Oct', apps: 800 },
  { name: 'Nov', apps: 1200 },
  { name: 'Dec', apps: 600 },
  { name: 'Jan', apps: 300 },
];

const departmentPlacement = [
  { name: 'CSE', placed: 400, total: 450 },
  { name: 'IT', placed: 350, total: 400 },
  { name: 'ECE', placed: 280, total: 350 },
  { name: 'EEE', placed: 150, total: 200 },
  { name: 'MECH', placed: 90, total: 150 },
];

const offerDistribution = [
  { name: 'Super Dream (>10L)', value: 120 },
  { name: 'Dream (5L - 10L)', value: 350 },
  { name: 'Core (3L - 5L)', value: 500 },
];
const PIE_COLORS = ['#4f46e5', '#0ea5e9', '#10b981'];

export default function PlacementDashboard() {
  const stats = [
    { label: 'Total Students', value: '1,550', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Placed Students', value: '1,270', icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Placement %', value: '82%', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Partner Companies', value: '145', icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Highest Package', value: '₹ 42 LPA', icon: Banknote, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Average Package', value: '₹ 6.5 LPA', icon: Banknote, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Offers Released', value: '1,890', icon: Briefcase, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Upcoming Drives', value: '12', icon: Calendar, color: 'text-sky-600', bg: 'bg-sky-50' },
  ];

  const recentDrives = [
    { company: 'Zoho Corporation', role: 'Software Engineer', eligible: 800, applied: 650, selected: 45, status: 'Completed' },
    { company: 'TCS Digital', role: 'System Engineer', eligible: 1200, applied: 1100, selected: 150, status: 'Completed' },
    { company: 'Amazon', role: 'SDE-1', eligible: 150, applied: 120, selected: 5, status: 'Completed' },
  ];

  const studentOverview = [
    { name: 'Pranav M', dept: 'CSE', cgpa: '9.2', resumeScore: '95%', apps: 12, status: 'Placed' },
    { name: 'Rahul K', dept: 'IT', cgpa: '8.5', resumeScore: '88%', apps: 8, status: 'Unplaced' },
    { name: 'Sneha R', dept: 'ECE', cgpa: '9.0', resumeScore: '92%', apps: 15, status: 'Placed' },
    { name: 'Arjun S', dept: 'MECH', cgpa: '7.8', resumeScore: '75%', apps: 4, status: 'Unplaced' },
  ];

  const upcomingDrives = [
    { company: 'Freshworks', date: 'Oct 15, 2026', eligibility: 'CSE/IT, >8 CGPA', package: '14 LPA' },
    { company: 'Cognizant GenC', date: 'Oct 20, 2026', eligibility: 'All Branches', package: '4 LPA' },
    { company: 'Atlassian', date: 'Nov 02, 2026', eligibility: 'CSE, >9 CGPA', package: '38 LPA' },
  ];

  const quickActions = [
    { title: 'Add Company', icon: Building2 },
    { title: 'Schedule Drive', icon: Calendar },
    { title: 'Upload Results', icon: PlusCircle },
    { title: 'Export Reports', icon: Download },
    { title: 'Generate Analytics', icon: PieChartIcon },
    { title: 'Manage Students', icon: Users },
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
          Placement Management Dashboard
        </h1>
        <p className="text-lg text-gray-500">
          Monitor complete placement statistics across the institution.
        </p>
      </motion.div>

      {/* Stats Cards (8 Cards) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{stat.label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Analytics Section (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Department-wise Placement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-6">Department-wise Placement</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentPlacement} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <RechartsTooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="placed" name="Placed Students" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Applications per Month (Trend) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-6">Applications Trend</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyApplications} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="apps" name="Total Applications" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="space-y-8 lg:col-span-2">
          {/* Recent Placement Drives */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm overflow-hidden"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Recent Placement Drives</h2>
              <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View All →</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500">
                    <th className="pb-3 font-medium">Company</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Eligible</th>
                    <th className="pb-3 font-medium">Applied</th>
                    <th className="pb-3 font-medium">Selected</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentDrives.map((drive, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 font-semibold text-gray-900">{drive.company}</td>
                      <td className="py-4 text-gray-600">{drive.role}</td>
                      <td className="py-4 text-gray-600">{drive.eligible}</td>
                      <td className="py-4 text-gray-600">{drive.applied}</td>
                      <td className="py-4 font-bold text-emerald-600">{drive.selected}</td>
                      <td className="py-4">
                        <span className="inline-flex rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                          {drive.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Student Overview Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm overflow-hidden"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Student Overview</h2>
              <div className="flex gap-2">
                <input type="text" placeholder="Search student..." className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-500" />
                <button className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200">Filter</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500">
                    <th className="pb-3 font-medium">Student</th>
                    <th className="pb-3 font-medium">Dept</th>
                    <th className="pb-3 font-medium">CGPA</th>
                    <th className="pb-3 font-medium">Resume Score</th>
                    <th className="pb-3 font-medium">Apps</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {studentOverview.map((student, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 font-semibold text-gray-900">{student.name}</td>
                      <td className="py-3 text-gray-600">{student.dept}</td>
                      <td className="py-3 text-gray-900 font-medium">{student.cgpa}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: student.resumeScore }}></div>
                          </div>
                          <span className="text-xs font-bold text-gray-700">{student.resumeScore}</span>
                        </div>
                      </td>
                      <td className="py-3 text-gray-600">{student.apps}</td>
                      <td className="py-3">
                        <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          student.status === 'Placed' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {student.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          
          {/* Quick Actions Grid */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <h2 className="mb-6 text-lg font-bold text-gray-900">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-4 text-center transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 group"
                >
                  <action.icon className="h-5 w-5 text-gray-400 transition-colors group-hover:text-indigo-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 group-hover:text-indigo-700">{action.title}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Upcoming Company Drives */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Upcoming Drives</h2>
              <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">See Calendar</button>
            </div>
            <div className="space-y-4">
              {upcomingDrives.map((drive, idx) => (
                <div key={idx} className="flex items-start gap-4 rounded-xl border border-gray-100 p-4 transition-colors hover:border-indigo-50 hover:bg-indigo-50/30">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-gray-900">{drive.company}</h3>
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">{drive.package}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{drive.eligibility}</p>
                    <p className="text-xs font-medium text-indigo-600 mt-1">{drive.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Offer Distribution Pie Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <h2 className="mb-2 text-lg font-bold text-gray-900">Offer Distribution</h2>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={offerDistribution}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {offerDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {offerDistribution.map((entry, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index] }} />
                  <span className="text-[10px] font-bold text-gray-500">{entry.name}</span>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
