'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Crown,
  Flame,
  Gavel,
  History,
  Loader2,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { BadgeEmblem } from '@/components/badges/BadgeEmblem';
import {
  BADGE_CATEGORIES,
  type BadgeCategory,
  type BadgeTier,
} from '@/lib/gamification/badgeConfig';

type TabKey = 'catalog' | 'streak' | 'monthly' | 'correct' | 'history';

interface CatalogBadge {
  id: string;
  title: string;
  category: BadgeCategory;
  tier: BadgeTier;
  description: string;
  criteria: string;
  icon: string;
  unit: string;
  threshold: number;
  defaultThreshold: number;
  xpReward: number;
  rarity: string;
  awardSource: 'ENGINE' | 'MONTHLY';
  active: boolean;
  sortOrder: number;
  artworkKey: string | null;
  monthlyRule: Record<string, unknown> | null;
  /** Phase 2 §7 — streak-badge policy (Super Admin owned, audited). */
  requireOwnershipVerification: boolean;
  eligibleProviders: string[] | null;
  evidenceRequirement: 'NONE' | 'VERIFIED_ACCEPTED_SUBMISSION';
}

interface AuditEntry {
  id: string;
  studentId: string;
  studentName: string | null;
  badgeId: string;
  action: string;
  source: string;
  reason: string;
  actorId: string | null;
  createdAt: string | null;
}

interface StreakMilestone {
  badgeId: string;
  title: string;
  thresholdDays: number;
  unit: string;
  active: boolean;
}

const RARITIES = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'];
const BADGE_TIERS: BadgeTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
/** Platforms that can back a streak badge (Phase 2 §7 provider eligibility). */
const ELIGIBLE_PROVIDERS = ['LEETCODE', 'CODECHEF', 'ATCODER', 'CODEFORCES'] as const;
const EVIDENCE_REQUIREMENTS: Array<{ value: CatalogBadge['evidenceRequirement']; label: string }> = [
  { value: 'NONE', label: 'No evidence requirement' },
  { value: 'VERIFIED_ACCEPTED_SUBMISSION', label: 'Verified accepted submission (ownership) ' },
];

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'catalog', label: 'Badge Catalog', icon: <Award className="h-4 w-4" /> },
  { key: 'streak', label: 'Streak Milestones', icon: <Flame className="h-4 w-4" /> },
  { key: 'monthly', label: 'Monthly Awards', icon: <Crown className="h-4 w-4" /> },
  { key: 'correct', label: 'Manual Correction', icon: <Gavel className="h-4 w-4" /> },
  { key: 'history', label: 'Award History', icon: <History className="h-4 w-4" /> },
];

