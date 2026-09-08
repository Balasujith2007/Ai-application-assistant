'use client';

import Link from 'next/link';
import { Check, Circle, ArrowRight, UserCheck } from 'lucide-react';

const PROFILE_ITEMS = [
  { label: 'Personal Information', completed: true },
  { label: 'Education', completed: true },
  { label: 'Skills', completed: true },
  { label: 'Projects', completed: true },
  { label: 'Experience', completed: false, action: 'Optional for freshers' },
  { label: 'Career Preferences', completed: true },
];

export default function ProfileCompletionSection() {
  return (
    <section className="bg-slate-50/70 py-24 border-y border-slate-200/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Info Column */}
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-kit-200 bg-kit-50 px-3.5 py-1 text-xs font-semibold text-kit-700 mb-4">
                <UserCheck className="h-3.5 w-3.5" />
                <span>Single Source of Truth</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Complete Once. Use Throughout Your Career Journey.
              </h2>
              <p className="mt-4 text-base text-slate-600 leading-relaxed">
                Build your CareerAI profile once and keep your important career information organized in one place.
              </p>

              <div className="mt-8 space-y-3 text-sm text-slate-700">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span>Instant resume synchronization</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span>Automated eligibility check for campus drives</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span>Direct mapping to AI Apply Assistant</span>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-kit-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-kit-700 transition-colors"
                >
                  <span>Build Your Profile</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Right Interactive Card Column */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 shadow-xs">
                {/* Header score */}
                <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      PROFILE COMPLETION
                    </span>
                    <h4 className="text-lg font-bold text-slate-900">Student Profile</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-kit-600">85%</span>
                    <p className="text-[11px] text-emerald-600 font-semibold">PROFILE SCORE</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-6 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-kit-600 rounded-full w-[85%]" />
                </div>

                {/* Checklist items */}
                <div className="space-y-2.5">
                  {PROFILE_ITEMS.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-xl bg-white border border-slate-200/80 px-3.5 py-2 text-xs font-medium"
                    >
                      <div className="flex items-center gap-2.5">
                        {item.completed ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        ) : (
                          <Circle className="h-5 w-5 text-slate-300 stroke-[1.5]" />
                        )}
                        <span className={item.completed ? 'text-slate-800 font-medium' : 'text-slate-500'}>
                          {item.label}
                        </span>
                      </div>

                      {item.completed ? (
                        <span className="text-[11px] font-bold text-emerald-600">✓ Completed</span>
                      ) : (
                        <span className="text-[11px] text-slate-400">{item.action}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
