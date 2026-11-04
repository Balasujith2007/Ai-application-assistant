'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Loader2,
  Trophy,
  RefreshCw,
  PlayCircle,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Gift,
} from 'lucide-react';
import { Card, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface AllocationRecord {
  id: string;
  weekKey: string;
  distributionDate: string;
  status: string;
  totalStudents: number;
  allocatedRewards: number;
  failedAllocations: number;
  legendaryCount: number;
  epicCount: number;
  rareCount: number;
  commonCount: number;
  comebackCount: number;
  startedAt: string | null;
  completedAt: string | null;
  errorLog: unknown;
}

interface DistributionStatus {
  weekKey: string;
  schedule: {
    enabled: boolean;
    day: number;
    dayName: string;
    hour: number;
    timezone: string;
    nextScheduledAt: string;
  };
  current: AllocationRecord | null;
  lastCompleted: AllocationRecord | null;
  recent: AllocationRecord[];
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  RUNNING: 'bg-blue-50 text-blue-700',
  FAILED: 'bg-red-50 text-red-700',
  PENDING: 'bg-gray-100 text-gray-600',
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

export default function DistributionMonitoringPage() {
  const [status, setStatus] = useState<DistributionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/gamification/distribution', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatus(res.data);
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Failed to load distribution status.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleManualRun = async () => {
    setRunning(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        '/api/admin/gamification/distribution',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const result = res.data.result;
      if (result?.skipped) {
        setSuccess(`Distribution skipped: ${result.reason}`);
      } else {
        setSuccess(
          `Distribution completed for ${result.weekKey}: ${result.stats.allocatedRewards} allocated, ${result.stats.alreadyAllocated} already present, ${result.stats.failedAllocations} failed.`
        );
      }
      await fetchStatus();
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Failed to run distribution.';
      setError(message);
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || 'Unable to load distribution status.'}
        </div>
        <Button variant="outline" onClick={fetchStatus}>
          Retry
        </Button>
      </div>
    );
  }

  const { schedule, current, lastCompleted, recent } = status;

  const tierRows: { label: string; key: keyof AllocationRecord }[] = [
    { label: 'Legendary', key: 'legendaryCount' },
    { label: 'Epic', key: 'epicCount' },
    { label: 'Rare', key: 'rareCount' },
    { label: 'Common', key: 'commonCount' },
    { label: 'Comeback', key: 'comebackCount' },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-gray-900">
            <Trophy className="h-8 w-8 text-kit-600" /> Gift Distribution
          </h1>
          <p className="mt-1 text-gray-500">
            Weekly mystery gift execution records. All values come from actual database runs — no synthetic statistics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchStatus} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button onClick={handleManualRun} isLoading={running} className="gap-2">
            <PlayCircle className="h-4 w-4" /> Run manual recovery
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {success}
        </div>
      )}

      <Card className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-kit-50 text-kit-600">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Schedule</p>
            <p className="text-sm font-semibold text-gray-900">
              {schedule.dayName}s at {String(schedule.hour).padStart(2, '0')}:00 ({schedule.timezone})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-500">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Next execution</p>
            <p className="text-sm font-semibold text-gray-900">
              {new Date(schedule.nextScheduledAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${schedule.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Distribution</p>
            <p className="text-sm font-semibold text-gray-900">{schedule.enabled ? 'Enabled' : 'Disabled'}</p>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
          Current week — {status.weekKey}
        </h2>
        {current ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard title="Total students" value={current.totalStudents} icon={<Users className="h-5 w-5" />} />
            <StatCard title="Gifts allocated" value={current.allocatedRewards} icon={<Gift className="h-5 w-5" />} color="emerald" />
            <StatCard title="Failed" value={current.failedAllocations} icon={<AlertTriangle className="h-5 w-5" />} color="rose" />
            <Card className="flex flex-col justify-center">
              <p className="text-sm font-medium text-gray-500">Status</p>
              <div className="mt-2"><StatusPill status={current.status} /></div>
            </Card>
          </div>
        ) : (
          <Card className="text-center text-sm text-gray-500">No allocation record for the current week yet.</Card>
        )}
      </div>

      {lastCompleted && (
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
            Last completed execution — {lastCompleted.weekKey}
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard title="Total students" value={lastCompleted.totalStudents} icon={<Users className="h-5 w-5" />} />
            <StatCard title="Gifts allocated" value={lastCompleted.allocatedRewards} icon={<Gift className="h-5 w-5" />} color="emerald" />
            <StatCard title="Failed" value={lastCompleted.failedAllocations} icon={<AlertTriangle className="h-5 w-5" />} color="rose" />
            <Card className="flex flex-col justify-center">
              <p className="text-sm font-medium text-gray-500">Completed at</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {lastCompleted.completedAt ? new Date(lastCompleted.completedAt).toLocaleString() : '—'}
              </p>
            </Card>
          </div>
        </div>
      )}

      <Card className="overflow-hidden" padding="none">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Recent executions</h2>
        </div>
        {recent.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-500">No distribution executions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Week</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Students</th>
                  <th className="px-4 py-3">Allocated</th>
                  <th className="px-4 py-3">Failed</th>
                  {tierRows.map((t) => (
                    <th key={t.key as string} className="px-4 py-3">{t.label}</th>
                  ))}
                  <th className="px-4 py-3">Run at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.weekKey}</td>
                    <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                    <td className="px-4 py-3 text-gray-700">{r.totalStudents}</td>
                    <td className="px-4 py-3 text-gray-700">{r.allocatedRewards}</td>
                    <td className="px-4 py-3 text-gray-700">{r.failedAllocations}</td>
                    {tierRows.map((t) => (
                      <td key={t.key as string} className="px-4 py-3 text-gray-700">{r[t.key] as number}</td>
                    ))}
                    <td className="px-4 py-3 text-gray-500">{new Date(r.distributionDate).toLocaleString()}</td>
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
