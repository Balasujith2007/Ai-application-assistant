'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import Link from 'next/link';
import {
  Building2, Users, Mail, Loader2, UserCheck, ChevronRight, PlusCircle,
} from 'lucide-react';

interface Mentor {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  department: string;
  assignedStudentsCount: number;
  assignedStudents: { id: string; name: string; email: string }[];
}

export default function HODMentorsPage() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMentors = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/hod/mentors', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMentors(res.data.data);
    } catch {
      setError('Failed to load mentors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMentors();
  }, [fetchMentors]);

  return (
    <div className="space-y-6 pb-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-indigo-600" /> Department Mentors
          </h1>
          <p className="text-sm text-gray-500 mt-1">Faculty mentors and student assignment workload</p>
        </div>
        <Link
          href="/dashboard/hod/assign-mentor"
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm transition-colors"
        >
          <PlusCircle className="h-4 w-4" /> Assign Students
        </Link>
      </motion.div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : mentors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
          No mentors found in the department.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {mentors.map((m) => (
            <div
              key={m.id}
              className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-lg font-bold text-emerald-700">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-base">{m.name}</p>
                    <p className="text-xs font-mono text-indigo-600">{m.employeeId}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-6">
                  <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" /> {m.email}</p>
                  <p className="flex items-center gap-2"><Building2 className="h-4 w-4 text-gray-400" /> {m.department}</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-500 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-gray-400" /> Assigned Students:
                  </span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full text-xs">
                    {m.assignedStudentsCount} students
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
