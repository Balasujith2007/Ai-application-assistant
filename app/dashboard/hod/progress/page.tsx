'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { PieChart, Loader2, AlertCircle, CheckCircle, FileText } from 'lucide-react';

interface ProgressData {
  students: {
    id: string;
    name: string;
    registerNo: string;
    mentorName: string;
    hasResume: boolean;
    applicationsCount: number;
    readinessScore: number;
    needsAttention: boolean;
  }[];
  summary: {
    totalStudents: number;
    highReadinessCount: number;
    needingAttentionCount: number;
    noResumeCount: number;
  };
}

export default function HODProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/hod/progress', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data.data);
    } catch {
      console.error('Failed to load progress metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return (
    <div className="space-y-6 pb-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <PieChart className="h-6 w-6 text-indigo-600" /> Career Readiness Progress
        </h1>
        <p className="text-sm text-gray-500 mt-1">Department-wide student career preparedness analytics</p>
      </motion.div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-xs text-gray-500 font-semibold">Total Students</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{data?.summary.totalStudents}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-xs text-emerald-700 font-semibold">High Readiness (&gt;=70%)</p>
              <p className="text-2xl font-bold text-emerald-800 mt-1">{data?.summary.highReadinessCount}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-xs text-amber-700 font-semibold">Needing Attention</p>
              <p className="text-2xl font-bold text-amber-800 mt-1">{data?.summary.needingAttentionCount}</p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <p className="text-xs text-rose-700 font-semibold">Missing Resumes</p>
              <p className="text-2xl font-bold text-rose-800 mt-1">{data?.summary.noResumeCount}</p>
            </div>
          </div>

          {/* Student Table */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/50">
                <tr className="text-gray-500">
                  <th className="px-6 py-4 text-left font-semibold">Student</th>
                  <th className="px-6 py-4 text-left font-semibold">Mentor</th>
                  <th className="px-6 py-4 text-left font-semibold">Resume</th>
                  <th className="px-6 py-4 text-left font-semibold">Applications</th>
                  <th className="px-6 py-4 text-left font-semibold">Readiness Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.students.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{s.registerNo}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-xs">{s.mentorName}</td>
                    <td className="px-6 py-4">
                      {s.hasResume ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle className="h-3.5 w-3.5" /> Uploaded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
                          <AlertCircle className="h-3.5 w-3.5" /> Missing
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-semibold">{s.applicationsCount}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              s.readinessScore >= 70
                                ? 'bg-emerald-500'
                                : s.readinessScore >= 40
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${s.readinessScore}%` }}
                          />
                        </div>
                        <span className="font-bold text-xs text-gray-900">{s.readinessScore}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
