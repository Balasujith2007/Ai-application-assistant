'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import Link from 'next/link';
import {
  Search, Users, Mail, Eye, Loader2, UserX, RefreshCw, AlertTriangle,
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
  registerNo: string;
  department: string | null;
  year: number | null;
  section: string | null;
  college: string | null;
  phone: string | null;
}

export default function MentorStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchStudents = useCallback(async (q = '') => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/mentor/students?search=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudents(res.data.data);
    } catch {
      setError('Unable to load students.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents(search);
  };

  return (
    <div className="space-y-6 pb-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-kit-600" /> My Students ({loading ? '...' : students.length})
          </h1>
          <p className="text-sm text-gray-500 mt-1">Complete class student directory</p>
        </div>
        <button
          onClick={() => fetchStudents(search)}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </motion.div>

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              const val = e.target.value;
              setSearch(val);
              fetchStudents(val);
            }}
            placeholder="Search by name or register number (e.g. AKILAN, 711524BAD008, BALASUJITH)..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-200"
          />
        </div>
        <button type="submit" className="rounded-xl bg-kit-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-kit-700 shadow-sm transition-colors">
          Search
        </button>
      </form>

      {/* Main Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
          <div className="flex justify-center text-red-500">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            onClick={() => fetchStudents(search)}
            className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : students.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center">
          <UserX className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-lg font-semibold text-gray-700">
            {search ? 'No students found' : 'No Students Assigned'}
          </p>
          <p className="text-sm text-gray-400 mt-1 whitespace-pre-line">
            {search
              ? 'No student records match your query.'
              : 'Students assigned to you by the HOD\nwill appear here.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr className="text-gray-500">
                <th className="px-6 py-4 text-left font-semibold w-12">No.</th>
                <th className="px-6 py-4 text-left font-semibold">Student Name</th>
                <th className="px-6 py-4 text-left font-semibold">Register Number</th>
                <th className="px-6 py-4 text-left font-semibold hidden md:table-cell">Department</th>
                <th className="px-6 py-4 text-left font-semibold hidden sm:table-cell">Year</th>
                <th className="px-6 py-4 text-left font-semibold hidden sm:table-cell">Section</th>
                <th className="px-6 py-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.map((s, index) => (
                <tr key={s.id} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-400 text-xs">{index + 1}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kit-100 text-sm font-bold text-kit-700">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs font-bold text-kit-700">{s.registerNo}</td>
                  <td className="px-6 py-4 hidden md:table-cell text-gray-600 text-xs">
                    {s.department || 'Artificial Intelligence & Data Science'}
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell text-gray-900 font-semibold text-xs">
                    {s.year || 2}
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell text-gray-900 font-semibold text-xs">
                    {s.section || 'A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/mentor/students/${s.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-kit-300 hover:text-kit-700 shadow-sm transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" /> View Profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
