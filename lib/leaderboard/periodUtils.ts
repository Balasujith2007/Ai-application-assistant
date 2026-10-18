import { PeriodType } from './types';

/**
 * Period utilities for deterministic time-zone-aware leaderboard periods
 */

export function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number, make Sunday day 7
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return weekNo;
}

export function getWeeklyPeriodKey(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

export function getMonthlyPeriodKey(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  return `${year}-M${month.toString().padStart(2, '0')}`;
}

export function getSemesterPeriodKey(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  // Semester 1: July - Dec (Odd Semester), Semester 2: Jan - June (Even Semester)
  const month = date.getUTCMonth() + 1;
  const sem = month >= 7 ? 'S1' : 'S2';
  return `${year}-${sem}`;
}

export function getAllTimePeriodKey(): string {
  return 'ALL_TIME';
}

export function getPeriodKey(type: PeriodType, date: Date = new Date()): string {
  switch (type) {
    case 'WEEKLY':
      return getWeeklyPeriodKey(date);
    case 'MONTHLY':
      return getMonthlyPeriodKey(date);
    case 'SEMESTER':
      return getSemesterPeriodKey(date);
    case 'ALL_TIME':
    default:
      return getAllTimePeriodKey();
  }
}

export function getPreviousPeriodKey(type: PeriodType, date: Date = new Date()): string | null {
  switch (type) {
    case 'WEEKLY': {
      const prevWeek = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);
      return getWeeklyPeriodKey(prevWeek);
    }
    case 'MONTHLY': {
      const prevMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
      return getMonthlyPeriodKey(prevMonth);
    }
    case 'SEMESTER': {
      const month = date.getUTCMonth() + 1;
      const year = date.getUTCFullYear();
      if (month >= 7) {
        // Current is S1 (Jul-Dec), previous is S2 (Jan-Jun) same year
        return `${year}-S2`;
      } else {
        // Current is S2 (Jan-Jun), previous is S1 (Jul-Dec) previous year
        return `${year - 1}-S1`;
      }
    }
    case 'ALL_TIME':
    default:
      return null;
  }
}

export function getPeriodDetails(type: PeriodType, date: Date = new Date()): {
  type: PeriodType;
  key: string;
  displayName: string;
  startDate: string;
  endDate: string;
} {
  const key = getPeriodKey(type, date);
  const now = new Date(date);

  switch (type) {
    case 'WEEKLY': {
      const day = now.getUTCDay() || 7;
      const monday = new Date(now);
      monday.setUTCDate(now.getUTCDate() - day + 1);
      monday.setUTCHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setUTCDate(monday.getUTCDate() + 6);
      sunday.setUTCHours(23, 59, 59, 999);

      return {
        type,
        key,
        displayName: `Week ${getWeekNumber(now)}, ${now.getUTCFullYear()}`,
        startDate: monday.toISOString(),
        endDate: sunday.toISOString(),
      };
    }
    case 'MONTHLY': {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      const monthName = now.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });

      return {
        type,
        key,
        displayName: `${monthName} ${now.getUTCFullYear()}`,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
    }
    case 'SEMESTER': {
      const month = now.getUTCMonth() + 1;
      const year = now.getUTCFullYear();
      const isOdd = month >= 7;
      const start = isOdd
        ? new Date(Date.UTC(year, 6, 1))
        : new Date(Date.UTC(year, 0, 1));
      const end = isOdd
        ? new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))
        : new Date(Date.UTC(year, 5, 30, 23, 59, 59, 999));

      return {
        type,
        key,
        displayName: `${isOdd ? 'Odd Semester (Fall)' : 'Even Semester (Spring)'} ${year}`,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
    }
    case 'ALL_TIME':
    default:
      return {
        type: 'ALL_TIME',
        key: 'ALL_TIME',
        displayName: 'All-Time Leaderboard',
        startDate: new Date(Date.UTC(2025, 0, 1)).toISOString(),
        endDate: new Date(Date.UTC(2030, 11, 31)).toISOString(),
      };
  }
}
