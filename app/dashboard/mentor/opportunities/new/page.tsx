'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import api from '@/lib/api';

export default function MentorPostOpportunityPage() {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [fetchNotice, setFetchNotice] = useState<string | null>(null);
  const [isRegDetected, setIsRegDetected] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    title: '',
    organization: '',
    type: 'JOB',
    description: '',
    opportunityUrl: '',
    registrationUrl: '',
    location: 'Online',
    mode: 'ONLINE',
    salary: '',
    stipend: '',
    prize: '',
    openings: '',
    eligibility: '',
    additionalInfo: '',
    applicationDeadline: '',
    startDate: '',
    endDate: '',
    requiredSkills: '',
  });

  const handleFetchFromUrl = async () => {
    if (!form.opportunityUrl || !form.opportunityUrl.trim()) {
      setFetchNotice('Please enter an Official Opportunity URL first.');
      return;
    }

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
          registrationUrl: d.registrationUrl || prev.registrationUrl,
          location: d.location || prev.location,
          mode: d.mode || prev.mode
        }));
        if (d.isRegistrationDetected) {
          setIsRegDetected(true);
          setFetchNotice('Details fetched! Detected Registration URL from page.');
        } else {
          setFetchNotice('Details fetched successfully!');
        }
      } else {
        setFetchNotice(res.data.message || 'Unable to fetch details from URL.');
      }
    } catch (err: any) {
      setFetchNotice(err?.response?.data?.message || 'Error fetching details from URL.');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleSubmit = async (targetStatus: 'PUBLISHED' | 'DRAFT') => {
    setErrorMsg('');
    if (!form.title.trim() || !form.organization.trim() || !form.description.trim() || !form.applicationDeadline) {
      setErrorMsg('Title, Organization, Description, and Application Deadline are required.');
      return;
    }

    if (targetStatus === 'PUBLISHED') setIsPublishing(true);
    else setIsDrafting(true);

    try {
      const payload = {
        ...form,
        status: targetStatus,
        requiredSkills: form.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean)
      };

      await api.post('/opportunities', payload);
      router.push('/dashboard/mentor/opportunities');
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to post opportunity.');
    } finally {
      setIsPublishing(false);
      setIsDrafting(false);
    }
  };

  return (
    <DashboardLayout title="Post Opportunity" subtitle="Share jobs, internships, hackathons, and competitions with students">
      <div className="max-w-4xl space-y-6 pb-12">
        {errorMsg && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          {/* Quick Auto-Fetch Section */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              Auto-Fill from Official Opportunity URL
            </h4>

            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Paste Official Opportunity Webpage URL..."
                value={form.opportunityUrl}
                onChange={(e) => setForm({ ...form, opportunityUrl: e.target.value })}
                className="flex-1 rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleFetchFromUrl}
                disabled={isFetchingUrl}
                className="shrink-0 font-bold"
              >
                {isFetchingUrl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Fetch Details'}
              </Button>
            </div>

            {fetchNotice && (
              <p className="text-xs font-semibold text-indigo-900 bg-indigo-100 p-2 rounded-lg">{fetchNotice}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Title *"
              placeholder="e.g. Full Stack Developer Intern"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <Input
              label="Organization / Company *"
              placeholder="e.g. Tata Consultancy Services"
              value={form.organization}
              onChange={(e) => setForm({ ...form, organization: e.target.value })}
              required
            />
          </div>

          {/* Dual URLs Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
            <div>
              <Input
                label="Official Opportunity URL"
                placeholder="https://opportunity-info.com/..."
                value={form.opportunityUrl}
                onChange={(e) => setForm({ ...form, opportunityUrl: e.target.value })}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700">Registration URL</label>
                {isRegDetected && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Detected Registration URL
                  </span>
                )}
              </div>
              <Input
                placeholder="https://apply-now.com/form/..."
                value={form.registrationUrl}
                onChange={(e) => setForm({ ...form, registrationUrl: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">Opportunity Type *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="JOB">Job (Full Time)</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="HACKATHON">Hackathon</option>
                <option value="COMPETITION">Competition</option>
                <option value="WORKSHOP">Workshop</option>
                <option value="SCHOLARSHIP">Scholarship</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">Mode</label>
              <select
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="ONLINE">Online</option>
                <option value="OFFLINE">Offline</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>

            <Input
              label="Location"
              placeholder="e.g. Remote / Bangalore"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>

          <Textarea
            label="Description *"
            placeholder="Detailed overview of role responsibilities, guidelines, and benefits..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={5}
            required
          />

          <Input
            label="Required Skills (comma separated)"
            placeholder="e.g. React, Node.js, Python"
            value={form.requiredSkills}
            onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Application Deadline *"
              type="datetime-local"
              value={form.applicationDeadline}
              onChange={(e) => setForm({ ...form, applicationDeadline: e.target.value })}
              required
            />
            <Input
              label="Start Date (Optional)"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
            <Input
              label="End Date (Optional)"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Stipend / Salary"
              placeholder="e.g. ₹25,000 / month or ₹8 LPA"
              value={form.stipend || form.salary}
              onChange={(e) => setForm({ ...form, stipend: e.target.value, salary: e.target.value })}
            />
            <Input
              label="Prize Pool (for Hackathons/Contests)"
              placeholder="e.g. ₹1,00,000 total prizes"
              value={form.prize}
              onChange={(e) => setForm({ ...form, prize: e.target.value })}
            />
            <Input
              label="Number of Openings"
              type="number"
              min={1}
              placeholder="e.g. 5"
              value={form.openings}
              onChange={(e) => setForm({ ...form, openings: e.target.value })}
            />
          </div>

          <Input
            label="Eligibility Criteria"
            placeholder="e.g. B.Tech CS / IT - 3rd & 4th Year students with 7.0+ CGPA"
            value={form.eligibility}
            onChange={(e) => setForm({ ...form, eligibility: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              isLoading={isDrafting}
              onClick={() => handleSubmit('DRAFT')}
            >
              Save Draft
            </Button>
            <Button
              type="button"
              variant="primary"
              isLoading={isPublishing}
              onClick={() => handleSubmit('PUBLISHED')}
              className="font-bold"
            >
              Publish Opportunity
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
