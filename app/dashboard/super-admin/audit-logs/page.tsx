'use client';

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Loader2,
  Search,
  RefreshCw,
  FileText,
  Code,
  Copy,
  Check,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  User as UserIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface AuditBadge {
  label: string;
  variant: 'green' | 'blue' | 'amber' | 'red' | 'gray';
}

interface DisplayTarget {
  title: string;
  subtitle?: string;
  type?: string;
}

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
  displayTarget?: DisplayTarget;
  simpleSummary?: string;
  badges?: AuditBadge[];
  parsedDetails?: any;
}

function getActionBadge(action: string) {
  switch (action) {
    case 'APPROVE_REGISTRATION_VERIFICATION':
      return {
        label: 'Approved Verification',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'SUBMIT_REGISTRATION_EVIDENCE':
      return {
        label: 'Submitted Evidence',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    case 'REJECT_REGISTRATION_VERIFICATION':
      return {
        label: 'Rejected Verification',
        className: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    case 'FEATURE_UPDATE':
      return {
        label: 'Feature Updated',
        className: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    case 'SIDEBAR_UPDATE':
      return {
        label: 'Sidebar Updated',
        className: 'bg-purple-50 text-purple-700 border-purple-200',
      };
    case 'PERMISSIONS_UPDATE':
      return {
        label: 'Permissions Updated',
        className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      };
    case 'USER_CREATE':
      return {
        label: 'User Created',
        className: 'bg-teal-50 text-teal-700 border-teal-200',
      };
    case 'USER_UPDATE':
      return {
        label: 'User Updated',
        className: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      };
    default:
      return {
        label: action.replace(/_/g, ' '),
        className: 'bg-gray-100 text-gray-700 border-gray-200',
      };
  }
}

function getBadgeColor(variant: 'green' | 'blue' | 'amber' | 'red' | 'gray') {
  switch (variant) {
    case 'green':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'blue':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'amber':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'red':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'gray':
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function formatLogDetails(log: AuditLog) {
  if (log.simpleSummary) {
    return {
      summary: log.simpleSummary,
      badges: log.badges || [],
      parsed: log.parsedDetails || null,
    };
  }

  let parsed: any = null;
  if (log.details && log.details.trim().startsWith('{')) {
    try {
      parsed = JSON.parse(log.details);
    } catch {}
  }

  if (log.action === 'APPROVE_REGISTRATION_VERIFICATION') {
    return {
      summary: 'Approved registration confirmation screenshot',
      badges: [{ label: 'Status: VERIFIED', variant: 'green' as const }],
      parsed,
    };
  }
  if (log.action === 'SUBMIT_REGISTRATION_EVIDENCE') {
    const b: AuditBadge[] = [];
    if (parsed?.status) {
      b.push({
        label: parsed.status === 'PENDING_REVIEW' ? 'Pending Review' : parsed.status,
        variant: 'amber',
      });
    }
    if (parsed?.ocrConfidence !== undefined) {
      const pct = Math.round(
        Number(parsed.ocrConfidence) <= 1 ? Number(parsed.ocrConfidence) * 100 : Number(parsed.ocrConfidence)
      );
      b.push({ label: `OCR Match: ${pct}%`, variant: 'blue' });
    }
    if (parsed?.mismatchCount !== undefined) {
      b.push({
        label: parsed.mismatchCount === 0 ? '0 Mismatches' : `${parsed.mismatchCount} Mismatches`,
        variant: parsed.mismatchCount === 0 ? 'green' : 'red',
      });
    }
    return {
      summary: 'Uploaded confirmation screenshot evidence',
      badges: b,
      parsed,
    };
  }
  if (parsed) {
    return {
      summary: Object.entries(parsed)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', '),
      badges: [],
      parsed,
    };
  }
  return {
    summary: log.details || 'No additional details.',
    badges: [],
    parsed: null,
  };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  // Modal inspection
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/super-admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          search,
          action: actionFilter,
        },
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">System Audit Logs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and monitor administrative actions, verification decisions, and configuration events in simple format.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-kit-50 px-3 py-1 text-xs font-semibold text-kit-700 border border-kit-100">
            {logs.length} Logged Events
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter panel */}
      <Card className="p-4 flex flex-col md:flex-row gap-4 border-gray-200 shadow-sm bg-white rounded-2xl">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by student, opportunity, details or admin user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full border-gray-200 focus:border-kit-600 focus:ring-kit-600 rounded-xl text-sm"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-xs focus:border-kit-600 focus:ring-kit-600"
          >
            <option value="ALL">All Actions</option>
            <option value="SUBMIT_REGISTRATION_EVIDENCE">Evidence Submitted</option>
            <option value="APPROVE_REGISTRATION_VERIFICATION">Verification Approved</option>
            <option value="REJECT_REGISTRATION_VERIFICATION">Verification Rejected</option>
            <option value="FEATURE_UPDATE">Feature Updated</option>
            <option value="SIDEBAR_UPDATE">Sidebar Updated</option>
            <option value="PERMISSIONS_UPDATE">Permissions Updated</option>
            <option value="USER_CREATE">User Created</option>
            <option value="USER_UPDATE">User Updated</option>
          </select>
          <Button
            onClick={fetchLogs}
            disabled={loading}
            className="border border-gray-200 hover:bg-gray-50 p-2.5 rounded-xl bg-white text-gray-700 shadow-xs"
            title="Refresh Audit Logs"
          >
            <RefreshCw className={`h-4 w-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="border-gray-200 shadow-sm overflow-hidden bg-white rounded-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
            <p className="text-xs font-medium text-gray-500">Loading audit history...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700">No audit logs found</p>
            <p className="text-xs text-gray-400 mt-0.5">Try refining your search terms or filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                  <th className="p-4 w-44">Timestamp</th>
                  <th className="p-4 w-48">Admin User</th>
                  <th className="p-4 w-48">Action</th>
                  <th className="p-4 w-60">Target</th>
                  <th className="p-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((l) => {
                  const actionBadge = getActionBadge(l.action);
                  const detailsInfo = formatLogDetails(l);

                  return (
                    <tr key={l.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Timestamp */}
                      <td className="p-4 text-gray-600 font-medium align-top whitespace-nowrap">
                        <div className="text-xs font-semibold text-gray-900">
                          {new Date(l.createdAt).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                          {new Date(l.createdAt).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Admin User */}
                      <td className="p-4 align-top">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-kit-50 text-kit-700 font-bold text-xs border border-kit-100">
                            {l.user.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-xs sm:text-sm truncate">{l.user.name}</p>
                            <p className="text-[11px] text-gray-400 truncate">{l.user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="p-4 align-top">
                        <span
                          className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold border shadow-2xs whitespace-nowrap ${actionBadge.className}`}
                        >
                          {actionBadge.label}
                        </span>
                      </td>

                      {/* Target */}
                      <td className="p-4 align-top">
                        <div className="space-y-0.5 max-w-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-gray-900 text-xs sm:text-sm leading-snug">
                              {l.displayTarget?.title || (l.target?.startsWith('OpportunityRegistration:') ? 'Opportunity Registration' : l.target || 'N/A')}
                            </span>
                            {l.displayTarget?.type && (
                              <span className="inline-block rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider bg-kit-50 text-kit-700 border border-kit-100">
                                {l.displayTarget.type}
                              </span>
                            )}
                          </div>
                          {l.displayTarget?.subtitle && (
                            <p className="text-[11px] font-medium text-gray-500 truncate">{l.displayTarget.subtitle}</p>
                          )}
                        </div>
                      </td>

                      {/* Details in Simple Format */}
                      <td className="p-4 align-top">
                        <div className="space-y-1.5">
                          {/* Clean readable statement */}
                          <p className="text-xs sm:text-sm font-medium text-gray-800 leading-snug">
                            {detailsInfo.summary}
                          </p>

                          {/* Chips and status badges */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {detailsInfo.badges.map((b, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${getBadgeColor(
                                  b.variant
                                )}`}
                              >
                                {b.label}
                              </span>
                            ))}

                            {/* View Raw Payload Modal Trigger */}
                            {detailsInfo.parsed && (
                              <button
                                type="button"
                                onClick={() => setSelectedLog(l)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-kit-600 hover:text-kit-800 transition-colors ml-1"
                                title="Inspect technical JSON payload"
                              >
                                <Code className="h-3 w-3" />
                                <span>Inspect Payload</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Technical Payload Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5 text-kit-600" />
                <div>
                  <h3 className="text-base font-bold text-gray-900">Audit Log Payload</h3>
                  <p className="text-xs text-gray-400">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Event Context Card */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-400 font-bold block uppercase tracking-wider text-[10px]">Action</span>
                  <span className="font-bold text-gray-900 text-sm mt-0.5 block">{selectedLog.action}</span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-400 font-bold block uppercase tracking-wider text-[10px]">Actor</span>
                  <span className="font-bold text-gray-900 text-sm mt-0.5 block">{selectedLog.user.name}</span>
                  <span className="text-gray-500 text-[11px]">{selectedLog.user.email}</span>
                </div>
                <div className="col-span-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-400 font-bold block uppercase tracking-wider text-[10px]">Target</span>
                  <span className="font-bold text-gray-900 text-sm mt-0.5 block">
                    {selectedLog.displayTarget?.title || selectedLog.target || 'N/A'}
                  </span>
                  {selectedLog.target && selectedLog.displayTarget?.title !== selectedLog.target && (
                    <span className="font-mono text-gray-500 text-[11px] block mt-0.5">{selectedLog.target}</span>
                  )}
                </div>
              </div>

              {/* Simple Summary */}
              {selectedLog.simpleSummary && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900">
                  <span className="font-bold block mb-0.5">Simple Summary:</span>
                  <p>{selectedLog.simpleSummary}</p>
                </div>
              )}

              {/* Raw JSON viewer */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-700">Raw JSON Payload</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedLog.details || '')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-kit-600 hover:text-kit-800 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="rounded-xl bg-gray-900 text-gray-100 p-4 font-mono text-xs overflow-x-auto leading-relaxed">
                  {selectedLog.details && selectedLog.details.trim().startsWith('{')
                    ? JSON.stringify(JSON.parse(selectedLog.details), null, 2)
                    : selectedLog.details || 'No details payload recorded.'}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-gray-100 px-6 py-3.5 bg-gray-50/50">
              <Button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="bg-gray-200 text-gray-700 hover:bg-gray-300 font-semibold px-4 py-2 text-xs rounded-xl"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
