'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * Shared header for dedicated student gamification pages.
 * Keeps navigation and typography consistent across the new sidebar pages.
 */
export function StudentPageHeader({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/dashboard/student')}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-2xs transition hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Overview</span>
        </button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-gray-900 sm:text-2xl">
            <span>{title}</span>
            {badge}
          </h1>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
