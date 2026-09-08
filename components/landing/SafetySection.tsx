'use client';

import { Lock, ShieldAlert, AlertCircle, UserCheck, ShieldCheck } from 'lucide-react';

const SAFETY_PILLARS = [
  {
    icon: <Lock className="h-6 w-6 text-kit-600" />,
    title: 'Account-Scoped Data',
    desc: 'Student information is kept connected to the authenticated account and never shared without authorization.',
  },
  {
    icon: <ShieldAlert className="h-6 w-6 text-kit-600" />,
    title: 'CAPTCHA Safety',
    desc: 'The assistant pauses when CAPTCHA requires human interaction. It never attempts bypasses.',
  },
  {
    icon: <AlertCircle className="h-6 w-6 text-kit-600" />,
    title: 'Sensitive Information Control',
    desc: 'Sensitive and important questions require student involvement and direct manual confirmation.',
  },
  {
    icon: <UserCheck className="h-6 w-6 text-kit-600" />,
    title: 'Final Submission Control',
    desc: 'CareerAI assists with preparation but the student remains responsible for final submission.',
  },
];

export default function SafetySection() {
  return (
    <section className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-700 mb-4 shadow-2xs">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Safety & Trust</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            Built with Student Control in Mind
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            We hold strict standards for automation transparency, student consent, and account data boundaries.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SAFETY_PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 shadow-xs hover:border-kit-200 hover:shadow-md transition-all duration-200"
            >
              <div>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-kit-50 border border-kit-100">
                  {pillar.icon}
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-snug mb-2.5">
                  {pillar.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {pillar.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Verified Protocol</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
