import { User } from '@/types';

export const TOKEN_KEY = 'token';
export const USER_KEY = 'user';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getDashboardRoute(role: string): string {
  const routes: Record<string, string> = {
    STUDENT: '/dashboard/student',
    MENTOR: '/dashboard/mentor',
    FACULTY: '/dashboard/faculty',
    HOD: '/dashboard/hod',
    PLACEMENT_CELL: '/dashboard/placement',
    ADMIN: '/dashboard/admin',
    SUPER_ADMIN: '/dashboard/super-admin',
  };
  return routes[role] || '/dashboard/student';
}
