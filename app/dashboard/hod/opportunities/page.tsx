'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Megaphone, Plus, Sparkles, Send, Users, Building, Calendar, MapPin, CheckCheck, Loader2, CheckCircle2
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import api from '@/lib/api';

export default function HODOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [fetchNotice, setFetchNotice] = useState<string | null>(null);
  const [isRegDetected, setIsRegDetected] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [form, setForm] = useState({
    title: '',
    organization: '',
    type: 'INTERNSHIP',
    description: '',
    opportunityUrl: '',
    registrationUrl: '',
    location: 'Online',
    mode: 'ONLINE',
    applicationDeadline: '',
    stipend: '',
    requiredSkills: '',
    targetAudience: 'BOTH', // ALL_STUDENTS, ALL_MENTORS, BOTH
    targetDepartment: '',
    targetYear: ''
  });

  const availableDepartments = ['AIDS', 'CSE', 'AIML', 'IT', 'ECE', 'EEE', 'MECH'];
  const availableYears = [1, 2, 3, 4];

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/opportunities');
      setOpportunities(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch opportunities:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const handleFetchUrlDetails = async () => {
    if (!form.opportunityUrl.trim()) return;

    setIsFetchingUrl(true);
    setFetchNotice(null);
    setIsRegDetected(false);

    try {
      const res = await api.post('/opportunities/fetch-details', { url: form.opportunityUrl.trim() });
      if (res.data.success && res.data.data) {
        const d = res.data.data;
        setForm((prev) => ({
          ...prev,
          title: d.title || prev.title,
          organization: d.organization || prev.organization,
          type: d.type || prev.type,
          description: d.description || prev.description,
          registrationUrl: d.registrationUrl || prev.registrationUrl || prev.opportunityUrl,
          location: d.location || prev.location,
          stipend: d.stipend || prev.stipend,
          requiredSkills: Array.isArray(d.skills) && d.skills.length > 0 ? d.skills.join(', ') : prev.requiredSkills
        }));
        if (d.isRegistrationDetected) {
          setIsRegDetected(true);
          setFetchNotice('Fetched metadata! Detected Registration URL.');
        } else {
          setFetchNotice('Fetched metadata successfully!');
        }
      } else {
        setFetchNotice(res.data.message || 'Could not fetch details from URL.');
      }
    } catch (err: any) {
      setFetchNotice(err?.response?.data?.message || 'Could not fetch details from URL.');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleCreateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.organization || !form.description || !form.applicationDeadline) {
      setNotice({ type: 'error', message: 'Title, Organization, Description, and Deadline are required.' });
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      const payload = {
        ...form,
        status: 'PUBLISHED',
        requiredSkills: form.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean)
      };

      const res = await api.post('/opportunities', payload);
      if (res.data.success) {
        setNotice({ type: 'success', message: 'Opportunity broadcasted successfully to all target users!' });
        setShowCreateModal(false);
        fetchOpportunities();
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: err?.response?.data?.message || 'Failed to broadcast opportunity.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="HOD Opportunities & Broadcast System" subtitle="Publish organization-wide opportunities & broadcast targeted notifications">
      <div className="space-y-6 pb-12">
        {/* Banner Alert */}
        {notice && (
          <div className={`rounded-2xl p-4 text-sm font-semibold flex items-center justify-between shadow-sm border ${
            notice.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'
          }`}>
            <span>{notice.message}</span>
            <button onClick={() => setNotice(null)} className="text-xs font-bold opacity-70 hover:opacity-100">Dismiss</button>
          </div>
        )}

        {/* Top Actions Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-kit-600" /> Active Campus Opportunities
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">HOD Broadcasts are sent directly to student and mentor notification feeds</p>
          </div>

          <Button variant="primary" onClick={() => setShowCreateModal(true)} className="font-bold flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Broadcast Opportunity
          </Button>
        </div>

        {/* Grid List */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
          </div>
        ) : opportunities.length === 0 ? (
          <div className="py-16 text-center text-gray-500 bg-white rounded-2xl border border-dashed border-gray-200">
            No active opportunities posted. Click Broadcast Opportunity to publish one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {opportunities.map((opp) => (
              <div key={opp.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-kit-700 bg-kit-50 px-2.5 py-1 rounded-md">
                    {opp.type}
                  </span>
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    Target: {opp.targetAudience || 'ALL'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-gray-900">{opp.title}</h3>
                <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                  <Building className="h-3.5 w-3.5 text-gray-400" /> {opp.organization}
                </p>

                <p className="text-xs text-gray-600 line-clamp-2">{opp.description}</p>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                  <span>📅 {new Date(opp.applicationDeadline).toLocaleDateString()}</span>
                  <span className="font-bold text-kit-600">{opp.registrationCount} Registrations</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Broadcast Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Send className="h-5 w-5 text-kit-600" /> Broadcast New Opportunity
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <form onSubmit={handleCreateBroadcast} className="space-y-4">
                {/* Auto Fetch */}
                <div className="rounded-xl border border-kit-200 bg-kit-50/40 p-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="Paste Official Opportunity URL to auto-fill..."
                      value={form.opportunityUrl}
                      onChange={(e) => setForm({ ...form, opportunityUrl: e.target.value })}
                      className="flex-1 rounded-xl border border-kit-200 bg-white px-3 py-1.5 text-xs"
                    />
                    <Button type="button" size="sm" onClick={handleFetchUrlDetails} disabled={isFetchingUrl}>
                      {isFetchingUrl ? 'Fetching...' : 'Fetch'}
                    </Button>
                  </div>
                  {fetchNotice && <p className="text-[11px] text-kit-800 font-semibold">{fetchNotice}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input label="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                  <Input label="Organization *" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} required />
                </div>

                {/* Dual URLs */}
                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <Input label="Official Opportunity URL" value={form.opportunityUrl} onChange={(e) => setForm({ ...form, opportunityUrl: e.target.value })} />
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-700">Registration URL</label>
                      {isRegDetected && (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Detected</span>
                      )}
                    </div>
                    <Input value={form.registrationUrl} onChange={(e) => setForm({ ...form, registrationUrl: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Type</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-xl border px-3 py-2 text-xs">
                      <option value="INTERNSHIP">Internship</option>
                      <option value="JOB">Job</option>
                      <option value="HACKATHON">Hackathon</option>
                      <option value="COMPETITION">Competition</option>
                      <option value="WORKSHOP">Workshop</option>
                    </select>
                  </div>
                  <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                  <Input label="Deadline *" type="datetime-local" value={form.applicationDeadline} onChange={(e) => setForm({ ...form, applicationDeadline: e.target.value })} required />
                </div>

                <Textarea label="Description *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} required />

                {/* HOD Targeting Controls */}
                <div className="rounded-xl border border-kit-200 bg-kit-50/50 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-kit-900 uppercase tracking-wider">HOD Target Audience</h4>

                  <div className="flex gap-4 text-xs font-semibold text-gray-700">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="target" checked={form.targetAudience === 'ALL_STUDENTS'} onChange={() => setForm({ ...form, targetAudience: 'ALL_STUDENTS' })} />
                      All Students
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="target" checked={form.targetAudience === 'ALL_MENTORS'} onChange={() => setForm({ ...form, targetAudience: 'ALL_MENTORS' })} />
                      All Mentors
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="target" checked={form.targetAudience === 'BOTH'} onChange={() => setForm({ ...form, targetAudience: 'BOTH' })} />
                      Students + Mentors
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">Department</label>
                      <select
                        value={form.targetDepartment}
                        onChange={(e) => setForm({ ...form, targetDepartment: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs focus:border-kit-500 focus:outline-none"
                      >
                        <option value="">All Departments</option>
                        {availableDepartments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">Year</label>
                      <select
                        value={form.targetYear}
                        onChange={(e) => setForm({ ...form, targetYear: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs focus:border-kit-500 focus:outline-none"
                      >
                        <option value="">All Years</option>
                        {availableYears.map((yr) => (
                          <option key={yr} value={yr}>
                            Year {yr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" isLoading={isSubmitting} className="font-bold">
                    Broadcast Opportunity 🚀
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
