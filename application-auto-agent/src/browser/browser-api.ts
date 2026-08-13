/**
 * Browser compatibility layer.
 *
 * Chrome / Edge / Brave expose `chrome.*`.
 * Firefox exposes `browser.*` (promises) and sometimes `chrome.*`.
 * We always return Promise-based helpers so the rest of the code stays the same.
 */

type BrowserLike = typeof chrome;

function getApi(): BrowserLike {
  const root = globalThis as unknown as { browser?: BrowserLike; chrome?: BrowserLike };
  const api = root.browser || root.chrome;
  if (!api) {
    throw new Error('This script must run inside a browser extension.');
  }
  return api;
}

export const ext = {
  runtime: {
    sendMessage<T = unknown>(message: unknown): Promise<T> {
      const api = getApi();
      return new Promise((resolve, reject) => {
        try {
          api.runtime.sendMessage(message, (response: T) => {
            const err = api.runtime.lastError;
            if (err) reject(new Error(err.message));
            else resolve(response);
          });
        } catch (e) {
          reject(e);
        }
      });
    },
    onMessage: {
      addListener(fn: (message: unknown, sender: chrome.runtime.MessageSender, sendResponse: (r?: unknown) => void) => boolean | void) {
        getApi().runtime.onMessage.addListener(fn as never);
      },
    },
    getURL(path: string) {
      return getApi().runtime.getURL(path);
    },
  },
  storage: {
    local: {
      async get<T extends Record<string, unknown>>(keys?: string[] | string | null): Promise<T> {
        const api = getApi();
        return new Promise((resolve) => {
          api.storage.local.get(keys ?? null, (items) => resolve(items as T));
        });
      },
      async set(items: Record<string, unknown>): Promise<void> {
        const api = getApi();
        return new Promise((resolve) => {
          api.storage.local.set(items, () => resolve());
        });
      },
      async remove(keys: string | string[]): Promise<void> {
        const api = getApi();
        return new Promise((resolve) => {
          api.storage.local.remove(keys, () => resolve());
        });
      },
    },
  },
  tabs: {
    async query(info: chrome.tabs.QueryInfo) {
      const api = getApi();
      return new Promise<chrome.tabs.Tab[]>((resolve) => {
        api.tabs.query(info, (tabs) => resolve(tabs));
      });
    },
  },
};

export function getDefaultApiBase(): string {
  return 'http://localhost:3000';
}
