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
        'group flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-gray-300',
        onClick && 'cursor-pointer',
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105', bg, color)}>
          <Icon className="h-6 w-6" />
        </div>
        {trend && (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            {trend}
          </span>
        )}
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-bold tracking-tight text-gray-900 mt-0.5">{value}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-gray-400 font-medium">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
}
