'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  BarChart3,
  Users,
  Briefcase,
  FileSpreadsheet,
  CheckCircle2,
  CalendarDays,
  ShieldCheck,
  TrendingUp,
  Award,
} from 'lucide-react';
import Link from 'next/link';
import BackToDashboardButton from '@/components/ui/BackToDashboardButton';

const STATS = [
  { value: '250+', label: 'Recruitment Drives' },
  { value: '92%', label: 'Placement Percentage' },
  { value: '45 LPA', label: 'Highest Package' },
  { value: '1,500+', label: 'Offers Released' },
];

const CATEGORIES = [
  {
    id: 'analytics',
    title: 'Institutional Placement Command',
    description: 'Comprehensive placement intelligence, cohort statistics, and real-time drive monitoring.',
    badge: 'Operations',
    cards: [
      {
        title: 'College-Wide Analytics',
        icon: BarChart3,
        description: 'Track department-wise placement rates, average salary packages, and offer distributions.',
        features: ['Real-Time Placement Rate', 'Salary Tier Analytics', 'Department Breakdown', 'Year-Over-Year Trends'],
      },
      {
        title: 'Recruitment Drive Management',
        icon: Building2,
        description: 'Organize, schedule, and execute on-campus and virtual campus recruitment drives.',
        features: ['Company Onboarding', 'JD Publishing', 'Drive Rounds Management', 'Offer Letter Tracking'],
      },
      {
        title: 'Student Eligibility Engine',
        icon: Users,
        description: 'Filter eligible student pools automatically based on CGPA, backlogs, and skill criteria.',
        features: ['Automated Shortlisting', 'Criteria Verification', 'Batch Broadcasts', 'Attendance Logs'],
      },
    ],
  },
  {
    id: 'reporting',
    title: 'Compliance & Automated Reporting',
    description: 'Generate institutional reports, NIRF compliance summaries, and recruiter insights with one click.',
    badge: 'Reporting',
    cards: [
      {
        title: 'Automated Placement Reports',
        icon: FileSpreadsheet,
        description: 'Export official placement reports formatted for regulatory and accreditation reviews.',
        features: ['NIRF / NAAC Data Export', 'Company Summary PDF', 'Student Placement Register', 'Branch Statistics'],
      },
      {
        title: 'Recruiter Relationship Portal',
        icon: Briefcase,
        description: 'Manage employer relationships, POC directory, and historical hiring patterns.',
        features: ['Recruiter Directory', 'Past Hiring Data', 'Feedback & Ratings', 'MoU Management'],
      },
      {
        title: 'Verified Placement Auditing',
        icon: ShieldCheck,
        description: 'Audit and verify student offer letters and placement confirmations with full integrity.',
        features: ['Offer Letter Verification', 'Single-Offer Policy Enforcement', 'Proof Archiving', 'Audit Trail'],
      },
    ],
  },
];

export default function PlacementCellPage() {
  return (
    <div className="min-h-screen bg-white font-[var(--font-inter)] selection:bg-kit-100 selection:text-kit-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <img src="/kit-logo.png" alt="KIT Logo" className="h-8 w-8 object-contain" />
            <span className="text-xl font-bold text-gray-900 tracking-tight">CareerAI</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Log in
            </Link>
            <Link href="/register" className="rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 transition-all hover:shadow-md">
              Placement Portal
            </Link>
          </div>
        </div>
      </nav>

      {/* Top Back to Dashboard Navigation Action */}
      <div className="mx-auto max-w-7xl px-6 pt-6 sm:pt-8 lg:px-8">
        <BackToDashboardButton fallbackRoute="/dashboard/placement" />
      </div>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 py-20 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl leading-tight">
              Institutional Command for <br className="hidden sm:block" />
              <span className="text-kit-600">Placement Operations</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg leading-relaxed text-gray-500 max-w-2xl mx-auto">
              Streamline institutional campus recruitment with comprehensive analytics, company relationship tracking, automated student shortlisting, and official reporting.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Statistics Band */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 mb-24">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-8">
          {STATS.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="flex flex-col items-center justify-center rounded-2xl bg-gray-50 border border-gray-100 p-6 text-center transition-all hover:shadow-lg hover:border-gray-200"
            >
              <span className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">{stat.value}</span>
              <span className="mt-2 text-sm font-medium text-gray-500">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Grouped Feature Categories */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 space-y-24 mb-28">
        {CATEGORIES.map((category) => (
          <div key={category.id} className="relative">
            {/* Category Header */}
            <div className="mb-10 max-w-2xl">
              <span className="inline-block rounded-full bg-kit-50 border border-kit-200 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-kit-700 mb-3">
                {category.badge}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-3">
                {category.title}
              </h2>
              <p className="text-base text-gray-500 leading-relaxed">
                {category.description}
              </p>
            </div>

            {/* Category Cards Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {category.cards.map((card, idx) => {
                const IconComponent = card.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                    whileHover={{ y: -6 }}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-7 shadow-xs transition-all duration-300 hover:shadow-xl hover:border-kit-300"
                  >
                    <div className="flex items-center gap-4 mb-5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-kit-50 border border-kit-100 text-kit-600 transition-transform duration-300 group-hover:scale-110">
                        <IconComponent className="h-6 w-6" strokeWidth={1.75} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          {category.title}
                        </span>
                        <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-snug">
                          {card.title}
                        </h3>
                      </div>
                    </div>

                    <p className="text-sm text-gray-500 mb-6 flex-1 leading-relaxed">
                      {card.description}
                    </p>

                    <div className="space-y-2.5 pt-4 border-t border-gray-100">
                      {card.features.map((feature, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-2.5 text-xs font-medium text-gray-700">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Bottom CTA */}
      <section className="bg-gray-50 border-t border-gray-200/80 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Empower Your Institution's Placement Cell
          </h2>
          <p className="text-gray-600 text-sm sm:text-base max-w-xl mx-auto mb-8">
            Access enterprise placement management tools designed to elevate student placement outcomes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard/placement"
              className="w-full sm:w-auto rounded-xl bg-kit-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-kit-700 transition-all"
            >
              Open Placement Dashboard
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
