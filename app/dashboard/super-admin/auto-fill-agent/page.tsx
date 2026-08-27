'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, RefreshCw, Layers, ShieldCheck, Zap, Activity } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Session {
  id: string;
  studentName: string;
  studentEmail: string;
  opportunityTitle: string;
  opportunityType: string;
  status: string;
  fieldsDetected: number;
  fieldsFilled: number;
  createdAt: string;
}

interface AuditEvent {
  id: string;
  userName: string;
  userEmail: string;
  domain: string;
  status: string;
  fieldLabel: string | null;
  detail: string | null;
  createdAt: string;
}

interface AgentStats {
  totalSessions: number;
  completedSessions: number;
  totalFieldsDetected: number;
  totalFieldsFilled: number;
  fillRate: number;
  recentSessions: Session[];
  recentEvents: AuditEvent[];
}

export default function AutoFillAgentMonitoringPage() {
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/super-admin/auto-fill-agent', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data.data);
    } catch {
      setError('Failed to fetch autofill agent stats.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Auto-Fill Agent Monitor</h1>
          <p className="mt-1 text-gray-500">Track Chrome extension usage, auto-fill performance, and field mapping operations</p>
        </div>
        <Button onClick={fetchStats} className="border border-gray-200 hover:bg-gray-50 p-2.5 rounded-xl">
          <RefreshCw className="h-4 w-4 text-gray-600" />
        </Button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
        </div>
      ) : !stats ? (
        <div className="text-center py-12 text-gray-500">No stats available.</div>
      ) : (
        <div className="space-y-8">
          {/* Stats overview */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6 border-gray-200 bg-white flex items-center gap-4 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-kit-50 text-kit-600">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
              </div>
            </Card>
            <Card className="p-6 border-gray-200 bg-white flex items-center gap-4 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">Completed Fills</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedSessions}</p>
              </div>
            </Card>
            <Card className="p-6 border-gray-200 bg-white flex items-center gap-4 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">Fields Filled</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalFieldsFilled} / {stats.totalFieldsDetected}</p>
              </div>
            </Card>
            <Card className="p-6 border-gray-200 bg-white flex items-center gap-4 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">Fill Accuracy Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.fillRate}%</p>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Sessions Table */}
            <Card className="border-gray-200 shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Recent Extension Sessions</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-semibold">
                      <th className="pb-2">Student</th>
                      <th className="pb-2">Opportunity</th>
                      <th className="pb-2">Fills</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stats.recentSessions.map(s => (
                      <tr key={s.id}>
                        <td className="py-2.5">
                          <p className="font-semibold text-gray-800">{s.studentName}</p>
                          <p className="text-gray-400">{s.studentEmail}</p>
                        </td>
                        <td className="py-2.5 text-gray-700 max-w-[150px] truncate" title={s.opportunityTitle}>{s.opportunityTitle}</td>
                        <td className="py-2.5 font-medium text-gray-700">{s.fieldsFilled} / {s.fieldsDetected}</td>
                        <td className="py-2.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            s.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Recent Audit Events Table */}
            <Card className="border-gray-200 shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Autofill Audit Trail</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-semibold">
                      <th className="pb-2">Student</th>
                      <th className="pb-2">Domain</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stats.recentEvents.map(e => (
                      <tr key={e.id}>
                        <td className="py-2.5">
                          <p className="font-semibold text-gray-800">{e.userName}</p>
                          <p className="text-gray-400">{e.userEmail}</p>
                        </td>
                        <td className="py-2.5 font-mono text-gray-700">{e.domain}</td>
                        <td className="py-2.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            e.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-gray-600 max-w-[120px] truncate" title={e.detail || ''}>{e.detail || 'Field filled'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
