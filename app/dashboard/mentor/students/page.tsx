'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  Search, Users, Mail, Building2, BookOpen, FileText,
  Send, Eye, Loader2, UserX, ChevronRight,
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
  department: string | null;
  year: number | null;
  college: string | null;
  phone: string | null;
  hasResume: boolean;
  resumeStatus: string | null;
  latestApplication: string | null;
  lastActivity: string | null;
}

interface StudentModalProps {
  studentId: string;
  onClose: () => void;
  onRemind: (id: string, name: string) => void;
}

function StudentModal({ studentId, onClose, onRemind }: StudentModalProps) {
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(`/api/mentor/students/${studentId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setStudent(r.data.data))
      .finally(() => setLoading(false));
  }, [studentId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Student Profile</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">✕</button>
        </div>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : student ? (
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-2xl font-bold text-indigo-700">
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{student.name}</h3>
                <p className="text-sm text-gray-500">{student.email}</p>
                {student.profile?.department && <p className="text-sm text-indigo-600 font-medium">{student.profile.department}</p>}
                {student.profile?.college && <p className="text-xs text-gray-400">{student.profile.college}</p>}
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{student.resumes?.length ?? 0}</p>
                <p className="text-xs text-gray-500">Resumes</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{student.applications?.length ?? 0}</p>
                <p className="text-xs text-gray-500">Applications</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{student.interviews?.length ?? 0}</p>
                <p className="text-xs text-gray-500">Interviews</p>
              </div>
            </div>

            {/* Skills */}
            {student.profile?.skills?.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-700">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {student.profile.skills.map((ps: any) => (
                    <span key={ps.skillId} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                      {ps.skill.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {student.profile?.education?.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-700">Education</h4>
                {student.profile.education.map((e: any) => (
                  <div key={e.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3 mb-2">
                    <p className="font-medium text-gray-900">{e.institution}</p>
                    <p className="text-xs text-gray-500">{e.degree} {e.fieldOfStudy ? `· ${e.fieldOfStudy}` : ''} · {e.startYear}–{e.endYear ?? 'Present'}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Career Objective */}
            {student.profile?.careerObjective && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-700">Career Objective</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{student.profile.careerObjective}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={() => { onRemind(student.id, student.name); onClose(); }}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
                <Send className="h-4 w-4" /> Send Reminder
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-gray-500">Student not found.</div>
        )}
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  PENDING_REVIEW: 'bg-yellow-50 text-yellow-700',
  REVIEWED: 'bg-emerald-50 text-emerald-700',
  CHANGES_REQUESTED: 'bg-rose-50 text-rose-700',
};

export default function MentorStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const fetchStudents = useCallback(async (q = '') => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/mentor/students?search=${q}`, { headers: { Authorization: `Bearer ${token}` } });
      setStudents(res.data.data);
    } catch {
      setError('Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents(search);
  };

  const handleRemind = async (id: string, name: string) => {
    setRemindingId(id);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/mentor/students/${id}/remind`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setToast(`Reminder sent to ${name}!`);
    } catch {
      setToast('Failed to send reminder.');
    } finally {
      setRemindingId(null);
      setTimeout(() => setToast(''), 3000);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {toast && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {toast}
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" /> My Students
          </h1>
          <p className="text-sm text-gray-500 mt-1">Students currently assigned to you</p>
        </div>
      </motion.div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
          Search
        </button>
      </form>

      {/* Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : students.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center">
          <UserX className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-lg font-semibold text-gray-700">No students assigned yet</p>
          <p className="text-sm text-gray-400 mt-1">Students will appear here once they are assigned to you by an administrator.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr className="text-gray-500">
                <th className="px-6 py-4 text-left font-medium">Student</th>
                <th className="px-6 py-4 text-left font-medium hidden md:table-cell">Department</th>
                <th className="px-6 py-4 text-left font-medium hidden lg:table-cell">Resume</th>
                <th className="px-6 py-4 text-left font-medium hidden lg:table-cell">Last Activity</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.map((s) => (
                <tr key={s.id} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Building2 className="h-3.5 w-3.5" />
                      {s.department || '—'} {s.year ? `· Year ${s.year}` : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    {s.hasResume ? (
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${STATUS_COLORS[s.resumeStatus || 'PENDING_REVIEW'] || 'bg-gray-100 text-gray-600'}`}>
                        {(s.resumeStatus || 'PENDING_REVIEW').replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400"><BookOpen className="h-3.5 w-3.5" />No Resume</span>
                    )}
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell text-xs text-gray-400">
                    {s.lastActivity ? new Date(s.lastActivity).toLocaleDateString() : 'No activity'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setSelectedId(s.id)}
                        className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:border-indigo-300 hover:text-indigo-700 shadow-sm">
                        <Eye className="h-3 w-3" /> View
                      </button>
                      <button
                        onClick={() => handleRemind(s.id, s.name)}
                        disabled={remindingId === s.id}
                        className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                        {remindingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Remind
                      </button>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedId && (
        <StudentModal studentId={selectedId} onClose={() => setSelectedId(null)} onRemind={handleRemind} />
      )}
    </div>
  );
}
