'use client';

import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  ExternalLink,
  FileText,
  Clock,
  Pencil,
  Trash2,
  Plus,
  Send,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge, TypeBadge } from '@/components/ui/StatusBadge';
import { ExtendedApplication, ApplicationStatus } from '@/types/placement';
import { ApplicationTimeline } from './ApplicationTimeline';
import { Button } from '@/components/ui/Button';

interface ApplicationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: ExtendedApplication | null;
  onEdit: (app: ExtendedApplication) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: ApplicationStatus) => void;
  onAddNote: (id: string, note: string) => void;
}

export function ApplicationDetailModal({
  isOpen,
  onClose,
  application,
  onEdit,
  onDelete,
  onUpdateStatus,
  onAddNote,
}: ApplicationDetailModalProps) {
  const [newNote, setNewNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  if (!application) return null;

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAddNote(application.id, newNote.trim());
    setNewNote('');
    setShowNoteInput(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Application Details" size="xl">
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50/50 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-xl shadow-xs">
              {application.companyName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-gray-900">{application.position}</h3>
                <TypeBadge type={application.applicationType} />
              </div>
              <p className="text-sm font-semibold text-gray-600 flex items-center gap-1.5 mt-0.5">
                <Building2 className="h-4 w-4 text-gray-400" />
                {application.companyName}
                <span className="text-gray-300">•</span>
                <MapPin className="h-4 w-4 text-gray-400" />
                {application.location}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={application.status} className="text-sm px-3 py-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(application);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        </div>

        {/* Visual Timeline */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Application Pipeline</h4>
          <ApplicationTimeline timeline={application.timeline} status={application.status} />
        </div>

        {/* Quick Status Change Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          <span className="text-xs font-medium text-gray-500 mr-2">Update Status:</span>
          {(['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED'] as ApplicationStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => onUpdateStatus(application.id, st)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                application.status === st
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Detailed Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-gray-200 p-4 bg-white">
          <div>
            <span className="text-xs text-gray-400 font-medium">Salary / Stipend</span>
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mt-0.5">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              {application.salary || 'Not specified'}
            </p>
          </div>

          <div>
            <span className="text-xs text-gray-400 font-medium">Resume Version Used</span>
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mt-0.5">
              <FileText className="h-4 w-4 text-indigo-600" />
              {application.resumeVersion || 'Default Resume'}
            </p>
          </div>

          <div>
            <span className="text-xs text-gray-400 font-medium">Applied Date</span>
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mt-0.5">
              <Calendar className="h-4 w-4 text-blue-600" />
              {application.appliedDate}
            </p>
          </div>

          <div>
            <span className="text-xs text-gray-400 font-medium">Application Deadline</span>
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mt-0.5">
              <Clock className="h-4 w-4 text-rose-600" />
              {application.deadline}
            </p>
          </div>

          {application.nextAction && (
            <div className="md:col-span-2 rounded-lg bg-amber-50 p-3 border border-amber-200">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Next Action</span>
              <p className="text-sm font-semibold text-amber-900 mt-0.5">{application.nextAction}</p>
            </div>
          )}
        </div>

        {/* Job Description */}
        {application.description && (
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-1.5">Job Description</h4>
            <div className="rounded-lg bg-gray-50 p-3.5 text-sm text-gray-700 leading-relaxed border border-gray-100">
              {application.description}
            </div>
          </div>
        )}

        {/* Notes & Comments Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-gray-900">Notes & Activity History</h4>
            <button
              onClick={() => setShowNoteInput(!showNoteInput)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Note
            </button>
          </div>

          {showNoteInput && (
            <form onSubmit={handleNoteSubmit} className="mb-3 flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Type a new note..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <Button type="submit" size="sm" variant="primary">
                <Send className="h-3.5 w-3.5" />
                Save
              </Button>
            </form>
          )}

          <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3.5 text-sm text-gray-700 font-mono whitespace-pre-wrap">
            {application.notes || 'No notes added yet.'}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 flex-wrap">
            {application.applicationUrl && (
              <a
                href={application.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Job Link
              </a>
            )}
            {application.githubUrl && (
              <a
                href={application.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                GitHub Profile
              </a>
            )}
            {application.codolioUrl && (
              <a
                href={application.codolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-purple-50 px-3.5 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Codolio Profile
              </a>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (confirm(`Delete application for ${application.companyName}?`)) {
                  onDelete(application.id);
                  onClose();
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete Application
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
