'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Eye, Edit, CheckCircle2, Users, Loader2, Calendar, MapPin, Building,
  XCircle, Award, ExternalLink, ShieldCheck, Clock
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';

export interface MentorOpportunity {
  id: string;
  title: string;
  organization: string;
  type: string;
  status: string;
  applicationDeadline: string;
  viewsCount: number;
  registrationCount: number;
  createdAt: string;
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
  const [filter, setFilter] = useState<'published' | 'draft' | 'closed' | 'all'>('all');
  
  // Registration modal
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [selectedOppTitle, setSelectedOppTitle] = useState<string>('');
  const [registrations, setRegistrations] = useState<StudentRegistrationItem[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/opportunities?filter=my`);
      setOpportunities(res.data.data || []);
    } catch (err) {
      console.error('Failed to load mentor opportunities:', err);
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
    } finally {
      setLoadingRegs(false);
    }
  };

  const updateRegistrationStatus = async (registrationId: string, newStatus: string) => {
    try {
      await api.put(`/opportunity-registrations/${registrationId}/status`, { status: newStatus });
      setRegistrations((prev) =>
        prev.map((r) => (r.id === registrationId ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      alert('Failed to update registration status.');
    }
  };

  const filtered = opportunities.filter((o) => {
    if (filter === 'published') return o.status === 'PUBLISHED';
    if (filter === 'draft') return o.status === 'DRAFT';
    if (filter === 'closed') return o.status === 'CLOSED';
    return true;
  });

  return (
    <DashboardLayout title="My Posted Opportunities" subtitle="Manage opportunities, track student applications & shortlist candidates">
      <div className="space-y-6 pb-12">
        {/* Header Action & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'published', label: 'Published' },
              { id: 'draft', label: 'Drafts' },
              { id: 'closed', label: 'Closed' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id as any)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  filter === t.id
                    ? 'bg-kit-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <Link href="/dashboard/mentor/opportunities/new">
            <Button variant="primary" className="font-bold flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Post Opportunity
            </Button>
          </Link>
        </div>

        {/* Opportunity List Table / Grid */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 px-4 text-center">
            <p className="text-base font-semibold text-gray-800">No opportunities posted yet</p>
            <p className="text-xs text-gray-500 mt-1">Post a hackathon, job, or internship to start receiving student applications.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((opp) => (
              <div key={opp.id} className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-kit-700 bg-kit-50 px-2.5 py-1 rounded-md">
                      {opp.type}
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      opp.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {opp.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 mt-2 line-clamp-1">{opp.title}</h3>
                  <p className="text-xs font-semibold text-gray-500">{opp.organization}</p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mt-4 pt-3 border-t border-gray-100">
                    <div>
                      <span className="font-bold text-gray-900 block">{opp.viewsCount}</span> Views
                    </div>
                    <div>
                      <span className="font-bold text-kit-600 block">{opp.registrationCount}</span> Registrations
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openRegistrations(opp)}
                    className="flex-1 text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <Users className="h-3.5 w-3.5" /> View Registrations
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

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
                    ✕
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
                              <span className="text-emerald-700 font-semibold">Registered At: {new Date(reg.registeredAt).toLocaleString()}</span>
                            )}
                          </div>

                          {/* Links */}
                          <div className="flex flex-wrap gap-2 text-xs pt-1">
                            {reg.student.profile?.githubUrl && (
                              <a href={reg.student.profile.githubUrl} target="_blank" rel="noopener noreferrer" className="text-kit-600 hover:underline flex items-center gap-1 font-semibold">
                                GitHub <ShieldCheck className="h-3 w-3 text-emerald-600" />
                              </a>
                            )}
                            {reg.student.profile?.linkedinUrl && (
                              <a href={reg.student.profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 font-semibold">
                                LinkedIn <ShieldCheck className="h-3 w-3 text-emerald-600" />
                              </a>
                            )}
                            {reg.student.profile?.codolioUrl && (
                              <a href={reg.student.profile.codolioUrl} target="_blank" rel="noopener noreferrer" className="text-kit-600 hover:underline flex items-center gap-1 font-semibold">
                                Codolio <ShieldCheck className="h-3 w-3 text-emerald-600" />
                              </a>
                            )}
                            {reg.student.resumes && reg.student.resumes[0] && (
                              <a href={reg.student.resumes[0].fileUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline flex items-center gap-1 font-semibold">
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
    </DashboardLayout>
  );
}
