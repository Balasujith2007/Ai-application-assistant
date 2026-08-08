'use client';

import React from 'react';
import {
  Building2,
  Calendar,
  Clock,
  Video,
  MapPin,
  ExternalLink,
  ChevronRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Interview } from '@/types/placement';
import { cn } from '@/lib/utils';

interface InterviewCardProps {
  interview: Interview;
  onViewDetails: (interview: Interview) => void;
  onJoinMeeting?: (link: string) => void;
}

export function InterviewCard({
  interview,
  onViewDetails,
  onJoinMeeting,
}: InterviewCardProps) {
  const isCompleted = interview.status === 'Completed';

  const roundBadgeColors: Record<string, string> = {
    'Technical Interview': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'HR Interview': 'bg-purple-50 text-purple-700 border-purple-200',
    'Coding Round': 'bg-blue-50 text-blue-700 border-blue-200',
    'Aptitude': 'bg-amber-50 text-amber-700 border-amber-200',
    'Group Discussion': 'bg-teal-50 text-teal-700 border-teal-200',
    'Managerial Round': 'bg-rose-50 text-rose-700 border-rose-200',
    'Final Round': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  const badgeStyle = roundBadgeColors[interview.round] || 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <div className="group flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-gray-300">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold text-lg">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg leading-snug group-hover:text-indigo-600 transition-colors">
                {interview.companyName}
              </h3>
              <p className="text-sm font-medium text-gray-500">{interview.position}</p>
            </div>
          </div>

          <span className={cn('inline-flex rounded-full border px-3 py-0.5 text-xs font-bold', badgeStyle)}>
            {interview.round}
          </span>
        </div>

        {/* Info Grid */}
        <div className="mt-5 space-y-2 rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 text-xs font-semibold text-gray-700">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>{interview.date}</span>
            <span className="text-gray-300">•</span>
            <Clock className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>{interview.time} ({interview.duration})</span>
          </div>

          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>{interview.type}</span>
            {interview.interviewer && (
              <>
                <span className="text-gray-300">•</span>
                <span className="truncate text-gray-500">With {interview.interviewer}</span>
              </>
            )}
          </div>
        </div>

        {/* Preparation topics tag list */}
        {interview.prepTopics && interview.prepTopics.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
              Topics
            </p>
            <div className="flex flex-wrap gap-1.5">
              {interview.prepTopics.slice(0, 4).map((topic) => (
                <span
                  key={topic}
                  className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600"
                >
                  {topic}
                </span>
              ))}
              {interview.prepTopics.length > 4 && (
                <span className="text-[11px] font-medium text-gray-400">
                  +{interview.prepTopics.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-100 gap-2">
        <button
          onClick={() => onViewDetails(interview)}
          className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          View Details
        </button>

        {interview.meetingLink && !isCompleted ? (
          <a
            href={interview.meetingLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
          >
            <Video className="h-3.5 w-3.5" />
            Join Interview
          </a>
        ) : isCompleted ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Completed
          </span>
        ) : null}
      </div>
    </div>
  );
}
