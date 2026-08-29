import { cn } from '@/lib/utils';
import { ApplicationStatus, ApplicationType } from '@/types';

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; className: string }
> = {
  SAVED: {
    label: 'Saved',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  INITIATED: {
    label: 'Initiated',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  APPLIED: {
    label: 'Applied',
    className: 'bg-kit-50 text-kit-700 border-kit-200',
  },
  SHORTLISTED: {
    label: 'Shortlisted',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  INTERVIEW: {
    label: 'Interview',
    className: 'bg-kit-50 text-kit-700 border-kit-200',
  },
  SELECTED: {
    label: 'Selected',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    className: 'bg-gray-50 text-gray-500 border-gray-200',
  },
};

const TYPE_CONFIG: Record<
  ApplicationType,
  { label: string; className: string }
> = {
  INTERNSHIP: {
    label: 'Internship',
    className: 'bg-kit-50 text-kit-700 border-kit-200',
  },
  JOB: {
    label: 'Full-time',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  HACKATHON: {
    label: 'Hackathon',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  OTHER: {
    label: 'Other',
    className: 'bg-gray-50 text-gray-600 border-gray-200',
  },
};

const STATUS_FALLBACK = {
  label: 'Unknown',
  className: 'bg-gray-50 text-gray-500 border-gray-200',
};

const TYPE_FALLBACK = {
  label: 'Other',
  className: 'bg-gray-50 text-gray-600 border-gray-200',
};

interface StatusBadgeProps {
  status: ApplicationStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_FALLBACK;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}

interface TypeBadgeProps {
  type: ApplicationType;
  className?: string;
}

export function TypeBadge({ type, className }: TypeBadgeProps) {
  const config = TYPE_CONFIG[type] ?? TYPE_FALLBACK;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
