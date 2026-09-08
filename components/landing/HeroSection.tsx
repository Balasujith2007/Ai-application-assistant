'use client';

import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-14 pb-16 md:pt-20 md:pb-20 text-center">
      {/* Background radial highlight */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex justify-center">
        <div className="h-[400px] w-[680px] rounded-full bg-kit-50/70 blur-3xl opacity-90" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-kit-200 bg-kit-50 px-4 py-1.5 text-xs sm:text-sm font-semibold text-kit-700 shadow-2xs mb-8">
            <span className="text-kit-600 font-bold">✦</span>
            <span>Built for college students & placement departments</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl md:text-7xl leading-[1.1]">
            YOUR CAREER JOURNEY.{' '}
            <span className="text-kit-600 block sm:inline">SMARTER.</span>
          </h1>

          {/* Supporting Text */}
          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg md:text-xl text-slate-600 leading-relaxed font-normal">
            CareerAI helps students manage resumes, applications, internships,
            hackathons and career opportunities from one intelligent platform.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3.5 sm:flex-row sm:gap-4">
            <Link
              href="/register"
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-kit-600 px-8 py-3.5 text-base font-semibold text-white shadow-md shadow-kit-600/20 hover:bg-kit-700 hover:shadow-lg hover:shadow-kit-600/30 active:scale-[0.99] transition-all duration-200 sm:w-auto"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#features"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-8 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 active:scale-[0.99] transition-all sm:w-auto shadow-2xs"
            >
              <span>Explore Features</span>
            </a>
          </div>

          {/* Trust / Benefits Row */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm font-medium text-slate-600">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-3 w-3 stroke-[3]" />
              </div>
              <span>100% Free for Students</span>
            </div>
            <div className="hidden sm:block text-slate-300">•</div>
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-3 w-3 stroke-[3]" />
              </div>
              <span>Placement Cell Integrated</span>
            </div>
            <div className="hidden sm:block text-slate-300">•</div>
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-3 w-3 stroke-[3]" />
              </div>
              <span>Instant Setup</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
