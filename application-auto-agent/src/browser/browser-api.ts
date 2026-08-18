/**
 * Browser compatibility layer.
 *
 * Chrome / Edge / Brave expose `chrome.*` with `runtime.sendMessage`.
 * Firefox exposes `browser.*` (often Promise-based).
 *
 * A normal webpage may also have a stub `window.chrome` (no runtime).
 * Never call sendMessage unless the chosen API actually has it.
 */

type RuntimeLike = {
  sendMessage: (...args: unknown[]) => unknown;
  lastError?: { message?: string };
  id?: string;
  getURL?: (path: string) => string;
  onMessage?: { addListener: (fn: never) => void };
};

type ExtensionApiLike = {
  runtime?: RuntimeLike;
  storage?: {
    local: {
      get: (keys: string[] | string | null, cb: (items: unknown) => void) => void;
      set: (items: Record<string, unknown>, cb: () => void) => void;
      remove: (keys: string | string[], cb: () => void) => void;
    };
  };
  tabs?: {
    query: (info: chrome.tabs.QueryInfo, cb: (tabs: chrome.tabs.Tab[]) => void) => void;
  };
};

export function hasRuntimeSendMessage(api: unknown): api is ExtensionApiLike {
  try {
    if (!api || typeof api !== 'object') return false;
    const runtime = (api as ExtensionApiLike).runtime;
    return typeof runtime?.sendMessage === 'function';
  } catch {
    return false;
  }
}

/** Prefer chrome (MV3 Edge/Chrome) over a possible stub `browser` object. */
export function pickExtensionApi(root: { chrome?: unknown; browser?: unknown }): ExtensionApiLike | null {
  if (hasRuntimeSendMessage(root.chrome)) return root.chrome;
  if (hasRuntimeSendMessage(root.browser)) return root.browser;
  return null;
}

export function isExtensionRuntimeAvailable(root: { chrome?: unknown; browser?: unknown } = globalThis as { chrome?: unknown; browser?: unknown }): boolean {
  try {
    const api = pickExtensionApi(root);
    if (!api?.runtime || typeof api.runtime.sendMessage !== 'function') return false;
    if (typeof api.runtime.id === 'string') return api.runtime.id.length > 0;
    return true;
  } catch {
    return false;
  }
}

export function mapRuntimeError(err: unknown): string {
  const msg = String((err as Error)?.message || err || '');
  if (
    !msg
    || /sendMessage/i.test(msg)
    || /cannot read propert/i.test(msg)
    || /undefined/i.test(msg) && /runtime/i.test(msg)
    || /context invalidated/i.test(msg)
    || /receiving end does not exist/i.test(msg)
    || /message port closed/i.test(msg)
    || /EXTENSION_RUNTIME/i.test(msg)
  ) {
    return 'Could not reach the CareerAI extension. Reload the extension, refresh this page, then click Connect again.';
  }
  return msg;
}

function getApi(): ExtensionApiLike {
  const api = pickExtensionApi(globalThis as { chrome?: unknown; browser?: unknown });
  if (!api?.runtime) {
    throw new Error('EXTENSION_RUNTIME_UNAVAILABLE');
  }
  return api;
}

export const ext = {
  runtime: {
    sendMessage<T = unknown>(message: unknown): Promise<T> {
      const api = getApi();
      const runtime = api.runtime!;
      return new Promise((resolve, reject) => {
        let settled = false;
        const done = (err: Error | null, value?: T) => {
          if (settled) return;
          settled = true;
          if (err) reject(new Error(mapRuntimeError(err)));
          else resolve(value as T);
        };
        try {
          const result = runtime.sendMessage(message, (response: T) => {
            const last = runtime.lastError;
            if (last?.message) done(new Error(last.message));
            else done(null, response);
          });
          if (result && typeof (result as Promise<T>).then === 'function') {
            (result as Promise<T>).then(
              (value) => done(null, value),
              (err) => done(err instanceof Error ? err : new Error(String(err))),
            );
          }
        } catch (e) {
          done(e instanceof Error ? e : new Error(String(e)));
        }
      });
    },
    onMessage: {
      addListener(fn: (message: unknown, sender: chrome.runtime.MessageSender, sendResponse: (r?: unknown) => void) => boolean | void) {
        getApi().runtime?.onMessage?.addListener(fn as never);
      },
    },
    getURL(path: string) {
      return getApi().runtime?.getURL?.(path) || path;
    },
  },
  storage: {
    local: {
      async get<T extends Record<string, unknown>>(keys?: string[] | string | null): Promise<T> {
        const api = getApi();
        return new Promise((resolve, reject) => {
          try {
            api.storage!.local.get(keys ?? null, (items) => resolve(items as T));
          } catch (e) {
            reject(e);
          }
        });
      },
      async set(items: Record<string, unknown>): Promise<void> {
        const api = getApi();
        return new Promise((resolve, reject) => {
          try {
            api.storage!.local.set(items, () => resolve());
          } catch (e) {
            reject(e);
          }
        });
      },
      async remove(keys: string | string[]): Promise<void> {
        const api = getApi();
        return new Promise((resolve, reject) => {
          try {
            api.storage!.local.remove(keys, () => resolve());
          } catch (e) {
            reject(e);
          }
        });
      },
    },
  },
  tabs: {
    async query(info: chrome.tabs.QueryInfo) {
      const api = getApi();
      return new Promise<chrome.tabs.Tab[]>((resolve, reject) => {
        try {
          api.tabs!.query(info, (tabs) => resolve(tabs));
        } catch (e) {
          reject(e);
        }
      });
    },
  },
};

export function getDefaultApiBase(): string {
  return 'http://localhost:3000';
}
