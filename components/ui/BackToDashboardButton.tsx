'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getDashboardRoute } from '@/lib/auth';

interface BackToDashboardButtonProps {
  fallbackRoute?: string;
  className?: string;
}

export default function BackToDashboardButton({
  fallbackRoute = '/dashboard/student',
  className = '',
}: BackToDashboardButtonProps) {
  const { user, isAuthenticated } = useAuth();

  // If user is authenticated, route to their role-specific dashboard.
  // Otherwise, use the page-specific fallback dashboard route.
  const targetRoute = isAuthenticated && user?.role
    ? getDashboardRoute(user.role)
    : fallbackRoute;

  return (
    <Link
      href={targetRoute}
      className={`group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 hover:shadow-xs active:translate-y-px transition-all duration-150 ${className}`}
    >
      <ArrowLeft className="h-4 w-4 text-slate-600 transition-transform duration-150 group-hover:-translate-x-0.5 group-hover:text-slate-900" />
      <span>Back to Dashboard</span>
    </Link>
  );
}
