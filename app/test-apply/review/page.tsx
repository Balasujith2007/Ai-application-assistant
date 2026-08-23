'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function readAll(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const p1 = JSON.parse(sessionStorage.getItem('careerai_test_page1') || '{}');
    const p2 = JSON.parse(sessionStorage.getItem('careerai_test_page2') || '{}');
    const p3 = JSON.parse(sessionStorage.getItem('careerai_test_page3') || '{}');
    const resumeName = sessionStorage.getItem('careerai_test_resume') || '';
    const merged = { ...p1, ...p2, ...p3, ...(resumeName ? { resume: resumeName } : {}) };
    return Object.fromEntries(Object.entries(merged).map(([k, v]) => [k, String(v ?? '')]));
  } catch {
    return {};
  }
}

export default function TestApplyReview() {
  const router = useRouter();
  const [data] = useState<Record<string, string>>(readAll);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem('careerai_test_submitted', JSON.stringify(data));
    router.push('/test-apply/done');
  };

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-xl font-bold">Review &amp; submit</h2>
      <p className="text-sm text-slate-600">
        The Apply Agent must <strong>not</strong> click Submit. You confirm and submit.
      </p>
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="rounded-lg bg-slate-50 p-3">
            <dt className="text-xs uppercase text-slate-500">{k}</dt>
            <dd className="font-medium text-slate-900 whitespace-pre-wrap">{v || '—'}</dd>
          </div>
        ))}
      </dl>
      <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white">
        Submit application
      </button>
    </form>
  );
}
