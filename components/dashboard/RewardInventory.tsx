'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Gift,
  Shield,
  Sparkles,
  Flame,
  TrendingUp,
  Clock,
  CheckCircle,
  Loader2,
  History,
  Coins,
  ShoppingBag,
  Award,
} from 'lucide-react';

interface BalanceData {
  totalXp: number;
  availableCoins: number;
  totalBadges: number;
  totalRewards: number;
}

interface RescueToken {
  id: string;
  awardedAt: string;
  expiresAt: string | null;
}

export interface TokenInventoryData {
  streakRescue: {
    available: RescueToken[];
    usedCount: number;
    expiredCount: number;
    eligibleDates: string[];
    rulesEnabled: boolean;
  };
  leaderboardBoost: {
    available: RescueToken[];
    usedCount: number;
    expiredCount: number;
    status: { available: boolean; reason: string; activeDays: number; rankingNeutral: boolean };
  };
}

interface OwnedFrame {
  rewardDefId: string;
  name: string;
  url: string;
  rarity: string;
  source: string;
  equipped: boolean;
}
interface OwnedTitle {
  rewardDefId: string;
  name: string;
  rarity: string;
  source: string;
  equipped: boolean;
}
interface OwnedBadge {
  badgeId: string;
  title: string;
  icon: string;
  tier: string;
  source: string;
  equipped: boolean;
  showcased: boolean;
}
interface CosmeticsData {
  frames: OwnedFrame[];
  titles: OwnedTitle[];
  badges: OwnedBadge[];
  showcaseBadgeIds: string[];
}

interface CoinTx {
  id: string;
  amount: number;
  transactionType: string;
  reason: string;
  createdAt: string;
  newBalance: number;
}

interface ShopPurchaseRow {
  id: string;
  itemName: string;
  itemType: string;
  itemValue: string;
  coinPrice: number;
  status: string;
  createdAt: string;
  refundedAt: string | null;
}

interface InventoryData {
  balance: BalanceData;
  gifts: { available: any[]; claimed: any[] };
  tokens: TokenInventoryData;
  cosmetics: CosmeticsData;
  coinHistory: CoinTx[];
  purchaseHistory: ShopPurchaseRow[];
}

