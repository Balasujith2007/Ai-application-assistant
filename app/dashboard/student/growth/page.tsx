'use client';

import React, { useEffect, useState } from 'react';
import { History, Loader2, TrendingUp } from 'lucide-react';
import { StudentPageHeader } from '@/components/dashboard/StudentPageHeader';
import { CareerGrowthSummaryCard } from '@/components/dashboard/CareerGrowthSummaryCard';

interface Snapshot {
  weekKey: string;
  finalScore: number;
  tier: string | null;
  snapshotAt: string;
}

const TIER_STYLES: Record<string, string> = {
  LEGENDARY: 'bg-amber-100 text-amber-800 border-amber-200',
  EPIC: 'bg-purple-100 text-purple-800 border-purple-200',
  RARE: 'bg-blue-100 text-blue-800 border-blue-200',
  COMMON: 'bg-slate-100 text-slate-700 border-slate-200',
  COMEBACK: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Dedicated Weekly Career Growth page.
 * Reuses the existing /api/career-growth endpoint (which reuses the career
 * growth engine) — no scoring or allocation logic is duplicated here.
 */
export default function CareerGrowthPage() {
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/career-growth', { headers: getAuthHeader() });
        const json = await res.json();
        if (!cancelled && json.success && Array.isArray(json.history)) {
          setHistory(json.history);
        }
      } catch {
        /* silent — the summary card renders its own state */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <StudentPageHeader
        title="Weekly Career Growth"
        subtitle="Your career growth score, category breakdown and assigned Mystery Gift tier."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CareerGrowthSummaryCard />
        </div>

        {/* Historical weekly snapshots — immutable finalized scores */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs">
          <div className="border-b border-gray-100 p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <History className="h-4 w-4 text-[#990024]" /> Weekly Snapshot History
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Finalized weekly scores used for reward allocation (most recent first).
            </p>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : history.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
                <History className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-xs text-gray-500">
                  No finalized weekly snapshots yet. Your first snapshot appears after the weekly
                  evaluation runs.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {history.map((snap) => {
                  const tierStyle = snap.tier ? TIER_STYLES[snap.tier] || TIER_STYLES.COMMON : '';
                  return (
                    <li
                      key={snap.weekKey}
                      className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-bold text-gray-900">
                          {snap.weekKey}
                        </p>
                        <p className="mt-0.5 text-[10px] text-gray-400">
                          {new Date(snap.snapshotAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {snap.tier && (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${tierStyle}`}
                          >
                            {snap.tier}
                          </span>
                        )}
                        <span className="tabular-nums text-sm font-black text-gray-900">
                          {Math.round(snap.finalScore)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
        <p className="flex items-start gap-2 text-[11px] text-gray-600">
          <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#990024]" />
          Career Growth is calculated only from verified career activity — internship &amp; job
          applications, hackathons &amp; competitions, and resume strength. No learning or course
          metrics are used.
        </p>
      </div>
    </div>
  );
}
