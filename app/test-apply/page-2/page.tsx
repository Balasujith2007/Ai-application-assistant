'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Form2 = {
  preferredLocation: string;
  expectedAnnual: string;
  whyCompany: string;
  leadership: string;
  howHeard: string;
  accuracy: boolean;
};

const empty: Form2 = {
  preferredLocation: '',
  expectedAnnual: '',
  whyCompany: '',
  leadership: '',
  howHeard: '',
  accuracy: false,
};

function readSaved(): Form2 {
  if (typeof window === 'undefined') return empty;
  try {
    const saved = sessionStorage.getItem('careerai_test_page2');
    return saved ? { ...empty, ...JSON.parse(saved) } : empty;
  } catch {
    return empty;
  }
}

const HEARD = ['LinkedIn', 'CareerAI', 'Campus', 'Other'];

export default function TestApplyPage2() {
  const router = useRouter();
  const [form, setForm] = useState<Form2>(readSaved);
  const [open, setOpen] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem('careerai_test_page2', JSON.stringify(form));
    router.push('/test-apply/page-3');
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-xl font-bold">Page 2 — Additional questions</h2>

      <div>
        <label htmlFor="preferredLocation" className="text-sm font-medium">Preferred Location</label>
        <input
          id="preferredLocation"
          name="preferredLocation"
          value={form.preferredLocation}
          onChange={(e) => setForm((f) => ({ ...f, preferredLocation: e.target.value }))}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          placeholder="e.g. Bangalore"
        />
      </div>

      <div>
        <label htmlFor="expectedAnnual" className="text-sm font-medium">Expected Annual Compensation</label>
        <input
          id="expectedAnnual"
          name="expectedAnnualCompensation"
          value={form.expectedAnnual}
          onChange={(e) => setForm((f) => ({ ...f, expectedAnnual: e.target.value }))}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          placeholder="Should map to preferences.expectedSalary"
        />
        <p className="mt-1 text-xs text-slate-500">If you saved Expected Salary on page 1, this should auto-fill from mapping memory.</p>
      </div>

      <div>
        <label htmlFor="whyCompany" className="text-sm font-medium">Why do you want to join this company?</label>
        <textarea
          id="whyCompany"
          name="whyCompany"
          value={form.whyCompany}
          onChange={(e) => setForm((f) => ({ ...f, whyCompany: e.target.value }))}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          rows={4}
        />
        <p className="mt-1 text-xs text-slate-500">Application-specific — should not be saved as a permanent profile field.</p>
      </div>

      <div>
        <label htmlFor="leadership" className="text-sm font-medium">Tell us about a time you demonstrated leadership.</label>
        <textarea
          id="leadership"
          name="leadership"
          value={form.leadership}
          onChange={(e) => setForm((f) => ({ ...f, leadership: e.target.value }))}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          rows={4}
        />
        <p className="mt-1 text-xs text-slate-500">If your profile has no leadership story, the agent must ask — never invent one.</p>
      </div>

      <div data-careerai-custom-dropdown="true">
        <p className="text-sm font-medium">How did you hear about us? (custom dropdown)</p>
        <button
          type="button"
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-left text-sm"
          onClick={() => setOpen((o) => !o)}
        >
          {form.howHeard || 'Select…'}
        </button>
        {open && (
          <ul className="mt-1 rounded-xl border border-slate-200 bg-white shadow-sm">
            {HEARD.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => { setForm((f) => ({ ...f, howHeard: opt })); setOpen(false); }}
                >
                  {opt}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-xs text-slate-500">Agent should pause — it must not click arbitrary custom widgets.</p>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="accuracyDeclaration"
          checked={form.accuracy}
          onChange={(e) => setForm((f) => ({ ...f, accuracy: e.target.checked }))}
        />
        <span>I certify that the information above is accurate and I agree to the terms.</span>
      </label>
      <p className="text-xs text-slate-500">Legal declaration — agent must never auto-tick.</p>

      <button type="submit" className="rounded-xl bg-kit-600 px-5 py-2.5 text-sm font-semibold text-white">
        Continue
      </button>
    </form>
  );
}
