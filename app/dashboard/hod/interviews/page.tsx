'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Calendar, Loader2, Clock } from 'lucide-react';

interface Interview {
  id: string;
  companyName: string;
  role: string;
  type: string;
  date: string;
  time: string | null;
  user: {
    name: string;
    email: string;
    profile: { registerNo: string } | null;
    mentor: { name: string } | null;
  };
}

export default function HODInterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchInterviews = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/hod/interviews', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInterviews(res.data.data);
      setUpcomingCount(res.data.upcomingCount);
      setCompletedCount(res.data.completedCount);
    } catch {
      console.error('Failed to load interviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  return (
    <div className="space-y-6 pb-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="h-6 w-6 text-indigo-600" /> Department Interviews
        </h1>
        <p className="text-sm text-gray-500 mt-1">Department-wide interview scheduling and results</p>
      </motion.div>

      <div className="flex gap-4">
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm">
          Upcoming: <strong className="text-indigo-600 ml-1">{upcomingCount}</strong>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm">
          Completed: <strong className="text-emerald-600 ml-1">{completedCount}</strong>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : interviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
          No interviews scheduled yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {interviews.map((i) => (
            <div key={i.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900">{i.companyName}</span>
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                  {i.type.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-600">{i.role}</p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Student: <strong className="text-gray-900">{i.user.name}</strong> ({i.user.profile?.registerNo || '—'})</p>
                <p className="flex items-center gap-1 text-indigo-600 font-medium">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(i.date).toLocaleDateString()} {i.time ? `· ${i.time}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
