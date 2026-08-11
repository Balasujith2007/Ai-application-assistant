'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Briefcase, Search, Loader2 } from 'lucide-react';

interface Stats {
  totalStudents: number;
  placedStudents: number;
  internshipApplications: number;
  jobApplications: number;
  totalOpportunities: number;
}

interface ApplicationItem {
  id: string;
  studentName: string;
  registerNo: string;
  department: string | null;
  year: number | null;
  section: string | null;
  companyName: string;
  position: string;
  type: string;
  status: string;
  appliedDate: string | null;
}

export default function HODPlacementsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    const fetchPlacements = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/hod/placements', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const placementData = res.data.data || res.data;
        setStats(placementData.stats);
        setApplications(placementData.applications || []);
      } catch (err) {
        console.error('Failed to load placements data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlacements();
  }, []);

  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      app.studentName.toLowerCase().includes(search.toLowerCase()) ||
      app.registerNo.toLowerCase().includes(search.toLowerCase()) ||
      app.companyName.toLowerCase().includes(search.toLowerCase());

    const matchesType = filterType === 'ALL' || app.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 pb-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-indigo-600" /> Placements & Internships
        </h1>
        <p className="text-sm text-gray-500 mt-1">Department-wide placement metrics, applications, and selections</p>
      </motion.div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-gray-400">Total Department Students</span>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.totalStudents || 0}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-emerald-600">Students Selected / Placed</span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{stats?.placedStudents || 0}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-indigo-600">Internship Applications</span>
              <p className="text-2xl font-bold text-indigo-700 mt-1">{stats?.internshipApplications || 0}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-purple-600">Job Applications</span>
              <p className="text-2xl font-bold text-purple-700 mt-1">{stats?.jobApplications || 0}</p>
            </div>
          </div>

          {/* Filter / Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student, register number, or company..."
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="INTERNSHIP">Internships</option>
              <option value="JOB">Full-Time Jobs</option>
            </select>
          </div>

          {/* Applications Table */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/50 text-gray-500">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Student Name</th>
                  <th className="px-6 py-4 text-left font-semibold">Register No</th>
                  <th className="px-6 py-4 text-left font-semibold">Company</th>
                  <th className="px-6 py-4 text-left font-semibold">Position</th>
                  <th className="px-6 py-4 text-left font-semibold">Type</th>
                  <th className="px-6 py-4 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">
                      No applications recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredApps.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900">{app.studentName}</td>
                      <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-700">{app.registerNo}</td>
                      <td className="px-6 py-4 font-medium text-gray-800">{app.companyName}</td>
                      <td className="px-6 py-4 text-gray-600">{app.position}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-500">{app.type}</td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            app.status === 'SELECTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : app.status === 'APPLIED'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
