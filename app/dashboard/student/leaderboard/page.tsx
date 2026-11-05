'use client';

import React from 'react';
import { Trophy, TrendingUp } from 'lucide-react';
import { StudentPageHeader } from '@/components/dashboard/StudentPageHeader';
import { CareerLeaderboard } from '@/components/dashboard/CareerLeaderboard';

/**
 * Dedicated Career Leaderboard page.
 * Reuses the existing CareerLeaderboard component and /api/leaderboard/career
 * endpoint — no ranking logic is duplicated here.
 */
export default function CareerLeaderboardPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <StudentPageHeader
        title="Career Leaderboard"
        subtitle="Weekly rankings by Career Growth Score — internship & job applications, hackathons & competitions, and resume strength."
        badge={<Trophy className="h-5 w-5 text-[#990024]" />}
      />

      <CareerLeaderboard />

      <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
        <p className="flex items-start gap-2 text-[11px] text-gray-600">
          <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#990024]" />
          Rankings are based on verified career growth milestones only. Standings are computed from
          finalized weekly snapshots and reflect real platform activity.
        </p>
      </div>
    </div>
  );
}
