'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, CheckCircle2, Loader2, Award, Calendar, Link as LinkIcon, FileText } from 'lucide-react';
import api from '@/lib/api';

interface CompleteOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunityRegistration: {
    id: string;
    opportunityId: string;
    title: string;
    organization: string;
    role?: string | null;
    outcome?: string | null;
    certificateUrl?: string | null;
    notes?: string | null;
  } | null;
  onSuccess?: () => void;
}

export function CompleteOpportunityModal({
  isOpen,
  onClose,
  opportunityRegistration,
  onSuccess,
}: CompleteOpportunityModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [outcome, setOutcome] = useState('Participated');
  const [role, setRole] = useState('');
  const [certificateUrl, setCertificateUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (opportunityRegistration) {
      setOutcome(opportunityRegistration.outcome || 'Participated');
      setRole(opportunityRegistration.role || '');
      setCertificateUrl(opportunityRegistration.certificateUrl || '');
      setNotes(opportunityRegistration.notes || '');
      setCompletedDate(new Date().toISOString().split('T')[0]);
      setError(null);
    }
  }, [opportunityRegistration]);

  if (!isOpen || !opportunityRegistration) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post(`/student/opportunity-history/${opportunityRegistration.id}/complete`, {
        outcome,
        role: role.trim() || undefined,
        certificateUrl: certificateUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        completedAt: completedDate
      });

      if (res.data.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setError(res.data.message || 'Failed to save to history.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update opportunity history.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-5 border border-gray-100"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 font-bold shadow-xs">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 leading-tight">Complete Opportunity</h3>
                <p className="text-xs text-gray-500 truncate max-w-xs mt-0.5">
                  {opportunityRegistration.title} • {opportunityRegistration.organization}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-700 font-medium">
                {error}
              </div>
            )}

            {/* Outcome Selection */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Outcome / Result <span className="text-rose-500">*</span>
              </label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 font-medium text-gray-900 focus:border-indigo-500 focus:outline-none bg-white"
                required
              >
                <option value="Participated">Participated</option>
                <option value="Finalist">Finalist</option>
                <option value="Winner">Winner</option>
                <option value="Runner-up">Runner-up</option>
                <option value="Selected">Selected</option>
                <option value="Completed">Completed</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Role / Position */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Role / Position (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Lead Developer, Intern, Participant"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 font-medium text-gray-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Completion Date */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Completed Date</label>
              <input
                type="date"
                value={completedDate}
                onChange={(e) => setCompletedDate(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 font-medium text-gray-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Certificate URL */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Certificate URL (Optional)</label>
              <input
                type="url"
                placeholder="https://drive.google.com/..."
                value={certificateUrl}
                onChange={(e) => setCertificateUrl(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 font-medium text-gray-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Notes / Reflection (Optional)</label>
              <textarea
                rows={2}
                placeholder="Brief notes about your key learnings or achievements..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 font-medium text-gray-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-amber-600 px-5 py-2.5 font-bold text-white shadow-xs hover:bg-amber-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save to History
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