export default function BadgeManagementPage() {
  const [tab, setTab] = useState<TabKey>('catalog');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [catalog, setCatalog] = useState<CatalogBadge[]>([]);
  const [streakMilestones, setStreakMilestones] = useState<StreakMilestone[]>([]);
  const [monthlyRules, setMonthlyRules] = useState<CatalogBadge[]>([]);
  const [awardHistory, setAwardHistory] = useState<AuditEntry[]>([]);

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [editing, setEditing] = useState<CatalogBadge | null>(null);

  // Manual correction state
  const [studentQuery, setStudentQuery] = useState('');
  const [students, setStudents] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string; email: string } | null>(null);
  const [studentBadges, setStudentBadges] = useState<Array<{ badgeId: string; title: string; status: string }>>([]);
  const [correctionBadgeId, setCorrectionBadgeId] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');

  // Monthly run state
  const [runMonthKey, setRunMonthKey] = useState('');
  const [runForce, setRunForce] = useState(false);
  const [monthlyStatus, setMonthlyStatus] = useState<any>(null);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/admin/gamification/badges', { headers: authHeaders() });
      setCatalog(res.data.catalog || []);
      setStreakMilestones(res.data.streakMilestones || []);
      setMonthlyRules(res.data.monthlyRules || []);
      setAwardHistory(res.data.awardHistory || []);
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Failed to load badge catalog.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMonthlyStatus = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/gamification/monthly-recognition', { headers: authHeaders() });
      setMonthlyStatus(res.data);
    } catch {
      setMonthlyStatus(null);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (tab === 'monthly') loadMonthlyStatus();
  }, [tab, loadMonthlyStatus]);

  const flash = (message: string) => {
    setSuccess(message);
    setError('');
    setTimeout(() => setSuccess(''), 4000);
  };

  const handleSeed = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await axios.post(
        '/api/admin/gamification/badges',
        { action: 'seed' },
        { headers: authHeaders() }
      );
      flash(`Catalog seeded: ${res.data.seeded} badges refreshed from the code framework.`);
      await loadAll();
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Failed to seed catalog.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSaveBadge = async () => {
    if (!editing) return;
    setBusy(true);
    setError('');
    try {
      await axios.put(
        `/api/admin/gamification/badges/${encodeURIComponent(editing.id)}`,
        {
          title: editing.title,
          description: editing.description,
          criteria: editing.criteria,
          category: editing.category,
          tier: editing.tier,
          icon: editing.icon,
          unit: editing.unit,
          threshold: Number(editing.threshold),
          xpReward: Number(editing.xpReward),
          rarity: editing.rarity,
          active: editing.active,
          artworkKey: editing.artworkKey,
          monthlyRule: editing.monthlyRule,
          requireOwnershipVerification: editing.requireOwnershipVerification,
          eligibleProviders: editing.eligibleProviders,
          evidenceRequirement: editing.evidenceRequirement,
        },
        { headers: authHeaders() }
      );
      flash(`${editing.title} updated. Changes apply to the next badge evaluation.`);
      setEditing(null);
      await loadAll();
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Failed to save badge.'
      );
    } finally {
      setBusy(false);
    }
  };

  const searchStudents = async () => {
    if (!studentQuery.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await axios.get(
        `/api/admin/gamification/badges?q=${encodeURIComponent(studentQuery.trim())}`,
        { headers: authHeaders() }
      );
      setStudents(res.data.students || []);
    } catch {
      setError('Student search failed.');
    } finally {
      setBusy(false);
    }
  };

  const selectStudent = async (student: { id: string; name: string; email: string }) => {
    setSelectedStudent(student);
    setStudents([]);
    setStudentQuery('');
    setBusy(true);
    try {
      const res = await axios.get(
        `/api/admin/gamification/badges?studentId=${encodeURIComponent(student.id)}`,
        { headers: authHeaders() }
      );
      setStudentBadges(res.data.studentBadges || []);
    } catch {
      setStudentBadges([]);
    } finally {
      setBusy(false);
    }
  };

  const submitCorrection = async (action: 'grant' | 'revoke') => {
    if (!selectedStudent || !correctionBadgeId || !correctionReason.trim()) {
      setError('Select a student, a badge and provide a reason.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await axios.post(
        '/api/admin/gamification/badges',
        {
          action,
          studentId: selectedStudent.id,
          badgeId: correctionBadgeId,
          reason: correctionReason.trim(),
        },
        { headers: authHeaders() }
      );
      flash(
        action === 'grant'
          ? res.data.awarded
            ? `Badge granted. Credential ${res.data.credentialId ?? ''} issued.`
            : 'Student already held this badge — no duplicate award created.'
          : 'Credential revoked. The award record and evidence are preserved.'
      );
      setCorrectionReason('');
      setCorrectionBadgeId('');
      await selectStudent(selectedStudent);
      await loadAll();
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Manual correction failed.'
      );
    } finally {
      setBusy(false);
    }
  };

  const runMonthly = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await axios.post(
        '/api/admin/gamification/monthly-recognition',
        { monthKey: runMonthKey || undefined, force: runForce },
        { headers: authHeaders() }
      );
      const s = res.data.stats;
      flash(
        res.data.alreadyCompleted
          ? `Month ${res.data.monthKey} was already finalised — no duplicate awards created.`
          : `Monthly recognition complete for ${res.data.monthKey}: ${s?.champions?.length ?? 0} champions, ${s?.badgesAwarded ?? 0} badges awarded.`
      );
      await loadMonthlyStatus();
      await loadAll();
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Monthly recognition run failed.'
      );
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(
    () => (categoryFilter === 'ALL' ? catalog : catalog.filter((b) => b.category === categoryFilter)),
    [catalog, categoryFilter]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-kit-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-gray-900">
            <ShieldCheck className="h-8 w-8 text-kit-600" /> Badge &amp; Recognition Management
          </h1>
          <p className="mt-1 max-w-3xl text-gray-500">
            Manage the professional badge framework: eligibility thresholds, descriptions, artwork, streak milestones
            and platform coding-streak policy, monthly award rules and award history. Manual changes always require a
            reason and are audited.
          </p>
        </div>
        <Button variant="outline" onClick={handleSeed} isLoading={busy} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Seed / refresh catalog
        </Button>
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

      {tab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                categoryFilter === 'ALL' ? 'bg-kit-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({catalog.length})
            </button>
            {BADGE_CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategoryFilter(c.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  categoryFilter === c.key ? 'bg-kit-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {c.label} ({catalog.filter((b) => b.category === c.key).length})
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((badge) => (
              <Card key={badge.id} className="flex items-start gap-4">
                <BadgeEmblem
                  icon={badge.icon}
                  tier={badge.tier}
                  category={badge.category}
                  size={56}
                  locked={!badge.active}
                  title={badge.title}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate text-sm font-bold text-gray-900">{badge.title}</h3>
                    {!badge.active && (
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-gray-400">{badge.id}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-500">{badge.criteria}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
                      {badge.tier}
                    </span>
                    <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
                      {badge.category.replace(/_/g, ' ')}
                    </span>
                    <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">
                      threshold {badge.threshold}
                      {badge.unit ? ` ${badge.unit}` : ''}
                    </span>
                    <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                      +{badge.xpReward} XP
                    </span>
                  </div>
                  <button
                    onClick={() => setEditing({ ...badge })}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-kit-600 hover:text-kit-700"
                  >
                    <Save className="h-3.5 w-3.5" /> Edit definition
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'streak' && (
        <Card className="space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">Consistency streak milestones</h3>
            <p className="mt-1 text-sm text-gray-500">
              Awarded once per milestone from verified career activity, using Asia/Kolkata date boundaries. Page views
              and other meaningless actions never count. Each milestone badge is unlocked at most once.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              This tab lists every <strong>CONSISTENCY</strong> badge, which includes both the global career-activity
              streak milestones and the Phase 2 platform coding-streak milestones (50 → Code Consistency, 100 → Code
              Discipline, 150 → Coding Dedication, 200 → Legendary Coder, 250 → Eternal Problem Solver, 365 → One Year
              Coding Legend). Platform streak badges additionally require a verified accepted submission on an
              ownership-verified platform — configure that in each badge&apos;s edit dialog.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Milestone</th>
                  <th className="px-4 py-3">Badge</th>
                  <th className="px-4 py-3">Consecutive days</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {streakMilestones.map((m) => (
                  <tr key={m.badgeId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{m.title}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.badgeId}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{m.thresholdDays} days</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          m.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {m.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          const badge = catalog.find((b) => b.id === m.badgeId);
                          if (badge) setEditing({ ...badge });
                        }}
                        className="text-xs font-bold text-kit-600 hover:text-kit-700"
                      >
                        Edit threshold
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'monthly' && (
        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-kit-600" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">Monthly recognition workflow</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Ranks students on verified career performance only (internship &amp; job applications, hackathons
                  &amp; competitions, resume strength at 35/35/30), freezes monthly snapshots, then awards the
                  Gold/Silver/Bronze champions plus Career Excellence, Consistent Performer and Rising Star badges.
                  Reprocessing a month is idempotent.
                </p>
              </div>
            </div>

            {monthlyStatus?.lastRun && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
                <p className="font-semibold text-gray-800">
                  Last run: {monthlyStatus.lastRun.monthKey} — {monthlyStatus.lastRun.status}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Students evaluated: {monthlyStatus.lastRun.totalStudents ?? 0} · Champions:{' '}
                  {monthlyStatus.lastRun.championsAwarded ?? 0} · Badges awarded:{' '}
                  {monthlyStatus.lastRun.badgesAwarded ?? 0}
                </p>
                {Array.isArray(monthlyStatus.lastRun.champions) && monthlyStatus.lastRun.champions.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {monthlyStatus.lastRun.champions.map((c: any, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-gray-700">
                        <Trophy className="h-3.5 w-3.5 text-amber-500" />
                        <span className="font-semibold">#{c.rank}</span>
                        <span>{c.studentName}</span>
                        <span className="text-gray-400">score {c.score}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input
                label="Month key (YYYY-MM)"
                value={runMonthKey}
                onChange={(e) => setRunMonthKey(e.target.value)}
                placeholder="Leave blank for the closing month"
                hint="e.g. 2026-10"
              />
              <label className="flex items-center gap-3 pt-6 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-kit-600 focus:ring-kit-500"
                  checked={runForce}
                  onChange={(e) => setRunForce(e.target.checked)}
                />
                Force reprocess (still idempotent)
              </label>
              <div className="flex items-end">
                <Button onClick={runMonthly} isLoading={busy} className="gap-2">
                  <Crown className="h-4 w-4" /> Run monthly recognition
                </Button>
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">Monthly badge rules</h3>
            <p className="text-sm text-gray-500">
              Thresholds for the Monthly Excellence badges. Champion badges are position-based (rank #1/#2/#3) and
              ignore thresholds.
            </p>
            <div className="space-y-3">
              {monthlyRules.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-3"
                >
                  <div className="flex items-center gap-3">
                    <BadgeEmblem icon={b.icon} tier={b.tier} category={b.category} size={40} />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{b.title}</p>
                      <p className="font-mono text-[10px] text-gray-400">{b.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="rounded-md bg-indigo-50 px-2 py-1 font-bold text-indigo-600">
                      threshold {b.threshold}
                    </span>
                    <span className="rounded-md bg-emerald-50 px-2 py-1 font-bold text-emerald-600">
                      +{b.xpReward} XP
                    </span>
                    <button
                      onClick={() => setEditing({ ...b })}
                      className="font-bold text-kit-600 hover:text-kit-700"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'correct' && (
        <div className="space-y-6">
          <Card className="space-y-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">Manual correction</h3>
              <p className="mt-1 text-sm text-gray-500">
                Grant or revoke a badge credential with a mandatory reason. Grants are idempotent; revocations keep the
                original award record and evidence intact (never silently edited).
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[240px] flex-1">
                <Input
                  label="Find a student"
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                  placeholder="Name or email"
                />
              </div>
              <Button variant="outline" onClick={searchStudents} isLoading={busy} className="gap-2">
                <Search className="h-4 w-4" /> Search
              </Button>
            </div>

            {students.length > 0 && (
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                {students.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectStudent(s)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                  >
                    <span className="font-semibold text-gray-800">{s.name}</span>
                    <span className="text-xs text-gray-500">{s.email}</span>
                  </button>
                ))}
              </div>
            )}

            {selectedStudent && (
              <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-900">
                  Selected: {selectedStudent.name}{' '}
                  <span className="font-normal text-gray-500">({selectedStudent.email})</span>
                </p>
                <p className="text-xs text-gray-500">
                  Currently earned: {studentBadges.length ? studentBadges.map((b) => b.title).join(', ') : 'none'}
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Badge</label>
                    <select
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-kit-600 focus:outline-none focus:ring-2 focus:ring-kit-600"
                      value={correctionBadgeId}
                      onChange={(e) => setCorrectionBadgeId(e.target.value)}
                    >
                      <option value="">Select a badge…</option>
                      {catalog.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.title} ({b.category.replace(/_/g, ' ')})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      label="Reason (required)"
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                      placeholder="e.g. Verified offline hackathon win — evidence attached to ticket #1234"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => submitCorrection('grant')} isLoading={busy} className="gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Grant badge
                  </Button>
                  <Button variant="outline" onClick={() => submitCorrection('revoke')} isLoading={busy} className="gap-2">
                    <AlertTriangle className="h-4 w-4" /> Revoke credential
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'history' && (
        <Card className="overflow-hidden" padding="none">
          {awardHistory.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">No badge awards or corrections recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Badge</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {awardHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">
                        {h.createdAt ? new Date(h.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{h.studentName ?? h.studentId}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{h.badgeId}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            h.action === 'GRANT' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {h.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{h.source}</td>
                      <td className="max-w-[320px] px-4 py-3 text-xs text-gray-600">{h.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Badge editor modal */}
      <Modal
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Edit badge — ${editing.title}` : 'Edit badge'}
        size="lg"
      >
        {editing && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <BadgeEmblem icon={editing.icon} tier={editing.tier} category={editing.category} size={72} />
              <div className="text-xs text-gray-500">
                <p className="font-mono">{editing.id}</p>
                <p className="mt-1">
                  Award source: <strong>{editing.awardSource}</strong>
                </p>
                <p>
                  Default threshold: <strong>{editing.defaultThreshold}</strong>
                </p>
              </div>
            </div>

            <Input
              label="Title"
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
            <Textarea
              label="Description"
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />
            <Textarea
              label="Earning criteria (shown to students)"
              value={editing.criteria}
              onChange={(e) => setEditing({ ...editing, criteria: e.target.value })}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Category</label>
                <select
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-kit-600 focus:outline-none focus:ring-2 focus:ring-kit-600"
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value as BadgeCategory })}
                >
                  {BADGE_CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Tier</label>
                <select
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-kit-600 focus:outline-none focus:ring-2 focus:ring-kit-600"
                  value={editing.tier}
                  onChange={(e) => setEditing({ ...editing, tier: e.target.value as BadgeTier })}
                >
                  {BADGE_TIERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Icon (Lucide name)"
                value={editing.icon}
                onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                hint="e.g. Trophy, Flame, Rocket"
              />
              <Input
                label="Unit label"
                value={editing.unit}
                onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
                hint="e.g. days, applications"
              />
              <Input
                label="Eligibility threshold"
                type="number"
                value={editing.threshold}
                onChange={(e) => setEditing({ ...editing, threshold: Number(e.target.value) })}
                hint="Must be a positive number"
              />
              <Input
                label="XP reward"
                type="number"
                value={editing.xpReward}
                onChange={(e) => setEditing({ ...editing, xpReward: Number(e.target.value) })}
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Rarity</label>
                <select
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-kit-600 focus:outline-none focus:ring-2 focus:ring-kit-600"
                  value={editing.rarity}
                  onChange={(e) => setEditing({ ...editing, rarity: e.target.value })}
                >
                  {RARITIES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Artwork key"
                value={editing.artworkKey ?? ''}
                onChange={(e) => setEditing({ ...editing, artworkKey: e.target.value || null })}
                hint="Defaults to the badge id"
              />
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-kit-600 focus:ring-kit-500"
                checked={editing.active}
                onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
              />
              <span className="text-sm font-medium text-gray-800">
                Badge active (inactive badges are never awarded and show as locked)
              </span>
            </label>

            <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div>
                <h4 className="text-sm font-bold text-gray-800">Streak-badge policy (Phase 2)</h4>
                <p className="mt-1 text-xs text-gray-500">
                  These settings gate automatic awards. Only ownership-verified platforms can back a high-value coding
                  streak badge. Every change is audited.
                </p>
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-kit-600 focus:ring-kit-500"
                  checked={editing.requireOwnershipVerification}
                  onChange={(e) => setEditing({ ...editing, requireOwnershipVerification: e.target.checked })}
                />
                <span className="text-sm font-medium text-gray-800">
                  Require <strong>OWNERSHIP_VERIFIED</strong> (profile existence and format checks are not enough)
                </span>
              </label>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Evidence requirement</label>
                <select
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-kit-600 focus:outline-none focus:ring-2 focus:ring-kit-600"
                  value={editing.evidenceRequirement}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      evidenceRequirement: e.target.value as CatalogBadge['evidenceRequirement'],
                    })
                  }
                >
                  {EVIDENCE_REQUIREMENTS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Eligible providers (leave all unchecked for any supported platform)
                </label>
                <div className="flex flex-wrap gap-2">
                  {ELIGIBLE_PROVIDERS.map((p) => {
                    const selected = (editing.eligibleProviders ?? []).includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          const current = editing.eligibleProviders ?? [];
                          const next = selected ? current.filter((x) => x !== p) : [...current, p];
                          setEditing({ ...editing, eligibleProviders: next.length ? next : null });
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          selected ? 'bg-kit-600 text-white' : 'bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <Textarea
              label="Monthly award rule (JSON, optional)"
              value={editing.monthlyRule ? JSON.stringify(editing.monthlyRule, null, 2) : ''}
              onChange={(e) => {
                const v = e.target.value.trim();
                if (!v) {
                  setEditing({ ...editing, monthlyRule: null });
                  return;
                }
                try {
                  setEditing({ ...editing, monthlyRule: JSON.parse(v) });
                } catch {
                  setEditing({ ...editing, monthlyRule: { __raw: v } });
                }
              }}
              className="font-mono text-xs"
            />

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveBadge} isLoading={busy} className="gap-2">
                <Save className="h-4 w-4" /> Save badge
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
