'use client';

import React, { useEffect, useState, use } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import Link from 'next/link';
import {
  ArrowLeft, User, Mail, Building2, Phone, Calendar, FileText,
  Briefcase, Send, Loader2, Award, BookOpen,
} from 'lucide-react';

interface Props {
  params: Promise<{ studentId: string }>;
}

export default function MentorStudentDetailPage({ params }: Props) {
  const { studentId } = use(params);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reminding, setReminding] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/mentor/students/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStudent(res.data.data);
      } catch {
        setError('Failed to load student profile details.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [studentId]);

  const handleRemind = async () => {
    if (!student) return;
    setReminding(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/mentor/students/${studentId}/remind`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setToast('Reminder sent successfully!');
    } catch {
      setToast('Failed to send reminder.');
    } finally {
      setReminding(false);
      setTimeout(() => setToast(''), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/mentor/students" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to My Students
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || 'Student not found or access denied.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {toast && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/mentor/students" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-indigo-600 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to My Students
        </Link>
        <button
          onClick={handleRemind}
          disabled={reminding}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 shadow-sm transition-colors"
        >
          {reminding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send Reminder
        </button>
      </div>

      {/* Main Student Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-start gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-3xl font-bold text-indigo-700">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
            <p className="text-sm font-mono font-bold text-indigo-600">Register No: {student.profile?.registerNo || '—'}</p>
            <p className="text-sm text-gray-500 flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-gray-400" /> {student.email}</p>
          </div>
        </div>

        {/* Academic Meta */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 border-t border-gray-100 pt-4 text-xs">
          <div>
            <span className="text-gray-400 font-medium">Department</span>
            <p className="font-bold text-gray-900 text-sm mt-0.5">{student.profile?.department || 'AI & DS'}</p>
          </div>
          <div>
            <span className="text-gray-400 font-medium">Year & Section</span>
            <p className="font-bold text-gray-900 text-sm mt-0.5">Year {student.profile?.year || 2} · Sec {student.profile?.section || 'A'}</p>
          </div>
          <div>
            <span className="text-gray-400 font-medium">Phone</span>
            <p className="font-bold text-gray-900 text-sm mt-0.5">{student.profile?.phone || '—'}</p>
          </div>
          <div>
            <span className="text-gray-400 font-medium">College</span>
            <p className="font-bold text-gray-900 text-sm mt-0.5">{student.profile?.college || 'CareerAI Campus'}</p>
          </div>
        </div>
      </motion.div>

      {/* Activity / Sub-sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Resumes */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" /> Resumes ({student.resumes?.length || 0})
          </h3>
          {student.resumes?.length > 0 ? (
            <div className="space-y-3">
              {student.resumes.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs">
                  <div>
                    <p className="font-bold text-gray-900">{r.originalName}</p>
                    <p className="text-gray-400">Uploaded {new Date(r.uploadedAt).toLocaleDateString()}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800">
                    {r.reviewStatus || 'PENDING_REVIEW'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No resumes uploaded yet.</p>
          )}
        </div>

        {/* Applications */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-indigo-600" /> Applications ({student.applications?.length || 0})
          </h3>
          {student.applications?.length > 0 ? (
            <div className="space-y-3">
              {student.applications.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs">
                  <div>
                    <p className="font-bold text-gray-900">{a.companyName}</p>
                    <p className="text-gray-500">{a.position}</p>
                  </div>
                  <span className="rounded-full bg-indigo-100 px-2.5 py-1 font-semibold text-indigo-800">
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No applications recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
