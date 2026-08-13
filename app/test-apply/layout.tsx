import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'CareerAI Test Application' };

export default function TestApplyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-careerai-test-app="true" className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">CareerAI lab</p>
            <h1 className="text-lg font-bold">Acme Internship Application</h1>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">Test site — not a real employer</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
    </div>
  );
}
