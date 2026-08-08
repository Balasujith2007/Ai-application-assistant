'use client';

import React from 'react';
import { AlertTriangle, Target, Flame, BellRing, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertType = 'application_deadline' | 'interview_scheduled' | 'high_priority_task' | 'general';

interface DeadlineAlertProps {
  type: AlertType;
  message: string;
  subtext?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function DeadlineAlert({
  type,
  message,
  subtext,
  actionText,
  onAction,
  className,
}: DeadlineAlertProps) {
  const configs = {
    application_deadline: {
      icon: AlertTriangle,
      bg: 'bg-amber-50/90 border-amber-200 text-amber-900',
      iconColor: 'text-amber-600',
      badgeBg: 'bg-amber-100 text-amber-800',
      tag: 'APPLICATION DEADLINE',
    },
    interview_scheduled: {
      icon: Target,
      bg: 'bg-indigo-50/90 border-indigo-200 text-indigo-900',
      iconColor: 'text-indigo-600',
      badgeBg: 'bg-indigo-100 text-indigo-800',
      tag: 'INTERVIEW ALERT',
    },
    high_priority_task: {
      icon: Flame,
      bg: 'bg-rose-50/90 border-rose-200 text-rose-900',
      iconColor: 'text-rose-600',
      badgeBg: 'bg-rose-100 text-rose-800',
      tag: 'HIGH PRIORITY TASK',
    },
    general: {
      icon: BellRing,
      bg: 'bg-blue-50/90 border-blue-200 text-blue-900',
      iconColor: 'text-blue-600',
      badgeBg: 'bg-blue-100 text-blue-800',
      tag: 'PLACEMENT ALERT',
    },
  };

  const config = configs[type] || configs.general;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-xl border p-4 shadow-sm transition-all hover:shadow-md',
        config.bg,
        className,
      )}
    >
      <div className="flex items-center gap-3.5">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-xs', config.iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase', config.badgeBg)}>
              {config.tag}
            </span>
          </div>
          <p className="mt-0.5 text-sm font-semibold tracking-tight">{message}</p>
          {subtext && <p className="text-xs opacity-80 mt-0.5 font-medium">{subtext}</p>}
        </div>
      </div>

      {actionText && (
        <button
          onClick={onAction}
          className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold shadow-xs hover:bg-gray-50 transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
