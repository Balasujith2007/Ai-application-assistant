'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Loader2,
  Save,
  RotateCcw,
  CalendarClock,
  Scale,
  Layers,
  Gift,
  Trophy,
  History,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { RewardEngineConfig } from '@/lib/gamification/rewardConfigService';

const DAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({
  value: h,
  label: `${String(h).padStart(2, '0')}:00`,
}));

const WEIGHT_FIELDS: { key: keyof RewardEngineConfig['scoringWeights']; label: string }[] = [
  { key: 'lessonsCompleted', label: 'Lessons completed' },
  { key: 'learningConsistency', label: 'Learning consistency' },
  { key: 'assessmentPerformance', label: 'Assessment performance' },
  { key: 'courseProjectProgress', label: 'Course / project progress' },
  { key: 'streakMaintenance', label: 'Streak maintenance' },
  { key: 'achievementsMilestones', label: 'Achievements / milestones' },
];

const TIER_KEYS: { key: keyof RewardEngineConfig['tierThresholds']; label: string }[] = [
  { key: 'legendary', label: 'Legendary' },
  { key: 'epic', label: 'Epic' },
  { key: 'rare', label: 'Rare' },
  { key: 'common', label: 'Common' },
  { key: 'comeback', label: 'Comeback' },
];

const VALUE_TIERS: { key: keyof RewardEngineConfig['rewardValues']; label: string }[] = [
  { key: 'LEGENDARY', label: 'Legendary' },
  { key: 'EPIC', label: 'Epic' },
  { key: 'RARE', label: 'Rare' },
  { key: 'COMMON', label: 'Common' },
  { key: 'COMEBACK', label: 'Comeback' },
];

const CHAMPION_PLACES: {
  key: 'first' | 'second' | 'third';
  label: string;
}[] = [
  { key: 'first', label: '1st place' },
  { key: 'second', label: '2nd place' },
  { key: 'third', label: '3rd place' },
];

type TabKey = 'schedule' | 'weights' | 'thresholds' | 'values' | 'champion' | 'history';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'schedule', label: 'Weekly Schedule', icon: <CalendarClock className="h-4 w-4" /> },
  { key: 'weights', label: 'Scoring Weights', icon: <Scale className="h-4 w-4" /> },
  { key: 'thresholds', label: 'Tier Thresholds', icon: <Layers className="h-4 w-4" /> },
  { key: 'values', label: 'Reward Values', icon: <Gift className="h-4 w-4" /> },
  { key: 'champion', label: 'Champion Rewards', icon: <Trophy className="h-4 w-4" /> },
  { key: 'history', label: 'Audit History', icon: <History className="h-4 w-4" /> },
];

interface AuditEntry {
  id: string;
  key: string;
  previousValue: unknown;
  newValue: unknown;
  changedById: string | null;
  createdAt: string;
}

