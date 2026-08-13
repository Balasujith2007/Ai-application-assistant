import { bg } from '../api/api-client';
import type { StoredAuth } from '../storage/storage-manager';

export async function login(email: string, password: string) {
  return bg<{ success: boolean; error?: string; auth?: StoredAuth }>({ type: 'LOGIN', email, password });
}

export async function logout() {
  return bg({ type: 'LOGOUT' });
}

export async function getAuth() {
  return bg<{ auth: StoredAuth | null }>({ type: 'GET_AUTH' });
}
