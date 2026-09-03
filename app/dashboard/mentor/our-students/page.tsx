'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Link from 'next/link';
import {
  Search, Users, Eye, Loader2, UserX, RefreshCw, AlertTriangle, Info, X, Mail
} from 'lucide-react';

interface ClassStudent {
  id: string;
  userId: string;
  name: string;
  email: string;
  registerNo: string;
  department: string;
  year: number;
  section: string;
  isAssigned: boolean;
}

export default function OurStudentsPage() {
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [configuredMessage, setConfiguredMessage] = useState<string | null>(null);
  const [selectedBasicInfoStudent, setSelectedBasicInfoStudent] = useState<ClassStudent | null>(null);

  const fetchOurStudents = useCallback(async (q = '') => {
    setLoading(true);
    setError('');
    setConfiguredMessage(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/mentor/our-students?search=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudents(res.data.data || []);
      if (res.data.configured === false || res.data.message) {
        setConfiguredMessage(res.data.message || null);
      }
    } catch {
      setError('Unable to load students.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOurStudents();
  }, [fetchOurStudents]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOurStudents(search);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-kit-600" /> Our Students ({loading ? '...' : students.length})
          </h1>
          <p className="text-sm text-gray-500 mt-1">All students in your class</p>
        </div>
        <button
          onClick={() => fetchOurStudents(search)}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
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
              fetchOurStudents(val);
            }}
            placeholder="Search by name or register number..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-kit-500 focus:outline-none focus:ring-2 focus:ring-kit-200"
          />
        </div>
        <button type="submit" className="rounded-xl bg-kit-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-kit-700 shadow-sm transition-colors">
          Search
        </button>
      </form>

      {/* Main Content */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
          <p className="text-sm text-gray-500 font-medium">Loading students...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
          <div className="flex justify-center text-red-500">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            onClick={() => fetchOurStudents(search)}
            className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      ) : students.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center px-4">
          <UserX className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-lg font-semibold text-gray-700">
            Our Students (0)
          </p>
          <p className="text-sm text-gray-400 mt-1 max-w-md whitespace-pre-line">
            {configuredMessage || 'No students found in your class.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr className="text-gray-500">
                <th className="px-6 py-4 text-left font-semibold w-12">S.No</th>
                <th className="px-6 py-4 text-left font-semibold">Student Name</th>
                <th className="px-6 py-4 text-left font-semibold">Email</th>
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
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-gray-400" />{s.email}</span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs font-bold text-kit-700">{s.registerNo}</td>
                  <td className="px-6 py-4 hidden md:table-cell text-gray-600 text-xs">
                    {s.department}
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell text-gray-900 font-semibold text-xs">
                    {s.year}
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell text-gray-900 font-semibold text-xs">
                    {s.section}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {s.isAssigned ? (
                      <Link
                        href={`/dashboard/mentor/students/${s.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-kit-300 hover:text-kit-700 shadow-sm transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" /> View Profile
                      </Link>
                    ) : (
                      <button
                        onClick={() => setSelectedBasicInfoStudent(s)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:text-gray-900 shadow-sm transition-colors"
                      >
                        <Info className="h-3.5 w-3.5 text-gray-400" /> View Basic Info
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Basic Info Modal for Unassigned Class Students */}
      <AnimatePresence>
        {selectedBasicInfoStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-100 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Info className="h-5 w-5 text-kit-600" /> Student Basic Info
                </h3>
                <button
                  onClick={() => setSelectedBasicInfoStudent(null)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-kit-100 text-xl font-bold text-kit-700">
                  {selectedBasicInfoStudent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">{selectedBasicInfoStudent.name}</h4>
                  <p className="text-xs font-mono font-semibold text-kit-600">Reg: {selectedBasicInfoStudent.registerNo}</p>
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-4 space-y-3 text-xs border border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Email</span>
                  <span className="font-semibold text-gray-900">{selectedBasicInfoStudent.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Department</span>
                  <span className="font-semibold text-gray-900">{selectedBasicInfoStudent.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Year</span>
                  <span className="font-semibold text-gray-900">Year {selectedBasicInfoStudent.year}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Section</span>
                  <span className="font-semibold text-gray-900">Section {selectedBasicInfoStudent.section}</span>
                </div>
              </div>

              <p className="text-xs text-gray-400 italic text-center">
                This student belongs to your class directory. Full profile access is restricted to the assigned mentor.
              </p>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedBasicInfoStudent(null)}
                  className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
