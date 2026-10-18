'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Code,
  Briefcase,
  Flame,
  RotateCw,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
  Calendar,
  AlertCircle,
  Medal,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

interface ClassLeaderboardProps {
  initialPeriod?: 'WEEKLY' | 'MONTHLY' | 'SEMESTER' | 'ALL_TIME';
}

export function ClassLeaderboard({ initialPeriod = 'ALL_TIME' }: ClassLeaderboardProps) {
  const [period, setPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'SEMESTER' | 'ALL_TIME'>(initialPeriod);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async (selectedPeriod: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leaderboard?period=${selectedPeriod.toLowerCase()}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.message || 'Failed to load leaderboard data.');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error while loading leaderboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard(period);
  }, [fetchLeaderboard, period]);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncSuccessMsg(null);
    try {
      const res = await fetch('/api/leaderboard/sync', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setSyncSuccessMsg(
          json.syncedPlatforms?.length > 0
            ? `Successfully synchronized ${json.syncedPlatforms.join(', ')}!`
            : 'Synchronized with latest platform activity.'
        );
        setTimeout(() => setSyncSuccessMsg(null), 4000);
        await fetchLeaderboard(period);
      } else {
        setError(json.message || 'Sync failed.');
      }
    } catch (err: any) {
      setError(err?.message || 'Sync network error.');
    } finally {
      setSyncing(false);
    }
  };

  // State 1: Incomplete Class Profile
  if (data?.incompleteProfile) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">Academic Class Profile Incomplete</h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Class leaderboards are strictly isolated to your registered Department, Year, and Section.
              </p>
            </div>
          </div>
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition-colors shadow-2xs shrink-0"
          >
            Complete Profile Now <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  const currentStudent = data?.currentStudent?.entry;
  const breakdown = data?.currentStudent?.categoryBreakdown;
  const recommendations = data?.currentStudent?.recommendations || [];
  const rankings = data?.rankings || [];
  const stats = data?.stats || {};
  const isProvisional = currentStudent?.isProvisional ?? false;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-2xs space-y-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-kit-50 text-kit-600">
              <Trophy className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Verified Class Leaderboard</h2>
            {data?.classInfo && (
              <span className="inline-flex items-center gap-1 rounded-md bg-kit-50 px-2.5 py-0.5 text-xs font-bold text-kit-700 border border-kit-200">
                <ShieldCheck className="h-3 w-3" />
                {data.classInfo.displayName}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Rankings computed from verified contest performance, hackathon milestones, internship progress, and consistency.
          </p>
        </div>

        {/* Period Selector & Sync Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-gray-100 p-1 text-xs font-semibold">
            {(['WEEKLY', 'MONTHLY', 'SEMESTER', 'ALL_TIME'] as const).map((p) => {
              const labels = {
                WEEKLY: 'Weekly',
                MONTHLY: 'Monthly',
                SEMESTER: 'Semester',
                ALL_TIME: 'All-Time',
              };
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs transition-all ${
                    period === p
                      ? 'bg-white text-kit-600 font-bold shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Sync external contest statistics"
          >
            <RotateCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin text-kit-600' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      </div>

      {/* Sync Success / Error Notification */}
      <AnimatePresence>
        {syncSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{syncSuccessMsg}</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800 flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="flex flex-col items-center gap-2.5">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-kit-200 border-t-kit-600" />
            <p className="text-xs font-medium text-gray-400">Computing verified class rankings...</p>
          </div>
        </div>
      ) : (
        <>
          {/* 2. Top Student Metric Highlights Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Class Rank Card */}
            <div className="rounded-xl bg-gradient-to-br from-kit-900 to-kit-800 p-4 text-white shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-kit-200">
                <span>Class Rank</span>
                <Trophy className="h-4 w-4 text-amber-300" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black">
                  {currentStudent ? `#${currentStudent.rank}` : '--'}
                </span>
                <span className="text-xs text-kit-200">
                  of {stats.totalStudents || 0} students
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-kit-200">
                {currentStudent?.rankMovement > 0 ? (
                  <span className="inline-flex items-center text-emerald-300 font-bold">
                    <TrendingUp className="h-3 w-3 mr-0.5" /> +{currentStudent.rankMovement} spots
                  </span>
                ) : currentStudent?.rankMovement < 0 ? (
                  <span className="inline-flex items-center text-rose-300 font-bold">
                    <TrendingDown className="h-3 w-3 mr-0.5" /> {currentStudent.rankMovement} spots
                  </span>
                ) : (
                  <span className="inline-flex items-center text-gray-300">
                    <Minus className="h-3 w-3 mr-0.5" /> Rank unchanged
                  </span>
                )}
                <span>vs prev period</span>
              </div>
            </div>

            {/* Verified Career Score Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                <span>Verified Career Score</span>
                <Award className="h-4 w-4 text-kit-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-gray-900">
                  {currentStudent ? currentStudent.totalScore : 0}
                </span>
                <span className="text-xs font-bold text-gray-400">/ 100</span>
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                {isProvisional ? (
                  <span className="text-amber-600 font-bold">Provisional score</span>
                ) : (
                  <span>Verified across 4 categories</span>
                )}
              </div>
            </div>

            {/* Class Average Score */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                <span>Class Average</span>
                <Sparkles className="h-4 w-4 text-blue-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-gray-900">
                  {stats.averageScore || 0}
                </span>
                <span className="text-xs font-bold text-gray-400">/ 100</span>
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                Highest: <span className="font-bold text-gray-800">{stats.highestScore || 0} pts</span>
              </div>
            </div>

            {/* Verification Status */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                <span>Data Freshness</span>
                <Calendar className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-sm font-bold text-gray-900 truncate">
                {data?.currentStudent?.syncStatus?.lastSyncedAt
                  ? new Date(data.currentStudent.syncStatus.lastSyncedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Not synced'}
              </div>
              <div className="mt-1 text-[11px] text-gray-500 truncate">
                {data?.currentStudent?.syncStatus?.connectedPlatforms?.length > 0 ? (
                  <span className="text-emerald-600 font-semibold">
                    {data.currentStudent.syncStatus.connectedPlatforms.join(', ')} connected
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium">No platforms connected</span>
                )}
              </div>
            </div>
          </div>

          {/* 3. Empty State / Connect Profile CTA */}
          {isProvisional && (
            <div className="rounded-xl border border-dashed border-kit-200 bg-kit-50/50 p-4 text-center space-y-2">
              <p className="text-xs font-bold text-kit-900">
                Connect your contest profile to calculate your verified performance.
              </p>
              <p className="text-[11px] text-kit-700 max-w-lg mx-auto">
                CareerAI calculates your leaderboard rank exclusively from verified accounts (Codeforces, LeetCode, CodeChef) and verified hackathons/internships. Missing data is not counted as zero performance.
              </p>
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 rounded-lg bg-kit-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-kit-700 transition-colors"
              >
                Connect Platforms in Profile <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {/* 4. Category Scoring Breakdown */}
          {breakdown && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Performance Breakdown (Your Score)
                </h3>
                <span className="text-[11px] font-semibold text-gray-400">Weights: 50% / 25% / 15% / 10%</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Competitive Coding */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5 text-blue-600" /> Coding
                    </span>
                    <span className="text-xs font-bold text-blue-700">
                      {breakdown.coding.score} / {breakdown.coding.maxScore}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${breakdown.coding.percentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 truncate">
                    {breakdown.coding.verifiedContestsCount} contests • {breakdown.coding.highestRating > 0 ? `Rating: ${breakdown.coding.highestRating}` : 'Unrated'}
                  </p>
                </div>

                {/* Hackathon Performance */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Trophy className="h-3.5 w-3.5 text-amber-600" /> Hackathons
                    </span>
                    <span className="text-xs font-bold text-amber-700">
                      {breakdown.hackathon.score} / {breakdown.hackathon.maxScore}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${breakdown.hackathon.percentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 truncate">
                    {breakdown.hackathon.participationsCount} verified • {breakdown.hackathon.winnerCount > 0 ? `${breakdown.hackathon.winnerCount} win` : '0 awards'}
                  </p>
                </div>

                {/* Internship Progress */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-emerald-600" /> Internships
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      {breakdown.internship.score} / {breakdown.internship.maxScore}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${breakdown.internship.percentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 truncate">
                    {breakdown.internship.interviewsCount} interviews • {breakdown.internship.offersCount > 0 ? `${breakdown.internship.offersCount} offer` : 'In progress'}
                  </p>
                </div>

                {/* Consistency & Improvement */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5 text-rose-600" /> Consistency
                    </span>
                    <span className="text-xs font-bold text-rose-700">
                      {breakdown.consistency.score} / {breakdown.consistency.maxScore}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all"
                      style={{ width: `${breakdown.consistency.percentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 truncate">
                    {breakdown.consistency.activeWeeksCount} active weeks tracked
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 5. Achievement Badges Earned */}
          {currentStudent?.badges && currentStudent.badges.length > 0 && (
            <div className="space-y-2 pt-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Verified Milestones & Badges
              </h3>
              <div className="flex flex-wrap gap-2">
                {currentStudent.badges.map((b: any) => (
                  <span
                    key={b.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-kit-200 bg-kit-50 px-2.5 py-1 text-xs font-bold text-kit-900 shadow-2xs"
                    title={b.description}
                  >
                    <Medal className="h-3.5 w-3.5 text-kit-600" />
                    <span>{b.title}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 6. Class Leaderboard Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Class Standings ({data?.period?.displayName})
              </h3>
              <span className="text-[11px] text-gray-400">Ties share rank; next rank increments</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <tr>
                    <th className="py-2.5 px-3 w-14">Rank</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3 text-center hidden sm:table-cell">Coding (50)</th>
                    <th className="py-2.5 px-3 text-center hidden md:table-cell">Hackathon (25)</th>
                    <th className="py-2.5 px-3 text-center hidden md:table-cell">Internship (15)</th>
                    <th className="py-2.5 px-3 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rankings.map((student: any) => {
                    const isYou = student.isCurrentUser;
                    return (
                      <tr
                        key={student.studentId}
                        className={`transition-colors ${
                          isYou
                            ? 'bg-kit-50/80 font-semibold ring-1 ring-inset ring-kit-200'
                            : 'hover:bg-gray-50/60'
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-2.5 px-3 font-bold">
                          {student.rank === 1 ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-xs">
                              🥇
                            </span>
                          ) : student.rank === 2 ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-800 text-xs">
                              🥈
                            </span>
                          ) : student.rank === 3 ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-amber-900 text-xs">
                              🥉
                            </span>
                          ) : (
                            <span className="text-gray-500 pl-1.5">#{student.rank}</span>
                          )}
                        </td>

                        {/* Name */}
                        <td className="py-2.5 px-3 font-bold text-gray-900">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate">{student.name}</span>
                            {isYou && (
                              <span className="rounded-md bg-kit-600 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                                You
                              </span>
                            )}
                            {student.isProvisional && (
                              <span className="rounded bg-gray-100 px-1 py-0.2 text-[9px] font-medium text-gray-500">
                                Provisional
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Coding */}
                        <td className="py-2.5 px-3 text-center text-gray-600 hidden sm:table-cell">
                          {student.categoryScores?.coding || 0}
                        </td>

                        {/* Hackathon */}
                        <td className="py-2.5 px-3 text-center text-gray-600 hidden md:table-cell">
                          {student.categoryScores?.hackathon || 0}
                        </td>

                        {/* Internship */}
                        <td className="py-2.5 px-3 text-center text-gray-600 hidden md:table-cell">
                          {student.categoryScores?.internship || 0}
                        </td>

                        {/* Total Score */}
                        <td className="py-2.5 px-3 text-right">
                          <span className="font-black text-kit-700 text-sm">
                            {student.totalScore}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 7. Actionable Recommendations */}
          {recommendations.length > 0 && (
            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                <Sparkles className="h-3.5 w-3.5 text-kit-600" />
                <span>Recommendations to Raise Your Verified Rank</span>
              </div>
              <ul className="space-y-1.5 text-xs text-gray-600 list-disc list-inside">
                {recommendations.map((rec: string, idx: number) => (
                  <li key={idx} className="leading-relaxed">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
