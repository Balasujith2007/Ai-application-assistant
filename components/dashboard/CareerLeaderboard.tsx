'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Crown,
  Medal,
  Award,
  Briefcase,
  Sparkles,
  FileText,
  Loader2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  studentId: string;
  studentName: string;
  profilePhotoUrl: string | null;
  careerGrowthScore: number;
  rankTier: string | null;
  internshipScore: number;
  hackathonScore: number;
  resumeScore: number;
  rankMovement: 'up' | 'down' | 'same' | 'new';
  movementValue: number;
}

interface LeaderboardData {
  weekKey: string;
  leaderboard: LeaderboardEntry[];
  currentStudent: {
    rank: number | null;
    careerGrowthScore: number;
    internshipScore: number;
    hackathonScore: number;
    resumeScore: number;
  };
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function CareerLeaderboard() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTop3, setShowTop3] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard/career', { headers: getAuthHeader() });
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.message || 'Unable to load leaderboard.');
      }
    } catch {
      setError('Unable to load leaderboard.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-gray-100 shadow-2xs p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl bg-white border border-gray-100 shadow-2xs p-6">
        <p className="text-sm text-gray-500">{error || 'No leaderboard data available.'}</p>
      </div>
    );
  }

  const top3 = data.leaderboard.slice(0, 3);
  const rest = data.leaderboard.slice(3);

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[#990024]" /> Career Leaderboard
            </h2>
            <p className="mt-1 text-xs text-gray-500">Week {data.weekKey} · Top performers by career growth</p>
          </div>
          <button
            onClick={() => setShowTop3(!showTop3)}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
          >
            {showTop3 ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
          </button>
        </div>
      </div>

      {/* Current Student Rank */}
      {data.currentStudent.rank && (
        <div className="bg-gradient-to-r from-purple-50 to-amber-50 border-b border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white border-2 border-[#990024] flex items-center justify-center font-bold text-[#990024]">
                #{data.currentStudent.rank}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600">Your Rank</p>
                <p className="text-sm font-bold text-gray-900">Score: {Math.round(data.currentStudent.careerGrowthScore)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500">Category Breakdown</p>
              <div className="flex gap-2 mt-1">
                <span className="text-[10px] font-medium text-blue-600">
                  <Briefcase className="h-3 w-3 inline mr-0.5" />
                  {Math.round(data.currentStudent.internshipScore)}
                </span>
                <span className="text-[10px] font-medium text-purple-600">
                  <Sparkles className="h-3 w-3 inline mr-0.5" />
                  {Math.round(data.currentStudent.hackathonScore)}
                </span>
                <span className="text-[10px] font-medium text-emerald-600">
                  <FileText className="h-3 w-3 inline mr-0.5" />
                  {Math.round(data.currentStudent.resumeScore)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Champions */}
      <AnimatePresence>
        {showTop3 && (
          <motion.div
            initial={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-4 border-b border-gray-100"
          >
            <div className="grid grid-cols-3 gap-3">
              {top3.map((entry, index) => (
                <ChampionCard key={entry.studentId} entry={entry} position={index + 1} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Leaderboard */}
      <div className="max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-gray-600 text-xs">Rank</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600 text-xs">Student</th>
              <th className="px-4 py-2 text-right font-semibold text-gray-600 text-xs">Score</th>
              <th className="px-4 py-2 text-center font-semibold text-gray-600 text-xs">Movement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rest.map((entry) => (
              <LeaderboardRow key={entry.studentId} entry={entry} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChampionCard({ entry, position }: { entry: LeaderboardEntry; position: number }) {
  const gradients = [
    'from-yellow-400 to-amber-500',
    'from-slate-300 to-slate-400',
    'from-orange-400 to-orange-500',
  ];
  const icons = [Crown, Medal, Award];
  const Icon = icons[position - 1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position * 0.1 }}
      className={`bg-gradient-to-br ${gradients[position - 1]} rounded-xl p-3 text-white text-center`}
    >
      <Icon className="h-6 w-6 mx-auto mb-1" />
      <p className="text-xs font-bold mb-1">{entry.studentName.split(' ')[0]}</p>
      <p className="text-xs font-black text-lg">{Math.round(entry.careerGrowthScore)}</p>
      <p className="text-[10px] opacity-90 mt-1">Rank #{position}</p>
    </motion.div>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const movementIcon = {
    up: <TrendingUp className="h-3 w-3 text-emerald-500" />,
    down: <TrendingDown className="h-3 w-3 text-rose-500" />,
    same: <Minus className="h-3 w-3 text-gray-400" />,
    new: <span className="text-[10px] font-bold text-blue-500">NEW</span>,
  };

  return (
    <tr className="hover:bg-gray-50 transition">
      <td className="px-4 py-2 font-bold text-gray-900">#{entry.rank}</td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          {entry.profilePhotoUrl ? (
            <img
              src={entry.profilePhotoUrl}
              alt={entry.studentName}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
              {entry.studentName.charAt(0)}
            </div>
          )}
          <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">{entry.studentName}</span>
        </div>
      </td>
      <td className="px-4 py-2 text-right font-bold text-gray-900 tabular-nums">
        {Math.round(entry.careerGrowthScore)}
      </td>
      <td className="px-4 py-2 text-center">
        <div className="flex items-center justify-center gap-1">
          {movementIcon[entry.rankMovement]}
          {entry.rankMovement !== 'new' && entry.movementValue > 0 && (
            <span className="text-[10px] font-medium text-gray-500">{entry.movementValue}</span>
          )}
        </div>
      </td>
    </tr>
  );
}
