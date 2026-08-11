'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ExtendedApplication, ApplicationStatus, ApplicationType } from '@/types/placement';
import { verifyGithubProfile, verifyCodolioProfile } from '@/lib/placementApi';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface AddApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appData: any) => Promise<void> | void;
  initialData?: ExtendedApplication | null;
}

const STATUSES: ApplicationStatus[] = [
  'APPLIED',
  'SHORTLISTED',
  'INTERVIEW',
  'SELECTED',
  'REJECTED',
  'SAVED',
  'WITHDRAWN',
];

const TYPES: ApplicationType[] = ['JOB', 'INTERNSHIP', 'HACKATHON', 'OTHER'];

type VerificationState = 'idle' | 'checking' | 'verified' | 'failed';

export function AddApplicationModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: AddApplicationModalProps) {
  const [form, setForm] = useState({
    companyName: '',
    position: '',
    location: '',
    applicationUrl: '',
    githubUrl: '',
    codolioUrl: '',
    salary: '',
    appliedDate: new Date().toISOString().split('T')[0],
    deadline: '',
    status: 'APPLIED' as ApplicationStatus,
    applicationType: 'JOB' as ApplicationType,
    resumeVersion: 'Version 3 - Tech Focused',
    notes: '',
    nextAction: '',
    description: '',
  });

  const [githubState, setGithubState] = useState<VerificationState>('idle');
  const [githubMsg, setGithubMsg] = useState('');

  const [codolioState, setCodolioState] = useState<VerificationState>('idle');
  const [codolioMsg, setCodolioMsg] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (initialData) {
      setForm({
        companyName: initialData.companyName || '',
        position: initialData.position || '',
        location: initialData.location || '',
        applicationUrl: initialData.applicationUrl || '',
        githubUrl: initialData.githubUrl || '',
        codolioUrl: initialData.codolioUrl || '',
        salary: initialData.salary || '',
        appliedDate: initialData.appliedDate || '',
        deadline: initialData.deadline || '',
        status: initialData.status || 'APPLIED',
        applicationType: initialData.applicationType || 'JOB',
        resumeVersion: initialData.resumeVersion || 'Version 3 - Tech Focused',
        notes: initialData.notes || '',
        nextAction: initialData.nextAction || '',
        description: initialData.description || '',
      });
      setGithubState(initialData.githubUrl ? 'verified' : 'idle');
      setGithubMsg(initialData.githubUrl ? 'GitHub profile verified' : '');
      setCodolioState(initialData.codolioUrl ? 'verified' : 'idle');
      setCodolioMsg(initialData.codolioUrl ? 'Codolio profile verified' : '');
    } else {
      setForm({
        companyName: '',
        position: '',
        location: '',
        applicationUrl: '',
        githubUrl: '',
        codolioUrl: '',
        salary: '',
        appliedDate: new Date().toISOString().split('T')[0],
        deadline: '',
        status: 'APPLIED',
        applicationType: 'JOB',
        resumeVersion: 'Version 3 - Tech Focused',
        notes: '',
        nextAction: '',
        description: '',
      });
      setGithubState('idle');
      setGithubMsg('');
      setCodolioState('idle');
      setCodolioMsg('');
    }
    setSubmitError('');
    setIsSubmitting(false);
  }, [initialData, isOpen]);

  const handleVerifyGithub = async (urlToVerify?: string) => {
    const targetUrl = (urlToVerify !== undefined ? urlToVerify : form.githubUrl).trim();
    if (!targetUrl) {
      setGithubState('failed');
      setGithubMsg('GitHub profile URL is required.');
      return false;
    }

    setGithubState('checking');
    setGithubMsg('Verifying GitHub...');

    try {
      const res = await verifyGithubProfile(targetUrl);
      if (res.valid && res.verified) {
        setGithubState('verified');
        setGithubMsg('GitHub profile verified ✓');
        if (res.normalizedUrl) {
          setForm((prev) => ({ ...prev, githubUrl: res.normalizedUrl }));
        }
        return true;
      } else {
        setGithubState('failed');
        setGithubMsg(res.message || 'GitHub profile could not be verified.');
        return false;
      }
    } catch (err: any) {
      setGithubState('failed');
      const errRes = err.response?.data;
      setGithubMsg(errRes?.message || 'GitHub profile could not be verified.');
      return false;
    }
  };

  const handleVerifyCodolio = async (urlToVerify?: string) => {
    const targetUrl = (urlToVerify !== undefined ? urlToVerify : form.codolioUrl).trim();
    if (!targetUrl) {
      setCodolioState('failed');
      setCodolioMsg('Codolio profile URL is required.');
      return false;
    }

    setCodolioState('checking');
    setCodolioMsg('Verifying Codolio...');

    try {
      const res = await verifyCodolioProfile(targetUrl);
      if (res.valid && res.verified) {
        setCodolioState('verified');
        setCodolioMsg('Codolio profile verified ✓');
        if (res.normalizedUrl) {
          setForm((prev) => ({ ...prev, codolioUrl: res.normalizedUrl }));
        }
        return true;
      } else {
        setCodolioState('failed');
        setCodolioMsg(res.message || 'Codolio profile could not be verified.');
        return false;
      }
    } catch (err: any) {
      setCodolioState('failed');
      const errRes = err.response?.data;
      setCodolioMsg(errRes?.message || 'Codolio profile could not be verified.');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!form.companyName.trim() || !form.position.trim()) {
      setSubmitError('Company name and job role are required.');
      return;
    }

    let isGhValid = githubState === 'verified';
    if (!isGhValid) {
      isGhValid = await handleVerifyGithub();
    }

    let isCdValid = codolioState === 'verified';
    if (!isCdValid) {
      isCdValid = await handleVerifyCodolio();
    }

    if (!isGhValid || !isCdValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to save application';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    form.companyName.trim() !== '' &&
    form.position.trim() !== '' &&
    githubState === 'verified' &&
    codolioState === 'verified';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Application' : 'Add New Application'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
        {/* Scrollable Form Fields Container */}
        <div className="space-y-4 pb-4">
          {submitError && (
            <div className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company Name *"
              placeholder="e.g. Zoho, Infosys"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              required
            />
            <Input
              label="Job Role *"
              placeholder="e.g. Software Engineer, SDE Intern"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              required
            />
          </div>

          {/* Profile Links Section */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
              Profile Links (Required & Verified)
            </h4>

            {/* GitHub Profile Field */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">
                GitHub Profile *
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://github.com/username"
                  value={form.githubUrl}
                  onChange={(e) => {
                    setForm({ ...form, githubUrl: e.target.value });
                    setGithubState('idle');
                    setGithubMsg('');
                  }}
                  onBlur={() => {
                    if (form.githubUrl.trim() && githubState === 'idle') {
                      handleVerifyGithub(form.githubUrl);
                    }
                  }}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                    githubState === 'verified'
                      ? 'border-emerald-500 bg-emerald-50/20'
                      : githubState === 'failed'
                      ? 'border-red-400 bg-red-50/20'
                      : 'border-gray-300 focus:border-indigo-500'
                  }`}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleVerifyGithub()}
                  disabled={githubState === 'checking'}
                >
                  {githubState === 'checking' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify'
                  )}
                </Button>
              </div>
              {githubMsg && (
                <div className="mt-1 flex items-center gap-1.5 text-xs">
                  {githubState === 'verified' && (
                    <span className="flex items-center gap-1 font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {githubMsg}
                    </span>
                  )}
                  {githubState === 'failed' && (
                    <span className="flex items-center gap-1 font-semibold text-red-600">
                      <XCircle className="h-3.5 w-3.5" />
                      {githubMsg}
                    </span>
                  )}
                  {githubState === 'checking' && (
                    <span className="text-gray-500">{githubMsg}</span>
                  )}
                </div>
              )}
            </div>

            {/* Codolio Profile Field */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">
                Codolio Profile *
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://codolio.com/profile/username"
                  value={form.codolioUrl}
                  onChange={(e) => {
                    setForm({ ...form, codolioUrl: e.target.value });
                    setCodolioState('idle');
                    setCodolioMsg('');
                  }}
                  onBlur={() => {
                    if (form.codolioUrl.trim() && codolioState === 'idle') {
                      handleVerifyCodolio(form.codolioUrl);
                    }
                  }}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                    codolioState === 'verified'
                      ? 'border-emerald-500 bg-emerald-50/20'
                      : codolioState === 'failed'
                      ? 'border-red-400 bg-red-50/20'
                      : 'border-gray-300 focus:border-indigo-500'
                  }`}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleVerifyCodolio()}
                  disabled={codolioState === 'checking'}
                >
                  {codolioState === 'checking' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify'
                  )}
                </Button>
              </div>
              {codolioMsg && (
                <div className="mt-1 flex items-center gap-1.5 text-xs">
                  {codolioState === 'verified' && (
                    <span className="flex items-center gap-1 font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {codolioMsg}
                    </span>
                  )}
                  {codolioState === 'failed' && (
                    <span className="flex items-center gap-1 font-semibold text-red-600">
                      <XCircle className="h-3.5 w-3.5" />
                      {codolioMsg}
                    </span>
                  )}
                  {codolioState === 'checking' && (
                    <span className="text-gray-500">{codolioMsg}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Location"
              placeholder="e.g. Chennai / Remote"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <Input
              label="Salary / Stipend"
              placeholder="e.g. CTC: ₹8 - 12 LPA or ₹40k/mo"
              value={form.salary}
              onChange={(e) => setForm({ ...form, salary: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">Application Type</label>
              <select
                value={form.applicationType}
                onChange={(e) => setForm({ ...form, applicationType: e.target.value as ApplicationType })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ApplicationStatus })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {STATUSES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">Resume Version Used</label>
              <input
                type="text"
                value={form.resumeVersion}
                onChange={(e) => setForm({ ...form, resumeVersion: e.target.value })}
                placeholder="e.g. Version 3 - Tech Focused"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Application Date"
              type="date"
              value={form.appliedDate}
              onChange={(e) => setForm({ ...form, appliedDate: e.target.value })}
            />
            <Input
              label="Application Deadline"
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />
          </div>

          <Input
            label="Job URL / Career Portal Link"
            type="url"
            placeholder="https://careers.company.com/..."
            value={form.applicationUrl}
            onChange={(e) => setForm({ ...form, applicationUrl: e.target.value })}
          />

          <Input
            label="Next Action (Optional)"
            placeholder="e.g. Technical Interview on Aug 12, 10:30 AM"
            value={form.nextAction}
            onChange={(e) => setForm({ ...form, nextAction: e.target.value })}
          />

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Notes / Comments</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any specific notes, referral details, or assessment info..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="sticky bottom-0 -mx-6 -mb-6 mt-2 flex justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4 z-10">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!isFormValid || isSubmitting}>
            {isSubmitting
              ? initialData
                ? 'Saving Changes...'
                : 'Adding Application...'
              : initialData
              ? 'Save Changes'
              : 'Add Application'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
