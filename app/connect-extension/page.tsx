'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getToken } from '@/lib/auth';
import Link from 'next/link';
import {
  EXT_BRIDGE_WEB,
  connectTimeoutMessage,
  humanizeConnectError,
  isTrustedExtensionMessage,
} from '@/lib/applyAgent/extensionWebBridge';

function waitForExtensionEvent<T extends { type: string }>(
  origin: string,
  types: string[],
  timeoutMs: number,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', onMsg);
      reject(new Error(types.includes('CAREERAI_PONG') ? connectTimeoutMessage('pong') : connectTimeoutMessage('connected')));
    }, timeoutMs);
    function onMsg(event: MessageEvent) {
      if (!isTrustedExtensionMessage(event, origin)) return;
      if (!types.includes(event.data.type)) return;
      window.clearTimeout(timer);
      window.removeEventListener('message', onMsg);
      resolve(event.data as unknown as T);
    }
    window.addEventListener('message', onMsg);
  });
}

export default function ConnectExtensionPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [status, setStatus] = useState<'idle' | 'waiting' | 'ok' | 'missing' | 'error'>('idle');
  const [error, setError] = useState('');
  const connecting = useRef(false);

  useEffect(() => {
    const origin = window.location.origin;
    const onMsg = (event: MessageEvent) => {
      if (!isTrustedExtensionMessage(event, origin)) return;
      if (event.data.type === 'CAREERAI_CONNECTED' && event.data.ok) setStatus('ok');
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const connect = async () => {
    if (connecting.current) return;
    connecting.current = true;
    setError('');
    const token = getToken();
    if (!token || !user) {
      connecting.current = false;
      setStatus('error');
      setError('Log into CareerAI first.');
      return;
    }

    const origin = window.location.origin;
    setStatus('waiting');

    try {
      const pingWait = waitForExtensionEvent<{ type: string; error?: string }>(
        origin,
        ['CAREERAI_PONG', 'CAREERAI_UNAVAILABLE'],
        4000,
      );
      window.postMessage({ source: EXT_BRIDGE_WEB, type: 'CAREERAI_PING' }, origin);
      const ping = await pingWait.catch((e: Error) => ({ type: 'TIMEOUT', error: e.message }));

      if (ping.type === 'TIMEOUT' || ping.type === 'CAREERAI_UNAVAILABLE') {
        setStatus(ping.type === 'TIMEOUT' ? 'missing' : 'error');
        setError(humanizeConnectError(ping.error || connectTimeoutMessage('pong')));
        return;
      }

      const res = await fetch('/api/extension/auth/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.code || !json.state) {
        setStatus('error');
        setError(json.message || 'Could not create a one-time authorization code.');
        return;
      }

      const connectedWait = waitForExtensionEvent<{ type: string; ok?: boolean; error?: string }>(
        origin,
        ['CAREERAI_CONNECTED'],
        10000,
      );
      window.postMessage({
        source: EXT_BRIDGE_WEB,
        type: 'CAREERAI_CONNECT',
        code: json.code,
        state: json.state,
      }, origin);
      const connected = await connectedWait;

      if (connected.ok) {
        setStatus('ok');
        setError('');
        return;
      }
      setStatus('error');
      setError(humanizeConnectError(connected.error || 'Extension rejected the authorization code'));
    } catch (e) {
      const msg = humanizeConnectError(e);
      setStatus(/not detected|unpacked extension/i.test(msg) ? 'missing' : 'error');
      setError(msg);
    } finally {
      connecting.current = false;
    }
  };

  if (isLoading) return <div className="p-10 text-center text-slate-500">Loading…</div>;

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-kit-600">CareerAI Apply Agent</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Connect the browser extension</h1>
        <p className="mt-3 text-sm text-slate-600">
          This page issues a one-time authorization code. The extension exchanges it for a short-lived token.
          Your website JWT is never posted to the page, and the external job site never sees your password.
        </p>

        {!isAuthenticated ? (
          <p className="mt-6 text-sm">
            Please <Link href="/login" className="font-semibold text-kit-700 underline">log in</Link> first.
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-slate-700">Signed in as <strong>{user?.name}</strong> ({user?.email})</p>
            <button
              onClick={() => void connect()}
              disabled={status === 'waiting'}
              className="rounded-xl bg-kit-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {status === 'waiting' ? 'Connecting…' : 'Connect extension'}
            </button>
            {status === 'ok' && <p className="text-sm font-medium text-emerald-700">Extension connected. You can close this tab.</p>}
            {status === 'missing' && (
              <p className="text-sm text-amber-700">
                {error || 'Extension not detected.'} Load <code>application-auto-agent/dist</code> as an unpacked
                extension. If you just reloaded it, refresh this page first.
              </p>
            )}
            {status === 'error' && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}

        <ol className="mt-8 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>Edge → edge://extensions → Developer mode → Load unpacked → select <code>application-auto-agent/dist</code></li>
          <li>If you reload the extension, refresh this page before connecting</li>
          <li>Return here and click Connect</li>
          <li>Open an application URL (or <Link href="/test-apply" className="underline">/test-apply</Link>)</li>
        </ol>
      </div>
    </div>
  );
}
