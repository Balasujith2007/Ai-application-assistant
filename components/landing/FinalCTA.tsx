'use client';

import Link from 'next/link';
import { ArrowRight, Zap, Sparkles, GraduationCap, Compass, Briefcase, TrendingUp } from 'lucide-react';

export default function FinalCTA() {
  return (
    <section className="py-20 sm:py-28 bg-white relative overflow-hidden">
      {/* Outer ambient subtle glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[450px] w-[750px] rounded-full bg-[#FFF0F2] blur-3xl opacity-70" />
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl sm:rounded-[36px] border border-[#FCE7EB] bg-gradient-to-b from-white via-[#FFF8F9] to-[#FFF1F3] p-8 sm:p-14 lg:p-16 text-center shadow-[0_20px_50px_-12px_rgba(163,13,45,0.07),0_1px_3px_rgba(0,0,0,0.04)]">
          {/* ========================================================================= */}
          {/* SUBTLE BACKGROUND DECORATIONS (INSIDE CARD)                               */}
          {/* ========================================================================= */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
            {/* Soft Radial Center Blush */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-gradient-to-br from-[#FFE4E8]/60 to-transparent blur-2xl" />

            {/* Top-Left Dotted Grid Accent */}
            <div className="hidden sm:block absolute -top-4 -left-4 opacity-35">
              <svg width="120" height="120" fill="none" viewBox="0 0 120 120">
                <defs>
                  <pattern id="cta-dot-grid" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1.5" fill="#F43F5E" fillOpacity="0.4" />
                  </pattern>
                </defs>
                <rect width="120" height="120" fill="url(#cta-dot-grid)" />
              </svg>
            </div>

            {/* Bottom-Right Dotted Grid Accent */}
            <div className="hidden sm:block absolute -bottom-4 -right-4 opacity-35">
              <svg width="120" height="120" fill="none" viewBox="0 0 120 120">
                <rect width="120" height="120" fill="url(#cta-dot-grid)" />
              </svg>
            </div>

            {/* Minimal Career-Themed Floating Accent Badges (Soft & Low Opacity) */}
            <div className="hidden md:flex absolute top-8 left-10 h-10 w-10 items-center justify-center rounded-2xl bg-white/80 border border-[#FCE7EB] text-[#C51F3A] shadow-xs opacity-75 transform -rotate-6">
              <GraduationCap className="h-5 w-5" />
            </div>

            <div className="hidden md:flex absolute bottom-10 left-12 h-10 w-10 items-center justify-center rounded-2xl bg-white/80 border border-[#FCE7EB] text-[#C51F3A] shadow-xs opacity-75 transform rotate-12">
              <Briefcase className="h-5 w-5" />
            </div>

            <div className="hidden md:flex absolute top-10 right-12 h-10 w-10 items-center justify-center rounded-2xl bg-white/80 border border-[#FCE7EB] text-[#C51F3A] shadow-xs opacity-75 transform rotate-6">
              <Sparkles className="h-5 w-5" />
            </div>

            <div className="hidden md:flex absolute bottom-8 right-10 h-10 w-10 items-center justify-center rounded-2xl bg-white/80 border border-[#FCE7EB] text-[#C51F3A] shadow-xs opacity-75 transform -rotate-12">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CARD FOREGROUND CONTENT                                                   */}
          {/* ========================================================================= */}
          <div className="relative z-10 mx-auto max-w-2xl">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F5CED6] bg-white px-4 py-1.5 text-xs font-semibold text-[#A30D2D] shadow-2xs mb-6 sm:mb-8 transition-transform hover:scale-105">
              <Zap className="h-3.5 w-3.5 fill-[#C51F3A] text-[#C51F3A]" />
              <span>100% Free for Students • Instant Setup</span>
            </div>

            {/* Main Heading */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[46px] font-black tracking-tight text-[#0F172A] leading-[1.18]">
              Your Career Journey <br className="hidden sm:inline" />
              <span className="text-[#C51F3A]">Starts Here.</span>
            </h2>

            {/* Subtitle / Description */}
            <p className="mx-auto mt-4 sm:mt-5 max-w-lg text-sm sm:text-base md:text-lg text-[#64748B] leading-relaxed font-normal">
              Build your profile, discover opportunities and take control of your professional future.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 sm:mt-10 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              {/* Primary Button */}
              <Link
                href="/register"
                className="group flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-[#C51F3A] px-8 py-3.5 text-sm sm:text-base font-bold text-white shadow-lg shadow-[#C51F3A]/25 hover:bg-[#A30D2D] hover:shadow-xl hover:shadow-[#C51F3A]/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4 stroke-[2.5] transition-transform duration-200 group-hover:translate-x-1" />
              </Link>

              {/* Secondary Button */}
              <a
                href="#how-it-works"
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl sm:rounded-2xl border border-slate-200 bg-white px-8 py-3.5 text-sm sm:text-base font-bold text-[#0F172A] hover:bg-slate-50 hover:border-slate-300 hover:text-[#A30D2D] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-xs"
              >
                <span>Explore CareerAI</span>
              </a>
            </div>

            {/* Micro-Copy Trust Supporting Line */}
            <div className="mt-7 sm:mt-8 flex items-center justify-center gap-1.5 text-xs text-[#64748B]">
              <span className="text-[#C51F3A]">✦</span>
              <span>Join thousands of students and placement departments using CareerAI.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
