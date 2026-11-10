'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';

/**
 * External account sync status (Phase 1, Step 6).
 *
 * Shows connected platforms, ownership state, last successful sync, the latest
 * sync result, provider availability and a retry action. A provider that is down
 * or unsupported is rendered as "unavailable" with a reason — never as a zero.
 */

type OwnershipStatus = 'PROFILE_EXISTS' | 'OWNERSHIP_UNVERIFIED' | 'OWNERSHIP_VERIFIED';

interface PlatformStatus {
  platform: string;
  label: string;
  connected: boolean;
  username: string | null;
  ownershipStatus: OwnershipStatus;
  ownershipVerified: boolean;
  ownershipChallengeSupported: boolean;
  capabilities: { apiKind: string; dataFreshness: string; ownership: string; supported: string[]; unsupported: string[] };
  lastAttemptAt: string | null;
  lastSuccessfulSyncAt: string | null;
  latestSyncResult: string;
  latestSyncError: { code: string | null; message: string | null } | null;
  recordsProcessed: number | null;
  providerAvailable: boolean | null;
  unavailableReason: string | null;
  streak: { currentStreak: number; longestStreak: number; lastActivityDate: string | null } | null;
  canRetry: boolean;
}

interface SyncStatusResponse {
  platforms: PlatformStatus[];
  lastSuccessfulSyncAt: string | null;
  failedProviderCount: number;
}

interface ChallengeState {
  token: string | null;
  fieldLabel: string | null;
  instructions: string | null;
}

