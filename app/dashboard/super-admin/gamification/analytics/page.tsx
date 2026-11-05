'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Users,
  Gift,
  Trophy,
  TrendingUp,
  Coins,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Loader2,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface AnalyticsData {
  metrics: {
    totalActiveStudents: number;
    weeklyGiftsDistributed: number;
    championGiftsDistributed: number;
    totalXpDistributed: number;
    totalCoinsDistributed: number;
    totalAchievementsUnlocked: number;
    totalRewardClaims: number;
    failedAllocations: number;
    distributionSuccessRate: number;
  };
  trends: {
    weeklyRewardTrends: any[];
    achievementTrends: any[];
    rewardCategoryDistribution: any[];
    championStats: any[];
  };
  recentDistributions: any[];
}

export default function GamificationAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(7);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/admin/gamification/analytics?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Failed to load analytics.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || 'Unable to load analytics.'}
        </div>
      </div>
    );
  }

  const { metrics, trends, recentDistributions } = data;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-gray-900">
            <BarChart3 className="h-8 w-8 text-[#990024]" /> Gamification Analytics
          </h1>
          <p className="mt-1 text-gray-500">
            Monitor reward distribution, achievement unlocks, and student engagement trends.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#990024] focus:outline-none focus:ring-2 focus:ring-[#990024]"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<Users className="h-5 w-5" />}
          label="Active Students"
          value={metrics.totalActiveStudents}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <MetricCard
          icon={<Gift className="h-5 w-5" />}
          label="Weekly Gifts"
          value={metrics.weeklyGiftsDistributed}
          color="text-purple-600"
          bg="bg-purple-50"
        />
        <MetricCard
          icon={<Trophy className="h-5 w-5" />}
          label="Champion Gifts"
          value={metrics.championGiftsDistributed}
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <MetricCard
          icon={<CheckCircle className="h-5 w-5" />}
          label="Success Rate"
          value={`${metrics.distributionSuccessRate}%`}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="XP Distributed"
          value={metrics.totalXpDistributed.toLocaleString()}
          color="text-violet-600"
          bg="bg-violet-50"
        />
        <MetricCard
          icon={<Coins className="h-5 w-5" />}
          label="Coins Distributed"
          value={metrics.totalCoinsDistributed.toLocaleString()}
          color="text-orange-600"
          bg="bg-orange-50"
        />
        <MetricCard
          icon={<Sparkles className="h-5 w-5" />}
          label="Achievements"
          value={metrics.totalAchievementsUnlocked}
          color="text-rose-600"
          bg="bg-rose-50"
        />
        <MetricCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Failed Allocations"
          value={metrics.failedAllocations}
          color="text-red-600"
          bg="bg-red-50"
        />
      </div>

      {/* Trends Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800 mb-4">
            Reward Category Distribution
          </h3>
          {trends.rewardCategoryDistribution.length === 0 ? (
            <p className="text-sm text-gray-500">No data available</p>
          ) : (
            <div className="space-y-2">
              {trends.rewardCategoryDistribution.map((item: any) => (
                <div key={item.rewardRarity} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{item.rewardRarity}</span>
                  <span className="text-sm font-bold text-gray-900">{item._count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800 mb-4">
            Champion Statistics
          </h3>
          {trends.championStats.length === 0 ? (
            <p className="text-sm text-gray-500">No champion rewards distributed</p>
          ) : (
            <div className="space-y-2">
              {trends.championStats.map((item: any) => (
                <div key={item.triggerType} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{item.triggerType}</span>
                  <span className="text-sm font-bold text-gray-900">{item._count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Distributions */}
      <Card className="p-4" padding="none">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800 p-4 pb-2">
          Recent Weekly Distributions
        </h3>
        {recentDistributions.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">No distributions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 font-semibold text-gray-600">Week Key</th>
                  <th className="px-4 py-2 font-semibold text-gray-600">Students</th>
                  <th className="px-4 py-2 font-semibold text-gray-600">Allocated</th>
                  <th className="px-4 py-2 font-semibold text-gray-600">Failed</th>
                  <th className="px-4 py-2 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentDistributions.map((dist) => (
                  <tr key={dist.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">{dist.weekKey}</td>
                    <td className="px-4 py-2">{dist.totalStudents}</td>
                    <td className="px-4 py-2">{dist.allocatedRewards}</td>
                    <td className="px-4 py-2 text-red-600">{dist.failedAllocations}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          dist.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : dist.status === 'FAILED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {dist.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-2xs">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        <div className={`p-1.5 rounded-lg ${color} ${bg}`}>{icon}</div>
      </div>
      <p className={`text-2xl font-black ${color} tabular-nums`}>{value}</p>
    </div>
  );
}
