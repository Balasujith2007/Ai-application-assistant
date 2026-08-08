'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  UserRound,
  FileText,
  FolderKanban,
  Briefcase,
  Building2,
  Trophy,
  ClipboardCheck,
  CalendarDays,
  BellRing,
  Sparkles,
  ChartColumn,
  Bot,
  TrendingUp,
  ArrowRight,
  Check,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

// --- DATA ---

const STATS = [
  { value: '50K+', label: 'Students' },
  { value: '10K+', label: 'Applications' },
  { value: '500+', label: 'Partner Companies' },
  { value: '95%', label: 'Placement Success' },
];

const CATEGORIES = [
  {
    id: 'profile',
    title: 'Profile Management',
    description: 'Build and maintain a professional digital presence that stands out to recruiters.',
    badge: 'Core Identity',
    cards: [
      {
        title: 'Career Profile',
        icon: UserRound,
        color: 'indigo',
        description: 'Build a complete professional digital profile for placements.',
        features: ['Personal Information', 'Education History', 'Technical Skills', 'Featured Projects', 'Work Experience'],
        totalFeatures: 11,
      },
      {
        title: 'Resume Management',
        icon: FileText,
        color: 'blue',
        description: 'Manage multiple resumes and keep them organized seamlessly.',
        features: ['Upload PDF/DOCX', 'Multiple Versions', 'Active Selection', 'One-click Download'],
        totalFeatures: 7,
      },
      {
        title: 'Document Vault',
        icon: FolderKanban,
        color: 'teal',
        description: 'Store all your important career documents securely.',
        features: ['Resume Storage', 'Offer Letters', 'Certificates', 'Mark Sheets'],
        totalFeatures: 6,
      },
    ],
  },
  {
    id: 'opportunities',
    title: 'Opportunity Management',
    description: 'Never lose track of an application. Monitor every stage of your career journey.',
    badge: 'Tracking',
    cards: [
      {
        title: 'Internship Tracker',
        icon: Briefcase,
        color: 'emerald',
        description: 'Track every internship application in one centralized place.',
        features: ['Save Internship', 'Direct Apply Links', 'Deadline Tracking', 'Status Updates'],
        totalFeatures: 6,
      },
      {
        title: 'Job Tracker',
        icon: Building2,
        color: 'orange',
        description: 'Manage all your job opportunities efficiently and effectively.',
        features: ['Full-Time Jobs', 'Off-Campus Drives', 'On-Campus Placement', 'Salary Packages'],
        totalFeatures: 7,
      },
      {
        title: 'Hackathon Tracker',
        icon: Trophy,
        color: 'purple',
        description: 'Organize hackathons and coding competitions effortlessly.',
        features: ['Event Registration', 'Team Details', 'Submission Links', 'Live Results'],
        totalFeatures: 6,
      },
      {
        title: 'Application Tracker',
        icon: ClipboardCheck,
        color: 'rose',
        description: 'Track every application from start to finish with visual pipelines.',
        features: ['Saved Drafts', 'Applied Status', 'OA Scheduled', 'HR Rounds'],
        totalFeatures: 10,
      },
    ],
  },
  {
    id: 'productivity',
    title: 'Productivity',
    description: 'Stay on top of deadlines and automate repetitive tasks.',
    badge: 'Workflow',
    cards: [
      {
        title: 'Calendar & Deadlines',
        icon: CalendarDays,
        color: 'cyan',
        description: 'Never miss important placement events or interview dates.',
        features: ['Interview Dates', 'Internship Deadlines', 'Job Deadlines', 'Hackathon Dates'],
        totalFeatures: 5,
      },
      {
        title: 'Notification Center',
        icon: BellRing,
        color: 'yellow',
        description: 'Stay updated with important, timely career notifications.',
        features: ['Interview Reminders', 'Deadline Alerts', 'New Opportunities', 'Profile Alerts'],
        totalFeatures: 6,
      },
      {
        title: 'Quick Actions',
        icon: Sparkles,
        color: 'violet',
        description: 'Perform common placement tasks instantly with shortcuts.',
        features: ['Add Application', 'Upload Resume', 'Add Project', 'Register Hackathon'],
        totalFeatures: 6,
      },
    ],
  },
];

// Map colors to tailwind classes
const COLOR_MAP: Record<string, { bg: string; text: string; borderHover: string }> = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', borderHover: 'hover:border-indigo-500' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', borderHover: 'hover:border-blue-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', borderHover: 'hover:border-emerald-500' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', borderHover: 'hover:border-orange-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', borderHover: 'hover:border-purple-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', borderHover: 'hover:border-rose-500' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', borderHover: 'hover:border-cyan-500' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', borderHover: 'hover:border-yellow-500' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-600', borderHover: 'hover:border-pink-500' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-600', borderHover: 'hover:border-teal-500' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', borderHover: 'hover:border-violet-500' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-600', borderHover: 'hover:border-sky-500' },
  lime: { bg: 'bg-lime-50', text: 'text-lime-600', borderHover: 'hover:border-lime-500' },
};

