'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  Search, Users, Mail, Building2, UserPlus, UserX, Loader2, X, Check,
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
  registerNo: string;
  department: string;
  year: number | null;
  section: string | null;
  assignedMentor: { id: string; name: string } | null;
  hasResume: boolean;
  resumeStatus: string;
  applicationsCount: number;
}

interface Mentor {
  id: string;
  name: string;
  employeeId: string;
  assignedStudentsCount: number;
}

export default function HODStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [mentorFilter, setMentorFilter] = useState('');
  const [toast, setToast] = useState('');

  // Assign modal state
  const [assignStudent, setAssignStudent] = useState<Student | null>(null);
  const [selectedMentorId, setSelectedMentorId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const [studRes, mentRes] = await Promise.all([
        axios.get(`/api/hod/students?search=${search}&year=${yearFilter}&section=${sectionFilter}&mentorId=${mentorFilter}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('/api/hod/mentors', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setStudents(studRes.data.data);
      setMentors(mentRes.data.data);
    } catch {
      setError('Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, [search, yearFilter, sectionFilter, mentorFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignStudent || !selectedMentorId) return;
    setAssigning(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        '/api/hod/assign-mentor',
        { studentId: assignStudent.id, mentorId: selectedMentorId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setToast(`Assigned ${assignStudent.name} successfully!`);
      setAssignStudent(null);
      fetchData();
    } catch {
      setToast('Failed to assign mentor.');
    } finally {
      setAssigning(false);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const handleUnassign = async (studentId: string, studentName: string) => {
    if (!confirm(`Remove mentor assignment from ${studentName}?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/hod/assign-mentor?studentId=${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setToast(`Unassigned mentor from ${studentName}`);
      fetchData();
    } catch {
      setToast('Failed to unassign mentor.');
    } finally {
      setTimeout(() => setToast(''), 3000);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {toast && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {toast}
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" /> Department Student Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">View, search, and manage mentor assignments for all students</p>
        </div>
      </motion.div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or register no..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All Years</option>
          <option value="2">2nd Year</option>
          <option value="3">3rd Year</option>
          <option value="4">4th Year</option>
        </select>

        <select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All Sections</option>
          <option value="A">Section A</option>
          <option value="B">Section B</option>
        </select>

        <select
          value={mentorFilter}
          onChange={(e) => setMentorFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All Mentors</option>
          {mentors.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
          No students found matching your filter criteria.
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr className="text-gray-500">
                <th className="px-6 py-4 text-left font-semibold">Register No</th>
                <th className="px-6 py-4 text-left font-semibold">Student Name</th>
                <th className="px-6 py-4 text-left font-semibold hidden md:table-cell">Class</th>
                <th className="px-6 py-4 text-left font-semibold">Assigned Mentor</th>
                <th className="px-6 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-700">{s.registerNo}</td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell text-gray-600">
                    Year {s.year || 2} · Sec {s.section || 'A'}
                  </td>
                  <td className="px-6 py-4">
                    {s.assignedMentor ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {s.assignedMentor.name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        <UserX className="h-3 w-3" /> Unassigned
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setAssignStudent(s); setSelectedMentorId(s.assignedMentor?.id || ''); }}
                        className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        {s.assignedMentor ? 'Change Mentor' : 'Assign Mentor'}
                      </button>
                      {s.assignedMentor && (
                        <button
                          onClick={() => handleUnassign(s.id, s.name)}
                          className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Unassign mentor"
                        >
                          <UserX className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick Assign Modal */}
      {assignStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-lg">Assign Mentor</h3>
              <button onClick={() => setAssignStudent(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-indigo-50 p-4">
              <p className="text-xs text-indigo-500 font-semibold uppercase">Student</p>
              <p className="font-bold text-gray-900 mt-0.5">{assignStudent.name}</p>
              <p className="text-xs text-gray-500 font-mono">{assignStudent.registerNo}</p>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Mentor</label>
                <select
                  value={selectedMentorId}
                  onChange={(e) => setSelectedMentorId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                  required
                >
                  <option value="" disabled>Choose a mentor...</option>
                  {mentors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.assignedStudentsCount} assigned)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignStudent(null)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning || !selectedMentorId}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
