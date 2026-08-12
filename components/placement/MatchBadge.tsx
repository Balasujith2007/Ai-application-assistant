'use client';

import React, { useState } from 'react';
import { Check, X, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Opportunity } from '@/types/placement';
import { cn } from '@/lib/utils';
import { getOpportunityRegistrationState } from '@/lib/opportunityUtils';

interface MatchBadgeProps {
  opportunity: Opportunity;
  onApply?: () => void;
  onView?: () => void;
  detailed?: boolean;
}

export function MatchBadge({
  opportunity,
  onApply,
  onView,
  detailed = false,
}: MatchBadgeProps) {
  const [expanded, setExpanded] = useState(detailed);
  const matchScore = opportunity?.matchScore ?? 0;
  const isHighMatch = matchScore >= 80;
  const isMediumMatch = matchScore >= 60 && matchScore < 80;

  const missingSkills = opportunity?.missingSkills || [];
  const requiredSkills = opportunity?.requiredSkills || [];

  const stateInfo = getOpportunityRegistrationState(
    opportunity,
    (opportunity as any)?.studentRegistration,
    (opportunity as any)?.userRegistrationStatus
  );

  const badgeColor = isHighMatch
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : isMediumMatch
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-rose-50 text-rose-700 border-rose-200';

  const progressBg = isHighMatch
    ? 'bg-emerald-500'
    : isMediumMatch
    ? 'bg-amber-500'
    : 'bg-rose-500';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold text-sm">
            {opportunity?.companyName?.charAt(0) || 'C'}
          </div>
          <div>
            <h4 className="font-bold text-gray-900 leading-tight">{opportunity?.role || 'Opportunity'}</h4>
            <p className="text-xs text-gray-500">{opportunity?.companyName || 'Company'} • {opportunity?.location || 'Remote'}</p>
          </div>
        </div>

        {/* Score pill */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold shadow-2xs',
              badgeColor,
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {matchScore}% Match
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn('h-full rounded-full transition-all duration-500', progressBg)}
          style={{ width: `${matchScore}%` }}
        />
      </div>

      {/* Breakdown details */}
      {expanded && (
        <div className="mt-4 pt-3 border-t border-gray-100 space-y-2.5 text-xs">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-medium text-emerald-700">
              <Check className="h-3.5 w-3.5 shrink-0 stroke-[3]" />
              <span>CGPA requirement met ({opportunity?.minCgpa ?? 0}+ CGPA)</span>
            </div>

            {requiredSkills.map((skill) => {
              const hasSkill = !missingSkills.includes(skill);
              return (
                <div
                  key={skill}
                  className={cn(
                    'flex items-center gap-2 font-medium',
                    hasSkill ? 'text-emerald-700' : 'text-rose-600',
                  )}
                >
                  {hasSkill ? (
                    <Check className="h-3.5 w-3.5 shrink-0 stroke-[3]" />
                  ) : (
                    <X className="h-3.5 w-3.5 shrink-0 stroke-[3]" />
                  )}
                  <span>{skill}</span>
                </div>
              );
            })}
          </div>

          <div className="pt-2 text-xs font-semibold">
            {missingSkills.length === 0 ? (
              <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md inline-block">
                ✓ You are eligible for this opportunity.
              </span>
            ) : (
              <span className="text-amber-800 bg-amber-50 px-2 py-1 rounded-md inline-block">
                You are missing {missingSkills.length} required skill{missingSkills.length > 1 ? 's' : ''} ({missingSkills.join(', ')}).
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="mt-4 flex items-center justify-between pt-2">
        <span className="inline-flex rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          {opportunity?.package || 'N/A'}
        </span>
        <div className="flex items-center gap-2">
          {onView && (
            <button
              onClick={onView}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              View Opportunity
            </button>
          )}
          {onApply && (
            <button
              onClick={onApply}
              disabled={stateInfo.isButtonDisabled}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                stateInfo.registrationStatus === 'REGISTERED' || stateInfo.registrationStatus === 'SHORTLISTED' || stateInfo.registrationStatus === 'SELECTED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                  : stateInfo.isButtonDisabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700'
              )}
            >
              {stateInfo.buttonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
