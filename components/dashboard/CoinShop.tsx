'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Coins, Loader2, ShoppingBag, Check } from 'lucide-react';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  itemType: string;
  coinPrice: number;
  itemValue: string;
  rewardType: string;
  rarity: string;
  purchaseLimit: number;
  owned: boolean;
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `shop_${crypto.randomUUID()}`;
  }
  return `shop_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

const ITEM_ICON: Record<string, string> = {
  FRAME: '🖼️',
  TITLE: '🏷️',
  BADGE: '🎖️',
  SHOWCASE: '✨',
};

export function CoinShop() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const fetchShop = useCallback(async () => {
    try {
      const res = await fetch('/api/shop', { headers: getAuthHeader() });
      const json = await res.json();
      if (json.success) {
        setItems(json.items);
        setBalance(json.balance);
      } else {
        setError(json.message || 'Unable to load shop.');
      }
    } catch {
      setError('Unable to load shop.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShop();
  }, [fetchShop]);

  const purchase = useCallback(
    async (item: ShopItem) => {
      setPendingId(item.id);
      setToast('');
      try {
        // Idempotency key is generated once per user action. The server resolves
        // the price from the RewardDefinition; no price is sent from the client.
        const res = await fetch('/api/shop/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify({ rewardDefId: item.id, idempotencyKey: newIdempotencyKey() }),
        });
        const json = await res.json();
        if (json.success) {
          setToast(`Purchased ${item.name}`);
          await fetchShop();
        } else {
          setToast(json.message || 'Purchase failed');
        }
      } catch {
        setToast('Purchase failed');
      } finally {
        setPendingId(null);
        setTimeout(() => setToast(''), 3000);
      }
    },
    [fetchShop]
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

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-2xs overflow-hidden">
      <div className="border-b border-gray-100 p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-[#990024]" /> Coin Shop
          </h2>
          <p className="mt-1 text-xs text-gray-500">Spend coins on cosmetics. Prices are set by the platform.</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-100 px-3 py-1.5">
          <Coins className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-black text-amber-700 tabular-nums">{balance.toLocaleString()}</span>
        </div>
      </div>

      {toast && (
        <div className="px-4 pt-2">
          <span className="text-[11px] font-semibold text-[#990024] bg-rose-50 px-2 py-1 rounded-full">{toast}</span>
        </div>
      )}

      <div className="p-4">
        {error ? (
          <p className="text-sm text-gray-500">{error}</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
            <ShoppingBag className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No items are available in the shop right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((item) => {
              const affordable = balance >= item.coinPrice;
              const disabled = item.owned || !affordable || pendingId === item.id;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-gray-100 p-3 flex flex-col justify-between"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{ITEM_ICON[item.itemType] ?? '🎁'}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-500 line-clamp-2">{item.description}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {item.rarity} · {item.itemType}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-black text-amber-600 tabular-nums flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5" /> {item.coinPrice.toLocaleString()}
                    </span>
                    <button
                      disabled={disabled}
                      onClick={() => purchase(item)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full disabled:opacity-50 flex items-center gap-1 ${
                        item.owned ? 'bg-emerald-50 text-emerald-600' : 'bg-[#990024] text-white'
                      }`}
                    >
                      {item.owned ? (
                        <>
                          <Check className="h-3 w-3" /> Owned
                        </>
                      ) : pendingId === item.id ? (
                        'Buying…'
                      ) : affordable ? (
                        'Buy'
                      ) : (
                        'Not enough coins'
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
