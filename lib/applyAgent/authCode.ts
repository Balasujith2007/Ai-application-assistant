import crypto from 'crypto';

const CODE_TTL_MS = 2 * 60 * 1000;

export function hashAuthCode(code: string): string {
  return crypto.createHash('sha256').update(code, 'utf8').digest('hex');
}

export function generateAuthCode(ttlMs = CODE_TTL_MS): {
  code: string;
  state: string;
  hash: string;
  expiresAt: Date;
} {
  const code = crypto.randomBytes(32).toString('hex');
  const state = crypto.randomBytes(16).toString('hex');
  return {
    code,
    state,
    hash: hashAuthCode(code),
    expiresAt: new Date(Date.now() + ttlMs),
  };
}

export function isCodeExpired(expiresAt: Date, now = new Date()): boolean {
  return now.getTime() >= expiresAt.getTime();
}

export function isCodeConsumed(usedAt: Date | null | undefined): boolean {
  return !!usedAt;
}

export function isCodeStateValid(expectedState: string, providedState: string): boolean {
  return !!expectedState && expectedState === providedState;
}

export function evaluateAuthCode(input: {
  expectedState: string;
  providedState: string;
  expiresAt: Date;
  usedAt?: Date | null;
  now?: Date;
}): 'OK' | 'INVALID_STATE' | 'CONSUMED' | 'EXPIRED' {
  if (!isCodeStateValid(input.expectedState, input.providedState)) return 'INVALID_STATE';
  if (isCodeConsumed(input.usedAt)) return 'CONSUMED';
  if (isCodeExpired(input.expiresAt, input.now)) return 'EXPIRED';
  return 'OK';
}
