'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Form1 = {
  firstName: string;
  email: string;
  college: string;
  cgpa: string;
  expectedSalary: string;
  noticePeriod: string;
  workAuthorization: string;
};

const empty: Form1 = {
  firstName: '',
  email: '',
  college: '',
  cgpa: '',
  expectedSalary: '',
  noticePeriod: '',
  workAuthorization: '',
};

function readSaved(): Form1 {
  if (typeof window === 'undefined') return empty;
  try {
    const saved = sessionStorage.getItem('careerai_test_page1');
    return saved ? { ...empty, ...JSON.parse(saved) } : empty;
  } catch {
    return empty;
  }
}

export default function TestApplyPage1() {
  const router = useRouter();
  const [form, setForm] = useState<Form1>(readSaved);

  const update = (k: keyof Form1, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem('careerai_test_page1', JSON.stringify(form));
    router.push('/test-apply/page-2');
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-xl font-bold">Page 1 — Candidate details</h2>
      <p className="text-sm text-slate-600">React-controlled inputs (tests native value setters).</p>

      <Field label="First Name" name="firstName" value={form.firstName} onChange={update} autoComplete="given-name" required />
      <Field label="Email" name="email" value={form.email} onChange={update} autoComplete="email" required />
      <Field label="College" name="college" value={form.college} onChange={update} required />
      <Field label="CGPA" name="cgpa" value={form.cgpa} onChange={update} required />
      <Field label="Expected Salary" name="expectedSalary" value={form.expectedSalary} onChange={update} placeholder="e.g. 6 LPA" />
      <Field label="Notice Period" name="noticePeriod" value={form.noticePeriod} onChange={update} placeholder="e.g. 30 days" />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Work Authorization</legend>
        {['Yes', 'No'].map((opt) => (
          <label key={opt} className="mr-4 inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="workAuthorization"
              value={opt}
              checked={form.workAuthorization === opt}
              onChange={(e) => update('workAuthorization', e.target.value)}
            />
            {opt}
          </label>
        ))}
      </fieldset>

      <div>
        <label className="text-sm font-medium" htmlFor="resume">Resume</label>
        <input
          id="resume"
          name="resume"
          type="file"
          accept=".pdf,.doc,.docx"
          className="mt-1 block w-full text-sm"
          onChange={(e) => {
            const name = e.target.files?.[0]?.name || '';
            if (name) sessionStorage.setItem('careerai_test_resume', name);
            else sessionStorage.removeItem('careerai_test_resume');
          }}
        />
      </div>

      <button type="submit" className="rounded-xl bg-kit-600 px-5 py-2.5 text-sm font-semibold text-white">
        Continue
      </button>
    </form>
  );
}

function Field({
  label, name, value, onChange, placeholder, required, autoComplete,
}: {
  label: string;
  name: keyof Form1;
  value: string;
  onChange: (k: keyof Form1, v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-medium">{label}{required ? ' *' : ''}</label>
      <input
        id={name}
        name={name}
        value={value}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(name, e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
