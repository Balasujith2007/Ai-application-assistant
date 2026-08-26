'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { InterviewRound, InterviewType } from '@/types/placement';

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (data: any) => void;
}

const ROUNDS: InterviewRound[] = [
  'Technical Interview',
  'HR Interview',
  'Coding Round',
  'Aptitude',
  'Group Discussion',
  'Managerial Round',
  'Final Round',
];

const TYPES: InterviewType[] = ['Online Interview', 'In-Person Interview', 'Telephonic'];

export function ScheduleInterviewModal({
  isOpen,
  onClose,
  onSchedule,
}: ScheduleInterviewModalProps) {
  const [form, setForm] = useState({
    companyName: '',
    position: '',
    round: 'Technical Interview' as InterviewRound,
    date: new Date().toISOString().split('T')[0],
    time: '10:00 AM',
    duration: '60 mins',
    type: 'Online Interview' as InterviewType,
    meetingLink: '',
    interviewer: '',
    notes: '',
    prepTopics: 'Java, SQL, Data Structures, OOP, HR Questions',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName || !form.position) return;

    onSchedule({
      ...form,
      prepTopics: form.prepTopics.split(',').map((t) => t.trim()).filter(Boolean),
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule New Interview" size="lg">
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
            placeholder="e.g. Software Engineer"
            value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Interview Round</label>
            <select
              value={form.round}
              onChange={(e) => setForm({ ...form, round: e.target.value as InterviewRound })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-kit-500 focus:outline-none"
            >
              {ROUNDS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Interview Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as InterviewType })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-kit-500 focus:outline-none"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Date *"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
          <Input
            label="Time"
            placeholder="e.g. 10:30 AM"
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
          />
          <Input
            label="Duration"
            placeholder="e.g. 60 mins"
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Meeting Link / Venue"
            placeholder="https://meet.google.com/..."
            value={form.meetingLink}
            onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
          />
          <Input
            label="Interviewer Name (Optional)"
            placeholder="e.g. Suresh Kumar (Lead SDE)"
            value={form.interviewer}
            onChange={(e) => setForm({ ...form, interviewer: e.target.value })}
          />
        </div>

        <Input
          label="Preparation Topics (Comma-separated)"
          placeholder="Java, SQL, Data Structures, System Design, HR Questions"
          value={form.prepTopics}
          onChange={(e) => setForm({ ...form, prepTopics: e.target.value })}
        />

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-700">Notes & Preparation Plan</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Specific topics to revise, questions to ask the interviewer..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-kit-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Schedule Interview
          </Button>
        </div>
      </form>
    </Modal>
  );
}
