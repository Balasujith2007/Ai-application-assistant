'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Users,
  Loader2,
  Calendar,
  MapPin,
  Building2,
  ExternalLink,
  ShieldCheck,
  Trash2,
  CheckCircle2,
  XCircle,
  Briefcase,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  Send,
  Megaphone,
  Eye,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { OpportunityBroadcastModal } from '@/components/opportunities/OpportunityBroadcastModal';
import api from '@/lib/api';

export interface MentorOpportunity {
  id: string;
  title: string;
  organization: string;
  type: string;
  status: string;
  location?: string;
  mode?: string;
  salary?: string;
  stipend?: string;
  prize?: string;
  applicationDeadline: string;
  viewsCount: number;
  registrationCount: number;
  createdAt: string;
  requiredSkills?: string[];
  opportunityUrl?: string;
  registrationUrl?: string;
  targetAudience?: string;
  targetDepartment?: string;
  targetYear?: number;
  targetSection?: string;
}

export interface StudentRegistrationItem {
  id: string;
  status: string;
  initiatedAt: string;
  registeredAt?: string;
  notes?: string;
  student: {
    id: string;
    name: string;
    email: string;
    profile?: {
      college?: string;
      department?: string;
      year?: number;
      section?: string;
      githubUrl?: string;
      linkedinUrl?: string;
      codolioUrl?: string;
    };
    verifiedProfiles?: Array<{
      platform: string;
      profileUrl: string;
      verificationStatus: string;
    }>;
    resumes?: Array<{
      id: string;
      fileName: string;
      fileUrl: string;
    }>;
  };
  evidences?: Array<{
    id: string;
    status: string;
    evidenceFileUrl: string;
    fileName: string;
    fileSize: number;
    ocrConfidence: number;
    extractedData?: any;
    validationResults?: any;
    mismatchReasons?: string[];
    reviewerNotes?: string;
    submittedAt: string;
  }>;
}

