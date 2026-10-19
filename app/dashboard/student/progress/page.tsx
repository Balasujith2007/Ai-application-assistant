'use client';

import React, { useState } from 'react';
import { usePlacement } from '@/context/PlacementContext';
import { ClassLeaderboard } from '@/components/leaderboard/StudentClassLeaderboard';
import AchievementsPage from '../achievements/page';
import { Trophy, Award } from 'lucide-react';

export default function StudentProgressPage() {
  const { isLoading } = usePlacement();
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'achievements'>('leaderboard');

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#990024]/20 border-t-[#990024]"></div>
      </div>
    );
  }

  return (
    <div className="pb-12 space-y-6">
      {/* Top Tab Switcher */}
      <div className="flex items-center justify-between border border-gray-200 bg-white px-4 py-3 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'bg-[#990024] text-white shadow-2xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Trophy className="h-4 w-4" />
            <span>Class Leaderboard</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('achievements')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'achievements'
                ? 'bg-[#990024] text-white shadow-2xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Award className="h-4 w-4" />
            <span>Badges & Achievements</span>
          </button>
        </div>
        <span className="hidden sm:inline-block text-xs text-gray-500 font-medium">
          {activeTab === 'leaderboard' ? 'Cohort Rankings & XP' : 'Performance Badges & Milestones'}
        </span>
      </div>

      {/* Tab Content */}
      {activeTab === 'leaderboard' ? (
        <ClassLeaderboard variant="full" />
      ) : (
        <AchievementsPage />
      )}
    </div>
  );
}
