'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { FileText, Search, Loader2, Download, Eye } from 'lucide-react';

interface ResumeData {
  id: string;
  studentName: string;
  registerNo: string;
  department: string;
  year: number;
  section: string;
  mentorName: string;
  resumeStatus: 'Completed' | 'Needs Review' | 'Missing';
  fileName: string | null;
  fileUrl: string | null;
  uploadedAt: string | null;
  reviewFeedback: string | null;
}

export default function HODResumesPage() {
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, needsReview: 0, missing: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const fetchResumes = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/hod/resumes', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setResumes(res.data.data);
        setStats(res.data.stats);
      } catch (err) {
        console.error('Failed to load HOD resumes data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResumes();
  }, []);

  const filteredResumes = resumes.filter((r) => {
    const matchesSearch =
      r.studentName.toLowerCase().includes(search.toLowerCase()) ||
      r.registerNo.toLowerCase().includes(search.toLowerCase()) ||
      r.mentorName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.resumeStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-6 w-6 text-indigo-600" /> Department Resume Management
        </h1>
        <p className="text-sm text-gray-500 mt-1">Track resume submissions and mentor review status across the department</p>
      </motion.div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-gray-400">Total Students</span>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-emerald-600">Reviewed / Completed</span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.completed}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-amber-600">Needs Review</span>
              <p className="text-2xl font-bold text-amber-700 mt-1">{stats.needsReview}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-rose-600">Missing Resumes</span>
              <p className="text-2xl font-bold text-rose-700 mt-1">{stats.missing}</p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student, register number, or mentor..."
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="Completed">Completed / Reviewed</option>
              <option value="Needs Review">Needs Review</option>
              <option value="Missing">Missing</option>
            </select>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/50 text-gray-500">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Register No</th>
                  <th className="px-6 py-4 text-left font-semibold">Student Name</th>
                  <th className="px-6 py-4 text-left font-semibold">Assigned Mentor</th>
                  <th className="px-6 py-4 text-left font-semibold">Resume Status</th>
                  <th className="px-6 py-4 text-left font-semibold">File Name</th>
                  <th className="px-6 py-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredResumes.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-700">{r.registerNo}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{r.studentName}</td>
                    <td className="px-6 py-4 text-gray-600">{r.mentorName}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          r.resumeStatus === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.resumeStatus === 'Needs Review'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {r.resumeStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs truncate max-w-xs">
                      {r.fileName || 'No file uploaded'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {r.fileUrl ? (
                        <a
                          href={r.fileUrl.startsWith('/api/resumes/') ? r.fileUrl : `/api/resumes/${r.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 shadow-sm transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" /> View Resume
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400 italic">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
