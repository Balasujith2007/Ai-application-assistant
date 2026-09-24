'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Mail,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Lock,
  Sparkles,
  Unlink,
  Radio,
  Check,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  getEmailSyncStatus,
  triggerEmailSync,
  disconnectEmailSync,
  connectEmailSyncMock,
} from '@/lib/placementApi';

interface EmailSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const EmailSyncModal: React.FC<EmailSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await getEmailSyncStatus();
      setStatusData(data);
    } catch (err: any) {
      console.error(err);
      setActionError('Could not load email sync status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setSyncResult(null);
      setActionError(null);
    }
  }, [isOpen]);

  const handleConnectSandbox = async () => {
    try {
      setSyncing(true);
      setActionError(null);
      await connectEmailSyncMock();
      await fetchStatus();
      setSyncResult('Connected successfully in secure sandbox mode.');
      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      setActionError(err.message || 'Failed to connect email.');
    } finally {
      setSyncing(false);
    }
  };

  const handleTriggerSync = async (withMockData = false) => {
    try {
      setSyncing(true);
      setActionError(null);
      setSyncResult(null);

      let mockEmails = undefined;
      if (withMockData) {
        // Pre-loaded realistic test email scenarios
        mockEmails = [
          {
            messageId: `msg_google_offer_${Date.now()}`,
            senderEmail: 'recruiting@google.com',
            senderName: 'Google Careers',
            subject: 'Congratulations: Offer of Employment - Software Engineer',
            bodyText:
              'Dear Student, we are pleased to offer you the position of Software Engineer at Google. Welcome to the team! Please review your official offer letter attached.',
            receivedDate: new Date(),
          },
          {
            messageId: `msg_amazon_interview_${Date.now()}`,
            senderEmail: 'talent@amazon.com',
            senderName: 'Amazon University Recruiting',
            subject: 'Amazon SDE Intern: Interview Invitation & Coding Round',
            bodyText:
              'Thank you for your interest in Amazon. We would like to invite you to interview for the SDE Intern position. Please choose a slot for your technical round.',
            receivedDate: new Date(),
          },
          {
            messageId: `msg_meta_shortlist_${Date.now()}`,
            senderEmail: 'careers@meta.com',
            senderName: 'Meta Recruiting',
            subject: 'Update on your Meta Full Stack Developer Application',
            bodyText:
              'Great news! Your profile has been shortlisted for the next stage of our evaluation process. Our team will contact you soon.',
            receivedDate: new Date(),
          },
        ];
      }

      const res = await triggerEmailSync(mockEmails);
      setSyncResult(res.message || 'Sync completed successfully.');
      await fetchStatus();
      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      setActionError(err.message || 'Synchronization failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your email integration?')) return;
    try {
      setSyncing(true);
      await disconnectEmailSync();
      await fetchStatus();
      setSyncResult('Disconnected email integration.');
      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      setActionError('Failed to disconnect.');
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  const isConnected = statusData?.isConnected;

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
                    Company Email Auto-Tracking
                  </h2>
                  <p className="text-xs text-kit-200 mt-0.5">
                    Automated status updates from company replies
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
                <p className="text-xs font-medium text-gray-500">Checking email integration status...</p>
              </div>
            ) : (
              <>
                {/* Status Indicator */}
                <div
                  className={`flex items-center justify-between rounded-2xl border p-4 ${
                    isConnected
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        isConnected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      <Radio className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
                        {isConnected ? (
                          <>
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                            Connected & Actively Listening
                          </>
                        ) : (
                          'Integration Disconnected'
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {isConnected
                          ? `Syncing via ${statusData.integration?.emailAddress}`
                          : 'Connect your student email to enable real-time tracking.'}
                      </div>
                    </div>
                  </div>

                  {isConnected && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
                      Active
                    </span>
                  )}
                </div>

                {/* Feedback Alerts */}
                {syncResult && (
                  <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-800 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{syncResult}</span>
                  </div>
                )}

                {actionError && (
                  <div className="flex items-center gap-2.5 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-800 font-medium">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}

                {/* Connection Options & Actions */}
                {!isConnected ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-kit-100 bg-kit-50/40 p-4 space-y-3">
                      <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-kit-600" />
                        How Email Auto-Tracking Works
                      </div>
                      <ul className="space-y-2 text-xs text-gray-600">
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-kit-600 shrink-0 mt-0.5" />
                          <span>Automatically detects official interview invites, shortlists, and offers.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-kit-600 shrink-0 mt-0.5" />
                          <span>Matches emails to your existing applications with high precision NLP.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-kit-600 shrink-0 mt-0.5" />
                          <span>Mentors and HODs <strong>cannot</strong> manually change your statuses.</span>
                        </li>
                      </ul>
                    </div>

                    <Button
                      variant="primary"
                      onClick={handleConnectSandbox}
                      disabled={syncing}
                      className="w-full justify-center shadow-md py-2.5 text-sm"
                    >
                      {syncing ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4" />
                          Connect Email Tracking (One-Click)
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Stats summary */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                        <span className="text-[11px] font-semibold text-gray-400 block mb-0.5">
                          Email Verified Apps
                        </span>
                        <div className="text-lg font-bold text-gray-900">
                          {statusData?.stats?.emailVerifiedAppsCount || 0}
                        </div>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                        <span className="text-[11px] font-semibold text-gray-400 block mb-0.5">
                          Pending Reviews
                        </span>
                        <div className="text-lg font-bold text-amber-600">
                          {statusData?.stats?.pendingReviewsCount || 0}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Button
                        variant="primary"
                        onClick={() => handleTriggerSync(false)}
                        disabled={syncing}
                        className="justify-center text-xs"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync Inbox Now'}
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={() => handleTriggerSync(true)}
                        disabled={syncing}
                        className="justify-center text-xs"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-kit-600" />
                        Simulate Sample Updates
                      </Button>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex justify-end">
                      <button
                        onClick={handleDisconnect}
                        disabled={syncing}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline transition-colors"
                      >
                        <Unlink className="h-3.5 w-3.5" />
                        Disconnect Integration
                      </button>
                    </div>
                  </div>
                )}

                {/* Privacy & Zero Password Guarantee */}
                <div className="rounded-2xl bg-gray-50/80 border border-gray-200/80 p-4 space-y-2 text-[11px] text-gray-500">
                  <div className="flex items-center gap-2 font-bold text-gray-700 text-xs">
                    <ShieldCheck className="h-4 w-4 text-kit-600" />
                    Student Privacy & Security Guarantee
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <Lock className="h-3 w-3 text-emerald-600" />
                      Zero Passwords Stored
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Lock className="h-3 w-3 text-emerald-600" />
                      Minimal Readonly Scopes
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Lock className="h-3 w-3 text-emerald-600" />
                      AES-256-GCM Encrypted
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Lock className="h-3 w-3 text-emerald-600" />
                      Student-Only Email Privacy
                    </div>
                  </div>
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
