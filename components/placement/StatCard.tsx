'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  bg?: string;
  subtitle?: string;
  trend?: string;
  onClick?: () => void;
  index?: number;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color = 'text-kit-600',
  bg = 'bg-kit-50',
  subtitle,
  trend,
  onClick,
  index = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={cn(
        'group flex flex-col justify-between rounded-2xl border border-gray-200/90 bg-white p-3.5 sm:p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm hover:border-gray-300 min-w-0 w-full box-border',
        onClick && 'cursor-pointer',
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn('flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 shrink-0', bg, color)}>
          <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
        </div>
        {trend && (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-emerald-700 shrink-0">
            {trend}
          </span>
        )}
      </div>

      <div className="mt-2.5 sm:mt-3 min-w-0">
        <p className="text-[11px] sm:text-xs font-semibold text-gray-500 truncate">{label}</p>
        <p className="text-lg sm:text-xl font-extrabold tracking-tight text-gray-900 mt-0.5 tabular-nums truncate">{value}</p>
        {subtitle && (
          <p className="mt-0.5 text-[10px] sm:text-[11px] text-gray-400 font-medium truncate">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
}