// --- COMPONENTS ---

export default function StudentsPage() {
  return (
    <div className="min-h-screen bg-white font-[var(--font-inter)] selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navbar (Kept from existing) */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-sm">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">CareerAI</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Log in
            </Link>
            <Link href="/register" className="rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 transition-all hover:shadow-md">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
              Everything Students Need for a <br className="hidden sm:block" />
              <span className="text-indigo-600">Successful Career</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-500 max-w-2xl mx-auto">
              Manage your complete placement journey—from building your professional profile to tracking internships, jobs, hackathons, resumes, and career growth—all in one intelligent platform.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Statistics Band */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 mb-32">
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
      <section className="mx-auto max-w-7xl px-6 lg:px-8 space-y-32 mb-32">
        {CATEGORIES.map((category, catIdx) => (
          <div key={category.id} className="relative">
            {/* Category Header */}
            <div className="mb-12 max-w-2xl">
              <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-600 mb-4">
                {category.badge}
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">
                {category.title}
              </h2>
              <p className="text-lg text-gray-500 leading-relaxed">
                {category.description}
              </p>
            </div>

            {/* Category Cards Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {category.cards.map((card, idx) => {
                const color = COLOR_MAP[card.color];
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                    whileHover={{ y: -8 }}
                    className={`group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-xl ${color.borderHover}`}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-5">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${color.bg} ${color.text}`}>
                        <card.icon className="h-6 w-6" strokeWidth={1.5} />
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

                    <p className="text-sm text-gray-500 mb-6 flex-1">
                      {card.description}
                    </p>

                    {/* Features List */}
                    <div className="mb-8">
                      <ul className="space-y-2.5">
                        {card.features.map((feature, fIdx) => (
                          <li key={fIdx} className="flex items-center gap-3 text-sm text-gray-600">
                            <Check className={`h-4 w-4 shrink-0 opacity-70 ${color.text}`} strokeWidth={2.5} />
                            <span className="font-medium">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      {card.totalFeatures > card.features.length && (
                        <div className="mt-3 pl-7">
                          <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-500">
                            +{card.totalFeatures - card.features.length} More Features
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Button */}
                    <div className="mt-auto pt-6 border-t border-gray-100">
                      <button className="group/btn relative flex items-center justify-center gap-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:border-indigo-600 hover:bg-indigo-600 hover:text-white">
                        <span>Learn More</span>
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Premium Insights Section */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 mb-32">
        <div className="mb-12 max-w-2xl">
          <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-4">
            INSIGHTS & AI
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">
            Accelerate Your Career with AI
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            Gain personalized insights, track your placement progress, and prepare for interviews using powerful AI-driven tools.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Career Analytics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4 }}
            whileHover={{ y: -8 }}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-pink-500"
          >
            <div className="flex items-center gap-4 mb-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 bg-pink-50 text-pink-600">
                <ChartColumn className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">ANALYTICS</span>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-snug">Career Analytics</h3>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-6 flex-1">Visualize your placement journey with real-time insights.</p>
            <div className="mb-8">
              <ul className="space-y-2.5">
                {['Total Applications', 'Interview Success Rate', 'Placement Progress', 'Upcoming Deadlines'].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-gray-600">
                    <Check className="h-4 w-4 shrink-0 opacity-70 text-pink-600" strokeWidth={2.5} />
                    <span className="font-medium">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pl-7">
                <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-500">
                  +4 More Analytics
                </span>
              </div>
            </div>
            <div className="mt-auto pt-6 border-t border-gray-100">
              <button className="group/btn relative flex items-center justify-center gap-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:border-indigo-600 hover:bg-indigo-600 hover:text-white">
                <span>Learn More</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
              </button>
            </div>
          </motion.div>

          {/* Card 2: AI Career Assistant */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4, delay: 0.1 }}
            whileHover={{ y: -8 }}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-sky-500 hover:shadow-sky-100"
          >
            <div className="flex items-center gap-4 mb-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 bg-sky-50 text-sky-600">
                <Bot className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">AI POWERED</span>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-snug">AI Career Assistant</h3>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-6 flex-1">Your personal AI mentor to guide every step of your placement journey.</p>
            <div className="mb-8">
              <ul className="space-y-2.5">
                {['Resume Review', 'Interview Preparation', 'Skill Gap Analysis', 'Career Roadmap'].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-gray-600">
                    <Check className="h-4 w-4 shrink-0 opacity-70 text-sky-600" strokeWidth={2.5} />
                    <span className="font-medium">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pl-7">
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600">
                  Phase 2
                </span>
              </div>
            </div>
            <div className="mt-auto pt-6 border-t border-gray-100">
              <button className="group/btn relative flex items-center justify-center gap-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:border-sky-500 hover:bg-sky-50 hover:text-sky-700 hover:shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                <span>Explore AI</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
              </button>
            </div>
          </motion.div>

          {/* Card 3: Career Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4, delay: 0.2 }}
            whileHover={{ y: -8 }}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-lime-500"
          >
            <div className="flex items-center gap-4 mb-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 bg-lime-50 text-lime-600">
                <TrendingUp className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">PROGRESS</span>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-snug">Career Progress</h3>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-6">Track your overall placement readiness.</p>
            
            {/* Custom Content for Progress */}
            <div className="mb-8 flex-1">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Career Completion</span>
                <span className="text-xl font-bold text-gray-900">82%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-6">
                <motion.div 
                  initial={{ width: 0 }} 
                  whileInView={{ width: '82%' }} 
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                  className="h-full bg-lime-500 rounded-full"
                />
              </div>

              <ul className="space-y-2.5">
                {[
                  { label: 'Profile Completed', done: true },
                  { label: 'Resume Uploaded', done: true },
                  { label: 'Skills Added', done: true },
                  { label: 'Projects Added', done: true },
                  { label: 'Internship Applied', done: true },
                  { label: 'Interview Scheduled', done: false },
                  { label: 'Offer Received', done: false },
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm">
                    {item.done ? (
                      <Check className="h-4 w-4 shrink-0 text-lime-500" strokeWidth={3} />
                    ) : (
                      <div className="h-4 w-4 shrink-0 rounded-[3px] border border-gray-300 bg-gray-50" />
                    )}
                    <span className={`font-medium ${item.done ? 'text-gray-900' : 'text-gray-400'}`}>{item.label}</span>
                  </li>
                ))}
              </ul>
              
              <div className="mt-6 rounded-lg bg-lime-50 px-3 py-2 border border-lime-100 text-xs font-medium text-lime-800 flex items-center gap-2">
                <TrendingUp className="h-3 w-3" />
                You're ahead of 78% of students.
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-gray-100">
              <button className="group/btn relative flex items-center justify-center gap-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:border-indigo-600 hover:bg-indigo-600 hover:text-white">
                <span>Learn More</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Future AI Features Section */}
      <section className="bg-gray-50 py-32 border-t border-gray-100">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Coming Soon
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              Next-generation AI tools that will make CareerAI your personal placement companion.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[
              { title: 'AI Resume Analyzer', desc: 'Real-time feedback on resume bullet points.' },
              { title: 'ATS Resume Checker', desc: 'Score your resume against applicant tracking systems.' },
              { title: 'Cover Letter Generator', desc: 'Auto-generate tailored cover letters for specific jobs.' },
              { title: 'Mock Interview Coach', desc: 'Practice with an AI avatar and get immediate feedback.' },
              { title: 'Auto Job Matching', desc: 'AI automatically finds jobs matching your skills.' },
              { title: 'Skill Gap Analyzer', desc: 'Identify what you need to learn for your dream role.' },
              { title: 'Placement Prediction', desc: 'Predict placement chances based on historical data.' },
              { title: 'Career Recommendation', desc: 'Get suggestions for alternate career paths.' },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                whileHover={{ y: -6 }}
                className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-indigo-500"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                    <Bot className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <span className="inline-block rounded bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    Coming Soon
                  </span>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Full-Width Final CTA */}
      <section className="bg-gradient-to-br from-indigo-50 via-white to-blue-50 py-32 border-t border-gray-100">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-[3rem] bg-white border border-indigo-100 px-6 py-24 sm:px-16 lg:px-24 shadow-2xl relative overflow-hidden text-center"
          >
            {/* Subtle floating abstract shapes */}
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-100/50 blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-100/50 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="relative z-10">
              <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl max-w-4xl mx-auto leading-tight">
                Ready to Land Your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">
                  Dream Internship?
                </span>
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600">
                Manage your profile, resumes, internships, jobs, hackathons, applications, and career growth—all from one intelligent platform.
              </p>
              <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto rounded-xl bg-indigo-600 px-10 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:scale-[1.02] active:scale-95"
                >
                  Start Free Today
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-10 py-4 text-base font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-300"
                >
                  Explore Dashboard
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
