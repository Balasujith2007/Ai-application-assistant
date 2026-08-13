'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getToken } from '@/lib/auth';
import Link from 'next/link';

export default function ConnectExtensionPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [status, setStatus] = useState<'idle' | 'waiting' | 'ok' | 'missing' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    const origin = window.location.origin;
    const onMsg = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.origin !== origin) return;
      const data = event.data;
      if (data?.source !== 'careerai-extension') return;
      if (data.type === 'CAREERAI_PONG') setStatus('waiting');
      if (data.type === 'CAREERAI_CONNECTED') {
        if (data.ok) setStatus('ok');
        else {
          setStatus('error');
          setError(data.error || 'Extension rejected the authorization code');
        }
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const connect = async () => {
    setError('');
    const token = getToken();
    if (!token || !user) {
      setStatus('error');
      setError('Log into CareerAI first.');
      return;
    }
    setStatus('waiting');
    const origin = window.location.origin;
    window.postMessage({ source: 'careerai-web', type: 'CAREERAI_PING' }, origin);

    try {
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
      window.postMessage({
        source: 'careerai-web',
        type: 'CAREERAI_CONNECT',
        code: json.code,
        state: json.state,
      }, origin);
    } catch {
      setStatus('error');
      setError('CareerAI connection unavailable.');
      return;
    }

    setTimeout(() => {
      setStatus((s) => (s === 'waiting' ? 'missing' : s));
    }, 2000);
  };

  if (isLoading) return <div className="p-10 text-center text-slate-500">Loading…</div>;

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">CareerAI Apply Agent</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Connect the browser extension</h1>
        <p className="mt-3 text-sm text-slate-600">
          This page issues a one-time authorization code. The extension exchanges it for a short-lived token.
          Your website JWT is never posted to the page, and the external job site never sees your password.
        </p>

        {!isAuthenticated ? (
          <p className="mt-6 text-sm">
            Please <Link href="/login" className="font-semibold text-indigo-700 underline">log in</Link> first.
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-slate-700">Signed in as <strong>{user?.name}</strong> ({user?.email})</p>
            <button onClick={() => void connect()} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">
              Connect extension
            </button>
            {status === 'ok' && <p className="text-sm font-medium text-emerald-700">Extension connected. You can close this tab.</p>}
            {status === 'missing' && (
              <p className="text-sm text-amber-700">
                Extension not detected. Load <code>application-auto-agent/dist</code> as an unpacked extension, then try again.
              </p>
            )}
            {status === 'error' && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}

        <ol className="mt-8 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>Chrome → chrome://extensions → Developer mode → Load unpacked → select <code>application-auto-agent/dist</code></li>
          <li>Return here and click Connect</li>
          <li>Open an application URL (or <Link href="/test-apply" className="underline">/test-apply</Link>)</li>
        </ol>
      </div>
    </div>
  );
}
