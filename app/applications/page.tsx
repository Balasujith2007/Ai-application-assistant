'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Briefcase,
  ExternalLink,
  Pencil,
  Trash2,
  Calendar,
  Building2,
  Clock,
  MapPin,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileCheck,
  TrendingUp,
  Mail,
  ShieldCheck,
  Sparkles,
  Radio,
  Check,
  X,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge, TypeBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/index';
import { usePlacement } from '@/context/PlacementContext';
import { ExtendedApplication, ApplicationStatus, ApplicationType } from '@/types/placement';
import { StatCard } from '@/components/placement/StatCard';
import { ApplicationDetailModal } from '@/components/placement/ApplicationDetailModal';
import { AddApplicationModal } from '@/components/placement/AddApplicationModal';
import { EmailEvidenceModal } from '@/components/placement/EmailEvidenceModal';
import { EmailSyncModal } from '@/components/placement/EmailSyncModal';
import { DeadlineAlert } from '@/components/placement/DeadlineAlert';
import {
  getEmailSyncStatus,
  getPendingEmailReviews,
  resolveEmailReview,
} from '@/lib/placementApi';

import { useAuth } from '@/context/AuthContext';

export default function ApplicationsPage() {
  const { user } = useAuth();
  const {
    applications,
    addApplication,
    updateApplication,
    updateApplicationStatus,
    deleteApplication,
    addNoteToApplication,
    stats,
    isLoading,
  } = usePlacement();

  const [activeTab, setActiveTab] = useState<'applications' | 'reviews'>('applications');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'deadline'>('newest');

  // Modals & Active State
  const [selectedApp, setSelectedApp] = useState<ExtendedApplication | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<ExtendedApplication | null>(null);

  // Email Sync & Evidence Modals
  const [isEmailSyncOpen, setIsEmailSyncOpen] = useState(false);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [evidenceTargetApp, setEvidenceTargetApp] = useState<ExtendedApplication | null>(null);
  const [emailSyncData, setEmailSyncData] = useState<any>(null);
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [selectedReviewAppMap, setSelectedReviewAppMap] = useState<Record<string, string>>({});
  const [resolvingReviewId, setResolvingReviewId] = useState<string | null>(null);

  const fetchEmailSyncInfo = async () => {
    try {
      const [statusRes, reviewsRes] = await Promise.all([
        getEmailSyncStatus(),
        getPendingEmailReviews(),
      ]);
      setEmailSyncData(statusRes);
      setPendingReviews(Array.isArray(reviewsRes) ? reviewsRes : []);
    } catch (e) {
      console.error('Error fetching email sync status:', e);
    }
  };

  useEffect(() => {
    fetchEmailSyncInfo();
  }, []);

  // Filtered & Sorted applications
  const filteredApps = useMemo(() => {
    return applications
      .filter((app) => {
        const matchesSearch =
          app.companyName.toLowerCase().includes(search.toLowerCase()) ||
          app.position.toLowerCase().includes(search.toLowerCase()) ||
          (app.location && app.location.toLowerCase().includes(search.toLowerCase()));

        const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
        const matchesType = typeFilter === 'ALL' || app.applicationType === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === 'deadline') {
          return new Date(a.deadline || '').getTime() - new Date(b.deadline || '').getTime();
        }
        return new Date(b.appliedDate || '').getTime() - new Date(a.appliedDate || '').getTime();
      });
  }, [applications, search, statusFilter, typeFilter, sortBy]);

  const handleOpenDetail = (app: ExtendedApplication) => {
    setSelectedApp(app);
    setIsDetailOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingApp(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (app: ExtendedApplication) => {
    setEditingApp(app);
    setIsAddOpen(true);
  };

  const handleOpenEvidence = (app: ExtendedApplication) => {
    setEvidenceTargetApp(app);
    setIsEvidenceOpen(true);
  };

  const handleSaveApp = async (data: any) => {
    if (editingApp) {
      await updateApplication(editingApp.id, data);
    } else {
      await addApplication(data);
    }
  };

  const handleResolveReview = async (reviewId: string, action: 'CONFIRM' | 'DISMISS') => {
    try {
      setResolvingReviewId(reviewId);
      const targetAppId = selectedReviewAppMap[reviewId] || applications[0]?.id;
      if (action === 'CONFIRM' && !targetAppId) {
        alert('Please select an application to link this status to.');
        return;
      }

      await resolveEmailReview(reviewId, action, targetAppId);
      await fetchEmailSyncInfo();
      window.location.reload(); // Refresh placement context state
    } catch (e: any) {
      alert(e.message || 'Failed to update review.');
    } finally {
      setResolvingReviewId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-kit-200 border-t-kit-600"></div>
          <p className="text-sm font-medium text-gray-500">Loading applications...</p>
        </div>
      </div>
    );
  }

  const isEmailConnected = emailSyncData?.isConnected;

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Applications</h1>
            {isEmailConnected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Email Auto-Tracking Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                <Radio className="h-3 w-3 text-gray-400" />
                Email Sync Disconnected
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-500 mt-1">
            Track and manage all your internship and job applications with direct company email verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Email Sync Settings Button */}
          <Button
            variant="secondary"
            onClick={() => setIsEmailSyncOpen(true)}
            className="shadow-2xs text-xs font-semibold"
          >
            <Mail className="h-4 w-4 text-kit-600" />
            Auto-Track Inbox
          </Button>

          {user?.role !== 'STUDENT' && (
            <Button variant="primary" onClick={handleOpenAdd} className="shadow-2xs">
              <Plus className="h-4 w-4" />
              Add Application
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Tabs (Applications vs Needs Review) */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('applications')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            activeTab === 'applications'
              ? 'bg-kit-600 text-white shadow-2xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          All Applications ({applications.length})
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            activeTab === 'reviews'
              ? 'bg-kit-600 text-white shadow-2xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-300" />
          Needs Review
          {pendingReviews.length > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${
                activeTab === 'reviews'
                  ? 'bg-amber-400 text-kit-950'
                  : 'bg-rose-500 text-white animate-bounce'
              }`}
            >
              {pendingReviews.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'reviews' ? (
        /* ============================================================
           NEEDS REVIEW QUEUE TAB
           ============================================================ */
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  Email Status Verification Queue
                </h3>
                <p className="text-xs text-amber-800 mt-1">
                  CareerAI detected company emails with ambiguous matches or multiple open roles. To prevent false updates, please select and confirm the matching application below.
                </p>
              </div>
            </div>
          </div>

          {pendingReviews.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-10 w-10 text-emerald-500" />}
              title="All Caught Up!"
              description="No ambiguous email updates pending review. All matched company emails have been verified."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingReviews.map((review) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-kit-50 text-kit-600 font-bold">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 text-base">
                            {review.detectedCompany || 'Unknown Company'}
                          </h4>
                          <StatusBadge status={review.detectedStatus} />
                          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                            {Math.round((review.confidence || 0.8) * 100)}% Match Confidence
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          From: {review.senderName ? `${review.senderName} (${review.senderEmail})` : review.senderEmail}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs text-gray-400 font-semibold">
                      {new Date(review.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Subject & Clean Snippet */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-700">
                      <strong>Subject:</strong> {review.subject}
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5 text-xs text-gray-600 italic border-l-4 border-l-kit-600">
                      "{review.cleanSnippet}"
                    </div>
                  </div>

                  {/* Candidate Match Selection & Action */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                    <div className="flex-1 min-w-[240px]">
                      <label className="text-xs font-bold text-gray-700 block mb-1">
                        Link this update to Application:
                      </label>
                      <select
                        value={selectedReviewAppMap[review.id] || review.candidateAppIds?.[0]?.id || applications[0]?.id || ''}
                        onChange={(e) =>
                          setSelectedReviewAppMap({
                            ...selectedReviewAppMap,
                            [review.id]: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 focus:border-kit-500 focus:outline-none"
                      >
                        {review.candidateAppIds && review.candidateAppIds.length > 0 ? (
                          review.candidateAppIds.map((c: any) => (
                            <option key={c.id} value={c.id}>
                              {c.companyName} — {c.position} (Score: {Math.round(c.score * 100)}%)
                            </option>
                          ))
                        ) : (
                          applications.map((app) => (
                            <option key={app.id} value={app.id}>
                              {app.companyName} — {app.position}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={resolvingReviewId === review.id}
                        onClick={() => handleResolveReview(review.id, 'CONFIRM')}
                        className="text-xs font-bold"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {resolvingReviewId === review.id ? 'Confirming...' : 'Confirm Match & Update'}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={resolvingReviewId === review.id}
                        onClick={() => handleResolveReview(review.id, 'DISMISS')}
                        className="text-xs font-semibold text-gray-500 hover:text-rose-600"
                      >
                        <X className="h-3.5 w-3.5" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ============================================================
           ALL APPLICATIONS TAB
           ============================================================ */
        <>
          {/* Deadline Alerts */}
          <DeadlineAlert
            type="application_deadline"
            message="Application deadline approaching for Software Engineering Internships"
            subtext="Make sure all assessment documents are submitted."
            actionText="View Application"
            onAction={() => {
              if (applications[0]) handleOpenDetail(applications[0]);
            }}
          />

          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="Total Applications"
              value={stats.totalApplications}
              icon={Briefcase}
              color="text-kit-600"
              bg="bg-kit-50"
              index={0}
            />
            <StatCard
              label="Active Applications"
              value={stats.activeApplications}
              icon={TrendingUp}
              color="text-blue-600"
              bg="bg-blue-50"
              index={1}
            />
            <StatCard
              label="Interviews"
              value={stats.interviewsCount}
              icon={Calendar}
              color="text-kit-600"
              bg="bg-kit-50"
              index={2}
            />
            <StatCard
              label="Offers (Selected)"
              value={stats.offersCount}
              icon={CheckCircle2}
              color="text-emerald-600"
              bg="bg-emerald-50"
              index={3}
            />
            <StatCard
              label="Rejected"
              value={stats.rejectedCount}
              icon={XCircle}
              color="text-rose-600"
              bg="bg-rose-50"
              index={4}
            />
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search company, role, or location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50/50 py-2 pl-9 pr-4 text-sm text-gray-900 focus:border-kit-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-kit-500/20"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-kit-500 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="APPLIED">Applied</option>
                <option value="SHORTLISTED">Shortlisted</option>
                <option value="INTERVIEW">Interview</option>
                <option value="SELECTED">Selected</option>
                <option value="REJECTED">Rejected</option>
              </select>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-kit-500 focus:outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="JOB">Full-time Job</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="HACKATHON">Hackathon</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 shrink-0">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'deadline')}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-kit-500 focus:outline-none"
              >
                <option value="newest">Newest Applied</option>
                <option value="deadline">Upcoming Deadline</option>
              </select>
            </div>
          </div>

          {/* Applications Table */}
          {filteredApps.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="h-10 w-10 text-kit-500" />}
              title="No applications found"
              description="Start tracking your internship and job applications."
              action={
                <Button variant="primary" onClick={handleOpenAdd}>
                  <Plus className="h-4 w-4" />
                  Add Application
                </Button>
              }
            />
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      <th className="py-4 px-6">Company</th>
                      <th className="py-4 px-4">Role</th>
                      <th className="py-4 px-4">Location</th>
                      <th className="py-4 px-4">Status & Verification</th>
                      <th className="py-4 px-4">Applied Date</th>
                      <th className="py-4 px-4">Deadline</th>
                      <th className="py-4 px-4">Next Action</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm font-medium">
                    {filteredApps.map((app) => (
                      <tr
                        key={app.id}
                        onClick={() => handleOpenDetail(app)}
                        className="group cursor-pointer transition-colors hover:bg-kit-50/30"
                      >
                        {/* Company */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-kit-50 text-kit-600 font-bold text-sm">
                              {app.companyName.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-gray-900 group-hover:text-kit-600 transition-colors">
                                {app.companyName}
                              </span>
                              <div className="mt-0.5">
                                <TypeBadge type={app.applicationType} />
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-4 px-4 text-gray-900 font-semibold">{app.position}</td>

                        {/* Location */}
                        <td className="py-4 px-4 text-gray-600">{app.location || 'Remote'}</td>

                        {/* Status & Company Email Evidence Badge */}
                        <td className="py-4 px-4">
                          <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                            <StatusBadge status={app.status} />
                            {app.statusSource === 'COMPANY_EMAIL' ? (
                              <button
                                onClick={() => handleOpenEvidence(app)}
                                className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100 transition-colors shadow-2xs"
                                title="View official email evidence"
                              >
                                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                Email Verified
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-400 block font-normal">
                                Manual Entry
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Applied Date */}
                        <td className="py-4 px-4 text-gray-600">{app.appliedDate}</td>

                        {/* Deadline */}
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1 text-gray-700 font-semibold">
                            <Clock className="h-3.5 w-3.5 text-rose-500" />
                            {app.deadline}
                          </span>
                        </td>

                        {/* Next Action */}
                        <td className="py-4 px-4 max-w-[200px]">
                          {app.nextAction ? (
                            <span className="truncate block text-xs font-semibold text-kit-700 bg-kit-50 px-2.5 py-1 rounded-md">
                              {app.nextAction}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Awaiting update</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {app.statusSource === 'COMPANY_EMAIL' && (
                              <button
                                onClick={() => handleOpenEvidence(app)}
                                className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 transition-colors"
                                title="View Email Evidence"
                              >
                                <Mail className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenDetail(app)}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-kit-600 transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(app)}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-kit-600 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete application for ${app.companyName}?`)) {
                                  deleteApplication(app.id);
                                }
                              }}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-rose-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <ApplicationDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        application={selectedApp}
        onEdit={(app) => handleOpenEdit(app)}
        onDelete={(id) => deleteApplication(id)}
        onUpdateStatus={(id, st) => updateApplicationStatus(id, st)}
        onAddNote={(id, note) => addNoteToApplication(id, note)}
      />

      <AddApplicationModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleSaveApp}
        initialData={editingApp}
      />

      <EmailEvidenceModal
        isOpen={isEvidenceOpen}
        onClose={() => setIsEvidenceOpen(false)}
        applicationId={evidenceTargetApp?.id}
        companyName={evidenceTargetApp?.companyName}
        position={evidenceTargetApp?.position}
      />

      <EmailSyncModal
        isOpen={isEmailSyncOpen}
        onClose={() => setIsEmailSyncOpen(false)}
        onSyncComplete={fetchEmailSyncInfo}
      />
    </div>
  );
}
