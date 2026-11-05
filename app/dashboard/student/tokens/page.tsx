'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Flame, Info, Loader2, Shield } from 'lucide-react';
import { StudentPageHeader } from '@/components/dashboard/StudentPageHeader';
import { TokensTab, type TokenInventoryData } from '@/components/dashboard/RewardInventory';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Dedicated Tokens page.
 * Reuses the token engine (/api/gamification/tokens) and the shared TokensTab
 * renderer from RewardInventory — no token rules are re-implemented here.
 */
export default function TokensPage() {
  const [data, setData] = useState<TokenInventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetch('/api/gamification/tokens', { headers: getAuthHeader() });
      const json = await res.json();
      if (json.success) {
        setData({ streakRescue: json.streakRescue, leaderboardBoost: json.leaderboardBoost });
      } else {
        setError(json.message || 'Unable to load tokens.');
      }
    } catch {
      setError('Unable to load tokens.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const rescueToken = useCallback(
    async (tokenId: string) => {
      setBusy(true);
      setToast('');
      try {
        const res = await fetch('/api/gamification/tokens/streak-rescue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify({ tokenId }),
        });
        const json = await res.json();
        if (json.success) {
          setToast('Streak restored');
          await fetchTokens();
        } else {
          setToast(json.message || 'Unable to use token');
        }
      } catch {
        setToast('Unable to use token');
      } finally {
        setBusy(false);
        setTimeout(() => setToast(''), 3000);
      }
    },
    [fetchTokens]
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <StudentPageHeader
        title="Tokens"
        subtitle="Your Streak Rescue and other platform tokens, with usage and eligibility."
      />

      <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs">
        <div className="border-b border-gray-100 p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Shield className="h-5 w-5 text-[#990024]" /> Token Inventory
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Tokens are consumed atomically and never modify finalized weekly snapshots.
          </p>
        </div>

        {toast && (
          <div className="px-4 pt-3">
            <span className="rounded-full bg-rose-50 px-2 py-1 text-[11px] font-semibold text-[#990024]">
              {toast}
            </span>
          </div>
        )}

        <div className="min-h-[280px] p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : error || !data ? (
            <p className="text-sm text-gray-500">{error || 'No token data available.'}</p>
          ) : (
            <TokensTab data={data} busy={busy} onRescue={rescueToken} />
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
        <p className="flex items-start gap-2 text-[11px] text-gray-600">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#990024]" />
          <span>
            <Flame className="mr-1 inline h-3 w-3 text-orange-500" />
            Streak Rescue tokens let you restore a broken daily engagement streak without affecting
            career growth scoring. Eligible dates are shown per token.
          </span>
        </p>
      </div>
    </div>
  );
}