export default function RewardConfigurationPage() {
  const [config, setConfig] = useState<RewardEngineConfig | null>(null);
  const [defaults, setDefaults] = useState<RewardEngineConfig | null>(null);
  const [history, setHistory] = useState<AuditEntry[]>([]);
  const [tab, setTab] = useState<TabKey>('schedule');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchConfig = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/gamification/reward-config', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfig(res.data.config);
      setDefaults(res.data.defaults);
      setHistory(res.data.history || []);
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Failed to load reward configuration.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const patch = (fn: (draft: RewardEngineConfig) => void) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev) as RewardEngineConfig;
      fn(next);
      return next;
    });
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put('/api/admin/gamification/reward-config', config, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfig(res.data.config);
      setSuccess('Reward configuration saved. The reward engine will use these values on its next allocation.');
      const historyRes = await axios.get('/api/admin/gamification/reward-config', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistory(historyRes.data.history || []);
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Failed to save reward configuration.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!defaults) return;
    setConfig(structuredClone(defaults));
    setSuccess('Form reset to built-in defaults. Click "Save configuration" to persist.');
    setError('');
  };

  const weightSum = config
    ? Object.values(config.scoringWeights).reduce((a, v) => a + (Number.isFinite(v) ? v : 0), 0)
    : 0;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || 'Unable to load reward configuration.'}
        </div>
        <Button variant="outline" onClick={fetchConfig}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-gray-900">
            <Gift className="h-8 w-8 text-kit-600" /> Reward Configuration
          </h1>
          <p className="mt-1 text-gray-500">
            Manage the weekly mystery gift schedule, scoring weights, tier thresholds, reward values and champion rewards.
            These values are consumed directly by the reward engine.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Reset to defaults
          </Button>
          <Button onClick={handleSave} isLoading={saving} className="gap-2">
            <Save className="h-4 w-4" /> Save configuration
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

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.key ? 'bg-kit-50 text-kit-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'schedule' && (
        <Card className="space-y-5">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-kit-600 focus:ring-kit-500"
              checked={config.weeklySchedule.enabled}
              onChange={(e) => patch((d) => { d.weeklySchedule.enabled = e.target.checked; })}
            />
            <span className="text-sm font-medium text-gray-800">Weekly gift distribution enabled</span>
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Distribution day</label>
              <select
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-kit-600 focus:outline-none focus:ring-2 focus:ring-kit-600"
                value={config.weeklySchedule.distributionDay}
                onChange={(e) => patch((d) => { d.weeklySchedule.distributionDay = Number(e.target.value); })}
              >
                {DAY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Distribution hour</label>
              <select
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-kit-600 focus:outline-none focus:ring-2 focus:ring-kit-600"
                value={config.weeklySchedule.distributionHour}
                onChange={(e) => patch((d) => { d.weeklySchedule.distributionHour = Number(e.target.value); })}
              >
                {HOUR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <Input
              label="Timezone"
              value={config.weeklySchedule.timezone}
              onChange={(e) => patch((d) => { d.weeklySchedule.timezone = e.target.value; })}
              hint="IANA timezone, e.g. Asia/Kolkata"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Evaluation start day</label>
              <select
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-kit-600 focus:outline-none focus:ring-2 focus:ring-kit-600"
                value={config.weeklySchedule.evaluationStartDay}
                onChange={(e) => patch((d) => { d.weeklySchedule.evaluationStartDay = Number(e.target.value); })}
              >
                {DAY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Evaluation end day</label>
              <select
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-kit-600 focus:outline-none focus:ring-2 focus:ring-kit-600"
                value={config.weeklySchedule.evaluationEndDay}
                onChange={(e) => patch((d) => { d.weeklySchedule.evaluationEndDay = Number(e.target.value); })}
              >
                {DAY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <Input
              label="Batch size"
              type="number"
              value={config.weeklySchedule.batchSize}
              onChange={(e) => patch((d) => { d.weeklySchedule.batchSize = Number(e.target.value); })}
              hint="Students processed per batch (1–500)"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Max retries per student"
              type="number"
              value={config.weeklySchedule.maxRetries}
              onChange={(e) => patch((d) => { d.weeklySchedule.maxRetries = Number(e.target.value); })}
              hint="Retry attempts for a failed allocation (0–10)"
            />
            <Input
              label="Retry base delay (ms)"
              type="number"
              value={config.weeklySchedule.retryDelayMs}
              onChange={(e) => patch((d) => { d.weeklySchedule.retryDelayMs = Number(e.target.value); })}
              hint="Exponential backoff base"
            />
          </div>
        </Card>
      )}

      {tab === 'weights' && (
        <Card className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Performance scoring weights must total exactly 100%.</p>
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                Math.abs(weightSum - 100) < 0.001
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              Total: {weightSum}%
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {WEIGHT_FIELDS.map((f) => (
              <Input
                key={f.key}
                label={`${f.label} (%)`}
                type="number"
                value={config.scoringWeights[f.key]}
                onChange={(e) => patch((d) => { d.scoringWeights[f.key] = Number(e.target.value); })}
              />
            ))}
          </div>
        </Card>
      )}

      {tab === 'thresholds' && (
        <Card className="space-y-4">
          <p className="text-sm text-gray-500">
            Score bands must not overlap. Each tier&apos;s max must be lower than the tier above its min.
          </p>
          <div className="space-y-3">
            {TIER_KEYS.map((t) => (
              <div key={t.key} className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
                <div className="text-sm font-semibold text-gray-800">{t.label}</div>
                <Input
                  label="Min"
                  type="number"
                  value={config.tierThresholds[t.key].min}
                  onChange={(e) => patch((d) => { d.tierThresholds[t.key].min = Number(e.target.value); })}
                />
                <Input
                  label="Max"
                  type="number"
                  value={config.tierThresholds[t.key].max}
                  onChange={(e) => patch((d) => { d.tierThresholds[t.key].max = Number(e.target.value); })}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'values' && (
        <div className="space-y-6">
          {VALUE_TIERS.map((t) => {
            const v = config.rewardValues[t.key];
            return (
              <Card key={t.key} className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">{t.label}</h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <Input
                    label="XP min"
                    type="number"
                    value={v.xpMin}
                    onChange={(e) => patch((d) => { d.rewardValues[t.key].xpMin = Number(e.target.value); })}
                  />
                  <Input
                    label="XP max"
                    type="number"
                    value={v.xpMax}
                    onChange={(e) => patch((d) => { d.rewardValues[t.key].xpMax = Number(e.target.value); })}
                  />
                  <Input
                    label="Coins min"
                    type="number"
                    value={v.coinsMin}
                    onChange={(e) => patch((d) => { d.rewardValues[t.key].coinsMin = Number(e.target.value); })}
                  />
                  <Input
                    label="Coins max"
                    type="number"
                    value={v.coinsMax}
                    onChange={(e) => patch((d) => { d.rewardValues[t.key].coinsMax = Number(e.target.value); })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <Input
                    label="Badge probability (0–1)"
                    type="number"
                    step="0.01"
                    value={v.badgeProbability ?? 0}
                    onChange={(e) => patch((d) => { d.rewardValues[t.key].badgeProbability = Number(e.target.value); })}
                  />
                  <Input
                    label="Exclusive badge prob (0–1)"
                    type="number"
                    step="0.01"
                    value={v.exclusiveBadgeProbability ?? 0}
                    onChange={(e) => patch((d) => { d.rewardValues[t.key].exclusiveBadgeProbability = Number(e.target.value); })}
                  />
                  <Input
                    label="Streak rescue prob (0–1)"
                    type="number"
                    step="0.01"
                    value={v.streakRescueProbability ?? 0}
                    onChange={(e) => patch((d) => { d.rewardValues[t.key].streakRescueProbability = Number(e.target.value); })}
                  />
                  <Input
                    label="Profile frame prob (0–1)"
                    type="number"
                    step="0.01"
                    value={v.profileFrameProbability ?? 0}
                    onChange={(e) => patch((d) => { d.rewardValues[t.key].profileFrameProbability = Number(e.target.value); })}
                  />
                  <Input
                    label="Leaderboard boost prob (0–1)"
                    type="number"
                    step="0.01"
                    value={v.leaderboardBoostProbability ?? 0}
                    onChange={(e) => patch((d) => { d.rewardValues[t.key].leaderboardBoostProbability = Number(e.target.value); })}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'champion' && (
        <Card className="space-y-5">
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-kit-600 focus:ring-kit-500"
                checked={config.championRewards.enabled}
                onChange={(e) => patch((d) => { d.championRewards.enabled = e.target.checked; })}
              />
              <span className="text-sm font-medium text-gray-800">Top 3 champion rewards enabled</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-kit-600 focus:ring-kit-500"
                checked={config.championRewards.additionalToWeekly}
                onChange={(e) => patch((d) => { d.championRewards.additionalToWeekly = e.target.checked; })}
              />
              <span className="text-sm font-medium text-gray-800">
                Champion rewards are additional to the regular weekly gift (unchecked = replace)
              </span>
            </label>
          </div>

          {CHAMPION_PLACES.map((p) => {
            const c = config.championRewards[p.key];
            return (
              <div key={p.key} className="space-y-4 rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">{p.label}</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="XP amount"
                    type="number"
                    value={c.xpAmount}
                    onChange={(e) => patch((d) => { d.championRewards[p.key].xpAmount = Number(e.target.value); })}
                  />
                  <Input
                    label="Coin amount"
                    type="number"
                    value={c.coinAmount}
                    onChange={(e) => patch((d) => { d.championRewards[p.key].coinAmount = Number(e.target.value); })}
                  />
                  <Input
                    label="Badge ID"
                    value={c.badgeId}
                    onChange={(e) => patch((d) => { d.championRewards[p.key].badgeId = e.target.value; })}
                  />
                  <Input
                    label="Badge name"
                    value={c.badgeName}
                    onChange={(e) => patch((d) => { d.championRewards[p.key].badgeName = e.target.value; })}
                  />
                  <Input
                    label="Badge icon"
                    value={c.badgeIcon}
                    onChange={(e) => patch((d) => { d.championRewards[p.key].badgeIcon = e.target.value; })}
                  />
                  <Input
                    label="Profile frame URL"
                    value={c.profileFrameUrl}
                    onChange={(e) => patch((d) => { d.championRewards[p.key].profileFrameUrl = e.target.value; })}
                  />
                  <Input
                    label="Title"
                    value={c.title}
                    onChange={(e) => patch((d) => { d.championRewards[p.key].title = e.target.value; })}
                  />
                  <Input
                    label="Reward rarity"
                    value={c.rewardRarity}
                    onChange={(e) => patch((d) => { d.championRewards[p.key].rewardRarity = e.target.value as typeof c.rewardRarity; })}
                    hint="LEGENDARY, EPIC, RARE, COMMON or COMEBACK"
                  />
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {tab === 'history' && (
        <Card className="overflow-hidden" padding="none">
          {history.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">No configuration changes recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Section</th>
                    <th className="px-4 py-3">Changed at</th>
                    <th className="px-4 py-3">Changed by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{h.key}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(h.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{h.changedById ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
