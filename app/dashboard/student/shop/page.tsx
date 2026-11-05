'use client';

import React, { useEffect, useState } from 'react';
import { History, Loader2, ShoppingBag } from 'lucide-react';
import { StudentPageHeader } from '@/components/dashboard/StudentPageHeader';
import { CoinShop } from '@/components/dashboard/CoinShop';

interface PurchaseRow {
  id: string;
  itemName: string;
  itemType: string;
  coinPrice: number;
  status: string;
  createdAt: string;
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Dedicated Coin Shop page.
 * Reuses the existing CoinShop component (backed by /api/shop and
 * /api/shop/purchase) and the existing purchase history from /api/inventory.
 */
export default function CoinShopPage() {
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/inventory', { headers: getAuthHeader() });
        const json = await res.json();
        if (!cancelled && json.success && Array.isArray(json.purchaseHistory)) {
          setPurchases(json.purchaseHistory);
        }
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <StudentPageHeader
        title="Coin Shop"
        subtitle="Spend your coins on cosmetics. Prices are set by the platform."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CoinShop />
        </div>

        {/* Purchase history */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs">
          <div className="border-b border-gray-100 p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <History className="h-4 w-4 text-[#990024]" /> Purchase History
            </h2>
            <p className="mt-1 text-xs text-gray-500">Your cosmetic purchases and refunds.</p>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : purchases.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
                <ShoppingBag className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-xs text-gray-500">No purchases yet.</p>
              </div>
            ) : (
              <ul className="max-h-[420px] space-y-2 overflow-y-auto">
                {purchases.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-gray-900">{p.itemName}</p>
                      <p className="mt-0.5 text-[10px] text-gray-400">
                        {p.itemType} · {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tabular-nums text-[11px] font-black text-amber-600">
                        {p.coinPrice} coins
                      </p>
                      <span
                        className={`text-[9px] font-semibold ${
                          p.status === 'REFUNDED' ? 'text-gray-500' : 'text-emerald-600'
                        }`}
                      >
                        {p.status === 'REFUNDED' ? 'Refunded' : 'Active'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
