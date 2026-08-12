'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Calendar, MapPin, Search, CheckCircle2,
  ExternalLink, Loader2, Building, AlertCircle, ArrowUpRight, CheckCheck, Clock
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ProfileCompletionModal } from '@/components/opportunities/ProfileCompletionModal';
import { ApplicationAssistantModal, ApplicationAssistantOpportunity } from '@/components/opportunities/ApplicationAssistantModal';
import api from '@/lib/api';
import { isOpportunityOpen } from '@/lib/utils';
import { getOpportunityRegistrationState } from '@/lib/opportunityUtils';

export interface OpportunityItem {
  id: string;
  title: string;
  organization: string;
  type: string;
  description: string;
  opportunityUrl?: string;
  registrationUrl?: string;
  location?: string;
  mode?: string;
  stipend?: string;
  prize?: string;
  openings?: number;
  applicationDeadline: string;
  requiredSkills: string[];
  postedBy?: { name: string; role: string };
  createdAt: string;
  isRegistered?: boolean;
  userRegistrationStatus?: string;
}

export default function StudentOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOpp, setSelectedOpp] = useState<OpportunityItem | null>(null);
  const [assistantOpp, setAssistantOpp] = useState<ApplicationAssistantOpportunity | null>(null);

  // Registration flow state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Profile completion check state
  const [verifiedProfiles, setVerifiedProfiles] = useState({ github: false, linkedin: false, codolio: false });
  const [showProfileModal, setShowProfileModal] = useState(false);

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/opportunities');
      setOpportunities(res.data.data || []);
    } catch (err) {
      console.error('Failed to load opportunities:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserVerifiedProfiles = useCallback(async () => {
    try {
      const res = await api.get('/profiles/verified');
      if (res?.data?.verifiedProfiles) {
        const platforms = res.data.verifiedProfiles.map((vp: any) => vp.platform);
        setVerifiedProfiles({
          github: platforms.includes('GITHUB'),
          linkedin: platforms.includes('LINKEDIN'),
          codolio: platforms.includes('CODOLIO')
        });
      }
    } catch (err) {
      // Ignore background 404 / network errors gracefully
    }
  }, []);

  useEffect(() => {
    fetchOpportunities();
    fetchUserVerifiedProfiles();
  }, [fetchOpportunities, fetchUserVerifiedProfiles]);

  const handleInitiateRegistration = async (opp: OpportunityItem) => {
    // Check mandatory profile completion
    if (!verifiedProfiles.github || !verifiedProfiles.linkedin || !verifiedProfiles.codolio) {
      setShowProfileModal(true);
      return;
    }

    setActionLoadingId(opp.id);
    setNotice(null);

    try {
      const res = await api.post(`/opportunities/${opp.id}/initiate`);
      if (res.data.success) {
        const regUrl = res.data.registrationUrl || opp.registrationUrl || opp.opportunityUrl;
        
        // Open actual external registration page in new tab
        if (regUrl && (regUrl.startsWith('http://') || regUrl.startsWith('https://'))) {
          window.open(regUrl, '_blank', 'noopener,noreferrer');
        }

        // Update internal UI status to INITIATED
        setOpportunities((prev) =>
          prev.map((o) => (o.id === opp.id ? { ...o, userRegistrationStatus: 'INITIATED' } : o))
        );
        if (selectedOpp && selectedOpp.id === opp.id) {
          setSelectedOpp({ ...selectedOpp, userRegistrationStatus: 'INITIATED' });
        }
        setNotice({ type: 'success', message: 'Registration started! Complete your application on the opened page, then click "I completed registration".' });
      } else {
        setNotice({ type: 'error', message: res.data.message || 'Unable to initiate registration.' });
      }
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to initiate registration.'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmRegistration = async (opp: OpportunityItem) => {
    setActionLoadingId(opp.id);
    setNotice(null);

    try {
      const res = await api.post(`/opportunities/${opp.id}/confirm`);
      if (res.data.success) {
        setOpportunities((prev) =>
          prev.map((o) => (o.id === opp.id ? { ...o, isRegistered: true, userRegistrationStatus: 'REGISTERED' } : o))
        );
        if (selectedOpp && selectedOpp.id === opp.id) {
          setSelectedOpp({ ...selectedOpp, isRegistered: true, userRegistrationStatus: 'REGISTERED' });
        }
        setNotice({ type: 'success', message: 'Registration confirmed successfully! Notification sent to mentor.' });
      } else {
        setNotice({ type: 'error', message: res.data.message || 'Could not confirm registration.' });
      }
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to confirm registration.'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const isDeadlinePassed = (deadlineStr: string) => {
    return new Date(deadlineStr).getTime() < new Date().getTime();
  };

  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesTab =
      activeTab === 'ALL' ||
      (activeTab === 'HACKATHONS' && opp.type === 'HACKATHON') ||
      (activeTab === 'INTERNSHIPS' && opp.type === 'INTERNSHIP') ||
      (activeTab === 'JOBS' && (opp.type === 'JOB' || opp.type === 'FULL_TIME')) ||
      (activeTab === 'COMPETITIONS' && opp.type === 'COMPETITION');

    const matchesSearch =
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.requiredSkills?.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTab && matchesSearch;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'HACKATHON':
        return <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">Hackathon 🚀</span>;
      case 'INTERNSHIP':
        return <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">Internship 💼</span>;
      case 'JOB':
      case 'FULL_TIME':
        return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Full Time Job 🎯</span>;
      case 'COMPETITION':
        return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Competition 🏆</span>;
      default:
        return <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">{type}</span>;
    }
  };

  const renderRegisterButton = (opp: OpportunityItem) => {
    const stateInfo = getOpportunityRegistrationState(
      opp,
      (opp as any).studentRegistration,
      opp.userRegistrationStatus
    );

    if (stateInfo.registrationStatus === 'REGISTERED' || stateInfo.registrationStatus === 'SHORTLISTED' || stateInfo.registrationStatus === 'SELECTED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> {stateInfo.buttonText}
        </span>
      );
    }

    if (stateInfo.registrationStatus === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-xl bg-rose-100 px-3 py-2 text-xs font-bold text-rose-800 border border-rose-300">
          Application Rejected
        </span>
      );
    }

    if (stateInfo.registrationStatus === 'INITIATED') {
      return (
        <Button
          variant="primary"
          size="sm"
          onClick={() => setAssistantOpp(opp as any)}
          className="bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white shadow-sm flex items-center gap-1"
        >
          <CheckCheck className="h-4 w-4" /> Continue Registration
        </Button>
      );
    }

    if (stateInfo.isClosed && stateInfo.registrationStatus === 'NOT_REGISTERED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-500 border border-gray-200">
          <Clock className="h-3.5 w-3.5" /> Registration Closed
        </span>
      );
    }

    return (
      <Button
        variant="primary"
        size="sm"
        onClick={() => setAssistantOpp(opp as any)}
        className="text-xs font-bold flex items-center gap-1"
      >
        Register Now <ArrowUpRight className="h-3.5 w-3.5" />
      </Button>
    );
  };

  return (
    <DashboardLayout title="Campus Opportunities" subtitle="Explore jobs, internships, hackathons & competitions">
      <div className="space-y-6 pb-12">
        {/* Profile Completion Modal */}
        <ProfileCompletionModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          verifiedProfiles={verifiedProfiles}
        />

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

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'All Opportunities' },
              { id: 'HACKATHONS', label: 'Hackathons 🚀' },
              { id: 'INTERNSHIPS', label: 'Internships 💼' },
              { id: 'JOBS', label: 'Jobs 🎯' },
              { id: 'COMPETITIONS', label: 'Competitions 🏆' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search title, skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Opportunities Grid */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 px-4 text-center">
            <Briefcase className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-base font-semibold text-gray-800">No opportunities found</p>
            <p className="text-xs text-gray-500 mt-1">Try clearing filters or search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOpportunities.map((opp) => (
              <motion.div
                key={opp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-all hover:border-indigo-200"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                        {opp.title}
                      </h3>
                      <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <Building className="h-3.5 w-3.5 text-gray-400" /> {opp.organization}
                      </p>
                    </div>
                    {getTypeBadge(opp.type)}
                  </div>

                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                    {opp.description}
                  </p>

                  {/* Skills Pills */}
                  {opp.requiredSkills && opp.requiredSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {opp.requiredSkills.slice(0, 4).map((skill, idx) => (
                        <span key={idx} className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                          🏷 {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Details Badges */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-amber-500" />
                      <span><strong>Deadline:</strong> {new Date(opp.applicationDeadline).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                      <span>{opp.location || 'Online'}</span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-5 flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOpp(opp)}
                    className="flex-1 text-xs font-bold"
                  >
                    View Details
                  </Button>

                  {renderRegisterButton(opp)}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Opportunity Detail Modal */}
        <AnimatePresence>
          {selectedOpp && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto"
              >
                <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedOpp.title}</h2>
                    <p className="text-sm font-semibold text-indigo-600 mt-0.5">{selectedOpp.organization}</p>
                  </div>
                  <button
                    onClick={() => setSelectedOpp(null)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 text-sm text-gray-700">
                  <div>
                    <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Description</h4>
                    <p className="mt-1 leading-relaxed whitespace-pre-line">{selectedOpp.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 text-xs">
                    <div>
                      <p className="font-bold text-gray-900">Application Deadline</p>
                      <p className="text-gray-600 mt-0.5">{new Date(selectedOpp.applicationDeadline).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Location / Mode</p>
                      <p className="text-gray-600 mt-0.5">{selectedOpp.location} ({selectedOpp.mode || 'Online'})</p>
                    </div>
                  </div>

                  {/* Warning if Registration URL missing */}
                  {!(selectedOpp.registrationUrl || selectedOpp.opportunityUrl) && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                      Registration link is not available for this opportunity. Use Official Page to locate registration details.
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <Button variant="outline" onClick={() => setSelectedOpp(null)}>
                    Close
                  </Button>
                  
                  {selectedOpp.opportunityUrl && (
                    <a
                      href={selectedOpp.opportunityUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                      Official Page <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}

                  {renderRegisterButton(selectedOpp)}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <ApplicationAssistantModal
          isOpen={!!assistantOpp}
          onClose={() => setAssistantOpp(null)}
          opportunity={assistantOpp}
          onSuccess={() => fetchOpportunities()}
        />
      </div>
    </DashboardLayout>
  );
}
