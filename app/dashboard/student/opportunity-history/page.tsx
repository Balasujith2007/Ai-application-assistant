'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Calendar, MapPin, Search, CheckCircle2, ExternalLink, Loader2,
  Building, Award, Clock, ArrowUpRight, CheckCheck, FileText, PlusCircle, Filter
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CompleteOpportunityModal } from '@/components/opportunities/CompleteOpportunityModal';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export interface HistoryItem {
  id: string;
  opportunityId: string;
  title: string;
  organization: string;
  companyName: string;
  role?: string | null;
  type: string;
  opportunityUrl?: string;
  registrationUrl?: string;
  startDate?: string | null;
  endDate?: string | null;
  applicationDeadline?: string | null;
  initiatedAt: string;
  appliedAt?: string | null;
  registeredAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  status: 'INITIATED' | 'REGISTERED' | 'ONGOING' | 'COMPLETED' | 'SHORTLISTED' | 'SELECTED' | 'REJECTED' | 'WITHDRAWN';
  outcome?: string | null;
  certificateUrl?: string | null;
  notes?: string | null;
}

export default function OpportunityHistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Complete Modal state
  const [selectedForComplete, setSelectedForComplete] = useState<HistoryItem | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/student/opportunity-history');
      if (res.data.success) {
        setHistory(res.data.history || []);
      }
    } catch (err) {
      console.error('Failed to load opportunity history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredHistory = history.filter((item) => {
    const matchesTab =
      activeTab === 'ALL' ||
      (activeTab === 'HACKATHONS' && item.type === 'HACKATHON') ||
      (activeTab === 'INTERNSHIPS' && item.type === 'INTERNSHIP') ||
      (activeTab === 'JOBS' && (item.type === 'JOB' || item.type === 'FULL_TIME')) ||
      (activeTab === 'COMPETITIONS' && item.type === 'COMPETITION') ||
      (activeTab === 'WORKSHOPS' && item.type === 'WORKSHOP') ||
      (activeTab === 'COMPLETED' && item.status === 'COMPLETED') ||
      (activeTab === 'ONGOING' && item.status === 'ONGOING');

    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.role && item.role.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTab && matchesSearch;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'HACKATHON':
        return <span className="rounded-full bg-kit-100 px-3 py-1 text-xs font-bold text-kit-700">Hackathon 🚀</span>;
      case 'INTERNSHIP':
        return <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">Internship 💼</span>;
      case 'JOB':
      case 'FULL_TIME':
        return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Job 🎯</span>;
      case 'COMPETITION':
        return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Competition 🏆</span>;
      case 'WORKSHOP':
        return <span className="rounded-full bg-kit-100 px-3 py-1 text-xs font-bold text-kit-700">Workshop 📚</span>;
      default:
        return <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">{type}</span>;
    }
  };

  const getStatusBadge = (status: HistoryItem['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200"><CheckCircle2 className="h-3.5 w-3.5" /> Completed</span>;
      case 'ONGOING':
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200"><Clock className="h-3.5 w-3.5" /> Ongoing</span>;
      case 'REGISTERED':
        return <span className="inline-flex items-center gap-1 rounded-full bg-kit-100 px-3 py-1 text-xs font-bold text-kit-800 border border-kit-200">Registered ✓</span>;
      case 'SHORTLISTED':
        return <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 border border-blue-200">Shortlisted ✓</span>;
      case 'SELECTED':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">Selected ✓</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">{status}</span>;
    }
  };

  return (
    <DashboardLayout
      title="Opportunity History"
      subtitle="Track your hackathons, internships, competitions and other career activities."
    >
      <div className="space-y-6 pb-12">
        {/* Notice Alert */}
        {notice && (
          <div
            className={`rounded-2xl p-4 text-sm font-semibold flex items-center justify-between shadow-sm border ${
              notice.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}
          >
            <span>{notice.message}</span>
            <button onClick={() => setNotice(null)} className="text-xs font-bold opacity-70 hover:opacity-100">
              Dismiss
            </button>
          </div>
        )}

        {/* Filter Tabs & Search */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'All Activities' },
              { id: 'HACKATHONS', label: 'Hackathons 🚀' },
              { id: 'INTERNSHIPS', label: 'Internships 💼' },
              { id: 'JOBS', label: 'Jobs 🎯' },
              { id: 'COMPETITIONS', label: 'Competitions 🏆' },
              { id: 'WORKSHOPS', label: 'Workshops 📚' },
              { id: 'COMPLETED', label: 'Completed ✓' },
              { id: 'ONGOING', label: 'Ongoing ⏳' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-kit-600 text-white shadow-md shadow-kit-500/20'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search history by title, org..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kit-500/20"
            />
          </div>
        </div>

        {/* History Grid */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 px-4 text-center">
            <Trophy className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-base font-semibold text-gray-800">No opportunity history found</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              Your registered hackathons, internships, competitions, and activities will appear here automatically.
            </p>
            <Link
              href="/dashboard/student/opportunities"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-kit-600 px-4 py-2 text-xs font-bold text-white hover:bg-kit-700 transition-colors"
            >
              Explore Campus Opportunities
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHistory.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-all hover:border-kit-200"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 line-clamp-1 group-hover:text-kit-600 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <Building className="h-3.5 w-3.5 text-gray-400" /> {item.organization}
                      </p>
                    </div>
                    {getTypeBadge(item.type)}
                  </div>

                  {item.role && (
                    <p className="text-xs font-medium text-kit-700 bg-kit-50 px-2.5 py-1 rounded-md inline-block">
                      Role: {item.role}
                    </p>
                  )}

                  {/* Dates Section */}
                  <div className="space-y-1.5 pt-2 border-t border-gray-100 text-xs text-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Registered:</span>
                      <span className="font-semibold text-gray-700">{formatDate(item.registeredAt || item.appliedAt || item.initiatedAt)}</span>
                    </div>
                    {item.startDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Start Date:</span>
                        <span className="font-semibold text-gray-700">{formatDate(item.startDate)}</span>
                      </div>
                    )}
                    {item.endDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">End Date:</span>
                        <span className="font-semibold text-gray-700">{formatDate(item.endDate)}</span>
                      </div>
                    )}
                    {item.completedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Completed Date:</span>
                        <span className="font-semibold text-emerald-700">{formatDate(item.completedAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Outcome & Certificate */}
                  {item.status === 'COMPLETED' && (
                    <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-3 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-emerald-900">Outcome:</span>
                        <span className="font-bold text-emerald-700">{item.outcome || 'Participated'}</span>
                      </div>
                      {item.certificateUrl && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="font-semibold text-emerald-900">Certificate:</span>
                          <a
                            href={item.certificateUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-kit-600 hover:underline flex items-center gap-1"
                          >
                            View Certificate <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status Banner */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-bold text-gray-400">Status</span>
                    {getStatusBadge(item.status)}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100">
                  {item.registrationUrl || item.opportunityUrl ? (
                    <a
                      href={item.registrationUrl || item.opportunityUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                      View Opportunity <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                    </a>
                  ) : (
                    <span />
                  )}

                  {item.status !== 'COMPLETED' && (
                    <button
                      onClick={() => setSelectedForComplete(item)}
                      className="rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-colors flex items-center gap-1"
                    >
                      <Award className="h-3.5 w-3.5" /> Mark as Completed
                    </button>
                  )}

                  {item.status === 'COMPLETED' && (
                    <Link
                      href="/resume"
                      className="rounded-xl border border-kit-200 bg-kit-50 px-3 py-1.5 text-xs font-bold text-kit-700 hover:bg-kit-100 transition-colors"
                    >
                      + Add to Resume
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Complete Opportunity Modal */}
        <CompleteOpportunityModal
          isOpen={!!selectedForComplete}
          onClose={() => setSelectedForComplete(null)}
          opportunityRegistration={selectedForComplete}
          onSuccess={() => {
            setNotice({ type: 'success', message: 'Opportunity marked as completed & saved to history!' });
            fetchHistory();
          }}
        />
      </div>
    </DashboardLayout>
  );
}
