'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { PieChart, Loader2, CheckCircle, AlertCircle, FileText, Briefcase } from 'lucide-react';

interface StudentProgress {
  id: string;
  name: string;
  email: string;
  department: string | null;
  hasResume: boolean;
  resumeStatus: string | null;
  latestApplication: string | null;
}

export default function MentorProgressPage() {
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/mentor/students', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudents(res.data.data);
    } catch {
      console.error('Failed to load mentor student progress');
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
          <PieChart className="h-6 w-6 text-indigo-600" /> Assigned Student Progress
        </h1>
        <p className="text-sm text-gray-500 mt-1">Track resume status, applications, and preparation readiness for your students</p>
      </motion.div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
          No students currently assigned to you.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((s) => (
            <div key={s.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{s.name}</h3>
                  <p className="text-xs text-gray-400">{s.email}</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-gray-400" /> Resume:</span>
                  {s.hasResume ? (
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {s.resumeStatus || 'REVIEWED'}
                    </span>
                  ) : (
                    <span className="font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                      Not Uploaded
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-gray-400" /> Latest App:</span>
                  <span className="font-medium text-gray-900">{s.latestApplication || 'None'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
