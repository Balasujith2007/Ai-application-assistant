'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Bell, Plus, Loader2, Send, Megaphone } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  message: string;
  targetUser: string;
  targetRole: string;
  createdAt: string;
}

export default function HODAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Form modal
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState('STUDENTS');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/hod/announcements', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnnouncements(res.data.data);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        '/api/hod/announcements',
        { title, message, targetAudience },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setToast('Announcement published successfully!');
      setTitle('');
      setMessage('');
      setModalOpen(false);
      fetchAnnouncements();
    } catch {
      setToast('Failed to publish announcement.');
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

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-indigo-600" /> Department Announcements
          </h1>
          <p className="text-sm text-gray-500 mt-1">Publish notices, placement alerts, and event reminders to department students & mentors</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Announcement
        </button>
      </motion.div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-400">
              No department announcements published yet.
            </div>
          ) : (
            announcements.map((a) => (
              <div key={a.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-base">{a.title}</h3>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    To: {a.targetRole} ({a.targetUser})
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{a.message}</p>
                <p className="text-xs text-gray-400 pt-2">{new Date(a.createdAt).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Publish Department Announcement</h2>
            <form onSubmit={handlePublish} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Title</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Upcoming TCS Internship Drive"
                  className="w-full rounded-xl border border-gray-200 p-2.5 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Target Audience</label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="STUDENTS">All Students</option>
                  <option value="MENTORS">All Mentors</option>
                  <option value="ALL">All Students + Mentors</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Message Content</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Provide announcement details..."
                  className="w-full rounded-xl border border-gray-200 p-2.5 focus:border-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
