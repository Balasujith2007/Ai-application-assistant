'use client';

import React from 'react';
import Link from 'next/link';
import { GraduationCap, Users, Building2, Check, ArrowRight, Sparkles } from 'lucide-react';

const ROLES = [
  {
    id: 'students',
    number: '01',
    icon: GraduationCap,
    title: 'STUDENTS',
    subtitle: 'Career Trajectory & Automation',
    badge: 'Empowering Careers',
    desc: 'Take complete ownership of your career trajectory with unified opportunity tracking, smart resume management, and intelligent assistance.',
    features: [
      'Smart Profile',
      'Resume Management',
      'Opportunity Tracking',
      'AI Career Assistance',
      'Application Tracking',
    ],
    ctaText: 'Explore Student Portal',
    ctaLink: '/students',
    accentColor: '#C51F3A',
  },
  {
    id: 'mentors',
    number: '02',
    icon: Users,
    title: 'MENTORS',
    subtitle: 'Cohort Guidance & Feedback',
    badge: 'Guidance & Monitoring',
    desc: 'Guide your assigned student cohorts effectively with real-time visibility into their applications, interviews, and career progress.',
    features: [
      'Student Progress Monitoring',
      'Career Guidance',
      'Opportunity Monitoring',
      'Student Insights',
    ],
    ctaText: 'Explore Mentor Portal',
    ctaLink: '/mentors',
    accentColor: '#C51F3A',
  },
  {
    id: 'placement',
    number: '03',
    icon: Building2,
    title: 'PLACEMENT CELL',
    subtitle: 'Institutional Drive Command',
    badge: 'Institutional Command',
    desc: 'Streamline institutional campus recruitment with comprehensive analytics, company relationship tracking, and automated reporting.',
    features: [
      'College-wide Analytics',
      'Opportunity Management',
      'Placement Tracking',
      'Reports and Statistics',
    ],
    ctaText: 'Placement Cell Overview',
    ctaLink: '/placement-cell',
    accentColor: '#C51F3A',
  },
];

export default function RoleSection() {
  return (
    <section id="roles" className="bg-slate-50/70 py-24 sm:py-28 border-y border-slate-200/80 relative overflow-hidden">
      {/* Background Subtle Ambience */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[520px] w-[850px] rounded-full bg-[#FFF5F6]/70 blur-3xl opacity-70" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#F5CED6] bg-[#FFF5F6] px-4 py-1.5 text-xs font-semibold text-[#A30D2D] mb-4 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-[#C51F3A]" />
            <span>Placement Ecosystem</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#0F172A] leading-tight">
            Built for Everyone in the <br className="hidden sm:inline" />
            <span className="text-[#C51F3A]">Placement Ecosystem</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#64748B] leading-relaxed max-w-2xl mx-auto font-normal">
            Connect students, faculty mentors, and institutional placement cells on a unified, high-performance architecture.
          </p>
        </div>

        {/* 3-Column SaaS Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          {ROLES.map((role) => {
            const IconComponent = role.icon;
            return (
              <div
                key={role.id}
                className="group relative flex flex-col justify-between rounded-[28px] sm:rounded-[32px] border border-slate-200/90 bg-white p-7 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-300 hover:border-[#F5CED6] hover:shadow-[0_20px_40px_-12px_rgba(197,31,58,0.09)] hover:-translate-y-1.5 overflow-hidden"
              >
                {/* Top Subtle Glowing Accent Line */}
                <div className="pointer-events-none absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-[#C51F3A]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Top Content Area */}
                <div>
                  {/* Card Header: 3D-styled Icon + Pill Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFF5F6] to-[#FFF0F2] border border-[#FCE7EB] text-[#C51F3A] shadow-xs transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-hover:shadow-[#C51F3A]/10">
                      <IconComponent className="h-7 w-7 stroke-[1.8]" />
                      {/* Micro Corner Accent Dot */}
                      <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#C51F3A] border-2 border-white shadow-2xs" />
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        ROLE {role.number}
                      </span>
                      <span className="rounded-full bg-slate-50 border border-slate-200/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
                        {role.badge}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-xl font-extrabold text-[#0F172A] tracking-tight group-hover:text-[#A30D2D] transition-colors">
                      {role.title}
                    </h3>
                    <p className="mt-2.5 text-xs font-semibold uppercase tracking-wider text-[#C51F3A]">
                      {role.subtitle}
                    </p>
                  </div>

                  <p className="mt-3 text-sm text-[#64748B] leading-relaxed font-normal min-h-[4.25rem]">
                    {role.desc}
                  </p>

                  {/* Key Features List with modern pill items */}
                  <div className="mt-6 space-y-3">
                    <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                      Key Features:
                    </p>
                    <div className="space-y-2">
                      {role.features.map((feature) => (
                        <div
                          key={feature}
                          className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 -mx-2.5 text-sm text-slate-700 font-medium transition-colors hover:bg-slate-50"
                        >
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-600 shadow-2xs">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                          <span className="text-xs sm:text-sm font-medium text-slate-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom CTA Action Button */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <Link
                    href={role.ctaLink}
                    className="group/btn flex w-full items-center justify-center gap-2 rounded-xl sm:rounded-2xl border border-slate-200/90 bg-slate-50/90 py-3.5 px-4 text-sm font-bold text-[#0F172A] shadow-2xs hover:bg-[#C51F3A] hover:border-[#C51F3A] hover:text-white hover:shadow-lg hover:shadow-[#C51F3A]/20 transition-all duration-200 active:translate-y-px"
                  >
                    <span>{role.ctaText}</span>
                    <ArrowRight className="h-4 w-4 text-[#C51F3A] transition-transform duration-200 group-hover/btn:translate-x-1 group-hover/btn:text-white" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
