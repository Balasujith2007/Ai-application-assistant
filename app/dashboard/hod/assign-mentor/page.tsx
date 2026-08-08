'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  Users, UserCheck, ArrowRight, CheckCircle2, Search, Loader2, UserX,
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  registerNo: string;
  email: string;
  assignedMentor: { id: string; name: string } | null;
}

interface Mentor {
  id: string;
  name: string;
  employeeId: string;
  assignedStudentsCount: number;
}

export default function HODAssignMentorPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedMentorId, setSelectedMentorId] = useState('');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [studRes, mentRes] = await Promise.all([
        axios.get(`/api/hod/students?search=${search}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('/api/hod/mentors', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setStudents(studRes.data.data);
      setMentors(mentRes.data.data);
    } catch {
      setToast('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllUnassigned = () => {
    const unassigned = students.filter((s) => !s.assignedMentor).map((s) => s.id);
    setSelectedStudentIds(unassigned);
  };

  const handleAssign = async () => {
    if (selectedStudentIds.length === 0 || !selectedMentorId) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        '/api/hod/assign-mentor',
        { studentIds: selectedStudentIds, mentorId: selectedMentorId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setToast(`Successfully assigned ${selectedStudentIds.length} student(s)!`);
      setSelectedStudentIds([]);
      fetchData();
    } catch {
      setToast('Assignment failed. Please try again.');
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(''), 4000);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {toast && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {toast}
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <UserCheck className="h-6 w-6 text-indigo-600" /> Student-Mentor Assignment
        </h1>
        <p className="text-sm text-gray-500 mt-1">Select one or multiple students and assign them to a faculty mentor</p>
      </motion.div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Student Selection */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search students..."
                  className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <button
                onClick={selectAllUnassigned}
                className="shrink-0 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                Select Unassigned
              </button>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden max-h-[500px] overflow-y-auto">
              <div className="divide-y divide-gray-100">
                {students.map((s) => {
                  const isSelected = selectedStudentIds.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => toggleSelectStudent(s.id)}
                      className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-50/70' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{s.registerNo}</p>
                        </div>
                      </div>
                      <div>
                        {s.assignedMentor ? (
                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                            {s.assignedMentor.name}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                            Unassigned
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Mentor Selection & Action */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
              <h2 className="font-bold text-gray-900 text-lg">Assign Target Mentor</h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Faculty Mentor</label>
                <div className="space-y-2">
                  {mentors.map((m) => {
                    const isSelected = selectedMentorId === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMentorId(m.id)}
                        className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{m.name}</p>
                          <p className="text-xs text-gray-500 font-mono">{m.employeeId}</p>
                        </div>
                        <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full">
                          {m.assignedStudentsCount} assigned
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="mb-4 text-xs font-medium text-gray-500 flex justify-between">
                  <span>Selected Students: <strong className="text-gray-900">{selectedStudentIds.length}</strong></span>
                  <span>Target Mentor: <strong className="text-gray-900">{mentors.find((m) => m.id === selectedMentorId)?.name || 'None'}</strong></span>
                </div>

                <button
                  onClick={handleAssign}
                  disabled={submitting || selectedStudentIds.length === 0 || !selectedMentorId}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      Assign Selected Students
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
