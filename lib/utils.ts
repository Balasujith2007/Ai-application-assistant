import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getDaysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const now = new Date();
  const target = getNormalizedDeadline(dateStr);
  if (!target) return null;
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Normalizes an opportunity deadline.
 * If the date has no explicit time component (i.e. 00:00:00.000),
 * it converts it to the end of that local day (23:59:59.999).
 */
export function getNormalizedDeadline(deadline: string | Date | null | undefined): Date | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return null;

  if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0) {
    d.setHours(23, 59, 59, 999);
  }
  return d;
}

/**
 * Consistently determines whether an opportunity registration is still open.
 * Checks Opportunity.status (DRAFT/PUBLISHED/CLOSED) and actual normalized deadline timestamps.
 */
export function isOpportunityOpen(
  deadline: string | Date | null | undefined,
  status?: string | null
): boolean {
  if (status === 'CLOSED' || status === 'DRAFT') return false;
  const normalized = getNormalizedDeadline(deadline);
  if (!normalized) return true;
  return new Date().getTime() <= normalized.getTime();
}