type TabKey = 'balance' | 'gifts' | 'tokens' | 'cosmetics' | 'history';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'balance', label: 'Balance', icon: <Wallet className="h-4 w-4" /> },
  { key: 'gifts', label: 'Gifts', icon: <Gift className="h-4 w-4" /> },
  { key: 'tokens', label: 'Tokens', icon: <Shield className="h-4 w-4" /> },
  { key: 'cosmetics', label: 'Cosmetics', icon: <Sparkles className="h-4 w-4" /> },
  { key: 'history', label: 'History', icon: <History className="h-4 w-4" /> },
];

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function RewardInventory() {
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('balance');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory', { headers: getAuthHeader() });
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.message || 'Unable to load inventory.');
      }
    } catch {
      setError('Unable to load inventory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

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
          await fetchInventory();
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
    [fetchInventory]
  );

  const customizationMutation = useCallback(
    async (payload: Record<string, unknown>) => {
      setBusy(true);
      setToast('');
      try {
        const res = await fetch('/api/profile/customization', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.success) {
          setData((prev) => (prev ? { ...prev, cosmetics: json.cosmetics } : prev));
          setToast('Saved');
        } else {
          setToast(json.message || 'Action failed');
        }
      } catch {
        setToast('Action failed');
      } finally {
        setBusy(false);
        setTimeout(() => setToast(''), 2500);
      }
    },
    []
  );

  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-gray-100 shadow-2xs p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl bg-white border border-gray-100 shadow-2xs p-6">
        <p className="text-sm text-gray-500">{error || 'No inventory data available.'}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-100 p-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-[#990024]" /> Reward Inventory
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Your XP, coins, gifts, tokens, cosmetics, and ledger history
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-gray-50/50 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition border-b-2 whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-[#990024] text-[#990024] bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {toast && (
        <div className="px-4 pt-2">
          <span className="text-[11px] font-semibold text-[#990024] bg-rose-50 px-2 py-1 rounded-full">
            {toast}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="p-4 min-h-[300px]">
        <AnimatePresence mode="wait">
          {activeTab === 'balance' && <BalanceTab key="balance" data={data.balance} />}
          {activeTab === 'gifts' && <GiftsTab key="gifts" data={data.gifts} />}
          {activeTab === 'tokens' && (
            <TokensTab key="tokens" data={data.tokens} busy={busy} onRescue={rescueToken} />
          )}
          {activeTab === 'cosmetics' && (
            <CosmeticsTab
              key="cosmetics"
              data={data.cosmetics}
              busy={busy}
              onMutate={customizationMutation}
            />
          )}
          {activeTab === 'history' && (
            <HistoryTab key="history" coinHistory={data.coinHistory} purchaseHistory={data.purchaseHistory} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BalanceTab({ data }: { data: BalanceData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="grid grid-cols-2 gap-4"
    >
      <BalanceCard
        icon={<TrendingUp className="h-5 w-5" />}
        label="Total XP"
        value={data.totalXp}
        color="text-purple-600"
        bg="bg-purple-50"
      />
      <BalanceCard
        icon={<Wallet className="h-5 w-5" />}
        label="Available Coins"
        value={data.availableCoins}
        color="text-amber-600"
        bg="bg-amber-50"
      />
      <BalanceCard
        icon={<Sparkles className="h-5 w-5" />}
        label="Badges Earned"
        value={data.totalBadges}
        color="text-blue-600"
        bg="bg-blue-50"
      />
      <BalanceCard
        icon={<Gift className="h-5 w-5" />}
        label="Total Rewards"
        value={data.totalRewards}
        color="text-rose-600"
        bg="bg-rose-50"
      />
    </motion.div>
  );
}

function BalanceCard({
  icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={`rounded-xl p-4 border border-gray-100 ${bg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        <div className={`p-1.5 rounded-lg ${color} bg-white`}>{icon}</div>
      </div>
      <p className={`text-2xl font-black ${color} tabular-nums`}>{value.toLocaleString()}</p>
    </div>
  );
}

function GiftsTab({ data }: { data: { available: any[]; claimed: any[] } }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Gift className="h-4 w-4 text-rose-500" /> Available Gifts ({data.available.length})
        </h3>
        {data.available.length === 0 ? (
          <EmptyState icon={<Gift className="h-8 w-8 text-gray-300" />} text="No unclaimed gifts available" />
        ) : (
          <div className="space-y-2">
            {data.available.map((gift) => (
              <GiftCard key={gift.id} gift={gift} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-500" /> Claimed Rewards ({data.claimed.length})
        </h3>
        {data.claimed.length === 0 ? (
          <EmptyState icon={<CheckCircle className="h-8 w-8 text-gray-300" />} text="No claimed rewards yet" />
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {data.claimed.map((gift) => (
              <ClaimedGiftCard key={gift.id} gift={gift} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function GiftCard({ gift }: { gift: any }) {
  return (
    <div className="rounded-xl border border-gray-100 p-3 flex items-center justify-between hover:bg-gray-50 transition">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-100 to-amber-100">
          <Gift className="h-4 w-4 text-purple-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-900">{gift.rewardRarity} Gift</p>
          <p className="text-[10px] text-gray-500">
            Allocated {new Date(gift.allocatedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
        Unclaimed
      </span>
    </div>
  );
}

function ClaimedGiftCard({ gift }: { gift: any }) {
  return (
    <div className="rounded-xl border border-gray-100 p-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-50">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-900">{gift.rewardRarity} Gift</p>
          <p className="text-[10px] text-gray-500">
            Claimed {new Date(gift.claimedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
        Claimed
      </span>
    </div>
  );
}

export function TokensTab({
  data,
  busy,
  onRescue,
}: {
  data: TokenInventoryData;
  busy: boolean;
  onRescue: (tokenId: string) => void;
}) {
  const sr = data.streakRescue;
  const lb = data.leaderboardBoost;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5"
    >
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" /> Streak Rescue Tokens ({sr.available.length})
        </h3>
        <div className="flex flex-wrap gap-2 mb-2">
          <StatPill label="Available" value={sr.available.length} color="text-emerald-600 bg-emerald-50" />
          <StatPill label="Used" value={sr.usedCount} color="text-gray-600 bg-gray-100" />
          <StatPill label="Expired" value={sr.expiredCount} color="text-rose-600 bg-rose-50" />
        </div>
        {sr.available.length === 0 ? (
          <EmptyState icon={<Flame className="h-8 w-8 text-gray-300" />} text="No streak rescue tokens available" />
        ) : (
          <div className="space-y-2">
            {sr.available.map((token) => (
              <TokenCard
                key={token.id}
                token={token}
                type="Streak Rescue"
                icon={<Flame className="h-4 w-4" />}
                color="text-orange-600"
                bg="bg-orange-50"
                actionLabel="Use"
                busy={busy}
                onAction={() => onRescue(token.id)}
              />
            ))}
          </div>
        )}
        {sr.rulesEnabled && sr.eligibleDates.length > 0 && (
          <p className="mt-2 text-[10px] text-gray-500">
            Eligible missed dates: {sr.eligibleDates.join(', ')}
          </p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-500" /> Leaderboard Boost Tokens ({lb.available.length})
        </h3>
        <div className="flex flex-wrap gap-2 mb-2">
          <StatPill label="Available" value={lb.available.length} color="text-emerald-600 bg-emerald-50" />
          <StatPill label="Used" value={lb.usedCount} color="text-gray-600 bg-gray-100" />
          <StatPill label="Expired" value={lb.expiredCount} color="text-rose-600 bg-rose-50" />
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3">
          <p className="text-[11px] font-semibold text-amber-900">
            {lb.status.available ? 'Available' : 'Currently unavailable'}
          </p>
          <p className="text-[10px] text-amber-800/90 mt-0.5 leading-relaxed">{lb.status.reason}</p>
        </div>
      </div>
    </motion.div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${color}`}>
      {label}: {value}
    </span>
  );
}

function TokenCard({
  token,
  type,
  icon,
  color,
  bg,
  actionLabel,
  busy,
  onAction,
}: {
  token: RescueToken;
  type: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  actionLabel?: string;
  busy?: boolean;
  onAction?: () => void;
}) {
  const daysLeft = token.expiresAt
    ? Math.ceil((new Date(token.expiresAt).getTime() - Date.now()) / (1000 * 3600 * 24))
    : null;
  return (
    <div className="rounded-xl border border-gray-100 p-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bg}`}>
          <span className={color}>{icon}</span>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-900">{type}</p>
          <p className="text-[10px] text-gray-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {daysLeft === null ? 'No expiry' : daysLeft <= 0 ? 'Expired' : `Expires in ${daysLeft} days`}
          </p>
        </div>
      </div>
      {actionLabel && onAction ? (
        <button
          disabled={busy}
          onClick={onAction}
          className="text-[10px] font-semibold text-white bg-[#990024] px-2 py-1 rounded-full disabled:opacity-50"
        >
          {actionLabel}
        </button>
      ) : (
        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
          Available
        </span>
      )}
    </div>
  );
}

function CosmeticsTab({
  data,
  busy,
  onMutate,
}: {
  data: CosmeticsData;
  busy: boolean;
  onMutate: (payload: Record<string, unknown>) => void;
}) {
  const [showcase, setShowcase] = useState<string[]>(data.showcaseBadgeIds);

  useEffect(() => {
    setShowcase(data.showcaseBadgeIds);
  }, [data.showcaseBadgeIds]);

  const toggleShowcase = (badgeId: string) => {
    if (showcase.includes(badgeId)) {
      setShowcase(showcase.filter((b) => b !== badgeId));
    } else if (showcase.length < 5) {
      setShowcase([...showcase, badgeId]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5"
    >
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" /> Frames ({data.frames.length})
        </h3>
        {data.frames.length === 0 ? (
          <EmptyState icon={<Sparkles className="h-8 w-8 text-gray-300" />} text="No frames owned" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.frames.map((f) => (
              <CosmeticRow
                key={f.rewardDefId}
                title={f.name}
                subtitle={`${f.rarity} · ${f.source}`}
                equipped={f.equipped}
                busy={busy}
                onEquip={() => onMutate({ action: 'equip', type: 'FRAME', id: f.rewardDefId })}
                onUnequip={() => onMutate({ action: 'unequip', type: 'FRAME' })}
                icon={<span className="text-lg">🖼️</span>}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-500" /> Titles ({data.titles.length})
        </h3>
        {data.titles.length === 0 ? (
          <EmptyState icon={<Award className="h-8 w-8 text-gray-300" />} text="No titles owned" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.titles.map((t) => (
              <CosmeticRow
                key={t.rewardDefId}
                title={t.name}
                subtitle={`${t.rarity} · ${t.source}`}
                equipped={t.equipped}
                busy={busy}
                onEquip={() => onMutate({ action: 'equip', type: 'TITLE', id: t.rewardDefId })}
                onUnequip={() => onMutate({ action: 'unequip', type: 'TITLE' })}
                icon={<span className="text-lg">🏷️</span>}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-500" /> Badges ({data.badges.length})
          </h3>
          <button
            disabled={busy}
            onClick={() => onMutate({ action: 'showcase', badgeIds: showcase })}
            className="text-[11px] font-semibold text-[#990024] hover:underline disabled:opacity-50"
          >
            Save showcase ({showcase.length}/5)
          </button>
        </div>
        {data.badges.length === 0 ? (
          <EmptyState icon={<Shield className="h-8 w-8 text-gray-300" />} text="No badges owned" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.badges.map((b) => (
              <div key={b.badgeId} className="rounded-xl border border-gray-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{b.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{b.title}</p>
                      <p className="text-[10px] text-gray-500">
                        {b.tier} · {b.source}
                      </p>
                    </div>
                  </div>
                  <button
                    disabled={busy}
                    onClick={() =>
                      b.equipped
                        ? onMutate({ action: 'unequip', type: 'BADGE' })
                        : onMutate({ action: 'equip', type: 'BADGE', id: b.badgeId })
                    }
                    className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full disabled:opacity-50 ${
                      b.equipped ? 'bg-[#990024] text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {b.equipped ? 'Equipped' : 'Equip'}
                  </button>
                </div>
                <label className="mt-2 flex items-center gap-1.5 text-[10px] text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showcase.includes(b.badgeId)}
                    onChange={() => toggleShowcase(b.badgeId)}
                  />
                  Showcase
                </label>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function CosmeticRow({
  title,
  subtitle,
  equipped,
  busy,
  onEquip,
  onUnequip,
  icon,
}: {
  title: string;
  subtitle: string;
  equipped: boolean;
  busy: boolean;
  onEquip: () => void;
  onUnequip: () => void;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-100 p-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span>{icon}</span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-gray-900 truncate">{title}</p>
          <p className="text-[10px] text-gray-500">{subtitle}</p>
        </div>
      </div>
      <button
        disabled={busy}
        onClick={equipped ? onUnequip : onEquip}
        className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full disabled:opacity-50 ${
          equipped ? 'bg-[#990024] text-white' : 'bg-gray-100 text-gray-700'
        }`}
      >
        {equipped ? 'Equipped' : 'Equip'}
      </button>
    </div>
  );
}

function HistoryTab({
  coinHistory,
  purchaseHistory,
}: {
  coinHistory: CoinTx[];
  purchaseHistory: ShopPurchaseRow[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5"
    >
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Coins className="h-4 w-4 text-amber-500" /> Coin Transactions ({coinHistory.length})
        </h3>
        {coinHistory.length === 0 ? (
          <EmptyState icon={<Coins className="h-8 w-8 text-gray-300" />} text="No coin transactions yet" />
        ) : (
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {coinHistory.map((tx) => (
              <div key={tx.id} className="rounded-xl border border-gray-100 p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{tx.reason}</p>
                  <p className="text-[10px] text-gray-500">
                    {tx.transactionType} · {new Date(tx.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`text-xs font-black tabular-nums shrink-0 ${
                    tx.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {tx.amount >= 0 ? '+' : ''}
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-[#990024]" /> Purchase History ({purchaseHistory.length})
        </h3>
        {purchaseHistory.length === 0 ? (
          <EmptyState icon={<ShoppingBag className="h-8 w-8 text-gray-300" />} text="No purchases yet" />
        ) : (
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {purchaseHistory.map((p) => (
              <div key={p.id} className="rounded-xl border border-gray-100 p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{p.itemName}</p>
                  <p className="text-[10px] text-gray-500">
                    {p.itemType} · {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-amber-600 tabular-nums">{p.coinPrice} coins</p>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      p.status === 'REFUNDED'
                        ? 'text-gray-600 bg-gray-100'
                        : 'text-emerald-600 bg-emerald-50'
                    }`}
                  >
                    {p.status === 'REFUNDED' ? 'Refunded' : 'Active'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-xs text-gray-500">{text}</p>
    </div>
  );
}
