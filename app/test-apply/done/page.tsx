'use client';

import Link from 'next/link';

export default function TestApplyDone() {
  return (
    <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-8">
      <h2 className="text-xl font-bold text-emerald-900">Application submitted</h2>
      <p className="text-emerald-800">
        You clicked Submit — not the agent. Reload /test-apply/page-1 to confirm learned fields
        (expected salary, notice period, work authorization) autofill without asking again.
      </p>
      <Link href="/test-apply" className="inline-flex text-sm font-semibold text-indigo-700 underline">
        Run the test again
      </Link>
    </div>
  );
}