export default function MentorOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<MentorOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Broadcast Modal state (shared with HOD)
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  // Registration modal
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [selectedOppTitle, setSelectedOppTitle] = useState<string>('');
  const [registrations, setRegistrations] = useState<StudentRegistrationItem[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);

  // Evidence Review Modal state
  const [reviewEvidenceModal, setReviewEvidenceModal] = useState<{
    isOpen: boolean;
    regId: string;
    studentName: string;
    studentEmail: string;
    evidence: any;
  } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewActionLoading, setReviewActionLoading] = useState(false);
  const [rejectingReasonInput, setRejectingReasonInput] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/opportunities?filter=my`);
      setOpportunities(res.data.data || []);
    } catch (err) {
      console.error('Failed to load mentor opportunities:', err);
      showToast('Failed to load opportunities.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const openRegistrations = async (opp: MentorOpportunity) => {
    setSelectedOppId(opp.id);
    setSelectedOppTitle(opp.title);
    setLoadingRegs(true);

    try {
      const res = await api.get(`/opportunities/${opp.id}/registrations`);
      setRegistrations(res.data.data || []);
    } catch (err) {
      console.error('Failed to load registrations:', err);
      showToast('Failed to load student registrations.', 'error');
    } finally {
      setLoadingRegs(false);
    }
  };

  const handleReviewDecision = async (action: 'APPROVE' | 'REJECT') => {
    if (!reviewEvidenceModal || !selectedOppId) return;
    if (action === 'REJECT' && !rejectingReasonInput.trim()) {
      showToast('Please provide a reason for rejecting the evidence.', 'error');
      return;
    }

    setReviewActionLoading(true);
    try {
      const res = await api.post(`/opportunities/${selectedOppId}/review`, {
        evidenceId: reviewEvidenceModal.evidence?.id,
        registrationId: reviewEvidenceModal.regId,
        action,
        reviewerNotes: reviewNotes.trim() || undefined,
        rejectionReason: action === 'REJECT' ? rejectingReasonInput.trim() : undefined
      });

      if (res.data.success) {
        const newStatus = action === 'APPROVE' ? 'VERIFIED' : 'REJECTED';
        setRegistrations((prev) =>
          prev.map((r) =>
            r.id === reviewEvidenceModal.regId
              ? {
                  ...r,
                  status: newStatus,
                  evidences: r.evidences?.map((e) =>
                    e.id === reviewEvidenceModal.evidence?.id
                      ? { ...e, status: newStatus, reviewerNotes: reviewNotes.trim() }
                      : e
                  )
                }
              : r
          )
        );
        showToast(
          action === 'APPROVE'
            ? `Registration verified for ${reviewEvidenceModal.studentName}.`
            : `Registration evidence rejected.`,
          'success'
        );
        setReviewEvidenceModal(null);
        setReviewNotes('');
        setRejectingReasonInput('');
        setShowRejectForm(false);
      } else {
        showToast(res.data.error || 'Failed to complete review.', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Review submission failed.', 'error');
    } finally {
      setReviewActionLoading(false);
    }
  };

  const updateOpportunityStatus = async (oppId: string, newStatus: 'PUBLISHED' | 'CLOSED' | 'DRAFT') => {
    setActionLoadingId(oppId);
    try {
      const res = await api.put(`/opportunities/${oppId}`, { status: newStatus });
      if (res.data.success || res.status === 200) {
        setOpportunities((prev) =>
          prev.map((o) => (o.id === oppId ? { ...o, status: newStatus } : o))
        );
        showToast(`Opportunity marked as ${newStatus.toLowerCase()}.`);
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to update status.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const deleteOpportunity = async (oppId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    setActionLoadingId(oppId);
    try {
      const res = await api.delete(`/opportunities/${oppId}`);
      if (res.data.success || res.status === 200) {
        setOpportunities((prev) => prev.filter((o) => o.id !== oppId));
        showToast('Opportunity deleted successfully.');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete opportunity.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const [disqualifyModal, setDisqualifyModal] = useState<{ isOpen: boolean; regId: string; studentName: string } | null>(null);
  const [disqualifyReason, setDisqualifyReason] = useState('Eligibility mismatch');
  const [customReason, setCustomReason] = useState('');

  const [stepModal, setStepModal] = useState<{ isOpen: boolean; regId: string; studentName: string } | null>(null);
  const [stepType, setStepType] = useState('INTERVIEW');
  const [stepTitle, setStepTitle] = useState('');
  const [stepDeadline, setStepDeadline] = useState('');
  const [stepMeetingLink, setStepMeetingLink] = useState('');

  const updateRegistrationStatus = async (registrationId: string, newStatus: string, reason?: string) => {
    if (newStatus === 'DISQUALIFIED' && !reason) {
      const regItem = registrations.find((r) => r.id === registrationId);
      setDisqualifyModal({
        isOpen: true,
        regId: registrationId,
        studentName: regItem?.student.name || 'Student'
      });
      return;
    }

    try {
      await api.put(`/opportunity-registrations/${registrationId}/status`, {
        status: newStatus,
        reason: reason || undefined
      });
      setRegistrations((prev) =>
        prev.map((r) => (r.id === registrationId ? { ...r, status: newStatus } : r))
      );
      showToast(`Student status updated to ${newStatus}.`);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to update registration status.', 'error');
    }
  };

  const handleConfirmDisqualification = async () => {
    if (!disqualifyModal) return;
    const finalReason = disqualifyReason === 'Other' ? customReason : disqualifyReason;
    if (!finalReason.trim()) {
      showToast('Please provide a disqualification reason.', 'error');
      return;
    }

    await updateRegistrationStatus(disqualifyModal.regId, 'DISQUALIFIED', finalReason);
    setDisqualifyModal(null);
    setCustomReason('');
  };

  const handleCreateStep = async () => {
    if (!stepModal || !stepTitle.trim()) {
      showToast('Please enter a step title.', 'error');
      return;
    }

    try {
      await api.post(`/opportunity-registrations/${stepModal.regId}/workflow-steps`, {
        stepType,
        title: stepTitle.trim(),
        deadline: stepDeadline || undefined,
        meetingLink: stepMeetingLink || undefined
      });
      showToast(`Scheduled "${stepTitle}" for ${stepModal.studentName}.`);
      setStepModal(null);
      setStepTitle('');
      setStepDeadline('');
      setStepMeetingLink('');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to schedule workflow step.', 'error');
    }
  };

  // Filter and search
  const filtered = opportunities.filter((o) => {
    // Status filter
    if (filter === 'published' && o.status !== 'PUBLISHED') return false;
    if (filter === 'draft' && o.status !== 'DRAFT') return false;
    if (filter === 'closed' && o.status !== 'CLOSED') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = o.title?.toLowerCase().includes(q);
      const matchOrg = o.organization?.toLowerCase().includes(q);
      const matchType = o.type?.toLowerCase().includes(q);
      const matchSkills = Array.isArray(o.requiredSkills) && o.requiredSkills.some((s) => s.toLowerCase().includes(q));
      if (!matchTitle && !matchOrg && !matchType && !matchSkills) return false;
    }

    return true;
  });

  const counts = {
    all: opportunities.length,
    published: opportunities.filter((o) => o.status === 'PUBLISHED').length,
    draft: opportunities.filter((o) => o.status === 'DRAFT').length,
    closed: opportunities.filter((o) => o.status === 'CLOSED').length,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 rounded-xl px-4 py-3 shadow-lg flex items-center gap-2 text-sm font-semibold ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-kit-600" /> My Posted Opportunities
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Post, broadcast, and track student applications & registrations
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setShowBroadcastModal(true)}
          className="font-bold flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Post Opportunity
        </Button>
      </motion.div>

      {/* Search & Tabs */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All', count: counts.all },
            { id: 'published', label: 'Published', count: counts.published },
            { id: 'draft', label: 'Drafts', count: counts.draft },
            { id: 'closed', label: 'Closed', count: counts.closed },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id as any)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
                filter === t.id
                  ? 'bg-kit-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  filter === t.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title, company, skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2 text-xs font-medium focus:border-kit-600 focus:outline-none focus:ring-1 focus:ring-kit-600 shadow-sm"
          />
        </div>
      </div>

      {/* Opportunities List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 px-4 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-kit-50 flex items-center justify-center text-kit-600">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <p className="text-base font-bold text-gray-900">
              {searchQuery ? 'No matching opportunities found' : 'No opportunities posted yet'}
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              {searchQuery
                ? 'Try adjusting your search query or switching tabs.'
                : 'Broadcast a job, internship, or hackathon to start receiving student applications.'}
            </p>
          </div>
          {!searchQuery && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowBroadcastModal(true)}
              className="font-bold flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Post Opportunity
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((opp) => {
            const isClosing = actionLoadingId === opp.id;
            const isDraft = opp.status === 'DRAFT';
            const isPublished = opp.status === 'PUBLISHED';
            const isClosed = opp.status === 'CLOSED';

            // Target formatting
            const targetLabel = opp.targetAudience === 'MY_STUDENTS'
              ? 'My Students'
              : opp.targetAudience === 'OUR_STUDENTS'
              ? 'Our Students'
              : opp.targetDepartment
              ? `${opp.targetDepartment}${opp.targetYear ? ` · Yr ${opp.targetYear}` : ''}`
              : opp.targetAudience === 'BOTH'
              ? 'Students + Mentors'
              : 'All Students';

            return (
              <div
                key={opp.id}
                className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4 hover:border-gray-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-kit-700 bg-kit-50 px-2.5 py-1 rounded-md">
                      {opp.type}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {targetLabel}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          isPublished
                            ? 'bg-emerald-100 text-emerald-800'
                            : isDraft
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {opp.status}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 mt-2.5 line-clamp-1">{opp.title}</h3>
                  <p className="text-xs font-semibold text-gray-500 flex items-center gap-1 mt-0.5">
                    <Building2 className="h-3.5 w-3.5 text-gray-400" />
                    {opp.organization}
                  </p>

                  {/* Details */}
                  <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                    {opp.location && (
                      <p className="flex items-center gap-1.5 text-[11px]">
                        <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                        <span>{opp.location}</span>
                        {opp.mode && <span className="text-gray-400">({opp.mode.toLowerCase()})</span>}
                      </p>
                    )}
                    <p className="flex items-center gap-1.5 text-[11px]">
                      <Calendar className="h-3 w-3 text-gray-400 shrink-0" />
                      <span>Deadline: {new Date(opp.applicationDeadline).toLocaleDateString()}</span>
                    </p>
                    {(opp.stipend || opp.salary) && (
                      <p className="text-[11px] font-semibold text-emerald-700">
                        {opp.stipend || opp.salary}
                      </p>
                    )}
                  </div>

                  {/* Counter Statistics */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mt-4 pt-3 border-t border-gray-100">
                    <div>
                      <span className="font-bold text-gray-900 block text-sm">{opp.viewsCount}</span> Views
                    </div>
                    <div>
                      <span className="font-bold text-kit-600 block text-sm">{opp.registrationCount}</span> Registrations
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-3 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openRegistrations(opp)}
                    className="w-full text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Users className="h-3.5 w-3.5" /> View Registrations ({opp.registrationCount})
                  </Button>

                  <div className="flex items-center gap-2">
                    {isDraft && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isClosing}
                        onClick={() => updateOpportunityStatus(opp.id, 'PUBLISHED')}
                        className="flex-1 text-xs font-bold flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Publish
                      </Button>
                    )}

                    {isPublished && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isClosing}
                        onClick={() => updateOpportunityStatus(opp.id, 'CLOSED')}
                        className="flex-1 text-xs font-bold flex items-center justify-center gap-1 text-amber-700 hover:bg-amber-50"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Close Opp
                      </Button>
                    )}

                    {isClosed && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isClosing}
                        onClick={() => updateOpportunityStatus(opp.id, 'PUBLISHED')}
                        className="flex-1 text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Reopen
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isClosing}
                      onClick={() => deleteOpportunity(opp.id, opp.title)}
                      className="text-xs font-bold text-red-600 hover:bg-red-50 p-2"
                      title="Delete Opportunity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shared Broadcast Modal (Exact same form component used by HOD) */}
      <OpportunityBroadcastModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        onSuccess={() => {
          showToast('Opportunity posted & broadcasted successfully!');
          fetchOpportunities();
        }}
        mode="mentor"
      />

      {/* Student Registrations Modal */}
      <AnimatePresence>
        {selectedOppId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl rounded-2xl bg-white p-4 sm:p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto my-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Student Registrations</h2>
                  <p className="text-xs font-semibold text-kit-600">{selectedOppTitle}</p>
                </div>
                <button
                  onClick={() => setSelectedOppId(null)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingRegs ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-kit-600" />
                </div>
              ) : registrations.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  No students have registered for this opportunity yet.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {registrations.map((reg) => (
                    <div key={reg.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-900">{reg.student.name}</h4>
                          <span className="text-xs text-gray-500">({reg.student.email})</span>
                        </div>

                        <p className="text-xs text-gray-600">
                          {reg.student.profile?.department || 'Department N/A'} · Year {reg.student.profile?.year || 1} · {reg.student.profile?.college || 'College N/A'}
                        </p>

                        {/* Timestamps */}
                        <div className="flex items-center gap-3 text-[11px] font-medium text-gray-400">
                          <span>Initiated: {new Date(reg.initiatedAt).toLocaleString()}</span>
                          {reg.registeredAt && (
                            <span className="text-emerald-700 font-semibold">
                              Registered: {new Date(reg.registeredAt).toLocaleString()}
                            </span>
                          )}
                        </div>

                        {/* Links */}
                        <div className="flex flex-wrap gap-2 text-xs pt-1">
                          {reg.student.profile?.githubUrl && (
                            <a
                              href={reg.student.profile.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-kit-600 hover:underline flex items-center gap-1 font-semibold"
                            >
                              GitHub <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            </a>
                          )}
                          {reg.student.profile?.linkedinUrl && (
                            <a
                              href={reg.student.profile.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                            >
                              LinkedIn <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            </a>
                          )}
                          {reg.student.profile?.codolioUrl && (
                            <a
                              href={reg.student.profile.codolioUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-kit-600 hover:underline flex items-center gap-1 font-semibold"
                            >
                              Codolio <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            </a>
                          )}
                          {reg.student.resumes && reg.student.resumes[0] && (
                            <a
                              href={reg.student.resumes[0].fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:underline flex items-center gap-1 font-semibold"
                            >
                              Resume PDF <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Actions: Review Evidence + Status + Next Step */}
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                        {reg.evidences && reg.evidences.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setReviewEvidenceModal({
                                isOpen: true,
                                regId: reg.id,
                                studentName: reg.student.name,
                                studentEmail: reg.student.email,
                                evidence: reg.evidences![0]
                              });
                              setReviewNotes(reg.evidences![0].reviewerNotes || '');
                              setRejectingReasonInput('');
                              setShowRejectForm(false);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" /> Review Evidence
                            {reg.evidences[0].status === 'PENDING_REVIEW' && (
                              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                            )}
                          </button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setStepModal({
                              isOpen: true,
                              regId: reg.id,
                              studentName: reg.student.name
                            });
                          }}
                          className="text-[11px] font-bold px-2 py-1 text-kit-700 bg-kit-50 hover:bg-kit-100 border-kit-200"
                        >
                          + Next Step
                        </Button>

                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-500">Status:</span>
                          <select
                            value={reg.status}
                            onChange={(e) => updateRegistrationStatus(reg.id, e.target.value)}
                            className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-bold focus:border-kit-500 focus:outline-none bg-white"
                          >
                            <option value="STARTED">STARTED</option>
                            <option value="INITIATED">INITIATED</option>
                            <option value="PENDING_REVIEW">PENDING REVIEW ⏳</option>
                            <option value="PENDING_VERIFICATION">PENDING VERIFICATION ⏳</option>
                            <option value="VERIFIED">VERIFIED ✅</option>
                            <option value="REGISTERED">REGISTERED ✓</option>
                            <option value="UNDER_REVIEW">UNDER REVIEW ⏳</option>
                            <option value="SHORTLISTED">SHORTLISTED 🎉</option>
                            <option value="INTERVIEW">INTERVIEW 🗓️</option>
                            <option value="SELECTED">SELECTED 🏆</option>
                            <option value="REJECTED">NOT SELECTED</option>
                            <option value="DISQUALIFIED">DISQUALIFIED ⚠️</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Registration Evidence Review Modal */}
      <AnimatePresence>
        {reviewEvidenceModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-gray-100 my-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gradient-to-r from-amber-50/60 via-white to-amber-50/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white font-bold shadow-xs">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 leading-tight">
                      Review Registration Evidence
                    </h3>
                    <p className="text-xs text-gray-500 truncate max-w-sm">
                      {reviewEvidenceModal.studentName} ({reviewEvidenceModal.studentEmail}) • {selectedOppTitle}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setReviewEvidenceModal(null)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {/* Screenshot Display */}
                <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-900/5 p-2">
                  <div className="flex items-center justify-between px-2 py-1 mb-1.5">
                    <span className="text-xs font-bold text-gray-700">Uploaded Confirmation Screenshot</span>
                    <a
                      href={reviewEvidenceModal.evidence?.evidenceFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-kit-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      View Full Size <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="max-h-72 overflow-y-auto rounded-lg bg-white border border-gray-100 flex items-center justify-center p-2">
                    <img
                      src={reviewEvidenceModal.evidence?.evidenceFileUrl}
                      alt="Student Confirmation Evidence"
                      className="max-h-68 w-auto object-contain mx-auto rounded shadow-xs"
                    />
                  </div>
                </div>

                {/* Mismatches / Flags Alert */}
                {reviewEvidenceModal.evidence?.mismatchReasons && reviewEvidenceModal.evidence.mismatchReasons.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-1.5 text-xs text-amber-900">
                    <p className="font-bold flex items-center gap-1.5 text-amber-800">
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                      Discrepancies / Notices Detected:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-amber-800">
                      {reviewEvidenceModal.evidence.mismatchReasons.map((m: string, i: number) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Extracted Details Breakdown */}
                {reviewEvidenceModal.evidence?.extractedData && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3 text-xs">
                    <h5 className="font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                      Extracted Fields & Verification Analysis
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-2.5 rounded-lg bg-white border border-gray-200">
                        <span className="text-gray-500 text-[11px] block">Extracted Name:</span>
                        <strong className="text-gray-900 font-medium">
                          {reviewEvidenceModal.evidence.extractedData.studentName?.value || <span className="text-gray-400 italic">Not found</span>}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-gray-200">
                        <span className="text-gray-500 text-[11px] block">Extracted Email:</span>
                        <strong className="text-gray-900 font-medium truncate block">
                          {reviewEvidenceModal.evidence.extractedData.studentEmail?.value || <span className="text-gray-400 italic">Not found</span>}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-gray-200">
                        <span className="text-gray-500 text-[11px] block">Opportunity in Image:</span>
                        <strong className="text-gray-900 font-medium truncate block">
                          {reviewEvidenceModal.evidence.extractedData.opportunityName?.value || <span className="text-gray-400 italic">Not found</span>}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-gray-200">
                        <span className="text-gray-500 text-[11px] block">Reference / Reg ID:</span>
                        <strong className="text-gray-900 font-mono font-medium truncate block">
                          {reviewEvidenceModal.evidence.extractedData.referenceId?.value || <span className="text-gray-400 italic">None</span>}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-gray-200">
                        <span className="text-gray-500 text-[11px] block">Platform Identified:</span>
                        <strong className="text-gray-900 font-medium">
                          {reviewEvidenceModal.evidence.extractedData.platformName?.value || 'Generic'}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-gray-200">
                        <span className="text-gray-500 text-[11px] block">Confirmation Status:</span>
                        <strong className="text-gray-900 font-medium">
                          {reviewEvidenceModal.evidence.extractedData.confirmationWording?.value || 'Unknown'}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reviewer Notes */}
                <div className="space-y-1 text-xs">
                  <label className="font-bold text-gray-700 block">Reviewer Notes (Optional)</label>
                  <textarea
                    placeholder="Add any notes, feedback, or approval remarks..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-gray-300 p-2 text-xs focus:border-kit-500 focus:outline-none"
                  />
                </div>

                {/* Rejection Form inline */}
                {showRejectForm && (
                  <div className="rounded-xl border border-red-200 bg-red-50/50 p-3.5 space-y-2 text-xs">
                    <label className="font-bold text-red-800 block">
                      Rejection Reason (Required) *
                    </label>
                    <textarea
                      placeholder="Explain why this evidence is invalid or rejected..."
                      value={rejectingReasonInput}
                      onChange={(e) => setRejectingReasonInput(e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border border-red-300 p-2 text-xs focus:border-red-500 focus:outline-none bg-white"
                    />
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowRejectForm(false)}
                        className="text-xs text-gray-600"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={reviewActionLoading || !rejectingReasonInput.trim()}
                        onClick={() => handleReviewDecision('REJECT')}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                      >
                        {reviewActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Rejection'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              {!showRejectForm && (
                <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(true)}
                    disabled={reviewActionLoading}
                    className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Reject Evidence
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewEvidenceModal(null)}
                      className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewDecision('APPROVE')}
                      disabled={reviewActionLoading}
                      className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors flex items-center gap-2"
                    >
                      {reviewActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Approve Verification
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Disqualification Modal */}
      <AnimatePresence>
        {disqualifyModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-white p-4 sm:p-6 shadow-2xl space-y-4 my-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-red-600 flex items-center gap-1.5">
                  <AlertTriangle className="h-5 w-5" /> Disqualify Application
                </h3>
                <button
                  onClick={() => setDisqualifyModal(null)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-gray-600">
                You are disqualifying <span className="font-bold text-gray-900">{disqualifyModal.studentName}</span>. Please specify the authorized reason.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Reason Category</label>
                  <select
                    value={disqualifyReason}
                    onChange={(e) => setDisqualifyReason(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 p-2 font-medium focus:border-red-500 focus:outline-none"
                  >
                    <option value="Eligibility mismatch">Eligibility mismatch</option>
                    <option value="Missed required deadline">Missed required deadline</option>
                    <option value="Failed verification">Failed verification</option>
                    <option value="Incomplete required submission">Incomplete required submission</option>
                    <option value="Mentor/HOD decision">Mentor/HOD decision</option>
                    <option value="Other">Other (Custom)</option>
                  </select>
                </div>

                {disqualifyReason === 'Other' && (
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Custom Reason</label>
                    <input
                      type="text"
                      placeholder="Specify reason..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 p-2 font-medium focus:border-red-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <Button variant="ghost" size="sm" onClick={() => setDisqualifyModal(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmDisqualification}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                  Confirm Disqualification
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Next Step Modal */}
      <AnimatePresence>
        {stepModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-white p-4 sm:p-6 shadow-2xl space-y-4 my-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                  <Calendar className="h-5 w-5 text-kit-600" /> Schedule Next Step
                </h3>
                <button
                  onClick={() => setStepModal(null)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-gray-600">
                For student: <span className="font-bold text-gray-900">{stepModal.studentName}</span>
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Step Type</label>
                  <select
                    value={stepType}
                    onChange={(e) => setStepType(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 p-2 font-medium focus:border-kit-500 focus:outline-none"
                  >
                    <option value="INTERVIEW">Technical / HR Interview</option>
                    <option value="TECHNICAL_ASSESSMENT">Technical Assessment</option>
                    <option value="DOCUMENT_SUBMISSION">Document Submission</option>
                    <option value="EXTERNAL_VERIFICATION">External Verification</option>
                    <option value="JOINING">Joining Formalities</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Step Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Round 1 Technical Interview, Code Submission"
                    value={stepTitle}
                    onChange={(e) => setStepTitle(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 p-2 font-medium focus:border-kit-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Deadline / Scheduled Date</label>
                  <input
                    type="datetime-local"
                    value={stepDeadline}
                    onChange={(e) => setStepDeadline(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 p-2 font-medium focus:border-kit-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Meeting / Portal Link (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={stepMeetingLink}
                    onChange={(e) => setStepMeetingLink(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 p-2 font-medium focus:border-kit-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <Button variant="ghost" size="sm" onClick={() => setStepModal(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCreateStep}
                  className="bg-kit-600 hover:bg-kit-700 text-white font-bold"
                >
                  Schedule Step
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

