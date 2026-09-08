'use client';

import Link from 'next/link';
import { GraduationCap, Users, Building2, CheckCircle2, ArrowRight } from 'lucide-react';

const ROLES = [
  {
    id: 'students',
    icon: <GraduationCap className="h-7 w-7 text-kit-600" />,
    title: 'STUDENTS',
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
  },
  {
    id: 'mentors',
    icon: <Users className="h-7 w-7 text-kit-600" />,
    title: 'MENTORS',
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
  },
  {
    id: 'placement',
    icon: <Building2 className="h-7 w-7 text-kit-600" />,
    title: 'PLACEMENT CELL',
    badge: 'Institutional Command',
    desc: 'Streamline institutional campus recruitment with comprehensive analytics, company relationship tracking, and automated reporting.',
    features: [
      'College-wide Analytics',
      'Opportunity Management',
      'Placement Tracking',
      'Reports and Statistics',
    ],
    ctaText: 'Placement Cell Overview',
    ctaLink: '/register',
  },
];

export default function RoleSection() {
  return (
    <section id="roles" className="bg-slate-50/60 py-24 border-y border-slate-200/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold text-slate-700 mb-4 shadow-2xs">
            <Users className="h-3.5 w-3.5 text-kit-600" />
            <span>Placement Ecosystem</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            Built for Everyone in the Placement Ecosystem
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Connect students, faculty mentors, and institutional placement cells on a unified, high-performance architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {ROLES.map((role) => (
            <div
              key={role.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-8 shadow-xs transition-all duration-200 hover:border-kit-300 hover:shadow-xl hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-kit-50 border border-kit-100">
                    {role.icon}
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {role.badge}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900">{role.title}</h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{role.desc}</p>

                <div className="mt-6 space-y-3">
                  <p className="text-xs font-bold tracking-wider uppercase text-slate-400">
                    Key Features:
                  </p>
                  {role.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2.5 text-sm text-slate-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <Link
                  href={role.ctaLink}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-800 hover:bg-kit-600 hover:text-white hover:border-kit-600 transition-colors"
                >
                  <span>{role.ctaText}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
