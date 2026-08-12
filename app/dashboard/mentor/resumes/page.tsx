'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  Search, FileText, Download, Loader2, CheckCircle, AlertCircle, Clock, X,
} from 'lucide-react';

interface ResumeUser {
  id: string;
  name: string;
  email: string;
  registerNo: string;
  department: string;
  year: number;
  section: string;
}

interface Resume {
  id: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  uploadedAt: string;
  reviewStatus: string;
  reviewFeedback: string | null;
  reviewedAt: string | null;
  user: ResumeUser;
}

interface Stats {
  pendingCount: number;
  reviewedCount: number;
  changesRequestedCount: number;
  total: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING_REVIEW: { label: 'Pending Review', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  REVIEWED: { label: 'Reviewed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  CHANGES_REQUESTED: { label: 'Changes Requested', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertCircle },
};

const getResumeViewUrl = (url: string, id: string) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const tokenQuery = token ? `token=${encodeURIComponent(token)}` : '';

  if (url && url.startsWith('/api/resumes/')) {
    if (url.includes('token=')) return url;
    return `${url}${url.includes('?') ? '&' : '?'}${tokenQuery}`;
  }
  return `/api/resumes/${id}${tokenQuery ? `?${tokenQuery}` : ''}`;
};

interface ReviewModalProps {
  resume: Resume;
  onClose: () => void;
  onSaved: () => void;
}

function ReviewModal({ resume, onClose, onSaved }: ReviewModalProps) {
  const [status, setStatus] = useState(resume.reviewStatus || 'PENDING_REVIEW');
  const [feedback, setFeedback] = useState(resume.reviewFeedback || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `/api/mentor/resumes/${resume.id}/review`,
        { reviewStatus: status, reviewFeedback: feedback },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSaved();
      onClose();
    } catch {
      setError('Failed to save review. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">Review Student Resume</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Student Info */}
          <div className="rounded-xl bg-indigo-50/50 border border-indigo-100 p-4 space-y-1">
            <p className="font-bold text-gray-900">{resume.user.name}</p>
            <p className="text-xs font-mono font-semibold text-indigo-700">Reg No: {resume.user.registerNo}</p>
            <p className="text-xs text-gray-500">{resume.user.email} · {resume.user.department} (Year {resume.user.year} - Sec {resume.user.section})</p>
          </div>

          {/* Resume File */}
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 bg-white">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{resume.originalName}</p>
              <p className="text-xs text-gray-400">Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}</p>
            </div>
            <a href={getResumeViewUrl(resume.fileUrl, resume.id)} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm">
              <Download className="h-3.5 w-3.5" /> View
            </a>
          </div>

          {/* Status Selection */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Select Review Decision</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button key={key} type="button"
                  onClick={() => setStatus(key)}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${status === key ? cfg.color + ' ring-2 ring-indigo-500 ring-offset-1' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Mentor Review Comments</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide constructive feedback for the student..."
              rows={4}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 shadow-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Submit Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MentorResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [stats, setStats] = useState<Stats>({ pendingCount: 0, reviewedCount: 0, changesRequestedCount: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);

  const fetchResumes = useCallback(async (q = search, s = statusFilter) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/mentor/resumes?search=${q}&status=${s}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataList = res.data.data || [];
      setResumes(dataList);
      if (res.data.stats) {
        setStats(res.data.stats);
      } else {
        setStats({
          pendingCount: dataList.filter((r: Resume) => r.reviewStatus === 'PENDING_REVIEW').length,
          reviewedCount: dataList.filter((r: Resume) => r.reviewStatus === 'REVIEWED').length,
          changesRequestedCount: dataList.filter((r: Resume) => r.reviewStatus === 'CHANGES_REQUESTED').length,
          total: dataList.length,
        });
      }
    } catch {
      setError('Failed to load mentor student resumes.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResumes(search, statusFilter);
  };

  return (
    <div className="space-y-6 pb-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-600" /> Student Resume Reviews
          </h1>
          <p className="text-sm text-gray-500 mt-1">Review and approve resumes submitted by your assigned students</p>
        </div>
      </motion.div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Pending Review</span>
            <p className="text-2xl font-bold text-amber-900 mt-1">{stats.pendingCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Reviewed & Approved</span>
            <p className="text-2xl font-bold text-emerald-900 mt-1">{stats.reviewedCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Changes Requested</span>
            <p className="text-2xl font-bold text-rose-900 mt-1">{stats.changesRequestedCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, register number, or resume file..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            fetchResumes(search, e.target.value);
          }}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="CHANGES_REQUESTED">Changes Requested</option>
        </select>
        <button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm">
          Search
        </button>
      </form>

      {/* Resumes Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : resumes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center">
          <FileText className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-lg font-semibold text-gray-800">No resumes found</p>
          <p className="text-sm text-gray-400 mt-1 max-w-sm">
            {search || statusFilter ? 'No resumes match your search or filter criteria.' : 'Resumes uploaded by your assigned students will automatically appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((r) => {
            const statusKey = r.reviewStatus || 'PENDING_REVIEW';
            const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.PENDING_REVIEW;
            const Icon = cfg.icon;
            return (
              <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                        {r.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{r.user.name}</p>
                        <p className="text-xs font-mono font-semibold text-indigo-600">{r.user.registerNo}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold shrink-0 ${cfg.color}`}>
                      <Icon className="h-3 w-3" /> {cfg.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                    <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span className="text-xs font-medium text-gray-800 truncate">{r.originalName}</span>
                  </div>

                  {r.reviewFeedback && (
                    <div className="mt-3 rounded-lg border-l-2 border-indigo-400 bg-indigo-50/30 p-2 text-xs text-gray-700 italic line-clamp-2">
                      "{r.reviewFeedback}"
                    </div>
                  )}

                  <p className="mt-3 text-[11px] text-gray-400 font-medium">
                    Uploaded {new Date(r.uploadedAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <a
                    href={getResumeViewUrl(r.fileUrl, r.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <Download className="h-3.5 w-3.5" /> View Resume
                  </a>
                  <button
                    onClick={() => setSelectedResume(r)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Review Action
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedResume && (
        <ReviewModal
          resume={selectedResume}
          onClose={() => setSelectedResume(null)}
          onSaved={() => fetchResumes(search, statusFilter)}
        />
      )}
    </div>
  );
}
