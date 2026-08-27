'use client';

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Loader2, Search, RefreshCw, FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface AuditLog {
  id: string;
  action: string;
  target: string | null;
  details: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/super-admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          search,
          action: actionFilter
        }
      });
      setLogs(res.data.data);
    } catch {
      setError('Failed to fetch audit logs.');
    } finally {
      setLoading(false);
    }
  }, [search, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">System Audit Logs</h1>
          <p className="mt-1 text-gray-500">Track and monitor all administrative actions, role adjustments, and feature toggles</p>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {/* Filter panel */}
      <Card className="p-4 flex flex-col md:flex-row gap-4 border-gray-200 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by details, target or admin user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full border-gray-200 focus:border-kit-600 focus:ring-kit-600 rounded-xl"
          />
        </div>
        <div className="flex gap-4">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-xl border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-kit-600 focus:ring-kit-600"
          >
            <option value="ALL">All Actions</option>
            <option value="USER_CREATE">User Created</option>
            <option value="USER_UPDATE">User Updated</option>
            <option value="PERMISSIONS_UPDATE">Permissions Updated</option>
            <option value="SIDEBAR_UPDATE">Sidebar Updated</option>
            <option value="FEATURE_UPDATE">Feature Updated</option>
          </select>
          <Button onClick={fetchLogs} className="border border-gray-200 hover:bg-gray-50 p-2.5 rounded-xl">
            <RefreshCw className="h-4 w-4 text-gray-600" />
          </Button>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 font-semibold">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Admin User</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Target</th>
                  <th className="p-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50/50">
                    <td className="p-4 text-gray-600 font-medium">
                      {new Date(l.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-semibold text-gray-900">{l.user.name}</p>
                        <p className="text-xs text-gray-400">{l.user.email}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex rounded-md bg-kit-50 px-2.5 py-1 text-xs font-semibold text-kit-700">
                        {l.action}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 font-mono text-xs">{l.target || 'N/A'}</td>
                    <td className="p-4 text-gray-700 max-w-xs truncate" title={l.details || ''}>
                      {l.details}
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
