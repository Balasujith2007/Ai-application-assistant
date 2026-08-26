'use client';

import React from 'react';
import {
  Building2,
  Calendar,
  Clock,
  Video,
  UserCheck,
  FileText,
  CheckCircle2,
  XCircle,
  Award,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Interview } from '@/types/placement';

interface InterviewDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  interview: Interview | null;
  onDelete?: (id: string) => void;
  onStartMock?: (interview: Interview) => void;
}

export function InterviewDetailModal({
  isOpen,
  onClose,
  interview,
  onDelete,
  onStartMock,
}: InterviewDetailModalProps) {
  if (!interview) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Interview Details" size="lg">
      <div className="space-y-6">
        {/* Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50/50 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-kit-600 text-white font-bold text-lg">
              {interview.companyName.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{interview.companyName}</h3>
              <p className="text-sm font-semibold text-gray-600">{interview.position}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-kit-50 border border-kit-200 px-3 py-1 text-xs font-bold text-kit-700">
              {interview.round}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-gray-200 p-4 bg-white">
          <div>
            <span className="text-xs text-gray-400 font-medium">Date & Time</span>
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mt-0.5">
              <Calendar className="h-4 w-4 text-kit-600" />
              {interview.date} at {interview.time} ({interview.duration})
            </p>
          </div>

          <div>
            <span className="text-xs text-gray-400 font-medium">Interview Format</span>
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mt-0.5">
              <Video className="h-4 w-4 text-kit-600" />
              {interview.type}
            </p>
          </div>

          <div>
            <span className="text-xs text-gray-400 font-medium">Interviewer</span>
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mt-0.5">
              <UserCheck className="h-4 w-4 text-kit-600" />
              {interview.interviewer || 'Assigned Lead Panelist'}
            </p>
          </div>

          <div>
            <span className="text-xs text-gray-400 font-medium">Result / Status</span>
            <div className="mt-0.5">
              {interview.result === 'Selected' ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Selected
                </span>
              ) : interview.result === 'Rejected' ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  <XCircle className="h-3.5 w-3.5" /> Rejected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Pending Feedback
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Performance Score & Feedback if available */}
        {interview.performanceScore && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <Award className="h-4 w-4" /> Performance Score
              </span>
              <span className="text-lg font-extrabold text-emerald-900">{interview.performanceScore} / 10</span>
            </div>
            {interview.feedback && (
              <p className="mt-2 text-sm text-emerald-900/90 font-medium">{interview.feedback}</p>
            )}
          </div>
        )}

        {/* Preparation Topics */}
        {interview.prepTopics && interview.prepTopics.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Recommended Preparation Topics</h4>
            <div className="flex flex-wrap gap-2">
              {interview.prepTopics.map((topic) => (
                <span key={topic} className="rounded-lg bg-kit-50 border border-kit-100 px-3 py-1.5 text-xs font-semibold text-kit-700">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {interview.notes && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Preparation Notes</h4>
            <div className="rounded-lg bg-gray-50 p-3.5 text-sm text-gray-700 leading-relaxed border border-gray-100 font-mono">
              {interview.notes}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            {onDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (confirm('Delete this scheduled interview?')) {
                    onDelete(interview.id);
                    onClose();
                  }
                }}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {onStartMock && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onStartMock(interview);
                }}
              >
                Start AI Mock Practice
              </Button>
            )}

            {interview.meetingLink && (
              <a
                href={interview.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-kit-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-kit-700 transition-colors"
              >
                <Video className="h-4 w-4" /> Join Interview Link
              </a>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
