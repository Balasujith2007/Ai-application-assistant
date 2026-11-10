'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  Users,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';

/**
 * Super Admin external verification monitoring (Phase 1, Step 7) + contest
 * evidence review (Phase 3, §7).
 *
 * Read-mostly operational visibility for the external competitive-programming
 * verification foundation, now extended with:
 *   - per-platform contest coverage and last contest synchronization
 *   - successful / failed / unsupported contest imports
 *   - partial-history indicators
 *   - the manual-review queue with evidence + approve/reject (mandatory reason)
 *
 * Approving a manual request records contest participation ONLY. It never
 * upgrades the student's account ownership.
 */

interface PlatformRow {
  platform: string;
  connectedAccounts: number;
  ownershipVerifiedAccounts: number;
  ownershipUnverifiedAccounts: number;
  lastSuccessfulSyncAt: string | null;
  lastAttemptAt: string | null;
  totalSyncAttempts: number;
  failedSyncsLast7Days: number;
  ownershipMechanism: string;
  apiKind: string;
}

interface ProviderError {
  id: string;
  platform: string;
  status: string;
  errorCode: string | null;
  errorMessage: string | null;
  attemptedAt: string;
  student: { id: string; name: string; email: string } | null;
}

interface ContestCoverageRow {
  platform: string;
  evidenceSource: string;
  apiKind: string;
  historicalCompleteness: 'FULL' | 'PARTIAL' | 'UNAVAILABLE';
  studentsSynced: number;
  successfulSyncs: number;
  failedSyncs: number;
  unsupported: number;
  contestsStored: number;
  pendingReviews: number;
  lastSuccessfulSyncAt: string | null;
  notes: string[];
}

interface ContestReviewRow {
  id: string;
  studentId?: string;
  platform: string;
  externalContestId: string;
  contestName: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedRank: number | null;
  requestedTotalParticipants: number | null;
  requestedOldRating: number | null;
  requestedNewRating: number | null;
  evidenceUrl: string | null;
  evidenceNote: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewReason: string | null;
  createdAt: string;
  student: { id: string; name: string; email: string } | null;
}

interface MonitoringResponse {
  generatedAt: string;
  totals: {
    connectedAccounts: number;
    ownershipVerifiedAccounts: number;
    ownershipUnverifiedAccounts: number;
    failedSyncsLast7Days: number;
    monitoredStudents: number;
    contestsStored?: number;
    pendingContestReviews?: number;
  };
  platforms: PlatformRow[];
  recentProviderErrors: ProviderError[];
  contestCoverage?: ContestCoverageRow[];
  contestReviewQueue?: ContestReviewRow[];
}

interface CapabilityRow {
  platform: string;
  registered: boolean;
  profileLookup?: string;
  dailyActivity?: string;
  acceptedSubmissions?: string;
  submissionTimestamps?: string;
  contestHistory?: string;
  ratingHistory?: string;
  ownership?: string;
  apiKind?: string;
  dataFreshness?: string;
  notes?: string[];
}

interface ContestCapabilityRow {
  platform: string;
  registered: boolean;
  apiKind?: string;
  evidenceSource?: string;
  contestHistory?: boolean;
  ratingHistory?: boolean;
  ownership?: string;
  dataFreshness?: string;
  supportsRatingChange?: boolean;
  supportsTotalParticipants?: boolean;
  supportsPersonalBest?: boolean;
  historicalCompleteness?: 'FULL' | 'PARTIAL' | 'UNAVAILABLE';
  notes?: string[];
}

const COVERAGE_STYLES: Record<string, string> = {
  FULL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PARTIAL: 'bg-amber-50 text-amber-700 border-amber-200',
  UNAVAILABLE: 'bg-slate-100 text-slate-600 border-slate-200',
};

const EVIDENCE_LABELS: Record<string, string> = {
  OFFICIAL_API: 'Official API',
  PUBLIC_PROFILE: 'Public profile',
  COMMUNITY_API: 'Community API',
  SCRAPED_PUBLIC_DATA: 'Scraped public data',
  MANUAL_REVIEW: 'Manual review',
};

function coverageBadge(value: string) {
  const cls = COVERAGE_STYLES[value] || 'bg-slate-100 text-slate-600 border-slate-200';
  return <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>{value}</span>;
}

const SUPPORT_LEVEL_STYLES: Record<string, string> = {
  SUPPORTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PARTIAL: 'bg-amber-50 text-amber-700 border-amber-200',
  UNSUPPORTED: 'bg-slate-100 text-slate-600 border-slate-200',
  NONE: 'bg-rose-50 text-rose-700 border-rose-200',
};

