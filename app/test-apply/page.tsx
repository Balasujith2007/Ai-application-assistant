'use client';

import Link from 'next/link';

export default function TestApplyLanding() {
  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-bold">Software Engineering Intern — Summer 2026</h2>
      <p className="text-slate-600">
        This is a <strong>local test application</strong> for the CareerAI Apply Agent. It mimics a real
        multi-page internship form: CAPTCHA → profile fields → essays → review → submit.
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
        <li>Install the extension from <code>application-auto-agent/dist</code></li>
        <li>Sign in to CareerAI in the extension popup (or open /connect-extension)</li>
        <li>Click Start application below</li>
        <li>Complete the fake CAPTCHA yourself — the agent must pause</li>
        <li>Watch known fields fill; answer missing ones; choose Save or Use once</li>
        <li>On the last page, review and submit yourself</li>
      </ol>
      <Link
        href="/test-apply/verify"
        onClick={() => {
          try {
            sessionStorage.removeItem('careerai_test_page1');
            sessionStorage.removeItem('careerai_test_page2');
            sessionStorage.removeItem('careerai_test_submitted');
          } catch {
            /* ignore */
          }
        }}
        className="inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        Start application
      </Link>
    </div>
  );
}
