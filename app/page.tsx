'use client';

import Link from 'next/link';
import {
  Zap,
  ArrowRight,
  BarChart3,
  FileText,
  Briefcase,
  Laptop,
  Trophy,
  Bot,
  Users,
  Building,
  GraduationCap,
  ChevronRight,
  CheckCircle,
  Star,
} from 'lucide-react';

const FEATURES = [
  {
    icon: <Users className="h-6 w-6" />,
    title: 'Smart Career Profile',
    desc: 'Build a comprehensive career profile with education, skills, projects, and experience.',
    color: 'bg-indigo-50 text-indigo-600',
  },
  {
    icon: <FileText className="h-6 w-6" />,
    title: 'Resume Management',
    desc: 'Upload, manage, and activate multiple resumes. AI parsing coming in Phase 2.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: <Briefcase className="h-6 w-6" />,
    title: 'Application Tracking',
    desc: 'Track every application with status updates, deadlines, and notes in one place.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: <Laptop className="h-6 w-6" />,
    title: 'Internship Tracking',
    desc: 'Manage internship applications from saved to selected with a visual pipeline.',
    color: 'bg-sky-50 text-sky-600',
  },
  {
    icon: <Trophy className="h-6 w-6" />,
    title: 'Hackathon Management',
    desc: 'Register for hackathons, track participation status, and celebrate wins.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: 'Career Analytics',
    desc: 'Visualize your career journey with insightful stats and progress tracking.',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    icon: <Bot className="h-6 w-6" />,
    title: 'AI Assistance',
    desc: 'Get AI-powered resume improvements, cover letters, and interview preparation.',
    color: 'bg-rose-50 text-rose-600',
  },
  {
    icon: <Building className="h-6 w-6" />,
    title: 'Placement Support',
    desc: 'Placement cell can track all students, companies, and offers from a unified portal.',
    color: 'bg-teal-50 text-teal-600',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Create Your Profile',
    desc: 'Sign up and fill in your education, skills, and career objective.',
  },
  {
    step: '02',
    title: 'Upload Your Resume',
    desc: 'Upload your PDF or DOCX resume. AI parsing extracts your profile automatically.',
  },
  {
    step: '03',
    title: 'Track Opportunities',
    desc: 'Add internships, jobs, and hackathons. Track status from saved to selected.',
  },
  {
    step: '04',
    title: 'Build Your Career',
    desc: 'Use AI insights to improve your profile, prepare for interviews, and land your dream role.',
  },
];