function supportBadge(value: unknown) {
  const label = typeof value === 'string' ? value : 'UNKNOWN';
  const cls = SUPPORT_LEVEL_STYLES[label] || 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>
  );
}

function formatWhen(value: string | null): string {
  if (!value) return 'Never';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ExternalVerificationAdminPage() {
  const [data, setData] = useState<MonitoringResponse | null>(null);
  const [capabilities, setCapabilities] = useState<CapabilityRow[]>([]);
  const [contestCapabilities, setContestCapabilities] = useState<ContestCapabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMatrix, setShowMatrix] = useState(false);
  const [showContestMatrix, setShowContestMatrix] = useState(false);
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [reviewBusy, setReviewBusy] = useState<string | null>(null);
  const [reviewNotice, setReviewNotice] = useState<{ tone: 'ok' | 'err'; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [monitorRes, capabilityRes, contestCapabilityRes] = await Promise.all([
        api.get('/admin/external-verification'),
        api.get('/admin/external-verification', { params: { format: 'capabilities' } }),
        api.get('/admin/external-verification', { params: { format: 'contest-capabilities' } }),
      ]);
      if (monitorRes.data?.success) setData(monitorRes.data as MonitoringResponse);
      if (capabilityRes.data?.success) setCapabilities(capabilityRes.data.capabilities || []);
      if (contestCapabilityRes.data?.success) setContestCapabilities(contestCapabilityRes.data.capabilities || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load external verification monitoring data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decideReview = useCallback(
    async (requestId: string, decision: 'APPROVE' | 'REJECT') => {
      const reason = (reasonDrafts[requestId] || '').trim();
      if (!reason) {
        setReviewNotice({ tone: 'err', message: 'A reason is required before approving or rejecting.' });
        return;
      }
      setReviewBusy(requestId);
      setReviewNotice(null);
      try {
        const res = await api.post('/admin/external-verification', { requestId, decision, reason });
        if (res.data?.success) {
          setReviewNotice({
            tone: 'ok',
            message:
              decision === 'APPROVE'
                ? 'Evidence approved. Contest participation recorded — account ownership was NOT changed.'
                : 'Evidence rejected.',
          });
          setReasonDrafts((prev) => {
            const next = { ...prev };
            delete next[requestId];
            return next;
          });
          await load();
        } else {
          setReviewNotice({ tone: 'err', message: res.data?.message || 'Review failed.' });
        }
      } catch (err: any) {
        setReviewNotice({ tone: 'err', message: err?.response?.data?.message || 'Review failed.' });
      } finally {
        setReviewBusy(null);
      }
    },
    [reasonDrafts, load],
  );

  const totals = data?.totals;
  const reviewQueue = data?.contestReviewQueue ?? [];
  const contestCoverage = data?.contestCoverage ?? [];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">External Verification</h1>
          <p className="mt-1 text-sm text-gray-500">
            Connected accounts, ownership state, sync health, contest coverage and the manual contest-evidence review
            queue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowContestMatrix((v) => !v)}>
            {showContestMatrix ? 'Hide contest matrix' : 'Contest capability matrix'}
          </Button>
          <Button variant="outline" onClick={() => setShowMatrix((v) => !v)}>
            {showMatrix ? 'Hide capability matrix' : 'Show capability matrix'}
          </Button>
          <Button onClick={load} disabled={loading} className="border border-gray-200 hover:bg-gray-50 p-2.5 rounded-xl">
            <RefreshCw className={`h-4 w-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading && !data ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
        </div>
      ) : !data ? (
        <div className="text-center py-12 text-gray-500">No monitoring data available.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard icon={<Users className="h-5 w-5" />} label="Connected accounts" value={totals?.connectedAccounts ?? 0} tone="slate" />
            <SummaryCard icon={<ShieldCheck className="h-5 w-5" />} label="Ownership verified" value={totals?.ownershipVerifiedAccounts ?? 0} tone="emerald" />
            <SummaryCard icon={<ShieldAlert className="h-5 w-5" />} label="Ownership unverified" value={totals?.ownershipUnverifiedAccounts ?? 0} tone="amber" />
            <SummaryCard icon={<WifiOff className="h-5 w-5" />} label="Failed syncs (7d)" value={totals?.failedSyncsLast7Days ?? 0} tone="rose" />
            <SummaryCard icon={<Users className="h-5 w-5" />} label="Monitored students" value={totals?.monitoredStudents ?? 0} tone="slate" />
            <SummaryCard icon={<Trophy className="h-5 w-5" />} label="Verified contests stored" value={totals?.contestsStored ?? 0} tone="emerald" />
            <SummaryCard icon={<ClipboardCheck className="h-5 w-5" />} label="Pending contest reviews" value={totals?.pendingContestReviews ?? 0} tone="amber" />
            <SummaryCard
              icon={<AlertTriangle className="h-5 w-5" />}
              label="Providers with partial history"
              value={contestCoverage.filter((c) => c.historicalCompleteness === 'PARTIAL').length}
              tone="rose"
            />
          </div>

          <Card className="border-gray-200 shadow-sm bg-white p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Platforms</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Legacy profile statuses are counted as ownership-unverified. A profile existing never implies ownership.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 bg-gray-50/70">
                    <th className="px-5 py-2.5 font-semibold">Platform</th>
                    <th className="px-3 py-2.5 font-semibold">Connected</th>
                    <th className="px-3 py-2.5 font-semibold">Ownership verified</th>
                    <th className="px-3 py-2.5 font-semibold">Ownership unverified</th>
                    <th className="px-3 py-2.5 font-semibold">Last successful sync</th>
                    <th className="px-3 py-2.5 font-semibold">Failed (7d)</th>
                    <th className="px-5 py-2.5 font-semibold">Source / ownership</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.platforms.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-gray-500">
                        No external accounts connected or synced yet.
                      </td>
                    </tr>
                  )}
                  {data.platforms.map((p) => (
                    <tr key={p.platform} className="hover:bg-gray-50/60">
                      <td className="px-5 py-3 font-semibold text-gray-900">{p.platform}</td>
                      <td className="px-3 py-3 text-gray-700">{p.connectedAccounts}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <ShieldCheck className="h-3.5 w-3.5" /> {p.ownershipVerifiedAccounts}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                          <ShieldAlert className="h-3.5 w-3.5" /> {p.ownershipUnverifiedAccounts}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-600">{formatWhen(p.lastSuccessfulSyncAt)}</td>
                      <td className="px-3 py-3">
                        {p.failedSyncsLast7Days > 0 ? (
                          <span className="font-semibold text-rose-700">{p.failedSyncsLast7Days}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] text-gray-500">{p.apiKind.replace(/_/g, ' ').toLowerCase()}</span>
                          <span className="text-[11px] text-gray-400">ownership: {p.ownershipMechanism}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="border-gray-200 shadow-sm bg-white p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Contest coverage</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                What each provider can prove about contests, how complete its history is, and the outcome of the last
                contest synchronization. PARTIAL / UNAVAILABLE never implies a student did not participate.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 bg-gray-50/70">
                    <th className="px-5 py-2.5 font-semibold">Platform</th>
                    <th className="px-3 py-2.5 font-semibold">Evidence source</th>
                    <th className="px-3 py-2.5 font-semibold">History</th>
                    <th className="px-3 py-2.5 font-semibold">Students synced</th>
                    <th className="px-3 py-2.5 font-semibold">Success / failed / unsupported</th>
                    <th className="px-3 py-2.5 font-semibold">Contests stored</th>
                    <th className="px-3 py-2.5 font-semibold">Pending</th>
                    <th className="px-5 py-2.5 font-semibold">Last contest sync</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contestCoverage.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-gray-500">
                        Contest coverage unavailable (additive migration not applied, or no contest syncs yet).
                      </td>
                    </tr>
                  )}
                  {contestCoverage.map((c) => (
                    <tr key={c.platform} className="hover:bg-gray-50/60">
                      <td className="px-5 py-3 font-semibold text-gray-900">{c.platform}</td>
                      <td className="px-3 py-3 text-[11px] text-gray-600">{EVIDENCE_LABELS[c.evidenceSource] || c.evidenceSource}</td>
                      <td className="px-3 py-3">{coverageBadge(c.historicalCompleteness)}</td>
                      <td className="px-3 py-3 text-gray-700">{c.studentsSynced}</td>
                      <td className="px-3 py-3 text-gray-700">
                        <span className="text-emerald-700 font-semibold">{c.successfulSyncs}</span>
                        <span className="text-gray-400"> / </span>
                        <span className="text-rose-700 font-semibold">{c.failedSyncs}</span>
                        <span className="text-gray-400"> / </span>
                        <span className="text-slate-500 font-semibold">{c.unsupported}</span>
                      </td>
                      <td className="px-3 py-3 text-gray-700">{c.contestsStored}</td>
                      <td className="px-3 py-3">
                        {c.pendingReviews > 0 ? (
                          <span className="font-semibold text-amber-700">{c.pendingReviews}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{formatWhen(c.lastSuccessfulSyncAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {showContestMatrix && (
            <Card className="border-gray-200 shadow-sm bg-white p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900">Contest capability matrix</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Scraped and community sources are never labelled as official APIs. Codeforces is the only provider
                  with a fully official, documented contest feed.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 bg-gray-50/70">
                      <th className="px-5 py-2.5 font-semibold">Platform</th>
                      <th className="px-3 py-2.5 font-semibold">Source</th>
                      <th className="px-3 py-2.5 font-semibold">History</th>
                      <th className="px-3 py-2.5 font-semibold">Ownership</th>
                      <th className="px-3 py-2.5 font-semibold">Rating delta</th>
                      <th className="px-3 py-2.5 font-semibold">Participants</th>
                      <th className="px-3 py-2.5 font-semibold">Personal best</th>
                      <th className="px-5 py-2.5 font-semibold">Limitations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {contestCapabilities.map((c) => (
                      <tr key={c.platform} className="hover:bg-gray-50/60 align-top">
                        <td className="px-5 py-3 font-semibold text-gray-900">{c.platform}</td>
                        {!c.registered ? (
                          <td colSpan={7} className="px-3 py-3 text-gray-400">not registered</td>
                        ) : (
                          <>
                            <td className="px-3 py-3 text-[11px] text-gray-600">
                              {EVIDENCE_LABELS[c.evidenceSource || ''] || c.evidenceSource}
                            </td>
                            <td className="px-3 py-3">{coverageBadge(c.historicalCompleteness || 'UNAVAILABLE')}</td>
                            <td className="px-3 py-3 text-[11px] text-gray-600">{c.ownership}</td>
                            <td className="px-3 py-3 text-[11px]">{c.supportsRatingChange ? 'Yes' : 'No'}</td>
                            <td className="px-3 py-3 text-[11px]">{c.supportsTotalParticipants ? 'Yes' : 'No'}</td>
                            <td className="px-3 py-3 text-[11px]">{c.supportsPersonalBest ? 'Yes' : 'No'}</td>
                            <td className="px-5 py-3">
                              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-gray-500">
                                {(c.notes || []).map((n, i) => (
                                  <li key={i}>{n}</li>
                                ))}
                              </ul>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Card className="border-gray-200 shadow-sm bg-white p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Manual contest review queue</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Student-submitted evidence for contests a provider cannot verify. A reason is mandatory. Approving
                  records participation only and never upgrades account ownership.
                </p>
              </div>
              <span className="text-xs text-gray-400">{reviewQueue.length} pending</span>
            </div>

            {reviewNotice && (
              <div
                className={`mx-5 mt-4 rounded-lg border p-3 text-xs ${
                  reviewNotice.tone === 'ok'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {reviewNotice.message}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 bg-gray-50/70">
                    <th className="px-5 py-2.5 font-semibold">Student</th>
                    <th className="px-3 py-2.5 font-semibold">Platform / contest</th>
                    <th className="px-3 py-2.5 font-semibold">Claimed rank / ratings</th>
                    <th className="px-3 py-2.5 font-semibold">Evidence</th>
                    <th className="px-3 py-2.5 font-semibold">Submitted</th>
                    <th className="px-5 py-2.5 font-semibold">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reviewQueue.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                        <span className="inline-flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" /> No pending contest review requests.
                        </span>
                      </td>
                    </tr>
                  )}
                  {reviewQueue.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/60 align-top">
                      <td className="px-5 py-3 text-gray-700">
                        {r.student ? (
                          <span>
                            {r.student.name} <span className="text-gray-400">({r.student.email})</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">{r.studentId || '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-gray-900">{r.contestName || `${r.platform} Contest`}</div>
                        <div className="text-[11px] text-gray-500">
                          {r.platform} · id {r.externalContestId}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-gray-600">
                        <div>rank: {r.requestedRank ?? '—'} / {r.requestedTotalParticipants ?? '—'}</div>
                        <div>rating: {r.requestedOldRating ?? '—'} → {r.requestedNewRating ?? '—'}</div>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-gray-600 max-w-[240px]">
                        {r.evidenceUrl ? (
                          <a
                            href={r.evidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-kit-600 underline break-all"
                          >
                            {r.evidenceUrl}
                          </a>
                        ) : (
                          <span className="text-gray-400">No URL</span>
                        )}
                        {r.evidenceNote && <p className="mt-1 text-gray-500">{r.evidenceNote}</p>}
                      </td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-gray-400" /> {formatWhen(r.createdAt)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-2 min-w-[220px]">
                          <input
                            type="text"
                            value={reasonDrafts[r.id] || ''}
                            onChange={(e) => setReasonDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                            placeholder="Reason (required)"
                            className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-800 focus:border-kit-500 focus:outline-none"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={reviewBusy === r.id}
                              onClick={() => decideReview(r.id, 'APPROVE')}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              {reviewBusy === r.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={reviewBusy === r.id}
                              onClick={() => decideReview(r.id, 'REJECT')}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {showMatrix && (
            <Card className="border-gray-200 shadow-sm bg-white p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900">Provider capability matrix</h2>
                <p className="mt-0.5 text-xs text-gray-500">Exactly what each adapter declares it can return today.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 bg-gray-50/70">
                      <th className="px-5 py-2.5 font-semibold">Platform</th>
                      <th className="px-3 py-2.5 font-semibold">Profile</th>
                      <th className="px-3 py-2.5 font-semibold">Daily</th>
                      <th className="px-3 py-2.5 font-semibold">Accepted</th>
                      <th className="px-3 py-2.5 font-semibold">Timestamps</th>
                      <th className="px-3 py-2.5 font-semibold">Contests</th>
                      <th className="px-3 py-2.5 font-semibold">Rating</th>
                      <th className="px-3 py-2.5 font-semibold">Ownership</th>
                      <th className="px-5 py-2.5 font-semibold">API kind</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {capabilities.map((c) => (
                      <tr key={c.platform} className="hover:bg-gray-50/60">
                        <td className="px-5 py-3 font-semibold text-gray-900">{c.platform}</td>
                        {!c.registered ? (
                          <td colSpan={8} className="px-3 py-3 text-gray-400">not registered</td>
                        ) : (
                          <>
                            <td className="px-3 py-3">{supportBadge(c.profileLookup)}</td>
                            <td className="px-3 py-3">{supportBadge(c.dailyActivity)}</td>
                            <td className="px-3 py-3">{supportBadge(c.acceptedSubmissions)}</td>
                            <td className="px-3 py-3">{supportBadge(c.submissionTimestamps)}</td>
                            <td className="px-3 py-3">{supportBadge(c.contestHistory)}</td>
                            <td className="px-3 py-3">{supportBadge(c.ratingHistory)}</td>
                            <td className="px-3 py-3">{supportBadge(c.ownership)}</td>
                            <td className="px-5 py-3 text-[11px] text-gray-500">{(c.apiKind || '').replace(/_/g, ' ').toLowerCase()}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Card className="border-gray-200 shadow-sm bg-white p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Recent provider errors</h2>
                <p className="mt-0.5 text-xs text-gray-500">Latest failed sync attempts across all providers.</p>
              </div>
              <span className="text-xs text-gray-400">Generated {formatWhen(data.generatedAt)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 bg-gray-50/70">
                    <th className="px-5 py-2.5 font-semibold">When</th>
                    <th className="px-3 py-2.5 font-semibold">Platform</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5 font-semibold">Code</th>
                    <th className="px-3 py-2.5 font-semibold">Message</th>
                    <th className="px-5 py-2.5 font-semibold">Student</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.recentProviderErrors.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                        <span className="inline-flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" /> No provider errors recorded.
                        </span>
                      </td>
                    </tr>
                  )}
                  {data.recentProviderErrors.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50/60">
                      <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{formatWhen(e.attemptedAt)}</td>
                      <td className="px-3 py-3 font-medium text-gray-900">{e.platform}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                          <AlertTriangle className="h-3 w-3" /> {e.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[11px] font-mono text-gray-600">{e.errorCode || '—'}</td>
                      <td className="px-3 py-3 text-gray-600 max-w-[320px] truncate" title={e.errorMessage || ''}>
                        {e.errorMessage || '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {e.student ? (
                          <span>
                            {e.student.name} <span className="text-gray-400">({e.student.email})</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'slate' | 'emerald' | 'amber' | 'rose';
}) {
  const toneClasses: Record<string, string> = {
    slate: 'bg-slate-50 text-slate-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };
  return (
    <Card className="border-gray-200 shadow-sm bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClasses[tone]}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
          <p className="text-[11px] text-gray-500 mt-1 truncate">{label}</p>
        </div>
      </div>
    </Card>
  );
}
