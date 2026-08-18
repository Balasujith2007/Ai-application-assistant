import { describe, expect, it } from 'vitest';
import {
  hasRuntimeSendMessage,
  isExtensionRuntimeAvailable,
  mapRuntimeError,
  pickExtensionApi,
} from '../browser/browser-api';
import {
  connectTimeoutMessage,
  humanizeConnectError,
  isTrustedExtensionMessage,
} from '../../../lib/applyAgent/extensionWebBridge';

describe('extension runtime picker', () => {
  it('does not use a page chrome stub that has no runtime.sendMessage', () => {
    const pageChrome = { loadTimes() { return null; } };
    expect(hasRuntimeSendMessage(pageChrome)).toBe(false);
    expect(pickExtensionApi({ chrome: pageChrome })).toBeNull();
    expect(isExtensionRuntimeAvailable({ chrome: pageChrome })).toBe(false);
  });

  it('prefers chrome.runtime over a stub browser object', () => {
    const sendMessage = () => undefined;
    const chrome = { runtime: { sendMessage, id: 'ext-id' } };
    const browser = {};
    const picked = pickExtensionApi({ chrome, browser });
    expect(picked).toBe(chrome);
  });

  it('falls back to browser.runtime when chrome has no sendMessage', () => {
    const sendMessage = () => undefined;
    const chrome = { loadTimes() { return null; } };
    const browser = { runtime: { sendMessage, id: 'ext-id' } };
    expect(pickExtensionApi({ chrome, browser })).toBe(browser);
  });

  it('maps TypeError sendMessage failures to a connect instruction', () => {
    const mapped = mapRuntimeError(new TypeError("Cannot read properties of undefined (reading 'sendMessage')"));
    expect(mapped).not.toMatch(/TypeError/);
    expect(mapped).toMatch(/Reload the extension/i);
  });
});

describe('website bridge must not assume chrome.runtime', () => {
  it('rejects messages from the wrong origin', () => {
    const event = {
      source: globalThis,
      origin: 'https://evil.example',
      data: { source: 'careerai-extension', type: 'CAREERAI_PONG' },
    } as MessageEvent;
    expect(isTrustedExtensionMessage(event, 'http://localhost:3000')).toBe(false);
  });

  it('accepts same-origin extension replies', () => {
    const event = {
      source: undefined,
      origin: 'http://localhost:3000',
      data: { source: 'careerai-extension', type: 'CAREERAI_CONNECTED', ok: true },
    } as MessageEvent;
    expect(isTrustedExtensionMessage(event, 'http://localhost:3000')).toBe(true);
  });

  it('never surfaces a raw sendMessage TypeError to the user', () => {
    expect(humanizeConnectError("TypeError: Cannot read properties of undefined (reading 'sendMessage')"))
      .toBe('Could not reach the CareerAI extension. Reload the extension, refresh this page, then click Connect again.');
    expect(connectTimeoutMessage('pong')).toMatch(/Extension not detected/);
  });
});
