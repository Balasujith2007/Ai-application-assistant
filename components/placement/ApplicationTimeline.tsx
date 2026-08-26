'use client';

import React from 'react';
import { CheckCircle2, Circle, XCircle } from 'lucide-react';
import { ApplicationTimelineItem, ApplicationStatus } from '@/types/placement';
import { cn } from '@/lib/utils';

interface ApplicationTimelineProps {
  timeline: ApplicationTimelineItem[];
  status: ApplicationStatus;
}

export function ApplicationTimeline({ timeline, status }: ApplicationTimelineProps) {
  if (status === 'REJECTED') {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50/40 p-4">
        <div className="flex items-center gap-3 text-red-700 font-semibold text-sm">
          <XCircle className="h-5 w-5 shrink-0 text-red-500" />
          <span>Application Status: Rejected</span>
        </div>
        <p className="mt-1 text-xs text-red-600 pl-8">
          This application was marked as rejected. Re-application may be permitted after 6 months.
        </p>
      </div>
    );
  }

  const steps = [
    { key: 'Applied', label: 'Applied' },
    { key: 'Shortlisted', label: 'Shortlisted' },
    { key: 'Interview', label: 'Interview' },
    { key: 'Selected', label: 'Selected' },
  ];

  const getStepIndex = (st: ApplicationStatus) => {
    switch (st) {
      case 'APPLIED': return 0;
      case 'SHORTLISTED': return 1;
      case 'INTERVIEW': return 2;
      case 'SELECTED': return 3;
      default: return 0;
    }
  };

  const currentIndex = getStepIndex(status);

  return (
    <div className="relative py-2">
      {/* Background connector line */}
      <div className="absolute left-6 top-1/2 -mt-0.5 h-1 w-[calc(100%-3rem)] bg-gray-200" />
      {/* Active progress line */}
      <div
        className="absolute left-6 top-1/2 -mt-0.5 h-1 bg-kit-600 transition-all duration-500"
        style={{
          width: `${(currentIndex / (steps.length - 1)) * 80}%`,
        }}
      />

      <div className="relative flex justify-between">
        {steps.map((step, idx) => {
          const isDone = idx <= currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div key={step.key} className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 bg-white z-10 font-bold transition-all duration-300',
                  isDone
                    ? 'border-kit-600 bg-kit-600 text-white shadow-xs'
                    : 'border-gray-300 text-gray-400 bg-white',
                  isCurrent && 'ring-4 ring-kit-100 scale-105',
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <span className="text-xs">{idx + 1}</span>
                )}
              </div>

              <span
                className={cn(
                  'text-xs font-semibold',
                  isDone ? 'text-gray-900' : 'text-gray-400',
                  isCurrent && 'text-kit-600 font-bold',
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
