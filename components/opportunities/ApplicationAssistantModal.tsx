'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, AlertCircle, ExternalLink, Sparkles, User, FileText,
  Building, GraduationCap, ShieldCheck, Loader2,
  CheckCircle2, Clock, AlertTriangle, ArrowRight
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

type Step = 'REVIEW' | 'STARTED' | 'COMPLETED' | 'ALREADY_EXISTS' | 'EXPIRED' | 'NO_URL';

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
  const [alreadyExists, setAlreadyExists] = useState(false);

  // Missing fields input state
  const [missingFields, setMissingFields] = useState({
    phone: '',
    department: '',
    college: '',
    location: ''
  });
  const [saveToProfile, setSaveToProfile] = useState(true);
  const [isEditingMissing, setIsEditingMissing] = useState(false);

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
    setAlreadyExists(false);
    setMissingFields({ phone: '', department: '', college: '', location: '' });
    setSaveToProfile(true);
    setIsEditingMissing(false);
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
        setAlreadyExists(!!res.data.alreadyExists);
        if (res.data.opportunity?.effectiveRegistrationUrl) {
          setEffectiveUrl(res.data.opportunity.effectiveRegistrationUrl);
        }

        if (res.data.alreadyExists) {
          setStep('ALREADY_EXISTS');
        } else {
          // Check deadline for new registrations only
          const deadlineVal = opportunity.applicationDeadline || opportunity.deadline;
          if (deadlineVal && !isOpportunityOpen(deadlineVal, opportunity.status)) {
            setStep('EXPIRED');
          } else {
            setStep('REVIEW');
          }
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

    console.log("Initiating opportunity:", opportunity.id);
    setActionLoading(true);
    setErrorMessage(null);

    try {
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
        if (res.data.alreadyExists && res.data.status !== 'INITIATED') {
          setAlreadyExists(true);
          setStep('ALREADY_EXISTS');
          return;
        }

        const targetUrl = res.data.registrationUrl || effectiveUrl;
        // Open official registration page in a new tab
        window.open(targetUrl, '_blank', 'noopener,noreferrer');

        // Transition to STARTED stage
        setStep('STARTED');
      } else {
        const errorMsg = res.data.error || res.data.message || 'Unable to initiate application.';
        setErrorMessage(errorMsg);
      }
    } catch (err: any) {
      console.error('API Error initiating opportunity application:', err);
      const serverError = err?.response?.data?.error || err?.response?.data?.message;
      setErrorMessage(serverError || 'Unable to open the application link. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCompletion = async () => {
    if (!opportunity) return;
    setActionLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.post(`/opportunities/${opportunity.id}/confirm`);
      if (res.data.success) {
        setStep('COMPLETED');
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.data.message || 'Failed to mark application as completed.');
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Failed to confirm application completion.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen || !opportunity) return null;

  const title = opportunity.title || opportunity.role || 'Opportunity';
  const org = opportunity.organization || opportunity.companyName || 'Company / Host';

  // Calculate ready vs missing field counts
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
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-xs">
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
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
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
            ) : step === 'ALREADY_EXISTS' ? (
              <div className="py-6 space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Application Already Exists</h4>
                  <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                    You have already initiated or submitted an application for <strong>{title}</strong> at <strong>{org}</strong>.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                  <Link
                    href="/applications"
                    onClick={onClose}
                    className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors"
                  >
                    View Application
                  </Link>
                  {effectiveUrl && (
                    <button
                      onClick={() => {
                        window.open(effectiveUrl, '_blank', 'noopener,noreferrer');
                        setStep('STARTED');
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                      Continue Application <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ) : step === 'STARTED' ? (
              <div className="py-6 space-y-5">
                <div className="flex items-center gap-3 rounded-2xl bg-indigo-50/80 border border-indigo-100 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">
                    <ExternalLink className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-indigo-950">Application Started ✓</h4>
                    <p className="text-xs text-indigo-700 mt-0.5">
                      The official registration page has been opened in a new tab.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-xs text-gray-600 space-y-2">
                  <p className="font-semibold text-gray-900">Next Steps:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Complete your registration / form submission on the opened external website.</li>
                    <li>Submit the external registration form.</li>
                    <li>Return to CareerAI and click <strong>"I Completed My Registration"</strong> below.</li>
                  </ol>
                </div>
              </div>
            ) : step === 'COMPLETED' ? (
              <div className="py-8 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900">✓ Registration Confirmed</h4>
                  <p className="text-xs text-gray-500 mt-1.5 max-w-md mx-auto">
                    You have successfully registered for: <strong>{title}</strong> at <strong>{org}</strong>. Your placement status is updated to <strong>REGISTERED ✓</strong>.
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
                    className="font-mono text-indigo-600 hover:underline truncate max-w-xs flex items-center gap-1 font-semibold"
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
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      Edit Main Profile ↗
                    </Link>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 text-xs">
                    {[
                      { label: 'Full Name', val: studentData?.name },
                      { label: 'Email', val: studentData?.email },
                      { label: 'Phone', val: studentData?.phone || missingFields.phone },
                      { label: 'College', val: studentData?.college || missingFields.college },
                      { label: 'Department', val: studentData?.department || missingFields.department },
                      { label: 'Year', val: studentData?.year },
                      { label: 'CGPA', val: studentData?.cgpa }
                    ].map((field) => (
                      <div key={field.label} className="flex items-center justify-between p-2.5">
                        <span className="text-gray-500">{field.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                            {field.val || '—'}
                            {field.val && <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">Available from Profile ✓</span>}
                          </span>
                          {field.val && (
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(field.val || '')}
                              className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors"
                            >
                              Copy
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center justify-between p-2.5">
                      <span className="text-gray-500">GitHub Profile</span>
                      <span className="font-semibold text-gray-900 flex items-center gap-1">
                        {studentData?.verifiedGitHub ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold text-[11px]">
                            Verified ✓
                          </span>
                        ) : (
                          studentData?.githubUrl || '—'
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5">
                      <span className="text-gray-500">LinkedIn Profile</span>
                      <span className="font-semibold text-gray-900 flex items-center gap-1">
                        {studentData?.verifiedLinkedIn ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold text-[11px]">
                            Verified ✓
                          </span>
                        ) : (
                          studentData?.linkedinUrl || '—'
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5">
                      <span className="text-gray-500">Codolio Profile</span>
                      <span className="font-semibold text-gray-900 flex items-center gap-1">
                        {studentData?.verifiedCodolio ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold text-[11px]">
                            Verified ✓
                          </span>
                        ) : (
                          studentData?.codolioUrl || '—'
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5">
                      <span className="text-gray-500">Active Resume</span>
                      <span className="font-semibold text-gray-900 flex items-center gap-1">
                        {studentData?.resumeName ? (
                          <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-bold text-[11px] truncate max-w-[200px]">
                            📄 {studentData.resumeName} Attached ✓
                          </span>
                        ) : (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-medium text-[11px]">
                            No active resume uploaded
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Missing Details Form Inputs */}
                {(!studentData?.phone || !studentData?.department || !studentData?.college) && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>Some profile information is incomplete</span>
                    </div>
                    <p className="text-xs text-amber-800">
                      Provide missing details below for your registration:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {!studentData?.phone && (
                        <div>
                          <label className="block font-medium text-gray-700 mb-1">Phone Number</label>
                          <input
                            type="text"
                            placeholder="+91 9876543210"
                            value={missingFields.phone}
                            onChange={(e) => setMissingFields({ ...missingFields, phone: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 focus:border-indigo-500 focus:outline-none bg-white"
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
                            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 focus:border-indigo-500 focus:outline-none bg-white"
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
                            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 focus:border-indigo-500 focus:outline-none bg-white sm:col-span-2"
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
                        className="rounded text-indigo-600 focus:ring-indigo-500"
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
            {step === 'EXPIRED' || step === 'NO_URL' ? (
              <button
                onClick={onClose}
                className="w-full rounded-xl bg-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            ) : step === 'ALREADY_EXISTS' ? (
              <div className="flex items-center justify-end w-full gap-3">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
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
                  onClick={handleConfirmCompletion}
                  disabled={actionLoading}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  I Completed My Registration
                </button>
              </div>
            ) : step === 'COMPLETED' ? (
              <div className="flex items-center justify-end w-full">
                <button
                  onClick={onClose}
                  className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
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
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
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
