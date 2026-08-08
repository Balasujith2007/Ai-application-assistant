'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  Search, FileText, Download, Loader2, CheckCircle, AlertCircle, Clock, X,
} from 'lucide-react';

interface Resume {
  id: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  uploadedAt: string;
  reviewStatus: string | null;
  reviewFeedback: string | null;
  reviewedAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    profile: { department: string | null } | null;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING_REVIEW: { label: 'Pending Review', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock },
  REVIEWED: { label: 'Reviewed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  CHANGES_REQUESTED: { label: 'Changes Requested', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertCircle },
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
      await axios.put(`/api/mentor/resumes/${resume.id}/review`,
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
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Review Resume</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Student Info */}
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="font-semibold text-gray-900">{resume.user.name}</p>
            <p className="text-sm text-gray-500">{resume.user.email}</p>
            {resume.user.profile?.department && <p className="text-xs text-indigo-600 font-medium mt-1">{resume.user.profile.department}</p>}
          </div>

          {/* Resume File */}
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{resume.originalName}</p>
              <p className="text-xs text-gray-400">Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}</p>
            </div>
            <a href={resume.fileUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              <Download className="h-3.5 w-3.5" /> View
            </a>
          </div>

          {/* Status */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Review Status</label>
            <div className="flex gap-3">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button key={key} type="button"
                  onClick={() => setStatus(key)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${status === key ? cfg.color + ' ring-2 ring-indigo-500 ring-offset-1' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Feedback</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Write your feedback for the student..."
              rows={4}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Save Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MentorResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);

  const fetchResumes = useCallback(async (q = '', s = '') => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/mentor/resumes?search=${q}&status=${s}`, { headers: { Authorization: `Bearer ${token}` } });
      setResumes(res.data.data);
    } catch {
      setError('Failed to load resumes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchResumes(); }, [fetchResumes]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResumes(search, statusFilter);
  };

  return (
    <div className="space-y-6 pb-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-600" /> Resume Reviews
          </h1>
          <p className="text-sm text-gray-500 mt-1">Resumes submitted by your assigned students</p>
        </div>
      </motion.div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); fetchResumes(search, e.target.value); }}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none">
          <option value="">All Statuses</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="CHANGES_REQUESTED">Changes Requested</option>
        </select>
        <button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Search</button>
      </form>

      {/* Stats badges */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = resumes.filter((r) => (r.reviewStatus || 'PENDING_REVIEW') === key).length;
          const Icon = cfg.icon;
          return (
            <div key={key} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${cfg.color}`}>
              <Icon className="h-3.5 w-3.5" /> {cfg.label}: {count}
            </div>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : resumes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center">
          <FileText className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-lg font-semibold text-gray-700">No resumes found</p>
          <p className="text-sm text-gray-400 mt-1">Resumes uploaded by your students will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((r) => {
            const status = r.reviewStatus || 'PENDING_REVIEW';
            const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING_REVIEW;
            const Icon = cfg.icon;
            return (
              <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                      {r.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{r.user.name}</p>
                      <p className="text-xs text-gray-400">{r.user.profile?.department || r.user.email}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.color}`}>
                    <Icon className="h-3 w-3" /> {cfg.label}
                  </span>
                </div>

                <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2.5">
                  <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-xs font-medium text-gray-700 truncate">{r.originalName}</span>
                </div>

                {r.reviewFeedback && (
                  <p className="mb-4 text-xs text-gray-500 italic border-l-2 border-indigo-200 pl-2 line-clamp-2">
                    {r.reviewFeedback}
                  </p>
                )}

                <p className="mb-4 text-xs text-gray-400">Uploaded {new Date(r.uploadedAt).toLocaleDateString()}</p>

                <div className="flex gap-2">
                  <a href={r.fileUrl} target="_blank" rel="noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                    <Download className="h-3.5 w-3.5" /> View
                  </a>
                  <button onClick={() => setSelectedResume(r)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
                    <CheckCircle className="h-3.5 w-3.5" /> Review
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
