'use client';

import Link from 'next/link';
import { ArrowRight, Zap } from 'lucide-react';

export default function FinalCTA() {
  return (
    <section className="py-20 bg-white relative overflow-hidden">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl border border-kit-200 bg-gradient-to-br from-kit-50/70 via-white to-kit-50/40 p-8 sm:p-14 text-center shadow-xl shadow-kit-900/5">
          <div className="mx-auto max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-kit-200 bg-white px-4 py-1.5 text-xs font-bold text-kit-700 shadow-2xs mb-6">
              <Zap className="h-3.5 w-3.5 text-kit-600" />
              <span>100% Free for Students • Instant Setup</span>
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Your Career Journey Starts Here.
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-base sm:text-lg text-slate-600 leading-relaxed">
              Build your profile, discover opportunities and take control of your professional future.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <Link
                href="/register"
                className="group flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-kit-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-kit-600/20 hover:bg-kit-700 hover:shadow-xl hover:shadow-kit-600/30 transition-all duration-200"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#features"
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-8 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <span>Explore CareerAI</span>
              </a>
            </div>

            <p className="mt-6 text-xs text-slate-500">
              Join thousands of students and placement departments using CareerAI.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
