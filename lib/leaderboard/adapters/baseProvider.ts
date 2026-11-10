import { ProviderErrorKind, ProviderId } from './providerTypes';

/**
 * Shared plumbing for external provider adapters.
 *
 * Centralizes the three things every integration needs and previously
 * re-implemented inconsistently: bounded-timeout HTTP, provider error
 * classification, and a small in-process response cache so we respect provider
 * rate limits when several students sync the same handle in a burst.
 */

export interface ProviderRequestOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  /** Number of retries for transient failures (timeouts / 5xx / 429). */
  retries?: number;
}

export interface ProviderHttpResponse {
  status: number;
  ok: boolean;
  body: string;
}

export class ProviderRequestError extends Error {
  readonly kind: ProviderErrorKind;
  readonly status?: number;
  readonly retryAfterMs?: number;

  constructor(kind: ProviderErrorKind, message: string, status?: number, retryAfterMs?: number) {
    super(message);
    this.name = 'ProviderRequestError';
    this.kind = kind;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRIES = 1;
const RETRY_BACKOFF_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Performs a bounded HTTP request and classifies any failure into a
 * `ProviderErrorKind`. Never throws a raw fetch error past this boundary.
 */
export async function requestWithTimeout(
  url: string,
  options: ProviderRequestOptions = {},
): Promise<ProviderHttpResponse> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const method = options.method ?? 'GET';

  let lastError: ProviderRequestError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        headers: options.headers,
        body: options.body,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.status === 429) {
        const retryAfter = res.headers.get('retry-after');
        const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;
        throw new ProviderRequestError('RATE_LIMITED', 'Provider rate limit reached.', 429, retryAfterMs);
      }
      if (res.status >= 500) {
        throw new ProviderRequestError('PROVIDER_ERROR', `Provider responded ${res.status}`, res.status);
      }

      const body = await res.text();
      return { status: res.status, ok: res.ok, body };
    } catch (err: any) {
      clearTimeout(timer);
      if (err instanceof ProviderRequestError) {
        lastError = err;
      } else if (err?.name === 'AbortError') {
        lastError = new ProviderRequestError('TIMEOUT', `Request timed out after ${timeoutMs}ms.`);
      } else {
        lastError = new ProviderRequestError('NETWORK_ERROR', err?.message || 'Network error.');
      }

      const retryable = lastError.kind === 'TIMEOUT' || lastError.kind === 'PROVIDER_ERROR';
      if (attempt < retries && retryable) {
        await sleep(RETRY_BACKOFF_MS * (attempt + 1));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new ProviderRequestError('NETWORK_ERROR', 'Unknown provider error.');
}

// ─────────────────────────────────────────────────────────────────────────────
// Response cache (respects provider rate limits; opt-in per adapter)
// ─────────────────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cacheStore = new Map<string, CacheEntry<unknown>>();

export function cacheKey(provider: ProviderId, operation: string, ...parts: (string | number)[]): string {
  return [provider, operation, ...parts].join(':');
}

export async function withCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<{ value: T; fromCache: boolean }> {
  const now = Date.now();
  const hit = cacheStore.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > now) {
    return { value: hit.value, fromCache: true };
  }

  const value = await loader();
  cacheStore.set(key, { value, expiresAt: now + ttlMs });
  return { value, fromCache: false };
}

/** Test-only helper so the mocked-provider suite can run deterministically. */
export function clearProviderCache(): void {
  cacheStore.clear();
}

/**
 * Parses JSON defensively. Providers occasionally return HTML error pages with
 * a 200 status; we treat a parse failure as PROVIDER_ERROR rather than crashing.
 */
export function parseJson<T>(raw: string, context: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new ProviderRequestError('PROVIDER_ERROR', `${context}: response was not valid JSON.`);
  }
}
