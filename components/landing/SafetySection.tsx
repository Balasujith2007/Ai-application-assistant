'use client';

import React from 'react';
import { Lock, ShieldAlert, AlertCircle, UserCheck, ShieldCheck } from 'lucide-react';

const SAFETY_PILLARS = [
  {
    number: '01',
    category: 'DATA ISOLATION',
    icon: Lock,
    title: 'Account-Scoped Data',
    desc: 'Student information is kept strictly connected to the authenticated account and never shared without explicit authorization.',
    protocolStatus: 'Zero External Leakage',
  },
  {
    number: '02',
    category: 'CAPTCHA INTEGRITY',
    icon: ShieldAlert,
    title: 'CAPTCHA Safety',
    desc: 'The assistant automatically pauses when CAPTCHA requires human interaction. It never attempts bypasses or automated solves.',
    protocolStatus: 'Human-in-the-Loop',
  },
  {
    number: '03',
    category: 'MANUAL OVERRIDE',
    icon: AlertCircle,
    title: 'Sensitive Info Control',
    desc: 'Sensitive, legal, and critical questions require explicit student involvement and direct manual confirmation before filling.',
    protocolStatus: 'Mandatory Consent',
  },
  {
    number: '04',
    category: 'FINAL CONSENT',
    icon: UserCheck,
    title: 'Final Submission Control',
    desc: 'CareerAI assists with form preparation and validation, but the student always remains solely responsible for the final submission.',
    protocolStatus: '100% Student Oversight',
  },
];

export default function SafetySection() {
  return (
    <section className="py-24 sm:py-28 bg-white relative overflow-hidden">
      {/* Ambient background blur */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[450px] w-[800px] rounded-full bg-[#FFF5F6]/60 blur-3xl opacity-70" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-4 py-1.5 text-xs font-semibold text-emerald-800 mb-4 shadow-2xs">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Safety & Trust Architecture</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#0F172A] leading-tight">
            Built with Student Control{' '}
            <span className="text-[#C51F3A]">in Mind</span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-[#64748B] leading-relaxed max-w-2xl mx-auto font-normal">
            We hold strict standards for automation transparency, student consent, and account data boundaries.
          </p>
        </div>

        {/* 4-Column SaaS Security Cards Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
          {SAFETY_PILLARS.map((pillar) => {
            const IconComponent = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="group relative flex flex-col justify-between rounded-[26px] border border-slate-200/90 bg-gradient-to-b from-white via-white to-slate-50/40 p-6 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-300 hover:border-[#F5CED6] hover:shadow-[0_16px_36px_-10px_rgba(197,31,58,0.08)] hover:-translate-y-1.5 overflow-hidden"
              >
                {/* Top Glowing Accent Line on Hover */}
                <div className="pointer-events-none absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-[#C51F3A]/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Card Top Area */}
                <div>
                  {/* Header: 3D Platform Icon + Pillar Index */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="relative flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFF5F6] to-[#FFF0F2] border border-[#FCE7EB] text-[#C51F3A] shadow-2xs transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-hover:shadow-[#C51F3A]/10">
                      <IconComponent className="h-6 w-6 stroke-[1.8]" />
                      {/* Micro corner accent */}
                      <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#C51F3A] border border-white shadow-2xs" />
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black tracking-widest text-slate-400">
                        PILLAR {pillar.number}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#C51F3A] mt-0.5">
                        {pillar.category}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight leading-snug group-hover:text-[#A30D2D] transition-colors">
                    {pillar.title}
                  </h3>

                  <p className="mt-2.5 text-xs sm:text-sm text-[#64748B] leading-relaxed font-normal">
                    {pillar.desc}
                  </p>
                </div>

                {/* Footer: Verified Protocol Pill */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Verified Protocol</span>
                    </div>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">
                    {pillar.protocolStatus}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