const ROLES = [
  {
    icon: <GraduationCap className="h-8 w-8" />,
    title: 'Students',
    desc: 'Manage your entire career journey — resume, applications, internships, and hackathons — from a single dashboard.',
    benefits: ['Application tracking', 'Resume management', 'AI career assistance', 'Profile completion tracker'],
    color: 'bg-indigo-600',
  },
  {
    icon: <Users className="h-8 w-8" />,
    title: 'Mentors',
    desc: 'Monitor assigned students\' progress, provide guidance, and track their placement journey.',
    benefits: ['Student progress overview', 'Application monitoring', 'Interview tracking'],
    color: 'bg-blue-600',
  },
  {
    icon: <Building className="h-8 w-8" />,
    title: 'Placement Cell',
    desc: 'Get a bird\'s eye view of all students, companies, and placement statistics for your institution.',
    benefits: ['College-wide analytics', 'Company tracking', 'Placement statistics', 'Export reports'],
    color: 'bg-emerald-600',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-[var(--font-inter)]">
      {/* ======== NAVBAR ======== */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">CareerAI</span>
          </Link>

          {/* Links */}
          <div className="hidden items-center gap-8 md:flex">
            {['Features', 'How It Works', 'For Students', 'For Mentors'].map((item) => (
              <a
                key={item}
                href={
                  item === 'For Students' 
                    ? '/students' 
                    : item === 'For Mentors' 
                      ? '/mentors' 
                      : `#${item.toLowerCase().replace(/\s+/g, '-')}`
                }
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                {item}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ======== HERO ======== */}
      <section className="relative overflow-hidden px-6 pt-20 pb-24 text-center">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-100 opacity-40 blur-3xl" />
          <div className="absolute right-1/4 bottom-0 h-64 w-64 rounded-full bg-blue-100 opacity-30 blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
            <Star className="h-3.5 w-3.5" />
            Built for college students & placement departments
          </div>

          <h1 className="text-5xl font-bold leading-tight tracking-tight text-gray-900 md:text-6xl">
            Your Career Journey.{' '}
            <span className="text-indigo-600">Smarter.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 leading-relaxed">
            Manage resumes, applications, internships, hackathons and career
            opportunities from one intelligent platform. Built for students,
            powered by AI.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="group flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all duration-200"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Explore Features
            </a>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-3 gap-8 border-t border-gray-100 pt-16">
            {[
              { value: '10K+', label: 'Students' },
              { value: '500+', label: 'Colleges' },
              { value: '95%', label: 'Placement Rate' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl font-bold text-indigo-600">{value}</p>
                <p className="mt-1 text-sm text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="mx-auto mt-20 max-w-5xl">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-emerald-400" />
              <div className="mx-4 flex-1 rounded-md bg-white border border-gray-200 px-3 py-1.5 text-xs text-gray-400">
                app.careerai.com/dashboard/student
              </div>
            </div>
            {/* Dashboard mockup */}
            <div className="flex">
              {/* Sidebar */}
              <div className="w-48 border-r border-gray-100 bg-gray-50 p-3">
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-white p-2 shadow-sm">
                  <div className="h-6 w-6 rounded-md bg-indigo-600" />
                  <span className="text-xs font-bold text-gray-800">CareerAI</span>
                </div>
                {['Overview', 'My Profile', 'Resume', 'Applications', 'Internships', 'Hackathons', 'AI Assistant'].map((item, i) => (
                  <div
                    key={item}
                    className={`mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${i === 0 ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-gray-500'}`}
                  >
                    <div className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-indigo-600' : 'bg-gray-300'}`} />
                    {item}
                  </div>
                ))}
              </div>
              {/* Content */}
              <div className="flex-1 p-4 bg-gray-50">
                <p className="mb-3 text-xs font-semibold text-gray-700">Welcome back, Arjun 👋</p>
                <div className="mb-4 grid grid-cols-4 gap-2">
                  {[
                    { label: 'Applications', val: '12', color: 'bg-indigo-50 text-indigo-700' },
                    { label: 'Active', val: '5', color: 'bg-blue-50 text-blue-700' },
                    { label: 'Interviews', val: '2', color: 'bg-purple-50 text-purple-700' },
                    { label: 'Offers', val: '1', color: 'bg-emerald-50 text-emerald-700' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className={`rounded-lg p-2 ${color}`}>
                      <p className="text-lg font-bold">{val}</p>
                      <p className="text-xs opacity-70">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="mb-2 text-xs font-semibold text-gray-600">Recent Applications</p>
                  {['Google — SWE Intern', 'Microsoft — SDE-1', 'Flipkart — Backend Intern'].map((app, i) => (
                    <div key={app} className="flex items-center justify-between border-b border-gray-50 py-1.5 last:border-0">
                      <span className="text-xs text-gray-600">{app}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        i === 0 ? 'bg-purple-50 text-purple-700' : i === 1 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {['Interview', 'Applied', 'Rejected'][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======== FEATURES ======== */}
      <section id="features" className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
              Everything you need to manage your career
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
              From resume uploads to application tracking — all in one place.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon, title, desc, color }) => (
              <div
                key={title}
                className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className={`mb-4 inline-flex rounded-xl p-3 ${color}`}>
                  {icon}
                </div>
                <h3 className="mb-2 text-base font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======== HOW IT WORKS ======== */}
      <section id="how-it-works" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">How It Works</h2>
            <p className="mt-4 text-lg text-gray-600">Start your career journey in 4 simple steps.</p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ step, title, desc }, i) => (
              <div key={step} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="absolute left-full top-8 hidden w-full border-t-2 border-dashed border-gray-200 lg:block" />
                )}
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white shadow-lg shadow-indigo-200">
                    {step}
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-gray-900">{title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======== FOR ROLES ======== */}
      <section id="for-students" className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
              Built for everyone in the placement ecosystem
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {ROLES.map(({ icon, title, desc, benefits, color }) => (
              <div
                key={title}
                className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className={`mb-6 inline-flex rounded-2xl p-4 ${color} text-white`}>
                  {icon}
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">{title}</h3>
                <p className="mb-6 text-gray-600 leading-relaxed">{desc}</p>
                <ul className="space-y-2.5">
                  {benefits.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======== CTA ======== */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-bold text-gray-900">
            Take Control of Your Career Journey
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Join thousands of students who are already managing their careers smarter.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="group flex items-center gap-2 rounded-xl bg-indigo-600 px-10 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
            >
              Create Free Account
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ======== FOOTER ======== */}
      <footer className="border-t border-gray-200 bg-gray-50 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">CareerAI</span>
            </div>
            <p className="text-sm text-gray-500">
              © 2025 CareerAI. AI-powered career management for students.
            </p>
            <div className="flex gap-6">
              {['Privacy', 'Terms', 'Contact'].map((link) => (
                <a
                  key={link}
                  href="#"
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
