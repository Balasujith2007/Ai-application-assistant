import { ext, getDefaultApiBase } from '../browser/browser-api';

export type FillPolicy = 'AUTOMATIC' | 'ASK' | 'NEVER';

export interface AgentSettings {
  apiBase: string;
  autoAdvancePages: boolean;
  askBeforeFillSensitive: boolean;
  dryRun: boolean;
  developerMode: boolean;
  fillPolicies: Record<string, FillPolicy>;
}

export interface StoredAuth {
  token: string;
  expiresAt?: number;
  user: { id: string; name: string; email: string; role?: string };
}

const KEYS = {
  auth: 'careerai_auth',
  settings: 'careerai_settings',
  session: 'careerai_last_session',
};

const DEFAULT_POLICIES: Record<string, FillPolicy> = {
  'personal.email': 'AUTOMATIC',
  'personal.phone': 'AUTOMATIC',
  'personal.fullName': 'AUTOMATIC',
  'personal.firstName': 'AUTOMATIC',
  'personal.lastName': 'AUTOMATIC',
  'education.college': 'AUTOMATIC',
  'education.cgpa': 'AUTOMATIC',
  'preferences.expectedSalary': 'AUTOMATIC',
  'preferences.noticePeriod': 'AUTOMATIC',
  'preferences.workAuthorization': 'ASK',
  'personal.gender': 'ASK',
  LEGAL: 'NEVER',
};

export const storage = {
  async getAuth(): Promise<StoredAuth | null> {
    const data = await ext.storage.local.get<{ careerai_auth?: StoredAuth }>(KEYS.auth);
    const auth = data.careerai_auth || null;
    if (auth?.expiresAt && Date.now() > auth.expiresAt) {
      await this.clearAuth();
      return null;
    }
    return auth;
  },
  async setAuth(auth: StoredAuth): Promise<void> {
    await ext.storage.local.set({ [KEYS.auth]: auth });
  },
  async clearAuth(): Promise<void> {
    await ext.storage.local.remove([KEYS.auth, KEYS.session]);
  },
  async getSettings(): Promise<AgentSettings> {
    const data = await ext.storage.local.get<{ careerai_settings?: Partial<AgentSettings> }>(KEYS.settings);
    return {
      apiBase: data.careerai_settings?.apiBase || getDefaultApiBase(),
      autoAdvancePages: data.careerai_settings?.autoAdvancePages ?? false,
      askBeforeFillSensitive: data.careerai_settings?.askBeforeFillSensitive ?? true,
      dryRun: data.careerai_settings?.dryRun ?? false,
      developerMode: data.careerai_settings?.developerMode ?? false,
      fillPolicies: { ...DEFAULT_POLICIES, ...(data.careerai_settings?.fillPolicies || {}) },
    };
  },
  async setSettings(patch: Partial<AgentSettings>): Promise<AgentSettings> {
    const current = await this.getSettings();
    const next: AgentSettings = {
      ...current,
      ...patch,
      fillPolicies: { ...current.fillPolicies, ...(patch.fillPolicies || {}) },
    };
    await ext.storage.local.set({ [KEYS.settings]: next });
    return next;
  },
};

export function resolvePolicy(
  key: string,
  classification: string,
  policies: Record<string, FillPolicy>,
): FillPolicy {
  if (classification === 'LEGAL_FIELD') return 'NEVER';
  if (policies[key]) return policies[key];
  if (classification === 'SENSITIVE_FIELD') return policies['preferences.workAuthorization'] || 'ASK';
  if (classification === 'APPLICATION_SPECIFIC_FIELD') return 'ASK';
  return 'AUTOMATIC';
}
