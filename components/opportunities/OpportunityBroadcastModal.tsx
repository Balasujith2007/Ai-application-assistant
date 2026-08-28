'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import api from '@/lib/api';

interface OpportunityBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'hod' | 'mentor';
}

export function OpportunityBroadcastModal({
  isOpen,
  onClose,
  onSuccess,
  mode = 'mentor',
}: OpportunityBroadcastModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [fetchNotice, setFetchNotice] = useState<string | null>(null);
  const [isRegDetected, setIsRegDetected] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const availableDepartments = ['AIDS', 'CSE', 'AIML', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'BME'];
  const availableYears = [1, 2, 3, 4];
  const availableSections = ['A', 'B', 'C', 'D'];

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
    targetAudience: mode === 'mentor' ? 'MY_STUDENTS' : 'ALL_STUDENTS', // MY_STUDENTS | OUR_STUDENTS for mentor, ALL_STUDENTS | ALL_MENTORS | BOTH for hod
    targetDepartment: '',
    targetYear: '',
    targetSection: '',
  });

  const handleFetchUrlDetails = async () => {
    if (!form.opportunityUrl.trim()) {
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
          registrationUrl: d.registrationUrl || prev.registrationUrl || prev.opportunityUrl,
          location: d.location || prev.location,
          stipend: d.stipend || prev.stipend,
          requiredSkills:
            Array.isArray(d.skills) && d.skills.length > 0 ? d.skills.join(', ') : prev.requiredSkills,
        }));
        if (d.isRegistrationDetected) {
          setIsRegDetected(true);
          setFetchNotice('Fetched metadata! Detected direct registration URL.');
        } else {
          setFetchNotice('Fetched metadata successfully!');
        }
      } else {
        setFetchNotice(res.data.message || 'Could not fetch details from URL.');
      }
    } catch (err: any) {
      setFetchNotice(
        err?.response?.data?.message || 'Could not fetch details from URL. You can enter details manually.',
      );
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.title.trim() || !form.organization.trim() || !form.description.trim() || !form.applicationDeadline) {
      setErrorMsg('Title, Organization, Description, and Deadline are required.');
      return;
    }

    if (mode === 'mentor' && form.targetAudience !== 'MY_STUDENTS' && form.targetAudience !== 'OUR_STUDENTS') {
      setErrorMsg('Please select target audience: "My Students" or "Our Students".');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        organization: form.organization.trim(),
        description: form.description.trim(),
        status: 'PUBLISHED',
        targetAudience: mode === 'mentor' ? form.targetAudience : form.targetAudience,
        targetDepartment: mode === 'mentor' ? '' : form.targetDepartment,
        targetYear: mode === 'mentor' ? '' : form.targetYear,
        targetSection: mode === 'mentor' ? '' : form.targetSection,
        requiredSkills: form.requiredSkills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };

      const res = await api.post('/opportunities', payload);
      if (res.data.success || res.status === 201) {
        setForm({
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
          targetAudience: mode === 'mentor' ? 'MY_STUDENTS' : 'ALL_STUDENTS',
          targetDepartment: '',
          targetYear: '',
          targetSection: '',
        });
        setFetchNotice(null);
        setIsRegDetected(false);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to submit opportunity. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Send className="h-5 w-5 text-kit-600" />
              Broadcast New Opportunity
            </h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Auto Fetch Section */}
            <div className="rounded-xl border border-kit-200 bg-kit-50/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-kit-900 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-kit-600" />
                  Auto-Fill from Official URL
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Paste Official Opportunity URL to auto-fill..."
                  value={form.opportunityUrl}
                  onChange={(e) => setForm({ ...form, opportunityUrl: e.target.value })}
                  className="flex-1 rounded-xl border border-kit-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-kit-500"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleFetchUrlDetails}
                  disabled={isFetchingUrl}
                  className="shrink-0 font-bold text-xs"
                >
                  {isFetchingUrl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Fetch'}
                </Button>
              </div>
              {fetchNotice && <p className="text-[11px] text-kit-800 font-semibold">{fetchNotice}</p>}
            </div>

            {/* Title & Organization */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Title *"
                placeholder="e.g. Software Engineering Intern"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
              <Input
                label="Organization *"
                placeholder="e.g. Google / Microsoft / TCS"
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                required
              />
            </div>

            {/* Dual URLs */}
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
              <Input
                label="Official Opportunity URL"
                placeholder="https://opportunity-info.com/..."
                value={form.opportunityUrl}
                onChange={(e) => setForm({ ...form, opportunityUrl: e.target.value })}
              />
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700">Registration URL</label>
                  {isRegDetected && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      Detected
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

            {/* Type, Location, Deadline */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium focus:border-kit-500 focus:outline-none"
                >
                  <option value="INTERNSHIP">Internship</option>
                  <option value="JOB">Job</option>
                  <option value="HACKATHON">Hackathon</option>
                  <option value="COMPETITION">Competition</option>
                  <option value="WORKSHOP">Workshop</option>
                  <option value="SCHOLARSHIP">Scholarship</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <Input
                label="Location"
                placeholder="e.g. Remote / Coimbatore"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
              <Input
                label="Deadline *"
                type="datetime-local"
                value={form.applicationDeadline}
                onChange={(e) => setForm({ ...form, applicationDeadline: e.target.value })}
                required
              />
            </div>

            {/* Description */}
            <Textarea
              label="Description *"
              placeholder="Provide a detailed overview of requirements, role responsibilities, benefits, and instructions..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              required
            />

            {/* Target Audience Controls: Role-Specific */}
            {mode === 'mentor' ? (
              <div className="rounded-xl border border-kit-200 bg-kit-50/50 p-4 space-y-3">
                <h4 className="text-xs font-bold text-kit-900 uppercase tracking-wider">
                  Target Audience
                </h4>

                <div className="flex gap-4 text-xs font-semibold text-gray-700">
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3.5 py-2.5 rounded-xl border border-gray-200 hover:border-kit-400 transition-colors">
                    <input
                      type="radio"
                      name="mentorTargetAudience"
                      value="MY_STUDENTS"
                      checked={form.targetAudience === 'MY_STUDENTS'}
                      onChange={() => setForm({ ...form, targetAudience: 'MY_STUDENTS' })}
                      className="text-kit-600 focus:ring-kit-500"
                    />
                    My Students
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3.5 py-2.5 rounded-xl border border-gray-200 hover:border-kit-400 transition-colors">
                    <input
                      type="radio"
                      name="mentorTargetAudience"
                      value="OUR_STUDENTS"
                      checked={form.targetAudience === 'OUR_STUDENTS'}
                      onChange={() => setForm({ ...form, targetAudience: 'OUR_STUDENTS' })}
                      className="text-kit-600 focus:ring-kit-500"
                    />
                    Our Students
                  </label>
                </div>
              </div>
            ) : (
              /* HOD Targeting Controls */
              <div className="rounded-xl border border-kit-200 bg-kit-50/50 p-4 space-y-3">
                <h4 className="text-xs font-bold text-kit-900 uppercase tracking-wider">
                  Target Audience & Broadcast Scope
                </h4>

                <div className="flex flex-wrap gap-4 text-xs font-semibold text-gray-700">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="hodBroadcastTarget"
                      checked={form.targetAudience === 'ALL_STUDENTS'}
                      onChange={() => setForm({ ...form, targetAudience: 'ALL_STUDENTS' })}
                    />
                    All Students
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="hodBroadcastTarget"
                      checked={form.targetAudience === 'ALL_MENTORS'}
                      onChange={() => setForm({ ...form, targetAudience: 'ALL_MENTORS' })}
                    />
                    All Mentors
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="hodBroadcastTarget"
                      checked={form.targetAudience === 'BOTH'}
                      onChange={() => setForm({ ...form, targetAudience: 'BOTH' })}
                    />
                    Students + Mentors
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Department</label>
                    <select
                      value={form.targetDepartment}
                      onChange={(e) => setForm({ ...form, targetDepartment: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium focus:border-kit-500 focus:outline-none"
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
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium focus:border-kit-500 focus:outline-none"
                    >
                      <option value="">All Years</option>
                      {availableYears.map((yr) => (
                        <option key={yr} value={yr}>
                          Year {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Section</label>
                    <select
                      value={form.targetSection}
                      onChange={(e) => setForm({ ...form, targetSection: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium focus:border-kit-500 focus:outline-none"
                    >
                      <option value="">All Sections</option>
                      {availableSections.map((sec) => (
                        <option key={sec} value={sec}>
                          Section {sec}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                className="font-bold flex items-center gap-1.5"
              >
                <Send className="h-4 w-4" /> Broadcast Opportunity 🚀
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