function formatWhen(value: string | null): string {
  if (!value) return 'Never';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function ExternalSyncStatusPanel() {
  const [status, setStatus] = useState<SyncStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<Record<string, string>>({});
  const [challenge, setChallenge] = useState<Record<string, ChallengeState>>({});
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/profiles/sync-status');
      if (res.data?.success) setStatus(res.data as SyncStatusResponse);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load external sync status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const retry = useCallback(
    async (platform: string) => {
      setBusy((p) => ({ ...p, [platform]: true }));
      setNotice((p) => ({ ...p, [platform]: '' }));
      try {
        const res = await api.post('/profiles/sync-status', { platform });
        const data = res.data;
        setNotice((p) => ({
          ...p,
          [platform]: data?.ok
            ? `Synced. Imported ${data.counts?.rating ?? 0} rating, ${data.counts?.contests ?? 0} contest, ${data.counts?.submissions ?? 0} submission records.`
            : `Provider unavailable (${data?.errorKind ?? 'error'}): ${data?.message ?? 'no detail returned.'}`,
        }));
        await load();
      } catch (err: any) {
        setNotice((p) => ({ ...p, [platform]: err?.response?.data?.message || 'Sync retry failed.' }));
      } finally {
        setBusy((p) => ({ ...p, [platform]: false }));
      }
    },
    [load],
  );

  const startChallenge = useCallback(async (platform: string) => {
    setBusy((p) => ({ ...p, [`challenge-${platform}`]: true }));
    setNotice((p) => ({ ...p, [platform]: '' }));
    try {
      const res = await api.get(`/profiles/${platform.toLowerCase()}/ownership`);
      const data = res.data;
      if (!data?.supported) {
        setNotice((p) => ({ ...p, [platform]: data?.instructions || 'Ownership verification is not available for this platform.' }));
      } else {
        setChallenge((p) => ({
          ...p,
          [platform]: { token: data.token, fieldLabel: data.fieldLabel, instructions: data.instructions },
        }));
      }
    } catch (err: any) {
      setNotice((p) => ({ ...p, [platform]: err?.response?.data?.message || 'Could not start ownership verification.' }));
    } finally {
      setBusy((p) => ({ ...p, [`challenge-${platform}`]: false }));
    }
  }, []);

  const confirmChallenge = useCallback(
    async (platform: string) => {
      setBusy((p) => ({ ...p, [`challenge-${platform}`]: true }));
      try {
        const res = await api.post(`/profiles/${platform.toLowerCase()}/ownership`);
        const data = res.data;
        setNotice((p) => ({
          ...p,
          [platform]: data?.ownershipProven
            ? 'Ownership verified. Your account is now confirmed.'
            : data?.detail || 'Token not found in your public profile yet.',
        }));
        if (data?.ownershipProven) {
          setChallenge((p) => {
            const next = { ...p };
            delete next[platform];
            return next;
          });
        }
        await load();
      } catch (err: any) {
        setNotice((p) => ({ ...p, [platform]: err?.response?.data?.message || 'Ownership check failed.' }));
      } finally {
        setBusy((p) => ({ ...p, [`challenge-${platform}`]: false }));
      }
    },
    [load],
  );

  const copyToken = (token: string) => {
    navigator.clipboard?.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading platform sync status…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  const connected = (status?.platforms ?? []).filter((p) => p.connected);

  if (connected.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-600">
        No competitive-programming accounts connected yet. Connect a LeetCode, CodeChef, AtCoder or Codeforces profile
        above to start syncing verified activity.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>Last successful sync: {formatWhen(status?.lastSuccessfulSyncAt ?? null)}</span>
        {(status?.failedProviderCount ?? 0) > 0 && (
          <span className="font-semibold text-amber-700">
            {status?.failedProviderCount} provider{status?.failedProviderCount === 1 ? '' : 's'} unavailable
          </span>
        )}
      </div>

      {connected.map((p) => {
        const isBusy = busy[p.platform];
        const challengeState = challenge[p.platform];
        const unavailable = p.providerAvailable === false;

        return (
          <div key={p.platform} className="rounded-xl border border-slate-200/80 bg-white p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">{p.label}</span>
                {p.username && <span className="text-[11px] text-slate-500">@{p.username}</span>}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {p.ownershipVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="h-3 w-3" /> Ownership verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                    <ShieldAlert className="h-3 w-3" /> Ownership unverified
                  </span>
                )}

                {unavailable ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                    <WifiOff className="h-3 w-3" /> Provider unavailable
                  </span>
                ) : p.latestSyncResult === 'SUCCESS' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3" /> Synced
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                    <Clock className="h-3 w-3" /> Not synced yet
                  </span>
                )}

                <Button
                  variant="outline"
                  className="h-7 px-2 text-[11px]"
                  disabled={isBusy || !p.canRetry}
                  onClick={() => retry(p.platform)}
                >
                  {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  <span className="ml-1">Sync now</span>
                </Button>

                {!p.ownershipVerified && p.ownershipChallengeSupported && (
                  <Button
                    variant="outline"
                    className="h-7 px-2 text-[11px]"
                    disabled={isBusy}
                    onClick={() => startChallenge(p.platform)}
                  >
                    Verify ownership
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
              <span>
                Last successful sync: <strong>{formatWhen(p.lastSuccessfulSyncAt)}</strong>
              </span>
              <span>
                Latest result:{' '}
                <strong>
                  {p.latestSyncResult === 'NEVER' ? 'no sync yet' : p.latestSyncResult.toLowerCase()}
                </strong>
              </span>
              <span>
                Records imported:{' '}
                <strong>{p.recordsProcessed === null ? 'not available' : p.recordsProcessed}</strong>
              </span>
              {p.streak && (
                <span>
                  Streak: <strong>{p.streak.currentStreak}</strong> day
                  {p.streak.currentStreak === 1 ? '' : 's'} (longest {p.streak.longestStreak})
                </span>
              )}
              <span className="text-slate-400">Source: {p.capabilities.apiKind.toLowerCase().replace(/_/g, ' ')}</span>
            </div>

            {unavailable && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800">
                <WifiOff className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  {p.latestSyncError?.code ? `[${p.latestSyncError.code}] ` : ''}
                  {p.unavailableReason || 'Provider did not return data. Values are shown as unavailable, not zero.'}
                </span>
              </div>
            )}

            {p.capabilities.unsupported.length > 0 && (
              <p className="text-[10.5px] text-slate-400">
                Not provided by {p.label}: {p.capabilities.unsupported.join(', ')}.
              </p>
            )}

            {challengeState && (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-2.5 space-y-2">
                <p className="text-[11px] text-indigo-900">{challengeState.instructions}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-white px-2 py-1 text-[11px] font-mono text-indigo-900 border border-indigo-200">
                    {challengeState.token}
                  </code>
                  <Button
                    variant="outline"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => challengeState.token && copyToken(challengeState.token)}
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span className="ml-1">{copied ? 'Copied' : 'Copy'}</span>
                  </Button>
                  <Button className="h-7 px-2 text-[11px]" disabled={isBusy} onClick={() => confirmChallenge(p.platform)}>
                    {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                    <span className="ml-1">I saved it — check</span>
                  </Button>
                </div>
              </div>
            )}

            {notice[p.platform] && <p className="text-[11px] text-slate-600">{notice[p.platform]}</p>}
          </div>
        );
      })}
    </div>
  );
}

export default ExternalSyncStatusPanel;
