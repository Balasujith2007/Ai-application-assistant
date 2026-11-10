'use client';

import React, { Suspense } from 'react';
import { Briefcase, TrendingUp, Award } from 'lucide-react';
import LoginCard from '@/components/auth/LoginCard';

const FEATURES = [
  {
    icon: Briefcase,
    text: 'Discover internships and job opportunities.',
  },
  {
    icon: TrendingUp,
    text: 'Track applications and career progress.',
  },
  {
    icon: Award,
    text: 'Showcase achievements and coding milestones.',
  },
];

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full bg-[#F6F7F9] lg:grid lg:grid-cols-[1.05fr_minmax(0,0.95fr)]">
      {/* ── Left: Brand Experience (desktop) ───────────────────────── */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-kit-800 via-kit-700 to-kit-900 p-12 lg:flex lg:flex-col lg:justify-between xl:p-16">
        {/* Restrained decorative glows */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-kit-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-16 h-96 w-96 rounded-full bg-kit-400/15 blur-3xl" />

        {/* Logo + Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
            <img src="/kit-logo.png" alt="CareerAI Logo" className="h-full w-full object-contain" />
          </span>
          <span className="text-xl font-bold tracking-tight text-white">CareerAI</span>
        </div>

        {/* Message */}
        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-bold leading-[1.15] tracking-tight text-white xl:text-[2.6rem]">
            Your Career Journey Starts Here.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            One platform to discover opportunities, build your professional profile, and accelerate your career.
          </p>

          <ul className="mt-9 space-y-5">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.text} className="flex items-start gap-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-inset ring-white/15">
                    <Icon className="h-[18px] w-[18px] text-white" />
                  </span>
                  <span className="pt-1.5 text-sm leading-relaxed text-white/85">
                    {feature.text}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer note */}
        <div className="relative z-10 text-xs text-white/45">
          © {new Date().getFullYear()} CareerAI. All rights reserved.
        </div>
      </aside>

      {/* ── Right: Login Form ──────────────────────────────────────── */}
      <main className="flex min-h-screen flex-col bg-[#F6F7F9]">
        {/* Compact brand header — mobile & tablet only */}
        <div className="flex flex-col items-center px-6 pb-2 pt-10 text-center lg:hidden">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
              <img src="/kit-logo.png" alt="CareerAI Logo" className="h-full w-full object-contain" />
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-900">CareerAI</span>
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
            Your Career Journey Starts Here.
          </h2>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-10 xl:px-16">
          <div className="w-full max-w-[440px]">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_12px_44px_-14px_rgba(15,23,42,0.14)] sm:p-8">
              <Suspense
                fallback={
                  <div className="py-12 text-center text-sm text-slate-400">
                    Loading authentication...
                  </div>
                }
              >
                <LoginCard />
              </Suspense>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
