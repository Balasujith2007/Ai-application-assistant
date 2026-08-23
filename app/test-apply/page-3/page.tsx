'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Form3 = {
  phone: string;
  linkedinUrl: string;
  githubUrl: string;
};

const empty: Form3 = { phone: '', linkedinUrl: '', githubUrl: '' };

function readSaved(): Form3 {
  if (typeof window === 'undefined') return empty;
  try {
    const saved = sessionStorage.getItem('careerai_test_page3');
    return saved ? { ...empty, ...JSON.parse(saved) } : empty;
  } catch {
    return empty;
  }
}

export default function TestApplyPage3() {
  const router = useRouter();
  const [form, setForm] = useState<Form3>(readSaved);
  const [dynamicVisible, setDynamicVisible] = useState(false);
  const [dynamicValue, setDynamicValue] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof Form3, string>>>({});
  const [resumeName, setResumeName] = useState<string>('');
  const resumeRef = useRef<HTMLInputElement>(null);

  // Dynamic field appears after 2 seconds — simulates AJAX
  useEffect(() => {
    const t = setTimeout(() => setDynamicVisible(true), 2000);
    return () => clearTimeout(t);
  }, []);

  function validate(): boolean {
    const errs: Partial<Record<keyof Form3, string>> = {};
    if (!form.phone.trim()) errs.phone = 'Phone number is required.';
    else if (!/^\+?[\d\s\-()]{7,}$/.test(form.phone.trim())) errs.phone = 'Please enter a valid phone number.';
    if (form.linkedinUrl && !/linkedin\.com/.test(form.linkedinUrl)) errs.linkedinUrl = 'Enter a valid LinkedIn URL.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    sessionStorage.setItem('careerai_test_page3', JSON.stringify({ ...form, dynamicAnswer: dynamicValue }));
    router.push('/test-apply/review');
  };

  return (
    <form onSubmit={onSubmit} data-careerai-test-app="true" className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-xl font-bold">Page 3 — Contact &amp; Documents</h2>
      <p className="text-sm text-slate-600">
        Tests resume upload, dynamic fields (appear after 2s), and validation errors.
      </p>

      {/* Phone — validated field */}
      <div>
        <label htmlFor="phone" className="text-sm font-medium">Phone Number *</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          value={form.phone}
          autoComplete="tel"
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          aria-invalid={!!errors.phone}
          className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm ${errors.phone ? 'border-red-400' : 'border-slate-300'}`}
          placeholder="+91 98765 43210"
          required
        />
        {errors.phone && (
          <p role="alert" className="mt-1 text-xs text-red-600">{errors.phone}</p>
        )}
      </div>

      {/* LinkedIn URL */}
      <div>
        <label htmlFor="linkedinUrl" className="text-sm font-medium">LinkedIn Profile URL</label>
        <input
          id="linkedinUrl"
          name="linkedinUrl"
          type="url"
          value={form.linkedinUrl}
          autoComplete="url"
          onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
          aria-invalid={!!errors.linkedinUrl}
          className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm ${errors.linkedinUrl ? 'border-red-400' : 'border-slate-300'}`}
          placeholder="https://linkedin.com/in/yourprofile"
        />
        {errors.linkedinUrl && (
          <p role="alert" className="mt-1 text-xs text-red-600">{errors.linkedinUrl}</p>
        )}
      </div>

      {/* GitHub URL */}
      <div>
        <label htmlFor="githubUrl" className="text-sm font-medium">GitHub Profile URL</label>
        <input
          id="githubUrl"
          name="githubUrl"
          type="url"
          value={form.githubUrl}
          autoComplete="url"
          onChange={(e) => setForm((f) => ({ ...f, githubUrl: e.target.value }))}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          placeholder="https://github.com/yourprofile"
        />
      </div>

      {/* Resume upload — browser security test */}
      <div>
        <label htmlFor="resume3" className="text-sm font-medium">Resume / CV</label>
        <input
          id="resume3"
          name="resume"
          type="file"
          accept=".pdf,.doc,.docx"
          ref={resumeRef}
          onChange={(e) => {
            const name = e.target.files?.[0]?.name || '';
            setResumeName(name);
            if (name) sessionStorage.setItem('careerai_test_resume', name);
            else sessionStorage.removeItem('careerai_test_resume');
          }}
          className="mt-1 block w-full text-sm"
        />
        {resumeName && (
          <p className="mt-1 text-xs text-emerald-600">Selected: {resumeName}</p>
        )}
        <p className="mt-1 text-xs text-slate-500">
          Agent must pause here — browsers block programmatic file selection.
        </p>
      </div>

      {/* Dynamic field — appears after 2 seconds via useEffect */}
      {dynamicVisible && (
        <div id="dynamic-field-container">
          <label htmlFor="portfolioUrl" className="text-sm font-medium">
            Portfolio / Personal Website <span className="text-xs text-amber-600">(loaded dynamically)</span>
          </label>
          <input
            id="portfolioUrl"
            name="portfolioUrl"
            type="url"
            value={dynamicValue}
            onChange={(e) => setDynamicValue(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="https://yourwebsite.com"
          />
          <p className="mt-1 text-xs text-slate-500">
            This field appeared 2s after page load. Agent&apos;s MutationObserver should detect it.
          </p>
        </div>
      )}

      <button
        type="submit"
        className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white"
      >
        Continue to Review
      </button>
    </form>
  );
}
