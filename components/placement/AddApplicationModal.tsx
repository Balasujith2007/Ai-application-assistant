'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ExtendedApplication, ApplicationStatus, ApplicationType } from '@/types/placement';

interface AddApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appData: any) => void;
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

  useEffect(() => {
    if (initialData) {
      setForm({
        companyName: initialData.companyName || '',
        position: initialData.position || '',
        location: initialData.location || '',
        applicationUrl: initialData.applicationUrl || '',
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
    } else {
      setForm({
        companyName: '',
        position: '',
        location: '',
        applicationUrl: '',
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
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName || !form.position) return;
    onSave(form);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Application' : 'Add New Application'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {initialData ? 'Save Changes' : 'Add Application'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
