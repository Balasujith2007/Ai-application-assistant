import { CanonicalFieldKey, FIELD_ALIASES } from './aliases';
import { classifyField, normalizeLabel } from './classifier';

export interface MappingHit {
  key: CanonicalFieldKey | string;
  confidence: number;
  method: 'exact' | 'alias' | 'autocomplete' | 'memory' | 'semantic';
  classification: ReturnType<typeof classifyField>;
}

export interface StoredMapping {
  fieldPattern: string;
  mappedField: string;
  confidence: number;
  verified: boolean;
  siteHost?: string;
}

const AUTOCOMPLETE_MAP: Record<string, CanonicalFieldKey> = {
  'given-name': 'personal.firstName',
  'family-name': 'personal.lastName',
  'name': 'personal.fullName',
  'email': 'personal.email',
  'tel': 'personal.phone',
  'bday': 'personal.dateOfBirth',
  'sex': 'personal.gender',
  'organization': 'education.college',
  'street-address': 'preferences.preferredLocation',
  'url': 'links.portfolio',
};

export function matchField(
  signals: {
    label?: string;
    name?: string;
    id?: string;
    placeholder?: string;
    autocomplete?: string;
    type?: string;
  },
  memory: StoredMapping[] = [],
  siteHost = '',
): MappingHit | null {
  const classification = classifyField(
    [signals.label, signals.placeholder, signals.name, signals.id].filter(Boolean).join(' '),
  );

  const autocomplete = (signals.autocomplete || '').toLowerCase().split(' ').pop() || '';
  if (autocomplete && AUTOCOMPLETE_MAP[autocomplete]) {
    return {
      key: AUTOCOMPLETE_MAP[autocomplete],
      confidence: 0.97,
      method: 'autocomplete',
      classification,
    };
  }

  const combined = normalizeLabel(
    [signals.label, signals.placeholder, signals.name, signals.id].filter(Boolean).join(' '),
  );
  if (!combined) return null;

  const siteMemory = memory.filter((m) => m.verified && m.siteHost && m.siteHost === siteHost);
  const globalMemory = memory.filter((m) => m.verified && (!m.siteHost || m.siteHost === ''));

  for (const pool of [siteMemory, globalMemory]) {
    for (const m of pool) {
      if (combined === m.fieldPattern || combined.includes(m.fieldPattern) || m.fieldPattern.includes(combined)) {
        return {
          key: m.mappedField,
          confidence: Math.min(0.99, m.confidence),
          method: 'memory',
          classification,
        };
      }
    }
  }

  let best: MappingHit | null = null;
  for (const [key, aliases] of Object.entries(FIELD_ALIASES) as [CanonicalFieldKey, string[]][]) {
    for (const alias of aliases) {
      if (combined === alias) {
        return { key, confidence: 0.99, method: 'exact', classification };
      }
      if (combined.includes(alias) || alias.includes(combined)) {
        const confidence = combined === alias ? 0.99 : alias.length / Math.max(combined.length, alias.length) > 0.6 ? 0.92 : 0.82;
        if (!best || confidence > best.confidence) {
          best = { key, confidence, method: 'alias', classification };
        }
      }
    }
  }

  return best;
}

export function customKeyFromLabel(label: string): string {
  const norm = normalizeLabel(label)
    .replace(/[^a-z0-9\s]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 6)
    .map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join('');
  return norm || `field${Date.now()}`;
}
