'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  Pencil,
  Trash2,
  CheckCircle,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge, TypeBadge } from '@/components/ui/StatusBadge';
import { LoadingSpinner } from '@/components/ui/index';
import { formatDate, getDaysUntil } from '@/lib/utils';
import api from '@/lib/api';
import type { Application, ApplicationStatus } from '@/types';

const STATUS_TIMELINE: ApplicationStatus[] = [
  'SAVED',
  'APPLIED',
  'SHORTLISTED',
  'INTERVIEW',
  'SELECTED',
];

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get<{ data: Application }>(`/applications/${id}`);
        setApp(res.data.data);
      } catch {
        router.push('/applications');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, router]);

  const handleStatusUpdate = async (status: ApplicationStatus) => {
    if (!app) return;
    setUpdatingStatus(true);
    try {
      const res = await api.put<{ data: Application }>(`/applications/${id}`, { status });
      setApp(res.data.data);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this application?')) return;
    await api.delete(`/applications/${id}`);
    router.push('/applications');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!app) return null;

  const currentStatusIndex = STATUS_TIMELINE.indexOf(app.status);
  const daysLeft = getDaysUntil(app.deadline);

  return (
    <div className="space-y-6 pb-12">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Applications
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{app.companyName}</h2>
                <p className="mt-1 text-lg text-gray-600">{app.position}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <TypeBadge type={app.applicationType} />
                  <StatusBadge status={app.status} />
                </div>
              </div>
              <div className="flex gap-2">
                {app.applicationUrl && (
                  <a href={app.applicationUrl} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4" />
                      Apply Link
                    </Button>
                  </a>
                )}
                <Button variant="outline" size="sm" onClick={() => router.push('/applications')}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase text-gray-400">Applied Date</p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {formatDate(app.appliedDate)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-400">Deadline</p>
                <p className={`mt-1 text-sm font-medium ${daysLeft !== null && daysLeft <= 3 ? 'text-red-600' : 'text-gray-900'}`}>
                  {app.deadline ? (
                    <>
                      {formatDate(app.deadline)}
                      {daysLeft !== null && (
                        <span className="ml-2 text-xs">({daysLeft} days)</span>
                      )}
                    </>
                  ) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-400">Added</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{formatDate(app.createdAt)}</p>
              </div>
            </div>

            {app.notes && (
              <div className="mt-4 rounded-lg bg-gray-50 p-4">
                <p className="text-xs font-medium uppercase text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{app.notes}</p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-6 font-semibold text-gray-900">Application Timeline</h3>
            <div className="relative">
              {STATUS_TIMELINE.map((status, index) => {
                const isCompleted = currentStatusIndex >= index;
                const isCurrent = currentStatusIndex === index;
                const isRejected = app.status === 'REJECTED' || app.status === 'WITHDRAWN';

                return (
                  <div key={status} className="flex gap-4 pb-6 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                          isRejected && isCurrent
                            ? 'border-red-400 bg-red-50'
                            : isCompleted
                            ? 'border-kit-500 bg-kit-50'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className={`h-4 w-4 ${isRejected && isCurrent ? 'text-red-500' : 'text-kit-600'}`} />
                        ) : (
                          <Circle className="h-4 w-4 text-gray-300" />
                        )}
                      </div>
                      {index < STATUS_TIMELINE.length - 1 && (
                        <div className={`mt-1 w-0.5 flex-1 ${isCompleted ? 'bg-kit-200' : 'bg-gray-200'}`} style={{ minHeight: '24px' }} />
                      )}
                    </div>
                    <div className="pb-1 pt-1">
                      <p className={`text-sm font-medium ${isCurrent ? 'text-kit-700' : isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>
                        {status.charAt(0) + status.slice(1).toLowerCase()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar — Update status */}
        <div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-semibold text-gray-900">Update Status</h3>
            <div className="space-y-2">
              {(['SAVED', 'APPLIED', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED', 'WITHDRAWN'] as ApplicationStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusUpdate(status)}
                  disabled={updatingStatus || app.status === status}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-all ${
                    app.status === status
                      ? 'border-kit-300 bg-kit-50 text-kit-700'
                      : 'border-gray-200 text-gray-600 hover:border-kit-200 hover:bg-kit-50 hover:text-kit-700'
                  }`}
                >
                  {app.status === status && <span className="mr-2">✓</span>}
                  {status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
