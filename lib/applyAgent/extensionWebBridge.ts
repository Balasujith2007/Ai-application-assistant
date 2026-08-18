/**
 * Website-side helpers for the CareerAI Apply Agent bridge.
 *
 * A normal webpage does NOT have chrome.runtime.sendMessage.
 * The page talks to the content script with window.postMessage to the page origin only.
 * The content script (isolated world) then uses chrome.runtime.sendMessage.
 */

export const EXT_BRIDGE_WEB = 'careerai-web';
export const EXT_BRIDGE_EXT = 'careerai-extension';

export type ExtBridgeIncoming =
  | { source: typeof EXT_BRIDGE_EXT; type: 'CAREERAI_PONG' }
  | { source: typeof EXT_BRIDGE_EXT; type: 'CAREERAI_UNAVAILABLE'; error?: string }
  | { source: typeof EXT_BRIDGE_EXT; type: 'CAREERAI_CONNECTED'; ok?: boolean; error?: string };

export function isTrustedExtensionMessage(event: MessageEvent, expectedOrigin: string): event is MessageEvent<ExtBridgeIncoming> {
  if (typeof window !== 'undefined' && event.source != null && event.source !== window) return false;
  if (event.origin !== expectedOrigin) return false;
  const data = event.data;
  if (!data || data.source !== EXT_BRIDGE_EXT) return false;
  if (typeof data.type !== 'string') return false;
  return true;
}

export function humanizeConnectError(raw: unknown): string {
  const msg = String((raw as Error)?.message || raw || '').trim();
  if (
    !msg
    || /sendMessage/i.test(msg)
    || /cannot read propert/i.test(msg)
    || /TypeError/i.test(msg)
    || /context invalidated/i.test(msg)
    || /receiving end does not exist/i.test(msg)
    || /EXTENSION_RUNTIME/i.test(msg)
  ) {
    return 'Could not reach the CareerAI extension. Reload the extension, refresh this page, then click Connect again.';
  }
  return msg;
}

export function connectTimeoutMessage(kind: 'pong' | 'connected'): string {
  if (kind === 'pong') {
    return 'Extension not detected. Load application-auto-agent/dist as an unpacked extension, refresh this page, then try again.';
  }
  return 'The extension did not finish connecting in time. Reload the extension, refresh this page, then click Connect again.';
}
