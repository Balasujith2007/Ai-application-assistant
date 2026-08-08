'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  Calendar, Loader2, MessageSquare, CheckCircle, Clock, X,
} from 'lucide-react';

interface Interview {
  id: string;
  companyName: string;
  role: string;
  type: string;
  date: string;
  time: string | null;
  location: string | null;
  feedback: string | null;
  user: { id: string; name: string; email: string };
}

const INTERVIEW_TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'today', label: "Today's" },
  { key: 'completed', label: 'Completed' },
  { key: 'all', label: 'All' },
];

interface FeedbackModalProps {
  interview: Interview;
  onClose: () => void;
  onSaved: () => void;
}

function FeedbackModal({ interview, onClose, onSaved }: FeedbackModalProps) {
  const [feedback, setFeedback] = useState(interview.feedback || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/mentor/interviews/${interview.id}/feedback`,
        { feedback },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSaved();
      onClose();
    } catch {
      setError('Failed to save feedback. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Interview Feedback</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="rounded-xl bg-gray-50 p-4 space-y-1">
            <p className="font-semibold text-gray-900">{interview.user.name}</p>
            <p className="text-sm text-indigo-600 font-medium">{interview.companyName} — {interview.role}</p>
            <p className="text-xs text-gray-400">{new Date(interview.date).toLocaleDateString()} · {interview.type.replace('_', ' ')}</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Your Feedback</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Add feedback, strengths, areas for improvement, and recommendations..."
              rows={6}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !feedback.trim()}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Save Feedback
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MentorInterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);

  const fetchInterviews = useCallback(async (filter: string) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/mentor/interviews?filter=${filter}`, { headers: { Authorization: `Bearer ${token}` } });
      setInterviews(res.data.data);
    } catch {
      setError('Failed to load interviews.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInterviews(activeTab); }, [activeTab, fetchInterviews]);

  return (
    <div className="space-y-6 pb-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="h-6 w-6 text-indigo-600" /> Interviews
        </h1>
        <p className="text-sm text-gray-500 mt-1">Track and provide feedback on your students' interviews</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit shadow-sm">
        {INTERVIEW_TABS.map((t) => (
          <button key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${activeTab === t.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : interviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center">
          <Calendar className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-lg font-semibold text-gray-700">No interviews found</p>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab === 'today' ? "No interviews scheduled for today." : "No interviews in this category."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {interviews.map((interview) => {
            const isPast = new Date(interview.date) < new Date();
            const isToday = new Date(interview.date).toDateString() === new Date().toDateString();
            return (
              <div key={interview.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                      <Calendar className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-bold text-gray-900">{interview.companyName}</p>
                        <span className="text-gray-400">·</span>
                        <p className="text-sm text-gray-600">{interview.role}</p>
                        {isToday && <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">Today</span>}
                      </div>
                      <p className="text-sm text-gray-500 font-medium">
                        Student: <span className="text-gray-800">{interview.user.name}</span>
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(interview.date).toLocaleDateString()} {interview.time ? `· ${interview.time}` : ''}
                        </span>
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {interview.type.replace(/_/g, ' ')}
                        </span>
                        {interview.location && (
                          <span className="text-xs text-gray-400">📍 {interview.location}</span>
                        )}
                      </div>

                      {interview.feedback && (
                        <div className="mt-3 rounded-lg border-l-2 border-indigo-300 bg-indigo-50 p-3">
                          <p className="text-xs font-semibold text-indigo-700 mb-1">Your Feedback</p>
                          <p className="text-xs text-indigo-600">{interview.feedback}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {isPast && (
                    <button
                      onClick={() => setSelectedInterview(interview)}
                      className="flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {interview.feedback ? 'Edit Feedback' : 'Add Feedback'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedInterview && (
        <FeedbackModal
          interview={selectedInterview}
          onClose={() => setSelectedInterview(null)}
          onSaved={() => fetchInterviews(activeTab)}
        />
      )}
    </div>
  );
}
