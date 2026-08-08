'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Task, TaskCategory, TaskPriority } from '@/types/placement';
import { usePlacement } from '@/context/PlacementContext';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: any) => void;
  initialData?: Task | null;
}

const CATEGORIES: TaskCategory[] = [
  'Resume',
  'Applications',
  'Interviews',
  'Skill Development',
  'Hackathons',
  'Mentor',
  'Documents',
];

const PRIORITIES: TaskPriority[] = ['High', 'Medium', 'Low'];

export function AddTaskModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: AddTaskModalProps) {
  const { applications, interviews } = usePlacement();

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Applications' as TaskCategory,
    dueDate: '2026-08-10',
    priority: 'High' as TaskPriority,
    reminder: '',
    relatedAppId: '',
    relatedInterviewId: '',
    completed: false,
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title || '',
        description: initialData.description || '',
        category: initialData.category || 'Applications',
        dueDate: initialData.dueDate || '2026-08-10',
        priority: initialData.priority || 'High',
        reminder: initialData.reminder || '',
        relatedAppId: initialData.relatedAppId || '',
        relatedInterviewId: initialData.relatedInterviewId || '',
        completed: initialData.completed || false,
      });
    } else {
      setForm({
        title: '',
        description: '',
        category: 'Applications',
        dueDate: '2026-08-10',
        priority: 'High',
        reminder: '',
        relatedAppId: '',
        relatedInterviewId: '',
        completed: false,
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave(form);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Task' : 'Add New Task'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Task Name *"
          placeholder="e.g. Update Resume, Complete Java Assessment"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-700">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Details about what needs to be done..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as TaskCategory })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Due Date *"
            type="text"
            placeholder="e.g. Today, Aug 10, 2026-08-10"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            required
          />

          <Input
            label="Reminder Notification"
            placeholder="e.g. Aug 10 at 9:00 AM"
            value={form.reminder}
            onChange={(e) => setForm({ ...form, reminder: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Related Application (Optional)</label>
            <select
              value={form.relatedAppId}
              onChange={(e) => setForm({ ...form, relatedAppId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">None</option>
              {applications.map((app) => (
                <option key={app.id} value={app.id}>{app.companyName} - {app.position}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Related Interview (Optional)</label>
            <select
              value={form.relatedInterviewId}
              onChange={(e) => setForm({ ...form, relatedInterviewId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">None</option>
              {interviews.map((int) => (
                <option key={int.id} value={int.id}>{int.companyName} - {int.round}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {initialData ? 'Save Changes' : 'Add Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
