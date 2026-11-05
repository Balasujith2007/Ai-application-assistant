'use client';

import React from 'react';
import { StudentPageHeader } from '@/components/dashboard/StudentPageHeader';
import { CareerGrowthPanel } from '@/components/dashboard/CareerGrowthPanel';

/**
 * Dedicated Weekly Career Growth page.
 * Retains the standalone route (still directly reachable) while its content is
 * also surfaced on the Career Progress page via the shared CareerGrowthPanel.
 */
export default function CareerGrowthPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <StudentPageHeader
        title="Weekly Career Growth"
        subtitle="Your career growth score, category breakdown and assigned Mystery Gift tier."
      />

      <CareerGrowthPanel />
    </div>
  );
}
