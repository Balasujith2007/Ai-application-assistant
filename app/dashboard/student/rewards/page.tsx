'use client';

import React from 'react';
import Link from 'next/link';
import { Award } from 'lucide-react';
import { StudentPageHeader } from '@/components/dashboard/StudentPageHeader';
import { RewardInventory } from '@/components/dashboard/RewardInventory';

/**
 * Dedicated Rewards & Inventory page.
 * Reuses the existing RewardInventory component (backed by /api/inventory):
 * weekly Mystery Gifts, claimed rewards, owned cosmetics, coin ledger and
 * purchase history. Available badges are surfaced by the Achievements page.
 */
export default function RewardsInventoryPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <StudentPageHeader
        title="Rewards & Inventory"
        subtitle="Your weekly Mystery Gifts, claimed rewards, badges and owned cosmetics."
      >
        <Link
          href="/dashboard/student/achievements"
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
        >
          <Award className="h-3.5 w-3.5" />
          <span>View Available Badges</span>
        </Link>
      </StudentPageHeader>

      <RewardInventory />
    </div>
  );
}
