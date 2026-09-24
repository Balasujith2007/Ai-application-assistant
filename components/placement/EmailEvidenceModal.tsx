'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Mail,
  ShieldCheck,
  Calendar,
  Building2,
  Sparkles,
  Tag,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getEmailEvidence } from '@/lib/placementApi';

interface EmailEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId?: string;
  evidenceId?: string;
  companyName?: string;
  position?: string;
}

export const EmailEvidenceModal: React.FC<EmailEvidenceModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  evidenceId,
  companyName,
  position,
}) => {
  const [evidence, setEvidence] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && (applicationId || evidenceId)) {
      setLoading(true);
      setError(null);
      const targetId = evidenceId || applicationId;
      if (targetId) {
        getEmailEvidence(targetId)
          .then((data) => {
            setEvidence(data);
            setLoading(false);
          })
          .catch((err) => {
            console.error(err);
            setError('Could not load email evidence or no verified email attached.');
            setLoading(false);
          });
      }
    }
  }, [isOpen, applicationId, evidenceId]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-kit-900 via-kit-800 to-kit-900 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-kit-200">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    Email Verification Evidence
                  </h2>
                  <p className="text-xs text-kit-200 mt-0.5">
                    Direct automated status update from company inbox
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-kit-200 border-t-kit-600" />
                <p className="text-xs font-medium text-gray-500">Decrypting & fetching verified evidence...</p>
              </div>
            ) : error || !evidence ? (
              <div className="py-8 text-center space-y-3">
                <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
                <p className="text-sm font-semibold text-gray-800">
                  {error || 'No direct company email evidence linked to this application.'}
                </p>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Status was updated manually or via extension. Connect your email to automatically sync status updates.
                </p>
              </div>
            ) : (
              <>
                {/* Verified Banner */}
                <div className="flex items-center justify-between rounded-2xl bg-emerald-50 border border-emerald-200/80 p-4">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                        Verified Company Communication
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        Extracted via NLP rule parser with {Math.round((evidence.confidence || 0.95) * 100)}% confidence
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={evidence.detectedStatus} />
                </div>

                {/* Sender & Company Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3.5">
                    <span className="text-[11px] font-semibold text-gray-400 block mb-1">Company / Sender</span>
                    <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5 truncate">
                      <Building2 className="h-4 w-4 text-kit-600 shrink-0" />
                      {evidence.companyName || companyName || 'Company'}
                    </div>
                    <div className="text-xs text-gray-500 truncate mt-0.5">
                      {evidence.senderName ? `${evidence.senderName} (${evidence.senderEmail})` : evidence.senderEmail}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3.5">
                    <span className="text-[11px] font-semibold text-gray-400 block mb-1">Received Timestamp</span>
                    <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-kit-600 shrink-0" />
                      {evidence.receivedDate ? new Date(evidence.receivedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {evidence.receivedDate ? new Date(evidence.receivedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                </div>

                {/* Email Subject Line */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-gray-700">Subject Line:</span>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-semibold text-gray-800">
                    {evidence.subject}
                  </div>
                </div>

                {/* Sanitized Excerpt */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">Sanitized Message Excerpt:</span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Lock className="h-3 w-3" /> PII Redacted
                    </span>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 text-xs leading-relaxed text-gray-700 italic border-l-4 border-l-kit-600 shadow-inner">
                    "{evidence.cleanSnippet}"
                  </div>
                </div>

                {/* Matched Keywords & Signals */}
                {evidence.matchedKeywords && evidence.matchedKeywords.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-kit-600" />
                      Detected Key Signals:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {evidence.matchedKeywords.map((kw: string, i: number) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-lg bg-kit-50 px-2.5 py-1 text-[11px] font-bold text-kit-700 border border-kit-200/60"
                        >
                          <Tag className="h-3 w-3" />
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Security and Anti-Tamper Notice */}
                <div className="rounded-xl bg-gray-50 border border-gray-200/70 p-3 text-[11px] text-gray-500 leading-normal flex items-start gap-2">
                  <Lock className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                  <span>
                    This status was automatically extracted directly from the verified email and cannot be manually modified by mentors or third parties.
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 bg-gray-50/50 p-4 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-xl bg-gray-900 px-5 py-2 text-xs font-bold text-white hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
