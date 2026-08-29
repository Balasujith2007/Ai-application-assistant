'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, AlertCircle, ExternalLink, Sparkles, User, FileText,
  Building, GraduationCap, ShieldCheck, Loader2,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, HelpCircle, UploadCloud
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { isOpportunityOpen } from '@/lib/utils';

export interface ApplicationAssistantOpportunity {
  id: string;
  title?: string;
  role?: string;
  companyName?: string;
  organization?: string;
  registrationUrl?: string;
  opportunityUrl?: string;
  applyUrl?: string;
  applicationDeadline?: string;
  deadline?: string;
  status?: string;
  type?: string;
}

interface ApplicationAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: ApplicationAssistantOpportunity | null;
  onSuccess?: () => void;
}

interface StudentData {
  userId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  year: string;
  college: string;
  cgpa: string;
  githubUrl: string;
  linkedinUrl: string;
  codolioUrl: string;
  verifiedGitHub: boolean;
  verifiedLinkedIn: boolean;
  verifiedCodolio: boolean;
  resumeName: string | null;
  resumeUrl: string | null;
  projectsCount: number;
  experiencesCount: number;
  skillsList: string[];
}

type Step =
  | 'REVIEW'
  | 'STARTED'
  | 'VERIFYING'
  | 'VERIFIED'
  | 'UNABLE_TO_VERIFY'
  | 'STUDENT_CONFIRMED'
  | 'IN_PROGRESS_SAVED'
  | 'ALREADY_EXISTS'
  | 'EXPIRED'
  | 'NO_URL';

