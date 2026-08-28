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
  Megaphone
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

  const updateRegistrationStatus = async (registrationId: string, newStatus: string) => {
    try {
      await api.put(`/opportunity-registrations/${registrationId}/status`, { status: newStatus });
      setRegistrations((prev) =>
        prev.map((r) => (r.id === registrationId ? { ...r, status: newStatus } : r))
      );
      showToast(`Student status updated to ${newStatus}.`);
    } catch (err) {
      showToast('Failed to update registration status.', 'error');
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
            const targetLabel = opp.targetDepartment
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto"
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

                      {/* Status Select */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500">Status:</span>
                        <select
                          value={reg.status}
                          onChange={(e) => updateRegistrationStatus(reg.id, e.target.value)}
                          className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-bold focus:border-kit-500 focus:outline-none bg-white"
                        >
                          <option value="INITIATED">INITIATED</option>
                          <option value="REGISTERED">REGISTERED ✓</option>
                          <option value="SHORTLISTED">SHORTLISTED 🎉</option>
                          <option value="SELECTED">SELECTED 🏆</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