export function ApplicationAssistantModal({
  isOpen,
  onClose,
  opportunity,
  onSuccess
}: ApplicationAssistantModalProps) {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [step, setStep] = useState<Step>('REVIEW');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [effectiveUrl, setEffectiveUrl] = useState<string>('');
  const [existingRegStatus, setExistingRegStatus] = useState<string | null>(null);
  const [detectedAppId, setDetectedAppId] = useState<string | null>(null);

  // Manual Confirmation State
  const [manualAppId, setManualAppId] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);

  // Missing fields input state
  const [missingFields, setMissingFields] = useState({
    phone: '',
    department: '',
    college: '',
    location: ''
  });
  const [saveToProfile, setSaveToProfile] = useState(true);

  useEffect(() => {
    if (isOpen && opportunity) {
      loadInitiateData();
    } else {
      resetState();
    }
  }, [isOpen, opportunity]);

  const resetState = () => {
    setLoading(true);
    setActionLoading(false);
    setStep('REVIEW');
    setErrorMessage(null);
    setStudentData(null);
    setEffectiveUrl('');
    setExistingRegStatus(null);
    setDetectedAppId(null);
    setManualAppId('');
    setManualNotes('');
    setShowManualForm(false);
    setMissingFields({ phone: '', department: '', college: '', location: '' });
    setSaveToProfile(true);
  };

  const loadInitiateData = async () => {
    if (!opportunity) return;
    setLoading(true);
    setErrorMessage(null);

    const regUrl = opportunity.registrationUrl || opportunity.opportunityUrl || opportunity.applyUrl || '';
    if (!regUrl || (!regUrl.startsWith('http://') && !regUrl.startsWith('https://'))) {
      setStep('NO_URL');
      setLoading(false);
      return;
    }

    setEffectiveUrl(regUrl);

    try {
      const res = await api.get(`/opportunities/${opportunity.id}/initiate`);
      if (res.data.success) {
        setStudentData(res.data.studentData);
        if (res.data.opportunity?.effectiveRegistrationUrl) {
          setEffectiveUrl(res.data.opportunity.effectiveRegistrationUrl);
        }

        const existingReg = res.data.existingRegistration;
        if (existingReg) {
          setExistingRegStatus(existingReg.status);
          if (existingReg.externalRegistrationId) {
            setDetectedAppId(existingReg.externalRegistrationId);
          }

          if (existingReg.status === 'VERIFIED') {
            setStep('VERIFIED');
            setLoading(false);
            return;
          } else if (existingReg.status === 'STUDENT_CONFIRMED') {
            setStep('STUDENT_CONFIRMED');
            setLoading(false);
            return;
          } else if (existingReg.status === 'IN_PROGRESS' || existingReg.status === 'STARTED' || existingReg.status === 'INITIATED') {
            setStep('STARTED');
            setLoading(false);
            return;
          }
        }

        // Check deadline for new registrations only
        const deadlineVal = opportunity.applicationDeadline || opportunity.deadline;
        if (deadlineVal && !isOpportunityOpen(deadlineVal, opportunity.status)) {
          setStep('EXPIRED');
        } else {
          setStep('REVIEW');
        }
      } else {
        setErrorMessage(res.data.message || 'Unable to load profile data.');
      }
    } catch (err: any) {
      console.error('Failed to load application assistant data:', err);
      setErrorMessage(err?.response?.data?.message || 'Unable to load your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToApplication = async () => {
    if (!opportunity) return;

    if (!effectiveUrl || (!effectiveUrl.startsWith('http://') && !effectiveUrl.startsWith('https://'))) {
      setErrorMessage('Registration link is unavailable for this opportunity.');
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);

    try {
      // Step 1: Create short-lived CareerAI Agent Autofill Session
      let targetUrl = effectiveUrl;
      try {
        const sessionRes = await api.post('/agent/session', { opportunityId: opportunity.id });
        if (sessionRes.data?.success && sessionRes.data?.autofillUrl) {
          targetUrl = sessionRes.data.autofillUrl;
        }
      } catch (agentErr) {
        console.warn('Agent session initialization warning, falling back to direct URL:', agentErr);
      }

      // Step 2: Record application initiate / started status
      const res = await api.post(`/opportunities/${opportunity.id}/initiate`, {
        saveToProfile,
        missingFields: {
          phone: missingFields.phone.trim(),
          department: missingFields.department.trim(),
          college: missingFields.college.trim(),
          location: missingFields.location.trim()
        }
      });

      if (res.data.success) {
        // Open official registration page with CareerAI Agent session handoff
        window.open(targetUrl, '_blank', 'noopener,noreferrer');

        // Transition to STARTED stage
        setStep('STARTED');
      } else {
        const errorMsg = res.data.error || res.data.message || 'Unable to initiate application.';
        setErrorMessage(errorMsg);
      }
    } catch (err: unknown) {
      console.error('API Error initiating opportunity application:', err);
      const serverError = (err as any)?.response?.data?.error || (err as any)?.response?.data?.message;
      setErrorMessage(serverError || 'Unable to open the application link. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * STEP 2 & 3: Extension-based Verification Check
   */
  const handleVerifyRegistration = async () => {
    if (!opportunity) return;
    setStep('VERIFYING');
    setActionLoading(true);
    setErrorMessage(null);

    try {
      // Try to check with the browser extension bridge
      let extensionVerified = false;
      let extAppId: string | null = null;

      try {
        const verifyPromise = new Promise<{ verified: boolean; registrationId?: string }>((resolve) => {
          const timeout = setTimeout(() => resolve({ verified: false }), 2500);

          const handler = (e: MessageEvent) => {
            if (e.source === window && e.data?.source === 'careerai-extension' && e.data?.type === 'CAREERAI_VERIFICATION_RESULT') {
              window.removeEventListener('message', handler);
              clearTimeout(timeout);
              resolve({
                verified: !!e.data.verified,
                registrationId: e.data.registrationId || undefined
              });
            }
          };

          window.addEventListener('message', handler);
          window.postMessage({
            source: 'careerai-web',
            type: 'CAREERAI_CHECK_VERIFICATION',
            opportunityId: opportunity.id
          }, window.location.origin);
        });

        const extResult = await verifyPromise;
        if (extResult.verified) {
          extensionVerified = true;
          extAppId = extResult.registrationId || null;
        }
      } catch (extCheckErr) {
        console.warn('Extension check failed or timed out:', extCheckErr);
      }

      if (extensionVerified) {
        // Confirm with EXTENSION verification method
        const res = await api.post(`/opportunities/${opportunity.id}/confirm`, {
          action: 'VERIFY',
          verificationMethod: 'EXTENSION',
          registrationId: extAppId
        });

        if (res.data.success) {
          setDetectedAppId(extAppId);
          setStep('VERIFIED');
          if (onSuccess) onSuccess();
          return;
        }
      }

      // If automatic verification unavailable -> show controlled manual confirmation flow
      setStep('UNABLE_TO_VERIFY');
      setShowManualForm(false);
    } catch (err: any) {
      setStep('UNABLE_TO_VERIFY');
      setShowManualForm(false);
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * STEP 5: Student Manual Confirmation Flow
   */
  const handleStudentConfirmed = async () => {
    if (!opportunity) return;
    setActionLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.post(`/opportunities/${opportunity.id}/confirm`, {
        action: 'CONFIRM',
        verificationMethod: 'STUDENT_CONFIRMATION',
        registrationId: manualAppId.trim() || undefined,
        notes: manualNotes.trim() || undefined
      });

      if (res.data.success) {
        setDetectedAppId(manualAppId.trim() || null);
        setStep('STUDENT_CONFIRMED');
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.data.message || 'Failed to submit confirmation.');
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Failed to confirm registration.');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Handle "Not yet" -> keep IN_PROGRESS
   */
  const handleNotYetSubmitted = async () => {
    if (!opportunity) return;
    setActionLoading(true);
    try {
      await api.post(`/opportunities/${opportunity.id}/confirm`, {
        action: 'IN_PROGRESS'
      });
      setStep('IN_PROGRESS_SAVED');
      if (onSuccess) onSuccess();
    } catch (err) {
      setStep('IN_PROGRESS_SAVED');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen || !opportunity) return null;

  const title = opportunity.title || opportunity.role || 'Opportunity';
  const org = opportunity.organization || opportunity.companyName || 'Company / Host';

  const availableFieldsList = [
    { label: 'Full Name', value: studentData?.name, key: 'name' },
    { label: 'Email', value: studentData?.email, key: 'email' },
    { label: 'Phone', value: studentData?.phone || missingFields.phone, key: 'phone' },
    { label: 'College', value: studentData?.college || missingFields.college, key: 'college' },
    { label: 'Department', value: studentData?.department || missingFields.department, key: 'department' },
    { label: 'Year', value: studentData?.year, key: 'year' },
    { label: 'CGPA', value: studentData?.cgpa, key: 'cgpa' },
    { label: 'GitHub', value: studentData?.verifiedGitHub ? 'Verified ✓' : studentData?.githubUrl, key: 'github' },
    { label: 'LinkedIn', value: studentData?.verifiedLinkedIn ? 'Verified ✓' : studentData?.linkedinUrl, key: 'linkedin' },
    { label: 'Codolio', value: studentData?.verifiedCodolio ? 'Verified ✓' : studentData?.codolioUrl, key: 'codolio' },
    { label: 'Resume', value: studentData?.resumeName, key: 'resume' }
  ];

  const readyCount = availableFieldsList.filter((f) => !!f.value).length;
  const missingCount = availableFieldsList.filter((f) => !f.value).length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative flex flex-col w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden border border-gray-100"
        >
          {/* Fixed Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gradient-to-r from-kit-50/50 via-white to-kit-50/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-kit-600 text-white font-bold shadow-xs">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 leading-tight">CareerAI Application Assistant</h3>
                <p className="text-xs text-gray-500 truncate max-w-sm">
                  {org} • {title}
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

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {loading ? (
              <div className="flex py-12 flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
                <p className="text-sm font-medium text-gray-500">Preparing application data...</p>
              </div>
            ) : step === 'EXPIRED' ? (
              <div className="py-8 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                  <Clock className="h-6 w-6" />
                </div>
                <h4 className="text-lg font-bold text-gray-900">Application Closed</h4>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  The application deadline for <strong>{title}</strong> has passed.
                </p>
              </div>
            ) : step === 'NO_URL' ? (
              <div className="py-8 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h4 className="text-lg font-bold text-gray-900">Link Unavailable</h4>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Application link is not available for this opportunity.
                </p>
              </div>
            ) : step === 'STARTED' ? (
              /* STEP 1 & 2: APPLICATION STARTED */
              <div className="py-6 space-y-5">
                <div className="flex items-center gap-3 rounded-2xl bg-kit-50/80 border border-kit-100 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-kit-600 text-white font-bold">
                    <ExternalLink className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-kit-900">Application Started ✓</h4>
                    <p className="text-xs text-kit-700 mt-0.5">
                      The official registration page has been opened in a new tab.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-xs text-gray-600 space-y-2.5">
                  <p className="font-semibold text-gray-900">Next Steps:</p>
                  <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                    <li>Complete the registration form in the newly opened tab.</li>
                    <li>Submit the external form yourself — CareerAI never submits external applications without your action.</li>
                    <li>Return here and click <strong>&quot;Verify My Registration&quot;</strong>.</li>
                  </ol>
                  <div className="pt-2 text-[11px] text-gray-500 border-t border-gray-200/60 flex items-center justify-between">
                    <span>Target URL: <strong className="text-gray-700">{org}</strong></span>
                    <button
                      onClick={() => window.open(effectiveUrl, '_blank', 'noopener,noreferrer')}
                      className="text-kit-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      Reopen Registration Page <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ) : step === 'VERIFYING' ? (
              /* VERIFYING LOADER */
              <div className="py-12 text-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-kit-600 mx-auto" />
                <div>
                  <h4 className="text-base font-bold text-gray-900">Checking registration status...</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    Inspecting connection with CareerAI Apply Agent and verified submission records.
                  </p>
                </div>
              </div>
            ) : step === 'VERIFIED' ? (
              /* AUTOMATICALLY VERIFIED */
              <div className="py-8 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-xs">
                  <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-2">
                    <ShieldCheck className="h-3.5 w-3.5" /> Automatically Verified
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Registration Verified ✓</h4>
                  <p className="text-xs text-gray-600 mt-1.5 max-w-md mx-auto">
                    CareerAI detected that your registration for <strong>{title}</strong> was successfully submitted on the external website.
                  </p>
                  {detectedAppId && (
                    <div className="mt-3 inline-block rounded-xl bg-gray-50 border border-gray-200 px-4 py-2 text-xs text-gray-700">
                      Application / Registration ID: <strong className="font-mono text-gray-900">{detectedAppId}</strong>
                    </div>
                  )}
                </div>
              </div>
            ) : step === 'UNABLE_TO_VERIFY' ? (
              /* UNABLE TO VERIFY - CONTROLLED CONFIRMATION FLOW */
              <div className="py-6 space-y-5">
                <div className="flex items-start gap-3 rounded-2xl bg-amber-50/80 border border-amber-200 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white font-bold">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">Unable to Automatically Verify</h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      CareerAI could not automatically confirm submission on the external website.
                    </p>
                  </div>
                </div>

                {!showManualForm ? (
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4 text-center">
                    <h5 className="text-sm font-bold text-gray-900">
                      Did you successfully submit the registration?
                    </h5>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                      Please be honest. If you have completed and submitted the external form, you can confirm it below.
                    </p>

                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleNotYetSubmitted}
                        disabled={actionLoading}
                        className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Not yet
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowManualForm(true)}
                        className="rounded-xl bg-kit-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-kit-700 transition-colors"
                      >
                        Yes, I submitted it
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Manual Submission Details */
                  <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-5 space-y-4">
                    <div>
                      <h5 className="text-sm font-bold text-gray-900">Manual Registration Confirmation</h5>
                      <p className="text-xs text-gray-500 mt-0.5">
                        This registration will be marked as <strong className="text-gray-800">Student Confirmed</strong> in your dashboard and visible to your mentor.
                      </p>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">
                          Registration / Application ID (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. APP-2026-98124"
                          value={manualAppId}
                          onChange={(e) => setManualAppId(e.target.value)}
                          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs focus:border-kit-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">
                          Confirmation Notes / Reference (Optional)
                        </label>
                        <textarea
                          placeholder="Provide any reference, confirmation email details, or notes..."
                          value={manualNotes}
                          onChange={(e) => setManualNotes(e.target.value)}
                          rows={2}
                          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs focus:border-kit-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setShowManualForm(false)}
                        className="text-xs text-gray-500 hover:text-gray-700 font-semibold"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={handleStudentConfirmed}
                        disabled={actionLoading}
                        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors flex items-center gap-2"
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Confirm Registration
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : step === 'STUDENT_CONFIRMED' ? (
              /* STUDENT CONFIRMED STATE */
              <div className="py-8 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 shadow-xs">
                  <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold mb-2">
                    <User className="h-3.5 w-3.5" /> Student Confirmed
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Registration Marked as Student Confirmed</h4>
                  <p className="text-xs text-gray-600 mt-1.5 max-w-md mx-auto">
                    You confirmed submitting your registration for <strong>{title}</strong>. Your mentor has been notified.
                  </p>
                  {detectedAppId && (
                    <div className="mt-3 inline-block rounded-xl bg-gray-50 border border-gray-200 px-4 py-2 text-xs text-gray-700">
                      Application ID: <strong className="font-mono text-gray-900">{detectedAppId}</strong>
                    </div>
                  )}
                </div>
              </div>
            ) : step === 'IN_PROGRESS_SAVED' ? (
              /* IN PROGRESS SAVED */
              <div className="py-8 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <Clock className="h-8 w-8 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Registration In Progress</h4>
                  <p className="text-xs text-gray-600 mt-1.5 max-w-md mx-auto">
                    No problem! Your progress is saved. You can complete the external form and click <strong>Verify My Registration</strong> anytime.
                  </p>
                </div>
              </div>
            ) : (
              /* REVIEW STAGE */
              <div className="space-y-5">
                {/* Target URL Banner */}
                <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600">
                  <span className="font-medium text-gray-700">Registration Link:</span>
                  <a
                    href={effectiveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-kit-600 hover:underline truncate max-w-xs flex items-center gap-1 font-semibold"
                  >
                    {effectiveUrl} <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>

                {/* Status metrics banner */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/60 p-3 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs">
                      {readyCount}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-900">Available Info</p>
                      <p className="text-[11px] text-emerald-700">{readyCount} fields ready to reuse</p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-amber-50/80 border border-amber-200/60 p-3 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white font-bold text-xs">
                      {missingCount}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-900">Missing Info</p>
                      <p className="text-[11px] text-amber-700">{missingCount > 0 ? `${missingCount} fields missing` : 'All profile fields ready'}</p>
                    </div>
                  </div>
                </div>

                {/* Profile Information List */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Profile Information Summary
                    </h4>
                    <Link
                      href="/profile"
                      className="text-xs font-semibold text-kit-600 hover:text-kit-700"
                    >
                      Edit Main Profile ↗
                    </Link>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 text-xs">
                    {availableFieldsList.map((f) => (
                      <div key={f.key} className="flex items-center justify-between px-3.5 py-2">
                        <span className="font-medium text-gray-500">{f.label}</span>
                        <span className="font-semibold text-gray-800 truncate max-w-[260px]">
                          {f.value || <span className="text-amber-600 font-normal italic">Missing</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Missing Fields Inline Capture */}
                {missingCount > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3 text-xs">
                    <h5 className="font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      Fill in Missing Details for Seamless Autofill
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {!studentData?.phone && (
                        <div>
                          <label className="block font-medium text-gray-700 mb-1">Phone Number</label>
                          <input
                            type="text"
                            placeholder="+91 9876543210"
                            value={missingFields.phone}
                            onChange={(e) => setMissingFields({ ...missingFields, phone: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 focus:border-kit-500 focus:outline-none bg-white"
                          />
                        </div>
                      )}
                      {!studentData?.department && (
                        <div>
                          <label className="block font-medium text-gray-700 mb-1">Department</label>
                          <input
                            type="text"
                            placeholder="Computer Science / AI"
                            value={missingFields.department}
                            onChange={(e) => setMissingFields({ ...missingFields, department: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 focus:border-kit-500 focus:outline-none bg-white"
                          />
                        </div>
                      )}
                      {!studentData?.college && (
                        <div>
                          <label className="block font-medium text-gray-700 mb-1">College / University</label>
                          <input
                            type="text"
                            placeholder="College Name"
                            value={missingFields.college}
                            onChange={(e) => setMissingFields({ ...missingFields, college: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 focus:border-kit-500 focus:outline-none bg-white sm:col-span-2"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="saveToProfile"
                        checked={saveToProfile}
                        onChange={(e) => setSaveToProfile(e.target.checked)}
                        className="rounded text-kit-600 focus:ring-kit-500"
                      />
                      <label htmlFor="saveToProfile" className="text-xs text-gray-700 cursor-pointer font-medium">
                        Save these details to my main CareerAI profile
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fixed Footer */}
          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex items-center justify-between">
            {step === 'EXPIRED' || step === 'NO_URL' || step === 'VERIFIED' || step === 'STUDENT_CONFIRMED' || step === 'IN_PROGRESS_SAVED' ? (
              <div className="flex items-center justify-end w-full">
                <button
                  onClick={onClose}
                  className="rounded-xl bg-kit-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-kit-700 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : step === 'STARTED' ? (
              <div className="flex items-center justify-between w-full gap-3">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Continue Later
                </button>
                <button
                  onClick={handleVerifyRegistration}
                  disabled={actionLoading}
                  className="rounded-xl bg-kit-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-kit-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Verify My Registration
                </button>
              </div>
            ) : step === 'UNABLE_TO_VERIFY' ? (
              <div className="flex items-center justify-between w-full">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              /* REVIEW STAGE FOOTER */
              <div className="flex items-center justify-between w-full gap-3">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <Link
                    href="/profile"
                    onClick={onClose}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Edit Profile
                  </Link>

                  <button
                    onClick={handleContinueToApplication}
                    disabled={actionLoading || loading}
                    className="rounded-xl bg-kit-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-kit-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Continue to Registration <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
